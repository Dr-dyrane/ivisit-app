-- Migration: Robust Cash Check and Orchestrator Fee Integration
-- Author: Antigravity
-- Date: 2026-02-16

-- 1. Correct/Update calculate_emergency_cost to include 2.5% iVisit Orchestrator Fee
CREATE OR REPLACE FUNCTION public.calculate_emergency_cost(
    p_service_type TEXT,
    p_distance DECIMAL DEFAULT 0,
    p_is_urgent BOOLEAN DEFAULT false,
    p_hospital_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL
)
RETURNS TABLE (
    base_cost DECIMAL,
    distance_surcharge DECIMAL,
    urgency_surcharge DECIMAL,
    platform_fee DECIMAL,
    total_cost DECIMAL,
    breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_cost DECIMAL := 0;
    v_distance_surcharge DECIMAL := 0;
    v_urgency_surcharge DECIMAL := 0;
    v_platform_fee DECIMAL := 0;
    v_total_cost DECIMAL := 0;
    v_breakdown JSONB := '[]'::jsonb;
    v_service_name TEXT;
    v_org_id UUID;
    v_platform_fee_rate DECIMAL := 2.5; -- Default global fee
BEGIN
    -- 1. Determine Base Cost (Hierarchy)
    IF p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL THEN
        SELECT base_price, room_type INTO v_base_cost, v_service_name
        FROM hospital_rooms
        WHERE id = p_room_id;
    END IF;

    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        -- Get Org ID from Hospital context
        SELECT organization_id INTO v_org_id FROM public.hospitals WHERE id = p_hospital_id;

        -- Check service_pricing with scoping
        SELECT sp.base_price, sp.service_name 
        INTO v_base_cost, v_service_name
        FROM service_pricing sp
        WHERE sp.service_type = p_service_type 
          AND sp.is_active = true
          AND (
            sp.hospital_id = p_hospital_id OR 
            sp.organization_id = v_org_id OR 
            (sp.hospital_id IS NULL AND sp.organization_id IS NULL)
          )
        ORDER BY 
          (sp.hospital_id = p_hospital_id) DESC, 
          (sp.organization_id = v_org_id) DESC,
          sp.hospital_id DESC NULLS LAST,
          sp.organization_id DESC NULLS LAST
        LIMIT 1;
    END IF;

    -- Hardcoded Fallbacks
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        IF p_service_type = 'ambulance' THEN v_base_cost := 150.00; v_service_name := 'Ambulance Service';
        ELSIF p_service_type = 'consultation' THEN v_base_cost := 100.00; v_service_name := 'Consultation';
        ELSE v_base_cost := 200.00; v_service_name := 'Hospital Stay';
        END IF;
    END IF;

    -- 2. Surcharges
    IF p_distance > 5 THEN
        v_distance_surcharge := (p_distance - 5) * 2.00;
    END IF;

    IF p_is_urgent THEN
        v_urgency_surcharge := 25.00;
    END IF;

    -- Subtotal before platform fee
    v_total_cost := v_base_cost + v_distance_surcharge + v_urgency_surcharge;

    -- 3. iVisit Orchestrator Fee (2.5%)
    -- Custom fee per Org if defined
    IF v_org_id IS NOT NULL THEN
        SELECT ivisit_fee_percentage INTO v_platform_fee_rate FROM public.organizations WHERE id = v_org_id;
    END IF;
    v_platform_fee_rate := COALESCE(v_platform_fee_rate, 2.5);
    
    -- Formula: Total = Subtotal / (1 - rate) to ensure provider gets exactly Subtotal?
    -- Actually, user said "add orchestrator fee of 2.5 %". Usually implies Price * 1.025.
    -- But in paymentService.js: totalWithFee = baseAmount / (1 - feeRate);
    -- Let's stick to the paymentService.js formula for consistency.
    v_total_cost := v_total_cost / (1 - (v_platform_fee_rate / 100));
    v_platform_fee := v_total_cost - (v_base_cost + v_distance_surcharge + v_urgency_surcharge);

    -- Build Breakdown
    v_breakdown := jsonb_build_array(
        jsonb_build_object('name', COALESCE(v_service_name, 'Base Service'), 'cost', ROUND(v_base_cost, 2), 'type', 'base'),
        jsonb_build_object('name', 'Distance Surcharge', 'cost', ROUND(v_distance_surcharge, 2), 'type', 'distance'),
        jsonb_build_object('name', 'Urgency Surcharge', 'cost', ROUND(v_urgency_surcharge, 2), 'type', 'urgency'),
        jsonb_build_object('name', 'iVisit Orchestrator Fee', 'cost', ROUND(v_platform_fee, 2), 'type', 'fee')
    );

    RETURN QUERY SELECT 
        ROUND(v_base_cost, 2),
        ROUND(v_distance_surcharge, 2),
        ROUND(v_urgency_surcharge, 2),
        ROUND(v_platform_fee, 2),
        ROUND(v_total_cost, 2),
        v_breakdown;
END;
$$;

-- 2. Robust check_cash_eligibility (replaces any previous versions to avoid ambiguity)
-- DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, DECIMAL);
-- DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, DECIMAL);

