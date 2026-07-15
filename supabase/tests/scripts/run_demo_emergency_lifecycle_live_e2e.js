#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const appRoot = path.resolve(__dirname, '..', '..', '..');
const linkedRefPath = path.join(appRoot, 'supabase', '.temp', 'project-ref');
const reportPath = path.join(
  appRoot,
  'supabase',
  'tests',
  'artifacts',
  'demo_emergency_lifecycle_live_e2e_report.json',
);
const confirmationEnv = 'IVISIT_DEMO_EMERGENCY_LIVE_E2E';

function loadEnvFiles() {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(appRoot, fileName);
    if (!fs.existsSync(filePath)) continue;
    for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

loadEnvFiles();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const projectRefArg = args.find((arg) => arg.startsWith('--project-ref='));
const projectRef = projectRefArg ? projectRefArg.split('=')[1] : null;
const linkedProjectRef = fs.existsSync(linkedRefPath)
  ? fs.readFileSync(linkedRefPath, 'utf8').trim()
  : null;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!apply) {
  console.log('[demo-emergency-live-e2e] SKIP: pass --apply with the explicit confirmation env.');
  process.exit(0);
}

const gateFailures = [];
if (!supabaseUrl) gateFailures.push('Supabase URL');
if (!anonKey) gateFailures.push('Supabase anon key');
if (!serviceRoleKey) gateFailures.push('Supabase service role key');
if (!linkedProjectRef || projectRef !== linkedProjectRef) {
  gateFailures.push('requested project must match the linked project');
}
if (projectRefFromUrl(supabaseUrl) !== projectRef) {
  gateFailures.push('Supabase URL must match the requested project');
}
if (process.env[confirmationEnv] !== projectRef) {
  gateFailures.push(`${confirmationEnv} must exactly match the project ref`);
}
if (gateFailures.length) {
  console.error('[demo-emergency-live-e2e] Refusing live writes:');
  for (const failure of gateFailures) console.error(`- ${failure}`);
  process.exit(2);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const runId = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
const tag = `demo-lifecycle-${runId}`;
const password = `DemoProof!${crypto.randomBytes(18).toString('base64url')}`;
const point = { lat: -0.234567, lng: -140.765432 };
const state = {
  userIds: new Set(),
  organizationIds: new Set(),
  walletIds: new Set(),
  hospitalIds: new Set(),
  ambulanceIds: new Set(),
  staffingIds: new Set(),
  requestIds: new Set(),
  paymentIds: new Set(),
  visitIds: new Set(),
  assignmentIds: new Set(),
  adminAuditIds: new Set(),
  activityIds: new Set(),
  entityIds: new Set(),
  channels: new Set(),
};
const report = {
  run_id: runId,
  project_ref: projectRef,
  started_at: new Date().toISOString(),
  checks: [],
  cleanup: [],
};

function toReportDetail(value) {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(
      JSON.stringify(value, (key, nestedValue) => {
        if (['client', 'clients', 'channel', 'channels'].includes(key)) {
          return undefined;
        }
        if (nestedValue instanceof Set) return [...nestedValue];
        if (typeof nestedValue === 'function') return undefined;
        return nestedValue;
      }),
    );
  } catch {
    return { summary: String(value?.id ?? value?.request_id ?? 'completed') };
  }
}

async function check(name, fn) {
  try {
    const detail = await fn();
    report.checks.push({ name, status: 'pass', detail: toReportDetail(detail) });
    console.log(`[demo-emergency-live-e2e] PASS ${name}`);
    return detail;
  } catch (error) {
    report.checks.push({ name, status: 'fail', error: error.message });
    throw error;
  }
}

async function safely(name, fn) {
  try {
    await fn();
    report.cleanup.push({ name, status: 'pass' });
  } catch (error) {
    report.cleanup.push({ name, status: 'fail', error: error.message });
  }
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (data) return;
    await delay(250);
  }
  throw new Error(`Profile trigger did not create ${userId}`);
}

