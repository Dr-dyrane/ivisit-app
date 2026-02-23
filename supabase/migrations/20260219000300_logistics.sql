-- 🏯 Module 04: Logistics & Operations
-- Ambulances, Emergency Requests, and Visits

-- 1. Ambulances
CREATE TABLE IF NOT EXISTS public.ambulances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE, -- Driver Profile
    type TEXT,
    call_sign TEXT,
    -- Dispatch lifecycle statuses (matches automations + emergency_logic RPCs)
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN (
        'available', 'dispatched', 'on_trip', 'en_route', 'on_scene', 'returning',
        'maintenance', 'offline', 'pending_approval'
    )),
    location GEOMETRY(POINT, 4326),
    vehicle_number TEXT,
    license_plate TEXT,
    base_price NUMERIC,
    crew JSONB DEFAULT '{}',
    -- Real-time dispatch fields
    eta TIMESTAMPTZ,                          -- ETA to patient/destination
    current_call UUID,                         -- Active emergency_request UUID
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Emergency Requests
CREATE TABLE IF NOT EXISTS public.emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    ambulance_id UUID REFERENCES public.ambulances(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'payment_declined', 'in_progress', 'accepted', 'arrived', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'completed', 'failed', 'refunded', 'declined')),
    service_type TEXT NOT NULL CHECK (service_type IN ('ambulance', 'bed', 'booking')),
    
    -- Request snapshots
    hospital_name TEXT,
    specialty TEXT,
    ambulance_type TEXT,
    bed_number TEXT,
    patient_snapshot JSONB DEFAULT '{}',
    
    -- Real-time tracking
    pickup_location GEOMETRY(POINT, 4326),
    destination_location GEOMETRY(POINT, 4326),
    patient_location GEOMETRY(POINT, 4326),
    responder_location GEOMETRY(POINT, 4326),
    responder_heading DOUBLE PRECISION,
    
    -- Responder snapshot
    responder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    responder_name TEXT,
    responder_phone TEXT,
    responder_vehicle_type TEXT,
    responder_vehicle_plate TEXT,
    
    -- Doctor Assignment (populated by trigger in 0009)
    assigned_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    doctor_assigned_at TIMESTAMPTZ,
    
    -- Costs
    total_cost NUMERIC DEFAULT 0,
    display_id TEXT UNIQUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Add FK on emergency_doctor_assignments now that emergency_requests exists
ALTER TABLE public.emergency_doctor_assignments
ADD CONSTRAINT eda_emergency_request_fk
FOREIGN KEY (emergency_request_id) REFERENCES public.emergency_requests(id) ON DELETE CASCADE;

-- 3. Visits (Medical Record / History)
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
    hospital_name TEXT,
    doctor_name TEXT,
    specialty TEXT,
    date TEXT,
    time TEXT,
    type TEXT,
    status TEXT DEFAULT 'upcoming',
    notes TEXT,
    cost TEXT,
    -- Lifecycle & Rating (recovered from legacy)
    lifecycle_state TEXT,
    lifecycle_updated_at TIMESTAMPTZ DEFAULT NOW(),
    rating SMALLINT,
    rating_comment TEXT,
    rated_at TIMESTAMPTZ,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT visits_rating_range_chk CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- C. Standard Timestamps & Display IDs
CREATE TRIGGER handle_amb_updated_at BEFORE UPDATE ON public.ambulances FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_req_updated_at BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_visit_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER stamp_amb_display_id BEFORE INSERT ON public.ambulances FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_req_display_id BEFORE INSERT ON public.emergency_requests FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_visit_display_id BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- Concurrency Guards: max 1 active request per service type per user
CREATE UNIQUE INDEX IF NOT EXISTS emergency_requests_one_active_bed_per_user_idx
ON public.emergency_requests (user_id)
WHERE service_type = 'bed' AND status IN ('in_progress', 'accepted', 'arrived');

CREATE UNIQUE INDEX IF NOT EXISTS emergency_requests_one_active_ambulance_per_user_idx
ON public.emergency_requests (user_id)
WHERE service_type = 'ambulance' AND status IN ('in_progress', 'accepted', 'arrived');

-- 📍 Real-time Tracking RPC Functions
-- Part of Master System Improvement Plan - Phase 2 Important System Enhancements

