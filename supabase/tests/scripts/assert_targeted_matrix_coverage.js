#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VALIDATION_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const CONSOLE_REPORT_FILE = path.join(VALIDATION_DIR, 'console_ui_crud_contract_matrix_report.json');
const RUNTIME_REPORT_FILE = path.join(VALIDATION_DIR, 'runtime_crud_relationship_batch_report.json');
const OUTPUT_FILE = path.join(VALIDATION_DIR, 'targeted_matrix_coverage_report.json');

const REQUIRED_CONSOLE_SURFACES = [
  { id: 'emergency_requests', table: 'emergency_requests' },
  { id: 'organization_wallets', table: 'organization_wallets' },
  { id: 'wallet_ledger', table: 'wallet_ledger' },
  { id: 'payments', table: 'payments' },
  { id: 'payment_methods', table: 'payment_methods' },
];

const REQUIRED_RUNTIME_ASSERTIONS = [
  'emergency_request_assigned_doctor_synced',
  'organization_wallet_linked_to_org',
  'organization_wallets_row_persisted',
  'wallet_ledger_payment_relationship',
  'console_wallet_query_reads_new_ledger',
  'payment_org_relationship',
  'payments_row_persisted',
  'patient_wallet_row_persisted',
  'ivisit_main_wallet_row_persisted',
];

const REQUIRED_RUNTIME_MIRROR_COUNTS = [
  'emergency_requests',
  'organization_wallets',
  'wallet_ledger',
  'payments',
  'patient_wallets',
  'ivisit_main_wallet',
];

function nowIso() {
  return new Date().toISOString();
}

function readJson(reportLabel, filePath, failures) {
  if (!fs.existsSync(filePath)) {
    failures.push(
      `${reportLabel} missing at ${filePath}; run npm run hardening:targeted-matrix-guard to regenerate reports`
    );
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push(`${reportLabel} parse error: ${error.message}`);
    return null;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPositiveNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

function run() {
  const failures = [];

  const checkDetails = {
    console_surfaces: {},
    runtime_assertions: {},
    runtime_mirror_counts: {},
  };

  const consoleReport = readJson('console_ui_crud_contract_matrix_report.json', CONSOLE_REPORT_FILE, failures);
  const runtimeReport = readJson(
    'runtime_crud_relationship_batch_report.json',
    RUNTIME_REPORT_FILE,
    failures
  );

  if (consoleReport) {
    const surfaces = asArray(consoleReport.surfaces);
    const byId = new Map(surfaces.map((surface) => [surface.id, surface]));

    for (const requirement of REQUIRED_CONSOLE_SURFACES) {
      const surface = byId.get(requirement.id);
      const checks = {
        present: Boolean(surface),
        expected_table: requirement.table,
        actual_table: surface?.table || null,
        issues: [],
      };

      if (!surface) {
        checks.issues.push(`missing surface id=${requirement.id}`);
      } else {
        if (surface.table !== requirement.table) {
          checks.issues.push(
            `table mismatch expected=${requirement.table} actual=${surface.table || 'null'}`
          );
        }

        if (asArray(surface.risks).length > 0) {
          checks.issues.push(`surface risks present: ${surface.risks.join(', ')}`);
        }

        if (asArray(surface.service_unknown_columns).length > 0) {
          checks.issues.push(
            `service_unknown_columns present: ${surface.service_unknown_columns.join(', ')}`
          );
        }

        if (
          !surface.read_only_surface &&
          !surface.dynamic_create_payload &&
          asArray(surface.missing_required_create_columns).length > 0
        ) {
          checks.issues.push(
            `missing_required_create_columns: ${surface.missing_required_create_columns.join(', ')}`
          );
        }

        if (
          !surface.read_only_surface &&
          !surface.dynamic_update_payload &&
          asArray(surface.modal_db_fields_not_persisted).length > 0
        ) {
          checks.issues.push(
            `modal_db_fields_not_persisted: ${surface.modal_db_fields_not_persisted.join(', ')}`
          );
        }
      }

      if (checks.issues.length > 0) {
        failures.push(`console surface ${requirement.id} failed checks: ${checks.issues.join(' | ')}`);
      }

      checkDetails.console_surfaces[requirement.id] = checks;
    }
  }

  if (runtimeReport) {
    if (runtimeReport.success !== true) {
      failures.push('runtime_crud_relationship_batch_report success=false');
    }

    if (asArray(runtimeReport.failures).length > 0) {
      failures.push(`runtime_crud_relationship_batch_report has ${runtimeReport.failures.length} assertion failures`);
    }

    const runtimeAssertions = runtimeReport.assertions || {};
    for (const assertionName of REQUIRED_RUNTIME_ASSERTIONS) {
      const passed = runtimeAssertions[assertionName] === true;
      checkDetails.runtime_assertions[assertionName] = passed;
      if (!passed) {
        failures.push(`runtime assertion failed or missing: ${assertionName}`);
      }
    }

    const mirrorCounts = runtimeReport.resources?.mirrorCounts || {};
    for (const tableName of REQUIRED_RUNTIME_MIRROR_COUNTS) {
      const count = Number(mirrorCounts[tableName] || 0);
      const passed = isPositiveNumber(count);
      checkDetails.runtime_mirror_counts[tableName] = count;
      if (!passed) {
        failures.push(`runtime mirror count not positive for ${tableName}: ${count}`);
      }
    }
  }

  const output = {
    generated_at: nowIso(),
    source: 'assert_targeted_matrix_coverage.js',
    required_console_surfaces: REQUIRED_CONSOLE_SURFACES,
    required_runtime_assertions: REQUIRED_RUNTIME_ASSERTIONS,
    required_runtime_mirror_counts: REQUIRED_RUNTIME_MIRROR_COUNTS,
    checks: checkDetails,
    failures,
    success: failures.length === 0,
  };

  fs.mkdirSync(VALIDATION_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  if (failures.length > 0) {
    console.error('[targeted-matrix-guard] FAIL: targeted emergency/payments/wallet coverage check failed.');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    console.error(`[targeted-matrix-guard] Report written: ${OUTPUT_FILE}`);
    process.exit(1);
  }

  console.log('[targeted-matrix-guard] PASS: targeted emergency/payments/wallet coverage check passed.');
  console.log(`[targeted-matrix-guard] Report written: ${OUTPUT_FILE}`);
}

run();
