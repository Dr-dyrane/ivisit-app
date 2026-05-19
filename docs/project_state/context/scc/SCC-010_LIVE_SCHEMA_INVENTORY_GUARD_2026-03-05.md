# SCC-010 Live Schema Inventory Guard (2026-03-05)

## Objective
Close SCC-005 finding F4 by refreshing live schema inventory artifacts and adding a deterministic guard that validates logistics/finance critical table coverage, including `emergency_status_transitions`.

## Scope
- Inventory refresh:
  - `supabase/tests/scripts/export_live_schema_inventory.js`
- Inventory guard:
  - `supabase/tests/scripts/assert_live_inventory_coverage.js`
- Hardening command surface:
  - `package.json`
- Refreshed artifacts:
  - `docs/audit/live_schema_inventory_2026-03-05.json`
  - `docs/audit/live_schema_inventory_latest.json`

## Implemented Changes
1. Contract-focused live inventory exporter
- Added `hardening:inventory-refresh` script.
- Probes live table existence and required column contracts for logistics/finance critical tables:
  - `ambulances`, `emergency_requests`, `emergency_status_transitions`, `visits`,
  - `organization_wallets`, `patient_wallets`, `ivisit_main_wallet`, `wallet_ledger`,
  - `payment_methods`, `payments`, `insurance_policies`, `insurance_billing`.
- Writes both date-stamped and latest inventory files in `docs/audit/`.

2. Deterministic inventory guard
- Added `hardening:inventory-guard` script.
- Enforces:
  - inventory freshness window (`<= 14 days`),
  - required logistics/finance table presence,
  - required transition-audit column coverage on `emergency_status_transitions`.

3. Artifact refresh
- Generated fresh inventory artifacts for current date and latest pointer file.

## Why This Slice
- SCC-005 identified stale inventory blind spots where transition-audit visibility could regress unnoticed.
- Existing hardening guards verify DB behavior but did not enforce freshness/coverage of inventory artifacts.
- This slice makes inventory freshness and transition-audit coverage explicit and repeatable.

## Verification
- `npm run hardening:inventory-refresh`: PASS (2026-03-05)
- `npm run hardening:inventory-guard`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
