# Billing Currency And FX Audit

Date: 2026-05-06

## Scope

This audit covers the active `ivisit-app` billing display lane:

- emergency checkout
- wallet and payment history
- hospital price labels
- visit payment summaries
- notification copy that exposes payment amounts
- active rating and request-payment affordances

## Findings

1. Backend truth is USD-only today.
   - `calculate_emergency_cost_v2` returns `currency = 'USD'`.
   - `get_service_price` and `get_room_price` also hardcode USD.
   - finance defaults and top-up paths still assume USD.

2. The client was hardcoding `$` across multiple runtime surfaces.
   - payment screen
   - map commit payment
   - map payment history
   - hospital detail and hospital choice price labels
   - visit history and book-visit summaries
   - emergency cash-approval copy
   - legacy request modal and rating tip surfaces

3. Country detection is not a safe billing authority.
   - location and country fallback can drift
   - billing display must not be derived from GPS, sheet phase, or current locale state

4. There was no single formatter contract.
   - some surfaces rounded to whole values
   - some rendered `$12.34`
   - some preserved raw strings
   - some dropped currency truth entirely

## Immediate Fix Rule

Until a real FX quote lane exists, the app must render backend money truth through one shared symbol-aware formatter:

- if the record says `USD`, show `$150.00`
- if the record later says `NGN`, render the localized symbol via `Intl.NumberFormat`
- do not fake another local currency in the client
- do not let UI helpers inject `$` directly

## Implementation Rule

Immediate OTA-safe fix:

1. Add one shared formatter at the utility layer.
2. Route active runtime money displays through that formatter.
3. Preserve and pass through `currency` where already available.
4. Default to `USD` only when the record has no explicit currency.

## Future Backend Lane

Per-country display requires a real backend quote lane, not client guessing.

Recommended shape:

1. finance-owned `exchange_rates` cache in the finance pillar
2. finance-owned quote RPC or edge function
3. deterministic quote snapshot returned to the client
4. client renders the quote snapshot only

Example quote contract:

```json
{
  "amount_usd": 150,
  "display_currency": "NGN",
  "display_amount": 231000,
  "fx_rate": 1540,
  "quoted_at": "2026-05-06T12:00:00Z",
  "source": "provider_cache"
}
```

## Implementation Commencement

The quote lane now starts with these explicit rules:

1. billing authority is explicit user preference first, not GPS
2. USD remains canonical settlement truth until the server returns a quote snapshot
3. conversion happens only through finance-owned exchange-rate cache + quote RPC
4. the client renders `display_amount` + `display_currency` when present and falls back to canonical USD only when quote truth is unavailable

Initial owner changes for this pass:

- `0001_identity`
  - add `preferences.billing_country_code`
  - add `preferences.billing_currency_code`
- `0004_finance`
  - add `exchange_rates`
  - replace placeholder `convert_currency_for_payment(...)`
  - add `get_billing_quote(...)`
- `supabase/functions/payments`
  - add `billing-quote`
  - add `refresh-exchange-rates`
- app lane
  - add service/query/store/machine billing quote surfaces

## Runtime Adoption Checkpoint

Current quote-backed runtime owners:

- `hooks/payment/usePaymentScreenModel.js`
- `components/payment/PaymentCheckoutVariant.jsx`
- `components/map/views/commitPayment/useMapCommitPaymentController.js`
- `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`
- `hooks/visits/useBookVisitScreenModel.js`
- `hooks/visits/usePaymentHistoryEntryQuery.js`

Current presentation helpers:

- `utils/billingQuotePresentation.js`
- `utils/formatMoney.js`

Live rule at this checkpoint:

1. canonical settlement amount remains source currency truth from the backend
2. display amount is quote-backed when a billing country or billing currency can resolve
3. payment eligibility and checkout logic still use canonical amounts
4. user-facing labels and breakdowns render the quote snapshot when available

## Live Deployment Note

Live backend deployment for this checkpoint includes:

- `exchange_rates` seeded from the `open.er-api.com` USD snapshot on `2026-05-07`
- provider metadata recorded as `https://www.exchangerate-api.com`
- project secrets set for future refresh:
  - `FX_PROVIDER_URL=https://open.er-api.com/v6/latest/USD`
  - `FX_PROVIDER_SOURCE=https://www.exchangerate-api.com`
  - `FX_STALE_HOURS=24`
- deployed edge functions:
  - `billing-quote`
  - `refresh-exchange-rates`

## Guardrail Fit

- Derived labels stay derived.
- No `useEffect` currency syncing.
- No country hook owning billing truth.
- Service/query/store owns money truth; UI owns formatting only.

## Source Placement

- audit evidence: `docs/audit/payment/`
- runtime payment lane map: `docs/flows/payment/`
- Supabase change rules: `supabase/docs/`
