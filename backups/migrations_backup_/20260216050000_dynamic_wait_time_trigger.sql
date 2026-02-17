-- Migration: Dynamic Wait Time Trigger
-- Author: Dyrane / Antigravity
-- Description: Automatically updates hospital wait times based on active emergency load and bed availability.

CREATE OR REPLACE FUNCTION public.calculate_dynamic_wait_time(p_hospital_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_requests INTEGER;
    v_available_beds INTEGER;
    v_base_wait INTEGER := 15; -- Minimum wait time
    v_calculated_wait INTEGER;
BEGIN
    -- 1. Get Active Emergency Requests (status: pending, accepted, in_progress)
    SELECT COUNT(*) INTO v_active_requests
    FROM emergency_requests
    WHERE hospital_id = p_hospital_id
      AND status IN ('pending', 'accepted', 'in_progress');

    -- 2. Get Available Beds
    SELECT COALESCE(available_beds, 0) INTO v_available_beds
    FROM hospitals
    WHERE id = p_hospital_id;

    -- 3. Calculate Wait Time
    -- Formula: Base + (Requests * 10) - (Beds * 2)
    -- This is a heuristic: More requests = longer wait, More beds = slightly shorter wait capability
    v_calculated_wait := v_base_wait + (v_active_requests * 10) - (v_available_beds * 2);

    -- 4. Clamp constraints
    IF v_calculated_wait < 5 THEN v_calculated_wait := 5; END IF; -- Minimum 5 mins
    IF v_calculated_wait > 240 THEN v_calculated_wait := 240; END IF; -- Cap at 4 hours

    RETURN v_calculated_wait;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_update_hospital_wait_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the hospital's wait time whenever an emergency request changes
    -- We assume NEW.hospital_id or OLD.hospital_id needs update
    IF (TG_OP = 'INSERT') THEN
        UPDATE hospitals
        SET emergency_wait_time_minutes = public.calculate_dynamic_wait_time(NEW.hospital_id),
            last_availability_update = NOW()
        WHERE id = NEW.hospital_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Update both OLD and NEW if they differ, otherwise just NEW
        IF NEW.hospital_id IS DISTINCT FROM OLD.hospital_id THEN
            UPDATE hospitals SET emergency_wait_time_minutes = public.calculate_dynamic_wait_time(OLD.hospital_id) WHERE id = OLD.hospital_id;
        END IF;
        
        UPDATE hospitals 
        SET emergency_wait_time_minutes = public.calculate_dynamic_wait_time(NEW.hospital_id),
            last_availability_update = NOW()
        WHERE id = NEW.hospital_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE hospitals 
        SET emergency_wait_time_minutes = public.calculate_dynamic_wait_time(OLD.hospital_id),
            last_availability_update = NOW()
        WHERE id = OLD.hospital_id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_emergency_request_change_wait_time ON public.emergency_requests;

CREATE TRIGGER on_emergency_request_change_wait_time
    AFTER INSERT OR UPDATE OR DELETE ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_hospital_wait_time();
