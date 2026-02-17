-- ============================================================
-- Migration: RESTORE AUTO-CREATION TRIGGERS
-- ============================================================
-- Restores functions & triggers dropped during flexible_ids:
--   1. handle_new_user()           → auto-create profile + preferences on signup
--   2. handle_new_user_medical_profile() → auto-create medical_profile on profile insert
--   3. ensure_patient_wallet()     → auto-create patient_wallet on profile insert
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PROFILE AUTO-CREATION (auth.users → profiles + preferences)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, image_uri, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = EXCLUDED.avatar_url,
    image_uri = COALESCE(EXCLUDED.image_uri, profiles.image_uri),
    updated_at = now();

  INSERT INTO public.preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. MEDICAL PROFILE AUTO-CREATION (profiles → medical_profiles)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_medical_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.medical_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_medical ON public.profiles;
CREATE TRIGGER on_profile_created_medical
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_medical_profile();

-- ============================================================
-- 3. PATIENT WALLET AUTO-CREATION (profiles → patient_wallets)
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_patient_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patient_wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_create_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_patient_wallet();

-- ============================================================
-- 4. RELOAD SCHEMA
-- ============================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
