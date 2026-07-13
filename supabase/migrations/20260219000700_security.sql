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

CREATE OR REPLACE FUNCTION public.p_is_emergency_chat_participant(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_user_id UUID;
    v_responder_id UUID;
    v_request_org_id UUID;
BEGIN
    IF p_room_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF public.p_is_admin() THEN
        RETURN TRUE;
    END IF;

    IF v_actor_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.emergency_chat_participants ecp
        WHERE ecp.room_id = p_room_id
          AND ecp.user_id = v_actor_id
          AND ecp.left_at IS NULL
    ) THEN
        RETURN TRUE;
    END IF;

    SELECT er.user_id, er.responder_id, h.organization_id
    INTO v_request_user_id, v_responder_id, v_request_org_id
    FROM public.emergency_chat_rooms ecr
    JOIN public.emergency_requests er ON er.id = ecr.emergency_request_id
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE ecr.id = p_room_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_request_user_id = v_actor_id OR v_responder_id = v_actor_id THEN
        RETURN TRUE;
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_role IN ('org_admin', 'dispatcher', 'provider')
       AND v_actor_org_id IS NOT NULL
       AND v_request_org_id IS NOT NULL
       AND v_actor_org_id = v_request_org_id THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

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
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
-- BEGIN CONSOLE_ONBOARDING_EVIDENCE_RLS
ALTER TABLE public.organization_verification_documents ENABLE ROW LEVEL SECURITY;
-- END CONSOLE_ONBOARDING_EVIDENCE_RLS
ALTER TABLE public.hospital_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_chat_messages ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.search_selections ENABLE ROW LEVEL SECURITY;
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

-- RLS limits rows, not columns. Keep ordinary self-service profile edits while
-- preventing a signed-in user from promoting their role, organization scope,
-- verification state, financial identity, or responder assignment.
-- BEGIN CONSOLE_PROFILE_COLUMN_SECURITY
REVOKE INSERT, DELETE ON TABLE public.profiles FROM anon, authenticated;
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (
    phone,
    username,
    first_name,
    last_name,
    full_name,
    image_uri,
    avatar_url,
    address,
    gender,
    date_of_birth,
    updated_at
) ON TABLE public.profiles TO authenticated;
-- END CONSOLE_PROFILE_COLUMN_SECURITY

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
-- BEGIN CONSOLE_ONBOARDING_READ_POLICIES
DROP POLICY IF EXISTS "Public read for active organizations" ON public.organizations;
CREATE POLICY "Public read for active organizations"
ON public.organizations FOR SELECT
USING (
    (is_active = true AND verification_status = 'verified')
    OR id = public.p_get_current_org_id()
    OR created_by = auth.uid()
    OR public.p_is_admin()
);

DROP POLICY IF EXISTS "Public read for verified hospitals" ON public.hospitals;
CREATE POLICY "Public read for verified hospitals"
ON public.hospitals FOR SELECT
USING (
    verified = true
    OR organization_id = public.p_get_current_org_id()
    OR public.p_is_admin()
);

DROP POLICY IF EXISTS "Onboarding evidence is readable in scope" ON public.organization_verification_documents;
CREATE POLICY "Onboarding evidence is readable in scope"
ON public.organization_verification_documents FOR SELECT
TO authenticated
USING (
    uploaded_by = auth.uid()
    OR organization_id = public.p_get_current_org_id()
    OR public.p_is_admin()
);

GRANT SELECT ON public.organization_verification_documents TO authenticated;
-- END CONSOLE_ONBOARDING_READ_POLICIES

DROP POLICY IF EXISTS "Users see emergency status transitions in scope" ON public.emergency_status_transitions;
CREATE POLICY "Users see emergency status transitions in scope"
ON public.emergency_status_transitions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.emergency_requests er
        LEFT JOIN public.hospitals h ON h.id = er.hospital_id
        WHERE er.id = emergency_status_transitions.emergency_request_id
          AND (
              er.user_id = auth.uid()
              OR er.responder_id = auth.uid()
              OR h.organization_id = public.p_get_current_org_id()
              OR public.p_is_admin()
          )
    )
);

DROP POLICY IF EXISTS "Users see emergency chat rooms in scope" ON public.emergency_chat_rooms;
CREATE POLICY "Users see emergency chat rooms in scope"
ON public.emergency_chat_rooms FOR SELECT
TO authenticated
USING (public.p_is_emergency_chat_participant(id));

DROP POLICY IF EXISTS "Users see emergency chat participants in scope" ON public.emergency_chat_participants;
CREATE POLICY "Users see emergency chat participants in scope"
ON public.emergency_chat_participants FOR SELECT
TO authenticated
USING (public.p_is_emergency_chat_participant(room_id));

DROP POLICY IF EXISTS "Users see emergency chat messages in scope" ON public.emergency_chat_messages;
CREATE POLICY "Users see emergency chat messages in scope"
ON public.emergency_chat_messages FOR SELECT
TO authenticated
USING (public.p_is_emergency_chat_participant(room_id));

