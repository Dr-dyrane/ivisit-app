-- ============================================================================
-- Hotfix: current_call column is JSONB, not TEXT
-- Also backfill the active emergency with ambulance assignment
-- ============================================================================

BEGIN;

-- Fix: Cast current_call to jsonb properly
CREATE OR REPLACE FUNCTION public.auto_assign_driver()
RETURNS TRIGGER AS $$
DECLARE
    v_ambulance_id TEXT;
    v_driver_profile_id UUID;
    v_driver_name TEXT;
    v_driver_phone TEXT;
    v_ambulance_type TEXT;
    v_vehicle_number TEXT;
    v_hospital_wait_minutes INTEGER;
    v_eta_text TEXT;
BEGIN
    -- Guard: Only assign ambulance requests that are ready for dispatch
    IF NEW.service_type != 'ambulance' THEN
        RETURN NEW;
    END IF;

    -- Guard: Only assign when status is actionable (not pending_approval)
    IF NEW.status NOT IN ('in_progress', 'accepted') THEN
        RETURN NEW;
    END IF;

    -- Guard: Already assigned
    IF NEW.ambulance_id IS NOT NULL AND NEW.responder_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Find available ambulance at this hospital
    SELECT
        a.id,
        COALESCE(a.profile_id, a.driver_id),
        p.full_name,
        p.phone,
        a.type,
        a.vehicle_number
    INTO
        v_ambulance_id,
        v_driver_profile_id,
        v_driver_name,
        v_driver_phone,
        v_ambulance_type,
        v_vehicle_number
    FROM public.ambulances a
    LEFT JOIN public.profiles p ON p.id = COALESCE(a.profile_id, a.driver_id)
    WHERE a.status = 'available'
      AND a.hospital_id::text = NEW.hospital_id::text
    ORDER BY a.created_at ASC
    LIMIT 1;

    -- If no ambulance found, exit silently
    IF v_ambulance_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get hospital wait time for ETA
    SELECT COALESCE(h.emergency_wait_time_minutes, 10)
    INTO v_hospital_wait_minutes
    FROM public.hospitals h
    WHERE h.id::text = NEW.hospital_id::text;

    IF v_hospital_wait_minutes IS NULL OR v_hospital_wait_minutes < 1 THEN
        v_hospital_wait_minutes := 5;
    END IF;

    v_eta_text := v_hospital_wait_minutes || ' mins';

    -- Update the emergency request with responder details
    UPDATE public.emergency_requests
    SET
        ambulance_id = v_ambulance_id,
        responder_id = v_driver_profile_id,
        responder_name = COALESCE(v_driver_name, 'Emergency Responder'),
        responder_phone = v_driver_phone,
        responder_vehicle_type = COALESCE(v_ambulance_type, 'Basic'),
        responder_vehicle_plate = v_vehicle_number,
        estimated_arrival = v_eta_text
    WHERE id = NEW.id;

    -- Mark ambulance as on_trip — cast to jsonb for current_call
    UPDATE public.ambulances
    SET status = 'on_trip', current_call = to_jsonb(NEW.id::text)
    WHERE id = v_ambulance_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
