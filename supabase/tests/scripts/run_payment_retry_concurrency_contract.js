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
  .find((argument) => argument.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('[payment-retry-contract] Missing Supabase URL, anon key, or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('[payment-retry-contract] Refusing to target an unconfirmed project reference.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const password = `Contract-${crypto.randomBytes(12).toString('hex')}!`;
const tag = `console-payment-retry-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const state = {
  ownerId: null,
  attackerId: null,
  requestId: crypto.randomUUID(),
  paymentMethodId: crypto.randomUUID(),
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label) {
  const email = `${tag}-${label}@ivisit-e2e.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Payment Retry ${label}`, role: 'patient' },
  });
  if (error) throw new Error(`createUser(${label}) failed: ${error.message}`);
  return { id: data.user.id, email };
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (data?.id) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`profile bootstrap timed out for ${userId}`);
}

async function authenticatedClients(email, count = 1) {
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInWithPassword(${email}) failed: ${error.message}`);
  const authorization = `Bearer ${data.session.access_token}`;
  return Array.from({ length: count }, () =>
    createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  );
}

async function rpc(client, userId) {
  const { data, error } = await client.rpc('retry_payment_with_different_method', {
    p_emergency_request_id: state.requestId,
    p_new_payment_method_id: state.paymentMethodId,
    p_user_id: userId,
  });
  if (error) throw new Error(`retry_payment_with_different_method failed: ${error.message}`);
  return data;
}

async function setup() {
  const owner = await createUser('owner');
  state.ownerId = owner.id;
  const attacker = await createUser('attacker');
  state.attackerId = attacker.id;
  await Promise.all([waitForProfile(owner.id), waitForProfile(attacker.id)]);

  const { error: methodError } = await admin.from('payment_methods').insert({
    id: state.paymentMethodId,
    user_id: owner.id,
    type: 'card',
    provider: 'stripe',
    last4: '4242',
    is_active: true,
    metadata: { contract_tag: tag },
  });
  if (methodError) throw methodError;

  const { error: requestError } = await admin.from('emergency_requests').insert({
    id: state.requestId,
    user_id: owner.id,
    status: 'payment_declined',
    payment_status: 'failed',
    service_type: 'booking',
    total_cost: 42,
    patient_snapshot: { contract_tag: tag },
  });
  if (requestError) throw requestError;

  return { owner, attacker };
}

async function verifyUnauthorized(attacker) {
  const [attackerClient] = await authenticatedClients(attacker.email);
  const result = await rpc(attackerClient, state.ownerId);
  assert(result?.success === false, 'cross-user retry unexpectedly succeeded');
  assert(result?.code === 'PAYMENT_RETRY_UNAUTHORIZED', 'cross-user retry returned the wrong code');

  const [{ data: request, error: requestError }, { count, error: paymentError }] = await Promise.all([
    admin
      .from('emergency_requests')
      .select('status,payment_status,payment_id')
      .eq('id', state.requestId)
      .single(),
    admin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('emergency_request_id', state.requestId),
  ]);
  if (requestError) throw requestError;
  if (paymentError) throw paymentError;
  assert(request.status === 'payment_declined', 'unauthorized retry changed request status');
  assert(request.payment_status === 'failed', 'unauthorized retry changed payment status');
  assert(request.payment_id === null, 'unauthorized retry attached a payment');
  assert(count === 0, 'unauthorized retry created a payment');
}

