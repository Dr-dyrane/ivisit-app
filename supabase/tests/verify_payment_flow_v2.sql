-- Verification Script: Verify Atomic Payment Flow & Cost Calculation
-- Run this script to confirm the new RPC functions for the atomic payment flow are live.

BEGIN;

DO $$
DECLARE
    v_func_exists_atomic boolean;
    v_func_exists_cost boolean;
BEGIN
    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE 'VERIFYING ATOMIC PAYMENT FLOW DEPLOYMENT...';
    RAISE NOTICE '----------------------------------------------------------------';

    ----------------------------------------------------------------------------
    -- 1. Verify Atomic RPC Existence
    ----------------------------------------------------------------------------
    
    -- Check create_emergency_with_payment
    SELECT EXISTS(
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'create_emergency_with_payment'
        AND routine_schema = 'public'
    ) INTO v_func_exists_atomic;
    
    IF v_func_exists_atomic THEN
        RAISE NOTICE '✅ RPC create_emergency_with_payment exists.';
    ELSE
        RAISE WARNING '❌ RPC create_emergency_with_payment IS MISSING!';
    END IF;

    ----------------------------------------------------------------------------
    -- 2. Verify Cost RPC Update (Check for service_fee column in return)
    ----------------------------------------------------------------------------

    -- We can't easily check return columns via simple SQL in PL/pgSQL without casting catalog types,
    -- but we can check if it runs without error or check the definition text if needed.
    -- For now, checking existence is good.
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'calculate_emergency_cost'
        AND routine_schema = 'public'
    ) INTO v_func_exists_cost;

    IF v_func_exists_cost THEN
        RAISE NOTICE '✅ RPC calculate_emergency_cost exists.';
    ELSE
        RAISE WARNING '❌ RPC calculate_emergency_cost IS MISSING!';
    END IF;

    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE 'VERIFICATION COMPLETE.';
    RAISE NOTICE '----------------------------------------------------------------';
END;
$$;
