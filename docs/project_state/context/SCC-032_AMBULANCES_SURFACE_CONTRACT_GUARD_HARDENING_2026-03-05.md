# SCC-032: Ambulances Surface Contract Guard Hardening (2026-03-05)

## Objective
Lock `ambulances` schema contract parity across app and console, and add a deterministic guard lane that blocks non-schema field drift in ambulance type/service surfaces.

## Scope
- App type contract: `types/database.ts`
- App mapper boundary: `services/ambulanceService.js`
- Console type contract: `../ivisit-console/frontend/src/types/database.ts`
- New guard: `supabase/tests/scripts/assert_ambulances_surface_field_guard.js`
- Hardening command: `hardening:ambulances-surface-field-guard`
- Testing docs / plan / tracker updates

## Implemented Changes
1. App `ambulances` type contract aligned to canonical logistics schema fields:
   - added `crew`, `current_call`, `eta` to `Row`/`Insert`/`Update`.
2. Console `ambulances` type contract reconciled to app canonical contract:
   - added canonical fields: `display_id`, `license_plate`,
   - removed non-schema drift fields: `currency`, `driver_id`, `hospital`, `last_maintenance`, `rating`,
   - aligned `created_at`/`updated_at` nullability and `Insert.id` optionality,
   - restored `ambulances_profile_id_fkey` relationship parity.
3. App ambulance mapper hardened:
   - maps canonical columns (`display_id`, `license_plate`, FK IDs),
   - blocks direct non-schema reads (`row.hospital`, `row.last_maintenance`, `row.rating`),
   - retains compatibility aliases with safe canonical values.
4. Added deterministic ambulances surface guard:
   - validates app/console type parity for `Row`/`Insert`/`Update`,
   - enforces canonical required row fields,
   - enforces app mapper canonical reads,
   - enforces console payload and `VALID_COLUMNS` whitelist safety.

## Verification
- `node supabase/tests/scripts/export_table_flow_trace.js --table ambulances` PASS (2026-03-05)
- `npm run hardening:ambulances-surface-field-guard` PASS (2026-03-05)
- `npm run build` in `../ivisit-console/frontend` PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Evidence Artifacts
- `supabase/tests/validation/table_flow_trace_ambulances.json`
- `supabase/tests/validation/table_flow_trace_ambulances.md`
- `supabase/tests/validation/ambulances_surface_field_guard_report.json`
- `supabase/tests/validation/cross_repo_contract_matrix_report.json`

## Variance
No scope variance. A regex false-positive in the initial guard implementation was corrected by parsing `VALID_COLUMNS` deterministically.

