#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'console_shared_contract_guard_report.json');

const files = {
  finance: 'supabase/migrations/20260219000400_finance.sql',
  ops: 'supabase/migrations/20260219000500_ops_content.sql',
  security: 'supabase/migrations/20260219000700_security.sql',
  emergency: 'supabase/migrations/20260219000800_emergency_logic.sql',
  automations: 'supabase/migrations/20260219000900_automations.sql',
  core: 'supabase/migrations/20260219010000_core_rpcs.sql',
  supportService: 'services/helpSupportService.js',
};

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing source file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function sqlFunction(sql, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${escapedName}\\s*\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$\\s+LANGUAGE`,
    'i'
  );
  return sql.match(pattern)?.[1] || '';
}

function includesAll(source, fragments) {
  return fragments.every((fragment) => source.includes(fragment));
}

function run() {
  const source = Object.fromEntries(
    Object.entries(files).map(([key, relativePath]) => [key, read(relativePath)])
  );
  const retry = sqlFunction(source.finance, 'retry_payment_with_different_method');
  const nearby = sqlFunction(source.core, 'nearby_ambulances');
  const updateHospital = sqlFunction(source.core, 'update_hospital_by_admin');
  const createEmergency = sqlFunction(source.core, 'console_create_emergency_request');
  const checks = [];

  const check = (name, pass, evidence) => {
    checks.push({ name, pass: Boolean(pass), evidence });
  };

  check(
    'insurance clean-rebuild fields cover app and console projections',
    includesAll(source.finance, [
      'provider TEXT',
      'coverage_details JSONB',
      'coverage_amount NUMERIC',
      'coverage_percentage NUMERIC',
      'linked_payment_method TEXT',
      'status TEXT',
      'starts_at TIMESTAMPTZ',
      'expires_at TIMESTAMPTZ',
      'verified BOOLEAN',
    ]),
    files.finance
  );
  check(
    'payment retry is owner-authorized and serialized',
    includesAll(retry, [
      'v_actor_id IS DISTINCT FROM p_user_id',
      'FOR UPDATE OF er',
      "payment.status = 'pending'",
      "SET status = 'pending_approval'",
      "payment_status = 'pending'",
    ]) &&
      source.finance.includes(
        'REVOKE ALL ON FUNCTION public.retry_payment_with_different_method(UUID, UUID, UUID) FROM PUBLIC, anon;'
      ),
    files.finance
  );
  check(
    'support ticket vocabulary is database-enforced',
    includesAll(source.ops, [
      "category IN (",
      "'feature_request'",
      "'bug_report'",
      "status IN ('open', 'in_progress', 'resolved', 'closed')",
      "priority IN ('low', 'normal', 'high', 'urgent')",
    ]),
    files.ops
  );
  check(
    'patient support writes omit the nonexistent admin response column',
    !/const\s+mapTicketToDb[\s\S]*?admin_response\s*:/.test(source.supportService),
    files.supportService
  );
  check(
    'insurance owners write their rows while platform admins can read',
    includesAll(source.security, [
      'CREATE POLICY "Users manage own insurance policies"',
      'WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Admins read insurance policies"',
      'USING (public.p_is_admin());',
    ]),
    files.security
  );
  check(
    'ambulance writes use direct organization ownership with hospital fallback only for null owners',
    includesAll(source.security, [
      'CREATE POLICY "Org Admins manage ambulances"',
      "actor.role = 'org_admin'",
      'organization_id = public.p_get_current_org_id()',
      'organization_id IS NULL',
      'WITH CHECK (',
    ]),
    files.security
  );
  check(
    'doctor writes are role-scoped, column-limited, and non-deletable',
    includesAll(source.security, [
      'CREATE POLICY "Org Admins manage doctors"',
      "actor.role = 'org_admin'",
      'WITH CHECK (',
      'REVOKE INSERT, UPDATE, DELETE ON TABLE public.doctors FROM anon, authenticated;',
      ') ON TABLE public.doctors TO authenticated;',
    ]) &&
      !/GRANT\s+DELETE[\s\S]*?ON\s+TABLE\s+public\.doctors\s+TO\s+authenticated/i.test(
        source.security
      ),
    files.security
  );
  check(
    'linked doctor identity remains profile-owned',
    includesAll(source.automations, [
      "set_config('ivisit.allow_doctor_profile_sync', '1', true)",
      'CREATE OR REPLACE FUNCTION public.enforce_doctor_profile_identity_write()',
      'Doctor profile linkage is immutable',
      'CREATE TRIGGER trg_enforce_doctor_profile_identity_write',
    ]),
    files.automations
  );
  check(
    'console operators have visit-backed read projections',
    includesAll(source.security, [
      'CREATE POLICY "Org operators read medical profiles via visits"',
      'CREATE POLICY "Console operators see org visits"',
    ]),
    files.security
  );
  check(
    'onboarding evidence storage remains private and path-scoped',
    includesAll(source.security, [
      'CREATE POLICY "Users upload own onboarding evidence"',
      "(storage.foldername(name))[2] = auth.uid()::TEXT",
      'CREATE POLICY "Users read own onboarding evidence"',
      'CREATE POLICY "Users remove unsubmitted onboarding evidence"',
    ]),
    files.security
  );
  check(
    'shared media buckets and image writes are canonical and owner-scoped',
    includesAll(source.security, [
      "('images', 'images', true)",
      "('documents', 'documents', false)",
      'CREATE POLICY "Public Access"',
      'CREATE POLICY "Authenticated Upload"',
      "bucket_id = 'images'",
      '(storage.foldername(name))[1] = auth.uid()::TEXT',
      'CREATE POLICY "Authenticated Delete"',
    ]),
    files.security
  );
  check(
    'nearby ambulance lookup is authorized, scoped, and geography-correct',
    includesAll(nearby, [
      "v_actor_role IN ('org_admin', 'dispatcher')",
      'a.organization_id = v_actor_org_id',
      'a.organization_id IS NULL',
      'ST_DWithin(a.location::geography',
      'ST_Distance(a.location::geography',
    ]) &&
      source.core.includes(
        'REVOKE ALL ON FUNCTION public.nearby_ambulances(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM PUBLIC, anon;'
      ),
    files.core
  );
  check(
    'hospital updates preserve omitted arrays and reserve verification for platform admins',
    includesAll(updateHospital, [
      "payload ? 'verified'",
      "payload ? 'verification_status'",
      "CASE WHEN payload ? 'features'",
      'features = COALESCE(v_features, features)',
      'specialties = COALESCE(v_specialties, specialties)',
      'service_types = COALESCE(v_service_types, service_types)',
    ]),
    files.core
  );
  check(
    'console emergency creation atomically creates linked visit evidence',
    includesAll(createEmergency, [
      'INSERT INTO public.emergency_requests',
      'INSERT INTO public.visits',
      "'visit_id', v_visit.id",
    ]),
    files.core
  );
  check(
    'payment retry transition is canonical',
    source.emergency.includes("WHEN 'payment_declined' THEN") &&
      source.emergency.includes("RETURN v_next = 'pending_approval';"),
    files.emergency
  );
  check(
    'organization finance helpers enforce role, scope, and execute privileges',
    includesAll(source.core, [
      "v_actor_role NOT IN ('admin', 'org_admin')",
      'v_actor_org_id IS DISTINCT FROM p_organization_id',
      'REVOKE ALL ON FUNCTION public.get_org_stripe_status(UUID) FROM PUBLIC, anon;',
      'REVOKE ALL ON FUNCTION public.check_cash_eligibility(UUID) FROM PUBLIC, anon;',
      'GRANT EXECUTE ON FUNCTION public.get_org_stripe_status(UUID) TO authenticated, service_role;',
      'GRANT EXECUTE ON FUNCTION public.check_cash_eligibility(UUID) TO authenticated, service_role;',
    ]),
    files.core
  );

  const failures = checks.filter((item) => !item.pass);
  const report = {
    generated_at: new Date().toISOString(),
    source: 'assert_console_shared_contracts.js',
    status: failures.length === 0 ? 'pass' : 'fail',
    checks,
    failures: failures.map(({ name, evidence }) => ({ name, evidence })),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length > 0) {
    console.error('[console-shared-contract-guard] FAIL');
    for (const failure of failures) {
      console.error(`- ${failure.name} (${failure.evidence})`);
    }
    process.exit(1);
  }

  console.log(`[console-shared-contract-guard] PASS: ${checks.length} shared contracts verified.`);
  console.log(`[console-shared-contract-guard] Report written: ${OUT_FILE}`);
}

try {
  run();
} catch (error) {
  console.error(`[console-shared-contract-guard] FAIL: ${error.message}`);
  process.exit(1);
}
