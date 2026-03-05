# SCC-038: Hospital Capacity/Rooms Source Hardening (2026-03-05)

## Objective
Eliminate double-source room drift by making app bed booking derive from canonical `hospitals` capacity fields while synchronizing DB trigger/function behavior for bed counters and `bed_availability`.

## Implemented Changes

### 1) App Room Source Consolidation
- Updated: `services/hospitalsService.js`
- `getRooms` no longer depends on `hospital_rooms`.
- Room availability now derives from canonical hospitals fields:
  - `available_beds`
  - `icu_beds_available`
  - `total_beds`
  - `bed_availability`
- Added virtual-room derivation and room-pricing enrichment for stable bed option rendering.

### 2) Booking Flow Safety Alignment
- Updated: `components/emergency/EmergencyRequestModal.jsx`
- Booking room loading now:
  - prioritizes canonical rooms from `hospitalsService.getRooms`,
  - applies consistent dedupe + selection hydration,
  - allows pricing-only virtual fallback only when hospital bed availability indicates capacity.

### 3) DB Trigger/Function Capacity Sync Hardening
- Updated: `supabase/migrations/20260219000200_org_structure.sql`
  - added `normalize_hospital_bed_state` trigger lane (`BEFORE INSERT OR UPDATE` on `hospitals`) to normalize bed counts and rebuild `bed_availability`.
- Updated: `supabase/migrations/20260219000800_emergency_logic.sql`
  - hardened `update_hospital_availability` with null-safe updates and bed snapshot sync.
- Updated: `supabase/migrations/20260219000900_automations.sql`
  - hardened `update_resource_availability` bed handling for:
    - hospital reassignment while request still active,
    - ICU-sensitive bed decrement/release.
- Updated: `supabase/migrations/20260219010000_core_rpcs.sql`
  - `update_hospital_by_admin` now supports `icu_beds_available` and `bed_availability` payloads with availability timestamp refresh.

### 4) Deterministic Guard Expansion
- Updated: `supabase/tests/scripts/assert_hospitals_surface_field_guard.js`
- Added checks for:
  - no app `hospital_rooms` reads in room flow,
  - canonical hospital capacity reads in `getRooms`,
  - required capacity trigger/function SQL patterns.

### 5) Docs/Control Alignment
- Updated: `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
- Updated: `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`
- Updated: `supabase/docs/TESTING.md`

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table hospitals` PASS (2026-03-05)
- `npm run hardening:hospitals-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)
