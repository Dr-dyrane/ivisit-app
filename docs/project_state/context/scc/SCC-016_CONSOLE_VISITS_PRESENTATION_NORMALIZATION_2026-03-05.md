# SCC-016 Console Visits Presentation Normalization (2026-03-05)

## Objective
Normalize console visit presentation for emergency-linked rows so sparse `visits` fields do not render as `Unknown Facility`, stale `upcoming`, or generic type labels when linked emergency context already contains richer data.

## Scope
- `ivisit-console/frontend/src/components/pages/VisitsPage.jsx`
- `ivisit-console/frontend/src/components/views/VisitListView.jsx`
- `ivisit-console/frontend/src/components/mobile/MobileVisits.jsx`

## Implemented Changes
1. Visits page emergency-context enrichment
- Added linked context fetches for visible visit rows:
  - `emergency_requests` by `request_id`
  - `hospitals` by resolved hospital IDs
  - `doctors` for assigned doctor fallback naming
- Added normalization logic per visit row:
  - facility fallback: `visit.hospital_name -> emergency.hospital_name -> hospitals.name`
  - status fallback mapping (when visit status is sparse):
    - `pending_approval -> scheduled`
    - `payment_declined -> cancelled`
    - `in_progress/accepted/arrived -> in_progress`
    - `completed -> completed`
    - `cancelled -> cancelled`
  - type fallback: `visit.type/visit_type -> emergency.service_type`
  - doctor fallback: `visit.doctor_name -> emergency.assigned_doctor_id -> doctors.name`

2. List/mobile facility label fallback hardening
- Updated list/mobile views to prefer `hospital_name` before generic fallback labels.

## Why This Slice
- Console emergency table already carries facility/status truth for active requests.
- Visits table rows can lag or be sparse for some historical flows, causing misleading UI values.
- This slice improves operator UX without mutating historical DB rows.

## Verification
- `npm run build` in `ivisit-console/frontend`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` in `ivisit-app`: PASS (2026-03-05)

## Variance Note
- Implementation was started before this SCC row was added to the plan/tracker. It is documented here as a formalized exception and now tracked under SCC-016.
