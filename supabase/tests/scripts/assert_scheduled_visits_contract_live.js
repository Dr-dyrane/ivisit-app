#!/usr/bin/env node

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
const phase =
  process.argv.find((value) => value.startsWith('--phase='))?.slice('--phase='.length) ||
  'postdeploy';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[scheduled-visits-live] Missing Supabase URL or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('[scheduled-visits-live] Refusing to inspect an unconfirmed project reference.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const normalized = (expression) =>
  `LOWER(REGEXP_REPLACE(REPLACE(COALESCE(${expression}, ''), '::text', ''), '\\s+', ' ', 'g'))`;

function includesAll(expression, fragments) {
  const sql = normalized(expression);
  return fragments
    .map(
      (fragment) =>
        `POSITION(${literal(fragment.toLowerCase().replaceAll('::text', '').replace(/\s+/g, ' ').trim())} IN ${sql}) > 0`
    )
    .join('\nAND ');
}

function fn(signature, fragments = []) {
  const value = literal(signature);
  return `to_regprocedure(${value}) IS NOT NULL${
    fragments.length ? `\nAND ${includesAll(`pg_get_functiondef(to_regprocedure(${value}))`, fragments)}` : ''
  }`;
}

function fnPrivileges(signature) {
  const value = literal(signature);
  return `NOT COALESCE(has_function_privilege('anon', to_regprocedure(${value}), 'EXECUTE'), FALSE)
  AND COALESCE(has_function_privilege('authenticated', to_regprocedure(${value}), 'EXECUTE'), FALSE)
  AND COALESCE(has_function_privilege('service_role', to_regprocedure(${value}), 'EXECUTE'), FALSE)`;
}

function constraint(table, name, fragments) {
  return `EXISTS (
    SELECT 1 FROM pg_constraint item
    WHERE item.conrelid = ${literal(`public.${table}`)}::regclass
      AND item.conname = ${literal(name)}
      AND ${includesAll('pg_get_constraintdef(item.oid)', fragments)}
  )`;
}

function index(name, fragments) {
  const value = literal(`public.${name}`);
  return `to_regclass(${value}) IS NOT NULL
  AND ${includesAll(`pg_get_indexdef(to_regclass(${value}))`, fragments)}`;
}

function policy(schema, table, name, fragments) {
  return `EXISTS (
    SELECT 1 FROM pg_policies item
    WHERE item.schemaname = ${literal(schema)}
      AND item.tablename = ${literal(table)}
      AND item.policyname = ${literal(name)}
      AND ${includesAll("COALESCE(item.qual, '') || ' ' || COALESCE(item.with_check, '')", fragments)}
  )`;
}

function trigger(table, name) {
  return `EXISTS (
    SELECT 1 FROM pg_trigger item
    WHERE item.tgrelid = ${literal(`public.${table}`)}::regclass
      AND item.tgname = ${literal(name)}
      AND NOT item.tgisinternal
  )`;
}

const check = (name, expression) => ({ name, expression });

const preflightChecks = [
  check(
    'required owner tables exist',
    `to_regclass('public.hospitals') IS NOT NULL
    AND to_regclass('public.doctors') IS NOT NULL
    AND to_regclass('public.doctor_schedules') IS NOT NULL
    AND to_regclass('public.visits') IS NOT NULL
    AND to_regclass('public.emergency_chat_rooms') IS NOT NULL
    AND to_regclass('public.emergency_chat_participants') IS NOT NULL
    AND to_regclass('public.emergency_chat_messages') IS NOT NULL`
  ),
  check(
    'existing schedules satisfy ordered same-day shifts',
    `NOT EXISTS (SELECT 1 FROM public.doctor_schedules WHERE end_time <= start_time)`
  ),
  check(
    'existing schedules have no duplicate natural keys',
    `NOT EXISTS (
      SELECT doctor_id, date, start_time, end_time
      FROM public.doctor_schedules
      GROUP BY doctor_id, date, start_time, end_time
      HAVING COUNT(*) > 1
    )`
  ),
  check(
    'legacy communication rooms remain emergency-owned',
    `NOT EXISTS (
      SELECT 1 FROM public.emergency_chat_rooms WHERE emergency_request_id IS NULL
    )`
  ),
  check(
    'existing read receipts reference a message in the same room',
    `NOT EXISTS (
      SELECT 1 FROM public.emergency_chat_participants participant
      WHERE participant.last_read_message_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.emergency_chat_messages message
          WHERE message.id = participant.last_read_message_id
            AND message.room_id = participant.room_id
        )
    )`
  ),
  check(
    'existing communication messages use supported kinds',
    `NOT EXISTS (
      SELECT 1 FROM public.emergency_chat_messages
      WHERE kind NOT IN ('text', 'quick_action', 'status_event', 'system', 'image', 'video')
    )`
  ),
  check(
    'private documents bucket exists before policy tightening',
    `EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents')`
  ),
];

const rpcSignatures = [
  'public.get_book_visit_availability(uuid,text,text,timestamptz,timestamptz)',
  'public.get_console_doctor_schedules(uuid,date,date)',
  'public.confirm_hospital_timezone(uuid,text)',
  'public.upsert_doctor_schedule(uuid,date,time without time zone,time without time zone,text,boolean,uuid)',
  'public.delete_doctor_schedule(uuid)',
  'public.ensure_async_consult_room(uuid)',
  'public.book_scheduled_visit(uuid,text,text,timestamptz,uuid,text)',
  'public.transition_scheduled_visit(uuid,text,timestamptz,text)',
  'public.send_async_consult_message(uuid,text,text,text,jsonb,text,text,bigint,integer)',
  'public.mark_async_consult_room_read(uuid,uuid)',
];

const postDeployChecks = [
  check(
    'hospital timezone truth and validation are live',
    `(SELECT COUNT(DISTINCT column_name) = 4 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hospitals'
        AND column_name IN ('timezone', 'timezone_confirmed_at',
          'timezone_confirmation_source', 'timezone_confirmed_by'))
    AND (SELECT is_nullable = 'NO' FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hospitals'
        AND column_name = 'timezone')
    AND (${constraint('hospitals', 'hospitals_timezone_length_check', [
      'char_length(timezone)',
    ])})
    AND (${constraint('hospitals', 'hospitals_timezone_confirmation_source_check', [
      'manual',
      'google',
      'timeapi',
    ])})
    AND (${constraint('hospitals', 'hospitals_timezone_confirmation_coherence_check', [
      'timezone_confirmed_at is null',
      'timezone_confirmation_source is null',
      'timezone_confirmed_at is not null',
    ])})
    AND (${trigger('hospitals', 'validate_hospital_timezone_value')})
    AND (${fn('public.confirm_hospital_timezone(uuid,text)', [
      'pg_timezone_names',
      'timezone_confirmed_at = now()',
      "timezone_confirmation_source = 'manual'",
    ])})`
  ),
  check(
    'doctor schedule integrity and indexes are live',
    `(SELECT COUNT(*) = 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'doctor_schedules'
        AND column_name = 'updated_at' AND is_nullable = 'NO')
    AND (${constraint('doctor_schedules', 'doctor_schedules_time_order_check', [
      'end_time > start_time',
    ])})
    AND (${constraint('doctor_schedules', 'doctor_schedules_exact_shift_key', [
      'unique (doctor_id, date, start_time, end_time)',
    ])})
    AND (${index('idx_doctor_schedules_available_window', [
      'doctor_id',
      'start_time',
      'end_time',
      'is_available',
    ])})
    AND (${trigger('doctor_schedules', 'handle_doctor_schedule_updated_at')})`
  ),
  check(
    'scheduled visit columns, constraints, and indexes are live',
    `(SELECT COUNT(DISTINCT column_name) = 6 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'visits'
        AND column_name IN ('doctor_id', 'care_mode', 'scheduled_start_at',
          'scheduled_end_at', 'scheduled_timezone', 'booking_idempotency_key'))
    AND (${constraint('visits', 'visits_care_mode_check', ['telemedicine_async'])})
    AND (${constraint('visits', 'visits_scheduled_contract_check', [
      'request_id is null',
      'scheduled_end_at > scheduled_start_at',
      'booking_idempotency_key is not null',
    ])})
    AND (${index('idx_visits_booking_idempotency', ['user_id', 'booking_idempotency_key'])})
    AND (${index('idx_visits_doctor_scheduled_window', ['doctor_id', 'scheduled_start_at'])})
    AND (${index('idx_visits_patient_scheduled_window', ['user_id', 'scheduled_start_at'])})`
  ),
  check(
    'async consult room ownership remains legacy-compatible',
    `(SELECT COUNT(DISTINCT column_name) = 2 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'emergency_chat_rooms'
        AND column_name IN ('channel_type', 'created_by'))
    AND (${constraint('emergency_chat_rooms', 'emergency_chat_rooms_owner_check', [
      'channel_type',
      'emergency_request_id is not null',
      'visit_id is not null',
    ])})
    AND (${constraint('emergency_chat_rooms', 'emergency_chat_rooms_visit_id_fkey', [
      'foreign key (visit_id)',
      'on delete set null',
    ])})
    AND (${index('idx_async_consult_room_visit', ['visit_id', 'telemedicine_async'])})
    AND (${trigger('visits', 'protect_async_consult_visit_owner')})`
  ),
  check(
    'consult media and read-state constraints are live',
    `(SELECT COUNT(DISTINCT column_name) = 5 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'emergency_chat_messages'
        AND column_name IN ('attachment_storage_path', 'attachment_mime_type',
          'attachment_size_bytes', 'attachment_duration_ms', 'ai_assisted'))
    AND (${constraint('emergency_chat_messages', 'emergency_chat_messages_kind_check', [
      "'image'",
      "'video'",
    ])})
    AND (${constraint('emergency_chat_messages', 'emergency_chat_messages_attachment_check', [
      '10485760',
      '26214400',
      '30000',
    ])})
    AND (${constraint('emergency_chat_messages', 'emergency_chat_messages_room_id_id_key', [
      'unique (room_id, id)',
    ])})
    AND (${constraint(
      'emergency_chat_participants',
      'emergency_chat_participants_last_read_message_id_fkey',
      ['foreign key (room_id, last_read_message_id)', 'on delete set null (last_read_message_id)']
    )})`
  ),
  check(
    'emergency chat participant helper excludes consult channels',
    fn('public.p_is_emergency_chat_participant(uuid)', ["v_channel_type <> 'emergency'"])
  ),
  check(
    'async consult participant helper requires active membership',
    fn('public.p_is_async_consult_participant(uuid)', [
      'telemedicine_async',
      'participant.left_at is null',
    ])
  ),
  check(
    'doctor schedule manager helper is org-admin scoped',
    fn('public.p_can_manage_doctor_schedule(uuid)', ["actor.role = 'org_admin'"])
  ),
  check(
    'patient visit write policy excludes scheduled care',
    policy('public', 'visits', 'Users manage own standalone visits', [
      'auth.uid() = user_id',
      'care_mode is null',
      'request_id is null',
    ])
  ),
  check(
    'async consult messages are participant scoped',
    policy('public', 'emergency_chat_messages', 'Users see emergency chat messages in scope', [
      'p_is_async_consult_participant(room_id)',
    ])
  ),
  check(
    'doctor schedule reads use manager scope',
    policy('public', 'doctor_schedules', 'Schedule admins read scoped doctor schedules', [
      'p_can_manage_doctor_schedule(doctor_id)',
    ])
  ),
  check(
    'direct chat and schedule mutations remain revoked',
    `NOT has_table_privilege('anon', 'public.emergency_chat_rooms', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.emergency_chat_rooms', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.emergency_chat_participants', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.emergency_chat_messages', 'INSERT')
    AND has_table_privilege('authenticated', 'public.doctor_schedules', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.doctor_schedules', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.doctor_schedules', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.doctor_schedules', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.doctor_schedules', 'DELETE')`
  ),
  check(
    'consult media bucket and policies are private and participant-scoped',
    `EXISTS (SELECT 1 FROM storage.buckets
      WHERE id = 'documents' AND public = FALSE AND file_size_limit = 26214400)
    AND (${policy('storage', 'objects', 'Consult participants upload private media', [
      "bucket_id = 'documents'",
      "foldername(name))[1] = 'telemedicine'",
      'p_is_async_consult_participant',
    ])})
    AND (${policy('storage', 'objects', 'Consult participants read linked private media', [
      'emergency_chat_messages',
      'attachment_storage_path',
    ])})
    AND NOT EXISTS (SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = 'Consult uploaders remove unlinked private media')`
  ),
  check(
    'schedule-aware emergency matching preserves fallback ordering',
    `(${fn('public.auto_assign_doctor()', [
      'doctor_schedules schedule',
      "in ('available', 'on_call')",
      'for update of d skip locked',
    ])})
    AND (${fn('public.handle_doctor_unavailability_failover()', [
      'doctor_schedules schedule',
      "in ('available', 'on_call')",
      'for update of d skip locked',
    ])})`
  ),
  ...rpcSignatures.map((signature) =>
    check(
      `RPC grant is explicit for ${signature}`,
      `(${fn(signature)}) AND (${fnPrivileges(signature)})`
    )
  ),
  check(
    'participant sends cannot self-assert trusted AI provenance',
    `(${fn(
      'public.send_async_consult_message(uuid,text,text,text,jsonb,text,text,bigint,integer)',
      ['ai_assisted', 'false', 'for share']
    )})
    AND to_regprocedure('public.send_async_consult_message(uuid,text,text,text,jsonb,text,text,bigint,integer,boolean)') IS NULL`
  ),
];

function probeSql(indexValue, expression, label = phase) {
  const tag = `ivisit_scheduled_${label}_${indexValue}`.replaceAll('-', '_');
  return `DO $${tag}$
BEGIN
  IF COALESCE((${expression}), FALSE) THEN
    RAISE EXCEPTION 'IVISIT_SCHEDULED_CONTRACT_PASS';
  END IF;
  RAISE EXCEPTION 'IVISIT_SCHEDULED_CONTRACT_FAIL';
END
$${tag}$;`;
}

async function runChecks(checks, label) {
  const results = [];
  for (const [indexValue, contract] of checks.entries()) {
    const { data, error } = await admin.rpc('exec_sql', {
      sql: probeSql(indexValue, contract.expression, label),
    });
    if (error) throw error;
    const message = String(data?.error || '');
    results.push({
      name: contract.name,
      pass: message.includes('IVISIT_SCHEDULED_CONTRACT_PASS'),
    });
  }
  const failures = results.filter((result) => !result.pass);
  console.log(
    `[scheduled-visits-live] target=${projectRef} phase=${label} passed=${results.length - failures.length}/${results.length}`
  );
  for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}`);
  return { failures, results };
}

async function run() {
  if (!['preflight', 'postdeploy'].includes(phase)) throw new Error(`Unknown phase: ${phase}`);
  const result = await runChecks(phase === 'preflight' ? preflightChecks : postDeployChecks, phase);
  if (result.failures.length) process.exitCode = 1;
}

module.exports = { admin, postDeployChecks, preflightChecks, probeSql, projectRef, runChecks };

if (require.main === module) {
  run().catch((error) => {
    console.error(`[scheduled-visits-live] ${error.message}`);
    process.exit(1);
  });
}
