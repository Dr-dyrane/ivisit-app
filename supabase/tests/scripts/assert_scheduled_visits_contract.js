#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SOURCE_PATHS = {
  org: 'supabase/migrations/20260219000200_org_structure.sql',
  logistics: 'supabase/migrations/20260219000300_logistics.sql',
  security: 'supabase/migrations/20260219000700_security.sql',
  automations: 'supabase/migrations/20260219000900_automations.sql',
  core: 'supabase/migrations/20260219010000_core_rpcs.sql',
  config: 'supabase/config.toml',
  demo: 'supabase/functions/bootstrap-demo-ecosystem/handler.ts',
  demoHospitals: 'supabase/functions/_shared/domain/demo/hospitals.ts',
  demoTimezone: 'supabase/functions/bootstrap-demo-ecosystem/timezone.ts',
  consultIndex: 'supabase/functions/consult-assist/index.ts',
  consultAccess: 'supabase/functions/consult-assist/access.ts',
  consultAnthropic: 'supabase/functions/consult-assist/anthropic.ts',
  consultContracts: 'supabase/functions/consult-assist/contracts.ts',
  generatedTypes: 'supabase/database.ts',
  appTypes: 'types/database.ts',
  consoleTypes: '../ivisit-console/frontend/src/types/database.ts',
};

const failures = [];
let checkCount = 0;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function testPattern(content, pattern) {
  pattern.lastIndex = 0;
  return pattern.test(content);
}

function patternsAppearInOrder(content, patterns) {
  let cursor = 0;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content.slice(cursor));
    if (!match) return false;
    cursor += match.index + match[0].length;
  }
  return true;
}

function check(id, passed, message) {
  checkCount += 1;
  if (!passed) failures.push(`[${id}] ${message}`);
}

function readSource(key, relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    check(`source.${key}`, false, `Missing required source: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

const sources = Object.fromEntries(
  Object.entries(SOURCE_PATHS).map(([key, relativePath]) => [
    key,
    readSource(key, relativePath),
  ])
);

function requirePattern(id, sourceKey, pattern, message) {
  check(id, testPattern(sources[sourceKey] || '', pattern), `${SOURCE_PATHS[sourceKey]}: ${message}`);
}

function forbidPattern(id, sourceKey, pattern, message) {
  check(id, !testPattern(sources[sourceKey] || '', pattern), `${SOURCE_PATHS[sourceKey]}: ${message}`);
}

function extractMarkerBlock(content, beginMarker, endMarker) {
  const start = content.indexOf(beginMarker);
  if (start < 0) return null;
  const end = content.indexOf(endMarker, start + beginMarker.length);
  if (end < 0) return null;
  return content.slice(start, end + endMarker.length);
}

function extractSqlFunction(content, functionName) {
  const startPattern = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${escapeRegExp(functionName)}\\s*\\(`,
    'i'
  );
  const startMatch = startPattern.exec(content);
  if (!startMatch) return null;

  const start = startMatch.index;
  const remainder = content.slice(start);
  const delimiterMatch = /\bAS\s+(\$[A-Za-z0-9_]*\$)/i.exec(remainder);
  if (!delimiterMatch) return null;

  const delimiter = delimiterMatch[1];
  const bodyStart = delimiterMatch.index + delimiterMatch[0].length;
  const bodyEnd = remainder.indexOf(delimiter, bodyStart);
  if (bodyEnd < 0) return null;

  const statementEnd = remainder.indexOf(';', bodyEnd + delimiter.length);
  if (statementEnd < 0) return null;

  return {
    body: remainder.slice(bodyStart, bodyEnd),
    definition: remainder.slice(0, statementEnd + 1),
  };
}

const functionCache = new Map();

function getFunction(sourceKey, functionName) {
  const cacheKey = `${sourceKey}:${functionName}`;
  if (!functionCache.has(cacheKey)) {
    functionCache.set(
      cacheKey,
      extractSqlFunction(sources[sourceKey] || '', functionName)
    );
  }
  return functionCache.get(cacheKey);
}

function requireFunction(sourceKey, functionName) {
  const sqlFunction = getFunction(sourceKey, functionName);
  check(
    `rpc.${functionName}.exists`,
    Boolean(sqlFunction),
    `${SOURCE_PATHS[sourceKey]}: Missing public.${functionName} function definition.`
  );
  return sqlFunction;
}

function requireFunctionPattern(id, sourceKey, functionName, pattern, message) {
  const sqlFunction = getFunction(sourceKey, functionName);
  check(
    id,
    Boolean(sqlFunction) && testPattern(sqlFunction.definition, pattern),
    `${SOURCE_PATHS[sourceKey]} public.${functionName}: ${message}`
  );
}

function forbidFunctionPattern(id, sourceKey, functionName, pattern, message) {
  const sqlFunction = getFunction(sourceKey, functionName);
  check(
    id,
    Boolean(sqlFunction) && !testPattern(sqlFunction.body, pattern),
    `${SOURCE_PATHS[sourceKey]} public.${functionName}: ${message}`
  );
}

