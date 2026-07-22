const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = (path) => fs.readFileSync(path, 'utf8');

test('strategic reasoning gate separates implementation and business completion', () => {
  const agents = read('AGENTS.md');
  const testing = read('supabase/docs/TESTING.md');

  assert.match(agents, /## Strategic Outcome Gate/);
  assert.match(agents, /whether the bounded implementation works/);
  assert.match(agents, /whether the requested business outcome is complete/);
  assert.match(agents, /data proves only the warm path\./);
  assert.match(testing, /# Strategic Completeness Matrix/);

  for (const state of [
    'Cold start',
    'Warm/mature',
    'Partial',
    'Degraded',
    'Retry/replay',
    'Cross-surface',
    'Negative gate',
    'Residue/rollback',
  ]) {
    assert.match(`${agents}\n${testing}`, new RegExp(state.replace('/', '\\/')));
  }
});
