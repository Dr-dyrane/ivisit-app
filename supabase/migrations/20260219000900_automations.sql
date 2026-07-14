-- 🏯 Module 09: System Automations & Cross-Table Hooks
-- Centralized Logic for Multi-Module Synchronization

-- 1. Global User Initialization (After Profile, Preferences, Medical, and Wallet Tables exist)
-- BEGIN CONSOLE_ONBOARDING_AUTOMATIONS
-- BEGIN CONSOLE_NEW_USER_FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_avatar TEXT;
    v_username TEXT;
BEGIN
    -- Extract Avatar from various possible metadata fields (Google, GitHub, custom)
    v_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'avatar'
    );
    v_username := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'username', ''),
        public.generate_username_from_email(NEW.email)
    );

    -- A. Create Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        phone, 
        username,
        full_name, 
        avatar_url, 
        image_uri,
        role,
        onboarding_status
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.phone,
        v_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        v_avatar,
        v_avatar, -- Sync image_uri with avatar_url for mobile parity
        -- Public Auth metadata is user-controlled. Elevated Console roles are
        -- issued only by audited backend receivers after scope is proved.
        'patient',
        'pending'
    );
    
    -- B. Create associated records (Intelligence Layer)
    INSERT INTO public.preferences (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.medical_profiles (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- C. Initialize Patient Wallet (Fluid Finance)
    INSERT INTO public.patient_wallets (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;
-- END CONSOLE_NEW_USER_FUNCTION

-- Hook into auth.users (Supabase Managed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 1B. Organization Wallet Auto-Creation
-- When a new org is created, automatically create its wallet.
-- BEGIN CONSOLE_ORG_WALLET_FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.organization_wallets (organization_id, balance, currency)
    VALUES (NEW.id, 0.00, 'USD')
    ON CONFLICT (organization_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- END CONSOLE_ORG_WALLET_FUNCTION

DROP TRIGGER IF EXISTS on_org_created ON public.organizations;
CREATE TRIGGER on_org_created
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_organization();
-- END CONSOLE_ONBOARDING_AUTOMATIONS

-- 1C. Doctor Registry Auto-Sync (Profile -> doctors)
-- When a profile becomes a provider doctor (or doctor profile details change), ensure a doctors row exists.
-- BEGIN CONSOLE_DOCTOR_PROFILE_GUARD
CREATE OR REPLACE FUNCTION public.sync_doctor_record_from_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_hospital_id UUID;
BEGIN
    IF NEW.role = 'provider' AND NEW.provider_type = 'doctor' THEN
        v_name := NULLIF(BTRIM(COALESCE(NEW.full_name, '')), '');
        IF v_name IS NULL THEN
            v_name := NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(NEW.first_name, ''), NULLIF(NEW.last_name, ''))), '');
        END IF;
        IF v_name IS NULL THEN
            v_name := COALESCE(NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''), 'Doctor');
        END IF;

        -- Preserve existing doctor.hospital_id if already set; otherwise infer from the provider's organization.
        SELECT d.hospital_id INTO v_hospital_id
        FROM public.doctors d
        WHERE d.profile_id = NEW.id;

        IF v_hospital_id IS NULL AND NEW.organization_id IS NOT NULL THEN
            SELECT h.id INTO v_hospital_id
            FROM public.hospitals h
            WHERE h.organization_id = NEW.organization_id
            ORDER BY h.created_at ASC, h.id ASC
            LIMIT 1;
        END IF;

        -- Mark identity changes as profile-owned so the doctors-table guard can
        -- distinguish this canonical sync from direct Console edits.
        PERFORM set_config('ivisit.allow_doctor_profile_sync', '1', true);

        INSERT INTO public.doctors (
            profile_id,
            hospital_id,
            name,
            specialization,
            email,
            phone,
            status,
            is_available
        )
        VALUES (
            NEW.id,
            v_hospital_id,
            v_name,
            'General Medicine',
            NEW.email,
            NEW.phone,
            'invited',
            false
        )
        ON CONFLICT (profile_id) DO UPDATE
        SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            hospital_id = COALESCE(doctors.hospital_id, EXCLUDED.hospital_id),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_sync_doctor_record ON public.profiles;
CREATE TRIGGER on_profile_sync_doctor_record
AFTER INSERT OR UPDATE OF role, provider_type, organization_id, full_name, first_name, last_name, email, phone
ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.sync_doctor_record_from_profile();

CREATE OR REPLACE FUNCTION public.enforce_doctor_profile_identity_write()
RETURNS TRIGGER AS $$
DECLARE
    v_profile_sync TEXT := current_setting('ivisit.allow_doctor_profile_sync', true);
BEGIN
    IF NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
        RAISE EXCEPTION 'Doctor profile linkage is immutable; use the provider profile workflow'
            USING ERRCODE = '42501';
    END IF;

    IF OLD.profile_id IS NOT NULL
       AND COALESCE(v_profile_sync, '0') <> '1'
       AND (
            NEW.name IS DISTINCT FROM OLD.name
            OR NEW.email IS DISTINCT FROM OLD.email
            OR NEW.phone IS DISTINCT FROM OLD.phone
       ) THEN
        RAISE EXCEPTION 'Linked doctor identity is owned by the provider profile workflow'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_doctor_profile_identity_write ON public.doctors;
CREATE TRIGGER trg_enforce_doctor_profile_identity_write
BEFORE UPDATE OF profile_id, name, email, phone ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.enforce_doctor_profile_identity_write();
-- END CONSOLE_DOCTOR_PROFILE_GUARD


-- 2. Logistics & Operations Synchronization
-- BEGIN LIVE_EMERGENCY_RELATIONSHIP_RECONCILIATION
-- Historical runtimes briefly created a second shadow visit using the request
-- UUID and could replay the insurance completion trigger. Keep the richer row,
-- preserve useful patient-entered fields, and retain the removed row snapshot
-- in the permanent audit log before one-to-one indexes are enforced.
DO $$
DECLARE
    v_group RECORD;
    v_duplicate public.visits%ROWTYPE;
    v_canonical_id UUID;
BEGIN
    FOR v_group IN
        SELECT visit.request_id
        FROM public.visits visit
        WHERE visit.request_id IS NOT NULL
        GROUP BY visit.request_id
        HAVING COUNT(*) > 1
    LOOP
        SELECT visit.id
        INTO v_canonical_id
        FROM public.visits visit
        WHERE visit.request_id = v_group.request_id
        ORDER BY
            (visit.date IS NOT NULL) DESC,
            (visit.time IS NOT NULL) DESC,
            (visit.cost IS NOT NULL) DESC,
            (visit.hospital_name IS NOT NULL) DESC,
            visit.created_at ASC,
            visit.id ASC
        LIMIT 1;

        FOR v_duplicate IN
            SELECT visit.*
            FROM public.visits visit
            WHERE visit.request_id = v_group.request_id
              AND visit.id <> v_canonical_id
            ORDER BY visit.created_at, visit.id
        LOOP
            UPDATE public.emergency_chat_rooms
            SET visit_id = v_canonical_id,
                updated_at = NOW()
            WHERE visit_id = v_duplicate.id;

            UPDATE public.visits canonical
            SET user_id = COALESCE(canonical.user_id, v_duplicate.user_id),
                hospital_id = COALESCE(canonical.hospital_id, v_duplicate.hospital_id),
                hospital_name = COALESCE(canonical.hospital_name, v_duplicate.hospital_name),
                hospital = COALESCE(canonical.hospital, v_duplicate.hospital),
                hospital_image = COALESCE(canonical.hospital_image, v_duplicate.hospital_image),
                address = COALESCE(canonical.address, v_duplicate.address),
                phone = COALESCE(canonical.phone, v_duplicate.phone),
                image = COALESCE(canonical.image, v_duplicate.image),
                doctor_id = COALESCE(canonical.doctor_id, v_duplicate.doctor_id),
                doctor_name = COALESCE(canonical.doctor_name, v_duplicate.doctor_name),
                doctor = COALESCE(canonical.doctor, v_duplicate.doctor),
                doctor_image = COALESCE(canonical.doctor_image, v_duplicate.doctor_image),
                specialty = COALESCE(canonical.specialty, v_duplicate.specialty),
                date = COALESCE(canonical.date, v_duplicate.date),
                time = COALESCE(canonical.time, v_duplicate.time),
                type = COALESCE(canonical.type, v_duplicate.type),
                status = COALESCE(canonical.status, v_duplicate.status),
                notes = COALESCE(canonical.notes, v_duplicate.notes),
                cost = COALESCE(canonical.cost, v_duplicate.cost),
                summary = COALESCE(canonical.summary, v_duplicate.summary),
                preparation = COALESCE(canonical.preparation, v_duplicate.preparation),
                prescriptions = COALESCE(canonical.prescriptions, v_duplicate.prescriptions),
                room_number = COALESCE(canonical.room_number, v_duplicate.room_number),
                estimated_duration = COALESCE(canonical.estimated_duration, v_duplicate.estimated_duration),
                meeting_link = COALESCE(canonical.meeting_link, v_duplicate.meeting_link),
                care_mode = COALESCE(canonical.care_mode, v_duplicate.care_mode),
                scheduled_start_at = COALESCE(canonical.scheduled_start_at, v_duplicate.scheduled_start_at),
                scheduled_end_at = COALESCE(canonical.scheduled_end_at, v_duplicate.scheduled_end_at),
                scheduled_timezone = COALESCE(canonical.scheduled_timezone, v_duplicate.scheduled_timezone),
                booking_idempotency_key = COALESCE(
                    canonical.booking_idempotency_key,
                    v_duplicate.booking_idempotency_key
                ),
                insurance_covered = COALESCE(canonical.insurance_covered, v_duplicate.insurance_covered),
                next_visit = COALESCE(canonical.next_visit, v_duplicate.next_visit),
                latitude = COALESCE(canonical.latitude, v_duplicate.latitude),
                longitude = COALESCE(canonical.longitude, v_duplicate.longitude),
                tip_amount = CASE
                    WHEN COALESCE(canonical.tip_amount, 0) = 0
                        THEN COALESCE(v_duplicate.tip_amount, canonical.tip_amount)
                    ELSE canonical.tip_amount
                END,
                tip_currency = COALESCE(canonical.tip_currency, v_duplicate.tip_currency),
                tipped_at = COALESCE(canonical.tipped_at, v_duplicate.tipped_at),
                tip_payment_id = COALESCE(canonical.tip_payment_id, v_duplicate.tip_payment_id),
                rating = COALESCE(canonical.rating, v_duplicate.rating),
                rating_comment = COALESCE(canonical.rating_comment, v_duplicate.rating_comment),
                rated_at = COALESCE(canonical.rated_at, v_duplicate.rated_at),
                lifecycle_state = CASE
                    WHEN COALESCE(canonical.rated_at, v_duplicate.rated_at) IS NOT NULL THEN 'rated'
                    ELSE COALESCE(canonical.lifecycle_state, v_duplicate.lifecycle_state)
                END,
                lifecycle_updated_at = GREATEST(
                    COALESCE(canonical.lifecycle_updated_at, '-infinity'::TIMESTAMPTZ),
                    COALESCE(v_duplicate.lifecycle_updated_at, '-infinity'::TIMESTAMPTZ)
                ),
                updated_at = GREATEST(canonical.updated_at, v_duplicate.updated_at, NOW())
            WHERE canonical.id = v_canonical_id;

            INSERT INTO public.admin_audit_log (action, details)
            VALUES (
                'reconcile_duplicate_emergency_visit',
                JSONB_BUILD_OBJECT(
                    'request_id', v_group.request_id,
                    'canonical_visit_id', v_canonical_id,
                    'removed_visit', TO_JSONB(v_duplicate),
                    'reason', 'legacy_shadow_visit'
                )
            );

            DELETE FROM public.visits
            WHERE id = v_duplicate.id
              AND request_id = v_group.request_id;
        END LOOP;
    END LOOP;
END
$$;

DO $$
DECLARE
    v_group RECORD;
    v_duplicate public.insurance_billing%ROWTYPE;
    v_canonical_id UUID;
BEGIN
    FOR v_group IN
        SELECT billing.emergency_request_id
        FROM public.insurance_billing billing
        WHERE billing.emergency_request_id IS NOT NULL
        GROUP BY billing.emergency_request_id
        HAVING COUNT(*) > 1
    LOOP
        IF EXISTS (
            SELECT 1
            FROM public.insurance_billing billing
            WHERE billing.emergency_request_id = v_group.emergency_request_id
            GROUP BY billing.emergency_request_id
            HAVING COUNT(DISTINCT billing.status) > 1
                OR COUNT(DISTINCT billing.total_amount) > 1
                OR COUNT(DISTINCT billing.insurance_amount) > 1
                OR COUNT(DISTINCT billing.user_amount) > 1
                OR COUNT(DISTINCT billing.insurance_policy_id) FILTER (
                    WHERE billing.insurance_policy_id IS NOT NULL
                ) > 1
        ) THEN
            RAISE EXCEPTION
                'Conflicting insurance billing duplicates require manual review for request %',
                v_group.emergency_request_id;
        END IF;

        SELECT billing.id
        INTO v_canonical_id
        FROM public.insurance_billing billing
        WHERE billing.emergency_request_id = v_group.emergency_request_id
        ORDER BY
            (billing.status IN ('paid', 'approved')) DESC,
            (billing.claim_number IS NOT NULL) DESC,
            billing.created_at ASC,
            billing.id ASC
        LIMIT 1;

        FOR v_duplicate IN
            SELECT billing.*
            FROM public.insurance_billing billing
            WHERE billing.emergency_request_id = v_group.emergency_request_id
              AND billing.id <> v_canonical_id
            ORDER BY billing.created_at, billing.id
        LOOP
            UPDATE public.insurance_billing canonical
            SET hospital_id = COALESCE(canonical.hospital_id, v_duplicate.hospital_id),
                user_id = COALESCE(canonical.user_id, v_duplicate.user_id),
                insurance_policy_id = COALESCE(
                    canonical.insurance_policy_id,
                    v_duplicate.insurance_policy_id
                ),
                claim_number = COALESCE(canonical.claim_number, v_duplicate.claim_number),
                billing_date = LEAST(canonical.billing_date, v_duplicate.billing_date),
                paid_date = COALESCE(canonical.paid_date, v_duplicate.paid_date),
                coverage_percentage = COALESCE(
                    canonical.coverage_percentage,
                    v_duplicate.coverage_percentage
                ),
                updated_at = GREATEST(canonical.updated_at, v_duplicate.updated_at, NOW())
            WHERE canonical.id = v_canonical_id;

            INSERT INTO public.admin_audit_log (action, details)
            VALUES (
                'reconcile_duplicate_insurance_billing',
                JSONB_BUILD_OBJECT(
                    'emergency_request_id', v_group.emergency_request_id,
                    'canonical_billing_id', v_canonical_id,
                    'removed_billing', TO_JSONB(v_duplicate),
                    'reason', 'replayed_completion_trigger'
                )
            );

            DELETE FROM public.insurance_billing
            WHERE id = v_duplicate.id
              AND emergency_request_id = v_group.emergency_request_id;
        END LOOP;
    END LOOP;
END
$$;
-- END LIVE_EMERGENCY_RELATIONSHIP_RECONCILIATION

-- Sync Emergency -> Visit across lifecycle transitions
CREATE OR REPLACE FUNCTION public.sync_emergency_to_visit()
RETURNS TRIGGER AS $$
DECLARE
    v_visit_status TEXT;
    v_lifecycle_state TEXT;
    v_doctor_name TEXT;
    v_hospital_address TEXT;
    v_hospital_phone TEXT;
    v_hospital_image TEXT;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.total_cost IS DISTINCT FROM OLD.total_cost
       OR NEW.hospital_name IS DISTINCT FROM OLD.hospital_name
       OR NEW.hospital_id IS DISTINCT FROM OLD.hospital_id
       OR NEW.assigned_doctor_id IS DISTINCT FROM OLD.assigned_doctor_id
       OR NEW.specialty IS DISTINCT FROM OLD.specialty
       OR NEW.service_type IS DISTINCT FROM OLD.service_type THEN

        v_visit_status := CASE NEW.status
            WHEN 'completed' THEN 'completed'
            WHEN 'cancelled' THEN 'cancelled'
            WHEN 'in_progress' THEN 'in_progress'
            WHEN 'accepted' THEN 'in_progress'
            WHEN 'arrived' THEN 'in_progress'
            ELSE 'scheduled'
        END;

        v_lifecycle_state := CASE NEW.status
            WHEN 'pending_approval' THEN 'initiated'
            WHEN 'payment_declined' THEN 'payment_declined'
            WHEN 'in_progress' THEN 'confirmed'
            WHEN 'accepted' THEN 'dispatched'
            WHEN 'arrived' THEN 'arrived'
            WHEN 'completed' THEN 'completed'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE NULL
        END;

        SELECT d.name
        INTO v_doctor_name
        FROM public.doctors d
        WHERE d.id = NEW.assigned_doctor_id;

        SELECT
            COALESCE(h.google_address, h.address),
            COALESCE(h.google_phone, h.phone),
            h.image
        INTO v_hospital_address, v_hospital_phone, v_hospital_image
        FROM public.hospitals h
        WHERE h.id = NEW.hospital_id;

        UPDATE public.visits
        SET
            user_id = COALESCE(NEW.user_id, user_id),
            hospital_id = COALESCE(NEW.hospital_id, hospital_id),
            hospital_name = COALESCE(NEW.hospital_name, hospital_name),
            hospital_image = COALESCE(v_hospital_image, hospital_image),
            address = COALESCE(v_hospital_address, address),
            phone = COALESCE(v_hospital_phone, phone),
            image = COALESCE(v_hospital_image, image),
            doctor_name = COALESCE(v_doctor_name, doctor_name),
            specialty = COALESCE(NEW.specialty, specialty),
            type = COALESCE(NEW.service_type, type),
            status = COALESCE(v_visit_status, status),
            cost = CASE WHEN NEW.total_cost IS NULL THEN cost ELSE NEW.total_cost::TEXT END,
            lifecycle_state = COALESCE(v_lifecycle_state, lifecycle_state),
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE request_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_completed ON public.emergency_requests;
CREATE TRIGGER on_emergency_completed
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.sync_emergency_to_visit();

-- Legacy duplicate versions of auto/resource automations were removed.
-- Canonical hardened definitions are declared in the integrated fix-pack section below.

-- 4. Auto-Assign Doctor on Emergency Acceptance (Recovered from Legacy)
CREATE OR REPLACE FUNCTION public.auto_assign_doctor()
RETURNS TRIGGER AS $$
DECLARE
    v_doctor_id UUID;
    v_specialty TEXT;
    v_should_attempt BOOLEAN := FALSE;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_should_attempt := NEW.status IN ('accepted', 'in_progress')
            AND (
                OLD.status IS DISTINCT FROM NEW.status
                OR OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id
                OR OLD.responder_id IS DISTINCT FROM NEW.responder_id
                OR OLD.hospital_id IS DISTINCT FROM NEW.hospital_id
                OR OLD.assigned_doctor_id IS DISTINCT FROM NEW.assigned_doctor_id
            );
    END IF;

    IF NOT v_should_attempt OR NEW.hospital_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Idempotency guard: never assign twice for the same active request.
    IF NEW.assigned_doctor_id IS NOT NULL OR EXISTS (
        SELECT 1
        FROM public.emergency_doctor_assignments eda
        WHERE eda.emergency_request_id = NEW.id
          AND eda.status = 'assigned'
    ) THEN
        RETURN NEW;
    END IF;

    v_specialty := CASE NEW.service_type
        WHEN 'ambulance' THEN 'Emergency Medicine'
        WHEN 'bed' THEN 'Internal Medicine'
        ELSE 'Emergency Medicine'
    END;

    /*
      Selection logic:
      1) Prefer matching specialty where capacity is available.
      2) Within that clinical fit, prefer current schedule coverage, then on-call.
      3) Fall back to the existing available in-hospital capacity ordering.
      Missing schedules never block emergency care in low-coverage regions.
    */
    SELECT d.id INTO v_doctor_id
    FROM public.doctors d
    JOIN public.hospitals h ON h.id = d.hospital_id
    WHERE d.hospital_id = NEW.hospital_id
      AND LOWER(COALESCE(d.status, 'available')) IN ('available', 'on_call')
      AND d.is_available = true
      AND COALESCE(d.current_patients, 0) < COALESCE(NULLIF(d.max_patients, 0), 1)
      AND (
            d.specialization = v_specialty
            OR NOT EXISTS (
                SELECT 1
                FROM public.doctors ds
                WHERE ds.hospital_id = NEW.hospital_id
                  AND ds.is_available = true
                  AND LOWER(COALESCE(ds.status, 'available')) IN ('available', 'on_call')
                  AND COALESCE(ds.current_patients, 0) < COALESCE(NULLIF(ds.max_patients, 0), 1)
                  AND ds.specialization = v_specialty
            )
      )
    ORDER BY
      CASE WHEN d.specialization = v_specialty THEN 0 ELSE 1 END,
      CASE
          WHEN EXISTS (
              SELECT 1
              FROM public.doctor_schedules schedule
              WHERE schedule.doctor_id = d.id
                AND schedule.is_available = true
                AND schedule.date = (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(h.timezone, 'UTC'))::DATE
                AND schedule.start_time <= (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(h.timezone, 'UTC'))::TIME
                AND schedule.end_time > (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(h.timezone, 'UTC'))::TIME
          ) THEN 0
          ELSE 1
      END,
      CASE WHEN COALESCE(d.is_on_call, false) OR LOWER(COALESCE(d.status, '')) = 'on_call' THEN 0 ELSE 1 END,
      COALESCE(d.current_patients, 0) ASC,
      d.created_at ASC
    FOR UPDATE OF d SKIP LOCKED
    LIMIT 1;

    IF v_doctor_id IS NOT NULL THEN
        INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status)
        VALUES (NEW.id, v_doctor_id, 'assigned');

        UPDATE public.doctors
        SET current_patients = COALESCE(current_patients, 0) + 1,
            updated_at = NOW()
        WHERE id = v_doctor_id;

        UPDATE public.emergency_requests
        SET assigned_doctor_id = v_doctor_id,
            doctor_assigned_at = NOW()
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_auto_assign_doctor ON public.emergency_requests;
CREATE TRIGGER on_emergency_auto_assign_doctor
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.auto_assign_doctor();

