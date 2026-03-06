# SCC-051 Trending Topics Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `trending_topics` app/console type drift and add deterministic guard coverage so canonical trending-topic field usage and mutation boundaries remain enforced.

## Scope
- app generated type reconciliation:
  - `supabase/database.ts`
- console type/service reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - `../ivisit-console/frontend/src/services/trendingTopicsService.js`
  - `../ivisit-console/frontend/src/services/analyticsAutomationService.js`
- guard lane:
  - `supabase/tests/scripts/assert_trending_topics_surface_field_guard.js`
  - `supabase/tests/validation/trending_topics_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled `trending_topics` type contracts in generated app+console surfaces:
   - aligned `created_at` and `updated_at` to canonical non-null shape
   - aligned `update_trending_topics_from_search` RPC return type to canonical `Json`.
2. Hardened console `trendingTopicsService` payload handling:
   - added explicit create/update allowlists
   - normalized and validated `query`, `category`, and `rank`
   - blocked raw spread update payload drift
   - preserved deterministic `updated_at` stamping on updates.
3. Normalized console analytics automation RPC success handling for `admin_update_trending_topics` JSONB payloads.
4. Added deterministic `trending_topics` guard enforcing:
   - app/console `Row`/`Insert`/`Update` parity
   - `update_trending_topics_from_search` return-type parity in app/generated/console type contracts
   - approved console reference boundaries for direct `trending_topics` table usage
   - canonical select-column usage
   - mutation-boundary ownership and service allowlist/update-contract checks.
5. Wired npm command:
   - `hardening:trending-topics-surface-field-guard`
6. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table trending_topics` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table trending_topics` PASS (2026-03-05)
- `npm run hardening:trending-topics-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`trending_topics` now has deterministic surface guard coverage and canonical app/console contract parity, including RPC return-type alignment for trending-topic automation paths.
