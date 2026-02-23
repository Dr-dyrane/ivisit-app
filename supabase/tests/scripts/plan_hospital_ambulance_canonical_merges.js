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

function normalize(value) {
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
  const map = new Map();
  for (const row of rows || []) {
    const key = normalize(row[keyField]);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key));
}

function countBy(rows, field) {
  const map = new Map();
  for (const row of rows || []) {
    const key = row[field];
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function rowsBy(rows, field) {
  const map = new Map();
  for (const row of rows || []) {
    const key = row[field];
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function keyBy(rows, idField = 'id') {
  const map = new Map();
  for (const row of rows || []) map.set(row[idField], row);
  return map;
}

function hospitalRefScore(hospitalId, refCounts) {
  let total = 0;
  for (const c of Object.values(refCounts)) total += c.get(hospitalId) || 0;
  return total;
}

function pickCanonicalHospital(items, refCounts) {
  return [...items].sort((a, b) => {
    const aScore = hospitalRefScore(a.id, refCounts);
    const bScore = hospitalRefScore(b.id, refCounts);
    if (bScore !== aScore) return bScore - aScore;
    const aCreated = a.created_at || '';
    const bCreated = b.created_at || '';
    if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
    return String(a.id).localeCompare(String(b.id));
  })[0];
}

function pricingSignature(row, typeField, nameField, priceField) {
  return JSON.stringify({
    type: row[typeField] || null,
    name: row[nameField] || null,
    price: row[priceField] === null || row[priceField] === undefined ? null : Number(row[priceField]),
    description: row.description || null
  });
}

function summarizeRefs(hospitalId, refCounts) {
  const out = {};
  let total = 0;
  for (const [label, map] of Object.entries(refCounts)) {
    const value = map.get(hospitalId) || 0;
    out[label] = value;
    total += value;
  }
  return { refs: out, total };
}

async function run() {
  console.log(`[hospital-ambulance-merge-plan] Starting at ${nowIso()}`);

  const [
    hospitals,
    organizations,
    ambulances,
    emergencyRequests,
    visits,
    doctors,
    insuranceBilling,
    servicePricing,
    roomPricing,
    payments,
    profiles,
    supportTickets,
    organizationWallets,
    walletLedger
  ] = await Promise.all([
    fetchRows('hospitals', 'id,display_id,name,organization_id,address,place_id,status,created_at'),
    fetchRows('organizations', 'id,display_id,name,created_at'),
    fetchRows('ambulances', 'id,display_id,call_sign,hospital_id,organization_id,profile_id,status,current_call,created_at'),
    fetchRows('emergency_requests', 'id,display_id,hospital_id,ambulance_id,status,service_type'),
    fetchRows('visits', 'id,display_id,hospital_id,status,request_id'),
    fetchRows('doctors', 'id,hospital_id,profile_id,name,status'),
    fetchRows('insurance_billing', 'id,hospital_id,status'),
    fetchRows('service_pricing', 'id,hospital_id,service_type,service_name,base_price,description'),
    fetchRows('room_pricing', 'id,hospital_id,room_type,room_name,price_per_night,description'),
    fetchRows('payments', 'id,organization_id,display_id,status,amount,payment_method'),
    fetchRows('profiles', 'id,organization_id,role'),
    fetchRows('support_tickets', 'id,organization_id,status'),
    fetchRows('organization_wallets', 'id,organization_id,display_id,balance'),
    fetchRows('wallet_ledger', 'id,wallet_id,amount,transaction_type')
  ]);

  const hospitalById = keyBy(hospitals);
  const orgById = keyBy(organizations);
  const ambulanceById = keyBy(ambulances);

  const refCounts = {
    doctors: countBy(doctors, 'hospital_id'),
    ambulances: countBy(ambulances, 'hospital_id'),
    emergency_requests: countBy(emergencyRequests, 'hospital_id'),
    visits: countBy(visits, 'hospital_id'),
    insurance_billing: countBy(insuranceBilling, 'hospital_id'),
    service_pricing: countBy(servicePricing, 'hospital_id'),
    room_pricing: countBy(roomPricing, 'hospital_id')
  };

  const ambulancesByHospital = rowsBy(ambulances, 'hospital_id');
  const emergenciesByHospital = rowsBy(emergencyRequests, 'hospital_id');
  const visitsByHospital = rowsBy(visits, 'hospital_id');
  const doctorsByHospital = rowsBy(doctors, 'hospital_id');
  const insuranceByHospital = rowsBy(insuranceBilling, 'hospital_id');
  const servicePricingByHospital = rowsBy(servicePricing, 'hospital_id');
  const roomPricingByHospital = rowsBy(roomPricing, 'hospital_id');
  const emergencyRefsByAmbulance = rowsBy(emergencyRequests, 'ambulance_id');

  const orgWalletsByOrg = rowsBy(organizationWallets, 'organization_id');
  const ledgerCountByWallet = countBy(walletLedger, 'wallet_id');

  const duplicateHospitalClusters = groupDuplicates(hospitals, 'name');

  const clusterPlans = duplicateHospitalClusters.map((cluster) => {
    const canonical = pickCanonicalHospital(cluster.items, refCounts);
    const canonicalRefs = summarizeRefs(canonical.id, refCounts);
    const canonicalAmbulances = ambulancesByHospital.get(canonical.id) || [];
    const canonicalAmbulanceByCallSign = new Map();
    for (const a of canonicalAmbulances) {
      const key = normalize(a.call_sign);
      if (!key) continue;
      if (!canonicalAmbulanceByCallSign.has(key)) canonicalAmbulanceByCallSign.set(key, []);
      canonicalAmbulanceByCallSign.get(key).push(a);
    }

    const canonicalServiceByType = new Map();
    for (const row of servicePricingByHospital.get(canonical.id) || []) {
      const key = normalize(row.service_type);
      if (!key) continue;
      if (!canonicalServiceByType.has(key)) canonicalServiceByType.set(key, []);
      canonicalServiceByType.get(key).push(row);
    }

    const canonicalRoomByType = new Map();
    for (const row of roomPricingByHospital.get(canonical.id) || []) {
      const key = normalize(row.room_type);
      if (!key) continue;
      if (!canonicalRoomByType.has(key)) canonicalRoomByType.set(key, []);
      canonicalRoomByType.get(key).push(row);
    }

    const members = cluster.items.map((h) => {
      const refSummary = summarizeRefs(h.id, refCounts);
      return {
        id: h.id,
        display_id: h.display_id || null,
        name: h.name || null,
        organization_id: h.organization_id || null,
        organization_name: h.organization_id ? (orgById.get(h.organization_id)?.name || null) : null,
        address: h.address || null,
        place_id: h.place_id || null,
        created_at: h.created_at || null,
        status: h.status || null,
        referenceTotal: refSummary.total,
        references: refSummary.refs
      };
    });

    const sourcePlans = [];
    for (const source of cluster.items.filter((h) => h.id !== canonical.id)) {
      const sourceAmbs = ambulancesByHospital.get(source.id) || [];
      const sourceEmergencies = emergenciesByHospital.get(source.id) || [];
      const sourceVisits = visitsByHospital.get(source.id) || [];
      const sourceDoctors = doctorsByHospital.get(source.id) || [];
      const sourceInsurance = insuranceByHospital.get(source.id) || [];
      const sourceServicePricing = servicePricingByHospital.get(source.id) || [];
      const sourceRoomPricing = roomPricingByHospital.get(source.id) || [];

      const ambulanceActions = [];
      const ambulanceBlockers = [];
      for (const amb of sourceAmbs) {
        const callSignKey = normalize(amb.call_sign);
        const targetCandidates = callSignKey ? (canonicalAmbulanceByCallSign.get(callSignKey) || []) : [];
        const sourceEmergencyRefs = emergencyRefsByAmbulance.get(amb.id) || [];
        const sourceEmergencyRefCount = sourceEmergencyRefs.length;

        if (targetCandidates.length > 1) {
          ambulanceActions.push({
            source_ambulance_id: amb.id,
            source_display_id: amb.display_id || null,
            call_sign: amb.call_sign || null,
            action: 'manual',
            reason: 'multiple_canonical_call_sign_targets',
            target_candidates: targetCandidates.map((t) => ({ id: t.id, display_id: t.display_id || null }))
          });
          ambulanceBlockers.push(`Ambulance ${amb.id}: multiple canonical targets for call_sign ${amb.call_sign}`);
          continue;
        }

        const target = targetCandidates[0] || null;
        if (target) {
          const targetEmergencyRefCount = (emergencyRefsByAmbulance.get(target.id) || []).length;
          const targetUnsafe = !!target.profile_id || !!target.current_call;
          const sourceUnsafe = !!amb.profile_id || !!amb.current_call;
          const overlappingOperationalState = sourceUnsafe || targetUnsafe;

          if (overlappingOperationalState) {
            ambulanceActions.push({
              source_ambulance_id: amb.id,
              source_display_id: amb.display_id || null,
              target_ambulance_id: target.id,
              target_display_id: target.display_id || null,
              call_sign: amb.call_sign || null,
              action: 'manual',
              reason: 'driver_or_current_call_present',
              source_profile_id: amb.profile_id || null,
              target_profile_id: target.profile_id || null,
              source_current_call: amb.current_call || null,
              target_current_call: target.current_call || null
            });
            ambulanceBlockers.push(`Ambulance ${amb.id}: driver/current_call present on source or target`);
            continue;
          }

          if (sourceEmergencyRefCount > 0 && targetEmergencyRefCount > 0) {
            ambulanceActions.push({
              source_ambulance_id: amb.id,
              source_display_id: amb.display_id || null,
              target_ambulance_id: target.id,
              target_display_id: target.display_id || null,
              call_sign: amb.call_sign || null,
              action: 'manual',
              reason: 'both_ambulance_ids_have_historical_emergency_refs',
              sourceEmergencyRefCount,
              targetEmergencyRefCount
            });
            ambulanceBlockers.push(`Ambulance ${amb.id}: both source and target have emergency refs`);
            continue;
          }

          ambulanceActions.push({
            source_ambulance_id: amb.id,
            source_display_id: amb.display_id || null,
            target_ambulance_id: target.id,
            target_display_id: target.display_id || null,
            call_sign: amb.call_sign || null,
            action: sourceEmergencyRefCount > 0
              ? 'rewire_emergency_requests_to_target_then_delete_source'
              : 'delete_source_duplicate_call_sign',
            sourceEmergencyRefCount,
            targetEmergencyRefCount
          });
        } else {
          ambulanceActions.push({
            source_ambulance_id: amb.id,
            source_display_id: amb.display_id || null,
            call_sign: amb.call_sign || null,
            action: 'move_ambulance_to_canonical_hospital',
            sourceEmergencyRefCount,
            source_profile_id: amb.profile_id || null,
            source_current_call: amb.current_call || null
          });
        }
      }

      const servicePricingActions = [];
      const servicePricingBlockers = [];
      for (const row of sourceServicePricing) {
        const key = normalize(row.service_type);
        const targetRows = key ? (canonicalServiceByType.get(key) || []) : [];
        if (targetRows.length === 0) {
          servicePricingActions.push({
            source_service_pricing_id: row.id,
            action: 'move_to_canonical_hospital',
            service_type: row.service_type || null
          });
          continue;
        }

        const sourceSig = pricingSignature(row, 'service_type', 'service_name', 'base_price');
        const identicalTarget = targetRows.find((t) => pricingSignature(t, 'service_type', 'service_name', 'base_price') === sourceSig);
        if (identicalTarget) {
          servicePricingActions.push({
            source_service_pricing_id: row.id,
            target_service_pricing_id: identicalTarget.id,
            action: 'delete_identical_duplicate',
            service_type: row.service_type || null
          });
        } else {
          servicePricingActions.push({
            source_service_pricing_id: row.id,
            action: 'manual',
            reason: 'service_type_overlap_with_non_identical_pricing',
            service_type: row.service_type || null,
            target_service_pricing_ids: targetRows.map((t) => t.id)
          });
          servicePricingBlockers.push(`Service pricing conflict on ${row.service_type || 'unknown'} (${row.id})`);
        }
      }

      const roomPricingActions = [];
      const roomPricingBlockers = [];
      for (const row of sourceRoomPricing) {
        const key = normalize(row.room_type);
        const targetRows = key ? (canonicalRoomByType.get(key) || []) : [];
        if (targetRows.length === 0) {
          roomPricingActions.push({
            source_room_pricing_id: row.id,
            action: 'move_to_canonical_hospital',
            room_type: row.room_type || null
          });
          continue;
        }

        const sourceSig = pricingSignature(row, 'room_type', 'room_name', 'price_per_night');
        const identicalTarget = targetRows.find((t) => pricingSignature(t, 'room_type', 'room_name', 'price_per_night') === sourceSig);
        if (identicalTarget) {
          roomPricingActions.push({
            source_room_pricing_id: row.id,
            target_room_pricing_id: identicalTarget.id,
            action: 'delete_identical_duplicate',
            room_type: row.room_type || null
          });
        } else {
          roomPricingActions.push({
            source_room_pricing_id: row.id,
            action: 'manual',
            reason: 'room_type_overlap_with_non_identical_pricing',
            room_type: row.room_type || null,
            target_room_pricing_ids: targetRows.map((t) => t.id)
          });
          roomPricingBlockers.push(`Room pricing conflict on ${row.room_type || 'unknown'} (${row.id})`);
        }
      }

      const sourceOrgId = source.organization_id || null;
      const targetOrgId = canonical.organization_id || null;
      const orgMergeImpact = sourceOrgId && targetOrgId && sourceOrgId !== targetOrgId
        ? (() => {
            const wallets = orgWalletsByOrg.get(sourceOrgId) || [];
            return {
              source_organization_id: sourceOrgId,
              source_organization_display_id: orgById.get(sourceOrgId)?.display_id || null,
              source_organization_name: orgById.get(sourceOrgId)?.name || null,
              target_organization_id: targetOrgId,
              target_organization_display_id: orgById.get(targetOrgId)?.display_id || null,
              target_organization_name: orgById.get(targetOrgId)?.name || null,
              downstreamCounts: {
                payments: payments.filter((p) => p.organization_id === sourceOrgId).length,
                profiles: profiles.filter((p) => p.organization_id === sourceOrgId).length,
                support_tickets: supportTickets.filter((t) => t.organization_id === sourceOrgId).length,
                otherHospitalsAfterThisHospitalMove: hospitals.filter((h) => h.organization_id === sourceOrgId && h.id !== source.id).length
              },
              wallets: wallets.map((w) => ({
                wallet_id: w.id,
                display_id: w.display_id || null,
                balance: Number(w.balance || 0),
                ledger_entries: ledgerCountByWallet.get(w.id) || 0
              }))
            };
          })()
        : null;

      const hospitalRowRewireCounts = {
        doctors_hospital_id: sourceDoctors.length,
        emergency_requests_hospital_id: sourceEmergencies.length,
        visits_hospital_id: sourceVisits.length,
        insurance_billing_hospital_id: sourceInsurance.length,
        ambulances_hospital_id_candidates: sourceAmbs.length,
        service_pricing_rows: sourceServicePricing.length,
        room_pricing_rows: sourceRoomPricing.length
      };

      const blockers = [
        ...ambulanceBlockers,
        ...servicePricingBlockers,
        ...roomPricingBlockers
      ];

      const autoSafe =
        blockers.length === 0 &&
        ambulanceActions.every((a) => a.action !== 'manual') &&
        servicePricingActions.every((a) => a.action !== 'manual') &&
        roomPricingActions.every((a) => a.action !== 'manual');

      sourcePlans.push({
        source_hospital_id: source.id,
        source_display_id: source.display_id || null,
        source_organization_id: sourceOrgId,
        source_organization_display_id: sourceOrgId ? (orgById.get(sourceOrgId)?.display_id || null) : null,
        source_reference_summary: summarizeRefs(source.id, refCounts),
        target_hospital_id: canonical.id,
        target_display_id: canonical.display_id || null,
        target_organization_id: targetOrgId,
        hospitalRowRewireCounts,
        ambulanceActions,
        servicePricingActions,
        roomPricingActions,
        orgMergeImpact,
        blockers,
        risk: autoSafe ? 'candidate_for_cluster_auto_merge' : 'manual_cluster_merge_required'
      });
    }

    return {
      clusterKey: cluster.key,
      clusterSize: cluster.items.length,
      canonicalHospital: {
        id: canonical.id,
        display_id: canonical.display_id || null,
        organization_id: canonical.organization_id || null,
        organization_display_id: canonical.organization_id ? (orgById.get(canonical.organization_id)?.display_id || null) : null,
        referenceSummary: canonicalRefs
      },
      members,
      sourceMergePlans: sourcePlans,
      summary: {
        sourceHospitalsToMerge: sourcePlans.length,
        autoSafeSources: sourcePlans.filter((p) => p.risk === 'candidate_for_cluster_auto_merge').length,
        manualSources: sourcePlans.filter((p) => p.risk !== 'candidate_for_cluster_auto_merge').length,
        ambulanceManualActions: sourcePlans.reduce(
          (sum, p) => sum + p.ambulanceActions.filter((a) => a.action === 'manual').length,
          0
        ),
        pricingManualActions: sourcePlans.reduce(
          (sum, p) =>
            sum +
            p.servicePricingActions.filter((a) => a.action === 'manual').length +
            p.roomPricingActions.filter((a) => a.action === 'manual').length,
          0
        )
      }
    };
  });

  const summary = {
    duplicateHospitalClusters: clusterPlans.length,
    totalSourceHospitalsToMerge: clusterPlans.reduce((sum, c) => sum + c.summary.sourceHospitalsToMerge, 0),
    autoSafeSourceHospitalMerges: clusterPlans.reduce((sum, c) => sum + c.summary.autoSafeSources, 0),
    manualSourceHospitalMerges: clusterPlans.reduce((sum, c) => sum + c.summary.manualSources, 0),
    ambulanceManualActions: clusterPlans.reduce((sum, c) => sum + c.summary.ambulanceManualActions, 0),
    pricingManualActions: clusterPlans.reduce((sum, c) => sum + c.summary.pricingManualActions, 0),
    recommendAutoApply: false
  };

  const report = {
    generatedAt: nowIso(),
    source: 'plan_hospital_ambulance_canonical_merges.js',
    supabaseUrl,
    counts: {
      hospitals: hospitals.length,
      organizations: organizations.length,
      ambulances: ambulances.length,
      emergency_requests: emergencyRequests.length,
      visits: visits.length,
      doctors: doctors.length,
      service_pricing: servicePricing.length,
      room_pricing: roomPricing.length
    },
    clusterPlans,
    summary
  };

  const outDir = path.join(__dirname, '..', 'validation');
  const outFile = path.join(outDir, 'e2e_hospital_ambulance_canonical_merge_plan.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('[hospital-ambulance-merge-plan] Report written:', outFile);
  console.log('[hospital-ambulance-merge-plan] Summary:', summary);
}

run().catch((error) => {
  console.error('[hospital-ambulance-merge-plan] Failed:', error);
  process.exit(1);
});
