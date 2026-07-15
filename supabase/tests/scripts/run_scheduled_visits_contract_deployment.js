#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const {
  postDeployChecks,
  preflightChecks,
  probeSql,
} = require('./assert_scheduled_visits_contract_live.js');

const ROOT = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.argv
  .find((value) => value.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);
const migrationOutput = process.argv
  .find((value) => value.startsWith('--emit-migration='))
  ?.slice('--emit-migration='.length);
const preflightOnly = process.argv.includes('--preflight-only');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[scheduled-visits-deployment] Missing Supabase URL or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('[scheduled-visits-deployment] Refusing to target an unconfirmed project reference.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const SOURCE = {
  org: 'supabase/migrations/20260219000200_org_structure.sql',
  logistics: 'supabase/migrations/20260219000300_logistics.sql',
  security: 'supabase/migrations/20260219000700_security.sql',
  automations: 'supabase/migrations/20260219000900_automations.sql',
  rpcs: 'supabase/migrations/20260219010000_core_rpcs.sql',
};
const rollbackExcludedLabels = new Set([
  'force private consult media bucket',
  'ASYNC_CONSULT_STORAGE_POLICIES',
]);
const rollbackExcludedChecks = new Set([
  'consult media bucket and policies are private and participant-scoped',
]);

const readSource = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function marked(file, marker) {
  const source = readSource(file);
  const begin = `-- BEGIN ${marker}`;
  const end = `-- END ${marker}`;
  const start = source.indexOf(begin);
  const finish = source.indexOf(end);
  if (start < 0 || finish <= start) throw new Error(`Invalid ${marker} markers in ${file}`);
  return source.slice(start + begin.length, finish).trim();
}

function splitSql(source) {
  const statements = [];
  let buffer = '';
  let single = false;
  let double = false;
  let lineComment = false;
  let blockDepth = 0;
  let dollar = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      buffer += char;
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockDepth) {
      buffer += char;
      if (char === '/' && next === '*') {
        buffer += next;
        blockDepth += 1;
        index += 1;
      } else if (char === '*' && next === '/') {
        buffer += next;
        blockDepth -= 1;
        index += 1;
      }
      continue;
    }
    if (dollar) {
      if (source.startsWith(dollar, index)) {
        buffer += dollar;
        index += dollar.length - 1;
        dollar = null;
      } else buffer += char;
      continue;
    }
    if (single) {
      buffer += char;
      if (char === "'" && next === "'") {
        buffer += next;
        index += 1;
      } else if (char === "'") single = false;
      continue;
    }
    if (double) {
      buffer += char;
      if (char === '"' && next === '"') {
        buffer += next;
        index += 1;
      } else if (char === '"') double = false;
      continue;
    }
    if (char === '-' && next === '-') {
      buffer += char + next;
      lineComment = true;
      index += 1;
    } else if (char === '/' && next === '*') {
      buffer += char + next;
      blockDepth = 1;
      index += 1;
    } else if (char === "'") {
      buffer += char;
      single = true;
    } else if (char === '"') {
      buffer += char;
      double = true;
    } else if (char === '$') {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollar = match[0];
        buffer += dollar;
        index += dollar.length - 1;
      } else buffer += char;
    } else if (char === ';') {
      if (buffer.trim()) statements.push(buffer.trim());
      buffer = '';
    } else buffer += char;
  }
  if (buffer.trim()) statements.push(buffer.trim());
  if (single || double || blockDepth || dollar) throw new Error('Unterminated SQL construct');
  return statements;
}

const cache = new Map();
function statements(file) {
  if (!cache.has(file)) cache.set(file, splitSql(readSource(file)));
  return cache.get(file);
}

function exact(file, label, pattern) {
  const matches = statements(file).filter((statement) => pattern.test(statement));
  if (matches.length !== 1) {
    throw new Error(`${file} ${label}: expected one source statement, found ${matches.length}`);
  }
  return matches[0];
}

const markerUnit = (file, label) => ({ file, label, sql: marked(file, label) });
const statementUnit = (file, label, pattern) => ({ file, label, sql: exact(file, label, pattern) });