async function signIn(email) {
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const token = data.session.access_token;
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.realtime.setAuth(token);
  return { client, sessionId: decodeJwtPayload(token).session_id || null };
}

async function createActor({ label, role, organizationId = null, providerType = null, sessions = 1 }) {
  const email = `${tag}-${label}@ivisit-e2e.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${label} ${tag}` },
  });
  if (error) throw error;
  const userId = data.user.id;
  state.userIds.add(userId);
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
    clients: signedIn.map((entry) => entry.client),
    sessionIds: signedIn.map((entry) => entry.sessionId),
  };
}

async function openRequestProbe(client, requestId, label) {
  const events = [];
  const probe = { client, channel: null, events };
  const subscribed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} subscription timed out`)), 10000);
    probe.channel = client
      .channel(`${tag}-${label}-${crypto.randomBytes(3).toString('hex')}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emergency_requests', filter: `id=eq.${requestId}` },
        (payload) => events.push(payload),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          resolve();
        }
        if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          clearTimeout(timer);
          reject(new Error(`${label} subscription entered ${status}`));
        }
      });
  });
  state.channels.add(probe);
  await subscribed;
  return probe;
}

async function waitForEvent(probe, predicate, label) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const event = probe.events.find(predicate);
    if (event) return event;
    await delay(100);
  }
  throw new Error(`Realtime event not received for ${label}`);
}

async function getRequest(requestId) {
  const { data, error } = await admin
    .from('emergency_requests')
    .select(
      'id,status,payment_status,ambulance_id,responder_id,current_responder_assignment_id,responder_telemetry_sequence,responder_location_received_at,responder_telemetry_lease_expires_at,patient_acknowledged_arrival_at',
    )
    .eq('id', requestId)
    .single();
  if (error) throw error;
  return data;
}

async function invokeLifecycle(client, requestId, action, telemetry = null) {
  const { data, error } = await client.functions.invoke('demo-emergency-lifecycle', {
    body: { requestId, action, ...(telemetry ? { telemetry } : {}) },
  });
  if (error) throw error;
  return data;
}

async function collectGeneratedIds() {
  const requestIds = [...state.requestIds];
  if (requestIds.length) {
    for (const [table, target] of [
      ['visits', state.visitIds],
      ['payments', state.paymentIds],
      ['emergency_responder_assignments', state.assignmentIds],
    ]) {
      const column = table === 'emergency_responder_assignments' ? 'emergency_request_id' : 'request_id';
      const queryColumn = table === 'payments' ? 'emergency_request_id' : column;
      const { data, error } = await admin.from(table).select('id').in(queryColumn, requestIds);
      if (error) throw error;
      for (const row of data || []) {
        target.add(row.id);
        state.entityIds.add(row.id);
      }
    }
  }
  if (state.organizationIds.size) {
    const { data, error } = await admin
      .from('organization_wallets')
      .select('id')
      .in('organization_id', [...state.organizationIds]);
    if (error) throw error;
    for (const row of data || []) state.walletIds.add(row.id);
  }
  if (state.userIds.size) {
    const userIds = [...state.userIds];
    const [auditResult, activityResult] = await Promise.all([
      admin.from('admin_audit_log').select('id').in('admin_id', userIds),
      admin.from('user_activity').select('id').in('user_id', userIds),
    ]);
    if (auditResult.error) throw auditResult.error;
    if (activityResult.error) throw activityResult.error;
    for (const row of auditResult.data || []) state.adminAuditIds.add(row.id);
    for (const row of activityResult.data || []) state.activityIds.add(row.id);
  }
}

