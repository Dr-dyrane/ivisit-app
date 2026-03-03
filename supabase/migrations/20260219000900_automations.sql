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

-- 1C. Doctor Registry Auto-Sync (Profile -> doctors)
-- When a profile becomes a provider doctor (or doctor profile details change), ensure a doctors row exists.
CREATE OR REPLACE FUNCTION public.sync_doctor_record_from_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_hospital_id UUID;
BEGIN
    IF NEW.role = 'provider' AND NEW.provider_type = 'doctor' THEN
        v_name := NULLIF(BTRIM(COALESCE(NEW.full_name, '')), '');
        IF v_name IS NULL THEN
            v_name := NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(NEW.first_name, ''), NULLIF(NEW.last_name, ''))), '');
        END IF;
        IF v_name IS NULL THEN
            v_name := COALESCE(NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''), 'Doctor');
        END IF;

        -- Preserve existing doctor.hospital_id if already set; otherwise infer from the provider's organization.
        SELECT d.hospital_id INTO v_hospital_id
        FROM public.doctors d
        WHERE d.profile_id = NEW.id;

        IF v_hospital_id IS NULL AND NEW.organization_id IS NOT NULL THEN
            SELECT h.id INTO v_hospital_id
            FROM public.hospitals h
            WHERE h.organization_id = NEW.organization_id
            ORDER BY h.created_at ASC, h.id ASC
            LIMIT 1;
        END IF;

        INSERT INTO public.doctors (
            profile_id,
            hospital_id,
            name,
            specialization,
            email,
            phone,
            status,
            is_available
        )
        VALUES (
            NEW.id,
            v_hospital_id,
            v_name,
            'General Medicine',
            NEW.email,
            NEW.phone,
            'invited',
            false
        )
        ON CONFLICT (profile_id) DO UPDATE
        SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            hospital_id = COALESCE(doctors.hospital_id, EXCLUDED.hospital_id),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_sync_doctor_record ON public.profiles;
