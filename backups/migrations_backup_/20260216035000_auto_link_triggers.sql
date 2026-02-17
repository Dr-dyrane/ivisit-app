-- Migration: Auto-Link Triggers for Doctors and Ambulances
-- Description: Migrates UI-side logic to DB triggers for reliability

-- 1. Trigger Function to sync provider records
CREATE OR REPLACE FUNCTION public.sync_provider_records()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only act if role is provider and provider_type is set
    IF NEW.role = 'provider' AND NEW.provider_type IS NOT NULL THEN
        
        -- Handle Doctors
        IF LOWER(NEW.provider_type) = 'doctor' THEN
            INSERT INTO public.doctors (
                profile_id,
                name,
                email,
                phone,
                hospital_id,
                status,
                updated_at
            ) VALUES (
                NEW.id,
                COALESCE(NEW.full_name, NEW.username),
                NEW.email,
                NEW.phone,
                NEW.organization_id,
                'available',
                now()
            )
            ON CONFLICT (profile_id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                hospital_id = EXCLUDED.hospital_id,
                updated_at = now();
        
        -- Handle Ambulances
        ELSIF LOWER(NEW.provider_type) = 'ambulance' THEN
            INSERT INTO public.ambulances (
                profile_id,
                call_sign,
                hospital_id,
                status,
                type,
                updated_at
            ) VALUES (
                NEW.id,
                NEW.username,
                NEW.organization_id,
                'available',
                'Basic',
                now()
            )
            ON CONFLICT (profile_id) DO UPDATE SET
                call_sign = EXCLUDED.call_sign,
                hospital_id = EXCLUDED.hospital_id,
                updated_at = now();
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. Attach Trigger
DROP TRIGGER IF EXISTS tr_sync_provider_records ON public.profiles;
CREATE TRIGGER tr_sync_provider_records
AFTER INSERT OR UPDATE OF role, provider_type, organization_id, full_name, username
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_provider_records();

-- 3. Initial Sync (Backfill existing providers)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM public.profiles WHERE role = 'provider' AND provider_type IS NOT NULL LOOP
        -- Re-trigger for each existing provider to ensure records exist
        -- Use an UPDATE that doesn't change anything to fire the trigger
        UPDATE public.profiles SET updated_at = now() WHERE id = r.id;
    END LOOP;
END;
$$;
