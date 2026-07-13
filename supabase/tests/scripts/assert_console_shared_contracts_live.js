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
  .find((argument) => argument.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[console-shared-live-guard] Missing Supabase URL or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('[console-shared-live-guard] Refusing to inspect an unconfirmed project reference.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

function functionIncludes(signature, fragments) {
  const signatureSql = sqlLiteral(signature);
  const definition = `LOWER(REGEXP_REPLACE(COALESCE(pg_get_functiondef(to_regprocedure(${signatureSql})), ''), '\\s+', ' ', 'g'))`;
  return [
    `to_regprocedure(${signatureSql}) IS NOT NULL`,
    ...fragments.map(
      (fragment) =>
        `POSITION(${sqlLiteral(fragment.toLowerCase().replace(/\s+/g, ' ').trim())} IN ${definition}) > 0`
    ),
  ].join('\nAND ');
}

function functionPrivileges(signature, { authenticated = true, serviceRole = true } = {}) {
  const signatureSql = sqlLiteral(signature);
  const checks = [
    `NOT COALESCE(has_function_privilege('anon', to_regprocedure(${signatureSql}), 'EXECUTE'), FALSE)`,
  ];
  if (authenticated) {
    checks.push(
      `COALESCE(has_function_privilege('authenticated', to_regprocedure(${signatureSql}), 'EXECUTE'), FALSE)`
    );
  }
  if (serviceRole) {
    checks.push(
      `COALESCE(has_function_privilege('service_role', to_regprocedure(${signatureSql}), 'EXECUTE'), FALSE)`
    );
  }
  return checks.join('\nAND ');
}

function policyIncludes(schema, table, policy, fragments = []) {
  const normalized = `LOWER(REGEXP_REPLACE(REPLACE(COALESCE(qual, '') || ' ' || COALESCE(with_check, ''), '::text', ''), '\\s+', ' ', 'g'))`;
  return `EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = ${sqlLiteral(schema)}
      AND tablename = ${sqlLiteral(table)}
      AND policyname = ${sqlLiteral(policy)}
      ${fragments
        .map(
          (fragment) =>
            `AND POSITION(${sqlLiteral(fragment.toLowerCase().replaceAll('::text', ''))} IN ${normalized}) > 0`
        )
        .join('\n      ')}
  )`;
}

function check(name, expression) {
  return { name, expression };
}

const supportConstraints = `LOWER(COALESCE((
  SELECT STRING_AGG(pg_get_constraintdef(constraint_row.oid), ' ')
  FROM pg_constraint constraint_row
  WHERE constraint_row.conrelid = 'public.support_tickets'::regclass
    AND constraint_row.contype = 'c'
), ''))`;

const checks = [
  check(
    'insurance projection columns exist',
    `(SELECT COUNT(DISTINCT column_name) = 9
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'insurance_policies'
        AND column_name IN (
          'provider', 'coverage_details', 'coverage_amount', 'coverage_percentage',
          'linked_payment_method', 'status', 'starts_at', 'expires_at', 'verified'
        ))`
  ),
  check(
    'payment retry is owner-authorized and serialized',
    `(${functionIncludes('public.retry_payment_with_different_method(uuid,uuid,uuid)', [
      'v_actor_id is distinct from p_user_id',
      'for update of er',
      'method.user_id = p_user_id',
      'v_payment_method_active',
      "payment.status = 'pending'",
      "set status = 'pending_approval'",
      "payment_status = 'pending'",
    ])})
    AND (${functionPrivileges('public.retry_payment_with_different_method(uuid,uuid,uuid)')})`
  ),
  check(
    'support ticket vocabulary is database-enforced',
    `POSITION('feature_request' IN ${supportConstraints}) > 0
    AND POSITION('bug_report' IN ${supportConstraints}) > 0
    AND POSITION('in_progress' IN ${supportConstraints}) > 0
    AND POSITION('resolved' IN ${supportConstraints}) > 0
    AND POSITION('urgent' IN ${supportConstraints}) > 0`
  ),
  check(
    'insurance owner and admin read policies are live',
    `(${policyIncludes('public', 'insurance_policies', 'Users manage own insurance policies', [
      'auth.uid() = user_id',
    ])})
    AND (${policyIncludes('public', 'insurance_policies', 'Admins read insurance policies', [
      'p_is_admin()',
    ])})`
  ),
  check(
    'ambulance management is organization-scoped',
    `(${policyIncludes('public', 'ambulances', 'Org Admins manage ambulances', [
      "actor.role = 'org_admin'",
      'organization_id = p_get_current_org_id()',
      'organization_id is null',
    ])})`
  ),
  check(
    'doctor management is scoped and lifecycle writes are limited',
    `(${policyIncludes('public', 'doctors', 'Org Admins manage doctors', [
      "actor.role = 'org_admin'",
      'hospital.organization_id = p_get_current_org_id()',
    ])})
    AND NOT has_table_privilege('authenticated', 'public.doctors', 'DELETE')
    AND NOT has_column_privilege('authenticated', 'public.doctors', 'profile_id', 'UPDATE')
    AND has_column_privilege('authenticated', 'public.doctors', 'name', 'UPDATE')`
  ),
  check(
    'linked doctor identity remains profile-owned',
    `(${functionIncludes('public.enforce_doctor_profile_identity_write()', [
      'doctor profile linkage is immutable',
      'ivisit.allow_doctor_profile_sync',
    ])})
    AND EXISTS (
      SELECT 1
      FROM pg_trigger trigger_row
      WHERE trigger_row.tgrelid = 'public.doctors'::regclass
        AND trigger_row.tgname = 'trg_enforce_doctor_profile_identity_write'
        AND NOT trigger_row.tgisinternal
    )`
  ),
  check(
    'console operators have visit-backed read projections',
    `(${policyIncludes('public', 'medical_profiles', 'Org operators read medical profiles via visits', [
      'hospital_id',
      'organization_id = p_get_current_org_id()',
    ])})
    AND (${policyIncludes('public', 'visits', 'Console operators see org visits', [
      'organization_id = p_get_current_org_id()',
    ])})`
  ),
  check(
    'support ticket writes remain owner-or-admin scoped',
    `(${policyIncludes('public', 'support_tickets', 'Users manage own tickets', [
      'auth.uid() = user_id',
      'p_is_admin()',
    ])})`
  ),
  check(
    'onboarding evidence storage is private and path-scoped',
    `EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents' AND public = FALSE)
    AND (${policyIncludes('storage', 'objects', 'Users upload own onboarding evidence', [
      "bucket_id = 'documents'",
      'auth.uid()::text',
    ])})
    AND (${policyIncludes('storage', 'objects', 'Users read own onboarding evidence', [
      "bucket_id = 'documents'",
      'auth.uid()::text',
    ])})
    AND (${policyIncludes('storage', 'objects', 'Users remove unsubmitted onboarding evidence', [
      "bucket_id = 'documents'",
      'organization_verification_documents',
    ])})`
  ),
  check(
    'shared image storage is public-read and owner-write',
    `EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'images' AND public = TRUE)
    AND (${policyIncludes('storage', 'objects', 'Public Access', ["bucket_id = 'images'"])})
    AND (${policyIncludes('storage', 'objects', 'Authenticated Upload', [
      "bucket_id = 'images'",
      'auth.uid()::text',
    ])})
    AND (${policyIncludes('storage', 'objects', 'Authenticated Update', [
      "bucket_id = 'images'",
      'auth.uid()::text',
    ])})
    AND (${policyIncludes('storage', 'objects', 'Authenticated Delete', [
      "bucket_id = 'images'",
      'auth.uid()::text',
    ])})`
  ),
  check(
    'nearby ambulance lookup is authorized and scoped',
    `(${functionIncludes('public.nearby_ambulances(double precision,double precision,integer)', [
      "v_actor_role in ('org_admin', 'dispatcher')",
      'a.organization_id = v_actor_org_id',
      'a.organization_id is null',
      'st_dwithin(a.location::geography',
      'st_distance(a.location::geography',
    ])})
    AND (${functionPrivileges(
      'public.nearby_ambulances(double precision,double precision,integer)'
    )})`
  ),
  check(
    'hospital updates preserve omitted arrays and verification authority',
    `(${functionIncludes('public.update_hospital_by_admin(uuid,jsonb)', [
      "payload ? 'verified'",
      "payload ? 'verification_status'",
      "case when payload ? 'features'",
      'features = coalesce(v_features, features)',
      'specialties = coalesce(v_specialties, specialties)',
      'service_types = coalesce(v_service_types, service_types)',
    ])})
    AND (${functionPrivileges('public.update_hospital_by_admin(uuid,jsonb)')})`
  ),
  check(
    'console emergency creation creates linked visit evidence',
    `(${functionIncludes('public.console_create_emergency_request(jsonb)', [
      'insert into public.emergency_requests',
      'insert into public.visits',
      "'visit_id', v_visit.id",
    ])})`
  ),
  check(
    'payment retry transition is canonical',
    `(${functionIncludes('public.is_valid_emergency_status_transition(text,text)', [
      "when 'payment_declined' then return v_next = 'pending_approval';",
    ])})`
  ),
  check(
    'organization finance helpers enforce role and organization scope',
    `(${functionIncludes('public.get_org_stripe_status(uuid)', [
      "v_actor_role not in ('admin', 'org_admin')",
      'v_actor_org_id is distinct from p_organization_id',
    ])})
    AND (${functionPrivileges('public.get_org_stripe_status(uuid)')})
    AND (${functionIncludes('public.check_cash_eligibility(uuid)', [
      "v_actor_role not in ('admin', 'org_admin')",
      'v_actor_org_id is distinct from p_organization_id',
    ])})
    AND (${functionPrivileges('public.check_cash_eligibility(uuid)')})`
  ),
];

function probeSql(index, expression) {
  const tag = `ivisit_live_contract_${index}`;
  return `DO $${tag}$
BEGIN
    IF COALESCE((${expression}), FALSE) THEN
        RAISE EXCEPTION 'IVISIT_LIVE_CONTRACT_PASS';
    END IF;
    RAISE EXCEPTION 'IVISIT_LIVE_CONTRACT_FAIL';
END
$${tag}$;`;
}

async function run() {
  const results = [];
  for (const [index, contract] of checks.entries()) {
    const { data, error } = await admin.rpc('exec_sql', {
      sql: probeSql(index, contract.expression),
    });
    if (error) throw error;

    const message = String(data?.error || '');
    if (!message.includes('IVISIT_LIVE_CONTRACT_')) {
      throw new Error(`${contract.name}: catalog probe failed without a contract marker`);
    }
    results.push({ name: contract.name, pass: message.includes('IVISIT_LIVE_CONTRACT_PASS') });
  }

  const failures = results.filter((result) => !result.pass);
  console.log(
    `[console-shared-live-guard] target=${projectRef} passed=${results.length - failures.length}/${results.length}`
  );
  for (const result of results) {
    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}`);
  }
  if (failures.length > 0) process.exitCode = 1;
}

module.exports = { checks, probeSql };

if (require.main === module) {
  run().catch((error) => {
    console.error(`[console-shared-live-guard] ${error.message}`);
    process.exit(1);
  });
}
