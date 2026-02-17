-- Migration: Definitive Type Mismatch Resolution for Emergency RPCs
-- Author: Antigravity
-- Date: 2026-02-17
-- Rule: Every ID comparison uses ::text = ::text to bypass UUID/String friction.

-- 1. DROP ALL POTENTIAL OVERLOADS
DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, NUMERIC) CASCADE;

DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, DECIMAL, BOOLEAN, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, UUID, UUID, UUID, DECIMAL, BOOLEAN) CASCADE;

-- 2. UNIFIED check_cash_eligibility
-- Takes TEXT to match JS/PostgREST defaults.
CREATE OR REPLACE FUNCTION public.check_cash_eligibility(
    p_organization_id TEXT,
    p_estimated_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance NUMERIC;
    v_fee_rate NUMERIC;
    v_required_fee NUMERIC;
BEGIN
    IF p_organization_id IS NULL OR p_organization_id = '' THEN 
        RETURN FALSE; 
    END IF;

    -- Look up wallet balance using hyper-safe text comparison
    SELECT balance INTO v_balance 
    FROM public.organization_wallets 
    WHERE organization_id::text = p_organization_id::text;
    
    -- Look up organization-specific fee rate
    SELECT ivisit_fee_percentage INTO v_fee_rate 
    FROM public.organizations 
    WHERE id::text = p_organization_id::text;
    
    -- Fallback to the platform standard 2.5% if not set
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    
    -- Calculate the required platform fee that must be covered by the wallet
    v_required_fee := (p_estimated_amount * v_fee_rate) / 100;
    
    -- Logic: Balance must be >= Required Fee
    RETURN COALESCE(v_balance, 0) >= v_required_fee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_cash_eligibility(TEXT, NUMERIC) TO authenticated;

-- 3. UNIFIED calculate_emergency_cost
-- Matches the parameter keys used in pricingService.js exactly.
CREATE OR REPLACE FUNCTION public.calculate_emergency_cost(
    p_service_type TEXT,
    p_hospital_id TEXT DEFAULT NULL,
    p_ambulance_id TEXT DEFAULT NULL,
    p_room_id TEXT DEFAULT NULL,
    p_distance NUMERIC DEFAULT 0,
    p_is_urgent BOOLEAN DEFAULT false
)
RETURNS TABLE (
    base_cost NUMERIC,
    distance_surcharge NUMERIC,
    urgency_surcharge NUMERIC,
    platform_fee NUMERIC,
    total_cost NUMERIC,
    breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_cost NUMERIC := 0;
    v_distance_surcharge NUMERIC := 0;
    v_urgency_surcharge NUMERIC := 0;
    v_platform_fee NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_breakdown JSONB := '[]'::jsonb;
    v_service_name TEXT;
    v_org_id UUID;
    v_platform_fee_rate NUMERIC := 2.5; -- Default global fee
BEGIN
    -- Get Org ID from Hospital context using text comparison
    SELECT h.organization_id INTO v_org_id 
    FROM public.hospitals h 
    WHERE h.id::text = p_hospital_id::text;

    -- 1. Determine Base Cost (Hierarchy)
    -- Check Ambulance Specific first
    IF p_ambulance_id IS NOT NULL AND p_ambulance_id != '' THEN
        SELECT a.base_price, 'Ambulance (' || a.license_plate || ')' INTO v_base_cost, v_service_name
        FROM public.ambulances a
        WHERE a.id::text = p_ambulance_id::text;
    END IF;

    -- Check Room Specific
    IF (v_base_cost IS NULL OR v_base_cost = 0) AND p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL AND p_room_id != '' THEN
        SELECT hr.base_price, hr.room_type INTO v_base_cost, v_service_name
        FROM public.hospital_rooms hr
        WHERE hr.id::text = p_room_id::text;
    END IF;

    -- Check General Service Pricing
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        SELECT sp.base_price, sp.service_name 
        INTO v_base_cost, v_service_name
        FROM public.service_pricing sp
        WHERE sp.service_type = p_service_type 
          AND sp.is_active = true
          AND (
            sp.hospital_id::text = p_hospital_id::text OR 
            sp.organization_id::text = v_org_id::text OR 
            (sp.hospital_id IS NULL AND sp.organization_id IS NULL)
          )
        ORDER BY 
          (sp.hospital_id::text = p_hospital_id::text) DESC, 
          (sp.organization_id::text = v_org_id::text) DESC,
          sp.hospital_id DESC NULLS LAST,
          sp.organization_id DESC NULLS LAST
        LIMIT 1;
    END IF;

    -- Final Hardcoded Fallbacks
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

    -- Subtotal
    v_total_cost := v_base_cost + v_distance_surcharge + v_urgency_surcharge;

    -- 3. iVisit Orchestrator Fee
    -- Fetch from Org specifically
    IF v_org_id IS NOT NULL THEN
        SELECT ivisit_fee_percentage INTO v_platform_fee_rate 
        FROM public.organizations 
        WHERE id::text = v_org_id::text;
    END IF;
    v_platform_fee_rate := COALESCE(v_platform_fee_rate, 2.5);
    
    -- Calculation: total = subtotal / (1 - fee_rate)
    v_total_cost := v_total_cost / (1 - (v_platform_fee_rate / 100));
    v_platform_fee := v_total_cost - (v_base_cost + v_distance_surcharge + v_urgency_surcharge);

    -- Build Breakdown JSONB
    v_breakdown := jsonb_build_array(
        jsonb_build_object('name', COALESCE(v_service_name, 'Base Service'), 'cost', ROUND(v_base_cost::numeric, 2), 'type', 'base'),
        jsonb_build_object('name', 'Distance Surcharge', 'cost', ROUND(v_distance_surcharge::numeric, 2), 'type', 'distance'),
        jsonb_build_object('name', 'Urgency Surcharge', 'cost', ROUND(v_urgency_surcharge::numeric, 2), 'type', 'urgency'),
        jsonb_build_object('name', 'iVisit Orchestrator Fee (' || v_platform_fee_rate || '%)', 'cost', ROUND(v_platform_fee::numeric, 2), 'type', 'fee')
    );

    RETURN QUERY SELECT 
        ROUND(v_base_cost::numeric, 2),
        ROUND(v_distance_surcharge::numeric, 2),
        ROUND(v_urgency_surcharge::numeric, 2),
        ROUND(v_platform_fee::numeric, 2),
        ROUND(v_total_cost::numeric, 2),
        v_breakdown;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_emergency_cost(TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