-- 5. Release Doctor on Emergency Completion/Cancellation (Recovered from Legacy)
CREATE OR REPLACE FUNCTION public.release_doctor_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_should_release BOOLEAN := FALSE;
    v_release_status TEXT := 'cancelled';
BEGIN
    IF OLD.status NOT IN ('completed', 'cancelled') AND NEW.status IN ('completed', 'cancelled') THEN
        v_should_release := TRUE;
        v_release_status := CASE WHEN NEW.status = 'completed' THEN 'completed' ELSE 'cancelled' END;
    ELSIF NEW.status IN ('in_progress', 'accepted', 'arrived')
          AND OLD.assigned_doctor_id IS NOT NULL
          AND (
              OLD.hospital_id IS DISTINCT FROM NEW.hospital_id
              OR OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id
              OR OLD.responder_id IS DISTINCT FROM NEW.responder_id
          ) THEN
        v_should_release := TRUE;
        v_release_status := 'cancelled';
    END IF;

    IF v_should_release THEN
        WITH released_assignments AS (
            UPDATE public.emergency_doctor_assignments
            SET status = v_release_status,
                updated_at = NOW()
            WHERE emergency_request_id = NEW.id
              AND status = 'assigned'
            RETURNING doctor_id
        ),
        released_counts AS (
            SELECT doctor_id, COUNT(*)::INTEGER AS release_count
            FROM released_assignments
            WHERE doctor_id IS NOT NULL
            GROUP BY doctor_id
        )
        UPDATE public.doctors d
        SET current_patients = GREATEST(0, COALESCE(d.current_patients, 0) - rc.release_count),
            updated_at = NOW()
        FROM released_counts rc
        WHERE d.id = rc.doctor_id;

        UPDATE public.emergency_requests
        SET assigned_doctor_id = NULL,
            doctor_assigned_at = NULL,
            updated_at = NOW()
        WHERE id = NEW.id
          AND assigned_doctor_id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_release_doctor ON public.emergency_requests;
