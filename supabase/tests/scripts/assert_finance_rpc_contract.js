#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MIGRATION_FILE = path.join(ROOT, 'supabase', 'migrations', '20260219000400_finance.sql');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'finance_rpc_contract_guard_report.json');

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[finance-rpc-contract-guard] FAIL: ${message}`);
  process.exit(1);
}

function writeReport(payload) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
}

function getRetryFunctionBody(sql) {
  const pattern =
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.retry_payment_with_different_method\s*\([\s\S]*?\)\s*RETURNS\s+JSONB\s+AS\s+\$\$([\s\S]*?)\$\$\s+LANGUAGE\s+plpgsql\s+SECURITY\s+DEFINER\s*;/i;
  const match = sql.match(pattern);
  return match ? match[1] : null;
}

function run() {
  const failures = [];

  if (!fs.existsSync(MIGRATION_FILE)) {
    fail(`missing migration file: ${MIGRATION_FILE}`);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  const retryBody = getRetryFunctionBody(sql);
  if (!retryBody) {
    failures.push('retry_payment_with_different_method function body not found');
  }

  const checks = {
    retry_function_found: Boolean(retryBody),
    no_legacy_estimated_amount: false,
    no_legacy_payment_method_id_insert_column: false,
    uses_total_cost_source: false,
    inserts_canonical_payment_method: false,
    inserts_metadata_payload: false,
  };

  if (retryBody) {
    checks.no_legacy_estimated_amount = !/\bestimated_amount\b/i.test(retryBody);
    if (!checks.no_legacy_estimated_amount) {
      failures.push('retry function still references legacy emergency_requests.estimated_amount');
    }

    const insertColumnsMatch = retryBody.match(
      /INSERT\s+INTO\s+public\.payments\s*\(([\s\S]*?)\)\s*VALUES/i
    );
    const insertColumns = insertColumnsMatch ? insertColumnsMatch[1] : '';
    checks.no_legacy_payment_method_id_insert_column = !/\bpayment_method_id\b/i.test(insertColumns);
    if (!checks.no_legacy_payment_method_id_insert_column) {
      failures.push('retry function still inserts into legacy payments.payment_method_id column');
    }

    checks.uses_total_cost_source = /\btotal_cost\b/i.test(retryBody);
    if (!checks.uses_total_cost_source) {
      failures.push('retry function does not source payment amount from canonical emergency_requests.total_cost');
    }

    checks.inserts_canonical_payment_method = /\bpayment_method\b/i.test(insertColumns);
    if (!checks.inserts_canonical_payment_method) {
      failures.push('retry function insert columns missing canonical payments.payment_method');
    }

    checks.inserts_metadata_payload = /\bmetadata\b/i.test(insertColumns);
    if (!checks.inserts_metadata_payload) {
      failures.push('retry function insert columns missing canonical payments.metadata');
    }
  }

  const report = {
    generated_at: nowIso(),
    source: 'assert_finance_rpc_contract.js',
    migration_file: MIGRATION_FILE,
    checks,
    failures,
    success: failures.length === 0,
  };
  writeReport(report);

  if (!report.success) {
    for (const line of failures) {
      console.error(`- ${line}`);
    }
    fail(`contract violations detected. report: ${OUT_FILE}`);
  }

  console.log('[finance-rpc-contract-guard] PASS: finance RPC contract checks passed.');
  console.log(`[finance-rpc-contract-guard] Report written: ${OUT_FILE}`);
}

run();
