# SCC-014 Finance RPC Contract Hardening (2026-03-05)

## Objective
Remove legacy column assumptions from the canonical finance migration RPC path (`retry_payment_with_different_method`) and enforce deterministic guard checks so these regressions do not re-enter.

## Scope
- `supabase/migrations/20260219000400_finance.sql`
- `supabase/tests/scripts/assert_finance_rpc_contract.js`
- `package.json`
- `supabase/tests/validation/finance_rpc_contract_guard_report.json`

## Implemented Changes
1. Hardened `retry_payment_with_different_method` in `0004_finance`
- Removed legacy usage:
  - `emergency_requests.estimated_amount`
  - `payments.payment_method_id` insert column
- Updated to canonical contract:
  - amount sourced from `emergency_requests.total_cost`
  - payment insert uses `payments.payment_method = 'card'`
  - method-id lineage is preserved in `payments.metadata.payment_method_id`
  - organization/currency resolved from request-linked context when available

2. Added deterministic finance RPC contract guard
- New script: `supabase/tests/scripts/assert_finance_rpc_contract.js`
- Enforces:
  - retry function is present in canonical migration
  - no legacy `estimated_amount` reference in retry function body
  - no `payment_method_id` in `INSERT INTO public.payments (...)` column list
  - canonical `total_cost`, `payment_method`, and `metadata` contract usage
- Emits artifact:
  - `supabase/tests/validation/finance_rpc_contract_guard_report.json`

3. Added npm command
- `hardening:finance-rpc-contract-guard`

## Why This Slice
- Prior SCC audit documented that legacy finance RPC logic still referenced stale columns that do not exist in canonical table contracts.
- This creates hidden break risk if/when those RPCs are exercised.
- The guard makes this class of drift deterministic and reviewable.

## Verification
- `npm run hardening:finance-rpc-contract-guard`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
