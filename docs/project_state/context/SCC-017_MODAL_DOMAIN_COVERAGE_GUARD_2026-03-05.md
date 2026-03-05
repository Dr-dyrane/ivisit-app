# SCC-017 Modal Domain Coverage Guard (2026-03-05)

## Objective
Enforce deterministic modal/page/service contract coverage for linked high-touch domains:
- emergency requests
- visits
- wallet/payments
- pricing
- core linked entities (`profiles`, `hospitals`, `organizations`)

## Scope
- `supabase/tests/scripts/assert_modal_domain_coverage.js`
- `package.json`
- `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
- `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`
- `supabase/tests/validation/modal_domain_coverage_report.json`

## Implemented Changes
1. Added modal-domain guard script
- Reads `console_ui_crud_contract_matrix_report.json`
- Requires coverage for:
  - `emergency_requests`
  - `visits`
  - `service_pricing`
  - `room_pricing`
  - `organization_wallets`
  - `wallet_ledger`
  - `payments`
  - `payment_methods`
  - `profiles`
  - `hospitals`
  - `organizations`
- Enforces:
  - surface exists
  - modal/page/service metadata present
  - no `risks`
  - no `service_unknown_columns`
  - no non-dynamic missing required/persisted field regressions
- Writes artifact:
  - `supabase/tests/validation/modal_domain_coverage_report.json`

2. Added npm command
- `hardening:modal-domain-guard`
  - runs `hardening:console-ui-crud-matrix`
  - runs modal-domain assertion script

## Why This Slice
- SCC-015 was trigger/automation hardening and did not directly enforce modal CRUD domain coverage.
- This guard formalizes one-by-one modal domain verification as requested, with machine-readable evidence.

## Verification
- `npm run hardening:modal-domain-guard`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
