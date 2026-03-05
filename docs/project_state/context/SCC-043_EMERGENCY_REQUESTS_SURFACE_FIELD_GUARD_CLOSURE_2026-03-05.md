# SCC-043 Emergency Requests Surface Field Guard Closure (2026-03-05)

## Objective
Lock `emergency_requests` app/console surface contracts so canonical fields and relationship contracts are enforced, direct console table mutation is blocked, and legacy alias usage is contained to explicit compatibility boundaries.

## Scope
- Guard script and report lane:
  - `supabase/tests/scripts/assert_emergency_requests_surface_field_guard.js`
  - `supabase/tests/validation/emergency_requests_surface_field_guard_report.json`
- Console UI canonical read cleanup:
  - `../ivisit-console/frontend/src/components/modals/EmergencyDetailsModal.jsx`
  - `../ivisit-console/frontend/src/components/modals/HospitalModal.jsx`
- Command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- Plan/tracker governance:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Added deterministic `emergency_requests` surface guard enforcing:
   - app/console type parity (`Row`, `Insert`, `Update`)
   - relationship parity, including required FK names:
     - `emergency_requests_ambulance_id_fkey`
     - `emergency_requests_assigned_doctor_id_fkey`
     - `emergency_requests_hospital_id_fkey`
     - `emergency_requests_responder_id_fkey`
     - `emergency_requests_user_id_fkey`
   - canonical select-column usage in console `.from('emergency_requests').select(...)` queries
   - forbidden direct console `.insert/.update/.upsert/.delete` on `emergency_requests`
   - legacy alias containment for `payment_method_id`, `estimated_arrival`, `next_estimated_arrival`, `bed_type`
2. Removed residual UI alias fallbacks in:
   - `EmergencyDetailsModal` (`eta_display` and `bed_category` now canonical-only)
   - `HospitalModal` active reservation bed rendering (`bed_category` canonical-only)
3. Wired npm command:
   - `hardening:emergency-requests-surface-field-guard`
4. Added testing guide entry for the new guard command and contract intent.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table emergency_requests` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table emergency_requests` PASS (2026-03-05)
- `npm run hardening:emergency-requests-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`emergency_requests` now has the same preventive surface guard standard as other closed SCC table lanes, with deterministic failure on future type/query/mutation alias drift.
