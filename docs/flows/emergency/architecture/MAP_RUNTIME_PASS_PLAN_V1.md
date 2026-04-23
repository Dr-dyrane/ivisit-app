# Map Runtime Pass Plan (v1)

> Status: Active execution plan
> Scope: `/map`
> Purpose: define the next implementation passes in order, with a target for each pass and a clear stop condition before the next pass begins

Related audit:

- [MAP_FLOW_SURGICAL_AUDIT_V1.md](./MAP_FLOW_SURGICAL_AUDIT_V1.md)

## Execution Status

- Pass 1: complete
- Pass 2: complete
- Pass 3: complete
- Pass 4: complete
- Pass 5: complete
- Pass 6: complete
- Pass 7: complete
- Pass 8: complete
- Pass 9: complete
- Pass 10: complete
- Pass 11: complete
- Pass 12: pending
- Pass 13: pending
- Pass 14: pending
- Pass 15: pending

## Unified Surgical Mapping

This document is the canonical execution plan.

[`MAP_FLOW_SURGICAL_AUDIT_V1.md`](./MAP_FLOW_SURGICAL_AUDIT_V1.md) defines the audit requirements. Its Pass A-F list is now folded into this runtime plan so there is one pass order, one stop condition, and one place to update execution status.

| Surgical audit pass | Runtime plan owner | Current status | Notes |
| --- | --- | --- | --- |
| Pass A: contracts and reducer guardrails | Pass 1 plus guardrail addendum | complete | Runtime slices/selectors/transitions were already extracted; sheet phase/snap/payload contracts were added after the surgical audit. |
| Pass B: normalized request model | Pass 4 first remaining slice | complete | Header, tracking sheet, map marker, completion gates, and recovery now read a normalized active request model instead of deriving request truth independently. |
| Pass C: commit transaction model | Pass 3 structurally, Pass 4 behaviorally | complete for ambulance-only | Commit stages now have controller boundaries and explicit ambulance payment/dispatch/rating transaction contracts; bed and combined follow-ons are deferred to later parity passes. |
| Pass D: bed parity | Pass 6 and Pass 7 | not started | Bed-only parity is Pass 6; combined ambulance + bed parity is Pass 7. |
| Pass E: persistence and recovery | Pass 4, Pass 6, and Pass 8 | partially complete | Ambulance reload/rating/route recovery belongs to Pass 4; bed hold/countdown recovery belongs to Pass 6; cross-device web persistence belongs to Pass 8. |
| Pass F: failure UX and device matrix | Pass 5 and Pass 8 | in progress | iOS ambulance failure tone/UI signoff is Pass 5; Android/web/tablet/wide-screen validation is Pass 8. |

Unified remaining order:

1. Finish Pass 4A: normalized active request model.
2. Finish Pass 4B: commit transaction behavior and ambulance completion/recovery signoff.
3. Run Pass 5: ambulance UI/failure-tone signoff on iOS mobile.
4. Run Pass 6: bed-only parity.
5. Run Pass 7: combined ambulance + bed parity.
6. Run Pass 8: cross-device inclusiveness and web resume/recovery.
7. Run Pass 9: post-signoff enhancements such as tokenized live Share ETA.

### Pass 1 Output

Pass 1 landed the runtime-boundary cleanup needed before deeper module extraction:

- added runtime slice helpers in [`hooks/map/state/mapExploreFlow.runtime.js`](../../../hooks/map/state/mapExploreFlow.runtime.js)
- added store selectors in [`hooks/map/state/mapExploreFlow.selectors.js`](../../../hooks/map/state/mapExploreFlow.selectors.js)
- extended the reducer-backed store in [`hooks/map/state/mapExploreFlow.store.js`](../../../hooks/map/state/mapExploreFlow.store.js) with named `runtime` subdomains and runtime actions
- extracted pure sheet/commit transition builders into [`hooks/map/exploreFlow/mapExploreFlow.transitions.js`](../../../hooks/map/exploreFlow/mapExploreFlow.transitions.js)
- rewired [`hooks/map/exploreFlow/useMapExploreFlow.js`](../../../hooks/map/exploreFlow/useMapExploreFlow.js) to use selectors and transition builders instead of inline raw `setSheetView({ ... })` payload construction

Result:

- `/map` now has an explicit runtime branch in the reducer store
- top-level sheet/search/surface/runtime reads in `useMapExploreFlow` are selector-driven
- sheet transitions and commit payload shaping have named pure builders
- repeated hospital resolution/promotion logic is centralized enough for Pass 2 extraction

### Pass 2 Output

Pass 2 finished the tracking extraction needed before commit-phase work:

- tracking presentation helpers moved into [`components/map/views/tracking/mapTracking.presentation.js`](../../../components/map/views/tracking/mapTracking.presentation.js)
- tracking action/detail derivation moved into [`components/map/views/tracking/mapTracking.model.js`](../../../components/map/views/tracking/mapTracking.model.js)
- tracking pure view-state derivation moved into [`components/map/views/tracking/mapTracking.derived.js`](../../../components/map/views/tracking/mapTracking.derived.js)
- tracking share payload shaping moved into [`components/map/views/tracking/mapTracking.share.js`](../../../components/map/views/tracking/mapTracking.share.js)
- tracking rating payload shaping moved into [`components/map/views/tracking/mapTracking.rating.js`](../../../components/map/views/tracking/mapTracking.rating.js)
- tracking operational controller state moved into [`components/map/views/tracking/useMapTrackingController.js`](../../../components/map/views/tracking/useMapTrackingController.js)
- tracking runtime state moved into [`components/map/views/tracking/useMapTrackingRuntime.js`](../../../components/map/views/tracking/useMapTrackingRuntime.js)
- tracking theme/token shaping moved into [`components/map/views/tracking/mapTracking.theme.js`](../../../components/map/views/tracking/mapTracking.theme.js)
- reusable tracking parts moved into [`components/map/views/tracking/parts/MapTrackingParts.jsx`](../../../components/map/views/tracking/parts/MapTrackingParts.jsx)
- [`components/map/views/tracking/MapTrackingStageBase.jsx`](../../../components/map/views/tracking/MapTrackingStageBase.jsx) now depends on imported parts/presentation helpers instead of owning those concerns inline

Result:

- `MapTrackingStageBase.jsx` is now mostly render composition and sheet wiring
- tracking visual parts now have a dedicated extraction boundary
- tracking CTA derivation, destructive action shaping, detail row shaping, and header-action resolution are no longer inline in the stage file
- tracking share/rating/busy-action/header-action lifecycle is no longer inline in the stage file
- hospital/service/status display shaping is now pure derived data instead of mixed into render assembly
- triage runtime/progress and trip clock state no longer live in the stage file
- route/theme token shaping no longer lives inline in the stage file

### Pass 3 Current Slice

Pass 3 is starting with `COMMIT_PAYMENT`, because it is the riskiest stateful handoff left in the ambulance-only path.

First target inside Pass 3:

- extract payment-method hydration/selection state
- extract cost loading and normalization state
- extract submit/finalization controller logic
- leave [`components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`](../../../components/map/views/commitPayment/MapCommitPaymentStageBase.jsx) render-led instead of controller-led

Current output:

- payment runtime/controller state moved into [`components/map/views/commitPayment/useMapCommitPaymentController.js`](../../../components/map/views/commitPayment/useMapCommitPaymentController.js)
- payment presentation helpers moved into [`components/map/views/commitPayment/mapCommitPayment.presentation.js`](../../../components/map/views/commitPayment/mapCommitPayment.presentation.js)
- payment theme/token shaping moved into [`components/map/views/commitPayment/mapCommitPayment.theme.js`](../../../components/map/views/commitPayment/mapCommitPayment.theme.js)
- [`components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`](../../../components/map/views/commitPayment/MapCommitPaymentStageBase.jsx) no longer imports auth/preferences/visits/emergency request hooks, payment services, pricing services, or request-flow services directly
- triage runtime/controller state moved into [`components/map/views/commitTriage/useMapCommitTriageController.js`](../../../components/map/views/commitTriage/useMapCommitTriageController.js)
- triage theme/token shaping moved into [`components/map/views/commitTriage/mapCommitTriage.theme.js`](../../../components/map/views/commitTriage/mapCommitTriage.theme.js)
- reusable triage visual parts moved into [`components/map/views/commitTriage/MapCommitTriageStageParts.jsx`](../../../components/map/views/commitTriage/MapCommitTriageStageParts.jsx)
- [`components/map/views/commitTriage/MapCommitTriageStageBase.jsx`](../../../components/map/views/commitTriage/MapCommitTriageStageBase.jsx) no longer imports emergency context hooks, live triage services, haptics, or animation orchestration directly
- commit-details runtime/controller state moved into [`components/map/views/commitDetails/useMapCommitDetailsController.js`](../../../components/map/views/commitDetails/useMapCommitDetailsController.js)
- commit-details theme/token shaping moved into [`components/map/views/commitDetails/mapCommitDetails.theme.js`](../../../components/map/views/commitDetails/mapCommitDetails.theme.js)
- [`components/map/views/commitDetails/MapCommitDetailsStageBase.jsx`](../../../components/map/views/commitDetails/MapCommitDetailsStageBase.jsx) no longer imports auth/emergency context hooks, auth services, contact memory services, validators, or OTP/persistence orchestration directly

