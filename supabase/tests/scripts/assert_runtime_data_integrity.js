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
    '[runtime-data-integrity] Missing Supabase credentials. Expected EXPO_PUBLIC_SUPABASE_URL and service role key.'
  );
  process.exit(1);
}

const LOOKBACK_HOURS = Number(process.env.RUNTIME_AUDIT_LOOKBACK_HOURS || 168);
const PAGE_SIZE = 1000;
const MAX_SAMPLE = 25;
const OUT_DIR = path.join(process.cwd(), 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'runtime_data_integrity_report.json');

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

function addSample(bucket, value) {
  if (bucket.length < MAX_SAMPLE) {
    bucket.push(value);
  }
}

function normalizePaymentMethod(value) {
  return String(value || '').trim().toLowerCase();
}

function isTruthyFlag(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

async function fetchInChunks(table, selectClause, values, key) {
  if (!values || values.length === 0) return [];
  const unique = [...new Set(values.filter(Boolean))];
  const out = [];
  const chunkSize = 250;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table).select(selectClause).in(key, chunk);
    if (error) {
      throw new Error(`${table}.in(${key}) failed: ${error.message}`);
    }
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
  const cutoffDate = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const cutoffIso = cutoffDate.toISOString();

  const report = {
    generated_at: startedAt,
    source: 'assert_runtime_data_integrity.js',
    lookback_hours: LOOKBACK_HOURS,
    cutoff_iso: cutoffIso,
    checks: {},
    critical: [],
    warnings: [],
    success: false,
  };

  try {
    // --- payments + fee ledger integrity (cash + non-cash) ---
    const payments = await fetchPaged(() =>
      supabase
        .from('payments')
        .select(
          'id,user_id,organization_id,emergency_request_id,amount,ivisit_fee_amount,payment_method,status,metadata,stripe_payment_intent_id,created_at,updated_at'
        )
        .eq('status', 'completed')
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: false })
    );

    const orgIds = [...new Set(payments.map((p) => p.organization_id).filter(Boolean))];
    const paymentIds = payments.map((p) => p.id).filter(Boolean);
    const walletPaymentUserIds = [
      ...new Set(
        payments
          .filter((p) => normalizePaymentMethod(p.payment_method) === 'wallet')
          .map((p) => p.user_id)
          .filter(Boolean)
      ),
    ];

    const organizations = await fetchInChunks(
      'organizations',
      'id,ivisit_fee_percentage',
      orgIds,
      'id'
    );
    const wallets = await fetchInChunks(
      'organization_wallets',
      'id,organization_id,balance',
      orgIds,
      'organization_id'
    );
    const ledgerRows = await fetchInChunks(
      'wallet_ledger',
      'id,wallet_id,amount,transaction_type,reference_id,description,created_at',
      paymentIds,
      'reference_id'
    );
    const patientWallets = await fetchInChunks(
      'patient_wallets',
      'id,user_id',
      walletPaymentUserIds,
      'user_id'
    );
    const { data: platformWallet, error: platformWalletErr } = await supabase
      .from('ivisit_main_wallet')
      .select('id,balance')
      .limit(1)
      .maybeSingle();
    if (platformWalletErr) {
      throw new Error(`ivisit_main_wallet fetch failed: ${platformWalletErr.message}`);
    }

    const orgFeeById = new Map(
      organizations.map((org) => [org.id, toNum(org.ivisit_fee_percentage || 2.5)])
    );
    const orgWalletByOrgId = new Map(wallets.map((w) => [w.organization_id, w.id]));
    const patientWalletByUserId = new Map(patientWallets.map((w) => [w.user_id, w.id]));
    const ledgerByRef = new Map();
    for (const row of ledgerRows) {
      const key = String(row.reference_id || '');
      if (!ledgerByRef.has(key)) ledgerByRef.set(key, []);
      ledgerByRef.get(key).push(row);
    }

    let cashPaymentsCompleted = 0;
    let cashTipPaymentsCompleted = 0;
    let cashPaymentsWithExpectedFee = 0;
    let cashPaymentsMissingLedger = 0;
    let cashPaymentsMissingFeePersistence = 0;
    let nonCashPaymentsCompleted = 0;
    let nonCashPaymentsWithOrganization = 0;
    let nonCashPaymentsSkippedNoOrganization = 0;
    let nonCashPaymentsWithExpectedFee = 0;
    let nonCashPaymentsMissingLedger = 0;
    let nonCashPaymentsMissingFeePersistence = 0;
    let nonCashWalletPaymentsMissingPatientDebit = 0;

    for (const payment of payments) {
      const meta = payment && typeof payment.metadata === 'object' && payment.metadata ? payment.metadata : {};
      const method = normalizePaymentMethod(payment.payment_method);
      const paymentKind = normalizePaymentMethod(meta.payment_kind);
      const isCash = method === 'cash';
      const isWallet = method === 'wallet';
      const isTip = paymentKind === 'tip';
      const isTopUp =
        isTruthyFlag(meta.is_top_up) ||
        paymentKind === 'top_up' ||
        (!payment.organization_id && !payment.emergency_request_id);
      const orgFeePct = orgFeeById.get(payment.organization_id) ?? 2.5;
      const persistedFee =
        (toNum(payment.ivisit_fee_amount) > 0 && toNum(payment.ivisit_fee_amount)) ||
        (toNum(meta.fee_amount) > 0 && toNum(meta.fee_amount)) ||
        (toNum(meta.fee) > 0 && toNum(meta.fee)) ||
        0;
      const fallbackFee = round2((toNum(payment.amount) * orgFeePct) / 100);
      const expectedFee =
        isTip || isTopUp || !payment.organization_id
          ? 0
          : isCash
            ? round2(persistedFee > 0 ? persistedFee : fallbackFee)
            : round2(persistedFee > 0 ? persistedFee : 0);

      const orgWalletId = orgWalletByOrgId.get(payment.organization_id);
      const platformWalletId = platformWallet?.id || null;
      const rows = ledgerByRef.get(String(payment.id)) || [];

      if (isCash) {
        cashPaymentsCompleted += 1;

        if (isTip) {
          cashTipPaymentsCompleted += 1;
          continue;
        }

        if (expectedFee <= 0) {
          addSample(report.warnings, {
            type: 'cash_expected_fee_zero',
            payment_id: payment.id,
            emergency_request_id: payment.emergency_request_id,
            organization_id: payment.organization_id,
            amount: toNum(payment.amount),
          });
          continue;
        }
        cashPaymentsWithExpectedFee += 1;

        if (toNum(payment.ivisit_fee_amount) <= 0 || toNum(meta.fee_amount || meta.fee) <= 0) {
          cashPaymentsMissingFeePersistence += 1;
          addSample(report.warnings, {
            type: 'cash_fee_not_persisted_cleanly',
            payment_id: payment.id,
            organization_id: payment.organization_id,
            ivisit_fee_amount: payment.ivisit_fee_amount,
            metadata_fee_amount: meta.fee_amount ?? null,
            metadata_fee: meta.fee ?? null,
            expected_fee: expectedFee,
          });
        }

        const hasOrgDebit =
          orgWalletId &&
          rows.some(
            (row) =>
              row.wallet_id === orgWalletId &&
              row.transaction_type === 'debit' &&
              approxEqual(row.amount, -expectedFee)
          );
        const hasPlatformCredit =
          platformWalletId &&
          rows.some(
            (row) =>
              row.wallet_id === platformWalletId &&
              row.transaction_type === 'credit' &&
              approxEqual(row.amount, expectedFee)
          );

        if (!hasOrgDebit || !hasPlatformCredit) {
          cashPaymentsMissingLedger += 1;
          addSample(report.critical, {
            type: 'cash_fee_ledger_missing',
            payment_id: payment.id,
            emergency_request_id: payment.emergency_request_id,
            organization_id: payment.organization_id,
            expected_fee: expectedFee,
            has_org_debit: Boolean(hasOrgDebit),
            has_platform_credit: Boolean(hasPlatformCredit),
          });
        }
        continue;
      }

      nonCashPaymentsCompleted += 1;
      if (!payment.organization_id || isTopUp) {
        nonCashPaymentsSkippedNoOrganization += 1;
        continue;
      }
      nonCashPaymentsWithOrganization += 1;

      const expectedNet = round2(toNum(payment.amount) - expectedFee);
      if (expectedFee > 0) {
        nonCashPaymentsWithExpectedFee += 1;
      }
      const shouldPersistNonCashFee = !isTip && !isTopUp && Boolean(payment.organization_id);

      if (
        shouldPersistNonCashFee &&
        (toNum(payment.ivisit_fee_amount) <= 0 || toNum(meta.fee_amount || meta.fee) <= 0)
      ) {
        nonCashPaymentsMissingFeePersistence += 1;
        addSample(report.warnings, {
          type: 'non_cash_fee_not_persisted_cleanly',
          payment_id: payment.id,
          payment_method: method || null,
          emergency_request_id: payment.emergency_request_id,
          organization_id: payment.organization_id,
          amount: toNum(payment.amount),
          ivisit_fee_amount: payment.ivisit_fee_amount,
          metadata_fee_amount: meta.fee_amount ?? null,
          metadata_fee: meta.fee ?? null,
          expected_fee: expectedFee,
        });
      }

      const hasOrgCredit =
        orgWalletId &&
        rows.some(
          (row) =>
            row.wallet_id === orgWalletId &&
            row.transaction_type === 'credit' &&
            approxEqual(row.amount, expectedNet)
        );
      const hasPlatformCredit =
        expectedFee <= 0 ||
        (platformWalletId &&
          rows.some(
            (row) =>
              row.wallet_id === platformWalletId &&
              row.transaction_type === 'credit' &&
              approxEqual(row.amount, expectedFee)
          ));

      if (!hasOrgCredit || !hasPlatformCredit) {
        nonCashPaymentsMissingLedger += 1;
        addSample(report.critical, {
          type: 'non_cash_distribution_ledger_missing',
          payment_id: payment.id,
          payment_method: method || null,
          stripe_payment_intent_id: payment.stripe_payment_intent_id || null,
          emergency_request_id: payment.emergency_request_id,
          organization_id: payment.organization_id,
          amount: toNum(payment.amount),
          expected_net: expectedNet,
          expected_fee: expectedFee,
          has_org_credit: Boolean(hasOrgCredit),
          has_platform_credit: Boolean(hasPlatformCredit),
        });
      }

      if (isWallet && !isTip) {
        const patientWalletId = patientWalletByUserId.get(payment.user_id);
        const hasPatientDebit =
          patientWalletId &&
          rows.some(
            (row) =>
              row.wallet_id === patientWalletId &&
              row.transaction_type === 'debit' &&
              approxEqual(row.amount, -toNum(payment.amount))
          );

        if (!hasPatientDebit) {
          nonCashWalletPaymentsMissingPatientDebit += 1;
          addSample(report.critical, {
            type: 'wallet_payment_patient_debit_missing',
            payment_id: payment.id,
            user_id: payment.user_id,
            emergency_request_id: payment.emergency_request_id,
            patient_wallet_id: patientWalletId || null,
            expected_debit: -toNum(payment.amount),
          });
        }
      }
    }

    report.checks.cash_payments_completed = cashPaymentsCompleted;
    report.checks.cash_tip_payments_completed = cashTipPaymentsCompleted;
    report.checks.cash_payments_with_expected_fee = cashPaymentsWithExpectedFee;
    report.checks.cash_payments_missing_fee_ledger = cashPaymentsMissingLedger;
    report.checks.cash_payments_missing_fee_persistence = cashPaymentsMissingFeePersistence;
    report.checks.non_cash_payments_completed = nonCashPaymentsCompleted;
    report.checks.non_cash_payments_with_organization = nonCashPaymentsWithOrganization;
    report.checks.non_cash_payments_skipped_no_organization = nonCashPaymentsSkippedNoOrganization;
    report.checks.non_cash_payments_with_expected_fee = nonCashPaymentsWithExpectedFee;
    report.checks.non_cash_payments_missing_distribution_ledger = nonCashPaymentsMissingLedger;
    report.checks.non_cash_payments_missing_fee_persistence = nonCashPaymentsMissingFeePersistence;
    report.checks.non_cash_wallet_payments_missing_patient_debit =
      nonCashWalletPaymentsMissingPatientDebit;

    // --- pending approval coherence ---
    const pendingRequests = await fetchPaged(() =>
      supabase
        .from('emergency_requests')
        .select('id,status,payment_status,updated_at,created_at')
        .eq('status', 'pending_approval')
        .gte('updated_at', cutoffIso)
        .order('updated_at', { ascending: false })
    );
    const pendingRequestIds = pendingRequests.map((r) => r.id).filter(Boolean);
    const pendingPayments = await fetchInChunks(
      'payments',
      'id,emergency_request_id,status,payment_method,created_at',
      pendingRequestIds,
      'emergency_request_id'
    );
    const latestPaymentByReq = new Map();
    for (const p of pendingPayments) {
      const key = String(p.emergency_request_id || '');
      const prev = latestPaymentByReq.get(key);
      if (!prev || String(p.created_at || '') > String(prev.created_at || '')) {
        latestPaymentByReq.set(key, p);
      }
    }

    let pendingApprovalMismatches = 0;
    for (const req of pendingRequests) {
      const latest = latestPaymentByReq.get(String(req.id));
      const validPayment = latest && latest.status === 'pending';
      const validReqPaymentStatus =
        !req.payment_status ||
        ['pending', 'requires_approval', 'pending_approval'].includes(req.payment_status);

      if (!validPayment || !validReqPaymentStatus) {
        pendingApprovalMismatches += 1;
        addSample(report.critical, {
          type: 'pending_approval_payment_mismatch',
          request_id: req.id,
          request_status: req.status,
          request_payment_status: req.payment_status,
          latest_payment_id: latest?.id || null,
          latest_payment_status: latest?.status || null,
          latest_payment_method: latest?.payment_method || null,
        });
      }
    }
    report.checks.pending_approval_requests = pendingRequests.length;
    report.checks.pending_approval_payment_mismatches = pendingApprovalMismatches;

    // --- visits linkage quality ---
    const recentVisits = await fetchPaged(() =>
      supabase
        .from('visits')
        .select('id,request_id,status,hospital_id,hospital_name,updated_at,type')
        .gte('updated_at', cutoffIso)
        .order('updated_at', { ascending: false })
    );
    const emergencyLookupIds = [
      ...new Set(recentVisits.map((v) => v.request_id || v.id).filter(Boolean)),
    ];
    const linkedEmergencyRows = await fetchInChunks(
      'emergency_requests',
      'id,status,hospital_id,hospital_name,service_type,updated_at',
      emergencyLookupIds,
      'id'
    );
    const emergencyById = new Map(linkedEmergencyRows.map((r) => [r.id, r]));

    let visitsOrphaned = 0;
    let visitsMissingHospitalDisplay = 0;
    let visitsMissingHospitalFk = 0;
    const unknownHospitalTokens = new Set([
      'unknown facility',
      'unknown hospital',
      'unknown',
      'n/a',
      'na',
      'none',
    ]);
    for (const visit of recentVisits) {
      const linked = emergencyById.get(visit.request_id) || emergencyById.get(visit.id);
      if (!linked) {
        if (visit.request_id) {
          visitsOrphaned += 1;
          addSample(report.critical, {
            type: 'visit_request_orphan',
            visit_id: visit.id,
            request_id: visit.request_id,
            visit_status: visit.status,
          });
        }
        continue;
      }

      const visitHospitalRaw = String(visit.hospital_name || '').trim();
      const visitHospital = visitHospitalRaw.toLowerCase();
      const reqHospital = String(linked.hospital_name || '').trim();
      const placeholderHospital =
        !visitHospital || unknownHospitalTokens.has(visitHospital);
      if (placeholderHospital && reqHospital) {
        visitsMissingHospitalDisplay += 1;
        addSample(report.warnings, {
          type: 'visit_hospital_name_missing',
          visit_id: visit.id,
          request_id: visit.request_id,
          emergency_id: linked.id,
          visit_hospital_name: visitHospitalRaw || null,
          request_hospital_name: reqHospital,
          visit_status: visit.status,
          request_status: linked.status,
        });
      }

      if (!visit.hospital_id && linked.hospital_id) {
        visitsMissingHospitalFk += 1;
        addSample(report.warnings, {
          type: 'visit_hospital_id_missing',
          visit_id: visit.id,
          request_id: visit.request_id,
          emergency_id: linked.id,
          request_hospital_id: linked.hospital_id,
          visit_status: visit.status,
          request_status: linked.status,
        });
      }
    }
    report.checks.recent_linked_visits = recentVisits.length;
    report.checks.visit_request_orphans = visitsOrphaned;
    report.checks.visits_missing_hospital_display = visitsMissingHospitalDisplay;
    report.checks.visits_missing_hospital_fk = visitsMissingHospitalFk;

    report.success = report.critical.length === 0;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

    if (!report.success) {
      console.error('[runtime-data-integrity] FAIL: critical anomalies detected.');
      console.error(
        `[runtime-data-integrity] critical=${report.critical.length} warnings=${report.warnings.length}`
      );
      console.error(`[runtime-data-integrity] report=${OUT_FILE}`);
      process.exit(1);
    }

    console.log('[runtime-data-integrity] PASS: no critical anomalies detected.');
    console.log(
      `[runtime-data-integrity] checks=${JSON.stringify(report.checks)} warnings=${report.warnings.length}`
    );
    console.log(`[runtime-data-integrity] report=${OUT_FILE}`);
  } catch (error) {
    report.success = false;
    addSample(report.critical, {
      type: 'script_error',
      message: error.message || String(error),
    });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
    console.error('[runtime-data-integrity] FAIL:', error.message || error);
    console.error(`[runtime-data-integrity] report=${OUT_FILE}`);
    process.exit(1);
  }
}

run();
