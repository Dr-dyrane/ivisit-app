-- 🏯 Module 08: Security Layer (RLS)
-- Row Level Security & Access Control Policies

-- 🛡️ SECURITY DEFINER HELPERS (Kill Recursion)
CREATE OR REPLACE FUNCTION public.p_is_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.p_get_current_org_id()
RETURNS UUID SECURITY DEFINER AS $$
BEGIN
    RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- 🛡️ ENABLE RLS ON ALL TABLES
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') 
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ENABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- 🛡️ UNIVERSAL ADMIN POLICY
-- Grant admins full access to everything (override)
/* 
Note: Policies must be per-table, but we'll focus on the most critical ones first 
to ensure a clean "Ground Zero" state.
*/

-- 1. PROFILES
CREATE POLICY "Profiles are readable by owner or admin"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.p_is_admin());

CREATE POLICY "Profiles are updatable by owner"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. EMERGENCY REQUESTS
CREATE POLICY "Users see own emergency requests"
ON public.emergency_requests FOR SELECT
USING (auth.uid() = user_id OR public.p_is_admin());

CREATE POLICY "Org Admins see their hospital emergencies"
ON public.emergency_requests FOR SELECT
USING (
    hospital_id IN (
        SELECT id FROM public.hospitals 
        WHERE organization_id = public.p_get_current_org_id()
    )
);

-- 3. ORGANIZATIONS & HOSPITALS
CREATE POLICY "Public read for active organizations"
ON public.organizations FOR SELECT
USING (is_active = true);

CREATE POLICY "Public read for verified hospitals"
ON public.hospitals FOR SELECT
USING (verified = true OR organization_id = public.p_get_current_org_id());

-- 4. FINANCIALS (Very Restricted)
CREATE POLICY "Users see own wallets"
ON public.patient_wallets FOR SELECT
USING (auth.uid() = user_id OR public.p_is_admin());

CREATE POLICY "Org Admins see own org wallet"
ON public.organization_wallets FOR SELECT
USING (organization_id = public.p_get_current_org_id() OR public.p_is_admin());

CREATE POLICY "Users see own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id OR public.p_is_admin());

-- 5. NOTIFICATIONS
CREATE POLICY "Users see own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications (read status)"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 🛡️ DEFAULT PERMISSIVE READ FOR PUBLIC CONTENT
CREATE POLICY "Public read for health news" ON public.health_news FOR SELECT USING (published = true);
CREATE POLICY "Public read for support faqs" ON public.support_faqs FOR SELECT USING (true);
