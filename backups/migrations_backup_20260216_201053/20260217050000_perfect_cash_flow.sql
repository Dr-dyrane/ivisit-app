-- Migration: Perfect Cash Flow Logic
-- Handles Fee Deduction + Platform Credit + Trigger Bypass

CREATE OR REPLACE FUNCTION public.process_cash_payment_v2(
    p_emergency_request_id TEXT,
    p_organization_id TEXT,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
) RETURNS JSONB AS $$
DECLARE
    v_payment_id UUID;
    v_user_id UUID;
    v_org_id UUID;
    v_fee_rate NUMERIC;
    v_fee_amount NUMERIC;
    v_wallet_id UUID;
    v_main_wallet_id UUID;
BEGIN
    v_org_id := p_organization_id::UUID;

    SELECT user_id INTO v_user_id FROM public.emergency_requests 
    WHERE id::text = p_emergency_request_id::text;

    -- 1. Calculate Fee
    SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = v_org_id;
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    v_fee_amount := (p_amount * v_fee_rate) / 100;

    -- 2. Debit Org Wallet (They received cash, so we take fee from digital balance)
    UPDATE public.organization_wallets 
    SET balance = balance - v_fee_amount, updated_at = NOW()
    WHERE organization_id = v_org_id
    RETURNING id INTO v_wallet_id;

    IF v_wallet_id IS NOT NULL THEN
        INSERT INTO public.wallet_ledger (
            wallet_type, wallet_id, organization_id, amount, 
            transaction_type, description, reference_id, reference_type
        ) VALUES (
            'organization', v_wallet_id, v_org_id, -v_fee_amount,
            'debit', 'Protocol Fee (Cash Job)', p_emergency_request_id::UUID, 'emergency_request'
        );
    END IF;

    -- 3. Credit Platform Wallet
    SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
    UPDATE public.ivisit_main_wallet 
    SET balance = balance + v_fee_amount, last_updated = NOW() 
    WHERE id = v_main_wallet_id;

    INSERT INTO public.wallet_ledger (
        wallet_type, wallet_id, organization_id, amount, 
        transaction_type, description, reference_id, reference_type
    ) VALUES (
        'main', v_main_wallet_id, NULL, v_fee_amount,
        'credit', 'Fee from Cash Job ' || p_emergency_request_id, p_emergency_request_id::UUID, 'emergency_request'
    );

    -- 4. Record Payment (SILENTLY - bypass trigger using ledger_credited: true)
    INSERT INTO public.payments (
        user_id, amount, currency, status, payment_method_id, 
        emergency_request_id, organization_id, metadata
    ) VALUES (
        v_user_id, p_amount, p_currency, 'completed', 'cash', 
        p_emergency_request_id::UUID, v_org_id,
        jsonb_build_object('source', 'cash_payment', 'protocol_fee', v_fee_amount, 'ledger_credited', true)
    ) RETURNING id INTO v_payment_id;

    -- 5. Complete Request
    UPDATE public.emergency_requests SET payment_status = 'completed'
    WHERE id::text = p_emergency_request_id::text;

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'fee_deducted', v_fee_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