GRANT SELECT ON public.emergency_chat_rooms TO authenticated;
GRANT SELECT ON public.emergency_chat_participants TO authenticated;
GRANT SELECT ON public.emergency_chat_messages TO authenticated;

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

-- BEGIN CONSOLE_INSURANCE_RLS
DROP POLICY IF EXISTS "Users manage own insurance policies" ON public.insurance_policies;
CREATE POLICY "Users manage own insurance policies"
ON public.insurance_policies FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read insurance policies" ON public.insurance_policies;
CREATE POLICY "Admins read insurance policies"
ON public.insurance_policies FOR SELECT
TO authenticated
USING (public.p_is_admin());
-- END CONSOLE_INSURANCE_RLS

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

DROP POLICY IF EXISTS "Org operators read medical profiles via visits" ON public.medical_profiles;
CREATE POLICY "Org operators read medical profiles via visits"
ON public.medical_profiles FOR SELECT TO authenticated
USING (
    public.p_is_admin()
    OR user_id IN (
        SELECT visit.user_id
        FROM public.visits visit
        WHERE visit.hospital_id IN (
            SELECT hospital.id
            FROM public.hospitals hospital
            WHERE hospital.organization_id = public.p_get_current_org_id()
        )
    )
);

DROP POLICY IF EXISTS "Users manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users manage own emergency contacts"
ON public.emergency_contacts FOR ALL
USING (auth.uid() = user_id OR public.p_is_admin())
WITH CHECK (auth.uid() = user_id OR public.p_is_admin());

-- 7. LOGISTICS (Ambulances & Visits)
DROP POLICY IF EXISTS "Public read for ambulances" ON public.ambulances;
CREATE POLICY "Public read for ambulances"
ON public.ambulances FOR SELECT
USING (true);

-- BEGIN CONSOLE_AMBULANCE_RLS
DROP POLICY IF EXISTS "Org Admins manage ambulances" ON public.ambulances;
CREATE POLICY "Org Admins manage ambulances"
ON public.ambulances FOR ALL
TO authenticated
USING (
    public.p_is_admin()
    OR (
        EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.role = 'org_admin'
              AND actor.organization_id IS NOT NULL
        )
        AND (
            organization_id = public.p_get_current_org_id()
            OR (
                organization_id IS NULL
                AND hospital_id IN (
                    SELECT hospital.id
                    FROM public.hospitals hospital
                    WHERE hospital.organization_id = public.p_get_current_org_id()
                )
            )
        )
    )
)
WITH CHECK (
    public.p_is_admin()
    OR (
        EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.role = 'org_admin'
              AND actor.organization_id IS NOT NULL
        )
        AND (organization_id = public.p_get_current_org_id() OR organization_id IS NULL)
        AND (
            hospital_id IS NULL
            OR hospital_id IN (
                SELECT hospital.id
                FROM public.hospitals hospital
                WHERE hospital.organization_id = public.p_get_current_org_id()
            )
        )
        AND (
            organization_id = public.p_get_current_org_id()
            OR hospital_id IN (
                SELECT hospital.id
                FROM public.hospitals hospital
                WHERE hospital.organization_id = public.p_get_current_org_id()
            )
        )
    )
);
-- END CONSOLE_AMBULANCE_RLS

CREATE POLICY "Users see own visits"
ON public.visits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert/update own visits"
ON public.visits FOR ALL
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Console operators see org visits" ON public.visits;
CREATE POLICY "Console operators see org visits"
ON public.visits FOR SELECT TO authenticated
USING (
    public.p_is_admin()
    OR hospital_id IN (
        SELECT hospital.id
        FROM public.hospitals hospital
        WHERE hospital.organization_id = public.p_get_current_org_id()
    )
);

-- 8. OPS CONTENT
CREATE POLICY "Public read for health news" ON public.health_news FOR SELECT USING (published = true);
CREATE POLICY "Public read for support faqs" ON public.support_faqs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage hospital import logs" ON public.hospital_import_logs;
CREATE POLICY "Admins manage hospital import logs"
ON public.hospital_import_logs
FOR ALL
TO authenticated
USING (public.p_is_admin())
WITH CHECK (public.p_is_admin());

DROP POLICY IF EXISTS "Users read own hospital import logs" ON public.hospital_import_logs;
CREATE POLICY "Users read own hospital import logs"
ON public.hospital_import_logs
FOR SELECT
TO authenticated
USING (
    created_by = auth.uid()
    OR public.p_is_admin()
);

DROP POLICY IF EXISTS "Users insert own hospital import logs" ON public.hospital_import_logs;
CREATE POLICY "Users insert own hospital import logs"
ON public.hospital_import_logs
FOR INSERT
TO authenticated
WITH CHECK (
    created_by IS NULL
    OR created_by = auth.uid()
    OR public.p_is_admin()
);

DROP POLICY IF EXISTS "Users update own hospital import logs" ON public.hospital_import_logs;
CREATE POLICY "Users update own hospital import logs"
ON public.hospital_import_logs
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    OR public.p_is_admin()
)
WITH CHECK (
    created_by = auth.uid()
    OR public.p_is_admin()
);

