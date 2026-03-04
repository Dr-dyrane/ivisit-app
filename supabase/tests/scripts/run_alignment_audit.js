const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Expected EXPO_PUBLIC_SUPABASE_URL and service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const COLUMN_CONTRACTS = {
  profiles: [
    'id',
    'email',
    'role',
    'organization_id',
    'provider_type',
    'onboarding_status'
  ],
  preferences: [
    'user_id',
    'notifications_enabled',
    'demo_mode_enabled'
  ],
  medical_profiles: [
    'user_id'
  ],
  organizations: [
    'id',
    'name',
    'is_active'
  ],
  organization_wallets: [
    'id',
    'organization_id',
    'balance',
    'currency'
  ],
  hospitals: [
    'id',
    'name',
    'organization_id',
    'status',
    'verified',
    'available_beds',
    'total_beds',
    'latitude',
    'longitude'
  ],
  ambulances: [
    'id',
    'hospital_id',
    'organization_id',
    'profile_id',
    'status',
    'type',
    'call_sign',
    'current_call'
  ],
  doctors: [
    'id',
    'hospital_id',
    'profile_id',
    'status',
    'specialization',
    'current_patients'
  ],
  emergency_requests: [
    'id',
    'user_id',
    'hospital_id',
    'status',
    'service_type',
    'payment_status',
    'ambulance_id',
    'responder_id',
    'assigned_doctor_id',
    'total_cost',
    'patient_location',
    'responder_location'
  ],
  emergency_status_transitions: [
    'id',
    'emergency_request_id',
    'from_status',
    'to_status',
    'source',
    'reason',
    'actor_role',
    'request_snapshot',
    'occurred_at'
  ],
  visits: [
    'id',
    'request_id',
    'user_id',
    'hospital_id',
    'status',
    'type',
    'cost'
  ],
  payments: [
    'id',
    'emergency_request_id',
    'organization_id',
    'payment_method',
    'status',
    'amount'
  ],
  subscribers: [
    'id',
    'email',
    'type',
    'status',
    'new_user',
    'welcome_email_sent',
    'subscription_date',
    'source',
    'last_engagement_at',
    'welcome_email_sent_at',
    'unsubscribed_at',
    'sale_id'
  ],
  emergency_doctor_assignments: [
    'id',
    'emergency_request_id',
    'doctor_id',
    'status'
  ],
  insurance_billing: [
    'id',
    'emergency_request_id',
    'status',
    'total_amount'
  ],
  wallet_ledger: [
    'id',
    'wallet_id',
    'transaction_type',
    'amount',
    'reference_id',
    'external_reference'
  ]
};

function nowIso() {
  return new Date().toISOString();
}

function groupDuplicates(rows, keyFn) {
  const map = new Map();
  for (const row of rows || []) {
    const raw = keyFn(row);
    const key = typeof raw === 'string' ? raw.trim().toLowerCase() : raw;
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      count: items.length,
      ids: items.map((i) => i.id),
      displayIds: items.map((i) => i.display_id).filter(Boolean)
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function groupAmbulanceCallSignDuplicatesScoped(ambulances) {
  const map = new Map();
  for (const row of ambulances || []) {
    const callSign = typeof row.call_sign === 'string' ? row.call_sign.trim().toLowerCase() : null;
    if (!callSign) continue;
    const hospitalId = row.hospital_id || 'no-hospital';
    const composite = `${hospitalId}::${callSign}`;
    if (!map.has(composite)) {
      map.set(composite, { hospital_id: row.hospital_id || null, call_sign: callSign, items: [] });
    }
    map.get(composite).items.push(row);
  }

  return [...map.values()]
    .filter((group) => group.items.length > 1)
    .map((group) => ({
      hospital_id: group.hospital_id,
      call_sign: group.call_sign,
      count: group.items.length,
      ids: group.items.map((i) => i.id),
      displayIds: group.items.map((i) => i.display_id).filter(Boolean)
    }))
    .sort((a, b) => b.count - a.count || a.call_sign.localeCompare(b.call_sign));
}

async function fetchCount(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    return { count: null, error: error.message || error.code || 'unknown error' };
  }
  return { count: count || 0, error: null };
}

async function fetchRows(table, columns) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) {
    return { data: [], error: error.message || error.code || 'unknown error' };
  }
  return { data: data || [], error: null };
}

