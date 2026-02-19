# Emergency Request Flow Audit & State Definition

> **Last Updated:** 2026-01-11  
> **Scope:** Production SOS emergency service flows (Ambulance + Bed)  
> **Goal:** Define closed-loop lifecycle states, concurrency rules, and stable state retrieval rules.

This document defines the **required lifecycle** for emergency visits and how it maps to the **data model** and **UI states**.

---

## Visit Types (Must Exist)

Emergency functionality must always produce visits with one of:
- `Ambulance Ride`
- `Bed Booking`

These are the canonical strings used by the current app visit type constants.

---

## Data Model (Single Source of Truth)

### `public.emergency_requests`
Represents the live service request the “dispatch system” would own.

- `service_type`: `ambulance | bed`
- `status`: `in_progress | accepted | arrived | completed | cancelled`

### `public.visits`
Represents the user-facing visit history row.

- `status`: `in_progress | completed | cancelled` (plus other non-emergency statuses used elsewhere)
- `lifecycle_state`: fine-grained emergency lifecycle state for closed-loop flow
- `rating` / `rating_comment` / `rated_at`: optional post-completion rating fields

### Server-Side Sync Rule
`public.visits` must stay consistent with `public.emergency_requests`. A trigger upserts the matching visit row on `emergency_requests` insert/update so:
- emergency request transitions are reflected in visit lifecycle consistently
- the UI can recover state after reload without relying on client-only memory

---

## Concurrency Rules (Hard Requirement)

The system must enforce:
- Max **1 active bed booking** per user
- Max **1 active ambulance request** per user
- Bed and ambulance can run in parallel (one of each)
- No duplicate active rows are allowed, even under double-tap or reconnect/retry conditions

Enforcement layers (from strongest to weakest):
1) Database partial unique indexes (authoritative)
2) Client concurrency guards (in-flight refs + active state checks)
3) UI gating (only show one active summary card per mode)

---

## Lifecycle States (Closed-Loop)

Emergency lifecycle states are stored in `public.visits.lifecycle_state`:
- `initiated`
- `confirmed`
- `monitoring`
- `arrived` (ambulance)
- `occupied` (bed)
- `completed`
- `post_completion`
- `rating_pending`
- `rated`
- `cleared`
- `cancelled`

### Ambulance Ride: State Machine

| Lifecycle | Trigger | `emergency_requests.status` | `visits.status` | UI Surface |
|---|---|---|---|---|
| initiated | User taps submit | in_progress | in_progress | Request modal “requesting” |
| confirmed | Dispatch/responder confirmed | accepted | in_progress | Request modal “dispatched” |
| monitoring | Tracking begins | accepted | in_progress | Trip summary card (ETA + en route states) |
| arrived | User marks arrived OR backend sets arrived | arrived | in_progress | Trip summary card shows arrival gate satisfied |
| completed | User completes | completed | completed | Visits history + post completion UX |
| rating_pending | Auto after completion | completed | completed | Prompt/notification to rate |
| rated | User submits rating | completed | completed | Rating summary |
| cleared | UI resets/animations cleared | completed | completed | SOS screen resets cleanly |
| cancelled | User cancels | cancelled | cancelled | Visits history cancelled |

### Bed Booking: State Machine

| Lifecycle | Trigger | `emergency_requests.status` | `visits.status` | UI Surface |
|---|---|---|---|---|
| initiated | User taps submit | in_progress | in_progress | Request modal “requesting” |
| confirmed | Reservation confirmed | accepted | in_progress | Request modal “reserved/confirmed” |
| monitoring | Waiting begins | accepted | in_progress | Bed summary card (“Reserved/Waiting”) |
| occupied | User marks occupied OR backend sets arrived (mapped) | arrived | in_progress | Bed summary card shows occupancy gate satisfied |
| completed | User completes | completed | completed | Visits history + post completion UX |
| rating_pending | Auto after completion | completed | completed | Prompt/notification to rate |
| rated | User submits rating | completed | completed | Rating summary |
| cleared | UI resets/animations cleared | completed | completed | SOS screen resets cleanly |
| cancelled | User cancels | cancelled | cancelled | Visits history cancelled |

---

## Stable Data Fetching & Side-Effect Rules

### State Retrieval Rules
1) Restore active ambulance and active bed independently (one per type).
2) Treat `emergency_requests` as the authoritative live status.
3) Treat `visits` as the authoritative user-history row and lifecycle state storage.

### Realtime Mapping Rules
- Realtime events must be normalized to match the app model (avoid mixing snake_case DB payloads directly into state).
- Avoid duplicate state sources that can desync (e.g., a local “status” that isn’t reconciled with realtime).

### Callback Stability Rules
- Lifecycle transitions must use stable callbacks (memoized hooks).
- Use memoized refs for “in-flight” gating (double taps / race prevention).
- Keep side effects isolated:
  - request lifecycle orchestration in the request flow hook
  - visit status/lifecycle updates in one transition path per action
  - UI only renders based on state, without writing state from render paths

---

## Parallel Visit Example (User Story)

Supported sequence:
1) User selects hospital
2) User books a bed → lifecycle reaches `monitoring`
3) User requests ambulance → lifecycle reaches `monitoring`
4) Ambulance arrives → user marks arrived → completes ambulance visit
5) User reaches hospital → bed becomes ready → user marks occupied → completes bed visit

Also supported independently:
- Ambulance-only
- Bed-only

---

## Code References (Implementation)

- SOS screen orchestration: `screens/EmergencyScreen.jsx`
- Request lifecycle hook: `hooks/emergency/useRequestFlow.js`
- Cancel/arrive/complete handlers: `hooks/emergency/useEmergencyHandlers.js`
- Active state + restore + realtime: `contexts/EmergencyContext.jsx`
- Visits fetch + realtime normalization: `hooks/visits/useVisitsData.js`
- Supabase schema & constraints: `supabase/migrations/*emergency_lifecycle_and_concurrency*.sql`

