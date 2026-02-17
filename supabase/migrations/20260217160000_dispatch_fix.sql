-- ============================================================================
-- Migration: Dispatch Fix — Auto-Assignment, Visit Enrichment, Notifications
-- Date: 2026-02-17
-- Backup: supabase/backups/pre_dispatch_fix_20260217/
-- ============================================================================
-- FIXES:
-- 1. auto_assign_driver: Uses COALESCE(profile_id, driver_id), removes
--    provider_type filter, fires on INSERT+UPDATE with status guard
-- 2. Visit sync: Enriches visit with hospital cost/address/phone/image
-- 3. Notification: Uses hospital_name instead of patient_location (geography)
-- 4. ETA: Populates estimated_arrival from hospital.emergency_wait_time_minutes
-- 5. Distance floor: Prevents division by zero in wait time math
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX AUTO-ASSIGN DRIVER
-- ============================================================================
-- Problems fixed:
-- A. JOIN used profile_id but data uses driver_id → COALESCE both
-- B. provider_type = 'ambulance' filter too strict → removed
-- C. Fires on INSERT only → now INSERT + UPDATE
-- D. No status guard → only assigns when status IN ('in_progress','accepted')

CREATE OR REPLACE FUNCTION public.auto_assign_driver()
RETURNS TRIGGER AS $$
DECLARE
    v_ambulance_id TEXT;
    v_driver_profile_id UUID;
    v_driver_name TEXT;
    v_driver_phone TEXT;
    v_ambulance_type TEXT;
    v_vehicle_number TEXT;
    v_hospital_wait_minutes INTEGER;
    v_eta_text TEXT;
BEGIN
    -- Guard: Only assign ambulance requests that are ready for dispatch
    IF NEW.service_type != 'ambulance' THEN
        RETURN NEW;
    END IF;

    -- Guard: Only assign when status is actionable (not pending_approval)
    IF NEW.status NOT IN ('in_progress', 'accepted') THEN
        RETURN NEW;
    END IF;

    -- Guard: Already assigned
    IF NEW.ambulance_id IS NOT NULL AND NEW.responder_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Find available ambulance at this hospital
    -- Uses COALESCE(profile_id, driver_id) to handle both column conventions
    SELECT
        a.id,
        COALESCE(a.profile_id, a.driver_id),
        p.full_name,
        p.phone,
        a.type,
        a.vehicle_number
    INTO
        v_ambulance_id,
        v_driver_profile_id,
        v_driver_name,
        v_driver_phone,
        v_ambulance_type,
        v_vehicle_number
    FROM public.ambulances a
    LEFT JOIN public.profiles p ON p.id = COALESCE(a.profile_id, a.driver_id)
    WHERE a.status = 'available'
      AND a.hospital_id::text = NEW.hospital_id::text
    ORDER BY a.created_at ASC
    LIMIT 1;

    -- If no ambulance found, exit silently (console manual dispatch remains available)
    IF v_ambulance_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get hospital wait time for ETA
    SELECT COALESCE(h.emergency_wait_time_minutes, 10)
    INTO v_hospital_wait_minutes
    FROM public.hospitals h
    WHERE h.id::text = NEW.hospital_id::text;

    -- Ensure minimum wait time (prevents 0-minute ETA edge case)
    IF v_hospital_wait_minutes IS NULL OR v_hospital_wait_minutes < 1 THEN
        v_hospital_wait_minutes := 5;
    END IF;

    v_eta_text := v_hospital_wait_minutes || ' mins';

    -- Update the emergency request with responder details
    UPDATE public.emergency_requests
    SET
        ambulance_id = v_ambulance_id,
        responder_id = v_driver_profile_id,
        responder_name = COALESCE(v_driver_name, 'Emergency Responder'),
        responder_phone = v_driver_phone,
        responder_vehicle_type = COALESCE(v_ambulance_type, 'Basic'),
        responder_vehicle_plate = v_vehicle_number,
        estimated_arrival = v_eta_text
    WHERE id = NEW.id;

    -- Mark ambulance as on_trip
    UPDATE public.ambulances
    SET status = 'on_trip', current_call = NEW.id::text
    WHERE id = v_ambulance_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind trigger: fires on both INSERT and UPDATE
DROP TRIGGER IF EXISTS on_emergency_request_auto_assign_driver ON public.emergency_requests;
CREATE TRIGGER on_emergency_request_auto_assign_driver
    AFTER INSERT OR UPDATE ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_driver();

-- ============================================================================
-- 2. VISIT ENRICHMENT TRIGGER
-- ============================================================================
-- When emergency_requests update, sync key fields to the linked visit record
-- Enriches with hospital metadata (address, phone, image, cost)

CREATE OR REPLACE FUNCTION public.sync_emergency_to_visit()
RETURNS TRIGGER AS $$
DECLARE
    v_hospital_address TEXT;
    v_hospital_phone TEXT;
    v_hospital_image TEXT;
