#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MIGRATION_FILE = path.join(ROOT, 'supabase', 'migrations', '20260219000900_automations.sql');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'automation_contract_guard_report.json');

function nowIso() {
  return new Date().toISOString();
}

function writeReport(payload) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
}

function fail(message) {
  console.error(`[automation-contract-guard] FAIL: ${message}`);
  process.exit(1);
}

function extractFunctionBody(sql, fnName) {
  const pattern = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${fnName}\\s*\\([\\s\\S]*?\\)\\s*RETURNS\\s+TRIGGER\\s+AS\\s+\\$\\$([\\s\\S]*?)\\$\\$\\s+LANGUAGE\\s+plpgsql\\s+SECURITY\\s+DEFINER\\s*;`,
    'i'
  );
  const match = sql.match(pattern);
  return match ? match[1] : null;
}

function run() {
  const failures = [];

  if (!fs.existsSync(MIGRATION_FILE)) {
    fail(`missing migration file: ${MIGRATION_FILE}`);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  const syncBody = extractFunctionBody(sql, 'sync_emergency_to_visit');

  const checks = {
    sync_function_found: Boolean(syncBody),
    no_stale_estimated_arrival_refs: !/\bNEW\.estimated_arrival\b/i.test(sql),
    sync_maps_accepted: false,
    sync_maps_arrived: false,
    sync_maps_cancelled: false,
    sync_updates_lifecycle_state: false,
    sync_updates_hospital_name: false,
    sync_updates_cost: false,
  };

  if (!checks.no_stale_estimated_arrival_refs) {
    failures.push('stale NEW.estimated_arrival reference still present in automations migration');
  }

  if (!syncBody) {
    failures.push('sync_emergency_to_visit function body not found');
  } else {
    checks.sync_maps_accepted = /WHEN\s+'accepted'\s+THEN/i.test(syncBody);
    checks.sync_maps_arrived = /WHEN\s+'arrived'\s+THEN/i.test(syncBody);
    checks.sync_maps_cancelled = /WHEN\s+'cancelled'\s+THEN/i.test(syncBody);
    checks.sync_updates_lifecycle_state = /\blifecycle_state\s*=/i.test(syncBody);
    checks.sync_updates_hospital_name = /\bhospital_name\s*=/i.test(syncBody);
    checks.sync_updates_cost = /\bcost\s*=/i.test(syncBody);

    if (!checks.sync_maps_accepted) failures.push('sync_emergency_to_visit missing accepted-status mapping');
    if (!checks.sync_maps_arrived) failures.push('sync_emergency_to_visit missing arrived-status mapping');
    if (!checks.sync_maps_cancelled) failures.push('sync_emergency_to_visit missing cancelled-status mapping');
    if (!checks.sync_updates_lifecycle_state)
      failures.push('sync_emergency_to_visit does not update lifecycle_state');
    if (!checks.sync_updates_hospital_name)
      failures.push('sync_emergency_to_visit does not update hospital_name');
    if (!checks.sync_updates_cost) failures.push('sync_emergency_to_visit does not update visit cost');
  }

  const report = {
    generated_at: nowIso(),
    source: 'assert_automation_contract.js',
    migration_file: MIGRATION_FILE,
    checks,
    failures,
    success: failures.length === 0,
  };
  writeReport(report);

  if (failures.length > 0) {
    for (const line of failures) {
      console.error(`- ${line}`);
    }
    fail(`automation contract checks failed. report: ${OUT_FILE}`);
  }

  console.log('[automation-contract-guard] PASS: automation contract checks passed.');
  console.log(`[automation-contract-guard] Report written: ${OUT_FILE}`);
}

run();
