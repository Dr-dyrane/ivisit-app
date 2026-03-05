# SCC-013 Targeted Emergency/Payments/Wallet Matrix Coverage Guard (2026-03-05)

## Objective
Add a deterministic guard lane that enforces contract coverage for `emergency_requests`, `payments`, and wallet-adjacent tables across both console UI CRUD matrix output and runtime CRUD relationship output.

## Scope
- `supabase/tests/scripts/assert_targeted_matrix_coverage.js`
- `package.json`
- `supabase/docs/TESTING.md`
- `supabase/tests/validation/targeted_matrix_coverage_report.json`

## Implemented Changes
1. Added targeted matrix coverage guard script
- New script: `supabase/tests/scripts/assert_targeted_matrix_coverage.js`
- Reads and validates:
  - `console_ui_crud_contract_matrix_report.json`
  - `runtime_crud_relationship_batch_report.json`
- Enforces required console surfaces:
  - `emergency_requests`
  - `organization_wallets`
  - `wallet_ledger`
  - `payments`
  - `payment_methods`
- Enforces required runtime assertions:
  - emergency request + payments + wallet relationship assertions
- Enforces runtime mirror-count presence for:
  - `emergency_requests`
  - `organization_wallets`
  - `wallet_ledger`
  - `payments`
  - `patient_wallets`
  - `ivisit_main_wallet`
- Emits machine-readable artifact:
  - `supabase/tests/validation/targeted_matrix_coverage_report.json`

2. Added npm command for the lane
- `hardening:targeted-matrix-guard`:
  - `hardening:console-ui-crud-matrix`
  - `hardening:runtime-crud-batch`
  - `assert_targeted_matrix_coverage.js`

3. Documented lane in testing guide
- Updated `supabase/docs/TESTING.md` with usage and expectations.

## Why This Slice
- Existing matrix runners already covered parts of this domain, but there was no single deterministic gate that required all critical emergency/payments/wallet contracts to remain covered and passing together.
- This lane makes the expected coverage explicit and blocks silent regressions.

## Verification
- `npm run hardening:targeted-matrix-guard`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
