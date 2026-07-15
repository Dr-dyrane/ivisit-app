const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const appRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(appRoot, '.env.local') });
dotenv.config({ path: path.join(appRoot, '.env') });
dotenv.config({ path: path.resolve(appRoot, '..', 'ivisit-console', 'frontend', '.env') });
dotenv.config({ path: path.resolve(appRoot, '..', 'ivisit-console', 'frontend', '.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.argv
  .find((arg) => arg.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);
const applyApproved = process.argv.includes('--apply');

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('[scheduled-visits-live-e2e] Missing Supabase credentials.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef || !applyApproved) {
  console.error(
    `[scheduled-visits-live-e2e] Refusing live writes. Pass --project-ref=${projectRef} --apply to confirm the target.`
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const tag = `scheduled-live-${runId}`;
const password = `Contract!${crypto.randomBytes(12).toString('base64url')}`;
const reportPath = path.join(
  appRoot,
  'supabase',
  'tests',
  'artifacts',
  'scheduled_visits_live_e2e_report.json'
);

const state = {
  userIds: new Set(),
  organizationIds: new Set(),
  hospitalIds: new Set(),
  doctorIds: new Set(),
  scheduleIds: new Set(),
  visitIds: new Set(),
  bookingKeys: new Set(),
  roomIds: new Set(),
  messageIds: new Set(),
  storagePaths: new Set(),
  emergencyRequestIds: new Set(),
  paymentIds: new Set(),
};

const report = {
  target: projectRef,
  run_id: runId,
  started_at: new Date().toISOString(),
  finished_at: null,
  passed: 0,
  failed: 0,
  cleanup_passed: false,
  results: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function utcInstant(date, hour, minute = 0) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hour,
      minute,
      0,
      0
    )
  ).toISOString();
}

function testEmail(label) {
  return `${tag}-${label}@ivisit-e2e.local`;
}

function record(name, status, detail = null) {
  report.results.push({ name, status, detail });
  if (status === 'pass') {
    report.passed += 1;
    console.log(`[scheduled-visits-live-e2e] PASS ${name}`);
  } else {
    report.failed += 1;
    console.error(`[scheduled-visits-live-e2e] FAIL ${name}: ${detail}`);
  }
}

async function check(name, operation) {
  try {
    const detail = await operation();
    const reportDetail = ['string', 'number', 'boolean'].includes(typeof detail)
      ? detail
      : null;
    record(name, 'pass', reportDetail);
    return detail;
  } catch (error) {
    record(name, 'fail', error.message);
    throw error;
  }
}

function expectError(result, label, pattern = null) {
  assert(result?.error, `${label} unexpectedly succeeded`);
  if (pattern) {
    assert(pattern.test(result.error.message), `${label} returned an unexpected error: ${result.error.message}`);
  }
}

async function describeFunctionError(error) {
  try {
    const body = await error?.context?.clone?.().json();
    const code = body?.code ? ` (${body.code})` : '';
    if (body?.error) return `${body.error}${code}`;
  } catch {
    // Fall back to the SDK message.
  }
  return error?.message || 'Unknown Edge Function error';
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Auth trigger did not create profile ${userId}`);
}

async function createActor({ label, role = 'patient', organizationId = null, providerType = null }) {
  const email = testEmail(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${label} ${tag}` },
  });
  if (error) throw error;

  const userId = data.user.id;
  state.userIds.add(userId);
  await waitForProfile(userId);

  const patch = {
    role,
    organization_id: organizationId,
    full_name: `${label} ${tag}`,
    onboarding_status: 'complete',
  };
  if (providerType) patch.provider_type = providerType;

  const { error: profileError } = await admin
    .from('profiles')
    .update(patch)
    .eq('id', userId);
  if (profileError) throw profileError;

  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInError } = await publicClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { id: userId, email, client };
}

async function insertOrganization(name) {
  const { data, error } = await admin
    .from('organizations')
    .insert({ name })
    .select('id,name')
    .single();
  if (error) throw error;
  state.organizationIds.add(data.id);
  return data;
}

async function insertHospital({ organizationId, name, bookingEligible, timezoneConfirmed = true }) {
  const confirmedAt = timezoneConfirmed ? new Date().toISOString() : null;
  const { data, error } = await admin
    .from('hospitals')
    .insert({
      organization_id: organizationId,
      name,
      address: `${name} Test Address`,
      status: 'available',
      verified: true,
      verification_status: 'verified',
      booking_eligible: bookingEligible,
      timezone: 'UTC',
      timezone_confirmed_at: confirmedAt,
      timezone_confirmation_source: timezoneConfirmed ? 'manual' : null,
      timezone_confirmed_by: null,
      available_beds: 20,
      total_beds: 40,
    })
    .select('id,name,timezone,timezone_confirmed_at,timezone_confirmation_source,organization_id')
    .single();
  if (error) throw error;
  state.hospitalIds.add(data.id);
  return data;
}

