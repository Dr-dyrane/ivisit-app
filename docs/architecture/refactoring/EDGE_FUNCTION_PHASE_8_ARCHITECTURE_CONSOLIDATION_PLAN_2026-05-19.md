# Edge Function Phase 8 Architecture Consolidation Plan

Date: 2026-05-19
Status: Phase 8.0 baseline and freeze in progress
Scope: Supabase Edge Functions, shared helpers, verification scripts, rollback traceability

## Purpose

Phase 8 is the architecture consolidation phase after the seven product/UX stabilization phases. Its goal is not to create new deployed endpoints or rewrite working behavior. Its goal is to make iVisit's edge-function engine easier to trust, test, deploy, and roll back.

The public function slugs must stay stable:

- `discover-hospitals`
- `bootstrap-demo-ecosystem`
- `create-payment-intent`
- `billing-quote`
- `refresh-exchange-rates`
- `manage-payment-methods`
- `create-payout`
- `stripe-webhook`
- `hospital-media`
- `demo-approve-cash-payment`
- `demo-dispatch-reply`
- `review-demo-auth`
- `triage-copilot`

## Documents Read Before Planning

- `docs/deployment/EDGE_FUNCTION_ROLLBACK_RUNBOOK.md`
- `docs/REFACTORING_GUARDRAILS.md`
- `docs/flows/emergency/architecture/explore-care/passes/README.md`
- `docs/flows/emergency/architecture/contact-dispatch/passes/README.md`
- `docs/flows/emergency/architecture/contact-dispatch/passes/CD-8_BACKEND_VERIFICATION.md`
- `supabase/config.toml`
- `supabase/tests/scripts/run_edge_function_smoke_matrix.js`
- `supabase/tests/scripts/run_emergency_chat_rls_matrix.js`
- `supabase/migrations/20260219000300_logistics.sql`
- `supabase/migrations/20260219000700_security.sql`
- `supabase/migrations/20260219010000_core_rpcs.sql`
- Supabase Postgres best-practice notes for RLS, RLS performance, upsert safety, and indexes.

## Lessons To Preserve

1. Do not split deployed function slugs first. Keep public compatibility stable and modularize internals behind the same entrypoints.
2. Every modularization pass needs a monolith baseline hash and rollback path.
3. Shared secret access already belongs in `_shared/env`, `_shared/supabase`, and `_shared/payments`; do not reintroduce endpoint-local secret reads.
4. Provider discovery must keep emergency hospital discovery and Explore Care provider discovery separate.
5. Google Places is necessary for rich global provider coverage, but it must remain flag-gated, field-mask-limited, and observable.
6. RLS must remain database-enforced. Edge functions can assist, but they must not become the only authorization layer.
7. Complex RLS participant checks should use indexed helper functions and indexes on policy columns.
8. Upserts and conflict targets are behavioral contracts. Do not replace them with select-then-insert logic.
9. Existing verification scripts are assets, not afterthoughts. Phase 8 must extend them before moving behavior.
10. Documentation links can drift; Phase 8 must update indexes and rollback runbooks as part of each pass.

## Current Hotspots

| Area | Current shape | Risk | Phase 8 direction |
| --- | --- | --- | --- |
| Provider discovery | `supabase/functions/discovery/discover-hospitals/index.ts` is the main engine, reached by wrapper slug `supabase/functions/discover-hospitals/index.ts` | High product trust, Google cost, global coverage, category leakage | Extract provider discovery internals behind same slug |
| Demo bootstrap | `supabase/functions/bootstrap-demo-ecosystem/index.ts` is the largest function | Demo data integrity, seed duplication, live/demo confusion | Split by domain after seed matrix exists |
| Payments | Several smaller functions repeat auth/client/payment patterns | High financial risk | Extract shared payment/auth/idempotency helpers with contract tests first |
| Contact Dispatch demo reply | `demo-dispatch-reply` mixes auth, room lookup, AI call, insert/read state | Security and chat trust | Extract chat authorization + AI reply helper after RLS matrix passes |
| Hospital media | Smaller but shares Google media concerns | Cost/secret/media redirect risk | Share Places media client with discovery after provider client is stable |

## Target Internal Architecture

Keep deployed slugs stable. Move internals toward:

```text
supabase/functions/
  _shared/
    http/
      cors.ts
      response.ts
      request.ts
      errors.ts
    env/
      env.ts
      featureFlags.ts
    supabase/
      clients.ts
      auth.ts
      rpc.ts
    observability/
      logger.ts
      timing.ts
    domain/
      providers/
        taxonomy.ts
        guards.ts
        distance.ts
        fallbackImages.ts
        normalizeGoogle.ts
        normalizeMapbox.ts
        googlePlaces.ts
        mapboxPlaces.ts
        persistence.ts
        discoveryFlow.ts
      demo/
        context.ts
        organizations.ts
        hospitals.ts
        providers.ts
        staff.ts
        pricing.ts
        wallets.ts
      payments/
        stripe.ts
        actors.ts
        records.ts
        quotes.ts
        idempotency.ts
      emergencyChat/
        rooms.ts
        participants.ts
        messages.ts
        aiReply.ts
```

## Phase 8 Pass Plan

### 8.0 Baseline And Freeze

Status: Started 2026-05-19 after Phase 0-7 runtime gate commit `f90845a6`.

Do before moving code:

- Record baseline hashes for each hotspot with `git log --oneline --follow`.
- Record line counts.
- Record current `supabase functions list` versions.
- Confirm `supabase/config.toml` slug-to-entrypoint mapping.
- Fix stale docs indexes found during planning.

Gate:

- `git diff --check`
- `npm run hardening:edge-smoke`
- `npm run hardening:edge-payments`
- `npm run hardening:chat-rls`
- `npm run hardening:emergency`
- `npx deno check` for each touched edge entrypoint, where Deno is available.

Rollback:

- Use `docs/deployment/EDGE_FUNCTION_ROLLBACK_RUNBOOK.md`.
- Restore by function family, not individual helper, if a deployed slug fails.

Baseline snapshot recorded 2026-05-19:

| Public slug / owner | Local entrypoint | Lines | HEAD blob hash | Live version |
| --- | --- | ---: | --- | ---: |
| `discover-hospitals` engine | `supabase/functions/discovery/discover-hospitals/index.ts` | 1666 | `952ef09e958db54662752a6135ced66af72f77cd` | 93 |
| `discover-hospitals` wrapper | `supabase/functions/discover-hospitals/index.ts` | 1 | `70a1d1ec1ffe08d6f0e5c6e8f8a7e32ad9b20a67` | 93 |
| `bootstrap-demo-ecosystem` | `supabase/functions/bootstrap-demo-ecosystem/index.ts` | 1985 | `a74a689cf6072239f8cdaada290c3715ef4d54f6` | 42 |
| `create-payment-intent` | `supabase/functions/payments/create-payment-intent/index.ts` | 306 | `ff196e986647934ec4990c3d0ca059d0dab0c835` | 30 |
| `billing-quote` | `supabase/functions/payments/billing-quote/index.ts` | 123 | `924bd4b316e248d7a86a96fe77a35c0bb9e32b66` | 17 |
| `refresh-exchange-rates` | `supabase/functions/payments/refresh-exchange-rates/index.ts` | 270 | `5811ac5eb45d560cb11c1a8bd9b5370decdc68c4` | 18 |
| `manage-payment-methods` | `supabase/functions/payments/manage-payment-methods/index.ts` | 111 | `b5225ee132ea63986a631947b475b94434bfc872` | 30 |
| `create-payout` | `supabase/functions/payments/create-payout/index.ts` | 77 | `3242b7af1b6d4cde75e3853b629c88af6d2f47c6` | 30 |
| `stripe-webhook` | `supabase/functions/webhooks/stripe-webhook/index.ts` | 219 | `d22874f95bf034130f6e1e93d2212b516db30f71` | 31 |
| `hospital-media` | `supabase/functions/hospital-media/index.ts` | 176 | `c5607cd60d0c9e70103e3dd894d14cc41909a3e7` | 22 |
| `demo-approve-cash-payment` | `supabase/functions/demo-approve-cash-payment/index.ts` | 144 | `401a280a38c24d14401357904810f5448fef4bb2` | 18 |
| `demo-dispatch-reply` | `supabase/functions/demo-dispatch-reply/index.ts` | 317 | `bd074bbcf67b3612942a8a64b07fdacf04ea752c` | 7 |
| `review-demo-auth` | `supabase/functions/review-demo-auth/index.ts` | 138 | `8d6ffa79914dbb34d18fc0ffcac90f9e82fbc163` | 17 |
| `triage-copilot` | `supabase/functions/triage-copilot/index.ts` | 165 | `770484278ad85af467269b2bfc699af6567ccd9d` | 22 |

Slug-to-entrypoint mapping confirmed in `supabase/config.toml`:

| Slug | Entrypoint | JWT |
| --- | --- | --- |
| `manage-payment-methods` | `./functions/payments/manage-payment-methods/index.ts` | true |
| `bootstrap-demo-ecosystem` | `./functions/bootstrap-demo-ecosystem/index.ts` | false |
| `discover-hospitals` | `./functions/discover-hospitals/index.ts` | false |
| `demo-approve-cash-payment` | `./functions/demo-approve-cash-payment/index.ts` | false |
| `demo-dispatch-reply` | `./functions/demo-dispatch-reply/index.ts` | false |
| `review-demo-auth` | `./functions/review-demo-auth/index.ts` | false |
| `triage-copilot` | `./functions/triage-copilot/index.ts` | false |
| `hospital-media` | `./functions/hospital-media/index.ts` | false |
| `billing-quote` | `./functions/payments/billing-quote/index.ts` | true |
| `refresh-exchange-rates` | `./functions/payments/refresh-exchange-rates/index.ts` | true |
| `create-payment-intent` | `./functions/payments/create-payment-intent/index.ts` | true |
| `create-payout` | `./functions/payments/create-payout/index.ts` | true |
| `stripe-webhook` | `./functions/webhooks/stripe-webhook/index.ts` | false |

Existing shared helpers at Phase 8 start:

- `_shared/domain/ids.ts`
- `_shared/domain/numbers.ts`
- `_shared/domain/providers/taxonomy.ts`
- `_shared/env/env.ts`
- `_shared/http/cors.ts`
- `_shared/payments/stripe.ts`
- `_shared/supabase/clients.ts`

Recent hotspot history was captured with `git log --follow -3` for each entrypoint. The recurring recent anchor is `bedd529f refactor(edge): share function foundations`; `discover-hospitals` also has recent provider-discovery-specific commits `d7ad11e9`, `12c0c27a`, and `713623c1`.

Baseline gate run, 2026-05-19:

- `git diff --check` passed.
- `npm run hardening:edge-smoke` passed 81/81 with Google + Mapbox enabled.
- `npm run hardening:edge-payments` passed 6 payment/webhook functions.
- `npm run hardening:chat-rls` passed 23/23.
- `npm run hardening:emergency` passed.
- `deno --version` failed because Deno is not installed on this machine; run `npx deno check` or native `deno check` in an environment with Deno before deploying edge-function code movement.

### 8.1 Shared HTTP, Env, Auth, And Observability

