-- SCC-062: Align wallet payment settlement with platform fee invariants.
-- Ensures wallet-origin payments persist ivisit_fee_amount/metadata so trigger distribution is accurate.

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
    v_wallet_id UUID;
    v_balance NUMERIC;
    v_payment_id UUID;
    v_fee_percentage NUMERIC := 2.5;
    v_fee_amount NUMERIC := 0;
BEGIN
    IF p_user_id IS NULL OR p_organization_id IS NULL OR p_emergency_request_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid wallet payment payload');
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

    SELECT COALESCE(NULLIF(ivisit_fee_percentage, 0), 2.5)
    INTO v_fee_percentage
    FROM public.organizations
    WHERE id = p_organization_id;

    v_fee_amount := ROUND(COALESCE(p_amount, 0) * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2);

    -- Deduct user wallet first (same transaction)
    UPDATE public.patient_wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Persist payment with explicit fee metadata for downstream settlement trigger.
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
        p_user_id,
        p_emergency_request_id,
        p_organization_id,
        p_amount,
        UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD')),
        'wallet',
        'completed',
        v_fee_amount,
        jsonb_build_object(
            'source', 'process_wallet_payment',
            'payment_kind', 'service',
            'fee_percentage', v_fee_percentage,
            'fee_amount', v_fee_amount,
            'fee', v_fee_amount
        ),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_payment_id;

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
        v_wallet_id,
        -p_amount,
        'debit',
        'Emergency Service Payment',
        v_payment_id,
        jsonb_build_object(
            'source', 'process_wallet_payment',
            'payment_kind', 'service'
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'fee_amount', v_fee_amount,
        'new_balance', (v_balance - p_amount)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.process_wallet_payment(UUID, UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_wallet_payment(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;
