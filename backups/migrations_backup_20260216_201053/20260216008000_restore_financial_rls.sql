-- 20260216008000_restore_financial_rls.sql
-- Restores RLS policies for financial tables with robust comparisons.

BEGIN;

-- 1. ivisit_main_wallet
ALTER TABLE public.ivisit_main_wallet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage main wallet" ON public.ivisit_main_wallet;
DROP POLICY IF EXISTS "Admins can view main wallet" ON public.ivisit_main_wallet;

CREATE POLICY "Allow authenticated to view main wallet" 
ON public.ivisit_main_wallet FOR SELECT 
USING (auth.role() = 'authenticated');

GRANT SELECT ON public.ivisit_main_wallet TO authenticated;
GRANT SELECT ON public.ivisit_main_wallet TO anon;

-- 2. organization_wallets
ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org admins view own wallet" ON public.organization_wallets;
CREATE POLICY "Allow authenticated to view org wallet" 
ON public.organization_wallets FOR SELECT 
USING (auth.role() = 'authenticated');

GRANT SELECT ON public.organization_wallets TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
