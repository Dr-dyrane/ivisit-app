#!/usr/bin/env node

const crypto = require('crypto');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const appRoot = path.resolve(__dirname, '..', '..', '..');
const linkedRefPath = path.join(appRoot, 'supabase', '.temp', 'project-ref');
const reportPath = path.join(
  appRoot,
  'supabase',
  'tests',
  'artifacts',
  'emergency_dispatch_live_e2e_report.json'
);
const confirmationEnv = 'IVISIT_EMERGENCY_LIVE_E2E';

function parseArgs(argv) {
  const projectRefArg = argv.find((arg) => arg.startsWith('--project-ref='));
  return {
    apply: argv.includes('--apply'),
    projectRef: projectRefArg ? projectRefArg.slice('--project-ref='.length).trim() : null,
  };
}

function parseEnvFile(content) {
  const values = {};
  for (const rawLine of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadEnvFiles() {
  const candidates = [
    path.join(appRoot, '.env.local'),
    path.join(appRoot, '.env'),
    path.resolve(appRoot, '..', 'ivisit-app', '.env.local'),
    path.resolve(appRoot, '..', 'ivisit-app', '.env'),
    path.resolve(appRoot, '..', 'ivisit-console', 'frontend', '.env.local'),
    path.resolve(appRoot, '..', 'ivisit-console', 'frontend', '.env'),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const values = parseEnvFile(fs.readFileSync(filePath, 'utf8'));
    for (const [key, value] of Object.entries(values)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function readLinkedProjectRef() {
  if (!fs.existsSync(linkedRefPath)) return null;
  return fs.readFileSync(linkedRefPath, 'utf8').trim() || null;
}

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function loadSupabaseClient() {
  try {
    return require('@supabase/supabase-js');
  } catch (firstError) {
    const siblingPackage = path.resolve(appRoot, '..', 'ivisit-app', 'package.json');
    if (!fs.existsSync(siblingPackage)) throw firstError;
    return createRequire(siblingPackage)('@supabase/supabase-js');
  }
}

function decodeJwtPayload(token) {
  try {
    const encoded = token.split('.')[1];
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

function unique(values) {
  let source = [];
  if (typeof values === 'string') source = [values];
  else if (values !== null && values !== undefined) source = Array.from(values);
  return [...new Set(source.filter(Boolean))];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function isMissingContractError(error) {
  if (!error) return false;
  const text = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
  return /PGRST202|PGRST204|schema cache|could not find the function|column .* does not exist|relation .* does not exist/i.test(
    text
  );
}

function safeDetail(value) {
  if (value === null || value === undefined) return null;
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return { count: value.length };
  if (typeof value === 'object') {
    const safe = {};
    for (const key of [
      'success',
      'code',
      'already_received',
      'already_offered',
      'already_accepted',
      'already_arrived',
      'already_completed',
      'already_staffed',
      'auto_assigned',
      'queued',
      'request_status',
      'assignment_status',
      'state',
    ]) {
      if (Object.prototype.hasOwnProperty.call(value, key)) safe[key] = value[key];
    }
    return Object.keys(safe).length > 0 ? safe : null;
  }
  return null;
}

const options = parseArgs(process.argv.slice(2));
loadEnvFiles();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || null;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const linkedProjectRef = readLinkedProjectRef();
const urlProjectRef = supabaseUrl ? projectRefFromUrl(supabaseUrl) : null;

const plannedProofs = [
  'linked-project and deployed-contract preflight',
  'patient, responder, dispatcher, org-admin, cross-org, and anonymous RLS',
  'same-org standalone ambulance discovery and cross-org assignment denial',
  'controlled JSON for malformed telemetry without a SQL error',
  'Console create hard-pinned to pending_approval and pending',
  'two independent dispatcher sessions offering and responder sessions accepting concurrently',
  'service-role completion through the Console command path',
  'Realtime owner delivery and cross-org suppression',
  'accept, telemetry, arrival, acknowledgement, completion, and retry idempotency',
  'backend notification event-key idempotency',
  'private and public Storage ownership boundaries',
  'payment gate, unavailable-fleet fallback, responder decline, and requeue',
  'exact fixture cleanup followed by zero-residue assertions',
];

const requiredDeployedRpcNames = [
  'get_available_ambulances',
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

if (!options.apply) {
  console.log('[emergency-dispatch-live-e2e] SKIP: live mutation was not approved.');
  console.log(
    JSON.stringify(
      {
        mode: 'dry-run',
        linked_project_ref: linkedProjectRef,
        url_project_ref: urlProjectRef,
        requested_project_ref: options.projectRef,
        credentials_present: {
          supabase_url: Boolean(supabaseUrl),
          anon_key: Boolean(anonKey),
          service_role_key: Boolean(serviceRoleKey),
          confirmation: process.env[confirmationEnv] || null,
        },
        required_apply_command:
          'node supabase/tests/scripts/run_emergency_dispatch_live_e2e.js --project-ref=<linked-ref> --apply',
        required_confirmation: `${confirmationEnv}=<linked-ref>`,
        planned_proofs: plannedProofs,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const gateFailures = [];
if (!supabaseUrl) gateFailures.push('EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL');
if (!anonKey) gateFailures.push('EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
if (!serviceRoleKey) gateFailures.push('SUPABASE_SERVICE_ROLE_KEY');
if (!linkedProjectRef) gateFailures.push(`linked project ref at ${linkedRefPath}`);
if (!options.projectRef) gateFailures.push('--project-ref=<linked-ref>');
if (options.projectRef && linkedProjectRef && options.projectRef !== linkedProjectRef) {
  gateFailures.push('requested project ref does not match the linked project');
}
if (options.projectRef && urlProjectRef && options.projectRef !== urlProjectRef) {
  gateFailures.push('requested project ref does not match the Supabase URL');
}
if (process.env[confirmationEnv] !== options.projectRef) {
  gateFailures.push(`${confirmationEnv} must exactly equal --project-ref`);
}
if (supabaseUrl && /localhost|127\.0\.0\.1/i.test(supabaseUrl)) {
  gateFailures.push('the production proof target must be a linked remote project, not localhost');
}

if (gateFailures.length > 0) {
  console.error('[emergency-dispatch-live-e2e] Refusing live writes:');
  for (const failure of gateFailures) console.error(`- ${failure}`);
  process.exit(2);
}

const staticGatePath = path.join(
  appRoot,
  'supabase',
  'tests',
  'scripts',
  'assert_emergency_dispatch_live_contract.js'
);
const staticGate = spawnSync(process.execPath, [staticGatePath], {
  cwd: appRoot,
  encoding: 'utf8',
  env: process.env,
});
if (staticGate.status !== 0) {
  console.error('[emergency-dispatch-live-e2e] Refusing live writes: local production contract gate is red.');
  if (staticGate.stdout?.trim()) console.error(staticGate.stdout.trim());
  if (staticGate.stderr?.trim()) console.error(staticGate.stderr.trim());
  process.exit(3);
}

const { createClient } = loadSupabaseClient();
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
const tag = `dispatch-live-${runId}`;
const password = `LiveProof!${crypto.randomBytes(18).toString('base64url')}`;
const startedAt = new Date().toISOString();
const fixtureLocation = Object.freeze({ lat: -0.123456, lng: -140.654321 });

function fixturePoint(latOffset = 0, lngOffset = 0) {
  return {
    lat: fixtureLocation.lat + latOffset,
    lng: fixtureLocation.lng + lngOffset,
  };
}

const state = {
  authUserIds: new Set(),
  entityIds: new Set(),
  organizationIds: new Set(),
  organizationWalletIds: new Set(),
  patientWalletIds: new Set(),
  hospitalIds: new Set(),
  ambulanceIds: new Set(),
  staffingIds: new Set(),
  requestIds: new Set(),
  paymentIds: new Set(),
  visitIds: new Set(),
  assignmentIds: new Set(),
  notificationIds: new Set(),
  eventKeys: new Set(),
  recipientScopedEventKeys: new Set(),
  adminAuditIds: new Set(),
  activityIds: new Set(),
  realtimeChannels: new Set(),
  storage: {
    images: new Set(),
    documents: new Set(),
  },
};

const report = {
  target_project_ref: options.projectRef,
  run_id: runId,
  tag,
  started_at: startedAt,
  finished_at: null,
  passed: 0,
  failed: 0,
  cleanup_passed: false,
  zero_residue_passed: false,
  sessions: {},
  fixture: {},
  results: [],
  cleanup: [],
};

function record(name, category, status, detail = null) {
  report.results.push({ name, category, status, detail: safeDetail(detail) });
  if (status === 'pass') {
    report.passed += 1;
    console.log(`[emergency-dispatch-live-e2e] PASS ${name}`);
  } else {
    report.failed += 1;
    console.error(`[emergency-dispatch-live-e2e] FAIL ${name}: ${detail}`);
  }
}

async function check(name, category, operation) {
  try {
    const detail = await operation();
    record(name, category, 'pass', detail);
    return detail;
  } catch (error) {
    record(name, category, 'fail', error.message);
    throw error;
  }
}

async function safely(label, operation) {
  try {
    await operation();
    report.cleanup.push({ label, status: 'pass' });
  } catch (error) {
    report.cleanup.push({ label, status: 'fail', error: error.message });
  }
}

function testEmail(label) {
  return `${tag}-${label}@ivisit-e2e.local`;
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { data, error } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (data) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Auth trigger did not create profile ${userId}`);
}

async function signIn(email) {
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const accessToken = data.session.access_token;
  const claims = decodeJwtPayload(accessToken);
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.realtime.setAuth(accessToken);
  return {
    client,
    sessionId: claims.session_id || claims.sid || null,
  };
}

async function createActor({ label, role, organizationId = null, providerType = null, sessions = 1 }) {
  const email = testEmail(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${label} ${tag}` },
  });
  if (error) throw error;

  const userId = data.user.id;
  state.authUserIds.add(userId);
  state.entityIds.add(userId);
  await waitForProfile(userId);

  const patch = {
    role,
    organization_id: organizationId,
    onboarding_status: 'complete',
    full_name: `${label} ${tag}`,
  };
  if (providerType) patch.provider_type = providerType;

  const { error: profileError } = await admin.from('profiles').update(patch).eq('id', userId);
  if (profileError) throw profileError;

  const signedIn = [];
  for (let index = 0; index < sessions; index += 1) signedIn.push(await signIn(email));

  return {
    id: userId,
    email,
    clients: signedIn.map((entry) => entry.client),
    sessionIds: signedIn.map((entry) => entry.sessionId),
  };
}

async function insertOrganization(label, organizationType = 'hospital') {
  const { data, error } = await admin
    .from('organizations')
    .insert({
      name: `${label} ${tag}`,
      organization_type: organizationType,
      registration_number: `${tag}-${label}`,
      contact_email: testEmail(`${label}-contact`),
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      is_active: true,
    })
    .select('id,name')
    .single();
  if (error) throw error;
  state.organizationIds.add(data.id);
  state.entityIds.add(data.id);
  return data;
}

async function insertHospital(organizationId) {
  const { data, error } = await admin
    .from('hospitals')
    .insert({
      organization_id: organizationId,
      name: `Dispatch Proof Hospital ${tag}`,
      address: `1 ${tag} Way`,
      latitude: fixtureLocation.lat,
      longitude: fixtureLocation.lng,
      coordinates: `SRID=4326;POINT(${fixtureLocation.lng} ${fixtureLocation.lat})`,
      status: 'available',
      verified: true,
      verification_status: 'verified',
      emergency_eligible: true,
      provider_type: 'hospital',
      available_beds: 10,
      total_beds: 20,
      ambulances_count: 1,
      timezone: 'UTC',
      timezone_confirmed_at: new Date().toISOString(),
      timezone_confirmation_source: 'manual',
    })
    .select('id,name,organization_id,dispatch_eligible')
    .single();
  if (error) throw error;
  state.hospitalIds.add(data.id);
  state.entityIds.add(data.id);
  return data;
}

async function insertAmbulance({ organizationId, hospitalId, label = 'unit' }) {
  const unitLabel = label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
  const { data, error } = await admin
    .from('ambulances')
    .insert({
      organization_id: organizationId,
      hospital_id: hospitalId,
      type: 'BLS',
      call_sign: `LIVE-${unitLabel}-${runId.slice(-8)}`,
      vehicle_number: `${unitLabel}-${runId.slice(-6)}`,
      license_plate: `${unitLabel}-${runId.slice(-5)}`,
      status: 'available',
    })
    .select('id,status,call_sign')
    .single();
  if (error) throw error;
  state.ambulanceIds.add(data.id);
  state.entityIds.add(data.id);
  return data;
}

async function createCardRequest({ actor, hospital, label }) {
  const { data, error } = await actor.clients[0].rpc('create_emergency_v4', {
    p_user_id: actor.id,
    p_request_data: {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      service_type: 'ambulance',
      specialty: 'Emergency Medicine',
      ambulance_type: 'basic',
      patient_location: fixturePoint(),
      patient_snapshot: { fullName: `${label} ${tag}`, testTag: tag },
      transition_reason: `live_proof_${label}`,
    },
    p_payment_data: {
      method: 'card',
      method_id: `${tag}-${label}-method`,
      total_amount: 150,
      currency: 'USD',
    },
  });
  if (error) throw error;
  assert(data?.success === true, `Emergency creation failed: ${JSON.stringify(data)}`);

  state.requestIds.add(data.request_id);
  state.entityIds.add(data.request_id);
  state.paymentIds.add(data.payment_id);
  state.entityIds.add(data.payment_id);
  state.eventKeys.add(`emergency_request:${data.request_id}:created`);

  const { data: scopedRequest, error: scopeError } = await admin
    .from('emergency_requests')
    .update({ dispatch_organization_id: hospital.organization_id })
    .eq('id', data.request_id)
    .eq('hospital_id', hospital.id)
    .select('id,dispatch_organization_id')
    .single();
  if (scopeError) throw scopeError;
  assert(
    scopedRequest.dispatch_organization_id === hospital.organization_id,
    'Fixture request was not isolated to its generated organization'
  );

  const { data: visits, error: visitsError } = await admin
    .from('visits')
    .select('id')
    .eq('request_id', data.request_id);
  if (visitsError) throw visitsError;
  for (const visit of visits || []) {
    state.visitIds.add(visit.id);
    state.entityIds.add(visit.id);
  }

  const paymentIntentId = `pi_${tag.replace(/[^a-zA-Z0-9]/g, '')}_${label}`;
  const { error: paymentPatchError } = await admin
    .from('payments')
    .update({ stripe_payment_intent_id: paymentIntentId })
    .eq('id', data.payment_id);
  if (paymentPatchError) throw paymentPatchError;

  return { ...data, paymentIntentId };
}

async function createCashRequest({ actor, hospital, label }) {
  const { data, error } = await actor.clients[0].rpc('create_emergency_v4', {
    p_user_id: actor.id,
    p_request_data: {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      service_type: 'ambulance',
      specialty: 'Emergency Medicine',
      ambulance_type: 'basic',
      patient_location: fixturePoint(0.0001, 0.0001),
      patient_snapshot: { fullName: `${label} ${tag}`, testTag: tag },
      transition_reason: `live_proof_${label}`,
    },
    p_payment_data: {
      method: 'cash',
      method_id: `${tag}-${label}-cash`,
      total_amount: 150,
      currency: 'USD',
    },
  });
  if (error) throw error;
  assert(data?.success === true, `Cash emergency creation failed: ${JSON.stringify(data)}`);
  assert(data.requires_approval === true, 'Cash request did not require operator approval');

  state.requestIds.add(data.request_id);
  state.entityIds.add(data.request_id);
  state.paymentIds.add(data.payment_id);
  state.entityIds.add(data.payment_id);
  state.eventKeys.add(`emergency_request:${data.request_id}:created`);
  state.recipientScopedEventKeys.add(
    `emergency_request:${data.request_id}:payment:${data.payment_id}:cash_approval_required`
  );
  return data;
}

async function createWalletRequest({ actor, hospital, label }) {
  const { data, error } = await actor.clients[0].rpc('create_emergency_v4', {
    p_user_id: actor.id,
    p_request_data: {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      service_type: 'bed',
      specialty: 'Emergency Medicine',
      patient_location: fixturePoint(0.00015, 0.00015),
      patient_snapshot: { fullName: `${label} ${tag}`, testTag: tag },
      transition_reason: `live_proof_${label}`,
    },
    p_payment_data: {
      method: 'wallet',
      method_id: `${tag}-${label}-wallet`,
      total_amount: 200,
      currency: 'USD',
    },
  });
  if (error) throw error;
  assert(data?.success === true, `Wallet emergency creation failed: ${JSON.stringify(data)}`);
  assert(data.requires_wallet_settlement === true, 'Wallet request did not require patient settlement');

  state.requestIds.add(data.request_id);
  state.entityIds.add(data.request_id);
  state.paymentIds.add(data.payment_id);
  state.entityIds.add(data.payment_id);
  state.eventKeys.add(`emergency_request:${data.request_id}:created`);

  const { data: visits, error: visitsError } = await admin
    .from('visits')
    .select('id')
    .eq('request_id', data.request_id);
  if (visitsError) throw visitsError;
  for (const visit of visits || []) {
    state.visitIds.add(visit.id);
    state.entityIds.add(visit.id);
  }

  return data;
}

async function trackUnexpectedEmergencyCreation(data) {
  if (!data?.request_id) return;
  state.requestIds.add(data.request_id);
  state.entityIds.add(data.request_id);
  if (data.payment_id) {
    state.paymentIds.add(data.payment_id);
    state.entityIds.add(data.payment_id);
  }

  const { data: visits, error } = await admin
    .from('visits')
    .select('id')
    .eq('request_id', data.request_id);
  if (error) throw error;
  for (const visit of visits || []) {
    state.visitIds.add(visit.id);
    state.entityIds.add(visit.id);
  }
}

async function getRequest(requestId) {
  const { data, error } = await admin
    .from('emergency_requests')
    .select(
      'id,status,payment_status,payment_id,ambulance_id,current_responder_assignment_id,responder_id,dispatch_organization_id,patient_acknowledged_arrival_at'
    )
    .eq('id', requestId)
    .single();
  if (error) throw error;
  return data;
}

async function getAssignment(assignmentId) {
  const { data, error } = await admin
    .from('emergency_responder_assignments')
    .select('id,status,emergency_request_id,ambulance_id,responder_id,accepted_at,arrived_at,completed_at')
    .eq('id', assignmentId)
    .single();
  if (error) throw error;
  return data;
}

async function visibleRows(client, table, column, value) {
  return client.from(table).select('*').eq(column, value);
}

function expectDenied(result, label) {
  assert(result?.error, `${label} unexpectedly succeeded`);
}

function expectDeniedOrHidden(result, label) {
  if (result?.error) return;
  expectHidden(result, label);
}

function expectHidden(result, label) {
  if (result.error) throw result.error;
  assert(asArray(result.data).length === 0, `${label} leaked ${asArray(result.data).length} row(s)`);
}

function expectVisible(result, label, count = 1) {
  if (result.error) throw result.error;
  assert(asArray(result.data).length === count, `${label} expected ${count} row(s)`);
}

async function countRows(table, column, value, extra = null) {
  let query = admin.from(table).select('id', { count: 'exact', head: true }).eq(column, value);
  if (extra) query = extra(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function eventCount(eventKey) {
  return countRows('notifications', 'event_key', eventKey);
}

async function storageObjectExists(bucket, objectPath) {
  const slash = objectPath.lastIndexOf('/');
  const folder = slash >= 0 ? objectPath.slice(0, slash) : '';
  const fileName = slash >= 0 ? objectPath.slice(slash + 1) : objectPath;
  const { data, error } = await admin.storage.from(bucket).list(folder, { search: fileName, limit: 10 });
  if (error) throw error;
  return asArray(data).some((row) => row.name === fileName);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function closeRealtimeProbe(probe) {
  if (!probe?.channel) return;
  await probe.client.removeChannel(probe.channel);
  state.realtimeChannels.delete(probe);
}

async function openRealtimeUpdateProbe(client, { table, id, label }) {
  const events = [];
  const probe = { client, channel: null, events };
  const channelName = `${tag}-${label}-${crypto.randomBytes(4).toString('hex')}`;

  const subscribed = new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Realtime subscription timed out for ${label}`));
    }, 10_000);

    const settle = (operation) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      operation();
    };

    probe.channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${id}` },
        (payload) => events.push(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') settle(resolve);
        if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          settle(() => reject(new Error(`Realtime subscription ${label} entered ${status}`)));
        }
      });
  });

  state.realtimeChannels.add(probe);
  try {
    await subscribed;
    return probe;
  } catch (error) {
    await closeRealtimeProbe(probe);
    throw error;
  }
}

async function waitForRealtimeEvent(probe, predicate, label) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const event = probe.events.find(predicate);
    if (event) return event;
    await delay(100);
  }
  throw new Error(`Realtime event did not arrive for ${label}`);
}

async function assertPostgrestOpenApiContract() {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/openapi+json',
    },
  });
  if (!response.ok) {
    throw new Error(`PostgREST OpenAPI preflight returned HTTP ${response.status}`);
  }

  const document = await response.json();
  for (const rpcName of requiredDeployedRpcNames) {
    assert(document.paths?.[`/rpc/${rpcName}`], `Deployed PostgREST contract is missing ${rpcName}`);
  }
}

async function collectGeneratedFixtureIds() {
  const requestIds = [...state.requestIds];
  if (requestIds.length > 0) {
    const visitResult = await admin.from('visits').select('id').in('request_id', requestIds);
    if (visitResult.error) throw visitResult.error;
    for (const row of visitResult.data || []) {
      state.visitIds.add(row.id);
      state.entityIds.add(row.id);
    }

    const assignmentResult = await admin
      .from('emergency_responder_assignments')
      .select('id')
      .in('emergency_request_id', requestIds);
    if (assignmentResult.error) throw assignmentResult.error;
    for (const row of assignmentResult.data || []) {
      state.assignmentIds.add(row.id);
      state.entityIds.add(row.id);
    }

    const paymentResult = await admin
      .from('payments')
      .select('id')
      .in('emergency_request_id', requestIds);
    if (paymentResult.error) throw paymentResult.error;
    for (const row of paymentResult.data || []) {
      state.paymentIds.add(row.id);
      state.entityIds.add(row.id);
    }
  }

  const ambulanceIds = [...state.ambulanceIds];
  if (ambulanceIds.length > 0) {
    const { data, error } = await admin
      .from('ambulance_staff_assignments')
      .select('id')
      .in('ambulance_id', ambulanceIds);
    if (error) throw error;
    for (const row of data || []) {
      state.staffingIds.add(row.id);
      state.entityIds.add(row.id);
    }
  }

  const trackedEventKeys = new Set([...state.eventKeys, ...state.recipientScopedEventKeys]);
  for (const eventKey of trackedEventKeys) {
    const { data, error } = await admin.from('notifications').select('id').eq('event_key', eventKey);
    if (error) throw error;
    for (const row of data || []) {
      state.notificationIds.add(row.id);
      state.entityIds.add(row.id);
    }
  }

  const notificationTargetIds = unique([...state.entityIds]);
  if (notificationTargetIds.length > 0) {
    const { data, error } = await admin
      .from('notifications')
      .select('id')
      .in('target_id', notificationTargetIds);
    if (error) throw error;
    for (const row of data || []) {
      state.notificationIds.add(row.id);
      state.entityIds.add(row.id);
    }
  }

  const fixtureUserIds = [...state.authUserIds];
  if (fixtureUserIds.length > 0) {
    const { data, error } = await admin
      .from('notifications')
      .select('id')
      .in('user_id', fixtureUserIds);
    if (error) throw error;
    for (const row of data || []) {
      state.notificationIds.add(row.id);
      state.entityIds.add(row.id);
    }
  }

  if (fixtureUserIds.length > 0) {
    const { data, error } = await admin
      .from('admin_audit_log')
      .select('id')
      .in('admin_id', fixtureUserIds);
    if (error) throw error;
    for (const row of data || []) state.adminAuditIds.add(row.id);
  }

  const userIds = [...state.authUserIds];
  if (userIds.length > 0) {
    const { data, error } = await admin.from('user_activity').select('id').in('user_id', userIds);
    if (error) throw error;
    for (const row of data || []) state.activityIds.add(row.id);
  }

  const organizationIds = [...state.organizationIds];
  if (organizationIds.length > 0) {
    const { data, error } = await admin
      .from('organization_wallets')
      .select('id')
      .in('organization_id', organizationIds);
    if (error) throw error;
    for (const row of data || []) {
      state.organizationWalletIds.add(row.id);
      state.entityIds.add(row.id);
    }
  }

  if (fixtureUserIds.length > 0) {
    const { data, error } = await admin
      .from('patient_wallets')
      .select('id')
      .in('user_id', fixtureUserIds);
    if (error) throw error;
    for (const row of data || []) {
      state.patientWalletIds.add(row.id);
      state.entityIds.add(row.id);
    }
  }
}

function uuidSqlList(values) {
  const ids = unique(values);
  for (const id of ids) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error(`Refusing cleanup SQL for invalid UUID: ${id}`);
    }
  }
  return ids.map((id) => `'${id}'::uuid`).join(', ');
}

async function deleteRequestGraphs() {
  const requestIds = [...state.requestIds];
  if (requestIds.length === 0) return;
  const ids = uuidSqlList(requestIds);
  const sql = `
DO $$
BEGIN
  ALTER TABLE public.emergency_requests DISABLE TRIGGER on_emergency_start_dispatch;
  ALTER TABLE public.emergency_responder_assignments
    DISABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_status_transitions
    DISABLE TRIGGER trg_emergency_status_transitions_append_only;

  DELETE FROM public.emergency_responder_assignments
  WHERE emergency_request_id IN (${ids});

  DELETE FROM public.emergency_status_transitions
  WHERE emergency_request_id IN (${ids});

  DELETE FROM public.emergency_requests
  WHERE id IN (${ids});

  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  ALTER TABLE public.emergency_responder_assignments
    ENABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_requests ENABLE TRIGGER on_emergency_start_dispatch;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  ALTER TABLE public.emergency_responder_assignments
    ENABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_requests ENABLE TRIGGER on_emergency_start_dispatch;
  RAISE;
END;
$$;
  `;
  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'request graph cleanup was rejected');
}

async function deleteIds(table, ids) {
  const values = unique(ids);
  if (values.length === 0) return;
  const { error } = await admin.from(table).delete().in('id', values);
  if (error) throw error;
}

async function removeFixtureWalletLedgerEffects() {
  const paymentIds = [...state.paymentIds];
  if (paymentIds.length === 0) return;
  const ids = uuidSqlList(paymentIds);
  const sql = `
WITH fixture_platform_credits AS (
  SELECT ledger.wallet_id, SUM(ledger.amount) AS amount
  FROM public.wallet_ledger ledger
  INNER JOIN public.ivisit_main_wallet wallet ON wallet.id = ledger.wallet_id
  WHERE ledger.reference_id IN (${ids})
  GROUP BY ledger.wallet_id
), reversed_platform_credits AS (
  UPDATE public.ivisit_main_wallet wallet
  SET balance = COALESCE(wallet.balance, 0) - fixture.amount,
      last_updated = NOW()
  FROM fixture_platform_credits fixture
  WHERE wallet.id = fixture.wallet_id
  RETURNING wallet.id
)
DELETE FROM public.wallet_ledger
WHERE reference_id IN (${ids});
  `;
  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'wallet ledger fixture cleanup was rejected');
}

