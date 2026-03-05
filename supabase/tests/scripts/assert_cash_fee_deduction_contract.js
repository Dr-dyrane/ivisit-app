#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const EMERGENCY_MIGRATION = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20260219000800_emergency_logic.sql'
);
const CORE_RPCS_MIGRATION = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20260219010000_core_rpcs.sql'
);
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'cash_fee_deduction_contract_guard_report.json');

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[cash-fee-contract-guard] FAIL: ${message}`);
  process.exit(1);
}

function writeReport(payload) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
}

function extractFunctionBody(sql, fnName) {
  const pattern = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${fnName}\\s*\\([\\s\\S]*?\\)\\s*RETURNS\\s+JSONB\\s+AS\\s+\\$\\$([\\s\\S]*?)\\$\\$\\s+LANGUAGE\\s+plpgsql\\s+SECURITY\\s+DEFINER\\s*;`,
    'i'
  );
  const match = sql.match(pattern);
  return match ? match[1] : null;
}

function run() {
  const failures = [];

  if (!fs.existsSync(EMERGENCY_MIGRATION)) fail(`missing migration file: ${EMERGENCY_MIGRATION}`);
  if (!fs.existsSync(CORE_RPCS_MIGRATION)) fail(`missing migration file: ${CORE_RPCS_MIGRATION}`);

  const emergencySql = fs.readFileSync(EMERGENCY_MIGRATION, 'utf8');
  const coreSql = fs.readFileSync(CORE_RPCS_MIGRATION, 'utf8');

  const createBody = extractFunctionBody(emergencySql, 'create_emergency_v4');
  const approveBody = extractFunctionBody(coreSql, 'approve_cash_payment');

  const checks = {
    create_emergency_v4_found: Boolean(createBody),
    approve_cash_payment_found: Boolean(approveBody),
    create_inserts_ivisit_fee_amount: false,
    create_metadata_has_fee_amount_key: false,
    create_metadata_has_fee_key: false,
    approve_nullif_ivisit_fee_amount: false,
    approve_legacy_fee_metadata_fallback: false,
    approve_percentage_fallback_formula: false,
    approve_persists_fee_to_payment_row: false,
    approve_persists_fee_to_payment_metadata: false,
  };

  if (!createBody) {
    failures.push('create_emergency_v4 function body not found in emergency logic migration');
  } else {
    const insertColumnsMatch = createBody.match(
      /INSERT\s+INTO\s+public\.payments\s*\(([\s\S]*?)\)\s*VALUES/i
    );
    const insertColumns = insertColumnsMatch ? insertColumnsMatch[1] : '';
    checks.create_inserts_ivisit_fee_amount = /\bivisit_fee_amount\b/i.test(insertColumns);
    checks.create_metadata_has_fee_amount_key = /'fee_amount'\s*,\s*v_fee_amount/i.test(createBody);
    checks.create_metadata_has_fee_key = /'fee'\s*,\s*v_fee_amount/i.test(createBody);

    if (!checks.create_inserts_ivisit_fee_amount) {
      failures.push('create_emergency_v4 payments insert missing ivisit_fee_amount');
    }
    if (!checks.create_metadata_has_fee_amount_key) {
      failures.push('create_emergency_v4 metadata missing fee_amount key');
    }
    if (!checks.create_metadata_has_fee_key) {
      failures.push('create_emergency_v4 metadata missing legacy fee key for compatibility');
    }
  }

  if (!approveBody) {
    failures.push('approve_cash_payment function body not found in core RPCs migration');
  } else {
    checks.approve_nullif_ivisit_fee_amount = /NULLIF\s*\(\s*v_payment\.ivisit_fee_amount\s*,\s*0\s*\)/i.test(
      approveBody
    );
    checks.approve_legacy_fee_metadata_fallback = /v_payment\.legacy_calculated_fee/i.test(approveBody);
    checks.approve_percentage_fallback_formula =
      /ROUND\s*\(\s*COALESCE\s*\(\s*v_payment\.amount\s*,\s*0\s*\)\s*\*\s*\(\s*COALESCE\s*\(\s*v_fee_percentage\s*,\s*2\.5\s*\)\s*\/\s*100\.0\s*\)\s*,\s*2\s*\)/i.test(
        approveBody
      );
    checks.approve_persists_fee_to_payment_row = /ivisit_fee_amount\s*=\s*v_fee_amount/i.test(approveBody);
    checks.approve_persists_fee_to_payment_metadata =
      /metadata\s*=\s*COALESCE\s*\(\s*metadata\s*,\s*'\{\}'::jsonb\s*\)\s*\|\|\s*jsonb_build_object\s*\(\s*'fee_amount'\s*,\s*v_fee_amount\s*,\s*'fee'\s*,\s*v_fee_amount\s*\)/i.test(
        approveBody
      );

    if (!checks.approve_nullif_ivisit_fee_amount) {
      failures.push('approve_cash_payment missing NULLIF(v_payment.ivisit_fee_amount, 0) guard');
    }
    if (!checks.approve_legacy_fee_metadata_fallback) {
      failures.push('approve_cash_payment missing fallback for legacy metadata.fee');
    }
    if (!checks.approve_percentage_fallback_formula) {
      failures.push('approve_cash_payment missing organization percentage fee fallback formula');
    }
    if (!checks.approve_persists_fee_to_payment_row) {
      failures.push('approve_cash_payment does not persist resolved fee to payments.ivisit_fee_amount');
    }
    if (!checks.approve_persists_fee_to_payment_metadata) {
      failures.push('approve_cash_payment does not persist resolved fee metadata keys');
    }
  }

  const report = {
    generated_at: nowIso(),
    source: 'assert_cash_fee_deduction_contract.js',
    files: {
      emergency_migration: EMERGENCY_MIGRATION,
      core_rpcs_migration: CORE_RPCS_MIGRATION,
    },
    checks,
    failures,
    success: failures.length === 0,
  };

  writeReport(report);

  if (failures.length > 0) {
    for (const line of failures) {
      console.error(`- ${line}`);
    }
    fail(`contract violations detected. report: ${OUT_FILE}`);
  }

  console.log('[cash-fee-contract-guard] PASS: cash fee deduction contract checks passed.');
  console.log(`[cash-fee-contract-guard] Report written: ${OUT_FILE}`);
}

run();
