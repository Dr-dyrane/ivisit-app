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

function nowIso() {
  return new Date().toISOString();
}

function normalizeKey(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().toLowerCase();
  return text || null;
}

async function fetchRows(table, columns) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) {
    return { data: [], error: error.message || error.code || 'unknown error' };
  }
  return { data: data || [], error: null };
}

function indexCounts(rows, field) {
  const map = new Map();
  for (const row of rows || []) {
    const key = row[field];
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function clusterBy(rows, keyField) {
  const buckets = new Map();
  for (const row of rows || []) {
    const key = normalizeKey(row[keyField]);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }
  return [...buckets.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key));
}

function groupAmbulanceGlobalCallSignInfo(ambulances) {
  return clusterBy(ambulances, 'call_sign').map((cluster) => ({
    key: cluster.key,
    count: cluster.items.length,
    ids: cluster.items.map((a) => a.id),
    hospital_ids: [...new Set(cluster.items.map((a) => a.hospital_id).filter(Boolean))]
  }));
}

function summarizeRefs(refMap, entityId) {
  const refs = {};
  let total = 0;
  for (const [label, counts] of Object.entries(refMap)) {
    const count = counts.get(entityId) || 0;
    refs[label] = count;
    total += count;
  }
  return { refs, total };
}

function pickCanonical(items) {
  const sorted = [...items].sort((a, b) => {
    if (b.referenceTotal !== a.referenceTotal) return b.referenceTotal - a.referenceTotal;
    const aCreated = a.created_at || '';
    const bCreated = b.created_at || '';
    if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
    const aHasDisplay = a.display_id ? 1 : 0;
    const bHasDisplay = b.display_id ? 1 : 0;
    if (bHasDisplay !== aHasDisplay) return bHasDisplay - aHasDisplay;
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted[0];
}

function analyzeClusters({ entityLabel, keyField, rows, refMap, extraDescribe }) {
  const clusters = clusterBy(rows, keyField).map((cluster) => {
    const members = cluster.items.map((row) => {
      const refSummary = summarizeRefs(refMap, row.id);
      return {
        id: row.id,
        display_id: row.display_id || null,
        created_at: row.created_at || null,
        [keyField]: row[keyField] || null,
        referenceTotal: refSummary.total,
        references: refSummary.refs,
        extra: extraDescribe ? extraDescribe(row) : undefined
      };
    });
    const canonical = pickCanonical(members);
    const safeDeleteCandidates = members.filter((m) => m.id !== canonical.id && m.referenceTotal === 0);
    const mergeRequired = members.filter((m) => m.id !== canonical.id && m.referenceTotal > 0);

    return {
      key: cluster.key,
      count: members.length,
      canonical: {
        id: canonical.id,
        display_id: canonical.display_id,
        referenceTotal: canonical.referenceTotal
      },
      safeDeleteCandidateIds: safeDeleteCandidates.map((m) => m.id),
      mergeRequiredIds: mergeRequired.map((m) => m.id),
      members
    };
  });

  const safeDeleteCandidates = clusters.flatMap((c) =>
    c.safeDeleteCandidateIds.map((id) => ({ clusterKey: c.key, id }))
  );
  const mergeRequired = clusters.flatMap((c) =>
    c.mergeRequiredIds.map((id) => ({ clusterKey: c.key, id }))
  );

  return {
    entity: entityLabel,
    keyField,
    clusterCount: clusters.length,
    clusters,
    safeDeleteCandidates,
    mergeRequired,
    summary: {
      duplicateRows: clusters.reduce((sum, c) => sum + c.count, 0),
      safeDeleteCandidates: safeDeleteCandidates.length,
      mergeRequired: mergeRequired.length
    }
  };
}

async function run() {
  const startedAt = nowIso();
  console.log(`[duplicate-analysis] Starting at ${startedAt}`);

  const queryErrors = [];

  const [
    organizationsRes,
    hospitalsRes,
    ambulancesRes,
    orgWalletsRes,
    paymentsRes,
    profilesRes,
    supportTicketsRes,
    doctorsRes,
    emergenciesRes,
    visitsRes,
    insuranceBillingRes,
    servicePricingRes,
    roomPricingRes
  ] = await Promise.all([
    fetchRows('organizations', 'id,display_id,name,created_at,is_active'),
    fetchRows('hospitals', 'id,display_id,name,created_at,organization_id,address,place_id,status'),
    fetchRows('ambulances', 'id,display_id,call_sign,created_at,hospital_id,organization_id,profile_id,status,current_call'),
    fetchRows('organization_wallets', 'id,organization_id'),
    fetchRows('payments', 'id,organization_id,emergency_request_id,status,amount'),
    fetchRows('profiles', 'id,organization_id,role'),
    fetchRows('support_tickets', 'id,organization_id,status'),
    fetchRows('doctors', 'id,hospital_id,status'),
    fetchRows('emergency_requests', 'id,hospital_id,ambulance_id,status,service_type'),
    fetchRows('visits', 'id,hospital_id,status,request_id'),
    fetchRows('insurance_billing', 'id,hospital_id,status'),
    fetchRows('service_pricing', 'id,hospital_id,service_type'),
    fetchRows('room_pricing', 'id,hospital_id,room_type')
  ]);

  for (const [table, res] of [
    ['organizations', organizationsRes],
    ['hospitals', hospitalsRes],
    ['ambulances', ambulancesRes],
    ['organization_wallets', orgWalletsRes],
    ['payments', paymentsRes],
    ['profiles', profilesRes],
    ['support_tickets', supportTicketsRes],
    ['doctors', doctorsRes],
    ['emergency_requests', emergenciesRes],
    ['visits', visitsRes],
    ['insurance_billing', insuranceBillingRes],
    ['service_pricing', servicePricingRes],
    ['room_pricing', roomPricingRes]
  ]) {
    if (res.error) queryErrors.push({ table, error: res.error });
  }

  const organizations = organizationsRes.data;
  const hospitals = hospitalsRes.data;
  const ambulances = ambulancesRes.data;
  const ambulanceScopedRows = ambulances.map((a) => ({
    ...a,
    call_sign_scope_key: `${a.hospital_id || 'no-hospital'}::${(a.call_sign || '').trim().toLowerCase()}`
  }));

  const organizationRefMap = {
    hospitals: indexCounts(hospitalsRes.data, 'organization_id'),
    ambulances: indexCounts(ambulancesRes.data, 'organization_id'),
    organization_wallets: indexCounts(orgWalletsRes.data, 'organization_id'),
    payments: indexCounts(paymentsRes.data, 'organization_id'),
    profiles: indexCounts(profilesRes.data, 'organization_id'),
    support_tickets: indexCounts(supportTicketsRes.data, 'organization_id')
  };

  const hospitalRefMap = {
    doctors: indexCounts(doctorsRes.data, 'hospital_id'),
    ambulances: indexCounts(ambulancesRes.data, 'hospital_id'),
    emergency_requests: indexCounts(emergenciesRes.data, 'hospital_id'),
    visits: indexCounts(visitsRes.data, 'hospital_id'),
    insurance_billing: indexCounts(insuranceBillingRes.data, 'hospital_id'),
    service_pricing: indexCounts(servicePricingRes.data, 'hospital_id'),
    room_pricing: indexCounts(roomPricingRes.data, 'hospital_id')
  };

  const ambulanceRefMap = {
    emergency_requests: indexCounts(emergenciesRes.data, 'ambulance_id')
  };

  const organizationAnalysis = analyzeClusters({
    entityLabel: 'organizations',
    keyField: 'name',
    rows: organizations,
    refMap: organizationRefMap,
    extraDescribe: (row) => ({
      is_active: row.is_active
    })
  });

  const hospitalAnalysis = analyzeClusters({
    entityLabel: 'hospitals',
    keyField: 'name',
    rows: hospitals,
    refMap: hospitalRefMap,
    extraDescribe: (row) => ({
      organization_id: row.organization_id || null,
      status: row.status || null,
      address: row.address || null,
      place_id: row.place_id || null
    })
  });

  const ambulanceAnalysis = analyzeClusters({
    entityLabel: 'ambulances',
    keyField: 'call_sign_scope_key',
    rows: ambulanceScopedRows,
    refMap: ambulanceRefMap,
    extraDescribe: (row) => ({
      call_sign: row.call_sign || null,
      hospital_id: row.hospital_id || null,
      organization_id: row.organization_id || null,
      profile_id: row.profile_id || null,
      status: row.status || null,
      current_call: row.current_call || null
    })
  });

  const safeDeleteSummary = {
    organizations: organizationAnalysis.safeDeleteCandidates.length,
    hospitals: hospitalAnalysis.safeDeleteCandidates.length,
    ambulances: ambulanceAnalysis.safeDeleteCandidates.length
  };

  const mergeRequiredSummary = {
    organizations: organizationAnalysis.mergeRequired.length,
    hospitals: hospitalAnalysis.mergeRequired.length,
    ambulances: ambulanceAnalysis.mergeRequired.length
  };

  const report = {
    generatedAt: nowIso(),
    source: 'analyze_duplicate_seed_records.js',
    supabaseUrl,
    queryErrors,
    totals: {
      organizations: organizations.length,
      hospitals: hospitals.length,
      ambulances: ambulances.length
    },
    analyses: {
      organizationsByName: organizationAnalysis,
      hospitalsByName: hospitalAnalysis,
      ambulancesByHospitalAndCallSign: ambulanceAnalysis
    },
    informational: {
      ambulancesByCallSignGlobal: groupAmbulanceGlobalCallSignInfo(ambulances)
    },
    summary: {
      clusterCounts: {
        organizationsByName: organizationAnalysis.clusterCount,
        hospitalsByName: hospitalAnalysis.clusterCount,
        ambulancesByHospitalAndCallSign: ambulanceAnalysis.clusterCount
      },
      safeDeleteCandidates: safeDeleteSummary,
      mergeRequired: mergeRequiredSummary
    }
  };

  const outDir = path.join(__dirname, '..', 'validation');
  const outFile = path.join(outDir, 'e2e_duplicate_seed_analysis_report.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('[duplicate-analysis] Report written:', outFile);
  console.log('[duplicate-analysis] Clusters:', report.summary.clusterCounts);
  console.log('[duplicate-analysis] Safe delete candidates:', safeDeleteSummary);
  console.log('[duplicate-analysis] Merge required:', mergeRequiredSummary);
  if (queryErrors.length) {
    console.log('[duplicate-analysis] Query warnings/errors:', queryErrors.length);
  }
}

run().catch((error) => {
  console.error('[duplicate-analysis] Failed:', error);
  process.exit(1);
});
