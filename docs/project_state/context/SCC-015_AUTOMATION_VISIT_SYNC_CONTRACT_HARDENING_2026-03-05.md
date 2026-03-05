# SCC-015 Automation Visit-Sync Contract Hardening (2026-03-05)

## Objective
Harden canonical automation contracts by:
1. removing stale references to non-existent `emergency_requests` fields,
2. expanding emergency->visit synchronization beyond completion-only updates.

## Scope
- `supabase/migrations/20260219000900_automations.sql`
- `supabase/tests/scripts/assert_automation_contract.js`
- `package.json`
- `supabase/tests/validation/automation_contract_guard_report.json`

## Implemented Changes
1. Removed stale emergency ETA references in automation paths
- Removed `NEW.estimated_arrival` usage from:
  - `auto_assign_driver`
  - `update_resource_availability`
- Rationale: `emergency_requests.estimated_arrival` is not in canonical table contract and causes trigger-contract drift.

2. Hardened `sync_emergency_to_visit` lifecycle propagation
- Replaced completion-only sync behavior with lifecycle-aware update mapping.
- Added propagation for:
  - status mapping: includes `accepted`, `arrived`, `cancelled`
  - lifecycle state updates (`lifecycle_state`, `lifecycle_updated_at`)
  - facility/doctor/cost alignment (`hospital_name`, `doctor_name`, `cost`)
- Kept trigger scope on `AFTER UPDATE` to avoid duplicate row creation with existing emergency creation flows.

3. Added deterministic automation contract guard
- New script: `supabase/tests/scripts/assert_automation_contract.js`
- Checks:
  - no stale `NEW.estimated_arrival` in canonical automation migration
  - `sync_emergency_to_visit` contains mappings for `accepted`, `arrived`, `cancelled`
  - visit lifecycle/facility/cost updates are present
- Emits:
  - `supabase/tests/validation/automation_contract_guard_report.json`

4. Added npm command
- `hardening:automation-contract-guard`

## Why This Slice
- Prior data mismatch symptoms (`Unknown Facility`, stale visit status) require root-layer synchronization hardening, not just UI fallback mapping.
- Trigger-contract drift against missing columns can cause fragile runtime behavior and should be prevented with deterministic checks.

## Verification
- `npm run hardening:automation-contract-guard`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