Current effect:

- `MapCommitPaymentStageBase.jsx` dropped from `1343` lines to `558`
- payment-method hydration no longer lives inline in the stage file
- cost loading and normalization no longer live inline in the stage file
- payment submission/finalization flow no longer lives inline in the stage file
- payment stage is now primarily sheet wiring, payment-specific presentation, and body composition
- `MapCommitTriageStageBase.jsx` dropped from `844` lines to `226`
- triage session reset, live-save, commit-flow persistence, copilot prompt lookup, and step handlers no longer live inline in the stage file
- triage hero, option grid, and text-step rendering now have a stable visual extraction boundary
- `MapCommitDetailsStageBase.jsx` dropped from `773` lines to `190`
- OTP request/verify flow, phone validation, auth reconciliation, contact-memory hydration, and commit-flow persistence no longer live inline in the stage file
- commit details stage is now shell wiring plus question-card composition

Next Pass 3 slice:

- Pass 3 exit criteria met for the ambulance commit path:
  - `COMMIT_PAYMENT` has controller/presentation/theme boundaries
  - `COMMIT_TRIAGE` has controller/theme/parts boundaries
  - `COMMIT_DETAILS` has controller/theme boundaries
- defer any extra `COMMIT_PAYMENT` micro-extractions unless a later pass exposes a concrete pain point
- move to Pass 4: ambulance functional signoff

## Why This Exists

The current `/map` runtime is no longer at the stage where ad hoc polish is safe.

The current pressure points are already too large:

- `hooks/map/exploreFlow/useMapExploreFlow.js`
- `components/map/views/tracking/MapTrackingStageBase.jsx`
- `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`
- `components/map/views/commitTriage/MapCommitTriageStageBase.jsx`
- `components/map/views/commitDetails/MapCommitDetailsStageBase.jsx`
- `screens/MapScreen.jsx`

We already have a reducer-backed store boundary in [`hooks/map/state/mapExploreFlow.store.js`](../../../hooks/map/state/mapExploreFlow.store.js).

So the next move is not another UI-only sprint and not a premature Zustand rewrite.

The next move is to modularize the runtime around the existing state boundary, then finish one vertical slice properly.

## Current Truth

Current supported vertical slice:

- `ambulance` request flow only
- current active runtime passes through:
  - `COMMIT_DETAILS`
  - `COMMIT_PAYMENT`
  - `COMMIT_TRIAGE`
  - `TRACKING`
- current lived-in device is `ios-mobile`

Not signed off yet:

- Android inclusiveness
- web inclusiveness
- bed-only parity
- ambulance + bed combined parity
- public live Share ETA link lane

## North Star

The target is not just to make the current flow work.

The target is to make `/map` stable enough that:

- `MapScreen.jsx` is thin again
- stage files are render-led, not controller-led
- the reducer-backed store owns named sheet/runtime state
- one vertical slice can be fully signed off before parity work starts
- future platform/device passes do not keep reopening the same structural bugs

## Working Rules

### Rule 1

Do not start Android/web parity before the ambulance runtime is modularized and signed off on iOS mobile.

### Rule 2

Do not start bed-only or combined parity before ambulance-only runtime cleanup is complete.

### Rule 3

Do not move to Zustand yet.

Use the existing reducer-backed store first.

Only upgrade to Zustand if the reducer boundary becomes subscription-heavy after modularization.

### Rule 4

Every pass must end with:

- explicit code boundary improvements
- doc updates
- a short verification target

No pass should end as “we changed things and will remember later.”

### Rule 5

iOS mobile is the reference implementation, not the only implementation.

That means:

- new `/map` behavior is allowed to be invented and signed off on iOS mobile first
- once accepted, it must be pushed into shared controller/model/theme/formatter boundaries so other variants inherit it instead of re-implementing it
- parity failure is not just a spacing or breakpoint bug; it includes logic, API/data normalization, persistence/recovery, and shared action behavior

### Rule 6

Parity means more than screen layout.

Every promoted `/map` phase must eventually match across supported variants in these categories:

- shell geometry
  - panel/sheet padding
  - sidebar/header placement
  - map control offsets
- UI composition
  - hero/card hierarchy
  - CTA grouping
  - loading/skeleton structure
- action semantics
  - same buttons exist when the same state truth exists
  - same pending/disabled/pressed feedback exists
- data presentation
  - request id beautification / display formatting
  - ETA / arrival / distance formatting
  - service / hospital / room labeling
  - status copy normalization
- runtime truth
  - same status transitions
  - same countdown/timer behavior
  - same reopen/recovery behavior
  - same share behavior when applicable

If one variant shows the correct skeleton/header/CTA but the real phase does not, that is a propagation failure, not a design exception.

### Rule 7

Web background behavior is a persistence problem, not a store-brand problem.

That means:

- Zustand alone would not fix a browser tab pausing timers or suspending JS work
- active `/map` truth must resume from persisted app-owned state plus backend/request truth when the tab regains focus or reloads
- `AsyncStorage` already provides the cross-platform storage primitive here, including web-backed persistence, but `/map` does not yet route all app-owned persistence through one shared boundary
- direct `AsyncStorage` usage across screens/services is now an audit target because it makes resume behavior harder to reason about on web

Required direction:

- prefer one app-owned storage boundary for `/map` persistence
- persist the minimum operational truth needed to reconstruct active request state
- rebuild timers/countdowns from persisted timestamps and backend truth rather than assuming background execution continued

Current direct-storage audit:

| Area | File | Current classification | Decision |
| --- | --- | --- | --- |
| Public route resume | `app/_layout.js` | `/map` startup and reload truth | moved legacy dynamic key reads/writes behind `database.readRaw/deleteRaw` |
| Demo bootstrap | `services/demoEcosystemService.js` | `/map` coverage and demo hospital readiness | moved dynamic app-owned keys behind `database.readRaw/writeRaw` |
| Coverage mode | `services/coverageModeService.js` | `/map` hospital discovery behavior | moved dynamic per-user key behind `database.readRaw/writeRaw/deleteRaw` |
| Legacy intake resume | `screens/RequestAmbulanceScreen.jsx` | legacy/request-help bridge that can seed `/map` emergency work | moved dynamic intake phase key behind `database.readRaw/writeRaw/deleteRaw` |
| Triage draft resume | `components/emergency/triage/TriageIntakeModal.jsx` | legacy triage surface still used around active requests | moved dynamic request triage key behind `database.readRaw/writeRaw` |
| Supabase auth | `services/supabase.js` | auth session adapter | keep direct `AsyncStorage`; Supabase requires an AsyncStorage-compatible storage adapter |
| OTA update pending flag | `contexts/OTAUpdatesContext.jsx` | app-global update state | moved behind `database.readRaw/writeRaw/deleteRaw`; not `/map` specific, but now follows the same app-owned storage boundary |
| Legacy emergency disclaimer | `screens/EmergencyScreen.jsx` | legacy emergency surface | moved behind `database.readRaw/writeRaw`; this keeps legacy emergency parity while avoiding another direct storage exception |
| Database boundary | `database/db.js` | app-owned persistence adapter | keep direct `AsyncStorage`; this is the one allowed app storage boundary |

Direct-storage re-audit - 2026-04-22:

- `rg "@react-native-async-storage/async-storage|AsyncStorage\."` now reports direct app-owned persistence only in `database/db.js`; this is the approved storage boundary
- `services/supabase.js` still imports `AsyncStorage` directly by design because Supabase auth owns that adapter contract
- `/map` surfaces and controllers do not directly import `AsyncStorage`
- `components/welcome/install/webInstallHint.persistence.js` is the only direct `window.localStorage` usage; it is isolated to the install hint and does not participate in `/map` resume truth
- current `/map` app-owned persistence uses `database.read/write` or `database.readRaw/writeRaw/deleteRaw`
- minimum web recovery work should add new `StorageKeys` or raw `@ivisit/` keys through `database`, not through component-level browser storage

Minimum persisted `/map` truth for web resume/recovery:

- active request identity: request id, service family (`ambulance`, `bed`, or combined), hospital id, selected transport/room id
- active runtime phase: current sheet phase, snap state, return target, and whether tracking is hidden behind explore/map mode
- operational timestamps: request created/accepted time, ETA source timestamp, expected arrival timestamp, bed hold expiry timestamp when applicable
- route/tracking seed: route signature, route coordinate snapshot if available, last responder coordinate, heading, progress ratio, telemetry timestamp, and source mode
- user-facing request state: normalized status, arrived/confirm-arrival gate, completed/rating-pending gate, cancellation state
- commit drafts: profile/contact draft, triage draft/progress, selected payment method id, and payment snapshot readiness flag
- recovery handoff: pending rating recovery claim, pending share state when tokenized sharing is added, and last successful backend sync timestamp

Resume rule:

- persisted local truth is a seed only
- backend/request truth wins when available
- timers must be recomputed from timestamps on focus/reload, never continued from paused JS intervals

Location subscription cleanup rule:

- do not call Expo Location subscription cleanup from web paths
- wrap native foreground watcher cleanup with `safeRemoveLocationSubscription`
- if a watcher resolves after the owning effect unmounted, immediately remove it through the same safe cleanup helper
- this protects hot reload, reconnect, and sheet/remount paths from `LocationEventEmitter.removeSubscription` runtime crashes

## Pass Overview

## Pass 1. Runtime Boundary Cleanup

Primary target:

- stop the current `/map` runtime from growing as one large hook and several controller-heavy stage files

What this pass changes:

- normalize the existing reducer-backed store boundary
- keep `sheet.phase`, `sheet.snapState`, and `sheet.payload` as the primary sheet contract
- define explicit runtime subdomains for:
  - `commit.details`
  - `commit.payment`
  - `commit.triage`
  - `tracking.view`
- reduce `MapScreen.jsx` responsibility where possible

What this pass should extract first:

- pure selectors
- pure derived view data
- action helpers
- payload builders
- side-effect helpers that do not need to live inline in stage render files

Do not do in this pass:

- cross-device polish
- bed parity
- combined-flow parity
- full visual redesign work

Done when:

- the runtime boundaries are named and documented
- the biggest files stop owning mixed concerns blindly
- store actions/selectors become the preferred interface instead of raw payload mutation

Unlocks:

- pass 2 and pass 3 can proceed without more monolith growth

## Pass 2. Tracking Modularization

Primary target:

- split `TRACKING` into stable modules before more feature work lands there

What this pass changes:

- extract a tracking controller/model layer
- extract tracking-only selectors and derived display helpers
- extract share logic, telemetry mapping, and rating trigger logic
- extract tracking parts:
  - top slot
  - hero
  - CTA group
  - route card
  - details card

Preferred module shape:

- `tracking/useMapTrackingController.js`
- `tracking/mapTracking.selectors.js`
- `tracking/mapTracking.actions.js`
- `tracking/mapTracking.share.js`
- `tracking/mapTracking.telemetry.js`
- `tracking/mapTracking.rating.js`
- `tracking/parts/*`

Do not do in this pass:

- redesign the full tracking UX again
- add new tracking features unless they are required by the extraction

Done when:

- `MapTrackingStageBase.jsx` is mostly render composition and event wiring
- share/rating/telemetry logic no longer lives inline across the whole file
- tracking changes become safe to reason about per module

Unlocks:

- ambulance tracking signoff pass
- cleaner post-resolution and ETA audits

## Pass 3. Commit Phase Modularization

Primary target:

- split `COMMIT_DETAILS`, `COMMIT_PAYMENT`, and `COMMIT_TRIAGE` the same way so the ambulance runtime becomes structurally coherent end-to-end

What this pass changes:

- extract controller logic for:
  - identity/auth/contact collection
  - payment method hydration and request submission
  - live triage persistence and progress
- keep stage files render-led
- move repeated request/payload shaping into dedicated helpers

Priority order inside this pass:

1. `COMMIT_PAYMENT`
2. `COMMIT_TRIAGE`
3. `COMMIT_DETAILS`

Why:

- payment is the riskiest stateful handoff
- triage must remain live and resumable
- details is simpler once the other two are separated

Do not do in this pass:

- bed parity
- combined-flow parity
- new payment product scope

Done when:

- commit-stage files stop behaving like hidden controllers
- payment hydration, triage persistence, and auth/contact state each have their own clear module boundary
- request creation path is easier to audit

Unlocks:

- a real ambulance-only end-to-end pass without structural churn

## Pass 4. Ambulance Functional Signoff

Primary target:

- make the current ambulance-only `/map` flow functionally trustworthy from commit to completion

Surgical audit requirements absorbed by this pass:

- normalized active request model for ambulance request truth
- one shared selector source for smart header, tracking sheet, map marker, completion gates, and recovery
- explicit commit transaction behavior for card, cash approval, dispatch, failure, retry, and rollback
- ambulance-scoped persistence/recovery for route seed, ETA seed, rating claim, and active request hydration

Pass 4A target:

- create the normalized active request model before more signoff patches
- remove duplicated status/metric/arrival/CTA gate derivation from header and tracking where practical
- keep `sheetPayload` as navigation context only, not canonical operational truth

Pass 4A current output:

- added [`components/map/core/mapActiveRequestModel.js`](../../../components/map/core/mapActiveRequestModel.js)
- normalized active request identity, kind, status, hospital, service label, ETA/arrival labels, minute/distance values, progress, telemetry state, and completion gates
- [`hooks/map/exploreFlow/useMapExploreFlow.js`](../../../hooks/map/exploreFlow/useMapExploreFlow.js) now uses the model for the active session header request key, hospital, pickup, status, arrival, min, km, and progress values
- [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) now uses the model for map focus hospital, ambulance marker kind/coordinate/heading selection, tracking triage request id handoff, and recovered-rating suppression while any active request exists
- [`components/map/core/MapSheetOrchestrator.jsx`](../../../components/map/core/MapSheetOrchestrator.jsx) passes the model into tracking
- tracking runtime/view derivation now receives the model for tracking kind, hospital, request display, triage request id, and confirm/complete gates

Pass 4A proven by static checks:

- JS syntax checks passed for the new model and changed JS modules
- Expo/Babel parse checks passed for changed JSX modules
- the old local header ETA/distance helpers were removed from `useMapExploreFlow.js`, so active header metrics no longer have a second inactive implementation in that hook

Pass 4A deferred:

- `EmergencyContext` still stores raw ambulance, bed, and pending objects; the model is currently a `/map` derived contract, not yet a provider-level exported selector
- tracking completion/rating still needs Pass 4B runtime verification on-device
- bed-specific countdown and ready/occupied gates remain Pass 6 scope

Pass 4B target:

- close the remaining ambulance functional checks after the normalized model is in place
- verify commit transaction outcomes and rating/recovery cleanup end-to-end

Current slice:

