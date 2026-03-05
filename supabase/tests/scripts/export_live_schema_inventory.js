const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[inventory-refresh] Missing Supabase credentials (.env/.env.local).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const TABLE_COLUMN_CONTRACTS = {
  ambulances: ['id', 'hospital_id', 'organization_id', 'status', 'type', 'call_sign', 'current_call'],
  emergency_requests: ['id', 'user_id', 'hospital_id', 'status', 'service_type', 'payment_status', 'created_at', 'updated_at'],
  emergency_status_transitions: ['id', 'emergency_request_id', 'from_status', 'to_status', 'source', 'reason', 'actor_role', 'request_snapshot', 'occurred_at'],
  visits: ['id', 'request_id', 'user_id', 'hospital_id', 'status', 'type', 'cost', 'created_at', 'updated_at'],
  organization_wallets: ['id', 'organization_id', 'balance', 'currency', 'created_at', 'updated_at'],
  patient_wallets: ['id', 'user_id', 'balance', 'currency', 'created_at', 'updated_at'],
  ivisit_main_wallet: ['id', 'balance', 'currency', 'last_updated'],
  wallet_ledger: ['id', 'wallet_id', 'transaction_type', 'amount', 'reference_id', 'external_reference', 'created_at'],
  payment_methods: ['id', 'user_id', 'organization_id', 'type', 'is_default', 'is_active', 'created_at', 'updated_at'],
  payments: ['id', 'emergency_request_id', 'organization_id', 'payment_method', 'status', 'amount', 'created_at', 'updated_at'],
  insurance_policies: ['id', 'user_id', 'provider', 'policy_number', 'is_active', 'created_at', 'updated_at'],
  insurance_billing: ['id', 'emergency_request_id', 'insurance_policy_id', 'status', 'total_amount', 'created_at', 'updated_at'],
};

function nowIso() {
  return new Date().toISOString();
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname || '';
    return host.split('.')[0] || null;
  } catch {
    return null;
  }
}

function parseMissingColumnFromError(error) {
  const message = String(error?.message || '');
  const pgrst = message.match(/Could not find the '([^']+)' column/i);
  if (pgrst) return pgrst[1];
  const postgres = message.match(/column\s+["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i);
  if (postgres) return postgres[1];
  return null;
}

function isMissingTableError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code === 'PGRST205' ||
    message.includes('Could not find the table') ||
    message.includes('does not exist')
  );
}

async function probeTable(tableName, expectedColumns) {
  const result = {
    table: tableName,
    exists: false,
    row_count: null,
    missing_columns: [],
    probe_error: null,
  };

  const tableProbe = await supabase.from(tableName).select('*', { head: true, count: 'exact' });
  if (tableProbe.error) {
    if (isMissingTableError(tableProbe.error)) {
      result.probe_error = tableProbe.error.message || tableProbe.error.code || 'missing table';
      return result;
    }
    result.probe_error = tableProbe.error.message || tableProbe.error.code || 'table probe failed';
    return result;
  }

  result.exists = true;
  result.row_count = tableProbe.count ?? 0;

  let remaining = [...expectedColumns];
  const missingColumns = [];
  const maxLoops = Math.max(remaining.length + 2, 4);

  for (let i = 0; i < maxLoops; i += 1) {
    if (remaining.length === 0) break;
    const selectExpr = remaining.join(',');
    const { error } = await supabase.from(tableName).select(selectExpr).limit(1);
    if (!error) break;

    const missingCol = parseMissingColumnFromError(error);
    if (missingCol && remaining.includes(missingCol)) {
      missingColumns.push(missingCol);
      remaining = remaining.filter((column) => column !== missingCol);
      continue;
    }

    result.probe_error = error.message || error.code || 'column probe failed';
    break;
  }

  result.missing_columns = [...new Set(missingColumns)];
  return result;
}

async function run() {
  const startedAt = nowIso();
  console.log(`[inventory-refresh] Starting at ${startedAt}`);

  const tableEntries = [];
  for (const [tableName, expectedColumns] of Object.entries(TABLE_COLUMN_CONTRACTS)) {
    tableEntries.push(await probeTable(tableName, expectedColumns));
  }

  const summary = {
    total_tables: tableEntries.length,
    missing_tables: tableEntries.filter((entry) => !entry.exists).length,
    tables_with_missing_columns: tableEntries.filter((entry) => entry.missing_columns.length > 0).length,
    tables_with_probe_errors: tableEntries.filter((entry) => entry.probe_error).length,
  };

  const report = {
    generated_at_utc: nowIso(),
    started_at_utc: startedAt,
    source: 'supabase/tests/scripts/export_live_schema_inventory.js',
    project_ref: projectRefFromUrl(supabaseUrl),
    table_inventory: tableEntries,
    summary,
  };

  const outDir = path.join(__dirname, '..', '..', '..', 'docs', 'audit');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const datedFile = path.join(outDir, `live_schema_inventory_${dateStamp}.json`);
  const latestFile = path.join(outDir, 'live_schema_inventory_latest.json');

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(datedFile, JSON.stringify(report, null, 2));
  fs.writeFileSync(latestFile, JSON.stringify(report, null, 2));

  console.log(`[inventory-refresh] Wrote ${datedFile}`);
  console.log(`[inventory-refresh] Wrote ${latestFile}`);
  console.log(
    `[inventory-refresh] tables=${summary.total_tables} missing_tables=${summary.missing_tables} missing_columns=${summary.tables_with_missing_columns} probe_errors=${summary.tables_with_probe_errors}`
  );
}

run().catch((error) => {
  console.error('[inventory-refresh] Failed:', error);
  process.exit(1);
});
