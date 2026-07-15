#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MIGRATION_FILE = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20260219000500_ops_content.sql'
);

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function extractFunction(sql, functionName) {
  const marker = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${functionName}\\s*\\(`,
    'i'
  );
  const start = sql.search(marker);
  if (start < 0) return null;

  const bodyStart = sql.indexOf('AS $$', start);
  if (bodyStart < 0) return null;

  const bodyEnd = sql.indexOf('$$ LANGUAGE', bodyStart + 5);
  if (bodyEnd < 0) return null;

  const statementEnd = sql.indexOf(';', bodyEnd);
  if (statementEnd < 0) return null;

  return {
    signature: sql.slice(start, bodyStart),
    body: sql.slice(bodyStart + 5, bodyEnd),
    statement: sql.slice(start, statementEnd + 1),
  };
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function run() {
  check(fs.existsSync(MIGRATION_FILE), `missing migration file: ${MIGRATION_FILE}`);
  if (failures.length > 0) return;

  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  const compactSql = compact(sql);
  const helper = extractFunction(sql, 'emit_canonical_notification');
  const emergencyTriggerFunction = extractFunction(sql, 'notify_emergency_events');

  const indexMatch = sql.match(
    /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+notifications_recipient_event_key_uidx\s+ON\s+public\.notifications\s*\(([^)]*)\)\s*WHERE\s+event_key\s+IS\s+NOT\s+NULL\s*;/i
  );
  const indexColumns = indexMatch
    ? indexMatch[1].split(',').map((column) => column.trim().toLowerCase())
    : [];

  check(
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.notifications\s*\([\s\S]*?\bevent_key\s+TEXT\b/i.test(
      sql
    ),
    'notifications table definition must include nullable event_key'
  );
  check(
    /ALTER\s+TABLE\s+public\.notifications\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+event_key\s+TEXT\s*;/i.test(
      compactSql
    ),
    'existing notification tables must receive event_key additively'
  );
  check(Boolean(indexMatch), 'recipient/event partial unique index is missing');
  check(
    JSON.stringify(indexColumns) === JSON.stringify(['user_id', 'event_key']),
    'unique index must contain exactly user_id,event_key so separate recipients and events remain distinct'
  );
  check(
    !/CREATE\s+UNIQUE\s+INDEX[\s\S]*?ON\s+public\.notifications\s*\(\s*event_key\s*\)/i.test(
      sql
    ),
    'event_key must never be globally unique without the recipient'
  );
  check(
    !/(?:DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?|DROP\s+TABLE)\s+public\.notifications\b/i.test(sql),
    'notification event migration must not delete, truncate, or drop existing rows'
  );

  check(Boolean(helper), 'emit_canonical_notification helper is missing');
  if (helper) {
    const helperSignature = compact(helper.signature);
    const helperBody = compact(helper.body);
    const helperStatement = compact(helper.statement);

    check(
      /RETURNS\s+JSONB/i.test(helperSignature),
      'canonical helper must return a structured JSONB replay result'
    );
    check(
      /SECURITY\s+DEFINER/i.test(helperStatement),
      'canonical helper must be SECURITY DEFINER'
    );
    check(
      /SET\s+search_path\s*=\s*pg_catalog\s*,\s*public/i.test(helperStatement),
      'canonical helper must pin a trusted search_path'
    );
    check(
      /p_recipient_user_id\s+UUID/i.test(helperSignature),
      'canonical helper must accept one explicit server-derived recipient UUID'
    );
    check(
      !/\b(?:organization|hospital|request|actor|role)_id\b/i.test(helperSignature),
      'canonical helper must not accept tenant, request, actor, or role selectors'
    );
    check(
      !/auth\.uid\s*\(|request\.jwt|current_setting\s*\(/i.test(helperBody),
      'canonical helper must not derive a recipient from caller auth context'
    );
    check(
      /FROM\s+public\.profiles\s+AS\s+profile\s+WHERE\s+profile\.id\s*=\s*p_recipient_user_id/i.test(
        helperBody
      ),
      'canonical helper must fail closed when the server-derived recipient does not exist'
    );
    check(
      /event_key is required/i.test(helperBody) &&
        /type, title, and message are required/i.test(helperBody) &&
        /action_data and metadata must be JSON objects/i.test(helperBody),
      'canonical helper must validate required scalar and JSON object fields'
    );
    check(
      /INSERT\s+INTO\s+public\.notifications\s*\([\s\S]*?user_id\s*,\s*event_key/i.test(
        helper.body
      ),
      'canonical helper insert must persist recipient and event_key together'
    );
    check(
      /ON\s+CONFLICT\s*\(\s*user_id\s*,\s*event_key\s*\)\s*WHERE\s+event_key\s+IS\s+NOT\s+NULL\s+DO\s+NOTHING/i.test(
        helperBody
      ),
      'canonical helper replay must use the recipient/event partial unique contract'
    );
    check(
      /IF\s+NOT\s+v_inserted\s+THEN/i.test(helperBody) &&
        /notification\.user_id\s*=\s*v_recipient_user_id/i.test(helperBody) &&
        /notification\.event_key\s*=\s*v_event_key/i.test(helperBody),
      'canonical helper must resolve the existing row after an idempotent replay'
    );
    check(
      (helper.body.match(/IS\s+DISTINCT\s+FROM/gi) || []).length >= 10 &&
        /replay payload does not match the existing row/i.test(helperBody),
      'canonical helper must reject a replay whose immutable payload changed'
    );
    check(
      !/UPDATE\s+public\.notifications/i.test(helperBody),
      'canonical helper must never mutate the first notification payload on replay'
    );
    check(
      /'inserted'\s*,\s*v_inserted/i.test(helper.body) &&
        /'replayed'\s*,\s*NOT\s+v_inserted/i.test(helper.body) &&
        /'notification_id'\s*,\s*v_notification_id/i.test(helper.body),
      'canonical helper must return notification_id plus inserted/replayed flags'
    );
  }

  const helperTypes =
    'TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT';
  check(
    compactSql.includes(
      `REVOKE ALL ON FUNCTION public.emit_canonical_notification( ${helperTypes} ) FROM PUBLIC, anon, authenticated;`
    ),
    'canonical helper must revoke execution from PUBLIC, anon, and authenticated'
  );
  check(
    compactSql.includes(
      `GRANT EXECUTE ON FUNCTION public.emit_canonical_notification( ${helperTypes} ) TO service_role;`
    ),
    'canonical helper must grant execution only to service_role'
  );
  const helperGrantStatements = compactSql.match(
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.emit_canonical_notification\s*\([^;]+;/gi
  ) || [];
  check(
    helperGrantStatements.length === 1 && /TO\s+service_role\s*;/i.test(helperGrantStatements[0]),
    'canonical helper must have exactly one explicit execute grant, to service_role'
  );

  check(Boolean(emergencyTriggerFunction), 'notify_emergency_events trigger function is missing');
  if (emergencyTriggerFunction) {
    const triggerBody = compact(emergencyTriggerFunction.body);
    check(
      /PERFORM\s+public\.emit_canonical_notification\s*\(/i.test(triggerBody),
      'emergency trigger must emit through the canonical helper'
    );
    check(
      !/INSERT\s+INTO\s+public\.notifications/i.test(triggerBody),
      'emergency trigger must not bypass canonical notification idempotency'
    );
    check(
      /FROM\s+public\.hospitals\s+AS\s+hospital\s+WHERE\s+hospital\.id\s*=\s*NEW\.hospital_id/i.test(
        triggerBody
      ) &&
        /SELECT\s+NEW\.dispatch_organization_id\s*,\s*FALSE\s+AS\s+facility_scope/i.test(
          triggerBody
        ) &&
        /JOIN\s+public\.profiles\s+AS\s+profile\s+ON\s+profile\.organization_id\s*=\s*target\.organization_id/i.test(
          triggerBody
        ),
      'emergency recipients must derive from canonical facility and dispatch organization relationships'
    );
    check(
      /profile\.role\s+IN\s*\(\s*'org_admin'\s*,\s*'dispatcher'\s*,\s*'admin'\s*\)/i.test(
        triggerBody
      ),
      'emergency organization notifications must include dispatcher recipients'
    );
    check(
      /v_previous_organization_ids/i.test(triggerBody) &&
        /target\.organization_id\s*=\s*ANY\s*\(\s*v_previous_organization_ids\s*\)/i.test(
          triggerBody
        ),
      'emergency organization updates must notify only newly introduced organizations'
    );
    check(
      !/NEW\.organization_id|profile\.organization_id\s*=\s*NEW\.hospital_id/i.test(triggerBody),
      'emergency trigger must not trust caller tenant context or hospital-as-organization fallbacks'
    );
    check(
      !/OLD\.status|Status Updated|pending_approval|payment_declined/i.test(triggerBody),
      'generic emergency trigger must not emit lifecycle or payment notifications'
    );
    check(
      /emergency_request:'\s*\|\|\s*NEW\.id::TEXT\s*\|\|\s*':created/i.test(triggerBody),
      'emergency-created notifications must use an immutable request event key'
    );
  }

  const triggerDdlMatch = sql.match(
    /CREATE\s+TRIGGER\s+on_emergency_notification([\s\S]*?);/i
  );
  check(
    /DROP\s+TRIGGER\s+IF\s+EXISTS\s+on_emergency_notification\s+ON\s+public\.emergency_requests\s*;/i.test(
      sql
    ),
    'legacy emergency notification trigger must be replaced idempotently'
  );
  check(Boolean(triggerDdlMatch), 'on_emergency_notification trigger DDL is missing');
  if (triggerDdlMatch) {
    check(
      /AFTER\s+INSERT\s+OR\s+UPDATE\s+OF\s+hospital_id\s*,\s*dispatch_organization_id\s+ON\s+public\.emergency_requests/i.test(
        triggerDdlMatch[0]
      ),
      'emergency notification trigger must cover creation and newly assigned canonical organizations only'
    );
  }
}

run();

if (failures.length > 0) {
  console.error('[notification-event-contract] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[notification-event-contract] PASS');
