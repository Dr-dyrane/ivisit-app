-- Permanent exact-source deployment for emergency dispatch production readiness.
-- Retained to preserve live migration provenance for the consolidated source delta.
-- Source digest: 5b2ff9cb223dde21
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';

-- Source: supabase/migrations/20260219000900_automations.sql (LIVE_EMERGENCY_RELATIONSHIP_RECONCILIATION)
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


-- Source: supabase/migrations/20260219000200_org_structure.sql (one active doctor assignment per emergency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_eda_one_active_assignment_per_request
    ON public.emergency_doctor_assignments(emergency_request_id)
    WHERE status IN ('assigned', 'accepted');


-- Source: supabase/migrations/20260219000300_logistics.sql (EMERGENCY_RESPONDER_TELEMETRY_SCHEMA)
-- PULLBACK NOTE: responder readiness and telemetry generation contract.
-- OLD: ambulance.updated_at mixed operational edits with responder location freshness.
-- NEW: observed/received clocks, sequence, accuracy, and lease are explicit.
ALTER TABLE public.ambulances
    ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_accuracy_meters DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_observed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS location_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS telemetry_sequence BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS telemetry_lease_expires_at TIMESTAMPTZ;

ALTER TABLE public.ambulances
    DROP CONSTRAINT IF EXISTS ambulances_location_accuracy_nonnegative_chk,
    DROP CONSTRAINT IF EXISTS ambulances_telemetry_sequence_nonnegative_chk;
ALTER TABLE public.ambulances
    ADD CONSTRAINT ambulances_location_accuracy_nonnegative_chk CHECK (
        location_accuracy_meters IS NULL OR location_accuracy_meters >= 0
    ),
    ADD CONSTRAINT ambulances_telemetry_sequence_nonnegative_chk CHECK (
        telemetry_sequence >= 0
    );

ALTER TABLE public.ambulances
    DROP CONSTRAINT IF EXISTS ambulances_profile_id_fkey;
ALTER TABLE public.ambulances
    ADD CONSTRAINT ambulances_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- Source: supabase/migrations/20260219000300_logistics.sql (EMERGENCY_RESPONDER_ASSIGNMENT_SCHEMA)
-- PULLBACK NOTE: assignment is no longer equivalent to responder acceptance.
-- Each row is one immutable responder/ambulance offer generation. Lifecycle and
-- telemetry fields advance only through the narrow RPCs in core_rpcs.
CREATE TABLE IF NOT EXISTS public.emergency_responder_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE RESTRICT,
    ambulance_id UUID NOT NULL REFERENCES public.ambulances(id) ON DELETE RESTRICT,
    responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'offered' CHECK (
        status IN ('offered', 'accepted', 'arrived', 'declined', 'released', 'completed', 'cancelled')
    ),
    offered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    offer_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 seconds'),
    decline_reason TEXT,
    telemetry_sequence BIGINT NOT NULL DEFAULT 0 CHECK (telemetry_sequence >= 0),
    responder_location GEOMETRY(POINT, 4326),
    responder_heading DOUBLE PRECISION,
    location_accuracy_meters DOUBLE PRECISION CHECK (
        location_accuracy_meters IS NULL OR location_accuracy_meters >= 0
    ),
    location_observed_at TIMESTAMPTZ,
    location_received_at TIMESTAMPTZ,
    telemetry_lease_expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.emergency_requests
    ADD COLUMN IF NOT EXISTS current_responder_assignment_id UUID,
    ADD COLUMN IF NOT EXISTS dispatch_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS responder_location_accuracy_meters DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS responder_location_observed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responder_location_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responder_telemetry_sequence BIGINT,
    ADD COLUMN IF NOT EXISTS responder_telemetry_lease_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS patient_acknowledged_arrival_at TIMESTAMPTZ;

ALTER TABLE public.emergency_responder_assignments
    ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 seconds');

UPDATE public.emergency_responder_assignments assignment
SET organization_id = COALESCE(
    ambulance.organization_id,
    ambulance_hospital.organization_id,
    request.dispatch_organization_id,
    request_hospital.organization_id
)
FROM public.ambulances ambulance
LEFT JOIN public.hospitals ambulance_hospital
  ON ambulance_hospital.id = ambulance.hospital_id
,
public.emergency_requests request
LEFT JOIN public.hospitals request_hospital
  ON request_hospital.id = request.hospital_id
WHERE ambulance.id = assignment.ambulance_id
  AND request.id = assignment.emergency_request_id
  AND assignment.organization_id IS NULL;

ALTER TABLE public.emergency_responder_assignments
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.emergency_responder_assignments
    DROP CONSTRAINT IF EXISTS emergency_responder_assignments_emergency_request_id_fkey;
ALTER TABLE public.emergency_responder_assignments
    ADD CONSTRAINT emergency_responder_assignments_emergency_request_id_fkey
    FOREIGN KEY (emergency_request_id)
    REFERENCES public.emergency_requests(id)
    ON DELETE RESTRICT;

ALTER TABLE public.emergency_requests
    DROP CONSTRAINT IF EXISTS emergency_requests_responder_location_accuracy_nonnegative_chk,
    DROP CONSTRAINT IF EXISTS emergency_requests_responder_telemetry_sequence_nonnegative_chk;
ALTER TABLE public.emergency_requests
    ADD CONSTRAINT emergency_requests_responder_location_accuracy_nonnegative_chk CHECK (
        responder_location_accuracy_meters IS NULL OR responder_location_accuracy_meters >= 0
    ),
    ADD CONSTRAINT emergency_requests_responder_telemetry_sequence_nonnegative_chk CHECK (
        responder_telemetry_sequence IS NULL OR responder_telemetry_sequence >= 0
    );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'emergency_requests'
          AND constraint_name = 'emergency_requests_current_responder_assignment_fkey'
    ) THEN
        ALTER TABLE public.emergency_requests
            ADD CONSTRAINT emergency_requests_current_responder_assignment_fkey
            FOREIGN KEY (current_responder_assignment_id)
            REFERENCES public.emergency_responder_assignments(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_responder_assignment_active_request
    ON public.emergency_responder_assignments(emergency_request_id)
    WHERE status IN ('offered', 'accepted', 'arrived');
CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_responder_assignment_active_ambulance
    ON public.emergency_responder_assignments(ambulance_id)
    WHERE status IN ('offered', 'accepted', 'arrived');
CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_responder_assignment_active_responder
    ON public.emergency_responder_assignments(responder_id)
    WHERE status IN ('offered', 'accepted', 'arrived');
CREATE INDEX IF NOT EXISTS idx_emergency_responder_assignment_request_time
    ON public.emergency_responder_assignments(emergency_request_id, offered_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_responder_assignment_offer_expiry
    ON public.emergency_responder_assignments(offer_expires_at)
    WHERE status = 'offered';

-- Staffing history is separate from the current ambulance.profile_id cache.
-- Readiness requires one active, in-window assignment; Console writes it only
-- through the scoped staffing command.
CREATE TABLE IF NOT EXISTS public.ambulance_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambulance_id UUID NOT NULL REFERENCES public.ambulances(id) ON DELETE RESTRICT,
    responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    duty_role TEXT NOT NULL DEFAULT 'driver' CHECK (duty_role = 'driver'),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ended_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    end_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ambulance_staff_one_active_unit
    ON public.ambulance_staff_assignments(ambulance_id)
    WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_ambulance_staff_one_active_responder
    ON public.ambulance_staff_assignments(responder_id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ambulance_staff_org_window
    ON public.ambulance_staff_assignments(organization_id, starts_at, ends_at);

DROP TRIGGER IF EXISTS handle_ambulance_staff_assignment_updated_at
    ON public.ambulance_staff_assignments;
CREATE TRIGGER handle_ambulance_staff_assignment_updated_at
BEFORE UPDATE ON public.ambulance_staff_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.protect_emergency_responder_assignment_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'emergency_responder_assignments history cannot be deleted';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.emergency_request_id IS DISTINCT FROM OLD.emergency_request_id
       OR NEW.ambulance_id IS DISTINCT FROM OLD.ambulance_id
       OR NEW.responder_id IS DISTINCT FROM OLD.responder_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.offered_by IS DISTINCT FROM OLD.offered_by
       OR NEW.offer_expires_at IS DISTINCT FROM OLD.offer_expires_at
       OR NEW.offered_at IS DISTINCT FROM OLD.offered_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'responder assignment identity is immutable';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            (OLD.status = 'offered' AND NEW.status IN ('accepted', 'declined', 'released', 'cancelled'))
            OR (OLD.status = 'accepted' AND NEW.status IN ('arrived', 'released', 'cancelled'))
            OR (OLD.status = 'arrived' AND NEW.status IN ('completed', 'released', 'cancelled'))
        ) THEN
            RAISE EXCEPTION 'Illegal responder assignment transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_emergency_responder_assignment_history
    ON public.emergency_responder_assignments;
CREATE TRIGGER trg_protect_emergency_responder_assignment_history
BEFORE UPDATE OR DELETE ON public.emergency_responder_assignments
FOR EACH ROW EXECUTE FUNCTION public.protect_emergency_responder_assignment_history();

DROP TRIGGER IF EXISTS handle_emergency_responder_assignment_updated_at
    ON public.emergency_responder_assignments;
CREATE TRIGGER handle_emergency_responder_assignment_updated_at
BEFORE UPDATE ON public.emergency_responder_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- Source: supabase/migrations/20260219000300_logistics.sql (one visit per emergency request)
CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_one_per_emergency_request
ON public.visits(request_id)
WHERE request_id IS NOT NULL;


-- Source: supabase/migrations/20260219000300_logistics.sql (update_ambulance_location function)
-- 📍 Real-time Tracking RPC Functions
-- Part of Master System Improvement Plan - Phase 2 Important System Enhancements

-- 1. Update Ambulance Location
CREATE OR REPLACE FUNCTION public.update_ambulance_location(
    p_ambulance_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request_id UUID;
    v_assignment_id UUID;
    v_sequence BIGINT;
BEGIN
    IF p_latitude IS NULL OR p_longitude IS NULL
       OR p_latitude < -90 OR p_latitude > 90
       OR p_longitude < -180 OR p_longitude > 180 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid ambulance location',
            'code', 'INVALID_LOCATION'
        );
    END IF;

    SELECT ambulance.current_call,
           request.current_responder_assignment_id,
           COALESCE(ambulance.telemetry_sequence, 0) + 1
    INTO v_request_id, v_assignment_id, v_sequence
    FROM public.ambulances ambulance
    LEFT JOIN public.emergency_requests request ON request.id = ambulance.current_call
    WHERE ambulance.id = p_ambulance_id
    FOR UPDATE OF ambulance;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance not found',
            'code', 'AMBULANCE_NOT_FOUND'
        );
    END IF;

    RETURN public.report_responder_telemetry(
        jsonb_strip_nulls(jsonb_build_object(
            'ambulance_id', p_ambulance_id,
            'request_id', v_request_id,
            'assignment_id', v_assignment_id,
            'sequence', v_sequence,
            'observed_at', NOW(),
            'location', jsonb_build_object(
                'lat', p_latitude,
                'lng', p_longitude
            ),
            'accuracy_meters', p_accuracy
        ))
    ) || jsonb_build_object('compatibility_command', 'update_ambulance_location');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219000300_logistics.sql (revoke direct ambulance location function access)
REVOKE ALL ON FUNCTION public.update_ambulance_location(UUID, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC, anon;


-- Source: supabase/migrations/20260219000300_logistics.sql (grant scoped ambulance location function access)
GRANT EXECUTE ON FUNCTION public.update_ambulance_location(UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated, service_role;


-- Source: supabase/migrations/20260219000400_finance.sql (EMERGENCY_PAYMENT_IDEMPOTENCY_SCHEMA)
-- PULLBACK NOTE: financial retry identity is persisted beside the ledger entry.
-- Balance mutation functions claim these keys before changing a balance.
ALTER TABLE public.wallet_ledger
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_idempotency_key
    ON public.wallet_ledger(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_open_emergency_settlement
    ON public.payments(emergency_request_id)
    WHERE emergency_request_id IS NOT NULL
      AND status IN ('pending', 'completed')
      AND COALESCE(metadata->>'payment_kind', 'service') = 'service';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'emergency_requests'
          AND constraint_name = 'emergency_requests_payment_id_fkey'
    ) THEN
        ALTER TABLE public.emergency_requests
            ADD CONSTRAINT emergency_requests_payment_id_fkey
            FOREIGN KEY (payment_id)
            REFERENCES public.payments(id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;
END
$$;


-- Source: supabase/migrations/20260219000400_finance.sql (STRIPE_WEBHOOK_EVENT_RECEIPTS)
-- PULLBACK NOTE: Stripe webhook delivery now has a durable finance-owned lease.
-- OLD: replay and concurrent delivery relied only on downstream idempotency.
-- NEW: signed events claim a unique receipt before any consequence is applied.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_event_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    stripe_account_id TEXT,
    status TEXT NOT NULL DEFAULT 'processing',
    attempts INTEGER NOT NULL DEFAULT 1,
    claim_token UUID,
    first_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lease_expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT stripe_webhook_event_receipts_event_id_chk
        CHECK (BTRIM(stripe_event_id) <> ''),
    CONSTRAINT stripe_webhook_event_receipts_event_type_chk
        CHECK (BTRIM(event_type) <> ''),
    CONSTRAINT stripe_webhook_event_receipts_status_chk
        CHECK (status IN ('processing', 'completed', 'failed')),
    CONSTRAINT stripe_webhook_event_receipts_attempts_chk
        CHECK (attempts > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_webhook_event_receipts_event_id
    ON public.stripe_webhook_event_receipts(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_event_receipts_status_lease
    ON public.stripe_webhook_event_receipts(status, lease_expires_at);

ALTER TABLE public.stripe_webhook_event_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_webhook_event_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.stripe_webhook_event_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
    p_stripe_event_id TEXT,
    p_event_type TEXT,
    p_stripe_account_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_event_id TEXT := NULLIF(BTRIM(COALESCE(p_stripe_event_id, '')), '');
    v_event_type TEXT := NULLIF(BTRIM(COALESCE(p_event_type, '')), '');
    v_account_id TEXT := NULLIF(BTRIM(COALESCE(p_stripe_account_id, '')), '');
    v_now TIMESTAMPTZ := clock_timestamp();
    v_claim_token UUID := gen_random_uuid();
    v_disposition TEXT := 'claimed';
    v_receipt public.stripe_webhook_event_receipts%ROWTYPE;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_event_id IS NULL OR v_event_type IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stripe event id and type are required'
        );
    END IF;

    INSERT INTO public.stripe_webhook_event_receipts (
        stripe_event_id,
        event_type,
        stripe_account_id,
        status,
        attempts,
        claim_token,
        first_received_at,
        last_received_at,
        processing_started_at,
        lease_expires_at,
        created_at,
        updated_at
    )
    VALUES (
        v_event_id,
        v_event_type,
        v_account_id,
        'processing',
        1,
        v_claim_token,
        v_now,
        v_now,
        v_now,
        v_now + INTERVAL '5 minutes',
        v_now,
        v_now
    )
    ON CONFLICT (stripe_event_id) DO NOTHING
    RETURNING * INTO v_receipt;

    IF v_receipt.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'should_process', true,
            'disposition', v_disposition,
            'receipt_id', v_receipt.id,
            'claim_token', v_receipt.claim_token,
            'attempts', v_receipt.attempts,
            'lease_expires_at', v_receipt.lease_expires_at
        );
    END IF;

    -- The insert can wait behind a concurrent claim. Refresh the lease clock
    -- before deciding whether that owner is still active.
    v_now := clock_timestamp();

    SELECT receipt.*
    INTO v_receipt
    FROM public.stripe_webhook_event_receipts receipt
    WHERE receipt.stripe_event_id = v_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stripe event receipt disappeared during claim';
    END IF;

    IF v_receipt.event_type IS DISTINCT FROM v_event_type
       OR v_receipt.stripe_account_id IS DISTINCT FROM v_account_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stripe event receipt identity mismatch',
            'receipt_id', v_receipt.id
        );
    END IF;

    IF v_receipt.status = 'completed' THEN
        UPDATE public.stripe_webhook_event_receipts
        SET last_received_at = v_now,
            updated_at = v_now
        WHERE id = v_receipt.id;

        RETURN jsonb_build_object(
            'success', true,
            'should_process', false,
            'disposition', 'completed',
            'receipt_id', v_receipt.id,
            'attempts', v_receipt.attempts,
            'completed_at', v_receipt.completed_at
        );
    END IF;

    IF v_receipt.status = 'processing'
       AND v_receipt.lease_expires_at IS NOT NULL
       AND v_receipt.lease_expires_at > v_now THEN
        UPDATE public.stripe_webhook_event_receipts
        SET last_received_at = v_now,
            updated_at = v_now
        WHERE id = v_receipt.id;

        RETURN jsonb_build_object(
            'success', true,
            'should_process', false,
            'disposition', 'active',
            'receipt_id', v_receipt.id,
            'attempts', v_receipt.attempts,
            'lease_expires_at', v_receipt.lease_expires_at
        );
    END IF;

    v_disposition := CASE
        WHEN v_receipt.status = 'failed' THEN 'retried_failed'
        ELSE 'reclaimed_stale'
    END;
    v_claim_token := gen_random_uuid();

    UPDATE public.stripe_webhook_event_receipts
    SET status = 'processing',
        attempts = attempts + 1,
        claim_token = v_claim_token,
        last_received_at = v_now,
        processing_started_at = v_now,
        lease_expires_at = v_now + INTERVAL '5 minutes',
        completed_at = NULL,
        updated_at = v_now
    WHERE id = v_receipt.id
    RETURNING * INTO v_receipt;

    RETURN jsonb_build_object(
        'success', true,
        'should_process', true,
        'disposition', v_disposition,
        'receipt_id', v_receipt.id,
        'claim_token', v_receipt.claim_token,
        'attempts', v_receipt.attempts,
        'lease_expires_at', v_receipt.lease_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.complete_stripe_webhook_event(
    p_stripe_event_id TEXT,
    p_claim_token UUID
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_event_id TEXT := NULLIF(BTRIM(COALESCE(p_stripe_event_id, '')), '');
    v_now TIMESTAMPTZ := clock_timestamp();
    v_receipt public.stripe_webhook_event_receipts%ROWTYPE;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_event_id IS NULL OR p_claim_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stripe event claim is required');
    END IF;

    UPDATE public.stripe_webhook_event_receipts
    SET status = 'completed',
        completed_at = COALESCE(completed_at, v_now),
        claim_token = NULL,
        lease_expires_at = NULL,
        updated_at = v_now
    WHERE stripe_event_id = v_event_id
      AND status = 'processing'
      AND claim_token = p_claim_token
    RETURNING * INTO v_receipt;

    IF v_receipt.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'receipt_id', v_receipt.id,
            'attempts', v_receipt.attempts,
            'completed_at', v_receipt.completed_at
        );
    END IF;

    SELECT receipt.*
    INTO v_receipt
    FROM public.stripe_webhook_event_receipts receipt
    WHERE receipt.stripe_event_id = v_event_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stripe event receipt not found');
    END IF;

    IF v_receipt.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'receipt_id', v_receipt.id,
            'attempts', v_receipt.attempts,
            'completed_at', v_receipt.completed_at
        );
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'error', 'Stripe event claim is no longer owned',
        'receipt_id', v_receipt.id,
        'status', v_receipt.status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.fail_stripe_webhook_event(
    p_stripe_event_id TEXT,
    p_claim_token UUID,
    p_last_error TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_event_id TEXT := NULLIF(BTRIM(COALESCE(p_stripe_event_id, '')), '');
    v_error TEXT := LEFT(
        COALESCE(NULLIF(BTRIM(COALESCE(p_last_error, '')), ''), 'Stripe webhook processing failed'),
        4000
    );
    v_now TIMESTAMPTZ := clock_timestamp();
    v_receipt public.stripe_webhook_event_receipts%ROWTYPE;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_event_id IS NULL OR p_claim_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stripe event claim is required');
    END IF;

    UPDATE public.stripe_webhook_event_receipts
    SET status = 'failed',
        failed_at = v_now,
        last_error = v_error,
        claim_token = NULL,
        lease_expires_at = NULL,
        updated_at = v_now
    WHERE stripe_event_id = v_event_id
      AND status = 'processing'
      AND claim_token = p_claim_token
    RETURNING * INTO v_receipt;

    IF v_receipt.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'receipt_id', v_receipt.id,
            'attempts', v_receipt.attempts,
            'failed_at', v_receipt.failed_at
        );
    END IF;

    SELECT receipt.*
    INTO v_receipt
    FROM public.stripe_webhook_event_receipts receipt
    WHERE receipt.stripe_event_id = v_event_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stripe event receipt not found');
    END IF;

    IF v_receipt.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'receipt_id', v_receipt.id
        );
    END IF;

    IF v_receipt.status = 'failed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_failed', true,
            'receipt_id', v_receipt.id,
            'failed_at', v_receipt.failed_at
        );
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'error', 'Stripe event claim is no longer owned',
        'receipt_id', v_receipt.id,
        'status', v_receipt.status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.apply_stripe_payout_paid(
    p_payout_id TEXT,
    p_stripe_account_id TEXT,
    p_amount NUMERIC,
    p_provider_response JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payout_id TEXT := NULLIF(BTRIM(COALESCE(p_payout_id, '')), '');
    v_account_id TEXT := NULLIF(BTRIM(COALESCE(p_stripe_account_id, '')), '');
    v_amount NUMERIC := ROUND(COALESCE(p_amount, 0), 2);
    v_organization_id UUID;
    v_wallet_id UUID;
    v_ledger_id UUID;
    v_existing_amount NUMERIC;
    v_existing_wallet_id UUID;
    v_ledger_key TEXT;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_payout_id IS NULL OR v_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid payout id and amount are required');
    END IF;

    IF v_account_id IS NOT NULL THEN
        SELECT organization.id, wallet.id
        INTO v_organization_id, v_wallet_id
        FROM public.organizations organization
        JOIN public.organization_wallets wallet
          ON wallet.organization_id = organization.id
        WHERE organization.stripe_account_id = v_account_id
        ORDER BY organization.id
        LIMIT 1
        FOR UPDATE OF wallet;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Stripe payout organization wallet not found');
        END IF;
    ELSE
        SELECT wallet.id
        INTO v_wallet_id
        FROM public.ivisit_main_wallet wallet
        ORDER BY wallet.id
        LIMIT 1
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Platform payout wallet not found');
        END IF;
    END IF;

    SELECT ledger.id, ledger.amount
    INTO v_ledger_id, v_existing_amount
    FROM public.wallet_ledger ledger
    WHERE ledger.wallet_id = v_wallet_id
      AND ledger.external_reference = v_payout_id
      AND ledger.transaction_type = 'payout'
    ORDER BY ledger.created_at
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_amount IS DISTINCT FROM -v_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Stripe payout receipt amount mismatch');
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'ledger_id', v_ledger_id,
            'wallet_id', v_wallet_id
        );
    END IF;

    v_ledger_key := 'stripe:payout:' || COALESCE(v_account_id, 'platform') || ':' || v_payout_id;

    INSERT INTO public.wallet_ledger (
        wallet_id,
        amount,
        transaction_type,
        description,
        external_reference,
        idempotency_key,
        metadata,
        created_at
    )
    VALUES (
        v_wallet_id,
        -v_amount,
        'payout',
        CASE
            WHEN v_account_id IS NULL THEN 'Platform Payout ' || v_payout_id || ' to bank'
            ELSE 'Payout ' || v_payout_id || ' to bank'
        END,
        v_payout_id,
        v_ledger_key,
        jsonb_build_object(
            'source', 'stripe-webhook',
            'stripe_account_id', v_account_id,
            'stripe_payout', COALESCE(p_provider_response, '{}'::JSONB)
        ),
        NOW()
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_ledger_id;

    IF v_ledger_id IS NULL THEN
        SELECT ledger.id, ledger.amount, ledger.wallet_id
        INTO v_ledger_id, v_existing_amount, v_existing_wallet_id
        FROM public.wallet_ledger ledger
        WHERE ledger.idempotency_key = v_ledger_key;

        IF NOT FOUND
           OR v_existing_amount IS DISTINCT FROM -v_amount
           OR v_existing_wallet_id IS DISTINCT FROM v_wallet_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Stripe payout idempotency conflict');
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'ledger_id', v_ledger_id,
            'wallet_id', v_wallet_id
        );
    END IF;

    IF v_account_id IS NOT NULL THEN
        UPDATE public.organization_wallets
        SET balance = COALESCE(balance, 0) - v_amount,
            updated_at = NOW()
        WHERE id = v_wallet_id;
    ELSE
        UPDATE public.ivisit_main_wallet
        SET balance = COALESCE(balance, 0) - v_amount,
            last_updated = NOW()
        WHERE id = v_wallet_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'organization_id', v_organization_id,
        'ledger_id', v_ledger_id,
        'wallet_id', v_wallet_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_stripe_webhook_event(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_stripe_webhook_event(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_stripe_payout_paid(TEXT, TEXT, NUMERIC, JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_webhook_event(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_stripe_webhook_event(TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_stripe_payout_paid(TEXT, TEXT, NUMERIC, JSONB) TO service_role;


-- Source: supabase/migrations/20260219000400_finance.sql (process_payment_distribution function)
-- 🛠️ AUTOMATION: FINANCIAL HOOKS
-- A. Process Fee Distribution on Completion
CREATE OR REPLACE FUNCTION public.process_payment_distribution()
RETURNS TRIGGER AS $$
DECLARE
    v_org_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_ledger_claim_id UUID;
    v_net_amount NUMERIC := 0;
    v_fee_amount NUMERIC := 0;
    v_is_top_up BOOLEAN := false;
BEGIN
    IF NEW.status IS DISTINCT FROM 'completed' THEN
        RETURN NEW;
    END IF;

    IF COALESCE(OLD.status, '') = 'completed' THEN
        RETURN NEW;
    END IF;

    IF COALESCE(NEW.payment_method, '') = 'cash' THEN
        RETURN NEW;
    END IF;

    v_is_top_up := COALESCE((NEW.metadata->>'is_top_up')::BOOLEAN, false);

    -- Platform top-ups and payments without destination org do not feed org/platform settlement wallets.
    IF v_is_top_up OR NEW.organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id INTO v_org_wallet_id
    FROM public.organization_wallets
    WHERE organization_id = NEW.organization_id
    LIMIT 1
    FOR UPDATE;

    IF v_org_wallet_id IS NULL THEN
        INSERT INTO public.organization_wallets (organization_id, balance, currency, created_at, updated_at)
        VALUES (
            NEW.organization_id,
            0,
            COALESCE(NULLIF(NEW.currency, ''), 'USD'),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_org_wallet_id;
    END IF;

    SELECT id INTO v_platform_wallet_id
    FROM public.ivisit_main_wallet
    LIMIT 1
    FOR UPDATE;

    IF v_platform_wallet_id IS NULL THEN
        INSERT INTO public.ivisit_main_wallet (balance, currency, last_updated)
        VALUES (
            0,
            COALESCE(NULLIF(NEW.currency, ''), 'USD'),
            NOW()
        )
        RETURNING id INTO v_platform_wallet_id;
    END IF;

    v_fee_amount := GREATEST(ROUND(COALESCE(NEW.ivisit_fee_amount, 0)::NUMERIC, 2), 0);
    v_net_amount := GREATEST(ROUND(COALESCE(NEW.amount, 0)::NUMERIC - v_fee_amount, 2), 0);

    IF v_net_amount > 0 THEN
        INSERT INTO public.wallet_ledger (
            wallet_id,
            amount,
            transaction_type,
            description,
            reference_id,
            idempotency_key,
            metadata,
            created_at
        )
        VALUES (
            v_org_wallet_id,
            v_net_amount,
            'credit',
            'Service Payment (Net)',
            NEW.id,
            'payment:' || NEW.id::TEXT || ':organization_net_credit',
            jsonb_build_object(
                'source', 'process_payment_distribution',
                'payment_method', COALESCE(NEW.payment_method, 'unknown'),
                'ivisit_fee_amount', v_fee_amount
            ),
            COALESCE(NEW.processed_at, NEW.updated_at, NEW.created_at, NOW())
        )
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING id INTO v_ledger_claim_id;

        IF v_ledger_claim_id IS NOT NULL THEN
            UPDATE public.organization_wallets
            SET balance = COALESCE(balance, 0) + v_net_amount,
                updated_at = NOW()
            WHERE id = v_org_wallet_id;
        END IF;
    END IF;

    IF v_fee_amount > 0 THEN
        v_ledger_claim_id := NULL;
        INSERT INTO public.wallet_ledger (
            wallet_id,
            amount,
            transaction_type,
            description,
            reference_id,
            idempotency_key,
            metadata,
            created_at
        )
        VALUES (
            v_platform_wallet_id,
            v_fee_amount,
            'credit',
            'Platform Fee',
            NEW.id,
            'payment:' || NEW.id::TEXT || ':platform_fee_credit',
            jsonb_build_object(
                'source', 'process_payment_distribution',
                'payment_method', COALESCE(NEW.payment_method, 'unknown')
            ),
            COALESCE(NEW.processed_at, NEW.updated_at, NEW.created_at, NOW())
        )
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING id INTO v_ledger_claim_id;

        IF v_ledger_claim_id IS NOT NULL THEN
            UPDATE public.ivisit_main_wallet
            SET balance = COALESCE(balance, 0) + v_fee_amount,
                last_updated = NOW()
            WHERE id = v_platform_wallet_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000400_finance.sql (process_wallet_payment function)
-- B. Wallet Payment Processing
CREATE OR REPLACE FUNCTION public.process_wallet_payment(
    p_user_id UUID,
    p_organization_id UUID,
    p_emergency_request_id UUID,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request RECORD;
    v_payment RECORD;
    v_wallet_id UUID;
    v_balance NUMERIC;
    v_ledger_claim_id UUID;
BEGIN
    IF p_user_id IS NULL OR p_organization_id IS NULL OR p_emergency_request_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid wallet payment payload');
    END IF;

    SELECT
        request.*,
        hospital.organization_id AS resolved_org_id
    INTO v_request
    FROM public.emergency_requests request
    LEFT JOIN public.hospitals hospital ON hospital.id = request.hospital_id
    WHERE request.id = p_emergency_request_id
    FOR UPDATE OF request;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_request.user_id IS DISTINCT FROM p_user_id
       OR v_request.resolved_org_id IS DISTINCT FROM p_organization_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet payment scope does not match the emergency request');
    END IF;

    IF ROUND(COALESCE(v_request.total_cost, 0), 2) <= 0
       OR ROUND(p_amount, 2) IS DISTINCT FROM ROUND(COALESCE(v_request.total_cost, 0), 2) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet amount does not match canonical request pricing',
            'expected_amount', v_request.total_cost
        );
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_id IS DISTINCT FROM p_user_id THEN
            SELECT role, organization_id
            INTO v_actor_role, v_actor_org_id
            FROM public.profiles
            WHERE id = v_actor_id;

            IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
                RAISE EXCEPTION 'Unauthorized: cannot mutate another user wallet';
            END IF;

            IF v_actor_role IN ('org_admin', 'dispatcher') THEN
                IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM p_organization_id THEN
                    RAISE EXCEPTION 'Unauthorized: emergency request outside actor organization';
                END IF;
            END IF;
        END IF;
    END IF;

    SELECT payment.*
    INTO v_payment
    FROM public.payments payment
    WHERE payment.id = v_request.payment_id
      AND payment.emergency_request_id = p_emergency_request_id
      AND payment.user_id = p_user_id
      AND payment.organization_id = p_organization_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Canonical wallet payment not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'wallet' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a wallet payment');
    END IF;

    IF v_payment.status = 'completed'
       AND v_request.payment_status IN ('completed', 'paid')
       AND v_request.status IN ('in_progress', 'accepted', 'arrived', 'completed') THEN
        SELECT balance INTO v_balance
        FROM public.patient_wallets
        WHERE user_id = p_user_id;

        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'payment_id', v_payment.id,
            'fee_amount', v_payment.ivisit_fee_amount,
            'new_balance', v_balance
        );
    END IF;

    IF v_payment.status <> 'pending'
       OR v_request.status <> 'pending_approval'
       OR COALESCE(v_request.payment_status, 'pending') <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet payment is not awaiting settlement',
            'payment_status', v_payment.status,
            'request_status', v_request.status
        );
    END IF;

    SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.patient_wallets 
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    INSERT INTO public.wallet_ledger (
        wallet_id,
        amount,
        transaction_type,
        description,
        reference_id,
        idempotency_key,
        metadata,
        created_at
    )
    VALUES (
        v_wallet_id,
        -v_payment.amount,
        'debit',
        'Emergency Service Payment',
        v_payment.id,
        'payment:' || v_payment.id::TEXT || ':patient_wallet_debit',
        jsonb_build_object(
            'source', 'process_wallet_payment',
            'payment_kind', 'service'
        ),
        NOW()
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_ledger_claim_id;

    IF v_ledger_claim_id IS NULL THEN
        RAISE EXCEPTION 'Wallet settlement retry state is inconsistent';
    END IF;

    UPDATE public.patient_wallets
    SET balance = balance - v_payment.amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'process_wallet_payment', true);
    PERFORM set_config('ivisit.transition_reason', 'wallet_payment_completed', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object('payment_id', v_payment.id, 'request_id', p_emergency_request_id)::TEXT,
        true
    );

    UPDATE public.payments
    SET status = 'completed',
        processed_at = COALESCE(processed_at, NOW()),
        metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
            'source', 'process_wallet_payment',
            'wallet_ledger_id', v_ledger_claim_id
        ),
        updated_at = NOW()
    WHERE id = v_payment.id
      AND status = 'pending';

    UPDATE public.emergency_requests
    SET status = 'in_progress',
        payment_status = 'completed',
        updated_at = NOW()
    WHERE id = p_emergency_request_id
      AND status = 'pending_approval'
      AND payment_status = 'pending';

    UPDATE public.visits
    SET status = 'active',
        updated_at = NOW()
    WHERE request_id = p_emergency_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'fee_amount', v_payment.ivisit_fee_amount,
        'new_balance', (v_balance - v_payment.amount)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000400_finance.sql (one insurance billing row per emergency request)
CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_billing_one_per_request
    ON public.insurance_billing(emergency_request_id)
    WHERE emergency_request_id IS NOT NULL;


-- Source: supabase/migrations/20260219000500_ops_content.sql (notification event key column)
-- Canonical notification events are additive. Legacy/client-created rows keep a
-- NULL event_key, while backend-owned events are unique per recipient and event.
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS event_key TEXT;


-- Source: supabase/migrations/20260219000500_ops_content.sql (notification event identity index)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_event_key_uidx
    ON public.notifications(user_id, event_key)
    WHERE event_key IS NOT NULL;


-- Source: supabase/migrations/20260219000500_ops_content.sql (notification event key comment)
COMMENT ON COLUMN public.notifications.event_key IS
    'Stable backend event identity. Unique per notification recipient when present.';


-- Source: supabase/migrations/20260219000500_ops_content.sql (emit_canonical_notification function)
-- Internal callers must derive the recipient and payload from canonical server
-- rows before calling this helper. Client roles have no execute privilege.
CREATE OR REPLACE FUNCTION public.emit_canonical_notification(
    p_event_key TEXT,
    p_recipient_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'normal',
    p_action_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_action_data JSONB DEFAULT '{}'::JSONB,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_icon TEXT DEFAULT NULL,
    p_color TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_event_key TEXT := NULLIF(BTRIM(p_event_key), '');
    v_recipient_user_id UUID;
    v_type TEXT := NULLIF(BTRIM(p_type), '');
    v_title TEXT := NULLIF(BTRIM(p_title), '');
    v_message TEXT := NULLIF(BTRIM(p_message), '');
    v_priority TEXT := COALESCE(NULLIF(BTRIM(p_priority), ''), 'normal');
    v_action_type TEXT := NULLIF(BTRIM(p_action_type), '');
    v_action_data JSONB := COALESCE(p_action_data, '{}'::JSONB);
    v_metadata JSONB := COALESCE(p_metadata, '{}'::JSONB);
    v_icon TEXT := NULLIF(BTRIM(p_icon), '');
    v_color TEXT := NULLIF(BTRIM(p_color), '');
    v_notification_id UUID;
    v_existing public.notifications%ROWTYPE;
    v_inserted BOOLEAN := false;
BEGIN
    IF v_event_key IS NULL OR CHAR_LENGTH(v_event_key) > 512 THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification event_key is required and must not exceed 512 characters';
    END IF;

    IF p_recipient_user_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification recipient is required';
    END IF;

    SELECT profile.id
    INTO v_recipient_user_id
    FROM public.profiles AS profile
    WHERE profile.id = p_recipient_user_id;

    IF v_recipient_user_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '23503',
            MESSAGE = 'Canonical notification recipient does not exist';
    END IF;

    IF v_type IS NULL OR v_title IS NULL OR v_message IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification type, title, and message are required';
    END IF;

    IF v_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification priority is invalid';
    END IF;

    IF JSONB_TYPEOF(v_action_data) <> 'object' OR JSONB_TYPEOF(v_metadata) <> 'object' THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification action_data and metadata must be JSON objects';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        event_key,
        type,
        title,
        message,
        icon,
        color,
        priority,
        action_type,
        target_id,
        action_data,
        metadata
    )
    VALUES (
        v_recipient_user_id,
        v_event_key,
        v_type,
        v_title,
        v_message,
        v_icon,
        v_color,
        v_priority,
        v_action_type,
        p_target_id,
        v_action_data,
        v_metadata
    )
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_notification_id;

    v_inserted := v_notification_id IS NOT NULL;

    IF NOT v_inserted THEN
        SELECT notification.*
        INTO v_existing
        FROM public.notifications AS notification
        WHERE notification.user_id = v_recipient_user_id
          AND notification.event_key = v_event_key;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING
                ERRCODE = '40001',
                MESSAGE = 'Canonical notification replay could not resolve the existing row';
        END IF;

        IF v_existing.type IS DISTINCT FROM v_type
           OR v_existing.title IS DISTINCT FROM v_title
           OR v_existing.message IS DISTINCT FROM v_message
           OR v_existing.icon IS DISTINCT FROM v_icon
           OR v_existing.color IS DISTINCT FROM v_color
           OR v_existing.priority IS DISTINCT FROM v_priority
           OR v_existing.action_type IS DISTINCT FROM v_action_type
           OR v_existing.target_id IS DISTINCT FROM p_target_id
           OR v_existing.action_data IS DISTINCT FROM v_action_data
           OR v_existing.metadata IS DISTINCT FROM v_metadata THEN
            RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'Canonical notification event replay payload does not match the existing row';
        END IF;

        v_notification_id := v_existing.id;
    END IF;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'notification_id', v_notification_id,
        'recipient_user_id', v_recipient_user_id,
        'event_key', v_event_key,
        'inserted', v_inserted,
        'replayed', NOT v_inserted
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;


-- Source: supabase/migrations/20260219000500_ops_content.sql (revoke client canonical notification emitter)
REVOKE ALL ON FUNCTION public.emit_canonical_notification(
    TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;


-- Source: supabase/migrations/20260219000500_ops_content.sql (grant backend canonical notification emitter)
GRANT EXECUTE ON FUNCTION public.emit_canonical_notification(
    TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT
) TO service_role;


-- Source: supabase/migrations/20260219000500_ops_content.sql (notify_canonical_payment_status_change function)
CREATE OR REPLACE FUNCTION public.notify_canonical_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_message TEXT;
    v_priority TEXT;
    v_color TEXT;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status
       OR NEW.user_id IS NULL
       OR NEW.status NOT IN ('completed', 'failed', 'declined', 'refunded') THEN
        RETURN NEW;
    END IF;

    v_title := CASE NEW.status
        WHEN 'completed' THEN 'Payment completed'
        WHEN 'refunded' THEN 'Payment refunded'
        WHEN 'declined' THEN 'Payment declined'
        ELSE 'Payment failed'
    END;
    v_message := CASE NEW.status
        WHEN 'completed' THEN 'Your payment was confirmed.'
        WHEN 'refunded' THEN 'Your payment was refunded.'
        WHEN 'declined' THEN 'Your payment was declined. Open the payment to review your options.'
        ELSE 'Your payment could not be completed. Open the payment to review your options.'
    END;
    v_priority := CASE
        WHEN NEW.status IN ('failed', 'declined') THEN 'high'
        ELSE 'normal'
    END;
    v_color := CASE
        WHEN NEW.status = 'completed' THEN 'success'
        WHEN NEW.status = 'refunded' THEN 'info'
        ELSE 'danger'
    END;

    PERFORM public.emit_canonical_notification(
        p_event_key => 'payment:' || NEW.id::TEXT || ':status:' || NEW.status,
        p_recipient_user_id => NEW.user_id,
        p_type => 'payment',
        p_title => v_title,
        p_message => v_message,
        p_priority => v_priority,
        p_action_type => 'view_payment',
        p_target_id => NEW.id,
        p_action_data => JSONB_BUILD_OBJECT(
            'id', NEW.id,
            'paymentId', NEW.id,
            'requestId', NEW.emergency_request_id
        ),
        p_metadata => JSONB_BUILD_OBJECT(
            'eventName', 'payment.status.' || NEW.status,
            'paymentId', NEW.id,
            'requestId', NEW.emergency_request_id,
            'method', NEW.payment_method,
            'status', NEW.status
        ),
        p_icon => CASE WHEN NEW.status = 'completed' THEN 'checkmark-circle-outline' ELSE 'card-outline' END,
        p_color => v_color
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;


-- Source: supabase/migrations/20260219000500_ops_content.sql (revoke payment notification trigger function)
REVOKE ALL ON FUNCTION public.notify_canonical_payment_status_change()
    FROM PUBLIC, anon, authenticated;


-- Source: supabase/migrations/20260219000500_ops_content.sql (grant payment notification trigger function)
GRANT EXECUTE ON FUNCTION public.notify_canonical_payment_status_change()
    TO service_role;


-- Source: supabase/migrations/20260219000500_ops_content.sql (drop payment status notification trigger)
DROP TRIGGER IF EXISTS notify_payment_status_change ON public.payments;


-- Source: supabase/migrations/20260219000500_ops_content.sql (create payment status notification trigger)
CREATE TRIGGER notify_payment_status_change
    AFTER UPDATE OF status ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_canonical_payment_status_change();


-- Source: supabase/migrations/20260219000500_ops_content.sql (notify_emergency_events function)
-- 🛠️ AUTOMATION: OPS HOOKS
-- Notify organization administrators when a canonical emergency request is created.
-- Lifecycle and payment notifications belong to their owning RPCs and must call
-- emit_canonical_notification with an immutable event key.
CREATE OR REPLACE FUNCTION public.notify_emergency_events()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient RECORD;
    v_service_label TEXT := CASE NEW.service_type
        WHEN 'ambulance' THEN 'ambulance'
        WHEN 'bed' THEN 'bed'
        ELSE 'emergency'
    END;
BEGIN
    IF TG_OP <> 'INSERT' OR NEW.id IS NULL OR NEW.hospital_id IS NULL THEN
        RETURN NEW;
    END IF;

    FOR v_recipient IN
        SELECT profile.id AS user_id
        FROM public.hospitals AS hospital
        JOIN public.profiles AS profile
          ON profile.organization_id = hospital.organization_id
        WHERE hospital.id = NEW.hospital_id
          AND hospital.organization_id IS NOT NULL
          AND profile.role IN ('org_admin', 'admin')
    LOOP
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || NEW.id::TEXT || ':created',
            p_recipient_user_id => v_recipient.user_id,
            p_type => 'emergency',
            p_title => 'New Emergency',
            p_message => 'A new ' || v_service_label || ' request was created at your facility.',
            p_priority => 'high',
            p_action_type => 'view_emergency',
            p_target_id => NEW.id,
            p_action_data => JSONB_BUILD_OBJECT(
                'id', NEW.id,
                'requestId', NEW.id
            ),
            p_metadata => JSONB_BUILD_OBJECT(
                'eventName', 'emergency_request.created',
                'requestId', NEW.id,
                'hospitalId', NEW.hospital_id
            )
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;


-- Source: supabase/migrations/20260219000500_ops_content.sql (revoke emergency notification trigger function)
REVOKE ALL ON FUNCTION public.notify_emergency_events() FROM PUBLIC, anon, authenticated;


-- Source: supabase/migrations/20260219000500_ops_content.sql (drop emergency notification trigger)
DROP TRIGGER IF EXISTS on_emergency_notification ON public.emergency_requests;


-- Source: supabase/migrations/20260219000500_ops_content.sql (create emergency notification trigger)
CREATE TRIGGER on_emergency_notification
AFTER INSERT ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.notify_emergency_events();


-- Source: supabase/migrations/20260219000700_security.sql (enable responder assignment RLS)
ALTER TABLE public.emergency_responder_assignments ENABLE ROW LEVEL SECURITY;


-- Source: supabase/migrations/20260219000700_security.sql (enable ambulance staffing RLS)
ALTER TABLE public.ambulance_staff_assignments ENABLE ROW LEVEL SECURITY;


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Users see own emergency requests)
-- END CONSOLE_PROFILE_COLUMN_SECURITY

-- 2. EMERGENCY REQUESTS
DROP POLICY IF EXISTS "Users see own emergency requests" ON public.emergency_requests;


-- Source: supabase/migrations/20260219000700_security.sql (create policy Users see own emergency requests)
CREATE POLICY "Users see own emergency requests"
ON public.emergency_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.p_is_admin());


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Assigned responders see their emergency requests)
DROP POLICY IF EXISTS "Assigned responders see their emergency requests" ON public.emergency_requests;


-- Source: supabase/migrations/20260219000700_security.sql (create policy Assigned responders see their emergency requests)
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


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Users can create emergency requests)
DROP POLICY IF EXISTS "Users can create emergency requests" ON public.emergency_requests;


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Users can update own emergency requests)
DROP POLICY IF EXISTS "Users can update own emergency requests" ON public.emergency_requests;


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Org Admins see their hospital emergencies)
DROP POLICY IF EXISTS "Org Admins see their hospital emergencies" ON public.emergency_requests;


