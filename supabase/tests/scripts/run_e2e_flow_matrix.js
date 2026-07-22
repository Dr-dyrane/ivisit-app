const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const {
  createDemoRunManifest,
  defaultManifestPath,
  markCleanupAttempt,
  registerResource,
  saveManifest,
} = require('./demo_run_manifest');
const {
  applyCleanupPlan,
  buildCleanupPlan,
  countPlan,
} = require('./cleanup_demo_run');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const TEST_USER_PASSWORD = 'password123!';
const PREPARE_BROWSER_FIXTURE = process.argv.includes('--prepare-browser-fixture');
const BROWSER_FIXTURE_STATES = new Set(['ready', 'offered']);
const BROWSER_FIXTURE_PROFILES = new Set(['standard', 'fleet-rich', 'provider-rich']);

function argumentValue(name, argv = process.argv.slice(2)) {
  const prefix = `--${name}=`;
  const exact = argv.find((value) => value.startsWith(prefix));
  return exact ? exact.slice(prefix.length) : null;
}

const BROWSER_FIXTURE_STATE = argumentValue('browser-state') || 'ready';
const BROWSER_FIXTURE_PROFILE = argumentValue('fixture-profile') || 'standard';

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}
if (PREPARE_BROWSER_FIXTURE && !BROWSER_FIXTURE_STATES.has(BROWSER_FIXTURE_STATE)) {
  console.error(`Unsupported browser fixture state: ${BROWSER_FIXTURE_STATE}`);
  process.exit(1);
}
if (PREPARE_BROWSER_FIXTURE && !BROWSER_FIXTURE_PROFILES.has(BROWSER_FIXTURE_PROFILE)) {
  console.error(`Unsupported browser fixture profile: ${BROWSER_FIXTURE_PROFILE}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const TS = Date.now();
const TAG = `flow-matrix-${TS}-${crypto.randomBytes(4).toString('hex')}`;
const PROJECT_REF = new URL(supabaseUrl).hostname.split('.')[0];

function nowIso() {
  return new Date().toISOString();
}

function unique(values) {
  return [...new Set([...values].filter(Boolean))];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function persistManifest(ctx) {
  saveManifest(ctx.manifest, ctx.manifestPath);
}

function trackManifestResource(ctx, resourceKey, value) {
  registerResource(ctx.manifest, resourceKey, value);
  persistManifest(ctx);
  return value;
}

function createTrackedSet(ctx, resourceKey) {
  const values = new Set();
  values.add = (value) => {
    Set.prototype.add.call(values, value);
    trackManifestResource(ctx, resourceKey, value);
    return values;
  };
  return values;
}

function email(role) {
  return `test-${TAG}-${role}@ivisit-e2e.local`;
}

async function createAuthUser({ email, role, full_name }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name, role }
  });
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  return data.user;
}

async function createAuthedClient(actorEmail, actorLabel) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error: signInError } = await client.auth.signInWithPassword({
    email: actorEmail,
    password: TEST_USER_PASSWORD
  });
  if (signInError) {
    throw new Error(`${actorLabel} sign-in failed: ${signInError.message}`);
  }

  return client;
}

async function qOne(table, select, filterCol, filterVal) {
  const { data, error } = await supabase.from(table).select(select).eq(filterCol, filterVal).single();
  if (error) throw new Error(`${table} query failed: ${error.message}`);
  return data;
}

async function runJsonRpc(client, name, args, label) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${label} failed: ${error.message}`);
  if (data?.success !== true) {
    throw new Error(`${label} rejected: ${JSON.stringify(data)}`);
  }
  return data;
}

async function deleteIds(table, ids) {
  const values = unique(ids);
  if (values.length === 0) return;
  const { error } = await supabase.from(table).delete().in('id', values);
  if (error) throw error;
}

async function deleteWhereIn(table, column, values) {
  const ids = unique(values);
  if (ids.length === 0) return;
  const { error } = await supabase.from(table).delete().in(column, ids);
  if (error) throw error;
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

function fixtureEntityIds(ctx) {
  return unique([
    ...ctx.userIds,
    ...ctx.doctorIds,
    ...ctx.ambulanceIds,
    ...ctx.requestIds,
    ...ctx.paymentIds,
    ...ctx.assignmentIds,
    ...ctx.staffingIds,
    ...ctx.visitIds,
    ...ctx.patientWalletIds,
    ...ctx.organizationWalletIds,
    ctx.orgId,
    ctx.hospitalId
  ]);
}

async function collectGeneratedFixtureIds(ctx) {
  const requestIds = [...ctx.requestIds];
  if (requestIds.length > 0) {
    for (const [table, target] of [
      ['visits', ctx.visitIds],
      ['emergency_responder_assignments', ctx.assignmentIds],
      ['payments', ctx.paymentIds]
    ]) {
      const { data, error } = await supabase.from(table).select('id').in(
        table === 'visits' ? 'request_id' : 'emergency_request_id',
        requestIds
      );
      if (error) throw error;
      for (const row of data || []) target.add(row.id);
    }
  }

  if (ctx.ambulanceIds.size > 0) {
    const { data, error } = await supabase
      .from('ambulance_staff_assignments')
      .select('id')
      .in('ambulance_id', [...ctx.ambulanceIds]);
    if (error) throw error;
    for (const row of data || []) ctx.staffingIds.add(row.id);
  }

  if (ctx.orgId) {
    const { data, error } = await supabase
      .from('organization_wallets')
      .select('id')
      .eq('organization_id', ctx.orgId);
    if (error) throw error;
    for (const row of data || []) ctx.organizationWalletIds.add(row.id);
  }

  if (ctx.userIds.size > 0) {
    const userIds = [...ctx.userIds];
    const { data: wallets, error: walletError } = await supabase
      .from('patient_wallets')
      .select('id')
      .in('user_id', userIds);
    if (walletError) throw walletError;
    for (const row of wallets || []) ctx.patientWalletIds.add(row.id);

    const { data: activities, error: activityError } = await supabase
      .from('user_activity')
      .select('id')
      .in('user_id', userIds);
    if (activityError) throw activityError;
    for (const row of activities || []) ctx.activityIds.add(row.id);

    const { data: auditRows, error: auditError } = await supabase
      .from('admin_audit_log')
      .select('id')
      .in('admin_id', userIds);
    if (auditError) throw auditError;
    for (const row of auditRows || []) ctx.adminAuditIds.add(row.id);
  }
}

async function deleteEmergencyRequestGraphs(requestIds) {
  const ids = uuidSqlList(requestIds);
  if (!ids) return;

  const sql = `
DO $$
BEGIN
  ALTER TABLE public.emergency_requests
    DISABLE TRIGGER on_emergency_start_dispatch;
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
  ALTER TABLE public.emergency_requests
    ENABLE TRIGGER on_emergency_start_dispatch;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  ALTER TABLE public.emergency_responder_assignments
    ENABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_requests
    ENABLE TRIGGER on_emergency_start_dispatch;
  RAISE;
END;
$$;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`delete emergency request graphs via exec_sql failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`delete emergency request graphs rejected: ${data?.error || 'unknown error'}`);
  }
}

async function removeFixtureWalletLedgerEffects(paymentIds) {
  const ids = uuidSqlList(paymentIds);
  if (!ids) return;
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
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'wallet ledger cleanup was rejected');
}

async function assertNoRows(table, column, values) {
  const ids = unique(values);
  if (ids.length === 0) return;
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .in(column, ids);
  if (error) throw error;
  assert(count === 0, `${table} retained ${count} fixture row(s)`);
}

