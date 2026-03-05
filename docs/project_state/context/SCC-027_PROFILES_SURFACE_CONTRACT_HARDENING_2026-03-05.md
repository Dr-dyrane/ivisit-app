# SCC-027 Profiles Surface Contract Hardening (2026-03-05)

## Objective
Lock `profiles` table contract parity across app and console type surfaces and add a deterministic guard lane so profile update surfaces cannot drift silently.

## Why This Was Needed
Profiles flow-trace review found a concrete type-parity gap:
- app canonical `profiles.Update` contract included `display_id`;
- console `profiles.Update` contract omitted `display_id`;
- no dedicated profiles surface guard existed to prevent this class of drift from returning.

## Implemented
1. Console profile type reconciliation:
   - `../ivisit-console/frontend/src/types/database.ts`
   - added `display_id?: string | null` to `profiles.Update`.

2. Deterministic profiles surface guard:
   - `supabase/tests/scripts/assert_profiles_surface_field_guard.js`
   - validates:
     - console `profiles` Row/Insert/Update include canonical `display_id`,
     - profile update whitelist exists and contains only approved fields,
     - profile update path stamps `updated_at`.
   - report:
     - `supabase/tests/validation/profiles_surface_field_guard_report.json`.

3. Command + docs integration:
   - `package.json`
   - `supabase/docs/TESTING.md`
   - added command:
     - `npm run hardening:profiles-surface-field-guard`.

4. Flow trace artifact refresh:
   - `supabase/tests/validation/table_flow_trace_profiles.json`
   - `supabase/tests/validation/table_flow_trace_profiles.md`.

## Verification (This Run)
- `node supabase/tests/scripts/export_table_flow_trace.js --table profiles`: PASS (2026-03-05)
- `npm run hardening:profiles-surface-field-guard`: PASS (2026-03-05)
- `npm run build` (console frontend): PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