- started with tracking completion / rating handoff audit
- removed a lifecycle race in [`hooks/emergency/useEmergencyHandlers.js`](../../../hooks/emergency/useEmergencyHandlers.js) where completion was writing both `COMPLETED` and `RATING_PENDING` in parallel
- keep `RATING_PENDING` as the single post-completion pre-rating lifecycle until the rating modal resolves it to `RATED`
- completion handlers in [`hooks/emergency/useEmergencyHandlers.js`](../../../hooks/emergency/useEmergencyHandlers.js) now return explicit success/failure results instead of swallowing failures silently
- cleanup in [`hooks/emergency/useEmergencyHandlers.js`](../../../hooks/emergency/useEmergencyHandlers.js) now runs only on successful complete/cancel flows, so failed operations no longer disappear from active tracking state
- tracking rating flow in [`components/map/views/tracking/useMapTrackingController.js`](../../../components/map/views/tracking/useMapTrackingController.js) now blocks `RATED` writes when completion fails, resolves skip to `POST_COMPLETION`, and shows success/error toast feedback
- [`components/emergency/ServiceRatingModal.jsx`](../../../components/emergency/ServiceRatingModal.jsx) now waits for async skip/submit handlers before closing, so rating state is no longer lost behind optimistic dismissal
- ambulance animation in [`hooks/emergency/useAmbulanceAnimation.js`](../../../hooks/emergency/useAmbulanceAnimation.js) now seeds route progress from the live responder coordinate when available, and [`components/emergency/intake/EmergencyLocationPreviewMap.jsx`](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx) now passes that live responder location into the animation hook to reduce reopen/reload drift
- recovery hydration in [`contexts/EmergencyContext.jsx`](../../../contexts/EmergencyContext.jsx) now preserves richer client `map_route` ETA/route state for the same active request instead of downgrading it back to coarse server snapshot data
- route timeline reconciliation is now centralized in [`components/map/views/tracking/mapTracking.timeline.js`](../../../components/map/views/tracking/mapTracking.timeline.js), and [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) now re-anchors `startedAt` whenever live route ETA becomes the better truth
- [`hooks/emergency/useTripProgress.js`](../../../hooks/emergency/useTripProgress.js) no longer falls back to `createdAt`/`updatedAt` guesses, so countdown drift is no longer rebuilt from request timestamps after reload
- triage live updates in [`components/map/views/commitTriage/useMapCommitTriageController.js`](../../../components/map/views/commitTriage/useMapCommitTriageController.js) now patch ambulance, bed, and pending-approval tracking state locally, and [`contexts/EmergencyContext.jsx`](../../../contexts/EmergencyContext.jsx) now exposes patch helpers for bed/pending state so header progress stays truthful before realtime/server echo returns
- tracking completion is now a true two-step flow: [`hooks/emergency/useEmergencyHandlers.js`](../../../hooks/emergency/useEmergencyHandlers.js) supports deferred cleanup for complete actions, and [`components/map/views/tracking/useMapTrackingController.js`](../../../components/map/views/tracking/useMapTrackingController.js) now completes the request on both rating submit and rating skip, then performs local tracking cleanup only after the post-completion lifecycle write succeeds
- `/map` tracking completion now matches legacy ordering: [`components/map/views/tracking/useMapTrackingController.js`](../../../components/map/views/tracking/useMapTrackingController.js) commits request completion before opening the rating modal, and [`components/map/views/tracking/mapTracking.rating.js`](../../../components/map/views/tracking/mapTracking.rating.js) preserves that committed-completion flag so rating submit/skip no longer re-run completion or risk leaving a request active if rating is interrupted
- reserve-bed-from-tracking now preserves its upstream source chain across bed decision, hospital list, service detail, commit details, and commit payment via [`components/map/core/mapSheetFlowPayloads.js`](../../../components/map/core/mapSheetFlowPayloads.js), so backing out of that lane can unwind cleanly to tracking instead of silently dropping the user back to explore
- long-session ambulance animation in [`hooks/emergency/useAmbulanceAnimation.js`](../../../hooks/emergency/useAmbulanceAnimation.js) now distinguishes live responder progress from synthetic ETA resume progress, and it projects live responder coordinates onto route segments instead of snapping to the nearest vertex, so reopened tracking sessions stay on the route and finish over the correct remaining ETA window
- active tracking route precedence in [`components/emergency/intake/EmergencyLocationPreviewMap.jsx`](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx) and [`hooks/emergency/useMapRoute.js`](../../../hooks/emergency/useMapRoute.js) now prefers the richer preserved tracking route over a newly fetched fallback straight-line route, so route degradation does not silently flatten the live tracking path
- rating recovery no longer depends on the tracking sheet staying mounted: [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) now reopens [`components/emergency/ServiceRatingModal.jsx`](../../../components/emergency/ServiceRatingModal.jsx) from persisted visit lifecycle truth when the newest visit is still `RATING_PENDING`, and [`components/map/views/tracking/mapTracking.rating.js`](../../../components/map/views/tracking/mapTracking.rating.js) now exposes the recovery selectors/builders for that path
- recovered rating exclusion in [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) now bumps a handled-version state when a visit is resolved, so a just-skipped or just-submitted recovered rating does not immediately reopen from stale memoized exclusion state
- recovered rating scope is now device-local instead of account-global: [`components/map/views/tracking/useMapTrackingController.js`](../../../components/map/views/tracking/useMapTrackingController.js) writes a local recovery claim when completion opens the rating modal, and [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) only reopens persisted `RATING_PENDING` visits that have a matching local claim from [`components/map/views/tracking/mapTracking.rating.js`](../../../components/map/views/tracking/mapTracking.rating.js)
- ambulance animation restart in [`hooks/emergency/useAmbulanceAnimation.js`](../../../hooks/emergency/useAmbulanceAnimation.js) is now keyed to a normalized route signature instead of raw coordinate-array identity, so live tracking is less likely to restart just because the same polyline is re-emitted as a new array instance
- authenticated public-map preservation in [`app/_layout.js`](../../../app/_layout.js) now normalizes the current pathname before auth redirect checks, so native iOS sessions on `/(auth)/map` no longer fall through to the legacy authenticated home tab just because the grouped route path differs from web
- ambulance motion precedence in [`hooks/emergency/useAmbulanceAnimation.js`](../../../hooks/emergency/useAmbulanceAnimation.js) now prefers live responder coordinates over the synthetic timer loop whenever telemetry is present, which removes the timer-vs-telemetry race that caused occasional mid-route jumps
- commit payment now has an explicit transaction contract in [`components/map/views/commitPayment/mapCommitPayment.transaction.js`](../../../components/map/views/commitPayment/mapCommitPayment.transaction.js), defining the only valid submit states (`idle`, `waiting_approval`, `processing_payment`, `finalizing_dispatch`, `dispatched`, `failed`, `payment_declined`) plus a pure submit validator for hospital, payment snapshot, method, and total requirements
- [`components/map/views/commitPayment/useMapCommitPaymentController.js`](../../../components/map/views/commitPayment/useMapCommitPaymentController.js) now routes submit flow through that transaction contract, blocks duplicate submits with a local submit lock, cleans up demo auto-approval timers on unmount, and moves approval/card/dispatch/failure transitions through one named state boundary instead of scattered string literals
- commit payment presentation now reads the same transaction constants in [`components/map/views/commitPayment/mapCommitPayment.presentation.js`](../../../components/map/views/commitPayment/mapCommitPayment.presentation.js), [`components/map/views/commitPayment/MapCommitPaymentStageParts.jsx`](../../../components/map/views/commitPayment/MapCommitPaymentStageParts.jsx), and [`components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`](../../../components/map/views/commitPayment/MapCommitPaymentStageBase.jsx), so UI status rendering cannot silently drift from controller state naming
- wide-screen payment footer parity regression was closed in [`components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`](../../../components/map/views/commitPayment/MapCommitPaymentStageBase.jsx) by restoring the missing `webWideInsetStyle` contract used by the other promoted `/map` stages
- tracking and recovered-rating resolution now share one persistence contract in [`components/map/views/tracking/mapTracking.rating.js`](../../../components/map/views/tracking/mapTracking.rating.js), which owns `POST_COMPLETION` and `RATED` lifecycle writes, recovery-claim deletion, and optional tip settlement results
- [`components/map/views/tracking/useMapTrackingController.js`](../../../components/map/views/tracking/useMapTrackingController.js) and [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) now delegate rating skip/submit persistence to those shared helpers instead of duplicating backend lifecycle logic

Scope:

- `COMMIT_DETAILS`
- `COMMIT_PAYMENT`
- `COMMIT_TRIAGE`
- `TRACKING`
- completion and rating handoff

Required checks:

1. complete request
2. rating submission
3. post-resolution cleanup / return state
4. tracking lost / delayed states
5. ETA hydration across reopen/reload
6. ambulance route adherence over time
7. triage progress persistence and reopen behavior
8. reserve-bed-from-tracking edge case

Pass 4B proven in this slice:

- commit payment transaction states are now explicit and shared between controller and presentation
- duplicate payment submissions are locally blocked before async request creation starts
- demo cash auto-approval timeout cleanup no longer survives stage unmount
- wide-screen payment stage regains the same footer inset contract already used by ambulance/bed decision stages
- tracking-mounted and recovered-rating flows now share the same lifecycle/claim/tip persistence rules
- static syntax checks passed for:
  - `components/map/views/commitPayment/mapCommitPayment.transaction.js`
  - `components/map/views/commitPayment/useMapCommitPaymentController.js`
  - `components/map/views/commitPayment/mapCommitPayment.presentation.js`
  - Babel/Expo parse for `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`
  - Babel/Expo parse for `components/map/views/commitPayment/MapCommitPaymentStageParts.jsx`
  - `components/map/views/tracking/mapTracking.rating.js`
  - `components/map/views/tracking/useMapTrackingController.js`
  - Babel/Expo parse for `screens/MapScreen.jsx`

Pass 4B still deferred:

- on-device proof for card success, card decline, and cash-approval timing behavior
- full completion -> rating -> cleanup runtime signoff remains required before Pass 4 closes
- bed/combined payment behavior still needs the same transaction audit when Pass 6 broadens the active-request surface beyond ambulance-only signoff

Do not do in this pass:

- broad UI restyling
- Android/web platform polish

Done when:

- ambulance-only runtime behaves correctly end-to-end on iOS mobile
- reopen/reload does not break operational truth
- completion does not strand the user in a broken state

Unlocks:

- pass 5 UI signoff has a stable behavior base

## Pass 5. Ambulance UI Signoff

Primary target:

- finish the ambulance-only visual and interaction polish on iOS mobile after the runtime is stable

Scope:

- smart header
- tracking sheet half / expanded states
- commit sheet continuity
- payment state surfaces
- rating polish
- regression-only sidebar shell fixes when they block visual signoff for the same runtime:
  - shared wide-panel body inset for `COMMIT_DETAILS`, `COMMIT_TRIAGE`, `COMMIT_PAYMENT`, and `TRACKING`
  - active-session header placement in left-sidebar layouts must match the right-map header lane shown by the loading skeleton
- lock the shared presentation/data contracts that later variants must inherit:
  - request id display formatting
  - metric formatting (`arrival`, `min`, `km`)
  - hero/meta hierarchy
  - header action availability

Required checks:

- visual hierarchy
- tone balance for delayed/lost states
- motion continuity
- button states
- hero card information clarity
- no repeated or explanatory copy drift

Current slice:

- restored a shared wide-panel top-slot containment contract for:
  - [`components/map/views/commitDetails/MapCommitDetailsStageBase.jsx`](../../../components/map/views/commitDetails/MapCommitDetailsStageBase.jsx)
  - [`components/map/views/commitTriage/MapCommitTriageStageBase.jsx`](../../../components/map/views/commitTriage/MapCommitTriageStageBase.jsx)
  - [`components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`](../../../components/map/views/commitPayment/MapCommitPaymentStageBase.jsx)
  - [`components/map/views/tracking/MapTrackingStageBase.jsx`](../../../components/map/views/tracking/MapTrackingStageBase.jsx)
- [`components/map/views/shared/mapSheetStage.styles.js`](../../../components/map/views/shared/mapSheetStage.styles.js) now exposes `topSlotWide`, so promoted stages can keep header geometry aligned with the same wide-lane inset already used by body content
- request-id presentation is now normalized through [`components/map/core/mapRequestPresentation.js`](../../../components/map/core/mapRequestPresentation.js), and active request/tracking/payment/header surfaces now format UUID-like fallback IDs into a stable UI-safe request token instead of leaking raw backend identifiers
- metric presentation is now normalized through [`components/map/core/mapMetricPresentation.js`](../../../components/map/core/mapMetricPresentation.js), and both [`components/map/core/mapActiveRequestModel.js`](../../../components/map/core/mapActiveRequestModel.js) and [`components/map/views/tracking/mapTracking.presentation.js`](../../../components/map/views/tracking/mapTracking.presentation.js) now share the same arrival/minutes/distance formatter contract
- map-overlay header geometry is now normalized through [`components/map/core/mapOverlayHeaderLayout.js`](../../../components/map/core/mapOverlayHeaderLayout.js), and both [`hooks/map/exploreFlow/useMapExploreFlow.js`](../../../hooks/map/exploreFlow/useMapExploreFlow.js) and [`components/map/surfaces/MapExploreLoadingOverlay.jsx`](../../../components/map/surfaces/MapExploreLoadingOverlay.jsx) now read the same header frame contract instead of carrying separate left/right/width math
- active-session smart-header content is now normalized through [`components/map/core/mapActiveSessionPresentation.js`](../../../components/map/core/mapActiveSessionPresentation.js), so the persistent tracking header renders compact semantic status plus shared metrics instead of carrying hidden duplicated detail rows
- [`components/headers/ScrollAwareHeader.jsx`](../../../components/headers/ScrollAwareHeader.jsx) now supports a warning pill tone, which lets delayed tracking states remain visually distinct without reintroducing expanded explanatory copy

Pass 5 proven in this slice:

- wide-panel commit/tracking stages now share one header lane rule instead of stage-local spacing drift
- request-id formatting is now a shared `/map` presentation contract instead of ad hoc fallback text
- arrival/minutes/distance labels now come from one shared formatter contract instead of duplicated formatting logic
- active-session header placement now shares the same frame contract as the loading skeleton/header lane on wide layouts
- smart-header content no longer carries hidden duplicated tracking detail rows; it now renders only compact metrics plus a semantic status pill
- delayed ambulance tracking now has an explicit warning tone in the active-session header instead of falling back to the generic live/default treatment
- static syntax checks passed for:
  - `components/map/views/shared/mapSheetStage.styles.js`
  - `components/map/core/mapRequestPresentation.js`
  - `components/map/core/mapMetricPresentation.js`
  - `components/map/core/mapActiveRequestModel.js`
  - `components/map/core/mapOverlayHeaderLayout.js`
  - `components/map/core/mapActiveSessionPresentation.js`
  - `components/map/views/tracking/mapTracking.derived.js`
  - `components/map/views/tracking/mapTracking.presentation.js`
  - `components/headers/ScrollAwareHeader.jsx`
  - `components/map/surfaces/MapExploreLoadingOverlay.jsx`
  - Babel/Expo parse for `components/map/views/commitDetails/MapCommitDetailsStageBase.jsx`
  - Babel/Expo parse for `components/map/views/commitTriage/MapCommitTriageStageBase.jsx`
  - Babel/Expo parse for `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`
  - Babel/Expo parse for `components/map/views/tracking/MapTrackingStageBase.jsx`
  - Babel/Expo parse for `hooks/map/exploreFlow/useMapExploreFlow.js`

Pass 5 deferred:

- final device-side visual confirmation is still required for the compact active-session header on iOS mobile and wide-sidebar web/tablet variants
- broader active-session redundancy/tone QA against real lost/delayed runtime states is still required before Pass 5 can close

Do not do in this pass:

- parity expansion to other care types

Done when:

- the ambulance-only iOS mobile flow feels internally consistent from `/welcome` through `/map` and into tracking resolution

Unlocks:

- parity work can copy a stable system instead of a moving target

## Pass 6. Bed-Only Parity

Primary target:

- bring the bed-only path up to the same structural and runtime standard as ambulance-only

Scope:

- `BED_DECISION`
- commit stages for bed path
- bed tracking / reservation guidance states
- completion / rating parity where applicable
- legacy bed timing parity:
  - hydrate `waitTime` / `estimatedWait` / `etaSeconds` into live reservation truth
  - preserve the legacy fallback hold window (`15 min`) when explicit timing is absent
  - expose remaining reservation time as a real countdown in header metrics and reservation hero state
- legacy occupancy gate parity:
  - `Reserved` -> `Ready` -> `Check in` / `Mark occupied` -> `Complete`
- bed hero / tracking parity:
  - match the ambulance tracking structure instead of using a second-class reservation summary
  - use bed imagery in sheet hero surfaces only; map marker parity is intentionally deferred
- resolve bed share behavior:
  - legacy code exposes timing and reservation status, but not a true user-controlled reservation window share flow
  - add `Share ETA` parity for bed booking
  - decide whether `Share ETA` for bed should share remaining hold time, ready window, or both
- inheritance rule:
  - bed flow should reuse the ambulance request architecture wherever the backend request/visit fields already overlap
  - service-specific differences belong in bed models/presentation helpers, not in a second disconnected runtime stack

Current slice:

- bed timing/runtime ownership is now normalized through [`hooks/emergency/bedBookingRuntime.js`](../../../hooks/emergency/bedBookingRuntime.js)
- [`contexts/EmergencyContext.jsx`](../../../contexts/EmergencyContext.jsx) now applies that normalizer when:
  - hydrating active bed bookings from backend truth
  - starting a local bed booking
  - patching a live bed booking from realtime request updates
- [`hooks/emergency/useBedBookingProgress.js`](../../../hooks/emergency/useBedBookingProgress.js) now reads the same hold/timestamp contract instead of re-parsing timing rules independently
- [`components/map/views/tracking/mapTracking.model.js`](../../../components/map/views/tracking/mapTracking.model.js) now exposes the fallback `Share ETA` action for bed tracking too, matching the ambulance action model whenever bed is not in a higher-priority check-in/complete state
- bed service labels are now normalized through [`components/map/views/tracking/mapTracking.presentation.js`](../../../components/map/views/tracking/mapTracking.presentation.js) and [`components/map/core/mapActiveRequestModel.js`](../../../components/map/core/mapActiveRequestModel.js), so runtime surfaces no longer leak raw `standard` / `icu` backend values
- [`components/map/core/mapActiveRequestModel.js`](../../../components/map/core/mapActiveRequestModel.js) and [`components/map/core/mapActiveSessionPresentation.js`](../../../components/map/core/mapActiveSessionPresentation.js) now treat elapsed bed ETA as `Ready`, zero the minute metric, and promote the active-session header to a success tone when check-in is available
- [`components/map/views/tracking/useMapTrackingRuntime.js`](../../../components/map/views/tracking/useMapTrackingRuntime.js), [`components/map/views/tracking/MapTrackingStageBase.jsx`](../../../components/map/views/tracking/MapTrackingStageBase.jsx), and [`components/map/views/tracking/mapTracking.theme.js`](../../../components/map/views/tracking/mapTracking.theme.js) now render the bed hero against live remaining-hold time and progress instead of a static reservation summary
- [`components/map/views/tracking/mapTracking.model.js`](../../../components/map/views/tracking/mapTracking.model.js) now promotes `Complete Stay` to the bottom primary slot when the bed request reaches its completion gate, matching the ambulance completion hierarchy

