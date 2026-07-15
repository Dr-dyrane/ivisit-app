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
  const fullName = `Cash Matrix ${label}`;
  const { data, error } = await admin.auth.admin.createUser({
    email: email(label),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    throw new Error(`createUser(${label}) failed: ${error.message}`);
  }

  const patch = {
    role,
    organization_id: organizationId,
    full_name: fullName,
    onboarding_status: 'complete',
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

async function settleActiveEmergencyRequestsForUser(userId) {
  const { data: activeRequests, error: activeError } = await admin
    .from('emergency_requests')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived']);
  if (activeError) {
    throw new Error(`active request lookup failed: ${activeError.message}`);
  }

  for (const request of activeRequests || []) {
    const { data, error } = await admin.rpc('console_cancel_emergency', {
      p_request_id: request.id,
      p_reason: 'cash role matrix cleanup',
    });
    if (error) {
      throw new Error(`canonical request cleanup failed: ${error.message}`);
    }
    if (data?.success === false) {
      throw new Error(`canonical request cleanup rejected: ${data.error || 'unknown error'}`);
    }
  }
}

async function deleteEmergencyRequestsWithTransitionCascade(requestIds) {
  const ids = [...new Set((requestIds || []).filter(Boolean))];
  if (ids.length === 0) return;

  const literals = ids.map((id) => `'${id}'::uuid`).join(', ');
  const sql = `
DO $$
BEGIN
  ALTER TABLE public.emergency_requests
    DISABLE TRIGGER on_emergency_start_dispatch;
  ALTER TABLE public.emergency_responder_assignments
    DISABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_status_transitions
    DISABLE TRIGGER trg_emergency_status_transitions_append_only;

  DELETE FROM public.emergency_responder_assignments
  WHERE emergency_request_id IN (${literals});

  DELETE FROM public.emergency_status_transitions
  WHERE emergency_request_id IN (${literals});

  DELETE FROM public.emergency_requests
  WHERE id IN (${literals});

  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  ALTER TABLE public.emergency_responder_assignments
    ENABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_requests
    ENABLE TRIGGER on_emergency_start_dispatch;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  ALTER TABLE public.emergency_responder_assignments
    ENABLE TRIGGER trg_protect_emergency_responder_assignment_history;
  ALTER TABLE public.emergency_requests
    ENABLE TRIGGER on_emergency_start_dispatch;
  RAISE;
END;
$$;
  `;

  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`delete emergency request graphs failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`delete emergency request graphs rejected: ${data?.error || 'unknown error'}`);
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
    visitIds: [],
    paymentIds: [],
    mappingEntityIds: [],
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

  const trackEntityIds = (...ids) => {
    ctx.mappingEntityIds.push(...ids.filter(Boolean));
  };

  const createTrackedAuthUser = async (options) => {
    const user = await createAuthUser(options);
    ctx.userIds.push(user.id);
    trackEntityIds(user.id);
    return user;
  };

  try {
    const { data: orgA, error: orgAErr } = await admin
      .from('organizations')
      .insert({
        name: `Cash Matrix Org A ${TAG}`,
        organization_type: 'hospital',
        registration_number: `${TAG}-A`,
        contact_email: email('org-a-contact'),
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        is_active: true,
        ivisit_fee_percentage: 0,
      })
      .select()
      .single();
    if (orgAErr) throw new Error(`orgA create failed: ${orgAErr.message}`);
    ctx.orgA = orgA.id;
    trackEntityIds(orgA.id);

    const { data: orgB, error: orgBErr } = await admin
      .from('organizations')
      .insert({
        name: `Cash Matrix Org B ${TAG}`,
        organization_type: 'hospital',
        registration_number: `${TAG}-B`,
        contact_email: email('org-b-contact'),
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        is_active: true,
        ivisit_fee_percentage: 0,
      })
      .select()
      .single();
    if (orgBErr) throw new Error(`orgB create failed: ${orgBErr.message}`);
    ctx.orgB = orgB.id;
    trackEntityIds(orgB.id);

    const { data: hospitalA, error: hospitalAErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: ctx.orgA,
        name: `Cash Matrix Hospital A ${TAG}`,
        address: '1 Cash Matrix Way',
        status: 'available',
        verified: true,
        verification_status: 'verified',
        emergency_eligible: true,
        dispatch_eligible: true,
        available_beds: 8,
        total_beds: 30,
      })
      .select()
      .single();
    if (hospitalAErr) throw new Error(`hospitalA create failed: ${hospitalAErr.message}`);
    ctx.hospitalA = hospitalA.id;
    trackEntityIds(hospitalA.id);

    const { data: hospitalB, error: hospitalBErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: ctx.orgB,
        name: `Cash Matrix Hospital B ${TAG}`,
        address: '2 Cash Matrix Way',
        status: 'available',
        verified: true,
        verification_status: 'verified',
        emergency_eligible: true,
        dispatch_eligible: true,
        available_beds: 8,
        total_beds: 30,
      })
      .select()
      .single();
    if (hospitalBErr) throw new Error(`hospitalB create failed: ${hospitalBErr.message}`);
    ctx.hospitalB = hospitalB.id;
    trackEntityIds(hospitalB.id);

    ctx.users.patient = await createTrackedAuthUser({ label: 'patient', role: 'patient' });
    ctx.users.orgAdminA = await createTrackedAuthUser({
      label: 'orgadmin-a',
      role: 'org_admin',
      organizationId: ctx.orgA,
    });
    ctx.users.dispatcherA = await createTrackedAuthUser({
      label: 'dispatcher-a',
      role: 'dispatcher',
      organizationId: ctx.orgA,
    });
    ctx.users.dispatcherB = await createTrackedAuthUser({
      label: 'dispatcher-b',
      role: 'dispatcher',
      organizationId: ctx.orgB,
    });
    ctx.users.viewerA = await createTrackedAuthUser({
      label: 'viewer-a',
      role: 'viewer',
      organizationId: ctx.orgA,
    });
    ctx.users.providerA = await createTrackedAuthUser({
      label: 'provider-a',
      role: 'provider',
      providerType: 'driver',
      organizationId: ctx.orgA,
    });

    const { data: walletA, error: orgWalletAErr } = await admin.from('organization_wallets').upsert(
      {
        organization_id: ctx.orgA,
        balance: 10000,
      },
      { onConflict: 'organization_id' }
    ).select('id').single();
    if (orgWalletAErr) throw new Error(`organization_wallet A upsert failed: ${orgWalletAErr.message}`);
    trackEntityIds(walletA.id);

    const { data: walletB, error: orgWalletBErr } = await admin.from('organization_wallets').upsert(
      {
        organization_id: ctx.orgB,
        balance: 10000,
      },
      { onConflict: 'organization_id' }
    ).select('id').single();
    if (orgWalletBErr) throw new Error(`organization_wallet B upsert failed: ${orgWalletBErr.message}`);
    trackEntityIds(walletB.id);

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
          dispatch_organization_id: orgId,
          status,
          payment_status: paymentStatus,
        })
        .select('id')
        .single();
      if (error) throw new Error(`emergency create failed: ${error.message}`);

      const { data: existingVisits, error: existingVisitsErr } = await admin
        .from('visits')
        .select('id')
        .eq('request_id', data.id)
        .limit(1);
      if (existingVisitsErr) throw new Error(`visit lookup failed: ${existingVisitsErr.message}`);

      if (!existingVisits || existingVisits.length === 0) {
        const { data: insertedVisit, error: visitErr } = await admin
          .from('visits')
          .insert({
            user_id: ctx.users.patient.id,
            hospital_id: hospitalId,
            request_id: data.id,
            status: status === 'completed' ? 'completed' : (status === 'cancelled' ? 'cancelled' : 'pending'),
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toISOString().slice(11, 19),
            type: 'emergency',
          })
          .select('id')
          .single();
        if (visitErr) throw new Error(`visit create failed: ${visitErr.message}`);
        ctx.visitIds.push(insertedVisit.id);
        trackEntityIds(insertedVisit.id);
      } else {
        const visitIds = existingVisits.map((visit) => visit.id);
        ctx.visitIds.push(...visitIds);
        trackEntityIds(...visitIds);
      }

      ctx.requestIds.push(data.id);
      trackEntityIds(data.id);
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
      trackEntityIds(data.id);

      const { error: linkError } = await admin
        .from('emergency_requests')
        .update({ payment_id: data.id })
        .eq('id', requestId);
      if (linkError) throw new Error(`payment link failed: ${linkError.message}`);
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
          await settleActiveEmergencyRequestsForUser(ctx.users.patient.id);
        },
        report.cleanupWarnings
      );
    }
  } finally {
    if (ctx.users.patient?.id) {
      await safeRun(
        'settle remaining active requests',
        async () => {
          await settleActiveEmergencyRequestsForUser(ctx.users.patient.id);
        },
        report.cleanupWarnings
      );
    }

    let emergencyRowsDeleted = true;
    if (ctx.requestIds.length > 0) {
      const reqIds = [...new Set(ctx.requestIds)];

      await safeRun(
        'capture generated visits and payments',
        async () => {
          const [{ data: visits, error: visitsError }, { data: payments, error: paymentsError }] =
            await Promise.all([
              admin.from('visits').select('id').in('request_id', reqIds),
              admin.from('payments').select('id').in('emergency_request_id', reqIds),
            ]);
          if (visitsError) throw new Error(visitsError.message);
          if (paymentsError) throw new Error(paymentsError.message);
          const visitIds = (visits || []).map((row) => row.id);
          const paymentIds = (payments || []).map((row) => row.id);
          ctx.visitIds.push(...visitIds);
          ctx.paymentIds.push(...paymentIds);
          trackEntityIds(...visitIds, ...paymentIds);
        },
        report.cleanupWarnings
      );

      await safeRun(
        'delete emergency doctor assignments',
        async () => {
          const { error } = await admin
            .from('emergency_doctor_assignments')
            .delete()
            .in('emergency_request_id', reqIds);
          if (error) throw new Error(error.message);
        },
        report.cleanupWarnings
      );

      await safeRun(
        'delete visits',
        async () => {
          const visitIds = [...new Set(ctx.visitIds.filter(Boolean))];
          if (visitIds.length > 0) {
            const { error } = await admin.from('visits').delete().in('id', visitIds);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );

      try {
        await deleteEmergencyRequestsWithTransitionCascade(reqIds);
      } catch (error) {
        emergencyRowsDeleted = false;
        report.cleanupWarnings.push(`delete emergency request graphs: ${error.message}`);
      }

      await safeRun(
        'delete payments',
        async () => {
          const paymentIds = [...new Set(ctx.paymentIds.filter(Boolean))];
          if (paymentIds.length > 0) {
            const { error } = await admin.from('payments').delete().in('id', paymentIds);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );

      if (!emergencyRowsDeleted) {
        report.cleanupWarnings.push('skipped dependent cleanup because emergency request graph deletion failed');
      }
    }

    if (emergencyRowsDeleted) {
      await safeRun(
        'delete hospitals',
        async () => {
          if (ctx.hospitalA) {
            const { error } = await admin.from('hospitals').delete().eq('id', ctx.hospitalA);
            if (error) throw new Error(error.message);
          }
          if (ctx.hospitalB) {
            const { error } = await admin.from('hospitals').delete().eq('id', ctx.hospitalB);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );

      await safeRun(
        'delete org wallets',
        async () => {
          if (ctx.orgA) {
            const { error } = await admin.from('organization_wallets').delete().eq('organization_id', ctx.orgA);
            if (error) throw new Error(error.message);
          }
          if (ctx.orgB) {
            const { error } = await admin.from('organization_wallets').delete().eq('organization_id', ctx.orgB);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );

      await safeRun(
        'delete organizations',
        async () => {
          if (ctx.orgA) {
            const { error } = await admin.from('organizations').delete().eq('id', ctx.orgA);
            if (error) throw new Error(error.message);
          }
          if (ctx.orgB) {
            const { error } = await admin.from('organizations').delete().eq('id', ctx.orgB);
            if (error) throw new Error(error.message);
          }
        },
        report.cleanupWarnings
      );
    } else {
      report.cleanupWarnings.push('skipped foundation cleanup because emergency_requests delete failed');
    }

    await safeRun(
      'delete generated notifications',
      async () => {
        if (ctx.userIds.length > 0) {
          const { data: rows, error: readError } = await admin
            .from('notifications')
            .select('id')
            .in('user_id', ctx.userIds);
          if (readError) throw new Error(readError.message);
          trackEntityIds(...(rows || []).map((row) => row.id));
          const { error } = await admin.from('notifications').delete().in('user_id', ctx.userIds);
          if (error) throw new Error(error.message);
        }
      },
      report.cleanupWarnings
    );

    await safeRun(
      'delete generated user activity',
      async () => {
        if (ctx.userIds.length > 0) {
          const { error } = await admin.from('user_activity').delete().in('user_id', ctx.userIds);
          if (error) throw new Error(error.message);
        }
      },
      report.cleanupWarnings
    );

    await safeRun(
      'delete generated admin audit rows',
      async () => {
        if (ctx.userIds.length > 0) {
          const { error } = await admin.from('admin_audit_log').delete().in('admin_id', ctx.userIds);
          if (error) throw new Error(error.message);
        }
      },
      report.cleanupWarnings
    );

    await safeRun(
      'delete generated patient wallets',
      async () => {
        if (ctx.userIds.length > 0) {
          const { data: rows, error: readError } = await admin
            .from('patient_wallets')
            .select('id')
            .in('user_id', ctx.userIds);
          if (readError) throw new Error(readError.message);
          trackEntityIds(...(rows || []).map((row) => row.id));
          const { error } = await admin.from('patient_wallets').delete().in('user_id', ctx.userIds);
          if (error) throw new Error(error.message);
        }
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

    await safeRun(
      'delete generated identity mappings',
      async () => {
        const entityIds = [...new Set(ctx.mappingEntityIds.filter(Boolean))];
        if (entityIds.length > 0) {
          const { error } = await admin.from('id_mappings').delete().in('entity_id', entityIds);
          if (error) throw new Error(error.message);
        }
      },
      report.cleanupWarnings
    );

    report.completedAt = new Date().toISOString();
    const outDir = path.join(__dirname, '..', 'validation');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'cash_role_isolation_matrix_report.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`[cash-role-matrix] report: ${outFile}`);
    console.log(
      `[cash-role-matrix] passed=${report.summary.passed} failed=${report.summary.failed} total=${report.summary.totalCases}`
    );

    if (report.summary.failed > 0 || report.cleanupWarnings.length > 0) {
      process.exitCode = 1;
    }
  }
}

main()
  .then(() => process.exit(process.exitCode || 0))
  .catch((error) => {
    console.error('[cash-role-matrix] FAIL:', error.message);
    process.exit(1);
  });
