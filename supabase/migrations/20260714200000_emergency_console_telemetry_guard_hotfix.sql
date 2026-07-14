-- Permanent lifecycle guard for the Console telemetry compatibility command.
-- Source digest: 0343a1c0fd6f9bf8
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';

-- Source: supabase/migrations/20260219010000_core_rpcs.sql (console_update_responder_location function)
CREATE OR REPLACE FUNCTION public.console_update_responder_location(
    p_request_id UUID,
    p_location JSONB,
    p_heading DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_req_status TEXT;
    v_assignment_id UUID;
    v_assignment_responder_id UUID;
    v_ambulance_id UUID;
    v_sequence BIGINT;
    v_result JSONB;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;
    IF v_actor_id IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT public.canonicalize_emergency_status(er.status, er.status),
           assignment.id, assignment.responder_id, assignment.ambulance_id,
           COALESCE(ambulance.telemetry_sequence, 0) + 1
    INTO v_req_status, v_assignment_id, v_assignment_responder_id, v_ambulance_id, v_sequence
    FROM public.emergency_requests er
    JOIN public.emergency_responder_assignments assignment
      ON assignment.id = er.current_responder_assignment_id
     AND assignment.emergency_request_id = er.id
     AND assignment.status IN ('offered', 'accepted', 'arrived')
    JOIN public.ambulances ambulance
      ON ambulance.id = assignment.ambulance_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er, assignment, ambulance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot update responder location before dispatch';
    END IF;
    IF v_req_status NOT IN ('in_progress', 'accepted', 'arrived') THEN
        RAISE EXCEPTION 'Cannot update responder location for an inactive emergency';
    END IF;
    IF NOT v_is_service_role AND v_assignment_responder_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    v_result := public.report_responder_telemetry(
        jsonb_build_object(
            'ambulance_id', v_ambulance_id,
            'request_id', p_request_id,
            'assignment_id', v_assignment_id,
            'sequence', v_sequence,
            'observed_at', NOW(),
            'location', p_location,
            'heading', p_heading
        )
    );

    RETURN v_result || jsonb_build_object('compatibility_command', 'console_update_responder_location');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
