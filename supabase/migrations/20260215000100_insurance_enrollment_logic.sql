-- Migration: Insurance Enrollment Logic
-- Description: Sets up the functions and triggers for iVisit Basic.

-- Function
CREATE OR REPLACE FUNCTION public.enroll_basic_insurance(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_policy_number TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM public.insurance_policies WHERE user_id = p_user_id) THEN
        RETURN;
    END IF;

    v_policy_number := 'IV-BASIC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));

    EXECUTE 'INSERT INTO public.insurance_policies (
        user_id, provider_name, policy_number, plan_type, status, 
        is_default, coverage_details, starts_at, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'
    USING p_user_id, 'iVisit Basic', v_policy_number, 'basic', 'active', 
          TRUE, 
          '{"trip_limit": 1, "amount_limit": 50000, "description": "Covers 1 emergency ambulance trip per year", "type": "emergency_transport"}'::jsonb,
          NOW(), (NOW() + INTERVAL '1 year');
END;
$$;

-- Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_insurance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN PERFORM public.enroll_basic_insurance(NEW.id); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS on_profile_created_enroll_insurance ON public.profiles;
CREATE TRIGGER on_profile_created_enroll_insurance
    AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_insurance();

-- Backfill (One-off)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM public.insurance_policies ip WHERE ip.user_id = p.id) LOOP
        BEGIN
            PERFORM public.enroll_basic_insurance(r.id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to enroll user %: %', r.id, SQLERRM;
        END;
    END LOOP;
END $$;
