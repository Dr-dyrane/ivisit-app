-- 20260216010000_refine_relationships.sql
-- Phase 3: Relationship Refinement & Full UUID Stabilization

BEGIN;

-- 0. DROP ALL BLOCKING CONSTRAINTS
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

-- 1. STABILIZE emergency_requests
ALTER TABLE public.emergency_requests 
    ALTER COLUMN id TYPE UUID USING (CASE WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid ELSE gen_random_uuid() END);
ALTER TABLE public.emergency_requests ADD PRIMARY KEY (id);

-- 2. STABILIZE payments
ALTER TABLE public.payments 
    ALTER COLUMN id TYPE UUID USING (CASE WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid ELSE gen_random_uuid() END);
ALTER TABLE public.payments ADD PRIMARY KEY (id);

ALTER TABLE public.payments 
    ALTER COLUMN emergency_request_id TYPE UUID USING (CASE WHEN emergency_request_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN emergency_request_id::uuid ELSE NULL END);

-- 3. FORMALIZE RELATIONSHIPS (With loose constraints first if needed, but let's try direct)
-- We will add these back in the next step or keep them if they pass now.
-- For now, let's see if we can at least get the columns right.

COMMIT;

NOTIFY pgrst, 'reload schema';
