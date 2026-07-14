const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FUNCTION_FILES = [
  'supabase/functions/payments/create-payment-intent/index.ts',
  'supabase/functions/payments/create-payout/index.ts',
  'supabase/functions/payments/manage-payment-methods/index.ts',
  'supabase/functions/payments/billing-quote/index.ts',
  'supabase/functions/payments/refresh-exchange-rates/index.ts',
  'supabase/functions/webhooks/stripe-webhook/index.ts',
];

const SHARED_STRIPE_FILE = 'supabase/functions/_shared/payments/stripe.ts';
const EMERGENCY_INTENT_HELPER =
  'supabase/functions/_shared/payments/emergencyPaymentIntent.ts';
const CREATE_PAYMENT_INTENT_FILE =
  'supabase/functions/payments/create-payment-intent/index.ts';
const STRIPE_WEBHOOK_FILE =
  'supabase/functions/webhooks/stripe-webhook/index.ts';
const FINANCE_MIGRATION_FILE =
  'supabase/migrations/20260219000400_finance.sql';

const failures = [];

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function compactWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function requireText(source, relPath, expected, contract) {
  if (!compactWhitespace(source).includes(compactWhitespace(expected))) {
    failures.push(`${relPath}: ${contract}`);
  }
}

function rejectText(source, relPath, forbidden, contract) {
  if (compactWhitespace(source).includes(compactWhitespace(forbidden))) {
    failures.push(`${relPath}: ${contract}`);
  }
}

function requireOrder(source, relPath, expectedInOrder, contract) {
  const compactSource = compactWhitespace(source);
  let previousIndex = -1;

  for (const expected of expectedInOrder) {
    const compactExpected = compactWhitespace(expected);
    const index = compactSource.indexOf(compactExpected, previousIndex + 1);
    if (index === -1) {
      failures.push(`${relPath}: ${contract} (missing or out of order: ${compactExpected})`);
      return;
    }
    previousIndex = index;
  }
}