-- Source: supabase/migrations/20260219000700_security.sql (create policy Org Admins see their hospital emergencies)
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


-- Source: supabase/migrations/20260219000700_security.sql (revoke direct emergency request writes)
-- Direct PostgREST updates could otherwise change non-status responder/payment
-- fields even though the status trigger is RPC-gated. Mutations go through the
-- narrow patient, responder, and operator commands instead.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.emergency_requests FROM anon, authenticated;


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Emergency responder assignments are readable in role scope)
DROP POLICY IF EXISTS "Emergency responder assignments are readable in role scope"
    ON public.emergency_responder_assignments;


-- Source: supabase/migrations/20260219000700_security.sql (create policy Emergency responder assignments are readable in role scope)
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


-- Source: supabase/migrations/20260219000700_security.sql (grant responder assignment reads)
GRANT SELECT ON public.emergency_responder_assignments TO authenticated;


-- Source: supabase/migrations/20260219000700_security.sql (revoke responder assignment writes)
REVOKE INSERT, UPDATE, DELETE ON public.emergency_responder_assignments
    FROM anon, authenticated;


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Ambulance staffing is readable in role scope)
DROP POLICY IF EXISTS "Ambulance staffing is readable in role scope"
    ON public.ambulance_staff_assignments;


-- Source: supabase/migrations/20260219000700_security.sql (create policy Ambulance staffing is readable in role scope)
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


-- Source: supabase/migrations/20260219000700_security.sql (grant ambulance staffing reads)
GRANT SELECT ON public.ambulance_staff_assignments TO authenticated;


-- Source: supabase/migrations/20260219000700_security.sql (revoke ambulance staffing writes)
REVOKE INSERT, UPDATE, DELETE ON public.ambulance_staff_assignments
    FROM anon, authenticated;


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Users insert own notifications)
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;


-- Source: supabase/migrations/20260219000700_security.sql (revoke client notification writes)
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;


-- Source: supabase/migrations/20260219000700_security.sql (grant notification reads)
GRANT SELECT ON public.notifications TO authenticated;


-- Source: supabase/migrations/20260219000700_security.sql (grant notification read-state updates)
GRANT UPDATE (read, updated_at) ON public.notifications TO authenticated;


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Public read for ambulances)
-- 7. LOGISTICS (Ambulances & Visits)
DROP POLICY IF EXISTS "Public read for ambulances" ON public.ambulances;


-- Source: supabase/migrations/20260219000700_security.sql (drop policy Ambulances are visible in role scope)
DROP POLICY IF EXISTS "Ambulances are visible in role scope" ON public.ambulances;


-- Source: supabase/migrations/20260219000700_security.sql (create policy Ambulances are visible in role scope)
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


-- Source: supabase/migrations/20260219000700_security.sql (CONSOLE_AMBULANCE_RLS)
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


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (get_available_ambulances function)
-- 🛰️ Module 08: Emergency Logic (Fluid Edition)
-- Atomic operations for emergency lifecycles

-- AMBULANCE DISPATCH RPC FUNCTIONS
-- Part of Master System Improvement Plan - Phase 1 Critical Emergency Flow Fixes

