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

function chunks(values, size = 100) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
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

async function removeWalletLedgerEffects(admin, walletLedgerIds) {
  const ids = uuidSqlList(walletLedgerIds);
  if (!ids) return;
  await executeSql(
    admin,
    `
DO $cleanup$
BEGIN
  IF EXISTS (
    WITH fixture_wallets AS (
      SELECT DISTINCT ledger.wallet_id
      FROM public.wallet_ledger ledger
      WHERE ledger.id IN (${ids})
    ), wallet_ownership AS (
      SELECT wallet.id AS wallet_id
      FROM public.organization_wallets wallet
      INNER JOIN fixture_wallets fixture ON fixture.wallet_id = wallet.id
      UNION ALL
      SELECT wallet.id AS wallet_id
      FROM public.patient_wallets wallet
      INNER JOIN fixture_wallets fixture ON fixture.wallet_id = wallet.id
      UNION ALL
      SELECT wallet.id AS wallet_id
      FROM public.ivisit_main_wallet wallet
      INNER JOIN fixture_wallets fixture ON fixture.wallet_id = wallet.id
    )
    SELECT 1
    FROM fixture_wallets fixture
    LEFT JOIN (
      SELECT wallet_id, COUNT(*) AS owner_count
      FROM wallet_ownership
      GROUP BY wallet_id
    ) owner ON owner.wallet_id = fixture.wallet_id
    WHERE COALESCE(owner.owner_count, 0) > 1
  ) THEN
    RAISE EXCEPTION 'Refusing to reverse ledger effects for an ambiguous wallet';
  END IF;
END;
$cleanup$;

WITH fixture_wallet_effects AS (
  SELECT ledger.wallet_id, SUM(ledger.amount) AS amount
  FROM public.wallet_ledger ledger
  WHERE ledger.id IN (${ids})
  GROUP BY ledger.wallet_id
), reversed_organization_wallets AS (
  UPDATE public.organization_wallets wallet
  SET balance = COALESCE(wallet.balance, 0) - fixture.amount,
      updated_at = NOW()
  FROM fixture_wallet_effects fixture
  WHERE wallet.id = fixture.wallet_id
  RETURNING wallet.id
), reversed_patient_wallets AS (
  UPDATE public.patient_wallets wallet
  SET balance = COALESCE(wallet.balance, 0) - fixture.amount,
      updated_at = NOW()
  FROM fixture_wallet_effects fixture
  WHERE wallet.id = fixture.wallet_id
  RETURNING wallet.id
), reversed_platform_wallets AS (
  UPDATE public.ivisit_main_wallet wallet
  SET balance = COALESCE(wallet.balance, 0) - fixture.amount,
      last_updated = NOW()
  FROM fixture_wallet_effects fixture
  WHERE wallet.id = fixture.wallet_id
  RETURNING wallet.id
)
DELETE FROM public.wallet_ledger
WHERE id IN (${ids});
    `,
    'Wallet ledger cleanup'
  );
}

async function selectByIds(admin, table, columns, ids, idColumn = 'id') {
  if (!ids.length) return [];
  const rows = [];
  for (const idChunk of chunks(unique(ids))) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .in(idColumn, idChunk);
    if (error) throw new Error(`${table} lookup failed: ${error.message}`);
    rows.push(...(data || []));
  }
  return rows;
}

async function selectByForeignIds(admin, table, columns, values, column) {
  if (!values.length) return [];
  const rows = [];
  for (const valueChunk of chunks(unique(values))) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .in(column, valueChunk);
    if (error) {
      throw new Error(`${table}.${column} lookup failed: ${error.message}`);
    }
    rows.push(...(data || []));
  }
  return rows;
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

async function deleteAuthUsers(admin, userIds) {
  for (const userIdChunk of chunks(unique(userIds), 25)) {
    const ids = uuidSqlList(userIdChunk);
    await executeSql(
      admin,
      `
DELETE FROM auth.users
WHERE id IN (${ids});

DO $cleanup$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN (${ids})) THEN
    RAISE EXCEPTION 'Captured demo Auth identities remain';
  END IF;
END;
$cleanup$;
      `,
      'Captured demo Auth cleanup'
    );
  }
}