function extractTomlFunctionSection(content, functionName) {
  const headerPattern = new RegExp(
    `^\\[functions\\.${escapeRegExp(functionName)}\\]\\s*$`,
    'im'
  );
  const match = headerPattern.exec(content);
  if (!match) return null;
  const start = match.index;
  const remainder = content.slice(start + match[0].length);
  const nextSection = /\r?\n\[/.exec(remainder);
  return content.slice(
    start,
    nextSection ? start + match[0].length + nextSection.index : content.length
  );
}

function extractTypeTable(content, tableName) {
  const startPattern = new RegExp(`^      ${escapeRegExp(tableName)}: \\{$`, 'm');
  const startMatch = startPattern.exec(content);
  if (!startMatch) return null;
  const remainder = content.slice(startMatch.index + startMatch[0].length);
  const nextTable = /^      [a-z0-9_]+: \{$/m.exec(remainder);
  return content.slice(
    startMatch.index,
    nextTable ? startMatch.index + startMatch[0].length + nextTable.index : content.length
  );
}

function hasTableCreationMutation(content, tableName) {
  const escapedTable = escapeRegExp(tableName);
  const pattern = new RegExp(
    `\\.from\\(\\s*["']${escapedTable}["']\\s*\\)(?:(?!\\.from\\()[\\s\\S])*?\\.(?:insert|upsert)\\s*\\(`,
    'i'
  );
  return testPattern(content, pattern);
}

function hasSupabaseMutation(content) {
  const tableMutation = /\.from\(\s*["'][^"']+["']\s*\)(?:(?!;)[\s\S])*?\.(?:insert|upsert|update|delete)\s*\(/i;
  return testPattern(content, tableMutation) || /\.rpc\s*\(/i.test(content);
}

const visitsBlock = extractMarkerBlock(
  sources.logistics,
  'BEGIN SCHEDULED_VISITS_LOGISTICS_SCHEMA',
  'END SCHEDULED_VISITS_LOGISTICS_SCHEMA'
) || '';
check(
  'visits.marker',
  Boolean(visitsBlock),
  `${SOURCE_PATHS.logistics}: Missing scheduled visits schema marker block.`
);

const communicationBlock = extractMarkerBlock(
  sources.logistics,
  'BEGIN ASYNC_CONSULT_COMMUNICATION_SCHEMA',
  'END ASYNC_CONSULT_COMMUNICATION_SCHEMA'
) || '';
check(
  'consult.communication-marker',
  Boolean(communicationBlock),
  `${SOURCE_PATHS.logistics}: Missing async consult communication schema marker block.`
);

// Provider timezone and schedule integrity.
requirePattern(
  'hospital.timezone-column',
  'org',
  /\btimezone\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'UTC'/i,
  'hospitals must own a non-null UTC-compatible timezone column.'
);
requirePattern(
  'hospital.timezone-catalog-validation',
  'org',
  /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.validate_hospital_timezone[\s\S]*?pg_timezone_names/i,
  'timezone validation must use the PostgreSQL IANA timezone catalog.'
);
requirePattern(
  'hospital.timezone-trigger',
  'org',
  /CREATE\s+TRIGGER\s+validate_hospital_timezone_value[\s\S]*?BEFORE\s+INSERT\s+OR\s+UPDATE\s+OF\s+timezone/i,
  'timezone validation trigger must cover inserts and timezone updates.'
);
for (const field of [
  'timezone_confirmed_at',
  'timezone_confirmation_source',
  'timezone_confirmed_by',
]) {
  requirePattern(
    `hospital.timezone-confirmation.${field}`,
    'org',
    new RegExp(`ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS\\s+${field}\\b`, 'i'),
    `hospitals must expose canonical ${field} metadata.`
  );
}
requirePattern('hospital.timezone-confirmation-coherence', 'org', /hospitals_timezone_confirmation_coherence_check[\s\S]*?timezone_confirmed_at\s+IS\s+NULL[\s\S]*?timezone_confirmation_source\s+IS\s+NULL[\s\S]*?timezone_confirmed_at\s+IS\s+NOT\s+NULL[\s\S]*?timezone_confirmation_source\s+IS\s+NOT\s+NULL/i, 'timezone confirmation metadata must be all-or-nothing except the optional actor.');
requirePattern('hospital.timezone-change-clears-confirmation', 'org', /NEW\.timezone\s+IS\s+DISTINCT\s+FROM\s+OLD\.timezone[\s\S]*?NEW\.timezone_confirmed_at\s*:=\s*NULL[\s\S]*?NEW\.timezone_confirmation_source\s*:=\s*NULL/i, 'changing timezone without fresh evidence must clear stale confirmation.');
requirePattern(
  'schedule.time-order',
  'org',
  /ADD\s+CONSTRAINT\s+doctor_schedules_time_order_check\s+CHECK\s*\(\s*end_time\s*>\s*start_time\s*\)/i,
  'doctor schedules must reject zero-length and reverse shifts.'
);
requirePattern(
  'schedule.exact-unique',
  'org',
  /ADD\s+CONSTRAINT\s+doctor_schedules_exact_shift_key\s+UNIQUE\s*\(\s*doctor_id\s*,\s*date\s*,\s*start_time\s*,\s*end_time\s*\)/i,
  'doctor/date/start/end must be an exact unique shift key.'
);

// Canonical scheduled visit fields, invariants, and indexes.
for (const [field, typePattern] of [
  ['doctor_id', 'UUID'],
  ['care_mode', 'TEXT'],
  ['scheduled_start_at', 'TIMESTAMPTZ'],
  ['scheduled_end_at', 'TIMESTAMPTZ'],
  ['scheduled_timezone', 'TEXT'],
  ['booking_idempotency_key', 'UUID'],
]) {
  check(
    `visits.field.${field}`,
    testPattern(visitsBlock, new RegExp(`ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS\\s+${field}\\s+${typePattern}`, 'i')),
    `${SOURCE_PATHS.logistics}: visits.${field} is missing from the additive scheduled-care block.`
  );
}
check(
  'visits.doctor-history-link',
  /doctor_id\s+UUID\s+REFERENCES\s+public\.doctors\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i.test(visitsBlock),
  `${SOURCE_PATHS.logistics}: visits.doctor_id must preserve history with ON DELETE SET NULL.`
);
check(
  'visits.closed-history-null-links',
  /status\s+IN\s*\(\s*'completed'\s*,\s*'cancelled'\s*\)[\s\S]*?OR\s*\(\s*hospital_id\s+IS\s+NOT\s+NULL\s+AND\s+doctor_id\s+IS\s+NOT\s+NULL\s*\)/i.test(visitsBlock),
  `${SOURCE_PATHS.logistics}: active scheduled care must retain facility/doctor links while closed history permits ON DELETE SET NULL.`
);
check(
  'visits.care-mode-values',
  /care_mode\s+IS\s+NULL\s+OR\s+care_mode\s+IN\s*\(\s*'in_person'\s*,\s*'telemedicine_async'\s*\)/i.test(visitsBlock),
  `${SOURCE_PATHS.logistics}: care_mode must be limited to in_person and telemedicine_async.`
);
for (const invariant of [
  /request_id\s+IS\s+NULL/i,
  /status\s+IS\s+NOT\s+NULL/i,
  /hospital_id\s+IS\s+NOT\s+NULL/i,
  /doctor_id\s+IS\s+NOT\s+NULL/i,
  /scheduled_end_at\s*>\s*scheduled_start_at/i,
  /scheduled_timezone\s+IS\s+NOT\s+NULL/i,
  /booking_idempotency_key\s+IS\s+NOT\s+NULL/i,
]) {
  check(
    `visits.scheduled-invariant.${invariant.source}`,
    /visits_scheduled_contract_check/i.test(visitsBlock) && invariant.test(visitsBlock),
    `${SOURCE_PATHS.logistics}: visits_scheduled_contract_check is missing ${invariant.source}.`
  );
}
check(
  'visits.idempotency-index',
  /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_visits_booking_idempotency[\s\S]*?\(\s*user_id\s*,\s*booking_idempotency_key\s*\)[\s\S]*?WHERE\s+booking_idempotency_key\s+IS\s+NOT\s+NULL/i.test(visitsBlock),
  `${SOURCE_PATHS.logistics}: scheduled booking retries need a partial patient/key unique index.`
);
check(
  'visits.doctor-window-index',
  /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_visits_doctor_scheduled_window[\s\S]*?doctor_id[\s\S]*?scheduled_start_at[\s\S]*?scheduled_end_at/i.test(visitsBlock),
  `${SOURCE_PATHS.logistics}: scheduled overlap lookups need the doctor/window index.`
);
check(
  'visits.patient-window-index',
  /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_visits_patient_scheduled_window[\s\S]*?user_id[\s\S]*?scheduled_start_at[\s\S]*?scheduled_end_at[\s\S]*?status/i.test(visitsBlock),
  `${SOURCE_PATHS.logistics}: patient overlap checks need the patient/window index.`
);

// Room ownership, attachments, and same-room read integrity.
for (const [id, pattern, message] of [
  ['room.request-nullable', /ALTER\s+COLUMN\s+emergency_request_id\s+DROP\s+NOT\s+NULL/i, 'emergency_request_id must be nullable for visit-only consult rooms.'],
  ['room.channel-values', /channel_type\s+IN\s*\(\s*'emergency'\s*,\s*'telemedicine_async'\s*\)/i, 'channel_type must distinguish emergency and telemedicine_async.'],
  ['room.emergency-owner', /channel_type\s*=\s*'emergency'\s+AND\s+emergency_request_id\s+IS\s+NOT\s+NULL/i, 'emergency rooms must retain an emergency request owner.'],
  ['room.consult-owner', /channel_type\s*=\s*'telemedicine_async'[\s\S]*?emergency_request_id\s+IS\s+NULL[\s\S]*?visit_id\s+IS\s+NOT\s+NULL/i, 'async rooms must be visit-only.'],
  ['room.visit-delete-legacy-compatible', /FOREIGN\s+KEY\s*\(\s*visit_id\s*\)[\s\S]*?REFERENCES\s+public\.visits\s*\(\s*id\s*\)[\s\S]*?ON\s+DELETE\s+SET\s+NULL/i, 'legacy emergency room links must retain their historical SET NULL behavior.'],
  ['room.async-visit-delete-guard', /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.prevent_async_consult_visit_delete[\s\S]*?channel_type\s*=\s*'telemedicine_async'[\s\S]*?CREATE\s+TRIGGER\s+protect_async_consult_visit_owner[\s\S]*?BEFORE\s+DELETE\s+ON\s+public\.visits/i, 'async consult ownership must block deletion without changing legacy emergency FK behavior.'],
  ['room.async-unique', /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_async_consult_room_visit[\s\S]*?WHERE\s+channel_type\s*=\s*'telemedicine_async'/i, 'one async consult room must exist per visit.'],
]) {
  check(id, pattern.test(communicationBlock), `${SOURCE_PATHS.logistics}: ${message}`);
}
for (const field of [
  'attachment_storage_path',
  'attachment_mime_type',
  'attachment_size_bytes',
  'attachment_duration_ms',
  'ai_assisted',
]) {
  check(
    `message.field.${field}`,
    new RegExp(`ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS\\s+${field}\\b`, 'i').test(communicationBlock),
    `${SOURCE_PATHS.logistics}: emergency_chat_messages.${field} is missing.`
  );
}
for (const [id, pattern, message] of [
  ['message.image-mime', /'image\/jpeg'\s*,\s*'image\/png'\s*,\s*'image\/webp'/i, 'image MIME allowlist is incomplete.'],
  ['message.image-limit', /attachment_size_bytes\s+BETWEEN\s+1\s+AND\s+10485760/i, 'image limit must be 10 MiB.'],
  ['message.video-mime', /'video\/mp4'\s*,\s*'video\/webm'\s*,\s*'video\/quicktime'/i, 'video MIME allowlist is incomplete.'],
  ['message.video-limit', /attachment_size_bytes\s+BETWEEN\s+1\s+AND\s+26214400/i, 'video limit must be 25 MiB.'],
  ['message.duration-limit', /attachment_duration_ms\s+BETWEEN\s+1\s+AND\s+30000/i, 'declared video duration must be limited to 30 seconds.'],
  ['message.image-nonnull', /kind\s*=\s*'image'[\s\S]*?attachment_mime_type\s+IS\s+NOT\s+NULL[\s\S]*?attachment_size_bytes\s+IS\s+NOT\s+NULL/i, 'image attachment metadata must reject SQL NULL.'],
  ['message.video-nonnull', /kind\s*=\s*'video'[\s\S]*?attachment_mime_type\s+IS\s+NOT\s+NULL[\s\S]*?attachment_size_bytes\s+IS\s+NOT\s+NULL[\s\S]*?attachment_duration_ms\s+IS\s+NOT\s+NULL/i, 'video attachment metadata must reject SQL NULL.'],
  ['message.same-room-key', /UNIQUE\s*\(\s*room_id\s*,\s*id\s*\)/i, 'messages need a room/id candidate key.'],
]) {
  check(id, pattern.test(communicationBlock), `${SOURCE_PATHS.logistics}: ${message}`);
}
requirePattern(
  'message.same-room-read-fk',
  'logistics',
  /FOREIGN\s+KEY\s*\(\s*room_id\s*,\s*last_read_message_id\s*\)\s+REFERENCES\s+public\.emergency_chat_messages\s*\(\s*room_id\s*,\s*id\s*\)/i,
  'read receipts must reference a message in the same room.'
);
check(
  'message.read-fk-replay-order',
  patternsAppearInOrder(communicationBlock, [
    /DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+emergency_chat_participants_last_read_message_id_fkey/i,
    /DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+emergency_chat_messages_room_id_id_key/i,
    /ADD\s+CONSTRAINT\s+emergency_chat_messages_room_id_id_key\s+UNIQUE/i,
  ]),
  `${SOURCE_PATHS.logistics}: replay must drop the dependent read FK before replacing the message candidate key.`
);
check(
  'message.read-fk-column-delete',
  /FOREIGN\s+KEY\s*\(\s*room_id\s*,\s*last_read_message_id\s*\)[\s\S]*?ON\s+DELETE\s+SET\s+NULL\s*\(\s*last_read_message_id\s*\)/i.test(sources.logistics),
  `${SOURCE_PATHS.logistics}: message deletion must clear only last_read_message_id, never participant room_id.`
);

// Schedule RLS, async participant scope, and private media policies.
requirePattern('schedule.drop-public-policy', 'security', /DROP\s+POLICY\s+IF\s+EXISTS\s+"Public read doctor schedules"/i, 'the legacy public raw-schedule policy must be removed.');
forbidPattern('schedule.no-public-policy', 'security', /CREATE\s+POLICY\s+"Public read doctor schedules"/i, 'do not recreate anonymous raw schedule reads.');
requirePattern('schedule.direct-mutation-revoke', 'security', /REVOKE\s+INSERT\s*,\s*UPDATE\s*,\s*DELETE\s+ON\s+public\.doctor_schedules\s+FROM\s+anon\s*,\s*authenticated/i, 'direct schedule mutations must be RPC-owned.');
requirePattern('schedule.anon-select-revoke', 'security', /REVOKE\s+SELECT\s+ON\s+public\.doctor_schedules\s+FROM\s+anon/i, 'anonymous raw schedule reads must be explicitly revoked.');
requirePattern('consult.anon-table-revoke', 'security', /REVOKE\s+SELECT\s*,\s*INSERT\s*,\s*UPDATE\s*,\s*DELETE\s+ON\s+public\.emergency_chat_messages\s+FROM\s+anon/i, 'anonymous clinical message table access must be explicitly revoked.');

const asyncHelper = requireFunction('security', 'p_is_async_consult_participant');
if (asyncHelper) {
  check('consult.helper-security-definer', /SECURITY\s+DEFINER/i.test(asyncHelper.definition), `${SOURCE_PATHS.security}: async participant helper must be SECURITY DEFINER.`);
  for (const [id, pattern, message] of [
    ['consult.helper-channel', /channel_type\s*=\s*'telemedicine_async'/i, 'helper must reject non-clinical rooms.'],
    ['consult.helper-explicit-participant', /emergency_chat_participants[\s\S]*?left_at\s+IS\s+NULL/i, 'helper must honor only active explicit participants.'],
    ['consult.helper-patient', /v_actor_id\s*=\s*v_patient_id/i, 'helper must prove the visit patient.'],
    ['consult.helper-doctor', /v_actor_id\s*=\s*v_doctor_profile_id/i, 'helper must prove the assigned clinician.'],
  ]) {
    check(id, pattern.test(asyncHelper.body), `${SOURCE_PATHS.security}: ${message}`);
  }
  check(
    'consult.helper-no-admin-shortcut',
    !/p_is_admin|organization_id|\badmin\b|\bdispatcher\b|\bsupport\b/i.test(asyncHelper.body),
    `${SOURCE_PATHS.security}: clinical participant helper must not inherit broad admin, organization, dispatch, or support access.`
  );
}

for (const [id, pattern, message] of [
  ['storage.private-documents-bucket', /\(\s*'documents'\s*,\s*'documents'\s*,\s*false\s*\)/i, 'documents bucket must remain private.'],
  ['storage.force-private-documents-bucket', /UPDATE\s+storage\.buckets[\s\S]*?public\s*=\s*false[\s\S]*?id\s*=\s*'documents'/i, 'an existing documents bucket must be forced private on replay.'],
  ['storage.documents-size-cap', /UPDATE\s+storage\.buckets[\s\S]*?file_size_limit\s*=\s*26214400[\s\S]*?id\s*=\s*'documents'/i, 'the shared private bucket must cap uploads at 25 MiB.'],
  ['storage.consult-upload-policy', /CREATE\s+POLICY\s+"Consult participants upload private media"[\s\S]*?FOR\s+INSERT/i, 'consult upload policy is missing.'],
  ['storage.consult-read-policy', /CREATE\s+POLICY\s+"Consult participants read linked private media"[\s\S]*?FOR\s+SELECT/i, 'linked consult media read policy is missing.'],
  ['storage.room-path', /\(storage\.foldername\(name\)\)\[1\]\s*=\s*'telemedicine'[\s\S]*?p_safe_uuid\(\(storage\.foldername\(name\)\)\[2\]\)/i, 'media paths must carry a safely parsed room id.'],
  ['storage.user-path', /\(storage\.foldername\(name\)\)\[3\]\s*=\s*auth\.uid\(\)::TEXT/i, 'uploads must stay inside the authenticated user folder.'],
  ['storage.participant-scope', /p_is_async_consult_participant\s*\(/i, 'storage access must prove async room participation.'],
  ['storage.active-upload-room', /Consult participants upload private media[\s\S]*?room\.status\s*=\s*'active'/i, 'uploads must be limited to active consult rooms.'],
  ['storage.active-upload-visit', /Consult participants upload private media[\s\S]*?visit\.status\s+IN\s*\(\s*'upcoming'\s*,\s*'in_progress'\s*\)/i, 'uploads must require an active scheduled visit, not only an active room flag.'],
  ['storage.linked-message-read', /message\.attachment_storage_path\s*=\s*storage\.objects\.name/i, 'private reads must require a persisted message reference.'],
]) {
  requirePattern(id, 'security', pattern, message);
}
forbidPattern('storage.no-consult-update', 'security', /CREATE\s+POLICY\s+"[^"]*Consult[^"]*"[\s\S]{0,180}?FOR\s+UPDATE/i, 'consult media must not have an update policy.');
forbidPattern('storage.no-consult-delete', 'security', /CREATE\s+POLICY\s+"[^"]*Consult[^"]*"[\s\S]{0,180}?FOR\s+DELETE/i, 'client consult-media deletion must remain service-owned to avoid linkage races.');

// Required RPCs, SECURITY DEFINER posture, and explicit execute ACLs.
const rpcNames = [
  'get_book_visit_availability',
  'book_scheduled_visit',
  'get_console_doctor_schedules',
  'confirm_hospital_timezone',
  'upsert_doctor_schedule',
  'delete_doctor_schedule',
  'transition_scheduled_visit',
  'ensure_async_consult_room',
  'send_async_consult_message',
  'mark_async_consult_room_read',
];

for (const functionName of rpcNames) {
  const sqlFunction = requireFunction('core', functionName);
  if (sqlFunction) {
    check(
      `rpc.${functionName}.security-definer`,
      /SECURITY\s+DEFINER/i.test(sqlFunction.definition),
      `${SOURCE_PATHS.core}: public.${functionName} must be SECURITY DEFINER.`
    );
  }
  const signature = `public\\.${escapeRegExp(functionName)}\\s*\\([^;\\r\\n]*\\)`;
  check(
    `rpc.${functionName}.revoke`,
    new RegExp(`REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+${signature}\\s+FROM\\s+PUBLIC\\s*,\\s*anon\\s*;`, 'i').test(sources.core),
    `${SOURCE_PATHS.core}: public.${functionName} must revoke execute from PUBLIC and anon.`
  );
  check(
    `rpc.${functionName}.grant`,
    new RegExp(`GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+${signature}\\s+TO\\s+authenticated(?:\\s*,\\s*service_role)?\\s*;`, 'i').test(sources.core),
    `${SOURCE_PATHS.core}: public.${functionName} needs an explicit authenticated execute grant.`
  );
  check(
    `rpc.${functionName}.no-broad-grant`,
    !new RegExp(`GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+${signature}\\s+TO\\s+(?:PUBLIC|anon)\\b`, 'i').test(sources.core),
    `${SOURCE_PATHS.core}: public.${functionName} must not grant execute to PUBLIC or anon.`
  );
}

requireFunctionPattern('availability.auth', 'core', 'get_book_visit_availability', /auth\.uid\(\)[\s\S]*?Unauthorized/i, 'availability must require an authenticated actor or controlled service role.');
requireFunctionPattern('availability.booking-eligible', 'core', 'get_book_visit_availability', /hospital\.booking_eligible\s*=\s*true/i, 'availability must filter booking-eligible facilities.');
requireFunctionPattern('availability.confirmed-timezone', 'core', 'get_book_visit_availability', /hospital\.timezone_confirmed_at\s+IS\s+NOT\s+NULL/i, 'availability must exclude facilities without confirmed timezone truth.');
requireFunctionPattern('availability.overlap', 'core', 'get_book_visit_availability', /NOT\s+EXISTS[\s\S]*?active_visit\.scheduled_start_at\s*<[\s\S]*?active_visit\.scheduled_end_at\s*>/i, 'availability must exclude active visit overlaps.');
requireFunctionPattern('availability.patient-overlap', 'core', 'get_book_visit_availability', /patient_visit\.user_id\s*=\s*v_actor_id[\s\S]*?patient_visit\.scheduled_start_at\s*<[\s\S]*?patient_visit\.scheduled_end_at\s*>/i, 'patient availability must hide windows that overlap the actor\'s active scheduled care.');

const selector = requireFunction('core', 'p_select_bookable_doctor');
if (selector) {
  check('booking.selector-security-definer', /SECURITY\s+DEFINER/i.test(selector.definition), `${SOURCE_PATHS.core}: internal doctor selector must be SECURITY DEFINER.`);
  check('booking.selector-overlap', /NOT\s+EXISTS[\s\S]*?active_visit\.scheduled_start_at\s*<\s*p_scheduled_end_at[\s\S]*?active_visit\.scheduled_end_at\s*>\s*p_scheduled_start_at/i.test(selector.body), `${SOURCE_PATHS.core}: doctor selector must recheck active overlaps.`);
  check('booking.selector-zoned-window', /p_scheduled_start_at\s*>=\s*\([\s\S]*?schedule\.date\s*\+\s*schedule\.start_time[\s\S]*?AT\s+TIME\s+ZONE\s+v_timezone[\s\S]*?p_scheduled_end_at\s*<=\s*\([\s\S]*?schedule\.date\s*\+\s*schedule\.end_time[\s\S]*?AT\s+TIME\s+ZONE\s+v_timezone/i.test(selector.body), `${SOURCE_PATHS.core}: doctor selector must compare canonical zoned instants, including DST folds.`);
  check('booking.selector-confirmed-timezone', /hospital\.timezone_confirmed_at\s+IS\s+NOT\s+NULL/i.test(selector.body), `${SOURCE_PATHS.core}: doctor selector must reject unconfirmed facility timezones.`);
  check('booking.selector-lock', /FOR\s+UPDATE\s+OF\s+doctor\s+SKIP\s+LOCKED/i.test(selector.body), `${SOURCE_PATHS.core}: doctor selection must lock and skip concurrent candidates.`);
}
requirePattern('booking.selector-internal-acl', 'core', /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.p_select_bookable_doctor\([^;]+\)\s+FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated/i, 'the overlap selector must remain internal.');
requireFunctionPattern('booking.patient-auth', 'core', 'book_scheduled_visit', /v_actor_id\s+IS\s+NULL[\s\S]*?Unauthorized/i, 'booking must authenticate the patient.');
requireFunctionPattern('booking.idempotency-read', 'core', 'book_scheduled_visit', /visit\.user_id\s*=\s*v_actor_id[\s\S]*?visit\.booking_idempotency_key\s*=\s*p_idempotency_key/i, 'booking must return or reject an existing patient/key retry.');
requireFunctionPattern('booking.idempotency-lock', 'core', 'book_scheduled_visit', /pg_advisory_xact_lock[\s\S]*?'scheduled-booking-key:'[\s\S]*?p_idempotency_key/i, 'concurrent retries must serialize on patient and idempotency key before lookup.');
requireFunctionPattern('booking.idempotency-notes', 'core', 'book_scheduled_visit', /v_existing\.notes[\s\S]*?IS\s+DISTINCT\s+FROM[\s\S]*?p_notes/i, 'booking retries must reject changed notes.');
requireFunctionPattern('booking.facility-lock', 'core', 'book_scheduled_visit', /FROM\s+public\.hospitals\s+hospital[\s\S]*?booking_eligible\s*=\s*true[\s\S]*?FOR\s+SHARE/i, 'booking must stabilize facility eligibility and timezone for the transaction.');
requireFunctionPattern('booking.confirmed-timezone', 'core', 'book_scheduled_visit', /v_hospital\.timezone_confirmed_at\s+IS\s+NULL[\s\S]*?Facility timezone is not confirmed/i, 'booking must reject compatibility timezone defaults without confirmation.');
requireFunctionPattern('booking.patient-lock', 'core', 'book_scheduled_visit', /pg_advisory_xact_lock[\s\S]*?'scheduled-patient:'[\s\S]*?Patient already has a scheduled visit/i, 'booking must serialize and reject patient-window overlap across idempotency keys.');
requireFunctionPattern('booking.transaction-lock', 'core', 'book_scheduled_visit', /pg_advisory_xact_lock[\s\S]*?'book:'/i, 'booking must serialize slot assignment.');
requireFunctionPattern('booking.server-selector', 'core', 'book_scheduled_visit', /public\.p_select_bookable_doctor\s*\(/i, 'booking must choose a clinician through the server selector.');
requireFunctionPattern('booking.no-meeting-url', 'core', 'book_scheduled_visit', /meeting_link[\s\S]*?\n\s*NULL\s*,\s*\n\s*v_care_mode/i, 'async booking must persist no meeting URL.');
for (const functionName of ['book_scheduled_visit', 'transition_scheduled_visit']) {
  const sqlFunction = getFunction('core', functionName);
  const selectorCalls = sqlFunction
    ? (sqlFunction.body.match(/public\.p_select_bookable_doctor\s*\(/gi) || []).length
    : 0;
  check(
    `booking.${functionName}.selector-once`,
    selectorCalls === 1,
    `${SOURCE_PATHS.core}: public.${functionName} must evaluate the volatile locking selector exactly once.`
  );
}

requireFunctionPattern('schedule.read-role-acl', 'core', 'get_console_doctor_schedules', /NOT\s+COALESCE\s*\(\s*v_actor_role\s+IN\s*\(\s*'admin'\s*,\s*'org_admin'\s*\)[\s\S]*?false\s*\)/i, 'schedule reads must require a null-safe scheduling admin role.');
requireFunctionPattern('schedule.read-org-scope', 'core', 'get_console_doctor_schedules', /hospital\.organization_id\s*=\s*v_actor_org_id/i, 'org admins must be limited to their facility organization.');
requireFunctionPattern('schedule.confirm-timezone-role-acl', 'core', 'confirm_hospital_timezone', /v_actor_role\s*=\s*'admin'[\s\S]*?v_actor_role\s*=\s*'org_admin'[\s\S]*?v_actor_org_id\s*=\s*v_hospital_org_id/i, 'timezone confirmation must require platform or same-org admin scope.');
requireFunctionPattern('schedule.confirm-timezone-catalog', 'core', 'confirm_hospital_timezone', /pg_timezone_names[\s\S]*?timezone_confirmed_at\s*=\s*NOW\(\)[\s\S]*?timezone_confirmation_source\s*=\s*'manual'/i, 'manual confirmation must validate IANA truth and persist canonical evidence.');
requireFunctionPattern('schedule.upsert-role-acl', 'core', 'upsert_doctor_schedule', /NOT\s+COALESCE\s*\([\s\S]*?v_actor_role\s*=\s*'admin'[\s\S]*?v_actor_role\s*=\s*'org_admin'[\s\S]*?v_actor_org_id\s*=\s*v_doctor_org_id[\s\S]*?false\s*\)/i, 'schedule writes must prove platform or same-org admin scope with null-safe denial.');
requireFunctionPattern('schedule.upsert-confirmed-timezone', 'core', 'upsert_doctor_schedule', /v_timezone_confirmed_at\s+IS\s+NULL[\s\S]*?Facility timezone is not confirmed/i, 'schedule writes must reject facilities without confirmed timezone truth.');
requireFunctionPattern('schedule.upsert-overlap', 'core', 'upsert_doctor_schedule', /schedule\.start_time\s*<\s*p_end_time[\s\S]*?schedule\.end_time\s*>\s*p_start_time/i, 'schedule upserts must reject overlapping shifts.');
requireFunctionPattern('schedule.upsert-booking-coverage', 'core', 'upsert_doctor_schedule', /Schedule change would remove active booked visits/i, 'schedule edits must preserve coverage for active booked visits.');
requireFunctionPattern('schedule.upsert-slot-alignment', 'core', 'upsert_doctor_schedule', /EXTRACT\s*\(\s*MINUTE\s+FROM\s+p_start_time\s*\)[\s\S]*?15-minute increments/i, 'schedule boundaries must align with the availability and booking slot grid.');
requireFunctionPattern('schedule.upsert-dst-roundtrip', 'core', 'upsert_doctor_schedule', /AT\s+TIME\s+ZONE\s+v_doctor_timezone\)\s+AT\s+TIME\s+ZONE\s+v_doctor_timezone[\s\S]*?valid facility-local times/i, 'schedule boundaries must reject nonexistent facility-local DST times.');
requireFunctionPattern('schedule.upsert-natural-key-lock', 'core', 'upsert_doctor_schedule', /v_target_schedule_id\s+IS\s+NULL[\s\S]*?schedule\.doctor_id\s*=\s*p_doctor_id[\s\S]*?schedule\.start_time\s*=\s*p_start_time[\s\S]*?FOR\s+UPDATE/i, 'natural-key retries must lock and reuse the existing schedule before booked-visit checks.');
forbidFunctionPattern('schedule.upsert-no-conflict-bypass', 'core', 'upsert_doctor_schedule', /ON\s+CONFLICT/i, 'natural-key retries must not bypass booked-visit protection through ON CONFLICT.');
requireFunctionPattern('schedule.delete-role-acl', 'core', 'delete_doctor_schedule', /NOT\s+COALESCE\s*\([\s\S]*?v_actor_role\s*=\s*'admin'[\s\S]*?v_actor_org_id\s*=\s*v_schedule\.organization_id[\s\S]*?false\s*\)/i, 'schedule deletion must prove same-org authority with null-safe denial.');
requireFunctionPattern('schedule.delete-booking-guard', 'core', 'delete_doctor_schedule', /active_visit\.scheduled_start_at\s*<\s*v_window_end[\s\S]*?active_visit\.scheduled_end_at\s*>\s*v_window_start/i, 'schedule deletion must preserve shifts with active bookings.');
requireFunctionPattern('schedule.delete-doctor-lock', 'core', 'delete_doctor_schedule', /FOR\s+UPDATE\s+OF\s+schedule\s*,\s*doctor/i, 'schedule deletion must serialize against doctor booking selection.');

requireFunctionPattern('lifecycle.reject-emergency', 'core', 'transition_scheduled_visit', /care_mode\s+IS\s+NULL\s+OR\s+v_visit\.request_id\s+IS\s+NOT\s+NULL/i, 'scheduled lifecycle commands must reject emergency and legacy visits.');
requireFunctionPattern('lifecycle.role-matrix', 'core', 'transition_scheduled_visit', /v_is_patient[\s\S]*?v_is_clinician[\s\S]*?v_is_org_admin[\s\S]*?v_is_admin/i, 'lifecycle transitions must derive patient, clinician, org-admin, and admin authority separately.');
requireFunctionPattern('lifecycle.null-safe-role-matrix', 'core', 'transition_scheduled_visit', /v_is_admin\s*:=\s*v_is_service_role\s+OR\s+COALESCE[\s\S]*?v_is_org_admin\s*:=\s*COALESCE/i, 'lifecycle role booleans must deny when profile role data is null.');
requireFunctionPattern('lifecycle.reschedule-lock', 'core', 'transition_scheduled_visit', /pg_advisory_xact_lock[\s\S]*?p_select_bookable_doctor/i, 'rescheduling must lock and reselect atomically.');
requireFunctionPattern('lifecycle.reschedule-facility-lock', 'core', 'transition_scheduled_visit', /FOR\s+UPDATE\s+OF\s+visit[\s\S]*?FOR\s+SHARE\s+OF\s+hospital/i, 'rescheduling must stabilize the visit and facility truth together.');
requireFunctionPattern('lifecycle.reschedule-confirmed-timezone', 'core', 'transition_scheduled_visit', /hospital_timezone_confirmed_at[\s\S]*?Facility timezone is not confirmed/i, 'rescheduling must reject a facility whose timezone confirmation was withdrawn.');
requireFunctionPattern('lifecycle.reschedule-patient-lock', 'core', 'transition_scheduled_visit', /'scheduled-patient:'[\s\S]*?patient_visit\.id\s+IS\s+DISTINCT\s+FROM\s+p_visit_id[\s\S]*?Patient already has a scheduled visit/i, 'rescheduling must serialize and reject patient-window overlap while excluding itself.');
requireFunctionPattern('lifecycle.reschedule-room-lock', 'core', 'transition_scheduled_visit', /emergency_chat_rooms[\s\S]*?visit_id\s*=\s*p_visit_id[\s\S]*?FOR\s+UPDATE/i, 'clinician reassignment must lock the consult room before changing participants.');

requireFunctionPattern('consult.ensure-visit-scope', 'core', 'ensure_async_consult_room', /care_mode\s*<>\s*'telemedicine_async'[\s\S]*?request_id\s+IS\s+NOT\s+NULL/i, 'room creation must be restricted to scheduled async visits.');
requireFunctionPattern('consult.ensure-actor-acl', 'core', 'ensure_async_consult_room', /v_actor_id\s+IS\s+DISTINCT\s+FROM\s+v_visit\.user_id[\s\S]*?v_actor_id\s+IS\s+DISTINCT\s+FROM\s+v_visit\.doctor_profile_id/i, 'room creation must prove patient or assigned clinician scope.');
requireFunctionPattern('consult.ensure-room-lock', 'core', 'ensure_async_consult_room', /emergency_chat_rooms[\s\S]*?visit_id\s*=\s*p_visit_id[\s\S]*?FOR\s+UPDATE/i, 'room creation and participant repair must lock the existing room after the visit.');
requireFunctionPattern('consult.send-current-assignment', 'core', 'send_async_consult_message', /v_actor_id\s+IS\s+DISTINCT\s+FROM\s+v_patient_id[\s\S]*?v_actor_id\s+IS\s+DISTINCT\s+FROM\s+v_doctor_profile_id/i, 'message send must re-authorize the patient or currently assigned clinician after locking the visit.');
requireFunctionPattern('consult.send-active-visit', 'core', 'send_async_consult_message', /visit\.status\s+IN\s*\(\s*'upcoming'\s*,\s*'in_progress'\s*\)/i, 'message send must reject a stale active room after the scheduled visit closes.');
requireFunctionPattern('consult.send-idempotency', 'core', 'send_async_consult_message', /client_message_id[\s\S]*?already used for another message/i, 'message send must protect client retry identity.');
requireFunctionPattern('consult.send-idempotency-full-payload', 'core', 'send_async_consult_message', /v_message\.metadata\s+IS\s+DISTINCT\s+FROM\s+p_metadata[\s\S]*?v_message\.attachment_mime_type[\s\S]*?v_message\.attachment_size_bytes[\s\S]*?v_message\.attachment_duration_ms/i, 'message retries must compare metadata and the complete attachment payload.');
requireFunctionPattern('consult.send-storage-proof', 'core', 'send_async_consult_message', /FROM\s+storage\.objects[\s\S]*?bucket_id\s*=\s*'documents'[\s\S]*?object\.name\s*=\s*v_attachment_path/i, 'attachment messages must verify the private object before insertion.');
requireFunctionPattern('consult.send-storage-lock', 'core', 'send_async_consult_message', /FROM\s+storage\.objects[\s\S]*?FOR\s+SHARE/i, 'attachment verification must lock the object until its message reference commits.');
requireFunctionPattern('consult.send-ai-server-owned', 'core', 'send_async_consult_message', /p_attachment_duration_ms[\s\S]*?\)[\s\S]*?ai_assisted[\s\S]*?false/i, 'participant sends must persist false for server-owned AI provenance.');
forbidFunctionPattern('consult.send-no-ai-claim', 'core', 'send_async_consult_message', /p_ai_assisted/i, 'callers must not self-declare AI provenance.');
requireFunctionPattern('consult.read-current-assignment', 'core', 'mark_async_consult_room_read', /v_actor_id\s+IS\s+DISTINCT\s+FROM\s+v_patient_id[\s\S]*?v_actor_id\s+IS\s+DISTINCT\s+FROM\s+v_doctor_profile_id/i, 'read updates must re-authorize the patient or currently assigned clinician after locking the visit.');
requireFunctionPattern('consult.read-same-room', 'core', 'mark_async_consult_room_read', /message\.id\s*=\s*v_message_id[\s\S]*?message\.room_id\s*=\s*p_room_id/i, 'read updates must reject cross-room message ids.');
for (const functionName of ['send_async_consult_message', 'mark_async_consult_room_read']) {
  const sqlFunction = getFunction('core', functionName);
  check(
    `consult.${functionName}.lock-order`,
    Boolean(sqlFunction) && patternsAppearInOrder(sqlFunction.body, [
      /FROM\s+public\.visits\s+visit[\s\S]*?FOR\s+UPDATE\s+OF\s+visit/i,
      /FROM\s+public\.emergency_chat_rooms\s+room[\s\S]*?FOR\s+UPDATE/i,
      /FROM\s+public\.emergency_chat_participants\s+participant[\s\S]*?FOR\s+UPDATE/i,
    ]),
    `${SOURCE_PATHS.core}: public.${functionName} must lock visit, then room, then participant.`
  );
}

// Emergency matching prefers schedules without requiring them.
for (const functionName of ['auto_assign_doctor', 'handle_doctor_unavailability_failover']) {
  const sqlFunction = requireFunction('automations', functionName);
  if (!sqlFunction) continue;
  const candidateStart = sqlFunction.body.search(/SELECT\s+d\.id/i);
  const candidateEnd = candidateStart >= 0
    ? sqlFunction.body.slice(candidateStart).search(/LIMIT\s+1\s*;/i)
    : -1;
  const candidateQuery = candidateStart >= 0 && candidateEnd >= 0
    ? sqlFunction.body.slice(candidateStart, candidateStart + candidateEnd)
    : '';
  const orderIndex = candidateQuery.search(/ORDER\s+BY/i);
  const filterPart = orderIndex >= 0 ? candidateQuery.slice(0, orderIndex) : candidateQuery;
  const orderPart = orderIndex >= 0 ? candidateQuery.slice(orderIndex) : '';

  check(`emergency.${functionName}.candidate-query`, Boolean(candidateQuery), `${SOURCE_PATHS.automations}: ${functionName} candidate query was not found.`);
  check(`emergency.${functionName}.schedule-preference`, /doctor_schedules[\s\S]*?THEN\s+0[\s\S]*?ELSE\s+1/i.test(orderPart), `${SOURCE_PATHS.automations}: ${functionName} must prefer current schedule coverage in ordering.`);
  check(`emergency.${functionName}.on-call-fallback`, /is_on_call|status[^\n]*on_call/i.test(orderPart), `${SOURCE_PATHS.automations}: ${functionName} must retain on-call fallback ordering.`);
  check(`emergency.${functionName}.schedule-not-required`, !/doctor_schedules/i.test(filterPart), `${SOURCE_PATHS.automations}: ${functionName} must not require a schedule row in candidate filters.`);
}
requireFunctionPattern('emergency.unassigned-continues', 'automations', 'auto_assign_doctor', /IF\s+v_doctor_id\s+IS\s+NOT\s+NULL\s+THEN[\s\S]*?END\s+IF\s*;[\s\S]*?RETURN\s+NEW/i, 'missing doctors must leave emergency creation unblocked.');
requireFunctionPattern('emergency.failover-can-clear', 'automations', 'handle_doctor_unavailability_failover', /IF\s+v_candidate_doctor_id\s+IS\s+NULL\s+THEN[\s\S]*?assigned_doctor_id\s*=\s*NULL[\s\S]*?CONTINUE/i, 'missing replacement doctors must clear the optional assignment and continue.');

// Consult Edge configuration and read-only behavior.
const consultConfig = extractTomlFunctionSection(sources.config, 'consult-assist');
check(
  'consult-edge.config-section',
  Boolean(consultConfig),
  `${SOURCE_PATHS.config}: Wire [functions.consult-assist] before deployment.`
);
if (consultConfig) {
  check('consult-edge.enabled', /^enabled\s*=\s*true\s*$/im.test(consultConfig), `${SOURCE_PATHS.config}: consult-assist must be enabled.`);
  check('consult-edge.jwt', /^verify_jwt\s*=\s*true\s*$/im.test(consultConfig), `${SOURCE_PATHS.config}: consult-assist must use verify_jwt = true.`);
  check('consult-edge.entrypoint', /entrypoint\s*=\s*"\.\/functions\/consult-assist\/index\.ts"/i.test(consultConfig), `${SOURCE_PATHS.config}: consult-assist entrypoint is missing or incorrect.`);
}
requirePattern('consult-edge.auth', 'consultIndex', /authenticateActor\s*\(\s*req\s*\)/i, 'consult-assist must authenticate before drafting.');
requirePattern('consult-edge.access', 'consultIndex', /authorizeConsultAccess\s*\(/i, 'consult-assist must prove room access before drafting.');
requirePattern('consult-edge.active-visit', 'consultAccess', /\[\s*"upcoming"\s*,\s*"in_progress"\s*\][\s\S]*?visit\.status/i, 'consult-assist must reject stale rooms after the scheduled visit closes.');
requirePattern('consult-edge.provider-key', 'consultAnthropic', /ANTHROPIC_API_KEY/i, 'consult-assist must fail honestly without a provider key.');
requirePattern('consult-edge.provider-model', 'consultAnthropic', /CONSULT_ASSIST_MODEL[\s\S]*?ANTHROPIC_MODEL/i, 'consult-assist must resolve an explicit model configuration.');
requirePattern('consult-edge.provider-fallback-key', 'consultAnthropic', /OPENAI_API_KEY/i, 'consult-assist must retain the established secondary provider path.');
requirePattern('consult-edge.provider-fallback-model', 'consultAnthropic', /CONSULT_ASSIST_OPENAI_MODEL[\s\S]*?OPENAI_MODEL/i, 'consult-assist must resolve the secondary provider model independently.');
requirePattern('consult-edge.no-live-video-prompt', 'consultAnthropic', /Do\s+not\s+offer\s+or\s+imply\s+live-video\s+care/i, 'the draft prompt must preserve the async-only product boundary.');
const consultFunctionSource = [
  sources.consultIndex,
  sources.consultAccess,
  sources.consultAnthropic,
  sources.consultContracts,
].join('\n');
check(
  'consult-edge.no-data-mutations',
  ![
    sources.consultIndex,
    sources.consultAccess,
    sources.consultAnthropic,
    sources.consultContracts,
  ].some(hasSupabaseMutation),
  'supabase/functions/consult-assist: AI assistance must remain read-only and return a draft without database mutation.'
);
check(
  'consult-edge.no-admin-shortcut',
  !/p_is_admin|\borganization_id\b|\.from\(\s*["']profiles["']\s*\)/i.test(sources.consultAccess),
  `${SOURCE_PATHS.consultAccess}: consult access must not inherit admin or organization-wide clinical visibility.`
);

// Demo data extends schedules only and never fabricates encounters or chats.
for (const field of ['schedule_ready', 'book_visit_ready', 'telemedicine_ready']) {
  requirePattern(`demo.readiness.${field}`, 'demo', new RegExp(`\\b${field}\\s*:`, 'i'), `demo summary must expose ${field}.`);
}
requirePattern('demo.schedule-upsert-key', 'demo', /onConflict:\s*"doctor_id,date,start_time,end_time"/i, 'demo schedule reruns must use the canonical exact-shift key.');
requirePattern('demo.schedule-horizon', 'demo', /DEMO_SCHEDULE_HORIZON_DAYS/i, 'demo schedules must use a bounded rolling horizon.');
requirePattern('demo.location-allocation-bounded', 'demoHospitals', /DEMO_LOCATION_NUDGE_ATTEMPTS[\s\S]*?allocateDemoLocation/i, 'demo hospital location collision handling must remain bounded.');
requirePattern('demo.location-allocation-rechecks', 'demoHospitals', /allocateDemoLocation[\s\S]*?\.from\(\s*"hospitals"\s*\)[\s\S]*?\.eq\(\s*"latitude"[\s\S]*?\.eq\(\s*"longitude"/i, 'every adjusted demo hospital coordinate must be checked before upsert.');
forbidPattern('demo.location-no-place-id-takeover', 'demoHospitals', /place_id:\s*toSafeString\(\s*existingAtLocation\?\.place_id/i, 'demo location collision handling must not take over another row identity.');
requirePattern('demo.timezone-provider-key', 'demoTimezone', /GOOGLE_MAPS_API_KEY/i, 'demo facility timezone resolution must use the server-owned Maps key.');
requirePattern('demo.timezone-coordinate-timestamp', 'demoTimezone', /searchParams\.set\(\s*"location"[\s\S]*?searchParams\.set\(\s*"timestamp"/i, 'demo facility timezone resolution must use coordinates and a bounded point-in-time lookup.');
requirePattern('demo.timezone-provider-fallback', 'demoTimezone', /TIME_API_COORDINATE_URL[\s\S]*?resolveGoogleTimezone[\s\S]*?resolveTimeApiTimezone/i, 'demo timezone resolution must keep Google primary and use the validated coordinate fallback only after failure.');
requirePattern('demo.timezone-iana-validation', 'demoTimezone', /Intl\.DateTimeFormat[\s\S]*?timeZone:\s*candidate/i, 'resolved facility timezones must pass runtime IANA validation.');
requirePattern('demo.timezone-timeout', 'demoTimezone', /TIME_ZONE_LOOKUP_TIMEOUT_MS\s*=\s*5_000[\s\S]*?AbortController/i, 'demo timezone lookup must remain bounded.');
requirePattern('demo.timezone-source-accounting', 'demo', /timezone_sources:\s*\{[\s\S]*?google:[\s\S]*?timeapi:/i, 'demo bootstrap must expose timezone resolution source counts.');
requirePattern('demo.timezone-confirmation-persisted', 'demo', /timezone_confirmed_at:\s*now\.toISOString\(\)[\s\S]*?timezone_confirmation_source:\s*timezoneSource/i, 'demo facilities must persist the same canonical timezone confirmation fields as live facilities.');
forbidPattern('demo.timezone-no-silent-utc', 'demoTimezone', /toSafeString\([^\n,]+,\s*["']UTC["']\)/i, 'missing or invalid facility timezone truth must not silently become UTC.');
check(
  'demo.timezone-before-schedule-write',
  patternsAppearInOrder(sources.demo, [
    /\.from\(\s*"hospitals"\s*\)[\s\S]*?\.update\(\s*\{\s*timezone/i,
    /\.from\(\s*"doctor_schedules"\s*\)[\s\S]*?\.upsert\(/i,
  ]),
  `${SOURCE_PATHS.demo}: demo facility timezone must persist before its schedule rows are written.`
);
const demoRequestHandler = sources.demo.slice(
  sources.demo.indexOf('export const handleBootstrapDemoEcosystemRequest')
);
check(
  'demo.emergency-before-scheduled-care',
  patternsAppearInOrder(demoRequestHandler, [
    /ensureDemoStaff\(/i,
    /createFacilityTimezoneResolver\(/i,
    /ensureDemoScheduledCare\(/i,
  ]),
  `${SOURCE_PATHS.demo}: emergency/demo staffing must complete before optional scheduled-care timezone work.`
);
requirePattern('demo.preserve-today-schedule', 'demo', /\.lt\(\s*"date"\s*,\s*localToday\s*\)/i, 'expired-shift cleanup must preserve the facility-local current day.');
forbidPattern('demo.no-delete-today-schedule', 'demo', /\.lte\(\s*"date"\s*,\s*localToday\s*\)/i, 'expired-shift cleanup must not delete today before it is over.');
requirePattern('demo.retirement-active-visit-audit', 'demo', /hasActiveScheduledVisitForDoctor[\s\S]*?care_mode[\s\S]*?"upcoming"\s*,\s*"in_progress"/i, 'demo clinician retirement must detect active scheduled visits.');
requirePattern('demo.retirement-active-visit-defer', 'demo', /if\s*\(\s*await\s+hasActiveScheduledVisitForDoctor[\s\S]*?retirementDeferred\s*\+=\s*1[\s\S]*?continue\s*;/i, 'demo clinician retirement must preserve schedules and Auth access while booked care is active.');
requirePattern('demo.retirement-provider-visits', 'demo', /\.from\(\s*"visits"\s*\)[\s\S]*?\.eq\(\s*"doctor_id"\s*,\s*doctor\.id\s*\)/i, 'Auth deletion must account for provider-side visit history.');
requirePattern('demo.retirement-consult-participants', 'demo', /\.from\(\s*"emergency_chat_participants"\s*\)[\s\S]*?\.eq\(\s*"user_id"\s*,\s*profile\.id\s*\)/i, 'Auth deletion must account for consult participant history.');
for (const tableName of [
  'visits',
  'emergency_chat_rooms',
  'emergency_chat_participants',
  'emergency_chat_messages',
]) {
  check(
    `demo.no-create.${tableName}`,
    !hasTableCreationMutation(sources.demo, tableName),
    `${SOURCE_PATHS.demo}: bootstrap may probe ${tableName}, but must not insert or upsert encounter/chat rows.`
  );
}

// Maintained App, generated App, and synchronized Console types must expose the
// same new backend surface before API/UI adoption begins.
const requiredTypeFields = {
  hospitals: [
    /\btimezone:\s*string\b/,
    /\btimezone_confirmed_at:\s*string\s*\|\s*null\b/,
    /\btimezone_confirmation_source:\s*string\s*\|\s*null\b/,
    /\btimezone_confirmed_by:\s*string\s*\|\s*null\b/,
  ],
  doctor_schedules: [/\bupdated_at:\s*string\b/],
  visits: [
    /\bbooking_idempotency_key:\s*string\s*\|\s*null\b/,
    /\bcare_mode:\s*string\s*\|\s*null\b/,
    /\bdoctor_id:\s*string\s*\|\s*null\b/,
    /\bscheduled_start_at:\s*string\s*\|\s*null\b/,
    /\bscheduled_end_at:\s*string\s*\|\s*null\b/,
    /\bscheduled_timezone:\s*string\s*\|\s*null\b/,
  ],
  emergency_chat_rooms: [
    /\bchannel_type:\s*string\b/,
    /\bemergency_request_id:\s*string\s*\|\s*null\b/,
  ],
  emergency_chat_messages: [
    /\bai_assisted:\s*boolean\b/,
    /\battachment_duration_ms:\s*number\s*\|\s*null\b/,
    /\battachment_mime_type:\s*string\s*\|\s*null\b/,
    /\battachment_size_bytes:\s*number\s*\|\s*null\b/,
    /\battachment_storage_path:\s*string\s*\|\s*null\b/,
  ],
};

for (const sourceKey of ['generatedTypes', 'appTypes', 'consoleTypes']) {
  for (const [tableName, patterns] of Object.entries(requiredTypeFields)) {
    const tableBlock = extractTypeTable(sources[sourceKey] || '', tableName) || '';
    check(
      `types.${sourceKey}.${tableName}.exists`,
      Boolean(tableBlock),
      `${SOURCE_PATHS[sourceKey]}: missing ${tableName} type contract.`
    );
    patterns.forEach((pattern, index) => {
      check(
        `types.${sourceKey}.${tableName}.${index}`,
        testPattern(tableBlock, pattern),
        `${SOURCE_PATHS[sourceKey]}: ${tableName} is missing ${pattern.source}.`
      );
    });
  }

  for (const functionName of rpcNames) {
    check(
      `types.${sourceKey}.rpc.${functionName}`,
      new RegExp(`^      ${escapeRegExp(functionName)}: \\{`, 'm').test(sources[sourceKey] || ''),
      `${SOURCE_PATHS[sourceKey]}: missing ${functionName} RPC type.`
    );
  }

  const sendTypeBlock = (
    (sources[sourceKey] || '').match(/^      send_async_consult_message: \{[\s\S]*?^        Returns:/m) || ['']
  )[0];
  check(
    `types.${sourceKey}.rpc.send-no-ai-claim`,
    Boolean(sendTypeBlock) && !/p_ai_assisted/.test(sendTypeBlock),
    `${SOURCE_PATHS[sourceKey]}: send_async_consult_message types must not expose caller-asserted AI provenance.`
  );
}

// Keep the narrowed doctrine free of parallel encounter tables and live-video infrastructure.
const migrationDir = path.join(ROOT, 'supabase', 'migrations');
let allMigrations = '';
if (!fs.existsSync(migrationDir)) {
  check('source.migrations', false, 'Missing supabase/migrations directory.');
} else {
  allMigrations = fs.readdirSync(migrationDir)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()
    .map((fileName) => fs.readFileSync(path.join(migrationDir, fileName), 'utf8'))
    .join('\n');
}
check(
  'doctrine.no-parallel-encounter-tables',
  !/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?(?:appointments|telemedicine_sessions)"?\b/i.test(allMigrations),
  'supabase/migrations: do not create appointments or telemedicine_sessions; extend visits and existing room tables.'
);
const implementationCorpus = [
  allMigrations,
  sources.config,
  sources.demo,
  consultFunctionSource,
].join('\n');
check(
  'doctrine.no-live-video-runtime',
  !/\b(?:RTCPeerConnection|RTCSessionDescription|RTCIceCandidate|getUserMedia|getDisplayMedia|MediaStreamTrack|WebRTC|LiveKit|AgoraRTC|mediasoup|JitsiMeet|TwilioVideo)\b/i.test(implementationCorpus),
  'Scheduled care sources must not add WebRTC, live-video SDKs, or realtime media infrastructure.'
);

if (failures.length > 0) {
  console.error(
    `[scheduled-visits-contract] FAIL: ${failures.length} of ${checkCount} static checks failed.`
  );
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('[scheduled-visits-contract] No files or database rows were changed.');
  process.exitCode = 1;
} else {
  console.log(
    `[scheduled-visits-contract] PASS: ${checkCount} static contract checks passed with zero side effects.`
  );
}
