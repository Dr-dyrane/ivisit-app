-- 🛰️ Module 08: Emergency Logic (Fluid Edition)
-- Atomic operations for emergency lifecycles

-- � AMBULANCE DISPATCH RPC FUNCTIONS
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
BEGIN
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
    WHERE a.status = 'available'
        AND (p_hospital_id IS NULL OR a.hospital_id = p_hospital_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 2. Update Ambulance Status
CREATE OR REPLACE FUNCTION public.update_ambulance_status(
    p_ambulance_id UUID,
    p_status TEXT,
    p_location JSONB DEFAULT NULL,
    p_eta TIMESTAMPTZ DEFAULT NULL,
    p_current_call UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_hospital_id UUID;
    v_result JSONB;
BEGIN
    -- Validate status
    IF p_status NOT IN ('available', 'dispatched', 'en_route', 'on_scene', 'returning', 'maintenance', 'offline') THEN
        RETURN jsonb_build_object('error', 'Invalid status', 'code', 'INVALID_STATUS');
    END IF;
    
    -- Get current hospital for validation
    SELECT hospital_id INTO v_hospital_id 
    FROM public.ambulances 
    WHERE id = p_ambulance_id;
    
    -- Update ambulance
    UPDATE public.ambulances 
    SET 
        status = p_status,
        location = COALESCE(p_location, location),
        eta = COALESCE(p_eta, eta),
        current_call = COALESCE(p_current_call, current_call),
        updated_at = NOW()
    WHERE id = p_ambulance_id;
    
    -- If ambulance was dispatched, update hospital availability
    IF p_status = 'dispatched' AND OLD.status = 'available' THEN
        UPDATE public.hospitals 
        SET available_ambulances = GREATEST(0, available_ambulances - 1)
        WHERE id = v_hospital_id;
    END IF;
    
    -- If ambulance returned to available, update hospital availability
    IF p_status = 'available' AND OLD.status != 'available' THEN
        UPDATE public.hospitals 
        SET available_ambulances = available_ambulances + 1
        WHERE id = v_hospital_id;
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'status', p_status,
        'updated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Assign Ambulance to Emergency
CREATE OR REPLACE FUNCTION public.assign_ambulance_to_emergency(
    p_emergency_request_id UUID,
    p_ambulance_id UUID,
    p_priority INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance_status TEXT;
    v_hospital_id UUID;
BEGIN
    -- 1. Get current ambulance state
    SELECT a.status, a.hospital_id INTO v_ambulance_status, v_hospital_id
    FROM public.ambulances a
    WHERE a.id = p_ambulance_id;
    
    IF v_ambulance_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not found', 'code', 'AMBULANCE_NOT_FOUND');
    END IF;

    -- 2. Validate availability
    IF v_ambulance_status != 'available' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not available', 'code', 'AMBULANCE_UNAVAILABLE', 'current_status', v_ambulance_status);
    END IF;
    
    -- 3. Atomic Assignment
    UPDATE public.ambulances 
    SET status = 'dispatched', current_call = p_emergency_request_id, updated_at = NOW()
    WHERE id = p_ambulance_id;
    
    UPDATE public.emergency_requests 
    SET ambulance_id = p_ambulance_id, status = 'accepted', updated_at = NOW()
    WHERE id = p_emergency_request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'emergency_request_id', p_emergency_request_id,
        'assigned_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Auto-Assign Best Ambulance
CREATE OR REPLACE FUNCTION public.auto_assign_ambulance(
    p_emergency_request_id UUID,
    p_max_distance_km INTEGER DEFAULT 50,
    p_specialty_required TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_location JSONB;
    v_best_ambulance_id UUID;
    v_best_distance NUMERIC;
    v_result JSONB;
BEGIN
    -- Get emergency user and location
    SELECT user_id INTO v_user_id
    FROM public.emergency_requests 
    WHERE id = p_emergency_request_id;
    
    -- Get user location from profile
    SELECT location INTO v_user_location
    FROM public.profiles 
    WHERE id = v_user_id;
    
    -- Find best available ambulance
    SELECT 
        a.id, 
        ST_Distance(
            ST_GeomFromText(a.location),
            ST_GeomFromText(v_user_location)
        ) as distance
    INTO v_best_ambulance_id, v_best_distance
    FROM public.ambulances a
    WHERE a.status = 'available'
        AND (p_specialty_required IS NULL OR a.specialty = p_specialty_required)
        AND a.location IS NOT NULL
        AND ST_DWithin(
            ST_GeomFromText(a.location),
            ST_GeomFromText(v_user_location),
            p_max_distance_km * 1000
        )
    ORDER BY distance
    LIMIT 1;
    
    -- If ambulance found, assign it
    IF v_best_ambulance_id IS NOT NULL THEN
        -- Update ambulance status
        UPDATE public.ambulances 
        SET 
            status = 'dispatched',
            current_call = p_emergency_request_id,
            updated_at = NOW()
        WHERE id = v_best_ambulance_id;
        
        -- Update emergency request
        UPDATE public.emergency_requests 
        SET 
            ambulance_id = v_best_ambulance_id,
            status = 'accepted',
            updated_at = NOW()
        WHERE id = p_emergency_request_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'ambulance_id', v_best_ambulance_id,
            'distance', v_best_distance,
            'auto_assigned', true
        );
    ELSE
        v_result := jsonb_build_object(
            'success', false,
            'error', 'No available ambulances found',
            'auto_assigned', false
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Validate Emergency Request
CREATE OR REPLACE FUNCTION public.validate_emergency_request(
    p_user_id UUID,
    p_request_data JSONB
)
RETURNS JSONB AS $$
DECLARE
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

-- 6. Check Hospital Capacity
CREATE OR REPLACE FUNCTION public.check_hospital_capacity(
    p_hospital_id UUID,
    p_required_beds INTEGER DEFAULT 1,
    p_specialty TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_available_beds INTEGER;
    v_icu_beds INTEGER;
    v_total_beds INTEGER;
    v_result JSONB;
BEGIN
    -- Get hospital capacity information
    SELECT 
        available_beds,
        icu_beds_available,
        total_beds
    INTO v_available_beds, v_icu_beds, v_total_beds
    FROM public.hospitals 
    WHERE id = p_hospital_id;
    
    -- Check capacity
    IF v_available_beds < p_required_beds THEN
        v_result := jsonb_build_object(
            'available', false,
            'error', 'Insufficient bed capacity',
            'available_beds', v_available_beds,
            'required_beds', p_required_beds,
            'code', 'INSUFFICIENT_CAPACITY'
        );
    ELSIF p_specialty = 'ICU' AND v_icu_beds < p_required_beds THEN
        v_result := jsonb_build_object(
            'available', false,
            'error', 'Insufficient ICU capacity',
            'icu_beds_available', v_icu_beds,
            'required_beds', p_required_beds,
            'code', 'INSUFFICIENT_ICU'
        );
    ELSE
        v_result := jsonb_build_object(
            'available', true,
            'available_beds', v_available_beds,
            'icu_beds_available', v_icu_beds,
            'total_beds', v_total_beds
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7. Calculate Emergency Priority
CREATE OR REPLACE FUNCTION public.calculate_emergency_priority(
    p_request_data JSONB,
    p_user_medical_profile JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_priority INTEGER := 1; -- Default priority
    v_urgency_score INTEGER := 0;
    v_medical_urgency INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Calculate urgency based on request data
    IF p_request_data->>'severity' = 'critical' THEN
        v_urgency_score := v_urgency_score + 3;
    ELSIF p_request_data->>'severity' = 'urgent' THEN
        v_urgency_score := v_urgency_score + 2;
    ELSIF p_request_data->>'severity' = 'moderate' THEN
        v_urgency_score := v_urgency_score + 1;
    END IF;
    
    -- Calculate medical urgency if profile available
    IF p_user_medical_profile IS NOT NULL THEN
        IF p_user_medical_profile->>'conditions' IS NOT NULL THEN
            v_medical_urgency := v_medical_urgency + 1;
        END IF;
        
        IF p_user_medical_profile->>'allergies' IS NOT NULL AND 
           p_user_medical_profile->>'allergies' != '' THEN
            v_medical_urgency := v_medical_urgency + 1;
        END IF;
    END IF;
    
    -- Calculate final priority (1-5 scale)
    v_priority := LEAST(5, GREATEST(1, 1 + v_urgency_score + v_medical_urgency));
    
    v_result := jsonb_build_object(
        'priority', v_priority,
        'urgency_score', v_urgency_score,
        'medical_urgency', v_medical_urgency,
        'calculated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
    v_requires_approval BOOLEAN := FALSE;
    v_hospital_id UUID;
    v_organization_id UUID;
    v_patient_location GEOMETRY;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user id is required';
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

    -- 1. Extract and Resolve IDs
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    SELECT organization_id INTO v_organization_id FROM public.hospitals WHERE id = v_hospital_id;
    
    -- 2. Physical Location Parse
    v_patient_location := ST_SetSRID(ST_MakePoint(
        (p_request_data->'patient_location'->>'lng')::DOUBLE PRECISION,
        (p_request_data->'patient_location'->>'lat')::DOUBLE PRECISION
    ), 4326);
    
    -- 3. Create the Emergency Request
    INSERT INTO public.emergency_requests (
        user_id, hospital_id, service_type, hospital_name, specialty, 
        ambulance_type, patient_location, patient_snapshot, status
    ) VALUES (
        p_user_id, v_hospital_id, p_request_data->>'service_type', 
        p_request_data->>'hospital_name', p_request_data->>'specialty',
        p_request_data->>'ambulance_type', v_patient_location, 
        p_request_data->'patient_snapshot',
        CASE WHEN p_payment_data->>'method' = 'cash' THEN 'pending_approval' ELSE 'in_progress' END
    ) RETURNING id, display_id INTO v_request_id, v_display_id;

    -- 4. Create Visit Record (Medical History)
    BEGIN
        INSERT INTO public.visits (
            user_id, hospital_id, request_id, status, 
            date, time, type
        ) VALUES (
            p_user_id, v_hospital_id, v_request_id, 'pending',
            TO_CHAR(NOW(), 'YYYY-MM-DD'),
            TO_CHAR(NOW(), 'HH24:MI:SS'),
            'emergency'
        ) RETURNING display_id INTO v_visit_id;
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking visit creation
        RAISE NOTICE 'Non-blocking visit creation failure: %', SQLERRM;
    END;

    -- 5. Process Payment Information
    IF p_payment_data IS NOT NULL THEN
        v_total_amount := (p_payment_data->>'total_amount')::NUMERIC;
        v_fee_amount := (p_payment_data->>'fee_amount')::NUMERIC;
        IF v_fee_amount IS NULL THEN v_fee_amount := v_total_amount * 0.025; END IF;

        INSERT INTO public.payments (
            user_id, emergency_request_id, organization_id, amount, currency, 
            payment_method, status, metadata
        ) VALUES (
            p_user_id, v_request_id, v_organization_id, v_total_amount, 
            p_payment_data->>'currency', p_payment_data->>'method',
            CASE WHEN p_payment_data->>'method' = 'cash' THEN 'pending' ELSE 'completed' END,
            jsonb_build_object('fee_amount', v_fee_amount, 'method_id', p_payment_data->>'method_id')
        ) RETURNING id INTO v_payment_id;

        IF p_payment_data->>'method' = 'cash' THEN v_requires_approval := TRUE; END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'display_id', v_display_id,
        'visit_id', v_visit_id,
        'payment_id', v_payment_id,
        'requires_approval', v_requires_approval,
        'emergency_status', CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'in_progress' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Approve Cash Payment
CREATE OR REPLACE FUNCTION public.approve_cash_payment(p_payment_id UUID, p_request_id UUID)
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
    v_patient_wallet_id UUID;
    v_fee_amount NUMERIC;
    v_assigned_ambulance_id UUID;
    v_responder_name TEXT;
    v_responder_phone TEXT;
    v_responder_vehicle_type TEXT;
    v_responder_vehicle_plate TEXT;
BEGIN
    -- 1. Verify Payment/Request Integrity + lock target rows
    SELECT p.*, (p.metadata->>'fee_amount')::NUMERIC as calculated_fee 
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

    IF v_payment.organization_id IS DISTINCT FROM v_request_org_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request organization mismatch');
    END IF;

    IF v_request_status NOT IN ('pending_approval', 'pending') THEN
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

    -- 2. Authorization (service_role bypass; authenticated callers must be operator-scoped)
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

    -- 3. Guard: Auto-provision Org Wallet if missing
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

    -- 4. Check for Platform Fee
    v_fee_amount := COALESCE(v_payment.ivisit_fee_amount, v_payment.calculated_fee, 0);

    -- 5. Execute Ledger Operations (only if fee > 0)
    IF v_fee_amount > 0 THEN
        IF v_org_balance < v_fee_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization balance insufficient for platform fee');
        END IF;

        -- Deduct from Org
        UPDATE public.organization_wallets SET balance = balance - v_fee_amount, updated_at = NOW() WHERE id = v_org_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_org_wallet_id, -v_fee_amount, 'debit', 'iVisit Platform Fee (Cash Payment)', p_payment_id);

        -- Credit Platform
        UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount, last_updated = NOW() WHERE id = v_platform_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_platform_wallet_id, v_fee_amount, 'credit', 'Platform Fee (Cash Payment)', p_payment_id);
    END IF;

    -- 6. Finalize Statuses
    UPDATE public.payments SET status = 'completed', processed_at = NOW(), updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests
    SET status = 'accepted', payment_status = 'completed', updated_at = NOW()
    WHERE id = p_request_id;
    UPDATE public.visits SET status = 'active', updated_at = NOW() WHERE request_id = p_request_id;

    -- Backfill responder snapshot fields after approval/auto-dispatch so mobile receives a usable driver label.
    IF v_request_service_type = 'ambulance' THEN
        UPDATE public.emergency_requests er
        SET
            responder_id = COALESCE(er.responder_id, a.profile_id),
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

    SELECT
        ambulance_id,
        responder_name,
        responder_phone,
        responder_vehicle_type,
        responder_vehicle_plate
    INTO
        v_assigned_ambulance_id,
        v_responder_name,
        v_responder_phone,
        v_responder_vehicle_type,
        v_responder_vehicle_plate
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

REVOKE ALL ON FUNCTION public.create_emergency_v4(UUID, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_cash_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_cash_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_cash_payment_v2(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_emergency_v4(UUID, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_cash_payment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_cash_payment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_cash_payment_v2(UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;

-- 🛠️ ATOMIC: Decline Cash Payment
CREATE OR REPLACE FUNCTION public.decline_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
) RETURNS JSONB AS $$
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

    IF v_payment.organization_id IS DISTINCT FROM v_request_org_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request organization mismatch');
    END IF;

    IF v_request_status NOT IN ('pending_approval', 'pending') THEN
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

    UPDATE public.payments SET status = 'failed', updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests
    SET status = 'payment_declined', payment_status = 'failed', updated_at = NOW()
    WHERE id = p_request_id;
    UPDATE public.visits SET status = 'cancelled', updated_at = NOW() WHERE request_id = p_request_id;
    
    RETURN jsonb_build_object('success', TRUE, 'status', 'declined');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Process Manual Cash Payment (Fluid v2)
-- Used by Console admins to record offline payments
CREATE OR REPLACE FUNCTION public.process_cash_payment_v2(
    p_emergency_request_id UUID,
    p_organization_id UUID,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
) RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_user_id UUID;
    v_request_org_id UUID;
    v_request_status TEXT;
    v_fee_amount NUMERIC;
    v_fee_percentage NUMERIC;
    v_payment_id UUID;
BEGIN
    -- 1. Validate actor scope for a mutation RPC
    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash processing';
        END IF;
    END IF;

    -- 2. Validate request scope + lock target row
    SELECT er.user_id, h.organization_id, er.status
    INTO v_user_id, v_request_org_id, v_request_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_emergency_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_request_org_id IS DISTINCT FROM p_organization_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request/organization mismatch');
    END IF;

    IF NOT v_is_service_role AND v_actor_role IN ('org_admin', 'dispatcher') THEN
        IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM p_organization_id THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    IF v_request_status IN ('cancelled', 'completed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request is not eligible for manual cash processing');
    END IF;

    -- 3. Get Fee Config
    SELECT ivisit_fee_percentage INTO v_fee_percentage FROM public.organizations WHERE id = p_organization_id;
    
    v_fee_amount := p_amount * (COALESCE(v_fee_percentage, 2.5) / 100);

    -- 4. Create Completed Payment
    INSERT INTO public.payments (
        user_id, 
        emergency_request_id, 
        organization_id, 
        amount, 
        currency, 
        payment_method, 
        status, 
        ivisit_fee_amount,
        processed_at
    )
    VALUES (
        v_user_id, 
        p_emergency_request_id, 
        p_organization_id, 
        p_amount, 
        p_currency, 
        'cash', 
        'completed', 
        v_fee_amount,
        NOW()
    )
    RETURNING id INTO v_payment_id;

    UPDATE public.emergency_requests
    SET payment_status = 'completed',
        updated_at = NOW()
    WHERE id = p_emergency_request_id;

    RETURN jsonb_build_object(
        'success', true, 
        'payment_id', v_payment_id, 
        'fee_calculated', v_fee_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🏯 Module 10: Legacy Logistics Logic
-- Reintroducing critical driver & bed management RPCs

-- 1. Bed Management
CREATE OR REPLACE FUNCTION public.discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
      AND er.service_type = 'bed'
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
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

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'completed', updated_at = NOW()
    WHERE id = request_uuid::UUID AND service_type = 'bed';
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_bed_reservation(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
      AND er.service_type = 'bed'
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
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

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = request_uuid::UUID AND service_type = 'bed';
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Driver Management
CREATE OR REPLACE FUNCTION public.complete_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
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

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'completed', updated_at = NOW()
    WHERE id = request_uuid::UUID;
    -- Note: Amb status trigger separates concerns
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
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

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = request_uuid::UUID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Availability Management
CREATE OR REPLACE FUNCTION public.update_hospital_availability(
    hospital_id UUID,
    beds_available INTEGER,
    er_wait_time INTEGER,
    p_status TEXT,            -- renamed from 'status' to avoid ambiguity with column name
    ambulance_count INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT organization_id
    INTO v_hospital_org_id
    FROM public.hospitals h
    WHERE h.id = hospital_id
    FOR UPDATE OF h;

    IF NOT FOUND THEN
        RETURN FALSE;
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for hospital availability update';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.hospitals
    SET 
        available_beds = beds_available,
        emergency_wait_time_minutes = er_wait_time,
        wait_time = er_wait_time || ' mins',
        status = p_status,    -- 'available', 'busy', 'full'
        ambulances_count = ambulance_count,
        updated_at = NOW()
    WHERE id = hospital_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- 🏯 Module 11: Pricing System
-- Standardized pricing for services and rooms

-- 1. Service Pricing Table
CREATE TABLE IF NOT EXISTS public.service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    service_name TEXT NOT NULL,
    base_price NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, service_type)
);

-- 2. Room Pricing Table
CREATE TABLE IF NOT EXISTS public.room_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    room_type TEXT NOT NULL,
    room_name TEXT NOT NULL,
    price_per_night NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, room_type)
);

-- 3. RLS
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active service pricing" ON public.service_pricing FOR SELECT USING (true);
CREATE POLICY "Public view active room pricing" ON public.room_pricing FOR SELECT USING (true);

-- Allow Org Admins to manage own hospital pricing
CREATE POLICY "Org Admins manage pricing" ON public.service_pricing FOR ALL
USING (
    hospital_id IN (SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id())
    OR public.p_is_admin()
);

CREATE POLICY "Org Admins manage room pricing" ON public.room_pricing FOR ALL
USING (
    hospital_id IN (SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id())
    OR public.p_is_admin()
);

-- 4. RPCs
CREATE OR REPLACE FUNCTION public.upsert_service_pricing(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_service_type TEXT;
    v_base_price NUMERIC;
BEGIN
    v_hospital_id := (payload->>'hospital_id')::UUID;
    v_service_type := payload->>'service_type';
    v_base_price := (payload->>'base_price')::NUMERIC;

    IF v_hospital_id IS NOT NULL THEN
        SELECT organization_id
        INTO v_hospital_org_id
        FROM public.hospitals
        WHERE id = v_hospital_id;

        IF v_hospital_org_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Hospital not found');
        END IF;
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for pricing update';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_hospital_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: global pricing mutations require admin role';
            END IF;

            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;
    
    INSERT INTO public.service_pricing (hospital_id, service_type, service_name, base_price, description)
    VALUES (
        v_hospital_id,
        v_service_type,
        payload->>'service_name',
        v_base_price,
        payload->>'description'
    )
    ON CONFLICT (hospital_id, service_type)
    DO UPDATE SET
        service_name = EXCLUDED.service_name,
        base_price = EXCLUDED.base_price,
        description = EXCLUDED.description,
        updated_at = NOW();
        
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.upsert_room_pricing(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_room_type TEXT;
    v_price NUMERIC;
BEGIN
    v_hospital_id := (payload->>'hospital_id')::UUID;
    v_room_type := payload->>'room_type';
    v_price := (payload->>'price_per_night')::NUMERIC;

    IF v_hospital_id IS NOT NULL THEN
        SELECT organization_id
        INTO v_hospital_org_id
        FROM public.hospitals
        WHERE id = v_hospital_id;

        IF v_hospital_org_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Hospital not found');
        END IF;
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for pricing update';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_hospital_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: global pricing mutations require admin role';
            END IF;

            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;
    
    INSERT INTO public.room_pricing (hospital_id, room_type, room_name, price_per_night, description)
    VALUES (
        v_hospital_id,
        v_room_type,
        payload->>'room_name',
        v_price,
        payload->>'description'
    )
    ON CONFLICT (hospital_id, room_type)
    DO UPDATE SET
        room_name = EXCLUDED.room_name,
        price_per_night = EXCLUDED.price_per_night,
        description = EXCLUDED.description,
        updated_at = NOW();
        
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_service_pricing(target_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_id UUID;
    v_hospital_org_id UUID;
    v_row_exists BOOLEAN := FALSE;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT sp.hospital_id, h.organization_id
    INTO v_hospital_id, v_hospital_org_id
    FROM public.service_pricing sp
    LEFT JOIN public.hospitals h ON h.id = sp.hospital_id
    WHERE sp.id = target_id;

    v_row_exists := FOUND;
    IF NOT v_row_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pricing row not found');
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for pricing delete';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_hospital_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: global pricing mutations require admin role';
            END IF;

            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;

    DELETE FROM public.service_pricing WHERE id = target_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_room_pricing(target_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_id UUID;
    v_hospital_org_id UUID;
    v_row_exists BOOLEAN := FALSE;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT rp.hospital_id, h.organization_id
    INTO v_hospital_id, v_hospital_org_id
    FROM public.room_pricing rp
    LEFT JOIN public.hospitals h ON h.id = rp.hospital_id
    WHERE rp.id = target_id;

    v_row_exists := FOUND;
    IF NOT v_row_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pricing row not found');
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
            RAISE EXCEPTION 'Unauthorized: insufficient role for pricing delete';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_hospital_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: global pricing mutations require admin role';
            END IF;

            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;

    DELETE FROM public.room_pricing WHERE id = target_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.discharge_patient(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_bed_reservation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_trip(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_trip(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_hospital_availability(UUID, INTEGER, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_service_pricing(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_room_pricing(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_service_pricing(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_room_pricing(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.discharge_patient(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_bed_reservation(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_trip(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_trip(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_hospital_availability(UUID, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_service_pricing(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_room_pricing(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_service_pricing(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_room_pricing(UUID) TO authenticated, service_role;

-- Missing updated_at triggers for pricing tables
CREATE TRIGGER handle_service_pricing_updated_at BEFORE UPDATE ON public.service_pricing FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_room_pricing_updated_at BEFORE UPDATE ON public.room_pricing FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Pricing Indexes
CREATE INDEX IF NOT EXISTS idx_service_pricing_type ON public.service_pricing(service_type);
CREATE INDEX IF NOT EXISTS idx_service_pricing_hospital ON public.service_pricing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_room_pricing_type ON public.room_pricing(room_type);
CREATE INDEX IF NOT EXISTS idx_room_pricing_hospital ON public.room_pricing(hospital_id);

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
    v_hospital_id UUID;
    v_prev_status TEXT;
    v_location geometry;
BEGIN
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


-- Bed discharge must use legal emergency status values.
CREATE OR REPLACE FUNCTION public.discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.emergency_requests
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        updated_at = NOW()
    WHERE id = request_uuid::UUID
      AND service_type = 'bed'
      AND status IN ('in_progress', 'accepted', 'arrived');

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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
            RETURN v_next IN ('in_progress', 'accepted', 'cancelled', 'payment_declined');
        WHEN 'in_progress' THEN
            RETURN v_next IN ('accepted', 'arrived', 'completed', 'cancelled', 'payment_declined');
        WHEN 'accepted' THEN
            RETURN v_next IN ('arrived', 'completed', 'cancelled');
        WHEN 'arrived' THEN
            RETURN v_next IN ('completed', 'cancelled');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.validate_emergency_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT public.is_valid_emergency_status_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION 'Illegal emergency status transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_emergency_status_transition ON public.emergency_requests;
CREATE TRIGGER trg_validate_emergency_status_transition
BEFORE UPDATE OF status ON public.emergency_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_emergency_status_transition();
