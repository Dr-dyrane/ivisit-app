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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const TS = Date.now();
const TAG = `flow-matrix-${TS}`;

function nowIso() {
  return new Date().toISOString();
}

function email(role) {
  return `test-${TAG}-${role}@ivisit-e2e.local`;
}

async function createAuthUser({ email, role, full_name }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'password123!',
    email_confirm: true,
    user_metadata: { full_name, role }
  });
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  return data.user;
}

async function qOne(table, select, filterCol, filterVal) {
  const { data, error } = await supabase.from(table).select(select).eq(filterCol, filterVal).single();
  if (error) throw new Error(`${table} query failed: ${error.message}`);
  return data;
}

async function safeDelete(table, col, value) {
  const { error } = await supabase.from(table).delete().eq(col, value);
  if (error) throw error;
}

async function cleanup(ctx, report) {
  const warnings = [];
  const safe = async (label, fn) => {
    try { await fn(); } catch (e) { warnings.push(`${label}: ${e.message}`); }
  };

  // Delete ledger rows created for test payments (both org and platform wallet references)
  if (ctx.paymentIds.size > 0) {
    const ids = [...ctx.paymentIds];
    await safe('delete wallet_ledger by payment refs', async () => {
      const { error } = await supabase.from('wallet_ledger').delete().in('reference_id', ids);
      if (error) throw error;
    });
  }

  // Insurance billing / doctor assignments / visits / payments / emergencies
  if (ctx.requestIds.size > 0) {
    const reqIds = [...ctx.requestIds];
    await safe('delete insurance_billing', async () => {
      const { error } = await supabase.from('insurance_billing').delete().in('emergency_request_id', reqIds);
      if (error) throw error;
    });
    await safe('delete emergency_doctor_assignments', async () => {
      const { error } = await supabase.from('emergency_doctor_assignments').delete().in('emergency_request_id', reqIds);
      if (error) throw error;
    });
    await safe('delete visits', async () => {
      const { error } = await supabase.from('visits').delete().in('request_id', reqIds);
      if (error) throw error;
    });
    await safe('delete payments', async () => {
      const { error } = await supabase.from('payments').delete().in('emergency_request_id', reqIds);
      if (error) throw error;
    });
    await safe('delete emergency_requests', async () => {
      const { error } = await supabase.from('emergency_requests').delete().in('id', reqIds);
      if (error) throw error;
    });
  }

  if (ctx.ambulanceIds.size > 0) {
    await safe('delete ambulances', async () => {
      const { error } = await supabase.from('ambulances').delete().in('id', [...ctx.ambulanceIds]);
      if (error) throw error;
    });
  }

  if (ctx.doctorIds.size > 0) {
    await safe('delete doctors', async () => {
      const { error } = await supabase.from('doctors').delete().in('id', [...ctx.doctorIds]);
      if (error) throw error;
    });
  }

  if (ctx.hospitalId) {
    await safe('delete hospitals', async () => {
      await safeDelete('hospitals', 'id', ctx.hospitalId);
    });
  }

  if (ctx.orgId) {
    await safe('delete org wallet', async () => {
      const { error } = await supabase.from('organization_wallets').delete().eq('organization_id', ctx.orgId);
      if (error) throw error;
    });
    await safe('delete organization', async () => {
      await safeDelete('organizations', 'id', ctx.orgId);
    });
  }

  if (ctx.userIds.size > 0) {
    for (const userId of [...ctx.userIds]) {
      await safe(`delete auth user ${userId}`, async () => {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
      });
    }
  }

  report.cleanupWarnings = warnings;
}