Pass 6 proven in this slice:

- the bed countdown no longer resets simply because hydration, local start, and realtime update paths normalize booking objects differently
- the legacy 15-minute fallback hold window is now part of one shared runtime contract instead of being hidden only inside the progress hook
- bed tracking is no longer missing the baseline `Share ETA` fallback action that ambulance already had
- bed header metrics, tracking hero progress, ready/check-in gate, and completion CTA now read the same normalized countdown/status truth instead of each deriving reservation state independently
- static syntax checks passed for:
  - `hooks/emergency/bedBookingRuntime.js`
  - `hooks/emergency/useBedBookingProgress.js`
  - `components/map/core/mapActiveRequestModel.js`
  - `components/map/core/mapActiveSessionPresentation.js`
  - `components/map/views/tracking/useMapTrackingRuntime.js`
  - `components/map/views/tracking/mapTracking.presentation.js`
  - `components/map/views/tracking/mapTracking.theme.js`
  - `components/map/views/tracking/mapTracking.model.js`
  - Babel/Expo parse for `components/map/views/tracking/MapTrackingStageBase.jsx`
  - Babel/Expo parse for `contexts/EmergencyContext.jsx`

Pass 6 deferred:

- reserve-bed real-flow verification, combined-flow verification, and cross-device bed presentation QA are deferred to end-of-sprint manual testing per current execution rule

Done when:

- bed-only runtime is not a second-class path
- shared commit modules support bed safely
- reservation countdown, readiness state, and occupied/completion transitions are truthful without relying on legacy-only surfaces

Unlocks:

- combined ambulance + bed parity

## Pass 7. Combined Flow Parity

Primary target:

- support the intended sequential combined runtime cleanly:
  - ambulance choice first
  - bed choice second
  - commit/send as separate backend requests

Scope:

- combined payload memory
- hospital/service revalidation between phases
- payment and resolution coordination
- sequential add-on parity:
  - ambulance tracking -> reserve bed
  - bed tracking -> request ambulance
- dual-active state rules:
  - define ambulance-primary vs shared tracking ownership when both requests are live
  - define smart-header truth when transport and reservation coexist
- keep combined as sequential backend requests until a true unified checkout exists
- if a reservation share window is added for bed, define how it behaves once dual-active flow exists

Current slice:

- bed tracking now supports the reverse add-on lane through [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx), [`components/map/core/MapSheetOrchestrator.jsx`](../../../components/map/core/MapSheetOrchestrator.jsx), [`components/map/views/tracking/MapTrackingStageBase.jsx`](../../../components/map/views/tracking/MapTrackingStageBase.jsx), [`components/map/views/tracking/useMapTrackingController.js`](../../../components/map/views/tracking/useMapTrackingController.js), and [`components/map/views/tracking/mapTracking.model.js`](../../../components/map/views/tracking/mapTracking.model.js)
- the tracking CTA group can now surface `Request Transport` when a bed request is active without an active ambulance request, matching the existing ambulance-to-bed add-on contract in the opposite direction
- reverse add-on source return is now preserved through ambulance decision hospital switching and service detail navigation by:
  - [`components/map/core/mapSheetFlowPayloads.js`](../../../components/map/core/mapSheetFlowPayloads.js)
  - [`hooks/map/exploreFlow/useMapExploreFlow.js`](../../../hooks/map/exploreFlow/useMapExploreFlow.js)
  - [`components/map/views/ambulanceDecision/MapAmbulanceDecisionStageBase.jsx`](../../../components/map/views/ambulanceDecision/MapAmbulanceDecisionStageBase.jsx)
- ambulance confirmation launched from bed tracking now preserves the tracking source context into commit/payment and explicitly bypasses the `selectedCare === "both"` redirect, so reverse add-on does not accidentally re-enter the combined checkout path
- dual-active ownership is now explicit by rule:
  - ambulance remains the primary active request for smart-header/tracking-map ownership when both requests are live
  - the companion bed request is surfaced as secondary reservation context inside ambulance tracking rather than competing for the active-session header

Pass 7 proven in this slice:

- reverse add-on (`bed -> ambulance`) no longer drops source context when the user changes hospitals or opens transport details before confirming
- sequential dual-request flow now remains within the same source-return contract as the forward add-on lane instead of reopening explore accidentally
- combined parity still respects the intentional product rule that unified combined checkout is unsupported; the new path opens a separate ambulance request lane from tracking rather than bypassing payment/request contracts
- static syntax checks passed for:
  - `components/map/core/MapSheetOrchestrator.jsx`
  - `components/map/core/mapSheetFlowPayloads.js`
  - `components/map/views/tracking/useMapTrackingController.js`
  - `components/map/views/tracking/mapTracking.model.js`
  - `components/map/views/tracking/mapTracking.theme.js`
  - `hooks/map/exploreFlow/useMapExploreFlow.js`
  - `screens/MapScreen.jsx`
  - Babel/Expo parse for `components/map/views/ambulanceDecision/MapAmbulanceDecisionStageBase.jsx`
  - Babel/Expo parse for `components/map/views/tracking/MapTrackingStageBase.jsx`

Pass 7 deferred:

- manual QA for dual-active state transitions, completion ordering, and reopen/recovery remains deferred to sprint-end device testing

Done when:

- combined flow no longer depends on ambulance-only assumptions
- bed-after-ambulance path is stable
- reverse add-on (`bed -> ambulance`) is either fully supported or explicitly excluded by product rule

Unlocks:

- broad device/platform rollout

## Pass 8. Cross-Device Inclusiveness

Primary target:

- move from iOS mobile confidence to real multi-device confidence

Device order:

1. Android mobile
2. web mobile
3. iPad / Android tablet / fold
4. web md / lg / xl / macbook

Scope:

- sheet sizing and detents
- keyboard behavior
- header behavior
- modal/sidebar variants
- map controls and icon placement
- typography and CTA sizing
- propagation audit for every promoted `/map` phase:
  - `COMMIT_DETAILS`
  - `COMMIT_PAYMENT`
  - `COMMIT_TRIAGE`
  - `TRACKING`
  - bed-only follow-ons once Pass 6 is complete
- shared logic/data parity checks:
  - request id display formatting
  - metric/countdown parity
  - CTA/action parity
  - share behavior parity
  - persistence/recovery parity
- web persistence/resume contract:
  - active trip/reservation state must survive reload/focus loss via persisted local state plus backend truth
  - no viewport may depend on background JS timers continuing while hidden
  - `/map` storage should prefer the shared app storage boundary over scattered direct `AsyncStorage` calls where practical

Current slice:

- direct storage re-audit is now recorded in this document and confirms that app-owned `/map` persistence routes through [`database/db.js`](../../../database/db.js) instead of direct component-level `AsyncStorage`
- [`contexts/EmergencyContext.jsx`](../../../contexts/EmergencyContext.jsx) now hydrates and persists normalized emergency runtime state through `StorageKeys.EMERGENCY_STATE`, including:
  - active ambulance trip
  - active bed booking
  - pending approval state
  - commit-flow draft state
- [`utils/domainNormalize.js`](../../../utils/domainNormalize.js) now normalizes persisted `pendingApproval` and `commitFlow` records, so web/native reload recovery no longer relies on arbitrary raw object shapes
- persistence is now one-shot hydrated and signature-guarded before writes, which keeps the recovery boundary deterministic and avoids clobbering live runtime state during provider startup
- [`contexts/EmergencyContext.jsx`](../../../contexts/EmergencyContext.jsx) now rejects equivalent `pendingApproval` and `commitFlow` writes, so effect-driven controllers such as commit details and commit triage cannot churn the shared runtime with semantically identical payloads
- [`hooks/map/exploreFlow/useMapExploreFlow.js`](../../../hooks/map/exploreFlow/useMapExploreFlow.js) now limits active-session header ownership to `EXPLORE_INTENT` and `TRACKING`, so non-tracking sheets and map overlays cannot accidentally resurrect tracking header state
- [`components/emergency/MiniProfileModal.jsx`](../../../components/emergency/MiniProfileModal.jsx) now renders through [`components/map/surfaces/MapModalShell.jsx`](../../../components/map/surfaces/MapModalShell.jsx) instead of owning a separate modal animation stack, and [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) now explicitly opts it into drawer presentation only for sidebar `/map` layouts
- [`components/emergency/ServiceRatingModal.jsx`](../../../components/emergency/ServiceRatingModal.jsx) now supports a `/map` shell branch through [`components/map/surfaces/MapModalShell.jsx`](../../../components/map/surfaces/MapModalShell.jsx), while legacy emergency screens keep the existing modal branch; `/map` tracking and recovered-rating flows now opt into that shared shell contract
- noisy `/map`-adjacent startup diagnostics were removed from:
  - [`App.js`](../../../App.js)
  - [`app/_layout.js`](../../../app/_layout.js)
  - [`app/auth/callback.js`](../../../app/auth/callback.js)
  - [`contexts/GlobalLocationContext.jsx`](../../../contexts/GlobalLocationContext.jsx)
  - [`contexts/OTAUpdatesContext.jsx`](../../../contexts/OTAUpdatesContext.jsx)
  - [`components/emergency/EmergencyMapContainer.jsx`](../../../components/emergency/EmergencyMapContainer.jsx)
  - [`components/map/FullScreenEmergencyMap.jsx`](../../../components/map/FullScreenEmergencyMap.jsx)
  - [`hooks/emergency/useEmergencyHandlers.js`](../../../hooks/emergency/useEmergencyHandlers.js)
  - [`components/emergency/intake/EmergencyLocationPreviewMap.jsx`](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)
  - [`services/appMigrationsService.js`](../../../services/appMigrationsService.js)

