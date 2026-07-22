-- 🛰️ Module 08: Emergency Logic (Fluid Edition)
-- Atomic operations for emergency lifecycles

-- AMBULANCE DISPATCH RPC FUNCTIONS
-- Part of Master System Improvement Plan - Phase 1 Critical Emergency Flow Fixes

-- 1. Get Available Ambulances
CREATE OR REPLACE FUNCTION public.get_available_ambulances(
    p_hospital_id UUID DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 50,
    p_specialty TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    call_sign TEXT,
    status TEXT,
    hospital_id UUID,
    vehicle_number TEXT,
    base_price NUMERIC,
    crew JSONB,
    type TEXT,
    profile_id UUID,
    display_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
BEGIN
    SELECT actor.role, actor.organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles actor
    WHERE actor.id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.call_sign,
        a.status,
        a.hospital_id,
        a.vehicle_number,
        a.base_price,
        a.crew,
        a.type,
        a.profile_id,
        a.display_id,
        a.created_at,
        a.updated_at
    FROM public.ambulances a
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    WHERE a.status = 'available'
        AND (p_hospital_id IS NULL OR a.hospital_id = p_hospital_id)
        AND (
            v_actor_role = 'admin'
            OR (
                v_actor_org_id IS NOT NULL
                AND COALESCE(a.organization_id, hospital.organization_id) = v_actor_org_id
            )
        );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 2. Update Ambulance Status
CREATE OR REPLACE FUNCTION public.update_ambulance_status(
    p_ambulance_id UUID,
    p_status TEXT,
    p_location JSONB DEFAULT NULL,
    p_eta TIMESTAMPTZ DEFAULT NULL,
    p_current_call UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_previous_status TEXT;
    v_location GEOMETRY;
    v_result JSONB;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Legacy ambulance status mutation is restricted to service_role';
    END IF;

    -- Validate status
    IF p_status NOT IN ('available', 'dispatched', 'en_route', 'on_scene', 'returning', 'maintenance', 'offline') THEN
        RETURN jsonb_build_object('error', 'Invalid status', 'code', 'INVALID_STATUS');
    END IF;
    
    -- Get current hospital for validation
    SELECT hospital_id, status INTO v_hospital_id, v_previous_status
    FROM public.ambulances 
    WHERE id = p_ambulance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Ambulance not found', 'code', 'AMBULANCE_NOT_FOUND');
    END IF;

    IF p_location IS NOT NULL THEN
        IF jsonb_typeof(p_location) <> 'object'
           OR NULLIF(p_location->>'lat', '') IS NULL
           OR NULLIF(p_location->>'lng', '') IS NULL THEN
            RETURN jsonb_build_object('error', 'Invalid location', 'code', 'INVALID_LOCATION');
        END IF;

        v_location := ST_SetSRID(
            ST_MakePoint(
                (p_location->>'lng')::DOUBLE PRECISION,
                (p_location->>'lat')::DOUBLE PRECISION
            ),
            4326
        );
    END IF;
    
    -- Update ambulance
    UPDATE public.ambulances 
    SET 
        status = p_status,
        location = COALESCE(v_location, location),
        eta = COALESCE(p_eta, eta),
        current_call = COALESCE(p_current_call, current_call),
        updated_at = NOW()
    WHERE id = p_ambulance_id;
    
    -- If ambulance was dispatched, update hospital availability
    IF p_status = 'dispatched' AND v_previous_status = 'available' THEN
        UPDATE public.hospitals 
        SET available_ambulances = GREATEST(0, available_ambulances - 1)
        WHERE id = v_hospital_id;
    END IF;
    
    -- If ambulance returned to available, update hospital availability
    IF p_status = 'available' AND v_previous_status <> 'available' THEN
        UPDATE public.hospitals 
        SET available_ambulances = available_ambulances + 1
        WHERE id = v_hospital_id;
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'status', p_status,
        'updated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Assign Ambulance to Emergency
CREATE OR REPLACE FUNCTION public.assign_ambulance_to_emergency(
    p_emergency_request_id UUID,
    p_ambulance_id UUID,
    p_priority INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance_status TEXT;
    v_hospital_id UUID;
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'assign_ambulance_to_emergency', true);
    PERFORM set_config('ivisit.transition_reason', 'manual_ambulance_assignment', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object('priority', p_priority, 'ambulance_id', p_ambulance_id)::TEXT,
        true
    );

    -- 1. Get current ambulance state
    SELECT a.status, a.hospital_id INTO v_ambulance_status, v_hospital_id
    FROM public.ambulances a
    WHERE a.id = p_ambulance_id;
    
    IF v_ambulance_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not found', 'code', 'AMBULANCE_NOT_FOUND');
    END IF;

    -- 2. Validate availability
    IF v_ambulance_status != 'available' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not available', 'code', 'AMBULANCE_UNAVAILABLE', 'current_status', v_ambulance_status);
    END IF;
    
    -- 3. Atomic Assignment
    UPDATE public.ambulances 
    SET status = 'dispatched', current_call = p_emergency_request_id, updated_at = NOW()
    WHERE id = p_ambulance_id;
    
    UPDATE public.emergency_requests 
    SET ambulance_id = p_ambulance_id, updated_at = NOW()
    WHERE id = p_emergency_request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'emergency_request_id', p_emergency_request_id,
        'assigned_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Auto-Assign Best Ambulance
CREATE OR REPLACE FUNCTION public.auto_assign_ambulance(
    p_emergency_request_id UUID,
    p_max_distance_km INTEGER DEFAULT 50,
    p_specialty_required TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_location GEOMETRY;
    v_hospital_id UUID;
    v_request_status TEXT;
    v_best_ambulance_id UUID;
    v_best_distance NUMERIC;
    v_result JSONB;
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'auto_assign_ambulance', true);
    PERFORM set_config('ivisit.transition_reason', 'auto_ambulance_assignment', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'max_distance_km', p_max_distance_km,
            'specialty_required', p_specialty_required
        )::TEXT,
        true
    );

    SELECT request.patient_location, request.hospital_id, request.status
    INTO v_user_location, v_hospital_id, v_request_status
    FROM public.emergency_requests request
    WHERE request.id = p_emergency_request_id;

    IF NOT FOUND OR v_request_status <> 'in_progress' OR v_user_location IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency request is not dispatch ready',
            'auto_assigned', false
        );
    END IF;
    
    -- Find best available ambulance
    SELECT 
        a.id, 
        ST_Distance(
            a.location::geography,
            v_user_location::geography
        ) as distance
    INTO v_best_ambulance_id, v_best_distance
    FROM public.ambulances a
    WHERE a.status = 'available'
        AND a.hospital_id = v_hospital_id
        AND a.current_call IS NULL
        AND a.profile_id IS NOT NULL
        AND a.location IS NOT NULL
        AND ST_DWithin(
            a.location::geography,
            v_user_location::geography,
            p_max_distance_km * 1000
        )
    ORDER BY distance
    LIMIT 1;
    
    -- If ambulance found, assign it
    IF v_best_ambulance_id IS NOT NULL THEN
        -- Update ambulance status
        UPDATE public.ambulances 
        SET 
            status = 'dispatched',
            current_call = p_emergency_request_id,
            updated_at = NOW()
        WHERE id = v_best_ambulance_id;
        
        -- Assignment is an offer. Responder acceptance is owned by the
        -- hardened command installed later in this pillar set.
        UPDATE public.emergency_requests 
        SET 
            ambulance_id = v_best_ambulance_id,
            updated_at = NOW()
        WHERE id = p_emergency_request_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'ambulance_id', v_best_ambulance_id,
            'distance', v_best_distance,
            'auto_assigned', true
        );
    ELSE
        v_result := jsonb_build_object(
            'success', false,
            'error', 'No available ambulances found',
            'auto_assigned', false
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Validate Emergency Request
CREATE OR REPLACE FUNCTION public.validate_emergency_request(
    p_user_id UUID,
    p_request_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_patient_location JSONB;
    v_hospital_available BOOLEAN;
    v_result JSONB;
BEGIN
    -- Extract required fields
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_patient_location := p_request_data->'patient_location';
    
    -- Validate hospital exists and is available
    SELECT (available_beds > 0 AND status = 'active') INTO v_hospital_available
    FROM public.hospitals 
    WHERE id = v_hospital_id;
    
    IF NOT v_hospital_available THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Hospital not available',
            'code', 'HOSPITAL_UNAVAILABLE'
        );
    END IF;
    
    -- Validate patient location
    IF v_patient_location IS NULL OR 
       v_patient_location->>'lat' IS NULL OR 
       v_patient_location->>'lng' IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid patient location',
            'code', 'INVALID_LOCATION'
        );
    END IF;
    
    -- Check for duplicate emergencies
    IF EXISTS (
        SELECT 1 FROM public.emergency_requests 
        WHERE user_id = p_user_id 
        AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived')
        AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Duplicate emergency request',
            'code', 'DUPLICATE_EMERGENCY'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'valid', true,
        'hospital_id', v_hospital_id,
        'patient_location', v_patient_location
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Check Hospital Capacity
CREATE OR REPLACE FUNCTION public.check_hospital_capacity(
    p_hospital_id UUID,
    p_required_beds INTEGER DEFAULT 1,
    p_specialty TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_available_beds INTEGER;
    v_icu_beds INTEGER;
    v_total_beds INTEGER;
    v_result JSONB;
BEGIN
    -- Get hospital capacity information
    SELECT 
        available_beds,
        icu_beds_available,
        total_beds
    INTO v_available_beds, v_icu_beds, v_total_beds
    FROM public.hospitals 
    WHERE id = p_hospital_id;
    
    -- Check capacity
    IF v_available_beds < p_required_beds THEN
        v_result := jsonb_build_object(
            'available', false,
            'error', 'Insufficient bed capacity',
            'available_beds', v_available_beds,
            'required_beds', p_required_beds,
            'code', 'INSUFFICIENT_CAPACITY'
        );
    ELSIF p_specialty = 'ICU' AND v_icu_beds < p_required_beds THEN
        v_result := jsonb_build_object(
            'available', false,
            'error', 'Insufficient ICU capacity',
            'icu_beds_available', v_icu_beds,
            'required_beds', p_required_beds,
            'code', 'INSUFFICIENT_ICU'
        );
    ELSE
        v_result := jsonb_build_object(
            'available', true,
            'available_beds', v_available_beds,
            'icu_beds_available', v_icu_beds,
            'total_beds', v_total_beds
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7. Calculate Emergency Priority
CREATE OR REPLACE FUNCTION public.calculate_emergency_priority(
    p_request_data JSONB,
    p_user_medical_profile JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_priority INTEGER := 1; -- Default priority
    v_urgency_score INTEGER := 0;
    v_medical_urgency INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Calculate urgency based on request data
    IF p_request_data->>'severity' = 'critical' THEN
        v_urgency_score := v_urgency_score + 3;
    ELSIF p_request_data->>'severity' = 'urgent' THEN
        v_urgency_score := v_urgency_score + 2;
    ELSIF p_request_data->>'severity' = 'moderate' THEN
        v_urgency_score := v_urgency_score + 1;
    END IF;
    
    -- Calculate medical urgency if profile available
    IF p_user_medical_profile IS NOT NULL THEN
        IF p_user_medical_profile->>'conditions' IS NOT NULL THEN
            v_medical_urgency := v_medical_urgency + 1;
        END IF;
        
        IF p_user_medical_profile->>'allergies' IS NOT NULL AND 
           p_user_medical_profile->>'allergies' != '' THEN
            v_medical_urgency := v_medical_urgency + 1;
        END IF;
    END IF;
    
    -- Calculate final priority (1-5 scale)
    v_priority := LEAST(5, GREATEST(1, 1 + v_urgency_score + v_medical_urgency));
    
    v_result := jsonb_build_object(
        'priority', v_priority,
        'urgency_score', v_urgency_score,
        'medical_urgency', v_medical_urgency,
        'calculated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- The quote is authoritative even when an organization has not configured an
-- exact service tier. Missing configuration must never block emergency intake:
-- an exact tier wins when present, otherwise a server-owned generic fallback
-- becomes the definitive user price for the request.
CREATE OR REPLACE FUNCTION public.resolve_emergency_pricing(
    p_service_type TEXT,
    p_hospital_id UUID DEFAULT NULL,
    p_ambulance_type TEXT DEFAULT NULL,
    p_distance_km NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_service_key TEXT := BTRIM(
        REGEXP_REPLACE(LOWER(COALESCE(p_service_type, '')), '[^a-z0-9]+', '_', 'g'),
        '_'
    );
    v_ambulance_key TEXT := BTRIM(
        REGEXP_REPLACE(LOWER(COALESCE(p_ambulance_type, '')), '[^a-z0-9]+', '_', 'g'),
        '_'
    );
    v_requested_service_type TEXT := NULL;
    v_resolved_service_type TEXT := NULL;
    v_hospital_service_price NUMERIC := NULL;
    v_hospital_base_price NUMERIC := NULL;
    v_global_service_price NUMERIC := NULL;
    v_pricing_row_id UUID := NULL;
    v_hospital_pricing_row_id UUID := NULL;
    v_global_pricing_row_id UUID := NULL;
    v_pricing_source TEXT := NULL;
    v_pricing_is_fallback BOOLEAN := FALSE;
    v_default_base_price NUMERIC := 100;
    v_base_price NUMERIC := NULL;
    v_distance_surcharge NUMERIC := 0;
    v_total NUMERIC := NULL;
BEGIN
    -- Only ambulance requests may use an ambulance-tier hint. This prevents
    -- stale transport data on a bed request from changing its service price.
    IF v_service_key IN (
        'ambulance', 'emergency', 'emergency_transport',
        'ambulance_basic', 'basic', 'bls', 'standard', 'basic_life_support',
        'ambulance_advanced', 'advanced', 'als', 'cardiac',
        'advanced_life_support', 'ambulance_critical', 'critical', 'cct',
        'icu', 'intensive', 'critical_care', 'critical_care_transport'
    ) OR v_service_key LIKE 'ambulance_%' THEN
        -- Keep transport terminology flexible at the boundary while storing
        -- and pricing against the stable service_pricing vocabulary.
        IF v_ambulance_key IN (
            'ambulance', 'ambulance_basic', 'basic', 'bls', 'standard',
            'basic_life_support'
        ) THEN
            v_requested_service_type := 'ambulance';
        ELSIF v_ambulance_key IN (
            'ambulance_advanced', 'advanced', 'als', 'cardiac',
            'advanced_life_support'
        ) THEN
            v_requested_service_type := 'ambulance_advanced';
        ELSIF v_ambulance_key IN (
            'ambulance_critical', 'critical', 'cct', 'icu', 'intensive',
            'critical_care', 'critical_care_transport'
        ) THEN
            v_requested_service_type := 'ambulance_critical';
        ELSIF v_service_key IN (
            'ambulance', 'emergency', 'emergency_transport',
            'ambulance_basic', 'basic', 'bls', 'standard', 'basic_life_support'
        ) THEN
            v_requested_service_type := 'ambulance';
        ELSIF v_service_key IN (
            'ambulance_advanced', 'advanced', 'als', 'cardiac',
            'advanced_life_support'
        ) THEN
            v_requested_service_type := 'ambulance_advanced';
        ELSIF v_service_key IN (
            'ambulance_critical', 'critical', 'cct', 'icu', 'intensive',
            'critical_care', 'critical_care_transport'
        ) THEN
            v_requested_service_type := 'ambulance_critical';
        END IF;
    END IF;

    IF v_requested_service_type IS NOT NULL
       OR v_service_key LIKE 'ambulance_%'
       OR v_service_key IN ('ambulance', 'emergency', 'emergency_transport') THEN
        -- An unrecognised ambulance label must still keep the emergency moving.
        -- It receives the generic server rate rather than a fabricated client price.
        IF v_requested_service_type IS NULL THEN
            v_requested_service_type := 'ambulance';
            v_pricing_is_fallback := TRUE;
        END IF;

        -- Organization-configured tier pricing is the first choice.
        IF p_hospital_id IS NOT NULL THEN
            SELECT pricing.id, pricing.base_price
            INTO v_pricing_row_id, v_hospital_service_price
            FROM public.service_pricing pricing
            WHERE pricing.hospital_id = p_hospital_id
              AND LOWER(BTRIM(pricing.service_type)) = v_requested_service_type
              AND COALESCE(pricing.base_price, 0) > 0
            ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
            LIMIT 1;

            SELECT hospital.base_price
            INTO v_hospital_base_price
            FROM public.hospitals hospital
            WHERE hospital.id = p_hospital_id;
        END IF;

        IF v_hospital_service_price IS NOT NULL THEN
            v_base_price := v_hospital_service_price;
            v_resolved_service_type := v_requested_service_type;
            v_pricing_source := CASE
                WHEN v_requested_service_type = 'ambulance'
                    THEN 'hospital_service_pricing'
                ELSE 'hospital_tier_pricing'
            END;
        ELSE
            -- A platform tier baseline remains more specific than an
            -- organization-level generic ambulance rate.
            SELECT pricing.id, pricing.base_price
            INTO v_pricing_row_id, v_global_service_price
            FROM public.service_pricing pricing
            WHERE pricing.hospital_id IS NULL
              AND LOWER(BTRIM(pricing.service_type)) = v_requested_service_type
              AND COALESCE(pricing.base_price, 0) > 0
            ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
            LIMIT 1;

            IF v_global_service_price IS NOT NULL THEN
                v_base_price := v_global_service_price;
                v_resolved_service_type := v_requested_service_type;
                v_pricing_source := CASE
                    WHEN v_requested_service_type = 'ambulance'
                        THEN 'global_service_pricing'
                    ELSE 'global_tier_pricing'
                END;
                v_pricing_is_fallback := TRUE;
            ELSE
                -- The organization did not assert an exact price. Preserve
                -- continuity with the generic ambulance hierarchy, but make
                -- its fallback provenance explicit to every caller.
                v_pricing_is_fallback := TRUE;

                IF p_hospital_id IS NOT NULL THEN
                    SELECT pricing.id, pricing.base_price
                    INTO v_pricing_row_id, v_hospital_service_price
                    FROM public.service_pricing pricing
                    WHERE pricing.hospital_id = p_hospital_id
                      AND LOWER(BTRIM(pricing.service_type)) = 'ambulance'
                      AND COALESCE(pricing.base_price, 0) > 0
                    ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
                    LIMIT 1;
                END IF;

                IF v_hospital_service_price IS NOT NULL THEN
                    v_base_price := v_hospital_service_price;
                    v_resolved_service_type := 'ambulance';
                    v_pricing_source := 'hospital_generic_ambulance_fallback';
                ELSIF NULLIF(v_hospital_base_price, 0) IS NOT NULL THEN
                    v_pricing_row_id := NULL;
                    v_base_price := v_hospital_base_price;
                    v_resolved_service_type := 'ambulance';
                    v_pricing_source := 'hospital_base_price_fallback';
                ELSE
                    SELECT pricing.id, pricing.base_price
                    INTO v_pricing_row_id, v_global_service_price
                    FROM public.service_pricing pricing
                    WHERE pricing.hospital_id IS NULL
                      AND LOWER(BTRIM(pricing.service_type)) = 'ambulance'
                      AND COALESCE(pricing.base_price, 0) > 0
                    ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
                    LIMIT 1;

                    IF v_global_service_price IS NOT NULL THEN
                        v_base_price := v_global_service_price;
                        v_resolved_service_type := 'ambulance';
                        v_pricing_source := 'global_generic_ambulance_fallback';
                    ELSE
                        v_pricing_row_id := NULL;
                        v_base_price := 150;
                        v_resolved_service_type := 'ambulance';
                        v_pricing_source := 'default_ambulance_fallback';
                    END IF;
                END IF;
            END IF;
        END IF;
    ELSE
        -- Preserve the established non-ambulance hierarchy unchanged.
        v_requested_service_type := COALESCE(NULLIF(v_service_key, ''), 'consultation');
        v_default_base_price := CASE
            WHEN v_requested_service_type IN ('bed', 'bed_booking') THEN 200
            ELSE 100
        END;

        IF p_hospital_id IS NOT NULL THEN
            SELECT pricing.id, pricing.base_price
            INTO v_hospital_pricing_row_id, v_hospital_service_price
            FROM public.service_pricing pricing
            WHERE pricing.hospital_id = p_hospital_id
              AND LOWER(BTRIM(pricing.service_type)) = v_requested_service_type
              AND COALESCE(pricing.base_price, 0) > 0
            ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
            LIMIT 1;

            SELECT hospital.base_price
            INTO v_hospital_base_price
            FROM public.hospitals hospital
            WHERE hospital.id = p_hospital_id;
        END IF;

        SELECT pricing.id, pricing.base_price
        INTO v_global_pricing_row_id, v_global_service_price
        FROM public.service_pricing pricing
        WHERE pricing.hospital_id IS NULL
          AND LOWER(BTRIM(pricing.service_type)) = v_requested_service_type
          AND COALESCE(pricing.base_price, 0) > 0
        ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
        LIMIT 1;

        v_base_price := COALESCE(
            NULLIF(v_hospital_service_price, 0),
            NULLIF(v_hospital_base_price, 0),
            NULLIF(v_global_service_price, 0),
            v_default_base_price
        );
        v_resolved_service_type := v_requested_service_type;
        v_pricing_source := CASE
            WHEN NULLIF(v_hospital_service_price, 0) IS NOT NULL THEN 'hospital_service_pricing'
            WHEN NULLIF(v_hospital_base_price, 0) IS NOT NULL THEN 'hospital_base_price_fallback'
            WHEN NULLIF(v_global_service_price, 0) IS NOT NULL THEN 'global_service_pricing'
            ELSE 'default_service_fallback'
        END;
        v_pricing_is_fallback := v_pricing_source <> 'hospital_service_pricing';
        v_pricing_row_id := CASE
            WHEN NULLIF(v_hospital_service_price, 0) IS NOT NULL THEN v_hospital_pricing_row_id
            WHEN NULLIF(v_global_service_price, 0) IS NOT NULL THEN v_global_pricing_row_id
            ELSE NULL
        END;
    END IF;

    IF GREATEST(COALESCE(p_distance_km, 0), 0) > 5 THEN
        v_distance_surcharge := (GREATEST(COALESCE(p_distance_km, 0), 0) - 5) * 2;
    END IF;
    v_total := ROUND(COALESCE(v_base_price, 0) + v_distance_surcharge, 2);

    RETURN jsonb_build_object(
        'base_cost', v_base_price,
        'distance_surcharge', v_distance_surcharge,
        'total_cost', v_total,
        'currency', 'USD',
        'pricing_service_type', v_requested_service_type,
        'pricing_resolved_service_type', v_resolved_service_type,
        'pricing_source', v_pricing_source,
        'pricing_is_fallback', v_pricing_is_fallback,
        'pricing_row_id', v_pricing_row_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- The resolver is internal; normal clients use the controlled quote/create RPCs.
REVOKE EXECUTE ON FUNCTION public.resolve_emergency_pricing(TEXT, UUID, TEXT, NUMERIC)
FROM PUBLIC, anon, authenticated;

-- Patient-safe cash preflight. The client supplies only the same pricing
-- context used by request creation; finance details never cross the boundary.
CREATE OR REPLACE FUNCTION public.check_patient_cash_eligibility(
    p_service_type TEXT,
    p_hospital_id UUID,
    p_ambulance_type TEXT DEFAULT NULL,
    p_distance_km NUMERIC DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_organization_id UUID;
    v_organization_active BOOLEAN;
    v_fee_percentage NUMERIC;
    v_wallet_balance NUMERIC;
    v_pricing JSONB;
    v_total_amount NUMERIC;
    v_fee_amount NUMERIC;
BEGIN
    IF NOT v_is_service_role AND auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_hospital_id IS NULL OR NULLIF(BTRIM(COALESCE(p_service_type, '')), '') IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT hospital.organization_id,
           organization.is_active,
           COALESCE(NULLIF(organization.ivisit_fee_percentage, 0), 2.5)
    INTO v_organization_id, v_organization_active, v_fee_percentage
    FROM public.hospitals hospital
    LEFT JOIN public.organizations organization
      ON organization.id = hospital.organization_id
    WHERE hospital.id = p_hospital_id;

    IF v_organization_id IS NULL OR COALESCE(v_organization_active, FALSE) IS NOT TRUE THEN
        RETURN FALSE;
    END IF;

    v_pricing := public.resolve_emergency_pricing(
        p_service_type => p_service_type,
        p_hospital_id => p_hospital_id,
        p_ambulance_type => p_ambulance_type,
        p_distance_km => GREATEST(COALESCE(p_distance_km, 0), 0)
    );
    v_total_amount := NULLIF(v_pricing->>'total_cost', '')::NUMERIC;

    IF v_total_amount IS NULL OR v_total_amount < 0 THEN
        RETURN FALSE;
    END IF;

    v_fee_amount := ROUND(
        v_total_amount * (COALESCE(v_fee_percentage, 2.5) / 100.0),
        2
    );

    SELECT wallet.balance
    INTO v_wallet_balance
    FROM public.organization_wallets wallet
    WHERE wallet.organization_id = v_organization_id;

    RETURN COALESCE(v_wallet_balance, 0) >= COALESCE(v_fee_amount, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.check_patient_cash_eligibility(TEXT, UUID, TEXT, NUMERIC)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_patient_cash_eligibility(TEXT, UUID, TEXT, NUMERIC)
TO authenticated, service_role;

-- 🛠️ ATOMIC: Create Emergency with Integrated Payment (Fluid v4)
CREATE OR REPLACE FUNCTION public.create_emergency_v4(
    p_user_id UUID,
    p_request_data JSONB,
    p_payment_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_display_id TEXT;
    v_visit_id TEXT;
    v_payment_id UUID;
    v_fee_amount NUMERIC;
    v_total_amount NUMERIC;
    v_pricing JSONB;
    v_fee_percentage NUMERIC := 2.5;
    v_requires_approval BOOLEAN := FALSE;
    v_awaits_payment_confirmation BOOLEAN := FALSE;
    v_requires_wallet_settlement BOOLEAN := FALSE;
    v_hospital_id UUID;
    v_organization_id UUID;
    v_patient_location GEOMETRY;
    v_transition_reason TEXT;
    v_service_type TEXT := LOWER(COALESCE(NULLIF(TRIM(COALESCE(p_request_data->>'service_type', '')), ''), ''));
    v_payment_method TEXT := LOWER(COALESCE(NULLIF(TRIM(COALESCE(p_payment_data->>'method', '')), ''), 'unknown'));
    v_payment_method_id TEXT := NULLIF(TRIM(COALESCE(p_payment_data->>'method_id', '')), '');
    v_defer_dispatch_until_payment BOOLEAN := FALSE;
    v_request_status TEXT := 'in_progress';
    v_request_payment_status TEXT := 'pending';
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user id is required';
    END IF;

    IF v_service_type NOT IN ('ambulance', 'bed') THEN
        RAISE EXCEPTION 'Unsupported emergency service type';
    END IF;

    IF p_payment_data IS NULL OR v_payment_method NOT IN ('cash', 'card', 'wallet') THEN
        RAISE EXCEPTION 'A supported payment method is required';
    END IF;

    v_hospital_id := NULLIF(p_request_data->>'hospital_id', '')::UUID;
    IF v_hospital_id IS NULL THEN
        RAISE EXCEPTION 'hospital_id is required';
    END IF;

    SELECT hospital.organization_id
    INTO v_organization_id
    FROM public.hospitals hospital
    JOIN public.organizations organization
      ON organization.id = hospital.organization_id
    WHERE hospital.id = v_hospital_id
      AND hospital.provider_type = 'hospital'
      AND hospital.status = 'available'
      AND hospital.emergency_eligible = true
      AND hospital.dispatch_eligible = true
      AND organization.is_active = true
      AND organization.verification_status = 'verified';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'HOSPITAL_NOT_EMERGENCY_COMMIT_ELIGIBLE';
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_id IS DISTINCT FROM p_user_id THEN
            SELECT role, organization_id
            INTO v_actor_role, v_actor_org_id
            FROM public.profiles
            WHERE id = v_actor_id;

            IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
                RAISE EXCEPTION 'Unauthorized: cannot create emergency for another user';
            END IF;

            IF v_payment_method = 'wallet' THEN
                RAISE EXCEPTION 'Unauthorized: patient must confirm wallet payment';
            END IF;

            IF v_actor_role IN ('org_admin', 'dispatcher')
               AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_organization_id) THEN
                RAISE EXCEPTION 'Unauthorized: emergency request outside actor organization';
            END IF;
        END IF;
    END IF;

    v_transition_reason := COALESCE(
        NULLIF(p_request_data->>'transition_reason', ''),
        NULLIF(p_request_data->>'reason', ''),
        'emergency_created'
    );

    PERFORM set_config('ivisit.transition_source', 'create_emergency_v4', true);
    PERFORM set_config('ivisit.transition_reason', v_transition_reason, true);
    PERFORM set_config('ivisit.transition_actor_id', COALESCE(v_actor_id, p_user_id)::TEXT, true);
    PERFORM set_config(
        'ivisit.transition_actor_role',
        COALESCE(
            CASE WHEN v_is_service_role THEN 'service_role' ELSE NULL END,
            NULLIF(v_actor_role, ''),
            'patient'
        ),
        true
    );
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'service_type', v_service_type,
            'payment_method', v_payment_method
        )::TEXT,
        true
    );

    -- Payment release is server-owned. A client cannot assert a completed
    -- card, wallet, or cash settlement while creating the request.
    v_defer_dispatch_until_payment := v_payment_method = 'card';

    v_pricing := public.resolve_emergency_pricing(
        p_service_type => v_service_type,
        p_hospital_id => v_hospital_id,
        p_ambulance_type => p_request_data->>'ambulance_type',
        p_distance_km => GREATEST(
            COALESCE(NULLIF(p_request_data->>'distance_km', '')::NUMERIC, 0),
            0
        )
    );
    v_total_amount := NULLIF(v_pricing->>'total_cost', '')::NUMERIC;
    IF v_total_amount IS NULL OR v_total_amount < 0 THEN
        RAISE EXCEPTION 'Could not resolve canonical emergency price';
    END IF;

    SELECT COALESCE(NULLIF(organization.ivisit_fee_percentage, 0), 2.5)
    INTO v_fee_percentage
    FROM public.organizations organization
    WHERE organization.id = v_organization_id;

    v_fee_amount := ROUND(v_total_amount * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2);

    IF v_payment_method = 'cash' THEN
        v_requires_approval := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    ELSIF v_payment_method = 'card' THEN
        v_awaits_payment_confirmation := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    ELSIF v_payment_method = 'wallet' THEN
        v_requires_wallet_settlement := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    END IF;
    
    -- 2. Physical Location Parse
    v_patient_location := ST_SetSRID(ST_MakePoint(
        (p_request_data->'patient_location'->>'lng')::DOUBLE PRECISION,
        (p_request_data->'patient_location'->>'lat')::DOUBLE PRECISION
    ), 4326);
    
    -- 3. Create the Emergency Request
    INSERT INTO public.emergency_requests (
        user_id, hospital_id, service_type, hospital_name, specialty,
        ambulance_type, bed_number, patient_location, patient_snapshot, status, total_cost, payment_status
    ) VALUES (
        p_user_id, v_hospital_id, v_service_type,
        p_request_data->>'hospital_name', p_request_data->>'specialty',
        p_request_data->>'ambulance_type', p_request_data->>'bed_number', v_patient_location,
        p_request_data->'patient_snapshot',
        v_request_status,
        COALESCE(v_total_amount, 0),
        v_request_payment_status
    ) RETURNING id, display_id INTO v_request_id, v_display_id;

    -- 4. Create the request-derived visit in the same transaction. A request
    -- cannot report success without its canonical history row.
    INSERT INTO public.visits (
        user_id, hospital_id, request_id, status,
        date, time, type, lifecycle_state, lifecycle_updated_at
    ) VALUES (
        p_user_id,
        v_hospital_id,
        v_request_id,
        CASE v_request_status
            WHEN 'completed' THEN 'completed'
            WHEN 'cancelled' THEN 'cancelled'
            WHEN 'payment_declined' THEN 'cancelled'
            WHEN 'in_progress' THEN 'in_progress'
            WHEN 'accepted' THEN 'in_progress'
            WHEN 'arrived' THEN 'in_progress'
            ELSE 'pending'
        END,
        TO_CHAR(NOW(), 'YYYY-MM-DD'),
        TO_CHAR(NOW(), 'HH24:MI:SS'),
        'emergency',
        CASE v_request_status
            WHEN 'pending_approval' THEN 'initiated'
            WHEN 'payment_declined' THEN 'payment_declined'
            WHEN 'in_progress' THEN 'confirmed'
            WHEN 'accepted' THEN 'dispatched'
            WHEN 'arrived' THEN 'arrived'
            WHEN 'completed' THEN 'completed'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE NULL
        END,
        NOW()
    ) RETURNING display_id INTO v_visit_id;

    -- 5. Process Payment Information
    INSERT INTO public.payments (
        user_id, emergency_request_id, organization_id, amount, currency,
        payment_method, status, ivisit_fee_amount, metadata
    ) VALUES (
        p_user_id, v_request_id, v_organization_id, v_total_amount,
        'USD', v_payment_method, 'pending', v_fee_amount,
        jsonb_build_object(
            'source', 'create_emergency_v4',
            'payment_kind', 'service',
            'fee_percentage', v_fee_percentage,
            'fee_amount', v_fee_amount,
            'fee', v_fee_amount,
            'method_id', v_payment_method_id,
            'client_quoted_total', NULLIF(p_payment_data->>'total_amount', '')::NUMERIC,
            'canonical_total', v_total_amount,
            'pricing_source', v_pricing->>'pricing_source',
            'pricing_is_fallback', COALESCE((v_pricing->>'pricing_is_fallback')::BOOLEAN, FALSE),
            'pricing_service_type', v_pricing->>'pricing_service_type',
            'pricing_resolved_service_type', v_pricing->>'pricing_resolved_service_type',
            'pricing_row_id', v_pricing->>'pricing_row_id',
            'defer_dispatch_until_payment', v_defer_dispatch_until_payment
        )
    ) RETURNING id INTO v_payment_id;

    UPDATE public.emergency_requests
    SET payment_id = v_payment_id,
        payment_method_id = v_payment_method_id,
        total_cost = v_total_amount,
        updated_at = NOW()
    WHERE id = v_request_id;

    IF v_payment_method = 'cash' THEN
        PERFORM public.notify_cash_approval_org_admins_internal(
            v_request_id,
            v_payment_id,
            v_total_amount,
            v_fee_amount,
            NULL,
            NULL,
            NULL,
            v_organization_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'display_id', v_display_id,
        'visit_id', v_visit_id,
        'payment_id', v_payment_id,
        'requires_approval', v_requires_approval,
        'awaits_payment_confirmation', v_awaits_payment_confirmation,
        'requires_wallet_settlement', v_requires_wallet_settlement,
        'payment_status', v_request_payment_status,
        'emergency_status', v_request_status,
        'canonical_total', v_total_amount,
        'pricing', v_pricing,
        'pricing_source', v_pricing->>'pricing_source',
        'pricing_is_fallback', COALESCE((v_pricing->>'pricing_is_fallback')::BOOLEAN, FALSE),
        'currency', 'USD'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 🛠️ Stripe webhook finalize card payment after confirmation
-- BEGIN EMERGENCY_PAYMENT_RELEASE_GATE
-- This projection is the only payment predicate dispatch commands consume.
-- It requires the request-linked payment and method-specific backend evidence.
CREATE OR REPLACE FUNCTION public.emergency_dispatch_payment_snapshot(
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_request public.emergency_requests%ROWTYPE;
    v_payment public.payments%ROWTYPE;
    v_method_proven BOOLEAN := FALSE;
    v_reasons JSONB := '[]'::JSONB;
BEGIN
    SELECT request.*
    INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ready', false,
            'request_id', p_request_id,
            'reasons', jsonb_build_array('request_not_found')
        );
    END IF;

    IF v_request.payment_id IS NOT NULL THEN
        SELECT payment.*
        INTO v_payment
        FROM public.payments payment
        WHERE payment.id = v_request.payment_id
          AND payment.emergency_request_id = v_request.id;
    END IF;

    IF v_payment.id IS NOT NULL THEN
        v_method_proven := CASE v_payment.payment_method
            WHEN 'card' THEN
                v_payment.stripe_payment_intent_id IS NOT NULL
                AND v_payment.metadata->>'source' = 'complete_card_payment'
            WHEN 'wallet' THEN
                v_payment.metadata->>'source' = 'process_wallet_payment'
                AND EXISTS (
                    SELECT 1
                    FROM public.wallet_ledger ledger
                    WHERE ledger.reference_id = v_payment.id
                      AND ledger.idempotency_key = 'payment:' || v_payment.id::TEXT || ':patient_wallet_debit'
                      AND ledger.transaction_type = 'debit'
                      AND ledger.amount = -v_payment.amount
                )
            WHEN 'cash' THEN
                v_payment.metadata->>'source' = 'approve_cash_payment'
                OR (
                    v_payment.metadata->>'source' = 'approve_demo_cash_payment'
                    AND COALESCE((v_payment.metadata->>'demo')::BOOLEAN, FALSE)
                    AND v_payment.metadata->>'settlement' = 'simulated'
                )
            ELSE false
        END;
    END IF;

    IF v_request.status <> 'in_progress' THEN
        v_reasons := v_reasons || jsonb_build_array('request_not_released');
    END IF;
    IF v_request.payment_id IS NULL OR v_payment.id IS NULL THEN
        v_reasons := v_reasons || jsonb_build_array('linked_payment_missing');
    END IF;
    IF COALESCE(v_request.payment_status, 'pending') NOT IN ('paid', 'completed') THEN
        v_reasons := v_reasons || jsonb_build_array('request_payment_pending');
    END IF;
    IF COALESCE(v_payment.status, 'pending') <> 'completed' THEN
        v_reasons := v_reasons || jsonb_build_array('payment_not_completed');
    END IF;
    IF v_payment.id IS NOT NULL AND NOT v_method_proven THEN
        v_reasons := v_reasons || jsonb_build_array('settlement_proof_missing');
    END IF;

    RETURN jsonb_build_object(
        'ready', jsonb_array_length(v_reasons) = 0,
        'request_id', p_request_id,
        'payment_id', v_payment.id,
        'payment_method', v_payment.payment_method,
        'payment_status', v_payment.status,
        'request_payment_status', v_request.payment_status,
        'method_proven', v_method_proven,
        'reasons', v_reasons
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.emergency_dispatch_payment_snapshot(UUID)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_dispatch_payment_snapshot(UUID)
    TO service_role;
-- END EMERGENCY_PAYMENT_RELEASE_GATE

CREATE OR REPLACE FUNCTION public.complete_card_payment(
    p_payment_intent_id TEXT,
    p_provider_response JSONB DEFAULT '{}'::JSONB,
    p_fee_amount NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_status TEXT := NULL;
    v_request_payment_status TEXT := NULL;
    v_request_payment_id UUID := NULL;
    v_effective_fee_amount NUMERIC := 0;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF NULLIF(TRIM(COALESCE(p_payment_intent_id, '')), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'payment intent id is required');
    END IF;

    SELECT p.*
    INTO v_payment
    FROM public.payments p
    WHERE p.stripe_payment_intent_id = p_payment_intent_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card payment not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'card' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a card payment');
    END IF;

    IF v_payment.emergency_request_id IS NOT NULL THEN
        SELECT request.status, request.payment_status, request.payment_id
        INTO v_request_status, v_request_payment_status, v_request_payment_id
        FROM public.emergency_requests request
        WHERE request.id = v_payment.emergency_request_id
        FOR UPDATE;

        IF NOT FOUND OR v_request_payment_id IS DISTINCT FROM v_payment.id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Card payment is not linked to its emergency request');
        END IF;
    END IF;

    IF COALESCE(v_payment.status, '') = 'completed'
       AND (
            v_payment.emergency_request_id IS NULL
            OR COALESCE(v_request_payment_status, 'completed') = 'completed'
       ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment.id,
            'request_id', v_payment.emergency_request_id,
            'already_completed', true
        );
    END IF;

    v_effective_fee_amount := COALESCE(
        p_fee_amount,
        NULLIF(v_payment.ivisit_fee_amount, 0),
        NULLIF((v_payment.metadata->>'fee_amount')::NUMERIC, 0),
        NULLIF((v_payment.metadata->>'fee')::NUMERIC, 0),
        0
    );

    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'stripe_webhook', true);
    PERFORM set_config('ivisit.transition_reason', 'card_payment_confirmed', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'payment_intent_id', p_payment_intent_id,
            'payment_id', v_payment.id
        )::TEXT,
        true
    );
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    UPDATE public.payments
    SET status = 'completed',
        processed_at = COALESCE(processed_at, NOW()),
        ivisit_fee_amount = v_effective_fee_amount,
        metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
            'fee_amount', v_effective_fee_amount,
            'fee', v_effective_fee_amount,
            'source', 'complete_card_payment'
        ),
        provider_response = COALESCE(p_provider_response, provider_response, '{}'::JSONB),
        updated_at = NOW()
    WHERE id = v_payment.id;

    IF v_payment.emergency_request_id IS NOT NULL THEN
        IF COALESCE(v_request_status, 'pending_approval') NOT IN ('completed', 'cancelled', 'payment_declined') THEN
            UPDATE public.emergency_requests
            SET status = CASE
                    WHEN status = 'pending_approval' THEN 'in_progress'
                    ELSE status
                END,
                payment_status = 'completed',
                updated_at = NOW()
            WHERE id = v_payment.emergency_request_id
            RETURNING status INTO v_request_status;

        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'request_id', v_payment.emergency_request_id,
        'request_status', v_request_status,
        'fee_amount', v_effective_fee_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.get_available_ambulances(UUID, INTEGER, TEXT)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_available_ambulances(UUID, INTEGER, TEXT)
    TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_ambulance_status(UUID, TEXT, JSONB, TIMESTAMPTZ, UUID)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_ambulance_status(UUID, TEXT, JSONB, TIMESTAMPTZ, UUID)
    TO service_role;

-- 🛠️ Stripe webhook fail card payment and close the pending request safely
CREATE OR REPLACE FUNCTION public.fail_card_payment(
    p_payment_intent_id TEXT,
    p_provider_response JSONB DEFAULT '{}'::JSONB,
    p_failure_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_status TEXT := NULL;
    v_request_payment_status TEXT := NULL;
    v_request_payment_id UUID := NULL;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF NULLIF(TRIM(COALESCE(p_payment_intent_id, '')), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'payment intent id is required');
    END IF;

    SELECT p.*
    INTO v_payment
    FROM public.payments p
    WHERE p.stripe_payment_intent_id = p_payment_intent_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card payment not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'card' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a card payment');
    END IF;

    IF v_payment.emergency_request_id IS NOT NULL THEN
        SELECT request.status, request.payment_status, request.payment_id
        INTO v_request_status, v_request_payment_status, v_request_payment_id
        FROM public.emergency_requests request
        WHERE request.id = v_payment.emergency_request_id
        FOR UPDATE;

        IF NOT FOUND OR v_request_payment_id IS DISTINCT FROM v_payment.id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Card payment is not linked to its emergency request');
        END IF;
    END IF;

    IF COALESCE(v_payment.status, '') = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment.id,
            'request_id', v_payment.emergency_request_id,
            'ignored_after_success', true
        );
    END IF;

    IF COALESCE(v_payment.status, '') IN ('failed', 'declined')
       AND (
            v_payment.emergency_request_id IS NULL
            OR COALESCE(v_request_status, 'payment_declined') = 'payment_declined'
       ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment.id,
            'request_id', v_payment.emergency_request_id,
            'already_failed', true
        );
    END IF;

    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'stripe_webhook', true);
    PERFORM set_config(
        'ivisit.transition_reason',
        COALESCE(NULLIF(TRIM(p_failure_reason), ''), 'card_payment_failed'),
        true
    );
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'payment_intent_id', p_payment_intent_id,
            'payment_id', v_payment.id
        )::TEXT,
        true
    );
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    UPDATE public.payments
    SET status = 'failed',
        processed_at = COALESCE(processed_at, NOW()),
        metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
            'failure_reason', COALESCE(NULLIF(TRIM(p_failure_reason), ''), 'card_payment_failed'),
            'source', 'fail_card_payment'
        ),
        provider_response = COALESCE(p_provider_response, provider_response, '{}'::JSONB),
        updated_at = NOW()
    WHERE id = v_payment.id;

    IF v_payment.emergency_request_id IS NOT NULL
       AND COALESCE(v_request_status, 'pending_approval') NOT IN ('completed', 'cancelled', 'payment_declined') THEN
        UPDATE public.emergency_requests
        SET status = 'payment_declined',
            payment_status = 'failed',
            updated_at = NOW()
        WHERE id = v_payment.emergency_request_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'request_id', v_payment.emergency_request_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Approve Cash Payment
CREATE OR REPLACE FUNCTION public.approve_cash_payment(p_payment_id UUID, p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_org_id UUID;
    v_request_status TEXT;
    v_request_payment_status TEXT;
    v_request_service_type TEXT;
    v_org_wallet_id UUID;
    v_org_balance NUMERIC;
    v_platform_wallet_id UUID;
    v_patient_wallet_id UUID;
    v_fee_amount NUMERIC;
    v_fee_percentage NUMERIC;
    v_assigned_ambulance_id UUID;
    v_responder_name TEXT;
    v_responder_phone TEXT;
    v_responder_vehicle_type TEXT;
    v_responder_vehicle_plate TEXT;
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);

    -- 1. Verify Payment/Request Integrity + lock target rows
    SELECT
        p.*,
        NULLIF((p.metadata->>'fee_amount')::NUMERIC, 0) AS calculated_fee,
        NULLIF((p.metadata->>'fee')::NUMERIC, 0) AS legacy_calculated_fee
    INTO v_payment 
    FROM public.payments p 
    WHERE p.id = p_payment_id
      AND p.status = 'pending'
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;
    
    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending payment/request pair not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a cash payment');
    END IF;

    SELECT er.service_type, h.organization_id, er.status, er.payment_status
    INTO v_request_service_type, v_request_org_id, v_request_status, v_request_payment_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_payment.organization_id IS DISTINCT FROM v_request_org_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request organization mismatch');
    END IF;

    IF v_request_status NOT IN ('pending_approval', 'pending') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting cash approval',
            'request_status', v_request_status
        );
    END IF;

    IF COALESCE(v_request_payment_status, 'pending') NOT IN ('pending', 'requires_approval') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request payment is not in a pending approval state',
            'payment_status', v_request_payment_status
        );
    END IF;

    -- 2. Authorization (service_role bypass; authenticated callers must be operator-scoped)
    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash approval';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    -- 3. Guard: Auto-provision Org Wallet if missing
    SELECT id, balance INTO v_org_wallet_id, v_org_balance 
    FROM public.organization_wallets 
    WHERE organization_id = v_payment.organization_id
    FOR UPDATE;

    IF v_org_wallet_id IS NULL AND v_payment.organization_id IS NOT NULL THEN
        INSERT INTO public.organization_wallets (organization_id, balance)
        VALUES (v_payment.organization_id, 0)
        RETURNING id, balance INTO v_org_wallet_id, v_org_balance;
    END IF;
    
    SELECT id INTO v_platform_wallet_id FROM public.ivisit_main_wallet LIMIT 1 FOR UPDATE;

    -- 4. Resolve Platform Fee (protect against default 0.00 masking real metadata fee)
    SELECT ivisit_fee_percentage
    INTO v_fee_percentage
    FROM public.organizations
    WHERE id = v_request_org_id;

    v_fee_amount := COALESCE(
        NULLIF(v_payment.ivisit_fee_amount, 0),
        v_payment.calculated_fee,
        v_payment.legacy_calculated_fee,
        ROUND(COALESCE(v_payment.amount, 0) * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2),
        0
    );

    -- 5. Execute Ledger Operations (only if fee > 0)
    IF v_fee_amount > 0 THEN
        IF v_org_balance < v_fee_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization balance insufficient for platform fee');
        END IF;

        -- Deduct from Org
        UPDATE public.organization_wallets SET balance = balance - v_fee_amount, updated_at = NOW() WHERE id = v_org_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_org_wallet_id, -v_fee_amount, 'debit', 'iVisit Platform Fee (Cash Payment)', p_payment_id);

        -- Credit Platform
        UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount, last_updated = NOW() WHERE id = v_platform_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_platform_wallet_id, v_fee_amount, 'credit', 'Platform Fee (Cash Payment)', p_payment_id);
    END IF;

    -- 6. Finalize Statuses
    UPDATE public.payments
    SET status = 'completed',
        processed_at = NOW(),
        ivisit_fee_amount = v_fee_amount,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('fee_amount', v_fee_amount, 'fee', v_fee_amount),
        updated_at = NOW()
    WHERE id = p_payment_id;
    UPDATE public.emergency_requests
    SET status = 'in_progress', payment_status = 'completed', updated_at = NOW()
    WHERE id = p_request_id;
    -- Backfill responder snapshot fields after approval/auto-dispatch so mobile receives a usable driver label.
    IF v_request_service_type = 'ambulance' THEN
        UPDATE public.emergency_requests er
        SET
            responder_id = COALESCE(er.responder_id, a.profile_id),
            responder_name = COALESCE(
                NULLIF(BTRIM(er.responder_name), ''),
                NULLIF(BTRIM(p.full_name), ''),
                NULLIF(BTRIM(a.call_sign), ''),
                NULLIF(BTRIM(a.vehicle_number), ''),
                NULLIF(BTRIM(a.type), ''),
                'Responder'
            ),
            responder_phone = COALESCE(
                NULLIF(BTRIM(er.responder_phone), ''),
                NULLIF(BTRIM(p.phone), '')
            ),
            responder_vehicle_type = COALESCE(
                NULLIF(BTRIM(er.responder_vehicle_type), ''),
                NULLIF(BTRIM(a.type), '')
            ),
            responder_vehicle_plate = COALESCE(
                NULLIF(BTRIM(er.responder_vehicle_plate), ''),
                NULLIF(BTRIM(a.license_plate), ''),
                NULLIF(BTRIM(a.vehicle_number), '')
            ),
            updated_at = NOW()
        FROM public.ambulances a
        LEFT JOIN public.profiles p ON p.id = a.profile_id
        WHERE er.id = p_request_id
          AND er.ambulance_id = a.id;
    END IF;

    SELECT
        ambulance_id,
        responder_name,
        responder_phone,
        responder_vehicle_type,
        responder_vehicle_plate
    INTO
        v_assigned_ambulance_id,
        v_responder_name,
        v_responder_phone,
        v_responder_vehicle_type,
        v_responder_vehicle_plate
    FROM public.emergency_requests
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true, 
        'fee_deducted', v_fee_amount, 
        'new_balance', COALESCE((v_org_balance - v_fee_amount), 0),
        'ambulance_id', v_assigned_ambulance_id,
        'responder_name', v_responder_name,
        'responder_phone', v_responder_phone,
        'responder_vehicle_type', v_responder_vehicle_type,
        'responder_vehicle_plate', v_responder_vehicle_plate
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.create_emergency_v4(UUID, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_card_payment(TEXT, JSONB, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fail_card_payment(TEXT, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_cash_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_cash_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_cash_payment_v2(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_emergency_v4(UUID, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_card_payment(TEXT, JSONB, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_card_payment(TEXT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_cash_payment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_cash_payment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_cash_payment_v2(UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;

-- 🛠️ ATOMIC: Decline Cash Payment
CREATE OR REPLACE FUNCTION public.decline_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_org_id UUID;
    v_request_status TEXT;
    v_request_payment_status TEXT;
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'decline_cash_payment', true);
    PERFORM set_config('ivisit.transition_reason', 'cash_payment_declined', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object('payment_id', p_payment_id, 'request_id', p_request_id)::TEXT,
        true
    );
    IF v_actor_id IS NOT NULL THEN
        PERFORM set_config('ivisit.transition_actor_id', v_actor_id::TEXT, true);
    END IF;
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    SELECT p.*
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
      AND p.status = 'pending'
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending payment/request pair not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a cash payment');
    END IF;

    SELECT h.organization_id, er.status, er.payment_status
    INTO v_request_org_id, v_request_status, v_request_payment_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_payment.organization_id IS DISTINCT FROM v_request_org_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request organization mismatch');
    END IF;

    IF v_request_status NOT IN ('pending_approval', 'pending') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting cash approval',
            'request_status', v_request_status
        );
    END IF;

    IF COALESCE(v_request_payment_status, 'pending') NOT IN ('pending', 'requires_approval') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request payment is not in a pending approval state',
            'payment_status', v_request_payment_status
        );
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash decline';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.payments SET status = 'failed', updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests
    SET status = 'payment_declined', payment_status = 'failed', updated_at = NOW()
    WHERE id = p_request_id;
    RETURN jsonb_build_object('success', TRUE, 'status', 'declined');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Process Manual Cash Payment (Fluid v2)
-- Used by Console admins to record offline payments
CREATE OR REPLACE FUNCTION public.process_cash_payment_v2(
    p_emergency_request_id UUID,
    p_organization_id UUID,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
) RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_user_id UUID;
    v_request_org_id UUID;
    v_request_status TEXT;
    v_fee_amount NUMERIC;
    v_fee_percentage NUMERIC;
    v_payment_id UUID;
BEGIN
    -- 1. Validate actor scope for a mutation RPC
    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash processing';
        END IF;
    END IF;

    -- 2. Validate request scope + lock target row
    SELECT er.user_id, h.organization_id, er.status
    INTO v_user_id, v_request_org_id, v_request_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_emergency_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_request_org_id IS DISTINCT FROM p_organization_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request/organization mismatch');
    END IF;

    IF NOT v_is_service_role AND v_actor_role IN ('org_admin', 'dispatcher') THEN
        IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM p_organization_id THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    IF v_request_status IN ('cancelled', 'completed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request is not eligible for manual cash processing');
    END IF;

    -- 3. Get Fee Config
    SELECT ivisit_fee_percentage INTO v_fee_percentage FROM public.organizations WHERE id = p_organization_id;
    
    v_fee_amount := p_amount * (COALESCE(v_fee_percentage, 2.5) / 100);

    -- 4. Create Completed Payment
    INSERT INTO public.payments (
        user_id, 
        emergency_request_id, 
        organization_id, 
        amount, 
        currency, 
        payment_method, 
        status, 
        ivisit_fee_amount,
        processed_at
    )
    VALUES (
        v_user_id, 
        p_emergency_request_id, 
        p_organization_id, 
        p_amount, 
        p_currency, 
        'cash', 
        'completed', 
        v_fee_amount,
        NOW()
    )
    RETURNING id INTO v_payment_id;

    UPDATE public.emergency_requests
    SET payment_status = 'completed',
        updated_at = NOW()
    WHERE id = p_emergency_request_id;

    RETURN jsonb_build_object(
        'success', true, 
        'payment_id', v_payment_id, 
        'fee_calculated', v_fee_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🏯 Module 10: Legacy Logistics Logic
-- Reintroducing critical driver & bed management RPCs

-- 1. Bed Management
CREATE OR REPLACE FUNCTION public.discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'discharge_patient', true);
    PERFORM set_config('ivisit.transition_reason', 'patient_discharged', true);
    IF v_actor_id IS NOT NULL THEN
        PERFORM set_config('ivisit.transition_actor_id', v_actor_id::TEXT, true);
    END IF;
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
      AND er.service_type = 'bed'
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for bed discharge';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'completed', updated_at = NOW()
    WHERE id = request_uuid::UUID AND service_type = 'bed';
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_bed_reservation(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'cancel_bed_reservation', true);
    PERFORM set_config('ivisit.transition_reason', 'bed_reservation_cancelled', true);
    IF v_actor_id IS NOT NULL THEN
        PERFORM set_config('ivisit.transition_actor_id', v_actor_id::TEXT, true);
    END IF;
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
      AND er.service_type = 'bed'
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for bed cancel';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = request_uuid::UUID AND service_type = 'bed';
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Driver Management
CREATE OR REPLACE FUNCTION public.complete_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'complete_trip', true);
    PERFORM set_config('ivisit.transition_reason', 'trip_completed', true);
    IF v_actor_id IS NOT NULL THEN
        PERFORM set_config('ivisit.transition_actor_id', v_actor_id::TEXT, true);
    END IF;
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for trip completion';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'completed', updated_at = NOW()
    WHERE id = request_uuid::UUID;
    -- Note: Amb status trigger separates concerns
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'cancel_trip', true);
    PERFORM set_config('ivisit.transition_reason', 'trip_cancelled', true);
    IF v_actor_id IS NOT NULL THEN
        PERFORM set_config('ivisit.transition_actor_id', v_actor_id::TEXT, true);
    END IF;
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for trip cancellation';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = request_uuid::UUID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Availability Management
CREATE OR REPLACE FUNCTION public.update_hospital_availability(
    hospital_id UUID,
    beds_available INTEGER,
    er_wait_time INTEGER,
    p_status TEXT,            -- renamed from 'status' to avoid ambiguity with column name
    ambulance_count INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT organization_id
    INTO v_hospital_org_id
    FROM public.hospitals h
    WHERE h.id = hospital_id
    FOR UPDATE OF h;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for hospital availability update';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.hospitals h
    SET
        available_beds = COALESCE(beds_available, h.available_beds),
        emergency_wait_time_minutes = COALESCE(er_wait_time, h.emergency_wait_time_minutes),
        wait_time = CASE
            WHEN er_wait_time IS NULL THEN h.wait_time
            ELSE er_wait_time || ' mins'
        END,
        status = COALESCE(NULLIF(TRIM(p_status), ''), h.status),    -- 'available', 'busy', 'full'
        ambulances_count = COALESCE(ambulance_count, h.ambulances_count),
        bed_availability = jsonb_strip_nulls(
            COALESCE(h.bed_availability, '{}'::jsonb)
            || jsonb_build_object(
                'available', COALESCE(beds_available, h.available_beds),
                'icu', COALESCE(h.icu_beds_available, 0),
                'standard', GREATEST(
                    0,
                    COALESCE(beds_available, h.available_beds) - COALESCE(h.icu_beds_available, 0)
                ),
                'total', GREATEST(
                    COALESCE(h.total_beds, 0),
                    COALESCE(beds_available, h.available_beds)
                )
            )
        ),
        last_availability_update = NOW(),
        updated_at = NOW()
    WHERE h.id = hospital_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- 🏯 Module 11: Pricing System
-- Standardized pricing for services and rooms

-- 1. Service Pricing Table
CREATE TABLE IF NOT EXISTS public.service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    service_name TEXT NOT NULL,
    base_price NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, service_type)
);

-- 2. Room Pricing Table
CREATE TABLE IF NOT EXISTS public.room_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    room_type TEXT NOT NULL,
    room_name TEXT NOT NULL,
    price_per_night NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, room_type)
);

