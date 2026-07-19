const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  assertProtectedFacilityUnchanged,
  createDemoRunManifest,
  isManifestExpired,
  loadManifest,
  markCleanupAttempt,
  registerProtectedFacility,
  registerResource,
  saveManifest,
} = require('../supabase/tests/scripts/demo_run_manifest');
const { countPlan } = require('../supabase/tests/scripts/cleanup_demo_run');

const createManifest = () =>
  createDemoRunManifest({
    runId: 'demo-20260720-a7f3',
    suite: 'hospital-live-readiness',
    projectRef: 'project-ref',
    createdAt: '2026-07-20T09:00:00.000Z',
  });

test('deduplicates exact resources without broad name matching', () => {
  const manifest = createManifest();
  registerResource(manifest, 'organizationIds', 'org-1');
  registerResource(manifest, 'organizationIds', 'org-1');
  registerResource(manifest, 'storagePaths', 'onboarding/user-1/evidence.png');

  assert.deepEqual(manifest.resources.organizationIds, ['org-1']);
  assert.deepEqual(manifest.resources.storagePaths, [
    'onboarding/user-1/evidence.png',
  ]);
});

test('owns and expires disposable fixtures without a database schema field', () => {
  const manifest = createManifest();
  assert.deepEqual(manifest.owner, {
    kind: 'test_run',
    id: 'demo-20260720-a7f3',
    source: 'hospital-live-readiness',
  });
  assert.equal(manifest.disposition, 'hard_delete_exact_run');
  assert.equal(isManifestExpired(manifest, '2026-07-21T08:59:59.000Z'), false);
  assert.equal(isManifestExpired(manifest, '2026-07-27T09:00:00.000Z'), true);
});

test('keeps protected discovered facilities separate from disposable fixtures', () => {
  const manifest = createManifest();
  const protectedFacility = registerProtectedFacility(manifest, {
    id: 'facility-real-1',
    organization_id: null,
    verified: false,
    verification_status: 'unverified',
    dispatch_eligible: false,
    status: 'available',
    provider_source: 'places_import',
    place_id: 'places:real-1',
  });

  assert.throws(
    () => registerResource(manifest, 'createdFacilityIds', 'facility-real-1'),
    /Protected facility/
  );
  assert.doesNotThrow(() =>
    assertProtectedFacilityUnchanged(protectedFacility, {
      ...protectedFacility,
    })
  );
  assert.throws(
    () =>
      assertProtectedFacilityUnchanged(protectedFacility, {
        ...protectedFacility,
        organization_id: 'demo-org',
      }),
    /changed during demo run/
  );
});