-- 1. Update Ambulance Location
CREATE OR REPLACE FUNCTION public.update_ambulance_location(
    p_ambulance_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance_status TEXT;
    v_result JSONB;
BEGIN
    -- Get current ambulance status
    SELECT status INTO v_ambulance_status
    FROM public.ambulances 
    WHERE id = p_ambulance_id;
    
    IF v_ambulance_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance not found',
            'code', 'AMBULANCE_NOT_FOUND'
        );
    END IF;
    
    -- Update ambulance location
    UPDATE public.ambulances 
    SET 
        location = jsonb_build_object(
            'latitude', p_latitude,
            'longitude', p_longitude,
            'accuracy', p_accuracy,
            'updated_at', NOW()
        ),
        updated_at = NOW()
    WHERE id = p_ambulance_id;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'location', jsonb_build_object(
            'latitude', p_latitude,
            'longitude', p_longitude,
            'accuracy', p_accuracy
        ),
        'updated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get Ambulance Status
CREATE OR REPLACE FUNCTION public.get_ambulance_status(
    p_ambulance_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance_data JSONB;
    v_result JSONB;
BEGIN
    -- Get ambulance status and location
    SELECT jsonb_build_object(
        'id', id,
        'call_sign', call_sign,
        'status', status,
        'location', location,
        'hospital_id', hospital_id,
        'crew', crew,
        'vehicle_number', vehicle_number,
        'current_call', current_call,
        'eta', eta,
        'updated_at', updated_at
    ) INTO v_ambulance_data
    FROM public.ambulances 
    WHERE id = p_ambulance_id;
    
    IF v_ambulance_data IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance not found',
            'code', 'AMBULANCE_NOT_FOUND'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance', v_ambulance_data,
        'retrieved_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Track Emergency Progress
CREATE OR REPLACE FUNCTION public.track_emergency_progress(
    p_emergency_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_emergency_data JSONB;
    v_ambulance_data JSONB;
    v_hospital_data JSONB;
    v_result JSONB;
BEGIN
    -- Get emergency request data
    SELECT jsonb_build_object(
        'id', id,
        'status', status,
        'created_at', created_at,
        'ambulance_id', ambulance_id,
        'hospital_id', hospital_id,
        'patient_location', patient_location
    ) INTO v_emergency_data
    FROM public.emergency_requests 
    WHERE id = p_emergency_request_id;
    
    -- Get ambulance data if assigned
    SELECT jsonb_build_object(
        'id', id,
        'call_sign', call_sign,
        'status', status,
        'location', location,
        'eta', eta
    ) INTO v_ambulance_data
    FROM public.ambulances 
    WHERE id = (SELECT ambulance_id FROM public.emergency_requests WHERE id = p_emergency_request_id);
    
    -- Get hospital data
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'coordinates', coordinates,
        'available_beds', available_beds
    ) INTO v_hospital_data
    FROM public.hospitals 
    WHERE id = (SELECT hospital_id FROM public.emergency_requests WHERE id = p_emergency_request_id);
    
    v_result := jsonb_build_object(
        'success', true,
        'emergency', v_emergency_data,
        'ambulance', v_ambulance_data,
        'hospital', v_hospital_data,
        'tracked_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Calculate Ambulance ETA
CREATE OR REPLACE FUNCTION public.calculate_ambulance_eta(
    p_ambulance_id UUID,
    p_destination_lat NUMERIC,
    p_destination_lng NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance_location JSONB;
    v_distance_km NUMERIC;
    v_avg_speed_kmh NUMERIC := 50; -- Average city speed
    v_prep_time_minutes NUMERIC := 5; -- Preparation time
    v_eta TIMESTAMPTZ;
    v_result JSONB;
BEGIN
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
    
    -- Calculate distance using PostGIS
    v_distance_km := ST_Distance(
        ST_GeomFromText(
            'POINT(' || (v_ambulance_location->>'longitude') || ' ' || (v_ambulance_location->>'latitude') || ')'
        ),
        ST_GeomFromText(
            'POINT(' || p_destination_lng || ' ' || p_destination_lat || ')'
        )
    );
    
    -- Calculate ETA
    v_eta := NOW() + (v_distance_km / v_avg_speed_kmh || ' hours')::INTERVAL + v_prep_time_minutes || ' minutes'::INTERVAL;
    
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