-- 3. RLS
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active service pricing" ON public.service_pricing FOR SELECT USING (true);
CREATE POLICY "Public view active room pricing" ON public.room_pricing FOR SELECT USING (true);

-- Allow Org Admins to manage own hospital pricing
CREATE POLICY "Org Admins manage pricing" ON public.service_pricing FOR ALL
USING (
    hospital_id IN (SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id())
    OR public.p_is_admin()
);

CREATE POLICY "Org Admins manage room pricing" ON public.room_pricing FOR ALL
USING (
    hospital_id IN (SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id())
    OR public.p_is_admin()
);

-- 4. RPCs
CREATE OR REPLACE FUNCTION public.upsert_service_pricing(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_service_type TEXT;
    v_base_price NUMERIC;
BEGIN
    v_hospital_id := (payload->>'hospital_id')::UUID;
    v_service_type := payload->>'service_type';
    v_base_price := (payload->>'base_price')::NUMERIC;

    IF v_hospital_id IS NOT NULL THEN
        SELECT organization_id
        INTO v_hospital_org_id
        FROM public.hospitals
        WHERE id = v_hospital_id;

        IF v_hospital_org_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Hospital not found');
        END IF;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for pricing update';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_hospital_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: global pricing mutations require admin role';
            END IF;

            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;
    
    INSERT INTO public.service_pricing (hospital_id, service_type, service_name, base_price, description)
    VALUES (
        v_hospital_id,
        v_service_type,
        payload->>'service_name',
        v_base_price,
        payload->>'description'
    )
    ON CONFLICT (hospital_id, service_type)
    DO UPDATE SET
        service_name = EXCLUDED.service_name,
        base_price = EXCLUDED.base_price,
        description = EXCLUDED.description,
        updated_at = NOW();
        
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.upsert_room_pricing(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_room_type TEXT;
    v_price NUMERIC;
BEGIN
    v_hospital_id := (payload->>'hospital_id')::UUID;
    v_room_type := payload->>'room_type';
    v_price := (payload->>'price_per_night')::NUMERIC;

    IF v_hospital_id IS NOT NULL THEN
        SELECT organization_id
        INTO v_hospital_org_id
        FROM public.hospitals
        WHERE id = v_hospital_id;

        IF v_hospital_org_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Hospital not found');
        END IF;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for pricing update';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_hospital_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: global pricing mutations require admin role';
            END IF;

            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;
    
    INSERT INTO public.room_pricing (hospital_id, room_type, room_name, price_per_night, description)
    VALUES (
        v_hospital_id,
        v_room_type,
        payload->>'room_name',
        v_price,
        payload->>'description'
    )
    ON CONFLICT (hospital_id, room_type)
    DO UPDATE SET
        room_name = EXCLUDED.room_name,
        price_per_night = EXCLUDED.price_per_night,
        description = EXCLUDED.description,
        updated_at = NOW();
        
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_service_pricing(target_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_id UUID;
    v_hospital_org_id UUID;
    v_row_exists BOOLEAN := FALSE;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT sp.hospital_id, h.organization_id
    INTO v_hospital_id, v_hospital_org_id
    FROM public.service_pricing sp
    LEFT JOIN public.hospitals h ON h.id = sp.hospital_id
    WHERE sp.id = target_id;

    v_row_exists := FOUND;
    IF NOT v_row_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pricing row not found');
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for pricing delete';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_hospital_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: global pricing mutations require admin role';
            END IF;

            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;

    DELETE FROM public.service_pricing WHERE id = target_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_room_pricing(target_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_id UUID;
    v_hospital_org_id UUID;
    v_row_exists BOOLEAN := FALSE;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    SELECT rp.hospital_id, h.organization_id
    INTO v_hospital_id, v_hospital_org_id
    FROM public.room_pricing rp
    LEFT JOIN public.hospitals h ON h.id = rp.hospital_id
    WHERE rp.id = target_id;

    v_row_exists := FOUND;
    IF NOT v_row_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pricing row not found');
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for pricing delete';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_hospital_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: global pricing mutations require admin role';
            END IF;

            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_hospital_org_id THEN
                RAISE EXCEPTION 'Unauthorized: hospital outside actor organization';
            END IF;
        END IF;
    END IF;

    DELETE FROM public.room_pricing WHERE id = target_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.discharge_patient(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_bed_reservation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_trip(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_trip(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_hospital_availability(UUID, INTEGER, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_service_pricing(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_room_pricing(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_service_pricing(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_room_pricing(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.discharge_patient(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_bed_reservation(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_trip(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_trip(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_hospital_availability(UUID, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_service_pricing(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_room_pricing(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_service_pricing(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_room_pricing(UUID) TO authenticated, service_role;

-- Missing updated_at triggers for pricing tables
CREATE TRIGGER handle_service_pricing_updated_at BEFORE UPDATE ON public.service_pricing FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_room_pricing_updated_at BEFORE UPDATE ON public.room_pricing FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Pricing Indexes
CREATE INDEX IF NOT EXISTS idx_service_pricing_type ON public.service_pricing(service_type);
CREATE INDEX IF NOT EXISTS idx_service_pricing_hospital ON public.service_pricing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_room_pricing_type ON public.room_pricing(room_type);
CREATE INDEX IF NOT EXISTS idx_room_pricing_hospital ON public.room_pricing(hospital_id);

-- ================================================================
-- Integrated Fix Pack (2026-03-02): Deterministic Emergency State
-- Source: consolidated from temporary fix migrations
-- ================================================================

-- Deterministic and safe ambulance status mutation.
CREATE OR REPLACE FUNCTION public.update_ambulance_status(
    p_ambulance_id UUID,
    p_status TEXT,
    p_location JSONB DEFAULT NULL,
    p_eta TIMESTAMPTZ DEFAULT NULL,
    p_current_call UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital_id UUID;
    v_prev_status TEXT;
    v_location geometry;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Legacy ambulance status mutation is restricted to service_role';
    END IF;

    IF p_status NOT IN ('available', 'dispatched', 'en_route', 'on_scene', 'returning', 'maintenance', 'offline', 'on_trip') THEN
        RETURN jsonb_build_object('error', 'Invalid status', 'code', 'INVALID_STATUS');
    END IF;

    SELECT hospital_id, status
    INTO v_hospital_id, v_prev_status
    FROM public.ambulances
    WHERE id = p_ambulance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Ambulance not found', 'code', 'NOT_FOUND');
    END IF;

    IF p_location IS NOT NULL THEN
        BEGIN
            v_location := ST_SetSRID(ST_GeomFromGeoJSON(p_location::TEXT), 4326);
        EXCEPTION WHEN OTHERS THEN
            v_location := NULL;
        END;
    END IF;

    UPDATE public.ambulances
    SET status = p_status,
        location = COALESCE(v_location, location),
        eta = COALESCE(p_eta, eta),
        current_call = COALESCE(p_current_call, current_call),
        updated_at = NOW()
    WHERE id = p_ambulance_id;

    IF v_hospital_id IS NOT NULL AND v_prev_status IS DISTINCT FROM p_status THEN
        UPDATE public.hospitals
        SET last_availability_update = NOW()
        WHERE id = v_hospital_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'status', p_status,
        'updated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Bed discharge must use legal emergency status values.
CREATE OR REPLACE FUNCTION public.discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    PERFORM set_config('ivisit.transition_source', 'discharge_patient', true);
    PERFORM set_config('ivisit.transition_reason', 'patient_discharged', true);
    IF v_actor_id IS NOT NULL THEN
        PERFORM set_config('ivisit.transition_actor_id', v_actor_id::TEXT, true);
    END IF;
    IF v_is_service_role THEN
        PERFORM set_config('ivisit.transition_actor_role', 'service_role', true);
    END IF;

    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = request_uuid::UUID
      AND er.service_type = 'bed'
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for bed discharge';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    UPDATE public.emergency_requests
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        updated_at = NOW()
    WHERE id = request_uuid::UUID
      AND service_type = 'bed'
      AND status IN ('in_progress', 'accepted', 'arrived');

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enforce RPC-only status mutations for deterministic state transitions.
CREATE OR REPLACE FUNCTION public.enforce_emergency_status_write_path()
RETURNS TRIGGER AS $$
DECLARE
    v_allow_status_write TEXT := current_setting('ivisit.allow_emergency_status_write', true);
BEGIN
    IF TG_OP = 'UPDATE'
       AND NEW.status IS DISTINCT FROM OLD.status
       AND pg_trigger_depth() <= 1
       AND COALESCE(v_allow_status_write, '0') <> '1' THEN
        RAISE EXCEPTION 'Direct emergency status updates are blocked; use canonical emergency RPCs'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_emergency_status_write_path ON public.emergency_requests;
CREATE TRIGGER trg_enforce_emergency_status_write_path
BEFORE UPDATE OF status ON public.emergency_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_emergency_status_write_path();

CREATE OR REPLACE FUNCTION public.log_emergency_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_claim_role TEXT := NULLIF(v_claims->>'role', '');
    v_actor_setting TEXT := NULLIF(current_setting('ivisit.transition_actor_id', true), '');
    v_actor_user_id UUID;
    v_actor_role TEXT := NULLIF(current_setting('ivisit.transition_actor_role', true), '');
    v_source TEXT := NULLIF(current_setting('ivisit.transition_source', true), '');
    v_reason TEXT := NULLIF(current_setting('ivisit.transition_reason', true), '');
    v_transition_metadata JSONB := '{}'::JSONB;
    v_metadata_setting TEXT := NULLIF(current_setting('ivisit.transition_metadata', true), '');
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF v_actor_setting IS NOT NULL AND v_actor_setting ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        v_actor_user_id := v_actor_setting::UUID;
    ELSE
        v_actor_user_id := auth.uid();
    END IF;

    IF v_actor_role IS NULL AND v_actor_user_id IS NOT NULL THEN
        SELECT role INTO v_actor_role
        FROM public.profiles
        WHERE id = v_actor_user_id;
    END IF;

    IF v_actor_role IS NULL THEN
        v_actor_role := COALESCE(v_claim_role, 'system');
    END IF;

    IF v_source IS NULL THEN
        IF TG_OP = 'INSERT' THEN
            v_source := 'emergency_request_insert';
        ELSIF pg_trigger_depth() > 1 THEN
            v_source := 'trigger_chain';
        ELSIF v_claim_role = 'service_role' THEN
            v_source := 'service_role';
        ELSE
            v_source := 'direct_update';
        END IF;
    END IF;

    IF v_reason IS NULL THEN
        IF TG_OP = 'INSERT' THEN
            v_reason := 'initial_status';
        ELSE
            v_reason := 'status_transition';
        END IF;
    END IF;

    IF v_metadata_setting IS NOT NULL THEN
        BEGIN
            v_transition_metadata := v_metadata_setting::JSONB;
        EXCEPTION WHEN OTHERS THEN
            v_transition_metadata := jsonb_build_object('metadata_parse_error', true, 'raw', v_metadata_setting);
        END;
    END IF;

    v_transition_metadata := COALESCE(v_transition_metadata, '{}'::JSONB)
        || jsonb_build_object(
            'trigger_op', TG_OP,
            'trigger_depth', pg_trigger_depth(),
            'jwt_role', COALESCE(v_claim_role, ''),
            'txid', txid_current()::TEXT
        );

    INSERT INTO public.emergency_status_transitions (
        emergency_request_id,
        from_status,
        to_status,
        actor_user_id,
        actor_role,
        source,
        reason,
        transition_metadata,
        request_snapshot,
        occurred_at
    )
    VALUES (
        NEW.id,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
        NEW.status,
        v_actor_user_id,
        v_actor_role,
        v_source,
        v_reason,
        v_transition_metadata,
        to_jsonb(NEW),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_log_emergency_status_transition ON public.emergency_requests;
CREATE TRIGGER trg_log_emergency_status_transition
AFTER INSERT OR UPDATE OF status ON public.emergency_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_emergency_status_transition();


-- BEGIN CONSOLE_PAYMENT_RETRY_TRANSITION
-- Canonical emergency status transition guard.
CREATE OR REPLACE FUNCTION public.is_valid_emergency_status_transition(
    p_current_status TEXT,
    p_next_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current TEXT := LOWER(COALESCE(NULLIF(p_current_status, ''), ''));
    v_next TEXT := LOWER(COALESCE(NULLIF(p_next_status, ''), ''));
BEGIN
    IF v_current = '' OR v_next = '' THEN
        RETURN FALSE;
    END IF;

    IF v_current = v_next THEN
        RETURN TRUE;
    END IF;

    CASE v_current
        WHEN 'pending_approval' THEN
            RETURN v_next IN ('in_progress', 'cancelled', 'payment_declined');
        WHEN 'in_progress' THEN
            RETURN v_next IN ('accepted', 'completed', 'cancelled', 'payment_declined');
        WHEN 'payment_declined' THEN
            RETURN v_next = 'pending_approval';
        WHEN 'accepted' THEN
            RETURN v_next IN ('in_progress', 'arrived', 'completed', 'cancelled');
        WHEN 'arrived' THEN
            RETURN v_next IN ('completed', 'cancelled');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
-- END CONSOLE_PAYMENT_RETRY_TRANSITION

CREATE OR REPLACE FUNCTION public.validate_emergency_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT public.is_valid_emergency_status_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION 'Illegal emergency status transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_emergency_status_transition ON public.emergency_requests;
CREATE TRIGGER trg_validate_emergency_status_transition
BEFORE UPDATE OF status ON public.emergency_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_emergency_status_transition();
