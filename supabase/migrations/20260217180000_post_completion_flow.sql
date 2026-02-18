-- ==========================================================================
-- POST-COMPLETION FLOW FIX — 2026-02-17
-- ==========================================================================
-- Fixes:
--   1. Auto-release ambulance back to 'available' on completion/cancellation
--   2. Enhance sync_emergency_to_visit to handle arrival notifications
--   3. Add org_admin/admin RLS policies on visits table
--   4. Cleanup: prevent duplicate visits by syncing both UUID and display-ID
-- ==========================================================================
BEGIN;

-- ============================================================================
-- 1. AMBULANCE RELEASE TRIGGER
-- ============================================================================
-- When an emergency request is completed or cancelled, release the ambulance
-- back to 'available' status and clear its current_call.

CREATE OR REPLACE FUNCTION public.release_ambulance_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire on status change to terminal states
    IF (TG_OP = 'UPDATE' 
        AND OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status IN ('completed', 'cancelled')
        AND NEW.ambulance_id IS NOT NULL) THEN
        
        UPDATE public.ambulances
        SET 
            status = 'available',
            current_call = NULL,
            updated_at = NOW()
        WHERE id = NEW.ambulance_id
          AND status = 'on_trip';
        
        RAISE NOTICE '[release_ambulance] Ambulance % released back to available (emergency % → %)',
            NEW.ambulance_id, NEW.id, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_release_ambulance ON public.emergency_requests;
CREATE TRIGGER on_emergency_release_ambulance
    AFTER UPDATE ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.release_ambulance_on_completion();

-- ============================================================================
-- 2. ENHANCED VISIT SYNC — Handle display-ID visits too
-- ============================================================================
-- The frontend sometimes creates visits with UUID as `request_id`, and
-- the original trigger only updates visits WHERE id = NEW.id (the UUID).
-- This enhanced version also syncs any visit with request_id matching
-- the display ID, and prevents orphan rows.

CREATE OR REPLACE FUNCTION public.sync_emergency_to_visit()
RETURNS TRIGGER AS $$
DECLARE
    v_hospital_address TEXT;
    v_hospital_phone TEXT;
    v_hospital_image TEXT;
    v_visit_status TEXT;
    v_matched_count INT;
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

    -- Map emergency status → visit status
    v_visit_status := CASE NEW.status
        WHEN 'pending_approval' THEN 'pending'
        WHEN 'payment_declined' THEN 'cancelled'
        WHEN 'in_progress' THEN 'upcoming'
        WHEN 'accepted' THEN 'upcoming'
        WHEN 'arrived' THEN 'in-progress'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'upcoming'
    END;

    -- A. Update the canonical visit (shares UUID with emergency request)
    UPDATE public.visits
    SET
        status = v_visit_status,
        cost = COALESCE(NEW.total_cost::text, visits.cost),
        address = COALESCE(v_hospital_address, visits.address),
        phone = COALESCE(v_hospital_phone, visits.phone),
        image = COALESCE(v_hospital_image, visits.image),
        doctor = COALESCE(NEW.responder_name, visits.doctor),
        updated_at = NOW()
    WHERE id = NEW.id::text;
    
    GET DIAGNOSTICS v_matched_count = ROW_COUNT;

    -- B. Also update any visits linked by display ID (request_id column)
    --    This catches visits created by the frontend with display IDs
    IF NEW.request_id IS NOT NULL THEN
        UPDATE public.visits
        SET
            status = v_visit_status,
            cost = COALESCE(NEW.total_cost::text, visits.cost),
            address = COALESCE(v_hospital_address, visits.address),
            phone = COALESCE(v_hospital_phone, visits.phone),
            image = COALESCE(v_hospital_image, visits.image),
            doctor = COALESCE(NEW.responder_name, visits.doctor),
            updated_at = NOW()
        WHERE request_id = NEW.request_id
          AND id != NEW.id::text;  -- Don't double-update the canonical one
    END IF;

    -- C. Also catch visits where request_id = the emergency UUID
    --    (frontend sometimes stores the UUID as request_id)
    UPDATE public.visits
    SET
        status = v_visit_status,
        cost = COALESCE(NEW.total_cost::text, visits.cost),
        address = COALESCE(v_hospital_address, visits.address),
        phone = COALESCE(v_hospital_phone, visits.phone),
        image = COALESCE(v_hospital_image, visits.image),
        doctor = COALESCE(NEW.responder_name, visits.doctor),
        updated_at = NOW()
    WHERE request_id = NEW.id::text
      AND id != NEW.id::text;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind
DROP TRIGGER IF EXISTS on_emergency_sync_visit ON public.emergency_requests;
CREATE TRIGGER on_emergency_sync_visit
    AFTER INSERT OR UPDATE ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_emergency_to_visit();

