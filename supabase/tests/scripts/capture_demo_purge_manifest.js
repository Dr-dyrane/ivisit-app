#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const {
  createDemoRunManifest,
  registerProtectedFacility,
  registerResource,
  saveManifest,
} = require('./demo_run_manifest');

const appRoot = path.resolve(__dirname, '..', '..', '..');

function argumentValue(name, argv = process.argv.slice(2)) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

async function selectAll(admin, table, columns) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} inventory failed: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function listAllAuthUsers(admin) {
  const users = [];
  const perPage = 200;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Auth inventory failed: ${error.message}`);
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) return users;
  }
  throw new Error('Auth inventory exceeded the bounded 20,000-user scan');
}

function isDemoEmail(value) {
  return /@ivisit-demo\.local$/i.test(String(value || '').trim());
}

function isDemoOrganization(row) {
  return (
    isDemoEmail(row.contact_email)
    || /ivisit demo network|ivisit coverage network/i.test(String(row.name || ''))
  );
}

function isDemoHospital(row) {
  return String(row.place_id || '').startsWith('demo:');
}

async function main(argv = process.argv.slice(2)) {
  dotenv.config({ path: path.join(appRoot, '.env.local'), quiet: true });
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role environment');
  }

  const projectRef = new URL(url).hostname.split('.')[0];
  const runId = argumentValue('run-id', argv)
    || `global-demo-purge-${Date.now()}`;
  const outputPath = path.resolve(
    argumentValue('output', argv)
      || path.join(appRoot, '.tmp', `${runId}.json`)
  );
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [
    authUsers,
    hospitals,
    organizations,
    profiles,
    doctors,
    ambulances,
    requests,
    visits,
    payments,
  ] = await Promise.all([
    listAllAuthUsers(admin),
    selectAll(
      admin,
      'hospitals',
      'id,organization_id,verified,verification_status,dispatch_eligible,status,provider_source,place_id'
    ),
    selectAll(admin, 'organizations', 'id,name,contact_email'),
    selectAll(admin, 'profiles', 'id,email,organization_id'),
    selectAll(admin, 'doctors', 'id,profile_id,hospital_id'),
    selectAll(admin, 'ambulances', 'id,profile_id,hospital_id,organization_id'),
    selectAll(
      admin,
      'emergency_requests',
      'id,user_id,hospital_id,ambulance_id,responder_id,dispatch_organization_id'
    ),
    selectAll(admin, 'visits', 'id,user_id,hospital_id,doctor_id,request_id'),
    selectAll(admin, 'payments', 'id,user_id,organization_id,emergency_request_id'),
  ]);

  const demoHospitals = hospitals.filter(isDemoHospital);
  const demoHospitalIds = new Set(demoHospitals.map((row) => row.id));
  const demoOrganizations = organizations.filter(isDemoOrganization);
  const demoOrganizationIds = new Set(demoOrganizations.map((row) => row.id));
  const demoProfiles = profiles.filter(
    (row) => isDemoEmail(row.email) || demoOrganizationIds.has(row.organization_id)
  );
  const demoProfileIds = new Set(demoProfiles.map((row) => row.id));
  const demoAuthUsers = authUsers.filter(
    (row) => isDemoEmail(row.email) || demoProfileIds.has(row.id)
  );
  const demoDoctors = doctors.filter(
    (row) => demoProfileIds.has(row.profile_id) || demoHospitalIds.has(row.hospital_id)
  );
  const demoDoctorIds = new Set(demoDoctors.map((row) => row.id));
  const demoAmbulances = ambulances.filter(
    (row) => (
      demoProfileIds.has(row.profile_id)
      || demoHospitalIds.has(row.hospital_id)
      || demoOrganizationIds.has(row.organization_id)
    )
  );
  const demoAmbulanceIds = new Set(demoAmbulances.map((row) => row.id));
  const demoRequests = requests.filter(
    (row) => (
      demoProfileIds.has(row.user_id)
      || demoProfileIds.has(row.responder_id)
      || demoHospitalIds.has(row.hospital_id)
      || demoAmbulanceIds.has(row.ambulance_id)
      || demoOrganizationIds.has(row.dispatch_organization_id)
    )
  );
  const demoRequestIds = new Set(demoRequests.map((row) => row.id));
  const demoVisits = visits.filter(
    (row) => (
      demoProfileIds.has(row.user_id)
      || demoHospitalIds.has(row.hospital_id)
      || demoDoctorIds.has(row.doctor_id)
      || demoRequestIds.has(row.request_id)
    )
  );
  const demoPayments = payments.filter(
    (row) => (
      demoProfileIds.has(row.user_id)
      || demoOrganizationIds.has(row.organization_id)
      || demoRequestIds.has(row.emergency_request_id)
    )
  );

  const manifest = createDemoRunManifest({
    runId,
    suite: 'global-explicit-demo-purge',
    projectRef,
  });

  for (const hospital of hospitals.filter((row) => !isDemoHospital(row))) {
    registerProtectedFacility(manifest, hospital);
  }

  const resources = {
    authUserIds: unique([
      ...demoProfiles.map((row) => row.id),
      ...demoAuthUsers.map((row) => row.id),
    ]),
    organizationIds: demoOrganizations.map((row) => row.id),
    createdFacilityIds: demoHospitals.map((row) => row.id),
    emergencyRequestIds: [...demoRequestIds],
    paymentIds: demoPayments.map((row) => row.id),
    visitIds: demoVisits.map((row) => row.id),
    doctorIds: demoDoctors.map((row) => row.id),
    ambulanceIds: demoAmbulances.map((row) => row.id),
  };
  for (const [resourceKey, values] of Object.entries(resources)) {
    for (const value of unique(values)) registerResource(manifest, resourceKey, value);
  }

  saveManifest(manifest, outputPath);
  console.log(JSON.stringify({
    manifest: outputPath,
    runId,
    projectRef,
    protectedFacilities: manifest.protectedFacilities.length,
    captured: Object.fromEntries(
      Object.entries(resources).map(([key, values]) => [key, unique(values).length])
    ),
  }, null, 2));
}

main().catch((error) => {
  console.error(`[capture-demo-purge-manifest] ${error.message}`);
  process.exit(1);
});