CREATE TRIGGER on_profile_sync_doctor_record
AFTER INSERT OR UPDATE OF role, provider_type, organization_id, full_name, first_name, last_name, email, phone
ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.sync_doctor_record_from_profile();


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
        WHERE hospital_id = NEW.hospital_id
          AND status = 'available'
          AND profile_id IS NOT NULL
        LIMIT 1;

        IF v_amb_id IS NOT NULL THEN
            SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = v_driver_id;
            PERFORM set_config('ivisit.transition_source', 'automation:auto_assign_driver', true);
            PERFORM set_config('ivisit.transition_reason', 'auto_dispatch_assignment', true);
            PERFORM set_config('ivisit.transition_actor_role', 'automation', true);
            PERFORM set_config(
                'ivisit.transition_metadata',
                jsonb_build_object('ambulance_id', v_amb_id, 'driver_id', v_driver_id)::TEXT,
                true
            );
            
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
                eta = COALESCE(NEW.estimated_arrival, eta),
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
    IF TG_OP = 'UPDATE'
       AND OLD.ambulance_id IS NOT NULL
       AND OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id THEN
        UPDATE public.ambulances
        SET status = 'available',
            current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = OLD.ambulance_id
          AND (current_call = NEW.id OR current_call IS NULL);
    END IF;

    -- Handle Ambulance Status transitions
    IF (NEW.ambulance_id IS NOT NULL) THEN
        -- Get current ambulance status to validate transition
        SELECT status INTO v_current_amb_status
        FROM public.ambulances 
        WHERE id = NEW.ambulance_id;
        
        IF (NEW.status IN ('accepted', 'arrived', 'in_progress')) THEN
            -- Only set on_trip if ambulance is in a transitional state (not already on_trip)
            IF v_current_amb_status IN ('available', 'dispatched', 'en_route', 'on_scene') THEN
                UPDATE public.ambulances
                SET status = 'on_trip',
                    eta = COALESCE(NEW.estimated_arrival, eta),
                    updated_at = NOW()
                WHERE id = NEW.ambulance_id;
            END IF;
        ELSIF (NEW.status IN ('completed', 'cancelled', 'payment_declined')) THEN
            -- Return ambulance to available pool
            IF v_current_amb_status NOT IN ('available', 'offline', 'maintenance') THEN
                UPDATE public.ambulances 
                SET status = 'available', current_call = NULL, eta = NULL, updated_at = NOW() 
                WHERE id = NEW.ambulance_id;
            END IF;
        END IF;
    END IF;

    -- Handle Bed Availability (only on UPDATE — OLD is available)
    IF TG_OP = 'UPDATE' AND (NEW.service_type = 'bed') THEN
        IF NEW.status IN ('in_progress', 'accepted', 'arrived')
           AND OLD.status NOT IN ('in_progress', 'accepted', 'arrived') THEN
            UPDATE public.hospitals SET available_beds = GREATEST(0, available_beds - 1) WHERE id = NEW.hospital_id;
        ELSIF NEW.status IN ('completed', 'cancelled')
              AND OLD.status IN ('in_progress', 'accepted', 'arrived') THEN
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
    v_should_attempt BOOLEAN := FALSE;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_should_attempt := NEW.status IN ('accepted', 'in_progress')
            AND (
                OLD.status IS DISTINCT FROM NEW.status
                OR OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id
                OR OLD.responder_id IS DISTINCT FROM NEW.responder_id
                OR OLD.hospital_id IS DISTINCT FROM NEW.hospital_id
                OR OLD.assigned_doctor_id IS DISTINCT FROM NEW.assigned_doctor_id
            );
    END IF;

    IF NOT v_should_attempt OR NEW.hospital_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Idempotency guard: never assign twice for the same active request.
    IF NEW.assigned_doctor_id IS NOT NULL OR EXISTS (
        SELECT 1
        FROM public.emergency_doctor_assignments eda
        WHERE eda.emergency_request_id = NEW.id
          AND eda.status = 'assigned'
    ) THEN
        RETURN NEW;
    END IF;

    v_specialty := CASE NEW.service_type
        WHEN 'ambulance' THEN 'Emergency Medicine'
        WHEN 'bed' THEN 'Internal Medicine'
        ELSE 'Emergency Medicine'
    END;

    /*
      Selection logic:
      1) Prefer matching specialty where capacity is available.
      2) Fall back to any available in-hospital doctor with capacity.
      This keeps assignment resilient in low-coverage regions.
    */
    SELECT d.id INTO v_doctor_id
    FROM public.doctors d
    WHERE d.hospital_id = NEW.hospital_id
      AND COALESCE(d.status, 'available') = 'available'
      AND d.is_available = true
      AND COALESCE(d.current_patients, 0) < COALESCE(NULLIF(d.max_patients, 0), 1)
      AND (
            d.specialization = v_specialty
            OR NOT EXISTS (
                SELECT 1
                FROM public.doctors ds
                WHERE ds.hospital_id = NEW.hospital_id
                  AND ds.is_available = true
                  AND COALESCE(ds.current_patients, 0) < COALESCE(NULLIF(ds.max_patients, 0), 1)
                  AND ds.specialization = v_specialty
            )
      )
    ORDER BY
      CASE WHEN d.specialization = v_specialty THEN 0 ELSE 1 END,
      COALESCE(d.current_patients, 0) ASC,
      d.created_at ASC
    FOR UPDATE OF d SKIP LOCKED
    LIMIT 1;

    IF v_doctor_id IS NOT NULL THEN
        INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status)
        VALUES (NEW.id, v_doctor_id, 'assigned');

        UPDATE public.doctors
        SET current_patients = COALESCE(current_patients, 0) + 1,
            updated_at = NOW()
        WHERE id = v_doctor_id;

        UPDATE public.emergency_requests
        SET assigned_doctor_id = v_doctor_id,
            doctor_assigned_at = NOW()
        WHERE id = NEW.id;
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
DECLARE
    v_should_release BOOLEAN := FALSE;
    v_release_status TEXT := 'cancelled';
