# SCC-034: Insurance Surface Contract Guard Hardening (2026-03-05)

## Objective
Eliminate active insurance contract drift by hardening:
- `insurance_policies` app/console type parity,
- missing `insurance_billing` console type coverage,
- insurance policy payload/normalization write surfaces so legacy alias fields remain UI-compatible without non-schema writes.

## Implemented Changes

### 1) Console Type Contract Reconciliation
- Updated: `../ivisit-console/frontend/src/types/database.ts`
- Added canonical `insurance_billing` table contract block (`Row`/`Insert`/`Update` + relationships).
- Replaced drifted `insurance_policies` table block with canonical schema contract:
  - includes `coverage_percentage`, `status`, `linked_payment_method: string | null`,
  - removes legacy top-level non-schema columns (`group_number`, `policy_holder_name`, `start_date`, `end_date`, `coverage_type`, `front_image_url`, `back_image_url`),
  - restores `insurance_policies_user_id_fkey` relationship.

### 2) Insurance Service Payload Hardening (App + Console)
- Updated: `services/insuranceService.js` (app)
- Updated: `../ivisit-console/frontend/src/services/insuranceService.js`
- Hardened canonical policy write path:
  - centralized payload building for writes (`buildInsuranceWritePayload`),
  - canonical policy columns only in insert/update payloads,
  - legacy UI fields are normalized through `coverage_details` aliases.
- Added robust linked-payment normalization:
  - keeps canonical `linked_payment_method` column usage safe,
  - stores card snapshot/display metadata under `coverage_details.linked_payment_method_snapshot` for UI render compatibility.
- Added alias normalization for read surfaces:
  - `coverage_type`, `policy_type`, `start_date`, `end_date`,
  - `policy_holder_name`, `group_number`, card image aliases,
  - `coverage_amount` derived from canonical `coverage_percentage` when needed.

### 3) Console Insurance Policies Service Normalization
- Updated: `../ivisit-console/frontend/src/services/insurancePoliciesService.js`
- `getUserInsurancePolicies` now returns normalized rows to keep table/card/modal surfaces aligned with compatibility aliases.

### 4) Deterministic Guard Lane (New)
- Added: `supabase/tests/scripts/assert_insurance_surface_field_guard.js`
- Added npm command: `hardening:insurance-surface-field-guard`
- Added docs entry: `supabase/docs/TESTING.md`
- Guard assertions:
  - app/console type parity for `insurance_policies` + `insurance_billing` (`Row`/`Insert`/`Update`),
  - canonical required row coverage (`coverage_percentage`, `status`, etc.),
  - insurance write surfaces must keep legacy policy fields out of direct top-level mutation payloads,
  - console `getUserInsurancePolicies` must normalize rows.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table insurance_policies` PASS (2026-03-05)
- `node supabase/tests/scripts/export_table_flow_trace.js --table insurance_billing` PASS (2026-03-05)
- `npm run hardening:insurance-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Risk Notes
- `insurance_policies` migration pillars still contain legacy insurance RPC assumptions (`is_active`, `coverage_amount`, `policy_type`) in older SQL modules; SCC-034 hardens runtime app/console surfaces and type contracts without changing those legacy SQL bodies in this slice.