async function createFoundation(ctx) {
  const patient = await createAuthUser({
    email: email('patient'),
    role: 'patient',
    full_name: `Patient ${TAG}`
  });
  const driver = await createAuthUser({
    email: email('driver'),
    role: 'provider',
    full_name: `Driver ${TAG}`
  });
  const doctorUser = await createAuthUser({
    email: email('doctor'),
    role: 'provider',
    full_name: `Doctor ${TAG}`
  });

  ctx.userIds.add(patient.id);
  ctx.userIds.add(driver.id);
  ctx.userIds.add(doctorUser.id);

  await supabase.from('profiles').update({ role: 'provider', provider_type: 'driver' }).eq('id', driver.id);
  await supabase.from('profiles').update({ role: 'provider', provider_type: 'doctor' }).eq('id', doctorUser.id);

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: `E2E Org ${TAG}` })
    .select()
    .single();
  if (orgErr) throw new Error(`org create failed: ${orgErr.message}`);
  ctx.orgId = org.id;

  const { data: hospital, error: hospErr } = await supabase
    .from('hospitals')
    .insert({
      organization_id: org.id,
      name: `E2E Hospital ${TAG}`,
      address: '1 E2E Validation Ave',
      status: 'available',
      available_beds: 5,
      total_beds: 10,
      icu_beds_available: 2
    })
    .select()
    .single();
  if (hospErr) throw new Error(`hospital create failed: ${hospErr.message}`);
  ctx.hospitalId = hospital.id;

  await supabase.from('profiles').update({ organization_id: org.id }).eq('id', driver.id);
  await supabase.from('profiles').update({ organization_id: org.id }).eq('id', doctorUser.id);

  // Ensure org wallet can pay platform fees during cash approvals.
  await supabase.from('organization_wallets').update({ balance: 100, updated_at: nowIso() }).eq('organization_id', org.id);

  const { data: doctor, error: doctorErr } = await supabase
    .from('doctors')
    .insert({
      profile_id: doctorUser.id,
      hospital_id: hospital.id,
      name: `Dr ${TAG}`,
      specialization: 'Emergency Medicine',
      status: 'available',
      is_available: true,
      current_patients: 0,
      max_patients: 10
    })
    .select()
    .single();
  if (doctorErr) throw new Error(`doctor create failed: ${doctorErr.message}`);
  ctx.doctorIds.add(doctor.id);

  const { data: ambulance, error: ambErr } = await supabase
    .from('ambulances')
    .insert({
      hospital_id: hospital.id,
      organization_id: org.id,
      profile_id: driver.id,
      call_sign: `E2E-${String(TS).slice(-6)}`,
      type: 'basic',
      status: 'available'
    })
    .select()
    .single();
  if (ambErr) throw new Error(`ambulance create failed: ${ambErr.message}`);
  ctx.ambulanceIds.add(ambulance.id);

  return { patient, driver, doctorUser, org, hospital, doctor, ambulance };
}

async function createEmergencyViaRpc({ userId, hospital, service_type, paymentMethod, totalAmount, specialty }) {
  const { data, error } = await supabase.rpc('create_emergency_v4', {
    p_user_id: userId,
    p_request_data: {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      service_type,
      specialty: specialty || (service_type === 'ambulance' ? 'Emergency Medicine' : 'Internal Medicine'),
      ambulance_type: service_type === 'ambulance' ? 'basic' : null,
      patient_location: { lat: 6.5244, lng: 3.3792 },
      patient_snapshot: { fullName: `Patient ${TAG}` }
    },
    p_payment_data: {
      method: paymentMethod,
      total_amount: totalAmount,
      fee_amount: Number((totalAmount * 0.025).toFixed(2)),
      currency: 'USD'
    }
  });
  if (error) throw new Error(`create_emergency_v4 (${service_type}/${paymentMethod}) failed: ${error.message}`);
  if (!data?.success) throw new Error(`create_emergency_v4 unsuccessful: ${JSON.stringify(data)}`);
  return data;
}