async function assertZeroResidue(ctx) {
  const entityIds = fixtureEntityIds(ctx);
  await assertNoRows('emergency_requests', 'id', ctx.requestIds);
  await assertNoRows('emergency_responder_assignments', 'emergency_request_id', ctx.requestIds);
  await assertNoRows('emergency_status_transitions', 'emergency_request_id', ctx.requestIds);
  await assertNoRows('emergency_doctor_assignments', 'emergency_request_id', ctx.requestIds);
  await assertNoRows('insurance_billing', 'emergency_request_id', ctx.requestIds);
  await assertNoRows('visits', 'id', ctx.visitIds);
  await assertNoRows('visits', 'request_id', ctx.requestIds);
  await assertNoRows('payments', 'id', ctx.paymentIds);
  await assertNoRows('payments', 'emergency_request_id', ctx.requestIds);
  await assertNoRows('wallet_ledger', 'reference_id', ctx.paymentIds);
  await assertNoRows('notifications', 'user_id', ctx.userIds);
  await assertNoRows('notifications', 'target_id', entityIds);
  await assertNoRows('ambulance_staff_assignments', 'id', ctx.staffingIds);
  await assertNoRows('ambulance_staff_assignments', 'ambulance_id', ctx.ambulanceIds);
  await assertNoRows('ambulance_staff_assignments', 'responder_id', ctx.userIds);
  await assertNoRows('ambulances', 'id', ctx.ambulanceIds);
  await assertNoRows('doctors', 'id', ctx.doctorIds);
  await assertNoRows('hospitals', 'id', [ctx.hospitalId]);
  await assertNoRows('organization_wallets', 'id', ctx.organizationWalletIds);
  await assertNoRows('organization_wallets', 'organization_id', [ctx.orgId]);
  await assertNoRows('patient_wallets', 'id', ctx.patientWalletIds);
  await assertNoRows('patient_wallets', 'user_id', ctx.userIds);
  await assertNoRows('organizations', 'id', [ctx.orgId]);
  await assertNoRows('id_mappings', 'entity_id', entityIds);
  await assertNoRows('profiles', 'id', ctx.userIds);
  await assertNoRows('preferences', 'user_id', ctx.userIds);
  await assertNoRows('medical_profiles', 'user_id', ctx.userIds);
  await assertNoRows('user_activity', 'id', ctx.activityIds);
  await assertNoRows('user_activity', 'user_id', ctx.userIds);
  await assertNoRows('admin_audit_log', 'id', ctx.adminAuditIds);
  await assertNoRows('admin_audit_log', 'admin_id', ctx.userIds);

  for (const userId of ctx.userIds) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error && !/not found/i.test(error.message || '')) throw error;
    assert(!data?.user, `auth.users retained ${userId}`);
  }
}

async function cleanup(ctx, report) {
  const warnings = [];
  const safe = async (label, operation) => {
    try {
      await operation();
    } catch (error) {
      warnings.push(`${label}: ${error.message}`);
    }
  };

  await safe('collect generated fixture ids', () => collectGeneratedFixtureIds(ctx));

  const userIds = [...ctx.userIds];
  const requestIds = [...ctx.requestIds];
  await safe('delete fixture notifications by user', () => deleteWhereIn('notifications', 'user_id', userIds));
  await safe('delete fixture notifications by target', () =>
    deleteWhereIn('notifications', 'target_id', fixtureEntityIds(ctx))
  );
  await safe('delete fixture user activity', () => deleteIds('user_activity', ctx.activityIds));
  await safe('delete fixture admin audit rows', () => deleteIds('admin_audit_log', ctx.adminAuditIds));
  await safe('delete fixture insurance billing', () =>
    deleteWhereIn('insurance_billing', 'emergency_request_id', requestIds)
  );
  await safe('delete fixture doctor assignments', () =>
    deleteWhereIn('emergency_doctor_assignments', 'emergency_request_id', requestIds)
  );
  await safe('delete fixture visits', () => deleteIds('visits', ctx.visitIds));
  await safe('remove fixture wallet ledger effects', () => removeFixtureWalletLedgerEffects(ctx.paymentIds));
  await safe('delete fixture emergency request graphs', () => deleteEmergencyRequestGraphs(requestIds));
  await safe('delete fixture payments', () => deleteIds('payments', ctx.paymentIds));
  await safe('delete fixture patient wallets', () => deleteIds('patient_wallets', ctx.patientWalletIds));
  await safe('delete fixture staffing', () => deleteIds('ambulance_staff_assignments', ctx.staffingIds));
  await safe('delete fixture ambulances', () => deleteIds('ambulances', ctx.ambulanceIds));
  await safe('delete fixture doctors', () => deleteIds('doctors', ctx.doctorIds));
  await safe('delete fixture hospital', () => deleteIds('hospitals', [ctx.hospitalId]));
  await safe('delete fixture organization wallets', () =>
    deleteIds('organization_wallets', ctx.organizationWalletIds)
  );
  await safe('delete fixture organization', () => deleteIds('organizations', [ctx.orgId]));
  await safe('delete fixture display mappings', () =>
    deleteWhereIn('id_mappings', 'entity_id', fixtureEntityIds(ctx))
  );

  for (const userId of userIds) {
    await safe(`delete auth user ${userId}`, async () => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error && !/not found/i.test(error.message || '')) throw error;
    });
  }

  try {
    await assertZeroResidue(ctx);
    report.zeroResiduePassed = true;
  } catch (error) {
    report.zeroResiduePassed = false;
    warnings.push(`zero residue assertion: ${error.message}`);
  }

  report.cleanupWarnings = warnings;
  report.cleanupPassed = warnings.length === 0;
}

async function runManifestCleanupPass(ctx, pass) {
  const plan = await buildCleanupPlan(supabase, ctx.manifest);
  const planned = countPlan(plan);
  await applyCleanupPlan(supabase, plan, ctx.manifest.resources.authUserIds);
  const residue = countPlan(
    await buildCleanupPlan(supabase, ctx.manifest, {
      authUsersExpectedAbsent: true,
    })
  );
  assert(
    Object.values(residue).every((count) => count === 0),
    `manifest cleanup pass ${pass} left residue: ${JSON.stringify(residue)}`
  );
  await assertZeroResidue(ctx);
  return { pass, planned, residue, zeroResidue: true };
}

