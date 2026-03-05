# SCC-023 Cash Fee Deduction Hardening (2026-03-05)

## Objective
Fix cash approval fee deduction so org wallet debit is reliably applied during `approve_cash_payment`, matching cash-eligibility rules.

## Root Cause
`approve_cash_payment` resolved fee as:
- `COALESCE(v_payment.ivisit_fee_amount, metadata_fee, 0)`

But `payments.ivisit_fee_amount` has a default `0.00` and `create_emergency_v4` was not setting it explicitly for pending cash rows.  
That default `0.00` masked metadata fee values and caused deduction to be skipped.

## Implemented Changes
1. `create_emergency_v4` now persists `ivisit_fee_amount` explicitly on payment insert.
2. Payment metadata now writes both keys for compatibility:
   - `fee_amount`
   - `fee`
3. `approve_cash_payment` fee resolution hardened to:
   - `NULLIF(v_payment.ivisit_fee_amount, 0)`
   - `metadata.fee_amount`
   - legacy `metadata.fee`
   - fallback compute from `organizations.ivisit_fee_percentage` (default `2.5%`) and payment amount
4. On approval, resolved fee is persisted back to payment row:
   - `payments.ivisit_fee_amount = v_fee_amount`
   - metadata merged with `fee_amount` + `fee`

## Files
- `supabase/migrations/20260219000800_emergency_logic.sql`
- `supabase/migrations/20260219010000_core_rpcs.sql`
- `supabase/tests/scripts/assert_cash_fee_deduction_contract.js`
- `package.json`
- `supabase/docs/TESTING.md`

## Verification
- `npm run hardening:cash-fee-contract-guard`: PASS (2026-03-05)
- `npm run hardening:finance-rpc-contract-guard`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
