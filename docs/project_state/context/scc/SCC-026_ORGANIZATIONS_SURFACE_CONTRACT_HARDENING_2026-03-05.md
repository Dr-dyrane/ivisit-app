# SCC-026 Organizations Surface Contract Hardening (2026-03-05)

## Objective
Close `organizations` table drift across console type contracts and CRUD payload boundaries so organization edits persist only canonical schema fields with safe numeric coercion.

## Why This Was Needed
Organizations flow trace + surface inspection showed contract drift risk:
- console organizations payload writes accepted unsanitized values and undefined-key leakage;
- numeric `ivisit_fee_percentage` could be forwarded as non-numeric text;
- console type contract missed canonical `display_id` on organizations row/insert/update;
- no deterministic guard existed to block regressions in this surface.

## Implemented
1. Console organizations payload hardening:
   - `../ivisit-console/frontend/src/services/organizationsService.js`
   - added deterministic payload builder/sanitizer:
     - `toTrimmedOrNull`
     - `toFiniteOrNull`
     - `pruneUndefined`
     - `buildOrganizationPayload`
   - enforced required `name` before insert/update;
   - sanitized `ivisit_fee_percentage` to finite number or `null`;
   - ensured undefined payload keys are removed before write.

2. Console organizations type reconciliation:
   - `../ivisit-console/frontend/src/types/database.ts`
   - added `display_id` to organizations:
     - `Row.display_id`
     - `Insert.display_id`
     - `Update.display_id`.

3. Deterministic organizations guard lane:
   - `supabase/tests/scripts/assert_organizations_surface_field_guard.js`
   - command:
     - `npm run hardening:organizations-surface-field-guard`
   - report:
     - `supabase/tests/validation/organizations_surface_field_guard_report.json`.

4. Flow trace + docs wiring:
   - generated organizations trace artifacts:
     - `supabase/tests/validation/table_flow_trace_organizations.json`
     - `supabase/tests/validation/table_flow_trace_organizations.md`
   - added command + docs references:
     - `package.json`
     - `supabase/docs/TESTING.md`.

## Verification (This Run)
- `node supabase/tests/scripts/export_table_flow_trace.js --table organizations`: PASS (2026-03-05)
- `npm run hardening:organizations-surface-field-guard`: PASS (2026-03-05)
- `npm run build` (console frontend): PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)

## Notes
- Guard scope was tightened after an initial false positive from a broad forbidden-field pattern that matched derived display mapping (`wallet_balance`) rather than organizations schema payload/type drift.
