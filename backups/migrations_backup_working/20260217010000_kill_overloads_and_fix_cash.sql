-- Migration: Cleanup check_cash_eligibility overloads and unify on TEXT input
-- Author: Antigravity
-- Date: 2026-02-17

-- 1. Drop all possible overloads to avoid "ambiguous function" or "operator does not exist" errors
DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, DECIMAL);
DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, NUMERIC);

-- 2. Create the unified robust version
-- Using TEXT for p_organization_id because JS/PostgREST often passes strings
-- Using NUMERIC for amount to match the organizations table
CREATE OR REPLACE FUNCTION public.check_cash_eligibility(
    p_organization_id TEXT,
    p_estimated_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_balance NUMERIC;
    v_fee_rate NUMERIC;
    v_required_fee NUMERIC;
BEGIN
    -- Defensive cast: if it fails, it's not a valid UUID string
    BEGIN
        v_org_id := p_organization_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    IF v_org_id IS NULL THEN RETURN FALSE; END IF;

    -- Get wallet balance (organization_wallets has UUID organization_id)
    SELECT balance INTO v_balance 
    FROM public.organization_wallets 
    WHERE organization_id = v_org_id;
    
    -- Get fee rate from organizations table (id is UUID)
    SELECT ivisit_fee_percentage INTO v_fee_rate 
    FROM public.organizations 
    WHERE id = v_org_id;
    
    -- Fallback to platform default 2.5% if not specified
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    
    -- Calculate required fee that must be covered by the wallet balance
    -- Formula: (Estimated Total * Org Fee %) / 100
    v_required_fee := (p_estimated_amount * v_fee_rate) / 100;
    
    -- Return true if balance exists and covers the fee
    RETURN COALESCE(v_balance, 0) >= v_required_fee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.check_cash_eligibility(TEXT, NUMERIC) TO authenticated;

-- 3. Ensure calculate_emergency_cost also uses the latest org-specific fee
-- Updated to match JS parameters: p_service_type, p_hospital_id, p_ambulance_id, p_room_id
-- Drop previous versions to allow return type changes
DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, UUID, UUID, UUID, DECIMAL, BOOLEAN);

CREATE OR REPLACE FUNCTION public.calculate_emergency_cost(
    p_service_type TEXT,
    p_hospital_id UUID DEFAULT NULL,
    p_ambulance_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL,
    p_distance DECIMAL DEFAULT 0,
    p_is_urgent BOOLEAN DEFAULT false
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
    -- Get Org ID from Hospital context
    SELECT h.organization_id INTO v_org_id FROM public.hospitals h WHERE h.id = p_hospital_id;

    -- 1. Determine Base Cost (Hierarchy)
    -- Check Ambulance Specific first if provided
    IF p_ambulance_id IS NOT NULL THEN
        SELECT a.base_price, 'Ambulance (' || a.license_plate || ')' INTO v_base_cost, v_service_name
        FROM public.ambulances a
        WHERE a.id = p_ambulance_id;
    END IF;

    -- Check Room Specific
    IF (v_base_cost IS NULL OR v_base_cost = 0) AND p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL THEN
        SELECT hr.base_price, hr.room_type INTO v_base_cost, v_service_name
        FROM public.hospital_rooms hr
        WHERE hr.id = p_room_id;
    END IF;

    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        -- Check service_pricing with scoping
        SELECT sp.base_price, sp.service_name 
        INTO v_base_cost, v_service_name
        FROM public.service_pricing sp
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

    -- Hardcoded Fallbacks for testing
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

    -- 3. iVisit Orchestrator Fee
    -- Fetch from org specifically
    IF v_org_id IS NOT NULL THEN
        SELECT ivisit_fee_percentage INTO v_platform_fee_rate FROM public.organizations WHERE id = v_org_id;
    END IF;
    v_platform_fee_rate := COALESCE(v_platform_fee_rate, 2.5);
    
    -- Consistency with paymentService.js formula: total = base / (1 - rate)
    v_total_cost := v_total_cost / (1 - (v_platform_fee_rate / 100));
    v_platform_fee := v_total_cost - (v_base_cost + v_distance_surcharge + v_urgency_surcharge);

    -- Build Breakdown
    v_breakdown := jsonb_build_array(
        jsonb_build_object('name', COALESCE(v_service_name, 'Base Service'), 'cost', ROUND(v_base_cost, 2), 'type', 'base'),
        jsonb_build_object('name', 'Distance Surcharge', 'cost', ROUND(v_distance_surcharge, 2), 'type', 'distance'),
        jsonb_build_object('name', 'Urgency Surcharge', 'cost', ROUND(v_urgency_surcharge, 2), 'type', 'urgency'),
        jsonb_build_object('name', 'iVisit Orchestrator Fee (' || v_platform_fee_rate || '%)', 'cost', ROUND(v_platform_fee, 2), 'type', 'fee')
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

NOTIFY pgrst, 'reload schema';
