#!/usr/bin/env node

const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.argv
  .find((value) => value.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('[data-room-e2e] Missing Supabase URL, anon key, or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('[data-room-e2e] Refusing to target an unconfirmed project reference.');
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(supabaseUrl, serviceRoleKey, options);
const runId = `data-room-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const fixture = {
  userIds: [],
  accessIds: [],
  inviteIds: [],
  channels: [],
};
const cleanedUserIds = new Set();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createUser(label) {
  const email = `codex-${runId}-${label}@example.invalid`;
  const password = `Dr!${crypto.randomBytes(24).toString('base64url')}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { fixture_owner: 'run_data_room_access_live_e2e', run_id: runId },
  });
  if (error) throw error;
  fixture.userIds.push(data.user.id);

  const client = createClient(supabaseUrl, anonKey, options);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

function createRealtimeProbe(client, name, filter) {
  let resolveEvent;
  const eventPromise = new Promise((resolve) => {
    resolveEvent = resolve;
  });
  const channel = client
    .channel(name)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'access_requests', filter },
      (payload) => resolveEvent(payload)
    );
  fixture.channels.push({ client, channel });

  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Realtime subscription timed out: ${name}`)), 12000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        resolve();
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        reject(new Error(`Realtime subscription failed: ${name} (${status})`));
      }
    });
  });

  const event = Promise.race([
    eventPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Realtime event timed out: ${name}`)), 12000)
    ),
  ]);
  return { channel, client, ready, event };
}

async function removeChannel(client, channel) {
  await client.removeChannel(channel);
  fixture.channels = fixture.channels.filter((entry) => entry.channel !== channel);
}

async function cleanup() {
  for (const { client, channel } of fixture.channels.splice(0)) {
    await client.removeChannel(channel);
  }

  for (const accessId of fixture.accessIds) {
    const { error } = await admin
      .from('notifications')
      .delete()
      .like('event_key', `data-room:access-request:${accessId}:%`);
    if (error) throw error;
  }
  if (fixture.inviteIds.length) {
    const { error } = await admin.from('document_invites').delete().in('id', fixture.inviteIds);
    if (error) throw error;
  }
  if (fixture.accessIds.length) {
    const { error } = await admin.from('access_requests').delete().in('id', fixture.accessIds);
    if (error) throw error;
  }
  if (fixture.userIds.length) {
    const { error: rolesError } = await admin.from('user_roles').delete().in('user_id', fixture.userIds);
    if (rolesError) throw rolesError;
    for (const userId of fixture.userIds) {
      if (cleanedUserIds.has(userId)) continue;
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      cleanedUserIds.add(userId);
    }
  }
}

async function assertZeroResidue() {
  const checks = [
    admin.from('access_requests').select('id', { count: 'exact', head: true }).in('id', fixture.accessIds),
    admin.from('document_invites').select('id', { count: 'exact', head: true }).in('id', fixture.inviteIds),
    admin.from('notifications').select('id', { count: 'exact', head: true }).like('event_key', `data-room:access-request:%`),
    admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', fixture.userIds),
  ];
  const [access, invites, allDataRoomNotifications, profiles] = await Promise.all(checks);
  for (const result of [access, invites, allDataRoomNotifications, profiles]) {
    if (result.error) throw result.error;
  }
  assert(access.count === 0, `access residue=${access.count}`);
  assert(invites.count === 0, `invite residue=${invites.count}`);
  assert(profiles.count === 0, `profile residue=${profiles.count}`);

  for (const accessId of fixture.accessIds) {
    const { count, error } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .like('event_key', `data-room:access-request:${accessId}:%`);
    if (error) throw error;
    assert(count === 0, `notification residue for ${accessId}=${count}`);
  }
  console.log(
    `[data-room-e2e] PASS zero exact-run residue; unrelated_data_room_notifications=${allDataRoomNotifications.count}`
  );
}