async function deleteUserActivityByUsers(admin, userIds) {
  const ids = uuidSqlList(userIds);
  if (!ids) return;
  await executeSql(
    admin,
    `
SET LOCAL statement_timeout = '120s';
DELETE FROM public.user_activity
WHERE user_id IN (${ids});

DO $cleanup$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_activity
    WHERE user_id IN (${ids})
  ) THEN
    RAISE EXCEPTION 'Captured demo user activity remains';
  END IF;
END;
$cleanup$;
    `,
    'Demo user activity cleanup'
  );
}

async function assertAuthUsersAbsent(admin, userIds) {
  for (const userIdChunk of chunks(unique(userIds), 25)) {
    const ids = uuidSqlList(userIdChunk);
    await executeSql(
      admin,
      `
DO $cleanup$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN (${ids})) THEN
    RAISE EXCEPTION 'Captured demo Auth identities remain';
  END IF;
END;
$cleanup$;
      `,
      'Captured demo Auth residue assertion'
    );
  }
}

async function assertProtectedFacilities(admin, manifest) {
  const snapshots = manifest.protectedFacilities || [];
  const demoOrganizationIds = new Set(manifest.resources.organizationIds || []);
  const chunkSize = 200;
  for (let index = 0; index < snapshots.length; index += chunkSize) {
    const chunk = snapshots.slice(index, index + chunkSize);
    const { data, error } = await admin
      .from('hospitals')
      .select(
        'id,organization_id,verified,verification_status,dispatch_eligible,status,provider_source,place_id'
      )
      .in('id', chunk.map((snapshot) => snapshot.id));
    if (error) {
      throw new Error(`Protected facility lookup failed: ${error.message}`);
    }
    const rowsById = new Map((data || []).map((row) => [row.id, row]));
    for (const snapshot of chunk) {
      const row = rowsById.get(snapshot.id);
      if (!row) {
        throw new Error(`Protected facility ${snapshot.id} is missing`);
      }
      const expectedSnapshot = demoOrganizationIds.has(snapshot.organization_id)
        ? { ...snapshot, organization_id: null }
        : snapshot;
      assertProtectedFacilityUnchanged(expectedSnapshot, row);
    }
  }
}

async function buildCleanupPlan(admin, manifest, options = {}) {
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
    facilityAdminLinks,
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
    selectByForeignIds(admin, 'hospitals', 'id', authUserIds, 'org_admin_id'),
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
    visitChatRooms,
    requestChatRooms,
    exactWalletLedger,
    paymentWalletLedger,
    doctorAssignments,
    doctorSchedules,
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
      'emergency_chat_rooms',
      'id',
      manifest.resources.visitIds,
      'visit_id'
    ),
    selectByForeignIds(
      admin,
      'emergency_chat_rooms',
      'id',
      emergencyRequestIds,
      'emergency_request_id'
    ),
    selectByIds(admin, 'wallet_ledger', 'id', manifest.resources.walletLedgerIds),
    selectByForeignIds(
      admin,
      'wallet_ledger',
      'id',
      manifest.resources.paymentIds,
      'reference_id'
    ),
    selectByForeignIds(
      admin,
      'emergency_doctor_assignments',
      'id',
      emergencyRequestIds,
      'emergency_request_id'
    ),
    selectByForeignIds(
      admin,
      'doctor_schedules',
      'id',
      manifest.resources.doctorIds,
      'doctor_id'
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
    selectByIds(admin, 'admin_audit_log', 'id', manifest.resources.adminAuditIds),
    selectByForeignIds(admin, 'admin_audit_log', 'id', authUserIds, 'admin_id'),
    selectByForeignIds(admin, 'notifications', 'id', authUserIds, 'user_id'),
    selectByForeignIds(admin, 'notifications', 'id', entityIds, 'target_id'),
    selectByForeignIds(admin, 'id_mappings', 'id', entityIds, 'entity_id'),
  ]);
  const assignments = [...exactAssignments, ...requestAssignments];
  const paymentRows = [...exactPayments, ...requestPayments];
  const walletLedger = [...exactWalletLedger, ...paymentWalletLedger];
  const visitRows = [...exactVisits, ...requestVisits];
  const chatRooms = [...visitChatRooms, ...requestChatRooms];
  const staffing = [...exactStaffing, ...ambulanceStaffing, ...responderStaffing];
  const patientWallets = [...exactPatientWallets, ...userPatientWallets];
  const activity = exactActivity;
  const audit = [...exactAudit, ...userAudit];
  const notifications = [...userNotifications, ...targetNotifications];
  const storagePaths = await findStoragePaths(admin, [
    ...manifest.resources.storagePaths,
    ...evidenceRows.map((row) => row.storage_path),
  ]);

  const authUsers =
    options.authUsersExpectedAbsent || manifest.cleanup.complete
      ? []
      : authUserIds;

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
    doctorScheduleIds: unique(doctorSchedules.map((row) => row.id)),
    chatRoomIds: unique(chatRooms.map((row) => row.id)),
    visitIds: unique(visitRows.map((row) => row.id)),
    paymentIds: unique(paymentRows.map((row) => row.id)),
    walletLedgerIds: unique(walletLedger.map((row) => row.id)),
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
    facilityAdminReleaseIds: unique(facilityAdminLinks.map((row) => row.id)),
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
  for (const idChunk of chunks(unique(ids))) {
    const { error } = await admin.from(table).delete().in('id', idChunk);
    if (error) throw new Error(`${table} cleanup failed: ${error.message}`);
  }
}

