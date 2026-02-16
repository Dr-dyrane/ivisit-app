-- Migration: Fix UUID vs Text Comparison in Sync Trigger
--
-- The previous migration failed with "operator does not exist: uuid = text"
-- during the hospital lookup. This implies hospitals.organization_id
-- might be stored as TEXT, while profiles.organization_id is UUID.
--
-- FIX: Cast both sides to TEXT for the comparison in sync_provider_records.

CREATE OR REPLACE FUNCTION public.sync_provider_records()
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
        -- Safe comparison by casting both to text
        BEGIN
            SELECT id INTO found_hospital_id 
            FROM public.hospitals 
            WHERE organization_id::text = NEW.organization_id::text 
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            found_hospital_id := NULL;
        END;

        -- Handle Doctors
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
                found_hospital_id,
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

NOTIFY pgrst, 'reload schema';
