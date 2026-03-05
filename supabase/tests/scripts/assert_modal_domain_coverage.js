#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_FILE = path.join(
  ROOT,
  'supabase',
  'tests',
  'validation',
  'console_ui_crud_contract_matrix_report.json'
);
const OUT_FILE = path.join(
  ROOT,
  'supabase',
  'tests',
  'validation',
  'modal_domain_coverage_report.json'
);

const REQUIRED_SURFACES = [
  'emergency_requests',
  'visits',
  'service_pricing',
  'room_pricing',
  'organization_wallets',
  'wallet_ledger',
  'payments',
  'payment_methods',
  'profiles',
  'hospitals',
  'organizations',
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[modal-domain-guard] FAIL: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing report: ${filePath}. Run npm run hardening:console-ui-crud-matrix`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`invalid JSON report ${filePath}: ${error.message}`);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function run() {
  const report = readJson(REPORT_FILE);
  const surfaces = asArray(report.surfaces);
  const byId = new Map(surfaces.map((surface) => [surface.id, surface]));

  const failures = [];
  const checks = {};

  for (const id of REQUIRED_SURFACES) {
    const surface = byId.get(id);
    const entry = {
      present: Boolean(surface),
      modal: surface?.modal || null,
      page: surface?.page || null,
      service: surface?.service || null,
      risk_count: asArray(surface?.risks).length,
      risks: asArray(surface?.risks),
      service_unknown_columns: asArray(surface?.service_unknown_columns),
      missing_required_create_columns: asArray(surface?.missing_required_create_columns),
      modal_db_fields_not_persisted: asArray(surface?.modal_db_fields_not_persisted),
      dynamic_create_payload: Boolean(surface?.dynamic_create_payload),
      dynamic_update_payload: Boolean(surface?.dynamic_update_payload),
      issues: [],
    };

    if (!surface) {
      entry.issues.push(`missing surface: ${id}`);
    } else {
      if (!surface.modal || !surface.page || !surface.service) {
        entry.issues.push('missing modal/page/service wiring metadata');
      }
      if (entry.risk_count > 0) {
        entry.issues.push(`surface risks present: ${entry.risks.join(', ')}`);
      }
      if (entry.service_unknown_columns.length > 0) {
        entry.issues.push(
          `service_unknown_columns present: ${entry.service_unknown_columns.join(', ')}`
        );
      }
      if (!entry.dynamic_create_payload && entry.missing_required_create_columns.length > 0) {
        entry.issues.push(
          `missing_required_create_columns: ${entry.missing_required_create_columns.join(', ')}`
        );
      }
      if (!entry.dynamic_update_payload && entry.modal_db_fields_not_persisted.length > 0) {
        entry.issues.push(
          `modal_db_fields_not_persisted: ${entry.modal_db_fields_not_persisted.join(', ')}`
        );
      }
    }

    if (entry.issues.length > 0) {
      failures.push(`${id}: ${entry.issues.join(' | ')}`);
    }

    checks[id] = entry;
  }

  const output = {
    generated_at: nowIso(),
    source: 'assert_modal_domain_coverage.js',
    required_surfaces: REQUIRED_SURFACES,
    checks,
    failures,
    success: failures.length === 0,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  if (failures.length > 0) {
    console.error('[modal-domain-guard] FAIL: modal-domain coverage checks failed.');
    for (const line of failures) {
      console.error(`- ${line}`);
    }
    console.error(`[modal-domain-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[modal-domain-guard] PASS: modal-domain coverage checks passed.');
  console.log(`[modal-domain-guard] Report written: ${OUT_FILE}`);
}

run();
