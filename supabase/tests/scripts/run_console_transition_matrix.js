const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('[console-transition-matrix] Missing Supabase credentials in .env/.env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = 'TestPass123!';
const TS = Date.now();
const TAG = `console-matrix-${TS}`;

function email(label) {
  return `${TAG}-${label}@ivisit-e2e.local`;
}

async function createAuthUser({ label, role, providerType = null }) {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(label),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error) {
    throw new Error(`createUser(${label}) failed: ${error.message}`);
  }

  if (providerType) {
    const { error: profileErr } = await admin
      .from('profiles')
      .update({ role: 'provider', provider_type: providerType })
      .eq('id', data.user.id);
    if (profileErr) {
      throw new Error(`profile provider update(${label}) failed: ${profileErr.message}`);
    }
  }

  return data.user;
}

async function signInAs(emailAddress) {
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.auth.signInWithPassword({
    email: emailAddress,
    password: PASSWORD,
  });
  if (error) {
    throw new Error(`signInWithPassword(${emailAddress}) failed: ${error.message}`);
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function safeRun(label, fn, warnings) {
  try {
    await fn();
  } catch (error) {
    warnings.push(`${label}: ${error.message}`);
  }
}

async function settleActiveEmergencyRequestsForUser(userId) {
  const sql = `
    SELECT set_config('ivisit.allow_emergency_status_write', '1', true);
    UPDATE public.emergency_requests
    SET status = 'cancelled',
        cancelled_at = COALESCE(cancelled_at, NOW()),
        updated_at = NOW()
    WHERE user_id = '${userId}'
      AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived');
  `;
  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`exec_sql settle failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`exec_sql settle rejected: ${data?.error || 'unknown error'}`);
  }
}

async function deleteEmergencyRequestsWithTransitionCascade(requestIds) {
  const ids = [...new Set((requestIds || []).filter(Boolean))];
  if (ids.length === 0) return;

  const literals = ids.map((id) => `'${id}'::uuid`).join(', ');
  const sql = `
DO $$
BEGIN
  ALTER TABLE public.emergency_status_transitions
    DISABLE TRIGGER trg_emergency_status_transitions_append_only;

  DELETE FROM public.emergency_requests
  WHERE id IN (${literals});

  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  RAISE;
END;
$$;
  `;

  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`delete emergency_requests via exec_sql failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`delete emergency_requests via exec_sql rejected: ${data?.error || 'unknown error'}`);
  }
}

function makeResult(caseId, role, action, fromStatus, expectSuccess) {
  return {
    caseId,
    role,
    action,
    fromStatus,
    expectSuccess,
    success: false,
    setupError: false,
    rpcData: null,
    error: null,
    telemetryMirror: null,
  };
}