BEGIN
    IF OLD.status NOT IN ('completed', 'cancelled') AND NEW.status IN ('completed', 'cancelled') THEN
        v_should_release := TRUE;
        v_release_status := CASE WHEN NEW.status = 'completed' THEN 'completed' ELSE 'cancelled' END;
    ELSIF NEW.status IN ('in_progress', 'accepted', 'arrived')
          AND OLD.assigned_doctor_id IS NOT NULL
          AND (
              OLD.hospital_id IS DISTINCT FROM NEW.hospital_id
              OR OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id
              OR OLD.responder_id IS DISTINCT FROM NEW.responder_id
          ) THEN
        v_should_release := TRUE;
        v_release_status := 'cancelled';
    END IF;

    IF v_should_release THEN
        WITH released_assignments AS (
            UPDATE public.emergency_doctor_assignments
            SET status = v_release_status,
                updated_at = NOW()
            WHERE emergency_request_id = NEW.id
              AND status = 'assigned'
            RETURNING doctor_id
        ),
        released_counts AS (
            SELECT doctor_id, COUNT(*)::INTEGER AS release_count
            FROM released_assignments
            WHERE doctor_id IS NOT NULL
            GROUP BY doctor_id
        )
        UPDATE public.doctors d
        SET current_patients = GREATEST(0, COALESCE(d.current_patients, 0) - rc.release_count),
            updated_at = NOW()
        FROM released_counts rc
        WHERE d.id = rc.doctor_id;

        UPDATE public.emergency_requests
        SET assigned_doctor_id = NULL,
            doctor_assigned_at = NULL,
            updated_at = NOW()
        WHERE id = NEW.id
          AND assigned_doctor_id IS NOT NULL;
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

-- ================================================================
-- Integrated Fix Pack (2026-03-02): Automation Determinism + Realtime
-- Source: consolidated from temporary fix migrations
-- ================================================================

-- Harden auto assignment against race conditions.
CREATE OR REPLACE FUNCTION public.auto_assign_driver()
RETURNS TRIGGER AS $$
DECLARE
    v_amb_id UUID;
    v_driver_id UUID;
    v_driver_name TEXT;
    v_should_attempt BOOLEAN := FALSE;
BEGIN
    IF NEW.service_type != 'ambulance' OR NEW.hospital_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.responder_id IS NOT NULL OR NEW.ambulance_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_should_attempt := NEW.status IN ('in_progress', 'accepted');
    ELSIF TG_OP = 'UPDATE' THEN
        v_should_attempt := NEW.status IN ('in_progress', 'accepted')
            AND (
                OLD.status IS DISTINCT FROM NEW.status
                OR OLD.hospital_id IS DISTINCT FROM NEW.hospital_id
            );
    END IF;

    IF NOT v_should_attempt THEN
        RETURN NEW;
    END IF;

    WITH candidate AS (
        SELECT a.id, a.profile_id
        FROM public.ambulances a
        WHERE a.hospital_id = NEW.hospital_id
          AND a.status = 'available'
          AND a.profile_id IS NOT NULL
        ORDER BY a.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    ),
    claimed AS (
        UPDATE public.ambulances a
        SET status = 'on_trip',
            current_call = NEW.id,
            updated_at = NOW()
        FROM candidate c
        WHERE a.id = c.id
        RETURNING a.id, c.profile_id
    )
    SELECT id, profile_id INTO v_amb_id, v_driver_id FROM claimed;

    IF v_amb_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT full_name INTO v_driver_name
    FROM public.profiles
    WHERE id = v_driver_id;

    PERFORM set_config('ivisit.transition_source', 'automation:auto_assign_driver', true);
    PERFORM set_config('ivisit.transition_reason', 'auto_dispatch_assignment', true);
    PERFORM set_config('ivisit.transition_actor_role', 'automation', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object('ambulance_id', v_amb_id, 'driver_id', v_driver_id)::TEXT,
        true
    );

    UPDATE public.emergency_requests
    SET responder_id = v_driver_id,
        responder_name = v_driver_name,
        ambulance_id = v_amb_id,
        status = 'accepted',
        updated_at = NOW()
    WHERE id = NEW.id
      AND responder_id IS NULL
      AND ambulance_id IS NULL;

    IF NOT FOUND THEN
        UPDATE public.ambulances
        SET status = 'available',
            current_call = NULL,
            updated_at = NOW()
        WHERE id = v_amb_id
          AND current_call = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Resource sync must not depend on removed columns.
