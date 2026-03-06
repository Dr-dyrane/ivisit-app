-- SCC-057 runtime sync: ensure retry_payment_with_different_method exists on remote
-- so console retry-payment UX can call the canonical finance RPC.

CREATE OR REPLACE FUNCTION public.retry_payment_with_different_method(
    p_emergency_request_id UUID,
    p_new_payment_method_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_payment_amount NUMERIC;
    v_organization_id UUID;
    v_currency TEXT := 'USD';
    v_payment_id UUID;
    v_validation_result JSONB;
BEGIN
    IF p_emergency_request_id IS NULL OR p_new_payment_method_id IS NULL OR p_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing required retry payment arguments');
    END IF;

    -- Resolve amount/organization from canonical emergency + hospital contract.
    SELECT
        er.total_cost,
        COALESCE(h.organization_id, p.organization_id),
        COALESCE(p.currency, 'USD')
    INTO v_payment_amount, v_organization_id, v_currency
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    LEFT JOIN LATERAL (
        SELECT organization_id, currency
        FROM public.payments
        WHERE emergency_request_id = er.id
        ORDER BY created_at DESC
        LIMIT 1
    ) p ON TRUE
    WHERE er.id = p_emergency_request_id
      AND er.user_id = p_user_id;

    IF v_payment_amount IS NULL OR v_payment_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request has no payable total_cost');
    END IF;

    -- Validate the selected replacement payment method.
    v_validation_result := public.validate_payment_method(p_user_id, p_new_payment_method_id);

    IF NOT COALESCE((v_validation_result->>'valid')::BOOLEAN, false) THEN
        RETURN jsonb_build_object('success', false, 'error', COALESCE(v_validation_result->>'error', 'Invalid payment method'));
    END IF;

    -- Create canonical pending card payment and preserve method context in metadata.
    INSERT INTO public.payments (
        user_id,
        emergency_request_id,
        organization_id,
        amount,
        currency,
        payment_method,
        status,
        metadata
    ) VALUES (
        p_user_id,
        p_emergency_request_id,
        v_organization_id,
        v_payment_amount,
        v_currency,
        'card',
        'pending',
        jsonb_build_object(
            'payment_method_id', p_new_payment_method_id,
            'source', 'retry_payment_with_different_method'
        )
    )
    RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'retry_successful', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.retry_payment_with_different_method(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_payment_with_different_method(UUID, UUID, UUID) TO service_role;
