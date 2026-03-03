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

-- 🛡️ RBAC: Console Access Control
CREATE OR REPLACE FUNCTION public.p_is_console_allowed()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'org_admin', 'dispatcher', 'viewer')
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.p_get_current_org_id()
RETURNS UUID SECURITY DEFINER AS $$
BEGIN
    RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- 🛡️ ENABLE RLS ON ALL TABLES (Explicit List)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Analytics Tables (UPDATED for 0006)
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

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
TO authenticated
USING (auth.uid() = user_id OR public.p_is_admin());

CREATE POLICY "Users can create emergency requests"
ON public.emergency_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency requests"
ON public.emergency_requests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Org Admins see their hospital emergencies"
ON public.emergency_requests FOR SELECT
TO authenticated
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
USING (
    verified = true
    OR organization_id = public.p_get_current_org_id()
    OR public.p_is_admin()
);

-- 4. FINANCIALS (Very Restricted)
CREATE POLICY "Users see own wallets"
ON public.patient_wallets FOR SELECT
USING (auth.uid() = user_id OR public.p_is_admin());

CREATE POLICY "Org Admins see own org wallet"
ON public.organization_wallets FOR SELECT
USING (organization_id = public.p_get_current_org_id() OR public.p_is_admin());

CREATE POLICY "Users see own payments"
ON public.payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.p_is_admin());

CREATE POLICY "Org Admins see org payments"
ON public.payments FOR SELECT
TO authenticated
USING (organization_id = public.p_get_current_org_id() OR public.p_is_admin());

CREATE POLICY "Users manage own payment methods"
ON public.payment_methods FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users manage own insurance policies"
ON public.insurance_policies FOR ALL
USING (auth.uid() = user_id);

-- 5. NOTIFICATIONS
CREATE POLICY "Users see own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications (read status)"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users insert own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. USER DATA (Preferences & Medical)
CREATE POLICY "Users manage own preferences"
ON public.preferences FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users manage own medical profiles"
ON public.medical_profiles FOR ALL
USING (auth.uid() = user_id);

-- 7. LOGISTICS (Ambulances & Visits)
CREATE POLICY "Public read for ambulances"
ON public.ambulances FOR SELECT
USING (true);

CREATE POLICY "Org Admins manage ambulances"
ON public.ambulances FOR ALL
USING (
    organization_id = public.p_get_current_org_id()
    OR hospital_id IN (
        SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id()
    )
    OR public.p_is_admin()
)
WITH CHECK (
    organization_id = public.p_get_current_org_id()
    OR hospital_id IN (
        SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id()
    )
    OR public.p_is_admin()
);

CREATE POLICY "Users see own visits"
ON public.visits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert/update own visits"
ON public.visits FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- 8. OPS CONTENT
CREATE POLICY "Public read for health news" ON public.health_news FOR SELECT USING (published = true);
CREATE POLICY "Public read for support faqs" ON public.support_faqs FOR SELECT USING (true);

-- 9. ANALYTICS
CREATE POLICY "Users see own activity" ON public.user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own search history" ON public.search_history FOR ALL USING (auth.uid() = user_id);

-- 10. MISSING RLS ENABLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivisit_main_wallet ENABLE ROW LEVEL SECURITY;

-- 11. MISSING POLICIES

-- Subscribers: allow public insert (newsletter sign-up), admin reads all
CREATE POLICY "Public can subscribe" ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read subscribers" ON public.subscribers FOR SELECT USING (public.p_is_admin());

-- Doctors: public read, org admins manage their own
CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Org Admins manage doctors" ON public.doctors FOR ALL
USING (
    hospital_id IN (SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id())
    OR public.p_is_admin()
);

-- Wallet Ledger: admins + org admins see relevant entries
CREATE POLICY "Admins see all ledger" ON public.wallet_ledger FOR SELECT USING (public.p_is_admin());

-- Support Tickets: users manage own, admins see all
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL
USING (auth.uid() = user_id OR public.p_is_admin());

-- Documents: public reads public tier, admins read all
CREATE POLICY "Public read public documents" ON public.documents FOR SELECT
USING (tier = 'public' OR public.p_is_admin());

-- Admin Audit Log: admins only
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT USING (public.p_is_admin());

-- Search Events: any authenticated user can insert, admins read
CREATE POLICY "Authenticated users insert search events" ON public.search_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read search events" ON public.search_events FOR SELECT USING (public.p_is_admin());

-- Trending Topics: public read
CREATE POLICY "Public read trending topics" ON public.trending_topics FOR SELECT USING (true);
CREATE POLICY "Admins manage trending topics" ON public.trending_topics FOR ALL USING (public.p_is_admin());

-- User Roles: users see own, admins see all
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.p_is_admin());

-- User Sessions: users see own
CREATE POLICY "Users see own sessions" ON public.user_sessions FOR ALL
USING (auth.uid() = user_id);

-- iVisit Main Wallet: platform admins only
CREATE POLICY "Admins manage main wallet" ON public.ivisit_main_wallet FOR ALL USING (public.p_is_admin());

-- User Activity: admins can also insert (for RPC logging)
CREATE POLICY "Users insert own activity" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all activity" ON public.user_activity FOR SELECT USING (public.p_is_admin());

-- 12. NEW TABLES: DOCTOR SCHEDULES, ASSIGNMENTS, INSURANCE BILLING

ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_doctor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_billing ENABLE ROW LEVEL SECURITY;

-- Doctor Schedules: public read, org admins manage
CREATE POLICY "Public read doctor schedules" ON public.doctor_schedules FOR SELECT USING (true);
CREATE POLICY "Org Admins manage doctor schedules" ON public.doctor_schedules FOR ALL
USING (
    doctor_id IN (
        SELECT d.id FROM public.doctors d
        JOIN public.hospitals h ON d.hospital_id = h.id
        WHERE h.organization_id = public.p_get_current_org_id()
    )
    OR public.p_is_admin()
);

-- Emergency Doctor Assignments: users see own, org admins see org
CREATE POLICY "Users see own doctor assignments" ON public.emergency_doctor_assignments FOR SELECT
USING (
    emergency_request_id IN (
        SELECT id FROM public.emergency_requests WHERE user_id = auth.uid()
    )
    OR public.p_is_admin()
);

CREATE POLICY "Org Admins manage doctor assignments" ON public.emergency_doctor_assignments FOR ALL
USING (
    doctor_id IN (
        SELECT d.id FROM public.doctors d
        JOIN public.hospitals h ON d.hospital_id = h.id
        WHERE h.organization_id = public.p_get_current_org_id()
    )
    OR public.p_is_admin()
);

-- Insurance Billing: users see own, org admins see hospital, admins manage all
CREATE POLICY "Users see own billing" ON public.insurance_billing FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Org Admins see hospital billing" ON public.insurance_billing FOR SELECT
USING (
    hospital_id IN (
        SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id()
    )
);

CREATE POLICY "Admins manage all billing" ON public.insurance_billing FOR ALL
USING (public.p_is_admin());
