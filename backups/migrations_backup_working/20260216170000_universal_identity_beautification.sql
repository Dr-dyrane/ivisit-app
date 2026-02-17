-- Migration: Universal Identity Beautification
-- Description: Extends id_mappings to all entities (Ambulances, Doctors, Drivers) with granular prefixes.
-- Ensures denormalized display_id columns exist across all tables for performance.

BEGIN;

-- ============================================================================
-- 1. Update id_mappings entity_type constraints
-- ============================================================================
ALTER TABLE public.id_mappings DROP CONSTRAINT IF EXISTS id_mappings_entity_type_check;
ALTER TABLE public.id_mappings ADD CONSTRAINT id_mappings_entity_type_check 
    CHECK (entity_type IN ('patient', 'provider', 'hospital', 'admin', 'dispatcher', 'doctor', 'ambulance', 'driver'));

-- ============================================================================
-- 2. Ensure display_id columns exist on all tables
-- ============================================================================

-- Profiles (already exists in some iterations, but let's be sure)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_id') THEN
        ALTER TABLE public.profiles ADD COLUMN display_id TEXT;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_id_key UNIQUE (display_id);
    END IF;
END $$;

-- Ambulances
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ambulances' AND column_name = 'display_id') THEN
        ALTER TABLE public.ambulances ADD COLUMN display_id TEXT;
        ALTER TABLE public.ambulances ADD CONSTRAINT ambulances_display_id_key UNIQUE (display_id);
    END IF;
END $$;

-- Doctors
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'display_id') THEN
        ALTER TABLE public.doctors ADD COLUMN display_id TEXT;
        ALTER TABLE public.doctors ADD CONSTRAINT doctors_display_id_key UNIQUE (display_id);
    END IF;
END $$;

-- ============================================================================
-- 3. Universal ID Generation Function (Granular Role Logic)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.determine_entity_prefix_and_type(p_role TEXT, p_provider_type TEXT)
RETURNS TABLE (prefix TEXT, entity_type TEXT) AS $$
BEGIN
    IF p_role = 'patient' THEN
        RETURN QUERY SELECT 'IVP'::TEXT, 'patient'::TEXT;
    ELSIF p_role IN ('admin', 'org_admin') THEN
        RETURN QUERY SELECT 'ADM'::TEXT, 'admin'::TEXT;
    ELSIF p_role = 'dispatcher' THEN
        RETURN QUERY SELECT 'DSP'::TEXT, 'dispatcher'::TEXT;
    ELSIF p_role = 'provider' THEN
        IF LOWER(p_provider_type) = 'doctor' THEN
            RETURN QUERY SELECT 'DOC'::TEXT, 'doctor'::TEXT;
        ELSIF LOWER(p_provider_type) = 'driver' THEN
            RETURN QUERY SELECT 'DRV'::TEXT, 'driver'::TEXT;
        ELSIF LOWER(p_provider_type) = 'ambulance' THEN
            RETURN QUERY SELECT 'AMB'::TEXT, 'ambulance'::TEXT;
        ELSE
            RETURN QUERY SELECT 'PRV'::TEXT, 'provider'::TEXT;
        END IF;
    ELSE
        RETURN QUERY SELECT NULL::TEXT, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. Rebuild Profile ID Generation Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_profile_created_generate_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_display_id TEXT;
    v_entity_type TEXT;
BEGIN
    -- Determine prefix and entity type
    SELECT prefix, entity_type INTO v_prefix, v_entity_type 
    FROM public.determine_entity_prefix_and_type(NEW.role, NEW.provider_type);
    
    IF v_prefix IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Generate display ID
    v_display_id := public.generate_display_id(v_prefix);
    
    -- Insert mapping
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES (v_entity_type, NEW.id, v_display_id)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
        display_id = EXCLUDED.display_id,
        entity_type = EXCLUDED.entity_type;
        
    -- Update local table
    NEW.display_id := v_display_id;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. Create Ambulance ID Generation Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_ambulance_created_generate_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_display_id TEXT;
