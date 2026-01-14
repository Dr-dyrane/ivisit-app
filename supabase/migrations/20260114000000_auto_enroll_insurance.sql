-- Migration: Auto-enroll Insurance and Backfill
-- Description: Adds a trigger to automatically enroll new users in the Basic Insurance Scheme and backfills existing users who lack insurance.

-- 1. Create Helper Function to Enroll a User
CREATE OR REPLACE FUNCTION public.enroll_basic_insurance(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_policy_number text;
BEGIN
    -- Check if user already has ANY insurance policy
    IF EXISTS (SELECT 1 FROM public.insurance_policies WHERE user_id = target_user_id) THEN
        RETURN;
    END IF;

    -- Generate a policy number (IV-BASIC- + random hex)
    v_policy_number := 'IV-BASIC-' || upper(substr(md5(random()::text), 1, 8));

    -- Insert Basic Policy
    INSERT INTO public.insurance_policies (
        user_id,
        provider_name,
        policy_number,
        plan_type,
        status,
        is_default,
        coverage_details,
        starts_at,
        expires_at
    ) VALUES (
        target_user_id,
        'iVisit Basic',
        v_policy_number,
        'basic',
        'active',
        true,
        '{"limit": 50000, "copay": 0, "description": "Covers 1 emergency ambulance trip per year", "type": "emergency_transport"}'::jsonb,
        now(),
        (now() + interval '1 year')
    );
END;
$$;

-- 2. Create Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user_insurance_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- We perform the enrollment immediately after profile creation
    PERFORM public.enroll_basic_insurance(new.id);
    RETURN new;
END;
$$;

-- 3. Attach Trigger to Profiles Table
-- This ensures that whenever a user profile is created (via Auth signup), insurance is also created.
DROP TRIGGER IF EXISTS on_profile_created_enroll_insurance ON public.profiles;
CREATE TRIGGER on_profile_created_enroll_insurance
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_insurance_trigger();

-- 4. Backfill Existing Users
-- Automatically enroll any existing user who has a profile but no insurance policy.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id FROM public.profiles 
        WHERE id NOT IN (SELECT user_id FROM public.insurance_policies)
    LOOP
        PERFORM public.enroll_basic_insurance(r.id);
    END LOOP;
END $$;

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