Status: Started 2026-05-19. First compatibility extraction completed locally for shared HTTP request/response helpers and timing primitives.

This is the first implementation pass because it is low behavioral risk.

Extract:

- JSON body parsing
- method guards
- request id
- duration timing
- typed JSON error responses
- auth header parsing
- user/service client creation wrappers

Do not change:

- business logic
- database queries
- provider selection
- payment mutation order

Gate:

- All edge smoke/payment/chat scripts still pass.
- Response body shape remains compatible.

8.1 extraction note, 2026-05-19:

- Added `_shared/http/request.ts` for `OPTIONS` checks, method checks, authorization header extraction, and safe JSON body parsing.
- Added `_shared/http/response.ts` for compatible `{ success: false, error }` JSON error responses and method-not-allowed responses.
- Added `_shared/observability/timing.ts` as the first timing primitive for later request-duration logging.
- Adopted the HTTP helpers in `review-demo-auth` and `payments/billing-quote` only. Business logic, database queries, Stripe behavior, auth behavior, and response status choices were preserved.
- Validation: `git diff --check`, `npm run hardening:edge-payments`, `npm run hardening:edge-smoke`, `npm run hardening:chat-rls`, and `npm run hardening:emergency` passed.
- Deno validation: `npx deno check supabase/functions/payments/billing-quote/index.ts`, `npx deno check supabase/functions/review-demo-auth/index.ts`, and `npx deno check` for the new shared helper files passed. Native `deno` remains unavailable on PATH; use `npx deno` locally or native Deno in deployment environments.

8.1 follow-up extraction note, 2026-05-19:

- Adopted `isOptionsRequest`, `getAuthorizationHeader`, and `jsonErrorResponse` in `demo-approve-cash-payment`.
- Adopted `isOptionsRequest` in `triage-copilot` while preserving strict `req.json()` behavior and AI fallback response shapes.
- Validation: `git diff --check`, `npx deno check` for both touched functions, `npm run hardening:edge-payments`, `npm run hardening:edge-smoke`, and `npm run hardening:emergency` passed.

8.1 payment adoption note, 2026-05-19:

- Adopted `isOptionsRequest` and `getAuthorizationHeader` in `create-payment-intent`, `create-payout`, and `manage-payment-methods`.
- Adopted `isOptionsRequest`, `getAuthorizationHeader`, and `jsonErrorResponse` in `refresh-exchange-rates`, preserving its existing `{ success: false, error }` shape.
- Preserved compatibility in payment endpoints that intentionally return `{ error }` without a `success` field on failure.
- Validation: `git diff --check`, `npx deno check` for all four touched payment functions, `npm run hardening:edge-payments`, `npm run hardening:edge-smoke`, and `npm run hardening:emergency` passed.

8.1 dispatch/media/webhook adoption note, 2026-05-19:

- Adopted `isOptionsRequest`, `getAuthorizationHeader`, and compatible `jsonErrorResponse` in `demo-dispatch-reply`.
- Adopted shared request method helpers in `hospital-media` while preserving its existing media CORS headers and `{ error }` response bodies.
- Adopted `isOptionsRequest` in `stripe-webhook` only. Raw body parsing and Stripe signature verification remain unchanged.
- Validation: `git diff --check`, `npx deno check` for all three touched functions, `npm run hardening:edge-payments`, `npm run hardening:edge-smoke`, `npm run hardening:chat-rls`, and `npm run hardening:emergency` passed.

### 8.2 Provider Discovery Extraction

Owner: `discover-hospitals`.

Extract pure/domain pieces first:

- fallback image library
- request parsing
- category guards
- distance helpers
- Google normalization
- Mapbox normalization
- provider/hospital merge helpers
- persistence helpers

Only after pure extraction:

- move Google Places calls into `providers/googlePlaces.ts`
- move Mapbox calls into `providers/mapboxPlaces.ts`
- move flow orchestration into `providers/discoveryFlow.ts`

Hard constraints:

- `discover-hospitals` slug remains public because guest map discovery depends on it.
- Google Places remains gated by `ENABLE_GOOGLE_PLACES` plus request flags.
- Field masks must stay narrow.
- Emergency hospital discovery must not return non-emergency provider categories unless explicitly in Explore Care mode.

Gate:

- `npm run hardening:edge-smoke`
- Run smoke matrix with Google on and off.
- Verify Hemet, Festac, London, Nairobi, Dubai, Delhi, Tokyo, Sao Paulo, Sydney.
- Verify categories: hospital, pharmacy, lab, radiology, urgent care, clinic, mental health, women's care, pediatrics.

8.2 pure extraction note, 2026-05-19:

- Added `_shared/domain/providers/distance.ts` for the pure `calculateDistanceKm` helper.
- Updated the `discover-hospitals` engine to import the shared distance helper while preserving `withDistanceFromOrigin`, ranking, database queries, provider API calls, and response shapes in place.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/distance.ts`, and `npm run hardening:edge-smoke` passed.

8.2 normalization extraction note, 2026-05-19:

- Added `_shared/domain/providers/normalizeExternal.ts` for pure Mapbox and Google provider shape normalization.
- Updated the `discover-hospitals` engine to import the normalization helpers while keeping media proxy URL construction in the entrypoint through an injected builder callback.
- Preserved provider API calls, field masks, persistence order, merge behavior, and response shapes.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/normalizeExternal.ts`, and `npm run hardening:edge-smoke` passed.
- Follow-up: `node supabase/tests/scripts/run_edge_function_smoke_matrix.js --no-google` still fails against the live function for `tokyo/radiology` with zero results. All other cases in that mode passed; track this as a provider coverage gap rather than a local extraction failure because the script exercises the deployed edge function.

