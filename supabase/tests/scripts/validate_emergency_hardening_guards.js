const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[hardening-guards] Missing Supabase credentials (.env/.env.local).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function execSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`exec_sql failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`exec_sql rejected SQL: ${data?.error || 'unknown error'}`);
  }
}

async function assertRealtimePublicationCoverage() {
  await execSql(`
DO $$
DECLARE
  v_missing text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'supabase_realtime publication is missing';
  END IF;

  WITH expected(tablename) AS (
    VALUES
      ('ambulances'),
      ('doctors'),
      ('emergency_requests'),
      ('health_news'),
      ('hospitals'),
      ('insurance_policies'),
      ('notifications'),
      ('organizations'),
      ('payments'),
      ('profiles'),
      ('room_pricing'),
      ('service_pricing'),
      ('support_tickets'),
      ('user_activity'),
      ('visits')
  ),
  missing AS (
    SELECT e.tablename
    FROM expected e
    LEFT JOIN pg_publication_tables p
      ON p.pubname = 'supabase_realtime'
     AND p.schemaname = 'public'
     AND p.tablename = e.tablename
    WHERE p.tablename IS NULL
  )
  SELECT array_agg(tablename ORDER BY tablename) INTO v_missing FROM missing;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing realtime publication tables: %', array_to_string(v_missing, ', ');
  END IF;
END;
$$;
  `);

  console.log('[hardening-guards] Realtime publication coverage: PASS');
}

async function assertCriticalRlsScope() {
  await execSql(`
DO $$
DECLARE
  v_tbl text;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY['emergency_requests', 'payments', 'visits'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_tbl
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS disabled on critical table public.%', v_tbl;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename IN ('emergency_requests', 'payments', 'visits')
      AND (
        p.roles @> ARRAY['public']::name[]
        OR p.roles @> ARRAY['anon']::name[]
      )
  ) THEN
    RAISE EXCEPTION 'public/anon policy scope detected on critical emergency/payment tables';
  END IF;
END;
$$;
  `);

  console.log('[hardening-guards] Critical RLS scope: PASS');
}

async function assertTransitionAuditWritePath() {
  await execSql(`
DO $$
DECLARE
  v_def text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'emergency_status_transitions'
  ) THEN
    RAISE EXCEPTION 'emergency_status_transitions table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'emergency_status_transitions'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on emergency_status_transitions';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'emergency_status_transitions'
      AND column_name = 'reason'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'emergency_status_transitions.reason must be NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'emergency_status_transitions'
      AND p.cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'SELECT policy missing on emergency_status_transitions';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'emergency_status_transitions'
      AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'emergency_status_transitions should not expose INSERT/UPDATE/DELETE policies';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'emergency_requests'
      AND t.tgname = 'trg_log_emergency_status_transition'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'trg_log_emergency_status_transition is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'emergency_status_transitions'
      AND t.tgname = 'trg_emergency_status_transitions_append_only'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'trg_emergency_status_transitions_append_only is missing';
  END IF;

  SELECT pg_get_functiondef('public.log_emergency_status_transition()'::regprocedure) INTO v_def;
  IF position('request_snapshot' in v_def) = 0 OR position('transition_metadata' in v_def) = 0 THEN
    RAISE EXCEPTION 'log_emergency_status_transition missing snapshot/metadata persistence';
  END IF;

  SELECT pg_get_functiondef('public.enforce_emergency_status_write_path()'::regprocedure) INTO v_def;
  IF position('ivisit.allow_emergency_status_write' in v_def) = 0 THEN
    RAISE EXCEPTION 'enforce_emergency_status_write_path missing allow-write gate';
  END IF;
