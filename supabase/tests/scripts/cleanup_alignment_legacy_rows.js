const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

function nowIso() {
  return new Date().toISOString();
}

async function getInvalidOrgWalletCandidates() {
  const { data: wallets, error } = await supabase
    .from('organization_wallets')
    .select('id,display_id,organization_id,balance,currency,created_at,updated_at')
    .is('organization_id', null);
  if (error) throw new Error(`organization_wallets query failed: ${error.message}`);

  const ids = (wallets || []).map((w) => w.id);
  if (!ids.length) return [];

  const { data: ledgerRows, error: ledgerErr } = await supabase
    .from('wallet_ledger')
    .select('id,wallet_id')
    .in('wallet_id', ids);
  if (ledgerErr) throw new Error(`wallet_ledger org-wallet ref query failed: ${ledgerErr.message}`);

  const referenced = new Set((ledgerRows || []).map((r) => r.wallet_id).filter(Boolean));
  return (wallets || []).filter((w) => !referenced.has(w.id));
}

async function getPlaceholderPaymentCandidates() {
  const { data: payments, error } = await supabase
    .from('payments')
    .select('id,display_id,emergency_request_id,organization_id,payment_method,status,amount,metadata,provider_response,created_at,updated_at')
    .is('organization_id', null)
    .is('emergency_request_id', null)
    .is('payment_method', null)
    .eq('status', 'pending')
    .eq('amount', 0);
  if (error) throw new Error(`payments query failed: ${error.message}`);

  const strictCandidates = (payments || []).filter((p) => {
    const metadataEmpty = !p.metadata || Object.keys(p.metadata).length === 0;
    const providerRespEmpty = !p.provider_response || Object.keys(p.provider_response).length === 0;
    return metadataEmpty && providerRespEmpty;
  });

  const ids = strictCandidates.map((p) => p.id);
  if (!ids.length) return [];

  const { data: ledgerRows, error: ledgerErr } = await supabase
    .from('wallet_ledger')
    .select('id,reference_id')
    .in('reference_id', ids);
  if (ledgerErr) throw new Error(`wallet_ledger payment ref query failed: ${ledgerErr.message}`);

  const referenced = new Set((ledgerRows || []).map((r) => r.reference_id).filter(Boolean));
  return strictCandidates.filter((p) => !referenced.has(p.id));
}

async function deleteRows(table, ids) {
  if (!ids.length) return 0;
  const { error, data } = await supabase.from(table).delete().in('id', ids).select('id');
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
  return (data || []).length;
}

async function run() {
  const report = {
    startedAt: nowIso(),
    completedAt: null,
    mode: APPLY ? 'apply' : 'dry-run',
    supabaseUrl,
    candidates: {},
    actions: {},
    warnings: []
  };

  console.log(`[legacy-cleanup] Starting ${report.mode} at ${report.startedAt}`);

  const invalidOrgWallets = await getInvalidOrgWalletCandidates();
  const placeholderPayments = await getPlaceholderPaymentCandidates();

  report.candidates.invalidOrgWallets = invalidOrgWallets;
  report.candidates.placeholderPayments = placeholderPayments;

  report.actions = {
    invalidOrgWallets: { candidateCount: invalidOrgWallets.length, deletedCount: 0 },
    placeholderPayments: { candidateCount: placeholderPayments.length, deletedCount: 0 }
  };

  if (APPLY) {
    report.actions.invalidOrgWallets.deletedCount = await deleteRows(
      'organization_wallets',
      invalidOrgWallets.map((r) => r.id)
    );
    report.actions.placeholderPayments.deletedCount = await deleteRows(
      'payments',
      placeholderPayments.map((r) => r.id)
    );
  }

  report.completedAt = nowIso();

  const outDir = path.join(__dirname, '..', 'validation');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'e2e_alignment_legacy_cleanup_report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('[legacy-cleanup] Report written:', outFile);
  console.log('[legacy-cleanup] invalid org wallets:', report.actions.invalidOrgWallets.candidateCount, 'deleted:', report.actions.invalidOrgWallets.deletedCount);
  console.log('[legacy-cleanup] placeholder payments:', report.actions.placeholderPayments.candidateCount, 'deleted:', report.actions.placeholderPayments.deletedCount);
  if (!APPLY) console.log('[legacy-cleanup] Dry-run only. Re-run with --apply to execute deletes.');
}

run().catch((error) => {
  console.error('[legacy-cleanup] FAIL:', error.message);
  process.exit(1);
});