BEGIN
    -- Generate AMB display ID
    v_display_id := public.generate_display_id('AMB');
    
    -- Insert mapping
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES ('ambulance', NEW.profile_id, v_display_id)
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    
    NEW.display_id := v_display_id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_ambulance_created_generate_id ON public.ambulances;
CREATE TRIGGER tr_on_ambulance_created_generate_id
BEFORE INSERT ON public.ambulances
FOR EACH ROW
WHEN (NEW.display_id IS NULL)
EXECUTE FUNCTION public.on_ambulance_created_generate_id();

-- ============================================================================
-- 6. Universal Sync Trigger (id_mappings -> All Tables)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_display_id_to_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.entity_type IN ('patient', 'provider', 'admin', 'dispatcher', 'doctor', 'driver') THEN
        UPDATE public.profiles SET display_id = NEW.display_id WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'hospital' THEN
        UPDATE public.hospitals SET display_id = NEW.display_id WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'ambulance' THEN
        -- Link via profile_id for ambulances
        UPDATE public.ambulances SET display_id = NEW.display_id WHERE profile_id = NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_display_id_to_source ON public.id_mappings;
CREATE TRIGGER tr_sync_display_id_to_source
AFTER INSERT OR UPDATE ON public.id_mappings
FOR EACH ROW EXECUTE FUNCTION public.sync_display_id_to_source();

-- ============================================================================
-- 7. Deep Backfill & Standardization
-- ============================================================================

-- 1. Wipe existing mappings for roles that need granularization (optional, but ensures correctness)
-- DELETE FROM public.id_mappings WHERE entity_type IN ('provider', 'admin', 'dispatcher');

-- 2. Force re-generation via backfill loop
DO $$
DECLARE
    rec RECORD;
    v_prefix TEXT;
    v_type TEXT;
    v_id TEXT;
BEGIN
    -- Backfill Profiles
    FOR rec IN SELECT id, role, provider_type FROM public.profiles LOOP
        SELECT prefix, entity_type INTO v_prefix, v_type 
        FROM public.determine_entity_prefix_and_type(rec.role, rec.provider_type);
        
        IF v_prefix IS NOT NULL THEN
            -- Check if mapping exists with correct type
            IF NOT EXISTS (SELECT 1 FROM id_mappings WHERE entity_id = rec.id AND entity_type = v_type) THEN
                v_id := public.generate_display_id(v_prefix);
                INSERT INTO id_mappings (entity_type, entity_id, display_id)
                VALUES (v_type, rec.id, v_id)
                ON CONFLICT (entity_type, entity_id) DO UPDATE SET display_id = v_id;
            END IF;
        END IF;
    END LOOP;

    -- Backfill Hospitals
    FOR rec IN SELECT id FROM public.hospitals LOOP
        IF NOT EXISTS (SELECT 1 FROM id_mappings WHERE entity_id = rec.id AND entity_type = 'hospital') THEN
            v_id := public.generate_display_id('ORG');
            INSERT INTO id_mappings (entity_type, entity_id, display_id)
            VALUES ('hospital', rec.id, v_id);
        END IF;
    END LOOP;
    
    -- Backfill Ambulances
    FOR rec IN SELECT profile_id FROM public.ambulances WHERE profile_id IS NOT NULL LOOP
        IF NOT EXISTS (SELECT 1 FROM id_mappings WHERE entity_id = rec.profile_id AND entity_type = 'ambulance') THEN
            v_id := public.generate_display_id('AMB');
            INSERT INTO id_mappings (entity_type, entity_id, display_id)
            VALUES ('ambulance', rec.profile_id, v_id);
        END IF;
    END LOOP;
END $$;

-- 3. Final sync to denormalized columns
UPDATE public.profiles p SET display_id = m.display_id FROM id_mappings m WHERE p.id = m.entity_id;
UPDATE public.hospitals h SET display_id = m.display_id FROM id_mappings m WHERE h.id = m.entity_id AND m.entity_type = 'hospital';
UPDATE public.ambulances a SET display_id = m.display_id FROM id_mappings m WHERE a.profile_id = m.entity_id AND m.entity_type = 'ambulance';

COMMIT;
NOTIFY pgrst, 'reload schema';
