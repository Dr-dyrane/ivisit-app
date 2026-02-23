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

function loadPlan() {
  const planPath = path.join(__dirname, '..', 'validation', 'e2e_hospital_ambulance_canonical_merge_plan.json');
  if (!fs.existsSync(planPath)) {
    throw new Error(`Plan not found: ${planPath}. Run plan_hospital_ambulance_canonical_merges.js first.`);
  }
  return JSON.parse(fs.readFileSync(planPath, 'utf8'));
}

async function updateWhereEq(table, column, sourceValue, payload) {
  const { data, error } = await supabase.from(table).update(payload).eq(column, sourceValue).select('id');
  if (error) return { ids: [], error: error.message || error.code || 'unknown error' };
  return { ids: (data || []).map((r) => r.id), error: null };
}

async function updateAmbulanceIdRefs(sourceAmbId, targetAmbId) {
  const { data, error } = await supabase
    .from('emergency_requests')
    .update({ ambulance_id: targetAmbId })
    .eq('ambulance_id', sourceAmbId)
    .select('id');
  if (error) return { ids: [], error: error.message || error.code || 'unknown error' };
  return { ids: (data || []).map((r) => r.id), error: null };
}

async function deleteById(table, id) {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  if (error) return { deleted: false, error: error.message || error.code || 'unknown error' };
  return { deleted: (data || []).some((r) => r.id === id), error: null };
}

async function countByEq(table, column, value) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
  if (error) return { count: null, error: error.message || error.code || 'unknown error' };
  return { count: count || 0, error: null };
}

async function getHospitalById(id) {
  const { data, error } = await supabase
    .from('hospitals')
    .select('id,display_id,organization_id,name')
    .eq('id', id)
    .maybeSingle();
  if (error) return { data: null, error: error.message || error.code || 'unknown error' };
  return { data: data || null, error: null };
}

function buildEligibleSources(plan) {
  const eligible = [];
  const skipped = [];

  for (const cluster of plan.clusterPlans || []) {
    for (const source of cluster.sourceMergePlans || []) {
      const blockers = [];
      if (source.risk !== 'candidate_for_cluster_auto_merge') blockers.push('risk_not_auto_safe');
      if ((source.blockers || []).length > 0) blockers.push('source_blockers_present');
      if ((source.ambulanceActions || []).some((a) => a.action === 'manual')) blockers.push('manual_ambulance_action_present');
      if ((source.servicePricingActions || []).some((a) => a.action === 'manual')) blockers.push('manual_service_pricing_action_present');
      if ((source.roomPricingActions || []).some((a) => a.action === 'manual')) blockers.push('manual_room_pricing_action_present');

      const item = {
        clusterKey: cluster.clusterKey,
        source_hospital_id: source.source_hospital_id,
        source_display_id: source.source_display_id || null,
        target_hospital_id: source.target_hospital_id,
        target_display_id: source.target_display_id || null,
        target_organization_id: source.target_organization_id || null,
        ambulanceActions: source.ambulanceActions || [],
        servicePricingActions: source.servicePricingActions || [],
        roomPricingActions: source.roomPricingActions || [],
        hospitalRowRewireCounts: source.hospitalRowRewireCounts || {},
        blockers
      };

      if (blockers.length) skipped.push(item);
      else eligible.push(item);
    }
  }

  return { eligible, skipped };
}

