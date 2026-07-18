const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const {
  loadManifest,
  registerResource,
  saveManifest,
} = require('./demo_run_manifest');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const TEST_USER_PASSWORD = 'password123!';
const ALLOWED_ACTIONS = new Set([
  'status',
  'approve-cash',
  'dispatch',
  'accept',
  'telemetry',
  'arrive',
  'complete',
]);

function argumentValue(name, argv = process.argv.slice(2)) {
  const prefix = `--${name}=`;
  const exact = argv.find((value) => value.startsWith(prefix));
  return exact ? exact.slice(prefix.length) : null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function emailFor(runId, role) {
  return `test-${runId}-${role}@ivisit-e2e.local`;
}

async function createAuthedClient(email, label) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_USER_PASSWORD,
  });
  if (error) throw new Error(`${label} sign-in failed: ${error.message}`);
  return client;
}

function track(manifest, manifestPath, resourceKey, value) {
  if (!value) return;
  registerResource(manifest, resourceKey, value);
  saveManifest(manifest, manifestPath);
}

async function rpc(client, name, args, label) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${label} failed: ${error.message}`);
  if (data?.success !== true) {
    throw new Error(`${label} rejected: ${JSON.stringify(data)}`);
  }
  return data;
}

async function loadRequestGraph(admin, manifest, manifestPath) {
  const patientId = manifest.resources.authUserIds[0];
  assert(patientId, 'Browser fixture manifest has no patient identity');

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id,role,provider_type')
    .in('id', manifest.resources.authUserIds);
  if (profileError) throw new Error(`fixture profile lookup failed: ${profileError.message}`);

  const patient = (profiles || []).find((row) => row.role === 'patient');
  const driver = (profiles || []).find((row) => row.provider_type === 'driver');
  const orgAdmin = (profiles || []).find((row) => row.role === 'org_admin');
  assert(patient && driver && orgAdmin, 'Browser fixture actor roles are incomplete');

  const { data: requests, error: requestError } = await admin
    .from('emergency_requests')
    .select(
      'id,status,payment_status,payment_id,ambulance_id,current_responder_assignment_id,patient_acknowledged_arrival_at,created_at'
    )
    .eq('user_id', patient.id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (requestError) throw new Error(`fixture request lookup failed: ${requestError.message}`);
  const request = requests?.[0] || null;

  let payment = null;
  let visit = null;
  if (request) {
    track(manifest, manifestPath, 'emergencyRequestIds', request.id);
    if (request.current_responder_assignment_id) {
      track(
        manifest,
        manifestPath,
        'responderAssignmentIds',
        request.current_responder_assignment_id
      );
    }

    const { data: payments, error: paymentError } = await admin
      .from('payments')
      .select('id,status,payment_method,emergency_request_id')
      .eq('emergency_request_id', request.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (paymentError) throw new Error(`fixture payment lookup failed: ${paymentError.message}`);
    payment = payments?.[0] || null;
    if (payment?.id) track(manifest, manifestPath, 'paymentIds', payment.id);

    const { data: visits, error: visitError } = await admin
      .from('visits')
      .select('id,status,rating,rated_at,request_id')
      .eq('request_id', request.id)
      .limit(1);
    if (visitError) throw new Error(`fixture visit lookup failed: ${visitError.message}`);
    visit = visits?.[0] || null;
    if (visit?.id) track(manifest, manifestPath, 'visitIds', visit.id);
  }

  return {
    actors: { patient, driver, orgAdmin },
    request,
    payment,
    visit,
    ambulanceId: manifest.resources.ambulanceIds[0] || request?.ambulance_id || null,
  };
}

async function main(argv = process.argv.slice(2)) {
  assert(supabaseUrl && serviceRoleKey && anonKey, 'Missing Supabase credentials');
  const manifestArgument = argumentValue('manifest', argv);
  const action = argumentValue('action', argv) || 'status';
  assert(manifestArgument, 'Pass --manifest=<path>');
  assert(ALLOWED_ACTIONS.has(action), `Unsupported browser fixture action: ${action}`);

  const manifestPath = path.resolve(manifestArgument);
  const manifest = loadManifest(manifestPath);
  assert(
    manifest.suite === 'emergency-browser-fixture',
    `Expected emergency-browser-fixture manifest, received ${manifest.suite}`
  );
  assert(manifest.cleanup.complete !== true, 'Browser fixture is already cleaned');

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const graph = await loadRequestGraph(admin, manifest, manifestPath);
  let result = { action, status: 'observed' };

  if (action !== 'status') {
    assert(graph.request, 'No patient emergency request exists yet');
  }

  if (action === 'approve-cash') {
    assert(graph.payment, 'No payment exists for the patient request');
    assert(graph.payment.payment_method === 'cash', 'Browser fixture payment is not cash');
    if (graph.request.payment_status === 'completed') {
      result = { action, status: 'already_completed' };
    } else {
      const client = await createAuthedClient(
        emailFor(manifest.runId, 'org-admin'),
        'org admin'
      );
      result = await rpc(
        client,
        'approve_cash_payment',
        { p_payment_id: graph.payment.id, p_request_id: graph.request.id },
        'cash approval'
      );
    }
  }

  if (action === 'dispatch') {
    if (graph.request.current_responder_assignment_id) {
      result = { action, status: 'already_dispatched' };
    } else {
      assert(graph.ambulanceId, 'Browser fixture has no ambulance');
      const { data: ambulance, error } = await admin
        .from('ambulances')
        .select('telemetry_sequence')
        .eq('id', graph.ambulanceId)
        .single();
      if (error) throw new Error(`ambulance telemetry lookup failed: ${error.message}`);
      const sequence = Number(ambulance.telemetry_sequence || 0) + 1;
      const driverClient = await createAuthedClient(
        emailFor(manifest.runId, 'driver'),
        'driver'
      );
      await rpc(
        driverClient,
        'report_responder_telemetry',
        {
          p_payload: {
            ambulance_id: graph.ambulanceId,
            sequence,
            observed_at: new Date().toISOString(),
            location: {
              lat: 6.5244 + sequence * 0.0001,
              lng: 3.3792 + sequence * 0.0001,
            },
            heading: 40 + sequence,
            accuracy_meters: 6,
          },
        },
        'pre-dispatch responder telemetry'
      );
      const orgAdminClient = await createAuthedClient(
        emailFor(manifest.runId, 'org-admin'),
        'org admin'
      );
      result = await rpc(
        orgAdminClient,
        'console_dispatch_emergency',
        {
          p_request_id: graph.request.id,
          p_ambulance_id: graph.ambulanceId,
        },
        'canonical dispatch recovery'
      );
    }
  }

  if (action === 'accept') {
    if (['accepted', 'arrived', 'completed'].includes(graph.request.status)) {
      result = { action, status: 'already_accepted' };
    } else {
      const client = await createAuthedClient(emailFor(manifest.runId, 'driver'), 'driver');
      result = await rpc(
        client,
        'responder_accept_emergency',
        { p_request_id: graph.request.id },
        'responder acceptance'
      );
    }
  }

  if (action === 'telemetry') {
    assert(graph.ambulanceId, 'Browser fixture has no ambulance');
    const { data: ambulance, error } = await admin
      .from('ambulances')
      .select('telemetry_sequence')
      .eq('id', graph.ambulanceId)
      .single();
    if (error) throw new Error(`ambulance telemetry lookup failed: ${error.message}`);
    const sequence = Number(ambulance.telemetry_sequence || 0) + 1;
    const client = await createAuthedClient(emailFor(manifest.runId, 'driver'), 'driver');
    result = await rpc(
      client,
      'report_responder_telemetry',
      {
        p_payload: {
          ambulance_id: graph.ambulanceId,
          request_id: graph.request.id,
          assignment_id: graph.request.current_responder_assignment_id,
          sequence,
          observed_at: new Date().toISOString(),
          location: {
            lat: 6.5244 + sequence * 0.0001,
            lng: 3.3792 + sequence * 0.0001,
          },
          heading: 40 + sequence,
          accuracy_meters: 6,
        },
      },
      'responder telemetry'
    );
  }

  if (action === 'arrive') {
    if (['arrived', 'completed'].includes(graph.request.status)) {
      result = { action, status: 'already_arrived' };
    } else {
      const client = await createAuthedClient(emailFor(manifest.runId, 'driver'), 'driver');
      result = await rpc(
        client,
        'responder_arrive_emergency',
        { p_request_id: graph.request.id },
        'responder arrival'
      );
    }
  }

  if (action === 'complete') {
    if (graph.request.status === 'completed') {
      result = { action, status: 'already_completed' };
    } else {
      assert(
        graph.request.patient_acknowledged_arrival_at,
        'Patient arrival must be confirmed before completion'
      );
      const client = await createAuthedClient(emailFor(manifest.runId, 'driver'), 'driver');
      result = await rpc(
        client,
        'responder_complete_emergency',
        { p_request_id: graph.request.id },
        'responder completion'
      );
    }
  }

  const refreshed = await loadRequestGraph(admin, manifest, manifestPath);
  console.log(JSON.stringify({
    action,
    result,
    request: refreshed.request,
    payment: refreshed.payment,
    visit: refreshed.visit,
  }, null, 2));
}

main().catch((error) => {
  console.error('[browser-emergency-fixture] FAIL:', error.message);
  process.exit(1);
});