function isMissingColumnError(error) {
  const code = error?.code ? String(error.code) : '';
  const message = String(error?.message || '');
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes('Could not find the') ||
    (message.includes('column') && message.includes('does not exist'))
  );
}

async function probeColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return { ok: true };
  if (isMissingColumnError(error)) {
    return { ok: false, missing: true, error: error.message || error.code || 'unknown error' };
  }
  return { ok: false, missing: false, error: error.message || error.code || 'unknown error' };
}

async function run() {
  const startedAt = nowIso();
  console.log(`[alignment-audit] Starting at ${startedAt}`);
  console.log('[alignment-audit] Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'missing_service_role');

  const counts = {};
  const queryErrors = [];
  const tables = [
    'profiles',
    'preferences',
    'medical_profiles',
    'patient_wallets',
    'organizations',
    'organization_wallets',
    'hospitals',
    'ambulances',
    'doctors',
    'emergency_requests',
    'visits',
    'payments',
    'emergency_doctor_assignments',
    'insurance_billing',
    'wallet_ledger'
  ];

  for (const table of tables) {
    const result = await fetchCount(table);
    counts[table] = result.count;
    if (result.error) {
      queryErrors.push({ kind: 'count', table, error: result.error });
    }
  }

  const schemaContracts = {
    checkedTables: Object.keys(COLUMN_CONTRACTS).length,
    missingColumnsByTable: [],
    probeErrors: []
  };

  for (const [table, columns] of Object.entries(COLUMN_CONTRACTS)) {
    const missingColumns = [];
    for (const column of columns) {
      const probe = await probeColumn(table, column);
      if (probe.ok) continue;
      if (probe.missing) {
        missingColumns.push(column);
      } else {
        schemaContracts.probeErrors.push({ table, column, error: probe.error });
      }
    }
    if (missingColumns.length > 0) {
      schemaContracts.missingColumnsByTable.push({
        table,
        missing_columns: missingColumns
      });
    }
  }

  const [profilesRes, preferencesRes, medicalProfilesRes, patientWalletsRes] = await Promise.all([
    fetchRows('profiles', 'id,email,created_at'),
    fetchRows('preferences', 'user_id'),
    fetchRows('medical_profiles', 'user_id'),
    fetchRows('patient_wallets', 'user_id')
  ]);
  for (const [table, res] of [
    ['profiles', profilesRes],
    ['preferences', preferencesRes],
    ['medical_profiles', medicalProfilesRes],
    ['patient_wallets', patientWalletsRes]
  ]) {
    if (res.error) queryErrors.push({ kind: 'select', table, error: res.error });
  }
  const profiles = profilesRes.data;
  const preferences = preferencesRes.data;
  const medicalProfiles = medicalProfilesRes.data;
  const patientWallets = patientWalletsRes.data;

  const preferenceIds = new Set(preferences.map((r) => r.user_id).filter(Boolean));
  const medicalIds = new Set(medicalProfiles.map((r) => r.user_id).filter(Boolean));
  const walletIds = new Set(patientWallets.map((r) => r.user_id).filter(Boolean));

  const bootstrapCoverage = {
    profiles: profiles.length,
    preferences: preferences.length,
    medicalProfiles: medicalProfiles.length,
    patientWallets: patientWallets.length,
    missingPreferences: profiles.filter((p) => !preferenceIds.has(p.id)).map((p) => p.id),
    missingMedicalProfiles: profiles.filter((p) => !medicalIds.has(p.id)).map((p) => p.id),
    missingPatientWallets: profiles.filter((p) => !walletIds.has(p.id)).map((p) => p.id)
  };

  const [organizationsRes, orgWalletsRes, hospitalsRes, ambulancesRes, emergenciesRes, visitsRes, paymentsRes] = await Promise.all([
    fetchRows('organizations', 'id,display_id,name,created_at'),
    fetchRows('organization_wallets', 'id,organization_id,display_id,created_at'),
    fetchRows('hospitals', 'id,display_id,name,organization_id'),
    fetchRows('ambulances', 'id,display_id,call_sign,profile_id,hospital_id,status'),
    fetchRows('emergency_requests', [
      'id',
      'display_id',
      'status',
      'service_type',
      'user_id',
      'hospital_id',
      'ambulance_id',
      'responder_id',
      'responder_name',
      'total_cost',
      'patient_location',
      'responder_location',
      'created_at',
      'updated_at'
    ].join(',')),
    fetchRows('visits', 'id,display_id,request_id,user_id,hospital_id,status,type,doctor_name,cost,created_at'),
    fetchRows('payments', 'id,display_id,emergency_request_id,organization_id,payment_method,status,amount,created_at')
  ]);
  for (const [table, res] of [
    ['organizations', organizationsRes],
    ['organization_wallets', orgWalletsRes],
    ['hospitals', hospitalsRes],
    ['ambulances', ambulancesRes],
    ['emergency_requests', emergenciesRes],
    ['visits', visitsRes],
    ['payments', paymentsRes]
  ]) {
    if (res.error) queryErrors.push({ kind: 'select', table, error: res.error });
  }
  const organizations = organizationsRes.data;
  const orgWallets = orgWalletsRes.data;
  const hospitals = hospitalsRes.data;
  const ambulances = ambulancesRes.data;
  const emergencies = emergenciesRes.data;
  const visits = visitsRes.data;
  const payments = paymentsRes.data;

  const orgWalletByOrg = new Set(orgWallets.map((w) => w.organization_id).filter(Boolean));
  const organizationIdSet = new Set(organizations.map((o) => o.id));
  const missingOrgWallets = organizations
    .filter((o) => !orgWalletByOrg.has(o.id))
    .map((o) => ({ id: o.id, display_id: o.display_id, name: o.name }));
  const nullOrgWallets = orgWallets.filter((w) => !w.organization_id);
  const orphanOrgWallets = orgWallets.filter((w) => w.organization_id && !organizationIdSet.has(w.organization_id));

  const visitsByRequestId = new Map();
  for (const v of visits) {
    if (!v.request_id) continue;
    if (!visitsByRequestId.has(v.request_id)) visitsByRequestId.set(v.request_id, []);
    visitsByRequestId.get(v.request_id).push(v);
  }

  const emergenciesMissingVisits = emergencies
    .filter((e) => !visitsByRequestId.has(e.id))
    .map((e) => ({ id: e.id, display_id: e.display_id, status: e.status, service_type: e.service_type }));

  const duplicateVisitsPerRequest = [...visitsByRequestId.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([requestId, arr]) => ({ requestId, count: arr.length, visitIds: arr.map((v) => v.id) }));

  const activeStatuses = new Set(['in_progress', 'accepted', 'arrived']);
  const dispatchPhaseStatuses = new Set(['accepted', 'arrived']);
  const activeEmergencies = emergencies.filter((e) => activeStatuses.has(e.status));
  const activeAmbulanceEmergencies = activeEmergencies.filter((e) => e.service_type === 'ambulance');
  const activeNonAmbulanceEmergencies = activeEmergencies.filter((e) => e.service_type !== 'ambulance');
  const dispatchPhaseAmbulanceEmergencies = activeAmbulanceEmergencies.filter((e) =>
    dispatchPhaseStatuses.has(e.status)
  );
  const dispatchPhaseMissingAssignments = dispatchPhaseAmbulanceEmergencies.filter((e) =>
    !e.ambulance_id || !e.responder_id
  );
  const dispatchPhaseMissingHospital = dispatchPhaseAmbulanceEmergencies.filter((e) => !e.hospital_id);

  const dispatchHealth = {
    activeCount: activeEmergencies.length,
    byServiceType: activeEmergencies.reduce((acc, e) => {
      acc[e.service_type || 'unknown'] = (acc[e.service_type || 'unknown'] || 0) + 1;
      return acc;
    }, {}),
    ambulanceFlow: {
      activeCount: activeAmbulanceEmergencies.length,
      dispatchPhaseCount: dispatchPhaseAmbulanceEmergencies.length,
      withAmbulanceId: activeAmbulanceEmergencies.filter((e) => !!e.ambulance_id).length,
      withResponderId: activeAmbulanceEmergencies.filter((e) => !!e.responder_id).length,
      withResponderLocation: activeAmbulanceEmergencies.filter((e) => !!e.responder_location).length,
      withPatientLocation: activeAmbulanceEmergencies.filter((e) => !!e.patient_location).length,
      dispatchPhaseMissingAssignments: dispatchPhaseMissingAssignments.length,
      dispatchPhaseMissingHospital: dispatchPhaseMissingHospital.length,
      dispatchPhaseRecords: dispatchPhaseAmbulanceEmergencies.map((e) => ({
        id: e.id,
        display_id: e.display_id,
        status: e.status,
        service_type: e.service_type,
        hospital_id: e.hospital_id,
        ambulance_id: e.ambulance_id,
        responder_id: e.responder_id
      })),
      activeRecords: activeAmbulanceEmergencies.map((e) => ({
        id: e.id,
        display_id: e.display_id,
        status: e.status,
        service_type: e.service_type,
        ambulance_id: e.ambulance_id,
        responder_id: e.responder_id,
        has_responder_location: !!e.responder_location,
        has_patient_location: !!e.patient_location
      }))
    },
    nonAmbulanceFlow: {
      activeCount: activeNonAmbulanceEmergencies.length,
      activeRecords: activeNonAmbulanceEmergencies.map((e) => ({
        id: e.id,
        display_id: e.display_id,
        status: e.status,
        service_type: e.service_type,
        ambulance_id: e.ambulance_id,
        responder_id: e.responder_id
      }))
    },
    activeRecords: activeEmergencies.map((e) => ({
      id: e.id,
      display_id: e.display_id,
      status: e.status,
      service_type: e.service_type,
      ambulance_id: e.ambulance_id,
      responder_id: e.responder_id,
      has_responder_location: !!e.responder_location,
      has_patient_location: !!e.patient_location
    }))
  };

  const paymentHealth = {
    total: payments.length,
    linkedToEmergency: payments.filter((p) => !!p.emergency_request_id).length,
    missingEmergencyLink: payments.filter((p) => !p.emergency_request_id).length,
    missingOrganizationLink: payments.filter((p) => !p.organization_id).length,
    pendingCash: payments.filter((p) => p.payment_method === 'cash' && p.status === 'pending').length,
    paymentsMissingLinks: payments
      .filter((p) => !p.emergency_request_id || !p.organization_id)
      .slice(0, 50)
      .map((p) => ({
        id: p.id,
        display_id: p.display_id,
        payment_method: p.payment_method,
        status: p.status,
        amount: p.amount,
        emergency_request_id: p.emergency_request_id,
        organization_id: p.organization_id
      })),
    placeholderOrphans: payments.filter(
      (p) =>
        !p.emergency_request_id &&
        !p.organization_id &&
        !p.payment_method &&
        Number(p.amount || 0) === 0 &&
        p.status === 'pending'
    ).map((p) => ({
      id: p.id,
      display_id: p.display_id,
      created_at: p.created_at
    }))
  };

  const duplicateCandidates = {
    organizationsByName: groupDuplicates(organizations, (r) => r.name),
    hospitalsByName: groupDuplicates(hospitals, (r) => r.name),
    ambulancesByCallSignGlobal: groupDuplicates(ambulances, (r) => r.call_sign),
    ambulancesByHospitalAndCallSign: groupAmbulanceCallSignDuplicatesScoped(ambulances)
  };

  const severity = {
    critical: [],
    high: [],
    medium: []
  };

  if (missingOrgWallets.length > 0) {
    severity.high.push(`Missing organization_wallets: ${missingOrgWallets.length}`);
  }
  if (nullOrgWallets.length > 0 || orphanOrgWallets.length > 0) {
    severity.medium.push(`Invalid organization_wallet rows (null/orphan org refs): ${nullOrgWallets.length + orphanOrgWallets.length}`);
  }
  if (emergenciesMissingVisits.length > 0) {
    severity.critical.push(`Emergencies missing visits: ${emergenciesMissingVisits.length}`);
  }
  if (dispatchHealth.ambulanceFlow.dispatchPhaseMissingHospital > 0) {
    severity.critical.push(`Dispatch-phase ambulance emergencies missing hospital_id: ${dispatchHealth.ambulanceFlow.dispatchPhaseMissingHospital}`);
  }
  if (dispatchHealth.ambulanceFlow.dispatchPhaseMissingAssignments > 0) {
    severity.critical.push(`Dispatch-phase ambulance emergencies missing ambulance_id/responder_id: ${dispatchHealth.ambulanceFlow.dispatchPhaseMissingAssignments}`);
  }
  if (paymentHealth.missingOrganizationLink > 0) {
    severity.medium.push(`Payments missing organization_id: ${paymentHealth.missingOrganizationLink}`);
  }
  if (paymentHealth.placeholderOrphans.length > 0) {
    severity.medium.push(`Placeholder/orphan pending payments: ${paymentHealth.placeholderOrphans.length}`);
  }
  if (duplicateCandidates.ambulancesByHospitalAndCallSign.length > 0) {
    severity.medium.push('Duplicate ambulance call signs detected within the same hospital');
  }
  if (schemaContracts.missingColumnsByTable.length > 0) {
    severity.high.push(`Schema contract missing columns: ${schemaContracts.missingColumnsByTable.length} tables`);
  }
  if (schemaContracts.probeErrors.length > 0) {
    severity.medium.push(`Schema contract probe errors: ${schemaContracts.probeErrors.length}`);
  }

  const report = {
    generatedAt: nowIso(),
    source: 'run_alignment_audit.js',
    supabaseUrl,
    queryErrors,
    counts,
    bootstrapCoverage,
    orgWalletCoverage: {
      organizations: organizations.length,
      organizationWallets: orgWallets.length,
      nullOrgWallets: nullOrgWallets.map((w) => ({ id: w.id, display_id: w.display_id })),
      orphanOrgWallets: orphanOrgWallets.map((w) => ({ id: w.id, display_id: w.display_id, organization_id: w.organization_id })),
      missing: missingOrgWallets
    },
    emergencyVisitHealth: {
      emergencyCount: emergencies.length,
      visitCount: visits.length,
      missingVisitsCount: emergenciesMissingVisits.length,
      emergenciesMissingVisits: emergenciesMissingVisits.slice(0, 200),
      duplicateVisitsPerRequest
    },
    paymentHealth,
    dispatchHealth,
    duplicateCandidates,
    schemaContracts,
    severity
  };

  const outDir = path.join(__dirname, '..', 'validation');
  const outFile = path.join(outDir, 'e2e_alignment_report.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('[alignment-audit] Report written:', outFile);
  if (queryErrors.length > 0) {
    console.log('[alignment-audit] Query warnings/errors:', queryErrors.length);
  }
  console.log('[alignment-audit] Critical:', severity.critical.length, 'High:', severity.high.length, 'Medium:', severity.medium.length);

  if (severity.critical.length > 0) {
    console.log('[alignment-audit] Critical findings:');
    for (const line of severity.critical) console.log('  -', line);
  }
}

run().catch((error) => {
  console.error('[alignment-audit] Failed:', error);
  process.exit(1);
});
