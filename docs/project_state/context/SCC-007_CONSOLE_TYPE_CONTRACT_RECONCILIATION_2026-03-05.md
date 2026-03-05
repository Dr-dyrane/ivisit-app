# SCC-007 Console Type-Contract Reconciliation (2026-03-05)

## Objective
Reconcile console-side type contracts and schema helper maps for logistics/finance high-touch tables to the live Supabase schema.

## Scope
- Console type contracts:
  - `ivisit-console/frontend/src/types/database.ts`
  - `ivisit-console/frontend/src/types/emergency.ts`
- Console schema helpers:
  - `ivisit-console/frontend/src/utils/databaseFields.js`
  - `ivisit-console/frontend/src/utils/schemaValidator.js`

## Reconciled Areas
1. `emergency_requests`
- Removed stale non-live columns from console type model (`base_cost`, `bed_type`, `bed_count`, `estimated_arrival`, `patient_heading`, `payment_id`, `payment_method_id`, `shared_data_snapshot`, `urgency_surcharge`, etc.).
- Added missing live columns (`assigned_doctor_id`, `doctor_assigned_at`, `created_at`, `destination_location`).
- Added missing FK relationship metadata in console type contract.

2. Finance table contracts
- `organization_wallets`: added/normalized `display_id` and non-null timestamp contract; fixed FK cardinality.
- `patient_wallets`: added `display_id` and relationship metadata.
- `payment_methods`: normalized timestamp nullability and added relationship metadata for `organization_id` and `user_id`.
- `payments`: replaced stale fields (`ivisit_deduction_amount`, `organization_fee_rate`, `payment_method_id`) with live fields (`display_id`, `ivisit_fee_amount`, `payment_method`, `processed_at`, `provider_response`) and restored relationship metadata.
- `wallet_ledger`: replaced non-live fields (`organization_id`, `reference_type`, `user_id`, `wallet_type`) with live `external_reference`.

3. Helper/schema validation surfaces
- Rebuilt `databaseFields` and `schemaValidator` references to canonical live columns for emergency and finance tables.
- Added explicit correction mappings for common stale field names.

## Why This Slice
- SCC-006 reconciled app canonical contracts; console still had a divergent table model that could produce stale field assumptions and brittle UI behavior.
- This slice keeps console contracts aligned to the same schema source of truth.

## Residual Follow-On
1. Align any remaining console UI components that still render legacy alias fields to canonical mapped fields.
2. Consider generating both app and console database type contracts from a single automated source to reduce manual drift.
