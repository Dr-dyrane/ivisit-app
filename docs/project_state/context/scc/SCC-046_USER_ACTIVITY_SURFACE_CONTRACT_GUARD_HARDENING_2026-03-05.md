# SCC-046 User Activity Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `user_activity` app/console type and relationship drift and add deterministic guard coverage so canonical query/mutation authority remains enforced.

## Scope
- console type reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
- guard lane:
  - `supabase/tests/scripts/assert_user_activity_surface_field_guard.js`
  - `supabase/tests/validation/user_activity_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled console `user_activity` type block:
   - removed non-schema `updated_at` from `Row`/`Insert`/`Update`
   - aligned `description` nullability with canonical schema (`string | null`)
   - restored `user_activity_user_id_fkey` relationship parity.
2. Added deterministic `user_activity` guard enforcing:
   - app/console `Row`/`Insert`/`Update` parity
   - required FK parity (`user_activity_user_id_fkey`)
   - canonical console `user_activity` select-column usage
   - forbidden direct console `insert/update/upsert/delete` mutations on `user_activity`.
3. Wired npm command:
   - `hardening:user-activity-surface-field-guard`
4. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table user_activity` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table user_activity` PASS (2026-03-05)
- `npm run hardening:user-activity-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`user_activity` now has deterministic surface guard coverage and canonical type/relationship parity, with mutation authority explicitly constrained to RPC/automation lanes.
