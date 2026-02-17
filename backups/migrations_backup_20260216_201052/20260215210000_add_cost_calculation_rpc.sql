
-- Migration: Add calculate_emergency_cost RPC
-- This function was missing but required by the frontend serviceCostService.js

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
BEGIN
    -- 1. Determine Base Cost
    -- Hierarchy for Bed: Room Override > Hospital Default > Global Default
    -- Hierarchy for Ambulance/Consultation: Hospital Override > Organization Override > Global Default
    
    IF p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL THEN
        SELECT base_price, room_type INTO v_base_cost, v_service_name
        FROM hospital_rooms
        WHERE id = p_room_id;
    END IF;

    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        -- Check service_pricing with scoping
        SELECT sp.base_price, sp.service_name 
        INTO v_base_cost, v_service_name
        FROM service_pricing sp
        LEFT JOIN hospitals h ON h.id = p_hospital_id
        WHERE sp.service_type = p_service_type 
          AND sp.is_active = true
          AND (
            sp.hospital_id = p_hospital_id OR 
            sp.organization_id = h.organization_id OR 
            (sp.hospital_id IS NULL AND sp.organization_id IS NULL)
          )
        ORDER BY 
          (sp.hospital_id = p_hospital_id) DESC, 
          (sp.organization_id = h.organization_id) DESC,
          sp.hospital_id DESC NULLS LAST,
          sp.organization_id DESC NULLS LAST
        LIMIT 1;
    END IF;

    -- Fallback/Overrides to match Mock Logic if DB is empty or value too low for testing
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        IF p_service_type = 'ambulance' THEN v_base_cost := 150.00; v_service_name := 'Ambulance Service';
        ELSIF p_service_type = 'consultation' THEN v_base_cost := 100.00; v_service_name := 'Consultation';
        ELSIF p_service_type = 'bed_booking' OR p_service_type = 'bed' THEN v_base_cost := 200.00; v_service_name := 'Bed Booking';
        ELSE v_base_cost := 100.00; v_service_name := 'Standard Service';
        END IF;
    END IF;

    -- Add Base Cost to Breakdown
    v_breakdown := v_breakdown || jsonb_build_object(
        'name', COALESCE(v_service_name, 'Base Service'), 
        'cost', v_base_cost, 
        'type', 'base'
    );

    -- 2. Calculate Distance Surcharge
    -- Logic: > 5km, $2.00 per km
    IF p_distance > 5 THEN
        v_distance_surcharge := (p_distance - 5) * 2.00;
        v_breakdown := v_breakdown || jsonb_build_object(
            'name', 'Distance Surcharge', 
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

    -- 4. Total
    v_total_cost := v_base_cost + v_distance_surcharge + v_urgency_surcharge;

    -- 5. Return
    RETURN QUERY SELECT 
        v_base_cost,
        v_distance_surcharge,
        v_urgency_surcharge,
        v_total_cost,
        v_breakdown;
END;
$$;

NOTIFY pgrst, 'reload schema';
