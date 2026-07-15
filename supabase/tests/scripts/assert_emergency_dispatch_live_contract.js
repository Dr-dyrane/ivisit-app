#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..', '..', '..');
const consoleRoot = process.env.IVISIT_CONSOLE_FRONTEND_ROOT
  ? path.resolve(process.env.IVISIT_CONSOLE_FRONTEND_ROOT)
  : path.resolve(appRoot, '..', 'ivisit-console', 'frontend');
const schemaOnly = process.argv.includes('--schema-only');

const reportPath = path.join(
  appRoot,
  'supabase',
  'tests',
  'validation',
  'emergency_dispatch_live_contract_report.json'
);

const files = {
  infra: path.join(appRoot, 'supabase', 'migrations', '20260219000000_infra.sql'),
  logistics: path.join(appRoot, 'supabase', 'migrations', '20260219000300_logistics.sql'),
  finance: path.join(appRoot, 'supabase', 'migrations', '20260219000400_finance.sql'),
  notifications: path.join(appRoot, 'supabase', 'migrations', '20260219000500_ops_content.sql'),
  security: path.join(appRoot, 'supabase', 'migrations', '20260219000700_security.sql'),
  emergency: path.join(appRoot, 'supabase', 'migrations', '20260219000800_emergency_logic.sql'),
  automations: path.join(appRoot, 'supabase', 'migrations', '20260219000900_automations.sql'),
  rpcs: path.join(appRoot, 'supabase', 'migrations', '20260219010000_core_rpcs.sql'),
  liveHarness: path.join(
    appRoot,
    'supabase',
    'tests',
    'scripts',
    'run_emergency_dispatch_live_e2e.js'
  ),
  appTypes: path.join(appRoot, 'types', 'database.ts'),
  appGeneratedTypes: path.join(appRoot, 'supabase', 'database.ts'),
  consoleTypes: path.join(consoleRoot, 'src', 'types', 'database.ts'),
};

const report = {
  mode: schemaOnly ? 'schema-only' : 'production-contract',
  generated_at: new Date().toISOString(),
  app_root: appRoot,
  console_root: consoleRoot,
  passed: 0,
  failed: 0,
  skipped: 0,
  results: [],
};

function readFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function extractObjectByKey(text, key, startAt = 0) {
  const marker = `${key}: {`;
  const markerIndex = text.indexOf(marker, startAt);
  if (markerIndex < 0) return null;
  const openIndex = text.indexOf('{', markerIndex);
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(markerIndex, index + 1);
    }
  }
  return null;
}

function extractTableRowFields(text, tableName) {
  const tableMarker = `      ${tableName}: {`;
  const tableIndex = text.indexOf(tableMarker);
  if (tableIndex < 0) return null;
  const tableBlock = extractObjectByKey(text, tableName, tableIndex);
  if (!tableBlock) return null;
  const rowBlock = extractObjectByKey(tableBlock, 'Row');
  if (!rowBlock) return null;
  const fields = [];
  const fieldPattern = /^\s{10}([a-zA-Z0-9_]+)\??:/gm;
  let match;
  while ((match = fieldPattern.exec(rowBlock)) !== null) fields.push(match[1]);
  return uniqueSorted(fields);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function record(category, id, passed, detail, filePath = null) {
  report.results.push({
    category,
    id,
    status: passed ? 'pass' : 'fail',
    detail,
    file: filePath ? path.relative(appRoot, filePath).replace(/\\/g, '/') : null,
  });
  if (passed) report.passed += 1;
  else report.failed += 1;
}

function requireFile(key, category) {
  const filePath = files[key];
  const content = readFile(filePath);
  record(
    category,
    `${key}_file_exists`,
    content !== null,
    content !== null ? 'Source file is present.' : `Missing source file: ${filePath}`,
    filePath
  );
  return content || '';
}

function requirePatterns(category, key, rules) {
  const content = requireFile(key, category);
  for (const rule of rules) {
    const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'm');
    const passed = pattern.test(content);
    record(category, rule.id, passed, rule.detail, files[key]);
  }
}

function forbidPatterns(category, key, rules) {
  const content = requireFile(key, category);
  for (const rule of rules) {
    const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'm');
    const passed = !pattern.test(content);
    record(category, rule.id, passed, rule.detail, files[key]);
  }
}

