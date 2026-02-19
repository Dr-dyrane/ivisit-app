-- Test Phase 2 Functions: Medical, Insurance & Real-time Tracking
-- Part of Master System Improvement Plan - Phase 2 Important System Enhancements

-- Test Medical Profile Functions
SELECT 'Testing Medical Profile Functions...' as test;

-- Test get_medical_summary
SELECT 'Testing get_medical_summary...' as test;
SELECT public.get_medical_summary('00000000-0000-0000-0000-000000000000'::UUID);

-- Test validate_medical_profile
SELECT 'Testing validate_medical_profile...' as test;
SELECT public.validate_medical_profile(
    '00000000-0000-0000-0000-000000000000'::UUID,
    jsonb_build_object(
        'blood_type', 'O+',
        'allergies', 'Peanuts, Shellfish',
        'medications', 'Aspirin',
        'conditions', 'Hypertension',
        'emergency_notes', 'No known allergies to medications'
    )
);

-- Test get_emergency_medical_data
SELECT 'Testing get_emergency_medical_data...' as test;
SELECT public.get_emergency_medical_data('00000000-0000-0000-0000-000000000000'::UUID);

-- Test Insurance Validation Functions
SELECT 'Testing Insurance Validation Functions...' as test;

-- Test validate_insurance_coverage
SELECT 'Testing validate_insurance_coverage...' as test;
SELECT public.validate_insurance_coverage(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    500.00
);

-- Test get_insurance_policies
SELECT 'Testing get_insurance_policies...' as test;
SELECT public.get_insurance_policies('00000000-0000-0000-0000-000000000000'::UUID);

-- Test Real-time Tracking Functions
SELECT 'Testing Real-time Tracking Functions...' as test;

-- Test update_ambulance_location
SELECT 'Testing update_ambulance_location...' as test;
SELECT public.update_ambulance_location(
    '00000000-0000-0000-0000-000000000000'::UUID,
    40.7128,
    -74.0060,
    10.0
);

-- Test get_ambulance_status
SELECT 'Testing get_ambulance_status...' as test;
SELECT public.get_ambulance_status('00000000-0000-0000-0000-000000000000'::UUID);

-- Test track_emergency_progress
SELECT 'Testing track_emergency_progress...' as test;
SELECT public.track_emergency_progress('00000000-0000-0000-0000-000000000000'::UUID);

-- Test calculate_ambulance_eta
SELECT 'Testing calculate_ambulance_eta...' as test;
SELECT public.calculate_ambulance_eta(
    '00000000-0000-0000-0000-000000000000'::UUID,
    40.7589,
    -73.9851
);

-- Verify all Phase 2 RPC functions exist
SELECT 'Verifying Phase 2 RPC functions exist...' as test;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    -- Medical Profile Functions
    'get_medical_summary',
    'validate_medical_profile',
    'update_medical_profile',
    'get_emergency_medical_data',
    -- Insurance Validation Functions
    'validate_insurance_coverage',
    'process_insurance_claim',
    'get_insurance_policies',
    -- Real-time Tracking Functions
    'update_ambulance_location',
    'get_ambulance_status',
    'track_emergency_progress',
    'calculate_ambulance_eta'
)
ORDER BY routine_name;
