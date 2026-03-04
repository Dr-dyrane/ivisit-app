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
    createdMainWalletId: null,
    orgWalletId: null,
    patientWalletId: null,
    paymentMethodId: null,
    paymentId: null,
    ledgerId: null,
    faqId: null,
    ticketId: null,
    searchEventId: null,
    searchHistoryId: null,
    searchSelectionId: null,
    subscriberId: null,
    healthNewsId: null,
    trendingTopicId: null,
    notificationId: null,
    insurancePolicyId: null,
    insuranceBillingId: null,
    userActivityId: null,
    adminAuditLogId: null,
    documentId: null,
    userRoleId: null,
    userSessionId: null,
    patientUserId: null,
    orgAdminUserId: null,
    doctorUserId: null,
    hospitalId: null,
    doctorId: null,
    doctorScheduleId: null,
    emergencyRequestId: null,
    emergencyDoctorAssignmentId: null,
    emergencyPrevAssignedDoctorId: null,
    emergencyPrevDoctorAssignedAt: null,
    };

  try {
    const patientEmail = `${TAG}-patient@ivisit-e2e.local`;
    const orgAdminEmail = `${TAG}-orgadmin@ivisit-e2e.local`;
    const doctorEmail = `${TAG}-doctor@ivisit-e2e.local`;

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

    const doctorAuth = await createAuthUser({
      email: doctorEmail,
      role: 'provider',
      fullName: `Doctor ${TAG}`,
    });
    ctx.authUserIds.push(doctorAuth.id);
    ctx.doctorUserId = doctorAuth.id;

    const patientProfile = await waitForProfile(patientAuth.id);
    const orgAdminProfile = await waitForProfile(orgAdminAuth.id);
    const doctorProfile = await waitForProfile(doctorAuth.id);
    report.resources.patientProfile = {
      id: patientProfile.id,
      email: patientProfile.email,
    };
    report.resources.orgAdminProfile = {
      id: orgAdminProfile.id,
      email: orgAdminProfile.email,
    };
    report.resources.doctorProfile = {
      id: doctorProfile.id,
      email: doctorProfile.email,
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

    const { error: doctorProfileLinkErr } = await supabase
      .from('profiles')
      .update({
        role: 'provider',
        provider_type: 'doctor',
        organization_id: organization.id,
      })
      .eq('id', doctorAuth.id);
    if (doctorProfileLinkErr) {
      throw new Error(`doctor profile organization link failed: ${doctorProfileLinkErr.message}`);
    }

    const { data: hospital, error: hospitalErr } = await supabase
      .from('hospitals')
      .insert({
        name: `Runtime Hospital ${TAG}`,
        address: `123 Runtime Way, QA City`,
        organization_id: organization.id,
        org_admin_id: orgAdminAuth.id,
        status: 'available',
        verification_status: 'verified',
        verified: true,
        available_beds: 10,
        ambulances_count: 1,
        service_types: ['bed', 'ambulance'],
        specialties: ['Internal Medicine'],
      })
      .select('id,name,organization_id,org_admin_id')
      .single();
    if (hospitalErr) throw new Error(`hospital insert failed: ${hospitalErr.message}`);
    ctx.hospitalId = hospital.id;

    let doctor = null;
    const { data: existingDoctor, error: existingDoctorErr } = await supabase
      .from('doctors')
      .select('*')
      .eq('profile_id', doctorAuth.id)
      .maybeSingle();
    if (existingDoctorErr) throw new Error(`doctor prefetch failed: ${existingDoctorErr.message}`);

    if (existingDoctor) {
      const { data: updatedDoctor, error: updateDoctorErr } = await supabase
        .from('doctors')
        .update({
          hospital_id: hospital.id,
          name: `Dr ${TAG}`,
          specialization: 'Internal Medicine',
          status: 'available',
          is_available: true,
          current_patients: 0,
          max_patients: 10,
          email: doctorEmail,
          updated_at: nowIso(),
        })
        .eq('id', existingDoctor.id)
        .select('*')
        .single();
      if (updateDoctorErr) throw new Error(`doctor update failed: ${updateDoctorErr.message}`);
      doctor = updatedDoctor;
    } else {
      const { data: insertedDoctor, error: doctorErr } = await supabase
        .from('doctors')
        .insert({
          profile_id: doctorAuth.id,
          hospital_id: hospital.id,
          name: `Dr ${TAG}`,
          specialization: 'Internal Medicine',
          status: 'available',
          is_available: true,
          current_patients: 0,
          max_patients: 10,
          email: doctorEmail,
        })
        .select('*')
        .single();
      if (doctorErr) throw new Error(`doctor insert failed: ${doctorErr.message}`);
      doctor = insertedDoctor;
    }

    ctx.doctorId = doctor.id;

    const { data: doctorSchedule, error: doctorScheduleErr } = await supabase
      .from('doctor_schedules')
      .insert({
        doctor_id: doctor.id,
        date: new Date().toISOString().slice(0, 10),
        start_time: '08:00:00',
        end_time: '16:00:00',
        shift_type: 'day',
        is_available: true,
      })
      .select('*')
      .single();
    if (doctorScheduleErr) {
      throw new Error(`doctor_schedules insert failed: ${doctorScheduleErr.message}`);
    }
    ctx.doctorScheduleId = doctorSchedule.id;

    const { error: doctorScheduleUpdateErr } = await supabase
      .from('doctor_schedules')
      .update({ is_available: false })
      .eq('id', doctorSchedule.id);
    if (doctorScheduleUpdateErr) {
      throw new Error(`doctor_schedules update failed: ${doctorScheduleUpdateErr.message}`);
    }

    let emergencyRequest = null;
    const emergencyTargetCompleted = await supabase
      .from('emergency_requests')
      .select('id,hospital_id,user_id,assigned_doctor_id,doctor_assigned_at,status,service_type')
      .in('status', ['completed', 'cancelled'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (emergencyTargetCompleted.error) {
      throw new Error(
        `emergency_requests completed/cancelled target fetch failed: ${emergencyTargetCompleted.error.message}`
      );
    }
    emergencyRequest = emergencyTargetCompleted.data;

    if (!emergencyRequest) {
      const emergencyTargetAny = await supabase
        .from('emergency_requests')
        .select('id,hospital_id,user_id,assigned_doctor_id,doctor_assigned_at,status,service_type')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (emergencyTargetAny.error) {
        throw new Error(`emergency_requests fallback target fetch failed: ${emergencyTargetAny.error.message}`);
      }
      emergencyRequest = emergencyTargetAny.data;
    }

    if (!emergencyRequest?.id) {
      throw new Error(
        'No emergency_requests row available for assignment validation without append-only cleanup side effects.'
      );
    }

    ctx.emergencyRequestId = emergencyRequest.id;
    ctx.emergencyPrevAssignedDoctorId = emergencyRequest.assigned_doctor_id || null;
    ctx.emergencyPrevDoctorAssignedAt = emergencyRequest.doctor_assigned_at || null;

    const { data: assignDoctorResult, error: assignDoctorErr } = await supabase.rpc(
      'assign_doctor_to_emergency',
      {
        p_emergency_request_id: emergencyRequest.id,
        p_doctor_id: doctor.id,
        p_notes: `Runtime assignment ${TAG}`,
      }
    );
    if (assignDoctorErr) {
      throw new Error(`assign_doctor_to_emergency failed: ${assignDoctorErr.message}`);
    }
    if (!assignDoctorResult?.success) {
      throw new Error(
        `assign_doctor_to_emergency returned non-success: ${JSON.stringify(assignDoctorResult)}`
      );
    }

    const { data: assignmentRows, error: assignmentRowsErr } = await supabase
      .from('emergency_doctor_assignments')
      .select('*')
      .eq('emergency_request_id', emergencyRequest.id)
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (assignmentRowsErr) {
      throw new Error(`emergency_doctor_assignments fetch failed: ${assignmentRowsErr.message}`);
    }
    const assignmentRow = assignmentRows?.[0];
    if (!assignmentRow?.id) {
      throw new Error('emergency_doctor_assignments row missing after assignment RPC');
    }
    ctx.emergencyDoctorAssignmentId = assignmentRow.id;

    const { error: assignmentUpdateErr } = await supabase
      .from('emergency_doctor_assignments')
      .update({ status: 'accepted' })
      .eq('id', assignmentRow.id);
    if (assignmentUpdateErr) {
      throw new Error(`emergency_doctor_assignments update failed: ${assignmentUpdateErr.message}`);
    }
    report.resources.hospital = hospital;
    report.resources.doctor = { id: doctor.id, hospital_id: doctor.hospital_id, profile_id: doctor.profile_id };
    report.resources.emergencyRequestTarget = {
      id: emergencyRequest.id,
      status: emergencyRequest.status,
      service_type: emergencyRequest.service_type,
    };
    report.steps.push(
      'hospitals/doctors/doctor_schedules/emergency_doctor_assignments runtime relationship validated'
    );

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

    let { data: mainWallet, error: mainWalletErr } = await supabase
      .from('ivisit_main_wallet')
      .select('id,balance,currency,last_updated')
      .limit(1)
      .maybeSingle();
    if (mainWalletErr) throw new Error(`ivisit_main_wallet fetch failed: ${mainWalletErr.message}`);
    if (!mainWallet) {
      const insertMainWallet = await supabase
        .from('ivisit_main_wallet')
        .insert({ balance: 0, currency: 'USD', last_updated: nowIso() })
        .select('id,balance,currency,last_updated')
        .single();
      if (insertMainWallet.error) {
        throw new Error(`ivisit_main_wallet insert failed: ${insertMainWallet.error.message}`);
      }
      mainWallet = insertMainWallet.data;
      ctx.createdMainWalletId = mainWallet.id;
    }
    report.resources.mainWallet = {
      id: mainWallet.id,
      currency: mainWallet.currency,
    };

    let { data: patientWallet, error: patientWalletErr } = await supabase
      .from('patient_wallets')
      .select('id,user_id,balance,currency')
      .eq('user_id', patientAuth.id)
      .maybeSingle();
    if (patientWalletErr) throw new Error(`patient_wallets fetch failed: ${patientWalletErr.message}`);
    if (!patientWallet) {
      const insertPatientWallet = await supabase
        .from('patient_wallets')
        .insert({
          user_id: patientAuth.id,
          balance: 0,
          currency: 'USD',
        })
        .select('id,user_id,balance,currency')
        .single();
      if (insertPatientWallet.error) {
        throw new Error(`patient_wallets insert failed: ${insertPatientWallet.error.message}`);
      }
      patientWallet = insertPatientWallet.data;
    }
    ctx.patientWalletId = patientWallet.id;

    const { error: patientWalletUpdateErr } = await supabase
      .from('patient_wallets')
      .update({ balance: 12.34, currency: 'USD', updated_at: nowIso() })
      .eq('id', patientWallet.id);
    if (patientWalletUpdateErr) {
      throw new Error(`patient_wallets update failed: ${patientWalletUpdateErr.message}`);
    }

    const { data: adminAuditLog, error: adminAuditLogErr } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: orgAdminAuth.id,
        action: 'runtime_crud_batch',
        details: { tag: TAG, source: 'runtime_batch' },
      })
      .select('*')
      .single();
    if (adminAuditLogErr) {
      throw new Error(`admin_audit_log insert failed: ${adminAuditLogErr.message}`);
    }
    ctx.adminAuditLogId = adminAuditLog.id;

    const { data: document, error: documentErr } = await supabase
      .from('documents')
      .insert({
        title: `Runtime document ${TAG}`,
        slug: `runtime-doc-${TS}`,
        file_path: `runtime/${TAG}.md`,
        content: `Runtime content ${TAG}`,
        description: 'Runtime docs coverage',
        visibility: ['public'],
        tier: 'public',
      })
      .select('*')
      .single();
    if (documentErr) throw new Error(`documents insert failed: ${documentErr.message}`);
    ctx.documentId = document.id;

    const { error: documentUpdateErr } = await supabase
      .from('documents')
      .update({ description: `Runtime docs updated ${TAG}` })
      .eq('id', document.id);
    if (documentUpdateErr) throw new Error(`documents update failed: ${documentUpdateErr.message}`);

    const { data: userRole, error: userRoleErr } = await supabase
      .from('user_roles')
      .insert({
        user_id: patientAuth.id,
        role: 'patient',
        metadata: { tag: TAG, source: 'runtime_batch' },
      })
      .select('*')
      .single();
    if (userRoleErr) throw new Error(`user_roles insert failed: ${userRoleErr.message}`);
    ctx.userRoleId = userRole.id;

    const { error: userRoleUpdateErr } = await supabase
      .from('user_roles')
      .update({ metadata: { tag: TAG, source: 'runtime_batch', updated: true } })
      .eq('id', userRole.id);
    if (userRoleUpdateErr) throw new Error(`user_roles update failed: ${userRoleUpdateErr.message}`);

    const { data: userSession, error: userSessionErr } = await supabase
      .from('user_sessions')
      .insert({
        user_id: patientAuth.id,
        last_active: nowIso(),
        session_data: { tag: TAG, source: 'runtime_batch' },
      })
      .select('*')
      .single();
    if (userSessionErr) throw new Error(`user_sessions insert failed: ${userSessionErr.message}`);
    ctx.userSessionId = userSession.id;

    const { error: userSessionUpdateErr } = await supabase
      .from('user_sessions')
      .update({ session_data: { tag: TAG, source: 'runtime_batch', refreshed: true } })
      .eq('id', userSession.id);
    if (userSessionUpdateErr) throw new Error(`user_sessions update failed: ${userSessionUpdateErr.message}`);
    report.steps.push(
      'ivisit_main_wallet/patient_wallets/admin_audit_log/documents/user_roles/user_sessions CRUD complete'
    );

    const { data: subscriber, error: subscriberErr } = await supabase
      .from('subscribers')
      .insert({
        email: `${TAG}@ivisit-subscriber.local`,
        type: 'free',
        status: 'pending',
        new_user: true,
        welcome_email_sent: false,
        subscription_date: nowIso(),
      })
      .select('*')
      .single();
    if (subscriberErr) throw new Error(`subscribers insert failed: ${subscriberErr.message}`);
    ctx.subscriberId = subscriber.id;

    const { error: subscriberUpdateErr } = await supabase
      .from('subscribers')
      .update({
        status: 'active',
        welcome_email_sent: true,
        new_user: false,
      })
      .eq('id', subscriber.id);
    if (subscriberUpdateErr) {
      throw new Error(`subscribers update failed: ${subscriberUpdateErr.message}`);
    }
    report.resources.subscriber = {
      id: subscriber.id,
      email: subscriber.email,
    };

    const { data: healthNews, error: healthNewsErr } = await supabase
      .from('health_news')
      .insert({
        title: `[${TAG}] Runtime health news`,
        source: 'runtime_batch',
        category: 'general',
        published: true,
        url: 'https://ivisit.example/runtime-health-news',
        image_url: 'https://ivisit.example/runtime-health-news.png',
      })
      .select('*')
      .single();
    if (healthNewsErr) throw new Error(`health_news insert failed: ${healthNewsErr.message}`);
    ctx.healthNewsId = healthNews.id;

    const { error: healthNewsUpdateErr } = await supabase
      .from('health_news')
      .update({ published: false })
      .eq('id', healthNews.id);
    if (healthNewsUpdateErr) {
      throw new Error(`health_news update failed: ${healthNewsUpdateErr.message}`);
    }

    const { data: trendingTopic, error: trendingTopicErr } = await supabase
      .from('trending_topics')
      .insert({
        query: `${TAG} triage`,
        category: 'emergency',
        rank: 99,
      })
      .select('*')
      .single();
    if (trendingTopicErr) {
      throw new Error(`trending_topics insert failed: ${trendingTopicErr.message}`);
    }
    ctx.trendingTopicId = trendingTopic.id;

    const { error: trendingTopicUpdateErr } = await supabase
      .from('trending_topics')
      .update({ rank: 7 })
      .eq('id', trendingTopic.id);
    if (trendingTopicUpdateErr) {
      throw new Error(`trending_topics update failed: ${trendingTopicUpdateErr.message}`);
    }

    const { data: notification, error: notificationErr } = await supabase
      .from('notifications')
      .insert({
        user_id: patientAuth.id,
        type: 'system',
        priority: 'normal',
        title: 'Runtime Batch Notification',
        message: `Runtime notification ${TAG}`,
        action_type: 'view_request',
        action_data: { tag: TAG },
        metadata: { tag: TAG, source: 'runtime_batch' },
        read: false,
      })
      .select('*')
      .single();
    if (notificationErr) throw new Error(`notifications insert failed: ${notificationErr.message}`);
    ctx.notificationId = notification.id;

    const { error: notificationUpdateErr } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notification.id);
    if (notificationUpdateErr) {
      throw new Error(`notifications update failed: ${notificationUpdateErr.message}`);
    }

    const { data: preferencesRow, error: preferencesErr } = await supabase
      .from('preferences')
      .upsert(
        {
          user_id: patientAuth.id,
          demo_mode_enabled: true,
          notifications_enabled: true,
          notification_sounds_enabled: true,
          appointment_reminders: true,
          emergency_updates: true,
          privacy_share_medical_profile: false,
          privacy_share_emergency_contacts: false,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();
    if (preferencesErr) throw new Error(`preferences upsert failed: ${preferencesErr.message}`);
    report.resources.preferences = {
      user_id: preferencesRow.user_id,
      demo_mode_enabled: preferencesRow.demo_mode_enabled,
    };

    const { data: insurancePolicy, error: insurancePolicyErr } = await supabase
      .from('insurance_policies')
      .insert({
        user_id: patientAuth.id,
        provider_name: `Runtime Health ${TAG}`,
        policy_number: `POL-${TS}`,
        plan_type: 'gold',
        status: 'active',
        coverage_percentage: 80,
        is_default: true,
        verified: false,
      })
      .select('*')
      .single();
    if (insurancePolicyErr) {
      throw new Error(`insurance_policies insert failed: ${insurancePolicyErr.message}`);
    }
    ctx.insurancePolicyId = insurancePolicy.id;

    const { error: insurancePolicyUpdateErr } = await supabase
      .from('insurance_policies')
      .update({ verified: true })
      .eq('id', insurancePolicy.id);
    if (insurancePolicyUpdateErr) {
      throw new Error(`insurance_policies update failed: ${insurancePolicyUpdateErr.message}`);
    }

    const { data: insuranceBilling, error: insuranceBillingErr } = await supabase
      .from('insurance_billing')
      .insert({
        user_id: patientAuth.id,
        insurance_policy_id: insurancePolicy.id,
        total_amount: 125,
        insurance_amount: 100,
        user_amount: 25,
        status: 'pending',
      })
      .select('*')
      .single();
    if (insuranceBillingErr) {
      throw new Error(`insurance_billing insert failed: ${insuranceBillingErr.message}`);
    }
    ctx.insuranceBillingId = insuranceBilling.id;

    const { error: insuranceBillingUpdateErr } = await supabase
      .from('insurance_billing')
      .update({
        claim_number: `CLM-${TS}`,
        coverage_percentage: 80,
      })
      .eq('id', insuranceBilling.id);
    if (insuranceBillingUpdateErr) {
      throw new Error(`insurance_billing update failed: ${insuranceBillingUpdateErr.message}`);
    }

    const { data: userActivity, error: userActivityErr } = await supabase
      .from('user_activity')
      .insert({
        user_id: patientAuth.id,
        action: 'runtime_crud_batch',
        description: `Runtime activity ${TAG}`,
        entity_type: 'hardening',
        entity_id: insurancePolicy.id,
        metadata: { tag: TAG, source: 'runtime_batch' },
      })
      .select('*')
      .single();
    if (userActivityErr) throw new Error(`user_activity insert failed: ${userActivityErr.message}`);
    ctx.userActivityId = userActivity.id;
    report.steps.push(
      'subscribers/health_news/trending_topics/notifications/preferences/insurance/user_activity CRUD complete'
    );

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

    const { data: subscribersRows, error: subscribersRowsErr } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriber.id)
      .limit(1);
    if (subscribersRowsErr) {
      throw new Error(`subscribers mirror query failed: ${subscribersRowsErr.message}`);
    }

    const { data: healthNewsRows, error: healthNewsRowsErr } = await supabase
      .from('health_news')
      .select('*')
      .eq('id', healthNews.id)
      .limit(1);
    if (healthNewsRowsErr) {
      throw new Error(`health_news mirror query failed: ${healthNewsRowsErr.message}`);
    }

    const { data: trendingTopicRows, error: trendingTopicRowsErr } = await supabase
      .from('trending_topics')
      .select('*')
      .eq('id', trendingTopic.id)
      .limit(1);
    if (trendingTopicRowsErr) {
      throw new Error(`trending_topics mirror query failed: ${trendingTopicRowsErr.message}`);
    }

    const { data: notificationRows, error: notificationRowsErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification.id)
      .eq('user_id', patientAuth.id)
      .limit(1);
    if (notificationRowsErr) {
      throw new Error(`notifications mirror query failed: ${notificationRowsErr.message}`);
    }

    const { data: preferencesRows, error: preferencesRowsErr } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', patientAuth.id)
      .limit(1);
    if (preferencesRowsErr) {
      throw new Error(`preferences mirror query failed: ${preferencesRowsErr.message}`);
    }

    const { data: insurancePolicyRows, error: insurancePolicyRowsErr } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('id', insurancePolicy.id)
      .limit(1);
    if (insurancePolicyRowsErr) {
      throw new Error(`insurance_policies mirror query failed: ${insurancePolicyRowsErr.message}`);
    }

    const { data: insuranceBillingRows, error: insuranceBillingRowsErr } = await supabase
      .from('insurance_billing')
      .select('*')
      .eq('id', insuranceBilling.id)
      .limit(1);
    if (insuranceBillingRowsErr) {
      throw new Error(`insurance_billing mirror query failed: ${insuranceBillingRowsErr.message}`);
    }

    const { data: userActivityRows, error: userActivityRowsErr } = await supabase
      .from('user_activity')
      .select('*')
      .eq('id', userActivity.id)
      .limit(1);
    if (userActivityRowsErr) {
      throw new Error(`user_activity mirror query failed: ${userActivityRowsErr.message}`);
    }

    const { data: hospitalRows, error: hospitalRowsErr } = await supabase
      .from('hospitals')
      .select('id,organization_id,org_admin_id,status')
      .eq('id', hospital.id)
      .limit(1);
    if (hospitalRowsErr) {
      throw new Error(`hospitals mirror query failed: ${hospitalRowsErr.message}`);
    }

    const { data: doctorRows, error: doctorRowsErr } = await supabase
      .from('doctors')
      .select('id,hospital_id,profile_id,current_patients,max_patients,is_available,status')
      .eq('id', doctor.id)
      .limit(1);
    if (doctorRowsErr) {
      throw new Error(`doctors mirror query failed: ${doctorRowsErr.message}`);
    }

    const { data: doctorScheduleRows, error: doctorScheduleRowsErr } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('id', doctorSchedule.id)
      .limit(1);
    if (doctorScheduleRowsErr) {
      throw new Error(`doctor_schedules mirror query failed: ${doctorScheduleRowsErr.message}`);
    }

    const { data: emergencyRows, error: emergencyRowsErr } = await supabase
      .from('emergency_requests')
      .select('id,user_id,hospital_id,assigned_doctor_id,doctor_assigned_at,status,service_type')
      .eq('id', emergencyRequest.id)
      .limit(1);
    if (emergencyRowsErr) {
      throw new Error(`emergency_requests mirror query failed: ${emergencyRowsErr.message}`);
    }

    const { data: emergencyDoctorAssignmentRows, error: emergencyDoctorAssignmentRowsErr } =
      await supabase
        .from('emergency_doctor_assignments')
        .select('*')
        .eq('id', assignmentRow.id)
        .limit(1);
    if (emergencyDoctorAssignmentRowsErr) {
      throw new Error(
        `emergency_doctor_assignments mirror query failed: ${emergencyDoctorAssignmentRowsErr.message}`
      );
    }

    const { data: patientWalletRows, error: patientWalletRowsErr } = await supabase
      .from('patient_wallets')
      .select('*')
      .eq('user_id', patientAuth.id)
      .limit(1);
    if (patientWalletRowsErr) {
      throw new Error(`patient_wallets mirror query failed: ${patientWalletRowsErr.message}`);
    }

    const { data: adminAuditRows, error: adminAuditRowsErr } = await supabase
      .from('admin_audit_log')
      .select('*')
      .eq('id', adminAuditLog.id)
      .limit(1);
    if (adminAuditRowsErr) {
      throw new Error(`admin_audit_log mirror query failed: ${adminAuditRowsErr.message}`);
    }

    const { data: documentRows, error: documentRowsErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document.id)
      .limit(1);
    if (documentRowsErr) {
      throw new Error(`documents mirror query failed: ${documentRowsErr.message}`);
    }

    const { data: userRoleRows, error: userRoleRowsErr } = await supabase
      .from('user_roles')
      .select('*')
      .eq('id', userRole.id)
      .limit(1);
    if (userRoleRowsErr) {
      throw new Error(`user_roles mirror query failed: ${userRoleRowsErr.message}`);
    }

    const { data: userSessionRows, error: userSessionRowsErr } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', userSession.id)
      .limit(1);
    if (userSessionRowsErr) {
      throw new Error(`user_sessions mirror query failed: ${userSessionRowsErr.message}`);
    }

    const idMappingsRead = await supabase
      .from('id_mappings')
      .select('entity_id,entity_type,display_id')
      .in('entity_id', [organization.id, payment.id, ticket.id, patientAuth.id]);
    if (idMappingsRead.error) {
      throw new Error(`id_mappings mirror query failed: ${idMappingsRead.error.message}`);
    }
    const idMappingRows = idMappingsRead.data || [];

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
    assertPush(
      report,
      'subscribers_row_persisted',
      Array.isArray(subscribersRows) &&
        subscribersRows.length === 1 &&
        subscribersRows[0].status === 'active' &&
        subscribersRows[0].welcome_email_sent === true,
      'subscriber row not persisted with expected updated status'
    );
    assertPush(
      report,
      'health_news_row_persisted',
      Array.isArray(healthNewsRows) &&
        healthNewsRows.length === 1 &&
        healthNewsRows[0].published === false,
      'health_news row not persisted with expected update'
    );
    assertPush(
      report,
      'trending_topics_row_persisted',
      Array.isArray(trendingTopicRows) &&
        trendingTopicRows.length === 1 &&
        Number(trendingTopicRows[0].rank) === 7,
      'trending_topics row not persisted with expected rank update'
    );
    assertPush(
      report,
      'notifications_row_persisted',
      Array.isArray(notificationRows) &&
        notificationRows.length === 1 &&
        notificationRows[0].read === true,
      'notifications row not persisted with expected read state'
    );
    assertPush(
      report,
      'preferences_row_persisted',
      Array.isArray(preferencesRows) &&
        preferencesRows.length === 1 &&
        preferencesRows[0].user_id === patientAuth.id &&
        preferencesRows[0].demo_mode_enabled === true,
      'preferences row not persisted for runtime user'
    );
    assertPush(
      report,
      'insurance_relationship_persisted',
      Array.isArray(insurancePolicyRows) &&
        insurancePolicyRows.length === 1 &&
        Array.isArray(insuranceBillingRows) &&
        insuranceBillingRows.length === 1 &&
        insuranceBillingRows[0].insurance_policy_id === insurancePolicy.id &&
        insuranceBillingRows[0].user_id === patientAuth.id &&
        insurancePolicyRows[0].verified === true,
      'insurance policy/billing relationship did not persist expected state'
    );
    assertPush(
      report,
      'user_activity_row_persisted',
      Array.isArray(userActivityRows) &&
        userActivityRows.length === 1 &&
        userActivityRows[0].action === 'runtime_crud_batch',
      'user_activity row not persisted with expected action'
    );
    assertPush(
      report,
      'hospital_org_admin_relationship',
      Array.isArray(hospitalRows) &&
        hospitalRows.length === 1 &&
        hospitalRows[0].organization_id === organization.id &&
        hospitalRows[0].org_admin_id === orgAdminAuth.id,
      'hospital row is not linked to expected organization/org_admin'
    );
    assertPush(
      report,
      'doctor_hospital_profile_relationship',
      Array.isArray(doctorRows) &&
        doctorRows.length === 1 &&
        doctorRows[0].hospital_id === hospital.id &&
        doctorRows[0].profile_id === doctorAuth.id,
      'doctor row is not linked to expected hospital/profile'
    );
    assertPush(
      report,
      'doctor_schedule_persisted',
      Array.isArray(doctorScheduleRows) &&
        doctorScheduleRows.length === 1 &&
        doctorScheduleRows[0].doctor_id === doctor.id &&
        doctorScheduleRows[0].shift_type === 'day' &&
        doctorScheduleRows[0].is_available === false,
      'doctor schedule row not persisted with expected update'
    );
    assertPush(
      report,
      'emergency_doctor_assignment_persisted',
      Array.isArray(emergencyDoctorAssignmentRows) &&
        emergencyDoctorAssignmentRows.length === 1 &&
        emergencyDoctorAssignmentRows[0].doctor_id === doctor.id &&
        emergencyDoctorAssignmentRows[0].emergency_request_id === emergencyRequest.id &&
        emergencyDoctorAssignmentRows[0].status === 'accepted',
      'emergency_doctor_assignments row not persisted with expected linkage/status'
    );
    assertPush(
      report,
      'emergency_request_assigned_doctor_synced',
      Array.isArray(emergencyRows) &&
        emergencyRows.length === 1 &&
        emergencyRows[0].assigned_doctor_id === doctor.id &&
        Boolean(emergencyRows[0].doctor_assigned_at),
      'emergency request did not persist assigned_doctor_id/doctor_assigned_at'
    );
    assertPush(
      report,
      'doctor_capacity_incremented_after_assignment',
      Array.isArray(doctorRows) &&
        doctorRows.length === 1 &&
        Number(doctorRows[0].current_patients) >= 1,
      'doctor current_patients was not incremented after assignment'
    );
    assertPush(
      report,
      'patient_wallet_row_persisted',
      Array.isArray(patientWalletRows) &&
        patientWalletRows.length === 1 &&
        patientWalletRows[0].user_id === patientAuth.id &&
        Number(patientWalletRows[0].balance) === 12.34,
      'patient_wallet row missing or not updated'
    );
    assertPush(
      report,
      'admin_audit_log_row_persisted',
      Array.isArray(adminAuditRows) &&
        adminAuditRows.length === 1 &&
        adminAuditRows[0].action === 'runtime_crud_batch',
      'admin_audit_log row missing expected action'
    );
    assertPush(
      report,
      'documents_row_persisted',
      Array.isArray(documentRows) &&
        documentRows.length === 1 &&
        String(documentRows[0].slug || '').includes(`runtime-doc-${TS}`),
      'documents row missing expected slug'
    );
    assertPush(
      report,
      'user_roles_row_persisted',
      Array.isArray(userRoleRows) &&
        userRoleRows.length === 1 &&
        userRoleRows[0].role === 'patient',
      'user_roles row missing expected role'
    );
    assertPush(
      report,
      'user_sessions_row_persisted',
      Array.isArray(userSessionRows) &&
        userSessionRows.length === 1 &&
        userSessionRows[0].user_id === patientAuth.id,
      'user_sessions row missing expected user relation'
    );
    assertPush(
      report,
      'id_mappings_rows_present_for_runtime_entities',
      Array.isArray(idMappingRows) &&
        idMappingRows.some((row) => row.entity_id === organization.id) &&
        idMappingRows.some((row) => row.entity_id === patientAuth.id),
      'id_mappings missing expected rows for runtime entities'
    );

    report.resources.mirrorCounts = {
      wallet_ledger: walletSummaryRows?.length || 0,
      support_faqs: faqRows?.length || 0,
      search_events: searchRows?.length || 0,
      search_history: searchHistoryRows?.length || 0,
      search_selections: searchSelectionRows?.length || 0,
      medical_profiles: medicalRows?.length || 0,
      subscribers: subscribersRows?.length || 0,
      health_news: healthNewsRows?.length || 0,
      trending_topics: trendingTopicRows?.length || 0,
      notifications: notificationRows?.length || 0,
      preferences: preferencesRows?.length || 0,
      insurance_policies: insurancePolicyRows?.length || 0,
      insurance_billing: insuranceBillingRows?.length || 0,
      user_activity: userActivityRows?.length || 0,
      hospitals: hospitalRows?.length || 0,
      doctors: doctorRows?.length || 0,
      doctor_schedules: doctorScheduleRows?.length || 0,
      emergency_requests: emergencyRows?.length || 0,
      emergency_doctor_assignments: emergencyDoctorAssignmentRows?.length || 0,
      patient_wallets: patientWalletRows?.length || 0,
      admin_audit_log: adminAuditRows?.length || 0,
      documents: documentRows?.length || 0,
      user_roles: userRoleRows?.length || 0,
      user_sessions: userSessionRows?.length || 0,
      id_mappings: idMappingRows?.length || 0,
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

    await safeDelete('emergency_doctor_assignments.delete', async () => {
      if (!ctx.emergencyDoctorAssignmentId && !ctx.emergencyRequestId) return;
      let query = supabase.from('emergency_doctor_assignments').delete();
      if (ctx.emergencyDoctorAssignmentId) {
        query = query.eq('id', ctx.emergencyDoctorAssignmentId);
      } else {
        query = query.eq('emergency_request_id', ctx.emergencyRequestId);
      }
      const { error } = await query;
      if (error) throw error;
    });

    await safeDelete('doctor_schedules.delete', async () => {
      if (!ctx.doctorScheduleId && !ctx.doctorId) return;
      let query = supabase.from('doctor_schedules').delete();
      if (ctx.doctorScheduleId) {
        query = query.eq('id', ctx.doctorScheduleId);
      } else {
        query = query.eq('doctor_id', ctx.doctorId);
      }
      const { error } = await query;
      if (error) throw error;
    });

    await safeDelete('emergency_requests.revert_assignment', async () => {
      if (!ctx.emergencyRequestId) return;
      const { error } = await supabase
        .from('emergency_requests')
        .update({
          assigned_doctor_id: ctx.emergencyPrevAssignedDoctorId,
          doctor_assigned_at: ctx.emergencyPrevDoctorAssignedAt,
          updated_at: nowIso(),
        })
        .eq('id', ctx.emergencyRequestId);
      if (error) throw error;
    });

    await safeDelete('doctors.delete', async () => {
      if (!ctx.doctorId) return;
      const { error } = await supabase.from('doctors').delete().eq('id', ctx.doctorId);
      if (error) throw error;
    });

    await safeDelete('hospitals.delete', async () => {
      if (!ctx.hospitalId) return;
      const { error } = await supabase.from('hospitals').delete().eq('id', ctx.hospitalId);
      if (error) throw error;
    });

    await safeDelete('preferences.delete', async () => {
      if (!ctx.patientUserId) return;
      const { error } = await supabase.from('preferences').delete().eq('user_id', ctx.patientUserId);
      if (error) throw error;
    });

    await safeDelete('user_sessions.delete', async () => {
      if (!ctx.userSessionId) return;
      const { error } = await supabase.from('user_sessions').delete().eq('id', ctx.userSessionId);
      if (error) throw error;
    });

    await safeDelete('user_roles.delete', async () => {
      if (!ctx.userRoleId) return;
      const { error } = await supabase.from('user_roles').delete().eq('id', ctx.userRoleId);
      if (error) throw error;
    });

    await safeDelete('documents.delete', async () => {
      if (!ctx.documentId) return;
      const { error } = await supabase.from('documents').delete().eq('id', ctx.documentId);
      if (error) throw error;
    });

    await safeDelete('admin_audit_log.delete', async () => {
      if (!ctx.adminAuditLogId) return;
      const { error } = await supabase.from('admin_audit_log').delete().eq('id', ctx.adminAuditLogId);
      if (error) throw error;
    });

    await safeDelete('patient_wallets.delete', async () => {
      if (!ctx.patientUserId) return;
      const { error } = await supabase.from('patient_wallets').delete().eq('user_id', ctx.patientUserId);
      if (error) throw error;
    });

    await safeDelete('user_activity.delete', async () => {
      if (!ctx.userActivityId) return;
      const { error } = await supabase.from('user_activity').delete().eq('id', ctx.userActivityId);
      if (error) throw error;
    });

    await safeDelete('insurance_billing.delete', async () => {
      if (!ctx.insuranceBillingId) return;
      const { error } = await supabase.from('insurance_billing').delete().eq('id', ctx.insuranceBillingId);
      if (error) throw error;
    });

    await safeDelete('insurance_policies.delete', async () => {
      if (!ctx.insurancePolicyId) return;
      const { error } = await supabase.from('insurance_policies').delete().eq('id', ctx.insurancePolicyId);
      if (error) throw error;
    });

    await safeDelete('notifications.delete', async () => {
      if (!ctx.notificationId) return;
      const { error } = await supabase.from('notifications').delete().eq('id', ctx.notificationId);
      if (error) throw error;
    });

    await safeDelete('trending_topics.delete', async () => {
      if (!ctx.trendingTopicId) return;
      const { error } = await supabase.from('trending_topics').delete().eq('id', ctx.trendingTopicId);
      if (error) throw error;
    });

    await safeDelete('health_news.delete', async () => {
      if (!ctx.healthNewsId) return;
      const { error } = await supabase.from('health_news').delete().eq('id', ctx.healthNewsId);
      if (error) throw error;
    });

    await safeDelete('subscribers.delete', async () => {
      if (!ctx.subscriberId) return;
      const { error } = await supabase.from('subscribers').delete().eq('id', ctx.subscriberId);
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

    await safeDelete('ivisit_main_wallet.delete', async () => {
      if (!ctx.createdMainWalletId) return;
      const { error } = await supabase.from('ivisit_main_wallet').delete().eq('id', ctx.createdMainWalletId);
      if (error) throw error;
    });

    await safeDelete('profiles.delete', async () => {
      const ids = [ctx.patientUserId, ctx.orgAdminUserId, ctx.doctorUserId].filter(Boolean);
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
