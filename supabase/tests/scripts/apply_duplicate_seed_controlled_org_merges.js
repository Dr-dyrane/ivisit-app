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

function chunk(items, size = 50) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function loadMergePlan() {
  const planPath = path.join(__dirname, '..', 'validation', 'e2e_duplicate_seed_merge_plan.json');
  if (!fs.existsSync(planPath)) {
    throw new Error(`Merge plan not found: ${planPath}. Run plan_duplicate_seed_merges.js first.`);
  }
  return JSON.parse(fs.readFileSync(planPath, 'utf8'));
}

function selectEligibleActions(plan) {
  const actions = [];
  for (const cluster of plan.organizationMergePlan || []) {
    for (const action of cluster.mergeActions || []) {
      const projected = action.projectedAfterHospitalMerge || {};
      const current = action.currentRewireCounts || {};
      const walletMerge = action.walletMerge || {};
      const conflictFlags = action.conflictFlags || [];

      const blockers = [];
      if (action.risk !== 'candidate_for_controlled_merge') blockers.push('risk_not_candidate_for_controlled_merge');
      if (conflictFlags.length) blockers.push('conflict_flags_present');
      if ((projected.hospitals || 0) !== 0) blockers.push('projected_hospital_refs_not_zero');
      if ((current.ambulances || 0) !== 0) blockers.push('ambulance_refs_not_zero');
      if (walletMerge.canonical_wallet_missing) blockers.push('canonical_wallet_missing');
      if ((walletMerge.source_wallet_ledger_entries || 0) !== 0) blockers.push('source_wallet_ledger_entries_present');
      if (Number(walletMerge.source_wallet_balance_total || 0) !== 0) blockers.push('source_wallet_balance_non_zero');

      actions.push({
        clusterKey: cluster.key,
        source_organization_id: action.source_organization_id,
        target_organization_id: action.target_organization_id,
        source_display_id: action.source_display_id || null,
        target_display_id: action.target_display_id || null,
        rewires: {
          profiles: current.profiles || 0,
          payments: current.payments || 0,
          support_tickets: current.support_tickets || 0,
          ambulances: current.ambulances || 0
        },
        walletMerge: {
          canonical_wallet_id: walletMerge.canonical_wallet_id || null,
          source_wallet_ids: walletMerge.source_wallet_ids || []
        },
        eligible: blockers.length === 0,
        blockers
      });
    }
  }
  return actions;
}

async function updateOrganizationRef(table, sourceOrgId, targetOrgId) {
  const { data, error } = await supabase
    .from(table)
    .update({ organization_id: targetOrgId })
    .eq('organization_id', sourceOrgId)
    .select('id');

  if (error) {
    return { updatedIds: [], error: error.message || error.code || 'unknown error' };
  }

  return { updatedIds: (data || []).map((r) => r.id), error: null };
}

async function deleteOrganizations(ids) {
  const deleted = [];
  const errors = [];

  for (const batch of chunk(ids, 50)) {
    const { data, error } = await supabase.from('organizations').delete().in('id', batch).select('id');
    if (error) {
      errors.push({ ids: batch, error: error.message || error.code || 'unknown error' });
      continue;
    }
    for (const row of data || []) deleted.push(row.id);
  }

  return { deleted, errors };
}

async function run() {
  console.log(`[controlled-org-merge] Starting (${APPLY ? 'apply' : 'dry-run'}) at ${nowIso()}`);

  const plan = loadMergePlan();
  const actions = selectEligibleActions(plan);
  const eligible = actions.filter((a) => a.eligible);
  const skipped = actions.filter((a) => !a.eligible);

  const report = {
    generatedAt: nowIso(),
    source: 'apply_duplicate_seed_controlled_org_merges.js',
    mode: APPLY ? 'apply' : 'dry-run',
    summary: {
      totalPlannedActions: actions.length,
      eligibleActions: eligible.length,
      skippedActions: skipped.length
    },
    eligibleActions: eligible,
    skippedActions: skipped,
    applied: {
      profileUpdates: [],
      paymentUpdates: [],
      supportTicketUpdates: [],
      ambulanceUpdates: [],
      deletedOrganizations: [],
      errors: []
    }
  };

  console.log('[controlled-org-merge] Eligible actions:', eligible.length);
  console.log('[controlled-org-merge] Skipped actions:', skipped.length);

  if (APPLY && eligible.length > 0) {
    for (const action of eligible) {
      const updates = [
        ['profiles', 'profileUpdates'],
        ['payments', 'paymentUpdates'],
        ['support_tickets', 'supportTicketUpdates'],
        ['ambulances', 'ambulanceUpdates']
      ];

      for (const [table, reportKey] of updates) {
        const result = await updateOrganizationRef(
          table,
          action.source_organization_id,
          action.target_organization_id
        );
        report.applied[reportKey].push({
          table,
          source_organization_id: action.source_organization_id,
          target_organization_id: action.target_organization_id,
          updatedCount: result.updatedIds.length,
          updatedIds: result.updatedIds
        });
        if (result.error) {
          report.applied.errors.push({
            type: 'update',
            table,
            source_organization_id: action.source_organization_id,
            target_organization_id: action.target_organization_id,
            error: result.error
          });
        }
      }
    }

    if (report.applied.errors.length === 0) {
      const deleteResult = await deleteOrganizations(eligible.map((a) => a.source_organization_id));
      report.applied.deletedOrganizations = deleteResult.deleted;
      report.applied.errors.push(...deleteResult.errors.map((e) => ({ type: 'delete_orgs', ...e })));
      console.log('[controlled-org-merge] Deleted organizations:', deleteResult.deleted.length);
    }
  }

  const outDir = path.join(__dirname, '..', 'validation');
  const outFile = path.join(outDir, 'e2e_duplicate_seed_controlled_org_merge_report.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log('[controlled-org-merge] Report written:', outFile);

  if (report.applied.errors.length) process.exitCode = 2;
}

run().catch((error) => {
  console.error('[controlled-org-merge] Failed:', error);
  process.exit(1);
});
