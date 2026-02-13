-- Migration to handle secure wallet-to-organization payments
-- This enables end-to-end balance flow from Patient App to Console

CREATE OR REPLACE FUNCTION public.process_wallet_payment(
    p_user_id UUID,
    p_organization_id UUID,
    p_emergency_request_id UUID,
    p_amount DECIMAL,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
    v_patient_wallet_id UUID;
    v_patient_balance DECIMAL;
    v_payment_id UUID;
BEGIN
    -- 1. Check if patient has enough balance
    SELECT id, balance INTO v_patient_wallet_id, v_patient_balance
    FROM public.patient_wallets
    WHERE user_id = p_user_id;

    IF v_patient_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Patient wallet not found';
    END IF;

    IF v_patient_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Please top up your wallet.';
    END IF;

    -- 2. Deduct from Patient Wallet (Debit)
    UPDATE public.patient_wallets
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = v_patient_wallet_id;

    -- 3. Log the Debit in Patient Ledger
    INSERT INTO public.wallet_ledger (
        wallet_type, wallet_id, user_id, amount, 
        transaction_type, description, reference_id, reference_type
    ) VALUES (
        'patient', v_patient_wallet_id, p_user_id, -p_amount,
        'debit', 'Service Payment (Wallet)', p_emergency_request_id, 'emergency_request'
    );

    -- 4. Create the record in 'payments' table
    -- This will automatically trigger 'process_payment_with_fees' 
    -- which credits the organization_wallet and ivisit_main_wallet
    INSERT INTO public.payments (
        user_id, 
        amount, 
        currency, 
        status, 
        payment_method_id, 
        emergency_request_id, 
        organization_id,
        metadata
    ) VALUES (
        p_user_id,
        p_amount,
        p_currency,
        'completed',
        'wallet_' || v_patient_wallet_id::text,
        p_emergency_request_id,
        p_organization_id,
        jsonb_build_object('source', 'patient_wallet', 'wallet_id', v_patient_wallet_id)
    )
    RETURNING id INTO v_payment_id;

    -- 5. Return success result
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'new_balance', (SELECT balance FROM public.patient_wallets WHERE id = v_patient_wallet_id)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.process_wallet_payment(UUID, UUID, UUID, DECIMAL, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