function extractSqlFunction(source, functionName) {
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}(`);
  if (start === -1) return null;

  const languageMarker = '$$ LANGUAGE plpgsql SECURITY DEFINER';
  const languageStart = source.indexOf(languageMarker, start);
  if (languageStart === -1) return null;

  const end = source.indexOf(';', languageStart);
  return end === -1 ? null : source.slice(start, end + 1);
}

for (const relPath of FUNCTION_FILES) {
  const source = read(relPath);
  const name = relPath.replace(/\\/g, '/');

  if (source.includes('Deno.env.get("STRIPE_SECRET_KEY"') || source.includes("Deno.env.get('STRIPE_SECRET_KEY'")) {
    failures.push(`${name}: reads STRIPE_SECRET_KEY directly instead of shared Stripe helper`);
  }

  if (
    source.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"') ||
    source.includes("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'")
  ) {
    failures.push(`${name}: reads SUPABASE_SERVICE_ROLE_KEY directly instead of shared service client`);
  }

  if (/serviceRoleKey|stripeSecretKey|secretKey\s*:/.test(source)) {
    failures.push(`${name}: contains a secret-shaped response/log symbol`);
  }

  if (!source.includes('optionsResponse()')) {
    failures.push(`${name}: does not use shared CORS optionsResponse`);
  }
}

const sharedStripe = read(SHARED_STRIPE_FILE);
if (!sharedStripe.includes('STRIPE_SECRET_KEY')) {
  failures.push(`${SHARED_STRIPE_FILE}: shared Stripe helper no longer owns STRIPE_SECRET_KEY access`);
}
if (!sharedStripe.includes('STRIPE_WEBHOOK_SECRET')) {
  failures.push(`${SHARED_STRIPE_FILE}: shared Stripe helper no longer owns STRIPE_WEBHOOK_SECRET access`);
}

const createPaymentIntent = read(CREATE_PAYMENT_INTENT_FILE);
const emergencyIntent = read(EMERGENCY_INTENT_HELPER);
const stripeWebhook = read(STRIPE_WEBHOOK_FILE);
const financeMigration = read(FINANCE_MIGRATION_FILE);

requireText(
  createPaymentIntent,
  CREATE_PAYMENT_INTENT_FILE,
  'loadEmergencyPaymentContext(',
  'emergency checkout no longer loads its canonical request/payment context',
);
rejectText(
  createPaymentIntent,
  CREATE_PAYMENT_INTENT_FILE,
  'body.organization_id',
  'emergency checkout trusts a client organization id',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  '.eq("payment_method", "card")',
  'canonical lookup is not restricted to card payments',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  '.eq("status", "pending")',
  'canonical lookup/binding is not restricted to pending payments',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  'request.status !== "pending_approval" || request.payment_status !== "pending"',
  'request readiness is not checked against backend payment state',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  'const amountInCents = toPositiveCents(payment.amount, "payment amount")',
  'Stripe amount is not derived from the canonical payment row',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  'payment.organization_id !== hospital.organization_id',
  'payment organization is not checked against the request hospital',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  'amountInCents !== requestAmountInCents',
  'payment amount is not checked against the canonical request total',
);
rejectText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  '.insert(',
  'emergency intent setup can create a fallback payment row',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  'stripe.paymentIntents.retrieve(',
  'an already-bound Stripe PaymentIntent is not reused',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  'const idempotencyKey = `emergency-payment-intent:${payment.id}`',
  'new emergency PaymentIntents lack a stable payment-UUID idempotency key',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  '{ idempotencyKey }',
  'Stripe create does not receive the stable idempotency key',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  '.is("stripe_payment_intent_id", null)',
  'payment binding is not a null-only compare-and-set',
);
requireText(
  emergencyIntent,
  EMERGENCY_INTENT_HELPER,
  'Could not bind Stripe PaymentIntent to the canonical payment',
  'a failed compare-and-set can still expose an unbound client secret',
);

const bindingUpdate = emergencyIntent.match(
  /\.update\(\{\s*stripe_payment_intent_id:[\s\S]*?\}\)\s*\.eq\("id", payment\.id\)/,
);
if (!bindingUpdate) {
  failures.push(`${EMERGENCY_INTENT_HELPER}: canonical PaymentIntent binding update is missing`);
} else if (/\b(amount|currency|organization_id):/.test(bindingUpdate[0])) {
  failures.push(
    `${EMERGENCY_INTENT_HELPER}: PaymentIntent binding rewrites canonical amount/currency/organization fields`,
  );
}

requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'constructStripeWebhookEvent(body, signature)',
  'signed Stripe webhook validation is no longer preserved',
);
requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'const isEmergencyPayment = Boolean(existingPayment.emergency_request_id)',
  'emergency finalization is not routed from the database payment association',
);
requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  '"id, emergency_request_id, metadata, payment_method, status, ivisit_fee_amount"',
  'webhook routing no longer loads the database payment association fields',
);
rejectText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'paymentIntent.metadata?.emergency_request_id',
  'emergency finalization trusts Stripe metadata instead of the database association',
);
rejectText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'paymentIntent.metadata?.is_top_up',
  'payment routing trusts Stripe top-up metadata instead of the database association',
);
requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'assertRpcSuccess(\n                        "complete_card_payment"',
  'complete_card_payment failures are not promoted to webhook delivery failures',
);
requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'assertRpcSuccess("fail_card_payment", failResult, failError)',
  'fail_card_payment failures are not promoted to webhook delivery failures',
);
requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'if (error || rpcResult.success !== true) { throw new Error(',
  'RPC guard does not throw when Supabase or the workflow result reports failure',
);
requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'return jsonResponse({ error: message }, { status: 500 })',
  'webhook processing failures do not return non-2xx for Stripe retry',
);

requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  'CREATE TABLE IF NOT EXISTS public.stripe_webhook_event_receipts',
  'durable Stripe event receipts are not created additively in the finance pillar',
);
requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  'stripe_event_id TEXT NOT NULL, event_type TEXT NOT NULL, stripe_account_id TEXT, status TEXT NOT NULL DEFAULT \'processing\', attempts INTEGER NOT NULL DEFAULT 1',
  'receipt identity, account, status, or attempt fields are missing',
);
requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  'first_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processing_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), lease_expires_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, failed_at TIMESTAMPTZ, last_error TEXT',
  'receipt processing timestamps or last-error evidence are missing',
);
requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_webhook_event_receipts_event_id ON public.stripe_webhook_event_receipts(stripe_event_id)',
  'Stripe event ids are not durably unique',
);
requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  "CHECK (status IN ('processing', 'completed', 'failed'))",
  'receipt status is not constrained to the processing lifecycle',
);

const receiptBlockStart = financeMigration.indexOf('-- BEGIN STRIPE_WEBHOOK_EVENT_RECEIPTS');
const receiptBlockEnd = financeMigration.indexOf('-- END STRIPE_WEBHOOK_EVENT_RECEIPTS');
if (receiptBlockStart === -1 || receiptBlockEnd <= receiptBlockStart) {
  failures.push(`${FINANCE_MIGRATION_FILE}: Stripe receipt migration block is incomplete`);
} else {
  const receiptBlock = financeMigration.slice(receiptBlockStart, receiptBlockEnd);
  if (/\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i.test(receiptBlock)) {
    failures.push(`${FINANCE_MIGRATION_FILE}: Stripe receipt migration is destructive`);
  }
}

const receiptRpcSignatures = [
  ['claim_stripe_webhook_event', 'TEXT, TEXT, TEXT'],
  ['complete_stripe_webhook_event', 'TEXT, UUID'],
  ['fail_stripe_webhook_event', 'TEXT, UUID, TEXT'],
  ['apply_stripe_payout_paid', 'TEXT, TEXT, NUMERIC, JSONB'],
];

for (const [functionName, signature] of receiptRpcSignatures) {
  const functionSource = extractSqlFunction(financeMigration, functionName);
  if (!functionSource) {
    failures.push(`${FINANCE_MIGRATION_FILE}: ${functionName} SQL owner is missing`);
    continue;
  }

  requireText(
    functionSource,
    FINANCE_MIGRATION_FILE,
    "COALESCE(v_claims->>'role', '') = 'service_role'",
    `${functionName} does not enforce service-role ownership`,
  );
  requireText(
    functionSource,
    FINANCE_MIGRATION_FILE,
    'SECURITY DEFINER SET search_path = public, pg_temp',
    `${functionName} is not a fixed-search-path security definer`,
  );
  requireText(
    financeMigration,
    FINANCE_MIGRATION_FILE,
    `REVOKE ALL ON FUNCTION public.${functionName}(${signature}) FROM PUBLIC, anon, authenticated`,
    `${functionName} remains executable by a public application role`,
  );
  requireText(
    financeMigration,
    FINANCE_MIGRATION_FILE,
    `GRANT EXECUTE ON FUNCTION public.${functionName}(${signature}) TO service_role`,
    `${functionName} is not executable by the webhook service role`,
  );
}

requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  'ALTER TABLE public.stripe_webhook_event_receipts ENABLE ROW LEVEL SECURITY',
  'receipt storage is not protected by RLS',
);
requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  'REVOKE ALL ON TABLE public.stripe_webhook_event_receipts FROM PUBLIC, anon, authenticated',
  'receipt storage remains accessible to public application roles',
);
requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  'GRANT SELECT, INSERT, UPDATE ON TABLE public.stripe_webhook_event_receipts TO service_role',
  'receipt storage is not available to the webhook service role',
);

const forbiddenReceiptGrant = financeMigration
  .split(/\r?\n/)
  .find((line) =>
    /^\s*GRANT\b/i.test(line) &&
    /(?:stripe_webhook_event_receipts|(?:claim|complete|fail)_stripe_webhook_event|apply_stripe_payout_paid)/i.test(line) &&
    /\bTO\s+(?:PUBLIC|anon|authenticated)\b/i.test(line)
  );
if (forbiddenReceiptGrant) {
  failures.push(`${FINANCE_MIGRATION_FILE}: receipt owner grants an application role: ${forbiddenReceiptGrant.trim()}`);
}

const claimReceiptFunction = extractSqlFunction(
  financeMigration,
  'claim_stripe_webhook_event',
);
if (claimReceiptFunction) {
  requireText(
    claimReceiptFunction,
    FINANCE_MIGRATION_FILE,
    'ON CONFLICT (stripe_event_id) DO NOTHING',
    'receipt creation does not arbitrate concurrent first claims',
  );
  requireText(
    claimReceiptFunction,
    FINANCE_MIGRATION_FILE,
    'WHERE receipt.stripe_event_id = v_event_id FOR UPDATE',
    'existing receipts are not locked before claim decisions',
  );
  requireText(
    claimReceiptFunction,
    FINANCE_MIGRATION_FILE,
    "IF v_receipt.status = 'processing' AND v_receipt.lease_expires_at IS NOT NULL AND v_receipt.lease_expires_at > v_now THEN",
    'active concurrent delivery is not detected by an unexpired lease',
  );
  requireText(
    claimReceiptFunction,
    FINANCE_MIGRATION_FILE,
    "'should_process', false, 'disposition', 'completed'",
    'completed event replay is not rejected before effects',
  );
  requireText(
    claimReceiptFunction,
    FINANCE_MIGRATION_FILE,
    "WHEN v_receipt.status = 'failed' THEN 'retried_failed' ELSE 'reclaimed_stale'",
    'failed and stale receipts cannot be reclaimed for retry',
  );
  requireText(
    claimReceiptFunction,
    FINANCE_MIGRATION_FILE,
    'attempts = attempts + 1',
    'retry claims do not increment durable attempts',
  );
  requireText(
    claimReceiptFunction,
    FINANCE_MIGRATION_FILE,
    'v_now := clock_timestamp()',
    'claim lease decisions do not refresh time after a concurrent insert wait',
  );
}

for (const functionName of ['complete_stripe_webhook_event', 'fail_stripe_webhook_event']) {
  const functionSource = extractSqlFunction(financeMigration, functionName);
  if (!functionSource) continue;
  requireText(
    functionSource,
    FINANCE_MIGRATION_FILE,
    "WHERE stripe_event_id = v_event_id AND status = 'processing' AND claim_token = p_claim_token",
    `${functionName} does not compare-and-set against the active claim token`,
  );
}

requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  'const { data, error } = await supabaseAdmin.rpc("claim_stripe_webhook_event"',
  'webhook does not claim a durable receipt through the database owner',
);
requireOrder(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  [
    'event = await constructStripeWebhookEvent(body, signature)',
    'const serviceClient = createServiceClient()',
    'const claim = await claimStripeWebhookEvent(serviceClient, event)',
    'switch (event.type)',
    'await completeStripeWebhookEvent(serviceClient, claimedEvent)',
  ],
  'signature verification, claim, consequences, and completion are not ordered safely',
);
requireOrder(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  [
    'if (!claim.shouldProcess)',
    'if (claim.disposition === "completed")',
    'duplicate: true',
    '{ status: 200 }',
    'received: false',
    '{ status: 503 }',
    'claimedEvent = claim',
    'switch (event.type)',
  ],
  'completed replay or active concurrent delivery can reach event consequences',
);
requireOrder(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  [
    'await failStripeWebhookEvent(supabaseAdmin, claimedEvent, message)',
    'return jsonResponse({ error: message }, { status: 500 })',
  ],
  'processing errors are not recorded before Stripe receives a retryable response',
);
requireText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  '"apply_stripe_payout_paid"',
  'payout completion is not delegated to an atomic retry-safe database owner',
);
requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  "v_ledger_key := 'stripe:payout:' || COALESCE(v_account_id, 'platform') || ':' || v_payout_id",
  'payout retries do not use stable Stripe payout identity',
);
requireText(
  financeMigration,
  FINANCE_MIGRATION_FILE,
  'ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING',
  'payout ledger effects are not claimed atomically before wallet mutation',
);
rejectText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  '.from("stripe_webhook_event_receipts")',
  'webhook bypasses the receipt RPC owner with direct table writes',
);
rejectText(
  stripeWebhook,
  STRIPE_WEBHOOK_FILE,
  '.from("organization_wallets")',
  'payout replay safety regressed to direct wallet mutation',
);

if (failures.length > 0) {
  console.error('[edge-payment-contract] FAIL');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`[edge-payment-contract] PASS ${FUNCTION_FILES.length} payment/webhook functions`);