async function verifyConcurrentOwnerRetries(owner) {
  const ownerClients = await authenticatedClients(owner.email, 2);
  const results = await Promise.all(ownerClients.map((client) => rpc(client, state.ownerId)));
  assert(results.every((result) => result?.success === true), 'an owner retry failed');
  assert(results.every((result) => result?.retry_successful === true), 'retry result was not reflected');

  const paymentIds = new Set(results.map((result) => result?.payment_id).filter(Boolean));
  assert(paymentIds.size === 1, 'concurrent retries returned different payments');
  assert(
    results.filter((result) => result?.reused_pending === true).length === 1,
    'concurrent retries did not report exactly one pending-payment reuse'
  );

  const paymentId = [...paymentIds][0];
  const [
    { data: request, error: requestError },
    { data: payments, error: paymentError },
    { data: transitions, error: transitionError },
  ] = await Promise.all([
    admin
      .from('emergency_requests')
      .select('status,payment_status,payment_id,payment_method_id')
      .eq('id', state.requestId)
      .single(),
    admin
      .from('payments')
      .select('id,user_id,status,amount,payment_method,metadata')
      .eq('emergency_request_id', state.requestId)
      .eq('status', 'pending'),
    admin
      .from('emergency_status_transitions')
      .select('from_status,to_status,source,actor_user_id')
      .eq('emergency_request_id', state.requestId)
      .eq('from_status', 'payment_declined')
      .eq('to_status', 'pending_approval'),
  ]);
  if (requestError) throw requestError;
  if (paymentError) throw paymentError;
  if (transitionError) throw transitionError;

  assert(request.status === 'pending_approval', 'request status did not converge');
  assert(request.payment_status === 'pending', 'request payment status did not converge');
  assert(request.payment_id === paymentId, 'request did not reference the shared pending payment');
  assert(request.payment_method_id === state.paymentMethodId, 'request did not reflect the new method');
  assert(payments.length === 1, 'concurrent retries created more than one pending payment');
  assert(payments[0].id === paymentId, 'persisted payment differs from the RPC result');
  assert(payments[0].user_id === state.ownerId, 'persisted payment has the wrong owner');
  assert(Number(payments[0].amount) === 42, 'persisted payment has the wrong amount');
  assert(payments[0].payment_method === 'card', 'persisted payment has the wrong method');
  assert(payments[0].metadata?.payment_method_id === state.paymentMethodId, 'payment metadata lost the method id');
  assert(transitions.length === 1, 'retry did not create exactly one lifecycle transition');
  assert(transitions[0].source === 'retry_payment_with_different_method', 'transition source is incorrect');
  assert(transitions[0].actor_user_id === state.ownerId, 'transition actor is incorrect');
}

async function cleanup() {
  if (state.requestId) {
    const requestLiteral = state.requestId.replace(/'/g, "''");
    const methodLiteral = state.paymentMethodId.replace(/'/g, "''");
    const sql = `DO $cleanup$
BEGIN
  ALTER TABLE public.emergency_status_transitions DISABLE TRIGGER trg_emergency_status_transitions_append_only;
  DELETE FROM public.payments WHERE emergency_request_id = '${requestLiteral}'::UUID;
  DELETE FROM public.emergency_requests WHERE id = '${requestLiteral}'::UUID;
  DELETE FROM public.payment_methods WHERE id = '${methodLiteral}'::UUID;
  ALTER TABLE public.emergency_status_transitions ENABLE TRIGGER trg_emergency_status_transitions_append_only;
END
$cleanup$;`;
    const { data, error } = await admin.rpc('exec_sql', { sql });
    if (error) throw error;
    if (data?.success !== true) throw new Error(data?.error || 'database cleanup failed');
  }

  for (const userId of [state.attackerId, state.ownerId]) {
    if (!userId) continue;
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) throw error;
  }

  const [{ count: requests }, { count: payments }, { count: profiles }] = await Promise.all([
    admin
      .from('emergency_requests')
      .select('id', { count: 'exact', head: true })
      .eq('id', state.requestId),
    admin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('emergency_request_id', state.requestId),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('id', [state.ownerId, state.attackerId].filter(Boolean)),
  ]);
  assert(requests === 0 && payments === 0 && profiles === 0, 'contract cleanup left database residue');
}

async function run() {
  console.log(`[payment-retry-contract] target=${projectRef} tag=${tag}`);
  let failure = null;
  try {
    const { owner, attacker } = await setup();
    await verifyUnauthorized(attacker);
    await verifyConcurrentOwnerRetries(owner);
    console.log('[payment-retry-contract] Authorization, reflected state, and concurrent reuse passed.');
  } catch (error) {
    failure = error;
  }

  try {
    await cleanup();
    console.log('[payment-retry-contract] Temporary Auth and database records removed.');
  } catch (cleanupError) {
    failure = failure
      ? new Error(`${failure.message}; cleanup failed: ${cleanupError.message}`)
      : cleanupError;
  }

  if (failure) throw failure;
}

run().catch((error) => {
  console.error(`[payment-retry-contract] ${error.message}`);
  process.exit(1);
});