CREATE TRIGGER on_emergency_release_doctor
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.release_doctor_assignment();

-- 6. Auto-Create Insurance Billing on Completion (Recovered from Legacy)
CREATE OR REPLACE FUNCTION public.create_insurance_billing_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_policy RECORD;
    v_total NUMERIC;
    v_insurance_amount NUMERIC;
    v_user_amount NUMERIC;
BEGIN
    IF OLD.status NOT IN ('completed') AND NEW.status = 'completed' THEN
        SELECT * INTO v_policy
        FROM public.insurance_policies
        WHERE user_id = NEW.user_id AND is_default = true AND status = 'active'
        LIMIT 1;

        v_total := COALESCE(NEW.total_cost, CASE
            WHEN NEW.service_type = 'ambulance' THEN 150.00
            WHEN NEW.service_type = 'bed' THEN 200.00
            ELSE 100.00
        END);

        IF v_policy.id IS NOT NULL THEN
            v_insurance_amount := (v_total * COALESCE(v_policy.coverage_percentage, 80)) / 100;
            v_user_amount := v_total - v_insurance_amount;
        ELSE
            v_insurance_amount := 0;
            v_user_amount := v_total;
        END IF;

        INSERT INTO public.insurance_billing (
            emergency_request_id, hospital_id, user_id, insurance_policy_id,
            total_amount, insurance_amount, user_amount,
            coverage_percentage, billing_date, status
        ) VALUES (
            NEW.id, NEW.hospital_id, NEW.user_id, v_policy.id,
            v_total, v_insurance_amount, v_user_amount,
            COALESCE(v_policy.coverage_percentage, 0), CURRENT_DATE, 'pending'
        )
        ON CONFLICT (emergency_request_id)
            WHERE emergency_request_id IS NOT NULL
        DO UPDATE SET
            hospital_id = EXCLUDED.hospital_id,
            user_id = EXCLUDED.user_id,
            insurance_policy_id = EXCLUDED.insurance_policy_id,
            total_amount = EXCLUDED.total_amount,
            insurance_amount = EXCLUDED.insurance_amount,
            user_amount = EXCLUDED.user_amount,
            coverage_percentage = EXCLUDED.coverage_percentage,
            billing_date = EXCLUDED.billing_date,
            updated_at = NOW()
        WHERE public.insurance_billing.status = 'pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_create_billing ON public.emergency_requests;
