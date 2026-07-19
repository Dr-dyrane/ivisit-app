const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('demo bootstrap never funds shared wallets', () => {
  const finance = read('supabase', 'functions', '_shared', 'domain', 'demo', 'finance.ts');
  assert.doesNotMatch(finance, /\.from\("organization_wallets"\)/);
  assert.doesNotMatch(finance, /\.from\("ivisit_main_wallet"\)/);
  assert.match(finance, /settlement_mode: "simulated"/);
});

test('demo cash approval uses the isolated settlement receiver', () => {
  const edge = read('supabase', 'functions', 'demo-approve-cash-payment', 'index.ts');
  assert.match(edge, /"approve_demo_cash_payment"/);
  assert.doesNotMatch(edge, /"approve_cash_payment"/);
});

test('isolated demo settlement cannot post to wallets or ledger', () => {
  const sql = read('supabase', 'migrations', '20260219010000_core_rpcs.sql');
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.approve_demo_cash_payment(');
  const end = sql.indexOf('CREATE OR REPLACE FUNCTION public.approve_cash_payment(', start);
  assert.ok(start >= 0 && end > start, 'demo settlement function must precede real cash approval');
  const body = sql.slice(start, end);
  assert.match(body, /Demo settlement is only available for demo hospitals/);
  assert.match(body, /'settlement', 'simulated'/);
  assert.match(body, /ivisit_fee_amount = 0/);
  assert.doesNotMatch(body, /wallet_ledger|organization_wallets|ivisit_main_wallet/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.approve_demo_cash_payment\(UUID, UUID\) TO service_role/);
});

test('dispatch accepts only explicit simulated demo settlement proof', () => {
  const sql = read('supabase', 'migrations', '20260219000800_emergency_logic.sql');
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.emergency_dispatch_payment_snapshot(');
  const end = sql.indexOf('CREATE OR REPLACE FUNCTION public.complete_card_payment(', start);
  const body = sql.slice(start, end);
  assert.match(body, /approve_demo_cash_payment/);
  assert.match(body, /metadata->>'demo'\)::BOOLEAN, FALSE/);
  assert.match(body, /metadata->>'settlement' = 'simulated'/);
});

test('live demo harness reverses finance effects before deleting its ledger', () => {
  const harness = read('supabase', 'tests', 'scripts', 'run_demo_emergency_lifecycle_live_e2e.js');
  assert.match(harness, /async function reverseAndDeleteFixtureLedger/);
  assert.match(harness, /balance = COALESCE\(wallet\.balance, 0\) - fixture\.amount/);
  assert.match(harness, /DELETE FROM public\.wallet_ledger/);
});
