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
  if (error) throw new Error(`${table}: ${error.message || error.code || 'unknown error'}`);
  return data || [];
}

function groupDuplicates(rows, keyField) {
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

function buildCountIndex(rows, field) {
  const map = new Map();
  for (const row of rows || []) {
    const key = row[field];
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function buildValueSetIndex(rows, field, valueField) {
  const map = new Map();
  for (const row of rows || []) {
    const key = row[field];
    const value = normalizeKey(row[valueField]);
    if (!key || !value) continue;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(value);
  }
  return map;
}

function intersections(aSet, bSet) {
  if (!aSet || !bSet) return [];
  const out = [];
  for (const v of aSet) if (bSet.has(v)) out.push(v);
  return out.sort();
}

function sumRefMaps(refMaps, id) {
  const refs = {};
  let total = 0;
  for (const [label, map] of Object.entries(refMaps)) {
    const count = map.get(id) || 0;
    refs[label] = count;
    total += count;
  }
  return { refs, total };
}

function pickCanonical(items, refMaps) {
  return [...items]
    .sort((a, b) => {
      const aScore = sumRefMaps(refMaps, a.id).total;
      const bScore = sumRefMaps(refMaps, b.id).total;
      if (bScore !== aScore) return bScore - aScore;
      const aCreated = a.created_at || '';
      const bCreated = b.created_at || '';
      if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
      return String(a.id).localeCompare(String(b.id));
    })[0];
}

function getByIdMap(rows) {
  const map = new Map();
  for (const row of rows || []) map.set(row.id, row);
  return map;
}

async function run() {
  console.log(`[duplicate-merge-plan] Starting at ${nowIso()}`);

  const [
    organizations,
    organizationWallets,
    walletLedger,
    hospitals,
    ambulances,
    doctors,
    emergencyRequests,
    visits,
    insuranceBilling,
    servicePricing,
    roomPricing,
    payments,
    profiles,
    supportTickets
  ] = await Promise.all([
    fetchRows('organizations', 'id,display_id,name,created_at,is_active'),
    fetchRows('organization_wallets', 'id,organization_id,display_id,balance,created_at'),
    fetchRows('wallet_ledger', 'id,wallet_id,amount,transaction_type,reference_id,created_at'),
    fetchRows('hospitals', 'id,display_id,name,organization_id,address,place_id,created_at,status'),
    fetchRows('ambulances', 'id,display_id,call_sign,hospital_id,organization_id,profile_id,status,current_call,created_at'),
    fetchRows('doctors', 'id,hospital_id,status'),
    fetchRows('emergency_requests', 'id,hospital_id,ambulance_id,status,service_type'),
    fetchRows('visits', 'id,hospital_id,status'),
    fetchRows('insurance_billing', 'id,hospital_id,status'),
    fetchRows('service_pricing', 'id,hospital_id,service_type,service_name'),
    fetchRows('room_pricing', 'id,hospital_id,room_type,room_name'),
    fetchRows('payments', 'id,organization_id,status,amount,payment_method,emergency_request_id'),
    fetchRows('profiles', 'id,organization_id,role'),
    fetchRows('support_tickets', 'id,organization_id,status')
  ]);

  const orgById = getByIdMap(organizations);
  const hospitalById = getByIdMap(hospitals);
  const walletByOrg = new Map();
  for (const w of organizationWallets) {
    if (!w.organization_id) continue;
    if (!walletByOrg.has(w.organization_id)) walletByOrg.set(w.organization_id, []);
    walletByOrg.get(w.organization_id).push(w);
  }

  const ledgerCountByWallet = buildCountIndex(walletLedger, 'wallet_id');

  const hospitalRefMaps = {
    doctors: buildCountIndex(doctors, 'hospital_id'),
    ambulances: buildCountIndex(ambulances, 'hospital_id'),
    emergency_requests: buildCountIndex(emergencyRequests, 'hospital_id'),
    visits: buildCountIndex(visits, 'hospital_id'),
    insurance_billing: buildCountIndex(insuranceBilling, 'hospital_id'),
    service_pricing: buildCountIndex(servicePricing, 'hospital_id'),
    room_pricing: buildCountIndex(roomPricing, 'hospital_id')
  };

  const organizationRefMaps = {
    hospitals: buildCountIndex(hospitals, 'organization_id'),
    ambulances: buildCountIndex(ambulances, 'organization_id'),
    payments: buildCountIndex(payments, 'organization_id'),
    profiles: buildCountIndex(profiles, 'organization_id'),
    support_tickets: buildCountIndex(supportTickets, 'organization_id'),
    organization_wallets: buildCountIndex(organizationWallets, 'organization_id')
  };

  const serviceTypesByHospital = buildValueSetIndex(servicePricing, 'hospital_id', 'service_type');
  const roomTypesByHospital = buildValueSetIndex(roomPricing, 'hospital_id', 'room_type');
  const ambulanceCallSignsByHospital = buildValueSetIndex(ambulances, 'hospital_id', 'call_sign');

  const hospitalClusters = groupDuplicates(hospitals, 'name').map((cluster) => {
    const canonical = pickCanonical(cluster.items, hospitalRefMaps);
    const canonicalServiceTypes = serviceTypesByHospital.get(canonical.id) || new Set();
    const canonicalRoomTypes = roomTypesByHospital.get(canonical.id) || new Set();
    const canonicalCallSigns = ambulanceCallSignsByHospital.get(canonical.id) || new Set();

    const members = cluster.items.map((h) => {
      const refSummary = sumRefMaps(hospitalRefMaps, h.id);
      return {
        id: h.id,
        display_id: h.display_id || null,
        name: h.name || null,
        organization_id: h.organization_id || null,
        organization_name: h.organization_id ? (orgById.get(h.organization_id)?.name || null) : null,
        created_at: h.created_at || null,
        address: h.address || null,
        place_id: h.place_id || null,
        referenceTotal: refSummary.total,
        references: refSummary.refs
      };
    });

    const merges = members
      .filter((m) => m.id !== canonical.id)
      .map((source) => {
        const serviceConflicts = intersections(
          serviceTypesByHospital.get(source.id) || new Set(),
          canonicalServiceTypes
        );
        const roomConflicts = intersections(
          roomTypesByHospital.get(source.id) || new Set(),
          canonicalRoomTypes
        );
        const callSignConflicts = intersections(
          ambulanceCallSignsByHospital.get(source.id) || new Set(),
          canonicalCallSigns
        );
        const conflictCount =
          serviceConflicts.length + roomConflicts.length + callSignConflicts.length;

        return {
          source_hospital_id: source.id,
          target_hospital_id: canonical.id,
          source_display_id: source.display_id,
          target_display_id: canonical.display_id || null,
          source_organization_id: source.organization_id,
          target_organization_id: canonical.organization_id || null,
          rewireCounts: {
            doctors: source.references.doctors || 0,
            ambulances: source.references.ambulances || 0,
            emergency_requests: source.references.emergency_requests || 0,
            visits: source.references.visits || 0,
            insurance_billing: source.references.insurance_billing || 0,
            service_pricing: source.references.service_pricing || 0,
            room_pricing: source.references.room_pricing || 0
          },
          conflictChecks: {
            service_pricing_service_type_overlap: serviceConflicts,
            room_pricing_room_type_overlap: roomConflicts,
            ambulance_call_sign_overlap_within_target: callSignConflicts
          },
          risk: conflictCount > 0 ? 'manual_merge_required' : 'can_auto_rewire'
        };
      });

    const totalRewires = merges.reduce((acc, m) => {
      for (const [k, v] of Object.entries(m.rewireCounts)) acc[k] = (acc[k] || 0) + v;
      return acc;
    }, {});

    return {
      key: cluster.key,
      count: members.length,
      canonical_hospital_id: canonical.id,
      canonical_display_id: canonical.display_id || null,
      members,
      mergeActions: merges,
      summary: {
        mergeActionCount: merges.length,
        manualMergeRequiredCount: merges.filter((m) => m.risk === 'manual_merge_required').length,
        totalRewires
      }
    };
  });

  const plannedHospitalDeletes = new Set();
  for (const cluster of hospitalClusters) {
    for (const action of cluster.mergeActions) {
      if (action.risk !== 'manual_merge_required') plannedHospitalDeletes.add(action.source_hospital_id);
    }
  }

  const orgClusters = groupDuplicates(organizations, 'name').map((cluster) => {
    const canonical = pickCanonical(cluster.items, organizationRefMaps);
    const members = cluster.items.map((o) => {
      const refSummary = sumRefMaps(organizationRefMaps, o.id);
      const wallets = walletByOrg.get(o.id) || [];
      const walletSummaries = wallets.map((w) => ({
        wallet_id: w.id,
        display_id: w.display_id || null,
        balance: Number(w.balance || 0),
        ledger_entries: ledgerCountByWallet.get(w.id) || 0
      }));
      return {
        id: o.id,
        display_id: o.display_id || null,
        name: o.name || null,
        created_at: o.created_at || null,
        referenceTotal: refSummary.total,
        references: refSummary.refs,
        wallets: walletSummaries
      };
    });

    const canonicalWallets = walletByOrg.get(canonical.id) || [];
    const canonicalWallet = canonicalWallets[0] || null;

    const mergeActions = members
      .filter((m) => m.id !== canonical.id)
      .map((source) => {
        const projectedHospitalRefs = (source.references.hospitals || 0) -
          hospitals.filter((h) => h.organization_id === source.id && plannedHospitalDeletes.has(h.id)).length;

        const walletMerge = {
          canonical_wallet_id: canonicalWallet ? canonicalWallet.id : null,
          source_wallet_ids: source.wallets.map((w) => w.wallet_id),
          source_wallet_balance_total: source.wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0),
          source_wallet_ledger_entries: source.wallets.reduce((sum, w) => sum + (w.ledger_entries || 0), 0),
          requires_wallet_ledger_rewire: source.wallets.some((w) => (w.ledger_entries || 0) > 0),
          canonical_wallet_missing: !canonicalWallet
        };

        const conflictFlags = [];
        if (projectedHospitalRefs > 0) conflictFlags.push('hospital_children_remain_after_hospital_merge_phase');
        if (walletMerge.canonical_wallet_missing && source.wallets.length > 0) {
          conflictFlags.push('canonical_org_wallet_missing');
        }

        return {
          source_organization_id: source.id,
          target_organization_id: canonical.id,
          source_display_id: source.display_id,
          target_display_id: canonical.display_id || null,
          currentRewireCounts: {
            hospitals: source.references.hospitals || 0,
            ambulances: source.references.ambulances || 0,
            payments: source.references.payments || 0,
            profiles: source.references.profiles || 0,
            support_tickets: source.references.support_tickets || 0
          },
          projectedAfterHospitalMerge: {
            hospitals: projectedHospitalRefs,
            ambulances: source.references.ambulances || 0,
            payments: source.references.payments || 0,
            profiles: source.references.profiles || 0,
            support_tickets: source.references.support_tickets || 0
          },
          walletMerge,
          risk: conflictFlags.length ? 'manual_merge_required' : 'candidate_for_controlled_merge',
          conflictFlags
        };
      });

    return {
      key: cluster.key,
      count: members.length,
      canonical_organization_id: canonical.id,
      canonical_display_id: canonical.display_id || null,
      members,
      mergeActions,
      summary: {
        mergeActionCount: mergeActions.length,
        manualMergeRequiredCount: mergeActions.filter((m) => m.risk === 'manual_merge_required').length,
        candidateForControlledMergeCount: mergeActions.filter((m) => m.risk === 'candidate_for_controlled_merge').length
      }
    };
  });

  const globalSummary = {
    hospitalClusters: hospitalClusters.length,
    hospitalMergeActions: hospitalClusters.reduce((sum, c) => sum + c.summary.mergeActionCount, 0),
    hospitalManualMergeRequired: hospitalClusters.reduce((sum, c) => sum + c.summary.manualMergeRequiredCount, 0),
    organizationClusters: orgClusters.length,
    organizationMergeActions: orgClusters.reduce((sum, c) => sum + c.summary.mergeActionCount, 0),
    organizationManualMergeRequired: orgClusters.reduce((sum, c) => sum + c.summary.manualMergeRequiredCount, 0),
    organizationCandidateControlledMerge: orgClusters.reduce((sum, c) => sum + c.summary.candidateForControlledMergeCount, 0),
    recommendAutoApply: false
  };

  const report = {
    generatedAt: nowIso(),
    source: 'plan_duplicate_seed_merges.js',
    supabaseUrl,
    assumptions: {
      hospitalMergePhasePrecedesOrganizationMergePhase: true,
      noAutoApplyBecauseReferencedDataRequiresRowRewireAndConflictResolution: true
    },
    counts: {
      organizations: organizations.length,
      organization_wallets: organizationWallets.length,
      hospitals: hospitals.length,
      ambulances: ambulances.length,
      payments: payments.length,
      emergency_requests: emergencyRequests.length,
      visits: visits.length
    },
    hospitalMergePlan: hospitalClusters,
    organizationMergePlan: orgClusters,
    summary: globalSummary
  };

  const outDir = path.join(__dirname, '..', 'validation');
  const outFile = path.join(outDir, 'e2e_duplicate_seed_merge_plan.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('[duplicate-merge-plan] Report written:', outFile);
  console.log('[duplicate-merge-plan] Summary:', globalSummary);
}

run().catch((error) => {
  console.error('[duplicate-merge-plan] Failed:', error);
  process.exit(1);
});