async function deleteRequestGraphs() {
  const ids = [...state.requestIds];
  if (!ids.length) return;
  const sqlIds = ids.map((id) => `'${id}'::uuid`).join(',');
  const sql = `
DO $$
BEGIN
  ALTER TABLE public.emergency_requests DISABLE TRIGGER on_emergency_start_dispatch;
  ALTER TABLE public.emergency_responder_assignments DISABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_status_transitions DISABLE TRIGGER trg_emergency_status_transitions_append_only;
  DELETE FROM public.emergency_responder_assignments WHERE emergency_request_id IN (${sqlIds});
  DELETE FROM public.emergency_status_transitions WHERE emergency_request_id IN (${sqlIds});
  DELETE FROM public.emergency_requests WHERE id IN (${sqlIds});
  ALTER TABLE public.emergency_status_transitions ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  ALTER TABLE public.emergency_responder_assignments ENABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_requests ENABLE TRIGGER on_emergency_start_dispatch;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.emergency_status_transitions ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  ALTER TABLE public.emergency_responder_assignments ENABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_requests ENABLE TRIGGER on_emergency_start_dispatch;
  RAISE;
END;
$$;`;
  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Request graph cleanup failed');
}

async function deleteIds(table, ids) {
  const values = [...ids];
  if (!values.length) return;
  const { error } = await admin.from(table).delete().in('id', values);
  if (error) throw error;
}

async function cleanup() {
  for (const probe of state.channels) {
    await safely('close realtime channel', () => probe.client.removeChannel(probe.channel));
  }
  await safely('collect generated ids', collectGeneratedIds);
  await safely('delete fixture notifications', async () => {
    if (state.userIds.size) {
      const { error } = await admin.from('notifications').delete().in('user_id', [...state.userIds]);
      if (error) throw error;
    }
  });
  await safely('delete fixture user activity', () =>
    deleteIds('user_activity', state.activityIds));
  await safely('delete fixture admin audit rows', () =>
    deleteIds('admin_audit_log', state.adminAuditIds));
  await safely('delete fixture visits', () => deleteIds('visits', state.visitIds));
  await safely('delete fixture wallet ledger', async () => {
    if (!state.paymentIds.size) return;
    const { error } = await admin.from('wallet_ledger').delete().in('reference_id', [...state.paymentIds]);
    if (error) throw error;
  });
  await safely('delete fixture request graphs', deleteRequestGraphs);
  await safely('delete fixture payments', () => deleteIds('payments', state.paymentIds));
  await safely('delete patient wallets', async () => {
    if (!state.userIds.size) return;
    const { error } = await admin.from('patient_wallets').delete().in('user_id', [...state.userIds]);
    if (error) throw error;
  });
  await safely('delete staffing', () => deleteIds('ambulance_staff_assignments', state.staffingIds));
  await safely('delete ambulances', () => deleteIds('ambulances', state.ambulanceIds));
  await safely('delete hospitals', () => deleteIds('hospitals', state.hospitalIds));
  await safely('delete organization wallets', () => deleteIds('organization_wallets', state.walletIds));
  await safely('delete organizations', () => deleteIds('organizations', state.organizationIds));
  await safely('delete id mappings', async () => {
    if (!state.entityIds.size) return;
    const { error } = await admin.from('id_mappings').delete().in('entity_id', [...state.entityIds]);
    if (error) throw error;
  });
  for (const userId of state.userIds) {
    await safely(`delete auth user ${userId}`, async () => {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    });
  }
}

async function assertZeroResidue() {
  const checks = [
    ['emergency_requests', 'id', state.requestIds],
    ['payments', 'id', state.paymentIds],
    ['visits', 'id', state.visitIds],
    ['ambulance_staff_assignments', 'id', state.staffingIds],
    ['ambulances', 'id', state.ambulanceIds],
    ['hospitals', 'id', state.hospitalIds],
    ['organization_wallets', 'id', state.walletIds],
    ['organizations', 'id', state.organizationIds],
    ['user_activity', 'id', state.activityIds],
    ['admin_audit_log', 'id', state.adminAuditIds],
    ['profiles', 'id', state.userIds],
  ];
  for (const [table, column, ids] of checks) {
    if (!ids.size) continue;
    const { count, error } = await admin
      .from(table)
      .select('id', { count: 'exact', head: true })
      .in(column, [...ids]);
    if (error) throw error;
    assert(count === 0, `${table} retained ${count} fixture row(s)`);
  }
}

