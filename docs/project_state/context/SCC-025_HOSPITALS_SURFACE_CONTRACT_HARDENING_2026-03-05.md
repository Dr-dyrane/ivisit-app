# SCC-025 Hospitals Surface Contract Hardening (2026-03-05)

## Objective
Close `hospitals` table drift across app, console, and admin RPC so hospital CRUD and import flows only use canonical schema fields and persist edits reliably.

## Why This Was Needed
Hospitals flow trace + runtime review exposed contract drift:
- console/app import services still used non-schema fields (`import_status`, `google_*`, `imported_from_google`, `last_google_sync`);
- console hospitals UI read `google_photos` fallback fields;
- console hospital modal exposed/persisted non-schema `reserved_beds`;
- `update_hospital_by_admin` did not persist modal-edited canonical fields (`type`, `total_beds`, `place_id`);
- contract matrix flagged stale RPC call signature for `update_hospital_by_admin` callsite (payload shorthand not recognized by signature audit lane).

## Implemented
1. App hospitals import canonicalization:
   - `services/hospitalImportService.js`
   - removed non-schema hospitals writes/filters;
   - mapped provider import state to canonical fields (`verification_status`, `verified`, `status`, `place_id`, core hospital attributes).

2. App emergency/hospital selection field drift cleanup:
   - `hooks/emergency/useHospitalSelection.js`
   - `components/emergency/EmergencyRequestModal.jsx`
   - switched to canonical mapped fields (`verificationStatus`, `importedFromGoogle`, `phone`) and removed legacy snake/google fallbacks.

3. Console hospitals import + UI hardening:
   - `../ivisit-console/frontend/src/services/hospitalImportService.js`
   - `../ivisit-console/frontend/src/components/modals/HospitalModal.jsx`
   - `../ivisit-console/frontend/src/components/pages/HospitalsPage.jsx`
   - `../ivisit-console/frontend/src/components/views/HospitalListView.jsx`
   - `../ivisit-console/frontend/src/components/views/HospitalTableView.jsx`
   - moved import gating to `verification_status`;
   - removed `google_photos` UI fallback reads;
   - removed writable `reserved_beds` field from modal payload path.

4. Console hospitals payload hardening:
   - `../ivisit-console/frontend/src/services/hospitalsService.js`
   - canonicalized create/update payload sanitization;
   - ensured persistence of `total_beds` and `place_id`;
   - made RPC call arg explicit (`payload: payload`) to satisfy contract signature lane.

5. Admin RPC hardening:
   - `supabase/migrations/20260219010000_core_rpcs.sql`
   - `update_hospital_by_admin` now persists:
     - `type`
     - `place_id`
     - `total_beds`

6. Deterministic hospitals surface guard:
   - `supabase/tests/scripts/assert_hospitals_surface_field_guard.js`
   - report:
     - `supabase/tests/validation/hospitals_surface_field_guard_report.json`
   - npm command:
     - `hardening:hospitals-surface-field-guard`
   - testing docs updated:
     - `supabase/docs/TESTING.md`

## Verification (This Run)
- `node supabase/tests/scripts/export_table_flow_trace.js --table hospitals`: PASS (2026-03-05)
- `npm run hardening:hospitals-surface-field-guard`: PASS (2026-03-05)
- `npm run build` (console frontend): PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
