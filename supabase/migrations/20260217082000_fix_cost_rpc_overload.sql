-- Migration: Fix calculate_emergency_cost overload
-- Problem: Old 5-param version and new 6-param version both exist, 
--          causing PostgREST ambiguity. Drop old, keep new with service_fee.

-- Drop the OLD overload (5 params: TEXT, DECIMAL, BOOLEAN, UUID, UUID)
DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, DECIMAL, BOOLEAN, UUID, UUID);

-- Drop any lingering version to be safe
DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, DECIMAL, BOOLEAN, UUID, UUID, UUID);

-- Recreate the SINGLE canonical version with service fee included
CREATE OR REPLACE FUNCTION public.calculate_emergency_cost(
    p_service_type TEXT,
    p_distance DECIMAL DEFAULT 0,
    p_is_urgent BOOLEAN DEFAULT false,
    p_hospital_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL,
    p_ambulance_id UUID DEFAULT NULL
)
RETURNS TABLE (
    base_cost DECIMAL,
    distance_surcharge DECIMAL,
    urgency_surcharge DECIMAL,
    service_fee DECIMAL,
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
    v_service_fee DECIMAL := 0;
    v_subtotal DECIMAL := 0;
    v_total_cost DECIMAL := 0;
    v_breakdown JSONB := '[]'::jsonb;
    v_service_name TEXT;
    v_fee_rate DECIMAL := 0.025; -- 2.5%
BEGIN
    -- 1. Determine Base Cost
    -- Hierarchy: Room Override > Ambulance Override > Hospital/Org Pricing > Fallback
    
    IF p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL THEN
        SELECT base_price, room_type INTO v_base_cost, v_service_name
        FROM hospital_rooms
        WHERE id = p_room_id;
    END IF;

    -- Ambulance override
    IF v_base_cost IS NULL AND p_service_type = 'ambulance' AND p_ambulance_id IS NOT NULL THEN
        -- Try service_pricing first (when ambulance card ID = service_pricing ID)
        SELECT sp.base_price, sp.service_name INTO v_base_cost, v_service_name
        FROM service_pricing sp WHERE sp.id = p_ambulance_id AND sp.is_active = true;
        
        -- Fallback to ambulances table
        IF v_base_cost IS NULL THEN
            SELECT a.base_price INTO v_base_cost FROM ambulances a WHERE a.id = p_ambulance_id;
            IF v_base_cost IS NOT NULL THEN v_service_name := 'Ambulance Service'; END IF;
        END IF;
    END IF;

    -- Hospital/Org scoped pricing
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
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

    -- Hardcoded fallbacks
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        IF p_service_type = 'ambulance' THEN v_base_cost := 150.00; v_service_name := 'Ambulance Service';
        ELSIF p_service_type = 'consultation' THEN v_base_cost := 100.00; v_service_name := 'Consultation';
        ELSIF p_service_type IN ('bed_booking', 'bed') THEN v_base_cost := 200.00; v_service_name := 'Bed Booking';
        ELSE v_base_cost := 100.00; v_service_name := 'Standard Service';
        END IF;
    END IF;

    -- Base to breakdown
    v_breakdown := v_breakdown || jsonb_build_object(
        'name', COALESCE(v_service_name, 'Base Service'), 
        'cost', v_base_cost, 
        'type', 'base'
    );

    -- 2. Distance Surcharge (> 5km, $2/km)
    IF p_distance > 5 THEN
        v_distance_surcharge := ROUND((p_distance - 5) * 2.00, 2);
        v_breakdown := v_breakdown || jsonb_build_object(
            'name', 'Distance Surcharge', 
            'cost', v_distance_surcharge, 
            'type', 'distance'
        );
    END IF;

    -- 3. Urgency Surcharge
    IF p_is_urgent THEN
        v_urgency_surcharge := 25.00;
        v_breakdown := v_breakdown || jsonb_build_object(
            'name', 'Urgency Surcharge', 
            'cost', v_urgency_surcharge, 
            'type', 'urgency'
        );
    END IF;

    -- 4. Subtotal + Service Fee
    v_subtotal := v_base_cost + v_distance_surcharge + v_urgency_surcharge;
    v_service_fee := ROUND(v_subtotal * v_fee_rate, 2);

    v_breakdown := v_breakdown || jsonb_build_object(
        'name', 'Service Fee (2.5%)',
        'cost', v_service_fee,
        'type', 'fee'
    );

    -- 5. Total
    v_total_cost := v_subtotal + v_service_fee;

    RETURN QUERY SELECT 
        v_base_cost,
        v_distance_surcharge,
        v_urgency_surcharge,
        v_service_fee,
        v_total_cost,
        v_breakdown;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.calculate_emergency_cost(TEXT, DECIMAL, BOOLEAN, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_emergency_cost(TEXT, DECIMAL, BOOLEAN, UUID, UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
