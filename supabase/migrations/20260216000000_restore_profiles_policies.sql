-- ============================================================
-- Migration: MASTER RLS POLICY RESTORATION
-- ============================================================
-- Restores ALL policies dropped during the flexible_ids migration.
-- Every DROP/CREATE is idempotent (DROP IF EXISTS + CREATE).
-- Uses get_current_user_role() SECURITY DEFINER to avoid recursion.
--
-- CASTING STRATEGY: Use auth.uid()::text for ALL comparisons.
-- PostgreSQL implicitly casts uuid->text, so text = text always works,
-- even if some columns are still UUID. This is safe and universal.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. ENSURE HELPER FUNCTION EXISTS
-- ============================================================
-- profiles.id might be UUID or TEXT; casting uid to text is safe either way
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id::text = auth.uid()::text;
$$;

-- ============================================================
-- 1. PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Staff can view all profiles for directory" ON public.profiles;
CREATE POLICY "Staff can view all profiles for directory"
  ON public.profiles FOR SELECT
  USING (
    public.get_current_user_role() IN ('admin', 'org_admin', 'provider', 'dispatcher')
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Service Role full access profiles" ON public.profiles;
CREATE POLICY "Service Role full access profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 2. HOSPITALS
-- ============================================================
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view hospitals" ON public.hospitals;
CREATE POLICY "Authenticated users can view hospitals"
  ON public.hospitals FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform Admins can manage hospitals" ON public.hospitals;
CREATE POLICY "Platform Admins can manage hospitals"
  ON public.hospitals FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Service Role full access hospitals" ON public.hospitals;
CREATE POLICY "Service Role full access hospitals"
  ON public.hospitals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3. DOCTORS
-- ============================================================
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view doctors" ON public.doctors;
CREATE POLICY "Authenticated users can view doctors"
  ON public.doctors FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform Admins can manage all doctors" ON public.doctors;
CREATE POLICY "Platform Admins can manage all doctors"
  ON public.doctors FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Service Role full access doctors" ON public.doctors;
CREATE POLICY "Service Role full access doctors"
  ON public.doctors FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 4. AMBULANCES
-- ============================================================
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ambulances" ON public.ambulances;
CREATE POLICY "Authenticated users can view ambulances"
  ON public.ambulances FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform Admins can manage ambulances" ON public.ambulances;
CREATE POLICY "Platform Admins can manage ambulances"
  ON public.ambulances FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Service Role full access ambulances" ON public.ambulances;
CREATE POLICY "Service Role full access ambulances"
  ON public.ambulances FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 5. EMERGENCY REQUESTS
-- ============================================================
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own emergencies" ON public.emergency_requests;
CREATE POLICY "Users manage own emergencies"
  ON public.emergency_requests FOR ALL
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Responders view assigned or pending" ON public.emergency_requests;
CREATE POLICY "Responders view assigned or pending"
  ON public.emergency_requests FOR SELECT
  USING (responder_id::text = auth.uid()::text OR status = 'pending');

DROP POLICY IF EXISTS "Responders update assigned" ON public.emergency_requests;
CREATE POLICY "Responders update assigned"
  ON public.emergency_requests FOR UPDATE
  USING (responder_id::text = auth.uid()::text OR status = 'pending');

DROP POLICY IF EXISTS "Admins view all emergencies" ON public.emergency_requests;
CREATE POLICY "Admins view all emergencies"
  ON public.emergency_requests FOR ALL
  USING (
    public.get_current_user_role() IN ('admin', 'org_admin', 'dispatcher', 'super_admin')
  );

DROP POLICY IF EXISTS "Service Role full access emergencies" ON public.emergency_requests;
CREATE POLICY "Service Role full access emergencies"
  ON public.emergency_requests FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 6. VISITS
-- ============================================================
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own visits" ON public.visits;
CREATE POLICY "Users can view own visits"
  ON public.visits FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own visits" ON public.visits;
CREATE POLICY "Users can insert own visits"
  ON public.visits FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own visits" ON public.visits;
CREATE POLICY "Users can update own visits"
  ON public.visits FOR UPDATE
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own visits" ON public.visits;
CREATE POLICY "Users can delete own visits"
  ON public.visits FOR DELETE
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins view all visits" ON public.visits;
CREATE POLICY "Admins view all visits"
  ON public.visits FOR ALL
  USING (
    public.get_current_user_role() IN ('admin', 'org_admin', 'dispatcher', 'super_admin')
  );

DROP POLICY IF EXISTS "Service Role full access visits" ON public.visits;
CREATE POLICY "Service Role full access visits"
  ON public.visits FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Service Role full access notifications" ON public.notifications;
CREATE POLICY "Service Role full access notifications"
  ON public.notifications FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 8. MEDICAL PROFILES
-- ============================================================
ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Medical profiles are readable by own user" ON public.medical_profiles;
CREATE POLICY "Medical profiles are readable by own user"
  ON public.medical_profiles FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Medical profiles are insertable by own user" ON public.medical_profiles;
CREATE POLICY "Medical profiles are insertable by own user"
  ON public.medical_profiles FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Medical profiles are updatable by own user" ON public.medical_profiles;
CREATE POLICY "Medical profiles are updatable by own user"
  ON public.medical_profiles FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all medical profiles" ON public.medical_profiles;
CREATE POLICY "Admins can view all medical profiles"
  ON public.medical_profiles FOR SELECT
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Service Role full access medical_profiles" ON public.medical_profiles;
CREATE POLICY "Service Role full access medical_profiles"
  ON public.medical_profiles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 9. PREFERENCES
-- ============================================================
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Preferences are readable by own user" ON public.preferences;
CREATE POLICY "Preferences are readable by own user"
  ON public.preferences FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Preferences are insertable by own user" ON public.preferences;
CREATE POLICY "Preferences are insertable by own user"
  ON public.preferences FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Preferences are updatable by own user" ON public.preferences;
CREATE POLICY "Preferences are updatable by own user"
  ON public.preferences FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- ============================================================
-- 10. INSURANCE POLICIES
-- ============================================================
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own insurance policies" ON public.insurance_policies;
CREATE POLICY "Users can view own insurance policies"
  ON public.insurance_policies FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own insurance policies" ON public.insurance_policies;
CREATE POLICY "Users can insert own insurance policies"
  ON public.insurance_policies FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own insurance policies" ON public.insurance_policies;
CREATE POLICY "Users can update own insurance policies"
  ON public.insurance_policies FOR UPDATE
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own insurance policies" ON public.insurance_policies;
CREATE POLICY "Users can delete own insurance policies"
  ON public.insurance_policies FOR DELETE
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all insurance policies" ON public.insurance_policies;
CREATE POLICY "Admins can view all insurance policies"
  ON public.insurance_policies FOR SELECT
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 11. PAYMENT METHODS
-- ============================================================
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can manage their own payment methods"
  ON public.payment_methods FOR ALL
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.payment_methods;
CREATE POLICY "Admins can view all payment methods"
  ON public.payment_methods FOR SELECT
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 12. WALLET LEDGER
-- ============================================================
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins see all ledger" ON public.wallet_ledger;
CREATE POLICY "Admins see all ledger"
  ON public.wallet_ledger FOR SELECT
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Patients see their own ledger" ON public.wallet_ledger;
CREATE POLICY "Patients see their own ledger"
  ON public.wallet_ledger FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Org admins see their ledger" ON public.wallet_ledger;
CREATE POLICY "Org admins see their ledger"
  ON public.wallet_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text
      AND p.organization_id::text = wallet_ledger.organization_id::text
    )
  );

