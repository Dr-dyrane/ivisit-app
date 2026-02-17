-- Migration: Fix Organization Fee Calculation
-- Author: Emergency Fix Implementation
-- Date: 2026-02-17
-- Description: Ensures organization fee calculation works correctly and adds debugging

-- ============================================================================  
-- 🔧 1. ENHANCE calculate_emergency_cost WITH BETTER ORG FEE HANDLING
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) CASCADE;

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
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_base_cost NUMERIC := 0;
    v_distance_surcharge NUMERIC := 0;
    v_urgency_surcharge NUMERIC := 0;
    v_platform_fee NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_breakdown JSONB := '[]'::jsonb;
    v_service_name TEXT;
    v_org_id UUID;
    v_platform_fee_rate NUMERIC := 2.5; 
    v_org_name TEXT;
BEGIN
    -- Get Org ID from Hospital context (with better error handling)
    BEGIN
        SELECT h.organization_id, o.name INTO v_org_id, v_org_name 
        FROM public.hospitals h 
        LEFT JOIN public.organizations o ON h.organization_id = o.id
        WHERE h.id::text = p_hospital_id::text;
    EXCEPTION WHEN OTHERS THEN
        v_org_id := NULL;
        v_org_name := NULL;
    END;

    -- Determine Base Cost
    IF p_ambulance_id IS NOT NULL AND p_ambulance_id != '' THEN
        SELECT a.base_price, 'Ambulance (' || COALESCE(a.license_plate, 'Unknown') || ')' INTO v_base_cost, v_service_name
        FROM public.ambulances a WHERE a.id::text = p_ambulance_id::text;
    END IF;

    IF (v_base_cost IS NULL OR v_base_cost = 0) AND p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL AND p_room_id != '' THEN
        SELECT hr.base_price, hr.room_type INTO v_base_cost, v_service_name
        FROM public.hospital_rooms hr WHERE hr.id::text = p_room_id::text;
    END IF;

    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        SELECT sp.base_price, sp.service_name INTO v_base_cost, v_service_name
        FROM public.service_pricing sp
        WHERE sp.service_type = p_service_type AND sp.is_active = true
          AND (sp.hospital_id::text = p_hospital_id::text OR sp.organization_id::text = v_org_id::text OR (sp.hospital_id IS NULL AND sp.organization_id IS NULL))
        ORDER BY (sp.hospital_id::text = p_hospital_id::text) DESC, (sp.organization_id::text = v_org_id::text) DESC LIMIT 1;
    END IF;

    -- Fallbacks
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        v_base_cost := CASE WHEN p_service_type = 'ambulance' THEN 150.00 ELSE 200.00 END;
        v_service_name := CASE WHEN p_service_type = 'ambulance' THEN 'Ambulance Service' ELSE 'Medical Resource' END;
    END IF;

    v_distance_surcharge := CASE WHEN p_distance > 5 THEN (p_distance - 5) * 2.00 ELSE 0 END;
    v_urgency_surcharge := CASE WHEN p_is_urgent THEN 25.00 ELSE 0 END;
    v_total_cost := v_base_cost + v_distance_surcharge + v_urgency_surcharge;

    -- Platform Fee (Enhanced organization handling)
    IF v_org_id IS NOT NULL THEN
        BEGIN
            SELECT ivisit_fee_percentage INTO v_platform_fee_rate 
            FROM public.organizations 
            WHERE id = v_org_id;
        EXCEPTION WHEN OTHERS THEN
            v_platform_fee_rate := 2.5;
        END;
    END IF;
    
    v_platform_fee_rate := COALESCE(v_platform_fee_rate, 2.5);
    v_total_cost := v_total_cost / (1 - (v_platform_fee_rate / 100));
    v_platform_fee := v_total_cost - (v_base_cost + v_distance_surcharge + v_urgency_surcharge);

    -- Build breakdown with organization info
    v_breakdown := jsonb_build_array(
        jsonb_build_object('name', v_service_name, 'cost', ROUND(v_base_cost::numeric, 2), 'type', 'base'),
        jsonb_build_object('name', 'Distance Surcharge', 'cost', ROUND(v_distance_surcharge::numeric, 2), 'type', 'distance'),
        jsonb_build_object('name', 'Urgency Surcharge', 'cost', ROUND(v_urgency_surcharge::numeric, 2), 'type', 'urgency'),
        jsonb_build_object(
            'name', 'iVisit Fee (' || v_platform_fee_rate || '%)' || 
                     CASE WHEN v_org_name IS NOT NULL THEN ' - ' || v_org_name ELSE '' END,
            'cost', ROUND(v_platform_fee::numeric, 2), 
            'type', 'fee',
            'organization_id', v_org_id::text,
            'organization_name', v_org_name
        )
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

-- ============================================================================
-- 🔧 2. ENSURE ORGANIZATION FEES ARE SET FOR ALL ORGANIZATIONS
-- ============================================================================

-- Update any organizations that don't have a fee percentage set
UPDATE public.organizations 
SET ivisit_fee_percentage = 2.5 
WHERE ivisit_fee_percentage IS NULL OR ivisit_fee_percentage = 0;

-- ============================================================================
-- 🔧 3. CREATE DEBUGGING FUNCTION FOR ORG FEE LOOKUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_organization_fee(p_hospital_id TEXT)
RETURNS TABLE (
    hospital_name TEXT,
    organization_id UUID,
    organization_name TEXT,
    fee_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.name as hospital_name,
        h.organization_id,
        o.name as organization_name,
        o.ivisit_fee_percentage as fee_percentage
    FROM public.hospitals h
    LEFT JOIN public.organizations o ON h.organization_id = o.id
    WHERE h.id::text = p_hospital_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.calculate_emergency_cost(TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_emergency_cost(TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.debug_organization_fee(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_organization_fee(TEXT) TO service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';

-- Add comments for documentation
COMMENT ON FUNCTION public.calculate_emergency_cost(TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) IS 'Enhanced version with better organization fee handling and debugging support.';
COMMENT ON FUNCTION public.debug_organization_fee(TEXT) IS 'Debug function to check hospital-organization-fee relationships.';
