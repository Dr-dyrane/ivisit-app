#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const {
  assertProtectedFacilityUnchanged,
  loadManifest,
  markCleanupAttempt,
  saveManifest,
} = require('./demo_run_manifest');

const appRoot = path.resolve(__dirname, '..', '..', '..');

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function argumentValue(name, argv = process.argv.slice(2)) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function uuidSqlList(values) {
  const ids = unique(values);
  for (const id of ids) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      throw new Error(`Refusing cleanup SQL for invalid UUID: ${id}`);
    }
  }
  return ids.map((id) => `'${id}'::uuid`).join(', ');
}

async function executeSql(admin, sql, label) {
  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) throw new Error(`${label} failed: ${error.message}`);
  if (!data?.success) throw new Error(`${label} rejected: ${data?.error || 'unknown error'}`);
}

async function deleteEmergencyRequestGraphs(admin, requestIds) {
  const ids = uuidSqlList(requestIds);
  if (!ids) return;
  await executeSql(
    admin,
    `
DO $cleanup$
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
$cleanup$;
    `,
    'Emergency request graph cleanup'
  );
}

async function removeWalletLedgerEffects(admin, paymentIds) {
  const ids = uuidSqlList(paymentIds);
  if (!ids) return;
  await executeSql(
    admin,
    `
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
    `,
    'Wallet ledger cleanup'
  );
}

async function selectByIds(admin, table, columns, ids, idColumn = 'id') {
  if (!ids.length) return [];
  const { data, error } = await admin
    .from(table)
    .select(columns)
    .in(idColumn, ids);
  if (error) throw new Error(`${table} lookup failed: ${error.message}`);
  return data || [];
}

async function selectByForeignIds(admin, table, columns, values, column) {
  if (!values.length) return [];
  const { data, error } = await admin
    .from(table)
    .select(columns)
    .in(column, values);
  if (error) throw new Error(`${table}.${column} lookup failed: ${error.message}`);
  return data || [];
}

async function findStoragePaths(admin, paths) {
  const found = [];
  for (const storagePath of unique(paths)) {
    const slash = storagePath.lastIndexOf('/');
    if (slash <= 0) throw new Error(`Unsafe Storage path in manifest: ${storagePath}`);
    const folder = storagePath.slice(0, slash);
    const filename = storagePath.slice(slash + 1);
    const { data, error } = await admin.storage
      .from('documents')
      .list(folder, { search: filename });
    if (error) throw new Error(`Storage lookup failed for ${storagePath}: ${error.message}`);
    if ((data || []).some((item) => item.name === filename)) found.push(storagePath);
  }
  return found;
}

async function assertProtectedFacilities(admin, manifest) {
  for (const snapshot of manifest.protectedFacilities) {
    const { data, error } = await admin
      .from('hospitals')
      .select(
        'id,organization_id,verified,verification_status,dispatch_eligible,status,provider_source,place_id'
      )
      .eq('id', snapshot.id)
      .single();
    if (error) {
      throw new Error(`Protected facility ${snapshot.id} lookup failed: ${error.message}`);
    }
    assertProtectedFacilityUnchanged(snapshot, data);
  }
}

