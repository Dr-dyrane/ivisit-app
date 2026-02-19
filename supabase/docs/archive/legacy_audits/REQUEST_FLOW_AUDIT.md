# Emergency Request Flow Audit

## Visit Types
- Ambulance (serviceType: `ambulance`)
- Bed booking (serviceType: `bed`)

## Concurrency Rules
- Allowed: 1 active ambulance + 1 active bed booking at the same time.
- Not allowed: two active ambulances, or two active bed bookings.
- Enforcement:
  - Client-side guard in [useRequestFlow.js](../../../hooks/emergency/useRequestFlow.js)
  - Server-side guard via partial unique indexes in [20260111103000_emergency_lifecycle_and_concurrency.sql](../../../supabase/migrations/20260111103000_emergency_lifecycle_and_concurrency.sql)

## Request State Machine (DB: `emergency_requests.status`)
- `in_progress` → request created
- `accepted` → responder/booking confirmed
- `arrived` → arrival/occupied step completed
- `completed` → completed and ready for rating
- `cancelled` → cancelled by user

## Visit Lifecycle (DB: `visits.lifecycle_state`)
Common milestones used by the app:
- `initiated` → request initiated and visit created
- `confirmed` → request accepted/confirmed
- `monitoring` → active tracking/ongoing state
- `arrived` / `occupied` → arrival milestone depending on type
- `completed` → completed milestone
- `rating_pending` → completion finished, rating modal should be shown
- `rated` → rating submitted

## UI Contracts
- If a request is blocked due to concurrency, the request modal must not progress to “dispatched”.
- The active summary UI should not prevent initiating the other visit type.
  - Ambulance summary provides “Book Bed”
  - Bed summary provides “Request Ambulance”

