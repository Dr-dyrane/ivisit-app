# Edge Function Rollback Runbook

Last updated: 2026-05-19

This runbook is the trace point for iVisit Supabase Edge Function deployments, rollback, and function-loss investigation.

## Current Production Project

- Supabase project ref: `dlwtcmhdzoklveihuhjf`
- Function dashboard: `https://supabase.com/dashboard/project/dlwtcmhdzoklveihuhjf/functions`
- Runtime source: `supabase/functions`
- Function entrypoint source of truth: `supabase/config.toml`

## Function Inventory Snapshot

Captured after the May 18, 2026 edge foundation hardening deploy.

| Slug | Version | Entrypoint |
| --- | ---: | --- |
| `discover-hospitals` | 93 | `supabase/functions/discover-hospitals/index.ts` |
| `create-payment-intent` | 30 | `supabase/functions/payments/create-payment-intent/index.ts` |
| `billing-quote` | 17 | `supabase/functions/payments/billing-quote/index.ts` |
| `refresh-exchange-rates` | 18 | `supabase/functions/payments/refresh-exchange-rates/index.ts` |
| `manage-payment-methods` | 30 | `supabase/functions/payments/manage-payment-methods/index.ts` |
| `create-payout` | 30 | `supabase/functions/payments/create-payout/index.ts` |
| `stripe-webhook` | 31 | `supabase/functions/webhooks/stripe-webhook/index.ts` |
| `bootstrap-demo-ecosystem` | 42 | `supabase/functions/bootstrap-demo-ecosystem/index.ts` |
| `hospital-media` | 22 | `supabase/functions/hospital-media/index.ts` |
| `demo-approve-cash-payment` | 18 | `supabase/functions/demo-approve-cash-payment/index.ts` |
| `demo-dispatch-reply` | 7 | `supabase/functions/demo-dispatch-reply/index.ts` |
| `review-demo-auth` | 17 | `supabase/functions/review-demo-auth/index.ts` |
| `triage-copilot` | 22 | `supabase/functions/triage-copilot/index.ts` |

Legacy email/subscriber functions may also appear in `supabase functions list`. They are not owned by the app runtime hardening pass unless their source is present in this repository.

## Pre-Deploy Checks

Run these before deploying function changes:

```bash
npm run hardening:edge-payments
npm run hardening:chat-rls
npm run hardening:emergency
npm run hardening:edge-smoke
```

For TypeScript edge changes, also run:

```bash
npx deno check supabase/functions/<function-folder>/index.ts
```

For thin entrypoints that import sibling handlers, check the public slug wrapper, the internal entrypoint, and the handler module together. Example:

```bash
npx deno check supabase/functions/discover-hospitals/index.ts supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/discovery/discover-hospitals/handler.ts
npx deno check supabase/functions/bootstrap-demo-ecosystem/index.ts supabase/functions/bootstrap-demo-ecosystem/handler.ts
npm run hardening:bootstrap-demo-matrix
```

## Deploy Commands

Deploy only the functions that changed.

```bash
npx supabase functions deploy create-payment-intent
npx supabase functions deploy billing-quote
npx supabase functions deploy refresh-exchange-rates
npx supabase functions deploy manage-payment-methods
npx supabase functions deploy create-payout
npx supabase functions deploy stripe-webhook
npx supabase functions deploy bootstrap-demo-ecosystem
npx supabase functions deploy hospital-media
npx supabase functions deploy demo-approve-cash-payment
npx supabase functions deploy demo-dispatch-reply
npx supabase functions deploy review-demo-auth
npx supabase functions deploy triage-copilot
npx supabase functions deploy discover-hospitals
```

Then record the live state:

```bash
npx supabase functions list
```

## Rollback Procedure

1. Identify the last known-good git ref.

```bash
git log --oneline -- supabase/functions supabase/config.toml package.json supabase/tests/scripts
```

2. Restore the affected function files from that ref.

```bash
git checkout <known-good-ref> -- supabase/functions/<function-name-or-family>
git checkout <known-good-ref> -- supabase/config.toml
```

3. Re-run the relevant checks.

```bash
npx deno check supabase/functions/<function-name>/index.ts
npm run hardening:edge-payments
npm run hardening:chat-rls
npm run hardening:emergency
```

4. Redeploy the affected slug.

```bash
npx supabase functions deploy <slug>
```

5. Confirm the slug is active and the version changed.

```bash
npx supabase functions list
```

6. Commit the rollback with the affected slug and reason in the message.

```bash
git add supabase/functions supabase/config.toml package.json supabase/tests/scripts docs/deployment/EDGE_FUNCTION_ROLLBACK_RUNBOOK.md
git commit -m "revert(edge): roll back <slug> deployment"
git push
```

## Function Loss Triage

Use this if a function disappears, returns 404, or deploys under the wrong slug.

1. Compare live inventory with `supabase/config.toml`.

```bash
npx supabase functions list
rg -n "\[functions\." supabase/config.toml
```

2. Confirm the function has a stable config block.

```toml
[functions.<slug>]
enabled = true
verify_jwt = true_or_false
entrypoint = "./functions/<path>/index.ts"
```

3. Confirm the entrypoint exists.

```bash
rg --files supabase/functions | rg "<slug>|<folder-name>/index.ts"
```