-- 1. Get Available Ambulances
CREATE OR REPLACE FUNCTION public.get_available_ambulances(
    p_hospital_id UUID DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 50,
    p_specialty TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    call_sign TEXT,
    status TEXT,
    hospital_id UUID,
    vehicle_number TEXT,
    base_price NUMERIC,
    crew JSONB,
    type TEXT,
    profile_id UUID,
    display_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.call_sign,
        a.status,
        a.hospital_id,
        a.vehicle_number,
        a.base_price,
        a.crew,
        a.type,
        a.profile_id,
        a.display_id,
        a.created_at,
        a.updated_at
    FROM public.ambulances a
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    WHERE a.status = 'available'
        AND (p_hospital_id IS NULL OR a.hospital_id = p_hospital_id)
        AND (
            v_actor_role = 'admin'
            OR (
                v_actor_org_id IS NOT NULL
                AND COALESCE(a.organization_id, hospital.organization_id) = v_actor_org_id
            )
        );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (validate_emergency_request function)
-- 5. Validate Emergency Request
CREATE OR REPLACE FUNCTION public.validate_emergency_request(
    p_user_id UUID,
    p_request_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_patient_location JSONB;
    v_hospital_available BOOLEAN;
    v_result JSONB;
BEGIN
    -- Extract required fields
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_patient_location := p_request_data->'patient_location';
    
    -- Validate hospital exists and is available
    SELECT (available_beds > 0 AND status = 'active') INTO v_hospital_available
    FROM public.hospitals 
    WHERE id = v_hospital_id;
    
    IF NOT v_hospital_available THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Hospital not available',
            'code', 'HOSPITAL_UNAVAILABLE'
        );
    END IF;
    
    -- Validate patient location
    IF v_patient_location IS NULL OR 
       v_patient_location->>'lat' IS NULL OR 
       v_patient_location->>'lng' IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid patient location',
            'code', 'INVALID_LOCATION'
        );
    END IF;
    
    -- Check for duplicate emergencies
    IF EXISTS (
        SELECT 1 FROM public.emergency_requests 
        WHERE user_id = p_user_id 
        AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived')
        AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Duplicate emergency request',
            'code', 'DUPLICATE_EMERGENCY'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'valid', true,
        'hospital_id', v_hospital_id,
        'patient_location', v_patient_location
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (create_emergency_v4 function)
-- 🛠️ ATOMIC: Create Emergency with Integrated Payment (Fluid v4)
CREATE OR REPLACE FUNCTION public.create_emergency_v4(
    p_user_id UUID,
    p_request_data JSONB,
    p_payment_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_display_id TEXT;
    v_visit_id TEXT;
    v_payment_id UUID;
    v_fee_amount NUMERIC;
    v_total_amount NUMERIC;
    v_hospital_service_price NUMERIC;
    v_hospital_base_price NUMERIC;
    v_admin_service_price NUMERIC;
    v_default_base_price NUMERIC;
    v_distance_km NUMERIC := 0;
    v_fee_percentage NUMERIC := 2.5;
    v_requires_approval BOOLEAN := FALSE;
    v_awaits_payment_confirmation BOOLEAN := FALSE;
    v_requires_wallet_settlement BOOLEAN := FALSE;
    v_hospital_id UUID;
    v_organization_id UUID;
    v_patient_location GEOMETRY;
    v_transition_reason TEXT;
    v_service_type TEXT := LOWER(COALESCE(NULLIF(TRIM(COALESCE(p_request_data->>'service_type', '')), ''), ''));
    v_payment_method TEXT := LOWER(COALESCE(NULLIF(TRIM(COALESCE(p_payment_data->>'method', '')), ''), 'unknown'));
    v_payment_method_id TEXT := NULLIF(TRIM(COALESCE(p_payment_data->>'method_id', '')), '');
    v_defer_dispatch_until_payment BOOLEAN := FALSE;
    v_request_status TEXT := 'in_progress';
    v_request_payment_status TEXT := 'pending';
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user id is required';
    END IF;

    IF v_service_type NOT IN ('ambulance', 'bed') THEN
        RAISE EXCEPTION 'Unsupported emergency service type';
    END IF;

    IF p_payment_data IS NULL OR v_payment_method NOT IN ('cash', 'card', 'wallet') THEN
        RAISE EXCEPTION 'A supported payment method is required';
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_id IS DISTINCT FROM p_user_id THEN
            SELECT role INTO v_actor_role
            FROM public.profiles
            WHERE id = v_actor_id;

            IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
                RAISE EXCEPTION 'Unauthorized: cannot create emergency for another user';
            END IF;
        END IF;
    END IF;

    v_transition_reason := COALESCE(
        NULLIF(p_request_data->>'transition_reason', ''),
        NULLIF(p_request_data->>'reason', ''),
        'emergency_created'
    );

    PERFORM set_config('ivisit.transition_source', 'create_emergency_v4', true);
    PERFORM set_config('ivisit.transition_reason', v_transition_reason, true);
    PERFORM set_config('ivisit.transition_actor_id', COALESCE(v_actor_id, p_user_id)::TEXT, true);
    PERFORM set_config(
        'ivisit.transition_actor_role',
        COALESCE(
            CASE WHEN v_is_service_role THEN 'service_role' ELSE NULL END,
            NULLIF(v_actor_role, ''),
            'patient'
        ),
        true
    );
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'service_type', v_service_type,
            'payment_method', v_payment_method
        )::TEXT,
        true
    );

    -- 1. Extract and Resolve IDs
    v_hospital_id := NULLIF(p_request_data->>'hospital_id', '')::UUID;
    IF v_hospital_id IS NULL THEN
        RAISE EXCEPTION 'hospital_id is required';
    END IF;

    SELECT organization_id INTO v_organization_id FROM public.hospitals WHERE id = v_hospital_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hospital not found';
    END IF;

    -- Payment release is server-owned. A client cannot assert a completed
    -- card, wallet, or cash settlement while creating the request.
    v_defer_dispatch_until_payment := v_payment_method = 'card';

    v_distance_km := GREATEST(COALESCE(NULLIF(p_request_data->>'distance_km', '')::NUMERIC, 0), 0);
    v_default_base_price := CASE
        WHEN v_service_type = 'ambulance' THEN 150
        WHEN v_service_type = 'bed' THEN 200
        ELSE 100
    END;

    SELECT hospital.base_price
    INTO v_hospital_base_price
    FROM public.hospitals hospital
    WHERE hospital.id = v_hospital_id;

    SELECT pricing.base_price
    INTO v_hospital_service_price
    FROM public.service_pricing pricing
    WHERE pricing.hospital_id = v_hospital_id
      AND pricing.service_type = v_service_type
    ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
    LIMIT 1;

    SELECT pricing.base_price
    INTO v_admin_service_price
    FROM public.service_pricing pricing
    WHERE pricing.hospital_id IS NULL
      AND pricing.service_type = v_service_type
    ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
    LIMIT 1;

    v_total_amount := ROUND(
        COALESCE(
            NULLIF(v_hospital_service_price, 0),
            NULLIF(v_hospital_base_price, 0),
            NULLIF(v_admin_service_price, 0),
            v_default_base_price
        ) + CASE WHEN v_distance_km > 5 THEN (v_distance_km - 5) * 2 ELSE 0 END,
        2
    );

    SELECT COALESCE(NULLIF(organization.ivisit_fee_percentage, 0), 2.5)
    INTO v_fee_percentage
    FROM public.organizations organization
    WHERE organization.id = v_organization_id;

    v_fee_amount := ROUND(v_total_amount * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2);

    IF v_payment_method = 'cash' THEN
        v_requires_approval := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    ELSIF v_payment_method = 'card' THEN
        v_awaits_payment_confirmation := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    ELSIF v_payment_method = 'wallet' THEN
        v_requires_wallet_settlement := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    END IF;
    
    -- 2. Physical Location Parse
    v_patient_location := ST_SetSRID(ST_MakePoint(
        (p_request_data->'patient_location'->>'lng')::DOUBLE PRECISION,
        (p_request_data->'patient_location'->>'lat')::DOUBLE PRECISION
    ), 4326);
    
    -- 3. Create the Emergency Request
    INSERT INTO public.emergency_requests (
        user_id, hospital_id, service_type, hospital_name, specialty,
        ambulance_type, bed_number, patient_location, patient_snapshot, status, total_cost, payment_status
    ) VALUES (
        p_user_id, v_hospital_id, v_service_type,
        p_request_data->>'hospital_name', p_request_data->>'specialty',
        p_request_data->>'ambulance_type', p_request_data->>'bed_number', v_patient_location,
        p_request_data->'patient_snapshot',
        v_request_status,
        COALESCE(v_total_amount, 0),
        v_request_payment_status
    ) RETURNING id, display_id INTO v_request_id, v_display_id;

    -- 4. Create the request-derived visit in the same transaction. A request
    -- cannot report success without its canonical history row.
    INSERT INTO public.visits (
        user_id, hospital_id, request_id, status,
        date, time, type
    ) VALUES (
        p_user_id, v_hospital_id, v_request_id, 'pending',
        TO_CHAR(NOW(), 'YYYY-MM-DD'),
        TO_CHAR(NOW(), 'HH24:MI:SS'),
        'emergency'
    ) RETURNING display_id INTO v_visit_id;

    -- 5. Process Payment Information
    INSERT INTO public.payments (
        user_id, emergency_request_id, organization_id, amount, currency,
        payment_method, status, ivisit_fee_amount, metadata
    ) VALUES (
        p_user_id, v_request_id, v_organization_id, v_total_amount,
        'USD', v_payment_method, 'pending', v_fee_amount,
        jsonb_build_object(
            'source', 'create_emergency_v4',
            'payment_kind', 'service',
            'fee_percentage', v_fee_percentage,
            'fee_amount', v_fee_amount,
            'fee', v_fee_amount,
            'method_id', v_payment_method_id,
            'client_quoted_total', NULLIF(p_payment_data->>'total_amount', '')::NUMERIC,
            'canonical_total', v_total_amount,
            'defer_dispatch_until_payment', v_defer_dispatch_until_payment
        )
    ) RETURNING id INTO v_payment_id;

    UPDATE public.emergency_requests
    SET payment_id = v_payment_id,
        payment_method_id = v_payment_method_id,
        total_cost = v_total_amount,
        updated_at = NOW()
    WHERE id = v_request_id;

    IF v_payment_method = 'cash' THEN
        PERFORM public.notify_cash_approval_org_admins(
            v_request_id,
            v_payment_id,
            v_total_amount,
            v_fee_amount,
            NULL,
            NULL,
            NULL,
            v_organization_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'display_id', v_display_id,
        'visit_id', v_visit_id,
        'payment_id', v_payment_id,
        'requires_approval', v_requires_approval,
        'awaits_payment_confirmation', v_awaits_payment_confirmation,
        'requires_wallet_settlement', v_requires_wallet_settlement,
        'payment_status', v_request_payment_status,
        'emergency_status', v_request_status,
        'canonical_total', v_total_amount,
        'currency', 'USD'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (EMERGENCY_PAYMENT_RELEASE_GATE)
-- This projection is the only payment predicate dispatch commands consume.
-- It requires the request-linked payment and method-specific backend evidence.
CREATE OR REPLACE FUNCTION public.emergency_dispatch_payment_snapshot(
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_request public.emergency_requests%ROWTYPE;
    v_payment public.payments%ROWTYPE;
    v_method_proven BOOLEAN := FALSE;
    v_reasons JSONB := '[]'::JSONB;
BEGIN
    SELECT request.*
    INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ready', false,
            'request_id', p_request_id,
            'reasons', jsonb_build_array('request_not_found')
        );
    END IF;

    IF v_request.payment_id IS NOT NULL THEN
        SELECT payment.*
        INTO v_payment
        FROM public.payments payment
        WHERE payment.id = v_request.payment_id
          AND payment.emergency_request_id = v_request.id;
    END IF;

    IF v_payment.id IS NOT NULL THEN
        v_method_proven := CASE v_payment.payment_method
            WHEN 'card' THEN
                v_payment.stripe_payment_intent_id IS NOT NULL
                AND v_payment.metadata->>'source' = 'complete_card_payment'
            WHEN 'wallet' THEN
                v_payment.metadata->>'source' = 'process_wallet_payment'
                AND EXISTS (
                    SELECT 1
                    FROM public.wallet_ledger ledger
                    WHERE ledger.reference_id = v_payment.id
                      AND ledger.idempotency_key = 'payment:' || v_payment.id::TEXT || ':patient_wallet_debit'
                      AND ledger.transaction_type = 'debit'
                      AND ledger.amount = -v_payment.amount
                )
            WHEN 'cash' THEN
                v_payment.metadata->>'source' = 'approve_cash_payment'
            ELSE false
        END;
    END IF;

    IF v_request.status <> 'in_progress' THEN
        v_reasons := v_reasons || jsonb_build_array('request_not_released');
    END IF;
    IF v_request.payment_id IS NULL OR v_payment.id IS NULL THEN
        v_reasons := v_reasons || jsonb_build_array('linked_payment_missing');
    END IF;
    IF COALESCE(v_request.payment_status, 'pending') NOT IN ('paid', 'completed') THEN
        v_reasons := v_reasons || jsonb_build_array('request_payment_pending');
    END IF;
    IF COALESCE(v_payment.status, 'pending') <> 'completed' THEN
        v_reasons := v_reasons || jsonb_build_array('payment_not_completed');
    END IF;
    IF v_payment.id IS NOT NULL AND NOT v_method_proven THEN
        v_reasons := v_reasons || jsonb_build_array('settlement_proof_missing');
    END IF;

    RETURN jsonb_build_object(
        'ready', jsonb_array_length(v_reasons) = 0,
        'request_id', p_request_id,
        'payment_id', v_payment.id,
        'payment_method', v_payment.payment_method,
        'payment_status', v_payment.status,
        'request_payment_status', v_request.payment_status,
        'method_proven', v_method_proven,
        'reasons', v_reasons
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.emergency_dispatch_payment_snapshot(UUID)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_dispatch_payment_snapshot(UUID)
    TO service_role;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (complete_card_payment function)
-- END EMERGENCY_PAYMENT_RELEASE_GATE

CREATE OR REPLACE FUNCTION public.complete_card_payment(
    p_payment_intent_id TEXT,
    p_provider_response JSONB DEFAULT '{}'::JSONB,
    p_fee_amount NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_status TEXT := NULL;
    v_request_payment_status TEXT := NULL;
    v_request_payment_id UUID := NULL;
    v_effective_fee_amount NUMERIC := 0;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF NULLIF(TRIM(COALESCE(p_payment_intent_id, '')), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'payment intent id is required');
    END IF;

    SELECT p.*
    INTO v_payment
    FROM public.payments p
    WHERE p.stripe_payment_intent_id = p_payment_intent_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card payment not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'card' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a card payment');
    END IF;

    IF v_payment.emergency_request_id IS NOT NULL THEN
        SELECT request.status, request.payment_status, request.payment_id
        INTO v_request_status, v_request_payment_status, v_request_payment_id
        FROM public.emergency_requests request
        WHERE request.id = v_payment.emergency_request_id
        FOR UPDATE;

        IF NOT FOUND OR v_request_payment_id IS DISTINCT FROM v_payment.id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Card payment is not linked to its emergency request');
        END IF;
    END IF;

    IF COALESCE(v_payment.status, '') = 'completed'
       AND (
            v_payment.emergency_request_id IS NULL
            OR COALESCE(v_request_payment_status, 'completed') = 'completed'
       ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment.id,
            'request_id', v_payment.emergency_request_id,
            'already_completed', true
        );
    END IF;

    v_effective_fee_amount := COALESCE(
        p_fee_amount,
        NULLIF(v_payment.ivisit_fee_amount, 0),
        NULLIF((v_payment.metadata->>'fee_amount')::NUMERIC, 0),
        NULLIF((v_payment.metadata->>'fee')::NUMERIC, 0),
        0
    );

    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'stripe_webhook', true);
    PERFORM set_config('ivisit.transition_reason', 'card_payment_confirmed', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'payment_intent_id', p_payment_intent_id,
            'payment_id', v_payment.id
        )::TEXT,
        true
    );
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    UPDATE public.payments
    SET status = 'completed',
        processed_at = COALESCE(processed_at, NOW()),
        ivisit_fee_amount = v_effective_fee_amount,
        metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
            'fee_amount', v_effective_fee_amount,
            'fee', v_effective_fee_amount,
            'source', 'complete_card_payment'
        ),
        provider_response = COALESCE(p_provider_response, provider_response, '{}'::JSONB),
        updated_at = NOW()
    WHERE id = v_payment.id;

    IF v_payment.emergency_request_id IS NOT NULL THEN
        IF COALESCE(v_request_status, 'pending_approval') NOT IN ('completed', 'cancelled', 'payment_declined') THEN
            UPDATE public.emergency_requests
            SET status = CASE
                    WHEN status = 'pending_approval' THEN 'in_progress'
                    ELSE status
                END,
                payment_status = 'completed',
                updated_at = NOW()
            WHERE id = v_payment.emergency_request_id
            RETURNING status INTO v_request_status;

            UPDATE public.visits
            SET status = 'active',
                updated_at = NOW()
            WHERE request_id = v_payment.emergency_request_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'request_id', v_payment.emergency_request_id,
        'request_status', v_request_status,
        'fee_amount', v_effective_fee_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (fail_card_payment function)
-- 🛠️ Stripe webhook fail card payment and close the pending request safely
CREATE OR REPLACE FUNCTION public.fail_card_payment(
    p_payment_intent_id TEXT,
    p_provider_response JSONB DEFAULT '{}'::JSONB,
    p_failure_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_status TEXT := NULL;
    v_request_payment_status TEXT := NULL;
    v_request_payment_id UUID := NULL;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF NULLIF(TRIM(COALESCE(p_payment_intent_id, '')), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'payment intent id is required');
    END IF;

    SELECT p.*
    INTO v_payment
    FROM public.payments p
    WHERE p.stripe_payment_intent_id = p_payment_intent_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card payment not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'card' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a card payment');
    END IF;

    IF v_payment.emergency_request_id IS NOT NULL THEN
        SELECT request.status, request.payment_status, request.payment_id
        INTO v_request_status, v_request_payment_status, v_request_payment_id
        FROM public.emergency_requests request
        WHERE request.id = v_payment.emergency_request_id
        FOR UPDATE;

        IF NOT FOUND OR v_request_payment_id IS DISTINCT FROM v_payment.id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Card payment is not linked to its emergency request');
        END IF;
    END IF;

    IF COALESCE(v_payment.status, '') = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment.id,
            'request_id', v_payment.emergency_request_id,
            'ignored_after_success', true
        );
    END IF;

    IF COALESCE(v_payment.status, '') IN ('failed', 'declined')
       AND (
            v_payment.emergency_request_id IS NULL
            OR COALESCE(v_request_status, 'payment_declined') = 'payment_declined'
       ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment.id,
            'request_id', v_payment.emergency_request_id,
            'already_failed', true
        );
    END IF;

    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'stripe_webhook', true);
    PERFORM set_config(
        'ivisit.transition_reason',
        COALESCE(NULLIF(TRIM(p_failure_reason), ''), 'card_payment_failed'),
        true
    );
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'payment_intent_id', p_payment_intent_id,
            'payment_id', v_payment.id
        )::TEXT,
        true
    );
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    UPDATE public.payments
    SET status = 'failed',
        processed_at = COALESCE(processed_at, NOW()),
        metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
            'failure_reason', COALESCE(NULLIF(TRIM(p_failure_reason), ''), 'card_payment_failed'),
            'source', 'fail_card_payment'
        ),
        provider_response = COALESCE(p_provider_response, provider_response, '{}'::JSONB),
        updated_at = NOW()
    WHERE id = v_payment.id;

    IF v_payment.emergency_request_id IS NOT NULL
       AND COALESCE(v_request_status, 'pending_approval') NOT IN ('completed', 'cancelled', 'payment_declined') THEN
        UPDATE public.emergency_requests
        SET status = 'payment_declined',
            payment_status = 'failed',
            updated_at = NOW()
        WHERE id = v_payment.emergency_request_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'request_id', v_payment.emergency_request_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (update_ambulance_status function 2)
-- ================================================================
-- Integrated Fix Pack (2026-03-02): Deterministic Emergency State
-- Source: consolidated from temporary fix migrations
-- ================================================================

