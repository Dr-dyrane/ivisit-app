-- 🏯 Module 09: System Automations & Cross-Table Hooks
-- Centralized Logic for Multi-Module Synchronization

-- 1. Global User Initialization (After Profile, Preferences, Medical, and Wallet Tables exist)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_avatar TEXT;
BEGIN
    -- Extract Avatar from various possible metadata fields (Google, GitHub, custom)
    v_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'avatar'
    );

    -- A. Create Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        phone, 
        full_name, 
        avatar_url, 
        image_uri,
        role,
        onboarding_status
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        v_avatar,
        v_avatar, -- Sync image_uri with avatar_url for mobile parity
        COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
        'pending'
    );
    
    -- B. Create associated records (Intelligence Layer)
    INSERT INTO public.preferences (user_id) VALUES (NEW.id);
    INSERT INTO public.medical_profiles (user_id) VALUES (NEW.id);
    
    -- C. Initialize Patient Wallet (Fluid Finance)
    INSERT INTO public.patient_wallets (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hook into auth.users (Supabase Managed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Logistics & Operations Synchronization
-- Sync Emergency -> Visit on Completion
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

DROP TRIGGER IF EXISTS on_emergency_completed ON public.emergency_requests;
CREATE TRIGGER on_emergency_completed
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.sync_emergency_to_visit();

-- Auto-Assign Driver (MVP)
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

DROP TRIGGER IF EXISTS on_emergency_start_dispatch ON public.emergency_requests;
CREATE TRIGGER on_emergency_start_dispatch
AFTER INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.auto_assign_driver();

-- Update Resource Availability
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

DROP TRIGGER IF EXISTS on_emergency_status_resource_sync ON public.emergency_requests;
CREATE TRIGGER on_emergency_status_resource_sync
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.update_resource_availability();
