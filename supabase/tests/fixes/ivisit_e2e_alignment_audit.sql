-- iVisit E2E 1:1 Alignment Audit (Read-Only)
-- Purpose: produce an evidence snapshot for ivisit-app <-> DB <-> ivisit-console parity checks.
-- Safe to run on staging/production (SELECT only).

-- ---------------------------------------------------------------------------
-- 0) Core row counts
-- ---------------------------------------------------------------------------
SELECT 'profiles' AS table_name, COUNT(*)::BIGINT AS row_count FROM public.profiles
UNION ALL SELECT 'preferences', COUNT(*) FROM public.preferences
UNION ALL SELECT 'medical_profiles', COUNT(*) FROM public.medical_profiles
UNION ALL SELECT 'patient_wallets', COUNT(*) FROM public.patient_wallets
UNION ALL SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL SELECT 'organization_wallets', COUNT(*) FROM public.organization_wallets
UNION ALL SELECT 'hospitals', COUNT(*) FROM public.hospitals
UNION ALL SELECT 'ambulances', COUNT(*) FROM public.ambulances
UNION ALL SELECT 'doctors', COUNT(*) FROM public.doctors
UNION ALL SELECT 'emergency_requests', COUNT(*) FROM public.emergency_requests
UNION ALL SELECT 'visits', COUNT(*) FROM public.visits
UNION ALL SELECT 'payments', COUNT(*) FROM public.payments
UNION ALL SELECT 'emergency_doctor_assignments', COUNT(*) FROM public.emergency_doctor_assignments
UNION ALL SELECT 'insurance_billing', COUNT(*) FROM public.insurance_billing
UNION ALL SELECT 'wallet_ledger', COUNT(*) FROM public.wallet_ledger
ORDER BY table_name;

-- ---------------------------------------------------------------------------
-- 1) 1:1 bootstrap automation coverage (profiles -> dependent rows)
-- ---------------------------------------------------------------------------
SELECT
  'bootstrap_coverage' AS check_name,
  (SELECT COUNT(*) FROM public.profiles) AS profiles,
  (SELECT COUNT(*) FROM public.preferences) AS preferences,
  (SELECT COUNT(*) FROM public.medical_profiles) AS medical_profiles,
  (SELECT COUNT(*) FROM public.patient_wallets) AS patient_wallets;

SELECT 'missing_preferences' AS issue, p.id AS profile_id, p.email
FROM public.profiles p
LEFT JOIN public.preferences pref ON pref.user_id = p.id
WHERE pref.user_id IS NULL
ORDER BY p.created_at DESC;

SELECT 'missing_medical_profiles' AS issue, p.id AS profile_id, p.email
FROM public.profiles p
LEFT JOIN public.medical_profiles mp ON mp.user_id = p.id
WHERE mp.user_id IS NULL
ORDER BY p.created_at DESC;

SELECT 'missing_patient_wallets' AS issue, p.id AS profile_id, p.email
FROM public.profiles p
LEFT JOIN public.patient_wallets pw ON pw.user_id = p.id
WHERE pw.user_id IS NULL
ORDER BY p.created_at DESC;

-- ---------------------------------------------------------------------------
-- 2) Organization wallet automation coverage
-- ---------------------------------------------------------------------------
SELECT
  'organization_wallet_coverage' AS check_name,
  COUNT(o.*) AS organizations,
  COUNT(ow.*) AS organization_wallets,
  COUNT(o.*) - COUNT(ow.*) AS missing_wallets
FROM public.organizations o
LEFT JOIN public.organization_wallets ow ON ow.organization_id = o.id;

SELECT 'missing_org_wallet' AS issue, o.id AS organization_id, o.display_id, o.name, o.created_at
FROM public.organizations o
LEFT JOIN public.organization_wallets ow ON ow.organization_id = o.id
WHERE ow.id IS NULL
ORDER BY o.created_at DESC;

SELECT
  'invalid_org_wallet_ref' AS issue,
  ow.id AS organization_wallet_id,
  ow.display_id,
  ow.organization_id,
  CASE
    WHEN ow.organization_id IS NULL THEN 'null_organization_id'
    WHEN o.id IS NULL THEN 'orphan_organization_id'
    ELSE 'valid'
  END AS issue_type,
  ow.created_at
