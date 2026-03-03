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

async function deleteEmergencyRequestsWithTransitionCascade(requestIds) {
  const ids = [...new Set((requestIds || []).filter(Boolean))];
  if (ids.length === 0) return;

  const literals = ids.map((id) => `'${id}'::uuid`).join(', ');
  const sql = `
DO $$
BEGIN
  ALTER TABLE public.emergency_status_transitions
    DISABLE TRIGGER trg_emergency_status_transitions_append_only;

  DELETE FROM public.emergency_requests
  WHERE id IN (${literals});

  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  RAISE;
END;
$$;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`delete emergency_requests via exec_sql failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`delete emergency_requests via exec_sql rejected: ${data?.error || 'unknown error'}`);
  }
}

async function cleanup(ctx, report) {
  const warnings = [];
  let emergencyRowsDeleted = true;
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
    await safe('delete emergency_requests', async () => {
      await deleteEmergencyRequestsWithTransitionCascade(reqIds);
    });

    if (emergencyRowsDeleted) {
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
        let q = supabase.from('payments').delete().in('emergency_request_id', reqIds);
        if (ctx.paymentIds.size > 0) {
          q = q.or(`id.in.(${[...ctx.paymentIds].join(',')})`);
        }
        const { error } = await q;
        if (error) throw error;
      });
      await safe('delete org payments', async () => {
        if (!ctx.orgId) return;
        const { error } = await supabase.from('payments').delete().eq('organization_id', ctx.orgId);
        if (error) throw error;
      });
    } else {
      warnings.push('skipped dependent cleanup because emergency_requests delete failed');
    }
  }

  if (!emergencyRowsDeleted) {
    warnings.push('skipped foundation cleanup because emergency_requests delete failed');
  }

  if (emergencyRowsDeleted && ctx.ambulanceIds.size > 0) {
    await safe('delete ambulances', async () => {
      const { error } = await supabase.from('ambulances').delete().in('id', [...ctx.ambulanceIds]);
      if (error) throw error;
    });
  }

  if (emergencyRowsDeleted && ctx.doctorIds.size > 0) {
    await safe('delete doctors', async () => {
      const { error } = await supabase.from('doctors').delete().in('id', [...ctx.doctorIds]);
      if (error) throw error;
    });
  }

  if (emergencyRowsDeleted && ctx.hospitalId) {
    await safe('delete hospitals', async () => {
      await safeDelete('hospitals', 'id', ctx.hospitalId);
    });
  }

  if (emergencyRowsDeleted && ctx.orgId) {
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

  const doctorPayload = {
    profile_id: doctorUser.id,
    hospital_id: hospital.id,
    name: `Dr ${TAG}`,
    specialization: 'Emergency Medicine',
    status: 'available',
    is_available: true,
    current_patients: 0,
    max_patients: 10
  };
  const { data: existingDoctors, error: existingDoctorErr } = await supabase
    .from('doctors')
    .select('id')
    .eq('profile_id', doctorUser.id)
    .limit(1);
  if (existingDoctorErr) throw new Error(`doctor lookup failed: ${existingDoctorErr.message}`);

  let doctor;
  if (existingDoctors?.length) {
    const { data: updatedDoctor, error: updateDoctorErr } = await supabase
      .from('doctors')
      .update(doctorPayload)
      .eq('id', existingDoctors[0].id)
      .select()
      .single();
    if (updateDoctorErr) throw new Error(`doctor update failed: ${updateDoctorErr.message}`);
    doctor = updatedDoctor;
  } else {
    const { data: createdDoctor, error: createDoctorErr } = await supabase
      .from('doctors')
      .insert(doctorPayload)
      .select()
      .single();
    if (createDoctorErr) throw new Error(`doctor create failed: ${createDoctorErr.message}`);
    doctor = createdDoctor;
  }
  ctx.doctorIds.add(doctor.id);

  const ambulancePayload = {
    hospital_id: hospital.id,
    organization_id: org.id,
    profile_id: driver.id,
    call_sign: `E2E-${String(TS).slice(-6)}`,
    type: 'basic',
    status: 'available'
  };
  const { data: existingAmbulances, error: existingAmbErr } = await supabase
    .from('ambulances')
    .select('id')
    .eq('profile_id', driver.id)
    .limit(1);
  if (existingAmbErr) throw new Error(`ambulance lookup failed: ${existingAmbErr.message}`);

  let ambulance;
  if (existingAmbulances?.length) {
    const { data: updatedAmbulance, error: updateAmbErr } = await supabase
      .from('ambulances')
      .update(ambulancePayload)
      .eq('id', existingAmbulances[0].id)
      .select()
      .single();
    if (updateAmbErr) throw new Error(`ambulance update failed: ${updateAmbErr.message}`);
    ambulance = updatedAmbulance;
  } else {
    const { data: createdAmbulance, error: createAmbErr } = await supabase
      .from('ambulances')
      .insert(ambulancePayload)
      .select()
      .single();
    if (createAmbErr) throw new Error(`ambulance create failed: ${createAmbErr.message}`);
    ambulance = createdAmbulance;
  }
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
    const { data: cardDoctorAssignments, error: cardDoctorAssignmentsErr } = await supabase
      .from('emergency_doctor_assignments')
      .select('doctor_id,status')
      .eq('emergency_request_id', cardReq.id);

    report.scenarios.cardAmbulance = {
      createResult: cardCreate,
      emergency: cardReq,
      visit: cardVisit,
      payment: cardPayment,
      ambulance: ambAfterCard,
      doctorAssignments: cardDoctorAssignmentsErr ? { error: cardDoctorAssignmentsErr.message } : (cardDoctorAssignments || []),
      assertions: {
        visitCreated: !!cardVisit.id,
        paymentCompleted: cardPayment.status === 'completed',
        emergencyHasPaymentStatus: ['pending', 'paid', 'completed'].includes(cardReq.payment_status),
        dispatchAssigned: !!cardReq.ambulance_id && !!cardReq.responder_id,
        ambulanceCurrentCallLinked: ambAfterCard.current_call === cardReq.id,
        doctorAutoAssigned: !!cardReq.assigned_doctor_id,
        doctorAssignmentRowExists:
          !cardDoctorAssignmentsErr &&
          (cardDoctorAssignments || []).some((row) => row.status === 'assigned' && row.doctor_id === cardReq.assigned_doctor_id)
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
    await supabase
      .from('emergency_requests')
      .update({
        total_cost: 155,
        updated_at: nowIso()
      })
      .eq('id', cardReq.id);

    const { data: completeRpc, error: completeErr } = await supabase.rpc('complete_trip', {
      request_uuid: cardReq.id
    });

    if (completeErr || completeRpc !== true) {
      report.scenarios.completion = {
        failed: true,
        error: completeErr ? completeErr.message : 'complete_trip returned false'
      };
    } else {
      const completeUpdate = await qOne(
        'emergency_requests',
        'id,status,total_cost,completed_at,payment_status,assigned_doctor_id,doctor_assigned_at',
        'id',
        cardReq.id
      );
      const visitAfterComplete = await qOne('visits', 'id,request_id,status,cost', 'request_id', cardReq.id);
      const ambAfterComplete = await qOne('ambulances', 'id,status,current_call', 'id', foundation.ambulance.id);
      const doctorAfterComplete = await qOne('doctors', 'id,current_patients', 'id', foundation.doctor.id);
      const { data: doctorAssignmentsAfterComplete, error: doctorAssignmentsAfterCompleteErr } = await supabase
        .from('emergency_doctor_assignments')
        .select('doctor_id,status')
        .eq('emergency_request_id', cardReq.id);
      const { data: billingRows, error: billingErr } = await supabase
        .from('insurance_billing')
        .select('id,emergency_request_id,status,total_amount')
        .eq('emergency_request_id', cardReq.id);

      report.scenarios.completion = {
        failed: false,
        emergency: completeUpdate,
        visit: visitAfterComplete,
        ambulance: ambAfterComplete,
        doctor: doctorAfterComplete,
        doctorAssignments: doctorAssignmentsAfterCompleteErr
          ? { error: doctorAssignmentsAfterCompleteErr.message }
          : (doctorAssignmentsAfterComplete || []),
        insuranceBilling: billingErr ? { error: billingErr.message } : (billingRows || []),
        assertions: {
          visitCompleted: visitAfterComplete.status === 'completed',
          visitCostSynced: String(visitAfterComplete.cost || '') === '155',
          ambulanceReleased: ambAfterComplete.status === 'available' && ambAfterComplete.current_call === null,
          doctorLinkCleared: completeUpdate.assigned_doctor_id === null && completeUpdate.doctor_assigned_at === null,
          doctorCounterReleased: Number(doctorAfterComplete.current_patients || 0) === 0,
          assignmentRowsTerminal:
            !doctorAssignmentsAfterCompleteErr &&
            (doctorAssignmentsAfterComplete || []).every((row) => row.status !== 'assigned')
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

    // Scenario D: Bed reservation cash flow -> approve -> active status decrements bed -> complete restores bed.
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

    const bedAfterApprove = bedApproveErr
      ? null
      : await qOne('emergency_requests', 'id,status,payment_status', 'id', bedCreate.request_id);

    const { data: hospAfterApprove } = await supabase
      .from('hospitals').select('id,available_beds').eq('id', foundation.hospital.id).single();

    await supabase
      .from('emergency_requests')
      .update({ total_cost: 80, updated_at: nowIso() })
      .eq('id', bedCreate.request_id);

    const { data: bedCompleteRpc, error: bedCompleteErr } = await supabase.rpc('discharge_patient', {
      request_uuid: bedCreate.request_id
    });

    let bedComplete = null;
    if (!bedCompleteErr && bedCompleteRpc === true) {
      bedComplete = await qOne(
        'emergency_requests',
        'id,status,payment_status',
        'id',
        bedCreate.request_id
      );
    }

    const { data: hospAfterBedComplete } = await supabase
      .from('hospitals').select('id,available_beds').eq('id', foundation.hospital.id).single();

    const bedVisit = await qOne('visits', 'id,request_id,status,type', 'request_id', bedCreate.request_id);

    report.scenarios.bedReservation = {
      hospitalBefore: hospBeforeBed,
      approve: bedApproveErr ? { error: bedApproveErr.message } : bedApprove,
      afterApproval: bedAfterApprove,
      hospitalAfterApproval: hospAfterApprove,
      complete: bedCompleteErr
        ? { error: bedCompleteErr.message }
        : (bedCompleteRpc === true ? bedComplete : { error: 'discharge_patient returned false' }),
      hospitalAfterComplete: hospAfterBedComplete,
      visit: bedVisit,
      assertions: {
        approveSucceeded: !bedApproveErr && bedApprove?.success === true,
        noAmbulanceExpected: true,
        bedRequestActivated: !!bedAfterApprove && ['accepted', 'arrived', 'in_progress'].includes(bedAfterApprove.status),
        bedDecrementedOnActivation: hospAfterApprove && hospAfterApprove.available_beds === (hospBeforeBed.available_beds - 1),
        bedRestoredOnComplete: hospAfterBedComplete && hospAfterBedComplete.available_beds === hospBeforeBed.available_beds,
        visitCreated: !!bedVisit.id
      }
    };

    const transitionRequestIds = [cardReq.id, cashCreate.request_id, bedCreate.request_id];
    const { data: transitionRows, error: transitionErr } = await supabase
      .from('emergency_status_transitions')
      .select('emergency_request_id,from_status,to_status,source,reason,actor_role,request_snapshot,occurred_at')
      .in('emergency_request_id', transitionRequestIds)
      .order('occurred_at', { ascending: true });

    const transitions = transitionErr ? [] : (transitionRows || []);
    const hasNonDecreasingTimestamps = transitions.every((row, index, arr) => {
      if (index === 0) return true;
      return new Date(arr[index - 1].occurred_at).getTime() <= new Date(row.occurred_at).getTime();
    });

    report.scenarios.transitionAudit = {
      requests: transitionRequestIds,
      error: transitionErr ? transitionErr.message : null,
      rows: transitions,
      assertions: {
        rowsCaptured: !transitionErr && transitions.length >= transitionRequestIds.length,
        eachRequestHasInitialRow: transitionRequestIds.every((id) => transitions.some((row) => row.emergency_request_id === id && row.from_status === null)),
        completionRowsCaptured:
          transitions.some((row) => row.emergency_request_id === cardReq.id && row.to_status === 'completed')
          && transitions.some((row) => row.emergency_request_id === bedCreate.request_id && row.to_status === 'completed'),
        sourcesPresent: transitions.every((row) => !!row.source),
        reasonsPresent: transitions.every((row) => !!row.reason),
        snapshotsPresent: transitions.every((row) => !!row.request_snapshot && !!row.request_snapshot.id),
        chronological: hasNonDecreasingTimestamps
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
