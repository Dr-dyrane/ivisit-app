-- Migration: Granular ID Prefixes
-- Description: Separates ADM (Admin/OrgAdmin) and DSP (Dispatcher) from PRV prefix

BEGIN;

-- 1. Update id_mappings entity_type check constraint
ALTER TABLE public.id_mappings DROP CONSTRAINT IF EXISTS id_mappings_entity_type_check;
ALTER TABLE public.id_mappings ADD CONSTRAINT id_mappings_entity_type_check 
    CHECK (entity_type IN ('patient', 'provider', 'hospital', 'admin', 'dispatcher'));

-- 2. Update on_profile_created_generate_id trigger function
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

-- 3. Migration: Move existing admins/dispatchers to new prefixes
-- Note: This will give them NEW IDs. This is usually acceptable in early stage/beautification phase.

-- Update Admins
DO $$
DECLARE
    rec RECORD;
    new_display_id TEXT;
BEGIN
    FOR rec IN 
        SELECT p.id, p.role, m.display_id as old_id
        FROM public.profiles p
        JOIN public.id_mappings m ON p.id = m.entity_id
        WHERE p.role IN ('admin', 'org_admin') AND m.entity_type = 'provider'
    LOOP
        new_display_id := public.generate_display_id('ADM');
        
        UPDATE public.id_mappings 
        SET entity_type = 'admin',
            display_id = new_display_id
        WHERE entity_id = rec.id AND entity_type = 'provider';
    END LOOP;
END;
$$;

-- Update Dispatchers
DO $$
DECLARE
    rec RECORD;
    new_display_id TEXT;
BEGIN
    FOR rec IN 
        SELECT p.id, p.role, m.display_id as old_id
        FROM public.profiles p
        JOIN public.id_mappings m ON p.id = m.entity_id
        WHERE p.role = 'dispatcher' AND m.entity_type = 'provider'
    LOOP
        new_display_id := public.generate_display_id('DSP');
        
        UPDATE public.id_mappings 
        SET entity_type = 'dispatcher',
            display_id = new_display_id
        WHERE entity_id = rec.id AND entity_type = 'provider';
    END LOOP;
END;
$$;

COMMIT;
