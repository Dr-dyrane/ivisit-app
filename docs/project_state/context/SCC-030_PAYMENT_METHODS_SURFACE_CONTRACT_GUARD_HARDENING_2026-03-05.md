# SCC-030 Payment Methods Surface Contract Guard Hardening (2026-03-05)

## Objective
Add a deterministic preventive guard lane for `payment_methods` so app/console type parity and query-column safety remain locked, and console direct-table mutation bypass is prevented.

## Why This Was Needed
`payment_methods` flow trace currently reports green matrix risk state, but the surface is high-impact for finance and relies heavily on edge-function orchestration.

Without a dedicated guard, future console edits could:
- drift table contract parity,
- select non-canonical columns,
- bypass edge-function control by mutating `payment_methods` directly.

## Implemented
1. Deterministic payment-methods guard:
   - `supabase/tests/scripts/assert_payment_methods_surface_field_guard.js`
   - validates:
     - app/console `payment_methods` parity for `Row`/`Insert`/`Update`,
     - relationship-cardinality parity for:
       - `payment_methods_organization_id_fkey`
       - `payment_methods_user_id_fkey`,
     - canonical select-column safety for any console `.from('payment_methods').select(...)`,
     - forbids direct console `.insert/.update/.delete/.upsert` against `payment_methods`.
   - report:
     - `supabase/tests/validation/payment_methods_surface_field_guard_report.json`.

2. Command + docs integration:
   - `package.json`:
     - `hardening:payment-methods-surface-field-guard`
   - `supabase/docs/TESTING.md`:
     - added guard command documentation.

3. Trace artifact refresh:
   - `supabase/tests/validation/table_flow_trace_payment_methods.json`
   - `supabase/tests/validation/table_flow_trace_payment_methods.md`.

## Verification (This Run)
- `node supabase/tests/scripts/export_table_flow_trace.js --table payment_methods`: PASS (2026-03-05)
- `npm run hardening:payment-methods-surface-field-guard`: PASS (2026-03-05)
- `npm run build` (console frontend): PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)

## Notes
- No runtime service patch was required for this slice because current payment-methods surface behavior remains on the edge-function lane.
