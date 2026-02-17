-- Consolidated Migration to Sync ivisit-app with ivisit-console features
-- This migration adds missing columns, functions, and tables required by the Console Dashboard.

-- ============================================================================
-- 1. SUBSCRIBERS TABLE ENHANCEMENTS
-- ============================================================================
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS type text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS new_user boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS welcome_email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
ADD COLUMN IF NOT EXISTS subscription_date date,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS last_engagement_at timestamptz,
ADD COLUMN IF NOT EXISTS sale_id text UNIQUE;

CREATE INDEX IF NOT EXISTS subscribers_status_idx ON public.subscribers(status);
CREATE INDEX IF NOT EXISTS subscribers_type_idx ON public.subscribers(type);

-- ============================================================================
-- 2. SUPPORT TICKETS ENHANCEMENTS
-- ============================================================================
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- ============================================================================
-- 3. ID BEAUTIFICATION SYSTEM
-- ============================================================================

-- Create id_mappings table
CREATE TABLE IF NOT EXISTS public.id_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('patient', 'provider', 'hospital', 'admin', 'dispatcher')),
    entity_id UUID NOT NULL,
    display_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_entity UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_id_mappings_display_id ON public.id_mappings(display_id);
CREATE INDEX IF NOT EXISTS idx_id_mappings_entity ON public.id_mappings(entity_type, entity_id);

-- Helper: Generate next sequential display ID
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
    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(display_id FROM LENGTH(prefix) + 2) 
                AS INTEGER
            )
        ),
        0
    ) + 1
    INTO next_num
    FROM public.id_mappings
    WHERE display_id LIKE prefix || '-%';
    
    new_display_id := prefix || '-' || LPAD(next_num::TEXT, 6, '0');
    RETURN new_display_id;
END;
$$;

-- Trigger: Profile Created -> Generate ID
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
    IF NEW.role = 'patient' THEN
        prefix := 'IVP';
        entity_type_val := 'patient';
    ELSIF NEW.role IN ('admin', 'org_admin') THEN
        prefix := 'ADM';
        entity_type_val := 'admin';
    ELSIF NEW.role = 'dispatcher' THEN
        prefix := 'DSP';
        entity_type_val := 'dispatcher';
    ELSIF NEW.role = 'provider' THEN
        prefix := 'PRV';
        entity_type_val := 'provider';
    ELSE
        RETURN NEW;
    END IF;
    
    display_id := public.generate_display_id(prefix);
    
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES (entity_type_val, NEW.id, display_id)
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_id_mapping ON public.profiles;
CREATE TRIGGER on_profile_created_id_mapping
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_generate_id();

-- Trigger: Hospital Created -> Generate ORG ID
CREATE OR REPLACE FUNCTION public.on_hospital_created_generate_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    display_id TEXT;
BEGIN
    display_id := public.generate_display_id('ORG');
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES ('hospital', NEW.id, display_id)
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_hospital_created_id_mapping ON public.hospitals;
CREATE TRIGGER on_hospital_created_id_mapping
AFTER INSERT ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.on_hospital_created_generate_id();

-- API Functions for display_id lookups
CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT entity_id FROM public.id_mappings WHERE display_id = p_display_id; $$;

CREATE OR REPLACE FUNCTION public.get_display_id(p_entity_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT display_id FROM public.id_mappings WHERE entity_id = p_entity_id; $$;

CREATE OR REPLACE FUNCTION public.get_display_ids(p_entity_ids UUID[])
RETURNS TABLE(entity_id UUID, display_id TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT entity_id, display_id FROM public.id_mappings WHERE entity_id = ANY(p_entity_ids); $$;

-- ============================================================================
-- 4. ONBOARDING & RBAC HELPERS
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM profiles WHERE id = auth.uid(); $$;

-- ============================================================================
-- 5. RELOAD SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
