#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

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
const authorityHotfixOutput = process.argv
  .find((value) => value.startsWith('--emit-authority-hotfix='))
  ?.slice('--emit-authority-hotfix='.length);
const lintHotfixOutput = process.argv
  .find((value) => value.startsWith('--emit-lint-hotfix='))
  ?.slice('--emit-lint-hotfix='.length);
const finalAuthorizationHotfixOutput = process.argv
  .find((value) => value.startsWith('--emit-final-auth-hotfix='))
  ?.slice('--emit-final-auth-hotfix='.length);
const readinessNullHotfixOutput = process.argv
  .find((value) => value.startsWith('--emit-readiness-null-hotfix='))
  ?.slice('--emit-readiness-null-hotfix='.length);
const compatibilityTelemetryHotfixOutput = process.argv
  .find((value) => value.startsWith('--emit-compat-telemetry-hotfix='))
  ?.slice('--emit-compat-telemetry-hotfix='.length);
const cashNotificationHotfixOutput = process.argv
  .find((value) => value.startsWith('--emit-cash-notification-hotfix='))
  ?.slice('--emit-cash-notification-hotfix='.length);
const preflightOnly = process.argv.includes('--preflight-only');
const postDeployOnly = process.argv.includes('--post-deploy-only');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[emergency-dispatch-deployment] Missing Supabase URL or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || projectRef !== expectedProjectRef) {
  console.error('[emergency-dispatch-deployment] Refusing to target an unconfirmed project reference.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SOURCE = {
  infra: 'supabase/migrations/20260219000000_infra.sql',
  identity: 'supabase/migrations/20260219000100_identity.sql',
  org: 'supabase/migrations/20260219000200_org_structure.sql',
  logistics: 'supabase/migrations/20260219000300_logistics.sql',
  finance: 'supabase/migrations/20260219000400_finance.sql',
  ops: 'supabase/migrations/20260219000500_ops_content.sql',
  security: 'supabase/migrations/20260219000700_security.sql',
  emergency: 'supabase/migrations/20260219000800_emergency_logic.sql',
  automations: 'supabase/migrations/20260219000900_automations.sql',
  rpcs: 'supabase/migrations/20260219010000_core_rpcs.sql',
};

function readSource(relativeFile) {
  return fs.readFileSync(path.join(ROOT, relativeFile), 'utf8');
}

function splitSql(source) {
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
      if (buffer.trim()) statements.push(`${buffer.trim()};`);
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

function markerUnit(file, marker) {
  const source = readSource(file);
  const begin = `-- BEGIN ${marker}`;
  const end = `-- END ${marker}`;
  const startIndex = source.indexOf(begin);
  const endIndex = source.indexOf(end, startIndex + begin.length);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Missing or invalid ${marker} markers in ${file}`);
  }
  return {
    file,
    label: marker,
    sql: source.slice(startIndex + begin.length, endIndex).trim(),
  };
}

function statementUnit(file, label, pattern, occurrence = 0) {
  const matches = splitSql(readSource(file)).filter((statement) => pattern.test(uncomment(statement)));
  if (matches.length <= occurrence) {
    throw new Error(`Missing ${label} statement ${occurrence + 1} in ${file}`);
  }
  return { file, label, sql: matches[occurrence] };
}

function functionUnit(file, name, occurrence = 0) {
  return statementUnit(
    file,
    `${name} function${occurrence ? ` ${occurrence + 1}` : ''}`,
    new RegExp(`^CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${name}\\s*\\(`, 'i'),
    occurrence
  );
}

function policyUnits(file, name, { create = true } = {}) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const units = [
    statementUnit(
      file,
      `drop policy ${name}`,
      new RegExp(`^DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${escaped}"`, 'i')
    ),
  ];
  if (create) {
    units.push(
      statementUnit(
        file,
        `create policy ${name}`,
        new RegExp(`^CREATE\\s+POLICY\\s+"${escaped}"`, 'i')
      )
    );
  }
  return units;
}

function sourceUnits() {
  const units = [
    markerUnit(SOURCE.automations, 'LIVE_EMERGENCY_RELATIONSHIP_RECONCILIATION'),
    statementUnit(
      SOURCE.org,
      'one active doctor assignment per emergency',
      /^CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_eda_one_active_assignment_per_request\b/i
    ),
    markerUnit(SOURCE.logistics, 'EMERGENCY_RESPONDER_TELEMETRY_SCHEMA'),
    markerUnit(SOURCE.logistics, 'EMERGENCY_RESPONDER_ASSIGNMENT_SCHEMA'),
    statementUnit(
      SOURCE.logistics,
      'one visit per emergency request',
      /^CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_visits_one_per_emergency_request\b/i
    ),
    functionUnit(SOURCE.logistics, 'update_ambulance_location'),
    statementUnit(
      SOURCE.logistics,
      'revoke direct ambulance location function access',
      /^REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.update_ambulance_location\b/i
    ),
    statementUnit(
      SOURCE.logistics,
      'grant scoped ambulance location function access',
      /^GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.update_ambulance_location\b/i
    ),
    markerUnit(SOURCE.finance, 'EMERGENCY_PAYMENT_IDEMPOTENCY_SCHEMA'),
    markerUnit(SOURCE.finance, 'STRIPE_WEBHOOK_EVENT_RECEIPTS'),
    functionUnit(SOURCE.finance, 'process_payment_distribution'),
    functionUnit(SOURCE.finance, 'process_wallet_payment'),
    statementUnit(
      SOURCE.finance,
      'one insurance billing row per emergency request',
      /^CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_insurance_billing_one_per_request\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'notification event key column',
      /^ALTER\s+TABLE\s+public\.notifications\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+event_key\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'notification event identity index',
      /^CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+notifications_recipient_event_key_uidx\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'notification event key comment',
      /^COMMENT\s+ON\s+COLUMN\s+public\.notifications\.event_key\b/i
    ),
    functionUnit(SOURCE.ops, 'emit_canonical_notification'),
    statementUnit(
      SOURCE.ops,
      'revoke client canonical notification emitter',
      /^REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.emit_canonical_notification\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'grant backend canonical notification emitter',
      /^GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.emit_canonical_notification\b/i
    ),
    functionUnit(SOURCE.ops, 'notify_canonical_payment_status_change'),
    statementUnit(
      SOURCE.ops,
      'revoke payment notification trigger function',
      /^REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.notify_canonical_payment_status_change\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'grant payment notification trigger function',
      /^GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.notify_canonical_payment_status_change\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'drop payment status notification trigger',
      /^DROP\s+TRIGGER\s+IF\s+EXISTS\s+notify_payment_status_change\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'create payment status notification trigger',
      /^CREATE\s+TRIGGER\s+notify_payment_status_change\b/i
    ),
    functionUnit(SOURCE.ops, 'notify_emergency_events'),
    statementUnit(
      SOURCE.ops,
      'revoke emergency notification trigger function',
      /^REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.notify_emergency_events\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'drop emergency notification trigger',
      /^DROP\s+TRIGGER\s+IF\s+EXISTS\s+on_emergency_notification\b/i
    ),
    statementUnit(
      SOURCE.ops,
      'create emergency notification trigger',
      /^CREATE\s+TRIGGER\s+on_emergency_notification\b/i
    ),
    statementUnit(
      SOURCE.security,
      'enable responder assignment RLS',
      /^ALTER\s+TABLE\s+public\.emergency_responder_assignments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    ),
    statementUnit(
      SOURCE.security,
      'enable ambulance staffing RLS',
      /^ALTER\s+TABLE\s+public\.ambulance_staff_assignments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    ),
    ...policyUnits(SOURCE.security, 'Users see own emergency requests'),
    ...policyUnits(SOURCE.security, 'Assigned responders see their emergency requests'),
    ...policyUnits(SOURCE.security, 'Users can create emergency requests', { create: false }),
    ...policyUnits(SOURCE.security, 'Users can update own emergency requests', { create: false }),
    ...policyUnits(SOURCE.security, 'Org Admins see their hospital emergencies'),
    statementUnit(
      SOURCE.security,
      'revoke direct emergency request writes',
      /^REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+TABLE\s+public\.emergency_requests\b/i
    ),
    ...policyUnits(SOURCE.security, 'Emergency responder assignments are readable in role scope'),
    statementUnit(
      SOURCE.security,
      'grant responder assignment reads',
      /^GRANT\s+SELECT\s+ON\s+public\.emergency_responder_assignments\b/i
    ),
    statementUnit(
      SOURCE.security,
      'revoke responder assignment writes',
      /^REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.emergency_responder_assignments\b/i
    ),
    ...policyUnits(SOURCE.security, 'Ambulance staffing is readable in role scope'),
    statementUnit(
      SOURCE.security,
      'grant ambulance staffing reads',
      /^GRANT\s+SELECT\s+ON\s+public\.ambulance_staff_assignments\b/i
    ),
    statementUnit(
      SOURCE.security,
      'revoke ambulance staffing writes',
      /^REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.ambulance_staff_assignments\b/i
    ),
    ...policyUnits(SOURCE.security, 'Users insert own notifications', { create: false }),
    statementUnit(
      SOURCE.security,
      'revoke client notification writes',
      /^REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.notifications\b/i
    ),
    statementUnit(
      SOURCE.security,
      'grant notification reads',
      /^GRANT\s+SELECT\s+ON\s+public\.notifications\b/i
    ),
    statementUnit(
      SOURCE.security,
      'grant notification read-state updates',
      /^GRANT\s+UPDATE\s*\(\s*read,\s*updated_at\s*\)\s+ON\s+public\.notifications\b/i
    ),
    ...policyUnits(SOURCE.security, 'Public read for ambulances', { create: false }),
    ...policyUnits(SOURCE.security, 'Ambulances are visible in role scope'),
    markerUnit(SOURCE.security, 'CONSOLE_AMBULANCE_RLS'),
    functionUnit(SOURCE.emergency, 'get_available_ambulances'),
    functionUnit(SOURCE.emergency, 'validate_emergency_request'),
    functionUnit(SOURCE.emergency, 'create_emergency_v4'),
    markerUnit(SOURCE.emergency, 'EMERGENCY_PAYMENT_RELEASE_GATE'),
    functionUnit(SOURCE.emergency, 'complete_card_payment'),
    functionUnit(SOURCE.emergency, 'fail_card_payment'),
    functionUnit(SOURCE.emergency, 'update_ambulance_status', 1),
    functionUnit(SOURCE.emergency, 'is_valid_emergency_status_transition'),
    statementUnit(
      SOURCE.emergency,
      'revoke public ambulance availability RPC',
      /^REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.get_available_ambulances\b/i
    ),
    statementUnit(
      SOURCE.emergency,
      'grant authenticated ambulance availability RPC',
      /^GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_available_ambulances\b/i
    ),
    statementUnit(
      SOURCE.emergency,
      'revoke direct ambulance status RPC',
      /^REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.update_ambulance_status\b/i
    ),
    statementUnit(
      SOURCE.emergency,
      'grant backend ambulance status RPC',
      /^GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.update_ambulance_status\b/i
    ),
    functionUnit(SOURCE.automations, 'auto_assign_driver'),
    functionUnit(SOURCE.automations, 'create_insurance_billing_on_completion'),
    functionUnit(SOURCE.automations, 'update_resource_availability'),
    functionUnit(SOURCE.automations, 'handle_ambulance_unavailability_failover'),
    statementUnit(
      SOURCE.automations,
      'realtime publication parity',
      /^DO\s+\$\$\s*DECLARE\s+v_table\s+TEXT;[\s\S]*?v_targets\s+TEXT\[\]/i
    ),
    markerUnit(SOURCE.rpcs, 'CONSOLE_NEARBY_AMBULANCES_RPC'),
    functionUnit(SOURCE.rpcs, 'notify_cash_approval_org_admins_internal'),
    functionUnit(SOURCE.rpcs, 'notify_cash_approval_org_admins'),
    functionUnit(SOURCE.rpcs, 'process_wallet_payment'),
    functionUnit(SOURCE.rpcs, 'jsonb_to_point_geometry'),
    markerUnit(SOURCE.rpcs, 'EMERGENCY_RESPONDER_READINESS_RPCS'),
    markerUnit(SOURCE.rpcs, 'CONSOLE_EMERGENCY_CREATE_VISIT_RPC'),
    functionUnit(SOURCE.rpcs, 'console_update_emergency_request'),
    functionUnit(SOURCE.rpcs, 'console_accept_bed_emergency'),
    statementUnit(
      SOURCE.rpcs,
      'revoke public bed acceptance command',
      /^REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.console_accept_bed_emergency\b/i
    ),
    statementUnit(
      SOURCE.rpcs,
      'grant scoped bed acceptance command',
      /^GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.console_accept_bed_emergency\b/i
    ),
    functionUnit(SOURCE.rpcs, 'console_dispatch_emergency'),
    functionUnit(SOURCE.rpcs, 'console_complete_emergency'),
    functionUnit(SOURCE.rpcs, 'console_cancel_emergency'),
    functionUnit(SOURCE.rpcs, 'console_update_responder_location'),
    functionUnit(SOURCE.rpcs, 'patient_update_emergency_request'),
    functionUnit(SOURCE.rpcs, 'assign_ambulance_to_emergency'),
    functionUnit(SOURCE.rpcs, 'auto_assign_ambulance'),
    functionUnit(SOURCE.rpcs, 'approve_cash_payment'),
    functionUnit(SOURCE.rpcs, 'decline_cash_payment'),
    functionUnit(SOURCE.rpcs, 'complete_trip', 1),
    functionUnit(SOURCE.rpcs, 'cancel_trip', 1),
    functionUnit(SOURCE.rpcs, 'book_scheduled_visit'),
    functionUnit(SOURCE.rpcs, 'transition_scheduled_visit'),
    functionUnit(SOURCE.rpcs, 'send_async_consult_message'),
  ];
  return units;
}

function classify(statement, label) {
  const upper = uncomment(statement).toUpperCase();
  if (label === 'LIVE_EMERGENCY_RELATIONSHIP_RECONCILIATION'
      && /^(UPDATE|DELETE|DO)\b/.test(upper)) {
    if (/^DO\b/.test(upper)) {
      const visitAuditSignals = [
        'RECONCILE_DUPLICATE_EMERGENCY_VISIT',
        'INSERT INTO PUBLIC.ADMIN_AUDIT_LOG',
        'DELETE FROM PUBLIC.VISITS',
      ];
      const insuranceAuditSignals = [
        'RECONCILE_DUPLICATE_INSURANCE_BILLING',
        'INSERT INTO PUBLIC.ADMIN_AUDIT_LOG',
        'DELETE FROM PUBLIC.INSURANCE_BILLING',
      ];
      const isAuditedVisitReconciliation = visitAuditSignals.every((signal) => upper.includes(signal));
      const isAuditedInsuranceReconciliation = insuranceAuditSignals.every((signal) => upper.includes(signal));
      if (!isAuditedVisitReconciliation && !isAuditedInsuranceReconciliation) {
        return 'data-destructive';
      }
    }
    return 'audited-canonicalization';
  }
  if (/^(DELETE|TRUNCATE)\b/.test(upper)) return 'data-destructive';
  if (/^DROP\s+(TABLE|SCHEMA|TYPE)\b/.test(upper)) return 'data-destructive';
  if (/^ALTER\s+TABLE[\s\S]*\bDROP\s+COLUMN\b/.test(upper)) return 'data-destructive';
  if (/^UPDATE\b/.test(upper)) {
    if (/^UPDATE\s+PUBLIC\.EMERGENCY_RESPONDER_ASSIGNMENTS\b/.test(upper)) return 'null-only-backfill';
    return 'data-destructive';
  }
  if (/^REVOKE\b/.test(upper)) return 'access-tightening';
  if (/^(DROP|CREATE)\s+POLICY\b/.test(upper)) return 'policy-replacement';
  if (/^DROP\s+(TRIGGER|FUNCTION)\b/.test(upper)) return 'metadata-replacement';
  if (/^ALTER\s+TABLE[\s\S]*\bDROP\s+CONSTRAINT\b/.test(upper)) return 'metadata-replacement';
  if (/^CREATE\s+OR\s+REPLACE\s+FUNCTION\b/.test(upper)) return 'metadata-replacement';
  if (/^DO\b/.test(upper)) return 'guarded-metadata';
  return 'additive-or-idempotent';
}

function buildDeployment() {
  const units = sourceUnits();
  const statementEntries = units.flatMap((unit) =>
    splitSql(unit.sql).map((statement) => ({ statement, label: unit.label }))
  );
  const safety = statementEntries.reduce((result, entry) => {
    const category = classify(entry.statement, entry.label);
    result[category] = (result[category] || 0) + 1;
    return result;
  }, {});
  if (safety['data-destructive']) {
    const destructiveLabels = statementEntries
      .filter((entry) => classify(entry.statement, entry.label) === 'data-destructive')
      .map((entry) => entry.label);
    throw new Error(
      `Deployment contains data-destructive SQL outside the audited contract: ${destructiveLabels.join(', ')}`
    );
  }
  if ((safety['null-only-backfill'] || 0) > 1) {
    throw new Error('Deployment contains an unexpected data backfill');
  }

  const digest = crypto
    .createHash('sha256')
    .update(units.map((unit) => `${unit.file}:${unit.label}\n${unit.sql}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const migration = [
    '-- Permanent exact-source deployment for emergency dispatch production readiness.',
    '-- Retained to preserve live migration provenance for the consolidated source delta.',
    `-- Source digest: ${digest}`,
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '180s';",
    ...units.map((unit) => `\n-- Source: ${unit.file} (${unit.label})\n${unit.sql.trim()}\n`),
    'COMMIT;',
  ].join('\n');

  return {
    digest,
    migration,
    safety,
    statementEntries,
    statements: statementEntries.map((entry) => entry.statement),
    units,
  };
}

function buildAuthorityHotfix() {
  const units = [
    functionUnit(SOURCE.infra, 'exec_sql'),
    functionUnit(SOURCE.emergency, 'get_available_ambulances'),
    functionUnit(SOURCE.rpcs, 'report_responder_telemetry'),
    functionUnit(SOURCE.rpcs, 'console_create_emergency_request'),
    functionUnit(SOURCE.rpcs, 'console_dispatch_emergency'),
    functionUnit(SOURCE.rpcs, 'console_complete_emergency'),
    functionUnit(SOURCE.rpcs, 'assign_ambulance_to_emergency'),
  ];
  const digest = crypto
    .createHash('sha256')
    .update(units.map((unit) => `${unit.file}:${unit.label}\n${unit.sql}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const aclStatements = [
    'REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC, anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role',
  ];
  const statementEntries = [
    ...units.flatMap((unit) =>
      splitSql(unit.sql).map((statement) => ({ statement, label: unit.label }))
    ),
    ...aclStatements.map((statement) => ({ statement, label: 'exec_sql authority ACL' })),
  ];
  const migration = [
    '-- Permanent authority and input-hardening hotfix for emergency dispatch.',
    `-- Source digest: ${digest}`,
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '180s';",
    ...units.map((unit) => `\n-- Source: ${unit.file} (${unit.label})\n${unit.sql.trim()}\n`),
    ...aclStatements.map((statement) => `${statement};`),
    'COMMIT;',
  ].join('\n');
  return { digest, migration, statementEntries, statements: statementEntries.map((entry) => entry.statement), units };
}

function buildLintHotfix() {
  const units = [
    functionUnit(SOURCE.identity, 'update_medical_profile'),
    functionUnit(SOURCE.logistics, 'calculate_ambulance_eta'),
    functionUnit(SOURCE.ops, 'process_insurance_claim'),
    functionUnit(SOURCE.rpcs, 'search_auth_users'),
  ];
  const metadataStatements = [
    'REVOKE ALL ON FUNCTION public.update_medical_profile(UUID, JSONB) FROM PUBLIC, anon',
    'GRANT EXECUTE ON FUNCTION public.update_medical_profile(UUID, JSONB) TO authenticated, service_role',
    'REVOKE ALL ON FUNCTION public.calculate_ambulance_eta(UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.calculate_ambulance_eta(UUID, NUMERIC, NUMERIC) TO service_role',
    'REVOKE ALL ON FUNCTION public.process_insurance_claim(UUID, UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.process_insurance_claim(UUID, UUID, UUID, NUMERIC) TO service_role',
    'ALTER TABLE public.emergency_requests VALIDATE CONSTRAINT emergency_requests_payment_id_fkey',
    'DROP FUNCTION IF EXISTS public._tmp_parse_test(UUID)',
  ];
  const statementEntries = [
    ...units.flatMap((unit) =>
      splitSql(unit.sql).map((statement) => ({ statement, label: unit.label }))
    ),
    ...metadataStatements.map((statement) => ({ statement, label: 'live schema lint repair' })),
  ];
  const digest = crypto
    .createHash('sha256')
    .update([
      ...units.map((unit) => `${unit.file}:${unit.label}\n${unit.sql}`),
      ...metadataStatements,
    ].join('\n'))
    .digest('hex')
    .slice(0, 16);
  const migration = [
    '-- Permanent callable-contract and lint repair for production emergency support.',
    `-- Source digest: ${digest}`,
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '180s';",
    ...units.map((unit) => `\n-- Source: ${unit.file} (${unit.label})\n${unit.sql.trim()}\n`),
    ...metadataStatements.map((statement) => `${statement};`),
    'COMMIT;',
  ].join('\n');
  return {
    digest,
    migration,
    statementEntries,
    statements: statementEntries.map((entry) => entry.statement),
    units,
  };
}

function buildFinalAuthorizationHotfix() {
  const units = [
    functionUnit(SOURCE.rpcs, 'ambulance_dispatch_readiness_snapshot'),
  ];
  const policyStatements = [
    'DROP POLICY IF EXISTS "Org Admins see org payments" ON public.payments',
    `CREATE POLICY "Org Admins see org payments"
ON public.payments FOR SELECT
TO authenticated
USING (
    public.p_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.profiles actor
        WHERE actor.id = auth.uid()
          AND actor.role = 'org_admin'
          AND actor.organization_id = payments.organization_id
    )
)`,
  ];
  const statementEntries = [
    ...units.flatMap((unit) =>
      splitSql(unit.sql).map((statement) => ({ statement, label: unit.label }))
    ),
    ...policyStatements.map((statement) => ({ statement, label: 'organization payment read policy' })),
  ];
  const digest = crypto
    .createHash('sha256')
    .update([
      ...units.map((unit) => `${unit.file}:${unit.label}\n${unit.sql}`),
      ...policyStatements,
    ].join('\n'))
    .digest('hex')
    .slice(0, 16);
  const migration = [
    '-- Permanent final organization-scope hardening for emergency dispatch.',
    `-- Source digest: ${digest}`,
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '180s';",
    ...units.map((unit) => `\n-- Source: ${unit.file} (${unit.label})\n${unit.sql.trim()}\n`),
    ...policyStatements.map((statement) => `${statement};`),
    'COMMIT;',
  ].join('\n');
  return {
    digest,
    migration,
    statementEntries,
    statements: statementEntries.map((entry) => entry.statement),
    units,
  };
}

function buildReadinessNullHotfix() {
  const units = [
    functionUnit(SOURCE.rpcs, 'ambulance_dispatch_readiness_snapshot'),
  ];
  const statementEntries = units.flatMap((unit) =>
    splitSql(unit.sql).map((statement) => ({ statement, label: unit.label }))
  );
  const digest = crypto
    .createHash('sha256')
    .update(units.map((unit) => `${unit.file}:${unit.label}\n${unit.sql}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const migration = [
    '-- Permanent null-safe readiness evaluation for unassigned ambulances.',
    `-- Source digest: ${digest}`,
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '180s';",
    ...units.map((unit) => `\n-- Source: ${unit.file} (${unit.label})\n${unit.sql.trim()}\n`),
    'COMMIT;',
  ].join('\n');
  return {
    digest,
    migration,
    statementEntries,
    statements: statementEntries.map((entry) => entry.statement),
    units,
  };
}

function buildCompatibilityTelemetryHotfix() {
  const units = [
    functionUnit(SOURCE.rpcs, 'console_update_responder_location'),
  ];
  const statementEntries = units.flatMap((unit) =>
    splitSql(unit.sql).map((statement) => ({ statement, label: unit.label }))
  );
  const digest = crypto
    .createHash('sha256')
    .update(units.map((unit) => `${unit.file}:${unit.label}\n${unit.sql}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const migration = [
    '-- Permanent lifecycle guard for the Console telemetry compatibility command.',
    `-- Source digest: ${digest}`,
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '180s';",
    ...units.map((unit) => `\n-- Source: ${unit.file} (${unit.label})\n${unit.sql.trim()}\n`),
    'COMMIT;',
  ].join('\n');
  return {
    digest,
    migration,
    statementEntries,
    statements: statementEntries.map((entry) => entry.statement),
    units,
  };
}

function buildCashNotificationHotfix() {
  const units = [
    functionUnit(SOURCE.rpcs, 'notify_cash_approval_org_admins_internal'),
    functionUnit(SOURCE.rpcs, 'notify_cash_approval_org_admins'),
    functionUnit(SOURCE.emergency, 'create_emergency_v4'),
  ];
  const aclStatements = [
    'REVOKE ALL ON FUNCTION public.notify_cash_approval_org_admins_internal(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.notify_cash_approval_org_admins_internal(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) TO service_role',
    'REVOKE ALL ON FUNCTION public.notify_cash_approval_org_admins(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon',
    'GRANT EXECUTE ON FUNCTION public.notify_cash_approval_org_admins(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role',
  ];
  const statementEntries = [
    ...units.flatMap((unit) =>
      splitSql(unit.sql).map((statement) => ({ statement, label: unit.label }))
    ),
    ...aclStatements.map((statement) => ({ statement, label: 'cash notification authority ACL' })),
  ];
  const digest = crypto
    .createHash('sha256')
    .update([
      ...units.map((unit) => `${unit.file}:${unit.label}\n${unit.sql}`),
      ...aclStatements,
    ].join('\n'))
    .digest('hex')
    .slice(0, 16);
  const migration = [
    '-- Permanent cash-notification authority boundary for emergency dispatch.',
    `-- Source digest: ${digest}`,
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '180s';",
    ...units.map((unit) => `\n-- Source: ${unit.file} (${unit.label})\n${unit.sql.trim()}\n`),
    ...aclStatements.map((statement) => `${statement};`),
    'COMMIT;',
  ].join('\n');
  return {
    digest,
    migration,
    statementEntries,
    statements: statementEntries.map((entry) => entry.statement),
    units,
  };
}

const preflightChecks = [
  {
    name: 'required emergency owner tables exist',
    expression: `ARRAY[
      to_regclass('public.profiles'),
      to_regclass('public.organizations'),
      to_regclass('public.hospitals'),
      to_regclass('public.doctors'),
      to_regclass('public.ambulances'),
      to_regclass('public.emergency_requests'),
      to_regclass('public.visits'),
      to_regclass('public.payments'),
      to_regclass('public.wallet_ledger'),
      to_regclass('public.notifications')
    ]::regclass[] <@ ARRAY[
      to_regclass('public.profiles'),
      to_regclass('public.organizations'),
      to_regclass('public.hospitals'),
      to_regclass('public.doctors'),
      to_regclass('public.ambulances'),
      to_regclass('public.emergency_requests'),
      to_regclass('public.visits'),
      to_regclass('public.payments'),
      to_regclass('public.wallet_ledger'),
      to_regclass('public.notifications')
    ]::regclass[]
    AND to_regclass('public.profiles') IS NOT NULL
    AND to_regclass('public.emergency_requests') IS NOT NULL`,
  },
  {
    name: 'active doctor assignments are unique per emergency',
    expression: `NOT EXISTS (
      SELECT emergency_request_id
      FROM public.emergency_doctor_assignments
      WHERE status IN ('assigned', 'accepted')
      GROUP BY emergency_request_id
      HAVING COUNT(*) > 1
    )`,
  },
  {
    name: 'existing duplicate visits are safely reconcilable',
    expression: `NOT EXISTS (
      SELECT request_id
      FROM public.visits
      WHERE request_id IS NOT NULL
      GROUP BY request_id
      HAVING COUNT(*) > 1
        AND (
          COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) > 1
          OR COUNT(DISTINCT hospital_id) FILTER (WHERE hospital_id IS NOT NULL) > 1
          OR COUNT(DISTINCT status) FILTER (WHERE status IS NOT NULL) > 1
          OR COUNT(DISTINCT type) FILTER (WHERE type IS NOT NULL) > 1
        )
    )`,
  },
  {
    name: 'existing open emergency settlements are unique',
    expression: `NOT EXISTS (
      SELECT emergency_request_id
      FROM public.payments
      WHERE emergency_request_id IS NOT NULL
        AND status IN ('pending', 'completed')
        AND COALESCE(metadata->>'payment_kind', 'service') = 'service'
      GROUP BY emergency_request_id
      HAVING COUNT(*) > 1
    )`,
  },
  {
    name: 'emergency payment references are valid',
    expression: `NOT EXISTS (
      SELECT 1
      FROM public.emergency_requests request
      LEFT JOIN public.payments payment ON payment.id = request.payment_id
      WHERE request.payment_id IS NOT NULL
        AND payment.id IS NULL
    )`,
  },
  {
    name: 'existing duplicate insurance rows are safely reconcilable',
    expression: `NOT EXISTS (
      SELECT emergency_request_id
      FROM public.insurance_billing
      WHERE emergency_request_id IS NOT NULL
      GROUP BY emergency_request_id
      HAVING COUNT(*) > 1
        AND (
          COUNT(DISTINCT status) > 1
          OR COUNT(DISTINCT total_amount) > 1
          OR COUNT(DISTINCT insurance_amount) > 1
          OR COUNT(DISTINCT user_amount) > 1
          OR COUNT(DISTINCT insurance_policy_id) FILTER (
            WHERE insurance_policy_id IS NOT NULL
          ) > 1
        )
    )`,
  },
];

const postDeployChecks = [
  {
    name: 'responder assignment and staffing tables exist',
    expression: `to_regclass('public.emergency_responder_assignments') IS NOT NULL
      AND to_regclass('public.ambulance_staff_assignments') IS NOT NULL`,
  },
  {
    name: 'dispatch telemetry columns exist',
    expression: `(SELECT COUNT(*) = 12 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'ambulances' AND column_name IN (
            'heading', 'location_accuracy_meters', 'location_observed_at',
            'location_received_at', 'telemetry_sequence', 'telemetry_lease_expires_at'
          ))
          OR
          (table_name = 'emergency_requests' AND column_name IN (
            'current_responder_assignment_id', 'dispatch_organization_id',
            'responder_location_accuracy_meters', 'responder_location_observed_at',
            'responder_location_received_at', 'responder_telemetry_sequence'
          ))
        ))`,
  },
  {
    name: 'dispatch lifecycle commands exist',
    expression: `to_regprocedure('public.responder_accept_emergency(uuid)') IS NOT NULL
      AND to_regprocedure('public.responder_arrive_emergency(uuid)') IS NOT NULL
      AND to_regprocedure('public.responder_complete_emergency(uuid)') IS NOT NULL
      AND to_regprocedure('public.responder_decline_emergency(uuid,text)') IS NOT NULL
      AND to_regprocedure('public.dispatcher_release_responder_assignment(uuid,text)') IS NOT NULL
      AND to_regprocedure('public.patient_acknowledge_responder_arrival(uuid)') IS NOT NULL`,
  },
  {
    name: 'dispatch readiness and telemetry commands exist',
    expression: `to_regprocedure('public.get_ambulance_dispatch_readiness(uuid,uuid)') IS NOT NULL
      AND to_regprocedure('public.get_eligible_ambulance_responders(uuid)') IS NOT NULL
      AND to_regprocedure('public.staff_ambulance_responder(uuid,uuid)') IS NOT NULL
      AND to_regprocedure('public.offer_responder_assignment(uuid,uuid,uuid,text)') IS NOT NULL
      AND to_regprocedure('public.report_responder_telemetry(jsonb)') IS NOT NULL
      AND to_regprocedure('public.get_driver_dispatch_feed()') IS NOT NULL`,
  },
  {
    name: 'server payment release gate exists',
    expression: `to_regprocedure('public.emergency_dispatch_payment_snapshot(uuid)') IS NOT NULL
      AND to_regprocedure('public.complete_card_payment(text,jsonb,numeric)') IS NOT NULL
      AND to_regprocedure('public.process_wallet_payment(uuid,numeric,uuid)') IS NOT NULL`,
  },
  {
    name: 'durable Stripe receipts exist',
    expression: `to_regclass('public.stripe_webhook_event_receipts') IS NOT NULL
      AND to_regprocedure('public.claim_stripe_webhook_event(text,text,text)') IS NOT NULL
      AND to_regprocedure('public.complete_stripe_webhook_event(text,uuid)') IS NOT NULL
      AND to_regprocedure('public.fail_stripe_webhook_event(text,uuid,text)') IS NOT NULL`,
  },
  {
    name: 'canonical notification ownership exists',
    expression: `EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'event_key'
    )
      AND to_regprocedure('public.emit_canonical_notification(text,uuid,text,text,text,text,text,uuid,jsonb,jsonb,text,text)') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.payments'::regclass
          AND tgname = 'notify_payment_status_change'
          AND NOT tgisinternal
      )`,
  },
  {
    name: 'cash approval notification fan-out is backend-owned and operator-gated',
    expression: `to_regprocedure('public.notify_cash_approval_org_admins_internal(uuid,uuid,numeric,numeric,text,text,text,uuid)') IS NOT NULL
      AND NOT has_function_privilege(
        'authenticated',
        'public.notify_cash_approval_org_admins_internal(uuid,uuid,numeric,numeric,text,text,text,uuid)',
        'EXECUTE'
      )
      AND has_function_privilege(
        'service_role',
        'public.notify_cash_approval_org_admins_internal(uuid,uuid,numeric,numeric,text,text,text,uuid)',
        'EXECUTE'
      )
      AND position(
        'v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')'
        in pg_get_functiondef('public.notify_cash_approval_org_admins(uuid,uuid,numeric,numeric,text,text,text,uuid)'::regprocedure)
      ) > 0
      AND position(
        'notify_cash_approval_org_admins_internal'
        in pg_get_functiondef('public.create_emergency_v4(uuid,jsonb,jsonb)'::regprocedure)
      ) > 0`,
  },
  {
    name: 'client roles cannot directly mutate lifecycle truth',
    expression: `NOT has_table_privilege('anon', 'public.emergency_requests', 'INSERT')
      AND NOT has_table_privilege('anon', 'public.emergency_requests', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.emergency_requests', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.emergency_requests', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.emergency_responder_assignments', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.emergency_responder_assignments', 'UPDATE')`,
  },
  {
    name: 'notification writes are backend owned',
    expression: `NOT has_table_privilege('anon', 'public.notifications', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.notifications', 'INSERT')
      AND has_table_privilege('authenticated', 'public.notifications', 'SELECT')`,
  },
  {
    name: 'critical uniqueness indexes exist',
    expression: `(SELECT COUNT(*) = 6 FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'idx_eda_one_active_assignment_per_request',
          'idx_visits_one_per_emergency_request',
          'idx_payments_one_open_emergency_settlement',
          'idx_wallet_ledger_idempotency_key',
          'notifications_recipient_event_key_uidx',
          'idx_insurance_billing_one_per_request'
        ))`,
  },
  {
    name: 'emergency visit and insurance relationships are one to one',
    expression: `NOT EXISTS (
      SELECT request_id
      FROM public.visits
      WHERE request_id IS NOT NULL
      GROUP BY request_id
      HAVING COUNT(*) > 1
    )
      AND NOT EXISTS (
        SELECT emergency_request_id
        FROM public.insurance_billing
        WHERE emergency_request_id IS NOT NULL
        GROUP BY emergency_request_id
        HAVING COUNT(*) > 1
      )`,
  },
];

function dynamicStatement(statement, indexValue, label) {
  const tag = `$ivisit_emergency_stmt_${indexValue}$`;
  if (statement.includes(tag)) throw new Error(`Dynamic SQL tag collision at ${indexValue}`);
  return `BEGIN
  EXECUTE ${tag}${statement}${tag};
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'EMERGENCY_DEPLOYMENT_STATEMENT_${indexValue + 1} (${label.replaceAll("'", "''")}): %', SQLERRM;
END;`;
}

function dynamicCheck(check, indexValue) {
  const tag = `$ivisit_emergency_check_${indexValue}$`;
  return `EXECUTE ${tag}SELECT COALESCE((${check.expression}), FALSE)${tag} INTO v_pass;
IF NOT v_pass THEN
  RAISE EXCEPTION 'EMERGENCY_DEPLOYMENT_ASSERTION_${indexValue + 1}: ${check.name.replaceAll("'", "''")}';
END IF;`;
}

function rollbackSql(bundle) {
  const body = bundle.statementEntries
    .map((entry, indexValue) => dynamicStatement(entry.statement, indexValue, entry.label))
    .join('\n');
  const checks = postDeployChecks.map(dynamicCheck).join('\n');
  return `DO $ivisit_emergency_bundle$
DECLARE
  v_pass BOOLEAN;
BEGIN
${body}
${checks}
RAISE EXCEPTION 'IVISIT_EMERGENCY_DEPLOYMENT_ROLLBACK_OK';
END
$ivisit_emergency_bundle$;`;
}

function probeSql(check, indexValue, lane) {
  const normalizedLane = lane.toUpperCase().replaceAll('-', '_');
  const tag = `$ivisit_emergency_${lane.replaceAll('-', '_')}_${indexValue}$`;
  return `DO ${tag}
DECLARE
  v_pass BOOLEAN;
BEGIN
  SELECT COALESCE((${check.expression}), FALSE) INTO v_pass;
  IF NOT v_pass THEN
    RAISE EXCEPTION 'IVISIT_EMERGENCY_${normalizedLane}_FAIL';
  END IF;
  RAISE EXCEPTION 'IVISIT_EMERGENCY_${normalizedLane}_PASS';
END
${tag};`;
}

async function runChecks(checks, lane) {
  const marker = `IVISIT_EMERGENCY_${lane.toUpperCase().replaceAll('-', '_')}_PASS`;
  const results = [];
  for (const [indexValue, check] of checks.entries()) {
    const { data, error } = await admin.rpc('exec_sql', {
      sql: probeSql(check, indexValue, lane),
    });
    if (error) throw error;
    const message = String(data?.error || '');
    results.push({ name: check.name, pass: message.includes(marker) });
  }
  const failures = results.filter((result) => !result.pass);
  console.log(
    `[emergency-dispatch-deployment] target=${projectRef} ${lane}=${results.length - failures.length}/${results.length}`
  );
  for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}`);
  if (failures.length) throw new Error(`${lane} failed for ${failures.length} contract(s)`);
}

async function run() {
  const bundle = buildDeployment();
  console.log(
    `[emergency-dispatch-deployment] source=${bundle.digest} units=${bundle.units.length} statements=${bundle.statements.length} safety=${JSON.stringify(bundle.safety)}`
  );
  if (postDeployOnly) {
    await runChecks(postDeployChecks, 'post-deploy');
    return;
  }
  await runChecks(preflightChecks, 'preflight');
  if (preflightOnly) return;

  if (migrationOutput) {
    const output = path.resolve(ROOT, migrationOutput);
    fs.writeFileSync(output, `${bundle.migration}\n`, 'utf8');
    console.log(`[emergency-dispatch-deployment] emitted=${output}`);
    return;
  }

  if (authorityHotfixOutput) {
    const hotfix = buildAuthorityHotfix();
    const { data, error } = await admin.rpc('exec_sql', { sql: rollbackSql(hotfix) });
    if (error) throw error;
    if (!String(data?.error || '').includes('IVISIT_EMERGENCY_DEPLOYMENT_ROLLBACK_OK')) {
      throw new Error(data?.error || 'Authority hotfix rollback parse did not return its success marker');
    }
    const output = path.resolve(ROOT, authorityHotfixOutput);
    fs.writeFileSync(output, `${hotfix.migration}\n`, 'utf8');
    console.log(
      `[emergency-dispatch-deployment] authority-hotfix=${hotfix.digest} units=${hotfix.units.length} statements=${hotfix.statements.length} rollback=passed emitted=${output}`
    );
    return;
  }

  if (lintHotfixOutput) {
    const hotfix = buildLintHotfix();
    const { data, error } = await admin.rpc('exec_sql', { sql: rollbackSql(hotfix) });
    if (error) throw error;
    if (!String(data?.error || '').includes('IVISIT_EMERGENCY_DEPLOYMENT_ROLLBACK_OK')) {
      throw new Error(data?.error || 'Lint hotfix rollback parse did not return its success marker');
    }
    const output = path.resolve(ROOT, lintHotfixOutput);
    fs.writeFileSync(output, `${hotfix.migration}\n`, 'utf8');
    console.log(
      `[emergency-dispatch-deployment] lint-hotfix=${hotfix.digest} units=${hotfix.units.length} statements=${hotfix.statements.length} rollback=passed emitted=${output}`
    );
    return;
  }

  if (finalAuthorizationHotfixOutput) {
    const hotfix = buildFinalAuthorizationHotfix();
    const { data, error } = await admin.rpc('exec_sql', { sql: rollbackSql(hotfix) });
    if (error) throw error;
    if (!String(data?.error || '').includes('IVISIT_EMERGENCY_DEPLOYMENT_ROLLBACK_OK')) {
      throw new Error(data?.error || 'Final authorization hotfix rollback parse did not return its success marker');
    }
    const output = path.resolve(ROOT, finalAuthorizationHotfixOutput);
    fs.writeFileSync(output, `${hotfix.migration}\n`, 'utf8');
    console.log(
      `[emergency-dispatch-deployment] final-auth-hotfix=${hotfix.digest} units=${hotfix.units.length} statements=${hotfix.statements.length} rollback=passed emitted=${output}`
    );
    return;
  }

  if (readinessNullHotfixOutput) {
    const hotfix = buildReadinessNullHotfix();
    const { data, error } = await admin.rpc('exec_sql', { sql: rollbackSql(hotfix) });
    if (error) throw error;
    if (!String(data?.error || '').includes('IVISIT_EMERGENCY_DEPLOYMENT_ROLLBACK_OK')) {
      throw new Error(data?.error || 'Readiness null hotfix rollback parse did not return its success marker');
    }
    const output = path.resolve(ROOT, readinessNullHotfixOutput);
    fs.writeFileSync(output, `${hotfix.migration}\n`, 'utf8');
    console.log(
      `[emergency-dispatch-deployment] readiness-null-hotfix=${hotfix.digest} units=${hotfix.units.length} statements=${hotfix.statements.length} rollback=passed emitted=${output}`
    );
    return;
  }

  if (compatibilityTelemetryHotfixOutput) {
    const hotfix = buildCompatibilityTelemetryHotfix();
    const { data, error } = await admin.rpc('exec_sql', { sql: rollbackSql(hotfix) });
    if (error) throw error;
    if (!String(data?.error || '').includes('IVISIT_EMERGENCY_DEPLOYMENT_ROLLBACK_OK')) {
      throw new Error(data?.error || 'Compatibility telemetry hotfix rollback parse did not return its success marker');
    }
    const output = path.resolve(ROOT, compatibilityTelemetryHotfixOutput);
    fs.writeFileSync(output, `${hotfix.migration}\n`, 'utf8');
    console.log(
      `[emergency-dispatch-deployment] compat-telemetry-hotfix=${hotfix.digest} units=${hotfix.units.length} statements=${hotfix.statements.length} rollback=passed emitted=${output}`
    );
    return;
  }

  if (cashNotificationHotfixOutput) {
    const hotfix = buildCashNotificationHotfix();
    const { data, error } = await admin.rpc('exec_sql', { sql: rollbackSql(hotfix) });
    if (error) throw error;
    if (!String(data?.error || '').includes('IVISIT_EMERGENCY_DEPLOYMENT_ROLLBACK_OK')) {
      throw new Error(data?.error || 'Cash notification hotfix rollback parse did not return its success marker');
    }
    const output = path.resolve(ROOT, cashNotificationHotfixOutput);
    fs.writeFileSync(output, `${hotfix.migration}\n`, 'utf8');
    console.log(
      `[emergency-dispatch-deployment] cash-notification-hotfix=${hotfix.digest} units=${hotfix.units.length} statements=${hotfix.statements.length} rollback=passed emitted=${output}`
    );
    return;
  }

  console.log(
    `[emergency-dispatch-deployment] target=${projectRef} mode=rollback statements=${bundle.statements.length}`
  );
  const { data, error } = await admin.rpc('exec_sql', { sql: rollbackSql(bundle) });
  if (error) throw error;
  if (!String(data?.error || '').includes('IVISIT_EMERGENCY_DEPLOYMENT_ROLLBACK_OK')) {
    throw new Error(data?.error || 'Rollback deployment did not return its success marker');
  }
  console.log('[emergency-dispatch-deployment] Catalog assertions passed and all DDL rolled back.');
}

run().catch((error) => {
  console.error(`[emergency-dispatch-deployment] ${error.message}`);
  process.exit(1);
});
