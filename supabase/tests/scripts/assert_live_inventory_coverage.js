const fs = require('fs');
const path = require('path');

const INVENTORY_FILE = path.join(__dirname, '..', '..', '..', 'docs', 'audit', 'live_schema_inventory_latest.json');
const MAX_AGE_DAYS = 14;

const REQUIRED_TABLES = [
  'ambulances',
  'emergency_requests',
  'emergency_status_transitions',
  'visits',
  'organization_wallets',
  'payments',
  'wallet_ledger',
];

const REQUIRED_TRANSITION_COLUMNS = [
  'id',
  'emergency_request_id',
  'from_status',
  'to_status',
  'source',
  'reason',
  'actor_role',
  'request_snapshot',
  'occurred_at',
];

function fail(message) {
  console.error(`[inventory-guard] FAIL: ${message}`);
  process.exit(1);
}

function parseDate(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
}

function toAgeDays(date) {
  const diffMs = Date.now() - date.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

function run() {
  if (!fs.existsSync(INVENTORY_FILE)) {
    fail(`Missing inventory file: ${INVENTORY_FILE}. Run: npm run hardening:inventory-refresh`);
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
  } catch (error) {
    fail(`Unable to parse inventory JSON: ${error.message}`);
  }

  const generatedAt = parseDate(report?.generated_at_utc || report?.captured_at_utc);
  if (!generatedAt) {
    fail('Inventory is missing a valid generated timestamp (generated_at_utc/captured_at_utc).');
  }

  const ageDays = toAgeDays(generatedAt);
  if (ageDays > MAX_AGE_DAYS) {
    fail(`Inventory is stale (${ageDays.toFixed(1)} days old). Run: npm run hardening:inventory-refresh`);
  }

  const tableInventory = Array.isArray(report?.table_inventory) ? report.table_inventory : [];
  if (tableInventory.length === 0) {
    fail('Inventory has no table_inventory entries.');
  }

  const tableMap = new Map(tableInventory.map((entry) => [entry.table, entry]));

  const missingTables = REQUIRED_TABLES.filter((table) => {
    const entry = tableMap.get(table);
    return !entry || !entry.exists;
  });
  if (missingTables.length > 0) {
    fail(`Required tables missing from live inventory: ${missingTables.join(', ')}`);
  }

  const transitionEntry = tableMap.get('emergency_status_transitions');
  const missingTransitionColumns = REQUIRED_TRANSITION_COLUMNS.filter((column) =>
    Array.isArray(transitionEntry.missing_columns) && transitionEntry.missing_columns.includes(column)
  );
  if (missingTransitionColumns.length > 0) {
    fail(`emergency_status_transitions missing required columns: ${missingTransitionColumns.join(', ')}`);
  }

  console.log(
    `[inventory-guard] PASS: inventory fresh (${ageDays.toFixed(1)}d) and required logistics/finance tables covered`
  );
}

run();