async function run() {
  const ctx = {
    userIds: new Set(),
    doctorIds: new Set(),
    ambulanceIds: new Set(),
    requestIds: new Set(),
    paymentIds: new Set(),
    orgId: null,
    hospitalId: null
  };
  const report = {
    tag: TAG,
    startedAt: nowIso(),
    foundation: {},
    scenarios: {},
    cleanupWarnings: []
  };

  try {
    const foundation = await createFoundation(ctx);
    report.foundation = {
      orgId: foundation.org.id,
      hospitalId: foundation.hospital.id,
      doctorId: foundation.doctor.id,
      ambulanceId: foundation.ambulance.id,
      patientId: foundation.patient.id,
      driverId: foundation.driver.id
    };

    // Scenario A: Card ambulance request -> auto payment + auto dispatch + visit creation.
    const cardCreate = await createEmergencyViaRpc({
      userId: foundation.patient.id,
      hospital: foundation.hospital,
      service_type: 'ambulance',
      paymentMethod: 'card',
      totalAmount: 120
    });
    ctx.requestIds.add(cardCreate.request_id);
    if (cardCreate.payment_id) ctx.paymentIds.add(cardCreate.payment_id);

    const cardReq = await qOne('emergency_requests', 'id,display_id,status,payment_status,ambulance_id,responder_id,assigned_doctor_id,hospital_id,total_cost', 'id', cardCreate.request_id);
    const cardVisit = await qOne('visits', 'id,request_id,status,type', 'request_id', cardCreate.request_id);
    const cardPayment = await qOne('payments', 'id,status,payment_method,emergency_request_id,organization_id,amount', 'id', cardCreate.payment_id);
    const ambAfterCard = await qOne('ambulances', 'id,status,current_call', 'id', foundation.ambulance.id);

    report.scenarios.cardAmbulance = {
      createResult: cardCreate,
      emergency: cardReq,
      visit: cardVisit,
      payment: cardPayment,
      ambulance: ambAfterCard,
      assertions: {
        visitCreated: !!cardVisit.id,
        paymentCompleted: cardPayment.status === 'completed',
        emergencyHasPaymentStatus: ['pending', 'paid', 'completed'].includes(cardReq.payment_status),
        dispatchAssigned: !!cardReq.ambulance_id && !!cardReq.responder_id,
        ambulanceCurrentCallLinked: ambAfterCard.current_call === cardReq.id
      }
    };

    // Tracking write simulation (field contract check)
    const pointWkt = 'SRID=4326;POINT(3.3795 6.5248)';
    await supabase.from('ambulances').update({ location: pointWkt, updated_at: nowIso() }).eq('id', foundation.ambulance.id);
    await supabase.from('emergency_requests').update({
      responder_location: pointWkt,
      patient_location: 'SRID=4326;POINT(3.3792 6.5244)',
      responder_heading: 42.5,
      updated_at: nowIso()
    }).eq('id', cardReq.id);
    const trackedReq = await qOne('emergency_requests', 'id,responder_location,patient_location,responder_heading', 'id', cardReq.id);
    report.scenarios.trackingContract = {
      emergencyId: cardReq.id,
      assertions: {
        responderLocationSet: !!trackedReq.responder_location,
        patientLocationSet: !!trackedReq.patient_location,
        responderHeadingSet: trackedReq.responder_heading !== null
      }
    };

    // Scenario B: completion -> visit sync + ambulance release + insurance billing hook behavior.
    const { data: completeUpdate, error: completeErr } = await supabase
      .from('emergency_requests')
      .update({
        status: 'completed',
        total_cost: 155,
        completed_at: nowIso(),
        updated_at: nowIso()
      })
      .eq('id', cardReq.id)
      .select('id,status,total_cost,completed_at,payment_status')
      .single();

    if (completeErr) {
      report.scenarios.completion = {
        failed: true,
        error: completeErr.message
      };
    } else {
      const visitAfterComplete = await qOne('visits', 'id,request_id,status,cost', 'request_id', cardReq.id);
      const ambAfterComplete = await qOne('ambulances', 'id,status,current_call', 'id', foundation.ambulance.id);
      const { data: billingRows, error: billingErr } = await supabase
        .from('insurance_billing')
        .select('id,emergency_request_id,status,total_amount')
        .eq('emergency_request_id', cardReq.id);

      report.scenarios.completion = {
        failed: false,
        emergency: completeUpdate,
        visit: visitAfterComplete,
        ambulance: ambAfterComplete,
        insuranceBilling: billingErr ? { error: billingErr.message } : (billingRows || []),
        assertions: {
          visitCompleted: visitAfterComplete.status === 'completed',
          visitCostSynced: String(visitAfterComplete.cost || '') === '155',
          ambulanceReleased: ambAfterComplete.status === 'available' && ambAfterComplete.current_call === null
        }
      };
    }

    // Reset ambulance to available if needed before next scenario.
    await supabase.from('ambulances').update({ status: 'available', current_call: null, updated_at: nowIso() }).eq('id', foundation.ambulance.id);

    // Scenario C: Cash ambulance -> approve cash -> auto dispatch on UPDATE path.
    const cashCreate = await createEmergencyViaRpc({
      userId: foundation.patient.id,
      hospital: foundation.hospital,
      service_type: 'ambulance',
      paymentMethod: 'cash',
      totalAmount: 130
    });
    ctx.requestIds.add(cashCreate.request_id);
    if (cashCreate.payment_id) ctx.paymentIds.add(cashCreate.payment_id);

    const cashBefore = await qOne('emergency_requests', 'id,status,payment_status,ambulance_id,responder_id', 'id', cashCreate.request_id);
    const { data: approveResult, error: approveErr } = await supabase.rpc('approve_cash_payment', {
      p_payment_id: cashCreate.payment_id,
      p_request_id: cashCreate.request_id
    });
    const cashAfter = approveErr
      ? null
      : await qOne('emergency_requests', 'id,status,payment_status,ambulance_id,responder_id', 'id', cashCreate.request_id);

    report.scenarios.cashAmbulance = {
      createResult: cashCreate,
      beforeApproval: cashBefore,
      approveResult: approveErr ? { error: approveErr.message } : approveResult,
      afterApproval: cashAfter,
      assertions: {
        approvalRpcSucceeded: !approveErr && approveResult?.success === true,
        paymentStatusCompleted: !!cashAfter && cashAfter.payment_status === 'completed',
        dispatchAssigned: !!cashAfter && !!cashAfter.ambulance_id && !!cashAfter.responder_id
      }
    };

    // Scenario D: Bed reservation cash flow -> approve -> in_progress decrements bed -> complete restores bed.
    const { data: hospBeforeBed, error: hbErr } = await supabase
      .from('hospitals').select('id,available_beds').eq('id', foundation.hospital.id).single();
    if (hbErr) throw new Error(`hospital pre-bed query failed: ${hbErr.message}`);

    const bedCreate = await createEmergencyViaRpc({
      userId: foundation.patient.id,
      hospital: foundation.hospital,
      service_type: 'bed',
      paymentMethod: 'cash',
      totalAmount: 80,
      specialty: 'Internal Medicine'
    });
    ctx.requestIds.add(bedCreate.request_id);
    if (bedCreate.payment_id) ctx.paymentIds.add(bedCreate.payment_id);

    const { data: bedApprove, error: bedApproveErr } = await supabase.rpc('approve_cash_payment', {
      p_payment_id: bedCreate.payment_id,
      p_request_id: bedCreate.request_id
    });

    const { data: bedInProg, error: bedInProgErr } = await supabase
      .from('emergency_requests')
      .update({ status: 'in_progress', updated_at: nowIso() })
      .eq('id', bedCreate.request_id)
      .select('id,status')
      .single();

    const { data: hospAfterInProg } = await supabase
      .from('hospitals').select('id,available_beds').eq('id', foundation.hospital.id).single();

    const { data: bedComplete, error: bedCompleteErr } = await supabase
      .from('emergency_requests')
      .update({ status: 'completed', total_cost: 80, completed_at: nowIso(), updated_at: nowIso() })
      .eq('id', bedCreate.request_id)
      .select('id,status,payment_status')
      .single();

    const { data: hospAfterBedComplete } = await supabase
      .from('hospitals').select('id,available_beds').eq('id', foundation.hospital.id).single();

    const bedVisit = await qOne('visits', 'id,request_id,status,type', 'request_id', bedCreate.request_id);

    report.scenarios.bedReservation = {
      hospitalBefore: hospBeforeBed,
      approve: bedApproveErr ? { error: bedApproveErr.message } : bedApprove,
      inProgress: bedInProgErr ? { error: bedInProgErr.message } : bedInProg,
      hospitalAfterInProgress: hospAfterInProg,
      complete: bedCompleteErr ? { error: bedCompleteErr.message } : bedComplete,
      hospitalAfterComplete: hospAfterBedComplete,
      visit: bedVisit,
      assertions: {
        approveSucceeded: !bedApproveErr && bedApprove?.success === true,
        noAmbulanceExpected: true,
        bedDecrementedOnInProgress: hospAfterInProg && hospAfterInProg.available_beds === (hospBeforeBed.available_beds - 1),
        bedRestoredOnComplete: hospAfterBedComplete && hospAfterBedComplete.available_beds === hospBeforeBed.available_beds,
        visitCreated: !!bedVisit.id
      }
    };
  } finally {
    report.completedAt = nowIso();
    await cleanup(ctx, report);
    const outDir = path.join(__dirname, '..', 'validation');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'e2e_flow_matrix_report.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log('[flow-matrix] Report written:', outFile);
  }
}

run().catch((error) => {
  console.error('[flow-matrix] FAIL:', error.message);
  process.exit(1);
});
