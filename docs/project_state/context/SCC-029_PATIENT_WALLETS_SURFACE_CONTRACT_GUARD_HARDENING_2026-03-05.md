# SCC-029 Patient Wallets Surface Contract Guard Hardening (2026-03-05)

## Objective
Add a deterministic preventive guard lane for `patient_wallets` so app/console contract parity remains locked and future query surfaces cannot drift into non-canonical columns.

## Why This Was Needed
`patient_wallets` flow trace is currently clean, but:
- console CRUD matrix has no direct `patient_wallets` surface coverage (`Matched surfaces: 0`),
- no dedicated guard existed to block future type/query drift.

This slice hardens confidence proactively instead of waiting for runtime regression.

## Implemented
1. Deterministic patient-wallets guard:
   - `supabase/tests/scripts/assert_patient_wallets_surface_field_guard.js`
   - validates:
     - app/console `patient_wallets` parity for `Row`/`Insert`/`Update`,
     - relationship cardinality parity for `patient_wallets_user_id_fkey`,
     - canonical select-column safety for any console `.from('patient_wallets').select(...)` usage.
   - report:
     - `supabase/tests/validation/patient_wallets_surface_field_guard_report.json`.

2. Command + docs integration:
   - `package.json`:
     - `hardening:patient-wallets-surface-field-guard`
   - `supabase/docs/TESTING.md`:
     - added guard command documentation.

3. Trace artifact refresh:
   - `supabase/tests/validation/table_flow_trace_patient_wallets.json`
   - `supabase/tests/validation/table_flow_trace_patient_wallets.md`.

## Verification (This Run)
- `node supabase/tests/scripts/export_table_flow_trace.js --table patient_wallets`: PASS (2026-03-05)
- `npm run hardening:patient-wallets-surface-field-guard`: PASS (2026-03-05)
- `npm run build` (console frontend): PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)

## Notes
- No code/data mutation was required in app or console runtime services for this slice because current `patient_wallets` contracts already matched canonical schema.
