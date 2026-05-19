# SCC-044 Notifications Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `notifications` app/console type and relationship drift and add deterministic guard coverage so future schema/surface regressions fail fast.

## Scope
- type contract reconciliation:
  - `types/database.ts`
  - `../ivisit-console/frontend/src/types/database.ts`
- guard lane:
  - `supabase/tests/scripts/assert_notifications_surface_field_guard.js`
  - `supabase/tests/validation/notifications_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled app `notifications` type block to canonical schema by adding missing fields:
   - `color`
   - `icon`
   - `target_id`
   - `timestamp`
2. Reconciled console `notifications` type block by:
   - adding missing `display_id`
   - setting `timestamp` to required `string` (canonical non-null)
   - restoring `notifications_user_id_fkey` relationship.
3. Added deterministic surface guard:
   - app/console `Row`/`Insert`/`Update` parity checks
   - relationship parity + required FK check (`notifications_user_id_fkey`)
   - canonical console `notifications` select-column checks against app `Row` contract.
4. Wired npm command:
   - `hardening:notifications-surface-field-guard`
5. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table notifications` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table notifications` PASS (2026-03-05)
- `npm run hardening:notifications-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`notifications` is now covered by the same preventive closure pattern as the other hardened tables: canonical type contract parity, required relationship parity, and deterministic guard failure on select-surface drift.