BEGIN
    -- Only sync if there's a meaningful change
    IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status 
        AND OLD.ambulance_id IS NOT DISTINCT FROM NEW.ambulance_id
        AND OLD.responder_name IS NOT DISTINCT FROM NEW.responder_name
        AND OLD.estimated_arrival IS NOT DISTINCT FROM NEW.estimated_arrival
        AND OLD.total_cost IS NOT DISTINCT FROM NEW.total_cost) THEN
        RETURN NEW;
    END IF;

    -- Fetch hospital metadata for enrichment
    SELECT 
        COALESCE(h.google_address, h.address),
        COALESCE(h.google_phone, h.phone),
        h.image
    INTO v_hospital_address, v_hospital_phone, v_hospital_image
    FROM public.hospitals h
    WHERE h.id::text = NEW.hospital_id::text;

    -- Update the visit record (shares same ID as emergency request)
    UPDATE public.visits
    SET
        status = CASE NEW.status
            WHEN 'pending_approval' THEN 'pending'
            WHEN 'payment_declined' THEN 'cancelled'
            WHEN 'in_progress' THEN 'upcoming'
            WHEN 'accepted' THEN 'upcoming'
            WHEN 'arrived' THEN 'in-progress'
            WHEN 'completed' THEN 'completed'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE COALESCE(visits.status, 'upcoming')
        END,
        cost = COALESCE(NEW.total_cost::text, visits.cost),
        address = COALESCE(v_hospital_address, visits.address),
        phone = COALESCE(v_hospital_phone, visits.phone),
        image = COALESCE(v_hospital_image, visits.image),
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_sync_visit ON public.emergency_requests;
CREATE TRIGGER on_emergency_sync_visit
    AFTER INSERT OR UPDATE ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_emergency_to_visit();

-- ============================================================================
-- 3. FIX NOTIFICATION MESSAGE (patient_location is GEOGRAPHY, not TEXT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_emergency_events()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_hospital_name TEXT;
    v_admin_id UUID;
    v_notification_type TEXT;
    v_title TEXT;
    v_message TEXT;
    v_priority TEXT := 'normal';
BEGIN
    -- A. RESOLVE CONTEXT (Hospital & Organization)
    SELECT h.organization_id, h.name INTO v_org_id, v_hospital_name
    FROM public.hospitals h
    WHERE h.id::text = NEW.hospital_id::text;

    -- B. NEW REQUEST CREATED (INSERT)
    IF (TG_OP = 'INSERT') THEN
        v_notification_type := 'emergency';
        v_title := '🚨 New ' || initcap(NEW.service_type) || ' Request';
        -- FIX: Use hospital_name instead of patient_location (which is GEOGRAPHY)
        v_message := 'A new emergency request has been initiated at ' 
                     || COALESCE(v_hospital_name, 'an iVisit partner hospital') || '.';
        v_priority := 'high';

        -- Notify ALL Administrators (Org Admins & Platform Admins)
        FOR v_admin_id IN 
            SELECT id FROM public.profiles 
            WHERE (
                organization_id = v_org_id
                OR organization_id::text = NEW.hospital_id::text
                OR role = 'admin'
            )
            AND role IN ('org_admin', 'admin')
            AND id != NEW.user_id
        LOOP
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                v_admin_id, v_notification_type, v_title, v_message, v_priority, 
                NEW.id, jsonb_build_object('request_id', NEW.id, 'service_type', NEW.service_type)
            );
        END LOOP;

    -- C. STATUS OR PAYMENT UPDATES (UPDATE)
    ELSIF (TG_OP = 'UPDATE') THEN
        
        -- 1. PAYMENT APPROVAL (User Notification)
        IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed') THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'payment', '✅ Payment Approved', 
                'Your cash payment for ' || COALESCE(v_hospital_name, 'the hospital') || ' has been confirmed. Help is prioritized.', 
                'high', NEW.id, jsonb_build_object('request_id', NEW.id)
            );
        END IF;

        -- 2. PAYMENT DECLINED (User Notification)
        IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'declined') THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'payment', '❌ Payment Declined', 
                'Your cash payment for ' || COALESCE(v_hospital_name, 'the hospital') || ' was declined. Please try a different payment method.', 
                'high', NEW.id, jsonb_build_object('request_id', NEW.id)
            );
        END IF;

        -- 3. EMERGENCY ACCEPTED — Responder assigned (User Notification)
        IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'assigned')) THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'emergency', '🚑 Help is On The Way', 
                COALESCE(v_hospital_name, 'The hospital') || ' has accepted your request. View details for live tracking.', 
                'high', NEW.id, jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
            );
        END IF;

        -- 4. EMERGENCY COMPLETED (User Notification)
        IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed') THEN
             INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'emergency', '🏁 Service Completed', 
                'Your emergency request has been successfully closed. Thank you for choosing iVisit.', 
                'normal', NEW.id, jsonb_build_object('request_id', NEW.id)
            );
        END IF;

        -- 5. RESPONDER ASSIGNED — Notify driver/provider
        IF (OLD.responder_id IS DISTINCT FROM NEW.responder_id AND NEW.responder_id IS NOT NULL) THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.responder_id, 'emergency', '🚨 New Mission Assigned', 
                'You have been dispatched to ' || COALESCE(v_hospital_name, 'a location') || '. Check details now.', 
                'high', NEW.id, jsonb_build_object('request_id', NEW.id, 'service_type', NEW.service_type)
            );
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already bound from previous migration (on_emergency_request_activity)
-- Re-bind to be safe
DROP TRIGGER IF EXISTS on_emergency_request_activity ON public.emergency_requests;
CREATE TRIGGER on_emergency_request_activity
    AFTER INSERT OR UPDATE ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_emergency_events();

-- ============================================================================
-- 4. ENSURE driver_id COLUMN EXISTS ON AMBULANCES
-- ============================================================================
-- Some ambulances have data in driver_id but the column may not be in schema
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ambulances' 
        AND column_name = 'driver_id'
    ) THEN
        ALTER TABLE public.ambulances ADD COLUMN driver_id UUID;
    END IF;
END $$;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.auto_assign_driver() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_emergency_to_visit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_emergency_events() TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
