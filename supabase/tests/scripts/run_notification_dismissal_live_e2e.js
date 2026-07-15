const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const appRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(appRoot, '.env.local') });
dotenv.config({ path: path.join(appRoot, '.env') });
dotenv.config({ path: path.resolve(appRoot, '..', 'ivisit-console', 'frontend', '.env.local') });
dotenv.config({ path: path.resolve(appRoot, '..', 'ivisit-console', 'frontend', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.argv
  .find((arg) => arg.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);
const applyApproved = process.argv.includes('--apply');

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('[notification-dismissal-live-e2e] Missing Supabase credentials.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef || !applyApproved) {
  console.error(
    `[notification-dismissal-live-e2e] Refusing live writes. Pass --project-ref=${projectRef} --apply to confirm the target.`,
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const runId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const tag = `notification-dismissal-${runId}`;
const password = `Contract!${crypto.randomBytes(12).toString('base64url')}`;
const reportPath = path.join(
  appRoot,
  'supabase',
  'tests',
  'artifacts',
  'notification_dismissal_live_e2e_report.json',
);
const state = {
  userIds: [],
  notificationIds: [],
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

function sameInstant(left, right) {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

function record(name, status, detail = null) {
  report.results.push({ name, status, detail });
  if (status === 'pass') {
    report.passed += 1;
    console.log(`[notification-dismissal-live-e2e] PASS ${name}`);
  } else {
    report.failed += 1;
    console.error(`[notification-dismissal-live-e2e] FAIL ${name}: ${detail}`);
  }
}

async function check(name, operation) {
  try {
    const detail = await operation();
    record(name, 'pass', detail ?? null);
    return detail;
  } catch (error) {
    record(name, 'fail', error.message);
    throw error;
  }
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

async function createActor(label) {
  const email = `${tag}-${label}@ivisit-e2e.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${label} ${tag}` },
  });
  if (error) throw error;

  state.userIds.push(data.user.id);
  await waitForProfile(data.user.id);
  return { id: data.user.id, email };
}

async function signIn(actor) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: actor.email,
    password,
  });
  if (error) throw error;
  return client;
}

async function createCanonicalFixture(actor, label) {
  const eventKey = `${tag}:${label}`;
  const title = `Dismissal contract ${label}`;
  const { data, error } = await admin
    .from('notifications')
    .insert({
      user_id: actor.id,
      event_key: eventKey,
      type: 'system',
      title,
      message: 'Temporary live contract evidence.',
      priority: 'normal',
      action_type: 'contract_test',
      metadata: { contract_test: tag },
    })
    .select('id,user_id,event_key,title,read,dismissed_at')
    .single();
  if (error) throw error;
  state.notificationIds.push(data.id);
  return data;
}

async function cleanup() {
  const warnings = [];

  if (state.notificationIds.length > 0) {
    const { error } = await admin
      .from('notifications')
      .delete()
      .in('id', state.notificationIds);
    if (error) warnings.push(`notifications: ${error.message}`);
  }

  for (const userId of [...state.userIds].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) warnings.push(`auth user ${userId}: ${error.message}`);
    const profileDelete = await admin.from('profiles').delete().eq('id', userId);
    if (profileDelete.error) warnings.push(`profile ${userId}: ${profileDelete.error.message}`);
  }

  if (state.notificationIds.length > 0) {
    const residue = await admin
      .from('notifications')
      .select('id')
      .in('id', state.notificationIds);
    if (residue.error) warnings.push(`notification residue check: ${residue.error.message}`);
    if ((residue.data || []).length > 0) warnings.push('notification fixture rows remain');
  }

  if (state.userIds.length > 0) {
    const residue = await admin.from('profiles').select('id').in('id', state.userIds);
    if (residue.error) warnings.push(`profile residue check: ${residue.error.message}`);
    if ((residue.data || []).length > 0) warnings.push('fixture profiles remain');
  }

  report.cleanup_passed = warnings.length === 0;
  if (warnings.length > 0) {
    record('zero_residue_cleanup', 'fail', warnings.join('; '));
  } else {
    record('zero_residue_cleanup', 'pass');
  }
}

async function run() {
  let owner;
  let other;
  let ownerNotification;
  let otherNotification;

  try {
    owner = await createActor('owner');
    other = await createActor('other');
    ownerNotification = await createCanonicalFixture(owner, 'owner');
    otherNotification = await createCanonicalFixture(other, 'other');

    const ownerClient = await signIn(owner);
    const ownerSecondClient = await signIn(owner);
    const otherClient = await signIn(other);

    await check('recipient_reads_own_notification', async () => {
      const { data, error } = await ownerClient
        .from('notifications')
        .select('id,event_key,dismissed_at')
        .eq('id', ownerNotification.id)
        .maybeSingle();
      if (error) throw error;
      assert(data?.id === ownerNotification.id, 'Recipient could not read own notification');
      return data.event_key;
    });

    await check('recipient_cannot_read_other_notification', async () => {
      const { data, error } = await ownerClient
        .from('notifications')
        .select('id')
        .eq('id', otherNotification.id);
      if (error) throw error;
      assert((data || []).length === 0, 'Recipient could read another user notification');
      return 0;
    });

    const dismissedAt = new Date().toISOString();
    await check('recipient_dismisses_own_notification', async () => {
      const { data, error } = await ownerClient
        .from('notifications')
        .update({ dismissed_at: dismissedAt, updated_at: dismissedAt })
        .eq('id', ownerNotification.id)
        .select('id,dismissed_at')
        .maybeSingle();
      if (error) throw error;
      assert(sameInstant(data?.dismissed_at, dismissedAt), 'Dismissal timestamp did not persist');
      return data.dismissed_at;
    });

    await check('second_session_hides_dismissed_notification', async () => {
      const { data, error } = await ownerSecondClient
        .from('notifications')
        .select('id')
        .eq('id', ownerNotification.id)
        .is('dismissed_at', null);
      if (error) throw error;
      assert((data || []).length === 0, 'Dismissed notification remained in a second session');
      return 0;
    });

    await check('other_recipient_cannot_dismiss_owner_notification', async () => {
      const attemptedAt = new Date(Date.now() + 1000).toISOString();
      const { data, error } = await otherClient
        .from('notifications')
        .update({ dismissed_at: attemptedAt, updated_at: attemptedAt })
        .eq('id', ownerNotification.id)
        .select('id');
      if (error) throw error;
      assert((data || []).length === 0, 'Cross-recipient dismissal unexpectedly updated a row');

      const verification = await admin
        .from('notifications')
        .select('dismissed_at')
        .eq('id', ownerNotification.id)
        .single();
      if (verification.error) throw verification.error;
      assert(
        sameInstant(verification.data.dismissed_at, dismissedAt),
        'Cross-recipient update changed dismissal state',
      );
      return 0;
    });

    await check('recipient_read_state_still_updates', async () => {
      const now = new Date().toISOString();
      const { data, error } = await otherClient
        .from('notifications')
        .update({ read: true, updated_at: now })
        .eq('id', otherNotification.id)
        .select('id,read')
        .single();
      if (error) throw error;
      assert(data.read === true, 'Read state did not persist');
      return true;
    });

    await check('recipient_cannot_edit_canonical_payload', async () => {
      const { error } = await otherClient
        .from('notifications')
        .update({ title: 'tampered' })
        .eq('id', otherNotification.id);
      assert(error, 'Canonical notification title update unexpectedly succeeded');
      return error.code || error.message;
    });

    await check('recipient_cannot_insert_notification', async () => {
      const { error } = await ownerClient.from('notifications').insert({
        user_id: owner.id,
        type: 'system',
        title: 'forged',
        message: 'forged',
      });
      assert(error, 'Client notification insert unexpectedly succeeded');
      return error.code || error.message;
    });

    await check('recipient_cannot_delete_notification', async () => {
      const { error } = await otherClient
        .from('notifications')
        .delete()
        .eq('id', otherNotification.id);
      assert(error, 'Client notification delete unexpectedly succeeded');
      return error.code || error.message;
    });

    await check('dismissal_preserves_canonical_event_row', async () => {
      const { data, error } = await admin
        .from('notifications')
        .select('id,event_key,title,dismissed_at')
        .eq('id', ownerNotification.id)
        .single();
      if (error) throw error;
      assert(data.event_key === ownerNotification.event_key, 'Canonical event identity changed');
      assert(data.title === ownerNotification.title, 'Canonical event payload changed');
      assert(sameInstant(data.dismissed_at, dismissedAt), 'Dismissal receipt is missing');
      return data.event_key;
    });
  } catch (error) {
    if (report.failed === 0) record('unhandled_live_contract_error', 'fail', error.message);
  } finally {
    await cleanup();
    report.finished_at = new Date().toISOString();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (report.failed > 0 || !report.cleanup_passed) {
    console.error(`[notification-dismissal-live-e2e] FAIL report: ${reportPath}`);
    process.exit(1);
  }

  console.log(`[notification-dismissal-live-e2e] PASS report: ${reportPath}`);
}

run().catch((error) => {
  console.error(`[notification-dismissal-live-e2e] Fatal error: ${error.message}`);
  process.exit(1);
});
