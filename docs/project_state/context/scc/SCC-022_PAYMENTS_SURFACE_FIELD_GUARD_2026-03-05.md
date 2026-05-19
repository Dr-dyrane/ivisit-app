# SCC-022 Payments Surface Field Guard + UI Contract Reconciliation (2026-03-05)

## Objective
Block JS/JSX field-drift regressions for `payments` in console wallet/emergency UI, where data fetch can be correct but render paths still read non-schema or wrong-context fields.

## Implementation
1. Generated deterministic payments table flow artifacts:
   - `supabase/tests/validation/table_flow_trace_payments.json`
   - `supabase/tests/validation/table_flow_trace_payments.md`
2. Added stale-field guard script:
   - `supabase/tests/scripts/assert_payments_surface_field_guard.js`
   - output:
     - `supabase/tests/validation/payments_surface_field_guard_report.json`
3. Added hardening command:
   - `hardening:payments-surface-field-guard`
4. Patched payments UI drift in console runtime files:
   - `src/components/pages/WalletManagementPage.jsx`
   - `src/components/mobile/MobileWallet.jsx`
   - `src/components/modals/EmergencyDetailsModal.jsx`

## High-Signal Fixes Applied
1. Replaced direct payment-row `description` rendering (ledger-only column) with canonical payment description derivation for payment contexts.
2. Removed wallet UI fallback to legacy `payment_method_id`; canonical `payment_method` is now used.
3. Removed emergency details modal fallback to non-schema `request.fee_amount`; canonical fallback now uses `request.total_cost`.

## Verification
- `node supabase/tests/scripts/export_table_flow_trace.js --table payments`: PASS (2026-03-05)
- `npm run hardening:payments-surface-field-guard`: PASS (2026-03-05)
- `npm run build` (console frontend): PASS (2026-03-05)
- `npm run hardening:console-ui-crud-matrix`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
