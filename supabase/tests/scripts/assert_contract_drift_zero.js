#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const reportPath = path.join(
  process.cwd(),
  'supabase',
  'tests',
  'validation',
  'cross_repo_contract_matrix_report.json'
);

if (!fs.existsSync(reportPath)) {
  console.error(`[contract-drift-guard] Report not found: ${reportPath}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (error) {
  console.error(`[contract-drift-guard] Failed to parse report JSON: ${error.message}`);
  process.exit(1);
}

const summary = report?.summary || {};
const checks = [
  { key: 'missing_tables', label: 'missing tables' },
  { key: 'tables_with_missing_columns', label: 'tables with missing columns' },
  {
    key: 'tables_with_missing_required_insert_columns',
    label: 'tables with missing required insert columns',
  },
  { key: 'missing_rpcs', label: 'missing RPCs' },
  { key: 'stale_call_signatures', label: 'stale RPC call signatures' },
  { key: 'unresolved_signature_rpcs', label: 'unresolved RPC signatures' },
];

const failures = [];
for (const check of checks) {
  const value = Number(summary?.[check.key] ?? 0);
  if (Number.isFinite(value) && value > 0) {
    failures.push(`${check.label}: ${value}`);
  }
}

if (failures.length > 0) {
  console.error('[contract-drift-guard] FAIL: contract drift detected.');
  for (const line of failures) {
    console.error(`- ${line}`);
  }
  process.exit(1);
}

console.log('[contract-drift-guard] PASS: no contract drift detected.');