test('persists a recoverable manifest and records repeat cleanup attempts', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ivisit-demo-run-'));
  const manifestPath = path.join(tempDir, 'manifest.json');
  const manifest = createManifest();
  registerResource(manifest, 'claimIds', 'claim-1');
  markCleanupAttempt(manifest);
  markCleanupAttempt(manifest);
  saveManifest(manifest, manifestPath);

  const reloaded = loadManifest(manifestPath);
  assert.equal(reloaded.cleanup.attempts, 2);
  assert.equal(reloaded.cleanup.complete, true);
  assert.deepEqual(reloaded.resources.claimIds, ['claim-1']);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('rejects unsafe run identities and created/protected overlap on load', () => {
  assert.throws(
    () =>
      createDemoRunManifest({
        runId: '../../production',
        suite: 'unsafe',
        projectRef: 'project-ref',
      }),
    /Demo run id/
  );

  const manifest = createManifest();
  registerResource(manifest, 'createdFacilityIds', 'facility-demo-1');
  assert.throws(
    () => registerProtectedFacility(manifest, { id: 'facility-demo-1' }),
    /[Tt]est-created/
  );
});

test('counts only exact manifest cleanup targets', () => {
  assert.deepEqual(
    countPlan({
      runId: 'demo-20260720-a7f3',
      projectRef: 'project-ref',
      storagePaths: ['one'],
      evidenceIds: [],
      claimIds: ['claim-1'],
      createdFacilityIds: [],
      walletIds: [],
      organizationIds: ['org-1'],
      profileIds: [],
      authUserIds: [],
    }),
    {
      storagePaths: 1,
      evidenceIds: 0,
      claimIds: 1,
      createdFacilityIds: 0,
      walletIds: 0,
      organizationIds: 1,
      profileIds: 0,
      authUserIds: 0,
    }
  );
});

test('tracks lifecycle resources in the same exact run manifest', () => {
  const manifest = createManifest();
  registerResource(manifest, 'emergencyRequestIds', 'request-1');
  registerResource(manifest, 'paymentIds', 'payment-1');
  registerResource(manifest, 'visitIds', 'visit-1');
  assert.deepEqual(manifest.resources.emergencyRequestIds, ['request-1']);
  assert.deepEqual(manifest.resources.paymentIds, ['payment-1']);
  assert.deepEqual(manifest.resources.visitIds, ['visit-1']);
});

test('live runner never deletes facilities by organization ownership', () => {
  const runner = fs.readFileSync(
    path.resolve(
      __dirname,
      '..',
      'supabase',
      'tests',
      'scripts',
      'run_console_onboarding_live_e2e.js'
    ),
    'utf8'
  );
  assert.doesNotMatch(
    runner,
    /from\('hospitals'\)\.delete\(\)\.in\('organization_id'/
  );
  assert.match(runner, /state\.createdFacilityIds/);
  assert.match(runner, /place_id: `e2e:\$\{runId\}:facility:claim`/);
  assert.doesNotMatch(runner, /provider_source: 'demo_bootstrap'/);
});

test('emergency matrix persists lifecycle identities and performs double cleanup', () => {
  const runner = fs.readFileSync(
    path.resolve(
      __dirname,
      '..',
      'supabase',
      'tests',
      'scripts',
      'run_e2e_flow_matrix.js'
    ),
    'utf8'
  );
  assert.match(runner, /createDemoRunManifest/);
  assert.match(runner, /createTrackedSet\(ctx, 'emergencyRequestIds'\)/);
  assert.match(runner, /createTrackedSet\(ctx, 'paymentIds'\)/);
  assert.match(runner, /createTrackedSet\(ctx, 'visitIds'\)/);
  assert.match(runner, /runManifestCleanupPass\(ctx, 2\)/);
  assert.match(runner, /second manifest cleanup was not a no-op/);
  assert.match(runner, /place_id: `e2e:\$\{TAG\}:facility:flow-matrix`/);
});

test('browser fixture handoff retains only an explicitly prepared manifest graph', () => {
  const runner = fs.readFileSync(
    path.resolve(
      __dirname,
      '..',
      'supabase',
      'tests',
      'scripts',
      'run_e2e_flow_matrix.js'
    ),
    'utf8'
  );
  assert.match(runner, /--prepare-browser-fixture/);
  assert.match(runner, /suite: PREPARE_BROWSER_FIXTURE/);
  assert.match(runner, /retainBrowserFixture = true/);
  assert.match(runner, /cleanupRequired: true/);
  assert.match(runner, /if \(!retainBrowserFixture\)/);
});

test('browser fixture coordinator is allowlisted, RPC-owned, and manifest-tracked', () => {
  const coordinator = fs.readFileSync(
    path.resolve(
      __dirname,
      '..',
      'supabase',
      'tests',
      'scripts',
      'browser_emergency_fixture.js'
    ),
    'utf8'
  );
  for (const action of ['status', 'approve-cash', 'dispatch', 'accept', 'telemetry', 'arrive', 'complete']) {
    assert.match(coordinator, new RegExp(`'${action}'`));
  }
  assert.match(coordinator, /registerResource/);
  assert.match(coordinator, /approve_cash_payment/);
  assert.match(coordinator, /console_dispatch_emergency/);
  assert.match(coordinator, /responder_accept_emergency/);
  assert.match(coordinator, /report_responder_telemetry/);
  assert.match(coordinator, /responder_arrive_emergency/);
  assert.match(coordinator, /responder_complete_emergency/);
  assert.doesNotMatch(coordinator, /\.insert\(/);
  assert.doesNotMatch(coordinator, /\.update\(/);
  assert.doesNotMatch(coordinator, /\.delete\(/);
  assert.doesNotMatch(coordinator, /\.upsert\(/);
});

test('reverses exact payment ledger effects across every supported wallet owner', () => {
  const cleanup = fs.readFileSync(
    path.resolve(__dirname, '..', 'supabase', 'tests', 'scripts', 'cleanup_demo_run.js'),
    'utf8'
  );
  assert.match(cleanup, /Refusing to reverse ledger effects for an ambiguous wallet/);
  assert.match(cleanup, /public\.organization_wallets/);
  assert.match(cleanup, /public\.patient_wallets/);
  assert.match(cleanup, /public\.ivisit_main_wallet/);
  assert.match(cleanup, /balance = COALESCE\(wallet\.balance, 0\) - fixture\.amount/);
  assert.match(cleanup, /WHERE ledger\.id IN/);
  assert.match(cleanup, /WHERE id IN/);
});

test('allows a manifest to own exact orphaned ledger rows', () => {
  const manifest = createDemoRunManifest({
    runId: 'ledger-retirement-1234',
    suite: 'ledger-retirement',
    projectRef: 'project-ref',
  });
  registerResource(manifest, 'walletLedgerIds', 'ledger-row-id');
  assert.deepEqual(manifest.resources.walletLedgerIds, ['ledger-row-id']);
});

test('only canonical coverage owners may provision demo coverage', () => {
  const explicitOwner = fs.readFileSync(
    path.resolve(__dirname, '..', 'hooks', 'emergency', 'useEmergencyCoverageMode.js'),
    'utf8'
  );
  assert.match(explicitOwner, /ensureDemoEcosystemForLocation/);
  const mapFallbackOwner = fs.readFileSync(
    path.resolve(
      __dirname,
      '..',
      'hooks',
      'map',
      'exploreFlow',
      'useMapExploreDemoBootstrap.js'
    ),
    'utf8'
  );
  assert.match(mapFallbackOwner, /ensureDemoEcosystemForLocation/);
  assert.doesNotMatch(
    mapFallbackOwner,
    /\bisBootstrappingDemo,\s*\n\s*isLoadingHospitals,/,
    'the map fallback effect must not cancel itself when its pending state changes'
  );
  assert.match(mapFallbackOwner, /activeBootstrapRef\.current === bootstrapTask/);

  for (const relativePath of [
    ['hooks', 'emergency', 'useHospitalsQuery.ts'],
    ['screens', 'MapEntryLoadingScreen.jsx'],
    ['screens', 'RequestAmbulanceScreen.jsx'],
  ]) {
    const source = fs.readFileSync(path.resolve(__dirname, '..', ...relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /ensureDemoEcosystemForLocation/,
      `${relativePath.join('/')} must remain read-only`
    );
  }

  const hospitalQuery = fs.readFileSync(
    path.resolve(__dirname, '..', 'hooks', 'emergency', 'useHospitalsQuery.ts'),
    'utf8'
  );
  assert.doesNotMatch(hospitalQuery, /removeQueries\(\{\s*queryKey\s*\}\)/);
  assert.match(
    hospitalQuery,
    /\(\)\s*=>\s*refetch\(\{\s*cancelRefetch:\s*false\s*\}\)/
  );
});
