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
    '[runtime-crud-batch] Missing Supabase credentials. Expected EXPO_PUBLIC_SUPABASE_URL and service key.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TS = Date.now();
const TAG = `runtime-crud-batch-${TS}`;

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProfile(userId, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,role,organization_id')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) return data;
    await sleep(300);
  }
  throw new Error(`profile bootstrap timeout for user ${userId}`);
}

async function createAuthUser({ email, role, fullName }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPass123!',
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  return data.user;
}

async function safeDeleteAuthUser(userId, report) {
  if (!userId) return;
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    report.cleanupWarnings.push(`auth user delete failed (${userId}): ${error.message}`);
  }
}

function assertPush(report, key, condition, detailIfFail) {
  report.assertions[key] = Boolean(condition);
  if (!condition && detailIfFail) {
    report.failures.push({ assertion: key, detail: detailIfFail });
  }
}

function isMissingColumnError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    (message.includes('column') && message.includes('does not exist'))
  );
}

async function run() {
  const report = {
    tag: TAG,
    startedAt: nowIso(),
    steps: [],
    assertions: {},
    failures: [],
    cleanupWarnings: [],
    resources: {},
  };

  const ctx = {
    authUserIds: [],
    organizationId: null,
    orgWalletId: null,
    paymentMethodId: null,
    paymentId: null,
    ledgerId: null,
    faqId: null,
    ticketId: null,
    searchEventId: null,
    searchHistoryId: null,
    searchSelectionId: null,
    patientUserId: null,
    orgAdminUserId: null,
  };

  try {
    const patientEmail = `${TAG}-patient@ivisit-e2e.local`;
    const orgAdminEmail = `${TAG}-orgadmin@ivisit-e2e.local`;

    const patientAuth = await createAuthUser({
      email: patientEmail,
      role: 'patient',
      fullName: `Patient ${TAG}`,
    });
    ctx.authUserIds.push(patientAuth.id);
    ctx.patientUserId = patientAuth.id;

    const orgAdminAuth = await createAuthUser({
      email: orgAdminEmail,
      role: 'org_admin',
      fullName: `Org Admin ${TAG}`,
    });
    ctx.authUserIds.push(orgAdminAuth.id);
    ctx.orgAdminUserId = orgAdminAuth.id;

    const patientProfile = await waitForProfile(patientAuth.id);
    const orgAdminProfile = await waitForProfile(orgAdminAuth.id);
    report.resources.patientProfile = {
      id: patientProfile.id,
      email: patientProfile.email,
    };
    report.resources.orgAdminProfile = {
      id: orgAdminProfile.id,
      email: orgAdminProfile.email,
    };
    report.steps.push('auth/profile bootstrap complete');

    const { error: orgAdminRoleErr } = await supabase
      .from('profiles')
      .update({ role: 'org_admin' })
      .eq('id', orgAdminAuth.id);
    if (orgAdminRoleErr) {
      throw new Error(`org_admin role update failed: ${orgAdminRoleErr.message}`);
    }

    const { data: organization, error: organizationErr } = await supabase
      .from('organizations')
      .insert({
        name: `Runtime Org ${TAG}`,
        contact_email: orgAdminEmail,
        is_active: true,
        ivisit_fee_percentage: 2.5,
        fee_tier: 'standard',
      })
      .select('id,name')
      .single();
    if (organizationErr) throw new Error(`organization insert failed: ${organizationErr.message}`);
    ctx.organizationId = organization.id;
    report.resources.organization = organization;
    report.steps.push('organization created');

    const { error: patientOrgLinkErr } = await supabase
      .from('profiles')
      .update({ organization_id: organization.id })
      .eq('id', patientAuth.id);
    if (patientOrgLinkErr) {
      throw new Error(`patient org link failed: ${patientOrgLinkErr.message}`);
    }

    const { error: adminOrgLinkErr } = await supabase
      .from('profiles')
      .update({ organization_id: organization.id })
      .eq('id', orgAdminAuth.id);
    if (adminOrgLinkErr) {
      throw new Error(`org_admin org link failed: ${adminOrgLinkErr.message}`);
    }

    await sleep(500);
    let { data: orgWallet, error: orgWalletErr } = await supabase
      .from('organization_wallets')
      .select('id,organization_id,balance,currency')
      .eq('organization_id', organization.id)
      .maybeSingle();
    if (orgWalletErr) throw new Error(`organization_wallet fetch failed: ${orgWalletErr.message}`);

    if (!orgWallet) {
      const insertWallet = await supabase
        .from('organization_wallets')
        .insert({
          organization_id: organization.id,
          balance: 0,
          currency: 'USD',
        })
        .select('id,organization_id,balance,currency')
        .single();
      if (insertWallet.error) {
        throw new Error(`organization_wallet insert failed: ${insertWallet.error.message}`);
      }
      orgWallet = insertWallet.data;
    }

    ctx.orgWalletId = orgWallet.id;
    report.resources.organizationWallet = orgWallet;
    assertPush(
      report,
      'organization_wallet_linked_to_org',
      orgWallet.organization_id === organization.id,
      `wallet organization mismatch: expected ${organization.id}, got ${orgWallet.organization_id}`
    );

    const { data: paymentMethod, error: paymentMethodErr } = await supabase
      .from('payment_methods')
      .insert({
        user_id: patientAuth.id,
        organization_id: organization.id,
        type: 'card',
        provider: 'stripe',
        last4: '4242',
        brand: 'visa',
        expiry_month: 12,
        expiry_year: 2030,
        is_default: true,
        is_active: true,
        metadata: { tag: TAG, source: 'runtime_batch' },
      })
      .select('*')
      .single();
    if (paymentMethodErr) {
      throw new Error(`payment_methods insert failed: ${paymentMethodErr.message}`);
    }
    ctx.paymentMethodId = paymentMethod.id;
    report.resources.paymentMethod = {
      id: paymentMethod.id,
      user_id: paymentMethod.user_id,
      organization_id: paymentMethod.organization_id,
      is_default: paymentMethod.is_default,
      is_active: paymentMethod.is_active,
    };
    report.steps.push('payment_methods CRUD complete');

    const { data: payment, error: paymentErr } = await supabase
      .from('payments')
      .insert({
        user_id: patientAuth.id,
        organization_id: organization.id,
        amount: 42.5,
        currency: 'USD',
        payment_method: 'card',
        status: 'pending',
        metadata: { tag: TAG, source: 'runtime_batch' },
      })
      .select('*')
      .single();
    if (paymentErr) throw new Error(`payments insert failed: ${paymentErr.message}`);
    ctx.paymentId = payment.id;

    const { error: paymentStatusErr } = await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', payment.id);
    if (paymentStatusErr) throw new Error(`payments update failed: ${paymentStatusErr.message}`);

    const ledgerInsert = await supabase
      .from('wallet_ledger')
      .insert({
        wallet_id: orgWallet.id,
        amount: 42.5,
        transaction_type: 'credit',
        description: `Runtime ledger ${TAG}`,
        reference_id: payment.id,
        metadata: { tag: TAG, source: 'runtime_batch', organization_id: organization.id },
      })
      .select('*')
      .single();
    if (ledgerInsert.error) throw new Error(`wallet_ledger insert failed: ${ledgerInsert.error.message}`);
    ctx.ledgerId = ledgerInsert.data.id;
    report.resources.walletLedger = {
      id: ledgerInsert.data.id,
      wallet_id: ledgerInsert.data.wallet_id,
      reference_id: ledgerInsert.data.reference_id,
      transaction_type: ledgerInsert.data.transaction_type,
    };
    report.steps.push('organization_wallets/wallet_ledger/payments runtime relationship validated');

    const { data: faq, error: faqErr } = await supabase
      .from('support_faqs')
      .insert({
        question: `[${TAG}] How do I book an ambulance?`,
        answer: 'Use the emergency screen and confirm your service.',
        category: 'booking',
        rank: 999,
      })
      .select('*')
      .single();
    if (faqErr) throw new Error(`support_faqs insert failed: ${faqErr.message}`);
    ctx.faqId = faq.id;

    const { error: faqUpdateErr } = await supabase
      .from('support_faqs')
      .update({ answer: 'Updated answer for runtime batch validation.' })
      .eq('id', faq.id);
    if (faqUpdateErr) throw new Error(`support_faqs update failed: ${faqUpdateErr.message}`);

    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets')
      .insert({
        subject: `[${TAG}] Runtime support ticket`,
        message: 'Runtime CRUD relationship validation ticket.',
        status: 'open',
        priority: 'normal',
        user_id: patientAuth.id,
        organization_id: organization.id,
      })
      .select('*')
      .single();
    if (ticketErr) throw new Error(`support_tickets insert failed: ${ticketErr.message}`);
    ctx.ticketId = ticket.id;

    const { error: ticketUpdateErr } = await supabase
      .from('support_tickets')
      .update({ status: 'in_progress' })
      .eq('id', ticket.id);
    if (ticketUpdateErr) throw new Error(`support_tickets update failed: ${ticketUpdateErr.message}`);
    report.steps.push('support_faqs/support_tickets CRUD complete');

    let searchEventData = null;
    const searchEventInsertWithMetadata = await supabase
      .from('search_events')
      .insert({
        query: `${TAG} emergency`,
        source: 'runtime_batch',
        selected_key: 'hospital',
        metadata: { tag: TAG, layer: 'console_app_parity' },
      })
      .select('*')
      .single();

    if (searchEventInsertWithMetadata.error && isMissingColumnError(searchEventInsertWithMetadata.error)) {
      const fallbackInsert = await supabase
        .from('search_events')
        .insert({
          query: `${TAG} emergency`,
          source: 'runtime_batch',
          selected_key: 'hospital',
          extra: { tag: TAG, layer: 'console_app_parity' },
        })
        .select('*')
        .single();
      if (fallbackInsert.error) {
        throw new Error(`search_events fallback insert failed: ${fallbackInsert.error.message}`);
      }
      searchEventData = fallbackInsert.data;
    } else if (searchEventInsertWithMetadata.error) {
      throw new Error(`search_events insert failed: ${searchEventInsertWithMetadata.error.message}`);
    } else {
      searchEventData = searchEventInsertWithMetadata.data;
    }
    ctx.searchEventId = searchEventData.id;

    const { data: searchHistory, error: searchHistoryErr } = await supabase
      .from('search_history')
      .insert({
        user_id: patientAuth.id,
        query: `${TAG} cardiologist`,
        result_count: 3,
      })
      .select('*')
      .single();
    if (searchHistoryErr) throw new Error(`search_history insert failed: ${searchHistoryErr.message}`);
    ctx.searchHistoryId = searchHistory.id;

    const { data: searchSelection, error: searchSelectionErr } = await supabase
      .from('search_selections')
      .insert({
        user_id: patientAuth.id,
        query: `${TAG} cardiologist`,
        result_type: 'hospital',
        result_id: 'runtime-hospital',
        source: 'runtime_batch',
      })
      .select('*')
      .single();
    if (searchSelectionErr) {
      throw new Error(`search_selections insert failed: ${searchSelectionErr.message}`);
    }
    ctx.searchSelectionId = searchSelection.id;
    report.steps.push('search_events/search_history/search_selections CRUD complete');

    const preMedical = await supabase
      .from('medical_profiles')
      .select('*')
      .eq('user_id', patientAuth.id)
      .maybeSingle();
    if (preMedical.error) throw new Error(`medical_profiles pre-read failed: ${preMedical.error.message}`);

    const { data: medicalAfterUpdate, error: medicalUpdateErr } = await supabase
      .from('medical_profiles')
      .update({
        blood_type: 'O+',
        allergies: ['latex'],
        conditions: ['hypertension'],
        medications: ['lisinopril'],
        organ_donor: false,
        emergency_notes: `runtime-note-${TAG}`,
        updated_at: nowIso(),
      })
      .eq('user_id', patientAuth.id)
      .select('*')
      .single();
    if (medicalUpdateErr) {
      throw new Error(`medical_profiles update failed: ${medicalUpdateErr.message}`);
    }
    report.resources.medicalProfile = {
      user_id: medicalAfterUpdate.user_id,
      blood_type: medicalAfterUpdate.blood_type,
      updated_at: medicalAfterUpdate.updated_at,
    };
    report.resources.preMedicalProfileExisted = Boolean(preMedical.data);
    report.steps.push('medical_profiles CRUD complete');

    const { data: walletSummaryRows, error: walletSummaryErr } = await supabase
      .from('wallet_ledger')
      .select('amount, created_at')
      .eq('wallet_id', orgWallet.id)
      .eq('transaction_type', 'credit')
      .order('created_at', { ascending: false })
      .limit(20);
    if (walletSummaryErr) {
      throw new Error(`wallet summary mirror query failed: ${walletSummaryErr.message}`);
    }

    const { data: faqRows, error: faqRowsErr } = await supabase
      .from('support_faqs')
      .select('*')
      .order('rank', { ascending: true })
      .limit(20);
    if (faqRowsErr) throw new Error(`support_faq mirror query failed: ${faqRowsErr.message}`);

    const { data: searchRows, error: searchRowsErr } = await supabase
      .from('search_events')
      .select('*')
      .eq('source', 'runtime_batch')
      .order('created_at', { ascending: false })
      .limit(20);
    if (searchRowsErr) throw new Error(`search_events mirror query failed: ${searchRowsErr.message}`);

    const { data: searchHistoryRows, error: searchHistoryRowsErr } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', patientAuth.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (searchHistoryRowsErr) {
      throw new Error(`search_history mirror query failed: ${searchHistoryRowsErr.message}`);
    }

    const { data: searchSelectionRows, error: searchSelectionRowsErr } = await supabase
      .from('search_selections')
      .select('*')
      .eq('user_id', patientAuth.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (searchSelectionRowsErr) {
      throw new Error(`search_selections mirror query failed: ${searchSelectionRowsErr.message}`);
    }

    const { data: medicalRows, error: medicalRowsErr } = await supabase
      .from('medical_profiles')
      .select('*')
      .eq('user_id', patientAuth.id)
      .limit(1);
    if (medicalRowsErr) {
      throw new Error(`medical_profiles mirror query failed: ${medicalRowsErr.message}`);
    }

    assertPush(
      report,
      'payment_org_relationship',
      payment.organization_id === organization.id,
      `payment.organization_id mismatch: expected ${organization.id}, got ${payment.organization_id}`
    );
    assertPush(
      report,
      'wallet_ledger_payment_relationship',
      ledgerInsert.data.reference_id === payment.id && ledgerInsert.data.wallet_id === orgWallet.id,
      'wallet_ledger row is not linked to expected payment/wallet'
    );
    assertPush(
      report,
      'support_ticket_org_user_relationship',
      ticket.organization_id === organization.id && ticket.user_id === patientAuth.id,
      'support_ticket is not linked to expected organization/user'
    );
    assertPush(
      report,
      'search_rows_persisted',
      (searchRows || []).some((row) => row.id === searchEventData.id) &&
        (searchHistoryRows || []).some((row) => row.id === searchHistory.id) &&
        (searchSelectionRows || []).some((row) => row.id === searchSelection.id),
      'one or more search rows were not persisted'
    );
    assertPush(
      report,
      'medical_profile_persisted',
      Array.isArray(medicalRows) &&
        medicalRows.length > 0 &&
        medicalRows[0].user_id === patientAuth.id &&
        medicalRows[0].blood_type === 'O+',
      'medical profile update did not persist expected fields'
    );
    assertPush(
      report,
      'console_wallet_query_reads_new_ledger',
      Array.isArray(walletSummaryRows) && walletSummaryRows.some((row) => Number(row.amount) === 42.5),
      'wallet summary mirror query did not include inserted ledger row'
    );
    assertPush(
      report,
      'console_support_faq_query_reads_new_faq',
      Array.isArray(faqRows) && faqRows.some((row) => row.id === faq.id),
      'support_faq mirror query did not include inserted row'
    );

    report.resources.mirrorCounts = {
      wallet_ledger: walletSummaryRows?.length || 0,
      support_faqs: faqRows?.length || 0,
      search_events: searchRows?.length || 0,
      search_history: searchHistoryRows?.length || 0,
      search_selections: searchSelectionRows?.length || 0,
      medical_profiles: medicalRows?.length || 0,
    };

    report.completedAt = nowIso();
    report.success = report.failures.length === 0;
  } catch (error) {
    report.completedAt = nowIso();
    report.success = false;
    report.error = error.message || String(error);
  } finally {
    const safeDelete = async (label, fn) => {
      try {
        await fn();
      } catch (error) {
        report.cleanupWarnings.push(`${label}: ${error.message || String(error)}`);
      }
    };

    await safeDelete('wallet_ledger.delete', async () => {
      if (!ctx.ledgerId && !ctx.paymentId) return;
      let query = supabase.from('wallet_ledger').delete();
      if (ctx.ledgerId) {
        query = query.eq('id', ctx.ledgerId);
      } else {
        query = query.eq('reference_id', ctx.paymentId);
      }
      const { error } = await query;
      if (error) throw error;
    });

    await safeDelete('payments.delete', async () => {
      if (!ctx.paymentId) return;
      const { error } = await supabase.from('payments').delete().eq('id', ctx.paymentId);
      if (error) throw error;
    });

    await safeDelete('payment_methods.delete', async () => {
      if (!ctx.paymentMethodId) return;
      const { error } = await supabase.from('payment_methods').delete().eq('id', ctx.paymentMethodId);
      if (error) throw error;
    });

    await safeDelete('support_tickets.delete', async () => {
      if (!ctx.ticketId) return;
      const { error } = await supabase.from('support_tickets').delete().eq('id', ctx.ticketId);
      if (error) throw error;
    });

    await safeDelete('support_faqs.delete', async () => {
      if (!ctx.faqId) return;
      const { error } = await supabase.from('support_faqs').delete().eq('id', ctx.faqId);
      if (error) throw error;
    });

    await safeDelete('search_events.delete', async () => {
      if (!ctx.searchEventId) return;
      const { error } = await supabase.from('search_events').delete().eq('id', ctx.searchEventId);
      if (error) throw error;
    });

    await safeDelete('search_history.delete', async () => {
      if (!ctx.searchHistoryId) return;
      const { error } = await supabase.from('search_history').delete().eq('id', ctx.searchHistoryId);
      if (error) throw error;
    });

    await safeDelete('search_selections.delete', async () => {
      if (!ctx.searchSelectionId) return;
      const { error } = await supabase.from('search_selections').delete().eq('id', ctx.searchSelectionId);
      if (error) throw error;
    });

    await safeDelete('organization_wallet.delete', async () => {
      if (!ctx.organizationId) return;
      const { error } = await supabase
        .from('organization_wallets')
        .delete()
        .eq('organization_id', ctx.organizationId);
      if (error) throw error;
    });

    await safeDelete('organization.delete', async () => {
      if (!ctx.organizationId) return;
      const { error } = await supabase.from('organizations').delete().eq('id', ctx.organizationId);
      if (error) throw error;
    });

    await safeDelete('profiles.delete', async () => {
      const ids = [ctx.patientUserId, ctx.orgAdminUserId].filter(Boolean);
      if (ids.length === 0) return;
      const { error } = await supabase.from('profiles').delete().in('id', ids);
      if (error) throw error;
    });

    for (const userId of ctx.authUserIds) {
      await safeDelete(`auth.delete(${userId})`, async () => {
        await safeDeleteAuthUser(userId, report);
      });
    }
  }

  const outDir = path.join(__dirname, '..', 'validation');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'runtime_crud_relationship_batch_report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('[runtime-crud-batch] Report written:', outFile);
  console.log('[runtime-crud-batch] success:', report.success);
  if (report.failures.length > 0) {
    console.log('[runtime-crud-batch] assertion failures:', report.failures.length);
    for (const failure of report.failures) {
      console.log(`  - ${failure.assertion}: ${failure.detail}`);
    }
  }
  if (report.cleanupWarnings.length > 0) {
    console.log('[runtime-crud-batch] cleanup warnings:', report.cleanupWarnings.length);
    for (const warning of report.cleanupWarnings) {
      console.log(`  - ${warning}`);
    }
  }
  if (!report.success) {
    if (report.error) console.error('[runtime-crud-batch] error:', report.error);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('[runtime-crud-batch] Fatal:', error.message || error);
  process.exit(1);
});
