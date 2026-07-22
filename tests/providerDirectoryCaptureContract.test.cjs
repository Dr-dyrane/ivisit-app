const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = (path) => fs.readFileSync(path, 'utf8');

test('provider directory capture stays authenticated and App-owned', () => {
  const handler = read('supabase/functions/discovery/discover-hospitals/handler.ts');
  const google = read('supabase/functions/_shared/domain/providers/googlePlaces.ts');
  const persistence = read('supabase/functions/_shared/domain/providers/persistenceFlow.ts');

  assert.match(handler, /action === "directory_search"/);
  assert.match(handler, /requireAuthenticatedUser\(req/);
  assert.match(handler, /normalizeGoogleDirectoryRows/);
  assert.match(handler, /persistDiscoveredProviderRows/);
  assert.match(handler, /refreshDatabaseResults: false/);
  assert.match(handler, /preserveExistingRows: true/);
  assert.match(google, /const hasLocationBias = Number\.isFinite\(latitude\)/);
  assert.match(persistence, /refreshDatabaseResults = true/);
  assert.match(persistence, /preserveExistingRows = false/);
  assert.match(persistence, /!existingByPlaceId\.has/);
});

test('directory capture preserves verification and dispatch gates', () => {
  const persistence = read('supabase/functions/_shared/domain/providers/persistence.ts');

  assert.match(persistence, /verified: false/);
  assert.match(persistence, /emergency_eligible: row\?\.emergency_eligible === true/);
  assert.doesNotMatch(persistence, /organization_id:/);
});