async function cleanupFixture() {
  for (const probe of [...state.realtimeChannels]) {
    await safely('close exact Realtime proof channel', () => closeRealtimeProbe(probe));
  }

  await safely('collect generated fixture ids', collectGeneratedFixtureIds);

  for (const [bucket, paths] of Object.entries(state.storage)) {
    await safely(`remove exact ${bucket} objects`, async () => {
      const values = [...paths];
      if (values.length === 0) return;
      const { error } = await admin.storage.from(bucket).remove(values);
      if (error) throw error;
    });
  }

  await safely('delete exact notifications', () => deleteIds('notifications', state.notificationIds));
  await safely('delete exact user activity', () => deleteIds('user_activity', state.activityIds));
  await safely('delete exact admin audit rows', () => deleteIds('admin_audit_log', state.adminAuditIds));
  await safely('delete exact insurance billing', async () => {
    const ids = [...state.requestIds];
    if (!ids.length) return;
    const { error } = await admin.from('insurance_billing').delete().in('emergency_request_id', ids);
    if (error) throw error;
  });
  await safely('delete exact doctor assignments', async () => {
    const ids = [...state.requestIds];
    if (!ids.length) return;
    const { error } = await admin
      .from('emergency_doctor_assignments')
      .delete()
      .in('emergency_request_id', ids);
    if (error) throw error;
  });
  await safely('delete exact visits', () => deleteIds('visits', state.visitIds));
  await safely('remove exact wallet ledger effects', removeFixtureWalletLedgerEffects);
  await safely('delete exact emergency request graphs', deleteRequestGraphs);
  await safely('delete exact payments', () => deleteIds('payments', state.paymentIds));
  await safely('delete exact patient wallets', () => deleteIds('patient_wallets', state.patientWalletIds));
  await safely('delete exact staffing rows', () => deleteIds('ambulance_staff_assignments', state.staffingIds));
  await safely('delete exact ambulances', () => deleteIds('ambulances', state.ambulanceIds));
  await safely('delete exact hospitals', () => deleteIds('hospitals', state.hospitalIds));
  await safely('delete exact organization wallets', () =>
    deleteIds('organization_wallets', state.organizationWalletIds)
  );
  await safely('delete exact organizations', () => deleteIds('organizations', state.organizationIds));
  await safely('delete exact display mappings', async () => {
    const ids = [...state.entityIds];
    if (!ids.length) return;
    const { error } = await admin.from('id_mappings').delete().in('entity_id', ids);
    if (error) throw error;
  });

  for (const userId of state.authUserIds) {
    await safely(`delete auth user ${userId}`, async () => {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    });
  }

  report.cleanup_passed = report.cleanup.every((item) => item.status === 'pass');
}

