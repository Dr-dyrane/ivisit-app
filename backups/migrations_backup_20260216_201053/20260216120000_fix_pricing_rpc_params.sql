-- Migration: Definitive fix for calculate_emergency_cost parameters
-- Description: Drops old versions and creates a stable signature.

-- Drop ALL possible overloads to avoid ambiguity
DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, DECIMAL, BOOLEAN, UUID, UUID);
DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, DECIMAL, BOOLEAN, UUID, UUID, UUID);

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
    v_total_cost DECIMAL := 0;
    v_breakdown JSONB := '[]'::jsonb;
    v_service_name TEXT;
    v_org_id UUID;
BEGIN
    -- 0. Get Organization ID if Hospital ID is provided
    IF p_hospital_id IS NOT NULL THEN
        SELECT organization_id INTO v_org_id FROM public.hospitals WHERE id = p_hospital_id;
    END IF;

    -- 1. Determine Base Cost (Hierarchy: Room > Hospital > Org > Admin)
    
    -- A. Check Room Override (Highest Priority for Bed Booking)
    IF p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL THEN
        SELECT sp.base_price, 'Room ' || sp.room_number || ' (' || sp.room_type || ')'
        INTO v_base_cost, v_service_name
        FROM public.hospital_rooms sp
        WHERE sp.id = p_room_id;
    END IF;

    -- B. Check Service Pricing Table (Hosp > Org > Global)
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
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
          -- Priorities: 1. Hospital match, 2. Org match, 3. Global (nulls last)
          (sp.hospital_id = p_hospital_id) DESC, 
          (sp.organization_id = v_org_id) DESC,
          sp.hospital_id DESC NULLS LAST,
          sp.organization_id DESC NULLS LAST
        LIMIT 1;
    END IF;

    -- C. Fallback to Hardcoded Defaults (Safety Net)
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        IF p_service_type = 'ambulance' THEN 
            v_base_cost := 150.00; v_service_name := 'Standard Ambulance';
        ELSIF p_service_type IN ('bed', 'bed_booking') THEN 
            v_base_cost := 200.00; v_service_name := 'Standard Ward Bed';
        ELSE 
            v_base_cost := 100.00; v_service_name := 'General Service';
        END IF;
    END IF;

    -- Add Base Cost to Breakdown
    v_breakdown := v_breakdown || jsonb_build_object(
        'name', v_service_name, 
        'cost', v_base_cost, 
        'type', 'base',
        'source', CASE 
            WHEN p_room_id IS NOT NULL THEN 'room_override'
            WHEN p_hospital_id IS NOT NULL THEN 'hospital_override'
            ELSE 'admin_default'
        END
    );

    -- 2. Calculate Distance Surcharge
    -- Logic: First 5km free, then $2.00 per km
    IF p_distance > 5 THEN
        v_distance_surcharge := (p_distance - 5) * 2.00;
        v_breakdown := v_breakdown || jsonb_build_object(
            'name', 'Distance Surcharge (>5km)', 
            'cost', v_distance_surcharge, 
            'type', 'distance'
        );
    END IF;

    -- 3. Calculate Urgency Surcharge
    IF p_is_urgent THEN
        v_urgency_surcharge := 25.00;
        v_breakdown := v_breakdown || jsonb_build_object(
            'name', 'Urgency Surcharge', 
            'cost', v_urgency_surcharge, 
            'type', 'urgency'
        );
    END IF;

    -- 4. Total Calculation
    v_total_cost := v_base_cost + v_distance_surcharge + v_urgency_surcharge;

    -- 5. Return Result
    RETURN QUERY SELECT 
        v_base_cost,
        v_distance_surcharge,
        v_urgency_surcharge,
        v_total_cost,
        v_breakdown;
END;
$$;

NOTIFY pgrst, 'reload schema';