Pass 8 proven in this slice:

- `/map` no longer depends only on in-memory emergency state for active request and commit-flow recovery after reload/focus loss
- the existing app-owned storage boundary is now used for emergency runtime recovery instead of introducing new ad hoc browser/native persistence
- equivalent commit-flow and pending-approval writes no longer force app-wide rerenders just because controller effects re-emitted the same payload
- active-session header state can no longer leak into non-tracking overlays; header ownership is now phase-bounded instead of inferred indirectly
- profile-modal presentation now follows the same shared shell contract as other `/map` modals, so wide sidebar layouts get a drawer and non-sidebar layouts keep the compact bottom-sheet behavior instead of maintaining a separate modal implementation
- rating presentation now follows the same `/map` shell contract as profile and other map modals, so recovered rating and tracking-completion rating no longer rely on a separate modal stack in the new runtime
- Metro/runtime output is quieter during `/map` startup, so actual regressions are easier to spot while the remaining parity passes are executed
- static syntax checks passed for:
  - `App.js`
  - `app/_layout.js`
  - `app/auth/callback.js`
  - `contexts/EmergencyContext.jsx`
  - `contexts/GlobalLocationContext.jsx`
  - `contexts/OTAUpdatesContext.jsx`
  - `components/emergency/EmergencyMapContainer.jsx`
  - `components/map/FullScreenEmergencyMap.jsx`
  - `hooks/emergency/useEmergencyHandlers.js`
  - `hooks/map/exploreFlow/useMapExploreFlow.js`
  - `components/emergency/MiniProfileModal.jsx`
  - `components/emergency/ServiceRatingModal.jsx`
  - `components/map/views/tracking/MapTrackingStageBase.jsx`
  - `screens/MapScreen.jsx`
  - `components/emergency/intake/EmergencyLocationPreviewMap.jsx`
  - `services/appMigrationsService.js`
  - `utils/domainNormalize.js`

Done when:

- the same runtime feels deliberate across the supported device matrix

Unlocks:

- final product hardening instead of one-platform correctness

Pass 8 close note:

- structural parity, persistence, and shell propagation are complete in code
- final manual device-side QA remains deferred to end-of-sprint testing by current execution rule and is no longer treated as a coding blocker

## Pass 9. Post-Signoff Enhancements

Primary target:

- add higher-scope upgrades only after the runtime is modular and signed off

Candidate upgrades:

- tokenized public live `Share ETA` route
- stronger post-resolution summary
- richer tracking details and trusted-contact handoff
- store upgrade to Zustand if reducer subscriptions become clearly strained

Done when:

- enhancements no longer threaten the core signed-off flow

Current slice:

- [`components/map/views/tracking/mapTracking.rating.js`](../../../components/map/views/tracking/mapTracking.rating.js) now exports `buildTrackingResolutionToast`, a shared post-resolution summary contract for `/map` rating outcomes
- [`components/map/views/tracking/useMapTrackingController.js`](../../../components/map/views/tracking/useMapTrackingController.js) now uses that shared summary builder for skip and submit flows in active tracking
- [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) now uses the same shared summary builder for recovered-rating submit/skip flows after reload/recovery

Pass 9 proven in this slice:

- post-resolution messaging is no longer a generic `Thanks for the feedback.` toast
- `/map` now reflects what actually resolved:
  - transport, stay, or visit
  - hospital context when available
  - tip-added vs tip-needs-attention outcomes
- the summary contract is shared between live tracking completion and recovered-rating recovery paths, so end-of-flow messaging cannot drift between those branches

Pass 9 deferred by design:

- tokenized public live `Share ETA` route still requires backend-issued public tracking tokens and validation that do not exist in this repo
- trusted-contact handoff remains deferred until the sharing/token model is defined
- Zustand migration remains deferred because the reducer/store boundary is now explicit and there is not yet evidence that subscription strain justifies a second state system

## Post-Runtime Migration Program

The runtime plan is complete through Pass 9.

Passes 10+ continue from this exact boundary. They do not reopen the runtime plan piecemeal; they extend it into navigation ownership, modal migration, cross-surface parity, and platform inclusiveness.

Core rules for Pass 10 onward:

- `/map` remains the authenticated primary surface
- legacy screens are not deleted first; they become compatibility bridges until their `/map` owners are proven
- mini profile moves immediately after navigation ownership
- visits and visit details move after the mini profile handoff and ahead of profile restructuring
- platform inclusiveness is required work, not a polish afterthought
- layout may adapt by platform, but runtime truth, action semantics, recovery, and state meaning must remain identical

### Pass 10. Navigation Ownership And Legacy Compatibility

Primary target:

- move authenticated home ownership to `/map` while keeping legacy routes alive as compatibility surfaces

Scope:

- make `app/(user)/index.js` route to `MapScreen` as authenticated home
- flatten `app/(user)/_layout.js` ownership toward a stack-led structure
- keep `app/(user)/(tabs)` and legacy stack pages available only as compatibility entry points until replacement parity is proven
- add explicit redirects/bridges from legacy entry points into canonical `/map` states where appropriate
- define which surfaces remain true routes and which surfaces become `/map` modal or sheet owners

Done when:

- authenticated startup lands on `/map`
- no existing legacy entry point hard-breaks
- compatibility routes forward users into the new owners without losing state or causing route loops

Pass 10 implemented:

- [`app/(user)/index.js`](../../../app/(user)/index.js) now renders `MapScreen` as the authenticated home
- [`app/(user)/_layout.js`](../../../app/(user)/_layout.js) now includes the authenticated index route while keeping `(tabs)` and `(stacks)` as compatibility routes
- [`app/(user)/(tabs)/_layout.js`](../../../app/(user)/(tabs)/_layout.js) no longer mounts a bottom-tab navigator; it is a stack-only compatibility shell
- [`app/(user)/(tabs)/index.js`](../../../app/(user)/(tabs)/index.js) is now a compatibility map bridge instead of owning the legacy home surface
- [`app/(user)/(stacks)/visits.js`](../../../app/(user)/(stacks)/visits.js) is the canonical route-owned Visits surface
- `navigateToVisits` now targets `/(user)/(stacks)/visits`; legacy tab visit paths remain compatibility-only
- authenticated redirects in [`app/_layout.js`](../../../app/_layout.js), reset-password completion, and complete-profile completion now point to `/(user)` as the primary home

Pass 10 proven:

- legacy tab routes still exist
- old home-tab entry no longer owns primary startup
- fallback navigation uses `ROUTES.USER_HOME`
- bottom-tab rendering cannot be triggered by the legacy tab group

### Pass 11. Mini Profile Control Panel

Primary target:

- replace the current mini profile with a grouped high-frequency control panel for authenticated users
- use [`MAP_MINI_PROFILE_HANDOFF_V1.md`](./MAP_MINI_PROFILE_HANDOFF_V1.md) as the design contract for this surface

Scope:

- implement grouped sections inside `MiniProfileModal.jsx`
  - Care: `Recent Visits`
  - Account: `Profile`
  - Essentials: `Payment`, `Emergency Contacts`
  - System: `Settings`
- keep the authenticated mini profile as a window-like control panel:
  - avatar, name, and email as the calm top identity block
  - grouped shortcuts only, not a long management page
  - no notifications in this surface
- move notifications out of the mini profile and into Settings
- preserve the shared `MapModalShell` contract across iOS, Android, web mobile, and web desktop
- keep the control panel map-contextual and lightweight instead of turning it into a second "More" page

