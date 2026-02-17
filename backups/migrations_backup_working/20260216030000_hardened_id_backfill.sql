-- 20260216030000_hardened_id_backfill.sql
-- Hardens ID generation triggers and performs a complete data backfill.

BEGIN;

-- 0. FIX generate_display_id (Make it robust against mixed prefixes)
CREATE OR REPLACE FUNCTION public.generate_display_id(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    -- Use regex to safely extract the numeric part of matching IDs
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN display_id ~ ('^' || prefix || '-[0-9]+$') THEN
                    CAST(SUBSTRING(display_id FROM LENGTH(prefix) + 2) AS INTEGER)
                ELSE 0
            END
        ),
        0
    ) + 1 INTO next_num
    FROM public.id_mappings
    WHERE display_id LIKE prefix || '-%';
    
    -- Format: PREFIX-XXXXXX (6 digits, zero-padded)
    RETURN prefix || '-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

-- 1. ENSURE CONSTRAINTS EXIST ON id_mappings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_entity') THEN
        ALTER TABLE public.id_mappings ADD CONSTRAINT unique_entity UNIQUE (entity_type, entity_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'id_mappings_display_id_key') THEN
        ALTER TABLE public.id_mappings ADD CONSTRAINT id_mappings_display_id_key UNIQUE (display_id);
    END IF;
END $$;

-- 2. RE-DEFINE TRIGGER FUNCTIONS FOR BEFORE INSERT
CREATE OR REPLACE FUNCTION public.on_profile_created_generate_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prefix TEXT;
    entity_type_val TEXT;
    generated_id TEXT;
BEGIN
    IF NEW.display_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.role = 'patient' THEN
        prefix := 'IVP';
        entity_type_val := 'patient';
    ELSIF NEW.role = 'admin' THEN
        prefix := 'ADM';
        entity_type_val := 'admin';
    ELSIF NEW.role = 'dispatcher' THEN
        prefix := 'DSP';
        entity_type_val := 'dispatcher';
    ELSIF NEW.role = 'org_admin' THEN
        prefix := 'ORG-ADM';
        entity_type_val := 'provider';
    ELSIF NEW.role = 'provider' THEN
        prefix := 'PRV';
        entity_type_val := 'provider';
    ELSE
        prefix := 'USR';
        entity_type_val := 'user';
    END IF;
    
    generated_id := public.generate_display_id(prefix);
    NEW.display_id := generated_id;
    
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES (COALESCE(entity_type_val, 'user'), NEW.id, generated_id)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET display_id = EXCLUDED.display_id;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_hospital_created_generate_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    generated_id TEXT;
BEGIN
    IF NEW.display_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    generated_id := public.generate_display_id('ORG');
    NEW.display_id := generated_id;
    
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES ('hospital', NEW.id, generated_id)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET display_id = EXCLUDED.display_id;
    
    RETURN NEW;
END;
$$;

-- 3. RE-ATTACH TRIGGERS
DROP TRIGGER IF EXISTS on_profile_created_id_mapping ON public.profiles;
CREATE TRIGGER on_profile_created_id_mapping
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_generate_id();

DROP TRIGGER IF EXISTS on_hospital_created_id_mapping ON public.hospitals;
CREATE TRIGGER on_hospital_created_id_mapping
BEFORE INSERT ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.on_hospital_created_generate_id();

-- 4. COMPREHENSIVE BACKFILL
DO $$
DECLARE
    rec RECORD;
    p_prefix TEXT;
    e_type TEXT;
    g_id TEXT;
BEGIN
    FOR rec IN SELECT id, role FROM public.profiles WHERE display_id IS NULL LOOP
        IF rec.role = 'patient' THEN
            p_prefix := 'IVP';
            e_type := 'patient';
        ELSIF rec.role = 'admin' THEN
            p_prefix := 'ADM';
            e_type := 'admin';
        ELSIF rec.role = 'dispatcher' THEN
            p_prefix := 'DSP';
            e_type := 'dispatcher';
        ELSIF rec.role = 'org_admin' THEN
            p_prefix := 'ORG-ADM';
            e_type := 'provider';
        ELSIF rec.role = 'provider' THEN
            p_prefix := 'PRV';
            e_type := 'provider';
        ELSE
            p_prefix := 'USR';
            e_type := 'user';
        END IF;

        g_id := public.generate_display_id(p_prefix);
        
        UPDATE public.profiles SET display_id = g_id WHERE id = rec.id;
        
        INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
        VALUES (COALESCE(e_type, 'user'), rec.id, g_id)
        ON CONFLICT (entity_type, entity_id) DO UPDATE SET display_id = EXCLUDED.display_id;
    END LOOP;

    FOR rec IN SELECT id FROM public.hospitals WHERE display_id IS NULL LOOP
        g_id := public.generate_display_id('ORG');
        UPDATE public.hospitals SET display_id = g_id WHERE id = rec.id;
        
        INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
        VALUES ('hospital', rec.id, g_id)
        ON CONFLICT (entity_type, entity_id) DO UPDATE SET display_id = EXCLUDED.display_id;
    END LOOP;
END;
$$;

-- 5. FIX get_display_ids
DROP FUNCTION IF EXISTS public.get_display_ids(TEXT[]);
CREATE OR REPLACE FUNCTION public.get_display_ids(p_entity_ids TEXT[])
RETURNS TABLE(id_out UUID, display_id_out TEXT) 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT m.entity_id, m.display_id 
    FROM public.id_mappings m
    WHERE m.entity_id::text = ANY(p_entity_ids);
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
