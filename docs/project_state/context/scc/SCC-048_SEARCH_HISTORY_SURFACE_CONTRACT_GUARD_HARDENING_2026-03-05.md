# SCC-048 Search History Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `search_history` app/console type and relationship drift and add deterministic guard coverage so canonical search-history field usage and mutation boundaries remain enforced.

## Scope
- console type reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
- guard lane:
  - `supabase/tests/scripts/assert_search_history_surface_field_guard.js`
  - `supabase/tests/validation/search_history_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled console `search_history` type block:
   - aligned `created_at` and `user_id` nullability with canonical app contract
   - restored `search_history_user_id_fkey` relationship parity.
2. Added deterministic `search_history` guard enforcing:
   - app/console `Row`/`Insert`/`Update` parity
   - required FK parity (`search_history_user_id_fkey`)
   - approved search-history reference boundaries in console source
   - canonical search-history select-column usage
   - mutation-boundary ownership in approved search services
   - `createSearchHistory` payload contract checks.
3. Wired npm command:
   - `hardening:search-history-surface-field-guard`
4. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table search_history` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table search_history` PASS (2026-03-05)
- `npm run hardening:search-history-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`search_history` now has deterministic surface guard coverage and canonical app/console type relationship parity for the active runtime search-history lanes.
