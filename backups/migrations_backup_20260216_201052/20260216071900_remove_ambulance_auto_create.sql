-- Migration: Remove ambulance auto-creation from sync_provider_records
--
-- Problem: Setting provider_type='ambulance' on a profile auto-creates
-- an ambulance record. Ambulances are vehicles, not people — they should
-- only be created explicitly via the Ambulances page.
--
-- Fix: Rebuild the trigger to only handle doctor sync.
-- The ambulance block is removed entirely.

DROP TRIGGER IF EXISTS tr_sync_provider_records ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_provider_records();

CREATE FUNCTION public.sync_provider_records()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_hospital_id uuid;
BEGIN
    -- Only act if role is provider and provider_type is set
    IF NEW.role = 'provider' AND NEW.provider_type IS NOT NULL THEN
        
        -- Attempt to resolve a valid hospital_id from the organization
        BEGIN
            SELECT id INTO found_hospital_id 
            FROM public.hospitals 
            WHERE organization_id::text = NEW.organization_id::text 
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            found_hospital_id := NULL;
        END;

        -- Handle Doctors only
        IF LOWER(NEW.provider_type) = 'doctor' THEN
            INSERT INTO public.doctors (
                profile_id,
                name,
                email,
                phone,
                hospital_id,
                status,
                specialization,
                updated_at
            ) VALUES (
                NEW.id,
                COALESCE(NEW.full_name, NEW.username),
                NEW.email,
                NEW.phone,
                found_hospital_id,
                'available',
                'General Practice',
                now()
            )
            ON CONFLICT (profile_id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                hospital_id = EXCLUDED.hospital_id,
                updated_at = now();
        END IF;

        -- NOTE: Ambulance records are NOT auto-created here.
        -- Ambulances are vehicles — create them via the Ambulances page,
        -- then assign a driver via the modal's Driver Assignment section.
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate the Trigger
CREATE TRIGGER tr_sync_provider_records
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_provider_records();

NOTIFY pgrst, 'reload schema';