requirePatterns('authority', 'emergency', [
  {
    id: 'standalone_ambulance_availability_scope',
    pattern:
      /CREATE OR REPLACE FUNCTION public\.get_available_ambulances[\s\S]*?COALESCE\(a\.organization_id, hospital\.organization_id\) = v_actor_org_id/,
    detail: 'Standalone ambulances resolve organization authority without requiring a hospital row.',
  },
]);

requirePatterns('authority', 'rpcs', [
  {
    id: 'malformed_telemetry_controlled_json',
    pattern:
      /CREATE OR REPLACE FUNCTION public\.report_responder_telemetry[\s\S]*?EXCEPTION[\s\S]*?invalid_text_representation[\s\S]*?RETURN jsonb_build_object\('success', false, 'error', 'Invalid telemetry payload'\)/,
    detail: 'Malformed telemetry casts return controlled JSON instead of escaping as SQL errors.',
  },
  {
    id: 'console_create_pins_pending_truth',
    pattern:
      /CREATE OR REPLACE FUNCTION public\.console_create_emergency_request[\s\S]*?v_status := 'pending_approval';[\s\S]*?v_payment_status := 'pending';/,
    detail: 'Console create cannot accept caller-authored paid or terminal lifecycle truth.',
  },
  {
    id: 'standalone_assignment_org_scope',
    pattern:
      /CREATE OR REPLACE FUNCTION public\.assign_ambulance_to_emergency[\s\S]*?COALESCE\(a\.organization_id, h\.organization_id\)[\s\S]*?v_actor_org_id IS DISTINCT FROM v_req_org_id[\s\S]*?v_actor_org_id IS DISTINCT FROM v_amb_org_id/,
    detail: 'Manual assignment requires both the request and standalone ambulance to match actor organization scope.',
  },
  {
    id: 'service_role_ambulance_completion',
    pattern:
      /CREATE OR REPLACE FUNCTION public\.console_complete_emergency[\s\S]*?IF v_is_service_role THEN[\s\S]*?RETURN public\.responder_complete_emergency\(p_request_id\)/,
    detail: 'Service-role Console completion delegates ambulance lifecycle to the canonical responder command.',
  },
]);

requirePatterns('authority', 'infra', [
  {
    id: 'cleanup_exec_sql_service_only',
    pattern:
      /REVOKE ALL ON FUNCTION public\.exec_sql\(TEXT\) FROM PUBLIC, anon, authenticated;[\s\S]*?GRANT EXECUTE ON FUNCTION public\.exec_sql\(TEXT\) TO service_role;/,
    detail: 'Exact graph cleanup remains callable only by service role.',
  },
]);

