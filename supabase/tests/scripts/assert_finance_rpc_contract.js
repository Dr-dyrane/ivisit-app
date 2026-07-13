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
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.retry_payment_with_different_method\s*\([\s\S]*?\)\s*RETURNS\s+JSONB\s+AS\s+\$\$([\s\S]*?)\$\$\s+LANGUAGE\s+plpgsql\s+SECURITY\s+DEFINER(?:\s+SET\s+search_path\s*=\s*public)?\s*;/i;
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
    authorizes_request_owner: false,
    validates_payment_method_inline: false,
    avoids_undeployed_validation_helper: false,
    serializes_request_retry: false,
    reuses_pending_payment: false,
    converges_request_state: false,
    revokes_public_and_anon: false,
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

    checks.authorizes_request_owner = /v_actor_id\s+IS\s+DISTINCT\s+FROM\s+p_user_id/i.test(
      retryBody
    );
    if (!checks.authorizes_request_owner) {
      failures.push('retry function does not authorize the authenticated request owner');
    }

    checks.validates_payment_method_inline =
      /FROM\s+public\.payment_methods\s+method/i.test(retryBody) &&
      /method\.id\s*=\s*p_new_payment_method_id/i.test(retryBody) &&
      /method\.user_id\s*=\s*p_user_id/i.test(retryBody) &&
      /v_payment_method_active/i.test(retryBody);
    if (!checks.validates_payment_method_inline) {
      failures.push('retry function does not validate replacement method ownership and activity inline');
    }

    checks.avoids_undeployed_validation_helper = !/public\.validate_payment_method\s*\(/i.test(
      retryBody
    );
    if (!checks.avoids_undeployed_validation_helper) {
      failures.push('retry function depends on the separately deployed validate_payment_method helper');
    }

    checks.serializes_request_retry = /FOR\s+UPDATE\s+OF\s+er/i.test(retryBody);
    if (!checks.serializes_request_retry) {
      failures.push('retry function does not serialize concurrent retries on the request row');
    }

    checks.reuses_pending_payment = /payment\.status\s*=\s*'pending'/i.test(retryBody);
    if (!checks.reuses_pending_payment) {
      failures.push('retry function does not converge repeated calls on an existing pending payment');
    }

    checks.converges_request_state =
      /SET\s+status\s*=\s*'pending_approval'/i.test(retryBody) &&
      /payment_status\s*=\s*'pending'/i.test(retryBody) &&
      /payment_id\s*=\s*v_payment_id/i.test(retryBody);
    if (!checks.converges_request_state) {
      failures.push('retry function does not converge the emergency request on the pending payment');
    }
  }

  checks.revokes_public_and_anon =
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.retry_payment_with_different_method\s*\(UUID,\s*UUID,\s*UUID\)\s+FROM\s+PUBLIC,\s*anon;/i.test(
      sql
    );
  if (!checks.revokes_public_and_anon) {
    failures.push('retry function remains executable by PUBLIC or anon');
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