async function buildCleanupPlan(admin, manifest) {
  await assertProtectedFacilities(admin, manifest);

  const authUserIds = manifest.resources.authUserIds;
  const discoveredOrganizations = await selectByForeignIds(
    admin,
    'organizations',
    'id',
    authUserIds,
    'created_by'
  );
  const organizationIds = unique([
    ...manifest.resources.organizationIds,
    ...discoveredOrganizations.map((row) => row.id),
  ]);
  const createdFacilityIds = manifest.resources.createdFacilityIds;
  const emergencyRequestIds = manifest.resources.emergencyRequestIds;
  const runLabel = manifest.runId.slice(-8);
  const disposableFacilityNames = new Set([
    `[DEMO ${runLabel}] Console Contract Hospital`,
    `[DEMO ${runLabel}] Console Claim Facility`,
  ]);

  const [
    exactEvidence,
    userEvidence,
    organizationEvidence,
    exactClaims,
    organizationClaims,
    exactFacilities,
    organizationFacilities,
    exactWallets,
    organizationWallets,
    organizations,
    profiles,
  ] = await Promise.all([
    selectByIds(
      admin,
      'organization_verification_documents',
      'id,storage_path',
      manifest.resources.evidenceIds
    ),
    selectByForeignIds(
      admin,
      'organization_verification_documents',
      'id,storage_path',
      authUserIds,
      'uploaded_by'
    ),
    selectByForeignIds(
      admin,
      'organization_verification_documents',
      'id,storage_path',
      organizationIds,
      'organization_id'
    ),
    selectByIds(
      admin,
      'organization_facility_claims',
      'id,facility_id',
      manifest.resources.claimIds
    ),
    selectByForeignIds(
      admin,
      'organization_facility_claims',
      'id,facility_id',
      organizationIds,
      'organization_id'
    ),
    selectByIds(admin, 'hospitals', 'id,name', createdFacilityIds),
    selectByForeignIds(
      admin,
      'hospitals',
      'id,name',
      organizationIds,
      'organization_id'
    ),
    selectByForeignIds(
      admin,
      'organization_wallets',
      'id',
      manifest.resources.organizationWalletIds,
      'id'
    ),
    selectByForeignIds(
      admin,
      'organization_wallets',
      'id',
      organizationIds,
      'organization_id'
    ),
    selectByIds(admin, 'organizations', 'id', organizationIds),
    selectByIds(admin, 'profiles', 'id', authUserIds),
  ]);

  const evidenceRows = [...exactEvidence, ...userEvidence, ...organizationEvidence];
  const claimRows = [...exactClaims, ...organizationClaims];
  const wallets = [...exactWallets, ...organizationWallets];
  const facilities = [
    ...exactFacilities,
    ...organizationFacilities.filter((row) => disposableFacilityNames.has(row.name)),
  ];
  const entityIds = unique([
    ...authUserIds,
    ...organizationIds,
    ...facilities.map((row) => row.id),
    ...manifest.resources.doctorIds,
    ...manifest.resources.ambulanceIds,
    ...emergencyRequestIds,
    ...manifest.resources.responderAssignmentIds,
    ...manifest.resources.paymentIds,
    ...manifest.resources.visitIds,
    ...manifest.resources.staffingIds,
    ...manifest.resources.patientWalletIds,
    ...manifest.resources.organizationWalletIds,
  ]);
  const [
    requests,
    exactAssignments,
    requestAssignments,
    exactPayments,
    requestPayments,
    exactVisits,
    requestVisits,
    doctorAssignments,
    insuranceBilling,
    statusTransitions,
    exactDoctors,
    exactAmbulances,
    exactStaffing,
    ambulanceStaffing,
    responderStaffing,
    exactPatientWallets,
    userPatientWallets,
    exactActivity,
    userActivity,
    exactAudit,
    userAudit,
    userNotifications,
    targetNotifications,
    idMappings,
  ] = await Promise.all([
    selectByIds(admin, 'emergency_requests', 'id', emergencyRequestIds),
    selectByIds(
      admin,
      'emergency_responder_assignments',
      'id',
      manifest.resources.responderAssignmentIds
    ),
    selectByForeignIds(
      admin,
      'emergency_responder_assignments',
      'id',
      emergencyRequestIds,
      'emergency_request_id'
    ),
    selectByIds(admin, 'payments', 'id', manifest.resources.paymentIds),
    selectByForeignIds(
      admin,
      'payments',
      'id',
      emergencyRequestIds,
      'emergency_request_id'
    ),
    selectByIds(admin, 'visits', 'id', manifest.resources.visitIds),
    selectByForeignIds(admin, 'visits', 'id', emergencyRequestIds, 'request_id'),
    selectByForeignIds(
      admin,
      'emergency_doctor_assignments',
      'id',
      emergencyRequestIds,
      'emergency_request_id'
    ),
    selectByForeignIds(
      admin,
      'insurance_billing',
      'id',
      emergencyRequestIds,
      'emergency_request_id'
    ),
    selectByForeignIds(
      admin,
      'emergency_status_transitions',
      'id',
      emergencyRequestIds,
      'emergency_request_id'
    ),
    selectByIds(admin, 'doctors', 'id', manifest.resources.doctorIds),
    selectByIds(admin, 'ambulances', 'id', manifest.resources.ambulanceIds),
    selectByIds(
      admin,
      'ambulance_staff_assignments',
      'id',
      manifest.resources.staffingIds
    ),
    selectByForeignIds(
      admin,
      'ambulance_staff_assignments',
      'id',
      manifest.resources.ambulanceIds,
      'ambulance_id'
    ),
    selectByForeignIds(
      admin,
      'ambulance_staff_assignments',
      'id',
      authUserIds,
      'responder_id'
    ),
    selectByIds(
      admin,
      'patient_wallets',
      'id',
      manifest.resources.patientWalletIds
    ),
    selectByForeignIds(admin, 'patient_wallets', 'id', authUserIds, 'user_id'),
    selectByIds(admin, 'user_activity', 'id', manifest.resources.activityIds),
    selectByForeignIds(admin, 'user_activity', 'id', authUserIds, 'user_id'),
    selectByIds(admin, 'admin_audit_log', 'id', manifest.resources.adminAuditIds),
    selectByForeignIds(admin, 'admin_audit_log', 'id', authUserIds, 'admin_id'),
    selectByForeignIds(admin, 'notifications', 'id', authUserIds, 'user_id'),
    selectByForeignIds(admin, 'notifications', 'id', entityIds, 'target_id'),
    selectByForeignIds(admin, 'id_mappings', 'id', entityIds, 'entity_id'),
  ]);
  const assignments = [...exactAssignments, ...requestAssignments];
  const paymentRows = [...exactPayments, ...requestPayments];
  const visitRows = [...exactVisits, ...requestVisits];
  const staffing = [...exactStaffing, ...ambulanceStaffing, ...responderStaffing];
  const patientWallets = [...exactPatientWallets, ...userPatientWallets];
  const activity = [...exactActivity, ...userActivity];
  const audit = [...exactAudit, ...userAudit];
  const notifications = [...userNotifications, ...targetNotifications];
  const storagePaths = await findStoragePaths(admin, [
    ...manifest.resources.storagePaths,
    ...evidenceRows.map((row) => row.storage_path),
  ]);

  const authUsers = [];
  for (const userId of authUserIds) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error && !/not found/i.test(error.message)) {
      throw new Error(`Auth lookup failed for ${userId}: ${error.message}`);
    }
    if (data?.user) authUsers.push(userId);
  }

  return {
    runId: manifest.runId,
    projectRef: manifest.projectRef,
    storagePaths,
    evidenceIds: unique(evidenceRows.map((row) => row.id)),
    claimIds: unique(claimRows.map((row) => row.id)),
    notificationIds: unique(notifications.map((row) => row.id)),
    activityIds: unique(activity.map((row) => row.id)),
    adminAuditIds: unique(audit.map((row) => row.id)),
    insuranceBillingIds: unique(insuranceBilling.map((row) => row.id)),
    doctorAssignmentIds: unique(doctorAssignments.map((row) => row.id)),
    visitIds: unique(visitRows.map((row) => row.id)),
    paymentIds: unique(paymentRows.map((row) => row.id)),
    walletLedgerReferenceIds: unique(paymentRows.map((row) => row.id)),
    responderAssignmentIds: unique(assignments.map((row) => row.id)),
    statusTransitionIds: unique(statusTransitions.map((row) => row.id)),
    emergencyRequestIds: unique(requests.map((row) => row.id)),
    patientWalletIds: unique(patientWallets.map((row) => row.id)),
    staffingIds: unique(staffing.map((row) => row.id)),
    ambulanceIds: unique(exactAmbulances.map((row) => row.id)),
    doctorIds: unique(exactDoctors.map((row) => row.id)),
    createdFacilityIds: unique(facilities.map((row) => row.id)),
    walletIds: unique(wallets.map((row) => row.id)),
    organizationIds: unique(organizations.map((row) => row.id)),
    idMappingIds: unique(idMappings.map((row) => row.id)),
    profileIds: unique(profiles.map((row) => row.id)),
    authUserIds: authUsers,
  };
}

