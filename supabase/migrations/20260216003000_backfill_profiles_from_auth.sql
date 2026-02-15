-- ============================================================
-- Migration: FIX INSURANCE ENROLLMENT + BACKFILL PROFILES
-- ============================================================
-- 1. Fix enroll_basic_insurance() — remove "status" column ref
-- 2. Backfill profiles from auth.users
-- 3. Cascade to preferences, medical_profiles, patient_wallets  
--    (triggers handle insurance auto-enrollment)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FIX: enroll_basic_insurance — drop "status" from INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.enroll_basic_insurance(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_policy_number TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM public.insurance_policies WHERE user_id::text = p_user_id::text) THEN
        RETURN;
    END IF;

    v_policy_number := 'IV-BASIC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));

    INSERT INTO public.insurance_policies (
        user_id, provider_name, policy_number, plan_type,
        is_default, coverage_details, starts_at, expires_at
    ) VALUES (
        p_user_id, 'iVisit Basic', v_policy_number, 'basic',
        TRUE,
        '{"trip_limit": 1, "amount_limit": 50000, "description": "Covers 1 emergency ambulance trip per year", "type": "emergency_transport"}'::jsonb,
        NOW(), (NOW() + INTERVAL '1 year')
    );
END;
$$;

-- ============================================================
-- 2. BACKFILL: profiles from auth.users
-- ============================================================
INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, image_uri, created_at, updated_at)
SELECT
  u.id,
  u.email,
  u.phone,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'avatar_url',
  u.raw_user_meta_data->>'avatar_url',
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id::text = u.id::text
);
-- NOTE: profile INSERT triggers auto-create:
--   → preferences (handle_new_user triggers on auth.users, but we also backfill below)
--   → medical_profiles (on_profile_created_medical trigger)
--   → patient_wallets (on_profile_created_create_wallet trigger)
--   → insurance_policies (on_profile_created_enroll_insurance trigger)
--   → username auto-generation (on_profile_set_username trigger)

-- ============================================================
-- 3. BACKFILL: preferences (in case trigger didn't fire)
-- ============================================================
INSERT INTO public.preferences (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.preferences pr WHERE pr.user_id::text = p.id::text
);

-- ============================================================
-- 4. BACKFILL: medical_profiles
-- ============================================================
INSERT INTO public.medical_profiles (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_profiles mp WHERE mp.user_id::text = p.id::text
);

-- ============================================================
-- 5. BACKFILL: patient_wallets
-- ============================================================
INSERT INTO public.patient_wallets (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.patient_wallets pw WHERE pw.user_id::text = p.id::text
);

NOTIFY pgrst, 'reload schema';

COMMIT;
