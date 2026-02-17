-- Discovery: dump emergency state into a temp table then select it
-- Using a simpler approach to avoid NOTICE truncation

BEGIN;

-- Create a temporary result log table
CREATE TABLE IF NOT EXISTS public._debug_log (
    line_num SERIAL,
    category TEXT,
    field TEXT,
    val TEXT
);
TRUNCATE public._debug_log;

-- Dump emergency requests
INSERT INTO public._debug_log (category, field, val)
SELECT 'emergency', 'id', id::text FROM public.emergency_requests ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'emergency', 'status', status FROM public.emergency_requests ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'emergency', 'payment_status', payment_status FROM public.emergency_requests ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'emergency', 'service_type', service_type FROM public.emergency_requests ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'emergency', 'hospital_name', hospital_name FROM public.emergency_requests ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'emergency', 'ambulance_id', ambulance_id::text FROM public.emergency_requests ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'emergency', 'responder_name', responder_name FROM public.emergency_requests ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'emergency', 'estimated_arrival', estimated_arrival FROM public.emergency_requests ORDER BY created_at DESC LIMIT 5;

-- Dump ambulances
INSERT INTO public._debug_log (category, field, val)
SELECT 'ambulance', 'id', id::text FROM public.ambulances ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'ambulance', 'status', status FROM public.ambulances ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'ambulance', 'hospital_id', hospital_id::text FROM public.ambulances ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'ambulance', 'driver', COALESCE(profile_id, driver_id)::text FROM public.ambulances ORDER BY created_at DESC LIMIT 5;

INSERT INTO public._debug_log (category, field, val)
SELECT 'ambulance', 'vehicle_number', vehicle_number FROM public.ambulances ORDER BY created_at DESC LIMIT 5;

-- Summary
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT * FROM public._debug_log ORDER BY category, line_num LOOP
        RAISE NOTICE '[%] %: %', rec.category, rec.field, rec.val;
    END LOOP;
END $$;

-- Cleanup
DROP TABLE IF EXISTS public._debug_log;

COMMIT;