async function assertNoRows(table, column, values) {
  const ids = unique(values);
  if (ids.length === 0) return;
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .in(column, ids);
  if (error) throw error;
  assert(count === 0, `${table} retained ${count} fixture row(s)`);
}

async function assertZeroResidue() {
  await assertNoRows('emergency_requests', 'id', state.requestIds);
  await assertNoRows('emergency_responder_assignments', 'emergency_request_id', state.requestIds);
  await assertNoRows('emergency_status_transitions', 'emergency_request_id', state.requestIds);
  await assertNoRows('emergency_doctor_assignments', 'emergency_request_id', state.requestIds);
  await assertNoRows('emergency_chat_rooms', 'emergency_request_id', state.requestIds);
  await assertNoRows('insurance_billing', 'emergency_request_id', state.requestIds);
  await assertNoRows('visits', 'id', state.visitIds);
  await assertNoRows('visits', 'request_id', state.requestIds);
  await assertNoRows('payments', 'id', state.paymentIds);
  await assertNoRows('payments', 'emergency_request_id', state.requestIds);
  await assertNoRows('wallet_ledger', 'reference_id', state.paymentIds);
  await assertNoRows(
    'notifications',
    'event_key',
    new Set([...state.eventKeys, ...state.recipientScopedEventKeys])
  );
  await assertNoRows('notifications', 'id', state.notificationIds);
  await assertNoRows('notifications', 'user_id', state.authUserIds);
  await assertNoRows('notifications', 'target_id', state.entityIds);
  await assertNoRows('ambulance_staff_assignments', 'id', state.staffingIds);
  await assertNoRows('ambulance_staff_assignments', 'ambulance_id', state.ambulanceIds);
  await assertNoRows('ambulance_staff_assignments', 'responder_id', state.authUserIds);
  await assertNoRows('ambulances', 'id', state.ambulanceIds);
  await assertNoRows('hospitals', 'id', state.hospitalIds);
  await assertNoRows('organization_wallets', 'id', state.organizationWalletIds);
  await assertNoRows('organization_wallets', 'organization_id', state.organizationIds);
  await assertNoRows('patient_wallets', 'id', state.patientWalletIds);
  await assertNoRows('patient_wallets', 'user_id', state.authUserIds);
  await assertNoRows('organizations', 'id', state.organizationIds);
  await assertNoRows('id_mappings', 'entity_id', state.entityIds);
  await assertNoRows('profiles', 'id', state.authUserIds);
  await assertNoRows('preferences', 'user_id', state.authUserIds);
  await assertNoRows('medical_profiles', 'user_id', state.authUserIds);
  await assertNoRows('user_activity', 'id', state.activityIds);
  await assertNoRows('user_activity', 'user_id', state.authUserIds);
  await assertNoRows('admin_audit_log', 'id', state.adminAuditIds);
  await assertNoRows('admin_audit_log', 'admin_id', state.authUserIds);

  for (const [bucket, paths] of Object.entries(state.storage)) {
    for (const objectPath of paths) {
      assert(!(await storageObjectExists(bucket, objectPath)), `${bucket}/${objectPath} remains`);
    }
  }

  for (const userId of state.authUserIds) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error && !/not found/i.test(error.message || '')) throw error;
    assert(!data?.user, `auth.users retained ${userId}`);
  }

  report.zero_residue_passed = true;
}

async function preflightLiveContract() {
  await assertPostgrestOpenApiContract();

  const selections = [
    [
      'ambulances',
      'id,profile_id,organization_id,hospital_id,status,heading,location_accuracy_meters,location_observed_at,location_received_at,telemetry_sequence,telemetry_lease_expires_at,current_call',
    ],
    [
      'emergency_requests',
      'id,current_responder_assignment_id,dispatch_organization_id,responder_location_accuracy_meters,responder_location_observed_at,responder_location_received_at,responder_telemetry_sequence,responder_telemetry_lease_expires_at,patient_acknowledged_arrival_at',
    ],
    [
      'emergency_responder_assignments',
      'id,emergency_request_id,ambulance_id,responder_id,organization_id,status,offer_expires_at,telemetry_sequence',
    ],
    ['ambulance_staff_assignments', 'id,ambulance_id,responder_id,organization_id,status,starts_at,ends_at'],
    ['organizations', 'id,organization_type'],
    ['notifications', 'id,user_id,event_key,action_type,action_data,target_id'],
    ['stripe_webhook_event_receipts', 'id,stripe_event_id,event_type,status,attempts,claim_token'],
  ];

  for (const [table, columns] of selections) {
    const { error } = await admin.from(table).select(columns).limit(0);
    if (error) throw new Error(`${table} contract is unavailable: ${error.message}`);
  }

  for (const bucket of ['images', 'documents']) {
    const { data, error } = await admin.storage.getBucket(bucket);
    if (error) throw new Error(`${bucket} Storage bucket is unavailable: ${error.message}`);
    if (bucket === 'documents') assert(data.public === false, 'documents bucket must be private');
  }

  const missingId = crypto.randomUUID();
  const probes = [
    ['get_available_ambulances', { p_hospital_id: null, p_radius_km: 1, p_specialty: null }],
    ['get_ambulance_dispatch_readiness', { p_ambulance_id: missingId, p_request_id: null }],
    ['staff_ambulance_responder', { p_ambulance_id: missingId, p_responder_id: missingId }],
    ['offer_responder_assignment', { p_request_id: missingId, p_ambulance_id: missingId }],
    ['responder_accept_emergency', { p_request_id: missingId }],
    ['responder_arrive_emergency', { p_request_id: missingId }],
    ['responder_complete_emergency', { p_request_id: missingId }],
    ['responder_decline_emergency', { p_request_id: missingId, p_reason: 'preflight-only' }],
    [
      'dispatcher_release_responder_assignment',
      { p_request_id: missingId, p_reason: 'preflight-only' },
    ],
    ['patient_acknowledge_responder_arrival', { p_request_id: missingId }],
    ['get_responder_telemetry_state', { p_request_id: missingId }],
    ['get_current_emergency_responder', { p_request_id: missingId }],
    ['report_responder_telemetry', { p_payload: {} }],
    ['get_driver_dispatch_feed', {}],
    [
      'assign_ambulance_to_emergency',
      { p_emergency_request_id: missingId, p_ambulance_id: missingId, p_priority: 1 },
    ],
    ['console_complete_emergency', { p_request_id: missingId }],
  ];

  for (const [name, args] of probes) {
    const result = await admin.rpc(name, args);
    if (isMissingContractError(result.error)) {
      throw new Error(`${name} is missing or stale: ${result.error.message}`);
    }
  }
}

