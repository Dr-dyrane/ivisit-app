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

-- 🛠️ AUTOMATION: LOGISTICS HOOKS
-- A. Sync Emergency -> Visit on Completion
CREATE OR REPLACE FUNCTION public.sync_emergency_to_visit()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'completed') AND (OLD.status != 'completed') THEN
        INSERT INTO public.visits (user_id, hospital_id, request_id, hospital_name, specialty, type, status, cost)
        VALUES (NEW.user_id, NEW.hospital_id, NEW.id, NEW.hospital_name, NEW.specialty, NEW.service_type, 'completed', NEW.total_cost::TEXT);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emergency_completed
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.sync_emergency_to_visit();

-- B. Auto-Assign Driver (MVP)
CREATE OR REPLACE FUNCTION public.auto_assign_driver()
RETURNS TRIGGER AS $$
DECLARE
    v_amb_id UUID;
    v_driver_id UUID;
    v_driver_name TEXT;
BEGIN
    IF (NEW.status = 'in_progress' AND NEW.service_type = 'ambulance' AND NEW.responder_id IS NULL) THEN
        SELECT id, profile_id INTO v_amb_id, v_driver_id
        FROM public.ambulances
        WHERE hospital_id = NEW.hospital_id AND status = 'available'
        LIMIT 1;

        IF v_amb_id IS NOT NULL THEN
            SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = v_driver_id;
            
            UPDATE public.emergency_requests
            SET responder_id = v_driver_id,
                responder_name = v_driver_name,
                ambulance_id = v_amb_id,
                status = 'accepted'
            WHERE id = NEW.id;

            UPDATE public.ambulances SET status = 'on_trip' WHERE id = v_amb_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emergency_start_dispatch
AFTER INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.auto_assign_driver();

-- C. Standard Timestamps & Display IDs
CREATE TRIGGER handle_amb_updated_at BEFORE UPDATE ON public.ambulances FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_req_updated_at BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_visit_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER stamp_amb_display_id BEFORE INSERT ON public.ambulances FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_req_display_id BEFORE INSERT ON public.emergency_requests FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_visit_display_id BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- D. Update Resource Availability
CREATE OR REPLACE FUNCTION public.update_resource_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle Ambulance Status
    IF (NEW.ambulance_id IS NOT NULL) THEN
        IF (NEW.status IN ('accepted', 'arrived', 'in_progress')) THEN
            UPDATE public.ambulances SET status = 'on_trip' WHERE id = NEW.ambulance_id;
        ELSIF (NEW.status IN ('completed', 'cancelled', 'payment_declined')) THEN
            UPDATE public.ambulances SET status = 'available' WHERE id = NEW.ambulance_id;
        END IF;
    END IF;

    -- Handle Bed Availability
    IF (NEW.service_type = 'bed') THEN
        IF (NEW.status = 'in_progress' AND OLD.status != 'in_progress') THEN
            UPDATE public.hospitals SET available_beds = GREATEST(0, available_beds - 1) WHERE id = NEW.hospital_id;
        ELSIF (NEW.status IN ('completed', 'cancelled') AND OLD.status NOT IN ('completed', 'cancelled')) THEN
            UPDATE public.hospitals SET available_beds = available_beds + 1 WHERE id = NEW.hospital_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emergency_status_resource_sync
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.update_resource_availability();
