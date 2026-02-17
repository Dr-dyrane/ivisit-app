-- Migration: Fix Double Ledger Entry for Cash Approvals
-- Prevents approve_cash_payment from duplicating logic handled by process_payment_with_ledger trigger.

BEGIN;

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
    v_wallet_balance NUMERIC;
BEGIN
    SELECT * INTO v_payment FROM public.payments WHERE id = v_payment_id;
    IF v_payment IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Payment not found'); END IF;
    IF v_payment.status != 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Payment is not pending'); END IF;

    v_organization_id := v_payment.organization_id;
    
    -- Recalculate fee strictly from org settings to match trigger logic (avoiding 0.00 metadata issues)
    SELECT COALESCE(ivisit_fee_percentage, 2.5) INTO v_fee_rate 
    FROM public.organizations WHERE id = v_organization_id;
    
    -- Recalculate fee amount based on total payment amount
    v_fee_amount := (v_payment.amount * v_fee_rate) / 100;

    -- Check balance (read-only check)
    SELECT balance INTO v_wallet_balance
    FROM public.organization_wallets WHERE organization_id = v_organization_id;

    IF v_wallet_balance < v_fee_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient organization wallet balance');
    END IF;

    -- Update Payment -> Triggers 'process_payment_with_ledger' which handles the actual deduction and ledger entry
    UPDATE public.payments 
    SET status = 'completed', 
        metadata = COALESCE(metadata, '{}'::jsonb) || '{"approved": true}'::jsonb, 
        updated_at = NOW() 
    WHERE id = v_payment_id;
    
    -- Sync Emergency Request
    UPDATE public.emergency_requests 
    SET status = 'in_progress', 
        payment_status = 'completed', 
        updated_at = NOW() 
    WHERE id = v_request_id;

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;

-- Cleanup bad 0.00 debit entries caused by the bug
-- Deletes 'Fee (Cash Approved)' entries with 0 amount IF a valid debit exists
DELETE FROM public.wallet_ledger
WHERE amount = 0 
AND transaction_type = 'debit' 
AND description = 'Fee (Cash Approved)'
AND reference_id IN (
    SELECT reference_id FROM public.wallet_ledger 
    WHERE transaction_type = 'debit' AND amount != 0
);

COMMIT;
NOTIFY pgrst, 'reload schema';
