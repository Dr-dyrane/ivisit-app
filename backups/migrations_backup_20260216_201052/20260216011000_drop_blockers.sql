-- 20260216011000_drop_blockers.sql
-- Step 1: Drop Policies and Constraints

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS on_emergency_status_change ON public.emergency_requests;
DROP TRIGGER IF EXISTS tr_process_payment_with_ledger ON public.payments;

-- Drop Policies (Hardcoded for safety)
DROP POLICY IF EXISTS "Users manage own emergencies" ON public.emergency_requests;
DROP POLICY IF EXISTS "Admins see all emergencies" ON public.emergency_requests;
DROP POLICY IF EXISTS "Responders see assigned emergencies" ON public.emergency_requests;
DROP POLICY IF EXISTS "Users see own payments" ON public.payments;
DROP POLICY IF EXISTS "Orgs see own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can see own visits" ON public.visits;
DROP POLICY IF EXISTS "Hospitals see own visits" ON public.visits;

-- Drop Constraints (Aggressive)
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_user_id_fkey CASCADE;
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_hospital_id_fkey CASCADE;
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_responder_id_fkey CASCADE;
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_pkey CASCADE;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey CASCADE;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_organization_id_fkey CASCADE;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_emergency_request_id_fkey CASCADE;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_pkey CASCADE;

ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_user_id_fkey CASCADE;
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_hospital_id_fkey CASCADE;

COMMIT;