DROP POLICY IF EXISTS "Service Role full access wallet_ledger" ON public.wallet_ledger;
CREATE POLICY "Service Role full access wallet_ledger"
  ON public.wallet_ledger FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 13. PATIENT WALLETS
-- ============================================================
ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own patient wallet" ON public.patient_wallets;
CREATE POLICY "Users manage own patient wallet"
  ON public.patient_wallets FOR ALL
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Service Role full access patient_wallets" ON public.patient_wallets;
CREATE POLICY "Service Role full access patient_wallets"
  ON public.patient_wallets FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 14. ORGANIZATION WALLETS
-- ============================================================
ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all org wallets" ON public.organization_wallets;
CREATE POLICY "Admins manage all org wallets"
  ON public.organization_wallets FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Org admins view their own wallet" ON public.organization_wallets;
CREATE POLICY "Org admins view their own wallet"
  ON public.organization_wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text
      AND p.organization_id::text = organization_wallets.organization_id::text
    )
  );

DROP POLICY IF EXISTS "Service Role full access organization_wallets" ON public.organization_wallets;
CREATE POLICY "Service Role full access organization_wallets"
  ON public.organization_wallets FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 15. IVISIT MAIN WALLET
-- ============================================================
ALTER TABLE public.ivisit_main_wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage main wallet" ON public.ivisit_main_wallet;
CREATE POLICY "Admins manage main wallet"
  ON public.ivisit_main_wallet FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Service Role full access main_wallet" ON public.ivisit_main_wallet;
