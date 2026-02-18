-- ============================================================================
-- GROUND ZERO CONSOLIDATED SCHEMA (v1.0)
-- Strict UUID-Native & Display ID Mapping Architecture
-- Date: 2026-02-18
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. UTILITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_display_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    random_num TEXT;
    new_id TEXT;
BEGIN
    random_num := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    new_id := prefix || '-' || random_num;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 3. CENTRAL ID MAPPINGS
CREATE TABLE IF NOT EXISTS public.id_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL UNIQUE,
    display_id TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MASTER DISPLAY ID TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.stamp_entity_display_id()
RETURNS TRIGGER AS $$
DECLARE 
    v_prefix TEXT;
BEGIN
    IF TG_TABLE_NAME = 'hospitals' THEN v_prefix := 'HSP';
    ELSIF TG_TABLE_NAME = 'profiles' THEN v_prefix := 'USR';
    ELSIF TG_TABLE_NAME = 'emergency_requests' THEN v_prefix := 'REQ';
    ELSIF TG_TABLE_NAME = 'ambulances' THEN v_prefix := 'AMB';
    ELSIF TG_TABLE_NAME = 'visits' THEN v_prefix := 'VIST';
    ELSE v_prefix := 'GEN';
    END IF;
    
    IF NEW.display_id IS NULL THEN
        NEW.display_id := public.generate_display_id(v_prefix);
    END IF;

    -- Register Mapping (using INSERT ... ON CONFLICT)
    -- This ensures the registry is always a 1:1 reflection
    INSERT INTO public.id_mappings (entity_id, display_id, entity_type)
    VALUES (NEW.id, NEW.display_id, TG_TABLE_NAME)
    ON CONFLICT (entity_id) DO UPDATE SET display_id = EXCLUDED.display_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. CORE TABLES

-- PROFILES (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    display_id TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HOSPITALS
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    display_id TEXT UNIQUE,
    status TEXT DEFAULT 'available',
    emergency_wait_time_minutes INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AMBULANCES
CREATE TABLE IF NOT EXISTS public.ambulances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id),
    profile_id UUID REFERENCES public.profiles(id), -- Linked Driver
    vehicle_number TEXT,
    type TEXT DEFAULT 'Basic',
    status TEXT DEFAULT 'available',
    current_call TEXT, -- Reference to active request
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMERGENCY REQUESTS
CREATE TABLE IF NOT EXISTS public.emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    hospital_id UUID REFERENCES public.hospitals(id),
    ambulance_id UUID REFERENCES public.ambulances(id),
    responder_id UUID REFERENCES public.profiles(id), -- Assigned Responder
    service_type TEXT NOT NULL, -- 'ambulance', 'bed'
    status TEXT DEFAULT 'in_progress',
    patient_location GEOGRAPHY(POINT),
    display_id TEXT UNIQUE,
    request_id TEXT UNIQUE, -- Legacy compatibility (maps to display_id)
    responder_name TEXT,
    responder_phone TEXT,
    responder_vehicle_type TEXT,
    responder_vehicle_plate TEXT,
    estimated_arrival TEXT,
    total_cost NUMERIC,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VISITS (History)
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    hospital_id UUID REFERENCES public.hospitals(id),
    request_id UUID REFERENCES public.emergency_requests(id),
    display_id TEXT UNIQUE,
    status TEXT DEFAULT 'completed',
    cost TEXT,
    specialty TEXT,
    hospital_name TEXT,
    doctor TEXT,
    date TEXT,
    time TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    title TEXT,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    type TEXT, -- 'emergency', 'system', 'info'
    action_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TRIGGER ATTACHMENTS

-- Handle Display IDs
CREATE TRIGGER tr_profiles_display_id BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();
CREATE TRIGGER tr_hospitals_display_id BEFORE INSERT ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();
CREATE TRIGGER tr_organizations_display_id BEFORE INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();
CREATE TRIGGER tr_ambulances_display_id BEFORE INSERT ON public.ambulances FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();
CREATE TRIGGER tr_emergency_requests_display_id BEFORE INSERT ON public.emergency_requests FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();
CREATE TRIGGER tr_visits_display_id BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();

-- Handle Updated At
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_ambulances_updated_at BEFORE UPDATE ON public.ambulances FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_emergency_requests_updated_at BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. AUTO-ASSIGNMENT LOGIC (Living Baseline Integration)

CREATE OR REPLACE FUNCTION public.auto_assign_driver()
RETURNS TRIGGER AS $$
DECLARE
    v_ambulance_id UUID;
    v_driver_profile_id UUID;
    v_driver_name TEXT;
    v_driver_phone TEXT;
    v_ambulance_type TEXT;
    v_vehicle_number TEXT;
    v_wait_minutes INTEGER;
BEGIN
    -- Recursion Guard
    IF NEW.ambulance_id IS NOT NULL AND NEW.responder_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.service_type != 'ambulance' OR NEW.status NOT IN ('in_progress', 'accepted') THEN
        RETURN NEW;
    END IF;

    -- Find nearest available ambulance
    SELECT a.id, COALESCE(a.profile_id, a.driver_id), p.full_name, p.phone, a.type, a.vehicle_number
    INTO v_ambulance_id, v_driver_profile_id, v_driver_name, v_driver_phone, v_ambulance_type, v_vehicle_number
    FROM public.ambulances a
    LEFT JOIN public.profiles p ON p.id = a.profile_id
    WHERE a.status = 'available' AND a.hospital_id = NEW.hospital_id 
    ORDER BY a.created_at ASC LIMIT 1;

    IF v_ambulance_id IS NOT NULL THEN
        -- Update Request
        NEW.ambulance_id := v_ambulance_id;
        NEW.responder_id := v_driver_profile_id;
        NEW.responder_name := v_driver_name;
        NEW.responder_phone := v_driver_phone;
        NEW.responder_vehicle_type := v_ambulance_type;
        NEW.responder_vehicle_plate := v_vehicle_number;
        
        -- Update Ambulance
        UPDATE public.ambulances SET status = 'on_trip', current_call = NEW.display_id WHERE id = v_ambulance_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emergency_request_auto_assign
    BEFORE INSERT ON public.emergency_requests
    FOR EACH ROW EXECUTE FUNCTION public.auto_assign_driver();

-- 8. ADMIN RPCS

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN JSONB_BUILD_OBJECT(
        'users', (SELECT COUNT(*) FROM public.profiles),
        'requests', (SELECT COUNT(*) FROM public.emergency_requests),
        'hospitals', (SELECT COUNT(*) FROM public.hospitals),
        'ambulances', (SELECT COUNT(*) FROM public.ambulances)
    );
END;
$$;

-- 9. RLS POLICIES (Example)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- NOTIFY Schema Reload
NOTIFY pgrst, 'reload schema';
