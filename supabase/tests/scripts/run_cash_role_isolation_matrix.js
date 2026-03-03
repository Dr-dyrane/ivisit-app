const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('[cash-role-matrix] Missing Supabase credentials in .env/.env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = 'TestPass123!';
const TS = Date.now();
const TAG = `cash-role-matrix-${TS}`;

function email(label) {
  return `${TAG}-${label}@ivisit-e2e.local`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureProfile(userId, profilePatch) {
  for (let i = 0; i < 8; i += 1) {
    const { error } = await admin.from('profiles').update(profilePatch).eq('id', userId);
    if (!error) return;
    await sleep(250);
  }
  throw new Error(`profile update failed for ${userId}`);
}

async function createAuthUser({ label, role, organizationId = null, providerType = null }) {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(label),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error) {
    throw new Error(`createUser(${label}) failed: ${error.message}`);
  }

  const patch = {
    role,
    organization_id: organizationId,
  };
  if (providerType) {
    patch.provider_type = providerType;
  }
  await ensureProfile(data.user.id, patch);
  return data.user;
}

async function signInAs(emailAddress) {
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.auth.signInWithPassword({
    email: emailAddress,
    password: PASSWORD,
  });
  if (error) {
    throw new Error(`signInWithPassword(${emailAddress}) failed: ${error.message}`);
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function safeRun(label, fn, warnings) {
  try {
    await fn();
  } catch (error) {
    warnings.push(`${label}: ${error.message}`);
  }
}

function makeResult(caseId, role, rpc, expectSuccess) {
  return {
    caseId,
    role,
    rpc,
    expectSuccess,
    success: false,
    setupError: false,
    rpcData: null,
    error: null,
  };
}

async function main() {
  const ctx = {
    users: {},
    userIds: [],
    orgA: null,
    orgB: null,
    hospitalA: null,
    hospitalB: null,
    requestIds: [],
    paymentIds: [],
  };

  const report = {
    tag: TAG,
    startedAt: new Date().toISOString(),
    summary: {
      totalCases: 0,
      passed: 0,
      failed: 0,
    },
    results: [],
    cleanupWarnings: [],
  };

  try {
    const { data: orgA, error: orgAErr } = await admin
      .from('organizations')
      .insert({ name: `Cash Matrix Org A ${TAG}` })
      .select()
      .single();
    if (orgAErr) throw new Error(`orgA create failed: ${orgAErr.message}`);
    ctx.orgA = orgA.id;

    const { data: orgB, error: orgBErr } = await admin
      .from('organizations')
      .insert({ name: `Cash Matrix Org B ${TAG}` })
      .select()
      .single();
    if (orgBErr) throw new Error(`orgB create failed: ${orgBErr.message}`);
    ctx.orgB = orgB.id;

    const { data: hospitalA, error: hospitalAErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: ctx.orgA,
        name: `Cash Matrix Hospital A ${TAG}`,
        address: '1 Cash Matrix Way',
        status: 'available',
        available_beds: 8,
        total_beds: 30,
      })
      .select()
      .single();
    if (hospitalAErr) throw new Error(`hospitalA create failed: ${hospitalAErr.message}`);
    ctx.hospitalA = hospitalA.id;

    const { data: hospitalB, error: hospitalBErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: ctx.orgB,
        name: `Cash Matrix Hospital B ${TAG}`,
        address: '2 Cash Matrix Way',
        status: 'available',
        available_beds: 8,
        total_beds: 30,
      })
      .select()
      .single();
    if (hospitalBErr) throw new Error(`hospitalB create failed: ${hospitalBErr.message}`);
    ctx.hospitalB = hospitalB.id;

    ctx.users.patient = await createAuthUser({ label: 'patient', role: 'patient' });
    ctx.users.orgAdminA = await createAuthUser({
      label: 'orgadmin-a',
      role: 'org_admin',
      organizationId: ctx.orgA,
    });
    ctx.users.dispatcherA = await createAuthUser({
      label: 'dispatcher-a',
      role: 'dispatcher',
      organizationId: ctx.orgA,
    });
    ctx.users.dispatcherB = await createAuthUser({
      label: 'dispatcher-b',
      role: 'dispatcher',
      organizationId: ctx.orgB,
    });
    ctx.users.viewerA = await createAuthUser({
      label: 'viewer-a',
      role: 'viewer',
      organizationId: ctx.orgA,
    });
    ctx.users.providerA = await createAuthUser({
      label: 'provider-a',
      role: 'provider',
      providerType: 'driver',
      organizationId: ctx.orgA,
    });

    ctx.userIds.push(
      ctx.users.patient.id,
      ctx.users.orgAdminA.id,
      ctx.users.dispatcherA.id,
      ctx.users.dispatcherB.id,
      ctx.users.viewerA.id,
      ctx.users.providerA.id
    );

    const { error: orgWalletAErr } = await admin.from('organization_wallets').upsert(
      {
        organization_id: ctx.orgA,
        balance: 10000,
      },
      { onConflict: 'organization_id' }
    );
    if (orgWalletAErr) throw new Error(`organization_wallet A upsert failed: ${orgWalletAErr.message}`);

    const { error: orgWalletBErr } = await admin.from('organization_wallets').upsert(
      {
        organization_id: ctx.orgB,
        balance: 10000,
      },
      { onConflict: 'organization_id' }
    );
    if (orgWalletBErr) throw new Error(`organization_wallet B upsert failed: ${orgWalletBErr.message}`);

    const clients = {
      orgAdminA: await signInAs(email('orgadmin-a')),
      dispatcherA: await signInAs(email('dispatcher-a')),
      dispatcherB: await signInAs(email('dispatcher-b')),
      patient: await signInAs(email('patient')),
      viewerA: await signInAs(email('viewer-a')),
      providerA: await signInAs(email('provider-a')),
      anon: createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    };

    const createEmergency = async ({ orgId, hospitalId, status, paymentStatus }) => {
      const { data, error } = await admin
        .from('emergency_requests')
        .insert({
          user_id: ctx.users.patient.id,
          hospital_id: hospitalId,
          hospital_name: `Cash Matrix Hospital ${TAG}`,
          service_type: 'ambulance',
          status,
          payment_status: paymentStatus,
        })
        .select('id')
        .single();
      if (error) throw new Error(`emergency create failed: ${error.message}`);
      ctx.requestIds.push(data.id);
      return data.id;
    };

    const createPendingPayment = async ({ requestId, orgId, amount = 220, feeAmount = 6 }) => {
      const { data, error } = await admin
        .from('payments')
        .insert({
          user_id: ctx.users.patient.id,
          emergency_request_id: requestId,
          organization_id: orgId,
          amount,
          currency: 'USD',
          payment_method: 'cash',
          status: 'pending',
          metadata: { fee_amount: feeAmount },
        })
        .select('id')
        .single();
      if (error) throw new Error(`payment create failed: ${error.message}`);
      ctx.paymentIds.push(data.id);
      return data.id;
    };

    const makePendingCase = async () => {
      const requestId = await createEmergency({
        orgId: ctx.orgA,
        hospitalId: ctx.hospitalA,
        status: 'pending_approval',
        paymentStatus: 'pending',
      });
      const paymentId = await createPendingPayment({
        requestId,
        orgId: ctx.orgA,
      });
      return { requestId, paymentId };
    };

    const makeManualCashCase = async () => {
      const requestId = await createEmergency({
        orgId: ctx.orgA,
        hospitalId: ctx.hospitalA,
        status: 'in_progress',
        paymentStatus: 'pending',
      });

      const { count, error } = await admin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('emergency_request_id', requestId);
      if (error) throw new Error(`count payments failed: ${error.message}`);

      return { requestId, paymentCountBefore: count || 0 };
    };

    const cases = [
      {
        caseId: 'A1',
        role: 'orgAdminA',
        rpc: 'approve_cash_payment',
        expectSuccess: true,
        prepare: makePendingCase,
        buildParams: (s) => ({ p_payment_id: s.paymentId, p_request_id: s.requestId }),
      },
      {
        caseId: 'A2',
        role: 'dispatcherA',
        rpc: 'approve_cash_payment',
        expectSuccess: true,
        prepare: makePendingCase,
        buildParams: (s) => ({ p_payment_id: s.paymentId, p_request_id: s.requestId }),
      },
      {
        caseId: 'A3',
        role: 'patient',
        rpc: 'approve_cash_payment',
        expectSuccess: false,
        prepare: makePendingCase,
        buildParams: (s) => ({ p_payment_id: s.paymentId, p_request_id: s.requestId }),
      },
      {
        caseId: 'A4',
        role: 'viewerA',
        rpc: 'approve_cash_payment',
        expectSuccess: false,
        prepare: makePendingCase,
        buildParams: (s) => ({ p_payment_id: s.paymentId, p_request_id: s.requestId }),
      },
      {
        caseId: 'A5',
        role: 'dispatcherB',
        rpc: 'approve_cash_payment',
        expectSuccess: false,
        prepare: makePendingCase,
        buildParams: (s) => ({ p_payment_id: s.paymentId, p_request_id: s.requestId }),
      },
      {
        caseId: 'A6',
        role: 'anon',
        rpc: 'approve_cash_payment',
        expectSuccess: false,
        prepare: makePendingCase,
        buildParams: (s) => ({ p_payment_id: s.paymentId, p_request_id: s.requestId }),
      },
      {
        caseId: 'D1',
        role: 'orgAdminA',
        rpc: 'decline_cash_payment',
        expectSuccess: true,
        prepare: makePendingCase,
        buildParams: (s) => ({ p_payment_id: s.paymentId, p_request_id: s.requestId }),
      },
      {
        caseId: 'D2',
        role: 'patient',
        rpc: 'decline_cash_payment',
        expectSuccess: false,
        prepare: makePendingCase,
        buildParams: (s) => ({ p_payment_id: s.paymentId, p_request_id: s.requestId }),
      },
      {
        caseId: 'P1',
        role: 'orgAdminA',
        rpc: 'process_cash_payment_v2',
        expectSuccess: true,
        prepare: makeManualCashCase,
        buildParams: (s) => ({
          p_emergency_request_id: s.requestId,
          p_organization_id: ctx.orgA,
          p_amount: 180,
          p_currency: 'USD',
        }),
      },
      {
        caseId: 'P2',
        role: 'dispatcherB',
        rpc: 'process_cash_payment_v2',
        expectSuccess: false,
        prepare: makeManualCashCase,
        buildParams: (s) => ({
          p_emergency_request_id: s.requestId,
          p_organization_id: ctx.orgA,
          p_amount: 180,
          p_currency: 'USD',
        }),
      },
      {
        caseId: 'P3',
        role: 'patient',
        rpc: 'process_cash_payment_v2',
        expectSuccess: false,
        prepare: makeManualCashCase,
        buildParams: (s) => ({
          p_emergency_request_id: s.requestId,
          p_organization_id: ctx.orgA,
          p_amount: 180,
          p_currency: 'USD',
        }),
      },
      {
        caseId: 'L1',
        role: 'orgAdminA',
        rpc: 'process_cash_payment',
        expectSuccess: true,
        prepare: makeManualCashCase,
        buildParams: (s) => ({
          p_emergency_request_id: s.requestId,
          p_organization_id: ctx.orgA,
          p_amount: 180,
        }),
      },
      {
        caseId: 'L2',
        role: 'patient',
        rpc: 'process_cash_payment',
        expectSuccess: false,
        prepare: makeManualCashCase,
        buildParams: (s) => ({
          p_emergency_request_id: s.requestId,
          p_organization_id: ctx.orgA,
          p_amount: 180,
        }),
      },
      {
        caseId: 'L3',
        role: 'anon',
        rpc: 'process_cash_payment',
        expectSuccess: false,
        prepare: makeManualCashCase,
        buildParams: (s) => ({
          p_emergency_request_id: s.requestId,
          p_organization_id: ctx.orgA,
          p_amount: 180,
        }),
      },
    ];

    report.summary.totalCases = cases.length;

    for (const tc of cases) {
      const result = makeResult(tc.caseId, tc.role, tc.rpc, tc.expectSuccess);

      try {
        const setup = await tc.prepare();
        const params = tc.buildParams(setup);
        const client = clients[tc.role];
        const { data, error } = await client.rpc(tc.rpc, params);

        result.rpcData = data || null;
        if (error) {
          result.success = false;
          result.error = error.message;
        } else if (data?.success === false) {
          result.success = false;
          result.error = data.error || 'RPC returned success=false';
        } else {
          result.success = true;
        }

        if (!tc.expectSuccess) {
          if (setup.paymentId) {
            const { data: payRow, error: payErr } = await admin
              .from('payments')
              .select('status')
              .eq('id', setup.paymentId)
              .maybeSingle();
            if (payErr) {
              throw new Error(`post-check payment read failed: ${payErr.message}`);
            }
            if (payRow?.status !== 'pending') {
              throw new Error(`unauthorized ${tc.rpc} mutated payment status=${payRow?.status}`);
            }
          } else if (setup.requestId && typeof setup.paymentCountBefore === 'number') {
            const { count, error: cntErr } = await admin
              .from('payments')
              .select('*', { count: 'exact', head: true })
              .eq('emergency_request_id', setup.requestId);
            if (cntErr) {
              throw new Error(`post-check payment count failed: ${cntErr.message}`);
            }
            if ((count || 0) !== setup.paymentCountBefore) {
              throw new Error(
                `unauthorized ${tc.rpc} created payment rows: before=${setup.paymentCountBefore} after=${count || 0}`
              );
            }
          }
        }
      } catch (error) {
        result.success = false;
        result.error = error.message;
        if (/create failed|count payments failed/.test(error.message)) {
          result.setupError = true;
        }
      }

      const passed = !result.setupError && result.success === tc.expectSuccess;
      if (passed) {
        report.summary.passed += 1;
      } else {
        report.summary.failed += 1;
      }
      result.passed = passed;
      report.results.push(result);

      await safeRun(
        `settle active requests after ${tc.caseId}`,
        async () => {
          await admin
            .from('emergency_requests')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('user_id', ctx.users.patient.id)
            .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived']);
        },
        report.cleanupWarnings
      );
    }
  } finally {
    if (ctx.requestIds.length > 0) {
      const reqIds = [...new Set(ctx.requestIds)];
      await safeRun(
        'delete payments',
        async () => {
          await admin.from('payments').delete().in('emergency_request_id', reqIds);
        },
        report.cleanupWarnings
      );
      await safeRun(
        'delete visits',
        async () => {
          await admin.from('visits').delete().in('request_id', reqIds);
        },
        report.cleanupWarnings
      );
      await safeRun(
        'delete emergency_requests',
        async () => {
          await admin.from('emergency_requests').delete().in('id', reqIds);
        },
        report.cleanupWarnings
      );
    }

    await safeRun(
      'delete hospitals',
      async () => {
        if (ctx.hospitalA) await admin.from('hospitals').delete().eq('id', ctx.hospitalA);
        if (ctx.hospitalB) await admin.from('hospitals').delete().eq('id', ctx.hospitalB);
      },
      report.cleanupWarnings
    );

    await safeRun(
      'delete org wallets',
      async () => {
        if (ctx.orgA) await admin.from('organization_wallets').delete().eq('organization_id', ctx.orgA);
        if (ctx.orgB) await admin.from('organization_wallets').delete().eq('organization_id', ctx.orgB);
      },
      report.cleanupWarnings
    );

    await safeRun(
      'delete organizations',
      async () => {
        if (ctx.orgA) await admin.from('organizations').delete().eq('id', ctx.orgA);
        if (ctx.orgB) await admin.from('organizations').delete().eq('id', ctx.orgB);
      },
      report.cleanupWarnings
    );

    for (const userId of ctx.userIds) {
      await safeRun(
        `delete auth user ${userId}`,
        async () => {
          const { error } = await admin.auth.admin.deleteUser(userId);
          if (error) throw new Error(error.message);
        },
        report.cleanupWarnings
      );
    }

    report.completedAt = new Date().toISOString();
    const outDir = path.join(__dirname, '..', 'validation');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'cash_role_isolation_matrix_report.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`[cash-role-matrix] report: ${outFile}`);
    console.log(
      `[cash-role-matrix] passed=${report.summary.passed} failed=${report.summary.failed} total=${report.summary.totalCases}`
    );

    if (report.summary.failed > 0) {
      throw new Error(
        `cash role-isolation matrix failed: ${report.summary.failed}/${report.summary.totalCases} cases failed`
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[cash-role-matrix] FAIL:', error.message);
    process.exit(1);
  });
