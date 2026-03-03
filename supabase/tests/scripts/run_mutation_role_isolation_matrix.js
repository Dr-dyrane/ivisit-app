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
  console.error('[mutation-role-matrix] Missing Supabase credentials in .env/.env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = 'TestPass123!';
const TS = Date.now();
const TAG = `mutation-role-matrix-${TS}`;

const email = (label) => `${TAG}-${label}@ivisit-e2e.local`;
const rand = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeRun(label, fn, warnings) {
  try {
    await fn();
  } catch (error) {
    warnings.push(`${label}: ${error.message}`);
  }
}

async function settleActiveEmergencyRequestsForUser(userId) {
  const sql = `
    SELECT set_config('ivisit.allow_emergency_status_write', '1', true);
    UPDATE public.emergency_requests
    SET status = 'cancelled',
        cancelled_at = COALESCE(cancelled_at, NOW()),
        updated_at = NOW()
    WHERE user_id = '${userId}'
      AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived');
  `;
  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`exec_sql settle failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`exec_sql settle rejected: ${data?.error || 'unknown error'}`);
  }
}

async function ensureProfile(userId, patch) {
  for (let i = 0; i < 8; i += 1) {
    const { error } = await admin.from('profiles').update(patch).eq('id', userId);
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
  if (error) throw new Error(`createUser(${label}) failed: ${error.message}`);
  const patch = { role, organization_id: organizationId };
  if (providerType) patch.provider_type = providerType;
  await ensureProfile(data.user.id, patch);
  return data.user;
}

async function signInAs(emailAddress) {
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email: emailAddress, password: PASSWORD });
  if (error) throw new Error(`signInWithPassword(${emailAddress}) failed: ${error.message}`);
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rpcSucceeded(tc, data, error) {
  if (error) return false;
  if (tc.rpcBoolean) return data === true;
  if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'success')) {
    return data.success !== false;
  }
  return true;
}

function resultShape(tc) {
  return {
    caseId: tc.id,
    role: tc.role,
    rpc: tc.rpc,
    expectSuccess: tc.expectSuccess,
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
  };

  const report = {
    tag: TAG,
    startedAt: new Date().toISOString(),
    summary: { totalCases: 0, passed: 0, failed: 0 },
    results: [],
    cleanupWarnings: [],
  };

  try {
    const { data: orgA, error: orgAErr } = await admin
      .from('organizations')
      .insert({ name: `Mutation Matrix Org A ${TAG}` })
      .select()
      .single();
    if (orgAErr) throw new Error(`orgA create failed: ${orgAErr.message}`);
    ctx.orgA = orgA.id;

    const { data: orgB, error: orgBErr } = await admin
      .from('organizations')
      .insert({ name: `Mutation Matrix Org B ${TAG}` })
      .select()
      .single();
    if (orgBErr) throw new Error(`orgB create failed: ${orgBErr.message}`);
    ctx.orgB = orgB.id;

    await admin.from('organization_wallets').upsert({ organization_id: ctx.orgA, balance: 10000 }, { onConflict: 'organization_id' });
    await admin.from('organization_wallets').upsert({ organization_id: ctx.orgB, balance: 10000 }, { onConflict: 'organization_id' });

    const { data: hospA, error: hospAErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: ctx.orgA,
        name: `Mutation Matrix Hospital A ${TAG}`,
        address: '1 Matrix Way',
        status: 'available',
        available_beds: 9,
        total_beds: 30,
        emergency_wait_time_minutes: 12,
        ambulances_count: 2,
      })
      .select()
      .single();
    if (hospAErr) throw new Error(`hospitalA create failed: ${hospAErr.message}`);
    ctx.hospitalA = hospA.id;

    const { data: hospB, error: hospBErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: ctx.orgB,
        name: `Mutation Matrix Hospital B ${TAG}`,
        address: '2 Matrix Way',
        status: 'available',
        available_beds: 9,
        total_beds: 30,
        emergency_wait_time_minutes: 12,
        ambulances_count: 2,
      })
      .select()
      .single();
    if (hospBErr) throw new Error(`hospitalB create failed: ${hospBErr.message}`);
    ctx.hospitalB = hospB.id;

    ctx.users.patient = await createAuthUser({ label: 'patient', role: 'patient' });
    ctx.users.admin = await createAuthUser({ label: 'admin', role: 'admin' });
    ctx.users.orgAdminA = await createAuthUser({ label: 'orgadmin-a', role: 'org_admin', organizationId: ctx.orgA });
    ctx.users.dispatcherA = await createAuthUser({ label: 'dispatcher-a', role: 'dispatcher', organizationId: ctx.orgA });
    ctx.users.dispatcherB = await createAuthUser({ label: 'dispatcher-b', role: 'dispatcher', organizationId: ctx.orgB });
    ctx.users.viewerA = await createAuthUser({ label: 'viewer-a', role: 'viewer', organizationId: ctx.orgA });

    ctx.userIds.push(
      ctx.users.patient.id,
      ctx.users.admin.id,
      ctx.users.orgAdminA.id,
      ctx.users.dispatcherA.id,
      ctx.users.dispatcherB.id,
      ctx.users.viewerA.id
    );

    const clients = {
      admin: await signInAs(email('admin')),
      orgAdminA: await signInAs(email('orgadmin-a')),
      dispatcherA: await signInAs(email('dispatcher-a')),
      dispatcherB: await signInAs(email('dispatcher-b')),
      viewerA: await signInAs(email('viewer-a')),
      patient: await signInAs(email('patient')),
      anon: createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    };

    const hospitalSnapshot = async (hospitalId) => {
      const { data, error } = await admin
        .from('hospitals')
        .select('available_beds, emergency_wait_time_minutes, status, ambulances_count')
        .eq('id', hospitalId)
        .single();
      if (error) throw new Error(`hospital snapshot failed: ${error.message}`);
      return data;
    };

    const createRequest = async (hospitalId, serviceType, status = 'accepted') => {
      const { data, error } = await admin
        .from('emergency_requests')
        .insert({
          user_id: ctx.users.patient.id,
          hospital_id: hospitalId,
          hospital_name: `Mutation Matrix Hospital ${TAG}`,
          service_type: serviceType,
          status,
          payment_status: 'completed',
        })
        .select('id')
        .single();
      if (error) throw new Error(`request create failed: ${error.message}`);
      ctx.requestIds.push(data.id);
      return data.id;
    };

    const requestStatus = async (requestId) => {
      const { data, error } = await admin.from('emergency_requests').select('status').eq('id', requestId).single();
      if (error) throw new Error(`request status read failed: ${error.message}`);
      return data.status;
    };

    const countService = async (serviceType, hospitalId = null) => {
      let q = admin.from('service_pricing').select('*', { count: 'exact', head: true }).eq('service_type', serviceType);
      q = hospitalId ? q.eq('hospital_id', hospitalId) : q.is('hospital_id', null);
      const { count, error } = await q;
      if (error) throw new Error(`service count failed: ${error.message}`);
      return count || 0;
    };

    const countRoom = async (roomType, hospitalId = null) => {
      let q = admin.from('room_pricing').select('*', { count: 'exact', head: true }).eq('room_type', roomType);
      q = hospitalId ? q.eq('hospital_id', hospitalId) : q.is('hospital_id', null);
      const { count, error } = await q;
      if (error) throw new Error(`room count failed: ${error.message}`);
      return count || 0;
    };

    const createService = async (serviceType, hospitalId = null) => {
      const { data, error } = await admin
        .from('service_pricing')
        .insert({
          hospital_id: hospitalId,
          service_type: serviceType,
          service_name: `Svc ${serviceType}`,
          base_price: 160,
          description: `${TAG}-svc`,
        })
        .select('id')
        .single();
      if (error) throw new Error(`service create failed: ${error.message}`);
      return data.id;
    };

    const createRoom = async (roomType, hospitalId = null) => {
      const { data, error } = await admin
        .from('room_pricing')
        .insert({
          hospital_id: hospitalId,
          room_type: roomType,
          room_name: `Room ${roomType}`,
          price_per_night: 260,
          description: `${TAG}-room`,
        })
        .select('id')
        .single();
      if (error) throw new Error(`room create failed: ${error.message}`);
      return data.id;
    };

    const cases = [
      {
        id: 'AV1',
        role: 'orgAdminA',
        rpc: 'update_hospital_availability',
        expectSuccess: true,
        rpcBoolean: true,
        prepare: async () => ({ hospitalId: ctx.hospitalA }),
        params: (s) => ({ hospital_id: s.hospitalId, beds_available: 3, er_wait_time: 25, p_status: 'busy', ambulance_count: 1 }),
        verify: async (s) => {
          const h = await hospitalSnapshot(s.hospitalId);
          if (h.available_beds !== 3 || h.emergency_wait_time_minutes !== 25 || h.status !== 'busy') throw new Error('availability update failed');
        },
      },
      {
        id: 'AV2',
        role: 'dispatcherB',
        rpc: 'update_hospital_availability',
        expectSuccess: false,
        rpcBoolean: true,
        prepare: async () => {
          const baseline = { available_beds: 8, emergency_wait_time_minutes: 10, status: 'available', ambulances_count: 3 };
          const { error } = await admin.from('hospitals').update(baseline).eq('id', ctx.hospitalA);
          if (error) throw new Error(`hospital baseline failed: ${error.message}`);
          return { hospitalId: ctx.hospitalA, baseline };
        },
        params: (s) => ({ hospital_id: s.hospitalId, beds_available: 1, er_wait_time: 60, p_status: 'full', ambulance_count: 0 }),
        verify: async (s) => {
          const h = await hospitalSnapshot(s.hospitalId);
          if (h.available_beds !== s.baseline.available_beds || h.status !== s.baseline.status) throw new Error('unauthorized availability mutation leaked');
        },
      },
      {
        id: 'SP1',
        role: 'orgAdminA',
        rpc: 'upsert_service_pricing',
        expectSuccess: true,
        prepare: async () => ({ serviceType: rand('svc-own'), hospitalId: ctx.hospitalA }),
        params: (s) => ({ payload: { hospital_id: s.hospitalId, service_type: s.serviceType, service_name: s.serviceType, base_price: 300, description: `${TAG}-sp1` } }),
        verify: async (s) => {
          if ((await countService(s.serviceType, s.hospitalId)) !== 1) throw new Error('service upsert missing');
        },
      },
      {
        id: 'SP2',
        role: 'dispatcherB',
        rpc: 'upsert_service_pricing',
        expectSuccess: false,
        prepare: async () => ({ serviceType: rand('svc-cross'), hospitalId: ctx.hospitalA }),
        params: (s) => ({ payload: { hospital_id: s.hospitalId, service_type: s.serviceType, service_name: s.serviceType, base_price: 301, description: `${TAG}-sp2` } }),
        verify: async (s) => {
          if ((await countService(s.serviceType, s.hospitalId)) !== 0) throw new Error('unauthorized service upsert leaked');
        },
      },
      {
        id: 'SP3',
        role: 'admin',
        rpc: 'upsert_service_pricing',
        expectSuccess: true,
        prepare: async () => ({ serviceType: rand('svc-global') }),
        params: (s) => ({ payload: { hospital_id: null, service_type: s.serviceType, service_name: s.serviceType, base_price: 480, description: `${TAG}-sp3` } }),
        verify: async (s) => {
          if ((await countService(s.serviceType, null)) < 1) throw new Error('global service upsert failed');
        },
      },
      {
        id: 'SP4',
        role: 'orgAdminA',
        rpc: 'upsert_service_pricing',
        expectSuccess: false,
        prepare: async () => ({ serviceType: rand('svc-global-block') }),
        params: (s) => ({ payload: { hospital_id: null, service_type: s.serviceType, service_name: s.serviceType, base_price: 485, description: `${TAG}-sp4` } }),
        verify: async (s) => {
          if ((await countService(s.serviceType, null)) !== 0) throw new Error('unauthorized global service upsert leaked');
        },
      },
      {
        id: 'RP1',
        role: 'dispatcherA',
        rpc: 'upsert_room_pricing',
        expectSuccess: true,
        prepare: async () => ({ roomType: rand('room-own'), hospitalId: ctx.hospitalA }),
        params: (s) => ({ payload: { hospital_id: s.hospitalId, room_type: s.roomType, room_name: s.roomType, price_per_night: 210, description: `${TAG}-rp1` } }),
        verify: async (s) => {
          if ((await countRoom(s.roomType, s.hospitalId)) !== 1) throw new Error('room upsert missing');
        },
      },
      {
        id: 'RP2',
        role: 'viewerA',
        rpc: 'upsert_room_pricing',
        expectSuccess: false,
        prepare: async () => ({ roomType: rand('room-viewer'), hospitalId: ctx.hospitalA }),
        params: (s) => ({ payload: { hospital_id: s.hospitalId, room_type: s.roomType, room_name: s.roomType, price_per_night: 212, description: `${TAG}-rp2` } }),
        verify: async (s) => {
          if ((await countRoom(s.roomType, s.hospitalId)) !== 0) throw new Error('unauthorized room upsert leaked');
        },
      },
      {
        id: 'DS1',
        role: 'orgAdminA',
        rpc: 'delete_service_pricing',
        expectSuccess: true,
        prepare: async () => ({ id: await createService(rand('svc-del-own'), ctx.hospitalA) }),
        params: (s) => ({ target_id: s.id }),
        verify: async (s) => {
          const { data } = await admin.from('service_pricing').select('id').eq('id', s.id).maybeSingle();
          if (data) throw new Error('service delete failed');
        },
      },
      {
        id: 'DS2',
        role: 'dispatcherB',
        rpc: 'delete_service_pricing',
        expectSuccess: false,
        prepare: async () => ({ id: await createService(rand('svc-del-cross'), ctx.hospitalA) }),
        params: (s) => ({ target_id: s.id }),
        verify: async (s) => {
          const { data } = await admin.from('service_pricing').select('id').eq('id', s.id).maybeSingle();
          if (!data) throw new Error('unauthorized service delete leaked');
        },
      },
      {
        id: 'DR1',
        role: 'admin',
        rpc: 'delete_room_pricing',
        expectSuccess: true,
        prepare: async () => ({ id: await createRoom(rand('room-del-global'), null) }),
        params: (s) => ({ target_id: s.id }),
        verify: async (s) => {
          const { data } = await admin.from('room_pricing').select('id').eq('id', s.id).maybeSingle();
          if (data) throw new Error('global room delete failed');
        },
      },
      {
        id: 'DR2',
        role: 'orgAdminA',
        rpc: 'delete_room_pricing',
        expectSuccess: false,
        prepare: async () => ({ id: await createRoom(rand('room-del-global-block'), null) }),
        params: (s) => ({ target_id: s.id }),
        verify: async (s) => {
          const { data } = await admin.from('room_pricing').select('id').eq('id', s.id).maybeSingle();
          if (!data) throw new Error('unauthorized global room delete leaked');
        },
      },
      {
        id: 'TP1',
        role: 'dispatcherA',
        rpc: 'complete_trip',
        expectSuccess: true,
        rpcBoolean: true,
        prepare: async () => ({ requestId: await createRequest(ctx.hospitalA, 'ambulance', 'accepted') }),
        params: (s) => ({ request_uuid: s.requestId }),
        verify: async (s) => {
          if ((await requestStatus(s.requestId)) !== 'completed') throw new Error('complete_trip did not complete');
        },
      },
      {
        id: 'TP2',
        role: 'patient',
        rpc: 'complete_trip',
        expectSuccess: false,
        rpcBoolean: true,
        prepare: async () => ({ requestId: await createRequest(ctx.hospitalA, 'ambulance', 'accepted') }),
        params: (s) => ({ request_uuid: s.requestId }),
        verify: async (s) => {
          if ((await requestStatus(s.requestId)) !== 'accepted') throw new Error('unauthorized complete_trip leaked');
        },
      },
      {
        id: 'TP3',
        role: 'orgAdminA',
        rpc: 'cancel_trip',
        expectSuccess: true,
        rpcBoolean: true,
        prepare: async () => ({ requestId: await createRequest(ctx.hospitalA, 'ambulance', 'accepted') }),
        params: (s) => ({ request_uuid: s.requestId }),
        verify: async (s) => {
          if ((await requestStatus(s.requestId)) !== 'cancelled') throw new Error('cancel_trip did not cancel');
        },
      },
      {
        id: 'TP4',
        role: 'anon',
        rpc: 'cancel_trip',
        expectSuccess: false,
        rpcBoolean: true,
        prepare: async () => ({ requestId: await createRequest(ctx.hospitalA, 'ambulance', 'accepted') }),
        params: (s) => ({ request_uuid: s.requestId }),
        verify: async (s) => {
          if ((await requestStatus(s.requestId)) !== 'accepted') throw new Error('anon cancel_trip leaked');
        },
      },
      {
        id: 'BD1',
        role: 'orgAdminA',
        rpc: 'discharge_patient',
        expectSuccess: true,
        rpcBoolean: true,
        prepare: async () => ({ requestId: await createRequest(ctx.hospitalA, 'bed', 'accepted') }),
        params: (s) => ({ request_uuid: s.requestId }),
        verify: async (s) => {
          if ((await requestStatus(s.requestId)) !== 'completed') throw new Error('discharge_patient failed');
        },
      },
      {
        id: 'BD2',
        role: 'dispatcherB',
        rpc: 'discharge_patient',
        expectSuccess: false,
        rpcBoolean: true,
        prepare: async () => ({ requestId: await createRequest(ctx.hospitalA, 'bed', 'accepted') }),
        params: (s) => ({ request_uuid: s.requestId }),
        verify: async (s) => {
          if ((await requestStatus(s.requestId)) !== 'accepted') throw new Error('unauthorized discharge leaked');
        },
      },
      {
        id: 'BR1',
        role: 'dispatcherA',
        rpc: 'cancel_bed_reservation',
        expectSuccess: true,
        rpcBoolean: true,
        prepare: async () => ({ requestId: await createRequest(ctx.hospitalA, 'bed', 'accepted') }),
        params: (s) => ({ request_uuid: s.requestId }),
        verify: async (s) => {
          if ((await requestStatus(s.requestId)) !== 'cancelled') throw new Error('cancel_bed_reservation failed');
        },
      },
      {
        id: 'BR2',
        role: 'viewerA',
        rpc: 'cancel_bed_reservation',
        expectSuccess: false,
        rpcBoolean: true,
        prepare: async () => ({ requestId: await createRequest(ctx.hospitalA, 'bed', 'accepted') }),
        params: (s) => ({ request_uuid: s.requestId }),
        verify: async (s) => {
          if ((await requestStatus(s.requestId)) !== 'accepted') throw new Error('unauthorized bed cancel leaked');
        },
      },
    ];

    report.summary.totalCases = cases.length;

    for (const tc of cases) {
      const result = resultShape(tc);
      try {
        const setup = await tc.prepare();
        const { data, error } = await clients[tc.role].rpc(tc.rpc, tc.params(setup));
        result.rpcData = data || null;
        result.success = rpcSucceeded(tc, data, error);
        if (error) result.error = error.message;
        await tc.verify(setup);
      } catch (error) {
        result.success = false;
        result.error = error.message;
        if (/create failed|snapshot failed|baseline failed/.test(error.message)) result.setupError = true;
      }

      const passed = !result.setupError && result.success === tc.expectSuccess;
      if (passed) report.summary.passed += 1;
      else report.summary.failed += 1;
      result.passed = passed;
      report.results.push(result);

      await safeRun(
        `settle active requests after ${tc.id}`,
        async () => {
          await settleActiveEmergencyRequestsForUser(ctx.users.patient.id);
        },
        report.cleanupWarnings
      );
    }
  } finally {
    await safeRun('delete service_pricing', async () => {
      await admin.from('service_pricing').delete().like('description', `${TAG}%`);
    }, report.cleanupWarnings);
    await safeRun('delete room_pricing', async () => {
      await admin.from('room_pricing').delete().like('description', `${TAG}%`);
    }, report.cleanupWarnings);

    if (ctx.requestIds.length > 0) {
      const reqIds = [...new Set(ctx.requestIds)];
      await safeRun('delete visits', async () => {
        await admin.from('visits').delete().in('request_id', reqIds);
      }, report.cleanupWarnings);
      await safeRun('delete payments', async () => {
        await admin.from('payments').delete().in('emergency_request_id', reqIds);
      }, report.cleanupWarnings);
      await safeRun('delete emergency_requests', async () => {
        await admin.from('emergency_requests').delete().in('id', reqIds);
      }, report.cleanupWarnings);
    }

    await safeRun('delete hospitals', async () => {
      if (ctx.hospitalA) await admin.from('hospitals').delete().eq('id', ctx.hospitalA);
      if (ctx.hospitalB) await admin.from('hospitals').delete().eq('id', ctx.hospitalB);
    }, report.cleanupWarnings);
    await safeRun('delete org wallets', async () => {
      if (ctx.orgA) await admin.from('organization_wallets').delete().eq('organization_id', ctx.orgA);
      if (ctx.orgB) await admin.from('organization_wallets').delete().eq('organization_id', ctx.orgB);
    }, report.cleanupWarnings);
    await safeRun('delete organizations', async () => {
      if (ctx.orgA) await admin.from('organizations').delete().eq('id', ctx.orgA);
      if (ctx.orgB) await admin.from('organizations').delete().eq('id', ctx.orgB);
    }, report.cleanupWarnings);

    for (const userId of ctx.userIds) {
      await safeRun(`delete auth user ${userId}`, async () => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw new Error(error.message);
      }, report.cleanupWarnings);
    }

    report.completedAt = new Date().toISOString();
    const outDir = path.join(__dirname, '..', 'validation');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'mutation_role_isolation_matrix_report.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`[mutation-role-matrix] report: ${outFile}`);
    console.log(`[mutation-role-matrix] passed=${report.summary.passed} failed=${report.summary.failed} total=${report.summary.totalCases}`);

    if (report.summary.failed > 0) {
      throw new Error(`mutation role-isolation matrix failed: ${report.summary.failed}/${report.summary.totalCases} cases failed`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[mutation-role-matrix] FAIL:', error.message);
    process.exit(1);
  });
