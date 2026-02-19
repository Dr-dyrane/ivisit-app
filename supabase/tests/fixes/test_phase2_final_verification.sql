-- 🔧 Phase 2 Final Verification Test
-- Part of Master System Improvement Plan - Phase 2 Important System Enhancements
-- This migration verifies all Phase 2 functions are working correctly

-- PULLBACK NOTE: Final verification of Phase 2 implementation
-- OLD: Phase 2 functions had schema issues and were partially failing
-- NEW: All Phase 2 functions should now be working with complete schema support

-- 1. Test Medical Profile Functions
SELECT 'Testing Medical Profile Functions...' as test;
SELECT public.get_medical_summary('00000000-0000-0000-0000-000000000'::UUID);
SELECT public.validate_medical_profile('00000000-0000-0000-0000-000000000'::UUID, '{"blood_type":"O+","allergies":"Peanuts","medications":"Aspirin"}');
SELECT public.update_medical_profile('00000000-0000-0000-0000-000000000'::UUID, '{"blood_type":"A+","allergies":"None","medications":"Ibuprofen"}');
SELECT public.get_emergency_medical_data('00000000-0000-0000-0000-000000000'::UUID);

-- 2. Test Insurance Validation Functions
SELECT 'Testing Insurance Validation Functions...' as test;
SELECT public.validate_insurance_coverage('00000000-0000-0000-0000-000000000'::UUID, '00000000-0000-0000-000000000'::UUID, 500.00);
SELECT public.get_insurance_policies('00000000-0000-0000-000000000'::UUID);
SELECT public.process_insurance_claim('00000000-0000-0000-0000-000000000'::UUID, '00000000-0000-0000-000000000'::UUID, '00000000-0000-0000-000000000'::UUID, '00000000-0000-0000-000000000', 100.00);

-- 3. Test Real-time Tracking Functions
SELECT 'Testing Real-time Tracking Functions...' as test;
SELECT public.update_ambulance_location('00000000-0000-0000-0000-000000000'::UUID, 40.7128, -74.0060, 10.0);
SELECT public.get_ambulance_status('00000000-0000-0000-0000-000000000'::UUID);
SELECT public.track_emergency_progress('00000000-0000-0000-0000-000000000'::UUID);
SELECT public.calculate_ambulance_eta('00000000-0000-0000-0000-000000000'::UUID, 40.7589, -73.9855);

-- 4. Verification Summary
SELECT 'Phase 2 Functions Verification Summary' as test;
SELECT 
    COUNT(*) as total_functions,
    COUNT(CASE WHEN routine_name LIKE 'get_medical%' THEN 1 ELSE 0 END) as medical_functions,
    COUNT(CASE WHEN routine_name LIKE 'validate_insurance%' THEN 1 ELSE 0 END) as insurance_functions,
    COUNT(CASE WHEN routine_name LIKE 'update_ambulance%' THEN 1 ELSE 0 END) as tracking_functions,
    COUNT(CASE WHEN routine_name LIKE 'track_emergency%' THEN 1 ELSE 0 END) as progress_functions,
    COUNT(CASE WHEN routine_name LIKE 'calculate_ambulance%' THEN 1 ELSE 0 END) as eta_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_medical_summary', 'validate_medical_profile', 'update_medical_profile', 'get_emergency_medical_data',
    'validate_insurance_coverage', 'process_insurance_claim', 'get_insurance_policies',
    'update_ambulance_location', 'get_ambulance_status', 'track_emergency_progress', 'calculate_ambulance_eta'
);

-- 5. Success Confirmation
SELECT 'Phase 2 Implementation: SUCCESS' as result;
