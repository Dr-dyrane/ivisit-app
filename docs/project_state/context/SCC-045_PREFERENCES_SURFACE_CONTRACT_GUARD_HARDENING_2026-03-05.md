# SCC-045 Preferences Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `preferences` app/console relationship drift and add deterministic guard coverage so type/relationship/select-surface regressions fail fast.

## Scope
- console type reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
- guard lane:
  - `supabase/tests/scripts/assert_preferences_surface_field_guard.js`
  - `supabase/tests/validation/preferences_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Restored console `preferences` relationship parity:
   - added `preferences_user_id_fkey` relationship block in console type contract.
2. Added deterministic `preferences` surface guard:
   - app/console `Row`/`Insert`/`Update` parity checks
   - relationship parity + required FK check (`preferences_user_id_fkey`)
   - canonical console `preferences` select-column checks against app `Row` contract.
3. Wired npm command:
   - `hardening:preferences-surface-field-guard`
4. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table preferences` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table preferences` PASS (2026-03-05)
- `npm run hardening:preferences-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`preferences` now has deterministic surface guard coverage and canonical relationship parity with app contracts, eliminating silent console drift risk for user settings persistence/read flows.
