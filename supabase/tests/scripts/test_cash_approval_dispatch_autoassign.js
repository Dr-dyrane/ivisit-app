const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials for test script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const TS = Date.now();
const TEST_TAG = `dispatch-fix-${TS}`;

function email(tag) {
  return `test-${tag}@ivisit-e2e.local`;
}

async function createAuthUser({ email, role, full_name }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'password123!',
    email_confirm: true,
    user_metadata: { full_name, role }
  });
  if (error) throw new Error(`createUser failed for ${email}: ${error.message}`);
  return data.user;
}

async function cleanup(ctx) {
  const errors = [];
  const safe = async (label, fn) => {
    try { await fn(); } catch (e) { errors.push(`${label}: ${e.message}`); }
  };

  if (ctx.paymentId) {
    await safe('delete payment', async () => {
      await supabase.from('payments').delete().eq('id', ctx.paymentId);
    });
  }
  if (ctx.requestId) {
    await safe('delete visits', async () => {
      await supabase.from('visits').delete().eq('request_id', ctx.requestId);
    });
    await safe('delete emergency', async () => {
      await supabase.from('emergency_requests').delete().eq('id', ctx.requestId);
    });
  }
  if (ctx.ambulanceId) {
    await safe('reset/delete ambulance', async () => {
      await supabase.from('ambulances').delete().eq('id', ctx.ambulanceId);
    });
  }
  if (ctx.hospitalId) {
    await safe('delete hospital', async () => {
      await supabase.from('hospitals').delete().eq('id', ctx.hospitalId);
    });
  }
  if (ctx.orgId) {
    await safe('delete org wallet', async () => {
      await supabase.from('organization_wallets').delete().eq('organization_id', ctx.orgId);
    });
    await safe('delete org', async () => {
      await supabase.from('organizations').delete().eq('id', ctx.orgId);
    });
  }
  if (ctx.driverUserId) {
    await safe('delete driver auth user', async () => {
      await supabase.auth.admin.deleteUser(ctx.driverUserId);
    });
  }
  if (ctx.patientUserId) {
    await safe('delete patient auth user', async () => {
      await supabase.auth.admin.deleteUser(ctx.patientUserId);
    });
  }

  if (errors.length) {
    console.warn('[cash-approval-autoassign-test] Cleanup warnings:');
    errors.forEach((e) => console.warn(' -', e));
  }
}