function parseTimestampMs(value) {
  if (!value || typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function verifyTelemetryMirror(requestId, ambulanceId) {
  if (!requestId || !ambulanceId) {
    return {
      passed: false,
      error: 'telemetry mirror verification missing request/ambulance id',
      details: null,
    };
  }

  const { data: request, error: requestErr } = await admin
    .from('emergency_requests')
    .select('id,ambulance_id,responder_location,responder_heading,updated_at')
    .eq('id', requestId)
    .maybeSingle();
  if (requestErr) {
    return { passed: false, error: `request mirror lookup failed: ${requestErr.message}`, details: null };
  }

  const { data: ambulance, error: ambulanceErr } = await admin
    .from('ambulances')
    .select('id,current_call,location,updated_at')
    .eq('id', ambulanceId)
    .maybeSingle();
  if (ambulanceErr) {
    return { passed: false, error: `ambulance mirror lookup failed: ${ambulanceErr.message}`, details: null };
  }

  const requestUpdatedMs = parseTimestampMs(request?.updated_at);
  const ambulanceUpdatedMs = parseTimestampMs(ambulance?.updated_at);
  const timestampDeltaMs = Math.abs(requestUpdatedMs - ambulanceUpdatedMs);
  const hasRequestLocation = !!request?.responder_location;
  const hasAmbulanceLocation = !!ambulance?.location;
  const requestAmbulanceLinked = request?.ambulance_id === ambulanceId;
  const ambulanceCallLinked = ambulance?.current_call === requestId;

  const passed =
    !!request &&
    !!ambulance &&
    hasRequestLocation &&
    hasAmbulanceLocation &&
    requestAmbulanceLinked &&
    ambulanceCallLinked &&
    timestampDeltaMs <= 1500;

  return {
    passed,
    error: passed
      ? null
      : `telemetry mirror mismatch (request_location=${hasRequestLocation}, ambulance_location=${hasAmbulanceLocation}, request_ambulance_linked=${requestAmbulanceLinked}, ambulance_call_linked=${ambulanceCallLinked}, timestamp_delta_ms=${timestampDeltaMs})`,
    details: {
      request,
      ambulance,
      timestampDeltaMs,
      hasRequestLocation,
      hasAmbulanceLocation,
      requestAmbulanceLinked,
      ambulanceCallLinked,
    },
  };
}

async function main() {
  const ctx = {
    users: {},
    userIds: [],
    orgId: null,
    hospitalId: null,
    ambulanceId: null,
    ambulanceOtherId: null,
    ambulanceOtherVehicleNumber: null,
    requestIds: [],
    lastCaseRequestId: null,
    lastCaseAmbulanceId: null,
  };

  const report = {
    tag: TAG,
    startedAt: new Date().toISOString(),
    summary: {
      totalCases: 0,
      passed: 0,
      failed: 0,
    },
    results: [],
    cleanupWarnings: [],
  };

  try {
    // 1) Foundation
    ctx.users.patient = await createAuthUser({ label: 'patient', role: 'patient' });
    ctx.users.orgAdmin = await createAuthUser({ label: 'orgadmin', role: 'org_admin' });
    ctx.users.dispatcher = await createAuthUser({ label: 'dispatcher', role: 'dispatcher' });
    ctx.users.viewer = await createAuthUser({ label: 'viewer', role: 'viewer' });
    ctx.users.providerAssigned = await createAuthUser({
      label: 'provider-assigned',
      role: 'provider',
      providerType: 'driver',
    });
    ctx.users.providerOther = await createAuthUser({
      label: 'provider-other',
      role: 'provider',
      providerType: 'driver',
    });

    ctx.userIds.push(
      ctx.users.patient.id,
      ctx.users.orgAdmin.id,
      ctx.users.dispatcher.id,
      ctx.users.viewer.id,
      ctx.users.providerAssigned.id,
      ctx.users.providerOther.id
    );

    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({ name: `Transition Matrix Org ${TAG}` })
      .select()
      .single();
    if (orgErr) throw new Error(`organization create failed: ${orgErr.message}`);
    ctx.orgId = org.id;

    const { error: orgProfileErr } = await admin
      .from('profiles')
      .update({ organization_id: org.id })
      .in('id', [
        ctx.users.orgAdmin.id,
        ctx.users.dispatcher.id,
        ctx.users.viewer.id,
        ctx.users.providerAssigned.id,
        ctx.users.providerOther.id,
      ]);
    if (orgProfileErr) throw new Error(`profile org assignment failed: ${orgProfileErr.message}`);

    const { data: hospital, error: hospitalErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: org.id,
        name: `Transition Matrix Hospital ${TAG}`,
        address: '1 Matrix Way',
        status: 'available',
        available_beds: 6,
        total_beds: 20,
      })
      .select()
      .single();
    if (hospitalErr) throw new Error(`hospital create failed: ${hospitalErr.message}`);
    ctx.hospitalId = hospital.id;

    const { data: ambulance, error: ambErr } = await admin
      .from('ambulances')
      .insert({
        hospital_id: hospital.id,
        organization_id: org.id,
        profile_id: ctx.users.providerAssigned.id,
        type: 'basic',
        call_sign: `MTRX-${String(TS).slice(-6)}`,
        status: 'available',
      })
      .select()
      .single();
    if (ambErr) throw new Error(`ambulance create failed: ${ambErr.message}`);
    ctx.ambulanceId = ambulance.id;

    const secondaryVehicleNumber = `MTRXALT${String(TS).slice(-6)}`;
    const { data: ambulanceOther, error: ambOtherErr } = await admin
      .from('ambulances')
      .insert({
        hospital_id: hospital.id,
        organization_id: org.id,
        profile_id: ctx.users.providerOther.id,
        type: 'advanced',
        vehicle_number: secondaryVehicleNumber,
        call_sign: `MTRX-ALT-${String(TS).slice(-5)}`,
        status: 'available',
      })
      .select()
      .single();
    if (ambOtherErr) throw new Error(`secondary ambulance create failed: ${ambOtherErr.message}`);
    ctx.ambulanceOtherId = ambulanceOther.id;
    ctx.ambulanceOtherVehicleNumber = secondaryVehicleNumber;

    // 2) Clients
    const clients = {
      orgAdmin: await signInAs(email('orgadmin')),
      dispatcher: await signInAs(email('dispatcher')),
      viewer: await signInAs(email('viewer')),
      patient: await signInAs(email('patient')),
      providerAssigned: await signInAs(email('provider-assigned')),
      providerOther: await signInAs(email('provider-other')),
    };

    // Helper to create isolated request for each case
    const createRequest = async ({
      status,
      responderId = null,
      ambulanceId = null,
      serviceType = 'ambulance',
      requestOverrides = {},
    }) => {
      const payload = {
        user_id: ctx.users.patient.id,
        hospital_id: ctx.hospitalId,
        hospital_name: hospital.name,
        service_type: serviceType,
        status,
        payment_status: status === 'pending_approval' ? 'pending' : 'completed',
        responder_id: responderId,
        ambulance_id: ambulanceId,
        ...requestOverrides,
      };

      const { data, error } = await admin
        .from('emergency_requests')
        .insert(payload)
        .select('id,status')
        .single();
      if (error) throw new Error(`request create(${status}) failed: ${error.message}`);

      const { data: existingVisits, error: existingVisitsErr } = await admin
        .from('visits')
        .select('id')
        .eq('request_id', data.id)
        .limit(1);
      if (existingVisitsErr) throw new Error(`visit lookup failed: ${existingVisitsErr.message}`);

      if (!existingVisits || existingVisits.length === 0) {
        const { error: visitErr } = await admin
          .from('visits')
          .insert({
            user_id: ctx.users.patient.id,
            hospital_id: ctx.hospitalId,
            request_id: data.id,
            status: status === 'completed' ? 'completed' : (status === 'cancelled' ? 'cancelled' : 'pending'),
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toISOString().slice(11, 19),
            type: 'emergency',
          });
        if (visitErr) throw new Error(`visit create failed: ${visitErr.message}`);
      }

      ctx.requestIds.push(data.id);
      return data.id;
    };

    const resetAmbulance = async () => {
      const ambulanceIds = [ctx.ambulanceId, ctx.ambulanceOtherId].filter(Boolean);
      if (!ambulanceIds.length) return;
      await admin
        .from('ambulances')
        .update({ status: 'available', current_call: null, eta: null, updated_at: new Date().toISOString() })
        .in('id', ambulanceIds);
    };

    const cases = [
      {
        caseId: 'D1',
        role: 'orgAdmin',
        action: 'console_dispatch_emergency',
        fromStatus: 'in_progress',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'in_progress' });
          await resetAmbulance();
          return client.rpc('console_dispatch_emergency', {
            p_request_id: requestId,
            p_ambulance_id: ctx.ambulanceId,
          });
        },
      },
      {
        caseId: 'D2',
        role: 'dispatcher',
        action: 'console_dispatch_emergency',
        fromStatus: 'in_progress',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'in_progress' });
          await resetAmbulance();
          return client.rpc('console_dispatch_emergency', {
            p_request_id: requestId,
            p_ambulance_id: ctx.ambulanceId,
          });
        },
      },
      {
        caseId: 'D3',
        role: 'viewer',
        action: 'console_dispatch_emergency',
        fromStatus: 'in_progress',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'in_progress' });
          return client.rpc('console_dispatch_emergency', {
            p_request_id: requestId,
            p_ambulance_id: ctx.ambulanceId,
          });
        },
      },
      {
        caseId: 'C1',
        role: 'orgAdmin',
        action: 'console_complete_emergency',
        fromStatus: 'accepted',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
          });
          return client.rpc('console_complete_emergency', {
            p_request_id: requestId,
          });
        },
      },
      {
        caseId: 'C2',
        role: 'providerAssigned',
        action: 'console_complete_emergency',
        fromStatus: 'accepted',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
          });
          return client.rpc('console_complete_emergency', {
            p_request_id: requestId,
          });
        },
      },
      {
        caseId: 'C3',
        role: 'providerOther',
        action: 'console_complete_emergency',
        fromStatus: 'accepted',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
          });
          return client.rpc('console_complete_emergency', {
            p_request_id: requestId,
          });
        },
      },
      {
        caseId: 'K1',
        role: 'dispatcher',
        action: 'console_cancel_emergency',
        fromStatus: 'in_progress',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'in_progress' });
          return client.rpc('console_cancel_emergency', {
            p_request_id: requestId,
            p_reason: 'matrix cancel test',
          });
        },
      },
      {
        caseId: 'K2',
        role: 'viewer',
        action: 'console_cancel_emergency',
        fromStatus: 'in_progress',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'in_progress' });
          return client.rpc('console_cancel_emergency', {
            p_request_id: requestId,
            p_reason: 'viewer unauthorized',
          });
        },
      },
      {
        caseId: 'U1',
        role: 'orgAdmin',
        action: 'console_update_emergency_request',
        fromStatus: 'in_progress',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'in_progress' });
          return client.rpc('console_update_emergency_request', {
            p_request_id: requestId,
            p_payload: { status: 'arrived' },
          });
        },
      },
      {
        caseId: 'U2',
        role: 'providerAssigned',
        action: 'console_update_emergency_request',
        fromStatus: 'accepted',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
          });
          return client.rpc('console_update_emergency_request', {
            p_request_id: requestId,
            p_payload: { status: 'arrived' },
          });
        },
      },
      {
        caseId: 'U3',
        role: 'viewer',
        action: 'console_update_emergency_request',
        fromStatus: 'in_progress',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'in_progress' });
          return client.rpc('console_update_emergency_request', {
            p_request_id: requestId,
            p_payload: { status: 'arrived' },
          });
        },
      },
      {
        caseId: 'U4',
        role: 'orgAdmin',
        action: 'console_update_emergency_request',
        fromStatus: 'completed',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'completed' });
          return client.rpc('console_update_emergency_request', {
            p_request_id: requestId,
            p_payload: { status: 'in_progress' },
          });
        },
      },
      {
        caseId: 'D4',
        role: 'patient',
        action: 'console_dispatch_emergency',
        fromStatus: 'in_progress',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'in_progress' });
          return client.rpc('console_dispatch_emergency', {
            p_request_id: requestId,
            p_ambulance_id: ctx.ambulanceId,
          });
        },
      },
      {
        caseId: 'L1',
        role: 'orgAdmin',
        action: 'console_update_responder_location',
        fromStatus: 'accepted',
        expectSuccess: true,
        assertTelemetryMirror: true,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
            requestOverrides: {
              responder_name: 'Legacy Driver',
              responder_vehicle_type: 'basic',
              responder_vehicle_plate: 'OLD-UNIT-01',
            },
          });
          ctx.lastCaseRequestId = requestId;
          ctx.lastCaseAmbulanceId = ctx.ambulanceId;
          return client.rpc('console_update_responder_location', {
            p_request_id: requestId,
            p_location: { lat: 6.5244, lng: 3.3792 },
            p_heading: 12.5,
          });
        },
      },
      {
        caseId: 'L2',
        role: 'providerAssigned',
        action: 'console_update_responder_location',
        fromStatus: 'arrived',
        expectSuccess: true,
        assertTelemetryMirror: true,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'arrived',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
          });
          ctx.lastCaseRequestId = requestId;
          ctx.lastCaseAmbulanceId = ctx.ambulanceId;
          return client.rpc('console_update_responder_location', {
            p_request_id: requestId,
            p_location: { lat: 6.5246, lng: 3.3794 },
            p_heading: 32,
          });
        },
      },
      {
        caseId: 'RA1',
        role: 'orgAdmin',
        action: 'assign_ambulance_to_emergency',
        fromStatus: 'accepted_reassign',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
          });
          await resetAmbulance();

          const { data, error } = await client.rpc('assign_ambulance_to_emergency', {
            p_emergency_request_id: requestId,
            p_ambulance_id: ctx.ambulanceOtherId,
            p_priority: 1,
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'reassignment failed');

          const { data: reqAfter, error: reqAfterErr } = await admin
            .from('emergency_requests')
            .select('id,ambulance_id,responder_id,status,responder_vehicle_type,responder_vehicle_plate')
            .eq('id', requestId)
            .single();
          if (reqAfterErr) throw new Error(`reassignment request lookup failed: ${reqAfterErr.message}`);
          if (reqAfter.ambulance_id !== ctx.ambulanceOtherId) {
            throw new Error(`reassignment did not switch ambulance_id to secondary unit`);
          }
          if (reqAfter.responder_id !== ctx.users.providerOther.id) {
            throw new Error(`reassignment did not switch responder_id to new driver`);
          }
          if (reqAfter.responder_name === 'Legacy Driver') {
            throw new Error(`reassignment retained stale responder display name`);
          }
          if (reqAfter.responder_vehicle_type !== 'advanced') {
            throw new Error(`reassignment did not refresh responder vehicle type`);
          }
          if (
            ctx.ambulanceOtherVehicleNumber &&
            reqAfter.responder_vehicle_plate !== ctx.ambulanceOtherVehicleNumber
          ) {
            throw new Error(`reassignment did not refresh responder vehicle plate`);
          }

          const { data: oldAmb, error: oldAmbErr } = await admin
            .from('ambulances')
            .select('id,status,current_call')
            .eq('id', ctx.ambulanceId)
            .single();
          if (oldAmbErr) throw new Error(`old ambulance lookup failed: ${oldAmbErr.message}`);
          if (oldAmb.status !== 'available' || oldAmb.current_call !== null) {
            throw new Error(`old ambulance was not released after reassignment`);
          }

          const { data: newAmb, error: newAmbErr } = await admin
            .from('ambulances')
            .select('id,status,current_call')
            .eq('id', ctx.ambulanceOtherId)
            .single();
          if (newAmbErr) throw new Error(`new ambulance lookup failed: ${newAmbErr.message}`);
          if (newAmb.status !== 'on_trip' || newAmb.current_call !== requestId) {
            throw new Error(`new ambulance was not bound to reassigned request`);
          }

          return { data, error: null };
        },
      },
      {
        caseId: 'RA2',
        role: 'providerAssigned',
        action: 'console_update_responder_location',
        fromStatus: 'accepted_reassign_old_driver',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
          });
          await resetAmbulance();

          const { data: assignData, error: assignError } = await clients.orgAdmin.rpc(
            'assign_ambulance_to_emergency',
            {
              p_emergency_request_id: requestId,
              p_ambulance_id: ctx.ambulanceOtherId,
              p_priority: 1,
            }
          );
          if (assignError) throw assignError;
          if (!assignData?.success) {
            throw new Error(assignData?.error || 'reassignment setup failed for old driver test');
          }

          return client.rpc('console_update_responder_location', {
            p_request_id: requestId,
            p_location: { lat: 6.5245, lng: 3.3796 },
            p_heading: 56,
          });
        },
      },
      {
        caseId: 'RA3',
        role: 'providerOther',
        action: 'console_update_responder_location',
        fromStatus: 'accepted_reassign_new_driver',
        expectSuccess: true,
        assertTelemetryMirror: true,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
          });
          await resetAmbulance();

          const { data: assignData, error: assignError } = await clients.orgAdmin.rpc(
            'assign_ambulance_to_emergency',
            {
              p_emergency_request_id: requestId,
              p_ambulance_id: ctx.ambulanceOtherId,
              p_priority: 1,
            }
          );
          if (assignError) throw assignError;
          if (!assignData?.success) {
            throw new Error(assignData?.error || 'reassignment setup failed for new driver test');
          }

          ctx.lastCaseRequestId = requestId;
          ctx.lastCaseAmbulanceId = ctx.ambulanceOtherId;
          return client.rpc('console_update_responder_location', {
            p_request_id: requestId,
            p_location: { lat: 6.5248, lng: 3.3797 },
            p_heading: 91,
          });
        },
      },
      {
        caseId: 'L3',
        role: 'providerOther',
        action: 'console_update_responder_location',
        fromStatus: 'accepted',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
          });
          return client.rpc('console_update_responder_location', {
            p_request_id: requestId,
            p_location: { lat: 6.5241, lng: 3.3791 },
            p_heading: 181,
          });
        },
      },
      {
        caseId: 'L4',
        role: 'orgAdmin',
        action: 'console_update_responder_location',
        fromStatus: 'completed',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'completed',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
          });
          return client.rpc('console_update_responder_location', {
            p_request_id: requestId,
            p_location: { lat: 6.5244, lng: 3.3792 },
            p_heading: 280,
          });
        },
      },
      {
        caseId: 'L5',
        role: 'dispatcher',
        action: 'console_update_responder_location',
        fromStatus: 'accepted_no_dispatch',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'accepted', serviceType: 'bed' });
          return client.rpc('console_update_responder_location', {
            p_request_id: requestId,
            p_location: { lat: 6.5244, lng: 3.3792 },
            p_heading: 90,
          });
        },
      },
    ];

    report.summary.totalCases = cases.length;

    for (const tc of cases) {
      const result = makeResult(tc.caseId, tc.role, tc.action, tc.fromStatus, tc.expectSuccess);
      ctx.lastCaseRequestId = null;
      ctx.lastCaseAmbulanceId = null;
      try {
        const { data, error } = await tc.execute(clients[tc.role]);
        result.rpcData = data || null;
        if (error) {
          result.success = false;
          result.error = error.message;
        } else if (data?.success === false) {
          result.success = false;
          result.error = data.error || 'RPC returned success=false';
        } else {
          result.success = true;
        }
      } catch (error) {
        result.success = false;
        result.error = error.message;
        if (/^request create\(/.test(error.message)) {
          result.setupError = true;
        }
      }

      if (result.success && tc.assertTelemetryMirror) {
        const telemetryMirror = await verifyTelemetryMirror(
          ctx.lastCaseRequestId,
          ctx.lastCaseAmbulanceId || ctx.ambulanceId
        );
        result.telemetryMirror = telemetryMirror.details;
        if (!telemetryMirror.passed) {
          result.success = false;
          result.error = telemetryMirror.error;
        }
      }

      const passed = !result.setupError && result.success === tc.expectSuccess;
      if (passed) {
        report.summary.passed += 1;
      } else {
        report.summary.failed += 1;
      }
      result.passed = passed;
      report.results.push(result);

      // Keep matrix deterministic: clear active requests and release resources after each case.
      await safeRun(
        `settle active requests after ${tc.caseId}`,
        async () => {
          await settleActiveEmergencyRequestsForUser(ctx.users.patient.id);
        },
        report.cleanupWarnings
      );

      await safeRun(
        `reset ambulance after ${tc.caseId}`,
        async () => {
          await resetAmbulance();
        },
        report.cleanupWarnings
      );
    }
  } finally {
    // Cleanup (best effort)
    await safeRun(
      'reset ambulance',
      async () => {
        const ambulanceIds = [ctx.ambulanceId, ctx.ambulanceOtherId].filter(Boolean);
        if (ambulanceIds.length > 0) {
          await admin
            .from('ambulances')
            .update({ status: 'available', current_call: null, eta: null, updated_at: new Date().toISOString() })
            .in('id', ambulanceIds);
        }
      },
      report.cleanupWarnings
    );

    let emergencyRowsDeleted = true;
    if (ctx.requestIds.length > 0) {
      const reqIds = [...new Set(ctx.requestIds)];
      await safeRun(
        'delete emergency_requests',
        async () => {
          await deleteEmergencyRequestsWithTransitionCascade(reqIds);
        },
        report.cleanupWarnings
      );

      if (emergencyRowsDeleted) {
        await safeRun(
          'delete visits',
          async () => {
            const { error } = await admin.from('visits').delete().in('request_id', reqIds);
            if (error) throw new Error(error.message);
          },
          report.cleanupWarnings
        );
        await safeRun(
          'delete payments',
          async () => {
            const { error } = await admin.from('payments').delete().in('emergency_request_id', reqIds);
            if (error) throw new Error(error.message);
          },
          report.cleanupWarnings
        );
      } else {
        report.cleanupWarnings.push('skipped dependent cleanup because emergency_requests delete failed');
      }
    }

    if (emergencyRowsDeleted) {
      await safeRun(
        'delete ambulance',
        async () => {
          const ambulanceIds = [ctx.ambulanceId, ctx.ambulanceOtherId].filter(Boolean);
          if (ambulanceIds.length > 0) {
            const { error } = await admin.from('ambulances').delete().in('id', ambulanceIds);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );

      await safeRun(
        'delete hospital',
        async () => {
          if (ctx.hospitalId) {
            const { error } = await admin.from('hospitals').delete().eq('id', ctx.hospitalId);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );

      await safeRun(
        'delete organization wallet',
        async () => {
          if (ctx.orgId) {
            const { error } = await admin.from('organization_wallets').delete().eq('organization_id', ctx.orgId);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );

      await safeRun(
        'delete organization',
        async () => {
          if (ctx.orgId) {
            const { error } = await admin.from('organizations').delete().eq('id', ctx.orgId);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );
    } else {
      report.cleanupWarnings.push('skipped foundation cleanup because emergency_requests delete failed');
    }

    for (const userId of ctx.userIds) {
      await safeRun(
        `delete auth user ${userId}`,
        async () => {
          const { error } = await admin.auth.admin.deleteUser(userId);
          if (error) throw new Error(error.message);
        },
        report.cleanupWarnings
      );
    }

    report.completedAt = new Date().toISOString();

    const outDir = path.join(__dirname, '..', 'validation');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'console_transition_matrix_report.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`[console-transition-matrix] report: ${outFile}`);
    console.log(
      `[console-transition-matrix] passed=${report.summary.passed} failed=${report.summary.failed} total=${report.summary.totalCases}`
    );
  }
}

main().catch((error) => {
  console.error('[console-transition-matrix] FAIL:', error.message);
  process.exit(1);
});