async function applySourceMerge(source, report) {
  const sourceRes = await getHospitalById(source.source_hospital_id);
  if (sourceRes.error) {
    report.errors.push({ type: 'get_source_hospital', source_hospital_id: source.source_hospital_id, error: sourceRes.error });
    return false;
  }
  if (!sourceRes.data) {
    report.skippedAlreadyAbsent.push({ source_hospital_id: source.source_hospital_id, target_hospital_id: source.target_hospital_id });
    return true;
  }

  const targetRes = await getHospitalById(source.target_hospital_id);
  if (targetRes.error || !targetRes.data) {
    report.errors.push({
      type: 'get_target_hospital',
      source_hospital_id: source.source_hospital_id,
      target_hospital_id: source.target_hospital_id,
      error: targetRes.error || 'target hospital not found'
    });
    return false;
  }

  const sourceOp = {
    source_hospital_id: source.source_hospital_id,
    target_hospital_id: source.target_hospital_id,
    ambulanceActions: [],
    servicePricingActions: [],
    roomPricingActions: [],
    rowRewires: {},
    hospitalDeleted: false
  };

  for (const action of source.ambulanceActions) {
    if (action.action === 'delete_source_duplicate_call_sign') {
      const refCountRes = await countByEq('emergency_requests', 'ambulance_id', action.source_ambulance_id);
      if (refCountRes.error) {
        report.errors.push({ type: 'count_emergency_requests_by_ambulance', ambulance_id: action.source_ambulance_id, error: refCountRes.error });
        return false;
      }
      if ((refCountRes.count || 0) > 0) {
        report.errors.push({
          type: 'safety_check_failed',
          reason: 'ambulance_has_emergency_refs_before_delete',
          ambulance_id: action.source_ambulance_id,
          count: refCountRes.count
        });
        return false;
      }
      const del = await deleteById('ambulances', action.source_ambulance_id);
      sourceOp.ambulanceActions.push({ ...action, deleted: del.deleted, error: del.error || null });
      if (del.error) {
        report.errors.push({ type: 'delete_ambulance', ambulance_id: action.source_ambulance_id, error: del.error });
        return false;
      }
    } else if (action.action === 'rewire_emergency_requests_to_target_then_delete_source') {
      const rewire = await updateAmbulanceIdRefs(action.source_ambulance_id, action.target_ambulance_id);
      sourceOp.ambulanceActions.push({
        ...action,
        rewiredEmergencyRequestIds: rewire.ids,
        rewiredCount: rewire.ids.length,
        rewireError: rewire.error || null
      });
      if (rewire.error) {
        report.errors.push({
          type: 'rewire_emergency_requests_ambulance_id',
          source_ambulance_id: action.source_ambulance_id,
          target_ambulance_id: action.target_ambulance_id,
          error: rewire.error
        });
        return false;
      }
      const del = await deleteById('ambulances', action.source_ambulance_id);
      if (del.error) {
        report.errors.push({ type: 'delete_ambulance', ambulance_id: action.source_ambulance_id, error: del.error });
        return false;
      }
      sourceOp.ambulanceActions[sourceOp.ambulanceActions.length - 1].deleted = del.deleted;
    } else if (action.action === 'move_ambulance_to_canonical_hospital') {
      const payload = {
        hospital_id: source.target_hospital_id,
        organization_id: targetRes.data.organization_id || null
      };
      const res = await supabase.from('ambulances').update(payload).eq('id', action.source_ambulance_id).select('id');
      const error = res.error ? (res.error.message || res.error.code || 'unknown error') : null;
      const ids = (res.data || []).map((r) => r.id);
      sourceOp.ambulanceActions.push({ ...action, movedCount: ids.length, movedIds: ids, error });
      if (error) {
        report.errors.push({ type: 'move_ambulance_to_canonical_hospital', ambulance_id: action.source_ambulance_id, error });
        return false;
      }
    } else {
      report.errors.push({ type: 'unexpected_ambulance_action', action });
      return false;
    }
  }

  for (const action of source.servicePricingActions) {
    if (action.action === 'delete_identical_duplicate') {
      const del = await deleteById('service_pricing', action.source_service_pricing_id);
      sourceOp.servicePricingActions.push({ ...action, deleted: del.deleted, error: del.error || null });
      if (del.error) {
        report.errors.push({ type: 'delete_service_pricing', id: action.source_service_pricing_id, error: del.error });
        return false;
      }
    } else if (action.action === 'move_to_canonical_hospital') {
      const res = await supabase
        .from('service_pricing')
        .update({ hospital_id: source.target_hospital_id })
        .eq('id', action.source_service_pricing_id)
        .select('id');
      const error = res.error ? (res.error.message || res.error.code || 'unknown error') : null;
      sourceOp.servicePricingActions.push({ ...action, movedIds: (res.data || []).map((r) => r.id), error });
      if (error) {
        report.errors.push({ type: 'move_service_pricing', id: action.source_service_pricing_id, error });
        return false;
      }
    } else {
      report.errors.push({ type: 'unexpected_service_pricing_action', action });
      return false;
    }
  }

  for (const action of source.roomPricingActions) {
    if (action.action === 'delete_identical_duplicate') {
      const del = await deleteById('room_pricing', action.source_room_pricing_id);
      sourceOp.roomPricingActions.push({ ...action, deleted: del.deleted, error: del.error || null });
      if (del.error) {
        report.errors.push({ type: 'delete_room_pricing', id: action.source_room_pricing_id, error: del.error });
        return false;
      }
    } else if (action.action === 'move_to_canonical_hospital') {
      const res = await supabase
        .from('room_pricing')
        .update({ hospital_id: source.target_hospital_id })
        .eq('id', action.source_room_pricing_id)
        .select('id');
      const error = res.error ? (res.error.message || res.error.code || 'unknown error') : null;
      sourceOp.roomPricingActions.push({ ...action, movedIds: (res.data || []).map((r) => r.id), error });
      if (error) {
        report.errors.push({ type: 'move_room_pricing', id: action.source_room_pricing_id, error });
        return false;
      }
    } else {
      report.errors.push({ type: 'unexpected_room_pricing_action', action });
      return false;
    }
  }

  const rewireSteps = [
    ['doctors', 'hospital_id', 'doctors'],
    ['emergency_requests', 'hospital_id', 'emergency_requests'],
    ['visits', 'hospital_id', 'visits'],
    ['insurance_billing', 'hospital_id', 'insurance_billing']
  ];

  for (const [table, column, key] of rewireSteps) {
    const result = await updateWhereEq(table, column, source.source_hospital_id, { [column]: source.target_hospital_id });
    sourceOp.rowRewires[key] = { updatedIds: result.ids, updatedCount: result.ids.length, error: result.error || null };
    if (result.error) {
      report.errors.push({
        type: 'rewire_hospital_fk',
        table,
        source_hospital_id: source.source_hospital_id,
        target_hospital_id: source.target_hospital_id,
        error: result.error
      });
      return false;
    }
  }

  // Safety check: source hospital should have no ambulances left before delete.
  const remainingAmbCountRes = await countByEq('ambulances', 'hospital_id', source.source_hospital_id);
  if (remainingAmbCountRes.error) {
    report.errors.push({ type: 'count_remaining_ambulances', source_hospital_id: source.source_hospital_id, error: remainingAmbCountRes.error });
    return false;
  }
  if ((remainingAmbCountRes.count || 0) > 0) {
    report.errors.push({
      type: 'safety_check_failed',
      reason: 'source_hospital_still_has_ambulances',
      source_hospital_id: source.source_hospital_id,
      remainingAmbulances: remainingAmbCountRes.count
    });
    return false;
  }

  const delHospital = await deleteById('hospitals', source.source_hospital_id);
  sourceOp.hospitalDeleted = delHospital.deleted;
  if (delHospital.error) {
    report.errors.push({ type: 'delete_hospital', source_hospital_id: source.source_hospital_id, error: delHospital.error });
    return false;
  }

  report.appliedSources.push(sourceOp);
  return true;
}