async function createFoundation(ctx) {
  const runLabel = TAG.slice(-8);
  const coordinateSeed = crypto.createHash('sha256').update(TAG).digest();
  const hospitalLatitude = 6.525
    + (coordinateSeed.readUInt32BE(0) / 0xffffffff) * 0.001;
  const hospitalLongitude = 3.38
    + (coordinateSeed.readUInt32BE(4) / 0xffffffff) * 0.001;
  const patient = await createAuthUser({
    email: email('patient'),
    role: 'patient',
    full_name: `Patient ${TAG}`
  });
  const driver = await createAuthUser({
    email: email('driver'),
    role: 'provider',
    full_name: `Driver ${TAG}`
  });
  const doctorUser = await createAuthUser({
    email: email('doctor'),
    role: 'provider',
    full_name: `Doctor ${TAG}`
  });

  ctx.userIds.add(patient.id);
  ctx.userIds.add(driver.id);
  ctx.userIds.add(doctorUser.id);

  const { data: patientWallet, error: patientWalletError } = await supabase
    .from('patient_wallets')
    .update({ balance: 1000, updated_at: nowIso() })
    .eq('user_id', patient.id)
    .select('id')
    .single();
  if (patientWalletError) {
    throw new Error(`patient wallet funding failed: ${patientWalletError.message}`);
  }
  ctx.patientWalletIds.add(patientWallet.id);

  const { error: driverRoleError } = await supabase
    .from('profiles')
    .update({ role: 'provider', provider_type: 'driver' })
    .eq('id', driver.id);
  if (driverRoleError) throw new Error(`driver role update failed: ${driverRoleError.message}`);

  const { error: doctorRoleError } = await supabase
    .from('profiles')
    .update({ role: 'provider', provider_type: 'doctor' })
    .eq('id', doctorUser.id);
  if (doctorRoleError) throw new Error(`doctor role update failed: ${doctorRoleError.message}`);

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: `[DEMO ${runLabel}] Flow Matrix Organization`,
      organization_type: 'hospital',
      registration_number: TAG,
      contact_email: email('organization-contact'),
      verification_status: 'verified',
      verified_at: nowIso(),
      is_active: true,
    })
    .select()
    .single();
  if (orgErr) throw new Error(`org create failed: ${orgErr.message}`);
  ctx.orgId = org.id;
  trackManifestResource(ctx, 'organizationIds', org.id);

  const orgAdmin = await createAuthUser({
    email: email('org-admin'),
    role: 'org_admin',
    full_name: `Org Admin ${TAG}`
  });
  ctx.userIds.add(orgAdmin.id);

  const { error: orgAdminProfileError } = await supabase
    .from('profiles')
    .update({
      role: 'org_admin',
      organization_id: org.id,
      onboarding_status: 'complete'
    })
    .eq('id', orgAdmin.id);
  if (orgAdminProfileError) {
    throw new Error(`org admin profile update failed: ${orgAdminProfileError.message}`);
  }

  const { data: hospital, error: hospErr } = await supabase
    .from('hospitals')
    .insert({
      organization_id: org.id,
      name: `[DEMO ${runLabel}] Flow Matrix Hospital`,
      address: '1 E2E Validation Ave',
      latitude: hospitalLatitude,
      longitude: hospitalLongitude,
      coordinates: `SRID=4326;POINT(${hospitalLongitude} ${hospitalLatitude})`,
      place_id: `e2e:${TAG}:facility:flow-matrix`,
      features: [
        `demo_scope:${TAG}`,
        `demo_owner:${ctx.manifest.owner.id}`,
        `demo_expires_at:${Date.parse(ctx.manifest.expiresAt)}`,
      ],
      provider_source: 'manual_seed',
      status: 'available',
      verified: true,
      verification_status: 'verified',
      provider_type: 'hospital',
      emergency_eligible: true,
      dispatch_eligible: true,
      available_beds: 5,
      total_beds: 10,
      icu_beds_available: 2
    })
    .select()
    .single();
  if (hospErr) throw new Error(`hospital create failed: ${hospErr.message}`);
  ctx.hospitalId = hospital.id;
  trackManifestResource(ctx, 'createdFacilityIds', hospital.id);

  const { error: driverScopeError } = await supabase
    .from('profiles')
    .update({ organization_id: org.id, onboarding_status: 'complete' })
    .eq('id', driver.id);
  if (driverScopeError) throw new Error(`driver scope update failed: ${driverScopeError.message}`);

  const doctorName = `Dr ${TAG}`;
  const { error: doctorProfileError } = await supabase
    .from('profiles')
    .update({ organization_id: org.id, onboarding_status: 'complete', full_name: doctorName })
    .eq('id', doctorUser.id);
  if (doctorProfileError) throw new Error(`doctor profile update failed: ${doctorProfileError.message}`);

  // Ensure org wallet can pay platform fees during cash approvals.
  const { data: orgWallet, error: orgWalletError } = await supabase
    .from('organization_wallets')
    .update({ balance: 10000, updated_at: nowIso() })
    .eq('organization_id', org.id)
    .select('id')
    .single();
  if (orgWalletError) throw new Error(`org wallet funding failed: ${orgWalletError.message}`);
  ctx.organizationWalletIds.add(orgWallet.id);

  const doctorOperationalPayload = {
    hospital_id: hospital.id,
    specialization: 'Emergency Medicine',
    status: 'available',
    is_available: true,
    current_patients: 0,
    max_patients: 10
  };
  const { data: existingDoctors, error: existingDoctorErr } = await supabase
    .from('doctors')
    .select('id')
    .eq('profile_id', doctorUser.id)
    .limit(1);
  if (existingDoctorErr) throw new Error(`doctor lookup failed: ${existingDoctorErr.message}`);

  let doctor;
  if (existingDoctors?.length) {
    const { data: updatedDoctor, error: updateDoctorErr } = await supabase
      .from('doctors')
      .update(doctorOperationalPayload)
      .eq('id', existingDoctors[0].id)
      .select()
      .single();
    if (updateDoctorErr) throw new Error(`doctor update failed: ${updateDoctorErr.message}`);
    doctor = updatedDoctor;
  } else {
    const { data: createdDoctor, error: createDoctorErr } = await supabase
      .from('doctors')
      .insert({
        ...doctorOperationalPayload,
        profile_id: doctorUser.id,
        name: doctorName,
      })
      .select()
      .single();
    if (createDoctorErr) throw new Error(`doctor create failed: ${createDoctorErr.message}`);
    doctor = createdDoctor;
  }
  ctx.doctorIds.add(doctor.id);

  const ambulancePayload = {
    hospital_id: hospital.id,
    organization_id: org.id,
    profile_id: driver.id,
    call_sign: `E2E-${String(TS).slice(-6)}`,
    type: 'basic',
    status: 'available'
  };
  const { data: existingAmbulances, error: existingAmbErr } = await supabase
    .from('ambulances')
    .select('id')
    .eq('profile_id', driver.id)
    .limit(1);
  if (existingAmbErr) throw new Error(`ambulance lookup failed: ${existingAmbErr.message}`);

  let ambulance;
  if (existingAmbulances?.length) {
    const { data: updatedAmbulance, error: updateAmbErr } = await supabase
      .from('ambulances')
      .update(ambulancePayload)
      .eq('id', existingAmbulances[0].id)
      .select()
      .single();
    if (updateAmbErr) throw new Error(`ambulance update failed: ${updateAmbErr.message}`);
    ambulance = updatedAmbulance;
  } else {
    const { data: createdAmbulance, error: createAmbErr } = await supabase
      .from('ambulances')
      .insert(ambulancePayload)
      .select()
      .single();
    if (createAmbErr) throw new Error(`ambulance create failed: ${createAmbErr.message}`);
    ambulance = createdAmbulance;
  }
  ctx.ambulanceIds.add(ambulance.id);

  const patientClient = await createAuthedClient(patient.email, 'patient');
  const driverClient = await createAuthedClient(driver.email, 'driver');
  const orgAdminClient = await createAuthedClient(orgAdmin.email, 'org admin');

  const staffing = await runJsonRpc(
    orgAdminClient,
    'staff_ambulance_responder',
    { p_ambulance_id: ambulance.id, p_responder_id: driver.id },
    'canonical ambulance staffing'
  );
  ctx.staffingIds.add(staffing.staffing_id);

  const initialTelemetry = await runJsonRpc(
    driverClient,
    'report_responder_telemetry',
    {
      p_payload: {
        ambulance_id: ambulance.id,
        sequence: 1,
        observed_at: nowIso(),
        location: { lat: 6.52445, lng: 3.37925 },
        heading: 35,
        accuracy_meters: 8
      }
    },
    'initial responder telemetry'
  );

  const { data: readiness, error: readinessError } = await orgAdminClient.rpc(
    'get_ambulance_dispatch_readiness',
    { p_ambulance_id: ambulance.id, p_request_id: null }
  );
  if (readinessError) {
    throw new Error(`ambulance dispatch readiness failed: ${readinessError.message}`);
  }
  assert(readiness.ready === true, `ambulance is not dispatch ready: ${JSON.stringify(readiness)}`);

  return {
    patient,
    driver,
    doctorUser,
    orgAdmin,
    org,
    hospital,
    doctor,
    ambulance,
    patientClient,
    driverClient,
    orgAdminClient,
    staffing,
    initialTelemetry,
    readiness
  };
}

async function createRichFleetFixture(ctx, foundation) {
  const suffix = String(TS).slice(-4);
  const fleetRows = [
    {
      call_sign: `E2E-RTR-${suffix}`,
      type: 'advanced',
      status: 'returning',
      vehicle_number: `RTR-${suffix}`,
      license_plate: `E2E-RTR-${suffix}`,
      eta: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
      base_price: 220,
      crew: ['Lead paramedic', 'Emergency technician'],
    },
    {
      call_sign: `E2E-MNT-${suffix}`,
      type: 'basic',
      status: 'maintenance',
      vehicle_number: `MNT-${suffix}`,
      license_plate: `E2E-MNT-${suffix}`,
      base_price: 160,
      crew: ['Fleet technician'],
    },
    {
      call_sign: `E2E-OFF-${suffix}`,
      type: 'patient_transport',
      status: 'offline',
      vehicle_number: `OFF-${suffix}`,
      license_plate: `E2E-OFF-${suffix}`,
      base_price: 120,
    },
    {
      call_sign: `E2E-PND-${suffix}`,
      type: 'basic',
      status: 'pending_approval',
      vehicle_number: `PND-${suffix}`,
      license_plate: `E2E-PND-${suffix}`,
      base_price: 150,
      crew: ['Pending crew review'],
    },
    {
      call_sign: `E2E-RDY-${suffix}`,
      type: 'advanced',
      status: 'available',
      vehicle_number: `RDY-${suffix}`,
      license_plate: `E2E-RDY-${suffix}`,
      eta: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
      base_price: 250,
      crew: ['Paramedic', 'Emergency technician'],
    },
  ].map((row) => ({
    ...row,
    hospital_id: foundation.hospital.id,
    organization_id: foundation.org.id,
  }));

  const { data, error } = await supabase
    .from('ambulances')
    .insert(fleetRows)
    .select('id,call_sign,status,type,vehicle_number,license_plate,eta,base_price');
  if (error) throw new Error(`rich fleet fixture create failed: ${error.message}`);
  (data || []).forEach((row) => ctx.ambulanceIds.add(row.id));
  return data || [];
}

