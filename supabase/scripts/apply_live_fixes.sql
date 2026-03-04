-- 🏯 ID BEAUTIFICATION & RESOLUTION REFINEMENTS
-- This script applies the latest refinements for Role-Based ID Beautification 
-- to the live database, ensuring parity with the source migrations.

BEGIN;

-- 1. Update the Stamping Function (Role-Aware)
CREATE OR REPLACE FUNCTION public.stamp_entity_display_id()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_role TEXT;
    v_type TEXT;
BEGIN
    -- Determine Prefix Based on Table and Role
    CASE TG_TABLE_NAME
        WHEN 'profiles' THEN 
            -- Granular User Beautification
            v_role := NEW.role;
            v_type := NEW.provider_type;
            
            IF v_role = 'admin' THEN v_prefix := 'ADM';
            ELSIF v_role = 'patient' THEN v_prefix := 'PAT';
            ELSIF v_role = 'dispatcher' THEN v_prefix := 'DPC';
            ELSIF v_role = 'org_admin' THEN v_prefix := 'OAD';
            ELSIF v_role = 'provider' THEN
                CASE v_type
                    WHEN 'doctor' THEN v_prefix := 'DOC';
                    WHEN 'driver' THEN v_prefix := 'DRV';
                    WHEN 'paramedic' THEN v_prefix := 'PMD';
                    WHEN 'ambulance_service' THEN v_prefix := 'AMS';
                    WHEN 'pharmacy' THEN v_prefix := 'PHR';
                    WHEN 'clinic' THEN v_prefix := 'CLN';
                    ELSE v_prefix := 'PRO';
                END CASE;
            ELSE v_prefix := 'USR';
            END IF;
            
        WHEN 'organizations' THEN v_prefix := 'ORG';
        WHEN 'hospitals' THEN v_prefix := 'HSP';
        WHEN 'doctors' THEN v_prefix := 'DOC';
        WHEN 'ambulances' THEN v_prefix := 'AMB';
        WHEN 'emergency_requests' THEN v_prefix := 'REQ';
        WHEN 'visits' THEN v_prefix := 'VIST';
        WHEN 'payments' THEN v_prefix := 'PAY';
        WHEN 'notifications' THEN v_prefix := 'NTF';
        WHEN 'patient_wallets' THEN v_prefix := 'WLT';
        WHEN 'organization_wallets' THEN v_prefix := 'OWL';
        ELSE v_prefix := 'ID';
    END CASE;

    -- Generate and set Display ID on current record
    IF TG_OP = 'INSERT' AND NEW.display_id IS NULL THEN
        NEW.display_id := public.generate_display_id(v_prefix);
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' THEN
        -- Keep profile display IDs aligned with role/type prefix as account role evolves.
        IF NEW.display_id IS NULL OR LEFT(NEW.display_id, 3) != v_prefix THEN
            NEW.display_id := public.generate_display_id(v_prefix);
        END IF;
    END IF;

    -- Sync to Central Registry
    IF TG_OP = 'INSERT' THEN
        -- Map plural table names to canonical id_mappings entity_type values.
        v_type := CASE
            WHEN TG_TABLE_NAME = 'profiles' THEN COALESCE(v_role, 'patient')
            WHEN TG_TABLE_NAME = 'organizations' THEN 'organization'
            WHEN TG_TABLE_NAME = 'hospitals' THEN 'hospital'
            WHEN TG_TABLE_NAME = 'doctors' THEN 'doctor'
            WHEN TG_TABLE_NAME = 'ambulances' THEN 'ambulance'
            WHEN TG_TABLE_NAME = 'emergency_requests' THEN 'emergency_request'
            WHEN TG_TABLE_NAME = 'visits' THEN 'visit'
            WHEN TG_TABLE_NAME = 'payments' THEN 'payment'
            WHEN TG_TABLE_NAME = 'notifications' THEN 'notification'
            WHEN TG_TABLE_NAME IN ('patient_wallets', 'organization_wallets') THEN 'wallet'
            ELSE 'patient'
        END;

        INSERT INTO public.id_mappings (entity_id, display_id, entity_type)
        VALUES (NEW.id, NEW.display_id, v_type)
        ON CONFLICT (display_id) DO NOTHING;
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
        v_type := COALESCE(NEW.role, 'patient');
        UPDATE public.id_mappings
        SET display_id = NEW.display_id,
            entity_type = v_type
        WHERE entity_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the Resolver (Universal)
CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID AS $$
DECLARE
    v_prefix TEXT;
    v_id UUID;
BEGIN
    v_prefix := SPLIT_PART(p_display_id, '-', 1);
    
    CASE v_prefix
        WHEN 'PAT', 'ADM', 'DPC', 'OAD', 'PRO', 'DOC', 'DRV', 'PMD', 'AMS', 'PHR', 'CLN', 'USR' THEN 
            SELECT id INTO v_id FROM public.profiles WHERE display_id = p_display_id;
        WHEN 'HSP' THEN SELECT id INTO v_id FROM public.hospitals WHERE display_id = p_display_id;
        WHEN 'ORG' THEN SELECT id INTO v_id FROM public.organizations WHERE display_id = p_display_id;
        WHEN 'AMB' THEN SELECT id INTO v_id FROM public.ambulances WHERE display_id = p_display_id;
        WHEN 'REQ' THEN SELECT id INTO v_id FROM public.emergency_requests WHERE display_id = p_display_id;
        WHEN 'VIST' THEN SELECT id INTO v_id FROM public.visits WHERE display_id = p_display_id;
        WHEN 'PAY' THEN SELECT id INTO v_id FROM public.payments WHERE display_id = p_display_id;
        WHEN 'NTF' THEN SELECT id INTO v_id FROM public.notifications WHERE display_id = p_display_id;
        WHEN 'WLT' THEN SELECT id INTO v_id FROM public.patient_wallets WHERE display_id = p_display_id;
        WHEN 'OWL' THEN SELECT id INTO v_id FROM public.organization_wallets WHERE display_id = p_display_id;
        ELSE 
            SELECT entity_id INTO v_id FROM public.id_mappings WHERE display_id = p_display_id;
    END CASE;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Ensure Triggers are Active on Missing Modules
DO $$
BEGIN
    -- Finance Triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_pay_display_id') THEN
        CREATE TRIGGER stamp_pay_display_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_pat_wallet_display_id') THEN
        CREATE TRIGGER stamp_pat_wallet_display_id BEFORE INSERT ON public.patient_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_org_wallet_display_id') THEN
        CREATE TRIGGER stamp_org_wallet_display_id BEFORE INSERT ON public.organization_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;

    -- Ops Triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_ntf_display_id') THEN
        CREATE TRIGGER stamp_ntf_display_id BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
END $$;

COMMIT;

-- 10. Canonical status mutation reconciliation for legacy emergency RPCs (non-destructive)
BEGIN;

