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
    v_channel_type TEXT;
    v_request_user_id UUID;
    v_responder_id UUID;
    v_request_org_id UUID;
BEGIN
    IF p_room_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT room.channel_type
    INTO v_channel_type
    FROM public.emergency_chat_rooms room
    WHERE room.id = p_room_id;

    IF NOT FOUND OR v_channel_type <> 'emergency' THEN
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

CREATE OR REPLACE FUNCTION public.p_safe_uuid(p_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN p_value::UUID;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.p_is_async_consult_participant(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_visit_id UUID;
    v_patient_id UUID;
    v_doctor_profile_id UUID;
BEGIN
    IF p_room_id IS NULL OR v_actor_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT room.visit_id
    INTO v_visit_id
    FROM public.emergency_chat_rooms room
    WHERE room.id = p_room_id
      AND room.channel_type = 'telemedicine_async';

    IF NOT FOUND OR v_visit_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.emergency_chat_participants participant
        WHERE participant.room_id = p_room_id
          AND participant.user_id = v_actor_id
          AND participant.left_at IS NULL
    ) THEN
        RETURN TRUE;
    END IF;

    SELECT visit.user_id, doctor.profile_id
    INTO v_patient_id, v_doctor_profile_id
    FROM public.visits visit
    LEFT JOIN public.doctors doctor ON doctor.id = visit.doctor_id
    WHERE visit.id = v_visit_id
      AND visit.care_mode = 'telemedicine_async';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN v_actor_id = v_patient_id OR v_actor_id = v_doctor_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.p_can_manage_doctor_schedule(p_doctor_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
BEGIN
    IF p_doctor_id IS NULL OR v_actor_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF public.p_is_admin() THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.profiles actor
        JOIN public.hospitals hospital
          ON hospital.organization_id = actor.organization_id
        JOIN public.doctors doctor
          ON doctor.hospital_id = hospital.id
        WHERE actor.id = v_actor_id
          AND actor.role = 'org_admin'
          AND actor.organization_id IS NOT NULL
          AND doctor.id = p_doctor_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.p_safe_uuid(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.p_is_emergency_chat_participant(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.p_is_async_consult_participant(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.p_can_manage_doctor_schedule(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.p_safe_uuid(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.p_is_emergency_chat_participant(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.p_is_async_consult_participant(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.p_can_manage_doctor_schedule(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.p_get_current_org_id()
RETURNS UUID SECURITY DEFINER AS $$
BEGIN
    RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.p_can_read_visit(p_visit_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.visits visit
        JOIN public.profiles actor ON actor.id = auth.uid()
        LEFT JOIN public.hospitals hospital ON hospital.id = visit.hospital_id
        LEFT JOIN public.emergency_requests request ON request.id = visit.request_id
        LEFT JOIN public.doctors visit_doctor ON visit_doctor.id = visit.doctor_id
        LEFT JOIN public.doctors request_doctor ON request_doctor.id = request.assigned_doctor_id
        LEFT JOIN public.emergency_responder_assignments assignment
          ON assignment.id = request.current_responder_assignment_id
        WHERE visit.id = p_visit_id
          AND (
              visit.user_id = auth.uid()
              OR actor.role = 'admin'
              OR (
                  actor.role = 'org_admin'
                  AND actor.organization_id IS NOT NULL
                  AND (
                      hospital.organization_id = actor.organization_id
                      OR request.dispatch_organization_id = actor.organization_id
                  )
              )
              OR visit_doctor.profile_id = auth.uid()
              OR request_doctor.profile_id = auth.uid()
              OR request.responder_id = auth.uid()
              OR assignment.responder_id = auth.uid()
          )
    );
$$;

REVOKE ALL ON FUNCTION public.p_can_read_visit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.p_can_read_visit(UUID) TO authenticated, service_role;

-- 🛡️ ENABLE RLS ON ALL TABLES (Explicit List)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
-- BEGIN CONSOLE_ONBOARDING_EVIDENCE_RLS
ALTER TABLE public.organization_facility_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_verification_documents ENABLE ROW LEVEL SECURITY;
-- END CONSOLE_ONBOARDING_EVIDENCE_RLS
ALTER TABLE public.hospital_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_responder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_staff_assignments ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_invites ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Users see own emergency requests" ON public.emergency_requests;
CREATE POLICY "Users see own emergency requests"
ON public.emergency_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.p_is_admin());

DROP POLICY IF EXISTS "Assigned responders see their emergency requests" ON public.emergency_requests;
CREATE POLICY "Assigned responders see their emergency requests"
ON public.emergency_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.id = emergency_requests.current_responder_assignment_id
          AND assignment.emergency_request_id = emergency_requests.id
          AND assignment.responder_id = auth.uid()
          AND assignment.status IN ('offered', 'accepted', 'arrived')
    )
);

DROP POLICY IF EXISTS "Users can create emergency requests" ON public.emergency_requests;

DROP POLICY IF EXISTS "Users can update own emergency requests" ON public.emergency_requests;

DROP POLICY IF EXISTS "Org Admins see their hospital emergencies" ON public.emergency_requests;
CREATE POLICY "Org Admins see their hospital emergencies"
ON public.emergency_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles actor
        LEFT JOIN public.hospitals hospital
          ON hospital.id = emergency_requests.hospital_id
        WHERE actor.id = auth.uid()
          AND actor.role IN ('org_admin', 'dispatcher')
          AND actor.organization_id IS NOT NULL
          AND actor.organization_id IN (
              hospital.organization_id,
              emergency_requests.dispatch_organization_id
          )
    )
);

-- Direct PostgREST updates could otherwise change non-status responder/payment
-- fields even though the status trigger is RPC-gated. Mutations go through the
-- narrow patient, responder, and operator commands instead.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.emergency_requests FROM anon, authenticated;

DROP POLICY IF EXISTS "Emergency responder assignments are readable in role scope"
    ON public.emergency_responder_assignments;
CREATE POLICY "Emergency responder assignments are readable in role scope"
ON public.emergency_responder_assignments FOR SELECT
TO authenticated
USING (
    public.p_is_admin()
    OR responder_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles actor
        WHERE actor.id = auth.uid()
          AND actor.role IN ('org_admin', 'dispatcher')
          AND actor.organization_id IS NOT NULL
          AND actor.organization_id = emergency_responder_assignments.organization_id
    )
);

GRANT SELECT ON public.emergency_responder_assignments TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.emergency_responder_assignments
    FROM anon, authenticated;

DROP POLICY IF EXISTS "Ambulance staffing is readable in role scope"
    ON public.ambulance_staff_assignments;
CREATE POLICY "Ambulance staffing is readable in role scope"
ON public.ambulance_staff_assignments FOR SELECT
TO authenticated
USING (
    public.p_is_admin()
    OR responder_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles actor
        WHERE actor.id = auth.uid()
          AND actor.role IN ('org_admin', 'dispatcher')
          AND actor.organization_id = ambulance_staff_assignments.organization_id
    )
);

GRANT SELECT ON public.ambulance_staff_assignments TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ambulance_staff_assignments
    FROM anon, authenticated;

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

DROP POLICY IF EXISTS "Facility claims are readable in scope" ON public.organization_facility_claims;
CREATE POLICY "Facility claims are readable in scope"
ON public.organization_facility_claims FOR SELECT
TO authenticated
USING (
    submitted_by = auth.uid()
    OR organization_id = public.p_get_current_org_id()
    OR public.p_is_admin()
);

REVOKE INSERT, UPDATE, DELETE ON public.organization_facility_claims
    FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.organization_verification_documents
    FROM anon, authenticated;
GRANT SELECT ON public.organization_facility_claims TO authenticated;
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
USING (
    public.p_is_emergency_chat_participant(id)
    OR public.p_is_async_consult_participant(id)
);

DROP POLICY IF EXISTS "Users see emergency chat participants in scope" ON public.emergency_chat_participants;
CREATE POLICY "Users see emergency chat participants in scope"
ON public.emergency_chat_participants FOR SELECT
TO authenticated
USING (
    public.p_is_emergency_chat_participant(room_id)
    OR public.p_is_async_consult_participant(room_id)
);

DROP POLICY IF EXISTS "Users see emergency chat messages in scope" ON public.emergency_chat_messages;
CREATE POLICY "Users see emergency chat messages in scope"
ON public.emergency_chat_messages FOR SELECT
TO authenticated
USING (
    public.p_is_emergency_chat_participant(room_id)
    OR public.p_is_async_consult_participant(room_id)
);

GRANT SELECT ON public.emergency_chat_rooms TO authenticated;
GRANT SELECT ON public.emergency_chat_participants TO authenticated;
GRANT SELECT ON public.emergency_chat_messages TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.emergency_chat_rooms FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.emergency_chat_participants FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.emergency_chat_messages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.emergency_chat_rooms FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.emergency_chat_participants FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.emergency_chat_messages FROM authenticated;

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
USING (
    public.p_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.profiles actor
        WHERE actor.id = auth.uid()
          AND actor.role = 'org_admin'
          AND actor.organization_id = payments.organization_id
    )
);

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

CREATE POLICY "Users update own notifications (recipient state)"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read, dismissed_at, updated_at) ON public.notifications TO authenticated;

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
DROP POLICY IF EXISTS "Ambulances are visible in role scope" ON public.ambulances;
CREATE POLICY "Ambulances are visible in role scope"
ON public.ambulances FOR SELECT
TO authenticated
USING (
    public.p_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.ambulance_staff_assignments staffing
        WHERE staffing.ambulance_id = ambulances.id
          AND staffing.responder_id = auth.uid()
          AND staffing.status = 'active'
          AND staffing.starts_at <= NOW()
          AND (staffing.ends_at IS NULL OR staffing.ends_at > NOW())
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles actor
        LEFT JOIN public.hospitals hospital ON hospital.organization_id = actor.organization_id
        WHERE actor.id = auth.uid()
          AND actor.role IN ('org_admin', 'dispatcher')
          AND actor.organization_id IS NOT NULL
          AND (
              ambulances.organization_id = actor.organization_id
              OR (
                  ambulances.organization_id IS NULL
                  AND hospital.id = ambulances.hospital_id
              )
          )
    )
);