CREATE TRIGGER on_emergency_create_billing
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.create_insurance_billing_on_completion();

-- ================================================================
-- Integrated Fix Pack (2026-03-02): Automation Determinism + Realtime
-- Source: consolidated from temporary fix migrations
-- ================================================================

-- Harden auto assignment against race conditions.
CREATE OR REPLACE FUNCTION public.auto_assign_driver()
RETURNS TRIGGER AS $$
DECLARE
    v_amb_id UUID;
    v_should_attempt BOOLEAN := FALSE;
    v_offer_result JSONB;
BEGIN
    IF NEW.service_type <> 'ambulance' OR NEW.hospital_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.current_responder_assignment_id IS NOT NULL
       OR NEW.responder_id IS NOT NULL
       OR NEW.ambulance_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_should_attempt := NEW.status = 'in_progress';
    ELSIF TG_OP = 'UPDATE' THEN
        v_should_attempt := NEW.status = 'in_progress'
            AND (
                OLD.status IS DISTINCT FROM NEW.status
                OR OLD.hospital_id IS DISTINCT FROM NEW.hospital_id
                OR OLD.current_responder_assignment_id IS DISTINCT FROM NEW.current_responder_assignment_id
                OR OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id
            );
    END IF;

    IF NOT v_should_attempt THEN
        RETURN NEW;
    END IF;

    SELECT ambulance.id
    INTO v_amb_id
    FROM public.ambulances ambulance
    WHERE ambulance.status = 'available'
      AND ambulance.current_call IS NULL
      AND ambulance.profile_id IS NOT NULL
      AND COALESCE(
            (public.ambulance_dispatch_readiness_snapshot(ambulance.id, NEW.id)->>'ready')::BOOLEAN,
            false
      )
      AND NOT EXISTS (
            SELECT 1
            FROM public.emergency_responder_assignments previous
            WHERE previous.emergency_request_id = NEW.id
              AND previous.ambulance_id = ambulance.id
              AND previous.status IN ('declined', 'released')
      )
    ORDER BY
        CASE
            WHEN NEW.patient_location IS NOT NULL AND ambulance.location IS NOT NULL
            THEN ST_Distance(ambulance.location::GEOGRAPHY, NEW.patient_location::GEOGRAPHY)
            ELSE 1000000000
        END,
        ambulance.updated_at ASC
    FOR UPDATE OF ambulance SKIP LOCKED
    LIMIT 1;

    IF v_amb_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_offer_result := public.offer_responder_assignment(
        NEW.id,
        v_amb_id,
        NULL,
        'automation:auto_assign_driver'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Resource sync must not depend on removed columns.
CREATE OR REPLACE FUNCTION public.update_resource_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_current_amb_status TEXT;
    v_is_icu_request BOOLEAN := FALSE;
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.ambulance_id IS NOT NULL
       AND OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id THEN
        UPDATE public.ambulances
        SET status = CASE
                WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
                ELSE 'available'
            END,
            current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = OLD.ambulance_id
          AND (current_call = NEW.id OR current_call IS NULL);
    END IF;

    IF NEW.ambulance_id IS NOT NULL THEN
        SELECT status INTO v_current_amb_status
        FROM public.ambulances
        WHERE id = NEW.ambulance_id;

        IF NEW.status = 'in_progress' AND NEW.current_responder_assignment_id IS NOT NULL THEN
            IF v_current_amb_status = 'available' THEN
                UPDATE public.ambulances
                SET status = 'dispatched',
                    current_call = NEW.id,
                    updated_at = NOW()
                WHERE id = NEW.ambulance_id;
            END IF;
        ELSIF NEW.status IN ('accepted', 'arrived') THEN
            IF v_current_amb_status IN ('available', 'dispatched', 'en_route', 'on_scene') THEN
                UPDATE public.ambulances
                SET status = 'on_trip',
                    current_call = NEW.id,
                    updated_at = NOW()
                WHERE id = NEW.ambulance_id;
            END IF;
        ELSIF NEW.status IN ('completed', 'cancelled', 'payment_declined') THEN
            IF v_current_amb_status NOT IN ('available', 'offline', 'maintenance') THEN
                UPDATE public.ambulances
                SET status = 'available',
                    current_call = NULL,
                    eta = NULL,
                    updated_at = NOW()
                WHERE id = NEW.ambulance_id;
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.service_type = 'bed' THEN
        v_is_icu_request := UPPER(COALESCE(NEW.specialty, OLD.specialty, '')) LIKE '%ICU%';

        -- Handle hospital reassignment while request is still active.
        IF OLD.hospital_id IS DISTINCT FROM NEW.hospital_id THEN
            IF OLD.hospital_id IS NOT NULL
               AND OLD.status IN ('in_progress', 'accepted', 'arrived') THEN
                UPDATE public.hospitals
                SET available_beds = COALESCE(available_beds, 0) + 1,
                    icu_beds_available = CASE
                        WHEN v_is_icu_request THEN COALESCE(icu_beds_available, 0) + 1
                        ELSE COALESCE(icu_beds_available, 0)
                    END
                WHERE id = OLD.hospital_id;
            END IF;

            IF NEW.hospital_id IS NOT NULL
               AND NEW.status IN ('in_progress', 'accepted', 'arrived') THEN
                UPDATE public.hospitals
                SET available_beds = GREATEST(0, COALESCE(available_beds, 0) - 1),
                    icu_beds_available = CASE
                        WHEN v_is_icu_request THEN GREATEST(0, COALESCE(icu_beds_available, 0) - 1)
                        ELSE COALESCE(icu_beds_available, 0)
                    END
                WHERE id = NEW.hospital_id;
            END IF;
        ELSIF NEW.status IN ('in_progress', 'accepted', 'arrived')
              AND OLD.status NOT IN ('in_progress', 'accepted', 'arrived') THEN
            UPDATE public.hospitals
            SET available_beds = GREATEST(0, COALESCE(available_beds, 0) - 1),
                icu_beds_available = CASE
                    WHEN v_is_icu_request THEN GREATEST(0, COALESCE(icu_beds_available, 0) - 1)
                    ELSE COALESCE(icu_beds_available, 0)
                END
            WHERE id = NEW.hospital_id;
        ELSIF NEW.status IN ('completed', 'cancelled')
              AND OLD.status IN ('in_progress', 'accepted', 'arrived') THEN
            UPDATE public.hospitals
            SET available_beds = COALESCE(available_beds, 0) + 1,
                icu_beds_available = CASE
                    WHEN v_is_icu_request THEN COALESCE(icu_beds_available, 0) + 1
                    ELSE COALESCE(icu_beds_available, 0)
                END
            WHERE id = NEW.hospital_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_start_dispatch ON public.emergency_requests;
CREATE TRIGGER on_emergency_start_dispatch
AFTER INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.auto_assign_driver();

DROP TRIGGER IF EXISTS on_emergency_status_resource_sync ON public.emergency_requests;
CREATE TRIGGER on_emergency_status_resource_sync
AFTER INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.update_resource_availability();


-- Closed-loop failover when an assigned ambulance/driver becomes unavailable mid-flow.
CREATE OR REPLACE FUNCTION public.handle_ambulance_unavailability_failover()
RETURNS TRIGGER AS $$
DECLARE
    v_request_id UUID;
    v_request_status TEXT;
    v_old_status TEXT := LOWER(COALESCE(OLD.status, ''));
    v_new_status TEXT := LOWER(COALESCE(NEW.status, ''));
    v_became_unavailable BOOLEAN := FALSE;
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NEW;
    END IF;

    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF NEW.current_call IS NULL THEN
        RETURN NEW;
    END IF;

    v_became_unavailable := (
        v_old_status NOT IN ('offline', 'maintenance')
        AND v_new_status IN ('offline', 'maintenance')
    ) OR (
        OLD.profile_id IS NOT NULL
        AND NEW.profile_id IS NULL
    );

    IF NOT v_became_unavailable THEN
        RETURN NEW;
    END IF;

    v_request_id := NEW.current_call;

    SELECT public.canonicalize_emergency_status(er.status, er.status)
    INTO v_request_status
    FROM public.emergency_requests er
    WHERE er.id = v_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF v_request_status NOT IN ('in_progress', 'accepted') THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.emergency_requests request
        WHERE request.id = v_request_id
          AND request.current_responder_assignment_id IS NOT NULL
    ) THEN
        PERFORM public.release_current_responder_assignment(
            v_request_id,
            'released',
            'assigned_responder_became_unavailable',
            NULL,
            'automation'
        );
    ELSE
        PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
        PERFORM set_config('ivisit.transition_source', 'automation:driver_failover', true);
        PERFORM set_config('ivisit.transition_reason', 'legacy_assignment_became_unavailable', true);
        PERFORM set_config('ivisit.transition_actor_role', 'automation', true);

        UPDATE public.emergency_requests
        SET status = 'in_progress',
            ambulance_id = NULL,
            dispatch_organization_id = NULL,
            responder_id = NULL,
            responder_name = NULL,
            responder_phone = NULL,
            responder_vehicle_type = NULL,
            responder_vehicle_plate = NULL,
            updated_at = NOW()
        WHERE id = v_request_id;

        UPDATE public.ambulances
        SET current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = NEW.id
          AND current_call = v_request_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ambulance_unavailability_failover ON public.ambulances;
