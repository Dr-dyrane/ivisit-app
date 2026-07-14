-- Permanent callable-contract and lint repair for production emergency support.
-- Source digest: 7d88d9571ade853a
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';

-- Source: supabase/migrations/20260219000100_identity.sql (update_medical_profile function)
-- 3. Update Medical Profile
CREATE OR REPLACE FUNCTION public.update_medical_profile(
    p_user_id UUID,
    p_medical_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_validation_result JSONB;
    v_profile_exists BOOLEAN;
    v_allergies TEXT[];
    v_medications TEXT[];
    v_conditions TEXT[];
    v_result JSONB;
BEGIN
    IF NOT v_is_service_role AND v_actor_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Validate medical data first
    v_validation_result := public.validate_medical_profile(p_user_id, p_medical_data);
    
    IF NOT (v_validation_result->>'valid')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Validation failed',
            'validation_errors', v_validation_result->'errors'
        );
    END IF;

    v_allergies := CASE
        WHEN jsonb_typeof(p_medical_data->'allergies') = 'array'
            THEN ARRAY(SELECT value FROM jsonb_array_elements_text(p_medical_data->'allergies'))
        WHEN NULLIF(BTRIM(p_medical_data->>'allergies'), '') IS NOT NULL
            THEN ARRAY[BTRIM(p_medical_data->>'allergies')]
        ELSE NULL
    END;
    v_medications := CASE
        WHEN jsonb_typeof(p_medical_data->'medications') = 'array'
            THEN ARRAY(SELECT value FROM jsonb_array_elements_text(p_medical_data->'medications'))
        WHEN NULLIF(BTRIM(p_medical_data->>'medications'), '') IS NOT NULL
            THEN ARRAY[BTRIM(p_medical_data->>'medications')]
        ELSE NULL
    END;
    v_conditions := CASE
        WHEN jsonb_typeof(p_medical_data->'conditions') = 'array'
            THEN ARRAY(SELECT value FROM jsonb_array_elements_text(p_medical_data->'conditions'))
        WHEN NULLIF(BTRIM(p_medical_data->>'conditions'), '') IS NOT NULL
            THEN ARRAY[BTRIM(p_medical_data->>'conditions')]
        ELSE NULL
    END;
    
    -- Check if profile exists
    SELECT EXISTS(
        SELECT 1 FROM public.medical_profiles 
        WHERE user_id = p_user_id
    ) INTO v_profile_exists;
    
    -- Update or insert profile
    IF v_profile_exists THEN
        UPDATE public.medical_profiles 
        SET 
            blood_type = p_medical_data->>'blood_type',
            allergies = v_allergies,
            medications = v_medications,
            conditions = v_conditions,
            emergency_notes = p_medical_data->>'emergency_notes',
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        INSERT INTO public.medical_profiles (
            user_id, blood_type, allergies, medications, conditions, emergency_notes
        ) VALUES (
            p_user_id, 
            p_medical_data->>'blood_type',
            v_allergies,
            v_medications,
            v_conditions,
            p_medical_data->>'emergency_notes'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'updated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000300_logistics.sql (calculate_ambulance_eta function)
-- 4. Calculate Ambulance ETA
CREATE OR REPLACE FUNCTION public.calculate_ambulance_eta(
    p_ambulance_id UUID,
    p_destination_lat NUMERIC,
    p_destination_lng NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_ambulance_location GEOMETRY;
    v_destination GEOMETRY;
    v_distance_km NUMERIC;
    v_avg_speed_kmh NUMERIC := 50; -- Average city speed
    v_prep_time_minutes NUMERIC := 5; -- Preparation time
    v_eta TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Ambulance ETA calculation is restricted to service_role';
    END IF;

    IF p_destination_lat IS NULL OR p_destination_lng IS NULL
       OR p_destination_lat < -90 OR p_destination_lat > 90
       OR p_destination_lng < -180 OR p_destination_lng > 180 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Destination coordinates are invalid',
            'code', 'INVALID_DESTINATION'
        );
    END IF;

    -- Get ambulance current location
    SELECT location INTO v_ambulance_location
    FROM public.ambulances 
    WHERE id = p_ambulance_id;
    
    IF v_ambulance_location IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance location not available',
            'code', 'LOCATION_NOT_AVAILABLE'
        );
    END IF;
    
    v_destination := ST_SetSRID(
        ST_MakePoint(p_destination_lng::DOUBLE PRECISION, p_destination_lat::DOUBLE PRECISION),
        4326
    );
    v_distance_km := ST_Distance(
        v_ambulance_location::GEOGRAPHY,
        v_destination::GEOGRAPHY
    ) / 1000;
    
    -- Calculate ETA
    v_eta := NOW() + make_interval(
        secs => ((v_distance_km / v_avg_speed_kmh) * 3600 + v_prep_time_minutes * 60)::DOUBLE PRECISION
    );
    
    -- Update ambulance ETA
    UPDATE public.ambulances 
    SET eta = v_eta 
    WHERE id = p_ambulance_id;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'distance_km', v_distance_km,
        'eta', v_eta,
        'estimated_minutes', EXTRACT(EPOCH FROM (v_eta - NOW())) / 60,
        'calculated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219000500_ops_content.sql (process_insurance_claim function)
