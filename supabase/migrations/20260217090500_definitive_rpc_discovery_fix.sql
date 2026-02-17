-- Migration: Definitive RPC Discovery Fix
-- Fixes PGRST202 by alphabetizing parameters and using robust types (JSONB/TEXT)
-- This ensures PostgREST can reliably match the RPC call from the Supabase client.

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. DROP ALL POTENTIAL OVERLOADS
-- ═══════════════════════════════════════════════════════════

-- create_emergency_with_payment
DROP FUNCTION IF EXISTS public.create_emergency_with_payment(UUID, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.create_emergency_with_payment(TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.create_emergency_with_payment(JSONB, JSONB, UUID);
DROP FUNCTION IF EXISTS public.create_emergency_with_payment(JSONB, JSONB, TEXT);

-- approve_cash_payment
DROP FUNCTION IF EXISTS public.approve_cash_payment(UUID, UUID);
DROP FUNCTION IF EXISTS public.approve_cash_payment(TEXT, TEXT);

-- decline_cash_payment
DROP FUNCTION IF EXISTS public.decline_cash_payment(UUID, UUID);
DROP FUNCTION IF EXISTS public.decline_cash_payment(TEXT, TEXT);


-- ═══════════════════════════════════════════════════════════
-- 2. CREATE ALPHABETIZED RPCs
-- ═══════════════════════════════════════════════════════════

-- create_emergency_with_payment (Alphabetical: p_payment_data, p_request_data, p_user_id)
CREATE OR REPLACE FUNCTION public.create_emergency_with_payment(
    p_payment_data JSONB,
    p_request_data JSONB,
    p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
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
    v_is_cash BOOLEAN;
    v_payment_status TEXT;
    v_emergency_status TEXT;
BEGIN
    -- 1. Cast and Extract
    v_user_id := p_user_id::UUID;
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_base_amount := COALESCE((p_payment_data->>'base_amount')::NUMERIC, 0);
    v_total_amount := COALESCE((p_payment_data->>'total_amount')::NUMERIC, 0);
    v_currency := COALESCE(p_payment_data->>'currency', 'USD');
    v_payment_method := COALESCE(p_payment_data->>'method', 'cash');
    v_display_id := COALESCE(p_request_data->>'request_id', 'REQ-' || floor(extract(epoch from now())));
    v_is_cash := (v_payment_method = 'cash');

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

    -- 2. Flows
    IF v_is_cash THEN
        -- Cash: Organization must cover fee later, but we check balance now
        SELECT ow.id, ow.balance INTO v_wallet_id, v_wallet_balance
        FROM public.organization_wallets ow
        WHERE ow.organization_id = v_organization_id;

        IF v_wallet_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization wallet not initialized');
        END IF;

        IF v_wallet_balance < v_calculated_fee THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Organization has insufficient balance to cover the platform fee for this cash trip.',
                'code', 'ORG_INSUFFICIENT_FUNDS',
                'fee', v_calculated_fee,
                'balance', v_wallet_balance
            );
        END IF;

        v_payment_status := 'pending';
        v_emergency_status := 'pending_approval';
    ELSE
        -- Card: Immediate complete
        v_payment_status := 'completed';
        v_emergency_status := 'in_progress';
    END IF;

    -- 3. Create Payment
    INSERT INTO public.payments (
        user_id, amount, currency, status, payment_method_id,
        emergency_request_id, organization_id, metadata
    ) VALUES (
        v_user_id, v_total_amount, v_currency, v_payment_status, v_payment_method,
        NULL, v_organization_id,
        jsonb_build_object(
            'base_amount', v_base_amount,
            'fee_amount', v_calculated_fee,
            'fee_rate', v_fee_rate,
            'requires_approval', v_is_cash,
            'hospital_id', v_hospital_id::text,
            'hospital_name', v_hospital_name
        )
    )
    RETURNING id INTO v_payment_id;

    -- 4. Process Fee (Card)
    IF NOT v_is_cash THEN
        SELECT ow.id, ow.balance INTO v_wallet_id, v_wallet_balance
        FROM public.organization_wallets ow
        WHERE ow.organization_id = v_organization_id;

        IF v_wallet_id IS NOT NULL AND v_wallet_balance >= v_calculated_fee THEN
            UPDATE public.organization_wallets
            SET balance = balance - v_calculated_fee, updated_at = NOW()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'organization', v_wallet_id, v_organization_id, -v_calculated_fee, 
                'debit', 'Platform Fee (Card)', v_payment_id, 'payment'
            );

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
                    'credit', 'Fee from Card Payment', v_payment_id, 'payment'
                );
            END IF;
        END IF;
    END IF;

    -- 5. Create Emergency
    v_request_id := gen_random_uuid();
    INSERT INTO public.emergency_requests (
        id, user_id, hospital_id, hospital_name, service_type,
        specialty, status, patient_location, request_id,
        patient_snapshot, total_cost, payment_status,
        payment_method_id, created_at, updated_at
    )
    VALUES (
        v_request_id, v_user_id, v_hospital_id, v_hospital_name,
        p_request_data->>'service_type', p_request_data->>'specialty',
        v_emergency_status,
        CASE WHEN p_request_data->>'patient_location' IS NOT NULL THEN (p_request_data->>'patient_location') ELSE NULL END,
        v_display_id,
        CASE WHEN p_request_data->'patient_snapshot' IS NOT NULL THEN p_request_data->'patient_snapshot' ELSE NULL END,
        v_total_amount, v_payment_status, v_payment_method, NOW(), NOW()
    );

    UPDATE public.payments SET emergency_request_id = v_request_id, updated_at = NOW() WHERE id = v_payment_id;

    RETURN jsonb_build_object(
        'success', true, 
        'request_id', v_request_id, 
        'payment_id', v_payment_id,
        'display_id', v_display_id,
        'requires_approval', v_is_cash,
        'fee_amount', v_calculated_fee,
        'total_amount', v_total_amount,
        'payment_status', v_payment_status,
        'emergency_status', v_emergency_status
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- approve_cash_payment (Alphabetical: p_payment_id, p_request_id)
CREATE OR REPLACE FUNCTION public.approve_cash_payment(
    p_payment_id TEXT,
    p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_id UUID := p_payment_id::UUID;
    v_request_id UUID := p_request_id::UUID;
    v_payment RECORD;
    v_organization_id UUID;
    v_fee_amount NUMERIC;
    v_fee_rate NUMERIC;
    v_wallet_id UUID;
    v_wallet_balance NUMERIC;
    v_main_wallet_id UUID;
BEGIN
    SELECT * INTO v_payment FROM public.payments WHERE id = v_payment_id;
    IF v_payment IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Payment not found'); END IF;
    IF v_payment.status != 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Payment is not pending'); END IF;

    v_organization_id := v_payment.organization_id;
    v_fee_amount := COALESCE((v_payment.metadata->>'fee_amount')::NUMERIC, 0);
    v_fee_rate := COALESCE((v_payment.metadata->>'fee_rate')::NUMERIC, 2.5);

    SELECT ow.id, ow.balance INTO v_wallet_id, v_wallet_balance
    FROM public.organization_wallets ow WHERE ow.organization_id = v_organization_id;

    IF v_wallet_balance < v_fee_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient organization wallet balance');
    END IF;

    UPDATE public.organization_wallets SET balance = balance - v_fee_amount, updated_at = NOW() WHERE id = v_wallet_id;
    INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, amount, transaction_type, description, reference_id, reference_type)
    VALUES ('organization', v_wallet_id, v_organization_id, -v_fee_amount, 'debit', 'Fee (Cash Approved)', v_payment_id, 'payment');

    SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
    IF v_main_wallet_id IS NOT NULL THEN
        UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount, last_updated = NOW() WHERE id = v_main_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_type, wallet_id, amount, transaction_type, description, reference_id, reference_type)
        VALUES ('main', v_main_wallet_id, v_fee_amount, 'credit', 'Fee from Approved Cash Job', v_payment_id, 'payment');
    END IF;

    UPDATE public.payments SET status = 'completed', metadata = metadata || '{"approved": true}'::jsonb, updated_at = NOW() WHERE id = v_payment_id;
    UPDATE public.emergency_requests SET status = 'in_progress', payment_status = 'completed', updated_at = NOW() WHERE id = v_request_id;

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;

-- decline_cash_payment (Alphabetical: p_payment_id, p_request_id)
CREATE OR REPLACE FUNCTION public.decline_cash_payment(
    p_payment_id TEXT,
    p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_id UUID := p_payment_id::UUID;
    v_request_id UUID := p_request_id::UUID;
BEGIN
    UPDATE public.payments SET status = 'declined', updated_at = NOW() WHERE id = v_payment_id AND status = 'pending';
    UPDATE public.emergency_requests SET status = 'payment_declined', payment_status = 'declined', updated_at = NOW() WHERE id = v_request_id;
    RETURN jsonb_build_object('success', true);
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- 3. PERMISSIONS
-- ═══════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.create_emergency_with_payment(JSONB, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_cash_payment(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_cash_payment(TEXT, TEXT) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