CREATE TRIGGER on_ambulance_unavailability_failover
AFTER UPDATE OF status, profile_id, current_call ON public.ambulances
FOR EACH ROW EXECUTE PROCEDURE public.handle_ambulance_unavailability_failover();

-- Closed-loop failover when an assigned doctor becomes unavailable mid-flow.
CREATE OR REPLACE FUNCTION public.handle_doctor_unavailability_failover()
RETURNS TRIGGER AS $$
DECLARE
    v_old_available BOOLEAN;
    v_new_available BOOLEAN;
    v_request RECORD;
    v_candidate_doctor_id UUID;
    v_released_count INTEGER;
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NEW;
    END IF;

    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    v_old_available := COALESCE(OLD.is_available, false)
        AND LOWER(COALESCE(OLD.status, '')) IN ('available', 'on_call')
        AND COALESCE(OLD.current_patients, 0) < GREATEST(COALESCE(NULLIF(OLD.max_patients, 0), 1), 1);
    v_new_available := COALESCE(NEW.is_available, false)
        AND LOWER(COALESCE(NEW.status, '')) IN ('available', 'on_call')
        AND COALESCE(NEW.current_patients, 0) < GREATEST(COALESCE(NULLIF(NEW.max_patients, 0), 1), 1);

    IF NOT v_old_available OR v_new_available THEN
        RETURN NEW;
    END IF;

    FOR v_request IN
        SELECT er.id, er.hospital_id, er.service_type
        FROM public.emergency_requests er
        WHERE er.assigned_doctor_id = NEW.id
          AND public.canonicalize_emergency_status(er.status, er.status) IN ('accepted', 'in_progress', 'arrived')
        ORDER BY er.created_at ASC
        FOR UPDATE OF er SKIP LOCKED
    LOOP
        SELECT d.id
        INTO v_candidate_doctor_id
        FROM public.doctors d
        JOIN public.hospitals h ON h.id = d.hospital_id
        WHERE d.id IS DISTINCT FROM NEW.id
          AND d.hospital_id = v_request.hospital_id
          AND LOWER(COALESCE(d.status, 'available')) IN ('available', 'on_call')
          AND d.is_available = true
          AND COALESCE(d.current_patients, 0) < GREATEST(COALESCE(NULLIF(d.max_patients, 0), 1), 1)
        ORDER BY
            CASE
                WHEN v_request.service_type = 'ambulance' AND d.specialization = 'Emergency Medicine' THEN 0
                WHEN v_request.service_type = 'bed' AND d.specialization = 'Internal Medicine' THEN 0
                ELSE 1
            END,
            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM public.doctor_schedules schedule
                    WHERE schedule.doctor_id = d.id
                      AND schedule.is_available = true
                      AND schedule.date = (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(h.timezone, 'UTC'))::DATE
                      AND schedule.start_time <= (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(h.timezone, 'UTC'))::TIME
                      AND schedule.end_time > (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(h.timezone, 'UTC'))::TIME
                ) THEN 0
                ELSE 1
            END,
            CASE WHEN COALESCE(d.is_on_call, false) OR LOWER(COALESCE(d.status, '')) = 'on_call' THEN 0 ELSE 1 END,
            COALESCE(d.current_patients, 0) ASC,
            d.created_at ASC
        FOR UPDATE OF d SKIP LOCKED
        LIMIT 1;

        IF v_candidate_doctor_id IS NULL THEN
            WITH released AS (
                UPDATE public.emergency_doctor_assignments
                SET status = 'cancelled',
                    updated_at = NOW()
                WHERE emergency_request_id = v_request.id
                  AND doctor_id = NEW.id
                  AND status = 'assigned'
                RETURNING 1
            )
            SELECT COUNT(*)::INTEGER
            INTO v_released_count
            FROM released;

            IF COALESCE(v_released_count, 0) > 0 THEN
                UPDATE public.doctors
                SET current_patients = GREATEST(0, COALESCE(current_patients, 0) - v_released_count),
                    updated_at = NOW()
                WHERE id = NEW.id;
            END IF;

            UPDATE public.emergency_requests er
            SET assigned_doctor_id = NULL,
                doctor_assigned_at = NULL,
                updated_at = NOW()
            WHERE er.id = v_request.id
              AND er.assigned_doctor_id = NEW.id;

            CONTINUE;
        END IF;

        PERFORM set_config('ivisit.transition_source', 'automation:doctor_failover', true);
        PERFORM set_config('ivisit.transition_reason', 'assigned_doctor_unavailable_auto_reassign', true);
        PERFORM set_config('ivisit.transition_actor_role', 'automation', true);
        PERFORM set_config(
            'ivisit.transition_metadata',
            jsonb_build_object(
                'request_id', v_request.id,
                'unavailable_doctor_id', NEW.id,
                'replacement_doctor_id', v_candidate_doctor_id
            )::TEXT,
            true
        );

        WITH released AS (
            UPDATE public.emergency_doctor_assignments
            SET status = 'cancelled',
                updated_at = NOW()
            WHERE emergency_request_id = v_request.id
              AND status = 'assigned'
            RETURNING doctor_id
        ),
        released_counts AS (
            SELECT doctor_id, COUNT(*)::INTEGER AS release_count
            FROM released
            WHERE doctor_id IS NOT NULL
            GROUP BY doctor_id
        )
        UPDATE public.doctors d
        SET current_patients = GREATEST(0, COALESCE(d.current_patients, 0) - rc.release_count),
            updated_at = NOW()
        FROM released_counts rc
        WHERE d.id = rc.doctor_id;

        INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status, notes)
        VALUES (v_request.id, v_candidate_doctor_id, 'assigned', 'Auto reassigned: previous doctor became unavailable');

        UPDATE public.doctors
        SET current_patients = COALESCE(current_patients, 0) + 1,
            updated_at = NOW()
        WHERE id = v_candidate_doctor_id;

        UPDATE public.emergency_requests er
        SET assigned_doctor_id = v_candidate_doctor_id,
            doctor_assigned_at = NOW(),
            updated_at = NOW()
        WHERE er.id = v_request.id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_doctor_unavailability_failover ON public.doctors;