async function run() {
  const ctx = {};
  try {
    console.log(`[cash-approval-autoassign-test] Starting (${TEST_TAG})`);

    // 1) Create isolated patient + driver users (triggers create profiles/wallets)
    const patientUser = await createAuthUser({
      email: email(`${TEST_TAG}-patient`),
      role: 'patient',
      full_name: `Test Patient ${TEST_TAG}`
    });
    const driverUser = await createAuthUser({
      email: email(`${TEST_TAG}-driver`),
      role: 'provider',
      full_name: `Test Driver ${TEST_TAG}`
    });
    ctx.patientUserId = patientUser.id;
    ctx.driverUserId = driverUser.id;

    await supabase.from('profiles').update({
      role: 'provider',
      provider_type: 'driver'
    }).eq('id', driverUser.id);

    // 2) Create isolated org/hospital/ambulance
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: `Test Org ${TEST_TAG}` })
      .select()
      .single();
    if (orgErr) throw new Error(`org create failed: ${orgErr.message}`);
    ctx.orgId = org.id;

    const { data: hospital, error: hospErr } = await supabase
      .from('hospitals')
      .insert({
        organization_id: org.id,
        name: `Test Hospital ${TEST_TAG}`,
        address: '1 Validation Way',
        status: 'available'
      })
      .select()
      .single();
    if (hospErr) throw new Error(`hospital create failed: ${hospErr.message}`);
    ctx.hospitalId = hospital.id;

    await supabase.from('profiles').update({ organization_id: org.id }).eq('id', driverUser.id);

    // Cash approval requires org wallet balance to cover platform fee.
    await supabase
      .from('organization_wallets')
      .update({ balance: 25, updated_at: new Date().toISOString() })
      .eq('organization_id', org.id);

    const { data: ambulance, error: ambErr } = await supabase
      .from('ambulances')
      .insert({
        hospital_id: hospital.id,
        organization_id: org.id,
        profile_id: driverUser.id,
        call_sign: `TEST-${String(TS).slice(-6)}`,
        type: 'basic',
        status: 'available'
      })
      .select()
      .single();
    if (ambErr) throw new Error(`ambulance create failed: ${ambErr.message}`);
    ctx.ambulanceId = ambulance.id;

    // 3) Create cash emergency via atomic RPC (pending_approval)
    const { data: createResult, error: createErr } = await supabase.rpc('create_emergency_v4', {
      p_user_id: patientUser.id,
      p_request_data: {
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        service_type: 'ambulance',
        specialty: 'Emergency Medicine',
        ambulance_type: 'basic',
        patient_location: { lat: 6.5244, lng: 3.3792 },
        patient_snapshot: { fullName: `Test Patient ${TEST_TAG}` }
      },
      p_payment_data: {
        method: 'cash',
        total_amount: 120,
        fee_amount: 3,
        currency: 'USD'
      }
    });
    if (createErr) throw new Error(`create_emergency_v4 failed: ${createErr.message}`);
    if (!createResult?.success) throw new Error(`create_emergency_v4 unsuccessful: ${JSON.stringify(createResult)}`);
    ctx.requestId = createResult.request_id;
    ctx.paymentId = createResult.payment_id;

    const { data: beforeApprove, error: beforeErr } = await supabase
      .from('emergency_requests')
      .select('id,status,payment_status,service_type,ambulance_id,responder_id')
      .eq('id', ctx.requestId)
      .single();
    if (beforeErr) throw new Error(`load emergency before approval failed: ${beforeErr.message}`);
    console.log('[cash-approval-autoassign-test] Before approval:', beforeApprove);

    // 4) Approve cash payment (should now trigger dispatch assignment after fix)
    const { data: approveResult, error: approveErr } = await supabase.rpc('approve_cash_payment', {
      p_payment_id: ctx.paymentId,
      p_request_id: ctx.requestId
    });
    if (approveErr) throw new Error(`approve_cash_payment failed: ${approveErr.message}`);
    if (!approveResult?.success) throw new Error(`approve_cash_payment unsuccessful: ${JSON.stringify(approveResult)}`);

    const { data: afterApprove, error: afterErr } = await supabase
      .from('emergency_requests')
      .select('id,status,payment_status,ambulance_id,responder_id,responder_name')
      .eq('id', ctx.requestId)
      .single();
    if (afterErr) throw new Error(`load emergency after approval failed: ${afterErr.message}`);

    const { data: ambulanceState, error: ambStateErr } = await supabase
      .from('ambulances')
      .select('id,status,current_call,profile_id')
      .eq('id', ctx.ambulanceId)
      .single();
    if (ambStateErr) throw new Error(`load ambulance state failed: ${ambStateErr.message}`);

    const pass =
      afterApprove.status === 'accepted' &&
      afterApprove.payment_status === 'completed' &&
      afterApprove.ambulance_id === ctx.ambulanceId &&
      afterApprove.responder_id === ctx.driverUserId &&
      ambulanceState.current_call === ctx.requestId;

    console.log('[cash-approval-autoassign-test] After approval:', afterApprove);
    console.log('[cash-approval-autoassign-test] Ambulance state:', ambulanceState);

    if (!pass) {
      throw new Error('Dispatch auto-assignment did not occur on cash approval update path');
    }

    console.log('[cash-approval-autoassign-test] PASS');
  } finally {
    await cleanup(ctx);
  }
}

run().catch((error) => {
  console.error('[cash-approval-autoassign-test] FAIL:', error.message);
  process.exit(1);
});
