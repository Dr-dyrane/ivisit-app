-- Migration: ID Beautification System
-- Description: Creates id_mappings table for human-readable IDs (IVP, PRV, ORG)
-- Also adds verification_status to hospitals table

-- ============================================================================
-- 1. Add verification_status to hospitals
-- ============================================================================

ALTER TABLE public.hospitals
ADD COLUMN IF NOT EXISTS verification_status TEXT 
    DEFAULT 'pending' 
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Sync existing verified boolean to verification_status
UPDATE public.hospitals
SET verification_status = CASE 
    WHEN verified = true THEN 'verified'
    ELSE 'pending'
END
WHERE verification_status IS NULL OR verification_status = 'pending';

COMMENT ON COLUMN public.hospitals.verification_status IS 'Verification workflow status: pending (awaiting review), verified (approved), rejected (denied)';

-- ============================================================================
-- 2. Create id_mappings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.id_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('patient', 'provider', 'hospital')),
    entity_id UUID NOT NULL,
    display_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure unique entity per type
    CONSTRAINT unique_entity UNIQUE (entity_type, entity_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_id_mappings_display_id ON public.id_mappings(display_id);
CREATE INDEX IF NOT EXISTS idx_id_mappings_entity ON public.id_mappings(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.id_mappings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (for display purposes)
CREATE POLICY "Authenticated users can read id_mappings"
ON public.id_mappings FOR SELECT
USING (auth.role() = 'authenticated');

-- System can insert (via trigger functions with SECURITY DEFINER)
CREATE POLICY "System can manage id_mappings"
ON public.id_mappings FOR ALL
USING (true);

COMMENT ON TABLE public.id_mappings IS 'Maps entity UUIDs to human-readable display IDs (IVP-000001, PRV-000001, ORG-000001)';

-- ============================================================================
-- 3. Function: Generate Display ID
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_display_id(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
    new_display_id TEXT;
BEGIN
    -- Get highest number for this prefix, accounting for the hyphen
    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(display_id FROM LENGTH(prefix) + 2) -- Skip prefix and hyphen
                AS INTEGER
            )
        ),
        0
    ) + 1
    INTO next_num
    FROM public.id_mappings
    WHERE display_id LIKE prefix || '-%';
    
    -- Format: PREFIX-XXXXXX (6 digits, zero-padded)
    new_display_id := prefix || '-' || LPAD(next_num::TEXT, 6, '0');
    
    RETURN new_display_id;
END;
$$;

COMMENT ON FUNCTION public.generate_display_id IS 'Generates next sequential display ID for a given prefix (IVP, PRV, ORG)';

-- ============================================================================
-- 4. Function: Auto-generate ID on profile insert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_profile_created_generate_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prefix TEXT;
    display_id TEXT;
    entity_type_val TEXT;
BEGIN
    -- Determine prefix and entity type based on role
    IF NEW.role = 'patient' THEN
        prefix := 'IVP';
        entity_type_val := 'patient';
    ELSIF NEW.role IN ('provider', 'org_admin', 'admin', 'dispatcher') THEN
        prefix := 'PRV';
        entity_type_val := 'provider';
    ELSE
        -- Skip for viewer, sponsor, or other roles that don't need IDs
        RETURN NEW;
    END IF;
    
    -- Generate display ID
    display_id := public.generate_display_id(prefix);
    
    -- Insert mapping (ignore conflict if already exists)
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES (entity_type_val, NEW.id, display_id)
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Attach trigger to profiles
DROP TRIGGER IF EXISTS on_profile_created_id_mapping ON public.profiles;
CREATE TRIGGER on_profile_created_id_mapping
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_generate_id();

-- ============================================================================
-- 5. Function: Auto-generate ID on hospital insert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_hospital_created_generate_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    display_id TEXT;
BEGIN
    -- Generate ORG display ID
    display_id := public.generate_display_id('ORG');
    
    -- Insert mapping
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES ('hospital', NEW.id, display_id)
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Attach trigger to hospitals
DROP TRIGGER IF EXISTS on_hospital_created_id_mapping ON public.hospitals;
CREATE TRIGGER on_hospital_created_id_mapping
AFTER INSERT ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.on_hospital_created_generate_id();

-- ============================================================================
-- 6. Lookup Functions (for frontend RPC calls)
-- ============================================================================

-- Get entity UUID from display ID
CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT entity_id FROM public.id_mappings WHERE display_id = p_display_id;
$$;

-- Get display ID from entity UUID
CREATE OR REPLACE FUNCTION public.get_display_id(p_entity_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT display_id FROM public.id_mappings WHERE entity_id = p_entity_id;
$$;

-- Get all display IDs for multiple entities (batch lookup)
CREATE OR REPLACE FUNCTION public.get_display_ids(p_entity_ids UUID[])
RETURNS TABLE(entity_id UUID, display_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT entity_id, display_id 
    FROM public.id_mappings 
    WHERE entity_id = ANY(p_entity_ids);
$$;

COMMENT ON FUNCTION public.get_entity_id IS 'Lookup entity UUID from display ID (e.g., IVP-000001 → uuid)';
COMMENT ON FUNCTION public.get_display_id IS 'Lookup display ID from entity UUID';
COMMENT ON FUNCTION public.get_display_ids IS 'Batch lookup display IDs for multiple entities';

-- ============================================================================
-- 7. Backfill existing entities
-- ============================================================================

-- Backfill existing hospitals
DO $$
DECLARE
    rec RECORD;
    display_id TEXT;
BEGIN
    FOR rec IN SELECT id FROM public.hospitals WHERE NOT EXISTS (
        SELECT 1 FROM public.id_mappings WHERE entity_id = hospitals.id AND entity_type = 'hospital'
    ) LOOP
        display_id := public.generate_display_id('ORG');
        INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
        VALUES ('hospital', rec.id, display_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

-- Backfill existing patients
DO $$
DECLARE
    rec RECORD;
    display_id TEXT;
BEGIN
    FOR rec IN SELECT id FROM public.profiles WHERE role = 'patient' AND NOT EXISTS (
        SELECT 1 FROM public.id_mappings WHERE entity_id = profiles.id AND entity_type = 'patient'
    ) LOOP
        display_id := public.generate_display_id('IVP');
        INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
        VALUES ('patient', rec.id, display_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

-- Backfill existing providers
DO $$
DECLARE
    rec RECORD;
    display_id TEXT;
BEGIN
    FOR rec IN SELECT id FROM public.profiles WHERE role IN ('provider', 'org_admin', 'admin', 'dispatcher') AND NOT EXISTS (
        SELECT 1 FROM public.id_mappings WHERE entity_id = profiles.id AND entity_type = 'provider'
    ) LOOP
        display_id := public.generate_display_id('PRV');
        INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
        VALUES ('provider', rec.id, display_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

-- ============================================================================
-- 8. Notify PostgREST to reload schema
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- Done!
