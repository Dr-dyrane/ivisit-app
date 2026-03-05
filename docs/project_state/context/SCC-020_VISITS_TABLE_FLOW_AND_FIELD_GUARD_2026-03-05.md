# SCC-020 Visits Table Flow + Field Guard (2026-03-05)

## Objective
Apply the same closure method used for `emergency_requests` to `visits`, with additional JS/JSX stale-field protection (destructure/property read drift).

## Implementation
1. Generated deterministic visits table flow artifacts:
   - `supabase/tests/validation/table_flow_trace_visits.json`
   - `supabase/tests/validation/table_flow_trace_visits.md`
2. Added stale-field guard script:
   - `supabase/tests/scripts/assert_visits_surface_field_guard.js`
   - output:
     - `supabase/tests/validation/visits_surface_field_guard_report.json`
3. Added hardening command:
   - `hardening:visits-surface-field-guard`
4. Patched visits JS/JSX stale-field usage in console runtime files:
   - `src/components/pages/VisitsPage.jsx`
   - `src/components/views/VisitListView.jsx`
   - `src/components/mobile/MobileVisits.jsx`
   - `src/services/visitsService.js`

## Trace Summary (`visits`)
- columns discovered: 21
- files touched: 69
- total references: 1446
- references by repo:
  - db: 220
  - app: 442
  - console: 784
- columns without observed usage: none

## High-Signal Fixes Applied
1. Removed stale `visit.doctor_id` reads from visits page/list logic.
2. Removed stale `patient_name` reliance in mobile visits search path.
3. Removed non-schema `summary`/`prescriptions` write attempts in `completeVisit`; completion details now fold into canonical `notes`.
4. Kept visits modal/table/page/service matrix parity green after patch.

## Verification
- `node supabase/tests/scripts/export_table_flow_trace.js --table visits`: PASS (2026-03-05)
- `npm run hardening:visits-surface-field-guard`: PASS (2026-03-05)
- `npm run hardening:console-ui-crud-matrix`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