CREATE POLICY "Service Role full access main_wallet"
  ON public.ivisit_main_wallet FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 16. SUPPORT FAQS (public read)
-- ============================================================
ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read FAQs" ON public.support_faqs;
CREATE POLICY "Read FAQs"
  ON public.support_faqs FOR SELECT
  TO public
  USING (true);

-- ============================================================
-- 17. SUPPORT TICKETS
-- ============================================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert own ticket" ON public.support_tickets;
CREATE POLICY "Insert own ticket"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Read own tickets" ON public.support_tickets;
CREATE POLICY "Read own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Update own tickets" ON public.support_tickets;
CREATE POLICY "Update own tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins manage all tickets" ON public.support_tickets;
CREATE POLICY "Admins manage all tickets"
  ON public.support_tickets FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 18. SEARCH HISTORY
-- ============================================================
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
CREATE POLICY "Users can view own search history"
  ON public.search_history FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own search history" ON public.search_history;
CREATE POLICY "Users can insert own search history"
  ON public.search_history FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read trending searches" ON public.search_history;
CREATE POLICY "Anyone can read trending searches"
  ON public.search_history FOR SELECT
  USING (true);

-- ============================================================
-- 19. SEARCH SELECTIONS
-- ============================================================
ALTER TABLE public.search_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own search selections" ON public.search_selections;
CREATE POLICY "Users can view own search selections"
  ON public.search_selections FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own search selections" ON public.search_selections;
CREATE POLICY "Users can insert own search selections"
  ON public.search_selections FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text OR user_id IS NULL);

DROP POLICY IF EXISTS "Anonymous can insert search selections" ON public.search_selections;
CREATE POLICY "Anonymous can insert search selections"
  ON public.search_selections FOR INSERT
  WITH CHECK (user_id IS NULL);

-- ============================================================
-- 20. SEARCH EVENTS (no user_id — anonymous tracking)
-- ============================================================
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert search events" ON public.search_events;
CREATE POLICY "Anyone can insert search events"
  ON public.search_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all search events" ON public.search_events;
CREATE POLICY "Admins can view all search events"
  ON public.search_events FOR SELECT
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 21. TRENDING TOPICS (public read)
-- ============================================================
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read trending topics" ON public.trending_topics;
CREATE POLICY "Anyone can read trending topics"
  ON public.trending_topics FOR SELECT
  USING (true);

-- ============================================================
-- 22. HEALTH NEWS (public read)
-- ============================================================
ALTER TABLE public.health_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read health news" ON public.health_news;
CREATE POLICY "Anyone can read health news"
  ON public.health_news FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage health news" ON public.health_news;
CREATE POLICY "Admins manage health news"
  ON public.health_news FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 23. USER ACTIVITY
-- ============================================================
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own activity" ON public.user_activity;
CREATE POLICY "Users view own activity"
  ON public.user_activity FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins view all activity" ON public.user_activity;
CREATE POLICY "Admins view all activity"
  ON public.user_activity FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Service Role full access user_activity" ON public.user_activity;
CREATE POLICY "Service Role full access user_activity"
  ON public.user_activity FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 24. DOCUMENTS (Data Room — no created_by; visibility is text[])
-- ============================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all documents" ON public.documents;
CREATE POLICY "Admins manage all documents"
  ON public.documents FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Granted users can view documents" ON public.documents;
