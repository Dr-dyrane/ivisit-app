-- Direct SQL test to check if functions exist
-- This bypasses PostgREST schema cache issues

-- Test 1: Check if function exists in pg_proc
SELECT 
    proname as function_name,
    pronargs as argument_count,
    proargtypes as argument_types
FROM pg_proc 
WHERE proname = 'check_cash_eligibility_v2' 
   OR proname = 'process_cash_payment_v2'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Test 2: Try to call check_cash_eligibility_v2 directly
DO $$
BEGIN
    PERFORM public.check_cash_eligibility_v2('00000000-0000-0000-0000-000000000000', 100.00);
    RAISE NOTICE 'check_cash_eligibility_v2: SUCCESS - Function exists and callable';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'check_cash_eligibility_v2: ERROR - %', SQLERRM;
END $$;

-- Test 3: Try to call process_cash_payment_v2 directly  
DO $$
BEGIN
    PERFORM public.process_cash_payment_v2('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 100.00, 'USD');
    RAISE NOTICE 'process_cash_payment_v2: SUCCESS - Function exists and callable';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'process_cash_payment_v2: ERROR - %', SQLERRM;
END $$;
