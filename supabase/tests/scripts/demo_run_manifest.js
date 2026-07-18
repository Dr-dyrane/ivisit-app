const fs = require('fs');
const path = require('path');

const MANIFEST_VERSION = 1;
const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,95}$/;
const RESOURCE_KEYS = Object.freeze([
  'authUserIds',
  'invitedEmails',
  'organizationIds',
  'createdFacilityIds',
  'claimIds',
  'evidenceIds',
  'storagePaths',
  'emergencyRequestIds',
  'responderAssignmentIds',
  'paymentIds',
  'visitIds',
  'doctorIds',
  'ambulanceIds',
  'staffingIds',
  'patientWalletIds',
  'organizationWalletIds',
  'activityIds',
  'adminAuditIds',
]);

function assertSafeRunId(runId) {
  if (!RUN_ID_PATTERN.test(String(runId || ''))) {
    throw new Error(
      'Demo run id must be 8-96 lowercase letters, numbers, or hyphens'
    );
  }
  return runId;
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeFacilitySnapshot(snapshot) {
  if (!snapshot?.id) throw new Error('Protected facility snapshot requires an id');
  return {
    id: String(snapshot.id),
    organization_id: snapshot.organization_id ?? null,
    verified: snapshot.verified ?? null,
    verification_status: snapshot.verification_status ?? null,
    dispatch_eligible: snapshot.dispatch_eligible ?? null,
    status: snapshot.status ?? null,
    provider_source: snapshot.provider_source ?? null,
    place_id: snapshot.place_id ?? null,
  };
}

function createDemoRunManifest({ runId, suite, projectRef, createdAt = new Date().toISOString() }) {
  assertSafeRunId(runId);
  if (!suite) throw new Error('Demo run suite is required');
  if (!projectRef) throw new Error('Demo run project reference is required');

  return {
    version: MANIFEST_VERSION,
    runId,
    suite: String(suite),
    projectRef: String(projectRef),
    createdAt,
    updatedAt: createdAt,
    resources: Object.fromEntries(RESOURCE_KEYS.map((key) => [key, []])),
    protectedFacilities: [],
    cleanup: {
      attempts: 0,
      complete: false,
      completedAt: null,
      lastError: null,
    },
  };
}

function validateManifest(manifest) {
  if (!manifest || manifest.version !== MANIFEST_VERSION) {
    throw new Error(`Unsupported demo run manifest version: ${manifest?.version ?? 'missing'}`);
  }
  assertSafeRunId(manifest.runId);
  if (!manifest.suite || !manifest.projectRef) {
    throw new Error('Demo run manifest is missing suite or project reference');
  }

  for (const key of RESOURCE_KEYS) {
    if (!Array.isArray(manifest.resources?.[key])) {
      throw new Error(`Demo run manifest resource ${key} must be an array`);
    }
    manifest.resources[key] = uniqueStrings(manifest.resources[key]);
  }

  manifest.protectedFacilities = (manifest.protectedFacilities || []).map(
    normalizeFacilitySnapshot
  );

  const createdFacilityIds = new Set(manifest.resources.createdFacilityIds);
  const protectedFacilityIds = new Set();
  for (const facility of manifest.protectedFacilities) {
    if (protectedFacilityIds.has(facility.id)) {
      throw new Error(`Protected facility ${facility.id} is registered more than once`);
    }
    if (createdFacilityIds.has(facility.id)) {
      throw new Error(
        `Facility ${facility.id} cannot be both test-created and protected`
      );
    }
    protectedFacilityIds.add(facility.id);
  }

  return manifest;
}

function registerResource(manifest, resourceKey, value) {
  validateManifest(manifest);
  if (!RESOURCE_KEYS.includes(resourceKey)) {
    throw new Error(`Unsupported demo run resource: ${resourceKey}`);
  }
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`Cannot register an empty ${resourceKey} value`);
  if (
    resourceKey === 'createdFacilityIds'
    && manifest.protectedFacilities.some((facility) => facility.id === normalized)
  ) {
    throw new Error(`Protected facility ${normalized} cannot become test-created`);
  }
  manifest.resources[resourceKey] = uniqueStrings([
    ...manifest.resources[resourceKey],
    normalized,
  ]);
  manifest.updatedAt = new Date().toISOString();
  return normalized;
}

function registerProtectedFacility(manifest, snapshot) {
  validateManifest(manifest);
  const normalized = normalizeFacilitySnapshot(snapshot);
  if (manifest.resources.createdFacilityIds.includes(normalized.id)) {
    throw new Error(`Test-created facility ${normalized.id} cannot become protected`);
  }
  const existing = manifest.protectedFacilities.find(
    (facility) => facility.id === normalized.id
  );
  if (existing && JSON.stringify(existing) !== JSON.stringify(normalized)) {
    throw new Error(`Protected facility ${normalized.id} snapshot changed during registration`);
  }
  if (!existing) manifest.protectedFacilities.push(normalized);
  manifest.updatedAt = new Date().toISOString();
  return normalized;
}

function markCleanupAttempt(manifest, error = null) {
  validateManifest(manifest);
  manifest.cleanup.attempts += 1;
  manifest.cleanup.complete = !error;
  manifest.cleanup.completedAt = error ? null : new Date().toISOString();
  manifest.cleanup.lastError = error ? String(error.message || error) : null;
  manifest.updatedAt = new Date().toISOString();
}

function defaultManifestPath(appRoot, runId) {
  assertSafeRunId(runId);
  return path.join(
    appRoot,
    'supabase',
    'tests',
    'artifacts',
    'demo-runs',
    `${runId}.json`
  );
}

function saveManifest(manifest, filePath) {
  validateManifest(manifest);
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporaryPath = `${resolved}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, resolved);
  return resolved;
}

function loadManifest(filePath) {
  const parsed = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  return validateManifest(parsed);
}

function assertProtectedFacilityUnchanged(snapshot, current) {
  const expected = normalizeFacilitySnapshot(snapshot);
  const actual = normalizeFacilitySnapshot(current);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`Protected facility ${expected.id} changed during demo run`);
  }
}

module.exports = {
  MANIFEST_VERSION,
  RESOURCE_KEYS,
  RUN_ID_PATTERN,
  assertProtectedFacilityUnchanged,
  assertSafeRunId,
  createDemoRunManifest,
  defaultManifestPath,
  loadManifest,
  markCleanupAttempt,
  registerProtectedFacility,
  registerResource,
  saveManifest,
  validateManifest,
};
