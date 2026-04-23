-- Active emergency requests are active as soon as they enter pending approval.
-- This protects against duplicate ambulance/bed requests from stale clients,
-- reloads, and multiple signed-in devices.

DO $$
DECLARE
    v_duplicate RECORD;
BEGIN
    SELECT user_id, service_type, COUNT(*) AS active_count
    INTO v_duplicate
    FROM public.emergency_requests
    WHERE user_id IS NOT NULL
      AND service_type IN ('ambulance', 'bed')
      AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived')
    GROUP BY user_id, service_type
    HAVING COUNT(*) > 1
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION
            'Cannot install active request guard: user % has % active % requests. Resolve duplicates first.',
            v_duplicate.user_id,
            v_duplicate.active_count,
            v_duplicate.service_type;
    END IF;
END $$;

DROP INDEX IF EXISTS public.emergency_requests_one_active_ambulance_per_user_idx;
CREATE UNIQUE INDEX emergency_requests_one_active_ambulance_per_user_idx
ON public.emergency_requests (user_id)
WHERE service_type = 'ambulance'
  AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived');

DROP INDEX IF EXISTS public.emergency_requests_one_active_bed_per_user_idx;
CREATE UNIQUE INDEX emergency_requests_one_active_bed_per_user_idx
ON public.emergency_requests (user_id)
WHERE service_type = 'bed'
  AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived');
