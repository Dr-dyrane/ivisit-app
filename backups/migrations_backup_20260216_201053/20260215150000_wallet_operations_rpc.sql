-- Migration: Financial Projections & Analytics Extensions
-- Provides read-only analytics for the Wallet Intelligence engine

-- 1. Function to calculate 30d projected revenue
-- This follows the "Reflection" model: it looks at confirmed ledger credits
CREATE OR REPLACE FUNCTION public.get_wallet_projection(
    p_organization_id UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_total_30d DECIMAL;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_30d
    FROM public.wallet_ledger
    WHERE (transaction_type = 'credit' OR transaction_type = 'payment')
    AND created_at >= NOW() - INTERVAL '30 days'
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);

    -- Simple reflection: last 30 days revenue used as next 30 days projection
    RETURN v_total_30d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_wallet_projection(UUID) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