async function runProof() {
  const fixtures = {};
  let primaryError = null;

  try {
    await check('deployed schema, RPCs, and Storage match the dispatch contract', 'contract-drift', preflightLiveContract);

    fixtures.orgA = await check('create isolated verified dispatch organization', 'fixture', () =>
      insertOrganization('Dispatch Org A')
    );
    fixtures.orgB = await check('create isolated cross-scope organization', 'fixture', () =>
      insertOrganization('Dispatch Org B')
    );
    fixtures.standaloneOrg = await check('create isolated standalone ambulance organization', 'fixture', () =>
      insertOrganization('Standalone Ambulance Org', 'ambulance_service')
    );
    fixtures.hospital = await check('create isolated dispatch-eligible hospital', 'fixture', () =>
      insertHospital(fixtures.orgA.id)
    );
    assert(fixtures.hospital.dispatch_eligible === true, 'Hospital trigger did not mark dispatch eligibility');

    fixtures.patientA = await check('create patient A actor', 'fixture', () =>
      createActor({ label: 'patient-a', role: 'patient', sessions: 2 })
    );
    fixtures.patientB = await check('create patient B actor', 'fixture', () =>
      createActor({ label: 'patient-b', role: 'patient' })
    );
    fixtures.consolePatient = await check('create Console-created request patient', 'fixture', () =>
      createActor({ label: 'console-patient', role: 'patient' })
    );
    fixtures.driverA = await check('create two-session driver actor', 'fixture', () =>
      createActor({
        label: 'driver-a',
        role: 'provider',
        organizationId: fixtures.orgA.id,
        providerType: 'driver',
        sessions: 2,
      })
    );
    fixtures.driverB = await check('create cross-organization driver actor', 'fixture', () =>
      createActor({
        label: 'driver-b',
        role: 'provider',
        organizationId: fixtures.orgB.id,
        providerType: 'driver',
      })
    );
    fixtures.standaloneDriver = await check('create two-session standalone ambulance driver', 'fixture', () =>
      createActor({
        label: 'standalone-driver',
        role: 'provider',
        organizationId: fixtures.standaloneOrg.id,
        providerType: 'driver',
        sessions: 2,
      })
    );
    fixtures.orgAdminA = await check('create scoped org admin actor', 'fixture', () =>
      createActor({ label: 'org-admin-a', role: 'org_admin', organizationId: fixtures.orgA.id })
    );
    fixtures.dispatcherA = await check('create scoped dispatcher actor', 'fixture', () =>
      createActor({ label: 'dispatcher-a', role: 'dispatcher', organizationId: fixtures.orgA.id })
    );
    fixtures.dispatcherB = await check('create cross-scope dispatcher actor', 'fixture', () =>
      createActor({ label: 'dispatcher-b', role: 'dispatcher', organizationId: fixtures.orgB.id })
    );
    fixtures.platformAdmin = await check('create platform admin actor', 'fixture', () =>
      createActor({ label: 'platform-admin', role: 'admin' })
    );
    fixtures.standaloneOrgAdmin = await check('create standalone ambulance org admin', 'fixture', () =>
      createActor({
        label: 'standalone-org-admin',
        role: 'org_admin',
        organizationId: fixtures.standaloneOrg.id,
      })
    );
    fixtures.standaloneDispatcher = await check('create two-session standalone dispatcher', 'fixture', () =>
      createActor({
        label: 'standalone-dispatcher',
        role: 'dispatcher',
        organizationId: fixtures.standaloneOrg.id,
        sessions: 2,
      })
    );

    report.sessions.driver_a = {
      count: fixtures.driverA.sessionIds.length,
      distinct: new Set(fixtures.driverA.sessionIds).size === fixtures.driverA.sessionIds.length,
    };
    report.sessions.patient_a = {
      count: fixtures.patientA.sessionIds.length,
      distinct: new Set(fixtures.patientA.sessionIds).size === fixtures.patientA.sessionIds.length,
    };
    report.sessions.standalone_driver = {
      count: fixtures.standaloneDriver.sessionIds.length,
      distinct:
        new Set(fixtures.standaloneDriver.sessionIds).size ===
        fixtures.standaloneDriver.sessionIds.length,
    };
    report.sessions.standalone_dispatcher = {
      count: fixtures.standaloneDispatcher.sessionIds.length,
      distinct:
        new Set(fixtures.standaloneDispatcher.sessionIds).size ===
        fixtures.standaloneDispatcher.sessionIds.length,
    };
    assert(
      fixtures.driverA.sessionIds.length === 2 &&
        fixtures.driverA.sessionIds.every(Boolean) &&
        fixtures.driverA.sessionIds[0] !== fixtures.driverA.sessionIds[1],
      'Driver concurrency clients do not represent two distinct Auth sessions'
    );
    assert(
      fixtures.patientA.sessionIds.length === 2 &&
        fixtures.patientA.sessionIds.every(Boolean) &&
        fixtures.patientA.sessionIds[0] !== fixtures.patientA.sessionIds[1],
      'Patient replay clients do not represent two distinct Auth sessions'
    );
    assert(
      fixtures.standaloneDriver.sessionIds.length === 2 &&
        fixtures.standaloneDriver.sessionIds.every(Boolean) &&
        fixtures.standaloneDriver.sessionIds[0] !== fixtures.standaloneDriver.sessionIds[1],
      'Standalone accept clients do not represent two distinct Auth sessions'
    );
    assert(
      fixtures.standaloneDispatcher.sessionIds.length === 2 &&
        fixtures.standaloneDispatcher.sessionIds.every(Boolean) &&
        fixtures.standaloneDispatcher.sessionIds[0] !== fixtures.standaloneDispatcher.sessionIds[1],
      'Standalone offer clients do not represent two distinct Auth sessions'
    );

    const hospitalAdminUpdate = await admin
      .from('hospitals')
      .update({ org_admin_id: fixtures.orgAdminA.id })
      .eq('id', fixtures.hospital.id);
    if (hospitalAdminUpdate.error) throw hospitalAdminUpdate.error;

    fixtures.ambulance = await check('create isolated ambulance', 'fixture', () =>
      insertAmbulance({
        organizationId: fixtures.orgA.id,
        hospitalId: fixtures.hospital.id,
        label: 'hospital',
      })
    );
    fixtures.standaloneAmbulance = await check('create hospital-free standalone ambulance', 'fixture', () =>
      insertAmbulance({
        organizationId: fixtures.standaloneOrg.id,
        hospitalId: null,
        label: 'standalone',
      })
    );

    await check('eligible responder picker is organization and role scoped', 'role-rls', async () => {
      const own = await fixtures.orgAdminA.clients[0].rpc('get_eligible_ambulance_responders', {
        p_organization_id: fixtures.orgA.id,
      });
      if (own.error) throw own.error;
      assert(
        asArray(own.data).some((row) => row.responder_id === fixtures.driverA.id),
        'Org admin responder picker omitted the fixture driver'
      );

      const outsider = await fixtures.dispatcherB.clients[0].rpc('get_eligible_ambulance_responders', {
        p_organization_id: fixtures.orgA.id,
      });
      expectDenied(outsider, 'cross-org responder picker');
      return true;
    });

    await check('dispatcher cannot claim org-admin staffing authority', 'role-rls', async () => {
      const result = await fixtures.dispatcherA.clients[0].rpc('staff_ambulance_responder', {
        p_ambulance_id: fixtures.ambulance.id,
        p_responder_id: fixtures.driverA.id,
      });
      expectDenied(result, 'dispatcher staffing command');
      return true;
    });

    const staffing = await check('org admin staffs the eligible driver', 'role-rls', async () => {
      const result = await fixtures.orgAdminA.clients[0].rpc('staff_ambulance_responder', {
        p_ambulance_id: fixtures.ambulance.id,
        p_responder_id: fixtures.driverA.id,
      });
      if (result.error) throw result.error;
      assert(result.data?.success === true, 'Staffing RPC did not succeed');
      state.staffingIds.add(result.data.staffing_id);
      state.entityIds.add(result.data.staffing_id);
      state.eventKeys.add(`ambulance_staffing:${result.data.staffing_id}:assigned`);
      return result.data;
    });

    await check('staffing retry is idempotent', 'lifecycle-idempotency', async () => {
      const result = await fixtures.orgAdminA.clients[0].rpc('staff_ambulance_responder', {
        p_ambulance_id: fixtures.ambulance.id,
        p_responder_id: fixtures.driverA.id,
      });
      if (result.error) throw result.error;
      assert(result.data?.success === true && result.data?.already_staffed === true, 'Retry was not idempotent');
      assert(await eventCount(`ambulance_staffing:${staffing.staffing_id}:assigned`) === 1, 'Staffing notification duplicated');
      return result.data;
    });

    const standaloneStaffing = await check(
      'standalone ambulance org admin staffs its own driver',
      'role-rls',
      async () => {
        const result = await fixtures.standaloneOrgAdmin.clients[0].rpc('staff_ambulance_responder', {
          p_ambulance_id: fixtures.standaloneAmbulance.id,
          p_responder_id: fixtures.standaloneDriver.id,
        });
        if (result.error) throw result.error;
        assert(result.data?.success === true, 'Standalone ambulance staffing failed');
        state.staffingIds.add(result.data.staffing_id);
        state.entityIds.add(result.data.staffing_id);
        state.eventKeys.add(`ambulance_staffing:${result.data.staffing_id}:assigned`);
        return result.data;
      }
    );

    await check('malformed telemetry returns controlled JSON without a SQL error', 'telemetry', async () => {
      const malformedPayloads = [
        {
          ambulance_id: 'not-a-uuid',
          sequence: 2,
          observed_at: new Date().toISOString(),
          location: fixturePoint(),
        },
        {
          ambulance_id: fixtures.ambulance.id,
          sequence: 'not-an-integer',
          observed_at: new Date().toISOString(),
          location: fixturePoint(),
        },
        {
          ambulance_id: fixtures.ambulance.id,
          sequence: 2,
          observed_at: 'not-a-timestamp',
          location: fixturePoint(),
        },
        {
          ambulance_id: fixtures.ambulance.id,
          sequence: 2,
          observed_at: new Date().toISOString(),
          location: { lat: 'not-a-number', lng: 'not-a-number' },
        },
      ];

      for (const p_payload of malformedPayloads) {
        const result = await fixtures.driverA.clients[0].rpc('report_responder_telemetry', {
          p_payload,
        });
        assert(!result.error, `Malformed telemetry escaped as SQL/PostgREST error: ${result.error?.message}`);
        assert(
          result.data?.success === false && typeof result.data?.error === 'string',
          `Malformed telemetry did not return controlled JSON: ${JSON.stringify(result.data)}`
        );
      }
      return { malformed_cases: malformedPayloads.length };
    });

    await check('standalone ambulance telemetry opens a dispatch lease', 'telemetry', async () => {
      const result = await fixtures.standaloneDriver.clients[0].rpc('report_responder_telemetry', {
        p_payload: {
          ambulance_id: fixtures.standaloneAmbulance.id,
          sequence: 1,
          observed_at: new Date().toISOString(),
          location: fixturePoint(0.0002, 0.0002),
          heading: 90,
          accuracy_meters: 7,
        },
      });
      if (result.error) throw result.error;
      assert(result.data?.success === true, 'Standalone ambulance telemetry was rejected');
      return result.data;
    });

    await check('same-org standalone ambulance is recognized and cross-org discovery is hidden', 'role-rls', async () => {
      const own = await fixtures.standaloneDispatcher.clients[0].rpc('get_available_ambulances', {
        p_hospital_id: null,
        p_radius_km: 1,
        p_specialty: null,
      });
      if (own.error) throw own.error;
      assert(
        asArray(own.data).some((row) => row.id === fixtures.standaloneAmbulance.id),
        'Same-org standalone ambulance was omitted from availability'
      );

      const outsider = await fixtures.dispatcherA.clients[0].rpc('get_available_ambulances', {
        p_hospital_id: null,
        p_radius_km: 1,
        p_specialty: null,
      });
      if (outsider.error) throw outsider.error;
      assert(
        !asArray(outsider.data).some((row) => row.id === fixtures.standaloneAmbulance.id),
        'Cross-org availability leaked the standalone ambulance'
      );

      const readiness = await fixtures.standaloneDispatcher.clients[0].rpc(
        'get_ambulance_dispatch_readiness',
        { p_ambulance_id: fixtures.standaloneAmbulance.id, p_request_id: null }
      );
      if (readiness.error) throw readiness.error;
      assert(readiness.data?.ready === true, 'Standalone ambulance did not become dispatch ready');
      assert(
        readiness.data?.organization_id === fixtures.standaloneOrg.id,
        'Standalone readiness resolved another organization'
      );
      assert(
        readiness.data?.responder_id === fixtures.standaloneDriver.id,
        'Standalone readiness resolved another responder'
      );
      return { staffing_id: standaloneStaffing.staffing_id };
    });

    const initialTelemetry = {
      ambulance_id: fixtures.ambulance.id,
      sequence: 1,
      observed_at: new Date().toISOString(),
      location: fixturePoint(0.00005, 0.00005),
      heading: 42,
      accuracy_meters: 8,
    };

    await check('driver opens a fresh telemetry lease', 'telemetry', async () => {
      const result = await fixtures.driverA.clients[0].rpc('report_responder_telemetry', {
        p_payload: initialTelemetry,
      });
      if (result.error) throw result.error;
      assert(result.data?.success === true, 'Initial telemetry was rejected');
      return result.data;
    });

    await check('second driver session replays telemetry idempotently', 'telemetry', async () => {
      const result = await fixtures.driverA.clients[1].rpc('report_responder_telemetry', {
        p_payload: initialTelemetry,
      });
      if (result.error) throw result.error;
      assert(result.data?.success === true && result.data?.already_received === true, 'Telemetry replay was not idempotent');
      return result.data;
    });

    await check('cross-organization driver cannot report another unit telemetry', 'role-rls', async () => {
      const result = await fixtures.driverB.clients[0].rpc('report_responder_telemetry', {
        p_payload: { ...initialTelemetry, sequence: 2 },
      });
      expectDenied(result, 'cross-organization telemetry');
      return true;
    });

    await check('dispatch readiness resolves the generated staff and telemetry', 'contract-drift', async () => {
      const result = await fixtures.dispatcherA.clients[0].rpc('get_ambulance_dispatch_readiness', {
        p_ambulance_id: fixtures.ambulance.id,
        p_request_id: null,
      });
      if (result.error) throw result.error;
      assert(result.data?.ready === true, 'Fixture ambulance did not become dispatch ready');
      assert(result.data?.responder_id === fixtures.driverA.id, 'Readiness resolved another responder');
      assert(result.data?.organization_id === fixtures.orgA.id, 'Readiness resolved another organization');
      return result.data;
    });

    await check('staffing RLS is role and organization scoped', 'role-rls', async () => {
      expectVisible(
        await visibleRows(fixtures.driverA.clients[0], 'ambulance_staff_assignments', 'id', staffing.staffing_id),
        'assigned driver staffing read'
      );
      expectVisible(
        await visibleRows(fixtures.dispatcherA.clients[0], 'ambulance_staff_assignments', 'id', staffing.staffing_id),
        'same-org dispatcher staffing read'
      );
      expectHidden(
        await visibleRows(fixtures.dispatcherB.clients[0], 'ambulance_staff_assignments', 'id', staffing.staffing_id),
        'cross-org dispatcher staffing read'
      );
      expectHidden(
        await visibleRows(fixtures.driverB.clients[0], 'ambulance_staff_assignments', 'id', staffing.staffing_id),
        'unassigned driver staffing read'
      );
      return true;
    });

    await check('Storage ownership and privacy boundaries hold', 'storage', async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZpAAAAABJRU5ErkJggg==',
        'base64'
      );
      const privatePath = `onboarding/${fixtures.patientA.id}/${tag}.png`;
      const crossOwnerPrivatePath = `onboarding/${fixtures.patientA.id}/${tag}-cross-owner.png`;
      const unsupportedEmergencyPath = `emergency/${fixtures.patientA.id}/${tag}.png`;
      const publicPath = `${fixtures.patientA.id}/${tag}.png`;
      state.storage.documents.add(privatePath);
      state.storage.documents.add(crossOwnerPrivatePath);
      state.storage.documents.add(unsupportedEmergencyPath);
      state.storage.images.add(publicPath);

      const privateUpload = await fixtures.patientA.clients[0].storage
        .from('documents')
        .upload(privatePath, png, { contentType: 'image/png', upsert: false });
      if (privateUpload.error) throw privateUpload.error;

      const ownRead = await fixtures.patientA.clients[0].storage.from('documents').download(privatePath);
      if (ownRead.error) throw ownRead.error;
      const outsiderRead = await fixtures.patientB.clients[0].storage.from('documents').download(privatePath);
      expectDenied(outsiderRead, 'private document outsider read');

      const crossOwnerUpload = await fixtures.patientB.clients[0].storage
        .from('documents')
        .upload(crossOwnerPrivatePath, png, {
          contentType: 'image/png',
          upsert: false,
        });
      expectDenied(crossOwnerUpload, 'cross-owner private upload');

      const unsupportedEmergencyUpload = await fixtures.patientA.clients[0].storage
        .from('documents')
        .upload(unsupportedEmergencyPath, png, {
          contentType: 'image/png',
          upsert: false,
        });
      expectDenied(unsupportedEmergencyUpload, 'unowned emergency document path');

      const publicUpload = await fixtures.patientA.clients[0].storage
        .from('images')
        .upload(publicPath, png, { contentType: 'image/png', upsert: false });
      if (publicUpload.error) throw publicUpload.error;
      const publicRead = await anon.storage.from('images').download(publicPath);
      if (publicRead.error) throw publicRead.error;

      await fixtures.patientB.clients[0].storage.from('images').remove([publicPath]);
      assert(await storageObjectExists('images', publicPath), 'Cross-owner delete removed public profile media');
      return true;
    });

    await check('operators cannot create another patient wallet payment', 'finance-authority', async () => {
      const requestCountBefore = await countRows('emergency_requests', 'user_id', fixtures.patientA.id);
      const paymentCountBefore = await countRows('payments', 'user_id', fixtures.patientA.id);
      const visitCountBefore = await countRows('visits', 'user_id', fixtures.patientA.id);
      const requestData = {
        hospital_id: fixtures.hospital.id,
        hospital_name: fixtures.hospital.name,
        service_type: 'bed',
        specialty: 'Emergency Medicine',
        patient_location: fixturePoint(0.00018, 0.00018),
        patient_snapshot: { fullName: `Wallet Authority ${tag}`, testTag: tag },
        transition_reason: 'live_proof_cross_patient_wallet_denial',
      };
      const walletPaymentData = {
        method: 'wallet',
        method_id: `${tag}-operator-wallet`,
        total_amount: 200,
        currency: 'USD',
      };

      for (const [label, actor] of [
        ['same-org admin', fixtures.orgAdminA],
        ['same-org dispatcher', fixtures.dispatcherA],
        ['platform admin', fixtures.platformAdmin],
        ['cross-org dispatcher', fixtures.dispatcherB],
      ]) {
        const result = await actor.clients[0].rpc('create_emergency_v4', {
          p_user_id: fixtures.patientA.id,
          p_request_data: requestData,
          p_payment_data: walletPaymentData,
        });
        await trackUnexpectedEmergencyCreation(result.data);
        expectDenied(result, `${label} cross-patient wallet creation`);
        assert(
          /patient must confirm wallet payment/i.test(result.error?.message || ''),
          `${label} returned an unclear wallet-consent denial`
        );
      }

      const crossOrgCash = await fixtures.dispatcherB.clients[0].rpc('create_emergency_v4', {
        p_user_id: fixtures.patientA.id,
        p_request_data: {
          ...requestData,
          transition_reason: 'live_proof_cross_org_operator_create_denial',
        },
        p_payment_data: {
          method: 'cash',
          method_id: `${tag}-cross-org-cash`,
          total_amount: 200,
          currency: 'USD',
        },
      });
      await trackUnexpectedEmergencyCreation(crossOrgCash.data);
      expectDenied(crossOrgCash, 'cross-org operator emergency creation');

      assert(
        (await countRows('emergency_requests', 'user_id', fixtures.patientA.id)) === requestCountBefore,
        'Denied operator creation left an emergency request'
      );
      assert(
        (await countRows('payments', 'user_id', fixtures.patientA.id)) === paymentCountBefore,
        'Denied operator creation left a payment'
      );
      assert(
        (await countRows('visits', 'user_id', fixtures.patientA.id)) === visitCountBefore,
        'Denied operator creation left a visit'
      );
      return true;
    });

    const walletIntent = await check(
      'patient creates canonical wallet request',
      'finance-authority',
      async () => createWalletRequest({ actor: fixtures.patientA, hospital: fixtures.hospital, label: 'wallet-owner' })
    );

    const fundedPatientWallet = await check('fund isolated patient wallet', 'fixture', async () => {
      const { data, error } = await admin
        .from('patient_wallets')
        .update({ balance: 1000, updated_at: new Date().toISOString() })
        .eq('user_id', fixtures.patientA.id)
        .select('id,balance')
        .single();
      if (error) throw error;
      state.patientWalletIds.add(data.id);
      state.entityIds.add(data.id);
      return data;
    });

    await check('all operator roles are denied patient wallet settlement', 'finance-authority', async () => {
      const amount = Number(walletIntent.canonical_total);
      const attempts = [
        [
          'same-org admin full signature',
          fixtures.orgAdminA.clients[0],
          {
            p_user_id: fixtures.patientA.id,
            p_organization_id: fixtures.orgA.id,
            p_emergency_request_id: walletIntent.request_id,
            p_amount: amount,
            p_currency: 'USD',
          },
        ],
        [
          'same-org dispatcher wrapper signature',
          fixtures.dispatcherA.clients[0],
          {
            p_user_id: fixtures.patientA.id,
            p_amount: amount,
            p_emergency_request_id: walletIntent.request_id,
          },
        ],
        [
          'platform admin full signature',
          fixtures.platformAdmin.clients[0],
          {
            p_user_id: fixtures.patientA.id,
            p_organization_id: fixtures.orgA.id,
            p_emergency_request_id: walletIntent.request_id,
            p_amount: amount,
            p_currency: 'USD',
          },
        ],
        [
          'cross-org dispatcher full signature',
          fixtures.dispatcherB.clients[0],
          {
            p_user_id: fixtures.patientA.id,
            p_organization_id: fixtures.orgA.id,
            p_emergency_request_id: walletIntent.request_id,
            p_amount: amount,
            p_currency: 'USD',
          },
        ],
      ];

      for (const [label, client, args] of attempts) {
        const result = await client.rpc('process_wallet_payment', args);
        expectDenied(result, label);
        assert(
          /patient must confirm wallet payment/i.test(result.error?.message || ''),
          `${label} returned an unclear wallet-consent denial`
        );
      }

      const { data: walletAfterDenials, error: walletError } = await admin
        .from('patient_wallets')
        .select('balance')
        .eq('id', fundedPatientWallet.id)
        .single();
      if (walletError) throw walletError;
      assert(Number(walletAfterDenials.balance) === 1000, 'Denied operator settlement changed wallet balance');
      assert(
        (await countRows('wallet_ledger', 'reference_id', walletIntent.payment_id)) === 0,
        'Denied operator settlement wrote ledger rows'
      );

      const request = await getRequest(walletIntent.request_id);
      assert(request.status === 'pending_approval', 'Denied operator settlement changed request status');
      assert(request.payment_status === 'pending', 'Denied operator settlement changed payment status');
      return true;
    });

    await check('two patient sessions converge on one wallet debit', 'finance-concurrency', async () => {
      const amount = Number(walletIntent.canonical_total);
      const [fullSignature, wrapperSignature] = await Promise.all([
        fixtures.patientA.clients[0].rpc('process_wallet_payment', {
          p_user_id: fixtures.patientA.id,
          p_organization_id: fixtures.orgA.id,
          p_emergency_request_id: walletIntent.request_id,
          p_amount: amount,
          p_currency: 'USD',
        }),
        fixtures.patientA.clients[1].rpc('process_wallet_payment', {
          p_user_id: fixtures.patientA.id,
          p_amount: amount,
          p_emergency_request_id: walletIntent.request_id,
        }),
      ]);

      for (const result of [fullSignature, wrapperSignature]) {
        if (result.error) throw result.error;
        assert(result.data?.success === true, 'Patient wallet settlement did not succeed');
      }
      assert(
        [fullSignature, wrapperSignature].filter((result) => result.data?.already_completed === true).length === 1,
        'Concurrent wallet settlement did not resolve as one mutation and one replay'
      );

      const { data: walletAfterSettlement, error: walletError } = await admin
        .from('patient_wallets')
        .select('balance')
        .eq('id', fundedPatientWallet.id)
        .single();
      if (walletError) throw walletError;
      assert(
        Number(walletAfterSettlement.balance) === Number((1000 - amount).toFixed(2)),
        'Concurrent settlement debited the patient wallet more than once'
      );

      const debitCount = await countRows(
        'wallet_ledger',
        'reference_id',
        walletIntent.payment_id,
        (query) => query.eq('wallet_id', fundedPatientWallet.id).eq('transaction_type', 'debit')
      );
      assert(debitCount === 1, `Expected one patient wallet debit ledger row, found ${debitCount}`);

      const replay = await fixtures.patientA.clients[0].rpc('process_wallet_payment', {
        p_user_id: fixtures.patientA.id,
        p_organization_id: fixtures.orgA.id,
        p_emergency_request_id: walletIntent.request_id,
        p_amount: amount,
        p_currency: 'USD',
      });
      if (replay.error) throw replay.error;
      assert(replay.data?.already_completed === true, 'Wallet settlement replay was not idempotent');

      const request = await getRequest(walletIntent.request_id);
      assert(request.status === 'in_progress', 'Patient wallet settlement did not release the request');
      assert(request.payment_status === 'completed', 'Patient wallet settlement did not complete payment truth');
      return { amount, debit_rows: debitCount };
    });

    const consoleIntent = await check(
      'Console create ignores caller terminal and paid state',
      'console-authority',
      async () => {
        const result = await fixtures.orgAdminA.clients[0].rpc('console_create_emergency_request', {
          p_payload: {
            user_id: fixtures.consolePatient.id,
            hospital_id: fixtures.hospital.id,
            hospital_name: fixtures.hospital.name,
            service_type: 'ambulance',
            status: 'completed',
            request_status: 'cancelled',
            payment_status: 'completed',
            paymentStatus: 'paid',
            total_cost: 250,
            patient_location: fixturePoint(0.0003, 0.0003),
            patient_snapshot: { fullName: `Console Patient ${tag}`, testTag: tag },
            transition_reason: 'live_proof_console_create_authority',
          },
        });
        if (result.error) throw result.error;
        assert(result.data?.success === true, 'Console create failed');

        state.requestIds.add(result.data.request_id);
        state.entityIds.add(result.data.request_id);
        state.visitIds.add(result.data.visit_id);
        state.entityIds.add(result.data.visit_id);
        state.eventKeys.add(`emergency_request:${result.data.request_id}:created`);

        const request = await getRequest(result.data.request_id);
        assert(request.status === 'pending_approval', 'Console caller forced a terminal request state');
        assert(request.payment_status === 'pending', 'Console caller forced a paid request state');
        assert(request.payment_id === null, 'Console intent fabricated a payment record');

        const { data: visit, error: visitError } = await admin
          .from('visits')
          .select('id,status,request_id')
          .eq('id', result.data.visit_id)
          .single();
        if (visitError) throw visitError;
        assert(visit.request_id === result.data.request_id, 'Console request lost its visit link');
        assert(visit.status === 'pending', 'Console caller forced terminal visit state');
        assert(
          (await countRows('emergency_responder_assignments', 'emergency_request_id', result.data.request_id)) === 0,
          'Console intent created responder state before payment approval'
        );
        return result.data;
      }
    );

    await check('Realtime delivers to the owner and suppresses a cross-org observer', 'realtime-rls', async () => {
      let ownerProbe = null;
      let outsiderProbe = null;
      try {
        ownerProbe = await openRealtimeUpdateProbe(fixtures.consolePatient.clients[0], {
          table: 'emergency_requests',
          id: consoleIntent.request_id,
          label: 'owner-request',
        });
        outsiderProbe = await openRealtimeUpdateProbe(fixtures.dispatcherB.clients[0], {
          table: 'emergency_requests',
          id: consoleIntent.request_id,
          label: 'cross-org-request',
        });

        const marker = `realtime-${runId}`;
        const { error } = await admin
          .from('emergency_requests')
          .update({ patient_snapshot: { fullName: `Console Patient ${tag}`, testTag: tag, marker } })
          .eq('id', consoleIntent.request_id);
        if (error) throw error;

        await waitForRealtimeEvent(
          ownerProbe,
          (event) => event.new?.id === consoleIntent.request_id && event.new?.patient_snapshot?.marker === marker,
          'owner emergency request update'
        );
        await delay(1_500);
        assert(
          !outsiderProbe.events.some((event) => event.new?.id === consoleIntent.request_id),
          'Cross-org Realtime subscription received the private request update'
        );
        return { owner_events: ownerProbe.events.length, outsider_events: outsiderProbe.events.length };
      } finally {
        await closeRealtimeProbe(ownerProbe);
        await closeRealtimeProbe(outsiderProbe);
      }
    });

    const cashIntent = await check(
      'patient cash request atomically emits its operator approval notification',
      'cash-notification-authority',
      () => createCashRequest({ actor: fixtures.patientB, hospital: fixtures.hospital, label: 'cash' })
    );

    await check(
      'cash notification fan-out denies patients and converges for an authorized org admin',
      'cash-notification-authority',
      async () => {
        const eventKey = `emergency_request:${cashIntent.request_id}:payment:${cashIntent.payment_id}:cash_approval_required`;
        const request = await getRequest(cashIntent.request_id);
        assert(request.status === 'pending_approval', 'Cash request escaped pending approval');
        assert(request.payment_status === 'pending', 'Cash request fabricated completed payment');
        assert(
          (await countRows('emergency_responder_assignments', 'emergency_request_id', cashIntent.request_id)) === 0,
          'Cash request assigned a responder before operator approval'
        );

        const { data: payment, error: paymentError } = await admin
          .from('payments')
          .select('amount,ivisit_fee_amount,status,payment_method,organization_id')
          .eq('id', cashIntent.payment_id)
          .single();
        if (paymentError) throw paymentError;
        assert(payment.status === 'pending' && payment.payment_method === 'cash', 'Cash payment truth is invalid');

        const { data: notifications, error: notificationError } = await admin
          .from('notifications')
          .select('id,user_id,event_key,action_type,action_data')
          .eq('event_key', eventKey)
          .eq('user_id', fixtures.orgAdminA.id);
        if (notificationError) throw notificationError;
        assert(notifications?.length === 1, 'Org admin did not receive exactly one cash approval notification');
        assert(notifications[0].action_type === 'approve_cash_payment', 'Cash notification action is not canonical');
        assert(
          notifications[0].action_data?.paymentId === cashIntent.payment_id &&
            notifications[0].action_data?.requestId === cashIntent.request_id,
          'Cash notification payload lost its payment/request identity'
        );

        const canonicalPayload = {
          p_request_id: cashIntent.request_id,
          p_payment_id: cashIntent.payment_id,
          p_total_amount: payment.amount,
          p_fee_amount: payment.ivisit_fee_amount,
          p_hospital_name: fixtures.hospital.name,
          p_service_type: 'ambulance',
          p_display_id: cashIntent.display_id,
          p_organization_id: payment.organization_id,
        };
        const patientAttempt = await fixtures.patientB.clients[0].rpc(
          'notify_cash_approval_org_admins',
          canonicalPayload
        );
        expectDenied(patientAttempt, 'patient cash notification fan-out');

        const beforeRetry = await eventCount(eventKey);
        const operatorRetry = await fixtures.orgAdminA.clients[0].rpc(
          'notify_cash_approval_org_admins',
          canonicalPayload
        );
        if (operatorRetry.error) throw operatorRetry.error;
        assert(operatorRetry.data?.success === true, 'Authorized cash notification retry failed');
        assert(operatorRetry.data?.inserted_count === 0, 'Cash notification retry inserted a duplicate');
        assert((await eventCount(eventKey)) === beforeRetry, 'Cash notification retry changed event cardinality');
        return { recipient_count: operatorRetry.data.recipient_count, event_count: beforeRetry };
      }
    );

    await check('cash decline terminalizes the fixture without settlement side effects', 'payment-gate', async () => {
      state.eventKeys.add(`payment:${cashIntent.payment_id}:status:failed`);
      const result = await fixtures.orgAdminA.clients[0].rpc('decline_cash_payment', {
        p_payment_id: cashIntent.payment_id,
        p_request_id: cashIntent.request_id,
      });
      if (result.error) throw result.error;
      assert(result.data?.success === true, 'Cash decline failed');

      const retry = await fixtures.orgAdminA.clients[0].rpc('decline_cash_payment', {
        p_payment_id: cashIntent.payment_id,
        p_request_id: cashIntent.request_id,
      });
      if (retry.error) throw retry.error;
      assert(retry.data?.already_declined === true, 'Cash decline replay did not converge');

      const request = await getRequest(cashIntent.request_id);
      assert(request.status === 'payment_declined', 'Cash decline did not terminalize the request');
      assert(request.payment_status === 'failed', 'Cash decline did not fail the request payment state');
      assert(
        (await countRows('wallet_ledger', 'reference_id', cashIntent.payment_id)) === 0,
        'Cash decline created a settlement ledger entry'
      );
      assert(
        (await eventCount(`payment:${cashIntent.payment_id}:status:failed`)) === 1,
        'Cash decline notification was not idempotent'
      );
      return result.data;
    });

    const primary = await check('patient creates canonical card-backed emergency', 'payment-gate', () =>
      createCardRequest({ actor: fixtures.patientA, hospital: fixtures.hospital, label: 'primary' })
    );
    report.fixture.primary_request_id = primary.request_id;
    report.fixture.ambulance_id = fixtures.ambulance.id;

    await check('unconfirmed payment cannot produce a responder offer', 'payment-gate', async () => {
      const paymentGate = await admin.rpc('emergency_dispatch_payment_snapshot', {
        p_request_id: primary.request_id,
      });
      if (paymentGate.error) throw paymentGate.error;
      assert(paymentGate.data?.ready === false, 'Unconfirmed payment was reported as dispatch ready');
      assert(
        asArray(paymentGate.data?.reasons).some((reason) =>
          ['request_not_released', 'request_payment_pending', 'payment_not_completed', 'settlement_proof_missing']
            .includes(reason)
        ),
        'Payment snapshot did not explain why dispatch is blocked'
      );

      const offer = await admin.rpc('offer_responder_assignment', {
        p_request_id: primary.request_id,
        p_ambulance_id: fixtures.ambulance.id,
        p_source: 'live-proof-before-payment',
      });
      if (offer.error) throw offer.error;
      assert(
        offer.data?.success === false
          && ['PAYMENT_NOT_CONFIRMED', 'REQUEST_NOT_DISPATCHABLE'].includes(offer.data?.code),
        'Request/payment gates did not block dispatch'
      );
      assert(
        (await countRows('emergency_responder_assignments', 'emergency_request_id', primary.request_id)) === 0,
        'A responder assignment exists before backend payment confirmation'
      );
      return { offer: offer.data, payment: paymentGate.data };
    });

    const completedPayment = await check('backend card confirmation releases automatic dispatch', 'payment-gate', async () => {
      const result = await admin.rpc('complete_card_payment', {
        p_payment_intent_id: primary.paymentIntentId,
        p_provider_response: { id: primary.paymentIntentId, status: 'succeeded', testTag: tag },
        p_fee_amount: 3.75,
      });
      if (result.error) throw result.error;
      assert(result.data?.success === true, 'Card confirmation failed');
      return result.data;
    });
    assert(completedPayment.request_status === 'in_progress', 'Payment confirmation did not release request');
    state.eventKeys.add(`payment:${primary.payment_id}:status:completed`);

    const offeredRequest = await getRequest(primary.request_id);
    assert(offeredRequest.current_responder_assignment_id, 'Automatic dispatch did not create an offer');
    assert(
      offeredRequest.ambulance_id === fixtures.ambulance.id,
      'Automatic dispatch selected an ambulance outside the fixture'
    );
    const primaryAssignmentId = offeredRequest.current_responder_assignment_id;
    state.assignmentIds.add(primaryAssignmentId);
    state.entityIds.add(primaryAssignmentId);
    state.eventKeys.add(`emergency_request:${primary.request_id}:assignment:${primaryAssignmentId}:offered`);

    await check('payment and offer retries do not duplicate consequences', 'notification-idempotency', async () => {
      const paymentRetry = await admin.rpc('complete_card_payment', {
        p_payment_intent_id: primary.paymentIntentId,
        p_provider_response: { id: primary.paymentIntentId, status: 'succeeded', retry: true },
        p_fee_amount: 3.75,
      });
      if (paymentRetry.error) throw paymentRetry.error;
      assert(paymentRetry.data?.already_completed === true, 'Card replay did not converge');

      const offerRetry = await admin.rpc('offer_responder_assignment', {
        p_request_id: primary.request_id,
        p_ambulance_id: fixtures.ambulance.id,
        p_source: 'live-proof-offer-retry',
      });
      if (offerRetry.error) throw offerRetry.error;
      assert(offerRetry.data?.already_offered === true, 'Offer replay did not converge');
      assert(
        (await countRows('emergency_responder_assignments', 'emergency_request_id', primary.request_id)) === 1,
        'Offer replay created duplicate assignment history'
      );
      assert(await eventCount(`payment:${primary.payment_id}:status:completed`) === 1, 'Payment notification duplicated');
      assert(
        (await eventCount(`emergency_request:${primary.request_id}:assignment:${primaryAssignmentId}:offered`)) === 1,
        'Offer notification duplicated'
      );
      return true;
    });

    await check('emergency request and assignment RLS match runtime roles', 'role-rls', async () => {
      expectVisible(
        await visibleRows(fixtures.patientA.clients[0], 'emergency_requests', 'id', primary.request_id),
        'owner patient request read'
      );
      expectHidden(
        await visibleRows(fixtures.patientB.clients[0], 'emergency_requests', 'id', primary.request_id),
        'other patient request read'
      );
      expectVisible(
        await visibleRows(fixtures.driverA.clients[0], 'emergency_requests', 'id', primary.request_id),
        'assigned driver request read'
      );
      expectHidden(
        await visibleRows(fixtures.driverB.clients[0], 'emergency_requests', 'id', primary.request_id),
        'other driver request read'
      );
      expectVisible(
        await visibleRows(fixtures.dispatcherA.clients[0], 'emergency_requests', 'id', primary.request_id),
        'same-org dispatcher request read'
      );
      expectHidden(
        await visibleRows(fixtures.dispatcherB.clients[0], 'emergency_requests', 'id', primary.request_id),
        'cross-org dispatcher request read'
      );
      expectHidden(
        await visibleRows(fixtures.patientA.clients[0], 'emergency_responder_assignments', 'id', primaryAssignmentId),
        'patient assignment history read'
      );
      expectVisible(
        await visibleRows(fixtures.driverA.clients[0], 'emergency_responder_assignments', 'id', primaryAssignmentId),
        'assigned driver assignment read'
      );
      expectVisible(
        await visibleRows(fixtures.dispatcherA.clients[0], 'emergency_responder_assignments', 'id', primaryAssignmentId),
        'same-org dispatcher assignment read'
      );
      expectHidden(
        await visibleRows(fixtures.dispatcherB.clients[0], 'emergency_responder_assignments', 'id', primaryAssignmentId),
        'cross-org dispatcher assignment read'
      );

      const anonRequest = await visibleRows(anon, 'emergency_requests', 'id', primary.request_id);
      expectDeniedOrHidden(anonRequest, 'anonymous request read');
      return true;
    });

    await check('payment RLS excludes operational roles from settlement rows', 'role-rls', async () => {
      expectVisible(
        await visibleRows(fixtures.patientA.clients[0], 'payments', 'id', primary.payment_id),
        'owner patient payment read'
      );
      expectVisible(
        await visibleRows(fixtures.orgAdminA.clients[0], 'payments', 'id', primary.payment_id),
        'same-org admin payment read'
      );
      expectHidden(
        await visibleRows(fixtures.patientB.clients[0], 'payments', 'id', primary.payment_id),
        'other patient payment read'
      );
      expectHidden(
        await visibleRows(fixtures.driverA.clients[0], 'payments', 'id', primary.payment_id),
        'same-org driver payment read'
      );
      expectHidden(
        await visibleRows(fixtures.dispatcherA.clients[0], 'payments', 'id', primary.payment_id),
        'same-org dispatcher payment read'
      );
      expectHidden(
        await visibleRows(fixtures.driverB.clients[0], 'payments', 'id', primary.payment_id),
        'cross-org driver payment read'
      );
      expectHidden(
        await visibleRows(fixtures.dispatcherB.clients[0], 'payments', 'id', primary.payment_id),
        'cross-org dispatcher payment read'
      );
      expectDeniedOrHidden(
        await visibleRows(anon, 'payments', 'id', primary.payment_id),
        'anonymous payment read'
      );
      return true;
    });

    await check('direct lifecycle table mutations are denied', 'role-rls', async () => {
      expectDenied(
        await fixtures.patientA.clients[0]
          .from('emergency_requests')
          .update({ status: 'completed' })
          .eq('id', primary.request_id),
        'patient direct request update'
      );
      expectDenied(
        await fixtures.driverA.clients[0]
          .from('emergency_responder_assignments')
          .update({ status: 'accepted' })
          .eq('id', primaryAssignmentId),
        'driver direct assignment update'
      );
      const directPaymentUpdate = await fixtures.patientA.clients[0]
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', primary.payment_id)
        .select('id,status');
      expectDeniedOrHidden(directPaymentUpdate, 'patient direct payment update');
      const { data: canonicalPayment, error: canonicalPaymentError } = await admin
        .from('payments')
        .select('status')
        .eq('id', primary.payment_id)
        .single();
      if (canonicalPaymentError) throw canonicalPaymentError;
      assert(canonicalPayment.status === 'completed', 'Patient changed canonical payment lifecycle state');
      expectDenied(
        await fixtures.dispatcherA.clients[0].from('emergency_responder_assignments').insert({
          emergency_request_id: primary.request_id,
          ambulance_id: fixtures.ambulance.id,
          responder_id: fixtures.driverA.id,
          organization_id: fixtures.orgA.id,
        }),
        'dispatcher direct assignment insert'
      );
      return true;
    });

    await check('dispatcher RPC scope cannot cross organizations', 'role-rls', async () => {
      const crossReadiness = await fixtures.dispatcherB.clients[0].rpc('get_ambulance_dispatch_readiness', {
        p_ambulance_id: fixtures.ambulance.id,
        p_request_id: primary.request_id,
      });
      expectDenied(crossReadiness, 'cross-org readiness');

      const crossRelease = await fixtures.dispatcherB.clients[0].rpc('dispatcher_release_responder_assignment', {
        p_request_id: primary.request_id,
        p_reason: 'cross-org attempt',
      });
      expectDenied(crossRelease, 'cross-org release');
      return true;
    });

    await check('driver feed returns only the driver current offer', 'role-rls', async () => {
      const ownFeed = await fixtures.driverA.clients[0].rpc('get_driver_dispatch_feed');
      if (ownFeed.error) throw ownFeed.error;
      assert(
        asArray(ownFeed.data?.items).some((item) => item.assignment_id === primaryAssignmentId),
        'Assigned driver feed omitted current offer'
      );
      const otherFeed = await fixtures.driverB.clients[0].rpc('get_driver_dispatch_feed');
      if (otherFeed.error) throw otherFeed.error;
      assert(
        !asArray(otherFeed.data?.items).some((item) => item.assignment_id === primaryAssignmentId),
        'Driver feed leaked another responder offer'
      );
      return true;
    });

    const beforeAccept = await getAssignment(primaryAssignmentId);
    const concurrentAccepts = await check('two Auth sessions converge on one accepted assignment', 'concurrency', async () => {
      const results = await Promise.all(
        fixtures.driverA.clients.map((client) =>
          client.rpc('responder_accept_emergency', { p_request_id: primary.request_id })
        )
      );
      for (const result of results) {
        if (result.error) throw result.error;
        assert(result.data?.success === true, 'Concurrent accept returned an unsuccessful result');
        assert(result.data?.assignment_id === primaryAssignmentId, 'Concurrent accept changed assignment generation');
      }
      assert(
        results.some((result) => result.data?.already_accepted === true),
        'Concurrent retry was not reported as already accepted'
      );
      return results.map((result) => result.data);
    });
    assert(concurrentAccepts.length === 2, 'Both sessions did not return');
    state.eventKeys.add(`emergency_request:${primary.request_id}:assignment:${primaryAssignmentId}:accepted`);

    await check('accept is idempotent in rows, transitions, and notifications', 'lifecycle-idempotency', async () => {
      const accepted = await getAssignment(primaryAssignmentId);
      assert(accepted.status === 'accepted', 'Assignment did not become accepted');
      assert(accepted.accepted_at && accepted.accepted_at !== beforeAccept.accepted_at, 'accepted_at was not set');
      assert(
        (await countRows(
          'emergency_status_transitions',
          'emergency_request_id',
          primary.request_id,
          (query) => query.eq('to_status', 'accepted')
        )) === 1,
        'Accepted transition duplicated'
      );
      assert(
        (await eventCount(`emergency_request:${primary.request_id}:assignment:${primaryAssignmentId}:accepted`)) === 1,
        'Accepted notification duplicated'
      );
      const retry = await fixtures.driverA.clients[0].rpc('responder_accept_emergency', {
        p_request_id: primary.request_id,
      });
      if (retry.error) throw retry.error;
      assert(retry.data?.already_accepted === true, 'Accepted replay did not converge');
      const afterRetry = await getAssignment(primaryAssignmentId);
      assert(afterRetry.accepted_at === accepted.accepted_at, 'Accepted replay changed accepted_at');
      return retry.data;
    });

    await check('current responder projection is consistent in runtime scope', 'role-rls', async () => {
      for (const client of [
        fixtures.patientA.clients[0],
        fixtures.driverA.clients[0],
        fixtures.dispatcherA.clients[0],
      ]) {
        const result = await client.rpc('get_current_emergency_responder', {
          p_request_id: primary.request_id,
        });
        if (result.error) throw result.error;
        assert(result.data?.success === true && result.data?.available === true, 'Responder projection is unavailable');
        assert(result.data?.responder_id === fixtures.driverA.id, 'Responder projection returned another actor');
      }

      const outsider = await fixtures.dispatcherB.clients[0].rpc('get_current_emergency_responder', {
        p_request_id: primary.request_id,
      });
      expectDenied(outsider, 'cross-org current responder projection');
      return true;
    });

    const boundTelemetry = {
      ambulance_id: fixtures.ambulance.id,
      request_id: primary.request_id,
      assignment_id: primaryAssignmentId,
      sequence: 2,
      observed_at: new Date().toISOString(),
      location: fixturePoint(0.0001, 0.0001),
      heading: 58,
      accuracy_meters: 6,
    };

    await check('assignment-bound telemetry converges across two sessions', 'telemetry', async () => {
      const first = await fixtures.driverA.clients[0].rpc('report_responder_telemetry', {
        p_payload: boundTelemetry,
      });
      if (first.error) throw first.error;
      assert(first.data?.success === true, 'Bound telemetry failed');
      const retry = await fixtures.driverA.clients[1].rpc('report_responder_telemetry', {
        p_payload: boundTelemetry,
      });
      if (retry.error) throw retry.error;
      assert(retry.data?.already_received === true, 'Bound telemetry retry was not idempotent');

      const conflict = await fixtures.driverA.clients[1].rpc('report_responder_telemetry', {
        p_payload: { ...boundTelemetry, location: { lat: 6.525, lng: 3.38 } },
      });
      if (conflict.error) throw conflict.error;
      assert(conflict.data?.success === false && conflict.data?.code === 'SEQUENCE_CONFLICT', 'Sequence conflict was not rejected');

      const stale = await fixtures.driverA.clients[0].rpc('report_responder_telemetry', {
        p_payload: { ...boundTelemetry, sequence: 1 },
      });
      if (stale.error) throw stale.error;
      assert(stale.data?.success === false && stale.data?.code === 'STALE_SEQUENCE', 'Stale sequence was not rejected');
      return retry.data;
    });

    await check('telemetry projection is visible only in runtime scope', 'role-rls', async () => {
      for (const client of [
        fixtures.patientA.clients[0],
        fixtures.driverA.clients[0],
        fixtures.dispatcherA.clients[0],
      ]) {
        const result = await client.rpc('get_responder_telemetry_state', {
          p_request_id: primary.request_id,
        });
        if (result.error) throw result.error;
        assert(result.data?.success === true && result.data?.state === 'live', 'Scoped actor did not receive live telemetry');
      }
      const outsider = await fixtures.dispatcherB.clients[0].rpc('get_responder_telemetry_state', {
        p_request_id: primary.request_id,
      });
      expectDenied(outsider, 'cross-org telemetry projection');
      return true;
    });

    await check('arrival command and replay are idempotent', 'lifecycle-idempotency', async () => {
      const outsider = await fixtures.driverB.clients[0].rpc('responder_arrive_emergency', {
        p_request_id: primary.request_id,
      });
      expectDenied(outsider, 'other driver arrival');

      const first = await fixtures.driverA.clients[0].rpc('responder_arrive_emergency', {
        p_request_id: primary.request_id,
      });
      if (first.error) throw first.error;
      assert(first.data?.success === true, 'Arrival failed');
      const retry = await fixtures.driverA.clients[1].rpc('responder_arrive_emergency', {
        p_request_id: primary.request_id,
      });
      if (retry.error) throw retry.error;
      assert(retry.data?.already_arrived === true, 'Arrival retry did not converge');
      state.eventKeys.add(`emergency_request:${primary.request_id}:assignment:${primaryAssignmentId}:arrived`);
      assert(
        (await countRows(
          'emergency_status_transitions',
          'emergency_request_id',
          primary.request_id,
          (query) => query.eq('to_status', 'arrived')
        )) === 1,
        'Arrival transition duplicated'
      );
      assert(
        (await eventCount(`emergency_request:${primary.request_id}:assignment:${primaryAssignmentId}:arrived`)) === 1,
        'Arrival notification duplicated'
      );
      return retry.data;
    });

    await check('patient arrival acknowledgement is idempotent', 'lifecycle-idempotency', async () => {
      const first = await fixtures.patientA.clients[0].rpc('patient_acknowledge_responder_arrival', {
        p_request_id: primary.request_id,
      });
      if (first.error) throw first.error;
      assert(first.data?.success === true && first.data?.acknowledged_at, 'Patient acknowledgement failed');
      const retry = await fixtures.patientA.clients[1].rpc('patient_acknowledge_responder_arrival', {
        p_request_id: primary.request_id,
      });
      if (retry.error) throw retry.error;
      assert(retry.data?.acknowledged_at === first.data.acknowledged_at, 'Acknowledgement timestamp changed');
      state.eventKeys.add(`emergency_request:${primary.request_id}:arrival_acknowledged`);
      assert(
        (await eventCount(`emergency_request:${primary.request_id}:arrival_acknowledged`)) === 1,
        'Acknowledgement notification duplicated'
      );
      return retry.data;
    });

    await check('completion command and replay preserve one visit', 'lifecycle-idempotency', async () => {
      const first = await fixtures.driverA.clients[0].rpc('responder_complete_emergency', {
        p_request_id: primary.request_id,
      });
      if (first.error) throw first.error;
      assert(first.data?.success === true, 'Completion failed');
      const retry = await fixtures.driverA.clients[1].rpc('responder_complete_emergency', {
        p_request_id: primary.request_id,
      });
      if (retry.error) throw retry.error;
      assert(retry.data?.already_completed === true, 'Completion retry did not converge');
      state.eventKeys.add(`emergency_request:${primary.request_id}:assignment:${primaryAssignmentId}:completed`);

      const request = await getRequest(primary.request_id);
      assert(request.status === 'completed', 'Request did not complete');
      const assignment = await getAssignment(primaryAssignmentId);
      assert(assignment.status === 'completed', 'Assignment did not complete');
      const { data: ambulance, error: ambulanceError } = await admin
        .from('ambulances')
        .select('status,current_call')
        .eq('id', fixtures.ambulance.id)
        .single();
      if (ambulanceError) throw ambulanceError;
      assert(ambulance.status === 'available' && ambulance.current_call === null, 'Ambulance was not released');
      assert((await countRows('visits', 'request_id', primary.request_id)) === 1, 'Completion duplicated visit history');
      assert(
        (await countRows(
          'emergency_status_transitions',
          'emergency_request_id',
          primary.request_id,
          (query) => query.eq('to_status', 'completed')
        )) === 1,
        'Completion transition duplicated'
      );
      assert(
        (await eventCount(`emergency_request:${primary.request_id}:assignment:${primaryAssignmentId}:completed`)) === 1,
        'Completion notification duplicated'
      );
      return retry.data;
    });

    await check('standalone unit can be isolated while its request payment clears', 'fixture', async () => {
      const { error } = await admin
        .from('ambulances')
        .update({ status: 'maintenance', current_call: null })
        .eq('id', fixtures.standaloneAmbulance.id);
      if (error) throw error;
      return true;
    });

    fixtures.standaloneRequest = await check(
      'create paid request routed to a standalone ambulance organization',
      'payment-gate',
      async () => {
        const request = await createCardRequest({
          actor: fixtures.patientB,
          hospital: fixtures.hospital,
          label: 'standalone',
        });

        const { data: scoped, error: scopeError } = await admin
          .from('emergency_requests')
          .update({ dispatch_organization_id: fixtures.standaloneOrg.id })
          .eq('id', request.request_id)
          .select('id,dispatch_organization_id')
          .single();
        if (scopeError) throw scopeError;
        assert(
          scoped.dispatch_organization_id === fixtures.standaloneOrg.id,
          'Standalone request did not retain its explicit dispatch organization'
        );

        const payment = await admin.rpc('complete_card_payment', {
          p_payment_intent_id: request.paymentIntentId,
          p_provider_response: { id: request.paymentIntentId, status: 'succeeded', testTag: tag },
          p_fee_amount: 3.75,
        });
        if (payment.error) throw payment.error;
        assert(payment.data?.success === true, 'Standalone request payment did not complete');
        state.eventKeys.add(`payment:${request.payment_id}:status:completed`);

        const queued = await getRequest(request.request_id);
        assert(queued.status === 'in_progress', 'Standalone request did not enter the dispatch queue');
        assert(queued.current_responder_assignment_id === null, 'Unavailable standalone unit was falsely assigned');
        return request;
      }
    );

    await check('standalone unit returns with fresh telemetry for its scoped request', 'telemetry', async () => {
      const { error: statusError } = await admin
        .from('ambulances')
        .update({ status: 'available', current_call: null })
        .eq('id', fixtures.standaloneAmbulance.id);
      if (statusError) throw statusError;

      const telemetry = await fixtures.standaloneDriver.clients[0].rpc('report_responder_telemetry', {
        p_payload: {
          ambulance_id: fixtures.standaloneAmbulance.id,
          sequence: 2,
          observed_at: new Date().toISOString(),
          location: fixturePoint(0.00025, 0.00025),
          heading: 100,
          accuracy_meters: 6,
        },
      });
      if (telemetry.error) throw telemetry.error;
      assert(telemetry.data?.success === true, 'Standalone telemetry refresh failed');

      const readiness = await fixtures.standaloneDispatcher.clients[0].rpc(
        'get_ambulance_dispatch_readiness',
        {
          p_ambulance_id: fixtures.standaloneAmbulance.id,
          p_request_id: fixtures.standaloneRequest.request_id,
        }
      );
      if (readiness.error) throw readiness.error;
      assert(readiness.data?.ready === true, 'Same-org standalone request readiness was rejected');
      assert(
        readiness.data?.organization_id === fixtures.standaloneOrg.id,
        'Standalone request readiness changed organization scope'
      );
      return readiness.data;
    });

    await check('cross-org standalone ambulance assignment is denied', 'role-rls', async () => {
      const result = await fixtures.dispatcherA.clients[0].rpc('assign_ambulance_to_emergency', {
        p_emergency_request_id: fixtures.standaloneRequest.request_id,
        p_ambulance_id: fixtures.standaloneAmbulance.id,
        p_priority: 1,
      });
      expectDenied(result, 'cross-org standalone ambulance assignment');
      assert(
        (await countRows(
          'emergency_responder_assignments',
          'emergency_request_id',
          fixtures.standaloneRequest.request_id
        )) === 0,
        'Denied cross-org standalone assignment created history'
      );
      return true;
    });

    const standaloneOffer = await check(
      'two dispatcher Auth sessions converge on one standalone offer',
      'concurrency',
      async () => {
        const results = await Promise.all(
          fixtures.standaloneDispatcher.clients.map((client) =>
            client.rpc('assign_ambulance_to_emergency', {
              p_emergency_request_id: fixtures.standaloneRequest.request_id,
              p_ambulance_id: fixtures.standaloneAmbulance.id,
              p_priority: 1,
            })
          )
        );
        for (const result of results) {
          if (result.error) throw result.error;
          assert(result.data?.success === true, 'Concurrent standalone offer failed');
        }

        const assignmentIds = unique(results.map((result) => result.data?.assignment_id));
        assert(assignmentIds.length === 1, 'Concurrent offer created different assignment generations');
        assert(
          results.some((result) => result.data?.already_offered === true),
          'Concurrent offer retry was not reported as already offered'
        );
        assert(
          results.some((result) => result.data?.already_offered !== true),
          'Concurrent offer did not exercise initial assignment creation'
        );
        assert(
          (await countRows(
            'emergency_responder_assignments',
            'emergency_request_id',
            fixtures.standaloneRequest.request_id
          )) === 1,
          'Concurrent standalone offer created duplicate assignment history'
        );
        return { assignment_id: assignmentIds[0], results: results.map((result) => result.data) };
      }
    );
    const standaloneAssignmentId = standaloneOffer.assignment_id;
    state.assignmentIds.add(standaloneAssignmentId);
    state.entityIds.add(standaloneAssignmentId);
    state.eventKeys.add(
      `emergency_request:${fixtures.standaloneRequest.request_id}:assignment:${standaloneAssignmentId}:offered`
    );
    assert(
      (await eventCount(
        `emergency_request:${fixtures.standaloneRequest.request_id}:assignment:${standaloneAssignmentId}:offered`
      )) === 1,
      'Concurrent standalone offer duplicated its notification'
    );

    await check('two standalone driver Auth sessions converge on one acceptance', 'concurrency', async () => {
      const results = await Promise.all(
        fixtures.standaloneDriver.clients.map((client) =>
          client.rpc('responder_accept_emergency', {
            p_request_id: fixtures.standaloneRequest.request_id,
          })
        )
      );
      for (const result of results) {
        if (result.error) throw result.error;
        assert(result.data?.success === true, 'Concurrent standalone acceptance failed');
        assert(
          result.data?.assignment_id === standaloneAssignmentId,
          'Concurrent standalone acceptance changed assignment generation'
        );
      }
      assert(
        results.some((result) => result.data?.already_accepted === true),
        'Concurrent standalone acceptance retry did not converge'
      );
      state.eventKeys.add(
        `emergency_request:${fixtures.standaloneRequest.request_id}:assignment:${standaloneAssignmentId}:accepted`
      );
      return results.map((result) => result.data);
    });

    await check('standalone responder arrives before service completion', 'lifecycle-idempotency', async () => {
      const result = await fixtures.standaloneDriver.clients[0].rpc('responder_arrive_emergency', {
        p_request_id: fixtures.standaloneRequest.request_id,
      });
      if (result.error) throw result.error;
      assert(result.data?.success === true, 'Standalone arrival failed');
      state.eventKeys.add(
        `emergency_request:${fixtures.standaloneRequest.request_id}:assignment:${standaloneAssignmentId}:arrived`
      );
      return result.data;
    });

    await check('service role completes ambulance lifecycle through Console command idempotently', 'service-role', async () => {
      const first = await admin.rpc('console_complete_emergency', {
        p_request_id: fixtures.standaloneRequest.request_id,
      });
      if (first.error) throw first.error;
      assert(first.data?.success === true, 'Service-role Console completion failed');

      const retry = await admin.rpc('console_complete_emergency', {
        p_request_id: fixtures.standaloneRequest.request_id,
      });
      if (retry.error) throw retry.error;
      assert(retry.data?.already_completed === true, 'Service-role completion retry did not converge');
      state.eventKeys.add(
        `emergency_request:${fixtures.standaloneRequest.request_id}:assignment:${standaloneAssignmentId}:completed`
      );

      const request = await getRequest(fixtures.standaloneRequest.request_id);
      const assignment = await getAssignment(standaloneAssignmentId);
      assert(request.status === 'completed', 'Service-role path did not complete the request');
      assert(assignment.status === 'completed', 'Service-role path did not complete the assignment');
      assert(
        (await countRows('visits', 'request_id', fixtures.standaloneRequest.request_id)) === 1,
        'Service-role completion duplicated visit history'
      );
      assert(
        (await countRows(
          'emergency_status_transitions',
          'emergency_request_id',
          fixtures.standaloneRequest.request_id,
          (query) => query.eq('to_status', 'completed')
        )) === 1,
        'Service-role completion duplicated its transition'
      );
      assert(
        (await eventCount(
          `emergency_request:${fixtures.standaloneRequest.request_id}:assignment:${standaloneAssignmentId}:completed`
        )) === 1,
        'Service-role completion duplicated its notification'
      );
      return retry.data;
    });

    await check('unavailable fleet leaves a paid request queued without fake dispatch', 'emergency-fallback', async () => {
      const { error: maintenanceError } = await admin
        .from('ambulances')
        .update({ status: 'maintenance', telemetry_lease_expires_at: new Date(Date.now() - 60_000).toISOString() })
        .in('id', [fixtures.ambulance.id, fixtures.standaloneAmbulance.id]);
      if (maintenanceError) throw maintenanceError;

      const fallback = await createCardRequest({
        actor: fixtures.patientB,
        hospital: fixtures.hospital,
        label: 'fallback',
      });
      fixtures.fallback = fallback;
      const payment = await admin.rpc('complete_card_payment', {
        p_payment_intent_id: fallback.paymentIntentId,
        p_provider_response: { id: fallback.paymentIntentId, status: 'succeeded', testTag: tag },
        p_fee_amount: 3.75,
      });
      if (payment.error) throw payment.error;
      assert(payment.data?.success === true, 'Fallback request payment did not complete');
      state.eventKeys.add(`payment:${fallback.payment_id}:status:completed`);

      const request = await getRequest(fallback.request_id);
      assert(request.status === 'in_progress', 'Fallback request left the dispatch queue');
      assert(request.current_responder_assignment_id === null, 'Unavailable ambulance was falsely assigned');
      const auto = await admin.rpc('auto_assign_ambulance', {
        p_emergency_request_id: fallback.request_id,
        p_max_distance_km: 1,
        p_specialty_required: null,
      });
      if (auto.error) throw auto.error;
      assert(auto.data?.success === false && auto.data?.code === 'NO_AMBULANCE_AVAILABLE', 'Unavailable fallback was not explicit');
      return auto.data;
    });

    await check('restored readiness can offer, decline, and requeue without stale assignment', 'emergency-fallback', async () => {
      const { error: availableError } = await admin
        .from('ambulances')
        .update({ status: 'available', current_call: null })
        .eq('id', fixtures.ambulance.id);
      if (availableError) throw availableError;

      const telemetry = await fixtures.driverA.clients[0].rpc('report_responder_telemetry', {
        p_payload: {
          ambulance_id: fixtures.ambulance.id,
          sequence: 3,
          observed_at: new Date().toISOString(),
          location: fixturePoint(0.00015, 0.00015),
          heading: 76,
          accuracy_meters: 7,
        },
      });
      if (telemetry.error) throw telemetry.error;
      assert(telemetry.data?.success === true, 'Restored telemetry failed');

      const auto = await admin.rpc('auto_assign_ambulance', {
        p_emergency_request_id: fixtures.fallback.request_id,
        p_max_distance_km: 1,
        p_specialty_required: null,
      });
      if (auto.error) throw auto.error;
      assert(auto.data?.success === true && auto.data?.auto_assigned === true, 'Restored ambulance was not offered');
      assert(auto.data?.ambulance_id === fixtures.ambulance.id, 'Restored dispatch escaped the fixture organization');
      const fallbackAssignmentId = auto.data.assignment_id;
      state.assignmentIds.add(fallbackAssignmentId);
      state.entityIds.add(fallbackAssignmentId);
      state.eventKeys.add(
        `emergency_request:${fixtures.fallback.request_id}:assignment:${fallbackAssignmentId}:offered`
      );

      const decline = await fixtures.driverA.clients[0].rpc('responder_decline_emergency', {
        p_request_id: fixtures.fallback.request_id,
        p_reason: 'live proof decline',
      });
      if (decline.error) throw decline.error;
      assert(decline.data?.success === true && decline.data?.queued === true, 'Decline did not requeue');

      const request = await getRequest(fixtures.fallback.request_id);
      assert(request.status === 'in_progress', 'Declined request did not remain queued');
      assert(request.current_responder_assignment_id === null, 'Declined assignment remained current');
      const assignment = await getAssignment(fallbackAssignmentId);
      assert(assignment.status === 'declined', 'Assignment history did not retain decline');

      const declineRetry = await fixtures.driverA.clients[1].rpc('responder_decline_emergency', {
        p_request_id: fixtures.fallback.request_id,
        p_reason: 'live proof decline retry',
      });
      if (declineRetry.error) throw declineRetry.error;
      assert(declineRetry.data?.success === false, 'Decline retry should report no current offer');

      const rematch = await admin.rpc('auto_assign_ambulance', {
        p_emergency_request_id: fixtures.fallback.request_id,
        p_max_distance_km: 1,
        p_specialty_required: null,
      });
      if (rematch.error) throw rematch.error;
      assert(rematch.data?.success === false && rematch.data?.code === 'NO_AMBULANCE_AVAILABLE', 'Released generation was reused');
      return decline.data;
    });

    await check('all canonical notification keys remain singular', 'notification-idempotency', async () => {
      for (const eventKey of state.eventKeys) {
        assert((await eventCount(eventKey)) === 1, `Expected one notification for ${eventKey}`);
      }
      for (const eventKey of state.recipientScopedEventKeys) {
        const { data, error } = await admin
          .from('notifications')
          .select('user_id,event_key')
          .eq('event_key', eventKey);
        if (error) throw error;
        assert((data || []).length > 0, `Expected at least one recipient for ${eventKey}`);
        const recipientCounts = new Map();
        for (const row of data || []) {
          recipientCounts.set(row.user_id, (recipientCounts.get(row.user_id) || 0) + 1);
        }
        for (const [recipientId, count] of recipientCounts) {
          assert(count === 1, `Expected one ${eventKey} notification for recipient ${recipientId}`);
        }
      }
      return {
        event_keys: state.eventKeys.size,
        recipient_scoped_event_keys: state.recipientScopedEventKeys.size,
      };
    });

    report.fixture = {
      ...report.fixture,
      organization_ids: [...state.organizationIds],
      hospital_ids: [...state.hospitalIds],
      request_ids: [...state.requestIds],
      assignment_ids: [...state.assignmentIds],
    };
  } catch (error) {
    primaryError = error;
  } finally {
    await cleanupFixture();
    try {
      await assertZeroResidue();
      console.log('[emergency-dispatch-live-e2e] PASS zero-residue cleanup');
    } catch (error) {
      report.failed += 1;
      report.results.push({
        name: 'zero-residue cleanup',
        category: 'cleanup',
        status: 'fail',
        detail: error.message,
      });
      if (!primaryError) primaryError = error;
    }

    if (!report.cleanup_passed && !primaryError) {
      primaryError = new Error('One or more exact cleanup operations failed');
    }

    report.finished_at = new Date().toISOString();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (primaryError || report.failed > 0 || !report.cleanup_passed || !report.zero_residue_passed) {
    console.error(`[emergency-dispatch-live-e2e] FAIL: ${primaryError?.message || 'proof gate failed'}`);
    console.error(`[emergency-dispatch-live-e2e] Report: ${reportPath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[emergency-dispatch-live-e2e] PASS ${report.passed} production proof checks.`);
  console.log(`[emergency-dispatch-live-e2e] Report: ${reportPath}`);
}

runProof().catch((error) => {
  console.error(`[emergency-dispatch-live-e2e] Unhandled failure: ${error.message}`);
  process.exitCode = 1;
});