-- BEGIN CONSOLE_AMBULANCE_RLS
DROP POLICY IF EXISTS "Org Admins manage ambulances" ON public.ambulances;
DROP POLICY IF EXISTS "Org Admins insert ambulances" ON public.ambulances;
DROP POLICY IF EXISTS "Org Admins update ambulances" ON public.ambulances;
DROP POLICY IF EXISTS "Org Admins delete idle ambulances" ON public.ambulances;
CREATE POLICY "Org Admins insert ambulances"
ON public.ambulances FOR INSERT
TO authenticated
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
);

CREATE POLICY "Org Admins update ambulances"
ON public.ambulances FOR UPDATE
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
        AND organization_id = public.p_get_current_org_id()
        AND (
            hospital_id IS NULL
            OR hospital_id IN (
                SELECT hospital.id
                FROM public.hospitals hospital
                WHERE hospital.organization_id = public.p_get_current_org_id()
            )
        )
    )
);

CREATE POLICY "Org Admins delete idle ambulances"
ON public.ambulances FOR DELETE
TO authenticated
USING (
    (
        public.p_is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.role = 'org_admin'
              AND actor.organization_id IS NOT NULL
              AND (
                  actor.organization_id = ambulances.organization_id
                  OR (
                      ambulances.organization_id IS NULL
                      AND ambulances.hospital_id IN (
                          SELECT hospital.id
                          FROM public.hospitals hospital
                          WHERE hospital.organization_id = actor.organization_id
                      )
                  )
              )
        )
    )
    AND current_call IS NULL
);