CREATE OR REPLACE FUNCTION public.update_resource_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_current_amb_status TEXT;
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.ambulance_id IS NOT NULL
       AND OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id THEN
        UPDATE public.ambulances
        SET status = 'available',
            current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = OLD.ambulance_id
          AND (current_call = NEW.id OR current_call IS NULL);
    END IF;

    IF NEW.ambulance_id IS NOT NULL THEN
        SELECT status INTO v_current_amb_status
        FROM public.ambulances
        WHERE id = NEW.ambulance_id;

        IF NEW.status IN ('accepted', 'arrived', 'in_progress') THEN
            IF v_current_amb_status IN ('available', 'dispatched', 'en_route', 'on_scene') THEN
                UPDATE public.ambulances
                SET status = 'on_trip',
                    current_call = NEW.id,
                    updated_at = NOW()
                WHERE id = NEW.ambulance_id;
            END IF;
        ELSIF NEW.status IN ('completed', 'cancelled', 'payment_declined') THEN
            IF v_current_amb_status NOT IN ('available', 'offline', 'maintenance') THEN
                UPDATE public.ambulances
                SET status = 'available',
                    current_call = NULL,
                    eta = NULL,
                    updated_at = NOW()
                WHERE id = NEW.ambulance_id;
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.service_type = 'bed' THEN
        IF NEW.status IN ('in_progress', 'accepted', 'arrived')
           AND OLD.status NOT IN ('in_progress', 'accepted', 'arrived') THEN
            UPDATE public.hospitals
            SET available_beds = GREATEST(0, available_beds - 1)
            WHERE id = NEW.hospital_id;
        ELSIF NEW.status IN ('completed', 'cancelled')
              AND OLD.status IN ('in_progress', 'accepted', 'arrived') THEN
            UPDATE public.hospitals
            SET available_beds = available_beds + 1
            WHERE id = NEW.hospital_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Realtime publication parity for live subscriptions.
DO $$
DECLARE
    v_table TEXT;
    v_targets TEXT[] := ARRAY[
        'ambulances',
        'doctors',
        'emergency_requests',
        'health_news',
        'hospitals',
        'insurance_policies',
        'notifications',
        'organizations',
        'payments',
        'profiles',
        'room_pricing',
        'service_pricing',
        'support_tickets',
        'user_activity',
        'visits'
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        RETURN;
    END IF;

    FOREACH v_table IN ARRAY v_targets LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = v_table
              AND c.relkind = 'r'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM pg_publication_rel pr
            JOIN pg_publication p ON p.oid = pr.prpubid
            JOIN pg_class c ON c.oid = pr.prrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE p.pubname = 'supabase_realtime'
              AND n.nspname = 'public'
              AND c.relname = v_table
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
        END IF;
    END LOOP;
END;
$$;


-- Remove duplicate display-id trigger variants only when both exist.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'notifications' AND t.tgname = 'stamp_ntf_display_id'
    )
    AND EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'notifications' AND t.tgname = 'stamp_notification_display_id'
    ) THEN
        DROP TRIGGER IF EXISTS stamp_ntf_display_id ON public.notifications;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'organization_wallets' AND t.tgname = 'stamp_organization_wallet_display_id'
    )
    AND EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'organization_wallets' AND t.tgname = 'stamp_org_wallet_display_id'
    ) THEN
        DROP TRIGGER IF EXISTS stamp_organization_wallet_display_id ON public.organization_wallets;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'patient_wallets' AND t.tgname = 'stamp_patient_wallet_display_id'
    )
    AND EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'patient_wallets' AND t.tgname = 'stamp_pat_wallet_display_id'
    ) THEN
        DROP TRIGGER IF EXISTS stamp_patient_wallet_display_id ON public.patient_wallets;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'payments' AND t.tgname = 'stamp_payment_display_id'
    )
    AND EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'payments' AND t.tgname = 'stamp_pay_display_id'
    ) THEN
        DROP TRIGGER IF EXISTS stamp_payment_display_id ON public.payments;
    END IF;
END;
$$;


-- Hot path indexes for emergency lifecycle reads.
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON public.emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_hospital_id ON public.emergency_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_created_at ON public.emergency_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ambulances_hospital_status ON public.ambulances(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_emergency_request_id ON public.payments(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_visits_request_id ON public.visits(request_id);
