-- Migration: Sync Organization ID from Hospitals to Profiles
-- Description: Ensures that whenever a hospital is updated, its org_admin_id profile gets the correct organization_id.
-- Also ensures that if a profile's organization_id is NULL but they manage a hospital, it gets backfilled.

-- 1. Function to sync org_id from hospital to admin profile
CREATE OR REPLACE FUNCTION public.sync_hospital_org_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_admin_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
        UPDATE public.profiles
        SET organization_id = NEW.organization_id
        WHERE id = NEW.org_admin_id
        AND (organization_id IS NULL OR organization_id != NEW.organization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on hospitals
DROP TRIGGER IF EXISTS tr_sync_hospital_org_to_profile ON public.hospitals;
CREATE TRIGGER tr_sync_hospital_org_to_profile
    AFTER INSERT OR UPDATE OF org_admin_id, organization_id ON public.hospitals
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_hospital_org_to_profile();

-- 3. Backfill existing profile organization_ids from their managed hospitals
UPDATE public.profiles p
SET organization_id = h.organization_id
FROM public.hospitals h
WHERE p.id = h.org_admin_id
AND p.organization_id IS NULL
AND h.organization_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
