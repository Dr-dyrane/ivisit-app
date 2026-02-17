-- Migration: Fix create_emergency_v3 patient_location type and create calculate_emergency_cost_v2
-- Purpose: 1. Fix type mismatch (jsonb vs geography) for patient_location
--          2. Resolve PGRST203 overload ambiguity by creating v2 of cost calculation

BEGIN;

-- 1. Fix create_emergency_v3
CREATE OR REPLACE FUNCTION public.create_emergency_v3(
    p_payment_data JSONB,
    p_request_data JSONB,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_id UUID;
    v_payment_id UUID;
    v_hospital_id UUID;
    v_organization_id UUID;
    v_base_amount NUMERIC;
    v_total_amount NUMERIC;
    v_currency TEXT;
    v_payment_method TEXT;
    v_fee_rate NUMERIC;
    v_calculated_fee NUMERIC;
    v_wallet_id UUID;
    v_wallet_balance NUMERIC;
    v_display_id TEXT;
    v_hospital_name TEXT;
    v_is_cash BOOLEAN;
    v_payment_status TEXT;
    v_emergency_status TEXT;
    v_patient_location GEOGRAPHY;
BEGIN
    -- Extract values
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_base_amount := COALESCE((p_payment_data->>'base_amount')::NUMERIC, 0);
    v_total_amount := COALESCE((p_payment_data->>'total_amount')::NUMERIC, 0);
    v_currency := COALESCE(p_payment_data->>'currency', 'USD');
    v_payment_method := COALESCE(p_payment_data->>'method', 'cash');
    v_display_id := COALESCE(p_request_data->>'request_id', 'REQ-' || floor(extract(epoch from now())));
    v_is_cash := (v_payment_method = 'cash');

    -- Correct casting for geography
    IF p_request_data->>'patient_location' IS NOT NULL THEN
        v_patient_location := (p_request_data->>'patient_location')::geography;
    END IF;

    IF v_hospital_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hospital ID is required');
    END IF;

    -- Resolve Organization
    SELECT h.organization_id, h.name 
    INTO v_organization_id, v_hospital_name 
    FROM public.hospitals h WHERE h.id = v_hospital_id;
    
    IF v_organization_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hospital has no linked organization');
    END IF;

    -- Get fee rate
    SELECT COALESCE(o.ivisit_fee_percentage, 2.5) INTO v_fee_rate 
    FROM public.organizations o WHERE o.id = v_organization_id;

    -- Calculate fee
    v_calculated_fee := ROUND((v_base_amount * v_fee_rate) / 100, 2);
    IF v_total_amount = 0 THEN
        v_total_amount := v_base_amount + v_calculated_fee;
    END IF;

    -- Flows
    IF v_is_cash THEN
        SELECT ow.id, ow.balance INTO v_wallet_id, v_wallet_balance
        FROM public.organization_wallets ow WHERE ow.organization_id = v_organization_id;

        IF v_wallet_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization wallet not found');
        END IF;

        IF v_wallet_balance < v_calculated_fee THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Insufficient organization wallet balance for commission.',
                'code', 'ORG_INSUFFICIENT_FUNDS'
            );
        END IF;

        v_payment_status := 'pending';
        v_emergency_status := 'pending_approval';
    ELSE
        v_payment_status := 'completed';
        v_emergency_status := 'in_progress';
    END IF;

    -- Create records
    INSERT INTO public.payments (
        user_id, amount, currency, status, payment_method_id,
        organization_id, metadata
    ) VALUES (
        p_user_id, v_total_amount, v_currency, v_payment_status, v_payment_method,
        v_organization_id,
        jsonb_build_object('base', v_base_amount, 'fee', v_calculated_fee)
    ) RETURNING id INTO v_payment_id;

    v_request_id := gen_random_uuid();
    INSERT INTO public.emergency_requests (
        id, user_id, hospital_id, hospital_name, service_type, specialty,
        status, request_id, patient_location, patient_snapshot, total_cost,
        payment_status, payment_method_id
    ) VALUES (
        v_request_id, p_user_id, v_hospital_id, v_hospital_name,
        p_request_data->>'service_type', p_request_data->>'specialty',
        v_emergency_status, v_display_id, 
        v_patient_location,
        (p_request_data->>'patient_snapshot')::jsonb,
        v_total_amount, v_payment_status, v_payment_method
    );

    UPDATE public.payments SET emergency_request_id = v_request_id WHERE id = v_payment_id;

    RETURN jsonb_build_object(
        'success', true, 
        'request_id', v_request_id, 
        'payment_id', v_payment_id,
        'display_id', v_display_id,
        'fee_amount', v_calculated_fee,
        'requires_approval', v_is_cash,
        'payment_status', v_payment_status,
        'emergency_status', v_emergency_status
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Create calculate_emergency_cost_v2 (Fixes PGRST203 ambiguity)
CREATE OR REPLACE FUNCTION public.calculate_emergency_cost_v2(
    p_service_type TEXT,
    p_distance DECIMAL DEFAULT 0,
    p_is_urgent BOOLEAN DEFAULT false,
    p_hospital_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL,
    p_ambulance_id UUID DEFAULT NULL
)
RETURNS TABLE (
    base_cost DECIMAL,
    distance_surcharge DECIMAL,
    urgency_surcharge DECIMAL,
    service_fee DECIMAL,
    total_cost DECIMAL,
    breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_base_cost DECIMAL := 0;
    v_distance_surcharge DECIMAL := 0;
    v_urgency_surcharge DECIMAL := 0;
    v_service_fee DECIMAL := 0;
    v_subtotal DECIMAL := 0;
    v_total_cost DECIMAL := 0;
    v_breakdown JSONB := '[]'::jsonb;
    v_service_name TEXT;
    v_fee_rate DECIMAL := 0.025; -- 2.5%
BEGIN
    -- 1. Determine Base Cost
    IF p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL THEN
        SELECT base_price, room_type INTO v_base_cost, v_service_name
        FROM public.hospital_rooms
        WHERE id = p_room_id;
    END IF;

    IF v_base_cost IS NULL AND p_service_type = 'ambulance' AND p_ambulance_id IS NOT NULL THEN
        SELECT sp.base_price, sp.service_name INTO v_base_cost, v_service_name
        FROM public.service_pricing sp WHERE sp.id = p_ambulance_id AND sp.is_active = true;
        
        IF v_base_cost IS NULL THEN
            SELECT a.base_price INTO v_base_cost FROM public.ambulances a WHERE a.id = p_ambulance_id;
            IF v_base_cost IS NOT NULL THEN v_service_name := 'Ambulance Service'; END IF;
        END IF;
    END IF;

    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        SELECT sp.base_price, sp.service_name 
        INTO v_base_cost, v_service_name
        FROM public.service_pricing sp
        LEFT JOIN public.hospitals h ON h.id = p_hospital_id
        WHERE sp.service_type = p_service_type 
          AND sp.is_active = true
          AND (
            sp.hospital_id = p_hospital_id OR 
            sp.organization_id = h.organization_id OR 
            (sp.hospital_id IS NULL AND sp.organization_id IS NULL)
          )
        ORDER BY 
          (sp.hospital_id = p_hospital_id) DESC, 
          (sp.organization_id = h.organization_id) DESC,
          sp.hospital_id DESC NULLS LAST,
          sp.organization_id DESC NULLS LAST
        LIMIT 1;
    END IF;

    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        IF p_service_type = 'ambulance' THEN v_base_cost := 150.00; v_service_name := 'Ambulance Service';
        ELSIF p_service_type = 'consultation' THEN v_base_cost := 100.00; v_service_name := 'Consultation';
        ELSIF p_service_type IN ('bed_booking', 'bed') THEN v_base_cost := 200.00; v_service_name := 'Bed Booking';
        ELSE v_base_cost := 100.00; v_service_name := 'Standard Service';
        END IF;
    END IF;

    v_breakdown := v_breakdown || jsonb_build_object(
        'name', COALESCE(v_service_name, 'Base Service'), 
        'cost', v_base_cost, 
        'type', 'base'
    );

    IF p_distance > 5 THEN
        v_distance_surcharge := ROUND((p_distance - 5) * 2.00, 2);
        v_breakdown := v_breakdown || jsonb_build_object(
            'name', 'Distance Surcharge', 
            'cost', v_distance_surcharge, 
            'type', 'distance'
        );
    END IF;

    IF p_is_urgent THEN
        v_urgency_surcharge := 25.00;
        v_breakdown := v_breakdown || jsonb_build_object(
            'name', 'Urgency Surcharge', 
            'cost', v_urgency_surcharge, 
            'type', 'urgency'
        );
    END IF;

    v_subtotal := v_base_cost + v_distance_surcharge + v_urgency_surcharge;
    v_service_fee := ROUND(v_subtotal * v_fee_rate, 2);

    v_breakdown := v_breakdown || jsonb_build_object(
        'name', 'Service Fee (2.5%)',
        'cost', v_service_fee,
        'type', 'fee'
    );

    v_total_cost := v_subtotal + v_service_fee;

    RETURN QUERY SELECT 
        v_base_cost,
        v_distance_surcharge,
        v_urgency_surcharge,
        v_service_fee,
        v_total_cost,
        v_breakdown;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_emergency_cost_v2(TEXT, DECIMAL, BOOLEAN, UUID, UUID, UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