CREATE TRIGGER on_doctor_unavailability_failover
AFTER UPDATE OF status, is_available, current_patients, max_patients ON public.doctors
FOR EACH ROW EXECUTE PROCEDURE public.handle_doctor_unavailability_failover();


-- Realtime publication parity for live subscriptions.
DO $$
DECLARE
    v_table TEXT;
    v_targets TEXT[] := ARRAY[
        'ambulances',
        'ambulance_staff_assignments',
        'doctor_schedules',
        'emergency_contacts',
        'emergency_chat_messages',
        'emergency_chat_participants',
        'emergency_chat_rooms',
        'emergency_responder_assignments',
        'doctors',
        'emergency_requests',
        'health_news',
        'hospitals',
        'insurance_policies',
        'notifications',
        'organizations',
        'payments',
        'profiles',
        'room_pricing',
        'service_pricing',
        'support_tickets',
        'user_activity',
        'visits'
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        RETURN;
    END IF;

    FOREACH v_table IN ARRAY v_targets LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = v_table
              AND c.relkind = 'r'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM pg_publication_rel pr
            JOIN pg_publication p ON p.oid = pr.prpubid
            JOIN pg_class c ON c.oid = pr.prrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE p.pubname = 'supabase_realtime'
              AND n.nspname = 'public'
              AND c.relname = v_table
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
        END IF;
    END LOOP;
END;
$$;


-- Remove duplicate display-id trigger variants only when both exist.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'notifications' AND t.tgname = 'stamp_ntf_display_id'
    )
    AND EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'notifications' AND t.tgname = 'stamp_notification_display_id'
    ) THEN
        DROP TRIGGER IF EXISTS stamp_ntf_display_id ON public.notifications;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'organization_wallets' AND t.tgname = 'stamp_organization_wallet_display_id'
    )
    AND EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'organization_wallets' AND t.tgname = 'stamp_org_wallet_display_id'
    ) THEN
        DROP TRIGGER IF EXISTS stamp_organization_wallet_display_id ON public.organization_wallets;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'patient_wallets' AND t.tgname = 'stamp_patient_wallet_display_id'
    )
    AND EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'patient_wallets' AND t.tgname = 'stamp_pat_wallet_display_id'
    ) THEN
        DROP TRIGGER IF EXISTS stamp_patient_wallet_display_id ON public.patient_wallets;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'payments' AND t.tgname = 'stamp_payment_display_id'
    )
    AND EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'payments' AND t.tgname = 'stamp_pay_display_id'
    ) THEN
        DROP TRIGGER IF EXISTS stamp_payment_display_id ON public.payments;
    END IF;
