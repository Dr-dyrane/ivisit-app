-- Emergency Dispatch Automation Fix
-- Part of Master System Improvement Plan - Phase 1 Critical Emergency Flow Fixes
-- Adds missing ambulance dispatch automation RPCs

-- Test the new ambulance dispatch RPCs
SELECT 'Testing get_available_ambulances...' as test;
SELECT * FROM public.get_available_ambulances(NULL, 50, NULL) LIMIT 5;

SELECT 'Testing validate_emergency_request...' as test;
SELECT public.validate_emergency_request(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '{
        "hospital_id": "00000000-0000-0000-0000-000000000000",
        "patient_location": {"lat": 40.7128, "lng": -74.0060},
        "severity": "urgent"
    }'::JSONB
);

SELECT 'Testing check_hospital_capacity...' as test;
SELECT public.check_hospital_capacity(
    '00000000-0000-0000-0000-000000000000'::UUID,
    1,
    NULL
);

SELECT 'Testing calculate_emergency_priority...' as test;
SELECT public.calculate_emergency_priority(
    '{
        "severity": "urgent",
        "service_type": "ambulance"
    }'::JSONB,
    '{
        "conditions": "diabetes",
        "allergies": "penicillin"
    }'::JSONB
);

-- Verify all new RPC functions exist
SELECT 'Verifying RPC functions exist...' as test;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_available_ambulances',
    'update_ambulance_status', 
    'assign_ambulance_to_emergency',
    'auto_assign_ambulance',
    'validate_emergency_request',
    'check_hospital_capacity',
    'calculate_emergency_priority'
)
ORDER BY routine_name;
