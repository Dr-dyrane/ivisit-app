-- Migration: Enhanced Notification Lifecycle for Emergency Requests
-- Purpose: 
-- 1. Automate Patient notifications on Payment Approval/Decline
-- 2. Automate Patient notifications on Request Acceptance/Completion
-- 3. Automate Org Admin notifications on New Requests
-- 4. Unify logic into a single robust trigger

-- 1. Centralized Notification Function
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
        v_message := 'A new emergency request has been initiated at ' || COALESCE(NEW.patient_location, 'Unknown Location') || '.';
        v_priority := 'high';

        -- Notify ALL Administrators (Org Admins & Platform Admins)
        FOR v_admin_id IN 
            SELECT id FROM public.profiles 
            WHERE (
                organization_id = v_org_id  -- Linked to parent org
                OR organization_id::text = NEW.hospital_id::text -- Direct link (legacy)
                OR role = 'admin' -- Platform admins
            )
            AND role IN ('org_admin', 'admin')
            AND id != NEW.user_id -- Don't notify the requester if they are an admin
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

        -- 2. EMERGENCY ACCEPTED (User Notification)
        IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'assigned')) THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'emergency', '🚑 Help is On The Way', 
                COALESCE(v_hospital_name, 'The hospital') || ' has accepted your request. View details for live tracking.', 
                'high', NEW.id, jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
            );
        END IF;

        -- 3. EMERGENCY COMPLETED (User Notification)
        IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed') THEN
             INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'emergency', '🏁 Service Completed', 
                'Your emergency request has been successfully closed. Thank you for choosing iVisit.', 
                'normal', NEW.id, jsonb_build_object('request_id', NEW.id)
            );
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. REBIND TRIGGER
DROP TRIGGER IF EXISTS on_emergency_request_created ON public.emergency_requests;
DROP TRIGGER IF EXISTS on_emergency_request_activity ON public.emergency_requests;

CREATE TRIGGER on_emergency_request_activity
    AFTER INSERT OR UPDATE ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_emergency_events();

NOTIFY pgrst, 'reload schema';
