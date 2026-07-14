-- Permanent null-safe readiness evaluation for unassigned ambulances.
-- Source digest: 737c106271fd41af
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';

-- Source: supabase/migrations/20260219010000_core_rpcs.sql (ambulance_dispatch_readiness_snapshot function)
-- BEGIN EMERGENCY_RESPONDER_READINESS_RPCS
-- PULLBACK NOTE: assignment, responder identity, and telemetry freshness now
-- converge through one server-owned readiness snapshot.
CREATE OR REPLACE FUNCTION public.ambulance_dispatch_readiness_snapshot(
    p_ambulance_id UUID,
    p_request_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance RECORD;
    v_request RECORD;
    v_ambulance_org_id UUID;
    v_request_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_status_ready BOOLEAN := FALSE;
    v_staffed BOOLEAN := FALSE;
    v_responder_eligible BOOLEAN := FALSE;
    v_organization_match BOOLEAN := FALSE;
    v_organization_ready BOOLEAN := FALSE;
    v_facility_ready BOOLEAN := FALSE;
    v_located BOOLEAN := FALSE;
    v_telemetry_fresh BOOLEAN := FALSE;
    v_type_supported BOOLEAN := FALSE;
    v_no_conflicting_call BOOLEAN := FALSE;
    v_reasons JSONB := '[]'::JSONB;
BEGIN
    SELECT
        a.*,
        p.role AS responder_role,
        p.provider_type AS responder_provider_type,
        p.organization_id AS responder_org_id,
        p.onboarding_status AS responder_onboarding_status,
        staffing.id AS active_staffing_id,
        organization.verification_status AS organization_verification_status,
        organization.is_active AS organization_is_active,
        organization.organization_type AS organization_type,
        hospital.dispatch_eligible AS facility_dispatch_eligible,
        COALESCE(a.organization_id, hospital.organization_id) AS resolved_org_id
    INTO v_ambulance
    FROM public.ambulances a
    LEFT JOIN public.profiles p ON p.id = a.profile_id
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    LEFT JOIN public.organizations organization
      ON organization.id = COALESCE(a.organization_id, hospital.organization_id)
    LEFT JOIN public.ambulance_staff_assignments staffing
      ON staffing.ambulance_id = a.id
     AND staffing.responder_id = a.profile_id
     AND staffing.status = 'active'
     AND staffing.starts_at <= NOW()
     AND (staffing.ends_at IS NULL OR staffing.ends_at > NOW())
    WHERE a.id = p_ambulance_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ready', false,
            'ambulance_id', p_ambulance_id,
            'request_id', p_request_id,
            'reasons', jsonb_build_array('ambulance_not_found')
        );
    END IF;

    v_ambulance_org_id := v_ambulance.resolved_org_id;

    IF p_request_id IS NOT NULL THEN
        SELECT
            er.id,
            er.status,
            er.service_type,
            er.ambulance_type,
            er.ambulance_id,
            er.current_responder_assignment_id,
            er.dispatch_organization_id,
            hospital.dispatch_eligible AS destination_dispatch_eligible,
            hospital.organization_id AS resolved_org_id
        INTO v_request
        FROM public.emergency_requests er
        LEFT JOIN public.hospitals hospital ON hospital.id = er.hospital_id
        WHERE er.id = p_request_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'ready', false,
                'ambulance_id', p_ambulance_id,
                'request_id', p_request_id,
                'reasons', jsonb_build_array('request_not_found')
            );
        END IF;
        v_request_org_id := v_request.resolved_org_id;
    END IF;

    v_status_ready := LOWER(COALESCE(v_ambulance.status, '')) = 'available'
        OR (
            p_request_id IS NOT NULL
            AND v_ambulance.current_call = p_request_id
            AND LOWER(COALESCE(v_ambulance.status, '')) IN ('dispatched', 'on_trip')
        );
    v_staffed := v_ambulance.profile_id IS NOT NULL
        AND v_ambulance.active_staffing_id IS NOT NULL;
    v_responder_eligible := v_staffed
        AND v_ambulance.responder_role = 'provider'
        AND v_ambulance.responder_provider_type = 'driver'
        AND v_ambulance.responder_onboarding_status IN ('complete', 'skipped')
        AND v_ambulance.responder_org_id IS NOT DISTINCT FROM v_ambulance_org_id;
    v_organization_ready := COALESCE(v_ambulance.organization_is_active, false)
        AND v_ambulance.organization_verification_status = 'verified';
    v_facility_ready := (
            v_ambulance.hospital_id IS NULL
            AND v_ambulance.organization_type = 'ambulance_service'
        )
        OR COALESCE(v_ambulance.facility_dispatch_eligible, false);
    IF p_request_id IS NULL THEN
        v_organization_match := true;
        v_type_supported := true;
    ELSE
        v_facility_ready := v_facility_ready
            AND COALESCE(v_request.destination_dispatch_eligible, false);
        v_organization_match := (
            v_ambulance_org_id IS NOT NULL
            AND COALESCE(
                v_request.dispatch_organization_id,
                v_request_org_id
            ) = v_ambulance_org_id
        );
        v_type_supported := v_request.service_type = 'ambulance'
            AND NULLIF(BTRIM(COALESCE(v_ambulance.type, '')), '') IS NOT NULL
            AND (
                NULLIF(BTRIM(COALESCE(v_request.ambulance_type, '')), '') IS NULL
                OR v_ambulance.type ILIKE '%' || v_request.ambulance_type || '%'
                OR v_request.ambulance_type ILIKE '%' || v_ambulance.type || '%'
            );
    END IF;
    v_located := v_ambulance.location IS NOT NULL;
    v_telemetry_fresh := v_ambulance.location_received_at IS NOT NULL
        AND v_ambulance.telemetry_lease_expires_at > NOW();
    v_no_conflicting_call := v_ambulance.current_call IS NULL
        OR (p_request_id IS NOT NULL AND v_ambulance.current_call = p_request_id);

    IF NOT v_status_ready THEN v_reasons := v_reasons || jsonb_build_array('status_not_available'); END IF;
    IF NOT v_staffed THEN v_reasons := v_reasons || jsonb_build_array('responder_not_linked'); END IF;
    IF NOT v_responder_eligible THEN v_reasons := v_reasons || jsonb_build_array('responder_not_eligible'); END IF;
    IF NOT v_organization_ready THEN v_reasons := v_reasons || jsonb_build_array('organization_not_ready'); END IF;
    IF NOT v_facility_ready THEN v_reasons := v_reasons || jsonb_build_array('facility_not_dispatch_eligible'); END IF;
    IF NOT v_organization_match THEN v_reasons := v_reasons || jsonb_build_array('organization_mismatch'); END IF;
    IF NOT v_located THEN v_reasons := v_reasons || jsonb_build_array('location_missing'); END IF;
    IF NOT v_telemetry_fresh THEN v_reasons := v_reasons || jsonb_build_array('telemetry_stale'); END IF;
    IF NOT v_type_supported THEN v_reasons := v_reasons || jsonb_build_array('type_not_supported'); END IF;
    IF NOT v_no_conflicting_call THEN v_reasons := v_reasons || jsonb_build_array('conflicting_call'); END IF;

    RETURN jsonb_build_object(
        'ready', v_status_ready
            AND v_staffed
            AND v_responder_eligible
            AND v_organization_ready
            AND v_facility_ready
            AND v_organization_match
            AND v_located
            AND v_telemetry_fresh
            AND v_type_supported
            AND v_no_conflicting_call,
        'ambulance_id', p_ambulance_id,
        'request_id', p_request_id,
        'responder_id', v_ambulance.profile_id,
        'organization_id', v_ambulance_org_id,
        'status_ready', v_status_ready,
        'staffed', v_staffed,
        'responder_eligible', v_responder_eligible,
        'organization_ready', v_organization_ready,
        'facility_ready', v_facility_ready,
        'organization_match', v_organization_match,
        'located', v_located,
        'telemetry_fresh', v_telemetry_fresh,
        'type_supported', v_type_supported,
        'no_conflicting_call', v_no_conflicting_call,
        'location_received_at', v_ambulance.location_received_at,
        'telemetry_lease_expires_at', v_ambulance.telemetry_lease_expires_at,
        'reasons', v_reasons
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMIT;
