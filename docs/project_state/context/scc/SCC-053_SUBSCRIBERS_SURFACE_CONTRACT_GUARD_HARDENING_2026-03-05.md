# SCC-053 Subscribers Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `subscribers` app/generated/console type drift and add deterministic guard coverage so canonical subscriber field usage and mutation boundaries remain enforced.

## Scope
- app/generated type reconciliation:
  - `supabase/database.ts`
- console type/service/UI reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - `../ivisit-console/frontend/src/services/subscriptionService.js`
  - `../ivisit-console/frontend/src/services/subscribersService.js`
  - `../ivisit-console/frontend/src/components/modals/SubscriptionModal.jsx`
  - `../ivisit-console/frontend/src/components/views/SubscriptionListView.jsx`
  - `../ivisit-console/frontend/src/components/views/SubscriptionTableView.jsx`
  - `../ivisit-console/frontend/src/components/pages/SubscriptionManagementPage.jsx`
- alignment audit expectation refresh:
  - `supabase/tests/scripts/run_alignment_audit.js`
- guard lane:
  - `supabase/tests/scripts/assert_subscribers_surface_field_guard.js`
  - `supabase/tests/validation/subscribers_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled `subscribers` type contracts in generated app+console surfaces:
   - removed non-schema legacy fields (`source`, `sale_id`, `last_engagement_at`, `welcome_email_sent_at`, `unsubscribed_at`)
   - aligned `created_at` and `updated_at` nullability to canonical non-null shape.
2. Hardened subscriber service payload handling:
   - normalized `email` writes in `subscriptionService` payload builder
   - added canonical writable-field allowlist/payload builder in `subscribersService`
   - guarded required `email` on create in `subscribersService`.
3. Removed non-schema subscriber field usage from subscription UI surfaces:
   - removed `source` references from subscription modal/list/table views
   - replaced legacy `last_engagement_at` UI card with canonical `updated_at`.
4. Refreshed alignment audit expectation for `subscribers` to canonical columns only.
5. Added deterministic `subscribers` guard enforcing:
   - app/generated/console `Row`/`Insert`/`Update` parity
   - approved console reference boundaries for direct `subscribers` table usage
   - canonical select-column usage
   - mutation-boundary ownership and writable-field contract checks in both subscriber services.
6. Wired npm command:
   - `hardening:subscribers-surface-field-guard`
7. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table subscribers` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table subscribers` PASS (2026-03-05)
- `npm run hardening:subscribers-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`subscribers` now has deterministic surface guard coverage and canonical app/generated/console contract parity, with subscription UI/service surfaces constrained to schema-backed fields only.