Done when:

- mini profile feels like a fast control surface, not a dumping ground
- grouped navigation remains stable across device classes
- authenticated users can reach visits, profile, payment, contacts, and settings from `/map` without legacy tab dependence

Pass 11 implemented:

- [`components/emergency/MiniProfileModal.jsx`](../../../components/emergency/MiniProfileModal.jsx) now uses the locked window-style control-panel layout:
  - top identity block
  - resilient `What's your name?` null-state copy
  - grouped shortcut rows
  - orb icon wrappers
  - right-side badges
  - explicit press feedback
  - low-priority sign-out affordance
- [`screens/MapScreen.jsx`](../../../screens/MapScreen.jsx) now lets mini profile open the map-owned recent-visits modal instead of routing through the legacy visits tab first

Pass 11 proven:

- mini profile no longer renders the old visit-stats / medical-passport layout
- notifications are not present in the mini profile
- recent visits, profile, payment, emergency contacts, settings, and sign out are reachable without bottom-tab dependence

Active request concurrency hardening added during Pass 11:

- invariant: a user may have at most one unresolved ambulance request and at most one unresolved bed request; an ambulance and bed may coexist because they are separate service families
- `pending_approval` is now treated as active, not as a pre-active draft
- client orchestration now checks `activeAmbulanceTrip`, `activeBedBooking`, and `pendingApproval` before starting a new request
- `emergencyRequestsService.create` performs a Supabase preflight before calling `create_emergency_v4`, so stale `/map`, legacy stack, and local fallback paths share the same guard
- migration `20260423000100_active_request_concurrency_guard.sql` recreates the database partial unique indexes so `pending_approval`, `in_progress`, `accepted`, and `arrived` are all protected per user/service type
- duplicate active rows must be resolved before that migration can install the guard; the migration intentionally fails loudly instead of silently cancelling medical requests

### Pass 12. Visits Migration

Primary target:

- promote Visits and Visit Details into `/map` after the mini profile control panel and before profile/settings restructuring

Scope:

- keep visits simple and map-owned first:
  - use `MapRecentVisitsModal` as the primary recent-visits owner
  - promote `MapVisitDetailsModal` as the canonical visit-detail surface on `/map`
  - keep legacy `VisitsScreen` and visit-details routes as compatibility stack surfaces during migration, not as primary owners
- convert the current visit-details route behavior into a map-owned detail modal with canonical request/visit identity
- make visit side effects explicit and shared:
  - visit creation from emergency actions
  - visit lifecycle updates
  - rating recovery linkage
  - reopen/recovery from persisted state
  - call clinic
  - book again
  - share
- add visits back into care discovery in a concise way:
  - add `Book a Visit` as the user-facing choose-care label
  - allow recent visits to appear in `explore_intent` after the choose-hospital section when visit history exists
- ensure visit read/write state does not drift between legacy visits screens and `/map` modals during the compatibility period

Done when:

- users can open recent visits from `/map`
- tapping a visit opens canonical visit details on `/map`
- recent visits can be surfaced contextually inside `explore_intent` when useful
- visit side effects and lifecycle truth are shared across legacy and `/map` owners
- standalone visit screens are no longer primary owners even if they still exist as legacy bridges

### Pass 13. Profile And Settings Hub Restructure

Primary target:

- reorganize the true route-owned hubs after visits are already migrated

Scope:

- keep `ProfileScreen.jsx` as the Identity Hub:
  - Personal
  - Medical
  - Coverage
  - Emergency
- keep `SettingsScreen.jsx` as the System Hub:
  - App Behavior
  - Notifications
  - Support
- ensure these remain stack-owned routes across all platforms even if desktop presentation uses wider layouts or panel-like composition

Done when:

- profile and settings are no longer legacy overflow pages
- notification controls live only in settings
- no data previously reachable through the old more/profile sprawl becomes orphaned

### Pass 14. Platform Inclusiveness And Viewport Propagation

Primary target:

- push the new ownership model cleanly across iOS, Android, web mobile, and web desktop

Required platform rules:

- same runtime behavior and user intent flow across platforms
- map remains persistent and dominant unless a true blocking modal is required
- profile/settings remain stack-owned routes on all platforms
- mini profile, visits, and care-selection style surfaces remain modal/sheet-owned on all platforms
- no platform-specific alternate navigation system
- persistence and recovery must use the same storage and backend-truth contracts on every platform
- no platform may rely on background timers continuing
- state must reconstruct from persisted timestamps and backend truth

Scope:

- modal adaptation:
  - iOS/Android: bottom sheet or native-feeling modal with swipe-to-dismiss where valid
  - web mobile: bottom sheet or full-height modal depending on viewport
  - web desktop: centered modal or side panel, not a fake mobile sheet
- viewport propagation:
  - panel/sheet padding
  - header lane placement
  - map control offsets
  - modal-vs-drawer rules
  - content max-width contracts
- interaction normalization:
  - swipe, drag, wheel, keyboard, escape, back button, click-outside
- feedback surfaces:
  - native toast defaults to compact bottom snackbar behavior
  - web mobile toast uses fixed viewport positioning with visible-viewport insets
  - web desktop toast uses a fixed top-right rail with bounded width and a z-index above sheets/modals
  - web toast width must be computed from available horizontal space after left and right viewport insets are applied
  - no toast implementation may rely on a mobile absolute overlay inside a constrained web container

Done when:

- hierarchy, actions, semantics, and state meaning are identical across supported platforms
- only layout and input affordances adapt

### Pass 15. Legacy Surface De-Primarying

Primary target:

- make legacy screens clearly secondary without deleting them prematurely

Scope:

- remove bottom-tab and more-screen ownership from primary navigation once `/map`, visits, mini profile, profile, and settings are proven
- mark legacy visits/more/tab surfaces as fallback or bridge-only
- keep compatibility wrappers while references still exist
- only retire a legacy owner after:
  - feature parity
  - entry-point parity
  - recovery parity
  - redirect coverage

Done when:

- primary user journeys no longer depend on legacy navigation ownership
- legacy routes exist only as safe compatibility paths until final cleanup

## Success Metric

This plan is succeeding if each completed pass makes the next pass smaller and clearer.

It is failing if:

- new features land in the current monoliths before extraction
- bed and platform parity start before ambulance-only signoff
- a second store layer appears before the existing reducer boundary is fully used

## Live Web Runtime Note - 2026-04-22

Scope:

- browser-tested `/map` ambulance path through explore, ambulance decision, commit details, OTP review auth, commit payment, tracking mount, map/tracking toggle, tracking triage entry, tracking triage close, arrival confirmation, completion, rating modal, rating skip, and cleanup
- browser-tested signed-in bed path through explore, bed decision, commit payment, cash booking, bed tracking mount, cancel booking, and cleanup

Proven:

- `support@ivisit.ng` + review OTP `123456` can progress from `COMMIT_DETAILS` to `COMMIT_PAYMENT`
- cash payment can create the emergency request and mount `TRACKING`
- tracking header `Return to map` and `Return to tracking` preserve the active request state
- tracking `My Information` opens the deterministic six-step triage sheet and closes back to tracking
- arrived ambulance requests expose `Confirm Arrival`, then switch the sheet and global active-session header to `Complete`
- `Complete Request` opens the transport rating modal, and `Skip` clears the modal and active tracking UI back to explore
- after ambulance cleanup, bed booking can start from explore and create a new active bed tracking session
- bed tracking shows reserved state with payment-derived request id, hospital context, ETA metrics, `My Information`, `Share ETA`, and `Cancel Booking`
- `Cancel Booking` clears the active bed session back to explore on web

Regression found:

- tracking mount produced repeated `Maximum update depth exceeded` errors on web because the active-session header effect rewrote semantically identical header state and forced an app-level render loop
- ambulance animation had no run-token ownership guard, so route/timeline restarts could leave stale timer callbacks alive
- after confirming arrival, the sheet showed `Complete` but the global active-session header still showed `Arrived`

Fix applied:

- `HeaderStateProvider` now treats equivalent normalized header writes as no-ops
- `useAmbulanceAnimation` now uses an animation generation token plus coordinate/heading equality guards
- `MapStageBodyScroll` skips the Android-only `GestureDetector` wrapper on web
- active-session header status now resolves `canCompleteAmbulance` as `Complete` while preserving `canConfirmArrival` as `Arrived`
- active-session header ownership is now phase-bounded in `useMapExploreFlow`, so non-tracking overlays and modal states do not inherit tracking-header controls by accident

Remaining:

- one web dev-only `collapsable={false}` console warning still comes from upstream navigation/RNGH internals, not the `/map` runtime loop
- rating submit, reserve-bed-from-tracking while ambulance is active, bed completion/rating, and long-session route adherence still need device validation
