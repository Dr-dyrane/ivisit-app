-- Migration: Fix payment_id linkage in create_emergency_v3
-- Ensures emergency_requests.payment_id is populated during creation

BEGIN;

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
    v_patient_wallet_id UUID;
    v_service_type TEXT;
BEGIN
    -- Extract values
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_base_amount := COALESCE((p_payment_data->>'base_amount')::NUMERIC, 0);
    v_total_amount := COALESCE((p_payment_data->>'total_amount')::NUMERIC, 0);
    v_currency := COALESCE(p_payment_data->>'currency', 'USD');
    v_payment_method := COALESCE(p_payment_data->>'method', 'cash');
    v_display_id := COALESCE(p_request_data->>'request_id', 'REQ-' || floor(extract(epoch from now())));
    v_is_cash := (v_payment_method = 'cash');
    v_service_type := p_request_data->>'service_type';

    -- BLOCK DUPLICATE AMBULANCE REQUESTS (Keep bed booking allowed)
    IF v_service_type = 'ambulance' AND EXISTS (
        SELECT 1 FROM public.emergency_requests er 
        WHERE er.user_id = p_user_id 
        AND er.service_type = 'ambulance' 
        AND er.status NOT IN ('completed', 'cancelled', 'payment_declined')
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'You already have an active ambulance request.',
            'code', 'ACTIVE_AMBULANCE_EXISTS'
        );
    END IF;

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

    -- 1. Create Payment First
    INSERT INTO public.payments (
        user_id, amount, currency, status, payment_method_id,
        organization_id, metadata
    ) VALUES (
        p_user_id, v_total_amount, v_currency, v_payment_status, v_payment_method,
        v_organization_id,
        jsonb_build_object('base', v_base_amount, 'fee', v_calculated_fee)
    ) RETURNING id INTO v_payment_id;

    -- 2. Create Emergency Request with the payment_id linked
    v_request_id := gen_random_uuid();
    INSERT INTO public.emergency_requests (
        id, user_id, hospital_id, hospital_name, service_type, specialty,
        status, request_id, patient_location, patient_snapshot, total_cost,
        payment_status, payment_method_id, payment_id
    ) VALUES (
        v_request_id, p_user_id, v_hospital_id, v_hospital_name,
        v_service_type, p_request_data->>'specialty',
        v_emergency_status, v_display_id, 
        v_patient_location,
        (p_request_data->>'patient_snapshot')::jsonb,
        v_total_amount, v_payment_status, v_payment_method, v_payment_id
    );

    -- 3. Link back from payment to request
    UPDATE public.payments SET emergency_request_id = v_request_id WHERE id = v_payment_id;

    -- 💡 PATIENT LEDGER: Log a pending transaction
    SELECT id INTO v_patient_wallet_id FROM public.patient_wallets WHERE user_id = p_user_id;
    IF v_patient_wallet_id IS NOT NULL THEN
        INSERT INTO public.wallet_ledger (
            wallet_type, wallet_id, user_id, amount, 
            transaction_type, description, reference_id, reference_type, metadata
        ) VALUES (
            'patient', v_patient_wallet_id, p_user_id, -v_total_amount,
            'debit', 'Cash Payment for ' || v_service_type || ' (' || v_display_id || ')', 
            v_payment_id, 'payment',
            jsonb_build_object('status', v_payment_status, 'hospital_name', v_hospital_name)
        );
    END IF;

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

COMMIT;
