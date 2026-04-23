# Visits / Request History Plan

> Status: Active supporting contract for Pass 12
> Scope: RN `ivisit-app` visits data model, grouping contract, and `/map` migration support

## 1. Purpose

This document defines the deterministic data and selector contract for visits once history becomes map-owned.

It complements [`MAP_VISITS_SYSTEM_AUDIT_V1.md`](./MAP_VISITS_SYSTEM_AUDIT_V1.md):

- the audit doc explains product ownership, UX, and migration order
- this doc defines the shared history model, grouping model, and state boundaries that support that UX

## 2. Current RN Reality

This repo already has real visit/runtime infrastructure.

Current runtime owners:

- route compatibility list:
  - [`screens/VisitsScreen.jsx`](../../../../screens/VisitsScreen.jsx)
- route compatibility details:
  - [`screens/VisitDetailsScreen.jsx`](../../../../screens/VisitDetailsScreen.jsx)
- route compatibility booking:
  - [`screens/BookVisitScreen.jsx`](../../../../screens/BookVisitScreen.jsx)
- shared visit provider:
  - [`contexts/VisitsContext.jsx`](../../../../contexts/VisitsContext.jsx)
- shared data hook:
  - [`hooks/visits/useVisitsData.js`](../../../../hooks/visits/useVisitsData.js)
- shared service/data mapper:
  - [`services/visitsService.js`](../../../../services/visitsService.js)
- current `/map` preview surfaces:
  - [`components/map/MapRecentVisitsModal.jsx`](../../../../components/map/MapRecentVisitsModal.jsx)
  - [`components/map/MapCareHistoryModal.jsx`](../../../../components/map/MapCareHistoryModal.jsx)

Backend-linked truth already exists:

- `public.visits`
- `public.emergency_requests`
- emergency-to-visit projection and lifecycle updates

This means the problem is not missing data truth. The problem is the shape and ownership of the history experience.

## 3. Canonical Domain Decision

System concept:

- `request history`

User-facing continuity:

- route compatibility can stay under `/visits`
- Mini Profile row label becomes `History`

Reason:

- not every care event is a classic doctor visit
- ambulance and bed events still belong in the patient's care history
- future appointment flows should join the same lifecycle system instead of creating a third archive model

## 4. Source Of Truth

The source of truth must remain backend-derived.

Do not create:

- a second history table
- a frontend-only history cache
- a separate `/map` visit collection

Correct source layering:

1. backend tables own canonical rows
2. `visitsService` maps backend rows into app-level visit objects
3. `useVisitsData` owns fetch and realtime synchronization
4. selector layer derives grouped history behavior for `/map`

## 5. Canonical History Item Contract

Every row rendered in map-owned history should normalize into this shape:

```ts
type RequestHistoryItem = {
  id: string;
  requestId: string | null;
  displayId: string | null;
  requestType: "ambulance" | "bed" | "visit";
  sourceKind: "emergency" | "scheduled_visit";
  status:
    | "pending"
    | "confirmed"
    | "active"
    | "completed"
    | "cancelled"
    | "failed"
    | "expired"
    | "rating_pending";
  title: string;
  subtitle: string | null;
  facilityName: string | null;
  facilityAddress: string | null;
  facilityCoordinate: { latitude: number; longitude: number } | null;
  heroImageUrl: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  terminalAt: string | null;
  paymentSummary: string | null;
  canResume: boolean;
  canViewDetails: boolean;
  canRate: boolean;
  canCancel: boolean;
  canBookAgain: boolean;
  primaryAction:
    | "resume_tracking"
    | "resume_request"
    | "view_details"
    | "rate_visit"
    | "book_again"
    | null;
  sortTimestamp: string;
  groupKey: RequestHistoryGroupKey;
};
```

## 6. Grouping Contract

Grouping keys are locked:

```ts
type RequestHistoryGroupKey =
  | "active_now"
  | "upcoming"
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "older";
```

Grouping rules:

- use the user's local timezone
- active items do not fall through into past time buckets
- upcoming items do not mix with active items
- completed/cancelled/failed/expired rows are grouped by their terminal timestamp
- scheduled non-terminal future visits are grouped under `upcoming`
- fallback timestamp order must be deterministic

Recommended timestamp precedence:

- active emergency = active lifecycle timestamp or last meaningful update
- upcoming scheduled visit = `scheduledFor`
- completed = `completedAt`
- cancelled / failed / expired = `terminalAt`
- fallback = `createdAt`

## 7. Status Mapping Contract

The UI must not guess status independently in multiple places.

One mapper layer owns translation.

### Ambulance

- pending approval -> `pending`
- accepted / dispatched / en route / arrived -> `active`
- completion awaiting rating -> `rating_pending`
- complete -> `completed`
- cancelled -> `cancelled`
- rejected / fulfillment failed -> `failed`