async function applyCleanupPlan(admin, plan, authUserIds = []) {
  if (plan.storagePaths.length) {
    const { error } = await admin.storage.from('documents').remove(plan.storagePaths);
    if (error) throw new Error(`Storage cleanup failed: ${error.message}`);
  }

  await deleteByIds(admin, 'notifications', plan.notificationIds);
  await deleteUserActivityByUsers(admin, authUserIds);
  await deleteByIds(admin, 'user_activity', plan.activityIds);
  await deleteByIds(admin, 'admin_audit_log', plan.adminAuditIds);
  await deleteByIds(admin, 'insurance_billing', plan.insuranceBillingIds);
  await deleteByIds(
    admin,
    'emergency_doctor_assignments',
    plan.doctorAssignmentIds
  );
  await deleteByIds(admin, 'doctor_schedules', plan.doctorScheduleIds);
  await deleteByIds(admin, 'emergency_chat_rooms', plan.chatRoomIds);
  await deleteByIds(admin, 'visits', plan.visitIds);
  await removeWalletLedgerEffects(admin, plan.walletLedgerIds);
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

  if (plan.facilityAdminReleaseIds.length) {
    for (const facilityChunk of chunks(plan.facilityAdminReleaseIds)) {
      const { error } = await admin
        .from('hospitals')
        .update({ org_admin_id: null })
        .in('id', facilityChunk);
      if (error) {
        throw new Error(`Facility demo-admin release failed: ${error.message}`);
      }
    }
  }

  if (plan.profileIds.length) {
    for (const profileChunk of chunks(unique(plan.profileIds))) {
      const { error } = await admin
        .from('profiles')
        .update({
          organization_id: null,
          role: 'patient',
          onboarding_status: 'pending',
        })
        .in('id', profileChunk);
      if (error) throw new Error(`Profile scope cleanup failed: ${error.message}`);
    }
  }

  await deleteByIds(admin, 'organizations', plan.organizationIds);
  await deleteByIds(admin, 'id_mappings', plan.idMappingIds);
  await deleteByIds(admin, 'profiles', plan.profileIds);

  await deleteAuthUsers(admin, plan.authUserIds);
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
        protectedFacilityCount: manifest.protectedFacilities.length,
        counts: countPlan(plan),
      },
      null,
      2
    )
  );

  if (!apply) return;

  try {
    await applyCleanupPlan(admin, plan, manifest.resources.authUserIds);
    await assertAuthUsersAbsent(admin, manifest.resources.authUserIds);
    const residue = await buildCleanupPlan(admin, manifest, {
      authUsersExpectedAbsent: true,
    });
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