CREATE OR REPLACE FUNCTION public.canonicalize_emergency_status(
    p_status TEXT,
    p_default TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_status TEXT := LOWER(COALESCE(NULLIF(TRIM(p_status), ''), ''));
    v_default TEXT := LOWER(COALESCE(NULLIF(TRIM(p_default), ''), ''));
BEGIN
    IF v_status = '' THEN
        RETURN NULLIF(v_default, '');
    END IF;

    RETURN CASE v_status
        WHEN 'pending' THEN 'pending_approval'
        WHEN 'pending_approval' THEN 'pending_approval'
        WHEN 'dispatched' THEN 'in_progress'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'assigned' THEN 'accepted'
        WHEN 'responding' THEN 'accepted'
        WHEN 'en_route' THEN 'accepted'
        WHEN 'accepted' THEN 'accepted'
        WHEN 'arrived' THEN 'arrived'
        WHEN 'resolved' THEN 'completed'
        WHEN 'completed' THEN 'completed'
        WHEN 'canceled' THEN 'cancelled'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'declined' THEN 'payment_declined'
        WHEN 'payment_declined' THEN 'payment_declined'
        ELSE v_status
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.set_emergency_transition_context(
    p_source TEXT,
    p_reason TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT auth.uid(),
    p_actor_role TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_allow_status_write BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
DECLARE
    v_actor_role TEXT := NULLIF(TRIM(COALESCE(p_actor_role, '')), '');
BEGIN
    IF p_allow_status_write THEN
        PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    END IF;

    IF p_actor_id IS NOT NULL THEN
        PERFORM set_config('ivisit.transition_actor_id', p_actor_id::TEXT, true);
    END IF;

    IF v_actor_role IS NULL AND p_actor_id IS NOT NULL THEN
        SELECT role
        INTO v_actor_role
        FROM public.profiles
        WHERE id = p_actor_id;
    END IF;

    PERFORM set_config('ivisit.transition_actor_role', COALESCE(v_actor_role, 'unknown'), true);
    PERFORM set_config('ivisit.transition_source', COALESCE(NULLIF(TRIM(p_source), ''), 'unspecified_source'), true);
    PERFORM set_config('ivisit.transition_reason', COALESCE(NULLIF(TRIM(p_reason), ''), 'status_transition'), true);
    PERFORM set_config('ivisit.transition_metadata', COALESCE(p_metadata, '{}'::JSONB)::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

    IF v_req_status <> 'accepted'
       AND NOT public.is_valid_emergency_status_transition(v_req_status, 'accepted') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Illegal emergency status transition',
            'code', 'INVALID_TRANSITION',
            'from_status', v_req_status,
            'to_status', 'accepted'
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

    PERFORM public.set_emergency_transition_context(
        p_source => v_transition_source,
        p_reason => v_transition_reason,
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => v_transition_metadata || jsonb_build_object(
            'request_id', p_emergency_request_id,
            'ambulance_id', p_ambulance_id,
            'priority', p_priority,
            'previous_status', v_req_status,
            'previous_ambulance_id', v_req_current_ambulance_id
        ),
        p_allow_status_write => true
    );

    UPDATE public.ambulances
    SET status = 'on_trip',
        current_call = p_emergency_request_id,
        updated_at = NOW()
    WHERE id = p_ambulance_id;

    IF v_req_current_ambulance_id IS NOT NULL
       AND v_req_current_ambulance_id IS DISTINCT FROM p_ambulance_id THEN
        UPDATE public.ambulances
        SET status = 'available',
            current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = v_req_current_ambulance_id
          AND (current_call = p_emergency_request_id OR current_call IS NULL);
    END IF;

    UPDATE public.emergency_requests er
    SET ambulance_id = p_ambulance_id,
        status = 'accepted',
        responder_id = COALESCE(v_amb_profile_id, er.responder_id),
        responder_name = COALESCE(
            NULLIF(BTRIM(v_driver_name), ''),
            NULLIF(BTRIM(v_amb_plate), ''),
            NULLIF(BTRIM(v_amb_type), ''),
            NULLIF(BTRIM(er.responder_name), ''),
            'Responder'
        ),
        responder_phone = COALESCE(
            NULLIF(BTRIM(v_driver_phone), ''),
            NULLIF(BTRIM(er.responder_phone), '')
        ),
        responder_vehicle_type = COALESCE(
            NULLIF(BTRIM(v_amb_type), ''),
            NULLIF(BTRIM(er.responder_vehicle_type), '')
        ),
        responder_vehicle_plate = COALESCE(
            NULLIF(BTRIM(v_amb_plate), ''),
            NULLIF(BTRIM(er.responder_vehicle_plate), '')
        ),
        updated_at = NOW()
    WHERE er.id = p_emergency_request_id
    RETURNING * INTO v_updated;

    RETURN jsonb_build_object(
        'success', true,
        'request', to_jsonb(v_updated),
        'ambulance_id', p_ambulance_id,
        'assigned_at', NOW(),
        'priority', p_priority
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION public.assign_doctor_to_emergency(
    p_emergency_request_id UUID,
    p_doctor_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_is_service_role BOOLEAN := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
    v_is_admin BOOLEAN := public.p_is_admin();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_req_status TEXT;
    v_req_hospital_id UUID;
    v_req_org_id UUID;
    v_existing_doctor_id UUID;
    v_doctor_hospital_id UUID;
    v_doctor_org_id UUID;
    v_doctor_is_available BOOLEAN;
    v_doctor_status TEXT;
    v_doctor_current_patients INTEGER;
    v_doctor_max_patients INTEGER;
    v_has_active_same_doctor BOOLEAN := FALSE;
BEGIN
    IF p_emergency_request_id IS NULL OR p_doctor_id IS NULL THEN
        RAISE EXCEPTION 'emergency request id and doctor id are required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF NOT v_is_service_role AND v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT er.status, er.hospital_id, h.organization_id, er.assigned_doctor_id
    INTO v_req_status, v_req_hospital_id, v_req_org_id, v_existing_doctor_id
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
            'error', 'Cannot assign doctor to terminal emergency request',
            'code', 'REQUEST_TERMINAL'
        );
    END IF;

    SELECT
        d.hospital_id,
        h.organization_id,
        COALESCE(d.is_available, false),
        LOWER(COALESCE(d.status, '')),
        COALESCE(d.current_patients, 0),
        GREATEST(COALESCE(NULLIF(d.max_patients, 0), 1), 1)
    INTO
        v_doctor_hospital_id,
        v_doctor_org_id,
        v_doctor_is_available,
        v_doctor_status,
        v_doctor_current_patients,
        v_doctor_max_patients
    FROM public.doctors d
    LEFT JOIN public.hospitals h ON h.id = d.hospital_id
    WHERE d.id = p_doctor_id
    FOR UPDATE OF d;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Doctor not found',
            'code', 'DOCTOR_NOT_FOUND'
        );
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

        IF v_doctor_org_id IS NOT NULL AND v_actor_org_id IS DISTINCT FROM v_doctor_org_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;
    END IF;

    IF v_req_hospital_id IS NOT NULL AND v_doctor_hospital_id IS DISTINCT FROM v_req_hospital_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Doctor does not belong to request hospital',
            'code', 'DOCTOR_HOSPITAL_MISMATCH'
        );
    END IF;

    IF NOT v_doctor_is_available
       OR v_doctor_status <> 'available'
       OR v_doctor_current_patients >= v_doctor_max_patients THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Doctor is not available',
            'code', 'DOCTOR_UNAVAILABLE'
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.emergency_doctor_assignments eda
        WHERE eda.emergency_request_id = p_emergency_request_id
          AND eda.doctor_id = p_doctor_id
          AND eda.status = 'assigned'
    ) INTO v_has_active_same_doctor;

    IF v_existing_doctor_id = p_doctor_id THEN
        IF NOT v_has_active_same_doctor THEN
            INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status, notes)
            VALUES (p_emergency_request_id, p_doctor_id, 'assigned', NULLIF(BTRIM(p_notes), ''));
        END IF;

        UPDATE public.emergency_requests
        SET doctor_assigned_at = COALESCE(doctor_assigned_at, NOW()),
            updated_at = NOW()
        WHERE id = p_emergency_request_id;

        RETURN jsonb_build_object(
            'success', true,
            'doctor_id', p_doctor_id,
            'previous_doctor_id', v_existing_doctor_id,
            'reassigned', false,
            'idempotent', true
        );
    END IF;

    WITH released_assignments AS (
        UPDATE public.emergency_doctor_assignments
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE emergency_request_id = p_emergency_request_id
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

    INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status, notes)
    VALUES (p_emergency_request_id, p_doctor_id, 'assigned', NULLIF(BTRIM(p_notes), ''));

    UPDATE public.doctors
    SET current_patients = COALESCE(current_patients, 0) + 1,
        updated_at = NOW()
    WHERE id = p_doctor_id;

    UPDATE public.emergency_requests
    SET assigned_doctor_id = p_doctor_id,
        doctor_assigned_at = NOW(),
        updated_at = NOW()
    WHERE id = p_emergency_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'doctor_id', p_doctor_id,
        'previous_doctor_id', v_existing_doctor_id,
        'reassigned', v_existing_doctor_id IS DISTINCT FROM p_doctor_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    v_fee_amount NUMERIC;
    v_assigned_ambulance_id UUID;
    v_responder_name TEXT;
    v_responder_phone TEXT;
    v_responder_vehicle_type TEXT;
    v_responder_vehicle_plate TEXT;
