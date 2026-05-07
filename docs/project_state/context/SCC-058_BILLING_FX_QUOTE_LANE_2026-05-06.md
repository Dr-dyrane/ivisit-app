# SCC-058 Billing FX Quote Lane Ownership + Runtime Introduction (2026-05-06)

## Objective

Replace the current formatter-only billing stopgap with a deterministic per-country quote lane owned by:

1. explicit billing preferences
2. finance-backed exchange-rate truth
3. canonical server quote snapshots

## Why This Exists

The previous pass normalized display formatting, but it did not solve the actual requirement:

- backend amounts are still canonical USD
- the app must render bills per country
- the client must not guess billing currency from GPS or locale drift

So this SCC introduces the first real billing quote authority lane.

## Owner Placement

### Identity pillar

- `supabase/migrations/20260219000100_identity.sql`
- `preferences.billing_country_code`
- `preferences.billing_currency_code`

These fields are the explicit user billing override lane.

### Finance pillar

- `supabase/migrations/20260219000400_finance.sql`
- `exchange_rates`
- `convert_currency_for_payment(...)`
- `get_billing_quote(...)`

Finance owns all exchange-rate and quote truth.

### Edge functions

- `supabase/functions/payments/billing-quote/index.ts`
- `supabase/functions/payments/refresh-exchange-rates/index.ts`

These functions expose quote retrieval and provider-fed cache refresh without moving FX logic into the client.

### App runtime lane

- `services/billingQuoteService.js`
- `hooks/payment/useBillingQuoteQuery.ts`
- `stores/billingQuoteStore.js`
- `machines/billingQuoteMachine.js`
- `services/preferencesService.js`

The app consumes quote snapshots; it does not perform ad hoc conversion math across UI helpers.

## Guardrails

1. No GPS-owned billing authority.
2. No `useEffect` currency derivation.
3. No scattered `$` injection in components.
4. Canonical settlement amount remains separate from display quote.
5. UI renders `display_amount` + `display_currency` when a quote exists.

## Initial Quote Contract

```json
{
  "amount_usd": 150,
  "display_currency": "NGN",
  "display_amount": 231000,
  "fx_rate": 1540,
  "quoted_at": "2026-05-06T12:00:00Z",
  "source": "provider_cache",
  "is_stale": false
}
```

## Validation Target

- preferences owner fields present in canonical identity pillar
- finance quote primitives present in canonical finance pillar
- quote fetch path available through payment edge function lane
- app runtime can request a quote using explicit billing country/currency context

## Current Status

- `in_progress`
- this SCC starts with doctrine + owner-surface introduction
- staged billing UI adoption remains a follow-on once the quote path is stable
