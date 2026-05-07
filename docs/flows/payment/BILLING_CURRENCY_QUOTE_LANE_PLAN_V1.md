# Billing Currency Quote Lane Plan V1

## Goal

Move billing display from ad hoc `$` formatting to a deterministic quote lane.

## Phase 1

Immediate OTA-safe normalization:

1. shared formatter
2. explicit backend currency display
3. active runtime surfaces patched
4. no client-side country conversion

Status:
- complete
- delivered through `utils/formatMoney.js` and the active runtime billing surfaces

## Phase 2

Server-backed FX quote lane:

1. finance-owned exchange-rate cache
2. quote RPC or edge function
3. TanStack Query quote fetch keyed by bill context
4. deterministic quote snapshot rendered by the UI

Status:
- in progress

Primary workstreams:
1. identity-owned explicit billing preference fields
2. finance-owned `exchange_rates` cache and quote RPCs
3. payment edge functions for quote retrieval and rate refresh
4. app-side quote service/query/store/machine lane
5. staged surface adoption starting from payment + checkout owners

Current adopted runtime owners:

- `hooks/payment/usePaymentScreenModel.js`
- `components/payment/PaymentCheckoutVariant.jsx`
- `components/map/views/commitPayment/useMapCommitPaymentController.js`
- `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`
- `hooks/visits/useBookVisitScreenModel.js`
- `hooks/visits/usePaymentHistoryEntryQuery.js`

Still pending after this checkpoint:

- hospital browsing price cards
- emergency legacy modal price summaries
- any non-query pure helper that still formats backend USD without a quote snapshot upstream

Live provider checkpoint:

- rate cache seeded from `open.er-api.com` USD snapshot on `2026-05-07`
- refresh function now supports `base_code + rates` payloads
- project refresh secrets point at `https://open.er-api.com/v6/latest/USD`

## Five-Layer Ownership

1. Service layer
   - quote fetch and formatter helpers
2. Query layer
   - TanStack Query keyed by amount and target currency context
3. Store layer
   - canonical active billing quote snapshot
4. Machine layer
   - `idle -> loading -> quoted -> stale -> error`
5. UI layer
   - ephemeral display state only

## Guardrails

- no `useEffect` for currency derivation
- no GPS-owned billing truth
- no hardcoded `$` in runtime UI
- no fake local conversion without server quote truth

## Owner Placement

1. identity pillar
   - `preferences.billing_country_code`
   - `preferences.billing_currency_code`
2. finance pillar
   - `exchange_rates`
   - `get_billing_quote(...)`
   - `convert_currency_for_payment(...)`
3. payment edge functions
   - `billing-quote`
   - `refresh-exchange-rates`