### Bed

- pending approval -> `pending`
- reserved -> `confirmed`
- active reservation window -> `active`
- admitted / completed -> `completed`
- cancelled -> `cancelled`
- expired reservation window -> `expired`

### Scheduled visit

- upcoming -> `confirmed`
- in progress -> `active`
- completed -> `completed`
- cancelled -> `cancelled`

## 8. Mini Profile Contract

Mini Profile must not show:

- `Recent Visits` with a lifetime count

Allowed truthful variants:

- `History` + lifetime count
- `Recent Activity` + rolling-window count

Locked recommendation for Pass 12:

- use `History`
- badge source = total canonical history count

## 9. Selector Layer Contract

Pass 12 should add a dedicated selector layer, for example:

- `selectHistoryCount(visits)`
- `selectHistoryBadgeCount(visits)`
- `selectRecentHistoryPreview(visits, limit)`
- `selectActiveHistoryItems(visits)`
- `selectUpcomingHistoryItems(visits)`
- `selectGroupedHistoryBuckets(visits, now, timezone)`
- `selectHistoryItemByAnyKey(visits, key)`
- `resolveHistoryPrimaryAction(item, activeRequestState)`

Rules:

- selectors are pure
- selectors derive from one canonical visit collection
- selectors do not mutate or cache business truth locally

## 10. State Ownership

Backend owns:

- canonical lifecycle truth
- timestamps
- linkage between `emergency_requests` and `visits`
- payment-linked truth

`visitsService` owns:

- DB mapping
- request/display-id resolution
- CRUD side effects
- hospital hydration fallback

`useVisitsData` owns:

- fetching
- realtime subscription
- collection synchronization

`VisitsProvider` should own:

- shared visit collection

`VisitsProvider` should not remain the long-term owner of:

- list-screen-only filter state
- list-screen-only selected row state

`/map` runtime should own:

- history modal visibility
- selected history row id
- selected details row id
- detail snap state
- map focus override for selected item
- booking flow presentation state

## 11. Legacy Side Effects That Must Survive

These behaviors are already present and must survive migration:

- list visits from Supabase
- realtime updates from the `visits` channel
- pull-to-refresh
- create visit
- update visit
- cancel visit
- complete visit
- delete visit
- request-id/display-id resolution
- emergency request fallback hydration
- hospital hydration fallback
- call clinic
- book again
- telehealth join
- preparation guidance
- rating recovery linkage for emergency-derived visits

Known weak point to fix during migration:

- current `VisitDetailsScreen` cancel affordance is only an alert, not a full cancel flow

## 12. Route Compatibility Contract

Legacy visit routes stay alive during migration, but they stop being primary owners.

Compatibility rule:

- route entry is still allowed
- route owner should hand off into canonical map-owned visit history or details when safe
- route should not maintain divergent business logic

Final target:

- legacy routes become wrappers or bridges only

## 13. Failure And Null Handling

The history system must degrade gracefully.

Rules:

- missing facility name -> `Care request`
- missing facility image -> stable app-owned fallback art
- missing provider -> omit provider row
- missing payment summary -> omit payment row
- missing coordinates -> do not break the details sheet; fall back to list/detail-only mode
- missing request linkage -> still resolve by visit id when possible
- rating-pending emergency row must not silently vanish

## 14. Module Boundary Direction

Recommended future boundaries:

- `hooks/visits/useVisitHistorySelectors.js`
- `components/map/history/MapHistoryModal.jsx`
- `components/map/history/MapHistoryList.jsx`
- `components/map/history/MapHistoryGroup.jsx`
- `components/map/history/MapHistoryRow.jsx`
- `components/map/history/MapVisitDetailsModal.jsx`
- `components/map/history/MapVisitDetailsMidSnap.jsx`
- `components/map/history/MapVisitDetailsExpanded.jsx`
- `components/map/history/MapVisitBookingFlow.jsx`
- `components/map/history/history.presentation.js`
- `components/map/history/history.theme.js`
- `components/map/history/history.actions.js`

These should reuse the existing service/provider truth instead of replacing it.

## 15. Deterministic Build Order

1. lock naming and selector contracts
2. extract grouped-history selectors
3. replace recents preview with canonical map-owned history modal
4. build map-owned visit details
5. migrate booking into map-owned flow
6. bridge legacy routes
7. harden across platforms and viewport variants

## 16. Final Decision

The deterministic answer is:

- one canonical visit collection
- one selector layer for history semantics
- one map-owned history owner
- one map-owned details owner
- one compatibility bridge story for legacy routes
- Mini Profile uses `History` when showing total count
- emergency and visits remain one lifecycle system with different user lenses