async function run() {
  const [userA, userB] = await Promise.all([createUser('a'), createUser('b')]);
  const { data: documents, error: documentsError } = await admin
    .from('documents')
    .select('id, slug')
    .order('created_at', { ascending: true })
    .limit(2);
  if (documentsError) throw documentsError;
  assert(documents?.length === 2, 'Two Data Room documents are required for the fixture');

  const accessRows = [
    {
      user_id: userA.id,
      document_id: documents[0].id,
      status: 'pending',
      nda_signed_at: new Date().toISOString(),
      signer_name: 'Data Room Contract A',
      signer_entity: runId,
    },
    {
      user_id: userA.id,
      document_id: documents[1].id,
      status: 'pending',
      nda_signed_at: new Date().toISOString(),
      signer_name: 'Data Room Contract A',
      signer_entity: runId,
    },
    {
      user_id: userB.id,
      document_id: documents[0].id,
      status: 'pending',
      nda_signed_at: new Date().toISOString(),
      signer_name: 'Data Room Contract B',
      signer_entity: runId,
    },
  ];
  const { data: insertedAccess, error: accessError } = await admin
    .from('access_requests')
    .insert(accessRows)
    .select('id, user_id, document_id');
  if (accessError) throw accessError;
  fixture.accessIds.push(...insertedAccess.map((row) => row.id));
  const accessA = insertedAccess.find(
    (row) => row.user_id === userA.id && row.document_id === documents[0].id
  );
  assert(accessA, 'Primary access fixture was not returned');

  const activeToken = randomToken();
  const expiredToken = randomToken();
  const inviteRows = [
    {
      email: userA.email,
      document_id: documents[0].id,
      token: activeToken,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
    {
      email: userA.email,
      document_id: documents[1].id,
      token: expiredToken,
      expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
    },
  ];
  const { data: insertedInvites, error: invitesError } = await admin
    .from('document_invites')
    .insert(inviteRows)
    .select('id');
  if (invitesError) throw invitesError;
  fixture.inviteIds.push(...insertedInvites.map((row) => row.id));

  const mismatch = await userB.client.rpc('claim_document_invite', { p_token: activeToken });
  assert(mismatch.error && /does not belong/i.test(mismatch.error.message), 'email mismatch was not denied');
  console.log('[data-room-e2e] PASS email mismatch denied');

  const expired = await userA.client.rpc('claim_document_invite', { p_token: expiredToken });
  assert(expired.error && /expired/i.test(expired.error.message), 'expired invite was not denied');
  console.log('[data-room-e2e] PASS expired invite denied');

  const firstRealtime = createRealtimeProbe(
    userA.client,
    `data-room-claim-${runId}`,
    `user_id=eq.${userA.id}`
  );
  await firstRealtime.ready;
  const claim = await userA.client.rpc('claim_document_invite', { p_token: activeToken });
  if (claim.error) throw claim.error;
  assert(claim.data?.status === 'approved' && claim.data?.replayed === false, 'first claim was invalid');
  const claimEvent = await firstRealtime.event;
  assert(claimEvent.new?.status === 'approved', 'claim realtime event did not carry approved state');
  await removeChannel(firstRealtime.client, firstRealtime.channel);
  console.log('[data-room-e2e] PASS claim and realtime approval');

  const replay = await userA.client.rpc('claim_document_invite', { p_token: activeToken });
  if (replay.error) throw replay.error;
  assert(replay.data?.replayed === true, 'same-user replay was not idempotent');
  const { count: approvedNoticeCount, error: approvedNoticeError } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('event_key', `data-room:access-request:${accessA.id}:status:approved`);
  if (approvedNoticeError) throw approvedNoticeError;
  assert(approvedNoticeCount === 1, `approved notification count=${approvedNoticeCount}`);
  console.log('[data-room-e2e] PASS replay and approved-notification idempotency');

  const reconnectRealtime = createRealtimeProbe(
    userA.client,
    `data-room-reconnect-${runId}`,
    `user_id=eq.${userA.id}`
  );
  await reconnectRealtime.ready;
  const { error: revokeError } = await admin
    .from('access_requests')
    .update({ status: 'revoked' })
    .eq('id', accessA.id);
  if (revokeError) throw revokeError;
  const revokeEvent = await reconnectRealtime.event;
  assert(revokeEvent.new?.status === 'revoked', 'reconnect realtime event did not carry revoked state');
  await removeChannel(reconnectRealtime.client, reconnectRealtime.channel);

  const revokedReplay = await userA.client.rpc('claim_document_invite', { p_token: activeToken });
  assert(
    revokedReplay.error && /no longer approved/i.test(revokedReplay.error.message),
    'revoked replay was not denied'
  );
  const { count: revokedNoticeCount, error: revokedNoticeError } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('event_key', `data-room:access-request:${accessA.id}:status:revoked`);
  if (revokedNoticeError) throw revokedNoticeError;
  assert(revokedNoticeCount === 1, `revoked notification count=${revokedNoticeCount}`);
  console.log('[data-room-e2e] PASS reconnect, revocation, and revoked-notification idempotency');
}

(async () => {
  let runError = null;
  try {
    await run();
  } catch (error) {
    runError = error;
    console.error(`[data-room-e2e] ${error.message}`);
  }

  try {
    await cleanup();
    await cleanup();
    await assertZeroResidue();
  } catch (cleanupError) {
    console.error(`[data-room-e2e] Cleanup failed: ${cleanupError.message}`);
    process.exitCode = 1;
    return;
  }

  if (runError) process.exitCode = 1;
})();
