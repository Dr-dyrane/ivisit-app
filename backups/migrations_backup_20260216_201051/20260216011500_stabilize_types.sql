-- 20260216011500_stabilize_types.sql
-- Step 2: Convert columns to UUID

BEGIN;

-- Payments
ALTER TABLE public.payments 
    ALTER COLUMN id TYPE UUID USING (CASE WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid ELSE gen_random_uuid() END),
    ALTER COLUMN user_id TYPE UUID USING (CASE WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN user_id::uuid ELSE NULL END),
    ALTER COLUMN organization_id TYPE UUID USING (CASE WHEN organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN organization_id::uuid ELSE NULL END),
    ALTER COLUMN emergency_request_id TYPE UUID USING (CASE WHEN emergency_request_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN emergency_request_id::uuid ELSE NULL END);

-- Emergency Requests
ALTER TABLE public.emergency_requests 
    ALTER COLUMN id TYPE UUID USING (CASE WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid ELSE gen_random_uuid() END),
    ALTER COLUMN user_id TYPE UUID USING (CASE WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN user_id::uuid ELSE NULL END),
    ALTER COLUMN hospital_id TYPE UUID USING (CASE WHEN hospital_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN hospital_id::uuid ELSE NULL END),
    ALTER COLUMN responder_id TYPE UUID USING (CASE WHEN responder_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN responder_id::uuid ELSE NULL END);

-- Visits
ALTER TABLE public.visits 
    ALTER COLUMN user_id TYPE UUID USING (CASE WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN user_id::uuid ELSE NULL END),
    ALTER COLUMN hospital_id TYPE UUID USING (CASE WHEN hospital_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN hospital_id::uuid ELSE NULL END);

COMMIT;