END;
$$;


-- Hot path indexes for emergency lifecycle reads.
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON public.emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_hospital_id ON public.emergency_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_created_at ON public.emergency_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ambulances_hospital_status ON public.ambulances(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_emergency_request_id ON public.payments(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_visits_request_id ON public.visits(request_id);


-- SCC-070: Backfill visit hospital metadata for stable UI cards
-- Ensures visits have canonical hospital_id/hospital_name where possible.
-- If visits.image exists, it is backfilled from hospitals.image as well.
DO $$
DECLARE
    v_has_image_column BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'visits'
          AND column_name = 'image'
    )
    INTO v_has_image_column;

    IF v_has_image_column THEN
        -- 1) Backfill from linked emergency request (with image).
        EXECUTE $sql$
            UPDATE public.visits v
            SET
                hospital_id = COALESCE(v.hospital_id, er.hospital_id),
                hospital_name = COALESCE(
                    NULLIF(TRIM(v.hospital_name), ''),
                    NULLIF(TRIM(er.hospital_name), ''),
                    (
                        SELECT h1.name
                        FROM public.hospitals h1
                        WHERE h1.id = COALESCE(v.hospital_id, er.hospital_id)
                        LIMIT 1
                    ),
                    v.hospital_name
                ),
                image = COALESCE(
                    NULLIF(TRIM(v.image), ''),
                    (
                        SELECT NULLIF(TRIM(h1.image), '')
                        FROM public.hospitals h1
                        WHERE h1.id = COALESCE(v.hospital_id, er.hospital_id)
                        LIMIT 1
                    ),
                    v.image
                ),
                updated_at = NOW()
            FROM public.emergency_requests er
            WHERE v.request_id = er.id
              AND (
                  v.hospital_id IS NULL
                  OR NULLIF(TRIM(v.hospital_name), '') IS NULL
                  OR LOWER(TRIM(COALESCE(v.hospital_name, ''))) IN ('hospital', 'unknown facility')
                  OR NULLIF(TRIM(v.image), '') IS NULL
              )
        $sql$;

        -- 2) Backfill from direct hospital join (with image).
        EXECUTE $sql$
            UPDATE public.visits v
            SET
                hospital_name = COALESCE(
                    NULLIF(TRIM(v.hospital_name), ''),
                    h.name,
                    v.hospital_name
                ),
                image = COALESCE(
                    NULLIF(TRIM(v.image), ''),
                    NULLIF(TRIM(h.image), ''),
                    v.image
                ),
                updated_at = NOW()
            FROM public.hospitals h
            WHERE h.id = v.hospital_id
              AND (
                  NULLIF(TRIM(v.hospital_name), '') IS NULL
                  OR LOWER(TRIM(COALESCE(v.hospital_name, ''))) IN ('hospital', 'unknown facility')
                  OR NULLIF(TRIM(v.image), '') IS NULL
              )
        $sql$;
    ELSE
        -- 1) Backfill from linked emergency request (schema without visits.image).
        EXECUTE $sql$
            UPDATE public.visits v
            SET
                hospital_id = COALESCE(v.hospital_id, er.hospital_id),
                hospital_name = COALESCE(
                    NULLIF(TRIM(v.hospital_name), ''),
                    NULLIF(TRIM(er.hospital_name), ''),
                    (
                        SELECT h1.name
                        FROM public.hospitals h1
                        WHERE h1.id = COALESCE(v.hospital_id, er.hospital_id)
                        LIMIT 1
                    ),
                    v.hospital_name
                ),
                updated_at = NOW()
            FROM public.emergency_requests er
            WHERE v.request_id = er.id
              AND (
                  v.hospital_id IS NULL
                  OR NULLIF(TRIM(v.hospital_name), '') IS NULL
                  OR LOWER(TRIM(COALESCE(v.hospital_name, ''))) IN ('hospital', 'unknown facility')
              )
        $sql$;

        -- 2) Backfill from direct hospital join (schema without visits.image).
        EXECUTE $sql$
            UPDATE public.visits v
            SET
                hospital_name = COALESCE(
                    NULLIF(TRIM(v.hospital_name), ''),
                    h.name,
                    v.hospital_name
                ),
                updated_at = NOW()
            FROM public.hospitals h
            WHERE h.id = v.hospital_id
              AND (
                  NULLIF(TRIM(v.hospital_name), '') IS NULL
                  OR LOWER(TRIM(COALESCE(v.hospital_name, ''))) IN ('hospital', 'unknown facility')
              )
        $sql$;
    END IF;
END
$$;
