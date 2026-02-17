-- ============================================================================
-- One-time backfill: Activate current ongoing emergency request
-- Target: ec72b8c4-6bce-414b-b353-0eee10540369
-- Purpose: The auto_assign_driver trigger was deployed AFTER this request
--          was created. This migration "touches" the request so the trigger
--          fires and assigns the ambulance + responder + ETA.
-- ============================================================================

BEGIN;

-- Step 1: Approve cash payment if still pending
--         This moves status from 'pending_approval' → 'in_progress'
--         which is one of the statuses that auto_assign_driver responds to.
DO $$
DECLARE
    v_req_id UUID := 'ec72b8c4-6bce-414b-b353-0eee10540369'::uuid;
    v_current_status TEXT;
    v_payment_status TEXT;
    v_ambulance_id TEXT;
BEGIN
    -- Get current state
    SELECT status, payment_status, ambulance_id
    INTO v_current_status, v_payment_status, v_ambulance_id
    FROM public.emergency_requests
    WHERE id = v_req_id;

    -- Log current state
    RAISE NOTICE 'Current state: status=%, payment=%, ambulance=%',
        v_current_status, v_payment_status, v_ambulance_id;

    -- If no request found, exit
    IF v_current_status IS NULL THEN
        RAISE NOTICE 'Emergency request % not found, skipping backfill.', v_req_id;
        RETURN;
    END IF;

    -- Case 1: pending_approval → approve and move to in_progress
    IF v_current_status = 'pending_approval' THEN
        RAISE NOTICE 'Approving cash payment and moving to in_progress...';
        UPDATE public.emergency_requests
        SET
            status = 'in_progress',
            payment_status = 'completed',
            updated_at = NOW()
        WHERE id = v_req_id;

        -- Also update the payment record
        UPDATE public.payments
        SET
            status = 'completed',
            updated_at = NOW()
        WHERE emergency_request_id = v_req_id
          AND status != 'completed';

    -- Case 2: Already in_progress/accepted but no ambulance assigned
    ELSIF v_current_status IN ('in_progress', 'accepted') AND v_ambulance_id IS NULL THEN
        RAISE NOTICE 'Already in_progress but no ambulance - re-triggering assignment...';
        -- Touch the row to re-fire the trigger
        UPDATE public.emergency_requests
        SET updated_at = NOW()
        WHERE id = v_req_id;

    -- Case 3: Already has ambulance - just ensure visit is enriched
    ELSIF v_ambulance_id IS NOT NULL THEN
        RAISE NOTICE 'Ambulance already assigned (%), touching to enrich visit...', v_ambulance_id;
        UPDATE public.emergency_requests
        SET updated_at = NOW()
        WHERE id = v_req_id;

    -- Case 4: Any other status
    ELSE
        RAISE NOTICE 'Status is %. Moving to in_progress to trigger assignment.', v_current_status;
        UPDATE public.emergency_requests
        SET
            status = 'in_progress',
            updated_at = NOW()
        WHERE id = v_req_id;
    END IF;
END $$;

-- Step 2: Verify the result
DO $$
DECLARE
    v_status TEXT;
    v_ambulance TEXT;
    v_responder TEXT;
    v_responder_name TEXT;
    v_eta TEXT;
BEGIN
    SELECT status, ambulance_id, responder_id, responder_name, estimated_arrival
    INTO v_status, v_ambulance, v_responder, v_responder_name, v_eta
    FROM public.emergency_requests
    WHERE id = 'ec72b8c4-6bce-414b-b353-0eee10540369'::uuid;

    RAISE NOTICE '=== BACKFILL RESULT ===';
    RAISE NOTICE 'Status:         %', v_status;
    RAISE NOTICE 'Ambulance ID:   %', v_ambulance;
    RAISE NOTICE 'Responder ID:   %', v_responder;
    RAISE NOTICE 'Responder Name: %', v_responder_name;
    RAISE NOTICE 'ETA:            %', v_eta;
    RAISE NOTICE '======================';
END $$;

COMMIT;