async function run() {
  console.log(`[hospital-ambulance-merge-apply] Starting (${APPLY ? 'apply' : 'dry-run'}) at ${nowIso()}`);
  const plan = loadPlan();
  const { eligible, skipped } = buildEligibleSources(plan);

  const report = {
    generatedAt: nowIso(),
    source: 'apply_hospital_ambulance_canonical_merges.js',
    mode: APPLY ? 'apply' : 'dry-run',
    summary: {
      eligibleSourceHospitalMerges: eligible.length,
      skippedSourceHospitalMerges: skipped.length
    },
    eligibleSources: eligible.map((s) => ({
      clusterKey: s.clusterKey,
      source_hospital_id: s.source_hospital_id,
      target_hospital_id: s.target_hospital_id,
      source_display_id: s.source_display_id,
      target_display_id: s.target_display_id
    })),
    skippedSources: skipped,
    appliedSources: [],
    skippedAlreadyAbsent: [],
    errors: []
  };

  console.log('[hospital-ambulance-merge-apply] Eligible source merges:', eligible.length);
  console.log('[hospital-ambulance-merge-apply] Skipped source merges:', skipped.length);

  if (APPLY) {
    for (const source of eligible) {
      const ok = await applySourceMerge(source, report);
      if (!ok) break;
    }
  }

  const outDir = path.join(__dirname, '..', 'validation');
  const outFile = path.join(outDir, 'e2e_hospital_ambulance_canonical_merge_apply_report.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log('[hospital-ambulance-merge-apply] Report written:', outFile);

  if (report.errors.length) process.exitCode = 2;
}

run().catch((error) => {
  console.error('[hospital-ambulance-merge-apply] Failed:', error);
  process.exit(1);
});
