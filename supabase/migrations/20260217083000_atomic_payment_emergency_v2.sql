-- Migration: Atomic Emergency Request with Payment (Corrected Order)
-- Order: Payment Stub (no emergency_request_id) → Emergency Request → Link Payment
-- This respects the FK constraint: payments.emergency_request_id → emergency_requests.id

DROP FUNCTION IF EXISTS public.create_emergency_with_payment(UUID, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.create_emergency_with_payment(
    p_user_id UUID,
    p_request_data JSONB,
    p_payment_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    v_main_wallet_id UUID;
    v_display_id TEXT;
    v_hospital_name TEXT;
BEGIN
    -- ═══════════════════════════════════════════════════════════
    -- 1. EXTRACT & VALIDATE
    -- ═══════════════════════════════════════════════════════════
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_base_amount := COALESCE((p_payment_data->>'base_amount')::NUMERIC, 0);
    v_total_amount := COALESCE((p_payment_data->>'total_amount')::NUMERIC, 0);
    v_currency := COALESCE(p_payment_data->>'currency', 'USD');
    v_payment_method := COALESCE(p_payment_data->>'method', 'cash');
    v_display_id := COALESCE(p_request_data->>'request_id', 'REQ-' || floor(extract(epoch from now())));

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
    v_fee_rate := COALESCE(v_fee_rate, 2.5);

    -- Calculate fee on base amount
    v_calculated_fee := ROUND((v_base_amount * v_fee_rate) / 100, 2);

    -- If total wasn't passed, calculate it
    IF v_total_amount = 0 THEN
        v_total_amount := v_base_amount + v_calculated_fee;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 2. PAYMENT VALIDATION (Pre-flight check)
    -- ═══════════════════════════════════════════════════════════
    IF v_payment_method = 'cash' THEN
        -- Org must have enough to cover the fee (they keep the cash)
        SELECT ow.id, ow.balance INTO v_wallet_id, v_wallet_balance
        FROM public.organization_wallets ow
        WHERE ow.organization_id = v_organization_id;

        IF v_wallet_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization wallet not initialized');
        END IF;

        IF v_wallet_balance < v_calculated_fee THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Organization insufficient balance for platform fee',
                'code', 'ORG_INSUFFICIENT_FUNDS',
                'required', v_calculated_fee,
                'available', v_wallet_balance
            );
        END IF;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 3. CREATE PAYMENT STUB (no emergency_request_id yet)
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO public.payments (
        user_id,
        amount,
        currency,
        status,
        payment_method_id,
        emergency_request_id, -- NULL for now, linked after emergency creation
        organization_id,
        metadata
    ) VALUES (
        p_user_id,
        v_total_amount,
        v_currency,
        'pending', -- Start as pending, trigger fires on status change
        v_payment_method,
        NULL, -- ← No FK violation
        v_organization_id,
        jsonb_build_object(
            'base_amount', v_base_amount,
            'fee_amount', v_calculated_fee,
            'fee_rate', v_fee_rate,
            'source', 'create_emergency_with_payment',
            'hospital_id', v_hospital_id::text
        )
    )
    RETURNING id INTO v_payment_id;

    -- ═══════════════════════════════════════════════════════════
    -- 4. PROCESS FEE (Cash: deduct from org, credit platform)
    -- ═══════════════════════════════════════════════════════════
    IF v_payment_method = 'cash' THEN
        -- Deduct fee from org wallet
        UPDATE public.organization_wallets
        SET balance = balance - v_calculated_fee, updated_at = NOW()
        WHERE id = v_wallet_id;

        -- Record org debit
        INSERT INTO public.wallet_ledger (
            wallet_type, wallet_id, organization_id, amount, 
            transaction_type, description, reference_id, reference_type
        ) VALUES (
            'organization', v_wallet_id, v_organization_id, -v_calculated_fee, 
            'debit', 'Platform Fee (Cash Job)', v_payment_id, 'payment'
        );

        -- Credit platform wallet
        SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
        IF v_main_wallet_id IS NOT NULL THEN
            UPDATE public.ivisit_main_wallet 
            SET balance = balance + v_calculated_fee, last_updated = NOW() 
            WHERE id = v_main_wallet_id;

            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'main', v_main_wallet_id, v_calculated_fee, 
                'credit', 'Fee from Cash Job', v_payment_id, 'payment'
            );
        END IF;

        -- Mark payment completed (fee already handled manually above)
        UPDATE public.payments 
        SET status = 'completed',
            metadata = metadata || '{"ledger_credited": true}'::jsonb,
            updated_at = NOW()
        WHERE id = v_payment_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 5. CREATE EMERGENCY REQUEST
    -- ═══════════════════════════════════════════════════════════
    v_request_id := gen_random_uuid();

    INSERT INTO public.emergency_requests (
        id,
        user_id,
        hospital_id,
        hospital_name,
        service_type,
        specialty,
        status,
        patient_location,
        request_id,
        patient_snapshot,
        total_cost,
        payment_status,
        payment_method_id,
        created_at,
        updated_at
    )
    VALUES (
        v_request_id,
        p_user_id,
        v_hospital_id,
        v_hospital_name,
        p_request_data->>'service_type',
        p_request_data->>'specialty',
        'in_progress',
        CASE 
            WHEN p_request_data->>'patient_location' IS NOT NULL 
            THEN (p_request_data->>'patient_location')
            ELSE NULL
        END,
        v_display_id,
        CASE 
            WHEN p_request_data->'patient_snapshot' IS NOT NULL 
            THEN p_request_data->'patient_snapshot'
            ELSE NULL
        END,
        v_total_amount,
        'completed',
        v_payment_method,
        NOW(),
        NOW()
    );

    -- ═══════════════════════════════════════════════════════════
    -- 6. LINK PAYMENT → EMERGENCY REQUEST
    -- ═══════════════════════════════════════════════════════════
    UPDATE public.payments 
    SET emergency_request_id = v_request_id,
        updated_at = NOW()
    WHERE id = v_payment_id;

    -- ═══════════════════════════════════════════════════════════
    -- 7. RETURN SUCCESS
    -- ═══════════════════════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true, 
        'request_id', v_request_id, 
        'payment_id', v_payment_id,
        'display_id', v_display_id,
        'fee_deducted', v_calculated_fee,
        'total_amount', v_total_amount
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_emergency_with_payment(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_emergency_with_payment(UUID, JSONB, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