requirePatterns('authority', 'finance', [
  {
    id: 'wallet_settlement_full_signature_requires_patient_actor',
    pattern:
      /CREATE OR REPLACE FUNCTION public\.process_wallet_payment\(\s*p_user_id UUID,\s*p_organization_id UUID,[\s\S]*?v_actor_id IS DISTINCT FROM p_user_id[\s\S]*?patient must confirm wallet payment/,
    detail: 'Authenticated operators cannot settle another patient wallet.',
  },
]);

requirePatterns('authority', 'rpcs', [
  {
    id: 'wallet_settlement_compat_signature_requires_patient_actor',
    pattern:
      /CREATE OR REPLACE FUNCTION public\.process_wallet_payment\(\s*p_user_id UUID,\s*p_amount NUMERIC,[\s\S]*?v_actor_id IS DISTINCT FROM p_user_id[\s\S]*?patient must confirm wallet payment/,
    detail: 'The compatibility wallet command enforces the same patient-consent boundary.',
  },
]);

requirePatterns('authority', 'emergency', [
  {
    id: 'cross_patient_wallet_creation_denied',
    pattern:
      /CREATE OR REPLACE FUNCTION public\.create_emergency_v4\([\s\S]*?v_payment_method = 'wallet'[\s\S]*?patient must confirm wallet payment/,
    detail: 'Operator-created requests cannot select a patient wallet.',
  },
  {
    id: 'operator_creation_scoped_to_hospital_org',
    pattern:
      /v_actor_role IN \('org_admin', 'dispatcher'\)[\s\S]*?v_actor_org_id IS DISTINCT FROM v_organization_id/,
    detail: 'Organization operators can create cash/card requests only for their own hospital scope.',
  },
]);

requirePatterns('schema', 'logistics', [
  {
    id: 'assignment_history_table',
    pattern: /CREATE TABLE IF NOT EXISTS public\.emergency_responder_assignments\s*\(/,
    detail: 'Responder offers and accepted assignments have a canonical history table.',
  },
  {
    id: 'staffing_history_table',
    pattern: /CREATE TABLE IF NOT EXISTS public\.ambulance_staff_assignments\s*\(/,
    detail: 'Ambulance staffing has an organization-scoped history table.',
  },
  {
    id: 'single_active_request_assignment',
    pattern: /idx_emergency_responder_assignment_active_request[\s\S]*?WHERE status IN \('offered', 'accepted', 'arrived'\)/,
    detail: 'Only one active responder generation can own a request.',
  },
  {
    id: 'single_active_responder_assignment',
    pattern: /idx_emergency_responder_assignment_active_responder[\s\S]*?WHERE status IN \('offered', 'accepted', 'arrived'\)/,
    detail: 'A responder cannot own two active emergencies.',
  },
  {
    id: 'request_assignment_pointer',
    pattern: /current_responder_assignment_id UUID/,
    detail: 'Emergency requests identify the current assignment generation.',
  },
  {
    id: 'telemetry_generation_fields',
    pattern: /responder_telemetry_sequence BIGINT[\s\S]*?responder_telemetry_lease_expires_at TIMESTAMPTZ/,
    detail: 'Request telemetry includes sequence and lease truth.',
  },
]);

requirePatterns('payments', 'finance', [
  {
    id: 'durable_stripe_receipts',
    pattern: /CREATE TABLE IF NOT EXISTS public\.stripe_webhook_event_receipts\s*\(/,
    detail: 'Stripe webhook delivery has a durable receipt owner.',
  },
  {
    id: 'payment_request_relationship',
    pattern: /emergency_requests_payment_id_fkey[\s\S]*?REFERENCES public\.payments\(id\)/,
    detail: 'The request payment pointer is a database relationship.',
  },
  {
    id: 'payment_request_relationship_validated',
    pattern: /VALIDATE CONSTRAINT emergency_requests_payment_id_fkey/,
    detail: 'The request payment relationship is validated in a fresh pillar rebuild.',
  },
]);

requirePatterns('notifications', 'notifications', [
  {
    id: 'canonical_notification_emitter',
    pattern: /CREATE OR REPLACE FUNCTION public\.emit_canonical_notification\s*\(/,
    detail: 'Backend consequences use one canonical notification emitter.',
  },
  {
    id: 'notification_event_key',
    pattern: /ADD COLUMN IF NOT EXISTS event_key TEXT/,
    detail: 'Notifications carry an idempotency event key.',
  },
  {
    id: 'notification_recipient_dismissal_receipt',
    pattern: /ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ/,
    detail: 'Recipient dismissal persists without deleting the canonical event row.',
  },
  {
    id: 'notification_event_unique',
    pattern: /CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_event_key_uidx/,
    detail: 'Recipient plus event key is unique.',
  },
  {
    id: 'payment_notification_trigger',
    pattern: /CREATE TRIGGER notify_payment_status_change[\s\S]*?notify_canonical_payment_status_change/,
    detail: 'Payment status consequences are emitted by the backend.',
  },
  {
    id: 'standalone_dispatch_notification_scope',
    pattern: /CREATE OR REPLACE FUNCTION public\.notify_emergency_events[\s\S]*?SELECT NEW\.dispatch_organization_id, FALSE AS facility_scope[\s\S]*?profile\.role IN \('org_admin', 'dispatcher', 'admin'\)/,
    detail: 'Standalone dispatch organizations and their dispatchers receive canonical request notifications.',
  },
  {
    id: 'late_dispatch_organization_notification',
    pattern: /CREATE TRIGGER on_emergency_notification[\s\S]*?AFTER INSERT OR UPDATE OF hospital_id, dispatch_organization_id/,
    detail: 'A dispatch organization assigned after request creation receives the same canonical event.',
  },
]);

requirePatterns('authorization', 'security', [
  {
    id: 'patient_request_scope',
    pattern: /CREATE POLICY "Users see own emergency requests"[\s\S]*?auth\.uid\(\) = user_id/,
    detail: 'Patients read only their emergency requests.',
  },
  {
    id: 'assigned_responder_request_scope',
    pattern: /CREATE POLICY "Assigned responders see their emergency requests"[\s\S]*?assignment\.responder_id = auth\.uid\(\)/,
    detail: 'Drivers read requests only through their current assignment.',
  },
  {
    id: 'assignment_role_scope',
    pattern: /CREATE POLICY "Emergency responder assignments are readable in role scope"[\s\S]*?actor\.organization_id = emergency_responder_assignments\.organization_id/,
    detail: 'Assignment history is role and organization scoped.',
  },
  {
    id: 'direct_request_writes_revoked',
    pattern: /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.emergency_requests FROM anon, authenticated/,
    detail: 'Lifecycle writes cannot bypass commands through PostgREST.',
  },
  {
    id: 'private_documents_storage',
    pattern: /\('documents', 'documents', false\)/,
    detail: 'Clinical and onboarding documents use a private bucket.',
  },
  {
    id: 'owner_scoped_onboarding_storage',
    pattern: /Users upload own onboarding evidence[\s\S]*?\(storage\.foldername\(name\)\)\[2\] = auth\.uid\(\)::TEXT/,
    detail: 'Private onboarding uploads are owner-folder scoped.',
  },
]);

const securitySource = readFile(files.security) || '';
const orgPaymentPolicy = securitySource.match(
  /CREATE POLICY "Org Admins see org payments"[\s\S]*?;/
)?.[0];
record(
  'authorization',
  'org_payment_policy_exists',
  Boolean(orgPaymentPolicy),
  orgPaymentPolicy
    ? 'The organization payment read policy exists.'
    : 'The organization payment read policy is missing.',
  files.security
);
record(
  'authorization',
  'org_payment_policy_role_scoped',
  Boolean(orgPaymentPolicy && /\borg_admin\b/.test(orgPaymentPolicy)),
  orgPaymentPolicy && /\borg_admin\b/.test(orgPaymentPolicy)
    ? 'Organization payment reads explicitly require the org_admin role.'
    : 'Organization payment reads are not explicitly restricted to org_admin.',
  files.security
);

requirePatterns('dispatch-gate', 'emergency', [
  {
    id: 'single_payment_projection',
    pattern: /CREATE OR REPLACE FUNCTION public\.emergency_dispatch_payment_snapshot\s*\(/,
    detail: 'Dispatch consumes one backend payment-readiness projection.',
  },
  {
    id: 'card_backend_proof',
    pattern: /WHEN 'card' THEN[\s\S]*?metadata->>'source' = 'complete_card_payment'/,
    detail: 'Card readiness requires webhook-owned completion evidence.',
  },
  {
    id: 'wallet_ledger_proof',
    pattern: /WHEN 'wallet' THEN[\s\S]*?patient_wallet_debit/,
    detail: 'Wallet readiness requires an idempotent debit ledger row.',
  },
]);

requirePatterns('rpc-authority', 'emergency', [
  {
    id: 'get_available_ambulances_public_revoked',
    pattern: /REVOKE ALL ON FUNCTION public\.get_available_ambulances\(UUID, INTEGER, TEXT\)/,
    detail: 'Standalone ambulance discovery revokes inherited PUBLIC execution.',
  },
]);

requirePatterns('fallback', 'automations', [
  {
    id: 'readiness_filtered_auto_offer',
    pattern: /auto_assign_driver[\s\S]*?ambulance_dispatch_readiness_snapshot[\s\S]*?offer_responder_assignment/,
    detail: 'Automatic dispatch offers only a ready, staffed responder.',
  },
  {
    id: 'ambulance_unavailable_failover',
    pattern: /CREATE OR REPLACE FUNCTION public\.handle_ambulance_unavailability_failover\s*\(/,
    detail: 'Ambulance unavailability has a server-owned failover path.',
  },
  {
    id: 'doctor_unavailable_failover',
    pattern: /CREATE OR REPLACE FUNCTION public\.handle_doctor_unavailability_failover\s*\(/,
    detail: 'Doctor unavailability does not block emergency lifecycle truth.',
  },
]);

requirePatterns('cleanup-authority', 'infra', [
  {
    id: 'service_only_exec_sql',
    pattern: /CREATE OR REPLACE FUNCTION public\.exec_sql\(sql TEXT\)[\s\S]*?request\.jwt\.claims[\s\S]*?service_role/,
    detail: 'The exact graph cleanup executor rejects non-service-role callers.',
  },
]);

requirePatterns('cleanup-authority', 'logistics', [
  {
    id: 'assignment_history_guard_name',
    pattern: /CREATE TRIGGER trg_protect_emergency_responder_assignment_history/,
    detail: 'The assignment history guard used by exact cleanup has a stable name.',
  },
  {
    id: 'transition_history_guard_name',
    pattern: /CREATE TRIGGER trg_emergency_status_transitions_append_only/,
    detail: 'The transition history guard used by exact cleanup has a stable name.',
  },
]);

requirePatterns('cleanup-authority', 'automations', [
  {
    id: 'dispatch_trigger_name',
    pattern: /CREATE TRIGGER on_emergency_start_dispatch/,
    detail: 'The automatic dispatch trigger used by exact cleanup has a stable name.',
  },
]);

const requiredRpcNames = [
  'get_ambulance_dispatch_readiness',
  'get_eligible_ambulance_responders',
  'staff_ambulance_responder',
  'offer_responder_assignment',
  'responder_accept_emergency',
  'responder_arrive_emergency',
  'responder_complete_emergency',
  'responder_decline_emergency',
  'dispatcher_release_responder_assignment',
  'patient_acknowledge_responder_arrival',
  'report_responder_telemetry',
  'get_responder_telemetry_state',
  'get_current_emergency_responder',
  'get_driver_dispatch_feed',
  'expire_responder_offers',
  'auto_assign_ambulance',
  'assign_ambulance_to_emergency',
  'console_create_emergency_request',
  'console_complete_emergency',
];

requirePatterns(
  'rpc-authority',
  'rpcs',
  requiredRpcNames.flatMap((name) => [
    {
      id: `${name}_defined`,
      pattern: new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\s*\\(`),
      detail: `${name} is defined in the canonical RPC pillar.`,
    },
    {
      id: `${name}_public_revoked`,
      pattern: new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(`),
      detail: `${name} revokes inherited PUBLIC execution.`,
    },
  ])
);

const rpcSource = readFile(files.rpcs) || '';
const readinessSnapshot = rpcSource.match(
  /CREATE OR REPLACE FUNCTION public\.ambulance_dispatch_readiness_snapshot\([\s\S]*?\$\$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;/
)?.[0];
const readinessUsesDestinationOrganization = Boolean(
  readinessSnapshot &&
    /COALESCE\(\s*v_request\.dispatch_organization_id\s*,\s*v_request_org_id\s*\)/.test(
      readinessSnapshot
    ) &&
    !/v_request\.dispatch_organization_id\s+IS\s+NULL\s+OR/.test(readinessSnapshot)
);
record(
  'authorization',
  'readiness_defaults_to_destination_organization',
  readinessUsesDestinationOrganization,
  readinessUsesDestinationOrganization
    ? 'A request without an assigned dispatch organization remains scoped to its destination organization.'
    : 'A null dispatch organization can admit responders from unrelated organizations.',
  files.rpcs
);
const readinessNormalizesAmbulanceTypes = Boolean(
  readinessSnapshot &&
    /v_ambulance_type_key/.test(readinessSnapshot) &&
    /v_requested_type_key/.test(readinessSnapshot) &&
    /\(ambulance\|basic\|standard\|bls\)/.test(readinessSnapshot) &&
    /\(advanced\|als\|cardiac\)/.test(readinessSnapshot) &&
    /\(critical\|icu\|cct\|intensive\)/.test(readinessSnapshot) &&
    /LOWER\(BTRIM\(COALESCE\(v_request\.ambulance_type, ''\)\)\)\s*=\s*'ambulance'/.test(
      readinessSnapshot
    ) &&
    /v_requested_type_key\s*=\s*v_ambulance_type_key/.test(readinessSnapshot) &&
    !/ILIKE\s+'%'\s*\|\|\s*v_request\.ambulance_type/.test(readinessSnapshot)
);
record(
  'dispatch-gate',
  'readiness_normalizes_pricing_and_fleet_type_aliases',
  readinessNormalizesAmbulanceTypes,
  readinessNormalizesAmbulanceTypes
    ? 'Readiness compares canonical basic, advanced, and critical classes instead of raw UI and fleet strings.'
    : 'Readiness can strand valid pricing/fleet aliases or widen a specific equipment request.',
  files.rpcs
);

requirePatterns('harness-safety', 'liveHarness', [
  {
    id: 'explicit_apply_gate',
    pattern: /options\.apply/,
    detail: 'The live harness has an explicit apply gate.',
  },
  {
    id: 'project_ref_gate',
    pattern: /--project-ref=/,
    detail: 'The live harness requires the exact target project reference.',
  },
  {
    id: 'environment_confirmation_gate',
    pattern: /IVISIT_EMERGENCY_LIVE_E2E/,
    detail: 'The live harness requires a second environment confirmation.',
  },
  {
    id: 'full_static_gate_before_client',
    pattern: /spawnSync\(process\.execPath, \[staticGatePath\][\s\S]*?if \(staticGate\.status !== 0\)[\s\S]*?const \{ createClient \} = loadSupabaseClient\(\)/,
    detail: 'A red full static contract gate stops execution before Supabase client creation.',
  },
  {
    id: 'finally_cleanup',
    pattern: /finally\s*\{[\s\S]*?cleanupFixture/,
    detail: 'Fixture cleanup runs from a finally block.',
  },
  {
    id: 'zero_residue_assertion',
    pattern: /assertZeroResidue/,
    detail: 'The harness verifies cleanup rather than assuming it.',
  },
  {
    id: 'read_only_openapi_drift_check',
    pattern: /requiredDeployedRpcNames[\s\S]*?application\/openapi\+json/,
    detail: 'Deployed RPC presence is checked through read-only PostgREST OpenAPI.',
  },
  {
    id: 'two_distinct_auth_sessions',
    pattern: /sessionIds\[0\] !== fixtures\.driverA\.sessionIds\[1\]/,
    detail: 'Concurrency proof requires two distinct responder Auth sessions.',
  },
  {
    id: 'concurrent_accept_calls',
    pattern: /Promise\.all\([\s\S]*?responder_accept_emergency/,
    detail: 'The live proof races two responder accept commands.',
  },
  {
    id: 'two_distinct_dispatcher_sessions',
    pattern:
      /standaloneDispatcher\.sessionIds\[0\] !== fixtures\.standaloneDispatcher\.sessionIds\[1\]/,
    detail: 'Offer concurrency requires two distinct dispatcher Auth sessions.',
  },
  {
    id: 'concurrent_offer_calls',
    pattern:
      /Promise\.all\([\s\S]*?standaloneDispatcher\.clients\.map[\s\S]*?assign_ambulance_to_emergency/,
    detail: 'The live proof races two same-org standalone assignment commands.',
  },
  {
    id: 'cross_org_standalone_assignment_denied',
    pattern:
      /cross-org standalone ambulance assignment is denied[\s\S]*?expectDenied\(result, 'cross-org standalone ambulance assignment'\)/,
    detail: 'A foreign dispatcher explicitly probes and is denied standalone ambulance assignment.',
  },
  {
    id: 'same_org_standalone_recognized',
    pattern:
      /same-org standalone ambulance is recognized[\s\S]*?row\.id === fixtures\.standaloneAmbulance\.id[\s\S]*?readiness\.data\?\.organization_id === fixtures\.standaloneOrg\.id/,
    detail: 'The same organization discovers and resolves its hospital-free ambulance.',
  },
  {
    id: 'malformed_telemetry_runtime_probe',
    pattern:
      /malformed telemetry returns controlled JSON without a SQL error[\s\S]*?assert\(!result\.error[\s\S]*?result\.data\?\.success === false/,
    detail: 'The live proof requires malformed telemetry to remain a JSON result.',
  },
  {
    id: 'console_create_runtime_authority_probe',
    pattern:
      /Console create ignores caller terminal and paid state[\s\S]*?status: 'completed'[\s\S]*?payment_status: 'completed'[\s\S]*?request\.status === 'pending_approval'[\s\S]*?request\.payment_status === 'pending'/,
    detail: 'The live proof submits hostile lifecycle fields and verifies canonical pending truth.',
  },
  {
    id: 'service_role_completion_runtime_probe',
    pattern:
      /service role completes ambulance lifecycle through Console command idempotently[\s\S]*?admin\.rpc\('console_complete_emergency'[\s\S]*?already_completed/,
    detail: 'The service-role Console completion path is executed and retried.',
  },
  {
    id: 'autonomous_dispatch_cron_runtime_probe',
    pattern:
      /assertAutonomousDispatchJobExists[\s\S]*?cron\.job[\s\S]*?ivisit-expire-responder-offers/,
    detail: 'The live proof verifies that the canonical dispatch retry cron job exists.',
  },
  {
    id: 'autonomous_dispatch_effect_runtime_probe',
    pattern:
      /restored readiness can offer, decline, and requeue without stale assignment[\s\S]*?waitForCurrentAssignment[\s\S]*?Autonomous dispatch did not create a live offer/,
    detail: 'Restored readiness waits for the scheduled worker instead of invoking dispatch directly.',
  },
  {
    id: 'realtime_scope_runtime_probe',
    pattern:
      /Realtime delivers to the owner and suppresses a cross-org observer[\s\S]*?openRealtimeUpdateProbe[\s\S]*?outsiderProbe\.events/,
    detail: 'Authenticated Realtime delivery is checked for both owner visibility and outsider suppression.',
  },
  {
    id: 'realtime_channels_cleaned',
    pattern:
      /for \(const probe of \[\.\.\.state\.realtimeChannels\]\)[\s\S]*?closeRealtimeProbe\(probe\)/,
    detail: 'Every exact Realtime proof channel is removed during finally cleanup.',
  },
  {
    id: 'uuid_validated_cleanup_sql',
    pattern: /function uuidSqlList[\s\S]*?Refusing cleanup SQL for invalid UUID/,
    detail: 'Dynamic cleanup SQL accepts validated fixture UUIDs only.',
  },
  {
    id: 'iterable_fixture_id_sets',
    pattern: /function unique\(values\)[\s\S]*?Array\.from\(values\)/,
    detail: 'Cleanup normalization accepts the Set instances used to track fixture ids.',
  },
  {
    id: 'cleanup_trigger_exception_restore',
    pattern: /EXCEPTION WHEN OTHERS THEN[\s\S]*?ENABLE TRIGGER trg_emergency_status_transitions_append_only[\s\S]*?ENABLE TRIGGER trg_protect_emergency_responder_assignment_history[\s\S]*?ENABLE TRIGGER on_emergency_start_dispatch/,
    detail: 'Named guards are restored if exact request cleanup fails.',
  },
  {
    id: 'denied_storage_paths_tracked',
    pattern: /state\.storage\.documents\.add\(crossOwnerPrivatePath\)[\s\S]*?state\.storage\.documents\.add\(unsupportedEmergencyPath\)/,
    detail: 'Denied Storage probes are still registered for service cleanup.',
  },
  {
    id: 'fixture_request_org_isolated',
    pattern: /\.update\(\{ dispatch_organization_id: hospital\.organization_id \}\)[\s\S]*?Fixture request was not isolated to its generated organization/,
    detail: 'Each fixture request is scoped before payment can trigger dispatch.',
  },
  {
    id: 'fixture_ambulance_identity_asserted',
    pattern: /offeredRequest\.ambulance_id === fixtures\.ambulance\.id[\s\S]*?selected an ambulance outside the fixture/,
    detail: 'Automatic dispatch must select the generated ambulance and no other row.',
  },
  {
    id: 'relationship_residue_checks',
    pattern: /assertNoRows\('notifications', 'user_id'[\s\S]*?assertNoRows\('ambulance_staff_assignments', 'ambulance_id'[\s\S]*?assertNoRows\('patient_wallets', 'user_id'/,
    detail: 'Zero-residue proof checks exact relationship keys as well as learned row ids.',
  },
]);

forbidPatterns('harness-safety', 'liveHarness', [
  {
    id: 'no_broad_test_email_cleanup',
    pattern: /\.ilike\(\s*['"]email['"]/,
    detail: 'Cleanup must never scan and delete broad test-email patterns.',
  },
  {
    id: 'no_deployment_command',
    pattern: /supabase\s+(db\s+push|migration\s+up|functions\s+deploy)/i,
    detail: 'The proof harness must not deploy schema or Edge Functions.',
  },
  {
    id: 'no_global_expiry_mutation',
    pattern: /\.rpc\(\s*['"]expire_responder_offers['"]/,
    detail: 'The isolated proof must not mutate unrelated expired responder offers.',
  },
  {
    id: 'no_auth_user_enumeration',
    pattern: /auth\.admin\.listUsers/,
    detail: 'Fixture cleanup must not enumerate or pattern-match unrelated Auth users.',
  },
  {
    id: 'no_broad_delete_predicate',
    pattern: /\.delete\(\)[\s\S]{0,160}\.(?:neq|not|ilike)\(/,
    detail: 'Cleanup deletes only explicit fixture ids and relationship keys.',
  },
  {
    id: 'no_service_key_logging',
    pattern: /console\.(?:log|error)\([^\n]*serviceRoleKey/,
    detail: 'The service-role credential is never written to console output.',
  },
  {
    id: 'no_public_service_key_fallback',
    pattern: /EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/,
    detail: 'The live proof never treats a client-exposed variable as service authority.',
  },
]);

if (schemaOnly) {
  report.skipped += 1;
  report.results.push({
    category: 'type-drift',
    id: 'generated_type_contracts',
    status: 'skip',
    detail: 'Skipped by --schema-only. Production approval must run without this flag.',
    file: null,
  });
} else {
  const requiredTypeTokens = [
    'emergency_responder_assignments',
    'ambulance_staff_assignments',
    'current_responder_assignment_id',
    'responder_telemetry_sequence',
    'responder_telemetry_lease_expires_at',
    'event_key',
    'get_available_ambulances',
    ...requiredRpcNames,
  ];

  for (const key of ['appTypes', 'appGeneratedTypes', 'consoleTypes']) {
    const content = requireFile(key, 'type-drift');
    for (const token of requiredTypeTokens) {
      const hasToken = content.includes(token);
      record(
        'type-drift',
        `${key}_${token}`,
        hasToken,
        hasToken
          ? `${path.basename(files[key])} contains canonical token ${token}.`
          : `${path.basename(files[key])} is missing canonical token ${token}.`,
        files[key]
      );
    }
  }

  const typeContents = Object.fromEntries(
    ['appTypes', 'appGeneratedTypes', 'consoleTypes'].map((key) => [key, readFile(files[key]) || ''])
  );
  const requiredTableFields = {
    ambulances: [
      'current_call',
      'heading',
      'location_accuracy_meters',
      'location_observed_at',
      'location_received_at',
      'profile_id',
      'telemetry_lease_expires_at',
      'telemetry_sequence',
    ],
    emergency_requests: [
      'current_responder_assignment_id',
      'dispatch_organization_id',
      'patient_acknowledged_arrival_at',
      'responder_location_accuracy_meters',
      'responder_location_observed_at',
      'responder_location_received_at',
      'responder_telemetry_lease_expires_at',
      'responder_telemetry_sequence',
    ],
    emergency_responder_assignments: [
      'ambulance_id',
      'emergency_request_id',
      'offer_expires_at',
      'organization_id',
      'responder_id',
      'status',
      'telemetry_sequence',
    ],
    ambulance_staff_assignments: [
      'ambulance_id',
      'ends_at',
      'organization_id',
      'responder_id',
      'starts_at',
      'status',
    ],
    notifications: ['action_data', 'action_type', 'event_key', 'target_id', 'user_id'],
    stripe_webhook_event_receipts: [
      'attempts',
      'claim_token',
      'event_type',
      'status',
      'stripe_event_id',
    ],
  };

  for (const [tableName, requiredFields] of Object.entries(requiredTableFields)) {
    const fieldsByFile = {};
    for (const key of ['appTypes', 'appGeneratedTypes', 'consoleTypes']) {
      const fields = extractTableRowFields(typeContents[key], tableName);
      fieldsByFile[key] = fields;
      const hasRowBlock = Array.isArray(fields);
      record(
        'type-drift',
        `${key}_${tableName}_row_block`,
        hasRowBlock,
        hasRowBlock
          ? `${key} exposes ${tableName}.Row.`
          : `${key} is missing ${tableName}.Row.`,
        files[key]
      );
      if (!fields) continue;
      const missing = requiredFields.filter((field) => !fields.includes(field));
      record(
        'type-drift',
        `${key}_${tableName}_required_fields`,
        missing.length === 0,
        missing.length === 0
          ? `${key} contains all required ${tableName} fields.`
          : `${key} is missing ${tableName} fields: ${missing.join(', ')}.`,
        files[key]
      );
    }

    const baseline = fieldsByFile.appGeneratedTypes;
    for (const key of ['appTypes', 'consoleTypes']) {
      const candidate = fieldsByFile[key];
      const comparable = Array.isArray(baseline) && Array.isArray(candidate);
      const same = comparable && JSON.stringify(candidate) === JSON.stringify(baseline);
      const missing = comparable ? baseline.filter((field) => !candidate.includes(field)) : [];
      const extra = comparable ? candidate.filter((field) => !baseline.includes(field)) : [];
      record(
        'type-drift',
        `${key}_${tableName}_parity`,
        same,
        !comparable
          ? `${key} ${tableName} cannot be compared because a Row block is missing.`
          : same
          ? `${key} matches the generated ${tableName}.Row contract.`
          : `${key} ${tableName} drift: missing [${missing.join(', ')}], extra [${extra.join(', ')}].`,
        files[key]
      );
    }
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (report.failed > 0) {
  console.error(
    `[emergency-dispatch-live-contract] FAIL ${report.failed} check(s); ${report.passed} passed, ${report.skipped} skipped.`
  );
  console.error(`[emergency-dispatch-live-contract] Report: ${reportPath}`);
  process.exit(1);
}

console.log(
  `[emergency-dispatch-live-contract] PASS ${report.passed} check(s); ${report.skipped} skipped.`
);
console.log(`[emergency-dispatch-live-contract] Report: ${reportPath}`);
