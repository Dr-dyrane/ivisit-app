-- Migration: Auto-stamp organization_id on ambulances from hospital
--
-- Whenever ambulances.hospital_id is set or changed, automatically
-- copy the hospital's organization_id to ambulances.organization_id.
-- This keeps org ownership always in sync without frontend logic.

CREATE OR REPLACE FUNCTION public.stamp_ambulance_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- When hospital_id is set, copy the hospital's organization_id
    IF NEW.hospital_id IS NOT NULL THEN
        SELECT h.organization_id INTO NEW.organization_id
        FROM public.hospitals h
        WHERE h.id = NEW.hospital_id;
    ELSE
        -- No hospital → no org
        NEW.organization_id := NULL;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS tr_stamp_ambulance_org ON public.ambulances;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER tr_stamp_ambulance_org
    BEFORE INSERT OR UPDATE OF hospital_id ON public.ambulances
    FOR EACH ROW
    EXECUTE FUNCTION public.stamp_ambulance_org_id();

-- Backfill: update existing ambulances that have hospital_id but no organization_id
UPDATE public.ambulances a
SET organization_id = h.organization_id
FROM public.hospitals h
WHERE a.hospital_id = h.id
  AND a.organization_id IS NULL
  AND h.organization_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
