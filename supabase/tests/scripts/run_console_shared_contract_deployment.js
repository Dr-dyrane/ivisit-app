#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { checks } = require('./assert_console_shared_contracts_live.js');

const ROOT = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.argv
  .find((argument) => argument.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);
const migrationOutput = process.argv
  .find((argument) => argument.startsWith('--emit-migration='))
  ?.slice('--emit-migration='.length);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[console-shared-deployment] Missing Supabase URL or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('[console-shared-deployment] Refusing to target an unconfirmed project reference.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sourceBlocks = [
  ['supabase/migrations/20260219000400_finance.sql', 'CONSOLE_SHARED_PAYMENT_RETRY'],
  ['supabase/migrations/20260219000500_ops_content.sql', 'CONSOLE_SUPPORT_TICKET_CONSTRAINTS'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_INSURANCE_RLS'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_AMBULANCE_RLS'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_DOCTOR_RLS_GRANTS'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_SUPPORT_TICKET_RLS'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_SHARED_STORAGE_POLICIES'],
  ['supabase/migrations/20260219000800_emergency_logic.sql', 'CONSOLE_PAYMENT_RETRY_TRANSITION'],
  ['supabase/migrations/20260219000900_automations.sql', 'CONSOLE_DOCTOR_PROFILE_GUARD'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'CONSOLE_NEARBY_AMBULANCES_RPC'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'CONSOLE_HOSPITAL_UPDATE_RPC'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'CONSOLE_ORG_STRIPE_STATUS_RPC'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'CONSOLE_CASH_ELIGIBILITY_RPC'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'CONSOLE_EMERGENCY_CREATE_VISIT_RPC'],
];
const rollbackExcludedMarkers = new Set(['CONSOLE_SHARED_STORAGE_POLICIES']);
const rollbackExcludedChecks = new Set([
  'onboarding evidence storage is private and path-scoped',
  'shared image storage is public-read and owner-write',
]);

function extractMarkedBlock(relativeFile, marker) {
  const source = fs.readFileSync(path.join(ROOT, relativeFile), 'utf8');
  const begin = `-- BEGIN ${marker}`;
  const end = `-- END ${marker}`;
  const startIndex = source.indexOf(begin);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Missing or invalid ${marker} markers in ${relativeFile}`);
  }
  return source.slice(startIndex + begin.length, endIndex).trim();
}

function splitSqlStatements(source) {
  const statements = [];
  let buffer = '';
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockCommentDepth = 0;
  let dollarTag = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      buffer += char;
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockCommentDepth > 0) {
      buffer += char;
      if (char === '/' && next === '*') {
        buffer += next;
        blockCommentDepth += 1;
        index += 1;
      } else if (char === '*' && next === '/') {
        buffer += next;
        blockCommentDepth -= 1;
        index += 1;
      }
      continue;
    }
    if (dollarTag) {
      if (source.startsWith(dollarTag, index)) {
        buffer += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = null;
      } else {
        buffer += char;
      }
      continue;
    }
    if (singleQuoted) {
      buffer += char;
      if (char === "'" && next === "'") {
        buffer += next;
        index += 1;
      } else if (char === "'") {
        singleQuoted = false;
      }
      continue;
    }
    if (doubleQuoted) {
      buffer += char;
      if (char === '"' && next === '"') {
        buffer += next;
        index += 1;
      } else if (char === '"') {
        doubleQuoted = false;
      }
      continue;
    }
    if (char === '-' && next === '-') {
      buffer += char + next;
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      buffer += char + next;
      blockCommentDepth = 1;
      index += 1;
      continue;
    }
    if (char === "'") {
      buffer += char;
      singleQuoted = true;
      continue;
    }
    if (char === '"') {
      buffer += char;
      doubleQuoted = true;
      continue;
    }
    if (char === '$') {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        buffer += dollarTag;
        index += dollarTag.length - 1;
        continue;
      }
    }
    if (char === ';') {
      if (buffer.trim()) statements.push(buffer.trim());
      buffer = '';
      continue;
    }
    buffer += char;
  }

  if (buffer.trim()) statements.push(buffer.trim());
  if (singleQuoted || doubleQuoted || blockCommentDepth || dollarTag) {
    throw new Error('SQL splitter reached the end of an unterminated construct');
  }
  return statements;
}

function executeStatement(statement, index) {
  const tag = `$ivisit_shared_stmt_${index}$`;
  if (statement.includes(tag)) {
    throw new Error(`Unexpected dynamic SQL tag collision at statement ${index}`);
  }
  return `EXECUTE ${tag}${statement};${tag};`;
}

function readSourceBlocks() {
  return sourceBlocks.map(([file, marker]) => ({
    file,
    marker,
    sql: extractMarkedBlock(file, marker),
  }));
}

function buildDeployment() {
  const blocks = readSourceBlocks();
  const statements = blocks.flatMap((block) => splitSqlStatements(block.sql));
  const rollbackStatements = blocks
    .filter((block) => !rollbackExcludedMarkers.has(block.marker))
    .flatMap((block) => splitSqlStatements(block.sql));
  const sourceDigest = crypto
    .createHash('sha256')
    .update(blocks.map((block) => `${block.file}:${block.marker}\n${block.sql}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const migrationSql = [
    '-- Temporary exact-source deployment generated by run_console_shared_contract_deployment.js.',
    '-- Delete this migration after apply, then repair its remote history entry as reverted.',
    ...blocks.map(
      (block) => `\n-- Source: ${block.file} (${block.marker})\n${block.sql.trim()}\n`
    ),
  ].join('\n');
  return { blocks, statements, rollbackStatements, sourceDigest, migrationSql };
}

function buildRollbackSql(deployment) {
  const body = deployment.rollbackStatements.map(executeStatement).join('\n');
  const assertions = checks
    .filter((contract) => !rollbackExcludedChecks.has(contract.name))
    .map(
      (contract, index) => `
IF NOT COALESCE((${contract.expression}), FALSE) THEN
    RAISE EXCEPTION 'CONTRACT_ASSERTION_${index + 1}';
END IF;`
    )
    .join('\n');
  return `DO $ivisit_shared_bundle$
BEGIN
${body}
${assertions}
RAISE EXCEPTION 'IVISIT_CONSOLE_SHARED_DEPLOYMENT_ROLLBACK_OK';
END
$ivisit_shared_bundle$;`;
}

async function run() {
  const deployment = buildDeployment();
  if (migrationOutput) {
    const absoluteOutput = path.resolve(ROOT, migrationOutput);
    fs.writeFileSync(absoluteOutput, `${deployment.migrationSql}\n`, 'utf8');
    console.log(
      `[console-shared-deployment] emitted=${absoluteOutput} statements=${deployment.statements.length} source=${deployment.sourceDigest}`
    );
    return;
  }

  console.log(
    `[console-shared-deployment] target=${projectRef} mode=rollback statements=${deployment.rollbackStatements.length}/${deployment.statements.length} source=${deployment.sourceDigest}`
  );
  const { data, error } = await admin.rpc('exec_sql', {
    sql: buildRollbackSql(deployment),
  });
  if (error) throw error;
  if (!String(data?.error || '').includes('IVISIT_CONSOLE_SHARED_DEPLOYMENT_ROLLBACK_OK')) {
    throw new Error(data?.error || 'rollback deployment did not return its success marker');
  }
  console.log('[console-shared-deployment] All catalog assertions passed and DDL rolled back.');
}

run().catch((error) => {
  console.error(`[console-shared-deployment] ${error.message}`);
  process.exit(1);
});
