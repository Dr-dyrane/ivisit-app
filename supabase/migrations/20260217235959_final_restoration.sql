-- ==========================================================================
-- SYSTEM HEALING & RLS RESTORATION — 2026-02-17
-- ==========================================================================

BEGIN;

-- 1. UTILITY FUNCTIONS
DROP FUNCTION IF EXISTS public.get_current_user_role CASCADE;
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;

DROP FUNCTION IF EXISTS public.get_current_user_org_id CASCADE;
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.profiles WHERE id = auth.uid(); $$;

DROP FUNCTION IF EXISTS public.get_current_user_onboarding_status CASCADE;
CREATE OR REPLACE FUNCTION public.get_current_user_onboarding_status()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT onboarding_status FROM public.profiles WHERE id = auth.uid(); $$;

-- 2. AUTOMATION TRIGGERS

-- Auth -> Profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, updated_at)
  VALUES (NEW.id, NEW.email, NEW.phone, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', now())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, phone = EXCLUDED.phone, updated_at = now();
  INSERT INTO public.preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Medical & Wallets
CREATE OR REPLACE FUNCTION public.handle_new_user_medical_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.medical_profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_profile_created_medical ON public.profiles;
CREATE TRIGGER on_profile_created_medical AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_medical_profile();

CREATE OR REPLACE FUNCTION public.ensure_patient_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.patient_wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_profile_created_create_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_create_wallet AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.ensure_patient_wallet();

-- ID Mappings
CREATE OR REPLACE FUNCTION public.on_hospital_created_generate_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES ('hospital', NEW.id::text, public.generate_display_id('ORG')) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_hospital_created_id_mapping ON public.hospitals;
CREATE TRIGGER on_hospital_created_id_mapping AFTER INSERT ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.on_hospital_created_generate_id();

-- 3. RLS RESTORATION (With Clean Slates)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage all organizations" ON public.organizations;
CREATE POLICY "Admins manage all organizations" ON public.organizations FOR ALL USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Public read organizations" ON public.organizations;
CREATE POLICY "Public read organizations" ON public.organizations FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users view own organization" ON public.organizations;
CREATE POLICY "Users view own organization" ON public.organizations FOR SELECT USING (id = public.get_current_user_org_id());

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.get_current_user_role() = 'admin');

-- Hospitals
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read hospitals" ON public.hospitals;
CREATE POLICY "Public read hospitals" ON public.hospitals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Platform admins manage hospitals" ON public.hospitals;
CREATE POLICY "Platform admins manage hospitals" ON public.hospitals FOR ALL USING (public.get_current_user_role() = 'admin');

-- Doctors & Ambulances (Restoring Org Admin RBAC)
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org admins manage doctors" ON public.doctors;
CREATE POLICY "Org admins manage doctors" ON public.doctors FOR ALL USING (
    EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = doctors.hospital_id AND h.organization_id = public.get_current_user_org_id() AND public.get_current_user_role() = 'org_admin')
);

ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read ambulances" ON public.ambulances;
CREATE POLICY "Authenticated read ambulances" ON public.ambulances FOR SELECT TO authenticated USING (true);

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own emergencies" ON public.emergency_requests;
CREATE POLICY "Users manage own emergencies" ON public.emergency_requests FOR ALL USING (user_id = auth.uid());

-- 4. VIEWS restoration
DROP VIEW IF EXISTS public.available_hospitals CASCADE;
CREATE OR REPLACE VIEW public.available_hospitals AS
SELECT id, name, status, available_beds, ambulances_count, emergency_wait_time_minutes, last_availability_update, latitude, longitude
FROM public.hospitals WHERE status = 'available' AND (available_beds > 0 OR ambulances_count > 0);

GRANT SELECT ON public.available_hospitals TO anon, authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