FROM public.organization_wallets ow
LEFT JOIN public.organizations o ON o.id = ow.organization_id
WHERE ow.organization_id IS NULL OR o.id IS NULL
ORDER BY ow.created_at DESC;

SELECT
  'platform_wallet_presence' AS check_name,
  COUNT(*) AS main_wallet_rows
FROM public.ivisit_main_wallet;

-- ---------------------------------------------------------------------------
-- 3) Emergency -> Visit / Payment linkage health
-- ---------------------------------------------------------------------------
SELECT
  'emergency_visit_linkage' AS check_name,
  COUNT(*) FILTER (WHERE v.id IS NOT NULL) AS emergencies_with_visit,
  COUNT(*) FILTER (WHERE v.id IS NULL) AS emergencies_missing_visit,
  COUNT(*) AS total_emergencies
FROM public.emergency_requests er
LEFT JOIN public.visits v ON v.request_id = er.id;

SELECT
  'visit_status_by_emergency_status' AS check_name,
  er.status AS emergency_status,
  COUNT(*) AS emergency_count,
  COUNT(v.*) AS linked_visits,
  COUNT(*) FILTER (WHERE v.id IS NULL) AS missing_visits
FROM public.emergency_requests er
LEFT JOIN public.visits v ON v.request_id = er.id
GROUP BY er.status
ORDER BY emergency_count DESC, emergency_status;

SELECT
  'payment_linkage' AS check_name,
  COUNT(*) AS total_payments,
  COUNT(*) FILTER (WHERE emergency_request_id IS NOT NULL) AS linked_to_emergency,
  COUNT(*) FILTER (WHERE emergency_request_id IS NULL) AS missing_emergency_link,
  COUNT(*) FILTER (WHERE organization_id IS NULL) AS missing_org_link
FROM public.payments;

SELECT p.id, p.display_id, p.payment_method, p.status, p.amount, p.organization_id, p.emergency_request_id, p.created_at
FROM public.payments p
WHERE p.emergency_request_id IS NULL OR p.organization_id IS NULL
ORDER BY p.created_at DESC
LIMIT 50;

-- ---------------------------------------------------------------------------
-- 4) Active emergency dispatch/tracking completeness
-- ---------------------------------------------------------------------------
SELECT
  'active_emergency_dispatch_health' AS check_name,
  COUNT(*) AS active_count,
  COUNT(*) FILTER (WHERE ambulance_id IS NOT NULL) AS with_ambulance_id,
  COUNT(*) FILTER (WHERE responder_id IS NOT NULL) AS with_responder_id,
  COUNT(*) FILTER (WHERE responder_location IS NOT NULL) AS with_responder_location,
  COUNT(*) FILTER (WHERE patient_location IS NOT NULL) AS with_patient_location
FROM public.emergency_requests
WHERE status IN ('in_progress', 'accepted', 'arrived');

SELECT
  id,
  display_id,
  status,
  service_type,
  hospital_id,
  ambulance_id,
  responder_id,
  responder_name,
  (responder_location IS NOT NULL) AS has_responder_location,
  (patient_location IS NOT NULL) AS has_patient_location,
  created_at,
  updated_at
FROM public.emergency_requests
WHERE status IN ('in_progress', 'accepted', 'arrived')
ORDER BY created_at DESC;

-- ---------------------------------------------------------------------------
-- 5) Duplicate candidate reports (read-only)
-- ---------------------------------------------------------------------------
SELECT
  'organization_name_duplicate' AS duplicate_type,
  LOWER(TRIM(name)) AS normalized_key,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id ORDER BY created_at) AS ids,
  ARRAY_AGG(display_id ORDER BY created_at) AS display_ids
FROM public.organizations
WHERE NULLIF(TRIM(name), '') IS NOT NULL
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_key;

SELECT
  'hospital_name_duplicate' AS duplicate_type,
  LOWER(TRIM(name)) AS normalized_key,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id ORDER BY created_at) AS ids,
  ARRAY_AGG(display_id ORDER BY created_at) AS display_ids
FROM public.hospitals
WHERE NULLIF(TRIM(name), '') IS NOT NULL
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_key;

SELECT
  'ambulance_call_sign_duplicate' AS duplicate_type,
  LOWER(TRIM(call_sign)) AS normalized_key,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id ORDER BY created_at) AS ids,
  ARRAY_AGG(display_id ORDER BY created_at) AS display_ids