function policyPair(file, table, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [
    statementUnit(
      file,
      `drop ${name}`,
      new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${escaped}"\\s+ON\\s+public\\.${table}`, 'i')
    ),
    statementUnit(
      file,
      `create ${name}`,
      new RegExp(`CREATE\\s+POLICY\\s+"${escaped}"\\s+ON\\s+public\\.${table}`, 'i')
    ),
  ];
}

function sourceUnits() {
  const units = [
    markerUnit(SOURCE.org, 'SCHEDULED_VISITS_PROVIDER_TIME_SCHEMA'),
    statementUnit(SOURCE.org, 'drop schedule updated-at trigger', /DROP\s+TRIGGER\s+IF\s+EXISTS\s+handle_doctor_schedule_updated_at/i),
    statementUnit(SOURCE.org, 'create schedule updated-at trigger', /CREATE\s+TRIGGER\s+handle_doctor_schedule_updated_at\b/i),
    statementUnit(SOURCE.org, 'schedule availability index', /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_doctor_schedules_available_window\b/i),
    statementUnit(SOURCE.org, 'doctor profile lookup index', /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_doctors_hospital_profile\b/i),
    markerUnit(SOURCE.logistics, 'SCHEDULED_VISITS_LOGISTICS_SCHEMA'),
    markerUnit(SOURCE.logistics, 'ASYNC_CONSULT_COMMUNICATION_SCHEMA'),
    statementUnit(SOURCE.logistics, 'room-scoped read receipt foreign key', /ALTER\s+TABLE\s+public\.emergency_chat_participants\s+ADD\s+CONSTRAINT\s+emergency_chat_participants_last_read_message_id_fkey/i),
    statementUnit(SOURCE.logistics, 'validate room-scoped read receipt foreign key', /ALTER\s+TABLE\s+public\.emergency_chat_participants\s+VALIDATE\s+CONSTRAINT\s+emergency_chat_participants_last_read_message_id_fkey/i),
    statementUnit(SOURCE.security, 'emergency participant helper', /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.p_is_emergency_chat_participant\s*\(/i),
    statementUnit(SOURCE.security, 'safe UUID helper', /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.p_safe_uuid\s*\(/i),
    statementUnit(SOURCE.security, 'consult participant helper', /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.p_is_async_consult_participant\s*\(/i),
    statementUnit(SOURCE.security, 'schedule manager helper', /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.p_can_manage_doctor_schedule\s*\(/i),
  ];

  for (const name of [
    'p_safe_uuid',
    'p_is_emergency_chat_participant',
    'p_is_async_consult_participant',
    'p_can_manage_doctor_schedule',
  ]) {
    units.push(
      statementUnit(SOURCE.security, `revoke ${name}`, new RegExp(`REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+public\\.${name}\\s*\\(`, 'i')),
      statementUnit(SOURCE.security, `grant ${name}`, new RegExp(`GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.${name}\\s*\\(`, 'i'))
    );
  }

  for (const [table, name] of [
    ['emergency_chat_rooms', 'Users see emergency chat rooms in scope'],
    ['emergency_chat_participants', 'Users see emergency chat participants in scope'],
    ['emergency_chat_messages', 'Users see emergency chat messages in scope'],
  ]) {
    units.push(...policyPair(SOURCE.security, table, name));
    units.push(
      statementUnit(SOURCE.security, `grant read ${table}`, new RegExp(`GRANT\\s+SELECT\\s+ON\\s+public\\.${table}\\s+TO\\s+authenticated`, 'i')),
      statementUnit(SOURCE.security, `revoke anon ${table}`, new RegExp(`REVOKE\\s+SELECT,\\s*INSERT,\\s*UPDATE,\\s*DELETE\\s+ON\\s+public\\.${table}\\s+FROM\\s+anon`, 'i')),
      statementUnit(SOURCE.security, `revoke writes ${table}`, new RegExp(`REVOKE\\s+INSERT,\\s*UPDATE,\\s*DELETE\\s+ON\\s+public\\.${table}\\s+FROM\\s+authenticated`, 'i'))
    );
  }

  units.push(
    ...policyPair(SOURCE.security, 'visits', 'Users see own visits'),
    statementUnit(
      SOURCE.security,
      'drop legacy patient visit write policy',
      /DROP\s+POLICY\s+IF\s+EXISTS\s+"Users insert\/update own visits"\s+ON\s+public\.visits/i
    ),
    ...policyPair(SOURCE.security, 'visits', 'Users manage own standalone visits'),
    statementUnit(SOURCE.security, 'force private consult media bucket', /UPDATE\s+storage\.buckets\s+SET\s+public\s*=\s*false[\s\S]*?WHERE\s+id\s*=\s*'documents'/i),
    markerUnit(SOURCE.security, 'ASYNC_CONSULT_STORAGE_POLICIES')
  );

  for (const name of [
    'Public read doctor schedules',
    'Org Admins manage doctor schedules',
    'Clinicians read own doctor schedules',
  ]) {
    units.push(
      statementUnit(
        SOURCE.security,
        `drop ${name}`,
        new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${name}"\\s+ON\\s+public\\.doctor_schedules`, 'i')
      )
    );
  }
  units.push(
    statementUnit(SOURCE.security, 'create clinician schedule read policy', /CREATE\s+POLICY\s+"Clinicians read own doctor schedules"\s+ON\s+public\.doctor_schedules/i),
    ...policyPair(SOURCE.security, 'doctor_schedules', 'Schedule admins read scoped doctor schedules'),
    statementUnit(SOURCE.security, 'grant schedule reads', /GRANT\s+SELECT\s+ON\s+public\.doctor_schedules\s+TO\s+authenticated/i),
    statementUnit(SOURCE.security, 'revoke anonymous schedule reads', /REVOKE\s+SELECT\s+ON\s+public\.doctor_schedules\s+FROM\s+anon/i),
    statementUnit(SOURCE.security, 'revoke direct schedule mutations', /REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.doctor_schedules\s+FROM\s+anon,\s*authenticated/i),
    statementUnit(SOURCE.automations, 'schedule-aware emergency assignment', /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.auto_assign_doctor\s*\(\s*\)/i),
    statementUnit(SOURCE.automations, 'schedule-aware doctor failover', /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.handle_doctor_unavailability_failover\s*\(\s*\)/i),
    markerUnit(SOURCE.rpcs, 'SCHEDULED_VISITS_ASYNC_CONSULT_RPCS')
  );
  return units;
}

function uncomment(statement) {
  let value = statement.trimStart();
  while (value.startsWith('--') || value.startsWith('/*')) {
    if (value.startsWith('--')) {
      const end = value.indexOf('\n');
      value = end < 0 ? '' : value.slice(end + 1).trimStart();
    } else {
      const end = value.indexOf('*/');
      if (end < 0) throw new Error('Unterminated leading comment');
      value = value.slice(end + 2).trimStart();
    }
  }
  return value;
}

function classify(statement) {
  const upper = uncomment(statement).toUpperCase();
  if (/^(DELETE|TRUNCATE)\b/.test(upper)) return 'data-destructive';
  if (/^DROP\s+(TABLE|SCHEMA|TYPE)\b/.test(upper)) return 'data-destructive';
  if (/^ALTER\s+TABLE[\s\S]*\bDROP\s+COLUMN\b/.test(upper)) return 'data-destructive';
  if (/^UPDATE\b/.test(upper)) {
    return /^UPDATE\s+STORAGE\.BUCKETS\b/.test(upper) ? 'access-tightening' : 'data-destructive';
  }
  if (/^REVOKE\b/.test(upper)) return 'access-tightening';
  if (/^(DROP|CREATE)\s+POLICY\b/.test(upper)) return 'policy-replacement';
  if (/^DROP\s+(TRIGGER|FUNCTION)\b/.test(upper)) return 'metadata-replacement';
  if (/^ALTER\s+TABLE[\s\S]*\bDROP\s+CONSTRAINT\b/.test(upper)) return 'metadata-replacement';
  if (/^CREATE\s+OR\s+REPLACE\s+FUNCTION\b/.test(upper)) return 'metadata-replacement';
  return 'additive-or-idempotent';
}

function deployment() {
  const units = sourceUnits();
  const allStatements = units.flatMap((unit) => splitSql(unit.sql));
  const rollbackStatements = units
    .filter((unit) => !rollbackExcludedLabels.has(unit.label))
    .flatMap((unit) => splitSql(unit.sql));
  const safety = allStatements.reduce((result, statement) => {
    const category = classify(statement);
    result[category] = (result[category] || 0) + 1;
    return result;
  }, {});
  if (safety['data-destructive']) throw new Error('Deployment contains data-destructive SQL');
  const digest = crypto
    .createHash('sha256')
    .update(units.map((unit) => `${unit.file}:${unit.label}\n${unit.sql}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const migration = [
    '-- Temporary exact-source deployment for SCC-059 scheduled visits and async consults.',
    '-- Delete after apply, then repair only this temporary remote history entry as reverted.',
    `-- Source digest: ${digest}`,
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '120s';",
    ...units.map((unit) => `\n-- Source: ${unit.file} (${unit.label})\n${unit.sql.trim()};\n`),
    'COMMIT;',
  ].join('\n');
  return { allStatements, digest, migration, rollbackStatements, safety, units };
}

function dynamic(statement, indexValue) {
  const tag = `$ivisit_scheduled_stmt_${indexValue}$`;
  if (statement.includes(tag)) throw new Error(`Dynamic SQL tag collision at ${indexValue}`);
  return `EXECUTE ${tag}${statement};${tag};`;
}

function rollbackSql(bundle) {
  const body = bundle.rollbackStatements.map(dynamic).join('\n');
  const checks = postDeployChecks
    .filter((item) => !rollbackExcludedChecks.has(item.name))
    .map(
      (item, indexValue) => `IF NOT COALESCE((${item.expression}), FALSE) THEN
  RAISE EXCEPTION 'SCHEDULED_CONTRACT_ASSERTION_${indexValue + 1}: ${item.name.replaceAll("'", "''")}';
END IF;`
    )
    .join('\n');
  return `DO $ivisit_scheduled_bundle$
BEGIN
${body}
${checks}
RAISE EXCEPTION 'IVISIT_SCHEDULED_DEPLOYMENT_ROLLBACK_OK';
END
$ivisit_scheduled_bundle$;`;
}

async function preflight() {
  const results = [];
  for (const [indexValue, item] of preflightChecks.entries()) {
    const { data, error } = await admin.rpc('exec_sql', {
      sql: probeSql(indexValue, item.expression, 'preflight'),
    });
    if (error) throw error;
    results.push({
      name: item.name,
      pass: String(data?.error || '').includes('IVISIT_SCHEDULED_CONTRACT_PASS'),
    });
  }
  const failures = results.filter((result) => !result.pass);
  console.log(`[scheduled-visits-deployment] target=${projectRef} preflight=${results.length - failures.length}/${results.length}`);
  for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}`);
  if (failures.length) throw new Error(`Preflight failed for ${failures.length} contract(s)`);

  const counts = {};
  for (const table of [
    'doctor_schedules',
    'visits',
    'emergency_chat_rooms',
    'emergency_chat_participants',
    'emergency_chat_messages',
  ]) {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    counts[table] = count || 0;
  }
  console.log(`[scheduled-visits-deployment] lock-scope=${JSON.stringify(counts)}`);
}

async function run() {
  const bundle = deployment();
  console.log(
    `[scheduled-visits-deployment] source=${bundle.digest} units=${bundle.units.length} statements=${bundle.allStatements.length} safety=${JSON.stringify(bundle.safety)}`
  );
  await preflight();
  if (preflightOnly) return;
  if (migrationOutput) {
    const output = path.resolve(ROOT, migrationOutput);
    fs.writeFileSync(output, `${bundle.migration}\n`, 'utf8');
    console.log(`[scheduled-visits-deployment] emitted=${output}`);
    return;
  }
  console.log(
    `[scheduled-visits-deployment] target=${projectRef} mode=rollback statements=${bundle.rollbackStatements.length}/${bundle.allStatements.length}`
  );
  const { data, error } = await admin.rpc('exec_sql', { sql: rollbackSql(bundle) });
  if (error) throw error;
  if (!String(data?.error || '').includes('IVISIT_SCHEDULED_DEPLOYMENT_ROLLBACK_OK')) {
    throw new Error(data?.error || 'Rollback deployment did not return its success marker');
  }
  console.log('[scheduled-visits-deployment] Catalog assertions passed and all DDL rolled back.');
}

run().catch((error) => {
  console.error(`[scheduled-visits-deployment] ${error.message}`);
  process.exit(1);
});
