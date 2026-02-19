-- Verification Script: Verify Emergency Payment Flow Functions & Schema
-- Run this script to confirm that the critical RPC functions and schema changes are live in the database.

BEGIN;

DO $$
DECLARE
    v_func_exists_check boolean;
    v_func_exists_process boolean;
    v_visits_id_type text;
    v_emergency_id_type text;
BEGIN
    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE 'VERIFYING EMERGENCY PAYMENT FLOW DEPLOYMENT...';
    RAISE NOTICE '----------------------------------------------------------------';

    ----------------------------------------------------------------------------
    -- 1. Verify RPC Functions Existence
    ----------------------------------------------------------------------------
    
    -- Check check_cash_eligibility_v2
    SELECT EXISTS(
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'check_cash_eligibility_v2'
        AND routine_schema = 'public'
    ) INTO v_func_exists_check;
    
    IF v_func_exists_check THEN
        RAISE NOTICE '✅ RPC check_cash_eligibility_v2 exists.';
    ELSE
        RAISE WARNING '❌ RPC check_cash_eligibility_v2 IS MISSING!';
    END IF;

    -- Check process_cash_payment_v2
    SELECT EXISTS(
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'process_cash_payment_v2'
        AND routine_schema = 'public'
    ) INTO v_func_exists_process;

    IF v_func_exists_process THEN
        RAISE NOTICE '✅ RPC process_cash_payment_v2 exists.';
    ELSE
        RAISE WARNING '❌ RPC process_cash_payment_v2 IS MISSING!';
    END IF;

    ----------------------------------------------------------------------------
    -- 2. Verify Schema Changes (UUID Types)
    ----------------------------------------------------------------------------

    -- Check visits.id type
    SELECT data_type INTO v_visits_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'visits' 
      AND column_name = 'id';

    IF v_visits_id_type = 'uuid' THEN
        RAISE NOTICE '✅ visits.id is type UUID.';
    ELSE
        RAISE WARNING '❌ visits.id type is % (Expected: uuid)', v_visits_id_type;
    END IF;

    -- Check emergency_requests.id type (should be UUID too)
    SELECT data_type INTO v_emergency_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'emergency_requests' 
      AND column_name = 'id';

    IF v_emergency_id_type = 'uuid' THEN
        RAISE NOTICE '✅ emergency_requests.id is type UUID.';
    ELSE
        RAISE WARNING '❌ emergency_requests.id type is % (Expected: uuid)', v_emergency_id_type;
    END IF;

    ----------------------------------------------------------------------------
    -- 3. Verify Visit Sync Trigger
    ----------------------------------------------------------------------------

    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'emergency_requests'
        AND trigger_name = 'on_emergency_status_change'
    ) THEN
        RAISE NOTICE '✅ Trigger on_emergency_status_change exists.';
    ELSE
        RAISE WARNING '❌ Trigger on_emergency_status_change IS MISSING on emergency_requests!';
    END IF;

    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE 'VERIFICATION COMPLETE.';
    RAISE NOTICE '----------------------------------------------------------------';
END;
$$;
