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

const APPLY = process.argv.includes('--apply');

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
    throw new Error(`${table}: ${error.message || error.code || 'unknown error'}`);
  }
  return data || [];
}

function chunk(items, size = 50) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function groupDuplicateClusters(rows, keyField) {
  const map = new Map();
  for (const row of rows || []) {
    const key = normalizeKey(row[keyField]);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key));
}

function indexCounts(rows, field, excludeIds = new Set()) {
  const map = new Map();
  for (const row of rows || []) {
    if (excludeIds.has(row.id)) continue;
    const key = row[field];
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function buildHospitalRefCounts(state, excludedHospitalIds = new Set()) {
  return {
    doctors: indexCounts(state.doctors, 'hospital_id'),
    ambulances: indexCounts(state.ambulances, 'hospital_id'),
    emergency_requests: indexCounts(state.emergency_requests, 'hospital_id'),
    visits: indexCounts(state.visits, 'hospital_id'),
    insurance_billing: indexCounts(state.insurance_billing, 'hospital_id'),
    service_pricing: indexCounts(state.service_pricing, 'hospital_id'),
    room_pricing: indexCounts(state.room_pricing, 'hospital_id')
  };
}

function buildOrganizationRefCounts(state, excludedHospitalIds = new Set()) {
  return {
    hospitals: indexCounts(state.hospitals, 'organization_id', excludedHospitalIds),
    ambulances: indexCounts(state.ambulances, 'organization_id'),
    organization_wallets: indexCounts(state.organization_wallets, 'organization_id'),
    payments: indexCounts(state.payments, 'organization_id'),
    profiles: indexCounts(state.profiles, 'organization_id'),
    support_tickets: indexCounts(state.support_tickets, 'organization_id')
  };
}

function sumRefs(refMap, id) {
  const refs = {};
  let total = 0;
  for (const [label, counts] of Object.entries(refMap)) {
    const count = counts.get(id) || 0;
    refs[label] = count;
    total += count;
  }
  return { refs, total };
}

function pickCanonicalByRefs(items, refMap) {
  return [...items]
    .sort((a, b) => {
      const aRefs = sumRefs(refMap, a.id).total;
      const bRefs = sumRefs(refMap, b.id).total;
      if (bRefs !== aRefs) return bRefs - aRefs;
      const aCreated = a.created_at || '';
      const bCreated = b.created_at || '';
      if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
      return String(a.id).localeCompare(String(b.id));
    })[0];
}

async function loadState() {
  const [
    organizations,
    hospitals,
    ambulances,
    organization_wallets,
    payments,
    profiles,
    support_tickets,
    doctors,
    emergency_requests,
    visits,
    insurance_billing,
    service_pricing,
    room_pricing
  ] = await Promise.all([
    fetchRows('organizations', 'id,display_id,name,created_at'),
    fetchRows('hospitals', 'id,display_id,name,organization_id,created_at,address,place_id'),
    fetchRows('ambulances', 'id,hospital_id,organization_id,call_sign,profile_id,current_call'),
    fetchRows('organization_wallets', 'id,organization_id'),
    fetchRows('payments', 'id,organization_id'),
    fetchRows('profiles', 'id,organization_id'),
    fetchRows('support_tickets', 'id,organization_id'),
    fetchRows('doctors', 'id,hospital_id'),
    fetchRows('emergency_requests', 'id,hospital_id,ambulance_id'),
    fetchRows('visits', 'id,hospital_id'),
    fetchRows('insurance_billing', 'id,hospital_id'),
    fetchRows('service_pricing', 'id,hospital_id'),
    fetchRows('room_pricing', 'id,hospital_id')
  ]);

  return {
    organizations,
    hospitals,
    ambulances,
    organization_wallets,
    payments,
    profiles,
    support_tickets,
    doctors,
    emergency_requests,
    visits,
    insurance_billing,
    service_pricing,
    room_pricing
  };
}

function planHospitalDeletes(state) {
  const refMap = buildHospitalRefCounts(state);
  const clusters = groupDuplicateClusters(state.hospitals, 'name');
  const candidates = [];

  for (const cluster of clusters) {
    const canonical = pickCanonicalByRefs(cluster.items, refMap);
    for (const row of cluster.items) {
      if (row.id === canonical.id) continue;
      const refSummary = sumRefs(refMap, row.id);
      if (refSummary.total === 0) {
        candidates.push({
          id: row.id,
          display_id: row.display_id || null,
          name: row.name || null,
          organization_id: row.organization_id || null,
          clusterKey: cluster.key
        });
      }
    }
  }

  return { clusters, candidates };
}

function planOrganizationDeletes(state, simulatedDeletedHospitalIds = new Set()) {
  const refMap = buildOrganizationRefCounts(state, simulatedDeletedHospitalIds);
  const clusters = groupDuplicateClusters(state.organizations, 'name');
  const candidates = [];

  for (const cluster of clusters) {
    const canonical = pickCanonicalByRefs(cluster.items, refMap);
    for (const row of cluster.items) {
      if (row.id === canonical.id) continue;
      const refs = sumRefs(refMap, row.id).refs;
      const blockingRefs = {
        hospitals: refs.hospitals || 0,
        ambulances: refs.ambulances || 0,
        payments: refs.payments || 0,
        profiles: refs.profiles || 0,
        support_tickets: refs.support_tickets || 0
      };
      const blockingTotal = Object.values(blockingRefs).reduce((sum, n) => sum + n, 0);
      if (blockingTotal === 0) {
        candidates.push({
          id: row.id,
          display_id: row.display_id || null,
          name: row.name || null,
          clusterKey: cluster.key,
          organization_wallets: refs.organization_wallets || 0
        });
      }
    }
  }

  return { clusters, candidates };
}

async function deleteByIds(table, ids) {
  const deleted = [];
  const errors = [];
  for (const batch of chunk(ids, 50)) {
    const { data, error } = await supabase.from(table).delete().in('id', batch).select('id');
    if (error) {
      errors.push({ table, ids: batch, error: error.message || error.code || 'unknown error' });
      continue;
    }
    for (const row of data || []) deleted.push(row.id);
  }
  return { deleted, errors };
}

async function run() {
  const startedAt = nowIso();
  console.log(`[duplicate-cleanup] Starting (${APPLY ? 'apply' : 'dry-run'}) at ${startedAt}`);

  const beforeState = await loadState();

  const hospitalPlan = planHospitalDeletes(beforeState);
  const simulatedDeletedHospitalIds = new Set(hospitalPlan.candidates.map((c) => c.id));
  const orgPlanPreApply = planOrganizationDeletes(beforeState, simulatedDeletedHospitalIds);

  const report = {
    generatedAt: nowIso(),
    source: 'cleanup_duplicate_seed_records.js',
    mode: APPLY ? 'apply' : 'dry-run',
    before: {
      organizations: beforeState.organizations.length,
      hospitals: beforeState.hospitals.length,
      ambulances: beforeState.ambulances.length
    },
    planned: {
      deleteHospitals: hospitalPlan.candidates,
      deleteOrganizations: orgPlanPreApply.candidates
    },
    applied: {
      hospitalsDeleted: [],
      organizationsDeleted: [],
      errors: []
    }
  };

  console.log('[duplicate-cleanup] Planned hospital deletes:', hospitalPlan.candidates.length);
  console.log('[duplicate-cleanup] Planned org deletes (post-hospital simulation):', orgPlanPreApply.candidates.length);

  if (APPLY) {
    if (hospitalPlan.candidates.length > 0) {
      const hospitalDeleteRes = await deleteByIds('hospitals', hospitalPlan.candidates.map((c) => c.id));
      report.applied.hospitalsDeleted = hospitalDeleteRes.deleted;
      report.applied.errors.push(...hospitalDeleteRes.errors);
      console.log('[duplicate-cleanup] Hospitals deleted:', hospitalDeleteRes.deleted.length);
    }

    const afterHospitalState = await loadState();
    const orgPlanApply = planOrganizationDeletes(afterHospitalState, new Set());
    report.planned.deleteOrganizationsAfterHospitalDelete = orgPlanApply.candidates;

    if (orgPlanApply.candidates.length > 0) {
      const orgDeleteRes = await deleteByIds('organizations', orgPlanApply.candidates.map((c) => c.id));
      report.applied.organizationsDeleted = orgDeleteRes.deleted;
      report.applied.errors.push(...orgDeleteRes.errors);
      console.log('[duplicate-cleanup] Organizations deleted:', orgDeleteRes.deleted.length);
    }

    const afterState = await loadState();
    report.after = {
      organizations: afterState.organizations.length,
      hospitals: afterState.hospitals.length,
      ambulances: afterState.ambulances.length,
      organization_wallets: afterState.organization_wallets.length
    };
  }

  const outDir = path.join(__dirname, '..', 'validation');
  const outFile = path.join(outDir, 'e2e_duplicate_seed_cleanup_report.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log('[duplicate-cleanup] Report written:', outFile);

  if (report.applied.errors.length) {
    console.log('[duplicate-cleanup] Errors:', report.applied.errors.length);
    process.exitCode = 2;
  }
}

run().catch((error) => {
  console.error('[duplicate-cleanup] Failed:', error);
  process.exit(1);
});
