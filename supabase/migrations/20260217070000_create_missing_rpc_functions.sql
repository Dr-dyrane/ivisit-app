-- Migration: Create Missing RPC Functions for Emergency Payment Flow
-- Author: Emergency Fix Implementation
-- Date: 2026-02-17
-- Description: Creates missing RPC functions that frontend is calling but don't exist

-- ============================================================================
-- 💰 1. CREATE check_cash_eligibility_v2 (Called by paymentService.js)
-- ============================================================================

-- Drop any existing version to avoid conflicts
DROP FUNCTION IF EXISTS public.check_cash_eligibility_v2(TEXT, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.check_cash_eligibility_v2(
    p_organization_id TEXT,
    p_estimated_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance NUMERIC;
    v_fee_rate NUMERIC;
    v_required_fee NUMERIC;
BEGIN
    -- Input validation
    IF p_organization_id IS NULL OR p_organization_id = '' THEN 
        RETURN FALSE; 
    END IF;
    
    IF p_estimated_amount IS NULL OR p_estimated_amount <= 0 THEN 
        RETURN FALSE; 
    END IF;

    -- Lookup organization wallet balance with safe UUID casting
    SELECT balance INTO v_balance FROM public.organization_wallets 
    WHERE organization_id::text = p_organization_id::text;
    
    -- Lookup organization fee rate with safe UUID casting
    SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations 
    WHERE id::text = p_organization_id::text;
    
    -- Use default fee rate if organization not found or has no rate
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    
    -- Calculate required fee (platform fee from cash payment)
    v_required_fee := (p_estimated_amount * v_fee_rate) / 100;
    
    -- Check if organization has sufficient balance
    RETURN COALESCE(v_balance, 0) >= v_required_fee;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return false for safety
        RAISE WARNING 'check_cash_eligibility_v2 error: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 💸 2. CREATE process_cash_payment_v2 (Enhanced version with fee deduction)
-- ============================================================================

-- Drop any existing version
DROP FUNCTION IF EXISTS public.process_cash_payment_v2(TEXT, TEXT, NUMERIC, TEXT) CASCADE;

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
    v_request_exists BOOLEAN;
BEGIN
    -- Input validation
    IF p_emergency_request_id IS NULL OR p_emergency_request_id = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request ID required');
    END IF;
    
    IF p_organization_id IS NULL OR p_organization_id = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization ID required');
    END IF;
    
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid amount required');
    END IF;

    -- Check if emergency request exists
    SELECT EXISTS(SELECT 1 FROM public.emergency_requests WHERE id::text = p_emergency_request_id::text) 
    INTO v_request_exists;
    
    IF NOT v_request_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    -- Convert text IDs to UUID (with error handling)
    BEGIN
        v_org_id := p_organization_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid organization ID format');
    END;

    -- Get user_id from emergency request
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
    IF v_main_wallet_id IS NOT NULL THEN
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
    END IF;

    -- 4. Record Payment (SILENTLY - bypass trigger using ledger_credited: true)
    INSERT INTO public.payments (
        user_id, amount, currency, status, payment_method_id, 
        emergency_request_id, organization_id, metadata
    ) VALUES (
        v_user_id, p_amount, p_currency, 'completed', 'cash', 
        p_emergency_request_id::UUID, v_org_id,
        jsonb_build_object('source', 'cash_payment_v2', 'protocol_fee', v_fee_amount, 'ledger_credited', true)
    ) RETURNING id INTO v_payment_id;

    -- 5. Complete Request
    UPDATE public.emergency_requests SET payment_status = 'completed'
    WHERE id::text = p_emergency_request_id::text;

    RETURN jsonb_build_object(
        'success', true, 
        'payment_id', v_payment_id, 
        'fee_deducted', v_fee_amount,
        'message', 'Cash payment processed successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'process_cash_payment_v2 error: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 🔐 3. GRANT EXECUTION PERMISSIONS
-- ============================================================================

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.check_cash_eligibility_v2(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_cash_payment_v2(TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

-- Grant execution to service role for backend operations
GRANT EXECUTE ON FUNCTION public.check_cash_eligibility_v2(TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_cash_payment_v2(TEXT, TEXT, NUMERIC, TEXT) TO service_role;

-- ============================================================================
-- 📢 4. NOTIFY POSTGREST TO RELOAD SCHEMA
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 📝 5. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.check_cash_eligibility_v2(TEXT, NUMERIC) IS 'V2: Checks if organization has sufficient wallet balance to cover platform fee for cash payments. Safe UUID casting with error handling.';
COMMENT ON FUNCTION public.process_cash_payment_v2(TEXT, TEXT, NUMERIC, TEXT) IS 'V2: Processes cash payments with fee deduction from org wallet and platform credit. Includes comprehensive error handling and ledger management.';
