-- ============================================================================
-- FIX WALLET VISIBILITY (RLS) — 2026-02-18
-- ============================================================================
-- The Main Wallet table has RLS enabled but NO policies, making it invisible.
-- This migration adds a SELECT policy so the frontend can fetch it.
-- ============================================================================

BEGIN;

-- 1. Ensure RLS is enabled (should be, but just in case)
ALTER TABLE public.ivisit_main_wallet ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential existing policy to avoid conflict
DROP POLICY IF EXISTS "Authenticated users can view main wallet" ON public.ivisit_main_wallet;

-- 3. Create permissive SELECT policy
CREATE POLICY "Authenticated users can view main wallet" 
ON public.ivisit_main_wallet 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Re-run seed just in case it truly was empty (idempotent)
INSERT INTO public.ivisit_main_wallet (id, balance, currency, last_updated)
SELECT gen_random_uuid(), 0.00, 'USD', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.ivisit_main_wallet);

COMMIT;

NOTIFY pgrst, 'reload schema';