function countPlan(plan) {
  return Object.fromEntries(
    Object.entries(plan)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, value.length])
  );
}

async function deleteByIds(admin, table, ids) {
  if (!ids.length) return;
  const { error } = await admin.from(table).delete().in('id', ids);
  if (error) throw new Error(`${table} cleanup failed: ${error.message}`);
}

async function applyCleanupPlan(admin, plan) {
  if (plan.storagePaths.length) {
    const { error } = await admin.storage.from('documents').remove(plan.storagePaths);
    if (error) throw new Error(`Storage cleanup failed: ${error.message}`);
  }

  await deleteByIds(admin, 'notifications', plan.notificationIds);
  await deleteByIds(admin, 'user_activity', plan.activityIds);
  await deleteByIds(admin, 'admin_audit_log', plan.adminAuditIds);
  await deleteByIds(admin, 'insurance_billing', plan.insuranceBillingIds);
  await deleteByIds(
    admin,
    'emergency_doctor_assignments',
    plan.doctorAssignmentIds
  );
  await deleteByIds(admin, 'visits', plan.visitIds);
  await removeWalletLedgerEffects(admin, plan.walletLedgerReferenceIds);
  await deleteEmergencyRequestGraphs(admin, plan.emergencyRequestIds);
  await deleteByIds(admin, 'payments', plan.paymentIds);
  await deleteByIds(admin, 'patient_wallets', plan.patientWalletIds);
  await deleteByIds(admin, 'ambulance_staff_assignments', plan.staffingIds);
  await deleteByIds(admin, 'ambulances', plan.ambulanceIds);
  await deleteByIds(admin, 'doctors', plan.doctorIds);
  await deleteByIds(admin, 'organization_verification_documents', plan.evidenceIds);
  await deleteByIds(admin, 'organization_facility_claims', plan.claimIds);
  await deleteByIds(admin, 'hospitals', plan.createdFacilityIds);
  await deleteByIds(admin, 'organization_wallets', plan.walletIds);

  if (plan.profileIds.length) {
    const { error } = await admin
      .from('profiles')
      .update({
        organization_id: null,
        role: 'patient',
        onboarding_status: 'pending',
      })
      .in('id', plan.profileIds);
    if (error) throw new Error(`Profile scope cleanup failed: ${error.message}`);
  }

  await deleteByIds(admin, 'organizations', plan.organizationIds);
  await deleteByIds(admin, 'id_mappings', plan.idMappingIds);

  for (const userId of plan.authUserIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) {
      throw new Error(`Auth cleanup failed for ${userId}: ${error.message}`);
    }
  }
}

