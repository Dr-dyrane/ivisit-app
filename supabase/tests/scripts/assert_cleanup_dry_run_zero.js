#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

function extractFirstJsonObject(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;

  const openIndex = source.indexOf('{', markerIndex);
  if (openIndex < 0) return null;

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex, i + 1);
      }
    }
  }

  return null;
}

function main() {
  const cleanupScript = path.join(__dirname, 'cleanup_test_side_effects.js');
  const result = spawnSync(process.execPath, [cleanupScript, '--dry-run'], {
    env: process.env,
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    console.error(`[cleanup-dry-run-guard] cleanup script failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }

  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  const jsonText = extractFirstJsonObject(combined, '[cleanup-test-side-effects] plan');
  if (!jsonText) {
    console.error('[cleanup-dry-run-guard] Unable to parse cleanup dry-run plan output.');
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    console.error('[cleanup-dry-run-guard] Invalid JSON in cleanup dry-run plan:', error.message);
    process.exit(1);
  }

  const planned = parsed?.planned || {};
  const total = Object.values(planned).reduce((sum, value) => {
    const n = Number(value);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  if (total > 0) {
    console.error(
      `[cleanup-dry-run-guard] FAIL: planned side effects=${total}. Run cleanup before merge/push.`
    );
    console.error(JSON.stringify(planned, null, 2));
    process.exit(1);
  }

  console.log('[cleanup-dry-run-guard] PASS: cleanup dry-run reports zero planned side effects.');
}

main();