async function main() {
let failed = null;
try {
  const organization = await check('create isolated demo organization', async () => {
    const { data, error } = await admin
      .from('organizations')
      .insert({
        name: `Demo Lifecycle Org ${tag}`,
        organization_type: 'hospital',
        registration_number: tag,
        contact_email: `${tag}-contact@ivisit-e2e.local`,
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        is_active: true,
      })
      .select('id')
      .single();
    if (error) throw error;
    state.organizationIds.add(data.id);
    state.entityIds.add(data.id);
    return data;
  });

  await check('fund isolated demo organization wallet', async () => {
    const { data, error } = await admin
      .from('organization_wallets')
      .upsert(
        {
          organization_id: organization.id,
          balance: 10000,
          currency: 'USD',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' },
      )
      .select('id,balance')
      .single();
    if (error) throw error;
    state.walletIds.add(data.id);
    state.entityIds.add(data.id);
    assert(Number(data.balance) === 10000, 'Demo organization wallet was not funded');
    return data;
  });

  const hospital = await check('create isolated demo hospital', async () => {
    const { data, error } = await admin
      .from('hospitals')
      .insert({
        organization_id: organization.id,
        name: `Demo Lifecycle Hospital ${tag}`,
        address: `1 ${tag} Way`,
        latitude: point.lat,
        longitude: point.lng,
        coordinates: `SRID=4326;POINT(${point.lng} ${point.lat})`,
        place_id: `demo:${tag}`,
        features: ['demo_seed', 'demo_verified', 'ivisit_demo', tag],
        status: 'available',
        verified: true,
        verification_status: 'demo_verified',
        emergency_eligible: true,
        provider_type: 'hospital',
        available_beds: 10,
        total_beds: 20,
        ambulances_count: 1,
        timezone: 'UTC',
        timezone_confirmed_at: new Date().toISOString(),
        timezone_confirmation_source: 'manual',
      })
      .select('id,name,organization_id')
      .single();
    if (error) throw error;
    state.hospitalIds.add(data.id);
    state.entityIds.add(data.id);
    return data;
  });

  const patient = await check('create two-session patient', () =>
    createActor({ label: 'patient', role: 'patient', sessions: 2 }),
  );
  const driver = await check('create demo responder', () =>
    createActor({
      label: 'driver',
      role: 'provider',
      organizationId: organization.id,
      providerType: 'driver',
    }),
  );
  const orgAdmin = await check('create demo org admin', () =>
    createActor({ label: 'org-admin', role: 'org_admin', organizationId: organization.id }),
  );
  assert(
    patient.sessionIds.length === 2 &&
      patient.sessionIds.every(Boolean) &&
      patient.sessionIds[0] !== patient.sessionIds[1],
    'Patient clients are not independent Auth sessions',
  );

  await check('bind hospital admin', async () => {
    const { error } = await admin.from('hospitals').update({ org_admin_id: orgAdmin.id }).eq('id', hospital.id);
    if (error) throw error;
  });

  const ambulance = await check('create available demo ambulance', async () => {
    const { data, error } = await admin
      .from('ambulances')
      .insert({
        organization_id: organization.id,
        hospital_id: hospital.id,
        type: 'BLS',
        call_sign: `DEMO-${runId.slice(-8)}`,
        vehicle_number: `UNIT-${runId.slice(-6)}`,
        license_plate: `DMO-${runId.slice(-5)}`,
        status: 'available',
        location: `SRID=4326;POINT(${point.lng} ${point.lat})`,
        heading: 0,
      })
      .select('id')
      .single();
    if (error) throw error;
    state.ambulanceIds.add(data.id);
    state.entityIds.add(data.id);
    return data;
  });

  await check('staff demo ambulance through live authority', async () => {
    const { data, error } = await orgAdmin.clients[0].rpc('staff_ambulance_responder', {
      p_ambulance_id: ambulance.id,
      p_responder_id: driver.id,
    });
    if (error) throw error;
    assert(data?.success === true, 'Staffing command failed');
    state.staffingIds.add(data.staffing_id);
    state.entityIds.add(data.staffing_id);
  });

  const created = await check('patient creates canonical demo cash request', async () => {
    const { data, error } = await patient.clients[0].rpc('create_emergency_v4', {
      p_user_id: patient.id,
      p_request_data: {
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        service_type: 'ambulance',
        specialty: 'Emergency Medicine',
        ambulance_type: 'ambulance',
        patient_location: { lat: point.lat + 0.0002, lng: point.lng + 0.0002 },
        patient_snapshot: { fullName: `Patient ${tag}`, testTag: tag },
      },
      p_payment_data: {
        method: 'cash',
        method_id: `${tag}-cash`,
        total_amount: 0.01,
        currency: 'USD',
      },
    });
    if (error) throw error;
    assert(data?.success === true && data?.requires_approval === true, 'Demo request creation failed');
    state.requestIds.add(data.request_id);
    state.paymentIds.add(data.payment_id);
    state.entityIds.add(data.request_id);
    state.entityIds.add(data.payment_id);
    return data;
  });

  await check('dispatch type compatibility preserves specific equipment requests', async () => {
    const setRequestType = async (ambulanceType) => {
      const { error } = await admin
        .from('emergency_requests')
        .update({ ambulance_type: ambulanceType })
        .eq('id', created.request_id);
      if (error) throw error;
    };

    let advancedSnapshot = null;
    try {
      await setRequestType('ambulance_advanced');
      const { data, error } = await admin.rpc('ambulance_dispatch_readiness_snapshot', {
        p_ambulance_id: ambulance.id,
        p_request_id: created.request_id,
      });
      if (error) throw error;
      advancedSnapshot = data;
      assert(data?.type_supported === false, 'An advanced request incorrectly accepted a BLS unit');
      assert(
        Array.isArray(data?.reasons) && data.reasons.includes('type_not_supported'),
        'The advanced/BLS rejection reason is missing',
      );
    } finally {
      await setRequestType('ambulance');
    }

    const { data: genericSnapshot, error: genericError } = await admin.rpc(
      'ambulance_dispatch_readiness_snapshot',
      {
        p_ambulance_id: ambulance.id,
        p_request_id: created.request_id,
      },
    );
    if (genericError) throw genericError;
    assert(genericSnapshot?.type_supported === true, 'A generic request did not accept a BLS unit');

    return {
      advanced_reasons: advancedSnapshot?.reasons || [],
      generic_type_supported: genericSnapshot?.type_supported === true,
    };
  });

  const probeA = await openRequestProbe(patient.clients[0], created.request_id, 'patient-a');
  const probeB = await openRequestProbe(patient.clients[1], created.request_id, 'patient-b');

  const approved = await check('demo approval creates a canonical accepted assignment', async () => {
    const { data, error } = await patient.clients[0].functions.invoke('demo-approve-cash-payment', {
      body: { paymentId: created.payment_id, requestId: created.request_id },
    });
    if (error) {
      let responseBody = null;
      try {
        responseBody = await error.context?.json?.();
      } catch (_responseError) {}
      throw new Error(
        `Demo approval Edge failure: ${JSON.stringify(responseBody) || error.message}`,
      );
    }
    assert(data?.success === true, `Demo approval failed: ${JSON.stringify(data)}`);
    assert(data?.dispatch?.ready === true, `Demo dispatch did not become ready: ${JSON.stringify(data?.dispatch)}`);
    const request = await getRequest(created.request_id);
    assert(request.status === 'accepted', `Expected accepted, received ${request.status}`);
    assert(request.current_responder_assignment_id, 'Accepted request has no assignment');
    assert(request.responder_id === driver.id, 'Accepted request resolved another responder');
    state.assignmentIds.add(request.current_responder_assignment_id);
    state.entityIds.add(request.current_responder_assignment_id);
    return request;
  });

  await check('both patient sessions receive accepted state', async () => {
    await Promise.all([
      waitForEvent(probeA, (event) => event.new?.status === 'accepted', 'patient A accepted'),
      waitForEvent(probeB, (event) => event.new?.status === 'accepted', 'patient B accepted'),
    ]);
    const { data, error } = await patient.clients[1]
      .from('emergency_requests')
      .select('id,status,responder_id,current_responder_assignment_id')
      .eq('id', created.request_id)
      .single();
    if (error) throw error;
    assert(data.status === 'accepted' && data.responder_id === driver.id, 'Session B did not hydrate accepted state');
  });

  const firstTelemetry = await check('session A reports canonical demo telemetry', async () => {
    const result = await invokeLifecycle(patient.clients[0], created.request_id, 'report_telemetry', {
      location: { latitude: point.lat + 0.0001, longitude: point.lng + 0.0001 },
      heading: 45,
      accuracyMeters: 5,
    });
    assert(result?.success === true, `Telemetry failed: ${JSON.stringify(result)}`);
    const request = await getRequest(created.request_id);
    assert(Number(request.responder_telemetry_sequence) > 0, 'Telemetry sequence did not advance');
    assert(request.responder_location_received_at, 'Telemetry receive time is missing');
    return request;
  });

  await check('session B receives and advances the same telemetry stream', async () => {
    await waitForEvent(
      probeB,
      (event) => Number(event.new?.responder_telemetry_sequence) >= Number(firstTelemetry.responder_telemetry_sequence),
      'session B telemetry',
    );
    const result = await invokeLifecycle(patient.clients[1], created.request_id, 'report_telemetry', {
      location: { latitude: point.lat + 0.00015, longitude: point.lng + 0.00015 },
      heading: 60,
      accuracyMeters: 5,
    });
    assert(result?.success === true, `Second-session telemetry failed: ${JSON.stringify(result)}`);
    const request = await getRequest(created.request_id);
    assert(
      Number(request.responder_telemetry_sequence) > Number(firstTelemetry.responder_telemetry_sequence),
      'Second session did not advance the shared telemetry sequence',
    );
  });

  await check('demo responder arrival syncs to both sessions', async () => {
    const result = await invokeLifecycle(patient.clients[0], created.request_id, 'mark_arrived');
    assert(result?.success === true && result?.request?.status === 'arrived', 'Demo arrival did not persist');
    await waitForEvent(probeB, (event) => event.new?.status === 'arrived', 'session B arrival');
    const request = await getRequest(created.request_id);
    assert(request.status === 'arrived', 'Canonical request did not reach arrived');
  });

  const acknowledgedAt = await check('patient confirm arrival is shared and idempotent', async () => {
    const first = await patient.clients[1].rpc('patient_acknowledge_responder_arrival', {
      p_request_id: created.request_id,
    });
    if (first.error) throw first.error;
    assert(first.data?.success === true && first.data?.acknowledged_at, 'Patient confirmation failed');
    await waitForEvent(
      probeA,
      (event) => Boolean(event.new?.patient_acknowledged_arrival_at),
      'session A arrival acknowledgement',
    );
    const replay = await patient.clients[0].rpc('patient_acknowledge_responder_arrival', {
      p_request_id: created.request_id,
    });
    if (replay.error) throw replay.error;
    assert(replay.data?.acknowledged_at === first.data.acknowledged_at, 'Acknowledgement replay changed time');
    return first.data.acknowledged_at;
  });

  await check('arrival replay does not duplicate lifecycle truth', async () => {
    const replay = await invokeLifecycle(patient.clients[1], created.request_id, 'mark_arrived');
    assert(replay?.success === true && replay?.request?.status === 'arrived', 'Arrival replay failed');
    const request = await getRequest(created.request_id);
    assert(request.patient_acknowledged_arrival_at === acknowledgedAt, 'Arrival replay erased acknowledgement');
  });

  await check('live completion authority remains unavailable to the patient', async () => {
    const result = await patient.clients[0].rpc('responder_complete_emergency', {
      p_request_id: created.request_id,
    });
    assert(result.error, 'Patient unexpectedly gained responder completion authority');
  });

  await check('demo responder completion syncs to both sessions', async () => {
    const result = await invokeLifecycle(patient.clients[1], created.request_id, 'mark_completed');
    assert(
      result?.success === true && result?.request?.status === 'completed',
      `Demo completion did not persist: ${JSON.stringify(result)}`,
    );
    await waitForEvent(probeA, (event) => event.new?.status === 'completed', 'session A completion');

    const request = await getRequest(created.request_id);
    assert(request.status === 'completed', 'Canonical request did not reach completed');
    assert(
      request.patient_acknowledged_arrival_at === acknowledgedAt,
      'Completion erased patient arrival acknowledgement',
    );

    const { data: assignment, error: assignmentError } = await admin
      .from('emergency_responder_assignments')
      .select('status,completed_at')
      .eq('id', approved.current_responder_assignment_id)
      .single();
    if (assignmentError) throw assignmentError;
    assert(
      assignment.status === 'completed' && assignment.completed_at,
      'Responder assignment did not complete',
    );

    const { data: completedAmbulance, error: ambulanceError } = await admin
      .from('ambulances')
      .select('status,current_call')
      .eq('id', ambulance.id)
      .single();
    if (ambulanceError) throw ambulanceError;
    assert(
      completedAmbulance.status === 'available' && completedAmbulance.current_call === null,
      'Ambulance was not released after completion',
    );
  });

  await check('demo completion replay remains idempotent', async () => {
    const replay = await invokeLifecycle(patient.clients[0], created.request_id, 'mark_completed');
    assert(
      replay?.success === true && replay?.request?.status === 'completed',
      'Completion replay failed',
    );
  });

  await check('accepted, arrived, acknowledged, and completed notifications remain singular', async () => {
    const keys = [
      `emergency_request:${created.request_id}:assignment:${approved.current_responder_assignment_id}:accepted`,
      `emergency_request:${created.request_id}:assignment:${approved.current_responder_assignment_id}:arrived`,
      `emergency_request:${created.request_id}:arrival_acknowledged`,
      `emergency_request:${created.request_id}:assignment:${approved.current_responder_assignment_id}:completed`,
    ];
    for (const eventKey of keys) {
      const { count, error } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('event_key', eventKey);
      if (error) throw error;
      assert(count === 1, `${eventKey} expected one notification, received ${count}`);
    }
  });
} catch (error) {
  failed = error;
  console.error(`[demo-emergency-live-e2e] FAIL ${error.message}`);
} finally {
  await cleanup();
  try {
    await assertZeroResidue();
    report.zero_residue = true;
    console.log('[demo-emergency-live-e2e] PASS zero-residue cleanup');
  } catch (error) {
    report.zero_residue = false;
    report.cleanup.push({ name: 'zero-residue assertions', status: 'fail', error: error.message });
    if (!failed) failed = error;
  }
  report.finished_at = new Date().toISOString();
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (failed) process.exitCode = 1;
else {
  console.log(`[demo-emergency-live-e2e] PASS ${report.checks.length} live checks.`);
  console.log(`[demo-emergency-live-e2e] Report: ${reportPath}`);
}
}

main().catch((error) => {
  console.error(`[demo-emergency-live-e2e] FAIL ${error.message}`);
  process.exitCode = 1;
});
