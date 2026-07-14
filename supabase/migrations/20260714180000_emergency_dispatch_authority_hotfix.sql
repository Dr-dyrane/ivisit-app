-- Permanent authority and input-hardening hotfix for emergency dispatch.
-- Source digest: ce1d30962b4ad1a6
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';

-- Source: supabase/migrations/20260219000000_infra.sql (exec_sql function)
-- 🛠️ ADMIN UTILITIES
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Only allow service_role
    IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;
    
    EXECUTE sql;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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
    SELECT actor.role, actor.organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles actor
    WHERE actor.id = v_actor_id;

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


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (report_responder_telemetry function)
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
    v_ambulance_id UUID;
    v_request_id UUID;
    v_assignment_id UUID;
    v_sequence BIGINT;
    v_observed_at TIMESTAMPTZ;
    v_heading DOUBLE PRECISION;
    v_accuracy DOUBLE PRECISION;
    v_location GEOMETRY;
    v_now TIMESTAMPTZ := NOW();
    v_lease_expires_at TIMESTAMPTZ;
    v_ambulance public.ambulances%ROWTYPE;
    v_staffing public.ambulance_staff_assignments%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_request public.emergency_requests%ROWTYPE;
BEGIN
    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry payload');
    END IF;

    BEGIN
        v_ambulance_id := NULLIF(p_payload->>'ambulance_id', '')::UUID;
        v_request_id := NULLIF(p_payload->>'request_id', '')::UUID;
        v_assignment_id := NULLIF(p_payload->>'assignment_id', '')::UUID;
        v_sequence := NULLIF(p_payload->>'sequence', '')::BIGINT;
        v_observed_at := NULLIF(p_payload->>'observed_at', '')::TIMESTAMPTZ;
        v_heading := NULLIF(p_payload->>'heading', '')::DOUBLE PRECISION;
        v_accuracy := NULLIF(p_payload->>'accuracy_meters', '')::DOUBLE PRECISION;
        v_location := public.jsonb_to_point_geometry(p_payload->'location');
    EXCEPTION
        WHEN invalid_text_representation
          OR invalid_datetime_format
          OR datetime_field_overflow
          OR numeric_value_out_of_range THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry payload');
    END;

    IF v_ambulance_id IS NULL OR v_sequence IS NULL OR v_sequence <= 0
       OR v_observed_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry payload');
    END IF;

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


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (console_create_emergency_request function)
-- END EMERGENCY_RESPONDER_READINESS_RPCS


-- BEGIN CONSOLE_EMERGENCY_CREATE_VISIT_RPC
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

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
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
    -- Console creation establishes request intent only. Lifecycle and payment
    -- truth must be advanced by their canonical backend receivers.
    v_status := 'pending_approval';
    v_total_cost := COALESCE(NULLIF(p_payload->>'total_cost', '')::NUMERIC, 0);
    v_payment_status := 'pending';
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

    SELECT er.status, er.payment_status, er.hospital_id,
           COALESCE(er.dispatch_organization_id, h.organization_id), er.ambulance_id
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

    SELECT a.status, a.hospital_id, COALESCE(a.organization_id, h.organization_id),
           a.profile_id, a.current_call, a.type, a.vehicle_number, p.full_name, p.phone
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

    IF NOT v_is_service_role AND v_actor_id IS NULL THEN
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

    SELECT er.status, er.hospital_id,
           COALESCE(er.dispatch_organization_id, h.organization_id), er.ambulance_id
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

    SELECT a.status, a.hospital_id, COALESCE(a.organization_id, h.organization_id),
           a.profile_id, a.current_call, a.type, a.vehicle_number, p.full_name, p.phone
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

        IF v_req_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_req_org_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_amb_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_amb_org_id THEN
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

REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
COMMIT;