FROM public.ambulances
WHERE NULLIF(TRIM(call_sign), '') IS NOT NULL
GROUP BY LOWER(TRIM(call_sign))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_key;

-- ---------------------------------------------------------------------------
-- 6) Schema contract drift checks (critical for 1:1 UI/service compatibility)
-- ---------------------------------------------------------------------------
SELECT
  'visits_schema_contract' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'visits' AND column_name = 'doctor_name'
  ) AS has_doctor_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'visits' AND column_name = 'type'
  ) AS has_type,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'visits' AND column_name = 'doctor'
  ) AS has_legacy_doctor,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'visits' AND column_name = 'visit_type'
  ) AS has_legacy_visit_type;

SELECT
  'emergency_schema_contract' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'emergency_requests' AND column_name = 'patient_location'
  ) AS has_patient_location,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'emergency_requests' AND column_name = 'responder_heading'
  ) AS has_responder_heading,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'emergency_requests' AND column_name = 'patient_heading'
  ) AS has_legacy_patient_heading;

-- ---------------------------------------------------------------------------
-- 7) Automation trigger/function presence checks
-- ---------------------------------------------------------------------------
SELECT
  'trigger_presence' AS check_name,
  t.trigger_name,
  t.event_object_table AS table_name,
  t.action_timing,
  t.event_manipulation
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
  AND t.event_object_table IN ('organizations', 'emergency_requests', 'payments')
  AND t.trigger_name IN (
    'on_org_created',
    'on_emergency_completed',
    'on_emergency_start_dispatch',
    'on_emergency_status_resource_sync',
    'on_emergency_auto_assign_doctor',
    'on_emergency_release_doctor',
    'on_emergency_create_billing',
    'on_payment_completed'
  )
ORDER BY t.event_object_table, t.trigger_name, t.event_manipulation;

SELECT
  'function_presence' AS check_name,
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_emergency_v4',
    'approve_cash_payment',
    'decline_cash_payment',
    'process_cash_payment_v2',
    'auto_assign_driver',
    'sync_emergency_to_visit'
  )
ORDER BY p.proname;

-- ---------------------------------------------------------------------------
-- 8) Automation source drift risk checks (static source inspection)
-- ---------------------------------------------------------------------------
SELECT
  'insurance_policy_column_compatibility' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'insurance_policies' AND column_name = 'status'
  ) AS insurance_policies_has_status,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'insurance_policies' AND column_name = 'coverage_percentage'
  ) AS insurance_policies_has_coverage_percentage;

SELECT
  'create_insurance_billing_on_completion_source' AS check_name,
  POSITION('status = ''active''' IN pg_get_functiondef(p.oid)) > 0 AS references_status_active,
  POSITION('coverage_percentage' IN pg_get_functiondef(p.oid)) > 0 AS references_coverage_percentage
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'create_insurance_billing_on_completion';

-- ---------------------------------------------------------------------------
-- 9) High-priority mismatch summary (single-row dashboard)
-- ---------------------------------------------------------------------------
WITH c AS (
  SELECT
    (SELECT COUNT(*) FROM public.organizations) AS organizations_count,
    (SELECT COUNT(*) FROM public.organization_wallets) AS organization_wallets_count,
    (SELECT COUNT(*) FROM public.emergency_requests) AS emergency_count,
    (SELECT COUNT(*) FROM public.visits) AS visit_count,
    (SELECT COUNT(*) FROM public.emergency_requests WHERE status IN ('in_progress', 'accepted', 'arrived')) AS active_emergency_count,
    (SELECT COUNT(*) FROM public.emergency_requests WHERE status IN ('in_progress', 'accepted', 'arrived') AND ambulance_id IS NOT NULL) AS active_with_ambulance,
    (SELECT COUNT(*) FROM public.emergency_requests WHERE status IN ('in_progress', 'accepted', 'arrived') AND responder_id IS NOT NULL) AS active_with_responder
)
SELECT
  'priority_summary' AS check_name,
  organizations_count - organization_wallets_count AS missing_org_wallets,
  emergency_count - visit_count AS rough_emergency_minus_visit_gap,
  active_emergency_count,
  active_with_ambulance,
  active_with_responder
FROM c;