BEGIN
    SELECT p.*, (p.metadata->>'fee_amount')::NUMERIC AS calculated_fee
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
      AND p.status = 'pending'
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending payment/request pair not found');
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

    v_fee_amount := COALESCE(v_payment.ivisit_fee_amount, v_payment.calculated_fee, 0);

    IF v_fee_amount > 0 THEN
        IF v_org_balance < v_fee_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization balance insufficient for platform fee');
        END IF;

        UPDATE public.organization_wallets
        SET balance = balance - v_fee_amount,
            updated_at = NOW()
        WHERE id = v_org_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_org_wallet_id, -v_fee_amount, 'debit', 'iVisit Platform Fee (Cash Payment)', p_payment_id);

        UPDATE public.ivisit_main_wallet
        SET balance = balance + v_fee_amount,
            last_updated = NOW()
        WHERE id = v_platform_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_platform_wallet_id, v_fee_amount, 'credit', 'Platform Fee (Cash Payment)', p_payment_id);
    END IF;

    UPDATE public.payments
    SET status = 'completed',
        processed_at = NOW(),
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

    IF v_request_service_type = 'ambulance' THEN
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
      AND p.status = 'pending'
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending payment/request pair not found');
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

REVOKE ALL ON FUNCTION public.assign_ambulance_to_emergency(UUID, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auto_assign_ambulance(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_emergency_v4(UUID, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_cash_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_cash_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_cash_payment_v2(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_emergency_transition_context(TEXT, TEXT, UUID, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assign_ambulance_to_emergency(UUID, UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_assign_ambulance(UUID, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_emergency_v4(UUID, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_cash_payment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_cash_payment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_cash_payment_v2(UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_emergency_transition_context(TEXT, TEXT, UUID, TEXT, JSONB, BOOLEAN) TO service_role;

COMMIT;

-- 11. Legacy logistics RPC canonical transition reconciliation (non-destructive)
BEGIN;

CREATE OR REPLACE FUNCTION public.discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_request_org_id UUID;
    v_service_type TEXT;
    v_current_status TEXT;
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

    SELECT h.organization_id, er.service_type, er.status
    INTO v_request_org_id, v_service_type, v_current_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = v_request_id
    FOR UPDATE OF er;

    IF NOT FOUND OR v_service_type IS DISTINCT FROM 'bed' THEN
        RETURN FALSE;
    END IF;

    v_current_status := public.canonicalize_emergency_status(v_current_status, v_current_status);
    IF v_current_status = 'completed' THEN
        RETURN TRUE;
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for bed discharge';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher')
           AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_current_status, 'completed') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> completed', v_current_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'discharge_patient',
        p_reason => 'patient_discharged',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'request_id', v_request_id,
            'service_type', v_service_type,
            'previous_status', v_current_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = v_request_id
      AND service_type = 'bed';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_bed_reservation(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_request_org_id UUID;
    v_service_type TEXT;
    v_current_status TEXT;
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

    SELECT h.organization_id, er.service_type, er.status
    INTO v_request_org_id, v_service_type, v_current_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = v_request_id
    FOR UPDATE OF er;

    IF NOT FOUND OR v_service_type IS DISTINCT FROM 'bed' THEN
        RETURN FALSE;
    END IF;

    v_current_status := public.canonicalize_emergency_status(v_current_status, v_current_status);
    IF v_current_status = 'cancelled' THEN
        RETURN TRUE;
    END IF;

    IF v_current_status = 'completed' THEN
        RAISE EXCEPTION 'Cannot cancel completed bed reservation';
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for bed cancel';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher')
           AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_current_status, 'cancelled') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> cancelled', v_current_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'cancel_bed_reservation',
        p_reason => 'bed_reservation_cancelled',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'request_id', v_request_id,
            'service_type', v_service_type,
            'previous_status', v_current_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = v_request_id
      AND service_type = 'bed';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.complete_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_request_org_id UUID;
    v_service_type TEXT;
    v_current_status TEXT;
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

    SELECT h.organization_id, er.service_type, er.status
    INTO v_request_org_id, v_service_type, v_current_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = v_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    v_current_status := public.canonicalize_emergency_status(v_current_status, v_current_status);
    IF v_current_status = 'completed' THEN
        RETURN TRUE;
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for trip completion';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher')
           AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_current_status, 'completed') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> completed', v_current_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'complete_trip',
        p_reason => 'trip_completed',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'request_id', v_request_id,
            'service_type', v_service_type,
            'previous_status', v_current_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = v_request_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_request_org_id UUID;
    v_service_type TEXT;
    v_current_status TEXT;
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

    SELECT h.organization_id, er.service_type, er.status
    INTO v_request_org_id, v_service_type, v_current_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = v_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    v_current_status := public.canonicalize_emergency_status(v_current_status, v_current_status);
    IF v_current_status = 'cancelled' THEN
        RETURN TRUE;
    END IF;

    IF v_current_status = 'completed' THEN
        RAISE EXCEPTION 'Cannot cancel completed trip';
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for trip cancellation';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher')
           AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_current_status, 'cancelled') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> cancelled', v_current_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'cancel_trip',
        p_reason => 'trip_cancelled',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'request_id', v_request_id,
            'service_type', v_service_type,
            'previous_status', v_current_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = v_request_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.discharge_patient(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_bed_reservation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_trip(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_trip(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.discharge_patient(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_bed_reservation(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_trip(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_trip(TEXT) TO authenticated, service_role;

COMMIT;

-- 9. Resource reassignment closure patch (non-destructive)
BEGIN;

CREATE OR REPLACE FUNCTION public.update_resource_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_current_amb_status TEXT;
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.ambulance_id IS NOT NULL
       AND OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id THEN
        UPDATE public.ambulances
        SET status = 'available',
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

        IF NEW.status IN ('accepted', 'arrived', 'in_progress') THEN
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
        IF NEW.status IN ('in_progress', 'accepted', 'arrived')
           AND OLD.status NOT IN ('in_progress', 'accepted', 'arrived') THEN
            UPDATE public.hospitals
            SET available_beds = GREATEST(0, available_beds - 1)
            WHERE id = NEW.hospital_id;
        ELSIF NEW.status IN ('completed', 'cancelled')
              AND OLD.status IN ('in_progress', 'accepted', 'arrived') THEN
            UPDATE public.hospitals
            SET available_beds = available_beds + 1
            WHERE id = NEW.hospital_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_status_resource_sync ON public.emergency_requests;
CREATE TRIGGER on_emergency_status_resource_sync
AFTER INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.update_resource_availability();

COMMIT;

-- 7. Emergency doctor release determinism patch (non-destructive)
BEGIN;

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

COMMIT;

-- 8. Responder telemetry gate patch (active-only + dispatch-only)
BEGIN;

CREATE OR REPLACE FUNCTION public.console_update_responder_location(
    p_request_id UUID,
    p_location JSONB,
    p_heading DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_org_id UUID;
    v_req_status TEXT;
    v_req_responder_id UUID;
    v_ambulance_id UUID;
    v_location geometry;
    v_heading DOUBLE PRECISION;
    v_now TIMESTAMPTZ := NOW();
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

    SELECT h.organization_id, er.status, er.responder_id, er.ambulance_id
    INTO v_req_org_id, v_req_status, v_req_responder_id, v_ambulance_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF NOT v_is_admin THEN
        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_req_org_id IS DISTINCT FROM v_actor_org_id THEN
                RAISE EXCEPTION 'Unauthorized';
            END IF;
        ELSIF v_actor_role = 'provider' THEN
            IF v_req_responder_id IS DISTINCT FROM v_actor_id THEN
                RAISE EXCEPTION 'Unauthorized';
            END IF;
        ELSE
            RAISE EXCEPTION 'Unauthorized';
        END IF;
    END IF;

    IF v_req_status NOT IN ('in_progress', 'accepted', 'arrived') THEN
        RAISE EXCEPTION 'Cannot update responder location for terminal request status: %', v_req_status;
    END IF;

    IF v_req_responder_id IS NULL AND v_ambulance_id IS NULL THEN
        RAISE EXCEPTION 'Cannot update responder location before dispatch';
    END IF;

    v_location := public.jsonb_to_point_geometry(p_location);
    IF v_location IS NULL THEN
        RAISE EXCEPTION 'Invalid responder location payload';
    END IF;

    IF p_heading IS NOT NULL THEN
        IF p_heading::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
            RAISE EXCEPTION 'Invalid responder heading';
        END IF;
        v_heading := p_heading - FLOOR(p_heading / 360::DOUBLE PRECISION) * 360::DOUBLE PRECISION;
        IF v_heading < 0 THEN
            v_heading := v_heading + 360::DOUBLE PRECISION;
        END IF;
    ELSE
        v_heading := NULL;
    END IF;

    UPDATE public.emergency_requests
    SET responder_location = v_location,
        responder_heading = COALESCE(v_heading, responder_heading),
        updated_at = v_now
    WHERE id = p_request_id;

    IF v_ambulance_id IS NOT NULL THEN
        UPDATE public.ambulances
        SET location = v_location,
            updated_at = v_now
        WHERE id = v_ambulance_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', v_req_status,
        'updated_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
-- 5. Hospitals RLS visibility fix (admin parity + imported hospitals visibility for admins)
BEGIN;

DROP POLICY IF EXISTS "Public read for verified hospitals" ON public.hospitals;
CREATE POLICY "Public read for verified hospitals"
ON public.hospitals FOR SELECT
USING (
    verified = true
    OR organization_id = public.p_get_current_org_id()
    OR public.p_is_admin()
);

COMMIT;

-- 6. Nearby hospital geospatial fix (meters-safe geography distance)
BEGIN;

CREATE OR REPLACE FUNCTION public.nearby_hospitals(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 15)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    verified BOOLEAN,
    status TEXT,
    display_id TEXT
) AS $$
DECLARE
    v_user_location GEOGRAPHY;
BEGIN
    v_user_location := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY;
    
    RETURN QUERY
    SELECT 
        h.id, h.name, h.address, h.latitude, h.longitude,
        ST_Distance(
            COALESCE(
                h.coordinates,
                ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)
            )::GEOGRAPHY,
            v_user_location
        ) / 1000 AS distance,
        h.verified, h.status, h.display_id
    FROM public.hospitals h
    WHERE ST_DWithin(
        COALESCE(
            h.coordinates,
            ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)
        )::GEOGRAPHY,
        v_user_location,
        radius_km * 1000
    )
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMIT;

-- 4. Emergency doctor auto-assignment resilience patch (non-destructive)
BEGIN;

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

    SELECT d.id INTO v_doctor_id
    FROM public.doctors d
    WHERE d.hospital_id = NEW.hospital_id
      AND COALESCE(d.status, 'available') = 'available'
      AND d.is_available = true
      AND COALESCE(d.current_patients, 0) < COALESCE(NULLIF(d.max_patients, 0), 1)
      AND (
            d.specialization = v_specialty
            OR NOT EXISTS (
                SELECT 1
                FROM public.doctors ds
                WHERE ds.hospital_id = NEW.hospital_id
                  AND ds.is_available = true
                  AND COALESCE(ds.current_patients, 0) < COALESCE(NULLIF(ds.max_patients, 0), 1)
                  AND ds.specialization = v_specialty
            )
      )
    ORDER BY
      CASE WHEN d.specialization = v_specialty THEN 0 ELSE 1 END,
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

COMMIT;

