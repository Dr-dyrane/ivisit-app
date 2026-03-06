#!/usr/bin/env node

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[cleanup-test-side-effects] Missing Supabase credentials (.env/.env.local).');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const SKIP_AUTH_DELETE = process.argv.includes('--skip-auth-delete');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_EMAIL_PATTERNS = [
  /@ivisit-e2e\.local$/i,
  /@ivisit-test\.com$/i,
  /^test-/i,
  /^seed-/i,
  /@example\.com$/i,
];

const TEST_NAME_MARKERS = ['test', 'e2e', 'matrix', 'seed'];
const TEST_HOSPITAL_PATTERNS = [
  /cash-role-matrix-/i,
  /mutation-role-matrix-/i,
  /console-matrix-/i,
  /flow-matrix-/i,
  /ivisit-e2e/i,
  /\bmatrix hospital\b/i,
  /\be2e hospital\b/i,
];

function isTestEmail(email) {
  const value = (email || '').trim().toLowerCase();
  if (!value) return false;
  return TEST_EMAIL_PATTERNS.some((pattern) => pattern.test(value));
}

function hasTestMarker(value) {
  const text = (value || '').toLowerCase();
  if (!text) return false;
  return TEST_NAME_MARKERS.some((marker) => text.includes(marker));
}

function isTestHospitalRow(row) {
  const text = `${row?.name || ''} ${row?.address || ''} ${row?.place_id || ''}`.toLowerCase();
  if (!text.trim()) return false;
  return TEST_HOSPITAL_PATTERNS.some((pattern) => pattern.test(text));
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

async function fetchAll(table, columns) {
  const pageSize = 1000;
  let offset = 0;
  const allRows = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`fetchAll(${table}) failed: ${error.message}`);
    }

    const rows = data || [];
    allRows.push(...rows);

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return allRows;
}

async function fetchAllOptional(table, columns) {
  try {
    return await fetchAll(table, columns);
  } catch (error) {
    const message = String(error?.message || '');
    if (
      message.includes(`Could not find the table 'public.${table}'`) ||
      message.includes(`relation "${table}" does not exist`)
    ) {
      return [];
    }
    throw error;
  }
}