-- ============================================================================
-- 3. ENHANCED NOTIFICATIONS — Add Arrived + Cash Approval Required
-- ============================================================================
-- Notifications were mostly working but missing:
--   - "Ambulance Arrived" notification to admins
--   - "Cash Payment Approval Required" type for admin panel

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
        v_title := '🚨 New ' || initcap(COALESCE(NEW.service_type, 'Emergency')) || ' Request';
        v_message := 'A patient has requested a '
                     || initcap(COALESCE(NEW.service_type, 'service'))
                     || ' (' || COALESCE(NEW.request_id, 'N/A') || ') at '
                     || COALESCE(v_hospital_name, 'an iVisit partner hospital') || '.';
        v_priority := 'high';

        -- Check if this is a cash payment requiring approval
        IF (NEW.payment_status = 'pending' OR NEW.status = 'pending_approval') THEN
            v_title := 'Cash Payment Approval Required';
            v_message := v_message || ' This is a cash payment'
                         || CASE WHEN NEW.total_cost IS NOT NULL 
                                 THEN ', cash payment of $' || ROUND(NEW.total_cost::numeric, 2)::text
                                 ELSE '' END
                         || '. Please review and approve or decline.'
                         || E'\n\nSteps:\n1. Open emergency requests.\n2. Find request '
                         || COALESCE(NEW.request_id, NEW.id::text)
                         || E'.\n3. Review details.\n4. Tap to approve or decline.';
            v_priority := 'urgent';
        END IF;

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
                NEW.id, jsonb_build_object(
                    'request_id', NEW.id,
                    'display_id', COALESCE(NEW.request_id, ''),
                    'service_type', COALESCE(NEW.service_type, ''),
                    'requires_approval', (NEW.status = 'pending_approval')
                )
            );
        END LOOP;

    -- C. STATUS OR PAYMENT UPDATES (UPDATE)
    ELSIF (TG_OP = 'UPDATE') THEN
        
        -- 1. PAYMENT APPROVAL → User, update status
        IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed') THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'payment', '✅ Payment Approved', 
                'Your cash payment for ' || COALESCE(v_hospital_name, 'the hospital') || ' has been confirmed. Help is prioritized.', 
                'high', NEW.id, jsonb_build_object('request_id', NEW.id)
            );
        END IF;

        -- 2. PAYMENT DECLINED → User
        IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'declined') THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'payment', '❌ Payment Declined', 
                'Your cash payment for ' || COALESCE(v_hospital_name, 'the hospital') || ' was declined. Please try a different payment method.', 
                'high', NEW.id, jsonb_build_object('request_id', NEW.id)
            );
        END IF;

        -- 3. EMERGENCY IN PROGRESS / ACCEPTED → User
        IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('in_progress', 'accepted', 'assigned')) THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'emergency', '🚑 Help is On The Way', 
                COALESCE(v_hospital_name, 'The hospital') || ' has accepted your request. '
                || CASE WHEN NEW.responder_name IS NOT NULL 
                        THEN NEW.responder_name || ' is en route.' 
                        ELSE 'View details for live tracking.' END,
                'high', NEW.id, jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
            );
        END IF;

        -- 4. AMBULANCE ARRIVED → User + Admin
        IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'arrived') THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'emergency', 'Ambulance Arrived', 
                COALESCE(NEW.responder_name, 'Your responder') || ' has arrived at your location.',
                'high', NEW.id, jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
            );
            -- Also notify admins
            FOR v_admin_id IN
                SELECT id FROM public.profiles
                WHERE (organization_id = v_org_id OR role = 'admin')
                AND role IN ('org_admin', 'admin')
                AND id != NEW.user_id
            LOOP
                INSERT INTO public.notifications (
                    user_id, type, title, message, priority, target_id, metadata
                ) VALUES (
                    v_admin_id, 'emergency', '📍 Responder Arrived',
                    COALESCE(NEW.responder_name, 'Responder') || ' has arrived for request '
                    || COALESCE(NEW.request_id, NEW.id::text) || '.',
                    'normal', NEW.id, jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
                );
            END LOOP;
        END IF;

        -- 5. EMERGENCY COMPLETED → User
        IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed') THEN
             INSERT INTO public.notifications (
                user_id, type, title, message, priority, target_id, metadata
            ) VALUES (
                NEW.user_id, 'emergency', '🏁 Service Completed', 
                'Your emergency request has been successfully closed. Thank you for choosing iVisit.', 
                'normal', NEW.id, jsonb_build_object('request_id', NEW.id)
            );
        END IF;

        -- 6. RESPONDER ASSIGNED → Driver/Provider
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

-- Rebind
DROP TRIGGER IF EXISTS on_emergency_request_activity ON public.emergency_requests;
CREATE TRIGGER on_emergency_request_activity
    AFTER INSERT OR UPDATE ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_emergency_events();

-- ============================================================================
-- 4. VISITS RLS — Add org_admin and admin visibility
-- ============================================================================
-- org_admin should see visits for users in their organization's hospitals
-- admin should see all visits

-- Admin can view all visits
DROP POLICY IF EXISTS "Admins can view all visits" ON public.visits;
CREATE POLICY "Admins can view all visits"
ON public.visits
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Org admin can view visits linked to their hospital
-- NOTE: profiles.organization_id points to hospitals.id (both TEXT after flexible_ids migration)
-- The sync_emergency_to_visit trigger already populates visits.hospital_id,
-- so we can match directly without joining emergency_requests.
DROP POLICY IF EXISTS "Org admins can view org visits" ON public.visits;
CREATE POLICY "Org admins can view org visits"
ON public.visits
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND visits.hospital_id IS NOT NULL
        AND visits.hospital_id = p.organization_id
    )
);

-- Admin can update all visits (for status management)
DROP POLICY IF EXISTS "Admins can update all visits" ON public.visits;
CREATE POLICY "Admins can update all visits"
ON public.visits
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'org_admin')
    )
);

-- ============================================================================
-- 5. GRANTS & SCHEMA RELOAD
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.release_ambulance_on_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_emergency_to_visit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_emergency_events() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
