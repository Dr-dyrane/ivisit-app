# SCC-037: Doctors Surface Contract Guard Hardening (2026-03-05)

## Objective
Lock `doctors` contract parity and query-surface safety across app + console:
- reconcile console `doctors` type contract with canonical app schema,
- remove legacy/non-schema doctor search fields in console,
- enforce deterministic guard coverage to prevent future `doctors` surface drift.

## Implemented Changes

### 1) Console Type Contract Reconciliation
- Updated: `../ivisit-console/frontend/src/types/database.ts`
- Reconciled `doctors` `Row`/`Insert`/`Update` to canonical app fields:
  - added `current_patients`, `department`, `display_id`, `is_on_call`, `max_patients`,
  - aligned `created_at` / `updated_at` nullability to canonical contract.
- Relationship parity hardening:
  - restored `doctors_profile_id_fkey` to `profiles(id)`,
  - removed non-canonical `available_hospitals` relationship drift from `doctors`.

### 2) Console Doctor Search Surface Hardening
- Updated: `../ivisit-console/frontend/src/services/searchService.js`
- Hardened `searchDoctors` to canonical fields:
  - reads `specialization`, `department`, `image` from `doctors`,
  - joins hospital label through relation alias `hospitals:hospital_id(name)`.
- Removed legacy/non-schema field usage:
  - no `specialty`,
  - no `avatar_url`,
  - no direct `hospital` doctor column assumption.

### 3) Deterministic Guard Lane (New)
- Added: `supabase/tests/scripts/assert_doctors_surface_field_guard.js`
- Added npm command:
  - `hardening:doctors-surface-field-guard`
- Guard checks:
  - app/console type parity for `doctors` (`Row`/`Insert`/`Update`),
  - required relationship parity (`doctors_hospital_id_fkey`, `doctors_profile_id_fkey`),
  - no non-canonical `available_hospitals` relation drift in console `doctors`,
  - canonical doctor search fields and join shape in console search service,
  - forbids legacy doctor search fields (`specialty`, `avatar_url`).

### 4) Testing Docs + Plan/Tracker
- Updated: `supabase/docs/TESTING.md`
- Updated: `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
- Updated: `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table doctors` PASS (2026-03-05)
- `npm run hardening:doctors-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)
