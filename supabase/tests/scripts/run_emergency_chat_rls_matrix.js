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
  console.error('[emergency-chat-rls-matrix] Missing Supabase credentials in .env/.env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = 'TestPass123!';
const TS = Date.now();
const TAG = `chat-rls-matrix-${TS}`;
const OUT_DIR = path.join('supabase', 'tests', 'artifacts');
const OUT_FILE = path.join(OUT_DIR, 'emergency_chat_rls_matrix_report.json');

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
    full_name: `${label} ${TAG}`,
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

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function rpcRoomPayload(data) {
  return data?.room ? data : data?.data?.room ? data.data : data;
}

async function safeRun(label, fn, warnings) {
  try {
    await fn();
  } catch (error) {
    warnings.push(`${label}: ${error.message}`);
  }
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

  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(`delete emergency_requests via exec_sql failed: ${error.message}`);
  }
  if (!data?.success) {
    throw new Error(`delete emergency_requests via exec_sql rejected: ${data?.error || 'unknown error'}`);
  }
}

function makeResult(caseId, actor, action, expectSuccess) {
  return {
    caseId,
    actor,
    action,
    expectSuccess,
    success: false,
    error: null,
    detail: null,
  };
}

async function assertSelectVisible({ client, table, roomId, actor, expectVisible, report }) {
  const result = makeResult(`${actor}.${table}.select`, actor, `${table}.select`, expectVisible);
  const { data, error } = await client.from(table).select('*').eq('room_id', roomId);
  if (error && table !== 'emergency_chat_rooms') {
    result.error = error.message;
  }

  let rows = asArray(data);
  if (table === 'emergency_chat_rooms') {
    const roomRes = await client.from(table).select('*').eq('id', roomId);
    if (roomRes.error) {
      result.error = roomRes.error.message;
    }
    rows = asArray(roomRes.data);
  }

  const visible = rows.length > 0;
  const explicitlyDenied = Boolean(
    result.error && /permission denied|row-level security|not authorized|forbidden/i.test(result.error),
  );
  result.success = expectVisible
    ? visible && !result.error
    : !visible && (!result.error || explicitlyDenied);
  result.detail = { visibleRows: rows.length };
  report.results.push(result);
}

async function assertRpc({ client, actor, action, expectSuccess, report, run }) {
  const result = makeResult(`${actor}.${action}`, actor, action, expectSuccess);
  const { data, error } = await run(client);
  const succeeded = !error;
  result.success = expectSuccess ? succeeded : !succeeded;
  result.error = error?.message || null;
  result.detail = data || null;
  report.results.push(result);
  return { data, error, result };
}

