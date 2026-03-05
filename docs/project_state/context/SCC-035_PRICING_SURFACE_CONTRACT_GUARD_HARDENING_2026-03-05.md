# SCC-035: Pricing Surface Contract Guard Hardening (2026-03-05)

## Objective
Lock `service_pricing` + `room_pricing` contracts across app/console to prevent pricing drift:
- type parity (`Row`/`Insert`/`Update` + FK relationships),
- canonical write-lane enforcement (RPC mutation path only in console),
- explicit non-schema pricing payload prevention (`currency`, `is_active`).

## Implemented Changes

### 1) Console Pricing Type Contract Reconciliation
- Updated: `../ivisit-console/frontend/src/types/database.ts`
- Reconciled both pricing tables to canonical schema:
  - removed non-schema pricing columns: `currency`, `is_active`
  - aligned insert optionality for `base_price` / `price_per_night`
  - restored FK relationships:
    - `service_pricing_hospital_id_fkey`
    - `room_pricing_hospital_id_fkey`

### 2) Deterministic Pricing Surface Guard (New)
- Added: `supabase/tests/scripts/assert_pricing_surface_field_guard.js`
- Added npm command:
  - `hardening:pricing-surface-field-guard`
- Guard verifies:
  - app/console type parity for `service_pricing` + `room_pricing` (`Row`/`Insert`/`Update`)
  - canonical required pricing row field coverage
  - console pricing writes use RPC lanes:
    - `upsert_service_pricing`
    - `upsert_room_pricing`
    - `delete_service_pricing`
    - `delete_room_pricing`
  - no direct console table mutations for pricing tables
  - no pricing payload writes for non-schema fields (`currency`, `is_active`)

### 3) Testing Docs + Plan Tracking
- Updated: `supabase/docs/TESTING.md`
- Updated: `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
- Updated: `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table service_pricing` PASS (2026-03-05)
- `node supabase/tests/scripts/export_table_flow_trace.js --table room_pricing` PASS (2026-03-05)
- `npm run hardening:pricing-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)
