# Emergency Workflow Map

This is the deterministic runtime map for ambulance and bed emergency flows.

## Canonical Lifecycle

`user action -> validation -> create_emergency_v4 -> automations/triggers -> realtime fan-out -> status mutations -> completion/audit`

## Entry Points

- `screens/EmergencyScreen.jsx`
- `screens/RequestAmbulanceScreen.jsx`
- `screens/BookBedRequestScreen.jsx`
- `components/emergency/EmergencyRequestModal.jsx`

## Client Execution Path

1. User selects hospital + service options in `EmergencyRequestModal`.
2. Request creation path:
   - `hooks/emergency/useRequestFlow.js` -> `useEmergencyRequests.createRequest`
   - `services/emergencyRequestsService.create`
   - RPC: `create_emergency_v4`
3. Active trip/booking state is hydrated and tracked in `contexts/EmergencyContext.jsx`.
4. User mutations (cancel, arrived/occupied, complete) path:
   - `hooks/emergency/useEmergencyHandlers.js` -> `setRequestStatus`
   - `services/emergencyRequestsService.setStatus/update`
   - RPC: `patient_update_emergency_request`

## Emergency Status State Machine

Allowed transitions are enforced by DB function `is_valid_emergency_status_transition` and trigger `trg_validate_emergency_status_transition`.

- `pending_approval` -> `in_progress` | `accepted` | `cancelled` | `payment_declined`
- `in_progress` -> `accepted` | `arrived` | `completed` | `cancelled` | `payment_declined`
- `accepted` -> `arrived` | `completed` | `cancelled`
- `arrived` -> `completed` | `cancelled`
- terminal: `completed`, `cancelled`, `payment_declined`

## Supabase Contracts

### Core RPCs

- `create_emergency_v4`
- `patient_update_emergency_request`
- `console_create_emergency_request`
- `console_update_emergency_request`
- `console_dispatch_emergency`
- `console_complete_emergency`
- `console_cancel_emergency`
- `console_update_responder_location`

### Tables

- `emergency_requests`
- `visits`
- `payments`
- `ambulances`
- `hospitals`
- `emergency_doctor_assignments`
- `doctors`
- `notifications`

## Trigger and Automation Chain

Defined in `20260219000900_automations.sql` and `20260219000800_emergency_logic.sql`:

- `on_emergency_start_dispatch` -> `auto_assign_driver`
- `on_emergency_status_resource_sync` -> `update_resource_availability`
- `on_emergency_completed` -> `sync_emergency_to_visit`
- `on_emergency_auto_assign_doctor` -> `auto_assign_doctor`
- `on_emergency_release_doctor` -> `release_doctor_assignment`
- `trg_validate_emergency_status_transition` -> `validate_emergency_status_transition`

## Realtime Propagation Map

- `contexts/EmergencyContext.jsx`
  - Channel `emergency_updates` on `emergency_requests` (`user_id` scoped)
- `services/emergencyRequestsService.js`
  - `emergency_<request>` on `emergency_requests`
  - `ambulance_location_<request>` on `ambulances`
  - `hospital_beds_<hospital>` on `hospitals`
- `components/emergency/EmergencyRequestModal.jsx`
  - `approval_<request>` on `emergency_requests`
  - `approval_payment_<payment>` on `payments`
  - Poll fallback every 3s to cover missed realtime events

## Role and Permission Surface

- Patient status/location mutations only via `patient_update_emergency_request`.
  - Enforces owner check (`user_id == auth.uid()`).
  - Rejects illegal transitions and invalid location payloads.
- Console responder and dispatcher actions must go through console RPCs.
- Cash approval/decline separated to org-admin path (`approve_cash_payment`, `decline_cash_payment`).

## Failure and Degraded Behavior

- Client guards prevent duplicate in-flight request creation (`useRequestFlow` inflight map).
- `emergencyRequestsService` supports local fallback only when unauthenticated.
- Approval waiting flow has realtime + polling fallback for resilience.
- Status guard trigger prevents ghost transitions even if client has stale UI state.

## Related Docs

- [ambulance_and_bed_booking.md](./ambulance_and_bed_booking.md)
- [../README.md](../README.md)
- [../../../supabase/docs/REFERENCE.md](../../../supabase/docs/REFERENCE.md)
- [../../../supabase/docs/API_REFERENCE.md](../../../supabase/docs/API_REFERENCE.md)
- [../../audit/deterministic_emergency_state_model_2026-03-02.json](../../audit/deterministic_emergency_state_model_2026-03-02.json)

