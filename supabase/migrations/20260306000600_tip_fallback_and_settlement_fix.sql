-- SCC-063: Tip fallback parity (wallet -> cash/card options)
-- 1) Prevent double-credit on wallet tips by letting payment distribution trigger handle org credit.
-- 2) Add explicit cash-tip recording RPC for insufficient-wallet fallback.

CREATE OR REPLACE FUNCTION public.process_visit_tip(
    p_visit_id UUID,
    p_tip_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_visit RECORD;
    v_request_hospital_id UUID;
    v_org_id UUID;
    v_patient_wallet_id UUID;
    v_patient_balance NUMERIC;
    v_patient_balance_after NUMERIC;
    v_payment_id UUID;
    v_tip_amount NUMERIC := ROUND(COALESCE(p_tip_amount, 0)::NUMERIC, 2);
    v_currency TEXT := UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD'));
BEGIN
    IF v_actor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF p_visit_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit id is required');
    END IF;

    IF v_tip_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tip amount must be greater than zero');
    END IF;

    SELECT *
    INTO v_visit
    FROM public.visits
    WHERE id = p_visit_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found');
    END IF;

    IF v_visit.user_id IS DISTINCT FROM v_actor_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF COALESCE(v_visit.tip_amount, 0) > 0 OR v_visit.tip_payment_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tip already processed for this visit');
    END IF;

    IF COALESCE(v_visit.status, '') <> 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit must be completed before tipping');
    END IF;

    IF v_visit.request_id IS NOT NULL THEN
        SELECT hospital_id
        INTO v_request_hospital_id
        FROM public.emergency_requests
        WHERE id = v_visit.request_id
        LIMIT 1;
    END IF;

    SELECT organization_id
    INTO v_org_id
    FROM public.hospitals
    WHERE id = COALESCE(v_visit.hospital_id, v_request_hospital_id)
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unable to resolve destination organization');
    END IF;

    SELECT id, balance
    INTO v_patient_wallet_id, v_patient_balance
    FROM public.patient_wallets
    WHERE user_id = v_actor_id
    LIMIT 1
    FOR UPDATE;

    IF v_patient_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient wallet not found');
    END IF;

    IF COALESCE(v_patient_balance, 0) < v_tip_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient wallet balance for tip',
            'required', v_tip_amount,
            'available', COALESCE(v_patient_balance, 0)
        );
    END IF;

    -- Persist payment and rely on process_payment_distribution trigger for org/platform settlement.
    INSERT INTO public.payments (
        user_id,
        emergency_request_id,
        organization_id,
        amount,
        currency,
        payment_method,
        status,
        ivisit_fee_amount,
        metadata,
        processed_at,
        created_at,
        updated_at
    )
    VALUES (
        v_actor_id,
        v_visit.request_id,
        v_org_id,
        v_tip_amount,
        v_currency,
        'wallet',
        'completed',
        0,
        jsonb_build_object(
            'payment_kind', 'tip',
            'tip_method', 'wallet',
            'visit_id', p_visit_id,
            'fee_amount', 0,
            'fee', 0,
            'source', 'process_visit_tip'
        ),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_payment_id;

    UPDATE public.patient_wallets
    SET balance = COALESCE(balance, 0) - v_tip_amount,
        updated_at = NOW()
    WHERE id = v_patient_wallet_id
    RETURNING balance INTO v_patient_balance_after;

    INSERT INTO public.wallet_ledger (
        wallet_id,
        amount,
        transaction_type,
        description,
        reference_id,
        metadata,
        created_at
    )
    VALUES (
        v_patient_wallet_id,
        -v_tip_amount,
        'debit',
        'Patient Tip',
        v_payment_id,
        jsonb_build_object(
            'payment_kind', 'tip',
            'tip_method', 'wallet',
            'visit_id', p_visit_id,
            'source', 'process_visit_tip'
        ),
        NOW()
    );

    UPDATE public.visits
    SET tip_amount = v_tip_amount,
        tip_currency = v_currency,
        tipped_at = NOW(),
        tip_payment_id = v_payment_id,
        updated_at = NOW()
    WHERE id = p_visit_id;

    RETURN jsonb_build_object(
        'success', true,
        'visit_id', p_visit_id,
        'payment_id', v_payment_id,
        'tip_amount', v_tip_amount,
        'currency', v_currency,
        'new_wallet_balance', COALESCE(v_patient_balance_after, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_visit_cash_tip(
    p_visit_id UUID,
    p_tip_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_visit RECORD;
    v_request_hospital_id UUID;
    v_org_id UUID;
    v_payment_id UUID;
    v_tip_amount NUMERIC := ROUND(COALESCE(p_tip_amount, 0)::NUMERIC, 2);
    v_currency TEXT := UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD'));
BEGIN
    IF v_actor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF p_visit_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit id is required');
    END IF;

    IF v_tip_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tip amount must be greater than zero');
    END IF;

    SELECT *
    INTO v_visit
    FROM public.visits
    WHERE id = p_visit_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found');
    END IF;

    IF v_visit.user_id IS DISTINCT FROM v_actor_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF COALESCE(v_visit.tip_amount, 0) > 0 OR v_visit.tip_payment_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tip already processed for this visit');
    END IF;

    IF COALESCE(v_visit.status, '') <> 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit must be completed before tipping');
    END IF;

    IF v_visit.request_id IS NOT NULL THEN
        SELECT hospital_id
        INTO v_request_hospital_id
        FROM public.emergency_requests
        WHERE id = v_visit.request_id
        LIMIT 1;
    END IF;

    SELECT organization_id
    INTO v_org_id
    FROM public.hospitals
    WHERE id = COALESCE(v_visit.hospital_id, v_request_hospital_id)
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unable to resolve destination organization');
    END IF;

    -- Cash tip is recorded as completed payment with zero platform fee and no wallet mutation.
    INSERT INTO public.payments (
        user_id,
        emergency_request_id,
        organization_id,
        amount,
        currency,
        payment_method,
        status,
        ivisit_fee_amount,
        metadata,
        processed_at,
        created_at,
        updated_at
    )
    VALUES (
        v_actor_id,
        v_visit.request_id,
        v_org_id,
        v_tip_amount,
        v_currency,
        'cash',
        'completed',
        0,
        jsonb_build_object(
            'payment_kind', 'tip',
            'tip_method', 'cash',
            'visit_id', p_visit_id,
            'fee_amount', 0,
            'fee', 0,
            'source', 'record_visit_cash_tip'
        ),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_payment_id;

    UPDATE public.visits
    SET tip_amount = v_tip_amount,
        tip_currency = v_currency,
        tipped_at = NOW(),
        tip_payment_id = v_payment_id,
        updated_at = NOW()
    WHERE id = p_visit_id;

    RETURN jsonb_build_object(
        'success', true,
        'visit_id', p_visit_id,
        'payment_id', v_payment_id,
        'tip_amount', v_tip_amount,
        'currency', v_currency,
        'tip_method', 'cash'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_visit_tip(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_visit_tip(UUID, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_visit_cash_tip(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_visit_cash_tip(UUID, NUMERIC, TEXT) TO service_role;
