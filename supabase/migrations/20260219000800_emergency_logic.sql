-- 🛰️ Module 08: Emergency Logic (Fluid Edition)
-- Atomic operations for emergency lifecycles

-- 🛠️ ATOMIC: Create Emergency with Integrated Payment (Fluid v4)
-- Matches emergencyRequestsService.js expectation for create_emergency_v4
CREATE OR REPLACE FUNCTION public.create_emergency_v4(
    p_user_id UUID,
    p_request_data JSONB,
    p_payment_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request_id UUID;
    v_display_id TEXT;
    v_payment_id UUID;
    v_fee_amount NUMERIC;
    v_total_amount NUMERIC;
    v_requires_approval BOOLEAN := FALSE;
    v_hospital_id UUID;
BEGIN
    -- 1. Extract and Validate IDs
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    
    -- 2. Create the Emergency Request
    INSERT INTO public.emergency_requests (
        user_id,
        hospital_id,
        service_type,
        hospital_name,
        specialty,
        ambulance_type,
        patient_location,
        patient_snapshot,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        v_hospital_id,
        p_request_data->>'service_type',
        p_request_data->>'hospital_name',
        p_request_data->>'specialty',
        p_request_data->>'ambulance_type',
        p_request_data->'patient_location',
        p_request_data->'patient_snapshot',
        CASE 
            WHEN p_payment_data->>'method' = 'cash' THEN 'pending_approval'
            ELSE 'in_progress'
        END,
        NOW(),
        NOW()
    ) RETURNING id, display_id INTO v_request_id, v_display_id;

    -- 3. Sync to Visits (Fluid Flow)
    INSERT INTO public.visits (
        user_id,
        hospital_id,
        request_id,
        status,
        date,
        time,
        type,
        created_at
    ) VALUES (
        p_user_id,
        v_hospital_id,
        v_request_id,
        'pending',
        CURRENT_DATE::TEXT,
        CURRENT_TIME::TEXT,
        'emergency',
        NOW()
    );

    -- 4. Process Payment if Data Provided
    IF p_payment_data IS NOT NULL THEN
        v_total_amount := (p_payment_data->>'total_amount')::NUMERIC;
        v_fee_amount := (p_payment_data->>'fee_amount')::NUMERIC;
        IF v_fee_amount IS NULL THEN v_fee_amount := v_total_amount * 0.025; END IF;

        INSERT INTO public.payments (
            user_id,
            emergency_request_id,
            amount,
            currency,
            payment_method,
            status,
            metadata,
            created_at
        ) VALUES (
            p_user_id,
            v_request_id,
            v_total_amount,
            p_payment_data->>'currency',
            p_payment_data->>'method',
            CASE 
                WHEN p_payment_data->>'method' = 'cash' THEN 'pending'
                ELSE 'completed'
            END,
            jsonb_build_object(
                'fee_amount', v_fee_amount,
                'method_id', p_payment_data->>'method_id'
            ),
            NOW()
        ) RETURNING id INTO v_payment_id;

        IF p_payment_data->>'method' = 'cash' THEN
            v_requires_approval := TRUE;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'display_id', v_display_id,
        'payment_id', v_payment_id,
        'requires_approval', v_requires_approval,
        'emergency_status', CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'in_progress' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Approve Cash Payment
-- Matches paymentService.js:761 expectation
CREATE OR REPLACE FUNCTION public.approve_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_fee NUMERIC;
    v_org_id UUID;
    v_amount NUMERIC;
BEGIN
    -- 1. Get Payment & Org Info
    SELECT amount, (metadata->>'fee_amount')::NUMERIC, r.hospital_id
    INTO v_amount, v_fee, v_org_id 
    FROM public.payments p
    JOIN public.emergency_requests r ON p.emergency_request_id = r.id
    WHERE p.id = p_payment_id;

    -- Resolve Real Org ID
    SELECT organization_id INTO v_org_id FROM public.hospitals WHERE id = v_org_id;

    -- 2. Deduct Fee from Org Wallet
    UPDATE public.organization_wallets
    SET balance = balance - v_fee,
        updated_at = NOW()
    WHERE organization_id = v_org_id;

    -- 3. Record Ledger
    INSERT INTO public.wallet_ledger (
        organization_id,
        amount,
        type,
        description,
        metadata
    ) VALUES (
        v_org_id,
        -v_fee,
        'fee_deduction',
        'Platform fee for cash payment ' || p_request_id,
        jsonb_build_object('payment_id', p_payment_id, 'request_id', p_request_id)
    );

    -- 4. Update Statuses
    UPDATE public.payments SET status = 'completed', updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests SET status = 'in_progress', updated_at = NOW() WHERE id = p_request_id;
    UPDATE public.visits SET status = 'active', updated_at = NOW() WHERE request_id = p_request_id;

    RETURN jsonb_build_object('success', TRUE, 'fee_deducted', v_fee);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Decline Cash Payment
CREATE OR REPLACE FUNCTION public.decline_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
) RETURNS JSONB AS $$
BEGIN
    UPDATE public.payments SET status = 'failed', updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests SET status = 'payment_declined', updated_at = NOW() WHERE id = p_request_id;
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
    v_payment_id UUID;
    v_fee NUMERIC;
BEGIN
    v_fee := p_amount * 0.025;

    -- 1. Create Payment
    INSERT INTO public.payments (
        emergency_request_id,
        amount,
        currency,
        payment_method,
        status,
        metadata,
        created_at
    ) VALUES (
        p_emergency_request_id,
        p_amount,
        p_currency,
        'cash',
        'completed',
        jsonb_build_object('fee_amount', v_fee, 'manual_entry', true),
        NOW()
    ) RETURNING id INTO v_payment_id;

    -- 2. Deduct Fee
    UPDATE public.organization_wallets
    SET balance = balance - v_fee,
        updated_at = NOW()
    WHERE organization_id = p_organization_id;

    -- 3. Record Ledger
    INSERT INTO public.wallet_ledger (
        organization_id,
        amount,
        type,
        description,
        metadata
    ) VALUES (
        p_organization_id,
        -v_fee,
        'fee_deduction',
        'Manual cash payment fee for ' || p_emergency_request_id,
        jsonb_build_object('payment_id', v_payment_id)
    );

    RETURN jsonb_build_object('success', TRUE, 'payment_id', v_payment_id, 'fee_deducted', v_fee);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