-- Deterministic and safe ambulance status mutation.
CREATE OR REPLACE FUNCTION public.update_ambulance_status(
    p_ambulance_id UUID,
    p_status TEXT,
    p_location JSONB DEFAULT NULL,
    p_eta TIMESTAMPTZ DEFAULT NULL,
    p_current_call UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_prev_status TEXT;
    v_location geometry;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Legacy ambulance status mutation is restricted to service_role';
    END IF;

    IF p_status NOT IN ('available', 'dispatched', 'en_route', 'on_scene', 'returning', 'maintenance', 'offline', 'on_trip') THEN
        RETURN jsonb_build_object('error', 'Invalid status', 'code', 'INVALID_STATUS');
    END IF;

    SELECT hospital_id, status
    INTO v_hospital_id, v_prev_status
    FROM public.ambulances
    WHERE id = p_ambulance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Ambulance not found', 'code', 'NOT_FOUND');
    END IF;

    IF p_location IS NOT NULL THEN
        BEGIN
            v_location := ST_SetSRID(ST_GeomFromGeoJSON(p_location::TEXT), 4326);
        EXCEPTION WHEN OTHERS THEN
            v_location := NULL;
        END;
    END IF;

    UPDATE public.ambulances
    SET status = p_status,
        location = COALESCE(v_location, location),
        eta = COALESCE(p_eta, eta),
        current_call = COALESCE(p_current_call, current_call),
        updated_at = NOW()
    WHERE id = p_ambulance_id;

    IF v_hospital_id IS NOT NULL AND v_prev_status IS DISTINCT FROM p_status THEN
        UPDATE public.hospitals
        SET last_availability_update = NOW()
        WHERE id = v_hospital_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'status', p_status,
        'updated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (is_valid_emergency_status_transition function)
-- BEGIN CONSOLE_PAYMENT_RETRY_TRANSITION
-- Canonical emergency status transition guard.
CREATE OR REPLACE FUNCTION public.is_valid_emergency_status_transition(
    p_current_status TEXT,
    p_next_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current TEXT := LOWER(COALESCE(NULLIF(p_current_status, ''), ''));
    v_next TEXT := LOWER(COALESCE(NULLIF(p_next_status, ''), ''));
BEGIN
    IF v_current = '' OR v_next = '' THEN
        RETURN FALSE;
    END IF;

    IF v_current = v_next THEN
        RETURN TRUE;
    END IF;

    CASE v_current
        WHEN 'pending_approval' THEN
            RETURN v_next IN ('in_progress', 'cancelled', 'payment_declined');
        WHEN 'in_progress' THEN
            RETURN v_next IN ('accepted', 'completed', 'cancelled', 'payment_declined');
        WHEN 'payment_declined' THEN
            RETURN v_next = 'pending_approval';
        WHEN 'accepted' THEN
            RETURN v_next IN ('in_progress', 'arrived', 'completed', 'cancelled');
        WHEN 'arrived' THEN
            RETURN v_next IN ('completed', 'cancelled');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (revoke public ambulance availability RPC)
REVOKE ALL ON FUNCTION public.get_available_ambulances(UUID, INTEGER, TEXT)
    FROM PUBLIC, anon;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (grant authenticated ambulance availability RPC)
GRANT EXECUTE ON FUNCTION public.get_available_ambulances(UUID, INTEGER, TEXT)
    TO authenticated, service_role;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (revoke direct ambulance status RPC)
REVOKE ALL ON FUNCTION public.update_ambulance_status(UUID, TEXT, JSONB, TIMESTAMPTZ, UUID)
    FROM PUBLIC, anon, authenticated;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (grant backend ambulance status RPC)
GRANT EXECUTE ON FUNCTION public.update_ambulance_status(UUID, TEXT, JSONB, TIMESTAMPTZ, UUID)
    TO service_role;


-- Source: supabase/migrations/20260219000900_automations.sql (auto_assign_driver function)
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


-- Source: supabase/migrations/20260219000900_automations.sql (create_insurance_billing_on_completion function)
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


-- Source: supabase/migrations/20260219000900_automations.sql (update_resource_availability function)
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


-- Source: supabase/migrations/20260219000900_automations.sql (handle_ambulance_unavailability_failover function)
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


-- Source: supabase/migrations/20260219000900_automations.sql (realtime publication parity)
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


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (CONSOLE_NEARBY_AMBULANCES_RPC)
CREATE OR REPLACE FUNCTION public.nearby_ambulances(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    call_sign TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    status TEXT,
    display_id TEXT
) AS $$
DECLARE
    v_user_location GEOMETRY;
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_global_scope BOOLEAN := false;
    v_radius_km INTEGER := LEAST(100, GREATEST(1, COALESCE(radius_km, 50)));
BEGIN
    IF user_lat IS NULL OR user_lng IS NULL
       OR user_lat < -90 OR user_lat > 90
       OR user_lng < -180 OR user_lng > 180 THEN
        RAISE EXCEPTION 'A valid dispatch location is required';
    END IF;

    IF v_is_service_role THEN
        v_global_scope := true;
    ELSE
        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = auth.uid();

        IF v_actor_role = 'admin' THEN
            v_global_scope := true;
        ELSIF v_actor_role IN ('org_admin', 'dispatcher') AND v_actor_org_id IS NOT NULL THEN
            v_global_scope := false;
        ELSE
            RAISE EXCEPTION 'Unauthorized: dispatch fleet scope is unavailable';
        END IF;
    END IF;

    v_user_location := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326);

    RETURN QUERY
    SELECT 
        a.id, a.call_sign, 
        ST_Y(a.location::geometry) as latitude,
        ST_X(a.location::geometry) as longitude,
        ST_Distance(a.location::geography, v_user_location::geography) / 1000 AS distance,
        a.status, a.display_id
    FROM public.ambulances a
    WHERE a.location IS NOT NULL 
      AND a.status = 'available'
      AND COALESCE(
          (public.ambulance_dispatch_readiness_snapshot(a.id, NULL)->>'ready')::BOOLEAN,
          false
      )
      AND ST_DWithin(a.location::geography, v_user_location::geography, v_radius_km * 1000)
      AND (
          v_global_scope
          OR a.organization_id = v_actor_org_id
          OR (
              a.organization_id IS NULL
              AND a.hospital_id IN (
                  SELECT hospital.id
                  FROM public.hospitals hospital
                  WHERE hospital.organization_id = v_actor_org_id
              )
          )
      )
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.nearby_ambulances(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nearby_ambulances(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated, service_role;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (notify_cash_approval_org_admins function)
-- END CONSOLE_PROFILE_ADMIN_RPC

-- Compatibility facade for older app builds. Caller-supplied display fields are
-- never notification truth; the request, linked payment, and hospital own them.
CREATE OR REPLACE FUNCTION public.notify_cash_approval_org_admins(
    p_request_id UUID,
    p_payment_id UUID,
    p_total_amount NUMERIC DEFAULT 0,
    p_fee_amount NUMERIC DEFAULT 0,
    p_hospital_name TEXT DEFAULT 'Hospital',
    p_service_type TEXT DEFAULT 'ambulance',
    p_display_id TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_payment public.payments%ROWTYPE;
    v_org_id UUID;
    v_actor_id UUID := auth.uid();
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_recipient RECORD;
    v_notification JSONB;
    v_recipient_count INTEGER := 0;
    v_inserted_count INTEGER := 0;
    v_service_label TEXT;
    v_hospital_name TEXT;
    v_display_id TEXT;
    v_total_amount NUMERIC;
    v_fee_amount NUMERIC;
    v_message TEXT;
    v_actor_role TEXT;
BEGIN
    IF p_request_id IS NULL OR p_payment_id IS NULL THEN
        RAISE EXCEPTION 'Cash approval notification requires request and payment ids';
    END IF;

    SELECT
        request.id,
        request.user_id,
        request.hospital_id,
        request.hospital_name,
        request.service_type,
        request.display_id,
        request.payment_id,
        hospital.organization_id AS hospital_organization_id,
        hospital.name AS canonical_hospital_name
    INTO v_req
    FROM public.emergency_requests AS request
    LEFT JOIN public.hospitals AS hospital ON hospital.id = request.hospital_id
    WHERE request.id = p_request_id
    FOR UPDATE OF request;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    SELECT payment.*
    INTO v_payment
    FROM public.payments AS payment
    WHERE payment.id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    IF v_payment.emergency_request_id IS DISTINCT FROM p_request_id
       OR (v_req.payment_id IS NOT NULL AND v_req.payment_id IS DISTINCT FROM p_payment_id) THEN
        RAISE EXCEPTION 'Payment is not linked to this emergency request';
    END IF;

    IF v_payment.user_id IS DISTINCT FROM v_req.user_id THEN
        RAISE EXCEPTION 'Payment owner does not match the emergency request owner';
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash'
       OR COALESCE(v_payment.status, '') <> 'pending' THEN
        RAISE EXCEPTION 'Cash approval notification requires a pending cash payment';
    END IF;

    IF v_payment.organization_id IS NOT NULL
       AND v_req.hospital_organization_id IS NOT NULL
       AND v_payment.organization_id IS DISTINCT FROM v_req.hospital_organization_id THEN
        RAISE EXCEPTION 'Payment and hospital organization scope do not match';
    END IF;

    v_org_id := COALESCE(v_payment.organization_id, v_req.hospital_organization_id);
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization not found for emergency request';
    END IF;

    IF NOT v_is_service_role THEN
        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        AS profile
        WHERE profile.id = v_actor_id;

        IF v_actor_id IS DISTINCT FROM v_req.user_id
           AND COALESCE(v_actor_role, '') <> 'admin'
           AND NOT (
               v_actor_role IN ('org_admin', 'dispatcher')
               AND v_actor_org_id = v_org_id
           ) THEN
            RAISE EXCEPTION 'Unauthorized cash approval notification scope';
        END IF;
    END IF;

    v_total_amount := GREATEST(ROUND(COALESCE(v_payment.amount, 0)::NUMERIC, 2), 0);
    v_fee_amount := GREATEST(ROUND(COALESCE(v_payment.ivisit_fee_amount, 0)::NUMERIC, 2), 0);
    v_hospital_name := COALESCE(
        NULLIF(BTRIM(v_req.hospital_name), ''),
        NULLIF(BTRIM(v_req.canonical_hospital_name), ''),
        'Hospital'
    );
    v_display_id := COALESCE(NULLIF(BTRIM(v_req.display_id), ''), p_request_id::TEXT);

    -- Preserve the old signature while rejecting meaningful identity/amount
    -- conflicts. Remaining legacy copy parameters are intentionally ignored.
    IF p_organization_id IS NOT NULL AND p_organization_id IS DISTINCT FROM v_org_id THEN
        RAISE EXCEPTION 'Caller organization does not match canonical payment scope';
    END IF;
    IF COALESCE(p_total_amount, 0) > 0
       AND ROUND(p_total_amount::NUMERIC, 2) IS DISTINCT FROM v_total_amount THEN
        RAISE EXCEPTION 'Caller amount does not match canonical payment amount';
    END IF;
    IF COALESCE(p_fee_amount, 0) > 0
       AND ROUND(p_fee_amount::NUMERIC, 2) IS DISTINCT FROM v_fee_amount THEN
        RAISE EXCEPTION 'Caller fee does not match canonical payment fee';
    END IF;

    v_service_label := CASE v_req.service_type
        WHEN 'bed' THEN 'Bed Booking'
        WHEN 'booking' THEN 'Visit Booking'
        ELSE 'Ambulance Ride'
    END;

    v_message := format(
        'A patient has requested a %s (%s) at %s with cash payment of $%s. Platform fee: $%s. Tap to approve or decline.',
        v_service_label,
        v_display_id,
        v_hospital_name,
        to_char(v_total_amount, 'FM999999990.00'),
        to_char(v_fee_amount, 'FM999999990.00')
    );

    FOR v_recipient IN
        SELECT profile.id
        FROM public.profiles AS profile
        WHERE profile.role = 'admin'
           OR (profile.role = 'org_admin' AND profile.organization_id = v_org_id)
    LOOP
        v_notification := public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':payment:' || p_payment_id::TEXT || ':cash_approval_required',
            p_recipient_user_id => v_recipient.id,
            p_type => 'emergency',
            p_title => 'Cash Payment Approval Required',
            p_message => v_message,
            p_priority => 'urgent',
            p_action_type => 'approve_cash_payment',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'paymentId', p_payment_id,
                'requestId', p_request_id,
                'totalAmount', v_total_amount,
                'feeAmount', v_fee_amount,
                'hospitalName', v_hospital_name,
                'serviceType', v_req.service_type,
                'displayId', v_display_id,
                'organizationId', v_org_id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_payment.cash_approval_required',
                'requestId', p_request_id,
                'paymentId', p_payment_id,
                'organizationId', v_org_id,
                'targetName', v_hospital_name
            ),
            p_icon => 'cash-outline',
            p_color => 'warning'
        );

        v_recipient_count := v_recipient_count + 1;
        IF COALESCE((v_notification->>'inserted')::BOOLEAN, false) THEN
            v_inserted_count := v_inserted_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'recipient_count', v_recipient_count,
        'inserted_count', v_inserted_count,
        'notified_count', v_recipient_count,
        'organization_id', v_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (process_wallet_payment function)
-- END CONSOLE_CASH_ELIGIBILITY_RPC

-- process_wallet_payment: Used by app paymentService
CREATE OR REPLACE FUNCTION public.process_wallet_payment(
    p_user_id UUID,
    p_amount NUMERIC,
    p_emergency_request_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_balance NUMERIC;
BEGIN
    IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_emergency_request_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid wallet payment payload');
    END IF;

    IF p_emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id
        INTO v_request_org_id
        FROM public.emergency_requests er
        LEFT JOIN public.hospitals h ON h.id = er.hospital_id
        WHERE er.id = p_emergency_request_id;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_id IS DISTINCT FROM p_user_id THEN
            SELECT role, organization_id
            INTO v_actor_role, v_actor_org_id
            FROM public.profiles
            WHERE id = v_actor_id;

            IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
                RAISE EXCEPTION 'Unauthorized: cannot mutate another user wallet';
            END IF;

            IF v_actor_role IN ('org_admin', 'dispatcher') AND v_request_org_id IS NOT NULL THEN
                IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                    RAISE EXCEPTION 'Unauthorized: emergency request outside actor organization';
                END IF;
            END IF;
        END IF;
    END IF;

    IF v_request_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request organization not found');
    END IF;

    RETURN public.process_wallet_payment(
        p_user_id,
        v_request_org_id,
        p_emergency_request_id,
        p_amount,
        'USD'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (jsonb_to_point_geometry function)
-- ================================================================
-- Integrated Fix Pack (2026-03-02): Console/Patient Emergency RPC Boundary
-- Source: consolidated from temporary fix migrations
-- ================================================================

CREATE OR REPLACE FUNCTION public.jsonb_to_point_geometry(p_location JSONB)
RETURNS geometry AS $$
DECLARE
    v_lat DOUBLE PRECISION;
    v_lng DOUBLE PRECISION;
BEGIN
    IF p_location IS NULL THEN
        RETURN NULL;
    END IF;

    BEGIN
        IF p_location ? 'coordinates'
           AND jsonb_typeof(p_location->'coordinates') = 'array'
           AND jsonb_array_length(p_location->'coordinates') >= 2 THEN
            v_lng := NULLIF(p_location->'coordinates'->>0, '')::DOUBLE PRECISION;
            v_lat := NULLIF(p_location->'coordinates'->>1, '')::DOUBLE PRECISION;
        ELSE
            v_lat := COALESCE(
                NULLIF(p_location->>'lat', '')::DOUBLE PRECISION,
                NULLIF(p_location->>'latitude', '')::DOUBLE PRECISION
            );
            v_lng := COALESCE(
                NULLIF(p_location->>'lng', '')::DOUBLE PRECISION,
                NULLIF(p_location->>'longitude', '')::DOUBLE PRECISION
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;

    IF v_lat IS NULL OR v_lng IS NULL
       OR v_lat::TEXT IN ('NaN', 'Infinity', '-Infinity')
       OR v_lng::TEXT IN ('NaN', 'Infinity', '-Infinity')
       OR v_lat < -90 OR v_lat > 90
       OR v_lng < -180 OR v_lng > 180 THEN
        RETURN NULL;
    END IF;

    RETURN ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (EMERGENCY_RESPONDER_READINESS_RPCS)
-- PULLBACK NOTE: assignment, responder identity, and telemetry freshness now
-- converge through one server-owned readiness snapshot.
CREATE OR REPLACE FUNCTION public.ambulance_dispatch_readiness_snapshot(
    p_ambulance_id UUID,
    p_request_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance RECORD;
    v_request RECORD;
    v_ambulance_org_id UUID;
    v_request_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_status_ready BOOLEAN := FALSE;
    v_staffed BOOLEAN := FALSE;
    v_responder_eligible BOOLEAN := FALSE;
    v_organization_match BOOLEAN := FALSE;
    v_organization_ready BOOLEAN := FALSE;
    v_facility_ready BOOLEAN := FALSE;
    v_located BOOLEAN := FALSE;
    v_telemetry_fresh BOOLEAN := FALSE;
    v_type_supported BOOLEAN := FALSE;
    v_no_conflicting_call BOOLEAN := FALSE;
    v_reasons JSONB := '[]'::JSONB;
BEGIN
    SELECT
        a.*,
        p.role AS responder_role,
        p.provider_type AS responder_provider_type,
        p.organization_id AS responder_org_id,
        p.onboarding_status AS responder_onboarding_status,
        staffing.id AS active_staffing_id,
        organization.verification_status AS organization_verification_status,
        organization.is_active AS organization_is_active,
        organization.organization_type AS organization_type,
        hospital.dispatch_eligible AS facility_dispatch_eligible,
        COALESCE(a.organization_id, hospital.organization_id) AS resolved_org_id
    INTO v_ambulance
    FROM public.ambulances a
    LEFT JOIN public.profiles p ON p.id = a.profile_id
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    LEFT JOIN public.organizations organization
      ON organization.id = COALESCE(a.organization_id, hospital.organization_id)
    LEFT JOIN public.ambulance_staff_assignments staffing
      ON staffing.ambulance_id = a.id
     AND staffing.responder_id = a.profile_id
     AND staffing.status = 'active'
     AND staffing.starts_at <= NOW()
     AND (staffing.ends_at IS NULL OR staffing.ends_at > NOW())
    WHERE a.id = p_ambulance_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ready', false,
            'ambulance_id', p_ambulance_id,
            'request_id', p_request_id,
            'reasons', jsonb_build_array('ambulance_not_found')
        );
    END IF;

    v_ambulance_org_id := v_ambulance.resolved_org_id;

    IF p_request_id IS NOT NULL THEN
        SELECT
            er.id,
            er.status,
            er.service_type,
            er.ambulance_type,
            er.ambulance_id,
            er.current_responder_assignment_id,
            er.dispatch_organization_id,
            hospital.dispatch_eligible AS destination_dispatch_eligible,
            hospital.organization_id AS resolved_org_id
        INTO v_request
        FROM public.emergency_requests er
        LEFT JOIN public.hospitals hospital ON hospital.id = er.hospital_id
        WHERE er.id = p_request_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'ready', false,
                'ambulance_id', p_ambulance_id,
                'request_id', p_request_id,
                'reasons', jsonb_build_array('request_not_found')
            );
        END IF;
        v_request_org_id := v_request.resolved_org_id;
    END IF;

    v_status_ready := LOWER(COALESCE(v_ambulance.status, '')) = 'available'
        OR (
            p_request_id IS NOT NULL
            AND v_ambulance.current_call = p_request_id
            AND LOWER(COALESCE(v_ambulance.status, '')) IN ('dispatched', 'on_trip')
        );
    v_staffed := v_ambulance.profile_id IS NOT NULL
        AND v_ambulance.active_staffing_id IS NOT NULL;
    v_responder_eligible := v_staffed
        AND v_ambulance.responder_role = 'provider'
        AND v_ambulance.responder_provider_type = 'driver'
        AND v_ambulance.responder_onboarding_status IN ('complete', 'skipped')
        AND v_ambulance.responder_org_id IS NOT DISTINCT FROM v_ambulance_org_id;
    v_organization_ready := COALESCE(v_ambulance.organization_is_active, false)
        AND v_ambulance.organization_verification_status = 'verified';
    v_facility_ready := (
            v_ambulance.hospital_id IS NULL
            AND v_ambulance.organization_type = 'ambulance_service'
        )
        OR COALESCE(v_ambulance.facility_dispatch_eligible, false);
    v_facility_ready := v_facility_ready
        AND (
            p_request_id IS NULL
            OR COALESCE(v_request.destination_dispatch_eligible, false)
        );
    v_organization_match := p_request_id IS NULL
        OR (
            v_ambulance_org_id IS NOT NULL
            AND (
                v_request.dispatch_organization_id IS NULL
                OR v_request.dispatch_organization_id = v_ambulance_org_id
            )
        );
    v_located := v_ambulance.location IS NOT NULL;
    v_telemetry_fresh := v_ambulance.location_received_at IS NOT NULL
        AND v_ambulance.telemetry_lease_expires_at > NOW();
    v_type_supported := p_request_id IS NULL
        OR (
            v_request.service_type = 'ambulance'
            AND NULLIF(BTRIM(COALESCE(v_ambulance.type, '')), '') IS NOT NULL
            AND (
                NULLIF(BTRIM(COALESCE(v_request.ambulance_type, '')), '') IS NULL
                OR v_ambulance.type ILIKE '%' || v_request.ambulance_type || '%'
                OR v_request.ambulance_type ILIKE '%' || v_ambulance.type || '%'
            )
        );
    v_no_conflicting_call := v_ambulance.current_call IS NULL
        OR (p_request_id IS NOT NULL AND v_ambulance.current_call = p_request_id);

    IF NOT v_status_ready THEN v_reasons := v_reasons || jsonb_build_array('status_not_available'); END IF;
    IF NOT v_staffed THEN v_reasons := v_reasons || jsonb_build_array('responder_not_linked'); END IF;
    IF NOT v_responder_eligible THEN v_reasons := v_reasons || jsonb_build_array('responder_not_eligible'); END IF;
    IF NOT v_organization_ready THEN v_reasons := v_reasons || jsonb_build_array('organization_not_ready'); END IF;
    IF NOT v_facility_ready THEN v_reasons := v_reasons || jsonb_build_array('facility_not_dispatch_eligible'); END IF;
    IF NOT v_organization_match THEN v_reasons := v_reasons || jsonb_build_array('organization_mismatch'); END IF;
    IF NOT v_located THEN v_reasons := v_reasons || jsonb_build_array('location_missing'); END IF;
    IF NOT v_telemetry_fresh THEN v_reasons := v_reasons || jsonb_build_array('telemetry_stale'); END IF;
    IF NOT v_type_supported THEN v_reasons := v_reasons || jsonb_build_array('type_not_supported'); END IF;
    IF NOT v_no_conflicting_call THEN v_reasons := v_reasons || jsonb_build_array('conflicting_call'); END IF;

    RETURN jsonb_build_object(
        'ready', v_status_ready
            AND v_staffed
            AND v_responder_eligible
            AND v_organization_ready
            AND v_facility_ready
            AND v_organization_match
            AND v_located
            AND v_telemetry_fresh
            AND v_type_supported
            AND v_no_conflicting_call,
        'ambulance_id', p_ambulance_id,
        'request_id', p_request_id,
        'responder_id', v_ambulance.profile_id,
        'organization_id', v_ambulance_org_id,
        'status_ready', v_status_ready,
        'staffed', v_staffed,
        'responder_eligible', v_responder_eligible,
        'organization_ready', v_organization_ready,
        'facility_ready', v_facility_ready,
        'organization_match', v_organization_match,
        'located', v_located,
        'telemetry_fresh', v_telemetry_fresh,
        'type_supported', v_type_supported,
        'no_conflicting_call', v_no_conflicting_call,
        'location_received_at', v_ambulance.location_received_at,
        'telemetry_lease_expires_at', v_ambulance.telemetry_lease_expires_at,
        'reasons', v_reasons
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_ambulance_dispatch_readiness(
    p_ambulance_id UUID,
    p_request_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_ambulance_org_id UUID;
    v_request_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_snapshot JSONB;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT COALESCE(a.organization_id, hospital.organization_id)
    INTO v_ambulance_org_id
    FROM public.ambulances a
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    WHERE a.id = p_ambulance_id;

    IF p_request_id IS NOT NULL THEN
        SELECT hospital.organization_id, request.dispatch_organization_id
        INTO v_request_org_id, v_request_dispatch_org_id
        FROM public.emergency_requests request
        LEFT JOIN public.hospitals hospital ON hospital.id = request.hospital_id
        WHERE request.id = p_request_id;
    END IF;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_actor_role IN ('org_admin', 'dispatcher')
       AND (
            v_actor_org_id IS NULL
            OR v_ambulance_org_id IS DISTINCT FROM v_actor_org_id
            OR (
                p_request_id IS NOT NULL
                AND v_actor_org_id IS DISTINCT FROM v_request_org_id
                AND v_actor_org_id IS DISTINCT FROM v_request_dispatch_org_id
            )
       ) THEN
        RAISE EXCEPTION 'Unauthorized: dispatch readiness outside actor organization';
    END IF;

    v_snapshot := public.ambulance_dispatch_readiness_snapshot(p_ambulance_id, p_request_id);
    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_eligible_ambulance_responders(
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    responder_id UUID,
    display_id TEXT,
    full_name TEXT,
    phone TEXT,
    provider_type TEXT,
    linked_ambulance_id UUID,
    active_request_id UUID,
    is_available BOOLEAN
) AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_target_org_id UUID;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_target_org_id := COALESCE(p_organization_id, v_actor_org_id);
    IF v_target_org_id IS NULL THEN
        RAISE EXCEPTION 'organization id is required';
    END IF;

    IF v_actor_role IN ('org_admin', 'dispatcher') AND v_target_org_id IS DISTINCT FROM v_actor_org_id THEN
        RAISE EXCEPTION 'Unauthorized: responder roster outside actor organization';
    END IF;

    RETURN QUERY
    SELECT
        profile.id,
        profile.display_id,
        profile.full_name,
        profile.phone,
        profile.provider_type,
        staffing.ambulance_id,
        ambulance.current_call,
        staffing.id IS NULL
            OR (
                ambulance.current_call IS NULL
                AND LOWER(COALESCE(ambulance.status, 'available')) NOT IN ('dispatched', 'on_trip', 'en_route', 'on_scene')
            )
    FROM public.profiles profile
    LEFT JOIN public.ambulance_staff_assignments staffing
      ON staffing.responder_id = profile.id
     AND staffing.status = 'active'
     AND staffing.starts_at <= NOW()
     AND (staffing.ends_at IS NULL OR staffing.ends_at > NOW())
    LEFT JOIN public.ambulances ambulance ON ambulance.id = staffing.ambulance_id
    WHERE profile.organization_id = v_target_org_id
      AND profile.role = 'provider'
      AND profile.provider_type = 'driver'
      AND profile.onboarding_status IN ('complete', 'skipped')
    ORDER BY COALESCE(profile.full_name, profile.display_id, profile.id::TEXT);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.staff_ambulance_responder(
    p_ambulance_id UUID,
    p_responder_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_ambulance RECORD;
    v_responder RECORD;
    v_existing_ambulance_id UUID;
    v_active_staffing public.ambulance_staff_assignments%ROWTYPE;
    v_staffing_id UUID;
BEGIN
    IF p_ambulance_id IS NULL OR p_responder_id IS NULL THEN
        RAISE EXCEPTION 'ambulance id and responder id are required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF NOT v_is_service_role
       AND (v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT a.*, COALESCE(a.organization_id, hospital.organization_id) AS resolved_org_id
    INTO v_ambulance
    FROM public.ambulances a
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    WHERE a.id = p_ambulance_id
    FOR UPDATE OF a;

    IF NOT FOUND THEN RAISE EXCEPTION 'Ambulance not found'; END IF;

    IF NOT v_is_service_role
       AND v_actor_role = 'org_admin'
       AND (v_actor_org_id IS NULL OR v_ambulance.resolved_org_id IS DISTINCT FROM v_actor_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: ambulance outside actor organization';
    END IF;

    IF v_ambulance.current_call IS NOT NULL
       OR LOWER(COALESCE(v_ambulance.status, '')) IN ('dispatched', 'on_trip', 'en_route', 'on_scene') THEN
        RAISE EXCEPTION 'Cannot change responder while ambulance has an active call';
    END IF;

    SELECT id, role, provider_type, organization_id, onboarding_status
    INTO v_responder
    FROM public.profiles
    WHERE id = p_responder_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_responder.role <> 'provider'
       OR v_responder.provider_type <> 'driver'
       OR v_responder.onboarding_status NOT IN ('complete', 'skipped')
       OR v_responder.organization_id IS DISTINCT FROM v_ambulance.resolved_org_id THEN
        RAISE EXCEPTION 'Responder is not an eligible driver for this organization';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.organizations organization
        WHERE organization.id = v_ambulance.resolved_org_id
          AND organization.is_active = true
          AND organization.verification_status = 'verified'
    ) THEN
        RAISE EXCEPTION 'Organization is not dispatch ready';
    END IF;

    SELECT staffing.*
    INTO v_active_staffing
    FROM public.ambulance_staff_assignments staffing
    WHERE staffing.responder_id = p_responder_id
      AND staffing.status = 'active'
    FOR UPDATE;

    IF FOUND AND v_active_staffing.ambulance_id = p_ambulance_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_staffed', true,
            'staffing_id', v_active_staffing.id,
            'ambulance_id', p_ambulance_id,
            'responder_id', p_responder_id
        );
    END IF;

    v_existing_ambulance_id := CASE
        WHEN v_active_staffing.id IS NULL THEN NULL
        ELSE v_active_staffing.ambulance_id
    END;

    IF v_existing_ambulance_id IS NOT NULL THEN
        RAISE EXCEPTION 'Responder is already linked to another ambulance';
    END IF;

    UPDATE public.ambulance_staff_assignments
    SET status = 'ended',
        ends_at = COALESCE(ends_at, NOW()),
        ended_by = v_actor_id,
        end_reason = 'replaced_by_staffing_command',
        updated_at = NOW()
    WHERE ambulance_id = p_ambulance_id
      AND status = 'active';

    INSERT INTO public.ambulance_staff_assignments (
        ambulance_id,
        responder_id,
        organization_id,
        duty_role,
        status,
        assigned_by,
        metadata
    ) VALUES (
        p_ambulance_id,
        p_responder_id,
        v_ambulance.resolved_org_id,
        'driver',
        'active',
        v_actor_id,
        jsonb_build_object('source', 'staff_ambulance_responder')
    )
    RETURNING id INTO v_staffing_id;

    UPDATE public.ambulances
    SET profile_id = p_responder_id,
        organization_id = COALESCE(organization_id, v_ambulance.resolved_org_id),
        updated_at = NOW()
    WHERE id = p_ambulance_id;

    INSERT INTO public.admin_audit_log (admin_id, action, details)
    VALUES (
        v_actor_id,
        'staff_ambulance_responder',
        jsonb_build_object(
            'ambulance_id', p_ambulance_id,
            'responder_id', p_responder_id,
            'organization_id', v_ambulance.resolved_org_id,
            'actor_role', CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END
        )
    );

    PERFORM public.emit_canonical_notification(
        p_event_key => 'ambulance_staffing:' || v_staffing_id::TEXT || ':assigned',
        p_recipient_user_id => p_responder_id,
        p_type => 'system',
        p_title => 'Ambulance assignment updated',
        p_message => 'You are now assigned to ' || COALESCE(
            NULLIF(BTRIM(v_ambulance.call_sign), ''),
            NULLIF(BTRIM(v_ambulance.vehicle_number), ''),
            'an ambulance'
        ) || '.',
        p_priority => 'high',
        p_action_type => 'view_driver_assignment',
        p_target_id => p_ambulance_id,
        p_action_data => jsonb_build_object(
            'id', p_ambulance_id,
            'ambulanceId', p_ambulance_id,
            'staffingId', v_staffing_id
        ),
        p_metadata => jsonb_build_object(
            'eventName', 'ambulance_staffing.assigned',
            'ambulanceId', p_ambulance_id,
            'staffingId', v_staffing_id,
            'organizationId', v_ambulance.resolved_org_id
        ),
        p_icon => 'car-outline',
        p_color => 'info'
    );

    RETURN jsonb_build_object(
        'success', true,
        'staffing_id', v_staffing_id,
        'ambulance_id', p_ambulance_id,
        'responder_id', p_responder_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.offer_responder_assignment(
    p_request_id UUID,
    p_ambulance_id UUID,
    p_offered_by UUID DEFAULT auth.uid(),
    p_source TEXT DEFAULT 'dispatch'
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_ambulance RECORD;
    v_payment_state JSONB;
    v_readiness JSONB;
    v_assignment_id UUID;
    v_current_assignment public.emergency_responder_assignments%ROWTYPE;
BEGIN
    SELECT
        request.*,
        hospital.organization_id AS resolved_org_id
    INTO v_request
    FROM public.emergency_requests request
    LEFT JOIN public.hospitals hospital ON hospital.id = request.hospital_id
    WHERE request.id = p_request_id
    FOR UPDATE OF request;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found', 'code', 'REQUEST_NOT_FOUND');
    END IF;

    IF public.canonicalize_emergency_status(v_request.status, v_request.status) <> 'in_progress' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting responder acceptance',
            'code', 'REQUEST_NOT_DISPATCHABLE',
            'request_status', v_request.status
        );
    END IF;

    v_payment_state := public.emergency_dispatch_payment_snapshot(p_request_id);
    IF COALESCE((v_payment_state->>'ready')::BOOLEAN, false) = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency payment is not ready for dispatch',
            'code', 'PAYMENT_NOT_CONFIRMED',
            'payment', v_payment_state
        );
    END IF;

    SELECT a.*, COALESCE(a.organization_id, hospital.organization_id) AS resolved_org_id
    INTO v_ambulance
    FROM public.ambulances a
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    WHERE a.id = p_ambulance_id
    FOR UPDATE OF a;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not found', 'code', 'AMBULANCE_NOT_FOUND');
    END IF;

    IF v_request.current_responder_assignment_id IS NOT NULL THEN
        SELECT assignment.*
        INTO v_current_assignment
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.id = v_request.current_responder_assignment_id
          AND assignment.emergency_request_id = p_request_id
        FOR UPDATE;

        IF FOUND AND v_current_assignment.ambulance_id = p_ambulance_id THEN
            IF v_current_assignment.status = 'offered'
               AND v_current_assignment.offer_expires_at > NOW() THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'already_offered', true,
                    'assignment_id', v_current_assignment.id,
                    'ambulance_id', p_ambulance_id,
                    'responder_id', v_current_assignment.responder_id,
                    'offer_expires_at', v_current_assignment.offer_expires_at,
                    'request_status', v_request.status,
                    'assignment_status', v_current_assignment.status
                );
            END IF;

            IF v_current_assignment.status IN ('accepted', 'arrived') THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'already_active', true,
                    'assignment_id', v_current_assignment.id,
                    'ambulance_id', p_ambulance_id,
                    'responder_id', v_current_assignment.responder_id,
                    'request_status', v_request.status,
                    'assignment_status', v_current_assignment.status
                );
            END IF;

            IF v_current_assignment.status = 'offered'
               AND v_current_assignment.offer_expires_at <= NOW() THEN
                RETURN public.release_current_responder_assignment(
                    p_request_id,
                    'released',
                    'responder_offer_expired',
                    p_offered_by,
                    'automation'
                ) || jsonb_build_object('code', 'OFFER_EXPIRED_REQUEUED');
            END IF;
        ELSIF FOUND AND v_current_assignment.status <> 'offered' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'An accepted responder assignment cannot be replaced by an offer',
                'code', 'ACTIVE_ASSIGNMENT_EXISTS',
                'assignment_id', v_current_assignment.id
            );
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.emergency_request_id = p_request_id
          AND assignment.ambulance_id = p_ambulance_id
          AND assignment.status IN ('declined', 'released')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This responder was already released from the request',
            'code', 'RESPONDER_PREVIOUSLY_RELEASED'
        );
    END IF;

    v_readiness := public.ambulance_dispatch_readiness_snapshot(p_ambulance_id, p_request_id);
    IF COALESCE((v_readiness->>'ready')::BOOLEAN, false) = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance is not dispatch ready',
            'code', 'AMBULANCE_NOT_READY',
            'readiness', v_readiness
        );
    END IF;

    IF v_request.current_responder_assignment_id IS NOT NULL THEN
        UPDATE public.emergency_responder_assignments
        SET status = 'released',
            decline_reason = 'replaced_by_dispatch',
            ended_at = NOW(),
            metadata = metadata || jsonb_build_object('replacement_ambulance_id', p_ambulance_id)
        WHERE id = v_request.current_responder_assignment_id
          AND status = 'offered';

        UPDATE public.ambulances
        SET status = 'available',
            current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = v_request.ambulance_id
          AND current_call = p_request_id;
    END IF;

    v_assignment_id := gen_random_uuid();
    INSERT INTO public.emergency_responder_assignments (
        id,
        emergency_request_id,
        ambulance_id,
        responder_id,
        organization_id,
        status,
        offered_by,
        metadata
    ) VALUES (
        v_assignment_id,
        p_request_id,
        p_ambulance_id,
        v_ambulance.profile_id,
        v_ambulance.resolved_org_id,
        'offered',
        p_offered_by,
        jsonb_build_object('source', COALESCE(NULLIF(BTRIM(p_source), ''), 'dispatch'))
    );

    UPDATE public.ambulances
    SET status = 'dispatched',
        current_call = p_request_id,
        updated_at = NOW()
    WHERE id = p_ambulance_id;

    UPDATE public.emergency_requests request
    SET ambulance_id = p_ambulance_id,
        dispatch_organization_id = v_ambulance.resolved_org_id,
        current_responder_assignment_id = v_assignment_id,
        updated_at = NOW()
    WHERE request.id = p_request_id;

    PERFORM public.emit_canonical_notification(
        p_event_key => 'emergency_request:' || p_request_id::TEXT
            || ':assignment:' || v_assignment_id::TEXT || ':offered',
        p_recipient_user_id => v_ambulance.profile_id,
        p_type => 'emergency',
        p_title => 'New emergency offer',
        p_message => 'An emergency request is waiting for your response.',
        p_priority => 'urgent',
        p_action_type => 'respond_emergency_offer',
        p_target_id => p_request_id,
        p_action_data => jsonb_build_object(
            'id', p_request_id,
            'requestId', p_request_id,
            'assignmentId', v_assignment_id
        ),
        p_metadata => jsonb_build_object(
            'eventName', 'emergency_assignment.offered',
            'requestId', p_request_id,
            'assignmentId', v_assignment_id,
            'ambulanceId', p_ambulance_id
        ),
        p_icon => 'alert-circle-outline',
        p_color => 'warning'
    );

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', v_assignment_id,
        'ambulance_id', p_ambulance_id,
        'responder_id', v_ambulance.profile_id,
        'request_status', 'in_progress',
        'assignment_status', 'offered'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- BEGIN EMERGENCY_RESPONDER_LIFECYCLE_COMMANDS
CREATE OR REPLACE FUNCTION public.release_current_responder_assignment(
    p_request_id UUID,
    p_disposition TEXT,
    p_reason TEXT,
    p_actor_id UUID DEFAULT auth.uid(),
    p_actor_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request public.emergency_requests%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_ambulance public.ambulances%ROWTYPE;
    v_next_status TEXT;
    v_was_accepted BOOLEAN := false;
BEGIN
    IF p_disposition NOT IN ('declined', 'released') THEN
        RAISE EXCEPTION 'Invalid assignment release disposition';
    END IF;
    IF NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN
        RAISE EXCEPTION 'A release reason is required';
    END IF;

    SELECT request.*
    INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.current_responder_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder assignment not found');
    END IF;

    SELECT assignment.*
    INTO v_assignment
    FROM public.emergency_responder_assignments assignment
    WHERE assignment.id = v_request.current_responder_assignment_id
      AND assignment.emergency_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder assignment not found');
    END IF;

    IF p_disposition = 'declined' AND v_assignment.status <> 'offered' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only an offered assignment can be declined');
    END IF;
    IF p_disposition = 'released' AND v_assignment.status NOT IN ('offered', 'accepted') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Assignment cannot be released in its current state');
    END IF;

    v_was_accepted := v_assignment.status = 'accepted';

    SELECT ambulance.*
    INTO v_ambulance
    FROM public.ambulances ambulance
    WHERE ambulance.id = v_assignment.ambulance_id
    FOR UPDATE;

    UPDATE public.emergency_responder_assignments
    SET status = p_disposition,
        decline_reason = BTRIM(p_reason),
        ended_at = COALESCE(ended_at, NOW()),
        metadata = metadata || jsonb_build_object(
            'released_by', p_actor_id,
            'released_by_role', COALESCE(NULLIF(p_actor_role, ''), 'unknown')
        ),
        updated_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.ambulances
    SET status = CASE
            WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
            ELSE 'available'
        END,
        current_call = NULL,
        eta = NULL,
        updated_at = NOW()
    WHERE id = v_assignment.ambulance_id
      AND current_call = p_request_id;

    v_next_status := CASE
        WHEN v_request.status = 'accepted' THEN 'in_progress'
        ELSE v_request.status
    END;

    IF v_next_status IS DISTINCT FROM v_request.status THEN
        PERFORM public.set_emergency_transition_context(
            p_source => CASE
                WHEN p_disposition = 'declined' THEN 'responder_decline_emergency'
                ELSE 'dispatcher_release_responder_assignment'
            END,
            p_reason => BTRIM(p_reason),
            p_actor_id => p_actor_id,
            p_actor_role => COALESCE(NULLIF(p_actor_role, ''), 'unknown'),
            p_metadata => jsonb_build_object(
                'request_id', p_request_id,
                'assignment_id', v_assignment.id,
                'ambulance_id', v_assignment.ambulance_id,
                'disposition', p_disposition
            ),
            p_allow_status_write => true
        );
    END IF;

    UPDATE public.emergency_requests
    SET status = v_next_status,
        ambulance_id = NULL,
        dispatch_organization_id = NULL,
        current_responder_assignment_id = NULL,
        responder_id = NULL,
        responder_name = NULL,
        responder_phone = NULL,
        responder_vehicle_type = NULL,
        responder_vehicle_plate = NULL,
        responder_location = NULL,
        responder_heading = NULL,
        responder_location_accuracy_meters = NULL,
        responder_location_observed_at = NULL,
        responder_location_received_at = NULL,
        responder_telemetry_sequence = NULL,
        responder_telemetry_lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_request_id;

    IF v_was_accepted AND v_request.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || v_assignment.id::TEXT || ':released',
            p_recipient_user_id => v_request.user_id,
            p_type => 'emergency',
            p_title => 'A new responder is being found',
            p_message => 'Your previous responder is no longer assigned. Dispatch is finding the next available team.',
            p_priority => 'high',
            p_action_type => 'track_emergency',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.released',
                'requestId', p_request_id,
                'assignmentId', v_assignment.id,
                'disposition', p_disposition
            ),
            p_icon => 'refresh-outline',
            p_color => 'warning'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'queued', true,
        'request_id', p_request_id,
        'assignment_id', v_assignment.id,
        'disposition', p_disposition,
        'request_status', v_next_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.responder_accept_emergency(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request public.emergency_requests%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_ambulance public.ambulances%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_payment_state JSONB;
    v_readiness JSONB;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    SELECT request.* INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.current_responder_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder offer not found');
    END IF;

    SELECT assignment.* INTO v_assignment
    FROM public.emergency_responder_assignments assignment
    WHERE assignment.id = v_request.current_responder_assignment_id
      AND assignment.emergency_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder offer not found');
    END IF;

    IF NOT v_is_service_role AND v_actor_id IS DISTINCT FROM v_assignment.responder_id THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    IF v_assignment.status IN ('accepted', 'arrived', 'completed')
       AND v_request.status IN ('accepted', 'arrived', 'completed') THEN
        RETURN jsonb_build_object('success', true, 'already_accepted', true, 'assignment_id', v_assignment.id);
    END IF;

    IF v_assignment.status <> 'offered' OR v_request.status <> 'in_progress' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responder offer is no longer accept-ready');
    END IF;

    IF v_assignment.offer_expires_at <= NOW() THEN
        RETURN public.release_current_responder_assignment(
            p_request_id,
            'released',
            'responder_offer_expired',
            COALESCE(v_actor_id, v_assignment.responder_id),
            CASE WHEN v_is_service_role THEN 'service_role' ELSE 'provider' END
        ) || jsonb_build_object(
            'success', false,
            'error', 'Responder offer expired',
            'code', 'OFFER_EXPIRED_REQUEUED'
        );
    END IF;

    v_payment_state := public.emergency_dispatch_payment_snapshot(p_request_id);
    IF COALESCE((v_payment_state->>'ready')::BOOLEAN, false) = false THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not dispatch ready', 'payment', v_payment_state);
    END IF;

    SELECT ambulance.* INTO v_ambulance
    FROM public.ambulances ambulance
    WHERE ambulance.id = v_assignment.ambulance_id
      AND ambulance.current_call = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Assigned ambulance no longer owns this call');
    END IF;

    v_readiness := public.ambulance_dispatch_readiness_snapshot(v_assignment.ambulance_id, p_request_id);
    IF COALESCE((v_readiness->>'ready')::BOOLEAN, false) = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Responder is no longer dispatch ready',
            'code', 'RESPONDER_NOT_READY',
            'readiness', v_readiness
        );
    END IF;

    SELECT profile.* INTO v_profile
    FROM public.profiles profile
    WHERE profile.id = v_assignment.responder_id;

    PERFORM public.set_emergency_transition_context(
        p_source => 'responder_accept_emergency',
        p_reason => 'responder_accepted_offer',
        p_actor_id => COALESCE(v_actor_id, v_assignment.responder_id),
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE 'provider' END,
        p_metadata => jsonb_build_object('assignment_id', v_assignment.id, 'ambulance_id', v_assignment.ambulance_id),
        p_allow_status_write => true
    );

    UPDATE public.emergency_responder_assignments
    SET status = 'accepted',
        accepted_at = COALESCE(accepted_at, NOW()),
        updated_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.ambulances
    SET status = 'on_trip',
        current_call = p_request_id,
        updated_at = NOW()
    WHERE id = v_assignment.ambulance_id;

    UPDATE public.emergency_requests
    SET status = 'accepted',
        ambulance_id = v_assignment.ambulance_id,
        dispatch_organization_id = v_assignment.organization_id,
        responder_id = v_assignment.responder_id,
        responder_name = COALESCE(
            NULLIF(BTRIM(v_profile.full_name), ''),
            NULLIF(BTRIM(v_ambulance.call_sign), ''),
            NULLIF(BTRIM(v_ambulance.vehicle_number), ''),
            'Responder'
        ),
        responder_phone = NULLIF(BTRIM(v_profile.phone), ''),
        responder_vehicle_type = NULLIF(BTRIM(v_ambulance.type), ''),
        responder_vehicle_plate = COALESCE(
            NULLIF(BTRIM(v_ambulance.license_plate), ''),
            NULLIF(BTRIM(v_ambulance.vehicle_number), '')
        ),
        responder_location = v_ambulance.location,
        responder_heading = v_ambulance.heading,
        responder_location_accuracy_meters = v_ambulance.location_accuracy_meters,
        responder_location_observed_at = v_ambulance.location_observed_at,
        responder_location_received_at = v_ambulance.location_received_at,
        responder_telemetry_sequence = v_ambulance.telemetry_sequence,
        responder_telemetry_lease_expires_at = v_ambulance.telemetry_lease_expires_at,
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || v_assignment.id::TEXT || ':accepted',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Responder assigned',
            p_message => 'A responder accepted your request and is on the way.',
            p_priority => 'urgent',
            p_action_type => 'track_emergency',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.accepted',
                'requestId', p_request_id,
                'assignmentId', v_assignment.id,
                'responderId', v_assignment.responder_id
            ),
            p_icon => 'car-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment.id, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.responder_arrive_emergency(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request public.emergency_requests%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    SELECT request.* INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.current_responder_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder assignment not found');
    END IF;

    SELECT assignment.* INTO v_assignment
    FROM public.emergency_responder_assignments assignment
    WHERE assignment.id = v_request.current_responder_assignment_id
    FOR UPDATE;

    IF NOT FOUND OR (NOT v_is_service_role AND v_actor_id IS DISTINCT FROM v_assignment.responder_id) THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    IF v_assignment.status IN ('arrived', 'completed') AND v_request.status IN ('arrived', 'completed') THEN
        RETURN jsonb_build_object('success', true, 'already_arrived', true, 'assignment_id', v_assignment.id);
    END IF;

    IF v_assignment.status <> 'accepted' OR v_request.status <> 'accepted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responder must accept before arrival');
    END IF;

    IF v_request.responder_location IS NULL
       OR v_request.responder_telemetry_lease_expires_at IS NULL
       OR v_request.responder_telemetry_lease_expires_at <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Live responder location is required before arrival',
            'code', 'TELEMETRY_STALE'
        );
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'responder_arrive_emergency',
        p_reason => 'responder_arrived',
        p_actor_id => COALESCE(v_actor_id, v_assignment.responder_id),
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE 'provider' END,
        p_metadata => jsonb_build_object('assignment_id', v_assignment.id),
        p_allow_status_write => true
    );

    UPDATE public.emergency_responder_assignments
    SET status = 'arrived', arrived_at = COALESCE(arrived_at, NOW()), updated_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.emergency_requests
    SET status = 'arrived', updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || v_assignment.id::TEXT || ':arrived',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Responder has arrived',
            p_message => 'Your responder marked the pickup as arrived. Confirm when you can see the team.',
            p_priority => 'urgent',
            p_action_type => 'acknowledge_responder_arrival',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.arrived',
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_icon => 'location-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment.id, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.responder_complete_emergency(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request public.emergency_requests%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    SELECT request.* INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.current_responder_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder assignment not found');
    END IF;

    SELECT assignment.* INTO v_assignment
    FROM public.emergency_responder_assignments assignment
    WHERE assignment.id = v_request.current_responder_assignment_id
    FOR UPDATE;

    IF NOT FOUND OR (NOT v_is_service_role AND v_actor_id IS DISTINCT FROM v_assignment.responder_id) THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    IF v_assignment.status = 'completed' AND v_request.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true, 'assignment_id', v_assignment.id);
    END IF;

    IF v_assignment.status <> 'arrived' OR v_request.status <> 'arrived' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responder must arrive before completion');
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'responder_complete_emergency',
        p_reason => 'responder_completed',
        p_actor_id => COALESCE(v_actor_id, v_assignment.responder_id),
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE 'provider' END,
        p_metadata => jsonb_build_object('assignment_id', v_assignment.id),
        p_allow_status_write => true
    );

    UPDATE public.emergency_responder_assignments
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        ended_at = COALESCE(ended_at, NOW()),
        updated_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.emergency_requests
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    UPDATE public.ambulances
    SET status = CASE
            WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
            ELSE 'available'
        END,
        current_call = NULL,
        eta = NULL,
        updated_at = NOW()
    WHERE id = v_assignment.ambulance_id
      AND current_call = p_request_id;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || v_assignment.id::TEXT || ':completed',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Emergency visit completed',
            p_message => 'Your responder marked this emergency visit as completed.',
            p_priority => 'high',
            p_action_type => 'view_emergency_visit',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.completed',
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_icon => 'checkmark-circle-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment.id, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.responder_decline_emergency(
    p_request_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_assignment public.emergency_responder_assignments%ROWTYPE;
