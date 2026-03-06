#!/usr/bin/env node

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
  console.error(
    '[runtime-data-repair] Missing Supabase credentials. Expected EXPO_PUBLIC_SUPABASE_URL and service role key.'
  );
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const LOOKBACK_HOURS = Number(process.env.RUNTIME_AUDIT_LOOKBACK_HOURS || 168);
const PAGE_SIZE = 1000;
const OUT_DIR = path.join(process.cwd(), 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'runtime_data_integrity_repair_report.json');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function nowIso() {
  return new Date().toISOString();
}

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((toNum(value) + Number.EPSILON) * 100) / 100;
}

function approxEqual(a, b, epsilon = 0.02) {
  return Math.abs(toNum(a) - toNum(b)) <= epsilon;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function fetchInChunks(table, selectClause, values, key) {
  if (!values || values.length === 0) return [];
  const unique = [...new Set(values.filter(Boolean))];
  const out = [];
  const chunkSize = 250;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table).select(selectClause).in(key, chunk);
    if (error) throw new Error(`${table}.in(${key}) failed: ${error.message}`);
    out.push(...asArray(data));
  }
  return out;
}

async function fetchPaged(builderFactory) {
  const out = [];
  for (let page = 0; ; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await builderFactory().range(from, to);
    if (error) throw error;
    const rows = asArray(data);
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function run() {
  const startedAt = nowIso();
  const cutoffIso = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const report = {
    generated_at: startedAt,
    source: 'repair_runtime_data_integrity.js',
    mode: APPLY ? 'apply' : 'dry-run',
    lookback_hours: LOOKBACK_HOURS,
    cutoff_iso: cutoffIso,
    actions: {
      cash_payments_scanned: 0,
      cash_fee_missing_ledger: 0,
      cash_fee_debits_inserted: 0,
      cash_fee_credits_inserted: 0,
      cash_fee_payment_rows_persisted: 0,
      visit_rows_scanned: 0,
      visit_hospital_backfills: 0,
      visit_request_link_backfills: 0,
      visit_hospital_id_backfills: 0,
      visit_hospital_name_backfills: 0,
    },
    samples: {
      cash_fee_repairs: [],
      visit_backfills: [],
    },
    success: false,
    errors: [],
  };

  try {
    const payments = await fetchPaged(() =>
      supabase
        .from('payments')
        .select(
          'id,organization_id,emergency_request_id,amount,ivisit_fee_amount,payment_method,status,metadata,created_at,updated_at,processed_at'
        )
        .eq('status', 'completed')
        .eq('payment_method', 'cash')
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: false })
    );

    report.actions.cash_payments_scanned = payments.length;
    const orgIds = [...new Set(payments.map((p) => p.organization_id).filter(Boolean))];
    const paymentIds = payments.map((p) => p.id).filter(Boolean);

    const organizations = await fetchInChunks(
      'organizations',
      'id,ivisit_fee_percentage',
      orgIds,
      'id'
    );
    const orgWallets = await fetchInChunks(
      'organization_wallets',
      'id,organization_id,balance',
      orgIds,
      'organization_id'
    );
    const ledgerRows = await fetchInChunks(
      'wallet_ledger',
      'id,wallet_id,amount,transaction_type,reference_id,created_at',
      paymentIds,
      'reference_id'
    );
    const { data: platformWallet, error: platformWalletErr } = await supabase
      .from('ivisit_main_wallet')
      .select('id,balance')
      .limit(1)
      .maybeSingle();
    if (platformWalletErr) throw new Error(`platform wallet load failed: ${platformWalletErr.message}`);
    if (!platformWallet?.id) throw new Error('platform wallet not found');

    const orgFeeById = new Map(
      organizations.map((org) => [org.id, toNum(org.ivisit_fee_percentage || 2.5)])
    );
    const orgWalletByOrg = new Map(orgWallets.map((w) => [w.organization_id, { ...w }]));
    const ledgerByRef = new Map();
    for (const row of ledgerRows) {
      const key = String(row.reference_id || '');
      if (!ledgerByRef.has(key)) ledgerByRef.set(key, []);
      ledgerByRef.get(key).push(row);
    }

    let platformBalance = toNum(platformWallet.balance);

    for (const payment of payments) {
      const meta =
        payment && payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {};
      const orgFeePct = orgFeeById.get(payment.organization_id) ?? 2.5;
      const expectedFee = round2(
        (toNum(payment.ivisit_fee_amount) > 0 && toNum(payment.ivisit_fee_amount)) ||
          (toNum(meta.fee_amount) > 0 && toNum(meta.fee_amount)) ||
          (toNum(meta.fee) > 0 && toNum(meta.fee)) ||
          (toNum(payment.amount) * orgFeePct) / 100
      );
      if (expectedFee <= 0) continue;

      const orgWalletRef = orgWalletByOrg.get(payment.organization_id);
      if (!orgWalletRef?.id) {
        report.errors.push(`missing organization wallet for org ${payment.organization_id} payment ${payment.id}`);
        continue;
      }

      const rows = ledgerByRef.get(String(payment.id)) || [];
      const hasOrgDebit = rows.some(
        (row) =>
          row.wallet_id === orgWalletRef.id &&
          row.transaction_type === 'debit' &&
          approxEqual(row.amount, -expectedFee)
      );
      const hasPlatformCredit = rows.some(
        (row) =>
          row.wallet_id === platformWallet.id &&
          row.transaction_type === 'credit' &&
          approxEqual(row.amount, expectedFee)
      );
      const needsPaymentPersist =
        toNum(payment.ivisit_fee_amount) <= 0 || toNum(meta.fee_amount || meta.fee) <= 0;

      if (!hasOrgDebit || !hasPlatformCredit || needsPaymentPersist) {
        report.actions.cash_fee_missing_ledger += !hasOrgDebit || !hasPlatformCredit ? 1 : 0;
        report.samples.cash_fee_repairs.push({
          payment_id: payment.id,
          emergency_request_id: payment.emergency_request_id,
          expected_fee: expectedFee,
          has_org_debit: hasOrgDebit,
          has_platform_credit: hasPlatformCredit,
          needs_payment_persist: needsPaymentPersist,
        });
      }

      if (APPLY) {
        if (!hasOrgDebit) {
          const nextOrgBalance = round2(toNum(orgWalletRef.balance) - expectedFee);
          const { error: orgUpdateErr } = await supabase
            .from('organization_wallets')
            .update({ balance: nextOrgBalance, updated_at: nowIso() })
            .eq('id', orgWalletRef.id);
          if (orgUpdateErr) throw new Error(`org wallet debit update failed: ${orgUpdateErr.message}`);
          orgWalletRef.balance = nextOrgBalance;

          const { error: debitErr } = await supabase.from('wallet_ledger').insert({
            wallet_id: orgWalletRef.id,
            amount: -expectedFee,
            transaction_type: 'debit',
            description: 'iVisit Platform Fee (Cash Payment Backfill)',
            reference_id: payment.id,
            metadata: {
              source: 'runtime_data_integrity_repair',
              repair_type: 'cash_fee_ledger_backfill',
            },
            created_at: payment.processed_at || payment.updated_at || payment.created_at || nowIso(),
          });
          if (debitErr) throw new Error(`org wallet debit ledger insert failed: ${debitErr.message}`);
          report.actions.cash_fee_debits_inserted += 1;
        }

        if (!hasPlatformCredit) {
          platformBalance = round2(platformBalance + expectedFee);
          const { error: platformUpdateErr } = await supabase
            .from('ivisit_main_wallet')
            .update({ balance: platformBalance, last_updated: nowIso() })
            .eq('id', platformWallet.id);
          if (platformUpdateErr)
            throw new Error(`platform wallet credit update failed: ${platformUpdateErr.message}`);

          const { error: creditErr } = await supabase.from('wallet_ledger').insert({
            wallet_id: platformWallet.id,
            amount: expectedFee,
            transaction_type: 'credit',
            description: 'Platform Fee (Cash Payment Backfill)',
            reference_id: payment.id,
            metadata: {
              source: 'runtime_data_integrity_repair',
              repair_type: 'cash_fee_ledger_backfill',
            },
            created_at: payment.processed_at || payment.updated_at || payment.created_at || nowIso(),
          });
          if (creditErr) throw new Error(`platform credit ledger insert failed: ${creditErr.message}`);
          report.actions.cash_fee_credits_inserted += 1;
        }

        if (needsPaymentPersist) {
          const nextMeta =
            meta && typeof meta === 'object' && !Array.isArray(meta)
              ? { ...meta, fee_amount: expectedFee, fee: expectedFee, repaired_at: nowIso() }
              : { fee_amount: expectedFee, fee: expectedFee, repaired_at: nowIso() };

          const { error: paymentUpdateErr } = await supabase
            .from('payments')
            .update({
              ivisit_fee_amount: expectedFee,
              metadata: nextMeta,
              updated_at: nowIso(),
            })
            .eq('id', payment.id);
          if (paymentUpdateErr) throw new Error(`payment fee persistence update failed: ${paymentUpdateErr.message}`);
          report.actions.cash_fee_payment_rows_persisted += 1;
        }
      }
    }

    // --- visits linkage/hospital display backfill ---
    const visits = await fetchPaged(() =>
      supabase
        .from('visits')
        .select('id,request_id,hospital_id,hospital_name,updated_at')
        .gte('updated_at', cutoffIso)
        .order('updated_at', { ascending: false })
    );
    report.actions.visit_rows_scanned = visits.length;
    const emergencyLookupIds = [...new Set(visits.map((v) => v.request_id || v.id).filter(Boolean))];
    const emergencyRows = await fetchInChunks(
      'emergency_requests',
      'id,hospital_id,hospital_name',
      emergencyLookupIds,
      'id'
    );
    const emergencyById = new Map(emergencyRows.map((row) => [row.id, row]));
    const unknownHospitalTokens = new Set([
      'unknown facility',
      'unknown hospital',
      'unknown',
      'n/a',
      'na',
      'none',
    ]);

    for (const visit of visits) {
      const linked = emergencyById.get(visit.request_id) || emergencyById.get(visit.id);
      if (!linked) continue;

      const visitHospitalRaw = String(visit.hospital_name || '').trim();
      const visitHospital = visitHospitalRaw.toLowerCase();
      const requestHospital = String(linked.hospital_name || '').trim();
      const needsRequestLinkBackfill = !visit.request_id && Boolean(linked.id);
      const needsHospitalIdBackfill = !visit.hospital_id && Boolean(linked.hospital_id);
      const needsHospitalNameBackfill =
        Boolean(requestHospital) && (!visitHospital || unknownHospitalTokens.has(visitHospital));

      if (!needsRequestLinkBackfill && !needsHospitalIdBackfill && !needsHospitalNameBackfill) {
        continue;
      }

      report.samples.visit_backfills.push({
        visit_id: visit.id,
        existing_request_id: visit.request_id || null,
        emergency_id: linked.id,
        existing_hospital_id: visit.hospital_id || null,
        emergency_hospital_id: linked.hospital_id || null,
        existing_hospital_name: visitHospitalRaw || null,
        emergency_hospital_name: requestHospital || null,
        needs_request_link_backfill: needsRequestLinkBackfill,
        needs_hospital_id_backfill: needsHospitalIdBackfill,
        needs_hospital_name_backfill: needsHospitalNameBackfill,
      });

      if (APPLY) {
        const patch = { updated_at: nowIso() };
        if (needsRequestLinkBackfill) patch.request_id = linked.id;
        if (needsHospitalIdBackfill) patch.hospital_id = linked.hospital_id;
        if (needsHospitalNameBackfill) patch.hospital_name = requestHospital;

        const { error: visitUpdateErr } = await supabase
          .from('visits')
          .update(patch)
          .eq('id', visit.id);
        if (visitUpdateErr) throw new Error(`visit backfill failed: ${visitUpdateErr.message}`);
        report.actions.visit_hospital_backfills += 1;
        if (needsRequestLinkBackfill) report.actions.visit_request_link_backfills += 1;
        if (needsHospitalIdBackfill) report.actions.visit_hospital_id_backfills += 1;
        if (needsHospitalNameBackfill) report.actions.visit_hospital_name_backfills += 1;
      }
    }

    report.success = true;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

    console.log(`[runtime-data-repair] ${APPLY ? 'APPLY' : 'DRY-RUN'} complete.`);
    console.log(`[runtime-data-repair] report=${OUT_FILE}`);
    console.log(`[runtime-data-repair] actions=${JSON.stringify(report.actions)}`);
  } catch (error) {
    report.success = false;
    report.errors.push(error.message || String(error));
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
    console.error('[runtime-data-repair] FAIL:', error.message || error);
    console.error(`[runtime-data-repair] report=${OUT_FILE}`);
    process.exit(1);
  }
}

run();
