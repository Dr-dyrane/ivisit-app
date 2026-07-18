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

function assertCleanupCoverage(manifest) {
  const unsupported = [
    'emergencyRequestIds',
    'responderAssignmentIds',
    'paymentIds',
    'visitIds',
  ].filter((key) => manifest.resources[key].length > 0);
  if (unsupported.length) {
    throw new Error(
      `Exact cleanup is not implemented for manifest resources: ${unsupported.join(', ')}`
    );
  }
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
  assertCleanupCoverage(manifest);
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
    wallets,
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
      organizationIds,
      'organization_id'
    ),
    selectByIds(admin, 'organizations', 'id', organizationIds),
    selectByIds(admin, 'profiles', 'id', authUserIds),
  ]);

  const evidenceRows = [...exactEvidence, ...userEvidence, ...organizationEvidence];
  const claimRows = [...exactClaims, ...organizationClaims];
  const facilities = [
    ...exactFacilities,
    ...organizationFacilities.filter((row) => disposableFacilityNames.has(row.name)),
  ];
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
    createdFacilityIds: unique(facilities.map((row) => row.id)),
    walletIds: unique(wallets.map((row) => row.id)),
    organizationIds: unique(organizations.map((row) => row.id)),
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
  assertCleanupCoverage,
  assertProtectedFacilities,
  buildCleanupPlan,
  countPlan,
  main,
};