BEGIN
    SELECT assignment.* INTO v_assignment
    FROM public.emergency_requests request
    JOIN public.emergency_responder_assignments assignment
      ON assignment.id = request.current_responder_assignment_id
    WHERE request.id = p_request_id
    FOR UPDATE OF request, assignment;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder offer not found');
    END IF;
    IF v_actor_id IS DISTINCT FROM v_assignment.responder_id THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    RETURN public.release_current_responder_assignment(
        p_request_id,
        'declined',
        p_reason,
        v_actor_id,
        'provider'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.dispatcher_release_responder_assignment(
    p_request_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_request_hospital_org_id UUID;
BEGIN
    SELECT actor.role, actor.organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles actor
    WHERE actor.id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT request.dispatch_organization_id, hospital.organization_id
    INTO v_request_dispatch_org_id, v_request_hospital_org_id
    FROM public.emergency_requests request
    LEFT JOIN public.hospitals hospital ON hospital.id = request.hospital_id
    WHERE request.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_actor_role <> 'admin'
       AND v_actor_org_id IS DISTINCT FROM v_request_dispatch_org_id
       AND v_actor_org_id IS DISTINCT FROM v_request_hospital_org_id THEN
        RAISE EXCEPTION 'Unauthorized: request outside actor organization';
    END IF;

    RETURN public.release_current_responder_assignment(
        p_request_id,
        'released',
        p_reason,
        v_actor_id,
        v_actor_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.patient_acknowledge_responder_arrival(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_request public.emergency_requests%ROWTYPE;
BEGIN
    SELECT request.* INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.user_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    IF v_request.status NOT IN ('arrived', 'completed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responder arrival has not been confirmed');
    END IF;

    UPDATE public.emergency_requests
    SET patient_acknowledged_arrival_at = COALESCE(patient_acknowledged_arrival_at, NOW()),
        updated_at = CASE
            WHEN patient_acknowledged_arrival_at IS NULL THEN NOW()
            ELSE updated_at
        END
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    IF v_request.responder_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':arrival_acknowledged',
            p_recipient_user_id => v_request.responder_id,
            p_type => 'emergency',
            p_title => 'Patient confirmed your arrival',
            p_message => 'The patient confirmed that they can see the responder team.',
            p_priority => 'high',
            p_action_type => 'view_emergency_assignment',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_request.arrival_acknowledged',
                'requestId', p_request_id,
                'assignmentId', v_request.current_responder_assignment_id
            ),
            p_icon => 'checkmark-circle-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'acknowledged_at', v_request.patient_acknowledged_arrival_at,
        'request_status', v_request.status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.release_current_responder_assignment(UUID, TEXT, TEXT, UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_current_responder_assignment(UUID, TEXT, TEXT, UUID, TEXT)
    TO service_role;

REVOKE ALL ON FUNCTION public.responder_accept_emergency(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.responder_arrive_emergency(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.responder_complete_emergency(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.responder_decline_emergency(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatcher_release_responder_assignment(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.patient_acknowledge_responder_arrival(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.responder_accept_emergency(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.responder_arrive_emergency(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.responder_complete_emergency(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.responder_decline_emergency(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatcher_release_responder_assignment(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.patient_acknowledge_responder_arrival(UUID) TO authenticated, service_role;
-- END EMERGENCY_RESPONDER_LIFECYCLE_COMMANDS

-- BEGIN EMERGENCY_RESPONDER_TELEMETRY_COMMANDS
CREATE OR REPLACE FUNCTION public.report_responder_telemetry(
    p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_ambulance_id UUID := NULLIF(p_payload->>'ambulance_id', '')::UUID;
    v_request_id UUID := NULLIF(p_payload->>'request_id', '')::UUID;
    v_assignment_id UUID := NULLIF(p_payload->>'assignment_id', '')::UUID;
    v_sequence BIGINT := NULLIF(p_payload->>'sequence', '')::BIGINT;
    v_observed_at TIMESTAMPTZ := NULLIF(p_payload->>'observed_at', '')::TIMESTAMPTZ;
    v_heading DOUBLE PRECISION := NULLIF(p_payload->>'heading', '')::DOUBLE PRECISION;
    v_accuracy DOUBLE PRECISION := NULLIF(p_payload->>'accuracy_meters', '')::DOUBLE PRECISION;
    v_location GEOMETRY;
    v_now TIMESTAMPTZ := NOW();
    v_lease_expires_at TIMESTAMPTZ;
    v_ambulance public.ambulances%ROWTYPE;
    v_staffing public.ambulance_staff_assignments%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_request public.emergency_requests%ROWTYPE;
BEGIN
    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
       OR v_ambulance_id IS NULL OR v_sequence IS NULL OR v_sequence <= 0
       OR v_observed_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry payload');
    END IF;

    v_location := public.jsonb_to_point_geometry(p_payload->'location');
    IF v_location IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry location');
    END IF;

    IF v_observed_at > v_now + INTERVAL '30 seconds'
       OR v_observed_at < v_now - INTERVAL '10 minutes' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Telemetry observation time is outside the accepted window');
    END IF;

    IF v_accuracy IS NOT NULL AND (v_accuracy < 0 OR v_accuracy > 5000) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Telemetry accuracy is outside the accepted range');
    END IF;

    IF v_heading IS NOT NULL THEN
        IF v_heading::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Telemetry heading is invalid');
        END IF;
        v_heading := v_heading - FLOOR(v_heading / 360::DOUBLE PRECISION) * 360::DOUBLE PRECISION;
        IF v_heading < 0 THEN
            v_heading := v_heading + 360::DOUBLE PRECISION;
        END IF;
    END IF;

    SELECT ambulance.* INTO v_ambulance
    FROM public.ambulances ambulance
    WHERE ambulance.id = v_ambulance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not found');
    END IF;

    SELECT staffing.* INTO v_staffing
    FROM public.ambulance_staff_assignments staffing
    WHERE staffing.ambulance_id = v_ambulance_id
      AND staffing.status = 'active'
      AND staffing.starts_at <= v_now
      AND (staffing.ends_at IS NULL OR staffing.ends_at > v_now)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance has no active responder staffing');
    END IF;

    IF NOT v_is_service_role AND v_actor_id IS DISTINCT FROM v_staffing.responder_id THEN
        RAISE EXCEPTION 'Unauthorized: telemetry belongs to another responder';
    END IF;

    IF (v_request_id IS NULL) <> (v_assignment_id IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'error', 'request_id and assignment_id must be provided together');
    END IF;

    IF v_assignment_id IS NOT NULL THEN
        SELECT request.* INTO v_request
        FROM public.emergency_requests request
        WHERE request.id = v_request_id
        FOR UPDATE;

        SELECT assignment.* INTO v_assignment
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.id = v_assignment_id
          AND assignment.emergency_request_id = v_request_id
          AND assignment.ambulance_id = v_ambulance_id
          AND assignment.responder_id = v_staffing.responder_id
        FOR UPDATE;

        IF v_request.id IS NULL
           OR v_assignment.id IS NULL
           OR v_request.current_responder_assignment_id IS DISTINCT FROM v_assignment_id
           OR v_assignment.status NOT IN ('offered', 'accepted', 'arrived')
           OR v_ambulance.current_call IS DISTINCT FROM v_request_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Telemetry assignment generation is no longer current');
        END IF;
    ELSIF v_ambulance.current_call IS NOT NULL
          OR LOWER(COALESCE(v_ambulance.status, '')) <> 'available' THEN
        RETURN jsonb_build_object('success', false, 'error', 'An active call requires assignment-bound telemetry');
    END IF;

    IF v_sequence < COALESCE(v_ambulance.telemetry_sequence, 0) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Telemetry sequence is stale', 'code', 'STALE_SEQUENCE');
    END IF;

    IF v_sequence = COALESCE(v_ambulance.telemetry_sequence, 0) THEN
        IF v_ambulance.location_observed_at = v_observed_at
           AND ST_Equals(v_ambulance.location, v_location) THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_received', true,
                'sequence', v_sequence,
                'received_at', v_ambulance.location_received_at,
                'lease_expires_at', v_ambulance.telemetry_lease_expires_at
            );
        END IF;

        RETURN jsonb_build_object('success', false, 'error', 'Telemetry sequence replay does not match prior payload', 'code', 'SEQUENCE_CONFLICT');
    END IF;

    v_lease_expires_at := v_now + INTERVAL '45 seconds';

    UPDATE public.ambulances
    SET location = v_location,
        heading = v_heading,
        location_accuracy_meters = v_accuracy,
        location_observed_at = v_observed_at,
        location_received_at = v_now,
        telemetry_sequence = v_sequence,
        telemetry_lease_expires_at = v_lease_expires_at,
        updated_at = NOW()
    WHERE id = v_ambulance_id;

    IF v_assignment_id IS NOT NULL THEN
        UPDATE public.emergency_responder_assignments
        SET responder_location = v_location,
            responder_heading = v_heading,
            location_accuracy_meters = v_accuracy,
            location_observed_at = v_observed_at,
            location_received_at = v_now,
            telemetry_sequence = v_sequence,
            telemetry_lease_expires_at = v_lease_expires_at,
            updated_at = NOW()
        WHERE id = v_assignment_id;

        UPDATE public.emergency_requests
        SET responder_location = v_location,
            responder_heading = v_heading,
            responder_location_accuracy_meters = v_accuracy,
            responder_location_observed_at = v_observed_at,
            responder_location_received_at = v_now,
            responder_telemetry_sequence = v_sequence,
            responder_telemetry_lease_expires_at = v_lease_expires_at,
            updated_at = NOW()
        WHERE id = v_request_id
          AND current_responder_assignment_id = v_assignment_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ambulance_id', v_ambulance_id,
        'request_id', v_request_id,
        'assignment_id', v_assignment_id,
        'sequence', v_sequence,
        'received_at', v_now,
        'lease_expires_at', v_lease_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_responder_telemetry_state(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request RECORD;
    v_age_seconds DOUBLE PRECISION;
    v_state TEXT := 'lost';
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT
        request.*,
        assignment.responder_id AS assignment_responder_id,
        assignment.organization_id AS assignment_organization_id,
        assignment.status AS assignment_status
    INTO v_request
    FROM public.emergency_requests request
    LEFT JOIN public.emergency_responder_assignments assignment
      ON assignment.id = request.current_responder_assignment_id
    WHERE request.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_actor_id IS NULL OR NOT (
        public.p_is_admin()
        OR v_request.user_id = v_actor_id
        OR v_request.assignment_responder_id = v_actor_id
        OR (
            v_actor_role IN ('org_admin', 'dispatcher')
            AND v_actor_org_id IS NOT NULL
            AND v_actor_org_id IN (v_request.assignment_organization_id, v_request.dispatch_organization_id)
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_request.responder_location_received_at IS NOT NULL THEN
        v_age_seconds := EXTRACT(EPOCH FROM (NOW() - v_request.responder_location_received_at));
        v_state := CASE
            WHEN v_request.responder_telemetry_lease_expires_at > NOW() AND v_age_seconds <= 45 THEN 'live'
            WHEN v_age_seconds <= 120 THEN 'delayed'
            ELSE 'lost'
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'state', v_state,
        'last_known', v_request.responder_location IS NOT NULL,
        'lat', CASE WHEN v_request.responder_location IS NULL THEN NULL ELSE ST_Y(v_request.responder_location) END,
        'lng', CASE WHEN v_request.responder_location IS NULL THEN NULL ELSE ST_X(v_request.responder_location) END,
        'heading', v_request.responder_heading,
        'accuracy_meters', v_request.responder_location_accuracy_meters,
        'observed_at', v_request.responder_location_observed_at,
        'received_at', v_request.responder_location_received_at,
        'lease_expires_at', v_request.responder_telemetry_lease_expires_at,
        'sequence', v_request.responder_telemetry_sequence
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_emergency_responder(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request RECORD;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT
        request.*,
        assignment.status AS assignment_status,
        assignment.responder_id AS assignment_responder_id,
        assignment.organization_id AS assignment_organization_id
    INTO v_request
    FROM public.emergency_requests request
    LEFT JOIN public.emergency_responder_assignments assignment
      ON assignment.id = request.current_responder_assignment_id
    WHERE request.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_actor_id IS NULL OR NOT (
        public.p_is_admin()
        OR v_request.user_id = v_actor_id
        OR v_request.assignment_responder_id = v_actor_id
        OR (
            v_actor_role IN ('org_admin', 'dispatcher')
            AND v_actor_org_id IS NOT NULL
            AND v_actor_org_id IN (v_request.assignment_organization_id, v_request.dispatch_organization_id)
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_request.status NOT IN ('accepted', 'arrived', 'completed')
       OR v_request.assignment_status NOT IN ('accepted', 'arrived', 'completed') THEN
        RETURN jsonb_build_object(
            'success', true,
            'available', false,
            'request_status', v_request.status
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'available', true,
        'request_status', v_request.status,
        'assignment_status', v_request.assignment_status,
        'responder_id', v_request.responder_id,
        'responder_name', v_request.responder_name,
        'responder_phone', v_request.responder_phone,
        'vehicle_type', v_request.responder_vehicle_type,
        'vehicle_plate', v_request.responder_vehicle_plate,
        'patient_acknowledged_arrival_at', v_request.patient_acknowledged_arrival_at
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_driver_dispatch_feed()
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_provider_type TEXT;
    v_items JSONB;
BEGIN
    SELECT role, provider_type
    INTO v_actor_role, v_actor_provider_type
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role <> 'provider' OR v_actor_provider_type <> 'driver' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT COALESCE(jsonb_agg(item ORDER BY item->>'offered_at' DESC), '[]'::JSONB)
    INTO v_items
    FROM (
        SELECT jsonb_build_object(
            'assignment_id', assignment.id,
            'assignment_status', assignment.status,
            'offer_expires_at', assignment.offer_expires_at,
            'offered_at', assignment.offered_at,
            'request_id', request.id,
            'request_display_id', request.display_id,
            'request_status', request.status,
            'service_type', request.service_type,
            'ambulance_type', request.ambulance_type,
            'hospital_id', request.hospital_id,
            'hospital_name', request.hospital_name,
            'patient_location', CASE
                WHEN request.patient_location IS NULL THEN NULL
                ELSE jsonb_build_object('lat', ST_Y(request.patient_location), 'lng', ST_X(request.patient_location))
            END,
            'ambulance_id', assignment.ambulance_id
        ) AS item
        FROM public.emergency_responder_assignments assignment
        JOIN public.emergency_requests request
          ON request.id = assignment.emergency_request_id
         AND request.current_responder_assignment_id = assignment.id
        WHERE assignment.responder_id = v_actor_id
          AND assignment.status IN ('offered', 'accepted', 'arrived')
          AND (assignment.status <> 'offered' OR assignment.offer_expires_at > NOW())
    ) feed;

    RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.expire_responder_offers(p_limit INTEGER DEFAULT 100)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_is_internal_executor BOOLEAN := session_user IN ('postgres', 'supabase_admin');
    v_offer RECORD;
    v_expired INTEGER := 0;
BEGIN
    IF NOT v_is_service_role AND NOT v_is_internal_executor THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    FOR v_offer IN
        SELECT assignment.emergency_request_id
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.status = 'offered'
          AND assignment.offer_expires_at <= NOW()
        ORDER BY assignment.offer_expires_at
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
        FOR UPDATE SKIP LOCKED
    LOOP
        PERFORM public.release_current_responder_assignment(
            v_offer.emergency_request_id,
            'released',
            'responder_offer_expired',
            NULL,
            'automation'
        );
        v_expired := v_expired + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'expired', v_expired);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.report_responder_telemetry(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_responder_telemetry_state(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_emergency_responder(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_driver_dispatch_feed() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.expire_responder_offers(INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.report_responder_telemetry(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_responder_telemetry_state(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_emergency_responder(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_driver_dispatch_feed() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_responder_offers(INTEGER) TO service_role;

DO $$
DECLARE
    v_job_exists BOOLEAN := false;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        SELECT EXISTS (
            SELECT 1
            FROM cron.job
            WHERE jobname = 'ivisit-expire-responder-offers'
        ) INTO v_job_exists;

        IF NOT v_job_exists THEN
            PERFORM cron.schedule(
                'ivisit-expire-responder-offers',
                '* * * * *',
                'SELECT public.expire_responder_offers(100);'
            );
        END IF;
    END IF;
END;
$$;
-- END EMERGENCY_RESPONDER_TELEMETRY_COMMANDS

REVOKE ALL ON FUNCTION public.ambulance_dispatch_readiness_snapshot(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offer_responder_assignment(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_ambulance_dispatch_readiness(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_eligible_ambulance_responders(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_ambulance_responder(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ambulance_dispatch_readiness_snapshot(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.offer_responder_assignment(UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ambulance_dispatch_readiness(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_eligible_ambulance_responders(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.staff_ambulance_responder(UUID, UUID) TO authenticated, service_role;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (CONSOLE_EMERGENCY_CREATE_VISIT_RPC)
CREATE OR REPLACE FUNCTION public.console_create_emergency_request(p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_user_id UUID;
    v_hospital_id UUID;
    v_service_type TEXT;
    v_status TEXT;
    v_total_cost NUMERIC;
    v_payment_status TEXT;
    v_patient_snapshot JSONB;
    v_patient_location geometry;
    v_transition_reason TEXT;
    v_request public.emergency_requests%ROWTYPE;
    v_visit public.visits%ROWTYPE;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_payload IS NULL THEN
        RAISE EXCEPTION 'Payload is required';
    END IF;

    v_user_id := NULLIF(p_payload->>'user_id', '')::UUID;
    v_hospital_id := NULLIF(p_payload->>'hospital_id', '')::UUID;
    v_service_type := LOWER(
        COALESCE(
            NULLIF(p_payload->>'service_type', ''),
            CASE
                WHEN NULLIF(p_payload->>'bed_number', '') IS NOT NULL THEN 'bed'
                ELSE 'ambulance'
            END
        )
    );
    v_status := public.canonicalize_emergency_status(p_payload->>'status', 'pending_approval');
    v_total_cost := COALESCE(NULLIF(p_payload->>'total_cost', '')::NUMERIC, 0);
    v_payment_status := LOWER(COALESCE(NULLIF(p_payload->>'payment_status', ''), 'pending'));
    v_patient_snapshot := COALESCE(
        p_payload->'patient_snapshot',
        CASE
            WHEN NULLIF(p_payload->>'description', '') IS NOT NULL
                THEN jsonb_build_object('description', p_payload->>'description')
            ELSE '{}'::JSONB
        END
    );
    v_patient_location := public.jsonb_to_point_geometry(
        COALESCE(
            p_payload->'patient_location',
            jsonb_build_object(
                'lat', p_payload->>'latitude',
                'lng', p_payload->>'longitude'
            )
        )
    );

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id is required';
    END IF;

    IF v_service_type NOT IN ('ambulance', 'bed', 'booking') THEN
        v_service_type := 'ambulance';
    END IF;

    IF v_status NOT IN ('pending_approval', 'payment_declined', 'in_progress', 'accepted', 'arrived', 'completed', 'cancelled') THEN
        v_status := 'pending_approval';
    END IF;

    IF v_payment_status NOT IN ('pending', 'paid', 'completed', 'failed', 'refunded', 'declined') THEN
        v_payment_status := 'pending';
    END IF;

    v_transition_reason := COALESCE(
        NULLIF(p_payload->>'transition_reason', ''),
        NULLIF(p_payload->>'reason', ''),
        'console_created_emergency'
    );

    PERFORM public.set_emergency_transition_context(
        p_source => 'console_create_emergency_request',
        p_reason => v_transition_reason,
        p_actor_id => v_actor_id,
        p_actor_role => v_actor_role,
        p_metadata =>
        jsonb_build_object(
            'service_type', v_service_type,
            'payment_status', v_payment_status
        ),
        p_allow_status_write => false
    );

    IF NOT v_is_admin THEN
        IF v_hospital_id IS NULL THEN
            RAISE EXCEPTION 'hospital_id is required for org scoped creation';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.hospitals h
            WHERE h.id = v_hospital_id
              AND h.organization_id = v_actor_org_id
        ) THEN
            RAISE EXCEPTION 'Unauthorized: hospital out of scope';
        END IF;
    END IF;

    INSERT INTO public.emergency_requests (
        user_id,
        hospital_id,
        status,
        service_type,
        hospital_name,
        specialty,
        ambulance_type,
        bed_number,
        patient_snapshot,
        patient_location,
        total_cost,
        payment_status,
        updated_at
    ) VALUES (
        v_user_id,
        v_hospital_id,
        v_status,
        v_service_type,
        NULLIF(p_payload->>'hospital_name', ''),
        NULLIF(p_payload->>'specialty', ''),
        NULLIF(p_payload->>'ambulance_type', ''),
        NULLIF(p_payload->>'bed_number', ''),
        v_patient_snapshot,
        v_patient_location,
        v_total_cost,
        v_payment_status,
        NOW()
    )
    RETURNING * INTO v_request;

    -- Match the patient create_emergency_v4 contract: request creation is not
    -- successful unless its linked visit evidence is created in the same transaction.
    INSERT INTO public.visits (
        user_id,
        hospital_id,
        request_id,
        status,
        date,
        time,
        type
    ) VALUES (
        v_user_id,
        v_hospital_id,
        v_request.id,
        'pending',
        TO_CHAR(NOW(), 'YYYY-MM-DD'),
        TO_CHAR(NOW(), 'HH24:MI:SS'),
        'emergency'
    )
    RETURNING * INTO v_visit;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request.id,
        'request', to_jsonb(v_request),
        'visit_id', v_visit.id,
        'visit', to_jsonb(v_visit)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (console_update_emergency_request function)
-- END CONSOLE_EMERGENCY_CREATE_VISIT_RPC


CREATE OR REPLACE FUNCTION public.console_update_emergency_request(p_request_id UUID, p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_request_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_current_status TEXT;
    v_current_service_type TEXT;
    v_hospital_id UUID;
    v_hospital_name TEXT;
    v_requested_service_type TEXT;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'A JSON object payload is required';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(p_payload) AS payload_key(key)
        WHERE payload_key.key <> ALL (ARRAY[
            'hospital_id',
            'hospital_name',
            'service_type',
            'specialty',
            'ambulance_type',
            'bed_number'
        ]::TEXT[])
    ) THEN
        RAISE EXCEPTION 'Unsupported emergency update field';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT h.organization_id, er.dispatch_organization_id, er.status, er.service_type
    INTO v_request_org_id, v_request_dispatch_org_id, v_current_status, v_current_service_type
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF NOT v_is_admin AND (
        v_actor_role NOT IN ('org_admin', 'dispatcher')
        OR v_actor_org_id IS NULL
        OR (
            v_actor_org_id IS DISTINCT FROM v_request_org_id
            AND v_actor_org_id IS DISTINCT FROM v_request_dispatch_org_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized: emergency out of scope';
    END IF;

    IF v_current_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RAISE EXCEPTION 'Terminal emergency requests are read-only';
    END IF;

    v_hospital_id := NULLIF(p_payload->>'hospital_id', '')::UUID;
    IF v_hospital_id IS NOT NULL THEN
        SELECT hospital.name
        INTO v_hospital_name
        FROM public.hospitals hospital
        WHERE hospital.id = v_hospital_id
          AND (
              v_is_admin
              OR hospital.organization_id = v_actor_org_id
          );

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Target hospital is unavailable or outside actor scope';
        END IF;
    ELSIF p_payload ? 'hospital_name' THEN
        RAISE EXCEPTION 'hospital_name must be derived from hospital_id';
    END IF;

    v_requested_service_type := LOWER(NULLIF(BTRIM(p_payload->>'service_type'), ''));
    IF v_requested_service_type IS NOT NULL
       AND v_requested_service_type NOT IN ('ambulance', 'bed') THEN
        RAISE EXCEPTION 'Invalid emergency service type';
    END IF;
    IF v_requested_service_type IS DISTINCT FROM v_current_service_type
       AND v_requested_service_type IS NOT NULL
       AND v_current_status <> 'pending_approval' THEN
        RAISE EXCEPTION 'Service type cannot change after payment review begins';
    END IF;

    UPDATE public.emergency_requests er
    SET hospital_id = COALESCE(v_hospital_id, er.hospital_id),
        hospital_name = COALESCE(v_hospital_name, er.hospital_name),
        service_type = COALESCE(v_requested_service_type, er.service_type),
        specialty = COALESCE(NULLIF(p_payload->>'specialty', ''), er.specialty),
        ambulance_type = COALESCE(NULLIF(p_payload->>'ambulance_type', ''), er.ambulance_type),
        bed_number = COALESCE(NULLIF(p_payload->>'bed_number', ''), er.bed_number),
        updated_at = NOW()
    WHERE er.id = p_request_id
    RETURNING * INTO v_updated;

    RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (console_accept_bed_emergency function)
CREATE OR REPLACE FUNCTION public.console_accept_bed_emergency(
    p_request_id UUID,
    p_hospital_id UUID DEFAULT NULL,
    p_bed_number TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_request public.emergency_requests%ROWTYPE;
    v_request_org_id UUID;
    v_target_hospital_id UUID;
    v_target_hospital_name TEXT;
    v_target_hospital_org_id UUID;
    v_payment_state JSONB;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    SELECT profile.role, profile.organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles profile
    WHERE profile.id = v_actor_id;

    IF NOT v_is_service_role
       AND (v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT request.*
    INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE OF request;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    SELECT hospital.organization_id
    INTO v_request_org_id
    FROM public.hospitals hospital
    WHERE hospital.id = v_request.hospital_id;

    IF NOT v_is_service_role AND NOT v_is_admin
       AND (v_actor_org_id IS NULL OR v_request_org_id IS DISTINCT FROM v_actor_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: bed request outside actor organization';
    END IF;
    IF v_request.service_type <> 'bed' THEN
        RAISE EXCEPTION 'Only bed requests can use this command';
    END IF;
    IF v_request.status = 'accepted' THEN
        RETURN jsonb_build_object('success', true, 'already_accepted', true, 'request', to_jsonb(v_request));
    END IF;
    IF v_request.status <> 'in_progress' THEN
        RAISE EXCEPTION 'Bed request is not ready for acceptance';
    END IF;

    v_target_hospital_id := COALESCE(p_hospital_id, v_request.hospital_id);
    SELECT hospital.name, hospital.organization_id
    INTO v_target_hospital_name, v_target_hospital_org_id
    FROM public.hospitals hospital
    WHERE hospital.id = v_target_hospital_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target hospital not found';
    END IF;
    IF NOT v_is_service_role AND NOT v_is_admin AND (
        v_actor_org_id IS NULL
        OR v_target_hospital_org_id IS DISTINCT FROM v_actor_org_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: bed request outside actor organization';
    END IF;

    v_payment_state := public.emergency_dispatch_payment_snapshot(p_request_id);
    IF COALESCE((v_payment_state->>'ready')::BOOLEAN, false) = false THEN
        RAISE EXCEPTION 'Cannot accept a bed request before backend payment confirmation';
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'console_accept_bed_emergency',
        p_reason => 'bed_reservation_accepted',
        p_actor_id => v_actor_id,
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END,
        p_metadata => jsonb_build_object(
            'request_id', p_request_id,
            'hospital_id', v_target_hospital_id,
            'bed_number', NULLIF(BTRIM(p_bed_number), '')
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET hospital_id = v_target_hospital_id,
        hospital_name = v_target_hospital_name,
        bed_number = COALESCE(NULLIF(BTRIM(p_bed_number), ''), bed_number),
        status = 'accepted',
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT || ':bed_accepted',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Bed request accepted',
            p_message => v_target_hospital_name || ' accepted your bed request.',
            p_priority => 'urgent',
            p_action_type => 'view_emergency_request',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_request.bed_accepted',
                'requestId', p_request_id,
                'hospitalId', v_target_hospital_id,
                'organizationId', v_target_hospital_org_id
            ),
            p_icon => 'bed-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (revoke public bed acceptance command)
REVOKE ALL ON FUNCTION public.console_accept_bed_emergency(UUID, UUID, TEXT) FROM PUBLIC, anon;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (grant scoped bed acceptance command)
GRANT EXECUTE ON FUNCTION public.console_accept_bed_emergency(UUID, UUID, TEXT) TO authenticated, service_role;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (console_dispatch_emergency function)
CREATE OR REPLACE FUNCTION public.console_dispatch_emergency(
    p_request_id UUID,
    p_ambulance_id UUID,
    p_hospital_id UUID DEFAULT NULL,
    p_hospital_name TEXT DEFAULT NULL,
    p_bed_number TEXT DEFAULT NULL,
    p_responder_name TEXT DEFAULT NULL,
    p_responder_phone TEXT DEFAULT NULL,
    p_responder_vehicle_type TEXT DEFAULT NULL,
    p_responder_vehicle_plate TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_status TEXT;
    v_req_payment_status TEXT;
    v_req_hospital_id UUID;
    v_req_org_id UUID;
    v_req_current_ambulance_id UUID;
    v_amb_status TEXT;
    v_amb_hospital_id UUID;
    v_amb_org_id UUID;
    v_amb_profile_id UUID;
    v_amb_current_call UUID;
    v_driver_name TEXT;
    v_driver_phone TEXT;
    v_amb_type TEXT;
    v_amb_plate TEXT;
    v_effective_hospital_id UUID;
    v_effective_hospital_name TEXT;
    v_updated public.emergency_requests%ROWTYPE;
    v_payment_state JSONB;
    v_offer_result JSONB;
BEGIN
    IF p_request_id IS NULL OR p_ambulance_id IS NULL THEN
        RAISE EXCEPTION 'request id and ambulance id are required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT er.status, er.payment_status, er.hospital_id, h.organization_id, er.ambulance_id
    INTO v_req_status, v_req_payment_status, v_req_hospital_id, v_req_org_id, v_req_current_ambulance_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    v_req_status := public.canonicalize_emergency_status(v_req_status, v_req_status);
    v_req_payment_status := LOWER(COALESCE(v_req_payment_status, 'pending'));
    IF v_req_status IS NULL THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF v_req_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RAISE EXCEPTION 'Cannot dispatch a terminal emergency request';
    END IF;

    IF v_req_status <> 'in_progress' THEN
        RAISE EXCEPTION 'Request is not awaiting a responder offer';
    END IF;

    v_payment_state := public.emergency_dispatch_payment_snapshot(p_request_id);
    IF COALESCE((v_payment_state->>'ready')::BOOLEAN, false) = false THEN
        RAISE EXCEPTION 'Cannot dispatch before backend payment confirmation';
    END IF;

    SELECT a.status, a.hospital_id, h.organization_id, a.profile_id, a.current_call, a.type, a.vehicle_number, p.full_name, p.phone
    INTO v_amb_status, v_amb_hospital_id, v_amb_org_id, v_amb_profile_id, v_amb_current_call, v_amb_type, v_amb_plate, v_driver_name, v_driver_phone
    FROM public.ambulances a
    LEFT JOIN public.hospitals h ON h.id = a.hospital_id
    LEFT JOIN public.profiles p ON p.id = a.profile_id
    WHERE a.id = p_ambulance_id
    FOR UPDATE OF a;

    IF v_amb_status IS NULL THEN
        RAISE EXCEPTION 'Ambulance not found';
    END IF;

    IF v_amb_status NOT IN ('available', 'dispatched') THEN
        RAISE EXCEPTION 'Ambulance is not dispatchable';
    END IF;

    IF v_amb_status = 'dispatched' AND v_amb_current_call IS DISTINCT FROM p_request_id THEN
        RAISE EXCEPTION 'Ambulance is currently assigned to another request';
    END IF;

    IF NOT v_is_admin THEN
        IF v_actor_org_id IS NULL OR v_req_org_id IS DISTINCT FROM v_actor_org_id OR v_amb_org_id IS DISTINCT FROM v_actor_org_id THEN
            RAISE EXCEPTION 'Unauthorized: dispatch scope violation';
        END IF;
    END IF;

    v_effective_hospital_id := COALESCE(p_hospital_id, v_req_hospital_id, v_amb_hospital_id);
    v_effective_hospital_name := p_hospital_name;
    IF v_effective_hospital_name IS NULL AND v_effective_hospital_id IS NOT NULL THEN
        SELECT name INTO v_effective_hospital_name FROM public.hospitals WHERE id = v_effective_hospital_id;
    END IF;

    IF NOT v_is_admin AND v_effective_hospital_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.hospitals hospital
        WHERE hospital.id = v_effective_hospital_id
          AND hospital.organization_id = v_actor_org_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: target hospital outside actor organization';
    END IF;

    UPDATE public.emergency_requests er
    SET hospital_id = COALESCE(v_effective_hospital_id, er.hospital_id),
        hospital_name = COALESCE(v_effective_hospital_name, er.hospital_name),
        bed_number = COALESCE(NULLIF(p_bed_number, ''), er.bed_number),
        updated_at = NOW()
    WHERE er.id = p_request_id;

    v_offer_result := public.offer_responder_assignment(
        p_request_id,
        p_ambulance_id,
        v_actor_id,
        'console_dispatch_emergency'
    );

    IF COALESCE((v_offer_result->>'success')::BOOLEAN, false) = false THEN
        RETURN v_offer_result;
    END IF;

    SELECT * INTO v_updated
    FROM public.emergency_requests
    WHERE id = p_request_id;

    RETURN v_offer_result || jsonb_build_object('request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (console_complete_emergency function)
CREATE OR REPLACE FUNCTION public.console_complete_emergency(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_org_id UUID;
    v_req_dispatch_org_id UUID;
    v_req_responder_id UUID;
    v_service_type TEXT;
    v_status TEXT;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT h.organization_id, er.dispatch_organization_id, er.responder_id, er.service_type, er.status
    INTO v_req_org_id, v_req_dispatch_org_id, v_req_responder_id, v_service_type, v_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    v_status := public.canonicalize_emergency_status(v_status, v_status);
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF NOT v_is_service_role AND v_actor_role = 'provider' THEN
        IF v_service_type <> 'ambulance' OR v_req_responder_id IS DISTINCT FROM v_actor_id THEN
            RAISE EXCEPTION 'Unauthorized: emergency not assigned to provider';
        END IF;
        RETURN public.responder_complete_emergency(p_request_id);
    END IF;

    IF NOT v_is_service_role AND NOT v_is_admin AND (
        v_actor_role NOT IN ('org_admin', 'dispatcher')
        OR v_actor_org_id IS NULL
        OR (
            v_actor_org_id IS DISTINCT FROM v_req_org_id
            AND v_actor_org_id IS DISTINCT FROM v_req_dispatch_org_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_service_type = 'ambulance' THEN
        IF v_is_service_role THEN
            RETURN public.responder_complete_emergency(p_request_id);
        END IF;
        RAISE EXCEPTION 'The assigned responder must complete an ambulance request';
    END IF;
    IF v_service_type <> 'bed' THEN
        RAISE EXCEPTION 'Unsupported emergency service type';
    END IF;

    IF v_status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true);
    END IF;

    IF v_status IN ('cancelled', 'payment_declined') THEN
        RAISE EXCEPTION 'Cannot complete terminal cancelled/declined request';
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_status, 'completed') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> completed', v_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'console_complete_emergency',
        p_reason => 'console_complete',
        p_actor_id => v_actor_id,
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END,
        p_metadata => jsonb_build_object(
            'request_id', p_request_id,
            'previous_status', v_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT || ':bed_completed',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Bed visit completed',
            p_message => 'Your hospital marked this bed visit as completed.',
            p_priority => 'high',
            p_action_type => 'view_emergency_visit',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_request.bed_completed',
                'requestId', p_request_id
            ),
            p_icon => 'checkmark-circle-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (console_cancel_emergency function)
CREATE OR REPLACE FUNCTION public.console_cancel_emergency(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_org_id UUID;
    v_req_dispatch_org_id UUID;
    v_ambulance_id UUID;
    v_assignment_id UUID;
    v_responder_id UUID;
    v_status TEXT;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT h.organization_id, er.dispatch_organization_id, er.ambulance_id,
           er.current_responder_assignment_id, er.responder_id, er.status
    INTO v_req_org_id, v_req_dispatch_org_id, v_ambulance_id, v_assignment_id, v_responder_id, v_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    v_status := public.canonicalize_emergency_status(v_status, v_status);
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF NOT v_is_service_role AND NOT v_is_admin AND (
        v_actor_role NOT IN ('org_admin', 'dispatcher')
        OR v_actor_org_id IS NULL
        OR (
            v_actor_org_id IS DISTINCT FROM v_req_org_id
            AND v_actor_org_id IS DISTINCT FROM v_req_dispatch_org_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_status = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'already_cancelled', true);
    END IF;

    IF v_status = 'completed' THEN
        RAISE EXCEPTION 'Cannot cancel completed request';
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_status, 'cancelled') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> cancelled', v_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'console_cancel_emergency',
        p_reason => COALESCE(NULLIF(p_reason, ''), 'console_cancel'),
        p_actor_id => v_actor_id,
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END,
        p_metadata => jsonb_build_object(
            'request_id', p_request_id,
            'previous_status', v_status
        ),
        p_allow_status_write => true
    );

    IF v_assignment_id IS NOT NULL THEN
        UPDATE public.emergency_responder_assignments
        SET status = 'cancelled',
            decline_reason = COALESCE(NULLIF(BTRIM(p_reason), ''), 'request_cancelled'),
            ended_at = COALESCE(ended_at, NOW()),
            metadata = metadata || jsonb_build_object(
                'cancelled_by', v_actor_id,
                'cancelled_by_role', CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END
            ),
            updated_at = NOW()
        WHERE id = v_assignment_id
          AND emergency_request_id = p_request_id
          AND status IN ('offered', 'accepted', 'arrived');
    END IF;

    UPDATE public.emergency_requests
    SET status = 'cancelled',
        cancelled_at = COALESCE(cancelled_at, NOW()),
        ambulance_id = NULL,
        dispatch_organization_id = NULL,
        current_responder_assignment_id = NULL,
        responder_id = NULL,
        responder_name = NULL,
        responder_phone = NULL,
        responder_vehicle_type = NULL,
        responder_vehicle_plate = NULL,
        responder_location = NULL,
        responder_heading = NULL,
        responder_location_accuracy_meters = NULL,
        responder_location_observed_at = NULL,
        responder_location_received_at = NULL,
        responder_telemetry_sequence = NULL,
        responder_telemetry_lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_ambulance_id IS NOT NULL THEN
        UPDATE public.ambulances
        SET status = CASE
                WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
                ELSE 'available'
            END,
            current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = v_ambulance_id
          AND current_call = p_request_id;
    END IF;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT || ':cancelled_by_operator',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Emergency request cancelled',
            p_message => 'The care team cancelled this emergency request. Open the request for the latest details.',
            p_priority => 'urgent',
            p_action_type => 'view_emergency_request',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_request.cancelled_by_operator',
                'requestId', p_request_id,
                'reason', NULLIF(BTRIM(p_reason), '')
            ),
            p_icon => 'close-circle-outline',
            p_color => 'danger'
        );
    END IF;

    IF v_responder_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || COALESCE(v_assignment_id::TEXT, 'none') || ':cancelled_by_operator',
            p_recipient_user_id => v_responder_id,
            p_type => 'emergency',
            p_title => 'Emergency assignment cancelled',
            p_message => 'Dispatch cancelled this emergency assignment.',
            p_priority => 'urgent',
            p_action_type => 'view_emergency_assignment',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.cancelled_by_operator',
                'requestId', p_request_id,
                'assignmentId', v_assignment_id
            ),
            p_icon => 'close-circle-outline',
            p_color => 'danger'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reason', p_reason,
        'request', to_jsonb(v_updated)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (console_update_responder_location function)
CREATE OR REPLACE FUNCTION public.console_update_responder_location(
    p_request_id UUID,
    p_location JSONB,
    p_heading DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_assignment_id UUID;
    v_assignment_responder_id UUID;
    v_ambulance_id UUID;
    v_sequence BIGINT;
    v_result JSONB;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;
    IF v_actor_id IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT assignment.id, assignment.responder_id, assignment.ambulance_id,
           COALESCE(ambulance.telemetry_sequence, 0) + 1
    INTO v_assignment_id, v_assignment_responder_id, v_ambulance_id, v_sequence
    FROM public.emergency_requests er
    JOIN public.emergency_responder_assignments assignment
      ON assignment.id = er.current_responder_assignment_id
     AND assignment.emergency_request_id = er.id
     AND assignment.status IN ('offered', 'accepted', 'arrived')
    JOIN public.ambulances ambulance
      ON ambulance.id = assignment.ambulance_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er, assignment, ambulance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Current responder assignment not found';
    END IF;
    IF NOT v_is_service_role AND v_assignment_responder_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    v_result := public.report_responder_telemetry(
        jsonb_build_object(
            'ambulance_id', v_ambulance_id,
            'request_id', p_request_id,
            'assignment_id', v_assignment_id,
            'sequence', v_sequence,
            'observed_at', NOW(),
            'location', p_location,
            'heading', p_heading
        )
    );

    RETURN v_result || jsonb_build_object('compatibility_command', 'console_update_responder_location');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (patient_update_emergency_request function)
CREATE OR REPLACE FUNCTION public.patient_update_emergency_request(
    p_request_id UUID,
    p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_owner_id UUID;
    v_current_status TEXT;
    v_next_status TEXT;
    v_ambulance_id UUID;
    v_assignment_id UUID;
    v_responder_id UUID;
    v_patient_location geometry;
    v_triage_snapshot JSONB;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'A JSON object payload is required';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(p_payload) AS payload_key(key)
        WHERE payload_key.key <> ALL (ARRAY[
            'status',
            'transition_reason',
            'reason',
            'patient_location',
            'triage_snapshot',
            'triage'
        ]::TEXT[])
    ) THEN
        RAISE EXCEPTION 'Unsupported patient emergency update field';
    END IF;

    SELECT er.user_id, er.status, er.ambulance_id, er.current_responder_assignment_id, er.responder_id
    INTO v_owner_id, v_current_status, v_ambulance_id, v_assignment_id, v_responder_id
    FROM public.emergency_requests er
    WHERE er.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF v_owner_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Unauthorized: emergency request does not belong to user';
    END IF;

    v_next_status := public.canonicalize_emergency_status(
        p_payload->>'status',
        NULL
    );
    IF v_next_status IS NOT NULL AND v_next_status <> 'cancelled' THEN
        RAISE EXCEPTION 'Patients may only cancel their emergency request';
    END IF;
    IF v_next_status = 'cancelled'
       AND NOT public.is_valid_emergency_status_transition(v_current_status, 'cancelled') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> cancelled', v_current_status;
    END IF;

    IF v_current_status = 'cancelled' AND v_next_status = 'cancelled' THEN
        SELECT request.* INTO v_updated
        FROM public.emergency_requests request
        WHERE request.id = p_request_id;
        RETURN jsonb_build_object('success', true, 'already_cancelled', true, 'request', to_jsonb(v_updated));
    END IF;

    IF v_current_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RAISE EXCEPTION 'Terminal emergency requests are read-only';
    END IF;

    IF v_next_status = 'cancelled' THEN
        PERFORM public.set_emergency_transition_context(
            p_source => 'patient_update_emergency_request',
            p_reason => COALESCE(NULLIF(p_payload->>'transition_reason', ''), NULLIF(p_payload->>'reason', ''), 'patient_cancelled'),
            p_actor_id => v_actor_id,
            p_actor_role => 'patient',
            p_metadata => jsonb_build_object(
                'request_id', p_request_id,
                'current_status', v_current_status,
                'requested_status', v_next_status
            ),
            p_allow_status_write => true
        );
    END IF;

    IF p_payload ? 'patient_location' THEN
        v_patient_location := public.jsonb_to_point_geometry(p_payload->'patient_location');
        IF v_patient_location IS NULL THEN
            RAISE EXCEPTION 'Invalid patient location payload';
        END IF;
    END IF;

    IF p_payload ? 'triage_snapshot' THEN
        v_triage_snapshot := p_payload->'triage_snapshot';
    ELSIF p_payload ? 'triage' THEN
        v_triage_snapshot := p_payload->'triage';
    END IF;

    IF v_triage_snapshot IS NOT NULL AND jsonb_typeof(v_triage_snapshot) <> 'object' THEN
        RAISE EXCEPTION 'Invalid triage snapshot payload';
    END IF;

    IF v_next_status = 'cancelled' THEN
        IF v_assignment_id IS NOT NULL THEN
            UPDATE public.emergency_responder_assignments
            SET status = 'cancelled',
                decline_reason = COALESCE(NULLIF(BTRIM(p_payload->>'reason'), ''), 'patient_cancelled'),
                ended_at = COALESCE(ended_at, NOW()),
                metadata = metadata || jsonb_build_object('cancelled_by', v_actor_id, 'cancelled_by_role', 'patient'),
                updated_at = NOW()
            WHERE id = v_assignment_id
              AND emergency_request_id = p_request_id
              AND status IN ('offered', 'accepted', 'arrived');
        END IF;

        UPDATE public.emergency_requests er
        SET patient_location = COALESCE(v_patient_location, er.patient_location),
            patient_snapshot = CASE
                WHEN v_triage_snapshot IS NULL THEN er.patient_snapshot
                ELSE jsonb_set(COALESCE(er.patient_snapshot, '{}'::JSONB), '{triage}', v_triage_snapshot, true)
            END,
            status = 'cancelled',
            cancelled_at = COALESCE(er.cancelled_at, NOW()),
            ambulance_id = NULL,
            dispatch_organization_id = NULL,
            current_responder_assignment_id = NULL,
            responder_id = NULL,
            responder_name = NULL,
            responder_phone = NULL,
            responder_vehicle_type = NULL,
            responder_vehicle_plate = NULL,
            responder_location = NULL,
            responder_heading = NULL,
            responder_location_accuracy_meters = NULL,
            responder_location_observed_at = NULL,
            responder_location_received_at = NULL,
            responder_telemetry_sequence = NULL,
            responder_telemetry_lease_expires_at = NULL,
            updated_at = NOW()
        WHERE er.id = p_request_id
        RETURNING * INTO v_updated;

        IF v_ambulance_id IS NOT NULL THEN
            UPDATE public.ambulances
            SET status = CASE
                    WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
                    ELSE 'available'
                END,
                current_call = NULL,
                eta = NULL,
                updated_at = NOW()
            WHERE id = v_ambulance_id
              AND current_call = p_request_id;
        END IF;

        IF v_responder_id IS NOT NULL THEN
            PERFORM public.emit_canonical_notification(
                p_event_key => 'emergency_request:' || p_request_id::TEXT
                    || ':assignment:' || COALESCE(v_assignment_id::TEXT, 'none') || ':cancelled_by_patient',
                p_recipient_user_id => v_responder_id,
                p_type => 'emergency',
                p_title => 'Patient cancelled the emergency',
                p_message => 'The patient cancelled this emergency assignment.',
                p_priority => 'urgent',
                p_action_type => 'view_emergency_assignment',
                p_target_id => p_request_id,
                p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
                p_metadata => jsonb_build_object(
                    'eventName', 'emergency_assignment.cancelled_by_patient',
                    'requestId', p_request_id,
                    'assignmentId', v_assignment_id
                ),
                p_icon => 'close-circle-outline',
                p_color => 'danger'
            );
        END IF;
    ELSE
        UPDATE public.emergency_requests er
        SET patient_location = COALESCE(v_patient_location, er.patient_location),
            patient_snapshot = CASE
                WHEN v_triage_snapshot IS NULL THEN er.patient_snapshot
                ELSE jsonb_set(COALESCE(er.patient_snapshot, '{}'::JSONB), '{triage}', v_triage_snapshot, true)
            END,
            updated_at = NOW()
        WHERE er.id = p_request_id
        RETURNING * INTO v_updated;
    END IF;

    RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (assign_ambulance_to_emergency function)
CREATE OR REPLACE FUNCTION public.assign_ambulance_to_emergency(
    p_emergency_request_id UUID,
    p_ambulance_id UUID,
    p_priority INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_status TEXT;
    v_req_hospital_id UUID;
    v_req_org_id UUID;
    v_req_current_ambulance_id UUID;
    v_amb_status TEXT;
    v_amb_hospital_id UUID;
    v_amb_org_id UUID;
    v_amb_profile_id UUID;
    v_amb_current_call UUID;
    v_amb_type TEXT;
    v_amb_plate TEXT;
    v_driver_name TEXT;
    v_driver_phone TEXT;
    v_transition_source TEXT := COALESCE(
        NULLIF(current_setting('ivisit.transition_source', true), ''),
        'assign_ambulance_to_emergency'
    );
    v_transition_reason TEXT := COALESCE(
        NULLIF(current_setting('ivisit.transition_reason', true), ''),
        'manual_ambulance_assignment'
    );
    v_transition_metadata JSONB := COALESCE(
        NULLIF(current_setting('ivisit.transition_metadata', true), '')::JSONB,
        '{}'::JSONB
    );
    v_updated public.emergency_requests%ROWTYPE;
    v_offer_result JSONB;
BEGIN
    IF p_emergency_request_id IS NULL OR p_ambulance_id IS NULL THEN
        RAISE EXCEPTION 'emergency request id and ambulance id are required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF NOT v_is_service_role AND v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT er.status, er.hospital_id, h.organization_id, er.ambulance_id
    INTO v_req_status, v_req_hospital_id, v_req_org_id, v_req_current_ambulance_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_emergency_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency request not found',
            'code', 'REQUEST_NOT_FOUND'
        );
    END IF;

    v_req_status := public.canonicalize_emergency_status(v_req_status, v_req_status);

    IF v_req_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot assign ambulance to terminal emergency request',
            'code', 'REQUEST_TERMINAL'
        );
    END IF;

    IF v_req_status <> 'in_progress' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting a responder offer',
            'code', 'INVALID_TRANSITION',
            'from_status', v_req_status,
            'to_status', 'offered'
        );
    END IF;

    SELECT a.status, a.hospital_id, h.organization_id, a.profile_id, a.current_call, a.type, a.vehicle_number, p.full_name, p.phone
    INTO v_amb_status, v_amb_hospital_id, v_amb_org_id, v_amb_profile_id, v_amb_current_call, v_amb_type, v_amb_plate, v_driver_name, v_driver_phone
    FROM public.ambulances a
    LEFT JOIN public.hospitals h ON h.id = a.hospital_id
    LEFT JOIN public.profiles p ON p.id = a.profile_id
    WHERE a.id = p_ambulance_id
    FOR UPDATE OF a;

    IF v_amb_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance not found',
            'code', 'AMBULANCE_NOT_FOUND'
        );
    END IF;

    v_amb_status := LOWER(COALESCE(v_amb_status, ''));
    IF v_amb_status <> 'available' THEN
        IF v_amb_current_call IS NULL OR v_amb_current_call IS DISTINCT FROM p_emergency_request_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Ambulance not available',
                'code', 'AMBULANCE_UNAVAILABLE',
                'current_status', v_amb_status
            );
        END IF;
    END IF;

    IF NOT v_is_service_role AND NOT v_is_admin THEN
        IF v_actor_role NOT IN ('org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_org_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_req_org_id IS NOT NULL AND v_actor_org_id IS DISTINCT FROM v_req_org_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_amb_org_id IS NOT NULL AND v_actor_org_id IS DISTINCT FROM v_amb_org_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;
    END IF;

    v_offer_result := public.offer_responder_assignment(
        p_emergency_request_id,
        p_ambulance_id,
        v_actor_id,
        v_transition_source
    );

    IF COALESCE((v_offer_result->>'success')::BOOLEAN, false) = false THEN
        RETURN v_offer_result;
    END IF;

    SELECT * INTO v_updated
    FROM public.emergency_requests
    WHERE id = p_emergency_request_id;

    RETURN v_offer_result || jsonb_build_object(
        'request', to_jsonb(v_updated),
        'priority', p_priority
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (auto_assign_ambulance function)
CREATE OR REPLACE FUNCTION public.auto_assign_ambulance(
    p_emergency_request_id UUID,
    p_max_distance_km INTEGER DEFAULT 50,
    p_specialty_required TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request_location geometry;
    v_max_distance_m DOUBLE PRECISION := GREATEST(COALESCE(p_max_distance_km, 50), 1) * 1000.0;
    v_best_ambulance_id UUID;
    v_best_distance_m DOUBLE PRECISION;
    v_assignment_result JSONB;
BEGIN
    IF p_emergency_request_id IS NULL THEN
        RAISE EXCEPTION 'emergency request id is required';
    END IF;

    SELECT er.patient_location
    INTO v_request_location
    FROM public.emergency_requests er
    WHERE er.id = p_emergency_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency request not found',
            'code', 'REQUEST_NOT_FOUND'
        );
    END IF;

    PERFORM set_config('ivisit.transition_source', 'auto_assign_ambulance', true);
    PERFORM set_config('ivisit.transition_reason', 'auto_ambulance_assignment', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'request_id', p_emergency_request_id,
            'max_distance_km', p_max_distance_km,
            'specialty_required', p_specialty_required
        )::TEXT,
        true
    );

    SELECT a.id,
           ST_Distance(a.location::GEOGRAPHY, v_request_location::GEOGRAPHY)
    INTO v_best_ambulance_id, v_best_distance_m
    FROM public.ambulances a
    WHERE a.status = 'available'
      AND a.current_call IS NULL
      AND a.profile_id IS NOT NULL
      AND COALESCE(
            (public.ambulance_dispatch_readiness_snapshot(a.id, p_emergency_request_id)->>'ready')::BOOLEAN,
            false
      )
      AND NOT EXISTS (
            SELECT 1
            FROM public.emergency_responder_assignments previous
            WHERE previous.emergency_request_id = p_emergency_request_id
              AND previous.ambulance_id = a.id
              AND previous.status IN ('declined', 'released')
      )
      AND (
            p_specialty_required IS NULL
            OR COALESCE(a.type, '') ILIKE '%' || p_specialty_required || '%'
            OR COALESCE(a.call_sign, '') ILIKE '%' || p_specialty_required || '%'
      )
      AND (
            v_request_location IS NULL
            OR a.location IS NULL
            OR ST_DWithin(a.location::GEOGRAPHY, v_request_location::GEOGRAPHY, v_max_distance_m)
      )
    ORDER BY
        COALESCE(ST_Distance(a.location::GEOGRAPHY, v_request_location::GEOGRAPHY), 1000000000),
        a.updated_at ASC
    LIMIT 1
    FOR UPDATE OF a SKIP LOCKED;

    IF v_best_ambulance_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No available ambulances found',
            'code', 'NO_AMBULANCE_AVAILABLE',
            'auto_assigned', false
        );
    END IF;

    SELECT public.assign_ambulance_to_emergency(
        p_emergency_request_id,
        v_best_ambulance_id,
        1
    ) INTO v_assignment_result;

    IF COALESCE((v_assignment_result->>'success')::BOOLEAN, false) = false THEN
        RETURN v_assignment_result || jsonb_build_object('auto_assigned', false);
    END IF;

    RETURN v_assignment_result || jsonb_build_object(
        'auto_assigned', true,
        'distance_km', CASE
            WHEN v_best_distance_m IS NULL THEN NULL
            ELSE ROUND((v_best_distance_m / 1000.0)::NUMERIC, 3)
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (approve_cash_payment function)
CREATE OR REPLACE FUNCTION public.approve_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_org_id UUID;
    v_request_status TEXT;
    v_request_payment_status TEXT;
    v_request_service_type TEXT;
    v_org_wallet_id UUID;
    v_org_balance NUMERIC;
    v_platform_wallet_id UUID;
    v_org_ledger_id UUID;
    v_platform_ledger_id UUID;
    v_fee_amount NUMERIC;
    v_fee_percentage NUMERIC;
    v_assigned_ambulance_id UUID;
    v_responder_name TEXT;
    v_responder_phone TEXT;
    v_responder_vehicle_type TEXT;
    v_responder_vehicle_plate TEXT;
BEGIN
    SELECT
        p.*,
        NULLIF((p.metadata->>'fee_amount')::NUMERIC, 0) AS calculated_fee,
        NULLIF((p.metadata->>'fee')::NUMERIC, 0) AS legacy_calculated_fee
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request pair not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a cash payment');
    END IF;

    SELECT er.service_type, h.organization_id, er.status, er.payment_status
    INTO v_request_service_type, v_request_org_id, v_request_status, v_request_payment_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    v_request_status := public.canonicalize_emergency_status(v_request_status, v_request_status);

    IF v_payment.organization_id IS DISTINCT FROM v_request_org_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request organization mismatch');
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash approval';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    IF COALESCE(v_payment.status, '') = 'completed'
       AND COALESCE(v_request_payment_status, '') IN ('paid', 'completed') THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'payment_id', p_payment_id,
            'request_id', p_request_id,
            'request_status', v_request_status
        );
    END IF;

    IF COALESCE(v_payment.status, '') <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cash payment is not pending approval',
            'payment_status', v_payment.status
        );
    END IF;

    IF v_request_status <> 'pending_approval' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting cash approval',
            'request_status', v_request_status
        );
    END IF;

    IF COALESCE(v_request_payment_status, 'pending') NOT IN ('pending', 'requires_approval') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request payment is not in a pending approval state',
            'payment_status', v_request_payment_status
        );
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_request_status, 'in_progress') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Illegal emergency status transition',
            'from_status', v_request_status,
            'to_status', 'in_progress'
        );
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'approve_cash_payment',
        p_reason => 'cash_payment_approved',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'payment_id', p_payment_id,
            'request_id', p_request_id,
            'previous_status', v_request_status,
            'service_type', v_request_service_type
        ),
        p_allow_status_write => true
    );

    SELECT id, balance INTO v_org_wallet_id, v_org_balance
    FROM public.organization_wallets
    WHERE organization_id = v_payment.organization_id
    FOR UPDATE;

    IF v_org_wallet_id IS NULL AND v_payment.organization_id IS NOT NULL THEN
        INSERT INTO public.organization_wallets (organization_id, balance)
        VALUES (v_payment.organization_id, 0)
        RETURNING id, balance INTO v_org_wallet_id, v_org_balance;
    END IF;

    SELECT id INTO v_platform_wallet_id FROM public.ivisit_main_wallet LIMIT 1 FOR UPDATE;

    IF v_platform_wallet_id IS NULL THEN
        INSERT INTO public.ivisit_main_wallet (balance, currency, last_updated)
        VALUES (0, COALESCE(NULLIF(v_payment.currency, ''), 'USD'), NOW())
        RETURNING id INTO v_platform_wallet_id;
    END IF;

    SELECT ivisit_fee_percentage
    INTO v_fee_percentage
    FROM public.organizations
    WHERE id = v_request_org_id;

    v_fee_amount := COALESCE(
        NULLIF(v_payment.ivisit_fee_amount, 0),
        v_payment.calculated_fee,
        v_payment.legacy_calculated_fee,
        ROUND(COALESCE(v_payment.amount, 0) * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2),
        0
    );

    IF v_fee_amount > 0 THEN
        IF v_org_balance < v_fee_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization balance insufficient for platform fee');
        END IF;

        INSERT INTO public.wallet_ledger (
            wallet_id, amount, transaction_type, description, reference_id,
            idempotency_key, metadata
        ) VALUES (
            v_org_wallet_id, -v_fee_amount, 'debit',
            'iVisit Platform Fee (Cash Payment)', p_payment_id,
            'payment:' || p_payment_id::TEXT || ':cash_org_fee_debit',
            jsonb_build_object('source', 'approve_cash_payment')
        )
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING id INTO v_org_ledger_id;

        INSERT INTO public.wallet_ledger (
            wallet_id, amount, transaction_type, description, reference_id,
            idempotency_key, metadata
        ) VALUES (
            v_platform_wallet_id, v_fee_amount, 'credit',
            'Platform Fee (Cash Payment)', p_payment_id,
            'payment:' || p_payment_id::TEXT || ':cash_platform_fee_credit',
            jsonb_build_object('source', 'approve_cash_payment')
        )
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING id INTO v_platform_ledger_id;

        IF v_org_ledger_id IS NULL OR v_platform_ledger_id IS NULL THEN
            RAISE EXCEPTION 'Cash settlement retry state is inconsistent';
        END IF;

        UPDATE public.organization_wallets
        SET balance = balance - v_fee_amount,
            updated_at = NOW()
        WHERE id = v_org_wallet_id;

        UPDATE public.ivisit_main_wallet
        SET balance = balance + v_fee_amount,
            last_updated = NOW()
        WHERE id = v_platform_wallet_id;
    END IF;

    UPDATE public.payments
    SET status = 'completed',
        processed_at = NOW(),
        ivisit_fee_amount = v_fee_amount,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'source', 'approve_cash_payment',
            'fee_amount', v_fee_amount,
            'fee', v_fee_amount
        ),
        updated_at = NOW()
    WHERE id = p_payment_id;

    UPDATE public.emergency_requests
    SET status = 'in_progress',
        payment_status = 'completed',
        updated_at = NOW()
    WHERE id = p_request_id;

    UPDATE public.visits
    SET status = 'active',
        updated_at = NOW()
    WHERE request_id = p_request_id;

    IF v_request_service_type = 'ambulance'
       AND EXISTS (
            SELECT 1
            FROM public.emergency_requests request
            WHERE request.id = p_request_id
              AND request.status IN ('accepted', 'arrived')
       ) THEN
        UPDATE public.emergency_requests er
        SET responder_id = COALESCE(er.responder_id, a.profile_id),
            responder_name = COALESCE(
                NULLIF(BTRIM(er.responder_name), ''),
                NULLIF(BTRIM(p.full_name), ''),
                NULLIF(BTRIM(a.call_sign), ''),
                NULLIF(BTRIM(a.vehicle_number), ''),
                NULLIF(BTRIM(a.type), ''),
                'Responder'
            ),
            responder_phone = COALESCE(
                NULLIF(BTRIM(er.responder_phone), ''),
                NULLIF(BTRIM(p.phone), '')
            ),
            responder_vehicle_type = COALESCE(
                NULLIF(BTRIM(er.responder_vehicle_type), ''),
                NULLIF(BTRIM(a.type), '')
            ),
            responder_vehicle_plate = COALESCE(
                NULLIF(BTRIM(er.responder_vehicle_plate), ''),
                NULLIF(BTRIM(a.license_plate), ''),
                NULLIF(BTRIM(a.vehicle_number), '')
            ),
            updated_at = NOW()
        FROM public.ambulances a
        LEFT JOIN public.profiles p ON p.id = a.profile_id
        WHERE er.id = p_request_id
          AND er.ambulance_id = a.id;
    END IF;

    SELECT ambulance_id, responder_name, responder_phone, responder_vehicle_type, responder_vehicle_plate
    INTO v_assigned_ambulance_id, v_responder_name, v_responder_phone, v_responder_vehicle_type, v_responder_vehicle_plate
    FROM public.emergency_requests
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'fee_deducted', v_fee_amount,
        'new_balance', COALESCE((v_org_balance - v_fee_amount), 0),
        'ambulance_id', v_assigned_ambulance_id,
        'responder_name', v_responder_name,
        'responder_phone', v_responder_phone,
        'responder_vehicle_type', v_responder_vehicle_type,
        'responder_vehicle_plate', v_responder_vehicle_plate
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (decline_cash_payment function)
CREATE OR REPLACE FUNCTION public.decline_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_org_id UUID;
    v_request_status TEXT;
    v_request_payment_status TEXT;
BEGIN
    SELECT p.*
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request pair not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a cash payment');
    END IF;

    SELECT h.organization_id, er.status, er.payment_status
    INTO v_request_org_id, v_request_status, v_request_payment_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    v_request_status := public.canonicalize_emergency_status(v_request_status, v_request_status);

    IF v_payment.organization_id IS DISTINCT FROM v_request_org_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request organization mismatch');
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash decline';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    IF v_payment.status IN ('failed', 'declined')
       AND v_request_status = 'payment_declined'
       AND v_request_payment_status IN ('failed', 'declined') THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_declined', true,
            'payment_id', p_payment_id,
            'request_id', p_request_id
        );
    END IF;

    IF v_payment.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cash payment is not pending approval',
            'payment_status', v_payment.status
        );
    END IF;

    IF v_request_status <> 'pending_approval' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting cash approval',
            'request_status', v_request_status
        );
    END IF;

    IF COALESCE(v_request_payment_status, 'pending') <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request payment is not in a pending approval state',
            'payment_status', v_request_payment_status
        );
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_request_status, 'payment_declined') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Illegal emergency status transition',
            'from_status', v_request_status,
            'to_status', 'payment_declined'
        );
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'decline_cash_payment',
        p_reason => 'cash_payment_declined',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'payment_id', p_payment_id,
            'request_id', p_request_id,
            'previous_status', v_request_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.payments
    SET status = 'failed',
        updated_at = NOW()
    WHERE id = p_payment_id;

    UPDATE public.emergency_requests
    SET status = 'payment_declined',
        payment_status = 'failed',
        updated_at = NOW()
    WHERE id = p_request_id;

    UPDATE public.visits
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE request_id = p_request_id;

    RETURN jsonb_build_object('success', true, 'status', 'declined');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (complete_trip function 2)
-- Legacy trip aliases remain for deployed clients, but lifecycle authority is
-- delegated to the canonical responder/console commands above.
CREATE OR REPLACE FUNCTION public.complete_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_request_id UUID;
    v_result JSONB;
BEGIN
    IF request_uuid IS NULL OR BTRIM(request_uuid) = '' THEN
        RETURN FALSE;
    END IF;

    IF request_uuid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        v_request_id := request_uuid::UUID;
    ELSE
        v_request_id := public.get_entity_id(request_uuid);
    END IF;

    IF v_request_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_result := public.console_complete_emergency(v_request_id);
    RETURN COALESCE((v_result->>'success')::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (cancel_trip function 2)
CREATE OR REPLACE FUNCTION public.cancel_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_request_id UUID;
    v_result JSONB;
BEGIN
    IF request_uuid IS NULL OR BTRIM(request_uuid) = '' THEN
        RETURN FALSE;
    END IF;

    IF request_uuid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        v_request_id := request_uuid::UUID;
    ELSE
        v_request_id := public.get_entity_id(request_uuid);
    END IF;

    IF v_request_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_result := public.console_cancel_emergency(v_request_id, 'legacy_cancel_trip');
    RETURN COALESCE((v_result->>'success')::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (book_scheduled_visit function)
CREATE OR REPLACE FUNCTION public.book_scheduled_visit(
    p_hospital_id UUID,
    p_specialty TEXT,
    p_care_mode TEXT,
    p_scheduled_start_at TIMESTAMPTZ,
    p_idempotency_key UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_care_mode TEXT := LOWER(BTRIM(COALESCE(p_care_mode, '')));
    v_specialty TEXT := BTRIM(COALESCE(p_specialty, ''));
    v_duration INTERVAL := public.p_scheduled_visit_duration(p_care_mode);
    v_scheduled_end_at TIMESTAMPTZ;
    v_local_start TIMESTAMP;
    v_local_end TIMESTAMP;
    v_hospital public.hospitals%ROWTYPE;
    v_doctor public.doctors%ROWTYPE;
    v_selected_doctor_id UUID;
    v_visit public.visits%ROWTYPE;
    v_existing public.visits%ROWTYPE;
    v_room JSONB;
    v_room_id UUID;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_hospital_id IS NULL OR v_specialty = '' OR p_scheduled_start_at IS NULL OR p_idempotency_key IS NULL THEN
        RAISE EXCEPTION 'hospital, specialty, start time, and idempotency key are required';
    END IF;

    IF v_duration IS NULL THEN
        RAISE EXCEPTION 'Unsupported care mode';
    END IF;

    IF p_notes IS NOT NULL AND char_length(p_notes) > 2000 THEN
        RAISE EXCEPTION 'Notes cannot exceed 2000 characters';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            'scheduled-booking-key:' || v_actor_id::TEXT || ':' || p_idempotency_key::TEXT,
            0
        )
    );

    SELECT visit.*
    INTO v_existing
    FROM public.visits visit
    WHERE visit.user_id = v_actor_id
      AND visit.booking_idempotency_key = p_idempotency_key
    LIMIT 1
    FOR UPDATE;

    IF v_existing.id IS NOT NULL THEN
        IF v_existing.hospital_id IS DISTINCT FROM p_hospital_id
           OR v_existing.care_mode IS DISTINCT FROM v_care_mode
           OR v_existing.scheduled_start_at IS DISTINCT FROM p_scheduled_start_at
           OR LOWER(BTRIM(COALESCE(v_existing.specialty, ''))) <> LOWER(v_specialty)
           OR NULLIF(BTRIM(COALESCE(v_existing.notes, '')), '') IS DISTINCT FROM
              NULLIF(BTRIM(COALESCE(p_notes, '')), '') THEN
            RAISE EXCEPTION 'Idempotency key was already used for another booking';
        END IF;

        IF v_existing.care_mode = 'telemedicine_async' THEN
            SELECT room.id
            INTO v_room_id
            FROM public.emergency_chat_rooms room
            WHERE room.channel_type = 'telemedicine_async'
              AND room.visit_id = v_existing.id;

            IF v_room_id IS NULL AND v_existing.status IN ('upcoming', 'in_progress') THEN
                v_room := public.ensure_async_consult_room(v_existing.id);
                v_room_id := NULLIF(v_room->>'id', '')::UUID;
            END IF;
        END IF;

        RETURN to_jsonb(v_existing) || jsonb_build_object(
            'communication_room_id', v_room_id,
            'idempotent', true
        );
    END IF;

    SELECT hospital.*
    INTO v_hospital
    FROM public.hospitals hospital
    WHERE hospital.id = p_hospital_id
      AND hospital.booking_eligible = true
      AND hospital.status = 'available'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facility is not available for booking';
    END IF;

    IF v_hospital.timezone_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Facility timezone is not confirmed';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_timezone_names timezone_row WHERE timezone_row.name = v_hospital.timezone
    ) THEN
        RAISE EXCEPTION 'Facility timezone is invalid';
    END IF;

    v_scheduled_end_at := p_scheduled_start_at + v_duration;
    v_local_start := p_scheduled_start_at AT TIME ZONE v_hospital.timezone;
    v_local_end := v_scheduled_end_at AT TIME ZONE v_hospital.timezone;

    IF p_scheduled_start_at < NOW() + INTERVAL '5 minutes'
       OR p_scheduled_start_at > NOW() + INTERVAL '90 days' THEN
        RAISE EXCEPTION 'Booking start must be between 5 minutes and 90 days from now';
    END IF;

    IF v_local_start::DATE <> v_local_end::DATE
       OR MOD(EXTRACT(MINUTE FROM v_local_start)::INTEGER, 15) <> 0
       OR EXTRACT(SECOND FROM v_local_start) <> 0 THEN
        RAISE EXCEPTION 'Booking must use a same-day 15-minute slot';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended('scheduled-patient:' || v_actor_id::TEXT, 0)
    );

    IF EXISTS (
        SELECT 1
        FROM public.visits patient_visit
        WHERE patient_visit.user_id = v_actor_id
          AND patient_visit.care_mode IS NOT NULL
          AND patient_visit.status IN ('upcoming', 'in_progress')
          AND patient_visit.scheduled_start_at < v_scheduled_end_at
          AND patient_visit.scheduled_end_at > p_scheduled_start_at
    ) THEN
        RAISE EXCEPTION 'Patient already has a scheduled visit in this time window';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            'book:' || p_hospital_id::TEXT || ':' || LOWER(v_specialty) || ':' || p_scheduled_start_at::TEXT,
            0
        )
    );

    v_selected_doctor_id := public.p_select_bookable_doctor(
        p_hospital_id,
        v_specialty,
        v_care_mode,
        p_scheduled_start_at,
        v_scheduled_end_at,
        NULL
    );

    IF v_selected_doctor_id IS NULL THEN
        RAISE EXCEPTION 'No clinician is available for this slot';
    END IF;

    SELECT doctor.*
    INTO STRICT v_doctor
    FROM public.doctors doctor
    WHERE doctor.id = v_selected_doctor_id;

    INSERT INTO public.visits (
        user_id,
        hospital_id,
        request_id,
        doctor_id,
        hospital_name,
        hospital,
        hospital_image,
        image,
        address,
        phone,
        doctor_name,
        doctor,
        doctor_image,
        specialty,
        date,
        time,
        type,
        status,
        notes,
        estimated_duration,
        meeting_link,
        care_mode,
        scheduled_start_at,
        scheduled_end_at,
        scheduled_timezone,
        booking_idempotency_key,
        lifecycle_state,
        lifecycle_updated_at
    )
    VALUES (
        v_actor_id,
        v_hospital.id,
        NULL,
        v_doctor.id,
        v_hospital.name,
        v_hospital.name,
        v_hospital.image,
        v_hospital.image,
        v_hospital.address,
        v_hospital.phone,
        v_doctor.name,
        v_doctor.name,
        v_doctor.image,
        v_doctor.specialization,
        TO_CHAR(v_local_start, 'YYYY-MM-DD'),
        TO_CHAR(v_local_start, 'HH12:MI AM'),
        CASE WHEN v_care_mode = 'telemedicine_async' THEN 'Telehealth' ELSE 'Consultation' END,
        'upcoming',
        NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
        CASE WHEN v_care_mode = 'telemedicine_async' THEN '30 mins' ELSE '45 mins' END,
        NULL,
        v_care_mode,
        p_scheduled_start_at,
        v_scheduled_end_at,
        v_hospital.timezone,
        p_idempotency_key,
        'scheduled',
        NOW()
    )
    RETURNING * INTO v_visit;

    IF v_care_mode = 'telemedicine_async' THEN
        v_room := public.ensure_async_consult_room(v_visit.id);
        v_room_id := NULLIF(v_room->>'id', '')::UUID;
    END IF;

    PERFORM public.emit_canonical_notification(
        p_event_key => 'scheduled_visit:' || v_visit.id::TEXT || ':booked:patient',
        p_recipient_user_id => v_visit.user_id,
        p_type => 'visit',
        p_title => 'Visit booked',
        p_message => 'Your visit with ' || COALESCE(NULLIF(BTRIM(v_visit.doctor_name), ''), 'your clinician')
            || ' is scheduled for ' || v_visit.date || ' at ' || v_visit.time || '.',
        p_priority => 'high',
        p_action_type => 'view_scheduled_visit',
        p_target_id => v_visit.id,
        p_action_data => jsonb_build_object('id', v_visit.id, 'visitId', v_visit.id),
        p_metadata => jsonb_build_object(
            'eventName', 'scheduled_visit.booked',
            'visitId', v_visit.id,
            'careMode', v_visit.care_mode,
            'scheduledStartAt', v_visit.scheduled_start_at
        ),
        p_icon => 'calendar-outline',
        p_color => 'success'
    );

    IF v_doctor.profile_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'scheduled_visit:' || v_visit.id::TEXT || ':booked:clinician',
            p_recipient_user_id => v_doctor.profile_id,
            p_type => 'visit',
            p_title => 'New scheduled visit',
            p_message => 'A patient booked a ' || REPLACE(v_care_mode, '_', ' ')
                || ' visit for ' || v_visit.date || ' at ' || v_visit.time || '.',
            p_priority => 'high',
            p_action_type => 'view_scheduled_visit',
            p_target_id => v_visit.id,
            p_action_data => jsonb_build_object('id', v_visit.id, 'visitId', v_visit.id),
            p_metadata => jsonb_build_object(
                'eventName', 'scheduled_visit.booked',
                'visitId', v_visit.id,
                'careMode', v_visit.care_mode,
                'scheduledStartAt', v_visit.scheduled_start_at
            ),
            p_icon => 'calendar-outline',
            p_color => 'info'
        );
    END IF;

    RETURN to_jsonb(v_visit) || jsonb_build_object(
        'communication_room_id', v_room_id,
        'idempotent', false
    );
END;
$$;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (transition_scheduled_visit function)
CREATE OR REPLACE FUNCTION public.transition_scheduled_visit(
    p_visit_id UUID,
    p_action TEXT,
    p_scheduled_start_at TIMESTAMPTZ DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_action TEXT := LOWER(BTRIM(COALESCE(p_action, '')));
    v_visit RECORD;
    v_duration INTERVAL;
    v_new_end_at TIMESTAMPTZ;
    v_local_start TIMESTAMP;
    v_local_end TIMESTAMP;
    v_new_doctor public.doctors%ROWTYPE;
    v_selected_doctor_id UUID;
    v_room_id UUID;
    v_is_patient BOOLEAN := false;
    v_is_clinician BOOLEAN := false;
    v_is_org_admin BOOLEAN := false;
    v_is_admin BOOLEAN := false;
    v_transition_event_id UUID := gen_random_uuid();
    v_previous_doctor_profile_id UUID;
    v_current_doctor_profile_id UUID;
    v_notification_title TEXT;
    v_notification_message TEXT;
BEGIN
    IF p_visit_id IS NULL OR v_action NOT IN ('cancel', 'reschedule', 'start', 'complete', 'no_show') THEN
        RAISE EXCEPTION 'Valid visit_id and action are required';
    END IF;

    IF p_reason IS NOT NULL AND char_length(p_reason) > 500 THEN
        RAISE EXCEPTION 'Reason cannot exceed 500 characters';
    END IF;

    SELECT
        visit.*,
        hospital.organization_id AS visit_org_id,
        hospital.timezone AS hospital_timezone,
        hospital.timezone_confirmed_at AS hospital_timezone_confirmed_at,
        hospital.booking_eligible AS hospital_booking_eligible,
        hospital.status AS hospital_status,
        doctor.profile_id AS doctor_profile_id
    INTO v_visit
    FROM public.visits visit
    JOIN public.hospitals hospital ON hospital.id = visit.hospital_id
    JOIN public.doctors doctor ON doctor.id = visit.doctor_id
    WHERE visit.id = p_visit_id
    FOR UPDATE OF visit
    FOR SHARE OF hospital;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheduled visit not found';
    END IF;

    IF v_visit.care_mode IS NULL OR v_visit.request_id IS NOT NULL THEN
        RAISE EXCEPTION 'Emergency and legacy visits use their existing lifecycle receivers';
    END IF;

    v_previous_doctor_profile_id := v_visit.doctor_profile_id;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = v_actor_id;
    END IF;

    v_is_patient := v_actor_id IS NOT NULL
        AND v_actor_id IS NOT DISTINCT FROM v_visit.user_id;
    v_is_clinician := v_actor_id IS NOT NULL
        AND v_visit.doctor_profile_id IS NOT NULL
        AND v_actor_id = v_visit.doctor_profile_id;
    v_is_admin := v_is_service_role OR COALESCE(v_actor_role = 'admin', false);
    v_is_org_admin := COALESCE(
        v_actor_role = 'org_admin'
        AND v_actor_org_id IS NOT NULL
        AND v_actor_org_id = v_visit.visit_org_id,
        false
    );

    IF v_action = 'cancel' THEN
        IF v_visit.status <> 'upcoming' THEN
            RAISE EXCEPTION 'Only an upcoming visit can be cancelled';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_patient) THEN
            RAISE EXCEPTION 'Unauthorized: cancellation outside actor scope';
        END IF;

        IF v_is_patient AND NOT (v_is_admin OR v_is_org_admin)
           AND v_visit.scheduled_start_at <= NOW() + INTERVAL '2 hours' THEN
            RAISE EXCEPTION 'Patient cancellation closes 2 hours before the visit';
        END IF;

        UPDATE public.visits
        SET status = 'cancelled',
            lifecycle_state = 'cancelled',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

        UPDATE public.emergency_chat_rooms
        SET status = 'archived',
            archived_at = COALESCE(archived_at, NOW()),
            updated_at = NOW()
        WHERE channel_type = 'telemedicine_async'
          AND visit_id = p_visit_id
          AND status <> 'archived';

    ELSIF v_action = 'reschedule' THEN
        IF v_visit.status <> 'upcoming' OR p_scheduled_start_at IS NULL THEN
            RAISE EXCEPTION 'An upcoming visit and new start time are required';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_patient) THEN
            RAISE EXCEPTION 'Unauthorized: reschedule outside actor scope';
        END IF;

        IF v_is_patient AND NOT (v_is_admin OR v_is_org_admin)
           AND v_visit.scheduled_start_at <= NOW() + INTERVAL '2 hours' THEN
            RAISE EXCEPTION 'Patient rescheduling closes 2 hours before the visit';
        END IF;

        IF NULLIF(BTRIM(COALESCE(v_visit.specialty, '')), '') IS NULL THEN
            RAISE EXCEPTION 'Scheduled visit specialty is unavailable';
        END IF;

        IF v_visit.hospital_timezone_confirmed_at IS NULL THEN
            RAISE EXCEPTION 'Facility timezone is not confirmed';
        END IF;

        IF v_visit.hospital_booking_eligible IS DISTINCT FROM true
           OR v_visit.hospital_status <> 'available' THEN
            RAISE EXCEPTION 'Facility is not available for rescheduling';
        END IF;

        v_duration := public.p_scheduled_visit_duration(v_visit.care_mode);
        v_new_end_at := p_scheduled_start_at + v_duration;
        v_local_start := p_scheduled_start_at AT TIME ZONE v_visit.hospital_timezone;
        v_local_end := v_new_end_at AT TIME ZONE v_visit.hospital_timezone;

        IF p_scheduled_start_at < NOW() + INTERVAL '5 minutes'
           OR p_scheduled_start_at > NOW() + INTERVAL '90 days'
           OR v_local_start::DATE <> v_local_end::DATE
           OR MOD(EXTRACT(MINUTE FROM v_local_start)::INTEGER, 15) <> 0
           OR EXTRACT(SECOND FROM v_local_start) <> 0 THEN
            RAISE EXCEPTION 'New start must be a same-day 15-minute slot within 90 days';
        END IF;

        PERFORM pg_advisory_xact_lock(
            hashtextextended('scheduled-patient:' || v_visit.user_id::TEXT, 0)
        );

        IF EXISTS (
            SELECT 1
            FROM public.visits patient_visit
            WHERE patient_visit.user_id = v_visit.user_id
              AND patient_visit.care_mode IS NOT NULL
              AND patient_visit.status IN ('upcoming', 'in_progress')
              AND patient_visit.id IS DISTINCT FROM p_visit_id
              AND patient_visit.scheduled_start_at < v_new_end_at
              AND patient_visit.scheduled_end_at > p_scheduled_start_at
        ) THEN
            RAISE EXCEPTION 'Patient already has a scheduled visit in this time window';
        END IF;

        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                'book:' || v_visit.hospital_id::TEXT || ':' || LOWER(v_visit.specialty) || ':' || p_scheduled_start_at::TEXT,
                0
            )
        );

        v_selected_doctor_id := public.p_select_bookable_doctor(
            v_visit.hospital_id,
            v_visit.specialty,
            v_visit.care_mode,
            p_scheduled_start_at,
            v_new_end_at,
            p_visit_id
        );

        IF v_selected_doctor_id IS NULL THEN
            RAISE EXCEPTION 'No clinician is available for the new slot';
        END IF;

        SELECT doctor.*
        INTO STRICT v_new_doctor
        FROM public.doctors doctor
        WHERE doctor.id = v_selected_doctor_id;

        SELECT room.id
        INTO v_room_id
        FROM public.emergency_chat_rooms room
        WHERE room.channel_type = 'telemedicine_async'
          AND room.visit_id = p_visit_id
        FOR UPDATE;

        UPDATE public.visits
        SET doctor_id = v_new_doctor.id,
            doctor_name = v_new_doctor.name,
            doctor = v_new_doctor.name,
            doctor_image = v_new_doctor.image,
            scheduled_start_at = p_scheduled_start_at,
            scheduled_end_at = v_new_end_at,
            scheduled_timezone = v_visit.hospital_timezone,
            date = TO_CHAR(v_local_start, 'YYYY-MM-DD'),
            time = TO_CHAR(v_local_start, 'HH12:MI AM'),
            lifecycle_state = 'rescheduled',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

        IF v_room_id IS NOT NULL
           AND v_visit.doctor_profile_id IS DISTINCT FROM v_new_doctor.profile_id THEN
            UPDATE public.emergency_chat_participants
            SET left_at = COALESCE(left_at, NOW()),
                updated_at = NOW()
            WHERE room_id = v_room_id
              AND user_id = v_visit.doctor_profile_id
              AND left_at IS NULL;

            INSERT INTO public.emergency_chat_participants (
                room_id,
                user_id,
                role,
                display_name_snapshot
            )
            VALUES (
                v_room_id,
                v_new_doctor.profile_id,
                'provider',
                v_new_doctor.name
            )
            ON CONFLICT (room_id, user_id) DO UPDATE
            SET role = 'provider',
                display_name_snapshot = EXCLUDED.display_name_snapshot,
                left_at = NULL,
                updated_at = NOW();
        END IF;

    ELSIF v_action = 'start' THEN
        IF v_visit.status <> 'upcoming' THEN
            RAISE EXCEPTION 'Only an upcoming visit can be started';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_clinician) THEN
            RAISE EXCEPTION 'Unauthorized: assigned clinician or schedule administrator required';
        END IF;

        IF NOW() < v_visit.scheduled_start_at - INTERVAL '30 minutes'
           OR NOW() > v_visit.scheduled_end_at + INTERVAL '30 minutes' THEN
            RAISE EXCEPTION 'Visit can start only within its clinical window';
        END IF;

        UPDATE public.visits
        SET status = 'in_progress',
            lifecycle_state = 'in_progress',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

    ELSIF v_action = 'complete' THEN
        IF v_visit.status <> 'in_progress' THEN
            RAISE EXCEPTION 'Only an in-progress visit can be completed';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_clinician) THEN
            RAISE EXCEPTION 'Unauthorized: assigned clinician or schedule administrator required';
        END IF;

        UPDATE public.visits
        SET status = 'completed',
            lifecycle_state = 'completed',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

        UPDATE public.emergency_chat_rooms
        SET status = 'archived',
            archived_at = COALESCE(archived_at, NOW()),
            updated_at = NOW()
        WHERE channel_type = 'telemedicine_async'
          AND visit_id = p_visit_id
          AND status <> 'archived';

    ELSE
        IF v_visit.status <> 'upcoming' OR NOW() < v_visit.scheduled_start_at + INTERVAL '15 minutes' THEN
            RAISE EXCEPTION 'No-show is available 15 minutes after an upcoming visit starts';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_clinician) THEN
            RAISE EXCEPTION 'Unauthorized: assigned clinician or schedule administrator required';
        END IF;

        UPDATE public.visits
        SET status = 'cancelled',
            lifecycle_state = 'no_show',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

        UPDATE public.emergency_chat_rooms
        SET status = 'archived',
            archived_at = COALESCE(archived_at, NOW()),
            updated_at = NOW()
        WHERE channel_type = 'telemedicine_async'
          AND visit_id = p_visit_id
          AND status <> 'archived';
    END IF;

    INSERT INTO public.user_activity (
        user_id,
        action,
        entity_type,
        entity_id,
        description,
        metadata
    )
    VALUES (
        v_actor_id,
        'scheduled_visit.' || v_action,
        'visit',
        p_visit_id,
        NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
        jsonb_build_object(
            'service_role', v_is_service_role,
            'previous_status', v_visit.status,
            'new_start_at', p_scheduled_start_at,
            'transition_event_id', v_transition_event_id
        )
    );

    SELECT visit.*
    INTO v_visit
    FROM public.visits visit
    WHERE visit.id = p_visit_id;

    SELECT doctor.profile_id
    INTO v_current_doctor_profile_id
    FROM public.doctors doctor
    WHERE doctor.id = v_visit.doctor_id;

    v_notification_title := CASE v_action
        WHEN 'cancel' THEN 'Visit cancelled'
        WHEN 'reschedule' THEN 'Visit rescheduled'
        WHEN 'start' THEN 'Visit started'
        WHEN 'complete' THEN 'Visit completed'
        ELSE 'Visit marked as missed'
    END;
    v_notification_message := CASE v_action
        WHEN 'cancel' THEN 'This scheduled visit was cancelled.'
        WHEN 'reschedule' THEN 'This visit has a new appointment time.'
        WHEN 'start' THEN 'The clinician started this scheduled visit.'
        WHEN 'complete' THEN 'The clinician completed this scheduled visit.'
        ELSE 'This scheduled visit was marked as a no-show.'
    END;

    IF v_visit.user_id IS NOT NULL AND v_actor_id IS DISTINCT FROM v_visit.user_id THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'scheduled_visit:' || p_visit_id::TEXT
                || ':transition:' || v_transition_event_id::TEXT,
            p_recipient_user_id => v_visit.user_id,
            p_type => 'visit',
            p_title => v_notification_title,
            p_message => v_notification_message,
            p_priority => CASE WHEN v_action IN ('cancel', 'no_show') THEN 'high' ELSE 'normal' END,
            p_action_type => 'view_scheduled_visit',
            p_target_id => p_visit_id,
            p_action_data => jsonb_build_object('id', p_visit_id, 'visitId', p_visit_id),
            p_metadata => jsonb_build_object(
                'eventName', 'scheduled_visit.' || v_action,
                'visitId', p_visit_id,
                'transitionEventId', v_transition_event_id,
                'scheduledStartAt', v_visit.scheduled_start_at
            ),
            p_icon => 'calendar-outline',
            p_color => CASE WHEN v_action IN ('cancel', 'no_show') THEN 'warning' ELSE 'info' END
        );
    END IF;

    IF v_current_doctor_profile_id IS NOT NULL
       AND v_actor_id IS DISTINCT FROM v_current_doctor_profile_id THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'scheduled_visit:' || p_visit_id::TEXT
                || ':transition:' || v_transition_event_id::TEXT,
            p_recipient_user_id => v_current_doctor_profile_id,
            p_type => 'visit',
            p_title => v_notification_title,
            p_message => v_notification_message,
            p_priority => CASE WHEN v_action IN ('cancel', 'no_show') THEN 'high' ELSE 'normal' END,
            p_action_type => 'view_scheduled_visit',
            p_target_id => p_visit_id,
            p_action_data => jsonb_build_object('id', p_visit_id, 'visitId', p_visit_id),
            p_metadata => jsonb_build_object(
                'eventName', 'scheduled_visit.' || v_action,
                'visitId', p_visit_id,
                'transitionEventId', v_transition_event_id,
                'scheduledStartAt', v_visit.scheduled_start_at
            ),
            p_icon => 'calendar-outline',
            p_color => CASE WHEN v_action IN ('cancel', 'no_show') THEN 'warning' ELSE 'info' END
        );
    END IF;

    IF v_action = 'reschedule'
       AND v_previous_doctor_profile_id IS NOT NULL
       AND v_previous_doctor_profile_id IS DISTINCT FROM v_current_doctor_profile_id
       AND v_actor_id IS DISTINCT FROM v_previous_doctor_profile_id THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'scheduled_visit:' || p_visit_id::TEXT
                || ':transition:' || v_transition_event_id::TEXT || ':reassigned',
            p_recipient_user_id => v_previous_doctor_profile_id,
            p_type => 'visit',
            p_title => 'Visit reassigned',
            p_message => 'A rescheduled visit is no longer assigned to you.',
            p_priority => 'normal',
            p_action_type => 'view_scheduled_visit',
            p_target_id => p_visit_id,
            p_action_data => jsonb_build_object('id', p_visit_id, 'visitId', p_visit_id),
            p_metadata => jsonb_build_object(
                'eventName', 'scheduled_visit.reassigned',
                'visitId', p_visit_id,
                'transitionEventId', v_transition_event_id
            ),
            p_icon => 'calendar-outline',
            p_color => 'info'
        );
    END IF;

    RETURN to_jsonb(v_visit);
END;
$$;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (send_async_consult_message function)
CREATE OR REPLACE FUNCTION public.send_async_consult_message(
    p_room_id UUID,
    p_body TEXT,
    p_kind TEXT DEFAULT 'text',
    p_client_message_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_attachment_storage_path TEXT DEFAULT NULL,
    p_attachment_mime_type TEXT DEFAULT NULL,
    p_attachment_size_bytes BIGINT DEFAULT NULL,
    p_attachment_duration_ms INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_kind TEXT := LOWER(BTRIM(COALESCE(p_kind, 'text')));
    v_body TEXT := BTRIM(COALESCE(p_body, ''));
    v_client_message_id TEXT := NULLIF(BTRIM(COALESCE(p_client_message_id, '')), '');
    v_attachment_path TEXT := NULLIF(BTRIM(COALESCE(p_attachment_storage_path, '')), '');
    v_attachment_mime TEXT := LOWER(NULLIF(BTRIM(COALESCE(p_attachment_mime_type, '')), ''));
    v_sender_role TEXT;
    v_visit_id UUID;
    v_patient_id UUID;
    v_doctor_profile_id UUID;
    v_recipient_id UUID;
    v_room RECORD;
    v_message public.emergency_chat_messages%ROWTYPE;
    v_object_size BIGINT;
    v_object_mime TEXT;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_room_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: consult room outside actor scope';
    END IF;

    IF v_kind NOT IN ('text', 'image', 'video') THEN
        RAISE EXCEPTION 'Unsupported consult message kind';
    END IF;

    IF char_length(v_body) < 1 OR char_length(v_body) > 1000 THEN
        RAISE EXCEPTION 'Message must be between 1 and 1000 characters';
    END IF;

    IF v_client_message_id IS NOT NULL AND char_length(v_client_message_id) > 120 THEN
        RAISE EXCEPTION 'Client message id cannot exceed 120 characters';
    END IF;

    IF p_metadata IS NULL
       OR jsonb_typeof(p_metadata) <> 'object'
       OR octet_length(p_metadata::TEXT) > 4096 THEN
        RAISE EXCEPTION 'Message metadata must be an object no larger than 4096 bytes';
    END IF;

    SELECT room.visit_id
    INTO v_visit_id
    FROM public.emergency_chat_rooms room
    WHERE room.id = p_room_id
      AND room.channel_type = 'telemedicine_async';

    IF NOT FOUND OR v_visit_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: consult room outside actor scope';
    END IF;

    SELECT visit.user_id, doctor.profile_id
    INTO v_patient_id, v_doctor_profile_id
    FROM public.visits visit
    LEFT JOIN public.doctors doctor ON doctor.id = visit.doctor_id
    WHERE visit.id = v_visit_id
      AND visit.care_mode = 'telemedicine_async'
      AND visit.request_id IS NULL
      AND visit.status IN ('upcoming', 'in_progress')
    FOR UPDATE OF visit;

    IF NOT FOUND
       OR (
           v_actor_id IS DISTINCT FROM v_patient_id
           AND v_actor_id IS DISTINCT FROM v_doctor_profile_id
       ) THEN
        RAISE EXCEPTION 'Unauthorized: consult room outside actor scope';
    END IF;

    SELECT room.status, room.visit_id
    INTO v_room
    FROM public.emergency_chat_rooms room
    WHERE room.id = p_room_id
      AND room.channel_type = 'telemedicine_async'
      AND room.visit_id = v_visit_id
    FOR UPDATE;

    IF NOT FOUND OR v_room.status <> 'active' THEN
        RAISE EXCEPTION 'Consult room is not active';
    END IF;

    SELECT participant.role
    INTO v_sender_role
    FROM public.emergency_chat_participants participant
    WHERE participant.room_id = p_room_id
      AND participant.user_id = v_actor_id
      AND participant.left_at IS NULL
    FOR UPDATE;

    IF v_sender_role IS NULL THEN
        PERFORM public.ensure_async_consult_room(v_room.visit_id);

        SELECT participant.role
        INTO v_sender_role
        FROM public.emergency_chat_participants participant
        WHERE participant.room_id = p_room_id
          AND participant.user_id = v_actor_id
          AND participant.left_at IS NULL
        FOR UPDATE;
    END IF;

    IF v_sender_role IS NULL OR v_sender_role NOT IN ('patient', 'provider') THEN
        RAISE EXCEPTION 'Only the patient or assigned clinician can send consult messages';
    END IF;

    IF v_client_message_id IS NOT NULL THEN
        SELECT message.*
        INTO v_message
        FROM public.emergency_chat_messages message
        WHERE message.room_id = p_room_id
          AND message.sender_id = v_actor_id
          AND message.client_message_id = v_client_message_id
        LIMIT 1;

        IF v_message.id IS NOT NULL THEN
            IF v_message.kind IS DISTINCT FROM v_kind
               OR v_message.body IS DISTINCT FROM v_body
               OR v_message.metadata IS DISTINCT FROM p_metadata
               OR v_message.attachment_storage_path IS DISTINCT FROM v_attachment_path
               OR v_message.attachment_mime_type IS DISTINCT FROM v_attachment_mime
               OR v_message.attachment_size_bytes IS DISTINCT FROM p_attachment_size_bytes
               OR v_message.attachment_duration_ms IS DISTINCT FROM p_attachment_duration_ms
               OR v_message.ai_assisted IS DISTINCT FROM false THEN
                RAISE EXCEPTION 'Client message id was already used for another message';
            END IF;
            RETURN to_jsonb(v_message);
        END IF;
    END IF;

    IF v_kind = 'text' THEN
        IF v_attachment_path IS NOT NULL
           OR v_attachment_mime IS NOT NULL
           OR p_attachment_size_bytes IS NOT NULL
           OR p_attachment_duration_ms IS NOT NULL THEN
            RAISE EXCEPTION 'Text messages cannot include attachment fields';
        END IF;
    ELSE
        IF v_attachment_path IS NULL
           OR v_attachment_mime IS NULL
           OR p_attachment_size_bytes IS NULL THEN
            RAISE EXCEPTION 'Attachment path, MIME type, and size are required';
        END IF;

        IF v_attachment_path NOT LIKE (
            'telemedicine/' || p_room_id::TEXT || '/' || v_actor_id::TEXT || '/%'
        ) THEN
            RAISE EXCEPTION 'Attachment path does not belong to this room and sender';
        END IF;

        SELECT
            CASE
                WHEN COALESCE(object.metadata->>'size', '') ~ '^[0-9]+$'
                THEN (object.metadata->>'size')::BIGINT
                ELSE NULL
            END,
            LOWER(NULLIF(object.metadata->>'mimetype', ''))
        INTO v_object_size, v_object_mime
        FROM storage.objects object
        WHERE object.bucket_id = 'documents'
          AND object.name = v_attachment_path
        FOR SHARE;

        IF NOT FOUND OR v_object_size IS NULL OR v_object_size <> p_attachment_size_bytes THEN
            RAISE EXCEPTION 'Attachment object size could not be verified';
        END IF;

        IF v_object_mime IS NULL OR v_object_mime <> v_attachment_mime THEN
            RAISE EXCEPTION 'Attachment MIME type could not be verified';
        END IF;

        IF v_kind = 'image' THEN
            IF v_attachment_mime NOT IN ('image/jpeg', 'image/png', 'image/webp')
               OR p_attachment_size_bytes NOT BETWEEN 1 AND 10485760
               OR p_attachment_duration_ms IS NOT NULL THEN
                RAISE EXCEPTION 'Image attachment is outside the supported contract';
            END IF;
        ELSE
            IF v_attachment_mime NOT IN ('video/mp4', 'video/webm', 'video/quicktime')
               OR p_attachment_size_bytes NOT BETWEEN 1 AND 26214400
               OR p_attachment_duration_ms IS NULL
               OR p_attachment_duration_ms NOT BETWEEN 1 AND 30000 THEN
                RAISE EXCEPTION 'Video attachment is outside the supported contract';
            END IF;
        END IF;
    END IF;

    INSERT INTO public.emergency_chat_messages (
        room_id,
        sender_id,
        sender_role,
        kind,
        body,
        client_message_id,
        metadata,
        attachment_storage_path,
        attachment_mime_type,
        attachment_size_bytes,
        attachment_duration_ms,
        ai_assisted
    )
    VALUES (
        p_room_id,
        v_actor_id,
        v_sender_role,
        v_kind,
        v_body,
        v_client_message_id,
        p_metadata,
        v_attachment_path,
        v_attachment_mime,
        p_attachment_size_bytes,
        p_attachment_duration_ms,
        false
    )
    RETURNING * INTO v_message;

    UPDATE public.emergency_chat_rooms
    SET last_message_at = v_message.created_at,
        updated_at = NOW()
    WHERE id = p_room_id;

    UPDATE public.emergency_chat_participants
    SET last_read_message_id = v_message.id,
        last_read_at = v_message.created_at,
        updated_at = NOW()
    WHERE room_id = p_room_id
      AND user_id = v_actor_id
      AND left_at IS NULL;

    v_recipient_id := CASE
        WHEN v_actor_id = v_patient_id THEN v_doctor_profile_id
        ELSE v_patient_id
    END;

    IF v_recipient_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'async_consult_message:' || v_message.id::TEXT || ':received',
            p_recipient_user_id => v_recipient_id,
            p_type => 'visit',
            p_title => 'New consult message',
            p_message => CASE v_kind
                WHEN 'image' THEN 'A new image was shared in your visit.'
                WHEN 'video' THEN 'A new video was shared in your visit.'
                ELSE 'A new message was sent in your visit.'
            END,
            p_priority => 'high',
            p_action_type => 'open_async_consult',
            p_target_id => v_visit_id,
            p_action_data => jsonb_build_object(
                'id', v_visit_id,
                'visitId', v_visit_id,
                'roomId', p_room_id,
                'messageId', v_message.id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'async_consult_message.received',
                'visitId', v_visit_id,
                'roomId', p_room_id,
                'messageId', v_message.id,
                'kind', v_kind
            ),
            p_icon => 'chatbubble-outline',
            p_color => 'info'
        );
    END IF;

    RETURN to_jsonb(v_message);
END;
$$;

COMMIT;