async function createRichProviderFixture(ctx, foundation) {
  const suffix = String(TS).slice(-4);
  const doctorRows = [
    {
      name: `Dr Amara Cole ${suffix}`,
      specialization: 'Emergency Medicine',
      department: 'Emergency',
      status: 'available',
      is_available: true,
      is_on_call: false,
      current_patients: 1,
      max_patients: 8,
      experience: 12,
      rating: 4.8,
      reviews_count: 32,
      consultation_fee: '180',
      phone: '+15555550101',
      email: `amara-${suffix}@ivisit-e2e.local`,
      license_number: `E2E-AM-${suffix}`,
    },
    {
      name: `Dr Bayo Mensah ${suffix}`,
      specialization: 'Cardiology',
      department: 'Cardiology',
      status: 'on_call',
      is_available: true,
      is_on_call: true,
      current_patients: 2,
      max_patients: 6,
      experience: 9,
      rating: 4.6,
      reviews_count: 18,
      consultation_fee: '240',
      phone: '+15555550102',
      email: `bayo-${suffix}@ivisit-e2e.local`,
      license_number: `E2E-BM-${suffix}`,
    },
    {
      name: `Dr Chinwe Okafor ${suffix}`,
      specialization: 'Pediatrics',
      department: 'Pediatrics',
      status: 'busy',
      is_available: false,
      is_on_call: false,
      current_patients: 4,
      max_patients: 5,
      experience: 7,
      rating: 4.9,
      reviews_count: 41,
      consultation_fee: '210',
      phone: '+15555550103',
      email: `chinwe-${suffix}@ivisit-e2e.local`,
      license_number: `E2E-CO-${suffix}`,
    },
    {
      name: `Dr Dara Yusuf ${suffix}`,
      specialization: 'Neurology',
      department: 'Neurology',
      status: 'off_duty',
      is_available: false,
      is_on_call: false,
      current_patients: 0,
      max_patients: 4,
      experience: 15,
      consultation_fee: '260',
      phone: '+15555550104',
      email: `dara-${suffix}@ivisit-e2e.local`,
      license_number: `E2E-DY-${suffix}`,
    },
    {
      name: `Dr Efe Nwosu ${suffix}`,
      specialization: 'General Practice',
      department: 'Outpatient',
      status: 'available',
      is_available: false,
      is_on_call: false,
      current_patients: 0,
      max_patients: 10,
      experience: 5,
      consultation_fee: '150',
      phone: '+15555550105',
      email: `efe-${suffix}@ivisit-e2e.local`,
      license_number: `E2E-EN-${suffix}`,
    },
  ].map((row) => ({
    ...row,
    hospital_id: foundation.hospital.id,
    about: `Exact-run provider fixture ${TAG}`,
  }));

  const { data: doctors, error: doctorError } = await supabase
    .from('doctors')
    .insert(doctorRows)
    .select('id,display_id,name,specialization,status,is_available,is_on_call,current_patients,max_patients');
  if (doctorError) throw new Error(`rich provider fixture create failed: ${doctorError.message}`);
  (doctors || []).forEach((doctor) => ctx.doctorIds.add(doctor.id));

  const today = new Date().toISOString().slice(0, 10);
  const scheduleRows = (doctors || []).slice(0, 4).map((doctor, index) => ({
    doctor_id: doctor.id,
    date: today,
    start_time: ['07:00', '09:00', '12:00', '18:00'][index],
    end_time: ['15:00', '17:00', '20:00', '23:00'][index],
    shift_type: ['day', 'day', 'evening', 'night'][index],
    is_available: index !== 2,
  }));
  const { data: schedules, error: scheduleError } = await supabase
    .from('doctor_schedules')
    .insert(scheduleRows)
    .select('id,doctor_id,date,start_time,end_time,shift_type,is_available');
  if (scheduleError) throw new Error(`rich provider schedule create failed: ${scheduleError.message}`);

  return {
    doctors: doctors || [],
    schedules: schedules || [],
  };
}

async function createEmergencyViaRpc({ client, userId, hospital, service_type, paymentMethod, totalAmount, specialty }) {
  const { data, error } = await client.rpc('create_emergency_v4', {
    p_user_id: userId,
    p_request_data: {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      service_type,
      specialty: specialty || (service_type === 'ambulance' ? 'Emergency Medicine' : 'Internal Medicine'),
      ambulance_type: service_type === 'ambulance' ? 'basic' : null,
      patient_location: { lat: 6.5244, lng: 3.3792 },
      patient_snapshot: { fullName: `Patient ${TAG}` }
    },
    p_payment_data: {
      method: paymentMethod,
      total_amount: totalAmount,
      currency: 'USD'
    }
  });
  if (error) throw new Error(`create_emergency_v4 (${service_type}/${paymentMethod}) failed: ${error.message}`);
  if (!data?.success) throw new Error(`create_emergency_v4 unsuccessful: ${JSON.stringify(data)}`);
  return data;
}