async function main() {
  const ctx = {
    userIds: [],
    orgA: null,
    orgB: null,
    hospitalA: null,
    hospitalB: null,
    requestId: null,
    roomId: null,
    messageIds: [],
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
      .insert({ name: `Chat RLS Org A ${TAG}` })
      .select('id')
      .single();
    if (orgAErr) throw new Error(`orgA create failed: ${orgAErr.message}`);
    ctx.orgA = orgA.id;

    const { data: orgB, error: orgBErr } = await admin
      .from('organizations')
      .insert({ name: `Chat RLS Org B ${TAG}` })
      .select('id')
      .single();
    if (orgBErr) throw new Error(`orgB create failed: ${orgBErr.message}`);
    ctx.orgB = orgB.id;

    const { data: hospitalA, error: hospitalAErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: ctx.orgA,
        name: `Chat RLS Hospital A ${TAG}`,
        address: '1 Chat Matrix Way',
        status: 'available',
        verified: true,
        available_beds: 8,
        total_beds: 30,
      })
      .select('id')
      .single();
    if (hospitalAErr) throw new Error(`hospitalA create failed: ${hospitalAErr.message}`);
    ctx.hospitalA = hospitalA.id;

    const { data: hospitalB, error: hospitalBErr } = await admin
      .from('hospitals')
      .insert({
        organization_id: ctx.orgB,
        name: `Chat RLS Hospital B ${TAG}`,
        address: '2 Chat Matrix Way',
        status: 'available',
        verified: true,
        available_beds: 8,
        total_beds: 30,
      })
      .select('id')
      .single();
    if (hospitalBErr) throw new Error(`hospitalB create failed: ${hospitalBErr.message}`);
    ctx.hospitalB = hospitalB.id;

    const users = {
      patient: await createAuthUser({ label: 'patient', role: 'patient' }),
      driver: await createAuthUser({
        label: 'driver',
        role: 'provider',
        providerType: 'driver',
        organizationId: ctx.orgA,
      }),
      dispatcherA: await createAuthUser({
        label: 'dispatcher-a',
        role: 'dispatcher',
        organizationId: ctx.orgA,
      }),
      outsider: await createAuthUser({
        label: 'outsider',
        role: 'dispatcher',
        organizationId: ctx.orgB,
      }),
    };
    ctx.userIds.push(...Object.values(users).map((user) => user.id));

    const { data: request, error: requestErr } = await admin
      .from('emergency_requests')
      .insert({
        user_id: users.patient.id,
        hospital_id: ctx.hospitalA,
        hospital_name: `Chat RLS Hospital A ${TAG}`,
        service_type: 'ambulance',
        status: 'in_progress',
        payment_status: 'paid',
        responder_id: users.driver.id,
        responder_name: `driver ${TAG}`,
        responder_phone: '+15555550100',
      })
      .select('id')
      .single();
    if (requestErr) throw new Error(`emergency request create failed: ${requestErr.message}`);
    ctx.requestId = request.id;

    const clients = {
      patient: await signInAs(email('patient')),
      driver: await signInAs(email('driver')),
      dispatcherA: await signInAs(email('dispatcher-a')),
      outsider: await signInAs(email('outsider')),
      anon: createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    };

    const ensureRes = await assertRpc({
      client: clients.patient,
      actor: 'patient',
      action: 'ensure_emergency_chat_room',
      expectSuccess: true,
      report,
      run: (client) => client.rpc('ensure_emergency_chat_room', { p_request_id: ctx.requestId }),
    });
    if (ensureRes.error) {
      throw new Error(`room ensure failed: ${ensureRes.error.message}`);
    }

    const payload = rpcRoomPayload(ensureRes.data);
    ctx.roomId = payload?.room?.id;
    if (!ctx.roomId) {
      throw new Error('ensure_emergency_chat_room returned no room id');
    }

    await assertRpc({
      client: clients.patient,
      actor: 'patient',
      action: 'send_emergency_chat_message',
      expectSuccess: true,
      report,
      run: (client) =>
        client.rpc('send_emergency_chat_message', {
          p_room_id: ctx.roomId,
          p_body: 'We are ready at the pickup point.',
          p_kind: 'text',
          p_client_message_id: `${TAG}-patient-1`,
          p_metadata: { source: 'rls_matrix' },
        }),
    }).then(({ data }) => {
      if (data?.id) ctx.messageIds.push(data.id);
    });

    await assertRpc({
      client: clients.driver,
      actor: 'driver',
      action: 'send_emergency_chat_message',
      expectSuccess: true,
      report,
      run: (client) =>
        client.rpc('send_emergency_chat_message', {
          p_room_id: ctx.roomId,
          p_body: 'Ambulance team is en route.',
          p_kind: 'quick_action',
          p_client_message_id: `${TAG}-driver-1`,
          p_metadata: { source: 'rls_matrix' },
        }),
    }).then(({ data }) => {
      if (data?.id) ctx.messageIds.push(data.id);
    });

    await assertRpc({
      client: clients.dispatcherA,
      actor: 'same_org_dispatcher',
      action: 'send_emergency_chat_message',
      expectSuccess: true,
      report,
      run: (client) =>
        client.rpc('send_emergency_chat_message', {
          p_room_id: ctx.roomId,
          p_body: 'Dispatch is monitoring the trip.',
          p_kind: 'text',
          p_client_message_id: `${TAG}-dispatcher-1`,
          p_metadata: { source: 'rls_matrix' },
        }),
    }).then(({ data }) => {
      if (data?.id) ctx.messageIds.push(data.id);
    });

    await assertRpc({
      client: clients.outsider,
      actor: 'outside_org_dispatcher',
      action: 'send_emergency_chat_message',
      expectSuccess: false,
      report,
      run: (client) =>
        client.rpc('send_emergency_chat_message', {
          p_room_id: ctx.roomId,
          p_body: 'This should not be allowed.',
          p_kind: 'text',
          p_client_message_id: `${TAG}-outsider-1`,
          p_metadata: { source: 'rls_matrix' },
        }),
    });

    await assertRpc({
      client: clients.anon,
      actor: 'anon',
      action: 'send_emergency_chat_message',
      expectSuccess: false,
      report,
      run: (client) =>
        client.rpc('send_emergency_chat_message', {
          p_room_id: ctx.roomId,
          p_body: 'Anonymous message',
          p_kind: 'text',
          p_client_message_id: `${TAG}-anon-1`,
          p_metadata: {},
        }),
    });

    for (const [actor, client] of [
      ['patient', clients.patient],
      ['driver', clients.driver],
      ['same_org_dispatcher', clients.dispatcherA],
    ]) {
      await assertSelectVisible({
        client,
        table: 'emergency_chat_rooms',
        roomId: ctx.roomId,
        actor,
        expectVisible: true,
        report,
      });
      await assertSelectVisible({
        client,
        table: 'emergency_chat_participants',
        roomId: ctx.roomId,
        actor,
        expectVisible: true,
        report,
      });
      await assertSelectVisible({
        client,
        table: 'emergency_chat_messages',
        roomId: ctx.roomId,
        actor,
        expectVisible: true,
        report,
      });
    }

    for (const [actor, client] of [
      ['outside_org_dispatcher', clients.outsider],
      ['anon', clients.anon],
    ]) {
      await assertSelectVisible({
        client,
        table: 'emergency_chat_rooms',
        roomId: ctx.roomId,
        actor,
        expectVisible: false,
        report,
      });
      await assertSelectVisible({
        client,
        table: 'emergency_chat_participants',
        roomId: ctx.roomId,
        actor,
        expectVisible: false,
        report,
      });
      await assertSelectVisible({
        client,
        table: 'emergency_chat_messages',
        roomId: ctx.roomId,
        actor,
        expectVisible: false,
        report,
      });
    }

    const lastMessageId = ctx.messageIds[ctx.messageIds.length - 1] || null;
    await assertRpc({
      client: clients.patient,
      actor: 'patient',
      action: 'mark_emergency_chat_room_read',
      expectSuccess: true,
      report,
      run: (client) =>
        client.rpc('mark_emergency_chat_room_read', {
          p_room_id: ctx.roomId,
          p_message_id: lastMessageId,
        }),
    });

    await assertRpc({
      client: clients.outsider,
      actor: 'outside_org_dispatcher',
      action: 'mark_emergency_chat_room_read',
      expectSuccess: false,
      report,
      run: (client) =>
        client.rpc('mark_emergency_chat_room_read', {
          p_room_id: ctx.roomId,
          p_message_id: lastMessageId,
        }),
    });
  } finally {
    await safeRun('delete emergency request', async () => {
      await deleteEmergencyRequestsWithTransitionCascade([ctx.requestId]);
    }, report.cleanupWarnings);

    await safeRun('delete hospitals', async () => {
      const ids = [ctx.hospitalA, ctx.hospitalB].filter(Boolean);
      if (ids.length) {
        const { error } = await admin.from('hospitals').delete().in('id', ids);
        if (error) throw error;
      }
    }, report.cleanupWarnings);

    await safeRun('delete organizations', async () => {
      const ids = [ctx.orgA, ctx.orgB].filter(Boolean);
      if (ids.length) {
        const { error } = await admin.from('organizations').delete().in('id', ids);
        if (error) throw error;
      }
    }, report.cleanupWarnings);

    for (const userId of ctx.userIds) {
      await safeRun(`delete auth user ${userId}`, async () => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
      }, report.cleanupWarnings);
    }
  }

  report.finishedAt = new Date().toISOString();
  report.summary.totalCases = report.results.length;
  report.summary.passed = report.results.filter((result) => result.success).length;
  report.summary.failed = report.results.filter((result) => !result.success).length;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (report.summary.failed > 0) {
    console.error(
      `[emergency-chat-rls-matrix] FAIL ${report.summary.failed}/${report.summary.totalCases} cases. Report: ${OUT_FILE}`
    );
    for (const failure of report.results.filter((result) => !result.success)) {
      console.error(` - ${failure.caseId}: ${failure.error || JSON.stringify(failure.detail)}`);
    }
    process.exit(1);
  }

  console.log(
    `[emergency-chat-rls-matrix] PASS ${report.summary.passed}/${report.summary.totalCases} cases. Report: ${OUT_FILE}`
  );
  if (report.cleanupWarnings.length) {
    console.warn(`[emergency-chat-rls-matrix] cleanup warnings: ${report.cleanupWarnings.join('; ')}`);
  }
}

main().catch((error) => {
  console.error(`[emergency-chat-rls-matrix] ERROR: ${error.stack || error.message}`);
  process.exit(1);
});