REVOKE INSERT, UPDATE, DELETE ON public.ambulances FROM anon, authenticated;
GRANT INSERT (
    id, hospital_id, organization_id, type, call_sign, vehicle_number,
    license_plate, base_price, crew, created_at, updated_at
) ON public.ambulances TO authenticated;
GRANT UPDATE (
    hospital_id, organization_id, type, call_sign, vehicle_number,
    license_plate, base_price, crew, updated_at
) ON public.ambulances TO authenticated;
GRANT DELETE ON public.ambulances TO authenticated;
-- END CONSOLE_AMBULANCE_RLS

DROP POLICY IF EXISTS "Users see own visits" ON public.visits;
CREATE POLICY "Users see own visits"
ON public.visits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert/update own visits" ON public.visits;
DROP POLICY IF EXISTS "Users manage own standalone visits" ON public.visits;
CREATE POLICY "Users manage own standalone visits"
ON public.visits FOR ALL
TO authenticated
USING (
    auth.uid() = user_id
    AND care_mode IS NULL
    AND request_id IS NULL
)
WITH CHECK (
    auth.uid() = user_id
    AND care_mode IS NULL
    AND request_id IS NULL
);

DROP POLICY IF EXISTS "Console operators see org visits" ON public.visits;
DROP POLICY IF EXISTS "Authorized actors see scoped visits" ON public.visits;
CREATE POLICY "Authorized actors see scoped visits"
ON public.visits FOR SELECT TO authenticated
USING (public.p_can_read_visit(id));

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

-- BEGIN DATA_ROOM_ACCESS_RLS
-- Metadata may be read only by authenticated eligible users. The content
-- column is deliberately excluded from authenticated column grants below.
DROP POLICY IF EXISTS "Public read public documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can view document metadata" ON public.documents;
DROP POLICY IF EXISTS "Users can view eligible document metadata" ON public.documents;
CREATE POLICY "Users can view eligible document metadata"
ON public.documents FOR SELECT
TO authenticated
USING (
    tier = 'public'
    OR public.p_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.user_roles AS role_row
        WHERE role_row.user_id = auth.uid()
          AND role_row.role = ANY(COALESCE(documents.visibility, ARRAY[]::TEXT[]))
    )
    OR EXISTS (
        SELECT 1
        FROM public.access_requests AS request
        WHERE request.user_id = auth.uid()
          AND request.document_id = documents.id
          AND request.status = 'approved'
    )
);