CREATE POLICY "Granted users can view documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.access_requests ar
      WHERE ar.document_id::text = documents.id::text
      AND ar.user_id::text = auth.uid()::text
      AND ar.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Public documents are viewable" ON public.documents;
CREATE POLICY "Public documents are viewable"
  ON public.documents FOR SELECT
  USING ('public' = ANY(visibility));

-- ============================================================
-- 25. DOCUMENT INVITES
-- ============================================================
ALTER TABLE public.document_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage invites" ON public.document_invites;
CREATE POLICY "Admins manage invites"
  ON public.document_invites FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Anyone can view invites by token" ON public.document_invites;
CREATE POLICY "Anyone can view invites by token"
  ON public.document_invites FOR SELECT
  USING (true);

-- ============================================================
-- 26. ACCESS REQUESTS
-- ============================================================
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create access requests" ON public.access_requests;
CREATE POLICY "Users can create access requests"
  ON public.access_requests FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own access requests" ON public.access_requests;
CREATE POLICY "Users can view own access requests"
  ON public.access_requests FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins manage all access requests" ON public.access_requests;
CREATE POLICY "Admins manage all access requests"
  ON public.access_requests FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 27. USER ROLES
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
CREATE POLICY "Admins manage all roles"
  ON public.user_roles FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 28. SUBSCRIBERS
-- ============================================================
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.subscribers FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage subscribers" ON public.subscribers;
CREATE POLICY "Admins manage subscribers"
  ON public.subscribers FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 29. SERVICE PRICING
-- ============================================================
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view active service pricing" ON public.service_pricing;
CREATE POLICY "Public view active service pricing"
  ON public.service_pricing FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage all pricing" ON public.service_pricing;
CREATE POLICY "Admins manage all pricing"
  ON public.service_pricing FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Org admins manage hospital pricing" ON public.service_pricing;
CREATE POLICY "Org admins manage hospital pricing"
  ON public.service_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text
      AND p.organization_id::text = service_pricing.hospital_id::text
    )
  );

-- ============================================================
-- 30. ROOM PRICING
-- ============================================================
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view active room pricing" ON public.room_pricing;
CREATE POLICY "Public view active room pricing"
  ON public.room_pricing FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage all room pricing" ON public.room_pricing;
CREATE POLICY "Admins manage all room pricing"
  ON public.room_pricing FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Org admins manage hospital room pricing" ON public.room_pricing;
CREATE POLICY "Org admins manage hospital room pricing"
  ON public.room_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text
      AND p.organization_id::text = room_pricing.hospital_id::text
    )
  );

-- ============================================================
-- 31. PAYMENTS (legacy)
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
CREATE POLICY "Admins view all payments"
  ON public.payments FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Service Role full access payments" ON public.payments;
CREATE POLICY "Service Role full access payments"
  ON public.payments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 32. ORGANIZATIONS (legacy)
-- ============================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view organizations" ON public.organizations;
CREATE POLICY "Authenticated users can view organizations"
  ON public.organizations FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage organizations" ON public.organizations;
CREATE POLICY "Admins manage organizations"
  ON public.organizations FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 33. HOSPITAL IMPORT LOGS
-- ============================================================
ALTER TABLE public.hospital_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage import logs" ON public.hospital_import_logs;
CREATE POLICY "Admins manage import logs"
  ON public.hospital_import_logs FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- 34. ID MAPPINGS
-- ============================================================
ALTER TABLE public.id_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read id mappings" ON public.id_mappings;
CREATE POLICY "Anyone can read id mappings"
  ON public.id_mappings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service Role full access id_mappings" ON public.id_mappings;
CREATE POLICY "Service Role full access id_mappings"
  ON public.id_mappings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 35. STORAGE POLICIES (images bucket)
-- ============================================================
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 36. GRANTS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon;

GRANT SELECT ON public.search_history TO authenticated;
GRANT SELECT ON public.search_history TO anon;
GRANT INSERT ON public.search_history TO authenticated;

GRANT SELECT ON public.search_selections TO authenticated;
GRANT SELECT ON public.search_selections TO anon;
GRANT INSERT ON public.search_selections TO authenticated;
GRANT INSERT ON public.search_selections TO anon;

-- ============================================================
-- 37. RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