async function main(argv = process.argv.slice(2)) {
  const manifestArgument = argumentValue('manifest', argv);
  const expectedProjectRef = argumentValue('project-ref', argv);
  const apply = argv.includes('--apply');
  if (!manifestArgument) {
    throw new Error('Pass --manifest=<path> for one exact demo run');
  }

  dotenv.config({ path: path.join(appRoot, '.env.local') });
  dotenv.config({ path: path.join(appRoot, '.env') });
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role environment');
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const manifestPath = path.resolve(manifestArgument);
  const manifest = loadManifest(manifestPath);
  if (
    !expectedProjectRef
    || expectedProjectRef !== projectRef
    || manifest.projectRef !== projectRef
  ) {
    throw new Error(
      `Refusing cleanup. Pass --project-ref=${projectRef} and use a manifest captured for that project`
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const plan = await buildCleanupPlan(admin, manifest);
  console.log(
    JSON.stringify(
      {
        apply,
        manifest: manifestPath,
        runId: manifest.runId,
        projectRef,
        protectedFacilityIds: manifest.protectedFacilities.map((row) => row.id),
        counts: countPlan(plan),
      },
      null,
      2
    )
  );

  if (!apply) return;

  try {
    await applyCleanupPlan(admin, plan);
    const residue = await buildCleanupPlan(admin, manifest);
    const residueCounts = countPlan(residue);
    if (Object.values(residueCounts).some((count) => count !== 0)) {
      throw new Error(`Cleanup residue remains: ${JSON.stringify(residueCounts)}`);
    }
    markCleanupAttempt(manifest);
    saveManifest(manifest, manifestPath);
    console.log('[cleanup-demo-run] Exact-run cleanup complete with zero residue.');
  } catch (error) {
    markCleanupAttempt(manifest, error);
    saveManifest(manifest, manifestPath);
    throw error;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[cleanup-demo-run] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  applyCleanupPlan,
  assertProtectedFacilities,
  buildCleanupPlan,
  countPlan,
  main,
};
