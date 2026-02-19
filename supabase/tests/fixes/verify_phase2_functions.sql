-- Verify Phase 2 Functions Exist in Remote Database
-- Part of Master System Improvement Plan - Phase 2 Important System Enhancements

-- Check Medical Profile Functions
SELECT 'Checking Medical Profile Functions...' as test;
SELECT 
    routine_name,
    CASE 
        WHEN routine_name LIKE 'get_medical%' THEN '✅ Medical Summary'
        WHEN routine_name LIKE 'validate_medical%' THEN '✅ Medical Validation'
        WHEN routine_name LIKE 'update_medical%' THEN '✅ Medical Update'
        WHEN routine_name LIKE 'get_emergency_medical%' THEN '✅ Emergency Medical Data'
        ELSE '❓ Other Medical Function'
    END as function_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_medical_summary',
    'validate_medical_profile', 
    'update_medical_profile',
    'get_emergency_medical_data'
)
ORDER BY routine_name;

-- Check Insurance Validation Functions
SELECT 'Checking Insurance Validation Functions...' as test;
SELECT 
    routine_name,
    CASE 
        WHEN routine_name LIKE 'validate_insurance%' THEN '✅ Insurance Coverage'
        WHEN routine_name LIKE 'process_insurance%' THEN '✅ Insurance Claims'
        WHEN routine_name LIKE 'get_insurance%' THEN '✅ Insurance Policies'
        ELSE '❓ Other Insurance Function'
    END as function_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'validate_insurance_coverage',
    'process_insurance_claim',
    'get_insurance_policies'
)
ORDER BY routine_name;

-- Check Real-time Tracking Functions
SELECT 'Checking Real-time Tracking Functions...' as test;
SELECT 
    routine_name,
    CASE 
        WHEN routine_name LIKE 'update_ambulance%' THEN '✅ Ambulance Location'
        WHEN routine_name LIKE 'get_ambulance%' THEN '✅ Ambulance Status'
        WHEN routine_name LIKE 'track_emergency%' THEN '✅ Emergency Progress'
        WHEN routine_name LIKE 'calculate_ambulance%' THEN '✅ Ambulance ETA'
        ELSE '❓ Other Tracking Function'
    END as function_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'update_ambulance_location',
    'get_ambulance_status',
    'track_emergency_progress',
    'calculate_ambulance_eta'
)
ORDER BY routine_name;

-- Summary: All Phase 2 Functions
SELECT 'Phase 2 Function Summary...' as test;
SELECT 
    COUNT(*) as total_phase2_functions,
    COUNT(CASE WHEN routine_name LIKE 'get_medical%' OR routine_name LIKE 'validate_medical%' OR routine_name LIKE 'update_medical%' OR routine_name LIKE 'get_emergency_medical%' THEN 1 END) as medical_functions,
    COUNT(CASE WHEN routine_name LIKE 'validate_insurance%' OR routine_name LIKE 'process_insurance%' OR routine_name LIKE 'get_insurance%' THEN 1 END) as insurance_functions,
    COUNT(CASE WHEN routine_name LIKE 'update_ambulance%' OR routine_name LIKE 'get_ambulance%' OR routine_name LIKE 'track_emergency%' OR routine_name LIKE 'calculate_ambulance%' THEN 1 END) as tracking_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_medical_summary', 'validate_medical_profile', 'update_medical_profile', 'get_emergency_medical_data',
    'validate_insurance_coverage', 'process_insurance_claim', 'get_insurance_policies',
    'update_ambulance_location', 'get_ambulance_status', 'track_emergency_progress', 'calculate_ambulance_eta'
);