DROP POLICY IF EXISTS "Admin can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Admin can update documents" ON public.documents;
DROP POLICY IF EXISTS "Admin can delete documents" ON public.documents;

DROP POLICY IF EXISTS "Users can view their own requests" ON public.access_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admin can view all access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admin can update access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Users read own access requests" ON public.access_requests;
CREATE POLICY "Users read own access requests"
ON public.access_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.p_is_admin());

DROP POLICY IF EXISTS "Anyone can view invites by token" ON public.document_invites;
DROP POLICY IF EXISTS "Authenticated users can claim invites" ON public.document_invites;
DROP POLICY IF EXISTS "Admins manage invites" ON public.document_invites;

REVOKE ALL ON TABLE public.documents FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id,
    slug,
    title,
    description,
    tier,
    icon,
    visibility,
    created_at,
    updated_at
) ON TABLE public.documents TO authenticated;

REVOKE ALL ON TABLE public.access_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id,
    user_id,
    document_id,
    status,
    nda_signed_at,
    signer_name,
    signer_entity,
    signer_title,
    created_at,
    updated_at
) ON TABLE public.access_requests TO authenticated;

REVOKE ALL ON TABLE public.document_invites FROM PUBLIC, anon, authenticated;
-- END DATA_ROOM_ACCESS_RLS

-- Shared Storage canon. Public profile media is readable by URL, while writes
-- stay inside the authenticated owner's UUID folder. Onboarding evidence uses
-- the private documents bucket and the narrower policies below.
-- BEGIN CONSOLE_SHARED_STORAGE_POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('images', 'images', true),
    ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET public = false,
    file_size_limit = 26214400
WHERE id = 'documents';

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

-- Private async-consult media uses documents/telemedicine/{room}/{user}/*.
-- Reads require both room participation and a persisted message reference.
-- BEGIN ASYNC_CONSULT_STORAGE_POLICIES
DROP POLICY IF EXISTS "Consult participants upload private media" ON storage.objects;
CREATE POLICY "Consult participants upload private media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'telemedicine'
    AND public.p_safe_uuid((storage.foldername(name))[2]) IS NOT NULL
    AND (storage.foldername(name))[3] = auth.uid()::TEXT
    AND public.p_is_async_consult_participant(
        public.p_safe_uuid((storage.foldername(name))[2])
    )
    AND EXISTS (
        SELECT 1
        FROM public.emergency_chat_rooms room
        JOIN public.visits visit ON visit.id = room.visit_id
        WHERE room.id = public.p_safe_uuid((storage.foldername(name))[2])
          AND room.channel_type = 'telemedicine_async'
          AND room.status = 'active'
          AND visit.care_mode = 'telemedicine_async'
          AND visit.status IN ('upcoming', 'in_progress')
    )
    AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov')
);

DROP POLICY IF EXISTS "Consult participants read linked private media" ON storage.objects;
CREATE POLICY "Consult participants read linked private media"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'telemedicine'
    AND public.p_safe_uuid((storage.foldername(name))[2]) IS NOT NULL
    AND public.p_is_async_consult_participant(
        public.p_safe_uuid((storage.foldername(name))[2])
    )
    AND EXISTS (
        SELECT 1
        FROM public.emergency_chat_messages message
        WHERE message.room_id = public.p_safe_uuid((storage.foldername(name))[2])
          AND message.attachment_storage_path = storage.objects.name
          AND message.deleted_at IS NULL
    )
);

DROP POLICY IF EXISTS "Consult uploaders remove unlinked private media" ON storage.objects;
-- Client deletion stays denied. A delayed service cleanup must recheck that an
-- object is still unlinked before removing it from both Storage and metadata.
-- END ASYNC_CONSULT_STORAGE_POLICIES
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

-- Doctor schedules: clinician-own and proved schedule-admin reads only.
DROP POLICY IF EXISTS "Public read doctor schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Org Admins manage doctor schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Clinicians read own doctor schedules" ON public.doctor_schedules;
CREATE POLICY "Clinicians read own doctor schedules"
ON public.doctor_schedules FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.doctors doctor
        WHERE doctor.id = doctor_schedules.doctor_id
          AND doctor.profile_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Schedule admins read scoped doctor schedules" ON public.doctor_schedules;
CREATE POLICY "Schedule admins read scoped doctor schedules"
ON public.doctor_schedules FOR SELECT
TO authenticated
USING (public.p_can_manage_doctor_schedule(doctor_id));

GRANT SELECT ON public.doctor_schedules TO authenticated;
REVOKE SELECT ON public.doctor_schedules FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.doctor_schedules FROM anon, authenticated;

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