END;
$$;
  `);

  console.log('[hardening-guards] Transition audit write-path: PASS');
}

async function assertConsoleRpcLockSemantics() {
  await execSql(`
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.console_update_emergency_request(uuid,jsonb)'::regprocedure) INTO v_def;
  IF position('FOR UPDATE OF er' in v_def) = 0 THEN
    RAISE EXCEPTION 'console_update_emergency_request is missing FOR UPDATE OF er lock semantics';
  END IF;

  SELECT pg_get_functiondef('public.console_dispatch_emergency(uuid,uuid,uuid,text,text,text,text,text,text)'::regprocedure) INTO v_def;
  IF position('FOR UPDATE OF er' in v_def) = 0 OR position('FOR UPDATE OF a' in v_def) = 0 THEN
    RAISE EXCEPTION 'console_dispatch_emergency is missing explicit er/a lock semantics';
  END IF;

  SELECT pg_get_functiondef('public.console_complete_emergency(uuid)'::regprocedure) INTO v_def;
  IF position('FOR UPDATE OF er' in v_def) = 0 THEN
    RAISE EXCEPTION 'console_complete_emergency is missing FOR UPDATE OF er lock semantics';
  END IF;

  SELECT pg_get_functiondef('public.console_cancel_emergency(uuid,text)'::regprocedure) INTO v_def;
  IF position('FOR UPDATE OF er' in v_def) = 0 THEN
    RAISE EXCEPTION 'console_cancel_emergency is missing FOR UPDATE OF er lock semantics';
  END IF;

  SELECT pg_get_functiondef('public.console_update_responder_location(uuid,jsonb,double precision)'::regprocedure) INTO v_def;
  IF position('FOR UPDATE OF er' in v_def) = 0 THEN
    RAISE EXCEPTION 'console_update_responder_location is missing FOR UPDATE OF er lock semantics';
  END IF;
  IF position('v_req_status NOT IN (''in_progress'', ''accepted'', ''arrived'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'console_update_responder_location is missing active-status telemetry guard';
  END IF;
  IF position('Cannot update responder location before dispatch' in v_def) = 0 THEN
    RAISE EXCEPTION 'console_update_responder_location is missing dispatch assignment guard';
  END IF;
END;
$$;
  `);

  console.log('[hardening-guards] Console RPC lock semantics: PASS');
}

async function assertRpcExecuteScope() {
  await execSql(`
DO $$
DECLARE
  v_fn text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'create_emergency_v4(uuid,jsonb,jsonb)',
    'approve_cash_payment(uuid,uuid)',
    'decline_cash_payment(uuid,uuid)',
    'process_cash_payment(uuid,uuid,numeric)',
    'process_cash_payment_v2(uuid,uuid,numeric,text)',
    'process_wallet_payment(uuid,numeric,uuid)',
    'process_wallet_payment(uuid,uuid,uuid,numeric,text)',
    'notify_cash_approval_org_admins(uuid,uuid,numeric,numeric,text,text,text,uuid)',
    'upsert_service_pricing(jsonb)',
    'upsert_room_pricing(jsonb)',
    'delete_service_pricing(uuid)',
    'delete_room_pricing(uuid)',
    'update_hospital_availability(uuid,integer,integer,text,integer)',
    'discharge_patient(text)',
    'cancel_bed_reservation(text)',
    'complete_trip(text)',
    'cancel_trip(text)',
    'console_create_emergency_request(jsonb)',
    'console_update_emergency_request(uuid,jsonb)',
    'console_dispatch_emergency(uuid,uuid,uuid,text,text,text,text,text,text)',
    'console_complete_emergency(uuid)',
    'console_cancel_emergency(uuid,text)',
    'console_update_responder_location(uuid,jsonb,double precision)',
    'patient_update_emergency_request(uuid,jsonb)'
  ] LOOP
    IF has_function_privilege('anon', format('public.%s', v_fn), 'EXECUTE') THEN
      RAISE EXCEPTION 'anon execute exposure on %', v_fn;
    END IF;

    IF NOT has_function_privilege('authenticated', format('public.%s', v_fn), 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated execute missing on %', v_fn;
    END IF;
  END LOOP;
END;
$$;
  `);

  console.log('[hardening-guards] RPC execute scope: PASS');
}

async function assertMutationRoleGates() {
  await execSql(`
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.update_profile_by_admin(uuid,jsonb)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'update_profile_by_admin missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.notify_cash_approval_org_admins(uuid,uuid,numeric,numeric,text,text,text,uuid)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'notify_cash_approval_org_admins missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.approve_cash_payment(uuid,uuid)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'approve_cash_payment missing strict operator role gate';
  END IF;
  IF position('p.emergency_request_id = p_request_id' in v_def) = 0 THEN
    RAISE EXCEPTION 'approve_cash_payment missing payment/request integrity gate';
  END IF;

  SELECT pg_get_functiondef('public.decline_cash_payment(uuid,uuid)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'decline_cash_payment missing strict operator role gate';
  END IF;
  IF position('p.emergency_request_id = p_request_id' in v_def) = 0 THEN
    RAISE EXCEPTION 'decline_cash_payment missing payment/request integrity gate';
  END IF;

  SELECT pg_get_functiondef('public.process_cash_payment_v2(uuid,uuid,numeric,text)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'process_cash_payment_v2 missing strict operator role gate';
  END IF;
  IF position('v_request_org_id IS DISTINCT FROM p_organization_id' in v_def) = 0 THEN
    RAISE EXCEPTION 'process_cash_payment_v2 missing request/org integrity gate';
  END IF;

  SELECT pg_get_functiondef('public.process_cash_payment(uuid,uuid,numeric)'::regprocedure) INTO v_def;
  IF position('public.p_is_console_allowed()' in v_def) = 0 THEN
    RAISE EXCEPTION 'process_cash_payment missing console role gate';
  END IF;

  SELECT pg_get_functiondef('public.process_wallet_payment(uuid,numeric,uuid)'::regprocedure) INTO v_def;
  IF position('v_actor_id IS DISTINCT FROM p_user_id' in v_def) = 0 THEN
    RAISE EXCEPTION 'process_wallet_payment(uuid,numeric,uuid) missing actor ownership gate';
  END IF;

  IF to_regprocedure('public.process_wallet_payment(uuid,uuid,uuid,numeric,text)') IS NOT NULL THEN
    SELECT pg_get_functiondef('public.process_wallet_payment(uuid,uuid,uuid,numeric,text)'::regprocedure) INTO v_def;
    IF position('v_actor_id IS DISTINCT FROM p_user_id' in v_def) = 0 THEN
      RAISE EXCEPTION 'process_wallet_payment(uuid,uuid,uuid,numeric,text) missing actor ownership gate';
    END IF;
  END IF;

  SELECT pg_get_functiondef('public.upsert_service_pricing(jsonb)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'upsert_service_pricing missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.upsert_room_pricing(jsonb)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'upsert_room_pricing missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.delete_service_pricing(uuid)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'delete_service_pricing missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.delete_room_pricing(uuid)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'delete_room_pricing missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.update_hospital_availability(uuid,integer,integer,text,integer)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'update_hospital_availability missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.complete_trip(text)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'complete_trip missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.cancel_trip(text)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'cancel_trip missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.discharge_patient(text)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'discharge_patient missing strict operator role gate';
  END IF;

  SELECT pg_get_functiondef('public.cancel_bed_reservation(text)'::regprocedure) INTO v_def;
  IF position('v_actor_role NOT IN (''admin'', ''org_admin'', ''dispatcher'')' in v_def) = 0 THEN
    RAISE EXCEPTION 'cancel_bed_reservation missing strict operator role gate';
  END IF;
END;
$$;
  `);

  console.log('[hardening-guards] Mutation role gates: PASS');
}

async function main() {
  try {
    console.log('[hardening-guards] Starting emergency hardening checks...');
    await assertRealtimePublicationCoverage();
    await assertCriticalRlsScope();
    await assertTransitionAuditWritePath();
    await assertConsoleRpcLockSemantics();
    await assertRpcExecuteScope();
    await assertMutationRoleGates();
    console.log('[hardening-guards] All checks passed.');
  } catch (error) {
    console.error('[hardening-guards] Check failed:', error.message || error);
    process.exit(1);
  }
}

main();