GRANT SELECT, INSERT, UPDATE ON public.hospital_import_logs TO authenticated;

-- 9. ANALYTICS
CREATE POLICY "Users see own activity" ON public.user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own search history" ON public.search_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own search selections" ON public.search_selections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public insert search selections" ON public.search_selections FOR INSERT TO public WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins read search selections" ON public.search_selections FOR SELECT USING (public.p_is_admin());

-- 10. MISSING RLS ENABLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivisit_main_wallet ENABLE ROW LEVEL SECURITY;

-- 11. MISSING POLICIES

-- Subscribers: allow public insert (newsletter sign-up), admin reads all
CREATE POLICY "Public can subscribe" ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read subscribers" ON public.subscribers FOR SELECT USING (public.p_is_admin());

-- Doctors: public directory reads; platform admins and organization admins manage
-- rows in authorized facilities. Profile identity and lifecycle columns remain
-- outside direct authenticated writes.
-- BEGIN CONSOLE_DOCTOR_RLS_GRANTS
DROP POLICY IF EXISTS "Public read doctors" ON public.doctors;
CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Org Admins manage doctors" ON public.doctors;
CREATE POLICY "Org Admins manage doctors" ON public.doctors FOR ALL
TO authenticated
USING (
    public.p_is_admin()
    OR (
        EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.role = 'org_admin'
              AND actor.organization_id IS NOT NULL
        )
        AND hospital_id IN (
            SELECT hospital.id
            FROM public.hospitals hospital
            WHERE hospital.organization_id = public.p_get_current_org_id()
        )
    )
)
WITH CHECK (
    public.p_is_admin()
    OR (
        EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.role = 'org_admin'
              AND actor.organization_id IS NOT NULL
        )
        AND hospital_id IN (
            SELECT hospital.id
            FROM public.hospitals hospital
            WHERE hospital.organization_id = public.p_get_current_org_id()
        )
    )
);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.doctors FROM anon, authenticated;
GRANT INSERT (
    hospital_id,
    name,
    specialization,
    image,
    experience,
    about,
    consultation_fee,
    department,
    license_number,
    email,
    phone
) ON TABLE public.doctors TO authenticated;
GRANT UPDATE (
    hospital_id,
    name,
    specialization,
    image,
    experience,
    about,
    consultation_fee,
    department,
    license_number,
    email,
    phone,
    updated_at
) ON TABLE public.doctors TO authenticated;
-- END CONSOLE_DOCTOR_RLS_GRANTS

-- Wallet Ledger: admins + org admins see relevant entries
CREATE POLICY "Admins see all ledger" ON public.wallet_ledger FOR SELECT USING (public.p_is_admin());

-- Support Tickets: users manage their own rows; platform admins manage all.
-- BEGIN CONSOLE_SUPPORT_TICKET_RLS
DROP POLICY IF EXISTS "Users manage own tickets" ON public.support_tickets;
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.p_is_admin())
WITH CHECK (auth.uid() = user_id OR public.p_is_admin());
-- END CONSOLE_SUPPORT_TICKET_RLS

-- Documents: public reads public tier, admins read all
CREATE POLICY "Public read public documents" ON public.documents FOR SELECT
USING (tier = 'public' OR public.p_is_admin());

-- Shared Storage canon. Public profile media is readable by URL, while writes
-- stay inside the authenticated owner's UUID folder. Onboarding evidence uses
-- the private documents bucket and the narrower policies below.
-- BEGIN CONSOLE_SHARED_STORAGE_POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('images', 'images', true),
    ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

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
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'heic', 'heif')
);

DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
)
WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'heic', 'heif')
);

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Private onboarding evidence uses documents/onboarding/{auth.uid()}/*.
-- Objects become immutable to the submitter once the provisioning RPC links
-- their path to organization_verification_documents.
-- BEGIN CONSOLE_ONBOARDING_STORAGE_POLICIES
DROP POLICY IF EXISTS "Users upload own onboarding evidence" ON storage.objects;
CREATE POLICY "Users upload own onboarding evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'onboarding'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
    AND LOWER(storage.extension(name)) IN ('pdf', 'jpg', 'jpeg', 'png')
);

DROP POLICY IF EXISTS "Users read own onboarding evidence" ON storage.objects;
CREATE POLICY "Users read own onboarding evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents'
    AND (
        (
            (storage.foldername(name))[1] = 'onboarding'
            AND (storage.foldername(name))[2] = auth.uid()::TEXT
        )
        OR public.p_is_admin()
    )
);

DROP POLICY IF EXISTS "Users remove unsubmitted onboarding evidence" ON storage.objects;
CREATE POLICY "Users remove unsubmitted onboarding evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'onboarding'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
    AND NOT EXISTS (
        SELECT 1
        FROM public.organization_verification_documents evidence
        WHERE evidence.storage_path = storage.objects.name
    )
);
-- END CONSOLE_ONBOARDING_STORAGE_POLICIES
-- END CONSOLE_SHARED_STORAGE_POLICIES

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
