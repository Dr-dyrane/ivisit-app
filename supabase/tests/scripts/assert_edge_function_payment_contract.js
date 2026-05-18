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

const failures = [];

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
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

if (failures.length > 0) {
  console.error('[edge-payment-contract] FAIL');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`[edge-payment-contract] PASS ${FUNCTION_FILES.length} payment/webhook functions`);