async function insertDoctor(payload) {
  const doctorPayload = {
      name: payload.name,
      hospital_id: payload.hospitalId,
      profile_id: payload.profileId || null,
      specialization: payload.specialization,
      status: 'available',
      is_available: true,
      current_patients: 0,
      max_patients: payload.maxPatients,
      email: payload.email || null,
  };

  let query;
  if (payload.profileId) {
    const { data: existing, error: lookupError } = await admin
      .from('doctors')
      .select('id')
      .eq('profile_id', payload.profileId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    query = existing
      ? admin.from('doctors').update({
          hospital_id: payload.hospitalId,
          specialization: payload.specialization,
          status: 'available',
          is_available: true,
          current_patients: 0,
          max_patients: payload.maxPatients,
        }).eq('id', existing.id)
      : admin.from('doctors').insert(doctorPayload);
  } else {
    query = admin.from('doctors').insert(doctorPayload);
  }

  const { data, error } = await query
    .select('id,name,profile_id,specialization,current_patients,max_patients')
    .single();
  if (error) throw error;
  state.doctorIds.add(data.id);
  return data;
}

async function book(client, values) {
  const key = values.key || crypto.randomUUID();
  state.bookingKeys.add(key);
  const result = await client.rpc('book_scheduled_visit', {
    p_hospital_id: values.hospitalId,
    p_specialty: values.specialty,
    p_care_mode: values.careMode,
    p_scheduled_start_at: values.startAt,
    p_idempotency_key: key,
    p_notes: values.notes || null,
  });
  if (!result.error && result.data?.id) {
    state.visitIds.add(result.data.id);
    if (result.data.communication_room_id) state.roomIds.add(result.data.communication_room_id);
  }
  return { ...result, key };
}

async function storageObjectExists(storagePath) {
  const slash = storagePath.lastIndexOf('/');
  const folder = storagePath.slice(0, slash);
  const file = storagePath.slice(slash + 1);
  const { data, error } = await admin.storage.from('documents').list(folder, { search: file });
  if (error) throw error;
  return asArray(data).some((item) => item.name === file);
}

async function deleteEmergencyRequests(requestIds) {
  const ids = [...new Set(requestIds)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return;
  const literals = ids.map((id) => `'${id}'::uuid`).join(', ');
  const sql = `
DO $$
BEGIN
  ALTER TABLE public.emergency_status_transitions
    DISABLE TRIGGER trg_emergency_status_transitions_append_only;
  DELETE FROM public.emergency_requests WHERE id IN (${literals});
  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.emergency_status_transitions
    ENABLE TRIGGER trg_emergency_status_transitions_append_only;
  RAISE;
END;
$$;
  `;
  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Emergency cleanup SQL was rejected');
}

async function cleanup() {
  const errors = [];
  const safely = async (label, operation) => {
    try {
      await operation();
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  };

  const storagePaths = [...state.storagePaths];
  await safely('storage objects', async () => {
    if (!storagePaths.length) return;
    const { error } = await admin.storage.from('documents').remove(storagePaths);
    if (error) throw error;
  });

  const visitIds = [...state.visitIds];
  if (visitIds.length) {
    await safely('room discovery', async () => {
      const { data, error } = await admin
        .from('emergency_chat_rooms')
        .select('id')
        .in('visit_id', visitIds);
      if (error) throw error;
      asArray(data).forEach((row) => state.roomIds.add(row.id));
    });
  }

  const roomIds = [...state.roomIds];
  if (roomIds.length) {
    await safely('consult messages', async () => {
      const { error } = await admin.from('emergency_chat_messages').delete().in('room_id', roomIds);
      if (error) throw error;
    });
    await safely('consult participants', async () => {
      const { error } = await admin.from('emergency_chat_participants').delete().in('room_id', roomIds);
      if (error) throw error;
    });
    await safely('consult rooms', async () => {
      const { error } = await admin.from('emergency_chat_rooms').delete().in('id', roomIds);
      if (error) throw error;
    });
  }

  const userIds = [...state.userIds];
  if (userIds.length) {
    await safely('user activity', async () => {
      const { error } = await admin.from('user_activity').delete().in('user_id', userIds);
      if (error) throw error;
    });
    await safely('admin audit log', async () => {
      const { error } = await admin.from('admin_audit_log').delete().in('admin_id', userIds);
      if (error) throw error;
    });
  }

  const emergencyIds = [...state.emergencyRequestIds];
  const paymentIds = [...state.paymentIds];
  const notificationTargetIds = [...emergencyIds, ...paymentIds];
  if (notificationTargetIds.length) {
    await safely('emergency notifications', async () => {
      const { error } = await admin
        .from('notifications')
        .delete()
        .in('target_id', notificationTargetIds);
      if (error) throw error;
    });
  }
  if (emergencyIds.length) {
    await safely('emergency-derived visits', async () => {
      const { error } = await admin.from('visits').delete().in('request_id', emergencyIds);
      if (error) throw error;
    });
    await safely('emergency assignments', async () => {
      const { error } = await admin
        .from('emergency_doctor_assignments')
        .delete()
        .in('emergency_request_id', emergencyIds);
      if (error) throw error;
    });
    await safely('emergency requests', () => deleteEmergencyRequests(emergencyIds));
  }

  if (paymentIds.length) {
    await safely('emergency payments', async () => {
      const { error } = await admin.from('payments').delete().in('id', paymentIds);
      if (error) throw error;
    });
  }

  const bookingKeys = [...state.bookingKeys];
  if (bookingKeys.length) {
    await safely('scheduled visits by booking key', async () => {
      const { error } = await admin
        .from('visits')
        .delete()
        .in('booking_idempotency_key', bookingKeys);
      if (error) throw error;
    });
  }

  const doctorIds = [...state.doctorIds];
  if (doctorIds.length) {
    await safely('doctor schedules', async () => {
      const { error } = await admin.from('doctor_schedules').delete().in('doctor_id', doctorIds);
      if (error) throw error;
    });
    await safely('doctors', async () => {
      const { error } = await admin.from('doctors').delete().in('id', doctorIds);
      if (error) throw error;
    });
  }

  const hospitalIds = [...state.hospitalIds];
  if (hospitalIds.length) {
    await safely('hospitals', async () => {
      const { error } = await admin.from('hospitals').delete().in('id', hospitalIds);
      if (error) throw error;
    });
  }

  if (userIds.length) {
    await safely('profile scope reset', async () => {
      const { error } = await admin
        .from('profiles')
        .update({ organization_id: null, role: 'patient', onboarding_status: 'pending' })
        .in('id', userIds);
      if (error) throw error;
    });
  }

  const organizationIds = [...state.organizationIds];
  if (organizationIds.length) {
    await safely('organization wallets', async () => {
      const { error } = await admin
        .from('organization_wallets')
        .delete()
        .in('organization_id', organizationIds);
      if (error) throw error;
    });
    await safely('organizations', async () => {
      const { error } = await admin.from('organizations').delete().in('id', organizationIds);
      if (error) throw error;
    });
  }

  for (const userId of userIds) {
    await safely(`Auth user ${userId}`, async () => {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error && !/not found/i.test(error.message)) throw error;
    });
  }

  await safely('database residue', async () => {
    const checks = [];
    if (bookingKeys.length) {
      checks.push(
        admin
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .in('booking_idempotency_key', bookingKeys)
      );
    }
    if (doctorIds.length) {
      checks.push(
        admin.from('doctors').select('id', { count: 'exact', head: true }).in('id', doctorIds),
        admin
          .from('doctor_schedules')
          .select('id', { count: 'exact', head: true })
          .in('doctor_id', doctorIds)
      );
    }
    if (hospitalIds.length) {
      checks.push(
        admin.from('hospitals').select('id', { count: 'exact', head: true }).in('id', hospitalIds)
      );
    }
    if (organizationIds.length) {
      checks.push(
        admin
          .from('organizations')
          .select('id', { count: 'exact', head: true })
          .in('id', organizationIds)
      );
    }
    if (userIds.length) {
      checks.push(
        admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', userIds)
      );
    }
    if (emergencyIds.length) {
      checks.push(
        admin
          .from('emergency_requests')
          .select('id', { count: 'exact', head: true })
          .in('id', emergencyIds)
      );
    }
    if (paymentIds.length) {
      checks.push(
        admin.from('payments').select('id', { count: 'exact', head: true }).in('id', paymentIds)
      );
    }

    const results = await Promise.all(checks);
    for (const result of results) {
      if (result.error) throw result.error;
      if (result.count !== 0) throw new Error(`temporary database rows remain (count=${result.count})`);
    }
  });

  for (const storagePath of storagePaths) {
    await safely(`storage residue ${storagePath}`, async () => {
      if (await storageObjectExists(storagePath)) throw new Error('temporary object remains');
    });
  }

  if (errors.length) throw new Error(errors.join('; '));
}

async function createEmergencyRequest({ actor, hospital, label }) {
  const created = await actor.client.rpc('create_emergency_v4', {
    p_user_id: actor.id,
    p_request_data: {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      service_type: 'ambulance',
      specialty: 'Emergency Medicine',
      patient_snapshot: { fullName: `${label} ${tag}`, testTag: tag },
      transition_reason: `scheduled_live_${label}`,
    },
    p_payment_data: {
      method: 'card',
      method_id: `${tag}-${label}-method`,
      total_amount: 150,
      currency: 'USD',
    },
  });
  if (created.error) throw created.error;
  assert(created.data?.success === true, `Emergency creation failed: ${JSON.stringify(created.data)}`);

  const requestId = created.data.request_id;
  const paymentId = created.data.payment_id;
  state.emergencyRequestIds.add(requestId);
  state.paymentIds.add(paymentId);

  const paymentIntentId = `pi_${tag.replace(/[^a-zA-Z0-9]/g, '')}_${label}`;
  const { error: paymentPatchError } = await admin
    .from('payments')
    .update({ stripe_payment_intent_id: paymentIntentId })
    .eq('id', paymentId);
  if (paymentPatchError) throw paymentPatchError;

  const confirmed = await admin.rpc('complete_card_payment', {
    p_payment_intent_id: paymentIntentId,
    p_provider_response: { id: paymentIntentId, status: 'succeeded', testTag: tag },
    p_fee_amount: 3.75,
  });
  if (confirmed.error) throw confirmed.error;
  assert(confirmed.data?.success === true, 'Card confirmation failed');
  assert(confirmed.data?.request_status === 'in_progress', 'Payment did not release the emergency');

  const { data, error } = await admin
    .from('emergency_requests')
    .select('id,status,assigned_doctor_id')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  return data;
}

async function cancelEmergency(requestId, client) {
  const { error } = await client.rpc('console_cancel_emergency', {
    p_request_id: requestId,
    p_reason: `scheduled visit live test cleanup ${tag}`,
  });
  if (error) throw error;
}

async function main() {
  console.log(`[scheduled-visits-live-e2e] target=${projectRef} run=${runId}`);
  let failure = null;

  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const bookingDay = new Date(today);
    bookingDay.setUTCDate(bookingDay.getUTCDate() + 2);
    const bookingDate = isoDate(bookingDay);
    const slotOne = utcInstant(bookingDay, 9, 0);
    const slotTwo = utcInstant(bookingDay, 10, 0);
    const slotThree = utcInstant(bookingDay, 11, 0);

    const fixtures = await check('fixture setup', async () => {
      const orgA = await insertOrganization(`Scheduled Care Org A ${tag}`);
      const orgB = await insertOrganization(`Scheduled Care Org B ${tag}`);
      const hospitalA = await insertHospital({
        organizationId: orgA.id,
        name: `Scheduled Care Hospital A ${tag}`,
        bookingEligible: true,
      });
      const hospitalB = await insertHospital({
        organizationId: orgB.id,
        name: `Scheduled Care Hospital B ${tag}`,
        bookingEligible: false,
        timezoneConfirmed: false,
      });

      const patientA = await createActor({ label: 'patient-a' });
      const patientB = await createActor({ label: 'patient-b' });
      const patientC = await createActor({ label: 'patient-c' });
      const outsider = await createActor({ label: 'outsider' });
      const doctorActor = await createActor({
        label: 'doctor',
        role: 'provider',
        organizationId: orgA.id,
        providerType: 'doctor',
      });
      const orgAdminA = await createActor({
        label: 'org-admin-a',
        role: 'org_admin',
        organizationId: orgA.id,
      });
      const orgAdminB = await createActor({
        label: 'org-admin-b',
        role: 'org_admin',
        organizationId: orgB.id,
      });

      const bookingDoctor = await insertDoctor({
        name: `Dr Booking ${tag}`,
        hospitalId: hospitalA.id,
        profileId: doctorActor.id,
        specialization: 'General Medicine',
        maxPatients: 10,
        email: doctorActor.email,
      });
      const scheduledEmergencyDoctor = await insertDoctor({
        name: `Dr Scheduled Emergency ${tag}`,
        hospitalId: hospitalA.id,
        specialization: 'Emergency Medicine',
        maxPatients: 1,
      });
      const fallbackEmergencyDoctor = await insertDoctor({
        name: `Dr Fallback Emergency ${tag}`,
        hospitalId: hospitalA.id,
        specialization: 'Emergency Medicine',
        maxPatients: 2,
      });

      const { data: currentSchedule, error: currentScheduleError } = await admin
        .from('doctor_schedules')
        .insert({
          doctor_id: scheduledEmergencyDoctor.id,
          date: isoDate(today),
          start_time: '00:00:00',
          end_time: '23:59:59',
          shift_type: 'day',
          is_available: true,
        })
        .select('id')
        .single();
      if (currentScheduleError) throw currentScheduleError;
      state.scheduleIds.add(currentSchedule.id);

      return {
        orgA,
        orgB,
        hospitalA,
        hospitalB,
        patientA,
        patientB,
        patientC,
        outsider,
        doctorActor,
        orgAdminA,
        orgAdminB,
        bookingDoctor,
        scheduledEmergencyDoctor,
        fallbackEmergencyDoctor,
      };
    });

    const bookingSchedule = await check('schedule role and RLS boundaries', async () => {
      const patientTimezoneWrite = await fixtures.patientA.client.rpc(
        'confirm_hospital_timezone',
        { p_hospital_id: fixtures.hospitalB.id, p_timezone: 'UTC' },
      );
      expectError(patientTimezoneWrite, 'patient timezone confirmation', /Unauthorized/i);

      const crossOrgTimezoneWrite = await fixtures.orgAdminA.client.rpc(
        'confirm_hospital_timezone',
        { p_hospital_id: fixtures.hospitalB.id, p_timezone: 'UTC' },
      );
      expectError(crossOrgTimezoneWrite, 'cross-organization timezone confirmation', /Unauthorized/i);

      const ownTimezoneWrite = await fixtures.orgAdminB.client.rpc(
        'confirm_hospital_timezone',
        { p_hospital_id: fixtures.hospitalB.id, p_timezone: 'UTC' },
      );
      if (ownTimezoneWrite.error) throw ownTimezoneWrite.error;
      assert(
        ownTimezoneWrite.data?.timezone_confirmed_at
          && ownTimezoneWrite.data?.timezone_confirmation_source === 'manual',
        'Timezone confirmation did not return canonical evidence',
      );

      const anonAvailability = await anon.rpc('get_book_visit_availability', {
        p_hospital_id: fixtures.hospitalA.id,
        p_specialty: 'General Medicine',
        p_care_mode: 'in_person',
        p_from_at: new Date().toISOString(),
        p_to_at: utcInstant(bookingDay, 17, 0),
      });
      expectError(anonAvailability, 'anonymous availability');

      const patientWrite = await fixtures.patientA.client.rpc('upsert_doctor_schedule', {
        p_doctor_id: fixtures.bookingDoctor.id,
        p_date: bookingDate,
        p_start_time: '08:00:00',
        p_end_time: '17:00:00',
        p_shift_type: 'day',
        p_is_available: true,
        p_schedule_id: null,
      });
      expectError(patientWrite, 'patient schedule write', /Unauthorized/i);

      const crossOrgWrite = await fixtures.orgAdminB.client.rpc('upsert_doctor_schedule', {
        p_doctor_id: fixtures.bookingDoctor.id,
        p_date: bookingDate,
        p_start_time: '08:00:00',
        p_end_time: '17:00:00',
        p_shift_type: 'day',
        p_is_available: true,
        p_schedule_id: null,
      });
      expectError(crossOrgWrite, 'cross-organization schedule write', /Unauthorized/i);

      const ownWrite = await fixtures.orgAdminA.client.rpc('upsert_doctor_schedule', {
        p_doctor_id: fixtures.bookingDoctor.id,
        p_date: bookingDate,
        p_start_time: '08:00:00',
        p_end_time: '17:00:00',
        p_shift_type: 'day',
        p_is_available: true,
        p_schedule_id: null,
      });
      if (ownWrite.error) throw ownWrite.error;
      state.scheduleIds.add(ownWrite.data.id);

      const directWrite = await fixtures.orgAdminA.client
        .from('doctor_schedules')
        .insert({
          doctor_id: fixtures.bookingDoctor.id,
          date: bookingDate,
          start_time: '18:00:00',
          end_time: '19:00:00',
          shift_type: 'evening',
          is_available: true,
        });
      expectError(directWrite, 'direct authenticated schedule insert');

      const ownProjection = await fixtures.orgAdminA.client.rpc('get_console_doctor_schedules', {
        p_hospital_id: fixtures.hospitalA.id,
        p_from_date: bookingDate,
        p_to_date: bookingDate,
      });
      if (ownProjection.error) throw ownProjection.error;
      assert(asArray(ownProjection.data).some((row) => row.schedule_id === ownWrite.data.id), 'Own schedule is absent');

      const crossProjection = await fixtures.orgAdminB.client.rpc('get_console_doctor_schedules', {
        p_hospital_id: fixtures.hospitalA.id,
        p_from_date: bookingDate,
        p_to_date: bookingDate,
      });
      if (crossProjection.error) throw crossProjection.error;
      assert(asArray(crossProjection.data).length === 0, 'Cross-org schedule projection leaked rows');

      const doctorRead = await fixtures.doctorActor.client
        .from('doctor_schedules')
        .select('id,doctor_id')
        .eq('id', ownWrite.data.id);
      if (doctorRead.error) throw doctorRead.error;
      assert(asArray(doctorRead.data).length === 1, 'Clinician cannot read their own shift');

      const outsiderRead = await fixtures.outsider.client
        .from('doctor_schedules')
        .select('id,doctor_id')
        .eq('id', ownWrite.data.id);
      if (outsiderRead.error) throw outsiderRead.error;
      assert(asArray(outsiderRead.data).length === 0, 'Unscoped patient can read a clinician shift');

      return ownWrite.data;
    });

    await check('availability returns canonical facility-time slots', async () => {
      const availability = await fixtures.patientA.client.rpc('get_book_visit_availability', {
        p_hospital_id: fixtures.hospitalA.id,
        p_specialty: 'General Medicine',
        p_care_mode: 'telemedicine_async',
        p_from_at: new Date().toISOString(),
        p_to_at: utcInstant(bookingDay, 17, 0),
      });
      if (availability.error) throw availability.error;
      const matching = asArray(availability.data).find(
        (row) => new Date(row.scheduled_start_at).getTime() === new Date(slotOne).getTime()
          && row.doctor_id === fixtures.bookingDoctor.id
      );
      assert(matching, 'Expected 09:00 UTC booking slot is unavailable');
      assert(matching.scheduled_timezone === 'UTC', 'Availability did not preserve facility timezone');
    });

    const firstBooking = await check('same-key concurrent booking is idempotent', async () => {
      const key = crypto.randomUUID();
      const args = {
        hospitalId: fixtures.hospitalA.id,
        specialty: 'General Medicine',
        careMode: 'telemedicine_async',
        startAt: slotOne,
        key,
        notes: `Async consult ${tag}`,
      };
      const results = await Promise.all([
        book(fixtures.patientA.client, args),
        book(fixtures.patientA.client, args),
      ]);
      results.forEach((result) => {
        if (result.error) throw result.error;
      });
      assert(results[0].data.id === results[1].data.id, 'Concurrent retry created two visit identities');
      assert(
        [results[0].data.idempotent, results[1].data.idempotent].includes(true),
        'Concurrent retry was not identified as idempotent'
      );

      const { count, error } = await admin
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', fixtures.patientA.id)
        .eq('booking_idempotency_key', key);
      if (error) throw error;
      assert(count === 1, `Expected one idempotent visit, found ${count}`);
      return results[0].data;
    });

    await check('different keys cannot overlap one patient', async () => {
      const results = await Promise.all([
        book(fixtures.patientA.client, {
          hospitalId: fixtures.hospitalA.id,
          specialty: 'General Medicine',
          careMode: 'in_person',
          startAt: slotTwo,
          key: crypto.randomUUID(),
        }),
        book(fixtures.patientA.client, {
          hospitalId: fixtures.hospitalA.id,
          specialty: 'General Medicine',
          careMode: 'in_person',
          startAt: slotTwo,
          key: crypto.randomUUID(),
        }),
      ]);
      const successes = results.filter((result) => !result.error);
      const failures = results.filter((result) => result.error);
      assert(successes.length === 1 && failures.length === 1, 'Patient overlap did not converge to one booking');
      assert(/already has a scheduled visit/i.test(failures[0].error.message), 'Unexpected patient overlap error');
    });

    await check('final clinician slot admits at most one patient', async () => {
      const [patientBResult, patientCResult] = await Promise.all([
        book(fixtures.patientB.client, {
          hospitalId: fixtures.hospitalA.id,
          specialty: 'General Medicine',
          careMode: 'in_person',
          startAt: slotThree,
          key: crypto.randomUUID(),
        }),
        book(fixtures.patientC.client, {
          hospitalId: fixtures.hospitalA.id,
          specialty: 'General Medicine',
          careMode: 'in_person',
          startAt: slotThree,
          key: crypto.randomUUID(),
        }),
      ]);
      const results = [patientBResult, patientCResult];
      const successes = results.filter((result) => !result.error);
      const failures = results.filter((result) => result.error);
      assert(successes.length === 1 && failures.length === 1, 'Final slot did not converge to one booking');
      assert(/No clinician is available/i.test(failures[0].error.message), 'Unexpected final-slot error');
    });

    await check('scheduled rows cannot bypass the booking RPC', async () => {
      const directInsert = await fixtures.patientA.client.from('visits').insert({
        user_id: fixtures.patientA.id,
        hospital_id: fixtures.hospitalA.id,
        doctor_id: fixtures.bookingDoctor.id,
        request_id: null,
        hospital_name: fixtures.hospitalA.name,
        doctor_name: fixtures.bookingDoctor.name,
        specialty: 'General Medicine',
        type: 'Consultation',
        status: 'upcoming',
        care_mode: 'in_person',
        scheduled_start_at: utcInstant(bookingDay, 13, 0),
        scheduled_end_at: utcInstant(bookingDay, 13, 45),
        scheduled_timezone: 'UTC',
        booking_idempotency_key: crypto.randomUUID(),
      });
      expectError(directInsert, 'direct scheduled visit insert');
    });

    const roomId = firstBooking.communication_room_id;
    assert(roomId, 'Telemedicine booking did not create a communication room');
    state.roomIds.add(roomId);

    await check('consult room and message RLS exclude Console and outsiders', async () => {
      const participantClients = [fixtures.patientA.client, fixtures.doctorActor.client];
      for (const client of participantClients) {
        const { data, error } = await client
          .from('emergency_chat_rooms')
          .select('id,visit_id,channel_type')
          .eq('id', roomId);
        if (error) throw error;
        assert(asArray(data).length === 1, 'A consult participant cannot read the room');
      }

      for (const client of [fixtures.outsider.client, fixtures.orgAdminA.client]) {
        const { data, error } = await client
          .from('emergency_chat_rooms')
          .select('id')
          .eq('id', roomId);
        if (error) throw error;
        assert(asArray(data).length === 0, 'Consult room leaked outside patient/clinician scope');
      }

      const directMessage = await fixtures.patientA.client.from('emergency_chat_messages').insert({
        room_id: roomId,
        sender_id: fixtures.patientA.id,
        sender_role: 'patient',
        kind: 'text',
        body: 'Direct write must fail',
      });
      expectError(directMessage, 'direct consult message insert');

      const outsiderMessage = await fixtures.outsider.client.rpc('send_async_consult_message', {
        p_room_id: roomId,
        p_body: 'Outsider write must fail',
        p_kind: 'text',
        p_client_message_id: `${tag}-outsider`,
        p_metadata: {},
      });
      expectError(outsiderMessage, 'outsider consult send', /Unauthorized/i);
    });

    await check('consult text message idempotency and read state', async () => {
      const clientMessageId = `${tag}-text`;
      const payload = {
        p_room_id: roomId,
        p_body: 'I have had this symptom since yesterday.',
        p_kind: 'text',
        p_client_message_id: clientMessageId,
        p_metadata: { test_tag: tag },
      };
      const first = await fixtures.patientA.client.rpc('send_async_consult_message', payload);
      if (first.error) throw first.error;
      state.messageIds.add(first.data.id);
      const retry = await fixtures.patientA.client.rpc('send_async_consult_message', payload);
      if (retry.error) throw retry.error;
      assert(first.data.id === retry.data.id, 'Message retry created a duplicate row');
      assert(first.data.ai_assisted === false, 'Participant message asserted AI provenance');

      const changedRetry = await fixtures.patientA.client.rpc('send_async_consult_message', {
        ...payload,
        p_body: 'Changed content must fail.',
      });
      expectError(changedRetry, 'changed message retry', /already used/i);

      const markRead = await fixtures.doctorActor.client.rpc('mark_async_consult_room_read', {
        p_room_id: roomId,
        p_message_id: first.data.id,
      });
      if (markRead.error) throw markRead.error;
      assert(markRead.data === true, 'Clinician read state was not updated');
    });

    await check('consult-assist Edge authorization is draft-only', async () => {
      const { count: beforeCount, error: beforeError } = await admin
        .from('emergency_chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId);
      if (beforeError) throw beforeError;

      const body = {
        room_id: roomId,
        user_prompt: 'Help me ask the clinician what details would be useful next.',
        recent_messages: [
          {
            sender: 'patient',
            kind: 'text',
            body: 'I have had this symptom since yesterday.',
          },
        ],
        attachment_context: [],
      };

      const unauthenticated = await anon.functions.invoke('consult-assist', { body });
      expectError(unauthenticated, 'unauthenticated consult assistance');

      const outsider = await fixtures.outsider.client.functions.invoke('consult-assist', { body });
      expectError(outsider, 'out-of-scope consult assistance');

      const patient = await fixtures.patientA.client.functions.invoke('consult-assist', { body });
      if (patient.error) {
        throw new Error(`authorized consult-assist failed: ${await describeFunctionError(patient.error)}`);
      }
      assert(patient.data?.success === true, 'Consult assistance did not return success');
      assert(patient.data?.ai_assisted === true, 'Consult assistance omitted draft provenance');
      assert(
        typeof patient.data?.draft === 'string' && patient.data.draft.trim().length > 0,
        'Consult assistance returned an empty draft'
      );

      const { count: afterCount, error: afterError } = await admin
        .from('emergency_chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId);
      if (afterError) throw afterError;
      assert(beforeCount === afterCount, 'Consult assistance persisted a clinical message');
    });

    await check('private consult Storage is linked, scoped, and non-deletable by clients', async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZpAAAAABJRU5ErkJggg==',
        'base64'
      );
      const linkedPath = `telemedicine/${roomId}/${fixtures.patientA.id}/${tag}-linked.png`;
      const unlinkedPath = `telemedicine/${roomId}/${fixtures.patientA.id}/${tag}-unlinked.png`;
      state.storagePaths.add(linkedPath);
      state.storagePaths.add(unlinkedPath);

      const upload = await fixtures.patientA.client.storage
        .from('documents')
        .upload(linkedPath, png, { contentType: 'image/png', upsert: false });
      if (upload.error) throw upload.error;

      const beforeLink = await fixtures.patientA.client.storage.from('documents').download(linkedPath);
      expectError(beforeLink, 'unlinked consult media read');

      const outsiderPath = `telemedicine/${roomId}/${fixtures.outsider.id}/${tag}-outsider.png`;
      const outsiderUpload = await fixtures.outsider.client.storage
        .from('documents')
        .upload(outsiderPath, png, { contentType: 'image/png', upsert: false });
      expectError(outsiderUpload, 'outsider consult media upload');

      const unsupportedUpload = await fixtures.patientA.client.storage
        .from('documents')
        .upload(
          `telemedicine/${roomId}/${fixtures.patientA.id}/${tag}-unsupported.txt`,
          Buffer.from('not allowed'),
          { contentType: 'text/plain', upsert: false }
        );
      expectError(unsupportedUpload, 'unsupported consult media extension');

      const imageMessage = await fixtures.patientA.client.rpc('send_async_consult_message', {
        p_room_id: roomId,
        p_body: 'Photo for clinical review.',
        p_kind: 'image',
        p_client_message_id: `${tag}-image`,
        p_metadata: { test_tag: tag },
        p_attachment_storage_path: linkedPath,
        p_attachment_mime_type: 'image/png',
        p_attachment_size_bytes: png.length,
        p_attachment_duration_ms: null,
      });
      if (imageMessage.error) throw imageMessage.error;
      state.messageIds.add(imageMessage.data.id);
      assert(imageMessage.data.ai_assisted === false, 'Attachment message asserted AI provenance');

      for (const client of [fixtures.patientA.client, fixtures.doctorActor.client]) {
        const read = await client.storage.from('documents').download(linkedPath);
        if (read.error) throw read.error;
        assert(read.data.size === png.length, 'Participant received an unexpected media object');
      }

      for (const client of [fixtures.outsider.client, fixtures.orgAdminA.client]) {
        const read = await client.storage.from('documents').download(linkedPath);
        expectError(read, 'out-of-scope linked media read');
      }

      const clientDelete = await fixtures.patientA.client.storage.from('documents').remove([linkedPath]);
      if (!clientDelete.error) {
        assert(await storageObjectExists(linkedPath), 'Client deleted linked clinical media');
      }

      const unlinkedUpload = await fixtures.patientA.client.storage
        .from('documents')
        .upload(unlinkedPath, png, { contentType: 'image/png', upsert: false });
      if (unlinkedUpload.error) throw unlinkedUpload.error;
      const wrongSize = await fixtures.patientA.client.rpc('send_async_consult_message', {
        p_room_id: roomId,
        p_body: 'Invalid attachment metadata.',
        p_kind: 'image',
        p_client_message_id: `${tag}-wrong-size`,
        p_metadata: {},
        p_attachment_storage_path: unlinkedPath,
        p_attachment_mime_type: 'image/png',
        p_attachment_size_bytes: png.length + 1,
        p_attachment_duration_ms: null,
      });
      expectError(wrongSize, 'attachment size mismatch', /size/i);

      const patientMessages = await fixtures.patientA.client
        .from('emergency_chat_messages')
        .select('id,room_id,kind,attachment_storage_path,ai_assisted')
        .eq('room_id', roomId);
      if (patientMessages.error) throw patientMessages.error;
      assert(asArray(patientMessages.data).length >= 2, 'Patient cannot read persisted consult messages');

      for (const client of [fixtures.outsider.client, fixtures.orgAdminA.client]) {
        const { data, error } = await client
          .from('emergency_chat_messages')
          .select('id')
          .eq('room_id', roomId);
        if (error) throw error;
        assert(asArray(data).length === 0, 'Consult messages leaked outside patient/clinician scope');
      }
    });

    await check('scheduled lifecycle enforces actor scope and archives consults', async () => {
      const outsiderCancel = await fixtures.outsider.client.rpc('transition_scheduled_visit', {
        p_visit_id: firstBooking.id,
        p_action: 'cancel',
        p_scheduled_start_at: null,
        p_reason: tag,
      });
      expectError(outsiderCancel, 'outsider cancellation', /Unauthorized/i);

      const patientCancel = await fixtures.patientA.client.rpc('transition_scheduled_visit', {
        p_visit_id: firstBooking.id,
        p_action: 'cancel',
        p_scheduled_start_at: null,
        p_reason: tag,
      });
      if (patientCancel.error) throw patientCancel.error;
      assert(patientCancel.data.status === 'cancelled', 'Patient cancellation did not persist');

      const { data: room, error: roomError } = await admin
        .from('emergency_chat_rooms')
        .select('status,archived_at')
        .eq('id', roomId)
        .single();
      if (roomError) throw roomError;
      assert(room.status === 'archived' && room.archived_at, 'Consult room did not archive with visit');
    });

    await check('active bookings protect their source schedule', async () => {
      const deletion = await fixtures.orgAdminA.client.rpc('delete_doctor_schedule', {
        p_schedule_id: bookingSchedule.id,
      });
      expectError(deletion, 'booked schedule deletion', /active booked visits/i);
    });

    await check('emergency matching prefers schedules and preserves fallback', async () => {
      const first = await createEmergencyRequest({
        actor: fixtures.patientA,
        hospital: fixtures.hospitalA,
        label: 'scheduled-emergency',
      });
      assert(
        first.assigned_doctor_id === fixtures.scheduledEmergencyDoctor.id,
        'Current schedule was not preferred for emergency assignment'
      );

      const second = await createEmergencyRequest({
        actor: fixtures.patientB,
        hospital: fixtures.hospitalA,
        label: 'fallback-emergency',
      });
      assert(
        second.assigned_doctor_id === fixtures.fallbackEmergencyDoctor.id,
        'Schedule-less emergency fallback did not assign the next available doctor'
      );

      const doctorless = await createEmergencyRequest({
        actor: fixtures.patientC,
        hospital: fixtures.hospitalB,
        label: 'doctorless-emergency',
      });
      assert(doctorless.status === 'in_progress', 'Doctor-less emergency could not enter the dispatch queue');
      assert(doctorless.assigned_doctor_id === null, 'Doctor-less emergency invented a clinician');

      await cancelEmergency(first.id, fixtures.orgAdminA.client);
      await cancelEmergency(second.id, fixtures.orgAdminA.client);
      await cancelEmergency(doctorless.id, fixtures.orgAdminB.client);
    });
  } catch (error) {
    failure = error;
  } finally {
    try {
      await cleanup();
      report.cleanup_passed = true;
      console.log('[scheduled-visits-live-e2e] PASS zero-residue cleanup');
    } catch (cleanupError) {
      report.cleanup_passed = false;
      failure = failure
        ? new Error(`${failure.message}; cleanup failed: ${cleanupError.message}`)
        : cleanupError;
      console.error(`[scheduled-visits-live-e2e] FAIL cleanup: ${cleanupError.message}`);
    }

    report.finished_at = new Date().toISOString();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (failure) {
    console.error(`[scheduled-visits-live-e2e] FAILED: ${failure.message}`);
    process.exit(1);
  }

  console.log(
    `[scheduled-visits-live-e2e] PASS ${report.passed}/${report.passed + report.failed} checks; cleanup=zero residue`
  );
  console.log(`[scheduled-visits-live-e2e] Report written: ${reportPath}`);
}

main().catch((error) => {
  console.error(`[scheduled-visits-live-e2e] Fatal: ${error.message}`);
  process.exit(1);
});