8.2 provider row extraction note, 2026-05-19:

- Added `_shared/domain/providers/rows.ts` for pure distance parsing, distance sorting, local-radius checks, merge-key generation, and generic provider row prioritization.
- Updated the `discover-hospitals` engine to pass its existing `isDispatchableDatabaseRow` predicate into the shared prioritizer, preserving emergency/provider ordering rules in the entrypoint.
- Preserved provider API calls, database reads/writes, merge behavior, and response shapes.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/rows.ts`, and `npm run hardening:edge-smoke` passed.

8.2 fallback image extraction note, 2026-05-19:

- Added `_shared/domain/providers/fallbackImages.ts` for the deterministic fallback image catalog and category-aware picker.
- Updated the `discover-hospitals` engine to import `pickFallbackProviderImage` while keeping domain-logo inference, preferred-image ranking, persistence, provider API calls, merge behavior, and response shapes in the entrypoint.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/fallbackImages.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore the fallback image catalog and picker to `discover-hospitals/index.ts` if provider image selection regresses.

8.2 category guard extraction note, 2026-05-19:

- Added `_shared/domain/providers/guards.ts` for category keyword guard ownership and non-dental provider noise rejection.
- Updated the `discover-hospitals` engine to import `shouldKeepProviderForRequestedCategory` and `hasProviderCategoryKeywordGuard`, preserving the old category-confidence branch where only categories with an explicit keyword guard can claim guard-backed confidence.
- Preserved provider API calls, database reads/writes, merge behavior, and response shapes.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/guards.ts supabase/functions/_shared/domain/providers/fallbackImages.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore `shouldKeepProviderForRequestedCategory` to `discover-hospitals/index.ts` if category filtering regresses.

8.2 provider media extraction note, 2026-05-19:

- Added `_shared/domain/providers/media.ts` for provider image resolution, safe domain-logo inference, and preferred-image ranking.
- Updated the `discover-hospitals` engine to import `resolveProviderImage` and `choosePreferredProviderImage` while keeping the Supabase media proxy URL builder, provider API calls, database reads/writes, merge behavior, and response shapes in the entrypoint.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/media.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore `resolveHospitalImage`, `choosePreferredImage`, domain blocklist, name stopwords, URL/domain parsing, and image-source rank constants to `discover-hospitals/index.ts` if provider images regress.

8.2 provider locality extraction note, 2026-05-19:

- Added `_shared/domain/providers/locality.ts` for provider locality scopes, local-nearby thresholds, region-local-first country codes, country-code normalization, and the local-first predicate.
- Updated the `discover-hospitals` engine to import those constants/helpers while preserving the local-first/wide-fallback flow, provider API calls, database reads/writes, merge behavior, and response shapes.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/locality.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore `LOCALITY_SCOPE_LOCAL`, `LOCALITY_SCOPE_WIDE_FALLBACK`, `MAP_LOCAL_NEARBY_RADIUS_KM`, `MAP_LOCAL_NEARBY_COMFORT_THRESHOLD`, `REGION_LOCAL_FIRST_COUNTRY_CODES`, `normalizeCountryCode`, and `shouldUseRegionLocalFirst` to `discover-hospitals/index.ts` if locality fallback behavior regresses.

8.2 Google Places client extraction note, 2026-05-19:

- Added `_shared/domain/providers/googlePlaces.ts` for Google Places field masks, text-search query construction, list search, and detail lookup.
- Updated the `discover-hospitals` engine to import `fetchGoogleProviderPlaces` and `fetchGoogleProviderDetails` while keeping Google feature-flag checks, request flow, normalization, persistence, merge behavior, and response shapes in the entrypoint.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/googlePlaces.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore `GOOGLE_PROVIDER_LIST_FIELD_MASK`, `GOOGLE_PROVIDER_DETAIL_FIELD_MASK`, `buildGoogleTextSearchQuery`, `fetchGoogleProviderPlaces`, and `fetchGoogleProviderDetails` to `discover-hospitals/index.ts` if Google provider discovery regresses.

8.2 Mapbox Places client extraction note, 2026-05-19:

- Added `_shared/domain/providers/mapboxPlaces.ts` for category-aware Mapbox Search Box URL construction, response extraction, and keyword fallback.
- Updated the `discover-hospitals` engine to import `fetchMapboxProviderPlaces` while keeping Mapbox feature-flag checks, locality decoration, normalization, persistence, merge behavior, and response shapes in the entrypoint.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/mapboxPlaces.ts`, and `npm run hardening:edge-smoke` passed. Diagnostic `node supabase/tests/scripts/run_edge_function_smoke_matrix.js --no-google` passed all cases except the known `tokyo/radiology` fallback coverage gap.
- Rollback: restore the category-aware Mapbox fetch block, keyword fallback block, `CATEGORY_TO_MAPBOX_CATEGORY`, and `EXPLORE_CATEGORY_META_KEYWORDS` imports to `discover-hospitals/index.ts` if Mapbox fallback behavior regresses.

8.2 provider persistence extraction note, 2026-05-19:

- Added `_shared/domain/providers/persistence.ts` for hospital upsert row assembly, provider upsert row assembly, geometry point formatting, and provider-type data enrichment.
- Updated the `discover-hospitals` engine to import `toHospitalUpsertRow` and `toProviderUpsertRow` while preserving the actual database upsert calls, conflict targets, persistence order, merge behavior, and response shapes in the entrypoint.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/persistence.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore `toGeometryPoint`, `toHospitalUpsertRow`, `enrichProviderData`, and `toProviderUpsertRow` to `discover-hospitals/index.ts` if provider persistence or provider detail data regresses.

8.2 provider defaults extraction note, 2026-05-19:

- Added `_shared/domain/providers/defaults.ts` for provider type classification, category confidence assignment, emergency eligibility derivation, default field normalization, and image defaulting.
- Updated the `discover-hospitals` engine to import `withProviderDefaults` while keeping request parsing, external provider calls, database reads/writes, merge behavior, and response shapes in the entrypoint.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/defaults.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore `withProviderDefaults` to `discover-hospitals/index.ts` if provider classification, emergency eligibility, category confidence, or default image behavior regresses.

8.2 provider row eligibility extraction note, 2026-05-19:

- Expanded `_shared/domain/providers/rows.ts` to own demo-row detection, hospital dispatchability checks, and origin-distance decoration.
- Updated the `discover-hospitals` engine to import `isDispatchableDatabaseRow` and `withDistanceFromOrigin` while preserving database queries, provider filtering, merge behavior, and response shapes in the entrypoint.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/rows.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore `isDemoDatabaseRow`, `isDispatchableDatabaseRow`, and `withDistanceFromOrigin` to `discover-hospitals/index.ts` if database prioritization, emergency dispatchability, or wide-fallback distance behavior regresses.

8.2 provider merge extraction note, 2026-05-19:

- Expanded `_shared/domain/providers/rows.ts` with `mergeCanonicalAndProviderRows` so canonical database rows and provider-only rows are deduped in one shared row helper.
- Updated the `discover-hospitals` engine to call the shared merge helper while preserving category filtering, provider-only fallback, canonical-row priority, response shape, and meta counters.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/rows.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore the local `providerLocalityByPlaceId`, `prioritizedDbResults`, `seen`, and `merged` loops to `discover-hospitals/index.ts` if merge ordering or deduplication regresses.

8.2 discover HTTP/auth helper adoption note, 2026-05-19:

- Updated `discover-hospitals` to use `_shared/http/request.ts` for `OPTIONS` and authorization header handling.
- Updated the anonymous auth-validity probe to use `_shared/supabase/clients.ts` instead of constructing an endpoint-local Supabase anon client.
- Preserved the existing behavior where invalid auth is logged and discovery continues anonymously.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore the local `req.method`, `req.headers.get("Authorization")`, and anon `createClient` code if request/auth probing regresses.

8.2 provider request parsing extraction note, 2026-05-19:

- Added `_shared/domain/providers/request.ts` for provider category parsing, provider enrichment request parsing, and discovery request flag/coordinate normalization.
- Updated `discover-hospitals` to consume the parsed request context while preserving the existing invalid-coordinate error, Google feature flag behavior, and default request values.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/request.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore the local `latitude`, `longitude`, `radius`, `mode`, `query`, provider category, and include flag parsing if request defaults or meta flags regress.

8.2 provider media proxy extraction note, 2026-05-19:

- Expanded `_shared/domain/providers/media.ts` with `buildProviderMediaProxyUrl` for stable app-owned hospital-media function URLs.
- Updated `discover-hospitals` to delegate proxy URL construction while preserving the existing `SUPABASE_URL` lookup and `hospital-media?place_id=` URL shape.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/media.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore the local `buildHospitalMediaProxyUrl` URL construction if provider photos stop resolving through the app-owned media endpoint.

8.2 provider discovery flow extraction note, 2026-05-19:

- Added `_shared/domain/providers/discoveryFlow.ts` for the external provider fetch sequence: Google local-first/wide fallback, Mapbox fallback, locality decoration, and fetch counters.
- Updated `discover-hospitals` to call the shared flow helper while preserving the endpoint-level provider fetch catch/log behavior, provider normalization, persistence, merge, and response meta.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/discoveryFlow.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore the local `fetchGooglePlacesForRadius`, `decorateScope`, Google local/wide fetch, and Mapbox fallback block if provider source selection or fallback counters regress.

8.2 provider database RPC extraction note, 2026-05-19:

- Added `_shared/domain/providers/database.ts` for the shared `nearby_hospitals` / `nearby_providers` RPC branch used by initial reads and post-upsert refreshes.
- Updated `discover-hospitals` to call the shared RPC helper while preserving emergency-mode fatal errors, Explore Care nonfatal provider RPC errors, refresh logging, and response behavior.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/database.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore the local `nearby_hospitals` / `nearby_providers` RPC blocks if DB read fallback or post-upsert refresh behavior regresses.

8.2 provider persistence flow extraction note, 2026-05-19:

- Added `_shared/domain/providers/persistenceFlow.ts` for provider-only dedupe, existing image lookup, hospital upsert, row-by-row conflict fallback, providers table upsert, and post-upsert canonical DB refresh.
- Updated `discover-hospitals` to call the shared persistence flow while preserving provider persistence counters, fallback error logging, provider-table enrichment writes, and response behavior.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/persistenceFlow.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: restore the local provider-only row dedupe, hospital upsert, coordinate conflict fallback, providers table upsert, and refresh block if provider persistence or canonical id refresh regresses.

8.2 provider detail enrichment extraction note, 2026-05-19:

- Added `_shared/domain/providers/enrichmentFlow.ts` for the `enrich_provider` Google detail fetch, normalization/defaulting, hospital upsert, provider-table upsert, and enriched row assembly.
- Updated `discover-hospitals` to keep the same `enrich_provider` response shape and stable slug while delegating provider-detail persistence to the shared provider domain flow.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/enrichmentFlow.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: inline the provider detail fetch, normalization, hospital upsert, provider-table upsert, and enriched row assembly back into `discover-hospitals` if detail enrichment persistence regresses.

8.2 provider database sufficiency extraction note, 2026-05-19:

- Added `evaluateProviderDatabaseSufficiency` to `_shared/domain/providers/rows.ts` for dispatchable row filtering, category-guarded DB filtering, local-radius checks, comfort targets, and database-sufficient skip decisions.
- Updated `discover-hospitals` to call the shared sufficiency helper while preserving the EXP-6/PULLBACK behavior for emergency versus explore mode.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/rows.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: inline the dispatchable/category-filtered row derivation and comfort-target calculation back into `discover-hospitals` if external discovery skip behavior regresses.

8.2 external provider normalization flow extraction note, 2026-05-19:

- Added `_shared/domain/providers/normalizationFlow.ts` for Google/Mapbox normalization dispatch, provider defaults, origin distance decoration, radius filtering, and requested-category guards.
- Updated `discover-hospitals` to call the shared normalization flow while preserving provider source handling, app-owned media proxy URLs, and merge/persistence behavior.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/normalizationFlow.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: inline the normalization/defaulting/distance/filter chain back into `discover-hospitals` if external provider rows regress.

8.2 provider response shaping extraction note, 2026-05-19:

- Added `_shared/domain/providers/response.ts` for normalized provider result rows, canonical/provider merge response rows, and dispatchable/local database count summaries.
- Updated `discover-hospitals` to keep HTTP response ownership while delegating merge-ready provider row shaping and database count metadata to the provider domain.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/response.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: inline provider result row mapping, canonical/provider merge invocation, result limiting, and dispatchable/local DB count filters back into `discover-hospitals` if response ordering or metadata counts regress.

8.2 provider runtime config extraction note, 2026-05-19:

- Added `_shared/domain/providers/config.ts` for Google Places enablement/API key lookup, Mapbox token lookup, and the configured app-owned provider media proxy URL builder.
- Updated `discover-hospitals` to consume provider runtime config helpers instead of owning env-name lists and media proxy configuration.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/domain/providers/config.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: inline Google/Mapbox env lookup and configured media proxy URL construction back into `discover-hospitals` if runtime config resolution regresses.

8.2 optional auth probe extraction note, 2026-05-19:

- Added `_shared/supabase/auth.ts` with `probeOptionalAuthHeader` for non-fatal auth header validation and consistent anonymous-continuation logging.
- Updated `discover-hospitals` to use the shared optional auth probe while preserving the existing request flow for anonymous and authenticated callers.
- Validation: `git diff --check`, `npx deno check supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/_shared/supabase/auth.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: inline the local authorization header lookup, user client creation, and non-fatal `auth.getUser()` logging block back into `discover-hospitals` if optional auth diagnostics regress.

8.8 discover-hospitals thin entrypoint note, 2026-05-19:

- Added `supabase/functions/discovery/discover-hospitals/handler.ts` with `handleDiscoverHospitalsRequest` containing the existing request orchestration.
- Reduced `supabase/functions/discovery/discover-hospitals/index.ts` to the stable `serve(handleDiscoverHospitalsRequest)` entrypoint while keeping the public `discover-hospitals` slug and wrapper unchanged.
- Validation: `git diff --check`, `npx deno check supabase/functions/discover-hospitals/index.ts supabase/functions/discovery/discover-hospitals/index.ts supabase/functions/discovery/discover-hospitals/handler.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: move `handleDiscoverHospitalsRequest` body back into `index.ts` and call `serve(async (req) => { ... })` directly if module loading or deployment bundling regresses.

8.1 required auth helper payment adoption note, 2026-05-19:

- Added `requireAuthenticatedUser` to `_shared/supabase/auth.ts` for shared authorization-header lookup, user client creation, and `auth.getUser()` validation with caller-controlled error messages.
- Updated `billing-quote`, `create-payment-intent`, `create-payout`, `manage-payment-methods`, and `refresh-exchange-rates` to use the shared required-auth helper while preserving their existing missing-header and invalid-user messages.
- Validation: `git diff --check`, `npx deno check` for all five touched payment functions plus `_shared/supabase/auth.ts`, `npm run hardening:edge-payments`, and `npm run hardening:edge-smoke` passed.
- Rollback: inline each function's previous authorization-header lookup, `createUserClient`, and `auth.getUser()` block if payment auth behavior regresses.

8.1 authenticated user reader demo adoption note, 2026-05-19:

- Added `readAuthenticatedUser` to `_shared/supabase/auth.ts` for non-throwing authorization-header lookup, user client creation, and `auth.getUser()` results.
- Updated `demo-approve-cash-payment` and `demo-dispatch-reply` to use the shared authenticated-user reader while preserving their existing `Unauthorized` 401 response shape.
- Validation: `git diff --check`, `npx deno check` for both touched demo functions plus `_shared/supabase/auth.ts`, `npm run hardening:chat-rls`, and `npm run hardening:emergency` passed.
- Rollback: inline each function's previous authorization-header lookup, `createUserClient`, and `auth.getUser()` block if demo auth behavior regresses.

8.7 rollback and docs index update note, 2026-05-19:

- Updated `docs/deployment/EDGE_FUNCTION_ROLLBACK_RUNBOOK.md` for the Phase 8 shared helper ownership map and the `discover-hospitals` thin-entrypoint/handler topology.
- Updated `docs/INDEX.md` to remove the stale Explore Care implementation checkpoint link and point active references at the Explore Care dossier and pass index.
- Validation: `git diff --check`, `rg` confirmed the stale checkpoint path is absent from `docs/INDEX.md`, and `Test-Path` confirmed the active Explore Care dossier/pass index and `discover-hospitals` handler paths exist.
- Rollback: restore the prior docs links/runbook text if a missing active document reference is discovered.

8.6 hospital media Google photo helper extraction note, 2026-05-19:

- Added shared Google Places photo helpers to `_shared/domain/providers/googlePlaces.ts` for place-id-to-photo URL and photo-name-to-photo URL resolution.
- Updated `hospital-media` to reuse the shared Google photo helpers while preserving redirect status, fallback image selection, cache-control behavior, and secret access.
- Validation: `git diff --check`, `npx deno check supabase/functions/hospital-media/index.ts supabase/functions/_shared/domain/providers/googlePlaces.ts`, and `npm run hardening:edge-smoke` passed.
- Rollback: inline the previous place-details and media fetch helpers back into `hospital-media` if provider photo redirects regress.

### 8.3 Demo Bootstrap Domain Split

Owner: `bootstrap-demo-ecosystem`.

Do not start until a seed/bootstrap matrix exists.

Extract in this order:

1. demo request context and auth
2. organization creation/reuse
3. wallet setup
4. hospital/provider seed discovery
5. hospital persistence and dedupe
6. doctors/ambulances/staff
7. pricing
8. final response assembly

Hard constraints:

- Use atomic upserts where current behavior uses upserts.
- Preserve demo/live separation.
- Preserve Lagos/Festac known-good seed coverage.
- Do not let demo bootstrap create duplicate canonical providers.

Gate:

- Add `run_bootstrap_demo_ecosystem_matrix.js` before extraction.
- Existing data integrity and cleanup guards pass.

8.3 bootstrap matrix harness note, 2026-05-19:

- Added `supabase/tests/scripts/run_bootstrap_demo_ecosystem_matrix.js` as the required safety harness before splitting `bootstrap-demo-ecosystem`.
- Added `npm run hardening:bootstrap-demo-matrix` for non-mutating dry-run validation and `npm run hardening:bootstrap-demo-matrix:apply` for explicit live idempotent phase checks.
- Matrix locations: Hemet, Festac/Lagos, London, Nairobi, and Delhi. Matrix phases: `prepare`, `hospitals`, `staff`, `pricing`, and `summary`.
- Validation: `git diff --check`, package JSON parse, and `npm run hardening:bootstrap-demo-matrix` passed. This was the non-mutating dry-run; `npm run hardening:bootstrap-demo-matrix:apply` remains the explicit live gate before bootstrap internals are split.
- Rollback: remove the bootstrap matrix script and package scripts if the harness itself proves too invasive or incompatible with the live bootstrap contract.

8.3 bootstrap timing helper extraction note, 2026-05-19:

- Added `runTimedStep` and `TimedStepEntry` to `_shared/observability/timing.ts` so edge functions can build consistent timeline entries without each function owning local stopwatch boilerplate.
- Updated `bootstrap-demo-ecosystem` to use the shared timing helper while preserving the existing `timeline[].step`, `timeline[].duration_ms`, and `timeline[].data` response contract.
- Validation: `git diff --check`, `npx deno check supabase/functions/bootstrap-demo-ecosystem/index.ts`, and `npm run hardening:bootstrap-demo-matrix` passed. The matrix run was the non-mutating dry-run.
- Rollback: inline the previous local `runStep` function in `bootstrap-demo-ecosystem` and remove `runTimedStep` if timeline shape or edge bundling regresses.

8.3 bootstrap pricing extraction note, 2026-05-19:

- Added `_shared/domain/demo/pricing.ts` for demo service/room pricing baselines and their RPC-backed upsert routine.
- Updated `bootstrap-demo-ecosystem` to import the shared pricing module while preserving summary readiness math through the same exported baseline arrays.
- Validation: `git diff --check`, `npx deno check supabase/functions/bootstrap-demo-ecosystem/index.ts supabase/functions/_shared/domain/demo/pricing.ts`, and `npm run hardening:bootstrap-demo-matrix` passed. The matrix run was the non-mutating dry-run.
- Rollback: move `SERVICE_PRICING_BASELINES`, `ROOM_PRICING_BASELINES`, and `ensureDemoPricing` back into `bootstrap-demo-ecosystem/index.ts` if pricing setup or Deno bundling regresses.

8.3 bootstrap finance extraction note, 2026-05-19:

- Added `_shared/domain/demo/finance.ts` for organization fee sync, organization wallet setup, platform wallet top-up, and demo financial readiness thresholds.
- Updated `bootstrap-demo-ecosystem` to import the shared finance readiness routine and exported wallet thresholds while preserving summary readiness checks.
- Validation: `git diff --check`, `npx deno check supabase/functions/bootstrap-demo-ecosystem/index.ts supabase/functions/_shared/domain/demo/finance.ts supabase/functions/_shared/domain/demo/pricing.ts`, and `npm run hardening:bootstrap-demo-matrix` passed. The matrix run was the non-mutating dry-run.
- Rollback: move `DEMO_ORG_WALLET_TARGET_BALANCE`, `DEMO_PLATFORM_WALLET_MIN_BALANCE`, and `ensureDemoFinancialReadiness` back into `bootstrap-demo-ecosystem/index.ts` if wallet setup or financial readiness regresses.

8.3 bootstrap context extraction note, 2026-05-19:

- Added `_shared/domain/demo/context.ts` for `DemoContext`, demo user slug normalization, and coverage-key construction.
- Updated `bootstrap-demo-ecosystem` to build demo context through the shared helper while leaving request parsing and auth resolution local for this pass.
- Validation: `rg` confirmed slug/coverage helpers now only live in the shared context module, `git diff --check`, `npx deno check supabase/functions/bootstrap-demo-ecosystem/index.ts supabase/functions/_shared/domain/demo/context.ts supabase/functions/_shared/domain/demo/finance.ts supabase/functions/_shared/domain/demo/pricing.ts`, and `npm run hardening:bootstrap-demo-matrix` passed. The matrix run was the non-mutating dry-run.
- Rollback: move `DemoContext`, `toSafeUserSlug`, `toCoverageAxisKey`, `toCoverageKey`, and the context object literal back into `bootstrap-demo-ecosystem/index.ts` if demo identity scoping or coverage keys regress.

