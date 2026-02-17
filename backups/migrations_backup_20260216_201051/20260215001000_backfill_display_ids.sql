-- Migration: Backfill Display IDs for existing users and hospitals
-- Description: Ensures all existing records in profiles and hospitals have an entry in id_mappings.

DO $$
DECLARE
    profile_rec RECORD;
    hospital_rec RECORD;
BEGIN
    -- 1. Backfill Profiles
    FOR profile_rec IN (
        SELECT id, role FROM public.profiles 
        WHERE id NOT IN (SELECT entity_id FROM public.id_mappings)
    ) LOOP
        -- Reuse the existing trigger function logic to generate IDs
        -- It uses generate_display_id(prefix)
        PERFORM public.on_profile_created_generate_id_logic(profile_rec.id, profile_rec.role);
    END LOOP;

    -- 2. Backfill Hospitals
    FOR hospital_rec IN (
        SELECT id FROM public.hospitals 
        WHERE id NOT IN (SELECT entity_id FROM public.id_mappings)
    ) LOOP
        INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
        VALUES ('hospital', hospital_rec.id, public.generate_display_id('ORG'))
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Helper to allow manual trigger logic execution for backfills
CREATE OR REPLACE FUNCTION public.on_profile_created_generate_id_logic(p_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prefix TEXT;
    entity_type_val TEXT;
    display_id TEXT;
BEGIN
    IF p_role = 'patient' THEN
        prefix := 'IVP';
        entity_type_val := 'patient';
    ELSIF p_role IN ('admin', 'org_admin') THEN
        prefix := 'ADM';
        entity_type_val := 'admin';
    ELSIF p_role = 'dispatcher' THEN
        prefix := 'DSP';
        entity_type_val := 'dispatcher';
    ELSIF p_role = 'provider' THEN
        prefix := 'PRV';
        entity_type_val := 'provider';
    ELSE
        -- No prefix for other roles
        RETURN;
    END IF;
    
    display_id := public.generate_display_id(prefix);
    
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES (entity_type_val, p_id, display_id)
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
END;
$$;

-- Run backfill again using the helper just in case
SELECT public.on_profile_created_generate_id_logic(p.id, p.role)
FROM public.profiles p
WHERE p.id NOT IN (SELECT entity_id FROM public.id_mappings);

NOTIFY pgrst, 'reload schema';
