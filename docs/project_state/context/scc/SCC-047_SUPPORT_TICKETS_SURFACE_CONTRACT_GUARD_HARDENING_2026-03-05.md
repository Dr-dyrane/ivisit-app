# SCC-047 Support Tickets Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `support_tickets` app/console type and relationship drift, fix support-role ownership filtering to canonical fields, and add deterministic guard coverage for service-lane mutation authority.

## Scope
- console type reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
- support auth + service hardening:
  - `../ivisit-console/frontend/src/services/authService.js`
  - `../ivisit-console/frontend/src/services/supportTicketsService.js`
  - `../ivisit-console/frontend/src/services/searchService.js`
- guard lane:
  - `supabase/tests/scripts/assert_support_tickets_surface_field_guard.js`
  - `supabase/tests/validation/support_tickets_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled console `support_tickets` type block:
   - aligned `created_at`/`updated_at` nullability with canonical schema (`string`)
   - restored FK relationship parity:
     - `support_tickets_assigned_to_fkey`
     - `support_tickets_organization_id_fkey`
     - `support_tickets_user_id_fkey`.
2. Fixed support auth scoping bug:
   - `applyAuthFilter(..., { resourceType: 'support' })` now scopes by `userIdField` (`user_id`) instead of non-schema `created_by`.
3. Hardened support ticket service payload contract:
   - added explicit create/update field allowlists
   - sanitized payload construction to canonical fields only
   - removed explicit `created_at`/`updated_at` writes on create (DB owns create timestamps)
   - kept `updated_at` stamp on update mutations.
4. Normalized search history writes/reads behind constants plus fallback insertion:
   - moved `search_history` references to constant-driven table access
   - added missing-relation fallback from search history insert to `search_events`.
5. Added deterministic `support_tickets` guard enforcing:
   - app/console `Row`/`Insert`/`Update` parity
   - required FK parity
   - canonical console `support_tickets` select-column usage
   - mutation boundary ownership (`supportTicketsService` as canonical mutation lane)
   - service allowlist/timestamp contract checks.
6. Wired npm command:
   - `hardening:support-tickets-surface-field-guard`
7. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table support_tickets` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table support_tickets` PASS (2026-03-05)
- `npm run hardening:support-tickets-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`support_tickets` now has canonical type/relationship parity, corrected support-role scoping, and deterministic guard coverage to prevent service drift and mutation-lane leakage.
