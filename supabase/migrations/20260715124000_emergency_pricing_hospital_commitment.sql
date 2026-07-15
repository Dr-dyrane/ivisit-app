-- Temporary emergency pricing authority and hospital commitment deployment.
-- Source digest: 7925951f683d9c80
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Source: supabase/migrations/20260219000800_emergency_logic.sql (resolve_emergency_pricing function)
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


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (revoke direct emergency pricing resolver access)
-- The resolver is internal; normal clients use the controlled quote/create RPCs.
REVOKE EXECUTE ON FUNCTION public.resolve_emergency_pricing(TEXT, UUID, TEXT, NUMERIC)
FROM PUBLIC, anon, authenticated;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (create_emergency_v4 function)
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


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (nearby_hospitals function)
CREATE OR REPLACE FUNCTION public.nearby_hospitals(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 15
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance DOUBLE PRECISION,
  verified BOOLEAN,
  status TEXT,
  display_id TEXT,
  provider_type TEXT,
  emergency_eligible BOOLEAN,
  dispatch_eligible BOOLEAN,
  verification_status TEXT,
  provider_source TEXT,
  category_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id, h.name, h.address, h.latitude, h.longitude,
    ST_Distance(
      h.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0 AS distance,
    h.verified, h.status, h.display_id,
    h.provider_type, h.emergency_eligible, h.dispatch_eligible,
    h.verification_status, h.provider_source, h.category_confidence
  FROM public.hospitals h
  WHERE
    h.coordinates IS NOT NULL
    AND h.status = 'available'
    AND h.provider_type = 'hospital'
    AND h.emergency_eligible = true
    AND h.dispatch_eligible = true
    AND ST_DWithin(
      h.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000.0
    )
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (calculate_emergency_cost_v2 function)
-- calculate_emergency_cost_v2: Used by app serviceCostService + pricingService
CREATE OR REPLACE FUNCTION public.calculate_emergency_cost_v2(
    p_service_type TEXT,
    p_hospital_id UUID DEFAULT NULL,
    p_ambulance_type TEXT DEFAULT NULL,
    p_distance_km NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
    RETURN public.resolve_emergency_pricing(
        p_service_type => p_service_type,
        p_hospital_id => p_hospital_id,
        p_ambulance_type => p_ambulance_type,
        p_distance_km => p_distance_km
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMIT;