async function countActiveRequests(userId, serviceType) {
  const { count, error } = await supabase
    .from('emergency_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('service_type', serviceType)
    .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived']);
  if (error) throw new Error(`active ${serviceType} request count failed: ${error.message}`);
  return count || 0;
}

async function runCanonicalAmbulanceLifecycle({
  ctx,
  requestId,
  ambulanceId,
  driverClient,
  patientClient,
  telemetrySequence
}) {
  const offeredRequest = await qOne(
    'emergency_requests',
    'id,status,payment_status,ambulance_id,responder_id,current_responder_assignment_id,assigned_doctor_id,hospital_id,total_cost',
    'id',
    requestId
  );
  assert(offeredRequest.status === 'in_progress', `request ${requestId} was not released for dispatch`);
  assert(offeredRequest.current_responder_assignment_id, `request ${requestId} has no responder offer`);
  assert(offeredRequest.ambulance_id === ambulanceId, `request ${requestId} was offered to another ambulance`);
  ctx.assignmentIds.add(offeredRequest.current_responder_assignment_id);

  const accepted = await runJsonRpc(
    driverClient,
    'responder_accept_emergency',
    { p_request_id: requestId },
    'responder acceptance'
  );
  const acceptedRequest = await qOne(
    'emergency_requests',
    'id,status,current_responder_assignment_id,responder_id',
    'id',
    requestId
  );

  const telemetry = await runJsonRpc(
    driverClient,
    'report_responder_telemetry',
    {
      p_payload: {
        ambulance_id: ambulanceId,
        request_id: requestId,
        assignment_id: offeredRequest.current_responder_assignment_id,
        sequence: telemetrySequence,
        observed_at: nowIso(),
        location: {
          lat: 6.5244 + telemetrySequence * 0.0001,
          lng: 3.3792 + telemetrySequence * 0.0001
        },
        heading: 40 + telemetrySequence,
        accuracy_meters: 6
      }
    },
    'assignment-bound responder telemetry'
  );
  const trackedRequest = await qOne(
    'emergency_requests',
    'id,status,responder_location,patient_location,responder_heading,responder_location_accuracy_meters,responder_telemetry_sequence,responder_telemetry_lease_expires_at',
    'id',
    requestId
  );
  const trackedAmbulance = await qOne(
    'ambulances',
    'id,status,current_call,location,heading,location_accuracy_meters,telemetry_sequence,telemetry_lease_expires_at',
    'id',
    ambulanceId
  );

  const arrived = await runJsonRpc(
    driverClient,
    'responder_arrive_emergency',
    { p_request_id: requestId },
    'responder arrival'
  );
  const arrivedRequest = await qOne(
    'emergency_requests',
    'id,status,patient_acknowledged_arrival_at',
    'id',
    requestId
  );

  const acknowledged = await runJsonRpc(
    patientClient,
    'patient_acknowledge_responder_arrival',
    { p_request_id: requestId },
    'patient arrival acknowledgement'
  );

  const completed = await runJsonRpc(
    driverClient,
    'responder_complete_emergency',
    { p_request_id: requestId },
    'canonical responder completion'
  );
  const completedRequest = await qOne(
    'emergency_requests',
    'id,status,total_cost,completed_at,payment_status,assigned_doctor_id,doctor_assigned_at,patient_acknowledged_arrival_at',
    'id',
    requestId
  );
  const completedAssignment = await qOne(
    'emergency_responder_assignments',
    'id,status,emergency_request_id,ambulance_id,responder_id,accepted_at,arrived_at,completed_at',
    'id',
    offeredRequest.current_responder_assignment_id
  );
  const completedAmbulance = await qOne(
    'ambulances',
    'id,status,current_call',
    'id',
    ambulanceId
  );

  return {
    offeredRequest,
    accepted,
    acceptedRequest,
    telemetry,
    trackedRequest,
    trackedAmbulance,
    arrived,
    arrivedRequest,
    acknowledged,
    completed,
    completedRequest,
    completedAssignment,
    completedAmbulance
  };
}

async function run() {
  const manifest = createDemoRunManifest({
    runId: TAG,
    suite: PREPARE_BROWSER_FIXTURE
      ? 'emergency-browser-fixture'
      : 'emergency-flow-matrix',
    projectRef: PROJECT_REF,
  });
  const manifestPath = defaultManifestPath(path.resolve(__dirname, '..', '..', '..'), TAG);
  const ctx = {
    manifest,
    manifestPath,
    orgId: null,
    hospitalId: null
  };
  ctx.userIds = createTrackedSet(ctx, 'authUserIds');
  ctx.doctorIds = createTrackedSet(ctx, 'doctorIds');
  ctx.ambulanceIds = createTrackedSet(ctx, 'ambulanceIds');
  ctx.requestIds = createTrackedSet(ctx, 'emergencyRequestIds');
  ctx.paymentIds = createTrackedSet(ctx, 'paymentIds');
  ctx.assignmentIds = createTrackedSet(ctx, 'responderAssignmentIds');
  ctx.staffingIds = createTrackedSet(ctx, 'staffingIds');
  ctx.visitIds = createTrackedSet(ctx, 'visitIds');
  ctx.patientWalletIds = createTrackedSet(ctx, 'patientWalletIds');
  ctx.organizationWalletIds = createTrackedSet(ctx, 'organizationWalletIds');
  ctx.activityIds = createTrackedSet(ctx, 'activityIds');
  ctx.adminAuditIds = createTrackedSet(ctx, 'adminAuditIds');
  persistManifest(ctx);
  const report = {
    tag: TAG,
    manifestPath,
    startedAt: nowIso(),
    foundation: {},
    scenarios: {},
    cleanupWarnings: [],
    cleanupPassed: false,
    zeroResiduePassed: false
  };
  let completedAmbulanceVisitId = null;
  let completedBedVisitId = null;
  let primaryError = null;
  let retainBrowserFixture = false;

  try {
    const foundation = await createFoundation(ctx);
    report.foundation = {
      orgId: foundation.org.id,
      hospitalId: foundation.hospital.id,
      doctorId: foundation.doctor.id,
      ambulanceId: foundation.ambulance.id,
      patientId: foundation.patient.id,
      driverId: foundation.driver.id,
      orgAdminId: foundation.orgAdmin.id,
      staffingId: foundation.staffing.staffing_id,
      initialTelemetry: foundation.initialTelemetry,
      dispatchReadiness: foundation.readiness,
      assertions: {
        verifiedOrganization: foundation.org.verification_status === 'verified' && foundation.org.is_active === true,
        dispatchEligibleHospital: foundation.hospital.dispatch_eligible === true,
        canonicalStaffingCreated: !!foundation.staffing.staffing_id,
        initialTelemetryAccepted: foundation.initialTelemetry.success === true,
        ambulanceDispatchReady: foundation.readiness.ready === true
      }
    };

    if (PREPARE_BROWSER_FIXTURE) {
      const richFleet = BROWSER_FIXTURE_PROFILE === 'fleet-rich'
        ? await createRichFleetFixture(ctx, foundation)
        : [];
      const richProviders = BROWSER_FIXTURE_PROFILE === 'provider-rich'
        ? await createRichProviderFixture(ctx, foundation)
        : { doctors: [], schedules: [] };
      let browserRequest = null;
      let browserPayment = null;
      if (BROWSER_FIXTURE_STATE === 'offered') {
        const browserCreate = await createEmergencyViaRpc({
          client: foundation.patientClient,
          userId: foundation.patient.id,
          hospital: foundation.hospital,
          service_type: 'ambulance',
          paymentMethod: 'cash',
          totalAmount: 130
        });
        ctx.requestIds.add(browserCreate.request_id);
        if (browserCreate.payment_id) ctx.paymentIds.add(browserCreate.payment_id);

        await runJsonRpc(
          foundation.orgAdminClient,
          'approve_cash_payment',
          {
            p_payment_id: browserCreate.payment_id,
            p_request_id: browserCreate.request_id
          },
          'browser fixture cash approval'
        );
        browserRequest = await qOne(
          'emergency_requests',
          'id,status,payment_status,ambulance_id,current_responder_assignment_id',
          'id',
          browserCreate.request_id
        );
        browserPayment = await qOne(
          'payments',
          'id,status,payment_method,emergency_request_id',
          'id',
          browserCreate.payment_id
        );
        assert(
          browserRequest.status === 'in_progress'
          && browserRequest.current_responder_assignment_id,
          `browser fixture did not reach offered state: ${JSON.stringify(browserRequest)}`
        );
        ctx.assignmentIds.add(browserRequest.current_responder_assignment_id);
      }

      retainBrowserFixture = true;
      report.browserHandoff = {
        runId: TAG,
        manifestPath,
        fixtureState: BROWSER_FIXTURE_STATE,
        fixtureProfile: BROWSER_FIXTURE_PROFILE,
        patientEmail: foundation.patient.email,
        driverEmail: foundation.driver.email,
        orgAdminEmail: foundation.orgAdmin.email,
        hospitalName: foundation.hospital.name,
        request: browserRequest,
        payment: browserPayment,
        fleetUnits: [
          {
            id: foundation.ambulance.id,
            call_sign: foundation.ambulance.call_sign,
            status: foundation.ambulance.status,
            type: foundation.ambulance.type,
          },
          ...richFleet,
        ],
        providerStaff: [
          {
            id: foundation.doctor.id,
            display_id: foundation.doctor.display_id,
            name: foundation.doctor.name,
            specialization: foundation.doctor.specialization,
            status: foundation.doctor.status,
          },
          ...richProviders.doctors,
        ],
        providerSchedules: richProviders.schedules,
        status: 'prepared',
        cleanupRequired: true,
      };
      console.log('[flow-matrix] Browser fixture prepared:', JSON.stringify(report.browserHandoff));
      return;
    }

    // Scenario A: card intent stays gated until backend confirmation releases dispatch.
    const cardCreate = await createEmergencyViaRpc({
      client: foundation.patientClient,
      userId: foundation.patient.id,
      hospital: foundation.hospital,
      service_type: 'ambulance',
      paymentMethod: 'card',
      totalAmount: 120
    });
    ctx.requestIds.add(cardCreate.request_id);
    if (cardCreate.payment_id) ctx.paymentIds.add(cardCreate.payment_id);

    const cardBeforeConfirmation = await qOne(
      'emergency_requests',
      'id,display_id,status,payment_status,ambulance_id,responder_id,current_responder_assignment_id,assigned_doctor_id,hospital_id,total_cost',
      'id',
      cardCreate.request_id
    );
    const cardVisit = await qOne('visits', 'id,request_id,status,type', 'request_id', cardCreate.request_id);
    ctx.visitIds.add(cardVisit.id);
    const cardPaymentBeforeConfirmation = await qOne(
      'payments',
      'id,status,payment_method,emergency_request_id,organization_id,amount',
      'id',
      cardCreate.payment_id
    );
    const ambulanceBeforeConfirmation = await qOne(
      'ambulances',
      'id,status,current_call',
      'id',
      foundation.ambulance.id
    );

    const cardPaymentIntentId = `pi_${TAG.replace(/[^a-zA-Z0-9]/g, '')}_card`;
    const { error: cardIntentPatchError } = await supabase
      .from('payments')
      .update({ stripe_payment_intent_id: cardPaymentIntentId })
      .eq('id', cardCreate.payment_id);
    if (cardIntentPatchError) {
      throw new Error(`card payment intent fixture failed: ${cardIntentPatchError.message}`);
    }

    const cardPaymentConfirmation = await runJsonRpc(
      supabase,
      'complete_card_payment',
      {
        p_payment_intent_id: cardPaymentIntentId,
        p_provider_response: { id: cardPaymentIntentId, status: 'succeeded', testTag: TAG }
      },
      'backend card payment confirmation'
    );

    const cardReq = await qOne(
      'emergency_requests',
      'id,display_id,status,payment_status,ambulance_id,responder_id,current_responder_assignment_id,assigned_doctor_id,hospital_id,total_cost',
      'id',
      cardCreate.request_id
    );
    const cardPayment = await qOne(
      'payments',
      'id,status,payment_method,emergency_request_id,organization_id,amount',
      'id',
      cardCreate.payment_id
    );
    const ambAfterCard = await qOne('ambulances', 'id,status,current_call', 'id', foundation.ambulance.id);
    const { data: cardDoctorAssignments, error: cardDoctorAssignmentsErr } = await supabase
      .from('emergency_doctor_assignments')
      .select('doctor_id,status')
      .eq('emergency_request_id', cardReq.id);
    if (cardDoctorAssignmentsErr) throw cardDoctorAssignmentsErr;

    report.scenarios.cardAmbulance = {
      createResult: cardCreate,
      beforeConfirmation: cardBeforeConfirmation,
      paymentBeforeConfirmation: cardPaymentBeforeConfirmation,
      paymentConfirmation: cardPaymentConfirmation,
      emergency: cardReq,
      visit: cardVisit,
      payment: cardPayment,
      ambulance: ambAfterCard,
      doctorAssignments: cardDoctorAssignments || [],
      assertions: {
        createAwaitedBackendConfirmation:
          cardCreate.awaits_payment_confirmation === true && cardBeforeConfirmation.status === 'pending_approval',
        paymentPendingBeforeConfirmation: cardPaymentBeforeConfirmation.status === 'pending',
        noDispatchBeforeConfirmation:
          cardBeforeConfirmation.ambulance_id === null &&
          cardBeforeConfirmation.responder_id === null &&
          cardBeforeConfirmation.current_responder_assignment_id === null &&
          ambulanceBeforeConfirmation.current_call === null,
        backendConfirmationSucceeded: cardPaymentConfirmation.success === true,
        visitCreated: !!cardVisit.id,
        paymentCompleted: cardPayment.status === 'completed',
        canonicalAmountPreserved:
          Number(cardPayment.amount) === Number(cardCreate.canonical_total) &&
          Number(cardReq.total_cost) === Number(cardCreate.canonical_total),
        emergencyHasPaymentStatus: cardReq.payment_status === 'completed',
        dispatchOffered: !!cardReq.ambulance_id && !!cardReq.current_responder_assignment_id,
        ambulanceCurrentCallLinked: ambAfterCard.current_call === cardReq.id,
        doctorAutoAssigned: !!cardReq.assigned_doctor_id,
        doctorAssignmentRowExists:
          (cardDoctorAssignments || []).some((row) => row.status === 'assigned' && row.doctor_id === cardReq.assigned_doctor_id)
      }
    };

    const cardLifecycle = await runCanonicalAmbulanceLifecycle({
      ctx,
      requestId: cardReq.id,
      ambulanceId: foundation.ambulance.id,
      driverClient: foundation.driverClient,
      patientClient: foundation.patientClient,
      telemetrySequence: 2
    });

    report.scenarios.trackingContract = {
      emergencyId: cardReq.id,
      telemetryCommand: cardLifecycle.telemetry,
      emergency: cardLifecycle.trackedRequest,
      ambulance: cardLifecycle.trackedAmbulance,
      assertions: {
        canonicalTelemetryCommandSucceeded: cardLifecycle.telemetry.success === true,
        responderLocationSet: !!cardLifecycle.trackedRequest.responder_location,
        patientLocationPreserved: !!cardLifecycle.trackedRequest.patient_location,
        responderHeadingSet: cardLifecycle.trackedRequest.responder_heading !== null,
        telemetrySequenceProjected:
          Number(cardLifecycle.trackedRequest.responder_telemetry_sequence) === 2 &&
          Number(cardLifecycle.trackedAmbulance.telemetry_sequence) === 2,
        telemetryLeaseProjected:
          !!cardLifecycle.trackedRequest.responder_telemetry_lease_expires_at &&
          !!cardLifecycle.trackedAmbulance.telemetry_lease_expires_at,
        ambulanceCurrentCallLinked: cardLifecycle.trackedAmbulance.current_call === cardReq.id
      }
    };

    // Scenario B: canonical responder completion owns visit sync and resource release.
    const visitAfterComplete = await qOne('visits', 'id,request_id,status,cost', 'request_id', cardReq.id);
    ctx.visitIds.add(visitAfterComplete.id);
    const doctorAfterComplete = await qOne('doctors', 'id,current_patients', 'id', foundation.doctor.id);
    const { data: doctorAssignmentsAfterComplete, error: doctorAssignmentsAfterCompleteErr } = await supabase
      .from('emergency_doctor_assignments')
      .select('doctor_id,status')
      .eq('emergency_request_id', cardReq.id);
    if (doctorAssignmentsAfterCompleteErr) throw doctorAssignmentsAfterCompleteErr;
    const { data: billingRows, error: billingErr } = await supabase
      .from('insurance_billing')
      .select('id,emergency_request_id,status,total_amount')
      .eq('emergency_request_id', cardReq.id);
    if (billingErr) throw billingErr;
    const activeAmbulanceRequestsAfterCard = await countActiveRequests(
      foundation.patient.id,
      'ambulance'
    );

    report.scenarios.completion = {
      failed: false,
      accept: cardLifecycle.accepted,
      telemetry: cardLifecycle.telemetry,
      arrive: cardLifecycle.arrived,
      acknowledgeArrival: cardLifecycle.acknowledged,
      complete: cardLifecycle.completed,
      emergency: cardLifecycle.completedRequest,
      assignment: cardLifecycle.completedAssignment,
      visit: visitAfterComplete,
      ambulance: cardLifecycle.completedAmbulance,
      doctor: doctorAfterComplete,
      doctorAssignments: doctorAssignmentsAfterComplete || [],
      insuranceBilling: billingRows || [],
      assertions: {
        responderAccepted: cardLifecycle.acceptedRequest.status === 'accepted',
        telemetryAccepted: cardLifecycle.telemetry.success === true,
        responderArrived: cardLifecycle.arrivedRequest.status === 'arrived',
        patientArrivalAcknowledged:
          cardLifecycle.acknowledged.success === true &&
          !!cardLifecycle.completedRequest.patient_acknowledged_arrival_at,
        canonicalCompletionSucceeded: cardLifecycle.completed.success === true,
        requestCompleted: cardLifecycle.completedRequest.status === 'completed',
        assignmentCompleted: cardLifecycle.completedAssignment.status === 'completed',
        visitCompleted: visitAfterComplete.status === 'completed',
        visitCostSynced:
          Number(visitAfterComplete.cost) === Number(cardLifecycle.completedRequest.total_cost),
        ambulanceReleased:
          cardLifecycle.completedAmbulance.status === 'available' &&
          cardLifecycle.completedAmbulance.current_call === null,
        doctorLinkCleared:
          cardLifecycle.completedRequest.assigned_doctor_id === null &&
          cardLifecycle.completedRequest.doctor_assigned_at === null,
        doctorCounterReleased: Number(doctorAfterComplete.current_patients || 0) === 0,
        assignmentRowsTerminal:
          (doctorAssignmentsAfterComplete || []).every((row) => row.status !== 'assigned'),
        noActiveAmbulanceRequestRemains: activeAmbulanceRequestsAfterCard === 0
      }
    };
    completedAmbulanceVisitId = visitAfterComplete.id;

    const firstRating = await runJsonRpc(
      foundation.patientClient,
      'rate_visit',
      {
        p_visit_id: visitAfterComplete.id,
        p_rating: 5,
        p_comment: `Flow matrix rating ${TAG}`,
      },
      'first visit rating'
    );
    const repeatedRating = await runJsonRpc(
      foundation.patientClient,
      'rate_visit',
      {
        p_visit_id: visitAfterComplete.id,
        p_rating: 1,
        p_comment: 'This replay must not overwrite the first rating.',
      },
      'repeated visit rating'
    );
    const ratedVisit = await qOne(
      'visits',
      'id,rating,rating_comment,rated_at,lifecycle_state',
      'id',
      visitAfterComplete.id
    );
    report.scenarios.rating = {
      visitId: visitAfterComplete.id,
      firstRating,
      repeatedRating,
      visit: ratedVisit,
      assertions: {
        firstWriteAccepted: firstRating.already_rated === false,
        replayConverged: repeatedRating.already_rated === true,
        originalRatingPreserved:
          Number(ratedVisit.rating) === 5
          && ratedVisit.rating_comment === `Flow matrix rating ${TAG}`,
        ratedOnce:
          !!ratedVisit.rated_at
          && ratedVisit.lifecycle_state === 'rated',
      },
    };

    // Scenario C: operator cash approval releases the same canonical responder lifecycle.
    const cashCreate = await createEmergencyViaRpc({
      client: foundation.patientClient,
      userId: foundation.patient.id,
      hospital: foundation.hospital,
      service_type: 'ambulance',
      paymentMethod: 'cash',
      totalAmount: 130
    });
    ctx.requestIds.add(cashCreate.request_id);
    if (cashCreate.payment_id) ctx.paymentIds.add(cashCreate.payment_id);

    const cashBefore = await qOne(
      'emergency_requests',
      'id,status,payment_status,ambulance_id,responder_id,current_responder_assignment_id',
      'id',
      cashCreate.request_id
    );
    const approveResult = await runJsonRpc(
      foundation.orgAdminClient,
      'approve_cash_payment',
      { p_payment_id: cashCreate.payment_id, p_request_id: cashCreate.request_id },
      'operator cash payment approval'
    );
    const cashAfter = await qOne(
      'emergency_requests',
      'id,status,payment_status,ambulance_id,responder_id,current_responder_assignment_id,total_cost',
      'id',
      cashCreate.request_id
    );
    const cashPayment = await qOne(
      'payments',
      'id,status,payment_method,emergency_request_id,organization_id,amount',
      'id',
      cashCreate.payment_id
    );
    const cashLifecycle = await runCanonicalAmbulanceLifecycle({
      ctx,
      requestId: cashCreate.request_id,
      ambulanceId: foundation.ambulance.id,
      driverClient: foundation.driverClient,
      patientClient: foundation.patientClient,
      telemetrySequence: 3
    });
    const cashVisit = await qOne(
      'visits',
      'id,request_id,status,cost',
      'request_id',
      cashCreate.request_id
    );
    ctx.visitIds.add(cashVisit.id);
    const activeAmbulanceRequestsAfterCash = await countActiveRequests(
      foundation.patient.id,
      'ambulance'
    );

    report.scenarios.cashAmbulance = {
      createResult: cashCreate,
      beforeApproval: cashBefore,
      approveResult,
      afterApproval: cashAfter,
      payment: cashPayment,
      lifecycle: cashLifecycle,
      afterCompletion: cashLifecycle.completedRequest,
      visit: cashVisit,
      assertions: {
        paymentPendingBeforeApproval:
          cashBefore.status === 'pending_approval' && cashBefore.payment_status === 'pending',
        noDispatchBeforeApproval:
          cashBefore.ambulance_id === null &&
          cashBefore.responder_id === null &&
          cashBefore.current_responder_assignment_id === null,
        approvalRpcSucceeded: approveResult.success === true,
        paymentStatusCompleted:
          cashAfter.payment_status === 'completed' && cashPayment.status === 'completed',
        canonicalAmountPreserved:
          Number(cashPayment.amount) === Number(cashCreate.canonical_total) &&
          Number(cashAfter.total_cost) === Number(cashCreate.canonical_total),
        dispatchOffered:
          !!cashAfter.ambulance_id && !!cashAfter.current_responder_assignment_id,
        responderAccepted: cashLifecycle.acceptedRequest.status === 'accepted',
        telemetryAccepted: cashLifecycle.telemetry.success === true,
        responderArrived: cashLifecycle.arrivedRequest.status === 'arrived',
        patientArrivalAcknowledged:
          cashLifecycle.acknowledged.success === true &&
          !!cashLifecycle.completedRequest.patient_acknowledged_arrival_at,
        canonicalCompletionSucceeded:
          cashLifecycle.completed.success === true &&
          cashLifecycle.completedRequest.status === 'completed' &&
          cashLifecycle.completedAssignment.status === 'completed',
        ambulanceReleased:
          cashLifecycle.completedAmbulance.status === 'available' &&
          cashLifecycle.completedAmbulance.current_call === null,
        visitCompleted: cashVisit.status === 'completed',
        noActiveAmbulanceRequestRemains: activeAmbulanceRequestsAfterCash === 0
      }
    };

    // Scenario D: bed cash approval and discharge stay with their authorized operator commands.
    const { data: hospBeforeBed, error: hbErr } = await supabase
      .from('hospitals').select('id,available_beds').eq('id', foundation.hospital.id).single();
    if (hbErr) throw new Error(`hospital pre-bed query failed: ${hbErr.message}`);

    const bedCreate = await createEmergencyViaRpc({
      client: foundation.patientClient,
      userId: foundation.patient.id,
      hospital: foundation.hospital,
      service_type: 'bed',
      paymentMethod: 'cash',
      totalAmount: 80,
      specialty: 'Internal Medicine'
    });
    ctx.requestIds.add(bedCreate.request_id);
    if (bedCreate.payment_id) ctx.paymentIds.add(bedCreate.payment_id);

    const bedBeforeApprove = await qOne(
      'emergency_requests',
      'id,status,payment_status,ambulance_id,responder_id,current_responder_assignment_id,total_cost',
      'id',
      bedCreate.request_id
    );
    const bedApprove = await runJsonRpc(
      foundation.orgAdminClient,
      'approve_cash_payment',
      { p_payment_id: bedCreate.payment_id, p_request_id: bedCreate.request_id },
      'operator bed cash approval'
    );
    const bedAfterApprove = await qOne(
      'emergency_requests',
      'id,status,payment_status,ambulance_id,responder_id,current_responder_assignment_id,total_cost',
      'id',
      bedCreate.request_id
    );
    const bedPayment = await qOne(
      'payments',
      'id,status,payment_method,emergency_request_id,organization_id,amount',
      'id',
      bedCreate.payment_id
    );

    const { data: hospAfterApprove, error: hospAfterApproveError } = await supabase
      .from('hospitals').select('id,available_beds').eq('id', foundation.hospital.id).single();
    if (hospAfterApproveError) throw hospAfterApproveError;

    const { data: bedCompleteRpc, error: bedCompleteErr } = await foundation.orgAdminClient.rpc(
      'discharge_patient',
      { request_uuid: bedCreate.request_id }
    );
    if (bedCompleteErr) throw new Error(`operator bed discharge failed: ${bedCompleteErr.message}`);
    assert(bedCompleteRpc === true, 'operator bed discharge returned false');
    const bedComplete = await qOne(
      'emergency_requests',
      'id,status,payment_status,total_cost,ambulance_id,responder_id,current_responder_assignment_id',
      'id',
      bedCreate.request_id
    );

    const { data: hospAfterBedComplete, error: hospAfterCompleteError } = await supabase
      .from('hospitals').select('id,available_beds').eq('id', foundation.hospital.id).single();
    if (hospAfterCompleteError) throw hospAfterCompleteError;

    const bedVisit = await qOne(
      'visits',
      'id,request_id,status,type,cost',
      'request_id',
      bedCreate.request_id
    );
    ctx.visitIds.add(bedVisit.id);
    completedBedVisitId = bedVisit.id;
    const activeBedRequestsAfterCompletion = await countActiveRequests(foundation.patient.id, 'bed');

    report.scenarios.bedReservation = {
      hospitalBefore: hospBeforeBed,
      beforeApproval: bedBeforeApprove,
      approve: bedApprove,
      afterApproval: bedAfterApprove,
      payment: bedPayment,
      hospitalAfterApproval: hospAfterApprove,
      complete: bedComplete,
      hospitalAfterComplete: hospAfterBedComplete,
      visit: bedVisit,
      assertions: {
        paymentPendingBeforeApproval:
          bedBeforeApprove.status === 'pending_approval' && bedBeforeApprove.payment_status === 'pending',
        approveSucceeded: bedApprove.success === true,
        noAmbulanceExpected:
          bedAfterApprove.ambulance_id === null &&
          bedAfterApprove.responder_id === null &&
          bedAfterApprove.current_responder_assignment_id === null,
        bedRequestActivated: ['accepted', 'arrived', 'in_progress'].includes(bedAfterApprove.status),
        paymentStatusCompleted:
          bedAfterApprove.payment_status === 'completed' && bedPayment.status === 'completed',
        canonicalAmountPreserved:
          Number(bedPayment.amount) === Number(bedCreate.canonical_total) &&
          Number(bedComplete.total_cost) === Number(bedCreate.canonical_total),
        bedDecrementedOnActivation:
          Number(hospAfterApprove.available_beds) === Number(hospBeforeBed.available_beds) - 1,
        canonicalDischargeCompleted: bedCompleteRpc === true && bedComplete.status === 'completed',
        bedRestoredOnComplete:
          Number(hospAfterBedComplete.available_beds) === Number(hospBeforeBed.available_beds),
        visitCreated: !!bedVisit.id,
        visitCompleted: bedVisit.status === 'completed',
        visitCostSynced: Number(bedVisit.cost) === Number(bedComplete.total_cost),
        noActiveBedRequestRemains: activeBedRequestsAfterCompletion === 0
      }
    };

    // Scenario E: Runtime tip contract check (wallet + cash tip RPC path).
    const TIP_AMOUNT_WALLET = 5;
    const TIP_AMOUNT_CASH = 3;
    let walletTipErrorMessage = null;
    let cashTipErrorMessage = null;
    let walletTipData = null;
    let cashTipData = null;
    let walletTipPayment = null;
    let cashTipPayment = null;
    let walletVisitAfterTip = null;
    let cashVisitAfterTip = null;

    if (completedAmbulanceVisitId && completedBedVisitId) {
      const { data: patientWallet, error: patientWalletErr } = await supabase
        .from('patient_wallets')
        .select('id, balance')
        .eq('user_id', foundation.patient.id)
        .maybeSingle();
      if (patientWalletErr) {
        throw new Error(`patient wallet lookup failed for tip scenario: ${patientWalletErr.message}`);
      }

      const desiredWalletBalance = 50;
      if (patientWallet?.id) {
        ctx.patientWalletIds.add(patientWallet.id);
        const { error: walletUpdateError } = await supabase
          .from('patient_wallets')
          .update({ balance: desiredWalletBalance, updated_at: nowIso() })
          .eq('id', patientWallet.id);
        if (walletUpdateError) {
          throw new Error(`patient wallet funding failed for tip scenario: ${walletUpdateError.message}`);
        }
      } else {
        const { data: insertedWallet, error: walletInsertErr } = await supabase
          .from('patient_wallets')
          .insert({
            user_id: foundation.patient.id,
            balance: desiredWalletBalance,
            currency: 'USD',
          })
          .select('id')
          .single();
        if (walletInsertErr) {
          throw new Error(`patient wallet insert failed for tip scenario: ${walletInsertErr.message}`);
        }
        ctx.patientWalletIds.add(insertedWallet.id);
      }

      const patientClient = foundation.patientClient;

      const { data: walletTipRpcData, error: walletTipErr } = await patientClient.rpc('process_visit_tip', {
        p_visit_id: completedAmbulanceVisitId,
        p_tip_amount: TIP_AMOUNT_WALLET,
        p_currency: 'USD'
      });
      walletTipData = walletTipRpcData || null;
      walletTipErrorMessage = walletTipErr?.message || null;
      if (walletTipData?.payment_id) ctx.paymentIds.add(walletTipData.payment_id);

      const { data: cashTipRpcData, error: cashTipErr } = await patientClient.rpc('record_visit_cash_tip', {
        p_visit_id: completedBedVisitId,
        p_tip_amount: TIP_AMOUNT_CASH,
        p_currency: 'USD'
      });
      cashTipData = cashTipRpcData || null;
      cashTipErrorMessage = cashTipErr?.message || null;
      if (cashTipData?.payment_id) ctx.paymentIds.add(cashTipData.payment_id);

      if (walletTipData?.payment_id) {
        walletTipPayment = await qOne(
          'payments',
          'id,organization_id,payment_method,status,amount,metadata',
          'id',
          walletTipData.payment_id
        );
      }
      if (cashTipData?.payment_id) {
        cashTipPayment = await qOne(
          'payments',
          'id,organization_id,payment_method,status,amount,metadata',
          'id',
          cashTipData.payment_id
        );
      }

      walletVisitAfterTip = await qOne(
        'visits',
        'id,tip_amount,tip_currency,tip_payment_id',
        'id',
        completedAmbulanceVisitId
      );
      cashVisitAfterTip = await qOne(
        'visits',
        'id,tip_amount,tip_currency,tip_payment_id',
        'id',
        completedBedVisitId
      );
    }

    report.scenarios.tipFlow = {
      walletTip: walletTipData,
      walletTipError: walletTipErrorMessage,
      cashTip: cashTipData,
      cashTipError: cashTipErrorMessage,
      walletTipPayment,
      cashTipPayment,
      walletVisitAfterTip,
      cashVisitAfterTip,
      assertions: {
        scenarioPreconditionsMet: !!completedAmbulanceVisitId && !!completedBedVisitId,
        walletTipSucceeded: walletTipData?.success === true,
        cashTipSucceeded: cashTipData?.success === true,
        noLegacyOrgColumnError:
          !/column\s+\"organization_id\"\s+does\s+not\s+exist/i.test(walletTipErrorMessage || '') &&
          !/column\s+\"organization_id\"\s+does\s+not\s+exist/i.test(cashTipErrorMessage || ''),
        walletTipVisitSynced:
          Number(walletVisitAfterTip?.tip_amount || 0) === TIP_AMOUNT_WALLET &&
          walletVisitAfterTip?.tip_currency === 'USD' &&
          !!walletVisitAfterTip?.tip_payment_id,
        cashTipVisitSynced:
          Number(cashVisitAfterTip?.tip_amount || 0) === TIP_AMOUNT_CASH &&
          cashVisitAfterTip?.tip_currency === 'USD' &&
          !!cashVisitAfterTip?.tip_payment_id,
        walletTipPaymentResolvedOrg:
          !!walletTipPayment?.organization_id &&
          walletTipPayment?.payment_method === 'wallet' &&
          walletTipPayment?.status === 'completed',
        cashTipPaymentResolvedOrg:
          !!cashTipPayment?.organization_id &&
          cashTipPayment?.payment_method === 'cash' &&
          cashTipPayment?.status === 'completed'
      }
    };

    const transitionRequestIds = [cardReq.id, cashCreate.request_id, bedCreate.request_id];
    const { data: transitionRows, error: transitionErr } = await supabase
      .from('emergency_status_transitions')
      .select('emergency_request_id,from_status,to_status,source,reason,actor_role,request_snapshot,occurred_at')
      .in('emergency_request_id', transitionRequestIds)
      .order('occurred_at', { ascending: true });

    const transitions = transitionErr ? [] : (transitionRows || []);
    const hasNonDecreasingTimestamps = transitions.every((row, index, arr) => {
      if (index === 0) return true;
      return new Date(arr[index - 1].occurred_at).getTime() <= new Date(row.occurred_at).getTime();
    });

    report.scenarios.transitionAudit = {
      requests: transitionRequestIds,
      error: transitionErr ? transitionErr.message : null,
      rows: transitions,
      assertions: {
        rowsCaptured: !transitionErr && transitions.length >= transitionRequestIds.length,
        eachRequestHasInitialRow: transitionRequestIds.every((id) => transitions.some((row) => row.emergency_request_id === id && row.from_status === null)),
        completionRowsCaptured:
          transitions.some((row) => row.emergency_request_id === cardReq.id && row.to_status === 'completed')
          && transitions.some((row) => row.emergency_request_id === cashCreate.request_id && row.to_status === 'completed')
          && transitions.some((row) => row.emergency_request_id === bedCreate.request_id && row.to_status === 'completed'),
        sourcesPresent: transitions.every((row) => !!row.source),
        reasonsPresent: transitions.every((row) => !!row.reason),
        snapshotsPresent: transitions.every((row) => !!row.request_snapshot && !!row.request_snapshot.id),
        chronological: hasNonDecreasingTimestamps
      }
    };

    for (const [scenarioName, scenario] of Object.entries(report.scenarios)) {
      const assertions = Object.entries(scenario.assertions || {});
      assert(assertions.length > 0, `${scenarioName} has no assertions`);
      const failedAssertions = assertions.filter(([, passed]) => passed !== true).map(([name]) => name);
      assert(
        failedAssertions.length === 0,
        `${scenarioName} assertions failed: ${failedAssertions.join(', ')}`
      );
    }
  } catch (error) {
    primaryError = error;
    report.error = error.message;
  } finally {
    if (!retainBrowserFixture) {
      try {
        report.cleanupPasses = [];
        await collectGeneratedFixtureIds(ctx);
        const firstCleanup = await runManifestCleanupPass(ctx, 1);
        if (!primaryError) {
          assert(
            Object.values(firstCleanup.planned).some((count) => count > 0),
            'first manifest cleanup did not capture the live fixture graph'
          );
        }
        report.cleanupPasses.push(firstCleanup);
        markCleanupAttempt(manifest);
        persistManifest(ctx);

        const secondCleanup = await runManifestCleanupPass(ctx, 2);
        assert(
          Object.values(secondCleanup.planned).every((count) => count === 0),
          `second manifest cleanup was not a no-op: ${JSON.stringify(secondCleanup.planned)}`
        );
        report.cleanupPasses.push(secondCleanup);
        markCleanupAttempt(manifest);
        persistManifest(ctx);
        report.cleanupWarnings = [];
        report.cleanupPassed = true;
        report.zeroResiduePassed = true;
      } catch (cleanupError) {
        await cleanup(ctx, report);
        markCleanupAttempt(manifest, cleanupError);
        persistManifest(ctx);
        primaryError = primaryError
          ? new Error(`${primaryError.message}; ${cleanupError.message}`)
          : cleanupError;
        report.error = primaryError.message;
      }
    }
    report.completedAt = nowIso();
    report.passed = retainBrowserFixture
      ? primaryError === null && report.browserHandoff?.status === 'prepared'
      : primaryError === null && report.cleanupPassed && report.zeroResiduePassed;
    const outDir = path.join(__dirname, '..', 'validation');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(
      outDir,
      retainBrowserFixture
        ? 'browser_emergency_fixture_report.json'
        : 'e2e_flow_matrix_report.json'
    );
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log('[flow-matrix] Report written:', outFile);
  }

  if (primaryError) throw primaryError;
  if (!retainBrowserFixture && (!report.cleanupPassed || !report.zeroResiduePassed)) {
    throw new Error(`cleanup failed: ${report.cleanupWarnings.join('; ')}`);
  }
}

run().catch((error) => {
  console.error('[flow-matrix] FAIL:', error.message);
  process.exit(1);
});