async function execSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`exec_sql failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`exec_sql rejected SQL: ${data?.error || 'unknown error'}`);
  }
}

async function deleteByIds(table, ids, idColumn = 'id', report) {
  const uniqueIds = unique(ids);
  if (uniqueIds.length === 0) return 0;

  const chunkSize = 200;
  let deleted = 0;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from(table)
      .delete()
      .in(idColumn, chunk)
      .select(idColumn);

    if (error) {
      report.errors.push(`${table} delete failed (${idColumn}): ${error.message}`);
      continue;
    }

    deleted += (data || []).length;
  }

  return deleted;
}

async function deleteAuthUsersById(userIds, report) {
  const ids = unique(userIds);
  if (ids.length === 0) return 0;

  let deleted = 0;
  for (const id of ids) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      report.errors.push(`auth.users delete failed (${id}): ${error.message}`);
      continue;
    }
    deleted += 1;
  }

  return deleted;
}

function printSummary(summary, phase) {
  console.log(`\n[cleanup-test-side-effects] ${phase}`);
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  const startedAt = new Date().toISOString();
  const report = {
    mode: APPLY ? 'apply' : 'dry-run',
    startedAt,
    planned: {},
    deleted: {},
    errors: [],
  };

  const [
    profiles,
    hospitals,
    organizations,
    organizationWallets,
    doctors,
    ambulances,
    emergencies,
    visits,
    payments,
    insuranceBilling,
    doctorAssignments,
    transitions,
    notifications,
    userActivity,
    walletLedger,
    servicePricing,
    roomPricing,
    hospitalImportLogs,
  ] = await Promise.all([
    fetchAll('profiles', 'id,email,organization_id'),
    fetchAll('hospitals', 'id,org_admin_id,organization_id,name,address,place_id'),
    fetchAll('organizations', 'id,name,contact_email'),
    fetchAll('organization_wallets', 'id,organization_id'),
    fetchAll('doctors', 'id,profile_id,email,hospital_id'),
    fetchAll('ambulances', 'id,profile_id,call_sign,hospital_id'),
    fetchAll('emergency_requests', 'id,user_id,hospital_id,hospital_name'),
    fetchAll('visits', 'id,user_id,request_id,hospital_id,hospital_name'),
    fetchAll('payments', 'id,user_id,organization_id,emergency_request_id'),
    fetchAll('insurance_billing', 'id,user_id,emergency_request_id'),
    fetchAll('emergency_doctor_assignments', 'id,doctor_id,emergency_request_id'),
    fetchAll('emergency_status_transitions', 'id,emergency_request_id'),
    fetchAll('notifications', 'id,user_id,target_id'),
    fetchAll('user_activity', 'id,user_id'),
    fetchAll('wallet_ledger', 'id,reference_id,wallet_id'),
    fetchAllOptional('service_pricing', 'id,hospital_id'),
    fetchAllOptional('room_pricing', 'id,hospital_id'),
    fetchAllOptional('hospital_import_logs', 'id,created_by,search_query'),
  ]);

  const testProfileIds = unique(profiles.filter((p) => isTestEmail(p.email)).map((p) => p.id));
  const testHospitalAdminLinkIds = unique(
    hospitals
      .filter((h) => testProfileIds.includes(h.org_admin_id))
      .map((h) => h.id)
  );
  const testHospitalMarkerIds = unique(
    hospitals
      .filter((h) => isTestHospitalRow(h))
      .map((h) => h.id)
  );
  const testHospitalIds = unique([...testHospitalAdminLinkIds, ...testHospitalMarkerIds]);

  const testOrganizationByMarkerIds = unique(
    organizations
      .filter((org) => {
        const markerSource = `${org.name || ''} ${org.contact_email || ''}`;
        return TEST_HOSPITAL_PATTERNS.some((pattern) => pattern.test(markerSource));
      })
      .map((org) => org.id)
  );

  const candidateOrganizationIds = unique([
    ...hospitals
      .filter((h) => testHospitalIds.includes(h.id))
      .map((h) => h.organization_id),
    ...testOrganizationByMarkerIds,
  ]);

  const testDoctorIds = unique(
    doctors
      .filter(
        (d) =>
          testProfileIds.includes(d.profile_id) ||
          isTestEmail(d.email) ||
          testHospitalIds.includes(d.hospital_id)
      )
      .map((d) => d.id)
  );
  const testAmbulanceIds = unique(
    ambulances
      .filter(
        (a) =>
          testProfileIds.includes(a.profile_id) ||
          hasTestMarker(a.call_sign) ||
          testHospitalIds.includes(a.hospital_id)
      )
      .map((a) => a.id)
  );

  const testEmergencyIds = unique(
    emergencies
      .filter(
        (er) =>
          testProfileIds.includes(er.user_id) ||
          hasTestMarker(er.hospital_name) ||
          testHospitalIds.includes(er.hospital_id)
      )
      .map((er) => er.id)
  );

  const testVisitIds = unique(
    visits
      .filter(
        (v) =>
          testProfileIds.includes(v.user_id) ||
          testEmergencyIds.includes(v.request_id) ||
          hasTestMarker(v.hospital_name) ||
          testHospitalIds.includes(v.hospital_id)
      )
      .map((v) => v.id)
  );

  const testPaymentIds = unique(
    payments
      .filter(
        (p) =>
          testProfileIds.includes(p.user_id) ||
          testEmergencyIds.includes(p.emergency_request_id) ||
          candidateOrganizationIds.includes(p.organization_id)
      )
      .map((p) => p.id)
  );

  const testInsuranceBillingIds = unique(
    insuranceBilling
      .filter(
        (b) => testProfileIds.includes(b.user_id) || testEmergencyIds.includes(b.emergency_request_id)
      )
      .map((b) => b.id)
  );

  const testAssignmentIds = unique(
    doctorAssignments
      .filter(
        (a) => testEmergencyIds.includes(a.emergency_request_id) || testDoctorIds.includes(a.doctor_id)
      )
      .map((a) => a.id)
  );

  const testTransitionIds = unique(
    transitions
      .filter((t) => testEmergencyIds.includes(t.emergency_request_id))
      .map((t) => t.id)
  );

  const testNotificationIds = unique(
    notifications
      .filter((n) => testProfileIds.includes(n.user_id) || testEmergencyIds.includes(n.target_id))
      .map((n) => n.id)
  );

  const testActivityIds = unique(
    userActivity.filter((a) => testProfileIds.includes(a.user_id)).map((a) => a.id)
  );

  const safeOrganizationIds = unique(
    candidateOrganizationIds.filter((organizationId) => {
      const hasNonTestHospitals = hospitals.some(
        (h) => h.organization_id === organizationId && !testHospitalIds.includes(h.id)
      );
      const hasNonTestProfiles = profiles.some(
        (p) => p.organization_id === organizationId && !testProfileIds.includes(p.id)
      );
      const hasNonTestPayments = payments.some(
        (p) => p.organization_id === organizationId && !testPaymentIds.includes(p.id)
      );
      return !hasNonTestHospitals && !hasNonTestProfiles && !hasNonTestPayments;
    })
  );

  const testOrganizationWalletIds = unique(
    organizationWallets
      .filter((wallet) => safeOrganizationIds.includes(wallet.organization_id))
      .map((wallet) => wallet.id)
  );

  const testServicePricingIds = unique(
    servicePricing
      .filter((row) => testHospitalIds.includes(row.hospital_id))
      .map((row) => row.id)
  );
  const testRoomPricingIds = unique(
    roomPricing
      .filter((row) => testHospitalIds.includes(row.hospital_id))
      .map((row) => row.id)
  );
  const testHospitalImportLogIds = unique(
    hospitalImportLogs
      .filter(
        (row) =>
          testProfileIds.includes(row.created_by) ||
          hasTestMarker(row.search_query)
      )
      .map((row) => row.id)
  );

  const paymentReferenceSet = new Set(testPaymentIds);
  const emergencyReferenceSet = new Set(testEmergencyIds);
  const testWalletLedgerIds = unique(
    walletLedger
      .filter(
        (l) =>
          paymentReferenceSet.has(l.reference_id) ||
          emergencyReferenceSet.has(l.reference_id) ||
          testOrganizationWalletIds.includes(l.wallet_id)
      )
      .map((l) => l.id)
  );

  report.planned = {
    profiles: testProfileIds.length,
    hospitals: testHospitalIds.length,
    hospitals_org_admin_links: testHospitalAdminLinkIds.length,
    organizations: safeOrganizationIds.length,
    organization_wallets: testOrganizationWalletIds.length,
    doctors: testDoctorIds.length,
    ambulances: testAmbulanceIds.length,
    emergency_requests: testEmergencyIds.length,
    visits: testVisitIds.length,
    payments: testPaymentIds.length,
    insurance_billing: testInsuranceBillingIds.length,
    emergency_doctor_assignments: testAssignmentIds.length,
    emergency_status_transitions: testTransitionIds.length,
    notifications: testNotificationIds.length,
    user_activity: testActivityIds.length,
    service_pricing: testServicePricingIds.length,
    room_pricing: testRoomPricingIds.length,
    hospital_import_logs: testHospitalImportLogIds.length,
    wallet_ledger: testWalletLedgerIds.length,
    auth_users: testProfileIds.length,
  };

  const preview = {
    testProfileEmails: profiles
      .filter((p) => testProfileIds.includes(p.id))
      .slice(0, 15)
      .map((p) => p.email),
    testEmergencyIds: testEmergencyIds.slice(0, 10),
    testVisitIds: testVisitIds.slice(0, 10),
    testHospitalNames: hospitals
      .filter((h) => testHospitalIds.includes(h.id))
      .slice(0, 10)
      .map((h) => h.name),
    safeOrganizationIds: safeOrganizationIds.slice(0, 10),
  };

  printSummary({ mode: report.mode, planned: report.planned, preview }, 'plan');

  if (!APPLY) {
    console.log('[cleanup-test-side-effects] Dry-run complete. Re-run with --apply to execute deletes.');
    return;
  }

  let transitionsGuardDisabled = false;

  try {
    report.deleted.wallet_ledger = await deleteByIds(
      'wallet_ledger',
      testWalletLedgerIds,
      'id',
      report
    );
    report.deleted.notifications = await deleteByIds(
      'notifications',
      testNotificationIds,
      'id',
      report
    );
    report.deleted.user_activity = await deleteByIds('user_activity', testActivityIds, 'id', report);

    report.deleted.insurance_billing = await deleteByIds(
      'insurance_billing',
      testInsuranceBillingIds,
      'id',
      report
    );
    report.deleted.emergency_doctor_assignments = await deleteByIds(
      'emergency_doctor_assignments',
      testAssignmentIds,
      'id',
      report
    );
    report.deleted.payments = await deleteByIds('payments', testPaymentIds, 'id', report);
    report.deleted.visits = await deleteByIds('visits', testVisitIds, 'id', report);

    await execSql(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_emergency_status_transitions_append_only'
      AND tgrelid = 'public.emergency_status_transitions'::regclass
  ) THEN
    ALTER TABLE public.emergency_status_transitions
      DISABLE TRIGGER trg_emergency_status_transitions_append_only;
  END IF;
END $$;`);
    transitionsGuardDisabled = true;

    report.deleted.emergency_status_transitions = await deleteByIds(
      'emergency_status_transitions',
      testTransitionIds,
      'id',
      report
    );
    report.deleted.emergency_requests = await deleteByIds(
      'emergency_requests',
      testEmergencyIds,
      'id',
      report
    );

    report.deleted.doctors = await deleteByIds('doctors', testDoctorIds, 'id', report);
    report.deleted.ambulances = await deleteByIds('ambulances', testAmbulanceIds, 'id', report);
    report.deleted.service_pricing = await deleteByIds(
      'service_pricing',
      testServicePricingIds,
      'id',
      report
    );
    report.deleted.room_pricing = await deleteByIds(
      'room_pricing',
      testRoomPricingIds,
      'id',
      report
    );
    report.deleted.hospital_import_logs = await deleteByIds(
      'hospital_import_logs',
      testHospitalImportLogIds,
      'id',
      report
    );
    report.deleted.hospitals = await deleteByIds('hospitals', testHospitalIds, 'id', report);

    if (testHospitalAdminLinkIds.length > 0) {
      const { data, error } = await supabase
        .from('hospitals')
        .update({ org_admin_id: null })
        .in('id', testHospitalAdminLinkIds)
        .select('id');
      if (error) {
        report.errors.push(`hospitals org_admin cleanup failed: ${error.message}`);
        report.deleted.hospitals_org_admin_links = 0;
      } else {
        report.deleted.hospitals_org_admin_links = (data || []).length;
      }
    } else {
      report.deleted.hospitals_org_admin_links = 0;
    }

    report.deleted.organization_wallets = await deleteByIds(
      'organization_wallets',
      safeOrganizationIds,
      'organization_id',
      report
    );
    report.deleted.organizations = await deleteByIds(
      'organizations',
      safeOrganizationIds,
      'id',
      report
    );

    report.deleted.profiles = await deleteByIds('profiles', testProfileIds, 'id', report);

    if (!SKIP_AUTH_DELETE) {
      report.deleted.auth_users = await deleteAuthUsersById(testProfileIds, report);
    } else {
      report.deleted.auth_users = 0;
    }
  } finally {
    if (transitionsGuardDisabled) {
      try {
        await execSql(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_emergency_status_transitions_append_only'
      AND tgrelid = 'public.emergency_status_transitions'::regclass
  ) THEN
    ALTER TABLE public.emergency_status_transitions
      ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  END IF;
END $$;`);
      } catch (error) {
        report.errors.push(`failed to re-enable transition append-only trigger: ${error.message}`);
      }
    }
  }

  const [postEmergencies, postVisits, postDoctors, postProfiles, postHospitals, postOrganizations] = await Promise.all([
    fetchAll('emergency_requests', 'id,user_id,hospital_id,hospital_name'),
    fetchAll('visits', 'id,user_id,request_id,hospital_id,hospital_name'),
    fetchAll('doctors', 'id,profile_id,email,hospital_id'),
    fetchAll('profiles', 'id,email,organization_id'),
    fetchAll('hospitals', 'id,org_admin_id,organization_id,name,address,place_id'),
    fetchAll('organizations', 'id,name,contact_email'),
  ]);

  const postTestProfileIds = unique(postProfiles.filter((p) => isTestEmail(p.email)).map((p) => p.id));
  const postTestEmergencyIds = unique(
    postEmergencies
      .filter((er) => postTestProfileIds.includes(er.user_id) || hasTestMarker(er.hospital_name))
      .map((er) => er.id)
  );
  const postTestVisitIds = unique(
    postVisits
      .filter(
        (v) =>
          postTestProfileIds.includes(v.user_id) ||
          postTestEmergencyIds.includes(v.request_id) ||
          hasTestMarker(v.hospital_name)
      )
      .map((v) => v.id)
  );
  const postTestHospitalIds = unique(
    postHospitals
      .filter((h) => postTestProfileIds.includes(h.org_admin_id) || isTestHospitalRow(h))
      .map((h) => h.id)
  );
  const postTestDoctorIds = unique(
    postDoctors
      .filter(
        (d) =>
          postTestProfileIds.includes(d.profile_id) ||
          isTestEmail(d.email) ||
          postTestHospitalIds.includes(d.hospital_id)
      )
      .map((d) => d.id)
  );
  const postTestOrganizationIds = unique(
    postOrganizations
      .filter((org) => {
        const markerSource = `${org.name || ''} ${org.contact_email || ''}`;
        return TEST_HOSPITAL_PATTERNS.some((pattern) => pattern.test(markerSource));
      })
      .map((org) => org.id)
  );

  report.after = {
    test_profiles_remaining: postTestProfileIds.length,
    test_hospitals_remaining: postTestHospitalIds.length,
    test_organizations_remaining: postTestOrganizationIds.length,
    test_emergencies_remaining: postTestEmergencyIds.length,
    test_visits_remaining: postTestVisitIds.length,
    test_doctors_remaining: postTestDoctorIds.length,
  };

  printSummary(report, 'result');

  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[cleanup-test-side-effects] FAIL:', error.message);
  process.exit(1);
});
