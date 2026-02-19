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
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'on_trip', 'maintenance')),
    location GEOMETRY(POINT, 4326),
    vehicle_number TEXT,
    license_plate TEXT,
    base_price NUMERIC,
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
    service_type TEXT NOT NULL CHECK (service_type IN ('ambulance', 'bed', 'booking')),
    
    -- Request snapshots
    hospital_name TEXT,
    specialty TEXT,
    ambulance_type TEXT,
    bed_number TEXT,
    
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
    
    -- Costs
    total_cost NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    display_id TEXT UNIQUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

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
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- triggers moved to 20260219000900_automations.sql


-- C. Standard Timestamps & Display IDs
CREATE TRIGGER handle_amb_updated_at BEFORE UPDATE ON public.ambulances FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_req_updated_at BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_visit_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER stamp_amb_display_id BEFORE INSERT ON public.ambulances FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_req_display_id BEFORE INSERT ON public.emergency_requests FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_visit_display_id BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- triggers moved to 20260219000900_automations.sql