CREATE OR REPLACE FUNCTION public.check_cash_eligibility(
    p_organization_id TEXT,
    p_estimated_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_balance DECIMAL;
    v_fee_rate DECIMAL;
    v_required_fee DECIMAL;
BEGIN
    -- Defensive UUID cast
    BEGIN
        v_org_id := p_organization_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    IF v_org_id IS NULL THEN RETURN FALSE; END IF;

    -- Get wallet balance
    SELECT balance INTO v_balance 
    FROM public.organization_wallets 
    WHERE organization_id = v_org_id;
    
    -- Get fee rate
    SELECT ivisit_fee_percentage INTO v_fee_rate 
    FROM public.organizations 
    WHERE id = v_org_id;
    
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    
    -- Calculate required fee (2.5% of estimated amount must be in wallet)
    v_required_fee := (p_estimated_amount * v_fee_rate) / 100;
    
    -- Log for debugging (visible in Supabase logs)
    -- RAISE NOTICE 'Org: %, Balance: %, Required Fee: %', v_org_id, v_balance, v_required_fee;

    RETURN COALESCE(v_balance, 0) >= v_required_fee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure nearby_hospitals returns the correct fields for the UI
-- Re-run the update to ensure it's effective
CREATE OR REPLACE FUNCTION public.nearby_hospitals(
    user_lat double precision,
    user_lng double precision,
    radius_km integer DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    name text,
    address text,
    phone text,
    rating double precision,
    type text,
    image text,
    specialties text[],
    service_types text[],
    features text[],
    emergency_level text,
    available_beds integer,
    ambulances_count integer,
    wait_time text,
    price_range text,
    latitude double precision,
    longitude double precision,
    verified boolean,
    status text,
    distance_km double precision,
    place_id text,
    google_address text,
    google_phone text,
    google_rating double precision,
    google_photos text[],
    google_opening_hours jsonb,
    google_types text[],
    google_website text,
    import_status text,
    org_admin_id uuid,
    organization_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id, h.name, h.address, h.phone, h.rating, h.type, h.image, 
        h.specialties, h.service_types, h.features, h.emergency_level, 
        h.available_beds, h.ambulances_count, h.wait_time, h.price_range, 
        h.latitude, h.longitude, h.verified, h.status,
        (ST_Distance(ST_MakePoint(user_lng, user_lat)::geography, ST_MakePoint(h.longitude, h.latitude)::geography) / 1000.0)::double precision as distance_km,
        h.place_id, h.google_address, h.google_phone, h.google_rating::double precision, h.google_photos,
        h.google_opening_hours, h.google_types, h.google_website, h.import_status, h.org_admin_id, h.organization_id, h.created_at, h.updated_at
    FROM public.hospitals h
    WHERE 
        h.verified = true AND h.status = 'available' AND h.latitude IS NOT NULL AND h.longitude IS NOT NULL
        AND ST_DWithin(ST_MakePoint(user_lng, user_lat)::geography, ST_MakePoint(h.longitude, h.latitude)::geography, radius_km * 1000)
    ORDER BY distance_km ASC;
END;
$$;

NOTIFY pgrst, 'reload schema';
