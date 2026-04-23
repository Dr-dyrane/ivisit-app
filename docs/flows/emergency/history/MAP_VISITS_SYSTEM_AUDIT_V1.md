# Map Visits System Audit (v1)

> Status: Active audit and implementation blueprint
> Scope: `/map`, visit history, visit details, visit booking, emergency-to-visit lifecycle
> Owner pass: Pass 12 in [`MAP_RUNTIME_PASS_PLAN_V1.md`](../architecture/MAP_RUNTIME_PASS_PLAN_V1.md)

## 1. Purpose

This document defines how visits should actually live inside the new map-first product.

The problem is no longer technical capability. The app already has real visit data, realtime updates, booking, details, and emergency-linked lifecycle rows.

The problem is ownership and product shape:

- data truth is already real
- service side effects already exist
- legacy routes still own the user experience
- `/map` only has lightweight preview surfaces

The purpose of Pass 12 is to correct that ownership.

## 2. Locked Decisions

These decisions are now explicit:

- visits are no longer a legacy secondary product
- visits become a `/map`-owned history and care follow-up system
- emergency tracking and visits are two lenses over the same care lifecycle
- active emergency tracking remains the primary live owner
- visit history becomes the primary recall owner
- history uses Apple-style time grouping:
  - `Active now`
  - `Upcoming`
  - `Today`
  - `Yesterday`
  - `This week`
  - `Last week`
  - `This month`
  - `Last month`
  - `Older`
- Mini Profile must not say `Recent Visits` while showing a lifetime total
- if the badge is lifetime total, the row label is `History`
- choose-care remains a care-decision surface, not a history-management surface
- `Book a Visit` belongs in choose-care only after visit ownership is stable

## 3. Audit Inputs

Primary references audited:

- [`MAP_RUNTIME_PASS_PLAN_V1.md`](../architecture/MAP_RUNTIME_PASS_PLAN_V1.md)
- [`VISITS_REQUEST_HISTORY_PLAN.md`](./VISITS_REQUEST_HISTORY_PLAN.md)
- [`MAP_MINI_PROFILE_HANDOFF_V1.md`](../architecture/MAP_MINI_PROFILE_HANDOFF_V1.md)
- [`MASTER_REFERENCE_FLOW_V1.md`](../MASTER_REFERENCE_FLOW_V1.md)
- [`EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md`](../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [`WELCOME_AND_INTAKE_FLOW_MAP.md`](../WELCOME_AND_INTAKE_FLOW_MAP.md)
- [`ambulance_and_bed_booking.md`](../ambulance_and_bed_booking.md)
- [`EMERGENCY_INTEGRATION_AUDIT.md`](../../../archive/legacy_specs/EMERGENCY_INTEGRATION_AUDIT.md) (archived)

Primary runtime/code owners audited:

- [`screens/MapScreen.jsx`](../../../../screens/MapScreen.jsx)
- [`components/map/MapRecentVisitsModal.jsx`](../../../../components/map/MapRecentVisitsModal.jsx)
- [`components/map/MapCareHistoryModal.jsx`](../../../../components/map/MapCareHistoryModal.jsx)
- [`components/map/surfaces/MapModalShell.jsx`](../../../../components/map/surfaces/MapModalShell.jsx)
- [`components/emergency/MiniProfileModal.jsx`](../../../../components/emergency/MiniProfileModal.jsx)
- [`screens/VisitsScreen.jsx`](../../../../screens/VisitsScreen.jsx)
- [`screens/VisitDetailsScreen.jsx`](../../../../screens/VisitDetailsScreen.jsx)
- [`screens/BookVisitScreen.jsx`](../../../../screens/BookVisitScreen.jsx)
- [`hooks/visits/useBookVisit.js`](../../../../hooks/visits/useBookVisit.js)
- [`contexts/VisitsContext.jsx`](../../../../contexts/VisitsContext.jsx)
- [`hooks/visits/useVisitsData.js`](../../../../hooks/visits/useVisitsData.js)
- [`services/visitsService.js`](../../../../services/visitsService.js)

## 4. Product North Star

The correct product model is:

- the map shows where care happened, is happening, or will happen
- the sheet explains what that care event means
- the user does not mentally switch into a different product for history
- active care and past care feel like one continuous system

This means the right end state is not:

- a full-screen legacy visits page as the main owner
- a detached detail screen with no map
- a mini profile row that opens a route-owned archive first

The right end state is:

- `/map` owns the primary history experience
- `/map` owns the primary visit detail experience
- legacy routes become compatibility bridges only
- all important visit lifecycle truth comes from shared backend/service boundaries

## 5. Current Runtime Audit

## 5.1 What already works

The visit stack is not empty or fake. It already has working foundations.

Existing strengths:

- `visits` data is real
- `useVisitsData` fetches visits from Supabase
- `useVisitsData` subscribes to realtime updates on `public.visits`
- `visitsService` supports:
  - list
  - create
  - update
  - cancel
  - complete
  - delete
  - lifecycle updates
  - request id / display id resolution
  - emergency request hydration fallback
  - hospital hydration fallback
- emergency requests already project into `visits`
- rating recovery already depends on visit lifecycle truth
- visit booking already has a full wizard flow
- visit details already has meaningful actions like:
  - call clinic
  - book again
  - join video

This matters because Pass 12 is a migration and product correction, not a greenfield rebuild.

## 5.2 Current `/map` ownership

Current `/map` surfaces:

- `MiniProfileModal` links to visits
- `MapRecentVisitsModal` shows a lightweight recent list
- `MapCareHistoryModal` mixes care actions with recent visits
- `MapScreen` owns modal visibility for mini profile, care history, and recent visits

Current limitations:

- no canonical map-owned visit details modal exists yet
- no grouped history modal exists yet
- no selected visit state exists at the `MapScreen` layer
- no map-focused visit context exists for history items
- no single rule exists for what happens when the user taps an active emergency-derived visit row

## 5.3 Current legacy ownership

Legacy route owners are still primary for actual visit understanding:

- `VisitsScreen` owns the main list
- `VisitDetailsScreen` owns detail reading
- `BookVisitScreen` owns booking

These are still the operationally richer surfaces, but they are the wrong owners for the product direction.

## 5.4 Current data-state boundaries

Good boundaries already present:

- backend owns canonical visit rows
- `visitsService` owns DB mapping and side effects
- `useVisitsData` owns fetch and realtime synchronization
- `VisitsProvider` owns the shared in-memory visit collection

Weak boundaries:

- `VisitsContext` also owns legacy UI concerns:
  - `filter`
  - `selectedVisitId`
- current grouped history logic does not exist as a selector layer
- current `/map` preview surfaces still use slices like `visits.slice(0, 8)`
- route owners and map owners are both still valid entry points, so ownership is ambiguous

## 6. User Journey Audit

## 6.1 Welcome -> `/map` for first-time or guest user

User goal:

- open the app
- understand where they are
- decide what care they need

Visit implication:

- history is secondary here
- it should not dominate the map or block emergency intent
- empty history should remain calm and helpful, not noisy

Correct behavior:

- no legacy visits route should be required
- no `Recent Visits` row should imply activity the guest does not have
- if history is opened with no rows, the empty state should direct forward:
  - request ambulance
  - reserve bed
  - book a visit later when that flow is map-owned

## 6.2 Returning authenticated user with no active care

User goal:

- land on `/map`
- regain orientation quickly
- review recent care without leaving map context

Current drift:

- mini profile still uses `Recent Visits`
- the true visit owner is still the legacy list route

Correct behavior:

- Mini Profile row label should be `History`
- tapping it should open a map-owned history surface first
- that history surface should show:
  - recent activity
  - grouped buckets
  - clear row-level next actions

## 6.3 Returning user with active emergency request

User goal:

- resume live care immediately
- not get trapped in a passive history experience

Product rule:

- active emergency tracking is primary
- history is secondary context

Correct behavior:

- history should still show the event under `Active now`
- selecting that row should hand off into tracking, not a static visit card
- the history row should behave like a resume affordance, not a duplicate tracking UI

## 6.4 User with an upcoming scheduled visit

User goal:

- confirm where the visit is
- understand when it is
- contact the facility or reschedule/rebook if needed

Correct map-native behavior:

- opening the visit locks the map to the hospital or facility
- the mid snap sheet explains:
  - hospital
  - visit type
  - scheduled time
  - current status
- expanded state reveals:
  - provider details
  - preparation
  - payment summary when relevant
  - contact actions

The current full-screen details page loses that spatial continuity.

## 6.5 User who just completed an emergency or visit

User goal:

- rate if required
- see the event transition into history
- understand that the session ended cleanly

Correct behavior:

- rating recovery stays primary until resolved
- after resolution, the item appears in `Today`
- the user can inspect the completed event inside map-owned history without jumping into legacy visits

## 6.6 User browsing older history

User goal:

- recognize care events quickly
- find the right one without scanning a giant undifferentiated list

Correct behavior:

- history is grouped by time buckets
- active and upcoming are separated from past care
- old items remain reachable without turning the UI into a database table

## 7. Legacy Capability Audit

The correct migration standard is explicit parity, not assumption.

| Capability | Current state | Classification | Notes |
| --- | --- | --- | --- |
| Visit list from Supabase | Present in `useVisitsData` | preserved | Shared runtime truth already exists. |
| Realtime visit updates | Present in `useVisitsData` | preserved | Must remain single-subscription. |
| Visit filters/counts | Present in `VisitsContext` | partially implemented | Works for legacy list, but not enough for grouped history. |
| Pull to refresh | Present in `VisitsScreen` | preserved | Still needed in history owner, but style may change. |
| Visit details view | Present in `VisitDetailsScreen` | partially implemented | Actions exist, but owner is wrong and cancel is incomplete. |
| Call clinic | Present in `VisitDetailsScreen` | preserved | Must move into map-owned detail owner. |
| Book again | Present in `VisitDetailsScreen` | preserved | Must move into map-owned detail owner. |
| Telehealth join | Present in `VisitDetailsScreen` | preserved | Must move into map-owned detail owner when relevant. |
| Preparation guidance | Present in `VisitDetailsScreen` | preserved | Must survive migration. |
| Cancel visit | Incomplete in `VisitDetailsScreen` | missing | Currently just an alert, not a completed flow. |
| Visit booking wizard | Present in `BookVisitScreen` + `useBookVisit` | preserved | Good logic, wrong owner. |
| Emergency-to-visit lifecycle link | Present in DB + service layer | preserved | Must stay the single truth. |
| Rating recovery | Present in tracking runtime | preserved | Must integrate with history state transitions. |
| Request/display-id matching | Present in service layer | preserved | Important for recovery and compatibility routes. |
| Map-owned history | Preview only | missing | `MapRecentVisitsModal` is not the final owner. |
| Map-owned visit details | Absent | missing | Primary Pass 12 delivery. |
| Active-emergency row handoff | Not explicit | missing | Needs a deterministic contract. |
| Apple-style grouped history | Absent | missing | Needs selectors and presentation rules. |
| Contextual history inside explore | Preview only | partially implemented | Current care modal mixing is the wrong surface. |

## 8. Drift Sources

The main drift sources are now clear.

### A. Ownership drift

The app has both legacy visit owners and map preview owners. That splits mental ownership and implementation ownership.

### B. Naming drift

Mini Profile still says `Recent Visits` while the badge source is a lifetime count.

### C. Grouping drift

Legacy filters are status-only. The map-first system needs time-grouped reading plus `Active now` and `Upcoming`.

### D. Surface drift

`MapCareHistoryModal` mixes care decision and history preview in one surface, which weakens both jobs.

### E. Modal-shell drift

`MapModalShell` currently assumes centered-title chrome. Choose-care and future history/details need more explicit header layout control.

### F. Detail drift

`VisitDetailsScreen` is route-first, visually disconnected from the map, and its cancel affordance is not fully wired.

### G. Booking drift

Booking logic is useful, but the full-screen wizard ownership conflicts with the map-first doctrine.

## 9. Emergency And Visits Relationship

This relationship must be treated as a product rule, not an implementation accident.

## 9.1 Domain truth

`emergency_requests` is the live operational truth.

`visits` is the patient-facing lifecycle and recall projection.

That split is correct.

## 9.2 Product rule

Emergency and visits are not separate experiences.

They are two lenses over the same care event:

- tracking = live lens
- history = recall lens

## 9.3 Row behavior by lifecycle

Emergency-derived rows must behave according to state:

- active / en route / arrived
  - group: `Active now`
  - primary action: `Resume tracking`
- pending payment or pending approval
  - group: `Active now` or `Upcoming` depending on operational truth
  - primary action: `Resume request`
- rating pending
  - primary action: `Rate visit`
  - route into the canonical rating recovery path
- completed
  - group by time bucket
  - primary action: `View details`
- cancelled / failed / expired
  - group by time bucket
  - primary action: `View details`

## 10. Target UX Model

## 10.1 Mini Profile

Mini Profile should expose:

- `History` with a lifetime count

Not:

- `Recent Visits` with a lifetime count

If product later wants a rolling-window label like `Recent Activity`, the badge must match that same window. Until then, `History` is the stable truthful label.

## 10.2 History entry surface

The first map-owned history surface should be a lightweight but real history browser.

### Mid snap

Show:

- `Active now`
- `Upcoming`
- the first one or two recent past rows
- a single clear expansion affordance

### Expanded

Show:

- grouped history buckets
- stable row layout
- low-noise status chips
- no giant legacy card chrome

The map remains visible behind the sheet.

## 10.3 Map-owned visit details

This is the main upgrade over legacy.

### Mid snap behavior

Map:

- lock to the visit hospital or facility
- for past or upcoming visits, use a calm static facility framing
- for active emergency-derived rows, hand off to tracking instead of duplicating route UI

Sheet:

- hospital or facility
- visit type
- status
- date/time
- one obvious primary action

### Expanded behavior

Show:

- lifecycle summary or timeline
- provider and facility details
- payment summary when relevant
- low-priority metadata:
  - request id
  - visit id
  - display id
- secondary actions:
  - call clinic
  - book again
  - join video when valid
  - directions / focus map
  - cancel only when actually valid

## 10.4 Explore-intent contextual history

History can appear contextually in `/map`, but it must stay subordinate to the current decision.

Correct places:

- Mini Profile -> History
- dedicated map-owned history modal
- optional contextual recent-history strip inside explore intent after hospital/care context exists

Wrong place:

- the primary care-decision modal itself

## 10.5 Choose-care

Choose-care should remain a care-decision surface.

Header contract:

- left-aligned `Choose care`
- right-aligned close

Body order once visit migration is stable:

1. Ambulance
2. Bed space
3. Ambulance + bed
4. Book a Visit

History preview should not dominate this modal.

## 11. Architecture And State Ownership

## 11.1 Canonical owners

Target owners:

- `MapHistoryModal`
  - grouped browsing
  - recent and full history states
- `MapVisitDetailsModal`
  - canonical visit detail owner
- `MapVisitBookingFlow`
  - canonical booking owner

Legacy routes become:

- compatibility wrappers only

## 11.2 Shared state ownership

Backend owns:

- visit rows
- emergency-to-visit synchronization
- lifecycle state
- request linkage
- timestamps
- rating and tip state

`visitsService` owns:

- DB mapping
- request/display-id resolution
- CRUD side effects

`useVisitsData` owns:

- fetch
- realtime subscription
- in-memory synchronization

`VisitsProvider` should own:

- the canonical shared visit collection

`VisitsProvider` should stop owning:

- list-screen-only filter state
- list-screen-only selected row state

Map runtime should own:

- history modal visibility
- selected history item id
- selected detail item id
- details snap state
- map focus mode for selected history item
- booking flow visibility and step state

Presentational components should own:

- no business truth
- only local animation and interaction state

## 11.3 Required selector layer

Pass 12 needs a selector layer instead of ad hoc slices:

- `selectActiveHistoryItems`
- `selectUpcomingHistoryItems`
- `selectGroupedHistoryBuckets`
- `selectRecentHistoryPreview`
- `selectHistoryCount`
- `selectHistoryBadgeCount`
- `resolveHistoryPrimaryAction`

These selectors should become the single grouping and behavior source.

## 12. Platform And Viewport Contract

Visits must follow the same platform doctrine as the rest of `/map`.

### iOS / Android

- bottom sheet or native-feeling modal
- mid and expanded snap states
- map remains visible
- every row and CTA shows immediate pressed feedback

### Web mobile

- same semantic model as native mobile
- bottom sheet or full-height modal depending on viewport
- no fake desktop table inside a phone-width shell

### Web desktop

- right drawer or centered panel as allowed by the shell
- map remains dominant
- the history surface still feels subordinate to the map

### Viewport rules

All new visit surfaces must consume shared `/map` viewport contracts:

- shared shell metrics
- shared safe-area / browser inset logic
- shared max-width and side-drawer rules
- shared control-offset discipline so map chrome never collides with panels

No ad hoc dimensions.

## 13. Memory Management, Cleanup, And Performance

## 13.1 What must remain true

- one canonical visit collection in memory
- one realtime subscription boundary
- no duplicate history fetches per modal
- no per-surface local copies of the visit list
- no detached map focus override after a detail surface closes

## 13.2 Required cleanup rules

- closing history clears selected history row state
- closing visit details clears map focus override
- handing off an active history row into tracking clears history selection
- closing booking clears transient draft state unless draft persistence is explicitly product-owned later
- no history browsing surface should introduce autonomous polling or timer loops

## 13.3 Deterministic invariants

These invariants must remain true:

1. one persisted care event maps to one canonical history row
2. active events can appear in history and tracking without duplicating control ownership
3. terminal status is backend-derived, not guessed in UI
4. the map stays the spatial anchor for history details
5. mini profile naming stays consistent with badge semantics
6. history grouping comes from one selector layer, not many local calculations
7. legacy routes do not become primary owners again once map-owned owners exist

## 14. Deterministic Pass 12 Implementation Plan

## 12A. Lock naming and ownership contracts

Deliver:

- Mini Profile semantic change to `History`
- explicit compatibility rule for legacy visits screens
- explicit rule that choose-care is not a history owner

Done when:

- naming no longer contradicts the data being shown

## 12B. Extract history selectors from legacy screen assumptions

Deliver:

- selector layer for active, upcoming, grouped history, and badge counts
- remove list-screen-only grouping assumptions from the provider layer

Done when:

- all history surfaces derive from one grouping contract

## 12C. Replace map recents preview with canonical history entry

Deliver:

- grouped map-owned history modal
- active and upcoming rows
- Apple-style time buckets for past rows

Done when:

- `/map` has a real history owner instead of a slice-of-array preview

## 12D. Build canonical map-owned visit details

Deliver:

- `MapVisitDetailsModal`
- mid snap and expanded states
- facility-focused map behavior
- explicit active-emergency handoff to tracking

Done when:

- a visit can be understood spatially without leaving `/map`

## 12E. Move booking ownership into `/map`

Deliver:

- map-owned booking flow using current service logic
- reuse existing booking logic before redesigning it
- keep route bridge compatibility while map owner is proving out

Done when:

- `Book a Visit` no longer depends on a legacy full-screen owner

## 12F. Bridge and de-primary legacy visit routes

Deliver:

- compatibility routes that hand off into the canonical map-owned owners
- no broken external or internal deep links

Done when:

- legacy routes still work but no longer own the primary experience

## 12G. Platform and viewport propagation

Deliver:

- same history semantics across iOS, Android, web mobile, and web desktop
- panel/sheet adaptation through shared `/map` viewport rules
- no layout-only forks that change meaning

Done when:

- hierarchy, actions, and meaning remain identical across platforms

## 15. Final Product Decision

The correct direction is:

- yes, history should use Apple-style time grouping
- yes, Mini Profile should stop saying `Recent Visits` while showing total lifetime count
- yes, visit history should be redesigned to match the `/map` flow completely
- yes, visit details should become a map-owned mid-snap and expanded-sheet experience
- yes, emergency tracking and visits should be treated as one lifecycle system with two user lenses
- yes, legacy visit screens should become compatibility bridges and then be retired once map-owned owners are proven

This is not a polish pass.

It is a product migration, ownership correction, and UI-system alignment pass.
