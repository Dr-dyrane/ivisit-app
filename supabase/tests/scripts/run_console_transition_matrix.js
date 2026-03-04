const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const {
  parsePointGeometry,
  shouldApplyTripEvent,
  mergeEmergencyRealtimeTrip,
  mergeAmbulanceRealtimeTrip,
  projectTripFromCanonicalRows,
} = require('../../../utils/emergencyRealtimeProjection');

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
    appRealtimeProjection: null,
    approvalRealtimeProjection: null,
  };
}

function parseTimestampMs(value) {
  if (!value || typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function canonicalizeEmergencyStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return normalized;
  switch (normalized) {
    case 'pending':
      return 'pending_approval';
    case 'dispatched':
      return 'in_progress';
    case 'assigned':
    case 'responding':
    case 'en_route':
      return 'accepted';
    case 'resolved':
      return 'completed';
    case 'canceled':
      return 'cancelled';
    default:
      return normalized;
  }
}

function evaluatePendingApprovalUiState(row, serviceType = 'ambulance') {
  const status = canonicalizeEmergencyStatus(row?.status);
  const paymentStatus = String(row?.payment_status ?? row?.paymentStatus ?? '').trim().toLowerCase();
  const rowAmbulanceId = row?.ambulance_id ?? row?.ambulanceId ?? null;
  const rowResponderName = row?.responder_name ?? row?.responderName ?? null;
  const hasResponderAssignment = !!(rowAmbulanceId || rowResponderName);

  if (status === 'payment_declined' || paymentStatus === 'declined' || paymentStatus === 'failed') {
    return 'declined';
  }

  const approvedTransition =
    status === 'accepted' || status === 'in_progress' || paymentStatus === 'completed';

  if (!approvedTransition) {
    return 'pending';
  }

  if (serviceType === 'ambulance' && !hasResponderAssignment) {
    return 'awaiting_assignment';
  }

  return 'approved';
}

function parseRealtimeVersionMs(row, fallbackMs = Date.now()) {
  if (!row || typeof row !== 'object') return fallbackMs;
  const value = row.updated_at ?? row.created_at ?? null;
  if (!value) return fallbackMs;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function shouldApplyPendingApprovalRealtimeEvent(gateState, streamKey, row) {
  const current = gateState || { streamKey: null, versionMs: 0 };
  const nextVersionMs = parseRealtimeVersionMs(row, Date.now());
  if (current.streamKey && current.streamKey !== streamKey) {
    return {
      apply: true,
      nextGateState: { streamKey, versionMs: nextVersionMs },
      reason: 'stream_switch',
    };
  }

  if (nextVersionMs < (current.versionMs ?? 0)) {
    return {
      apply: false,
      nextGateState: current,
      reason: 'stale_version',
    };
  }

  return {
    apply: true,
    nextGateState: { streamKey, versionMs: nextVersionMs },
    reason: 'fresh_or_equal',
  };
}

async function verifyPendingApprovalRealtimeProjection({
  requestId,
  paymentId = null,
  serviceType = 'ambulance',
  expectedFinalState,
}) {
  if (!requestId) {
    return {
      passed: false,
      error: 'approval realtime projection verification missing request id',
      details: null,
    };
  }

  const { data: request, error: requestErr } = await admin
    .from('emergency_requests')
    .select(
      'id,display_id,status,payment_status,ambulance_id,responder_id,responder_name,responder_phone,responder_vehicle_type,responder_vehicle_plate,updated_at,created_at'
    )
    .eq('id', requestId)
    .maybeSingle();
  if (requestErr) {
    return {
      passed: false,
      error: `approval projection request lookup failed: ${requestErr.message}`,
      details: null,
    };
  }
  if (!request?.id) {
    return {
      passed: false,
      error: 'approval projection request missing after mutation',
      details: null,
    };
  }

  let payment = null;
  if (paymentId) {
    const { data: paymentById, error: paymentByIdErr } = await admin
      .from('payments')
      .select('id,emergency_request_id,status,updated_at,created_at')
      .eq('id', paymentId)
      .maybeSingle();
    if (paymentByIdErr) {
      return {
        passed: false,
        error: `approval projection payment lookup failed: ${paymentByIdErr.message}`,
        details: { request },
      };
    }
    payment = paymentById || null;
  }

  if (!payment) {
    const { data: paymentByRequest, error: paymentByRequestErr } = await admin
      .from('payments')
      .select('id,emergency_request_id,status,updated_at,created_at')
      .eq('emergency_request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (paymentByRequestErr) {
      return {
        passed: false,
        error: `approval projection payment-by-request lookup failed: ${paymentByRequestErr.message}`,
        details: { request },
      };
    }
    payment = paymentByRequest || null;
  }

  const emergencyStreamKey = `${request.id}:${request.display_id || request.id}:emergency`;
  const paymentStreamKey = `${request.id}:${request.display_id || request.id}:payment`;
  let emergencyGate = { streamKey: null, versionMs: 0 };
  let paymentGate = { streamKey: null, versionMs: 0 };

  const timeline = [];
  let projectedUiState = 'pending';

  const pendingSeedRow = {
    id: request.id,
    status: 'pending_approval',
    payment_status: 'pending',
    updated_at: request.created_at || request.updated_at || new Date().toISOString(),
  };
  const pendingDecision = shouldApplyPendingApprovalRealtimeEvent(
    emergencyGate,
    emergencyStreamKey,
    pendingSeedRow
  );
  if (pendingDecision.apply) {
    emergencyGate = pendingDecision.nextGateState;
    projectedUiState = evaluatePendingApprovalUiState(pendingSeedRow, serviceType);
  }
  timeline.push({
    source: 'pending_seed',
    applied: pendingDecision.apply,
    reason: pendingDecision.reason,
    uiState: projectedUiState,
  });

  let paymentUiState = projectedUiState;
  if (payment?.id) {
    const paymentEventRow = {
      id: request.id,
      status: null,
      payment_status: payment.status,
      updated_at: payment.updated_at || payment.created_at || new Date().toISOString(),
    };
    const paymentDecision = shouldApplyPendingApprovalRealtimeEvent(
      paymentGate,
      paymentStreamKey,
      paymentEventRow
    );
    if (paymentDecision.apply) {
      paymentGate = paymentDecision.nextGateState;
      paymentUiState = evaluatePendingApprovalUiState(paymentEventRow, serviceType);
      projectedUiState = paymentUiState;
    }
    timeline.push({
      source: 'payment_event',
      applied: paymentDecision.apply,
      reason: paymentDecision.reason,
      paymentStatus: payment.status,
      uiState: paymentUiState,
    });
  }

  const requestVersionMs = parseRealtimeVersionMs(request, Date.now());
  const staleEmergencyEvent = {
    ...request,
    updated_at: new Date(Math.max(0, requestVersionMs - 90000)).toISOString(),
    payment_status: 'pending',
  };
  const staleDecision = shouldApplyPendingApprovalRealtimeEvent(
    emergencyGate,
    emergencyStreamKey,
    staleEmergencyEvent
  );
  timeline.push({
    source: 'stale_emergency_event',
    applied: staleDecision.apply,
    reason: staleDecision.reason,
    uiState: projectedUiState,
  });

  const canonicalDecision = shouldApplyPendingApprovalRealtimeEvent(
    emergencyGate,
    emergencyStreamKey,
    request
  );
  let finalUiState = projectedUiState;
  let truthSyncBypassUsed = false;
  if (canonicalDecision.apply) {
    emergencyGate = canonicalDecision.nextGateState;
    finalUiState = evaluatePendingApprovalUiState(request, serviceType);
  } else {
    // Mirror EmergencyRequestModal syncApprovalTruthFromServer behavior (skip emergency gate on recovery).
    truthSyncBypassUsed = true;
    finalUiState = evaluatePendingApprovalUiState(request, serviceType);
  }
  timeline.push({
    source: truthSyncBypassUsed ? 'canonical_truth_sync_bypass' : 'canonical_emergency_event',
    applied: canonicalDecision.apply || truthSyncBypassUsed,
    reason: canonicalDecision.reason,
    uiState: finalUiState,
  });

  const expectedState = expectedFinalState || evaluatePendingApprovalUiState(request, serviceType);
  const staleRejected = !staleDecision.apply;

  if (!staleRejected) {
    return {
      passed: false,
      error: 'approval projection accepted stale emergency event',
      details: {
        request,
        payment,
        timeline,
        staleDecision,
        emergencyGate,
        paymentGate,
      },
    };
  }

  if (
    serviceType === 'ambulance' &&
    expectedState === 'approved' &&
    String(payment?.status || '').toLowerCase() === 'completed' &&
    paymentUiState !== 'awaiting_assignment'
  ) {
    return {
      passed: false,
      error: `approval projection payment-event phase mismatch: expected awaiting_assignment, got ${paymentUiState}`,
      details: {
        request,
        payment,
        timeline,
        emergencyGate,
        paymentGate,
      },
    };
  }

  if (
    expectedState === 'declined' &&
    payment?.id &&
    paymentUiState !== 'declined'
  ) {
    return {
      passed: false,
      error: `approval projection decline phase mismatch: expected declined on payment event, got ${paymentUiState}`,
      details: {
        request,
        payment,
        timeline,
        emergencyGate,
        paymentGate,
      },
    };
  }

  if (finalUiState !== expectedState) {
    return {
      passed: false,
      error: `approval projection final UI mismatch: expected ${expectedState}, got ${finalUiState}`,
      details: {
        request,
        payment,
        timeline,
        staleDecision,
        canonicalDecision,
        truthSyncBypassUsed,
        emergencyGate,
        paymentGate,
      },
    };
  }

  return {
    passed: true,
    error: null,
    details: {
      request,
      payment,
      expectedState,
      finalUiState,
      paymentUiState,
      staleRejected,
      truthSyncBypassUsed,
      timeline,
      emergencyGate,
      paymentGate,
    },
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition, { timeoutMs = 8000, intervalMs = 250, label = 'condition' } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const result = await condition();
    if (result) return result;
    await sleep(intervalMs);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function fetchTransitionAuditRows(requestId) {
  const { data, error } = await admin
    .from('emergency_status_transitions')
    .select('id,from_status,to_status,reason,source,occurred_at')
    .eq('emergency_request_id', requestId)
    .order('occurred_at', { ascending: true });
  if (error) {
    throw new Error(`transition audit lookup failed: ${error.message}`);
  }
  return data || [];
}

function assertAppendOnlyTransitionAudit(beforeRows, afterRows, { requireGrowth = true } = {}) {
  if (afterRows.length < beforeRows.length) {
    throw new Error(
      `transition audit rows shrank unexpectedly (${beforeRows.length} -> ${afterRows.length})`
    );
  }
  if (requireGrowth && afterRows.length === beforeRows.length) {
    throw new Error('transition audit row count did not grow for transition path');
  }
  for (const row of afterRows) {
    if (!row?.reason || !String(row.reason).trim()) {
      throw new Error('transition audit row missing reason');
    }
  }
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

function sameCoordinate(a, b, epsilon = 1e-6) {
  if (!a || !b) return false;
  const aLat = Number(a.latitude);
  const aLng = Number(a.longitude);
  const bLat = Number(b.latitude);
  const bLng = Number(b.longitude);
  if (!Number.isFinite(aLat) || !Number.isFinite(aLng) || !Number.isFinite(bLat) || !Number.isFinite(bLng)) {
    return false;
  }
  return Math.abs(aLat - bLat) <= epsilon && Math.abs(aLng - bLng) <= epsilon;
}

async function verifyAppRealtimeProjection(requestId, ambulanceId) {
  if (!requestId || !ambulanceId) {
    return {
      passed: false,
      error: 'app realtime projection verification missing request/ambulance id',
      details: null,
    };
  }

  const { data: request, error: requestErr } = await admin
    .from('emergency_requests')
    .select(
      'id,display_id,status,ambulance_id,responder_id,responder_name,responder_phone,responder_vehicle_type,responder_vehicle_plate,responder_location,responder_heading,updated_at,created_at'
    )
    .eq('id', requestId)
    .maybeSingle();
  if (requestErr) {
    return { passed: false, error: `app projection request lookup failed: ${requestErr.message}`, details: null };
  }

  const { data: ambulance, error: ambulanceErr } = await admin
    .from('ambulances')
    .select('id,current_call,location,updated_at,created_at')
    .eq('id', ambulanceId)
    .maybeSingle();
  if (ambulanceErr) {
    return { passed: false, error: `app projection ambulance lookup failed: ${ambulanceErr.message}`, details: null };
  }

  const baseTrip = {
    id: request?.id ?? requestId,
    requestId: request?.display_id ?? requestId,
    status: 'accepted',
    assignedAmbulance: { id: ambulanceId },
    currentResponderLocation: null,
    currentResponderHeading: null,
    responderTelemetryAt: null,
    updatedAt: null,
  };

  let gateState = { requestKey: null, versionMs: 0 };
  const freshDecision = shouldApplyTripEvent(gateState, baseTrip, request, Date.now());
  if (!freshDecision.apply) {
    return {
      passed: false,
      error: `app projection rejected canonical fresh event (${freshDecision.reason})`,
      details: { request, ambulance, freshDecision },
    };
  }

  gateState = freshDecision.nextGateState;
  let projected = mergeEmergencyRealtimeTrip(baseTrip, request);
  if (!projected) {
    return {
      passed: false,
      error: 'app projection collapsed canonical non-terminal trip unexpectedly',
      details: { request, ambulance, gateState },
    };
  }

  const requestUpdatedMs = parseTimestampMs(request?.updated_at || request?.created_at || null, Date.now());
  const staleRecord = {
    ...request,
    updated_at: new Date(requestUpdatedMs - 90000).toISOString(),
    responder_heading: 7,
  };
  const staleDecision = shouldApplyTripEvent(gateState, projected, staleRecord, Date.now());
  if (staleDecision.apply) {
    return {
      passed: false,
      error: 'app projection accepted a stale emergency event',
      details: { request, staleRecord, staleDecision, gateState },
    };
  }

  if (ambulance) {
    const ambulanceDecision = shouldApplyTripEvent(gateState, projected, ambulance, Date.now());
    if (ambulanceDecision.apply) {
      gateState = ambulanceDecision.nextGateState;
      projected = mergeAmbulanceRealtimeTrip(projected, ambulance);
    }
  }

  const canonicalProjected = projectTripFromCanonicalRows(baseTrip, request, ambulance || null);
  const canonicalLocation = parsePointGeometry(ambulance?.location) || parsePointGeometry(request?.responder_location);
  const projectedLocation = projected?.currentResponderLocation || null;

  if (canonicalLocation && !sameCoordinate(projectedLocation, canonicalLocation)) {
    return {
      passed: false,
      error: 'app projection location diverges from canonical emergency/ambulance rows',
      details: { request, ambulance, projected, canonicalLocation, projectedLocation, gateState, canonicalProjected },
    };
  }

  if (projected?.status !== request?.status) {
    return {
      passed: false,
      error: 'app projection status diverges from canonical emergency row',
      details: { request, ambulance, projected, gateState, canonicalProjected },
    };
  }

  if ((projected?.assignedAmbulance?.id || null) !== (request?.ambulance_id || ambulanceId)) {
    return {
      passed: false,
      error: 'app projection ambulance identity diverges from canonical emergency row',
      details: { request, ambulance, projected, gateState, canonicalProjected },
    };
  }

  return {
    passed: true,
    error: null,
    details: {
      request,
      ambulance,
      projected,
      canonicalProjected,
      gateState,
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
    doctorId: null,
    doctorOtherId: null,
    requestIds: [],
    lastCaseRequestId: null,
    lastCaseAmbulanceId: null,
    lastCasePaymentId: null,
    lastCaseServiceType: null,
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
    ctx.users.doctorPrimary = await createAuthUser({
      label: 'doctor-primary',
      role: 'provider',
      providerType: 'doctor',
    });
    ctx.users.doctorOther = await createAuthUser({
      label: 'doctor-other',
      role: 'provider',
      providerType: 'doctor',
    });

    ctx.userIds.push(
      ctx.users.patient.id,
      ctx.users.orgAdmin.id,
      ctx.users.dispatcher.id,
      ctx.users.viewer.id,
      ctx.users.providerAssigned.id,
      ctx.users.providerOther.id,
      ctx.users.doctorPrimary.id,
      ctx.users.doctorOther.id
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
        ctx.users.doctorPrimary.id,
        ctx.users.doctorOther.id,
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

    const upsertDoctorForProfile = async ({ profileId, name }) => {
      const { data: existingDoctor, error: existingDoctorErr } = await admin
        .from('doctors')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();
      if (existingDoctorErr) throw new Error(`doctor lookup failed: ${existingDoctorErr.message}`);

      if (existingDoctor?.id) {
        const { data: updatedDoctor, error: doctorUpdateErr } = await admin
          .from('doctors')
          .update({
            hospital_id: hospital.id,
            name,
            specialization: 'Emergency Medicine',
            status: 'available',
            is_available: true,
            max_patients: 4,
            current_patients: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDoctor.id)
          .select('id')
          .single();
        if (doctorUpdateErr) throw new Error(`doctor update failed: ${doctorUpdateErr.message}`);
        return updatedDoctor.id;
      }

      const { data: insertedDoctor, error: doctorInsertErr } = await admin
        .from('doctors')
        .insert({
          profile_id: profileId,
          hospital_id: hospital.id,
          name,
          specialization: 'Emergency Medicine',
          status: 'available',
          is_available: true,
          max_patients: 4,
          current_patients: 0,
        })
        .select('id')
        .single();
      if (doctorInsertErr) throw new Error(`doctor create failed: ${doctorInsertErr.message}`);
      return insertedDoctor.id;
    };

    ctx.doctorId = await upsertDoctorForProfile({
      profileId: ctx.users.doctorPrimary.id,
      name: 'Matrix Doctor Primary',
    });

    ctx.doctorOtherId = await upsertDoctorForProfile({
      profileId: ctx.users.doctorOther.id,
      name: 'Matrix Doctor Other',
    });

    // 2) Clients
    const clients = {
      orgAdmin: await signInAs(email('orgadmin')),
      dispatcher: await signInAs(email('dispatcher')),
      viewer: await signInAs(email('viewer')),
      patient: await signInAs(email('patient')),
      providerAssigned: await signInAs(email('provider-assigned')),
      providerOther: await signInAs(email('provider-other')),
      doctorPrimary: await signInAs(email('doctor-primary')),
      doctorOther: await signInAs(email('doctor-other')),
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

    const createPendingCashPayment = async (requestId, amount = 180) => {
      const { data: payment, error: paymentErr } = await admin
        .from('payments')
        .insert({
          organization_id: ctx.orgId,
          emergency_request_id: requestId,
          amount,
          currency: 'USD',
          status: 'pending',
          payment_method: 'cash',
          metadata: { tag: TAG, source: 'console_transition_matrix', fee_amount: 0 },
        })
        .select('id,status,emergency_request_id')
        .single();
      if (paymentErr) {
        throw new Error(`pending payment create failed: ${paymentErr.message}`);
      }
      return payment.id;
    };

    const resetAmbulance = async () => {
      const ambulanceIds = [ctx.ambulanceId, ctx.ambulanceOtherId].filter(Boolean);
      if (!ambulanceIds.length) return;
      await admin
        .from('ambulances')
        .update({ status: 'available', current_call: null, eta: null, updated_at: new Date().toISOString() })
        .in('id', ambulanceIds);
    };

    const resetDoctors = async () => {
      const doctorIds = [ctx.doctorId, ctx.doctorOtherId].filter(Boolean);
      if (!doctorIds.length) return;
      await admin
        .from('doctors')
        .update({
          status: 'available',
          is_available: true,
          max_patients: 4,
          current_patients: 0,
          updated_at: new Date().toISOString(),
        })
        .in('id', doctorIds);
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
        caseId: 'AP1',
        role: 'orgAdmin',
        action: 'approve_cash_payment',
        fromStatus: 'pending_approval_to_in_progress_or_accepted',
        expectSuccess: true,
        assertApprovalRealtimeProjection: {
          serviceType: 'ambulance',
          expectedFinalState: 'approved',
        },
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'pending_approval',
            serviceType: 'ambulance',
            requestOverrides: { payment_status: 'pending' },
          });
          const paymentId = await createPendingCashPayment(requestId);
          const beforeTransitions = await fetchTransitionAuditRows(requestId);

          const { data, error } = await client.rpc('approve_cash_payment', {
            p_payment_id: paymentId,
            p_request_id: requestId,
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'approve_cash_payment failed');

          const { data: paymentAfter, error: paymentAfterErr } = await admin
            .from('payments')
            .select('id,status,processed_at')
            .eq('id', paymentId)
            .single();
          if (paymentAfterErr) throw new Error(`approved payment lookup failed: ${paymentAfterErr.message}`);
          if (paymentAfter.status !== 'completed') {
            throw new Error(`approved payment status mismatch: expected completed, got ${paymentAfter.status}`);
          }

          let { data: requestAfter, error: requestAfterErr } = await admin
            .from('emergency_requests')
            .select('id,status,payment_status,ambulance_id,responder_id,responder_name')
            .eq('id', requestId)
            .single();
          if (requestAfterErr) throw new Error(`approved request lookup failed: ${requestAfterErr.message}`);
          if (!['in_progress', 'accepted'].includes(requestAfter.status)) {
            throw new Error(`approved request status mismatch: got ${requestAfter.status}`);
          }
          if (requestAfter.payment_status !== 'completed') {
            throw new Error(`approved request payment_status mismatch: got ${requestAfter.payment_status}`);
          }

          // Ensure the accepted branch is covered deterministically.
          if (requestAfter.status !== 'accepted') {
            const interimUiState = evaluatePendingApprovalUiState(requestAfter, 'ambulance');
            if (interimUiState !== 'awaiting_assignment') {
              throw new Error(
                `pending_approval interim UI mismatch: expected awaiting_assignment, got ${interimUiState}`
              );
            }
            await resetAmbulance();
            const { data: assignData, error: assignErr } = await client.rpc('assign_ambulance_to_emergency', {
              p_emergency_request_id: requestId,
              p_ambulance_id: ctx.ambulanceId,
              p_priority: 1,
            });
            if (assignErr) throw assignErr;
            if (!assignData?.success) throw new Error(assignData?.error || 'post-approval ambulance assignment failed');

            const requestAccepted = await waitFor(
              async () => {
                const { data: row, error: rowErr } = await admin
                  .from('emergency_requests')
                  .select('id,status,payment_status,ambulance_id,responder_id,responder_name')
                  .eq('id', requestId)
                  .maybeSingle();
                if (rowErr) throw new Error(`accepted request poll failed: ${rowErr.message}`);
                if (!row) return null;
                return row.status === 'accepted' ? row : null;
              },
              { label: 'approved request accepted status' }
            );
            requestAfter = requestAccepted;
          }

          const uiState = evaluatePendingApprovalUiState(requestAfter, 'ambulance');
          if (uiState !== 'approved') {
            throw new Error(`pending_approval approval UI projection mismatch: expected approved, got ${uiState}`);
          }

          const afterTransitions = await fetchTransitionAuditRows(requestId);
          assertAppendOnlyTransitionAudit(beforeTransitions, afterTransitions, { requireGrowth: true });

          ctx.lastCaseRequestId = requestId;
          ctx.lastCaseAmbulanceId = requestAfter.ambulance_id || ctx.ambulanceId;
          ctx.lastCasePaymentId = paymentId;
          ctx.lastCaseServiceType = 'ambulance';
          return { data, error: null };
        },
      },
      {
        caseId: 'AP2',
        role: 'dispatcher',
        action: 'decline_cash_payment',
        fromStatus: 'pending_approval_to_payment_declined',
        expectSuccess: true,
        assertApprovalRealtimeProjection: {
          serviceType: 'ambulance',
          expectedFinalState: 'declined',
        },
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'pending_approval',
            serviceType: 'ambulance',
            requestOverrides: { payment_status: 'pending' },
          });
          const paymentId = await createPendingCashPayment(requestId);
          const beforeTransitions = await fetchTransitionAuditRows(requestId);

          const { data, error } = await client.rpc('decline_cash_payment', {
            p_payment_id: paymentId,
            p_request_id: requestId,
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'decline_cash_payment failed');

          const { data: requestAfter, error: requestAfterErr } = await admin
            .from('emergency_requests')
            .select('id,status,payment_status')
            .eq('id', requestId)
            .single();
          if (requestAfterErr) throw new Error(`declined request lookup failed: ${requestAfterErr.message}`);
          if (requestAfter.status !== 'payment_declined') {
            throw new Error(`declined request status mismatch: expected payment_declined, got ${requestAfter.status}`);
          }
          if (requestAfter.payment_status !== 'failed') {
            throw new Error(`declined request payment_status mismatch: expected failed, got ${requestAfter.payment_status}`);
          }

          const { data: paymentAfter, error: paymentAfterErr } = await admin
            .from('payments')
            .select('id,status')
            .eq('id', paymentId)
            .single();
          if (paymentAfterErr) throw new Error(`declined payment lookup failed: ${paymentAfterErr.message}`);
          if (paymentAfter.status !== 'failed') {
            throw new Error(`declined payment status mismatch: expected failed, got ${paymentAfter.status}`);
          }

          const uiState = evaluatePendingApprovalUiState(requestAfter, 'ambulance');
          if (uiState !== 'declined') {
            throw new Error(`pending_approval decline UI projection mismatch: expected declined, got ${uiState}`);
          }

          const afterTransitions = await fetchTransitionAuditRows(requestId);
          assertAppendOnlyTransitionAudit(beforeTransitions, afterTransitions, { requireGrowth: true });

          ctx.lastCaseRequestId = requestId;
          ctx.lastCaseAmbulanceId = requestAfter.ambulance_id || ctx.ambulanceId;
          ctx.lastCasePaymentId = paymentId;
          ctx.lastCaseServiceType = 'ambulance';
          return { data, error: null };
        },
      },
      {
        caseId: 'AP3',
        role: 'viewer',
        action: 'approve_cash_payment',
        fromStatus: 'pending_approval_unauthorized',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'pending_approval',
            serviceType: 'ambulance',
            requestOverrides: { payment_status: 'pending' },
          });
          const paymentId = await createPendingCashPayment(requestId);
          return client.rpc('approve_cash_payment', {
            p_payment_id: paymentId,
            p_request_id: requestId,
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
        assertAppRealtimeProjection: true,
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
        assertAppRealtimeProjection: true,
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
            .select('id,ambulance_id,responder_id,status,responder_name,responder_vehicle_type,responder_vehicle_plate')
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
        assertAppRealtimeProjection: true,
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
        caseId: 'RA4',
        role: 'orgAdmin',
        action: 'auto_reassign_on_driver_unavailable',
        fromStatus: 'in_progress_driver_unavailable_mid_flow',
        expectSuccess: true,
        execute: async () => {
          const requestId = await createRequest({
            status: 'in_progress',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
            requestOverrides: {
              responder_name: 'Primary Driver',
              responder_vehicle_type: 'basic',
              responder_vehicle_plate: 'RA4-OLD',
            },
          });

          await admin
            .from('ambulances')
            .update({
              status: 'on_trip',
              current_call: requestId,
              profile_id: ctx.users.providerAssigned.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ctx.ambulanceId);

          await admin
            .from('ambulances')
            .update({
              status: 'available',
              current_call: null,
              profile_id: ctx.users.providerOther.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ctx.ambulanceOtherId);

          const beforeTransitions = await fetchTransitionAuditRows(requestId);

          const { error: markUnavailableErr } = await admin
            .from('ambulances')
            .update({ status: 'maintenance', updated_at: new Date().toISOString() })
            .eq('id', ctx.ambulanceId);
          if (markUnavailableErr) throw new Error(`driver unavailable setup failed: ${markUnavailableErr.message}`);

          const requestAfter = await waitFor(
            async () => {
              const { data: row, error: rowErr } = await admin
                .from('emergency_requests')
                .select('id,status,ambulance_id,responder_id,responder_name,responder_vehicle_type,responder_vehicle_plate')
                .eq('id', requestId)
                .maybeSingle();
              if (rowErr) throw new Error(`driver failover request poll failed: ${rowErr.message}`);
              if (!row) return null;
              if (row.ambulance_id !== ctx.ambulanceOtherId) return null;
              return row;
            },
            { label: 'driver failover reassignment' }
          );

          if (requestAfter.responder_id !== ctx.users.providerOther.id) {
            throw new Error('driver failover did not switch responder_id to replacement driver');
          }
          if (!['accepted', 'in_progress'].includes(requestAfter.status)) {
            throw new Error(`driver failover request status unexpected: ${requestAfter.status}`);
          }

          const { data: oldAmb, error: oldAmbErr } = await admin
            .from('ambulances')
            .select('id,status,current_call')
            .eq('id', ctx.ambulanceId)
            .single();
          if (oldAmbErr) throw new Error(`driver failover old ambulance lookup failed: ${oldAmbErr.message}`);
          if (oldAmb.status !== 'maintenance') {
            throw new Error(`driver failover unexpectedly changed old ambulance status: ${oldAmb.status}`);
          }
          if (oldAmb.current_call !== null) {
            throw new Error('driver failover did not release old ambulance current_call');
          }

          const afterTransitions = await fetchTransitionAuditRows(requestId);
          assertAppendOnlyTransitionAudit(beforeTransitions, afterTransitions, { requireGrowth: true });

          ctx.lastCaseRequestId = requestId;
          ctx.lastCaseAmbulanceId = ctx.ambulanceOtherId;
          return { data: { success: true }, error: null };
        },
      },
      {
        caseId: 'DR1',
        role: 'orgAdmin',
        action: 'assign_doctor_to_emergency',
        fromStatus: 'accepted',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'accepted', ambulanceId: ctx.ambulanceId });
          const { data, error } = await client.rpc('assign_doctor_to_emergency', {
            p_emergency_request_id: requestId,
            p_doctor_id: ctx.doctorId,
            p_notes: 'matrix initial doctor assign',
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'doctor assignment failed');

          const { data: reqAfter, error: reqAfterErr } = await admin
            .from('emergency_requests')
            .select('id,assigned_doctor_id')
            .eq('id', requestId)
            .single();
          if (reqAfterErr) throw new Error(`doctor assignment request lookup failed: ${reqAfterErr.message}`);
          if (reqAfter.assigned_doctor_id !== ctx.doctorId) {
            throw new Error(`assigned_doctor_id not updated to target doctor`);
          }

          const { data: assignedRows, error: assignedRowsErr } = await admin
            .from('emergency_doctor_assignments')
            .select('doctor_id,status')
            .eq('emergency_request_id', requestId)
            .eq('doctor_id', ctx.doctorId)
            .eq('status', 'assigned');
          if (assignedRowsErr) throw new Error(`doctor assignment mirror lookup failed: ${assignedRowsErr.message}`);
          if (!assignedRows || assignedRows.length === 0) {
            throw new Error('doctor assignment mirror row missing after assignment');
          }

          const { data: doctorAfter, error: doctorAfterErr } = await admin
            .from('doctors')
            .select('id,current_patients')
            .eq('id', ctx.doctorId)
            .single();
          if (doctorAfterErr) throw new Error(`doctor load lookup failed: ${doctorAfterErr.message}`);
          if ((doctorAfter.current_patients ?? 0) < 1) {
            throw new Error(`doctor current_patients was not incremented`);
          }

          return { data, error: null };
        },
      },
      {
        caseId: 'DR2',
        role: 'orgAdmin',
        action: 'assign_doctor_to_emergency',
        fromStatus: 'accepted_reassign',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'accepted', ambulanceId: ctx.ambulanceId });
          const { data: firstAssign, error: firstAssignErr } = await clients.orgAdmin.rpc(
            'assign_doctor_to_emergency',
            {
              p_emergency_request_id: requestId,
              p_doctor_id: ctx.doctorId,
              p_notes: 'matrix first doctor',
            }
          );
          if (firstAssignErr) throw firstAssignErr;
          if (!firstAssign?.success) throw new Error(firstAssign?.error || 'first doctor assignment failed');

          const { data, error } = await client.rpc('assign_doctor_to_emergency', {
            p_emergency_request_id: requestId,
            p_doctor_id: ctx.doctorOtherId,
            p_notes: 'matrix doctor reassignment',
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'doctor reassignment failed');

          const { data: reqAfter, error: reqAfterErr } = await admin
            .from('emergency_requests')
            .select('id,assigned_doctor_id')
            .eq('id', requestId)
            .single();
          if (reqAfterErr) throw new Error(`reassigned request lookup failed: ${reqAfterErr.message}`);
          if (reqAfter.assigned_doctor_id !== ctx.doctorOtherId) {
            throw new Error('reassignment did not switch assigned_doctor_id');
          }

          const { data: assignmentRows, error: assignmentRowsErr } = await admin
            .from('emergency_doctor_assignments')
            .select('doctor_id,status')
            .eq('emergency_request_id', requestId);
          if (assignmentRowsErr) throw new Error(`assignment rows lookup failed: ${assignmentRowsErr.message}`);

          const hasCancelledPrevious = (assignmentRows || []).some(
            (row) => row.doctor_id === ctx.doctorId && row.status === 'cancelled'
          );
          const hasAssignedNew = (assignmentRows || []).some(
            (row) => row.doctor_id === ctx.doctorOtherId && row.status === 'assigned'
          );
          if (!hasCancelledPrevious || !hasAssignedNew) {
            throw new Error('doctor reassignment row statuses are inconsistent');
          }

          const { data: doctorsAfter, error: doctorsAfterErr } = await admin
            .from('doctors')
            .select('id,current_patients')
            .in('id', [ctx.doctorId, ctx.doctorOtherId]);
          if (doctorsAfterErr) throw new Error(`doctor load mirror lookup failed: ${doctorsAfterErr.message}`);
          const loadByDoctor = new Map((doctorsAfter || []).map((row) => [row.id, row.current_patients ?? 0]));
          if ((loadByDoctor.get(ctx.doctorId) ?? -1) !== 0) {
            throw new Error('previous doctor load was not released on reassignment');
          }
          if ((loadByDoctor.get(ctx.doctorOtherId) ?? 0) < 1) {
            throw new Error('new doctor load was not incremented on reassignment');
          }

          return { data, error: null };
        },
      },
      {
        caseId: 'DR3',
        role: 'viewer',
        action: 'assign_doctor_to_emergency',
        fromStatus: 'accepted',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'accepted', ambulanceId: ctx.ambulanceId });
          return client.rpc('assign_doctor_to_emergency', {
            p_emergency_request_id: requestId,
            p_doctor_id: ctx.doctorId,
            p_notes: 'viewer unauthorized test',
          });
        },
      },
      {
        caseId: 'DR4',
        role: 'orgAdmin',
        action: 'assign_doctor_to_emergency',
        fromStatus: 'accepted_doctor_unavailable',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'accepted', ambulanceId: ctx.ambulanceId });
          const { error: doctorFillErr } = await admin
            .from('doctors')
            .update({
              status: 'available',
              is_available: true,
              current_patients: 4,
              max_patients: 4,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ctx.doctorOtherId);
          if (doctorFillErr) throw new Error(`doctor load setup failed: ${doctorFillErr.message}`);

          return client.rpc('assign_doctor_to_emergency', {
            p_emergency_request_id: requestId,
            p_doctor_id: ctx.doctorOtherId,
            p_notes: 'full doctor denial test',
          });
        },
      },
      {
        caseId: 'DR5',
        role: 'orgAdmin',
        action: 'assign_doctor_to_emergency',
        fromStatus: 'completed',
        expectSuccess: false,
        execute: async (client) => {
          const requestId = await createRequest({ status: 'completed', ambulanceId: ctx.ambulanceId });
          return client.rpc('assign_doctor_to_emergency', {
            p_emergency_request_id: requestId,
            p_doctor_id: ctx.doctorId,
            p_notes: 'terminal request guard',
          });
        },
      },
      {
        caseId: 'DR6',
        role: 'orgAdmin',
        action: 'assign_ambulance_to_emergency',
        fromStatus: 'accepted_doctor_closed_loop_reassign',
        expectSuccess: true,
        execute: async (client) => {
          const requestId = await createRequest({
            status: 'accepted',
            responderId: ctx.users.providerAssigned.id,
            ambulanceId: ctx.ambulanceId,
          });

          const { data: firstAssign, error: firstAssignErr } = await clients.orgAdmin.rpc(
            'assign_doctor_to_emergency',
            {
              p_emergency_request_id: requestId,
              p_doctor_id: ctx.doctorId,
              p_notes: 'pre-reassignment doctor setup',
            }
          );
          if (firstAssignErr) throw firstAssignErr;
          if (!firstAssign?.success) throw new Error(firstAssign?.error || 'doctor setup assignment failed');

          await admin
            .from('doctors')
            .update({
              status: 'off_duty',
              is_available: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ctx.doctorId);

          await admin
            .from('doctors')
            .update({
              status: 'available',
              is_available: true,
              current_patients: 0,
              max_patients: 4,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ctx.doctorOtherId);

          await resetAmbulance();
          const { data, error } = await client.rpc('assign_ambulance_to_emergency', {
            p_emergency_request_id: requestId,
            p_ambulance_id: ctx.ambulanceOtherId,
            p_priority: 1,
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'ambulance reassignment failed');

          const { data: reqAfter, error: reqAfterErr } = await admin
            .from('emergency_requests')
            .select('id,assigned_doctor_id,ambulance_id')
            .eq('id', requestId)
            .single();
          if (reqAfterErr) throw new Error(`closed-loop request lookup failed: ${reqAfterErr.message}`);
          if (reqAfter.ambulance_id !== ctx.ambulanceOtherId) {
            throw new Error('ambulance reassignment did not persist');
          }
          if (reqAfter.assigned_doctor_id !== ctx.doctorOtherId) {
            throw new Error('doctor was not automatically reassigned after ambulance reassignment');
          }

          const { data: assignmentRows, error: assignmentRowsErr } = await admin
            .from('emergency_doctor_assignments')
            .select('doctor_id,status')
            .eq('emergency_request_id', requestId);
          if (assignmentRowsErr) throw new Error(`closed-loop assignment row lookup failed: ${assignmentRowsErr.message}`);

          const hasCancelledPrevious = (assignmentRows || []).some(
            (row) => row.doctor_id === ctx.doctorId && row.status === 'cancelled'
          );
          const hasAssignedReplacement = (assignmentRows || []).some(
            (row) => row.doctor_id === ctx.doctorOtherId && row.status === 'assigned'
          );
          if (!hasCancelledPrevious || !hasAssignedReplacement) {
            throw new Error('closed-loop reassignment rows not consistent');
          }

          const { data: doctorsAfter, error: doctorsAfterErr } = await admin
            .from('doctors')
            .select('id,current_patients')
            .in('id', [ctx.doctorId, ctx.doctorOtherId]);
          if (doctorsAfterErr) throw new Error(`closed-loop doctor load lookup failed: ${doctorsAfterErr.message}`);
          const loadByDoctor = new Map((doctorsAfter || []).map((row) => [row.id, row.current_patients ?? 0]));
          if ((loadByDoctor.get(ctx.doctorId) ?? -1) !== 0) {
            throw new Error('closed-loop reassignment did not release previous doctor load');
          }
          if ((loadByDoctor.get(ctx.doctorOtherId) ?? 0) < 1) {
            throw new Error('closed-loop reassignment did not increment replacement doctor load');
          }

          return { data, error: null };
        },
      },
      {
        caseId: 'DR7',
        role: 'orgAdmin',
        action: 'auto_reassign_on_doctor_unavailable',
        fromStatus: 'accepted_doctor_unavailable_mid_flow',
        expectSuccess: true,
        execute: async () => {
          const requestId = await createRequest({ status: 'accepted', ambulanceId: ctx.ambulanceId });
          const beforeTransitions = await fetchTransitionAuditRows(requestId);

          const { data: assignData, error: assignErr } = await clients.orgAdmin.rpc('assign_doctor_to_emergency', {
            p_emergency_request_id: requestId,
            p_doctor_id: ctx.doctorId,
            p_notes: 'doctor failover setup',
          });
          if (assignErr) throw assignErr;
          if (!assignData?.success) throw new Error(assignData?.error || 'doctor failover setup assignment failed');

          await admin
            .from('doctors')
            .update({
              status: 'available',
              is_available: true,
              current_patients: 0,
              max_patients: 4,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ctx.doctorOtherId);

          const { error: unavailableErr } = await admin
            .from('doctors')
            .update({
              status: 'off_duty',
              is_available: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ctx.doctorId);
          if (unavailableErr) throw new Error(`doctor failover unavailable update failed: ${unavailableErr.message}`);

          const requestAfter = await waitFor(
            async () => {
              const { data: row, error: rowErr } = await admin
                .from('emergency_requests')
                .select('id,status,assigned_doctor_id')
                .eq('id', requestId)
                .maybeSingle();
              if (rowErr) throw new Error(`doctor failover request poll failed: ${rowErr.message}`);
              if (!row) return null;
              return row.assigned_doctor_id === ctx.doctorOtherId ? row : null;
            },
            { label: 'doctor failover reassignment' }
          );
          if (requestAfter.status !== 'accepted') {
            throw new Error(`doctor failover changed request status unexpectedly: ${requestAfter.status}`);
          }

          const { data: assignmentRows, error: assignmentRowsErr } = await admin
            .from('emergency_doctor_assignments')
            .select('doctor_id,status')
            .eq('emergency_request_id', requestId);
          if (assignmentRowsErr) throw new Error(`doctor failover assignments lookup failed: ${assignmentRowsErr.message}`);

          const oldCancelled = (assignmentRows || []).some(
            (row) => row.doctor_id === ctx.doctorId && row.status === 'cancelled'
          );
          const newAssigned = (assignmentRows || []).some(
            (row) => row.doctor_id === ctx.doctorOtherId && row.status === 'assigned'
          );
          if (!oldCancelled || !newAssigned) {
            throw new Error('doctor failover assignments did not close loop correctly');
          }

          const { data: doctorsAfter, error: doctorsAfterErr } = await admin
            .from('doctors')
            .select('id,current_patients')
            .in('id', [ctx.doctorId, ctx.doctorOtherId]);
          if (doctorsAfterErr) throw new Error(`doctor failover load lookup failed: ${doctorsAfterErr.message}`);
          const loadByDoctor = new Map((doctorsAfter || []).map((row) => [row.id, row.current_patients ?? 0]));
          if ((loadByDoctor.get(ctx.doctorId) ?? -1) !== 0) {
            throw new Error('doctor failover did not release unavailable doctor load');
          }
          if ((loadByDoctor.get(ctx.doctorOtherId) ?? 0) < 1) {
            throw new Error('doctor failover did not increment replacement doctor load');
          }

          const afterTransitions = await fetchTransitionAuditRows(requestId);
          assertAppendOnlyTransitionAudit(beforeTransitions, afterTransitions, { requireGrowth: false });

          return { data: { success: true }, error: null };
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
      ctx.lastCasePaymentId = null;
      ctx.lastCaseServiceType = null;
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

      const shouldAssertAppRealtimeProjection =
        !!tc.assertAppRealtimeProjection || !!tc.assertTelemetryMirror;
      if (result.success && shouldAssertAppRealtimeProjection) {
        const appProjection = await verifyAppRealtimeProjection(
          ctx.lastCaseRequestId,
          ctx.lastCaseAmbulanceId || ctx.ambulanceId
        );
        result.appRealtimeProjection = appProjection.details;
        if (!appProjection.passed) {
          result.success = false;
          result.error = appProjection.error;
        }
      }

      if (result.success && tc.assertApprovalRealtimeProjection) {
        const approvalProjection = await verifyPendingApprovalRealtimeProjection({
          requestId: ctx.lastCaseRequestId,
          paymentId: ctx.lastCasePaymentId,
          serviceType: tc.assertApprovalRealtimeProjection.serviceType || ctx.lastCaseServiceType || 'ambulance',
          expectedFinalState: tc.assertApprovalRealtimeProjection.expectedFinalState,
        });
        result.approvalRealtimeProjection = approvalProjection.details;
        if (!approvalProjection.passed) {
          result.success = false;
          result.error = approvalProjection.error;
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

      await safeRun(
        `reset doctors after ${tc.caseId}`,
        async () => {
          await resetDoctors();
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

    await safeRun(
      'reset doctors',
      async () => {
        const doctorIds = [ctx.doctorId, ctx.doctorOtherId].filter(Boolean);
        if (doctorIds.length > 0) {
          await admin
            .from('doctors')
            .update({
              status: 'available',
              is_available: true,
              max_patients: 4,
              current_patients: 0,
              updated_at: new Date().toISOString(),
            })
            .in('id', doctorIds);
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
        'delete doctors',
        async () => {
          const doctorIds = [ctx.doctorId, ctx.doctorOtherId].filter(Boolean);
          if (doctorIds.length > 0) {
            const { error } = await admin.from('doctors').delete().in('id', doctorIds);
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