8.3 bootstrap organization extraction note, 2026-05-19:

- Added `_shared/domain/demo/organization.ts` for coverage-scoped demo organization lookup/creation and contact-email ownership.
- Updated `bootstrap-demo-ecosystem` to call the shared organization helper while preserving the same `organizations` select/insert contract and organization timeline step.
- Validation: `git diff --check`, `npx deno check supabase/functions/bootstrap-demo-ecosystem/index.ts supabase/functions/_shared/domain/demo/context.ts supabase/functions/_shared/domain/demo/organization.ts supabase/functions/_shared/domain/demo/finance.ts supabase/functions/_shared/domain/demo/pricing.ts`, and `npm run hardening:bootstrap-demo-matrix` passed. The matrix run was the non-mutating dry-run.
- Rollback: move `ensureDemoOrganization` back into `bootstrap-demo-ecosystem/index.ts` if organization reuse, contact-email scoping, or Deno bundling regresses.

8.3 bootstrap utility extraction note, 2026-05-19:

- Added `_shared/domain/demo/utils.ts` for shared parsing, string normalization, dedupe keys, stable IDs, timestamps, URL checks, and haversine distance.
- Updated `bootstrap-demo-ecosystem` to consume the shared utility module while preserving helper behavior used by seed discovery, persistence, staffing, and summary logic.
- Validation: `git diff --check`, `npx deno check supabase/functions/bootstrap-demo-ecosystem/index.ts supabase/functions/_shared/domain/demo/utils.ts supabase/functions/_shared/domain/demo/context.ts supabase/functions/_shared/domain/demo/organization.ts supabase/functions/_shared/domain/demo/finance.ts supabase/functions/_shared/domain/demo/pricing.ts`, and `npm run hardening:bootstrap-demo-matrix` passed. The matrix run was the non-mutating dry-run.
- Rollback: inline the utility helpers back into `bootstrap-demo-ecosystem/index.ts` if normalization, coordinate keys, timestamps, or distance calculations regress.

### 8.4 Payment Function Consolidation

Owners:

- `create-payment-intent`
- `billing-quote`
- `manage-payment-methods`
- `create-payout`
- `refresh-exchange-rates`
- `stripe-webhook`

Extract:

- actor resolution
- organization/profile lookup
- Stripe client access
- payment record helpers
- emergency request payment-state update helpers
- idempotency helpers

Hard constraints:

- Do not expose Stripe client secrets beyond the intended response.
- Do not weaken JWT settings.
- `stripe-webhook` remains `verify_jwt = false` and must keep signature verification.
- Payment record insertion order must preserve auditability.

Gate:

- `npm run hardening:edge-payments`
- Manual Stripe webhook verification if webhook code changes.

### 8.5 Contact Dispatch Edge Quality

Owner: `demo-dispatch-reply`.

Extract:

- room/participant authorization lookup
- message history read
- AI provider choice
- reply generation
- reply persistence

Hard constraints:

- RLS remains the primary read/write boundary.
- Demo AI must not bypass participant checks.
- Realtime and idempotency expectations from CD-8 remain intact.

Gate:

- `npm run hardening:chat-rls`
- Static RLS sweep confirms `emergency_chat_*` policies and indexes.

### 8.6 Hospital Media And Places Client Sharing

Owner: `hospital-media`.

Extract only after provider Google client is stable:

- shared Places details/media helpers
- media field-mask constants
- redirect/fallback behavior

Hard constraints:

- No raw secret exposure.
- Missing media should degrade to app-owned fallback imagery.

Gate:

- Verify media redirect with a known `place_id`.
- Verify non-Google fallback still works when Google is disabled.

### 8.7 Config, Docs, And Rollback Ledger

Update:

- `docs/deployment/EDGE_FUNCTION_ROLLBACK_RUNBOOK.md`
- function inventory versions after deploy
- docs index links
- per-pass changed files, verification, rollback notes

Fix discovered docs drift:

- `docs/INDEX.md` references an Explore Care checkpoint path that no longer exists under `docs/audit/map/`.
- Point future references at active `docs/flows/emergency/architecture/explore-care/` docs or restore the missing checkpoint if intentionally archived.

### 8.8 Optional Final Thin Entrypoints

Only after all earlier passes are green:

```ts
serve((req) => routeDiscoveryRequest(req));
```

Entrypoints should become thin routers, but only after behavior is locked by tests.

## Non-Goals

- Do not create new public edge slugs.
- Do not rewrite database schema as part of function modularization.
- Do not merge provider discovery with emergency dispatch.
- Do not change Google cost posture without explicit feature-flag and quota decision.
- Do not move Book Visit into this backend phase.
- Do not optimize RLS by weakening policies.

## Required Regression Matrix

Before any Phase 8 deploy:

```bash
npm run hardening:edge-payments
npm run hardening:chat-rls
npm run hardening:emergency
npm run hardening:edge-smoke
```

For touched function entrypoints:

```bash
npx deno check supabase/functions/<function-folder>/index.ts
```

After deploy:

```bash
npx supabase functions list
npm run hardening:edge-smoke
```

## Decision

Phase 8 should begin with `discover-hospitals` only after Phase 5 Explore Care hardening is green. Provider discovery is the most valuable backend engine to modularize first, but it is also the easiest to damage. The correct first code pass is shared HTTP/env/auth/observability extraction plus pure provider helpers, not a flow rewrite.
