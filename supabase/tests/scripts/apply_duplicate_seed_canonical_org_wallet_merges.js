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

function normalize(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().toLowerCase();
  return text || null;
}

function loadMergePlan() {
  const planPath = path.join(__dirname, '..', 'validation', 'e2e_duplicate_seed_merge_plan.json');
  if (!fs.existsSync(planPath)) {
    throw new Error(`Merge plan not found: ${planPath}. Run plan_duplicate_seed_merges.js first.`);
  }
  return JSON.parse(fs.readFileSync(planPath, 'utf8'));
}

async function fetchOrg(orgId) {
  const { data, error } = await supabase.from('organizations').select('id,display_id,name').eq('id', orgId).maybeSingle();
  if (error) return { data: null, error: error.message || error.code || 'unknown error' };
  return { data: data || null, error: null };
}

async function fetchOrgWallets(orgId) {
  const { data, error } = await supabase
    .from('organization_wallets')
    .select('id,organization_id,display_id,balance')
    .eq('organization_id', orgId);
  if (error) return { data: [], error: error.message || error.code || 'unknown error' };
  return { data: data || [], error: null };
}

async function countWalletLedger(walletId) {
  const { count, error } = await supabase
    .from('wallet_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('wallet_id', walletId);
  if (error) return { count: null, error: error.message || error.code || 'unknown error' };
  return { count: count || 0, error: null };
}

async function updateOrgRef(table, sourceOrgId, targetOrgId) {
  const { data, error } = await supabase
    .from(table)
    .update({ organization_id: targetOrgId })
    .eq('organization_id', sourceOrgId)
    .select('id');
  if (error) return { ids: [], error: error.message || error.code || 'unknown error' };
  return { ids: (data || []).map((r) => r.id), error: null };
}

async function updateWalletLedgerWalletId(sourceWalletId, targetWalletId) {
  const { data, error } = await supabase
    .from('wallet_ledger')
    .update({ wallet_id: targetWalletId })
    .eq('wallet_id', sourceWalletId)
    .select('id');
  if (error) return { ids: [], error: error.message || error.code || 'unknown error' };
  return { ids: (data || []).map((r) => r.id), error: null };
}

async function updateWalletBalance(walletId, newBalance) {
  const { data, error } = await supabase
    .from('organization_wallets')
    .update({ balance: newBalance, updated_at: nowIso() })
    .eq('id', walletId)
    .select('id,balance')
    .maybeSingle();
  if (error) return { data: null, error: error.message || error.code || 'unknown error' };
  return { data: data || null, error: null };
}

async function deleteById(table, id) {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  if (error) return { deleted: false, error: error.message || error.code || 'unknown error' };
  return { deleted: (data || []).some((r) => r.id === id), error: null };
}

function selectEligibleActions(plan) {
  const actions = [];

  for (const cluster of plan.organizationMergePlan || []) {
    const clusterKey = cluster.key;
    for (const action of cluster.mergeActions || []) {
      const conflictFlags = action.conflictFlags || [];
      const walletMerge = action.walletMerge || {};
      const current = action.currentRewireCounts || {};
      const projected = action.projectedAfterHospitalMerge || {};

      const allowedConflictFlags = ['hospital_children_remain_after_hospital_merge_phase'];
      const onlyAllowedConflicts = conflictFlags.every((f) => allowedConflictFlags.includes(f));

      const blockers = [];
      if (!walletMerge.canonical_wallet_id) blockers.push('missing_canonical_wallet');
      if (!onlyAllowedConflicts) blockers.push('unsupported_conflict_flags');
      if ((current.ambulances || 0) > 0 && (projected.ambulances || 0) > 0) {
        // We can rewire ambulances.organization_id safely, so no blocker; retained for readability.
      }

      actions.push({
        clusterKey,
        source_organization_id: action.source_organization_id,
        target_organization_id: action.target_organization_id,
        source_display_id: action.source_display_id || null,
        target_display_id: action.target_display_id || null,
        risk: action.risk,
        conflictFlags,
        currentRewireCounts: current,
        projectedAfterHospitalMerge: projected,
        walletMerge,
        eligible: blockers.length === 0,
        blockers
      });
    }
  }

  return {
    eligible: actions.filter((a) => a.eligible),
    skipped: actions.filter((a) => !a.eligible)
  };
}

async function applyAction(action, report) {
  const sourceOrgRes = await fetchOrg(action.source_organization_id);
  const targetOrgRes = await fetchOrg(action.target_organization_id);
  if (sourceOrgRes.error) {
    report.errors.push({ type: 'fetch_source_org', source_organization_id: action.source_organization_id, error: sourceOrgRes.error });
    return false;
  }
  if (targetOrgRes.error || !targetOrgRes.data) {
    report.errors.push({
      type: 'fetch_target_org',
      target_organization_id: action.target_organization_id,
      error: targetOrgRes.error || 'target org not found'
    });
    return false;
  }
  if (!sourceOrgRes.data) {
    report.skippedAlreadyAbsent.push({
      source_organization_id: action.source_organization_id,
      target_organization_id: action.target_organization_id
    });
    return true;
  }

  if (normalize(sourceOrgRes.data.name) !== normalize(targetOrgRes.data.name)) {
    report.errors.push({
      type: 'safety_check_failed',
      reason: 'org_names_not_equivalent',
      source_organization_id: action.source_organization_id,
      target_organization_id: action.target_organization_id,
      source_name: sourceOrgRes.data.name,
      target_name: targetOrgRes.data.name
    });
    return false;
  }

  const sourceWalletsRes = await fetchOrgWallets(action.source_organization_id);
  const targetWalletsRes = await fetchOrgWallets(action.target_organization_id);
  if (sourceWalletsRes.error || targetWalletsRes.error) {
    report.errors.push({
      type: 'fetch_org_wallets',
      source_organization_id: action.source_organization_id,
      target_organization_id: action.target_organization_id,
      error: sourceWalletsRes.error || targetWalletsRes.error
    });
    return false;
  }

  const sourceWallets = sourceWalletsRes.data;
  const targetWallets = targetWalletsRes.data;
  if (targetWallets.length !== 1) {
    report.errors.push({
      type: 'safety_check_failed',
      reason: 'target_org_wallet_count_not_one',
      target_organization_id: action.target_organization_id,
      count: targetWallets.length
    });
    return false;
  }
  if (sourceWallets.length > 1) {
    report.errors.push({
      type: 'safety_check_failed',
      reason: 'source_org_wallet_count_gt_one',
      source_organization_id: action.source_organization_id,
      count: sourceWallets.length
    });
    return false;
  }

  const targetWallet = targetWallets[0];
  const sourceWallet = sourceWallets[0] || null;
  const mergeOp = {
    source_organization_id: action.source_organization_id,
    target_organization_id: action.target_organization_id,
    source_display_id: action.source_display_id,
    target_display_id: action.target_display_id,
    rewires: {},
    walletMerge: null,
    deletedSourceOrganization: false
  };

  for (const table of ['hospitals', 'ambulances', 'payments', 'profiles', 'support_tickets']) {
    const result = await updateOrgRef(table, action.source_organization_id, action.target_organization_id);
    mergeOp.rewires[table] = {
      updatedCount: result.ids.length,
      updatedIds: result.ids,
      error: result.error || null
    };
    if (result.error) {
      report.errors.push({
        type: 'rewire_org_fk',
        table,
        source_organization_id: action.source_organization_id,
        target_organization_id: action.target_organization_id,
        error: result.error
      });
      return false;
    }
  }

  if (sourceWallet) {
    const ledgerCountRes = await countWalletLedger(sourceWallet.id);
    if (ledgerCountRes.error) {
      report.errors.push({ type: 'count_wallet_ledger', wallet_id: sourceWallet.id, error: ledgerCountRes.error });
      return false;
    }

    const sourceBalance = Number(sourceWallet.balance || 0);
    const targetBalanceBefore = Number(targetWallet.balance || 0);
    const targetBalanceAfter = targetBalanceBefore + sourceBalance;

    const ledgerRewire = await updateWalletLedgerWalletId(sourceWallet.id, targetWallet.id);
    if (ledgerRewire.error) {
      report.errors.push({
        type: 'rewire_wallet_ledger',
        source_wallet_id: sourceWallet.id,
        target_wallet_id: targetWallet.id,
        error: ledgerRewire.error
      });
      return false;
    }

    const walletBalanceUpdate = await updateWalletBalance(targetWallet.id, targetBalanceAfter);
    if (walletBalanceUpdate.error) {
      report.errors.push({
        type: 'update_target_wallet_balance',
        target_wallet_id: targetWallet.id,
        error: walletBalanceUpdate.error
      });
      return false;
    }

    const sourceWalletDelete = await deleteById('organization_wallets', sourceWallet.id);
    if (sourceWalletDelete.error) {
      report.errors.push({
        type: 'delete_source_org_wallet',
        source_wallet_id: sourceWallet.id,
        error: sourceWalletDelete.error
      });
      return false;
    }

    mergeOp.walletMerge = {
      source_wallet_id: sourceWallet.id,
      target_wallet_id: targetWallet.id,
      source_balance: sourceBalance,
      target_balance_before: targetBalanceBefore,
      target_balance_after: targetBalanceAfter,
      source_wallet_ledger_count_before: ledgerCountRes.count,
      rewired_wallet_ledger_count: ledgerRewire.ids.length,
      deleted_source_wallet: sourceWalletDelete.deleted
    };
  } else {
    mergeOp.walletMerge = {
      source_wallet_id: null,
      target_wallet_id: targetWallet.id,
      source_balance: 0,
      target_balance_before: Number(targetWallet.balance || 0),
      target_balance_after: Number(targetWallet.balance || 0),
      source_wallet_ledger_count_before: 0,
      rewired_wallet_ledger_count: 0,
      deleted_source_wallet: false
    };
  }

  const orgDelete = await deleteById('organizations', action.source_organization_id);
  if (orgDelete.error) {
    report.errors.push({
      type: 'delete_source_org',
      source_organization_id: action.source_organization_id,
      error: orgDelete.error
    });
    return false;
  }
  mergeOp.deletedSourceOrganization = orgDelete.deleted;

  report.appliedActions.push(mergeOp);
  return true;
}

async function run() {
  console.log(`[canonical-org-wallet-merge] Starting (${APPLY ? 'apply' : 'dry-run'}) at ${nowIso()}`);

  const plan = loadMergePlan();
  const { eligible, skipped } = selectEligibleActions(plan);

  const report = {
    generatedAt: nowIso(),
    source: 'apply_duplicate_seed_canonical_org_wallet_merges.js',
    mode: APPLY ? 'apply' : 'dry-run',
    summary: {
      eligibleActions: eligible.length,
      skippedActions: skipped.length
    },
    eligibleActions: eligible,
    skippedActions: skipped,
    appliedActions: [],
    skippedAlreadyAbsent: [],
    errors: []
  };

  console.log('[canonical-org-wallet-merge] Eligible actions:', eligible.length);
  console.log('[canonical-org-wallet-merge] Skipped actions:', skipped.length);

  if (APPLY) {
    for (const action of eligible) {
      const ok = await applyAction(action, report);
      if (!ok) break;
    }
  }

  const outDir = path.join(__dirname, '..', 'validation');
  const outFile = path.join(outDir, 'e2e_duplicate_seed_canonical_org_wallet_merge_report.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log('[canonical-org-wallet-merge] Report written:', outFile);

  if (report.errors.length) process.exitCode = 2;
}

run().catch((error) => {
  console.error('[canonical-org-wallet-merge] Failed:', error);
  process.exit(1);
});
