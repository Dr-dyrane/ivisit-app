# SCC-006 Type-Contract Reconciliation (2026-03-05)

## Objective
Reconcile app canonical type contracts for logistics/finance high-impact surfaces with live schema/runtime usage, without broadening scope into full console type migration.

## Scope
- App canonical type source:
  - `types/database.ts`
- Finance owner migration:
  - `supabase/migrations/20260219000400_finance.sql`
- Evidence artifacts:
  - `docs/audit/live_schema_inventory_2026-03-02.json`
  - `docs/audit/ui_db_parity_matrix_2026-03-02.json`
  - `docs/audit/static_supabase_usage_2026-03-02.json`

## Reconciled Surfaces

### 1) `payment_methods` (finance)
Live/runtime evidence showed expected fields used by app flows and present in live inventory:
- `organization_id`
- `expiry_month`
- `expiry_year`
- `metadata`
- `is_active`
- `updated_at`

Changes:
- Added these fields to canonical migration table definition in `0004_finance`.
- Added these fields to `types/database.ts` `Row`/`Insert`/`Update`.
- Added `payment_methods_organization_id_fkey` relationship mapping in types.

### 2) `payments` (finance)
Live inventory includes `metadata` and runtime payment flows pass metadata payload.

Changes:
- Added `metadata` to `types/database.ts` `payments` `Row`/`Insert`/`Update`.

### 3) `emergency_requests` and wallet tables
- `emergency_requests`, `organization_wallets`, `patient_wallets`, and `wallet_ledger` app canonical types were already aligned for the audited columns in this slice.

## Why This Slice
- Finance payment method insertion in app flow (`services/paymentService.js`) relies on fields that were not represented in canonical migration/type shape.
- Contract drift at this layer can silently break checkout/payment UX even when core emergency flow appears healthy.

## Residual Follow-On
1. Console type-contract reconciliation remains separate (outside this app-scoped SCC).
2. Legacy finance RPCs in `0004_finance` still reference older field names (`estimated_amount`, `payment_method_id`) and should be audited as a dedicated SQL behavior hardening slice before enabling/expanding their usage.
