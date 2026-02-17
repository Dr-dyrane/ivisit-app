-- Emergency Fix: Re-apply check_cash_eligibility
-- Date: 2026-02-17 02:00:00

DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION public.check_cash_eligibility(
    p_organization_id TEXT,
    p_estimated_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance NUMERIC;
    v_fee_rate NUMERIC;
    v_required_fee NUMERIC;
BEGIN
    IF p_organization_id IS NULL OR p_organization_id = '' THEN RETURN FALSE; END IF;

    -- Lookup balance with safe casting
    SELECT balance INTO v_balance FROM public.organization_wallets 
    WHERE organization_id::text = p_organization_id::text;
    
    -- Lookup fee rate with safe casting
    SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations 
    WHERE id::text = p_organization_id::text;
    
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    v_required_fee := (p_estimated_amount * v_fee_rate) / 100;
    
    RETURN COALESCE(v_balance, 0) >= v_required_fee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_cash_eligibility(TEXT, NUMERIC) TO authenticated;

NOTIFY pgrst, 'reload schema';
