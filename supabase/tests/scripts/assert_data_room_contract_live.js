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
  console.error('[data-room-live] Missing Supabase URL, anon key, or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('[data-room-live] Refusing to target an unconfirmed project reference.');
  process.exit(1);
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(supabaseUrl, serviceRoleKey, clientOptions);
const anonymous = createClient(supabaseUrl, anonKey, clientOptions);
const fixtureEmail = `codex-data-room-contract-${Date.now()}@example.invalid`;
const fixturePassword = `Dr!${crypto.randomBytes(24).toString('base64url')}`;
let fixtureUserId = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectDenied(label, operation) {
  const result = await operation();
  assert(result.error, `${label} unexpectedly succeeded`);
  console.log(`[data-room-live] PASS ${label}: denied`);
}

async function count(table) {
  const { count: value, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return value;
}

async function run() {
  const before = {
    documents: await count('documents'),
    access_requests: await count('access_requests'),
    document_invites: await count('document_invites'),
  };

  await expectDenied('anonymous document content read', () =>
    anonymous.from('documents').select('content').limit(1)
  );
  await expectDenied('anonymous invite enumeration', () =>
    anonymous.from('document_invites').select('id, token, email').limit(1)
  );

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: fixtureEmail,
    password: fixturePassword,
    email_confirm: true,
    user_metadata: { fixture_owner: 'assert_data_room_contract_live' },
  });
  if (createError) throw createError;
  fixtureUserId = created.user.id;

  const authenticated = createClient(supabaseUrl, anonKey, clientOptions);
  const { error: signInError } = await authenticated.auth.signInWithPassword({
    email: fixtureEmail,
    password: fixturePassword,
  });
  if (signInError) throw signInError;

  const { data: document, error: documentError } = await admin
    .from('documents')
    .select('id')
    .limit(1)
    .single();
  if (documentError) throw documentError;

  await expectDenied('authenticated document content read', () =>
    authenticated.from('documents').select('content').limit(1)
  );
  await expectDenied('authenticated document path read', () =>
    authenticated.from('documents').select('file_path').limit(1)
  );
  await expectDenied('authenticated invite enumeration', () =>
    authenticated.from('document_invites').select('id, token, email').limit(1)
  );
  await expectDenied('authenticated self-approval insert', () =>
    authenticated.from('access_requests').insert({
      user_id: fixtureUserId,
      document_id: document.id,
      status: 'approved',
    })
  );

  const claim = await authenticated.rpc('claim_document_invite', {
    p_token: '0'.repeat(64),
  });
  assert(claim.error, 'invalid invite claim unexpectedly succeeded');
  assert(/invite not found/i.test(claim.error.message), 'invite receiver returned an unexpected error');
  console.log('[data-room-live] PASS authenticated invite receiver is present and fail-closed');

  const { count: fixtureRows, error: fixtureRowsError } = await admin
    .from('access_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', fixtureUserId);
  if (fixtureRowsError) throw fixtureRowsError;
  assert(fixtureRows === 0, `denied self-approval left ${fixtureRows} access rows`);

  const after = {
    documents: await count('documents'),
    access_requests: await count('access_requests'),
    document_invites: await count('document_invites'),
  };
  assert(JSON.stringify(before) === JSON.stringify(after), 'live proof changed Data Room row counts');
  console.log(`[data-room-live] PASS row invariants ${JSON.stringify(after)}`);
}

run()
  .catch((error) => {
    console.error(`[data-room-live] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!fixtureUserId) return;
    const { error } = await admin.auth.admin.deleteUser(fixtureUserId);
    if (error) {
      console.error(`[data-room-live] Fixture cleanup failed: ${error.message}`);
      process.exitCode = 1;
    } else {
      console.log('[data-room-live] PASS exact auth fixture removed');
    }
  });
