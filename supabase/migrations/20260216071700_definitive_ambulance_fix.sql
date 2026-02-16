-- Migration: Definitive Fix for Ambulance Provider Assignment
--
-- Root cause analysis:
-- 1. ambulances.id is TEXT NOT NULL with no DEFAULT - INSERT without id fails
-- 2. Potential uuid=text comparisons in RLS policies on ambulances
-- 3. Need to ensure trigger provides all required columns
--
-- Fix:
-- 1. Add a DEFAULT to ambulances.id so inserts without explicit id work
-- 2. Rebuild sync_provider_records to generate an id for ambulance inserts
-- 3. Drop and recreate any problematic RLS policies with safe casting

-- STEP 1: Add default to ambulances.id if it doesn't have one
ALTER TABLE public.ambulances 
ALTER COLUMN id SET DEFAULT ('amb_' || substr(gen_random_uuid()::text, 1, 8));

-- STEP 2: Fix RLS policies on ambulances that might compare uuid = text
-- Drop potentially problematic policies
DROP POLICY IF EXISTS "Org members can view own ambulances" ON public.ambulances;
DROP POLICY IF EXISTS "Admins can view all ambulances" ON public.ambulances;
DROP POLICY IF EXISTS "Authenticated users can view ambulances" ON public.ambulances;
DROP POLICY IF EXISTS "Platform Admins can manage ambulances" ON public.ambulances;
DROP POLICY IF EXISTS "Service Role full access ambulances" ON public.ambulances;
DROP POLICY IF EXISTS "Public read access for ambulances" ON public.ambulances;

-- Recreate policies with safe type casting
CREATE POLICY "Authenticated users can view ambulances"
    ON public.ambulances FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage ambulances"
    ON public.ambulances FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'org_admin')
        )
    );

CREATE POLICY "Service role full access ambulances" 
    ON public.ambulances FOR ALL
    USING (auth.role() = 'service_role');

-- Org members policy with safe casting
CREATE POLICY "Org members can view own ambulances"
    ON public.ambulances FOR SELECT
    USING (
        hospital_id::text IN (
            SELECT organization_id::text FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- STEP 3: Rebuild the sync trigger with id generation
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
    gen_ambulance_id text;
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
            -- Generate a text ID for the ambulance
            gen_ambulance_id := 'amb_' || substr(gen_random_uuid()::text, 1, 8);
            
            INSERT INTO public.ambulances (
                id,
                profile_id,
                call_sign,
                hospital_id,
                status,
                type,
                updated_at
            ) VALUES (
                gen_ambulance_id,
                NEW.id,
                COALESCE(NEW.username, 'Unit-' || substr(NEW.id::text, 1, 6)),
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

-- Recreate the Trigger
CREATE TRIGGER tr_sync_provider_records
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_provider_records();

NOTIFY pgrst, 'reload schema';
