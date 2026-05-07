# Supabase Edge Functions

This directory contains Supabase Edge Functions organized by category.

## Directory Structure

```text
functions/
|-- payments/
|   |-- create-payment-intent/
|   |-- create-payout/
|   |-- manage-payment-methods/
|   |-- billing-quote/
|   `-- refresh-exchange-rates/
|-- discovery/
|   `-- discover-hospitals/
|-- webhooks/
|   `-- stripe-webhook/
`-- shared/
```

## Payment Functions

### create-payment-intent

Creates payment intents for emergency services and wallet top-ups.

- Endpoint: `/functions/v1/create-payment-intent`
- Method: `POST`
- Authentication: required

### create-payout

Processes payouts to healthcare providers and ambulance services.

- Endpoint: `/functions/v1/create-payout`
- Method: `POST`
- Authentication: admin required

### manage-payment-methods

Manages patient payment methods.

- Endpoint: `/functions/v1/manage-payment-methods`
- Method: `GET`, `POST`, `DELETE`
- Authentication: required

### billing-quote

Returns a deterministic billing quote snapshot for the authenticated user.

- Endpoint: `/functions/v1/billing-quote`
- Method: `POST`
- Authentication: required

Body:

- `amount` or `amount_usd`: numeric
- `source_currency`: optional, defaults to `USD`
- `billing_country_code`: optional explicit override
- `billing_currency_code`: optional explicit override

If billing overrides are omitted, the function resolves them from `preferences`.

### refresh-exchange-rates

Refreshes the finance-owned `exchange_rates` cache.

- Endpoint: `/functions/v1/refresh-exchange-rates`
- Method: `POST`
- Authentication: admin or org-admin required

The function reads either:

- `FX_MANUAL_RATES_JSON`
- or a provider configured through `FX_PROVIDER_URL`

## Discovery Functions

### discover-hospitals

Searches for hospitals based on location, specialty, and availability.

- Endpoint: `/functions/v1/discover-hospitals`
- Method: `GET`
- Authentication: optional

### bootstrap-demo-ecosystem

Builds the deterministic demo healthcare ecosystem for low or unverified coverage zones.

- Endpoint: `/functions/v1/bootstrap-demo-ecosystem`
- Method: `POST`
- Authentication: required

See [`docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`](../../docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md).

### review-demo-auth

Allows review testers to complete the OTP step without mailbox access.

- Endpoint: `/functions/v1/review-demo-auth`
- Method: `POST`
- Authentication: public, guarded by exact email plus review OTP

## Webhook Functions

### stripe-webhook

Handles Stripe webhook events for payment processing.

- Endpoint: `/functions/v1/stripe-webhook`
- Method: `POST`
- Authentication: Stripe signature verification

## Deployment

```bash
supabase functions serve
supabase functions deploy
supabase functions deploy billing-quote
supabase functions deploy refresh-exchange-rates
```

## Environment Variables

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

FX_PROVIDER_URL=optional_provider_url
FX_PROVIDER_API_KEY=optional_provider_api_key
FX_PROVIDER_AUTH_HEADER=Authorization
FX_PROVIDER_SOURCE=provider_cache
FX_STALE_HOURS=24
FX_MANUAL_RATES_JSON={"base":"USD","rates":{"NGN":1540,"GBP":0.79}}
```

## Related Documentation

- [`supabase/docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md)
- [`supabase/docs/TESTING.md`](../docs/TESTING.md)
- [`docs/flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md`](../../docs/flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md)
