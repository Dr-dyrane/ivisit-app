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


-- 1B. Organization Wallet Auto-Creation
-- When a new org is created, automatically create its wallet.
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.organization_wallets (organization_id, balance, currency)
    VALUES (NEW.id, 0.00, 'USD')
    ON CONFLICT (organization_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_org_created ON public.organizations;
CREATE TRIGGER on_org_created
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_organization();


-- 2. Logistics & Operations Synchronization
-- Sync Emergency -> Visit on Completion
CREATE OR REPLACE FUNCTION public.sync_emergency_to_visit()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'completed') AND (OLD.status != 'completed') THEN
        UPDATE public.visits 
        SET status = 'completed',
            cost = NEW.total_cost::TEXT,
            updated_at = NOW()
        WHERE request_id = NEW.id;
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
    v_should_attempt BOOLEAN := FALSE;
BEGIN
    IF NEW.service_type != 'ambulance' OR NEW.responder_id IS NOT NULL OR NEW.ambulance_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_should_attempt := NEW.status IN ('in_progress', 'accepted');
    ELSIF TG_OP = 'UPDATE' THEN
        v_should_attempt := NEW.status IN ('in_progress', 'accepted')
            AND OLD.status IS DISTINCT FROM NEW.status;
    END IF;

    IF v_should_attempt THEN
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
                status = 'accepted',
                updated_at = NOW()
            WHERE id = NEW.id
              AND responder_id IS NULL
              AND ambulance_id IS NULL;

            UPDATE public.ambulances
            SET status = 'on_trip',
                current_call = NEW.id,
                updated_at = NOW()
            WHERE id = v_amb_id;
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
DECLARE
    v_current_amb_status TEXT;
BEGIN
    -- Handle Ambulance Status transitions
    IF (NEW.ambulance_id IS NOT NULL) THEN
        -- Get current ambulance status to validate transition
        SELECT status INTO v_current_amb_status
        FROM public.ambulances 
        WHERE id = NEW.ambulance_id;
        
        IF (NEW.status IN ('accepted', 'arrived', 'in_progress')) THEN
            -- Only set on_trip if ambulance is in a transitional state (not already on_trip)
            IF v_current_amb_status IN ('available', 'dispatched', 'en_route', 'on_scene') THEN
                UPDATE public.ambulances SET status = 'on_trip', updated_at = NOW() WHERE id = NEW.ambulance_id;
            END IF;
        ELSIF (NEW.status IN ('completed', 'cancelled', 'payment_declined')) THEN
            -- Return ambulance to available pool
            IF v_current_amb_status NOT IN ('available', 'offline', 'maintenance') THEN
                UPDATE public.ambulances 
                SET status = 'available', current_call = NULL, updated_at = NOW() 
                WHERE id = NEW.ambulance_id;
            END IF;
        END IF;
    END IF;

    -- Handle Bed Availability (only on UPDATE — OLD is available)
    IF TG_OP = 'UPDATE' AND (NEW.service_type = 'bed') THEN
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
AFTER INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.update_resource_availability();

-- 4. Auto-Assign Doctor on Emergency Acceptance (Recovered from Legacy)
CREATE OR REPLACE FUNCTION public.auto_assign_doctor()
RETURNS TRIGGER AS $$
DECLARE
    v_doctor_id UUID;
    v_specialty TEXT;
BEGIN
    IF NEW.status IN ('accepted', 'in_progress') AND OLD.status NOT IN ('accepted', 'in_progress') THEN
        v_specialty := CASE NEW.service_type
            WHEN 'ambulance' THEN 'Emergency Medicine'
            WHEN 'bed' THEN 'Internal Medicine'
            ELSE 'Emergency Medicine'
        END;

        SELECT d.id INTO v_doctor_id
        FROM public.doctors d
        LEFT JOIN public.emergency_doctor_assignments eda
            ON d.id = eda.doctor_id AND eda.status NOT IN ('completed', 'cancelled')
        WHERE d.hospital_id = NEW.hospital_id
          AND d.specialization = v_specialty
          AND d.is_available = true
          AND d.current_patients < d.max_patients
          AND eda.id IS NULL
        ORDER BY d.current_patients ASC, d.created_at ASC
        LIMIT 1;

        IF v_doctor_id IS NOT NULL THEN
            INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status)
            VALUES (NEW.id, v_doctor_id, 'assigned');

            UPDATE public.doctors
            SET current_patients = current_patients + 1, updated_at = NOW()
            WHERE id = v_doctor_id;

            UPDATE public.emergency_requests
            SET assigned_doctor_id = v_doctor_id, doctor_assigned_at = NOW()
            WHERE id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_auto_assign_doctor ON public.emergency_requests;
CREATE TRIGGER on_emergency_auto_assign_doctor
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.auto_assign_doctor();

-- 5. Release Doctor on Emergency Completion/Cancellation (Recovered from Legacy)
CREATE OR REPLACE FUNCTION public.release_doctor_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status NOT IN ('completed', 'cancelled') AND NEW.status IN ('completed', 'cancelled') THEN
        UPDATE public.emergency_doctor_assignments
        SET status = CASE WHEN NEW.status = 'completed' THEN 'completed' ELSE 'cancelled' END,
            updated_at = NOW()
        WHERE emergency_request_id = NEW.id AND status = 'assigned';

        UPDATE public.doctors
        SET current_patients = GREATEST(0, current_patients - 1), updated_at = NOW()
        WHERE id = (
            SELECT doctor_id FROM public.emergency_doctor_assignments
            WHERE emergency_request_id = NEW.id
            ORDER BY assigned_at DESC LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_release_doctor ON public.emergency_requests;
CREATE TRIGGER on_emergency_release_doctor
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.release_doctor_assignment();

-- 6. Auto-Create Insurance Billing on Completion (Recovered from Legacy)
CREATE OR REPLACE FUNCTION public.create_insurance_billing_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_policy RECORD;
    v_total NUMERIC;
    v_insurance_amount NUMERIC;
    v_user_amount NUMERIC;
BEGIN
    IF OLD.status NOT IN ('completed') AND NEW.status = 'completed' THEN
        SELECT * INTO v_policy
        FROM public.insurance_policies
        WHERE user_id = NEW.user_id AND is_default = true AND status = 'active'
        LIMIT 1;

        v_total := COALESCE(NEW.total_cost, CASE
            WHEN NEW.service_type = 'ambulance' THEN 150.00
            WHEN NEW.service_type = 'bed' THEN 200.00
            ELSE 100.00
        END);

        IF v_policy.id IS NOT NULL THEN
            v_insurance_amount := (v_total * COALESCE(v_policy.coverage_percentage, 80)) / 100;
            v_user_amount := v_total - v_insurance_amount;
        ELSE
            v_insurance_amount := 0;
            v_user_amount := v_total;
        END IF;

        INSERT INTO public.insurance_billing (
            emergency_request_id, hospital_id, user_id, insurance_policy_id,
            total_amount, insurance_amount, user_amount,
            coverage_percentage, billing_date, status
        ) VALUES (
            NEW.id, NEW.hospital_id, NEW.user_id, v_policy.id,
            v_total, v_insurance_amount, v_user_amount,
            COALESCE(v_policy.coverage_percentage, 0), CURRENT_DATE, 'pending'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_create_billing ON public.emergency_requests;
CREATE TRIGGER on_emergency_create_billing
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.create_insurance_billing_on_completion();