-- 2. Process Insurance Claim
CREATE OR REPLACE FUNCTION public.process_insurance_claim(
    p_emergency_request_id UUID,
    p_user_id UUID,
    p_hospital_id UUID,
    p_actual_cost NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_policy_id UUID;
    v_coverage_amount NUMERIC;
    v_claim_amount NUMERIC;
    v_claim_id UUID;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Insurance claim processing is restricted to service_role';
    END IF;

    IF p_emergency_request_id IS NULL OR p_user_id IS NULL OR p_hospital_id IS NULL
       OR p_actual_cost IS NULL OR p_actual_cost <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Claim input is invalid',
            'code', 'INVALID_CLAIM_INPUT'
        );
    END IF;

    -- Get user's active policy
    SELECT id, coverage_amount INTO v_policy_id, v_coverage_amount
    FROM public.insurance_policies 
    WHERE user_id = p_user_id 
    AND is_active = true
    ORDER BY is_default DESC, created_at DESC
    LIMIT 1;
    
    IF v_policy_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No active insurance policy found',
            'code', 'NO_ACTIVE_POLICY'
        );
    END IF;
    
    -- Calculate claim amount (minimum of actual cost and coverage)
    v_claim_amount := LEAST(p_actual_cost, COALESCE(v_coverage_amount, 0));
    
    -- Create insurance claim record
    INSERT INTO public.insurance_billing (
        emergency_request_id,
        user_id,
        hospital_id,
        insurance_policy_id,
        total_amount,
        insurance_amount,
        user_amount,
        coverage_percentage,
        status,
        created_at
    ) VALUES (
        p_emergency_request_id,
        p_user_id,
        p_hospital_id,
        v_policy_id,
        p_actual_cost,
        v_claim_amount,
        p_actual_cost - v_claim_amount,
        CASE WHEN p_actual_cost > 0 THEN (v_claim_amount / p_actual_cost) * 100 ELSE 0 END,
        'pending',
        NOW()
    )
    ON CONFLICT (emergency_request_id) WHERE emergency_request_id IS NOT NULL
    DO UPDATE SET
        insurance_policy_id = EXCLUDED.insurance_policy_id,
        total_amount = EXCLUDED.total_amount,
        insurance_amount = EXCLUDED.insurance_amount,
        user_amount = EXCLUDED.user_amount,
        coverage_percentage = EXCLUDED.coverage_percentage,
        updated_at = NOW()
    RETURNING id INTO v_claim_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_claim_id,
        'billed_amount', p_actual_cost,
        'covered_amount', v_claim_amount,
        'patient_responsibility', p_actual_cost - v_claim_amount,
        'processed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (search_auth_users function)
-- ─── 6. User Search & Profile Admin ─────────────────────

-- search_auth_users: Used by console profilesService
CREATE OR REPLACE FUNCTION public.search_auth_users(search_term TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    phone TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    raw_user_meta_data JSONB
) AS $$
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    SELECT au.id, au.email::TEXT, au.phone::TEXT,
           au.last_sign_in_at, au.created_at, au.raw_user_meta_data
    FROM auth.users au
    WHERE au.email ILIKE '%' || search_term || '%'
       OR au.phone ILIKE '%' || search_term || '%'
       OR (au.raw_user_meta_data->>'full_name') ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.update_medical_profile(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_medical_profile(UUID, JSONB) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calculate_ambulance_eta(UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_ambulance_eta(UUID, NUMERIC, NUMERIC) TO service_role;
REVOKE ALL ON FUNCTION public.process_insurance_claim(UUID, UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_insurance_claim(UUID, UUID, UUID, NUMERIC) TO service_role;
ALTER TABLE public.emergency_requests VALIDATE CONSTRAINT emergency_requests_payment_id_fkey;
DROP FUNCTION IF EXISTS public._tmp_parse_test(UUID);
COMMIT;