4. Redeploy by slug, not by folder path.

```bash
npx supabase functions deploy <slug>
```

5. If the deployed code imports shared modules, confirm the deploy output uploads every referenced `_shared` file. Missing shared uploads usually mean the import path is wrong.

6. Re-run the relevant runtime matrix after redeploy.

## Rollback Notes By Area

- Provider discovery: run `npm run hardening:edge-smoke` after any rollback.
- Contact Dispatch: run `npm run hardening:chat-rls` and `npm run hardening:emergency`.
- Payments: run `npm run hardening:edge-payments`; for Stripe live issues, verify webhook delivery in Stripe and confirm `stripe-webhook` is `verify_jwt = false`.
- Bootstrap demo ecosystem: run `npm run hardening:bootstrap-demo-matrix` after any rollback. For live idempotency checks, use `npm run hardening:bootstrap-demo-matrix:apply` intentionally because it invokes the deployed function.
- Hospital media: verify `hospital-media` redirects and that fallback images still resolve; it should not expose raw provider secrets.

## Shared Module Ownership

- `_shared/http/cors.ts`: CORS and JSON response helpers.
- `_shared/http/request.ts`: method guards, authorization header extraction, and safe JSON body reads.
- `_shared/http/response.ts`: compatible JSON error/method responses for endpoints that do not use CORS helpers directly.
- `_shared/env/env.ts`: env readers and boolean flags.
- `_shared/supabase/clients.ts`: anon/user and service-role clients.
- `_shared/supabase/auth.ts`: optional auth probes, required auth validation, and non-throwing authenticated-user reads.
- `_shared/payments/stripe.ts`: Stripe secret and webhook secret access.
- `_shared/domain/ids.ts`: display-id to UUID resolution.
- `_shared/domain/providers/taxonomy.ts`: provider taxonomy and query hints.
- `_shared/domain/providers/config.ts`: provider runtime config and app-owned provider media proxy URL construction.
- `_shared/domain/providers/database.ts`: provider/hospital RPC read helpers.
- `_shared/domain/providers/discoveryFlow.ts`: external provider source selection and local-first/wide-fallback fetch flow.
- `_shared/domain/providers/enrichmentFlow.ts`: Google provider detail enrichment and persistence.
- `_shared/domain/providers/normalizationFlow.ts`: external Google/Mapbox normalization, defaulting, distance, and category guard flow.
- `_shared/domain/providers/persistenceFlow.ts`: provider discovery persistence, conflict fallback, provider table upsert, and DB refresh.
- `_shared/domain/providers/response.ts`: provider result shaping, canonical/provider merge rows, and database count summaries.
- `_shared/domain/demo/context.ts`: demo context, stable demo user slug, coverage key, and seed scope helpers.
- `_shared/domain/demo/finance.ts`: organization fee sync, organization wallet setup, platform wallet readiness, and demo financial thresholds.
- `_shared/domain/demo/hospitals.ts`: Lagos/Festac catalog seeds, database seed normalization, fallback hospitals, demo hospital upsert/dedupe, stale-row retirement, and active demo hospital reload.
- `_shared/domain/demo/media.ts`: demo seed image resolution, app-owned hospital-media proxy URL creation, domain logo affinity scoring, and preferred image selection.
- `_shared/domain/demo/organization.ts`: coverage-scoped demo organization lookup/creation.
- `_shared/domain/demo/pricing.ts`: demo service and room pricing baselines plus pricing upserts.
- `_shared/domain/demo/providerSeeds.ts`: Mapbox and Google hospital seed discovery, external seed fallback ordering, and seed deduplication.
- `_shared/domain/demo/staff.ts`: demo auth user creation/reuse, profile role sync, doctor upserts, ambulance upserts, and hospital admin patching.
- `_shared/domain/demo/summary.ts`: demo readiness counts, wallet checks, pricing checks, and final summary flags.
- `_shared/domain/demo/utils.ts`: demo parsing, normalization, geometry, timestamps, stable IDs, and distance helpers.

## Thin Entrypoint Notes

- `discover-hospitals` public slug remains `supabase/functions/discover-hospitals/index.ts`.
- That wrapper imports `supabase/functions/discovery/discover-hospitals/index.ts`.
- The internal entrypoint is intentionally thin and calls `serve(handleDiscoverHospitalsRequest)`.
- Request orchestration now lives in `supabase/functions/discovery/discover-hospitals/handler.ts`.
- If deployment bundling fails, rollback by restoring the handler body directly into the internal `index.ts` and redeploying the unchanged public slug.
- `bootstrap-demo-ecosystem` public slug remains `supabase/functions/bootstrap-demo-ecosystem/index.ts`.
- That entrypoint is intentionally thin and calls `serve(handleBootstrapDemoEcosystemRequest)`.
- Request orchestration now lives in `supabase/functions/bootstrap-demo-ecosystem/handler.ts`.
- The bootstrap engine is split under `_shared/domain/demo/*`; if module bundling fails, rollback by restoring the handler body and required demo helpers directly into `index.ts`, then redeploying the unchanged `bootstrap-demo-ecosystem` slug.

Do not duplicate secret reads in endpoint files. Keep secret ownership in the shared helpers so audits can prove where sensitive values enter the runtime.
