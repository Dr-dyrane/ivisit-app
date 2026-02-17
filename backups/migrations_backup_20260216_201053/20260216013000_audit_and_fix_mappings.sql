-- 20260216013000_audit_and_fix_mappings.sql
-- Restoration of broken ID mappings and re-attachment of generation triggers.

BEGIN;

-- 1. RE-ATTACH TRIGGERS (Ensuring future entities get IDs)
DROP TRIGGER IF EXISTS on_hospital_created_id_mapping ON public.hospitals;
CREATE TRIGGER on_hospital_created_id_mapping
AFTER INSERT ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.on_hospital_created_generate_id();

DROP TRIGGER IF EXISTS on_profile_created_id_mapping ON public.profiles;
CREATE TRIGGER on_profile_created_id_mapping
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_generate_id();

-- 2. ROBUST ID MAPPING SYNCHRONIZATION
-- We use INSERT ... ON CONFLICT (display_id) to link orphaned entities
-- This ensures that if a display_id exists in id_mappings but has a NULL entity_id, it gets updated.

-- Hospitals
INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
SELECT 'hospital', h.id, h.display_id
FROM public.hospitals h
WHERE h.display_id IS NOT NULL
ON CONFLICT (display_id) DO UPDATE SET entity_id = EXCLUDED.entity_id;

-- Profiles (All relevant roles)
INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
SELECT 
    CASE 
        WHEN p.role = 'patient' THEN 'patient'
        WHEN p.role IN ('admin', 'org_admin') THEN 'admin'
        WHEN p.role = 'dispatcher' THEN 'dispatcher'
        WHEN p.role = 'provider' THEN 'provider'
        ELSE 'user'
    END,
    p.id, p.display_id
FROM public.profiles p
WHERE p.display_id IS NOT NULL
ON CONFLICT (display_id) DO UPDATE SET entity_id = EXCLUDED.entity_id;

-- 3. FIX get_display_ids (Avoid variable collision and handle native types)
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
