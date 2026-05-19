# SCC-049 Search Selections Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `search_selections` app/console type and relationship drift and add deterministic guard coverage so canonical selection-field usage and mutation boundaries remain enforced.

## Scope
- app type reconciliation:
  - `types/database.ts`
  - `supabase/database.ts`
- console type/service reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - `../ivisit-console/frontend/src/services/searchSelectionsService.js`
- guard lane:
  - `supabase/tests/scripts/assert_search_selections_surface_field_guard.js`
  - `supabase/tests/validation/search_selections_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled `search_selections` type contracts across app and console:
   - aligned `created_at` to non-null `string` in `Row` with optional insert/update write shape
   - restored canonical relationship parity with `search_selections_user_id_fkey`.
2. Hardened console `searchSelectionsService` payload handling:
   - added explicit create/update allowlists
   - trimmed and validated canonical required fields (`query`, `result_type`, `result_id`)
   - blocked `user_id` reassignment in update paths
   - retained fallback-safe behavior for missing relation environments.
3. Added deterministic `search_selections` guard enforcing:
   - app/console `Row`/`Insert`/`Update` parity
   - required FK parity (`search_selections_user_id_fkey`)
   - approved reference boundaries for `search_selections` usage
   - canonical select-column usage
   - mutation-boundary ownership + service allowlist contract checks.
4. Wired npm command:
   - `hardening:search-selections-surface-field-guard`
5. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table search_selections` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table search_selections` PASS (2026-03-05)
- `npm run hardening:search-selections-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`search_selections` now has deterministic surface guard coverage and canonical app/console type relationship parity with enforced service mutation boundaries.
