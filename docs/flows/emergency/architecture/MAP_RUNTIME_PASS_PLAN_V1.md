# Map Runtime Pass Plan (v1)

> Status: Active execution plan
> Scope: `/map`
> Purpose: define the next implementation passes in order, with a target for each pass and a clear stop condition before the next pass begins

## Execution Status

- Pass 1: complete
- Pass 2: complete
- Pass 3: complete
- Pass 4: in progress

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

Required checks:

- visual hierarchy
- tone balance for delayed/lost states
- motion continuity
- button states
- hero card information clarity
- no repeated or explanatory copy drift

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

Done when:

- bed-only runtime is not a second-class path
- shared commit modules support bed safely

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

Done when:

- combined flow no longer depends on ambulance-only assumptions
- bed-after-ambulance path is stable

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

Done when:

- the same runtime feels deliberate across the supported device matrix

Unlocks:

- final product hardening instead of one-platform correctness

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

## Immediate Next Pass

The next pass focus is still **Pass 4. Ambulance Functional Signoff**.

Why this is next:

- the structural work is done through Pass 3
- the remaining risk is now behavioral truth, not file shape
- ETA/reload stability, completion cleanup, and tracking edge cases need real runtime verification before UI signoff
- Pass 5 should not begin until the ambulance-only runtime stops regressing under reopen/recovery paths

## Success Metric

This plan is succeeding if each completed pass makes the next pass smaller and clearer.

It is failing if:

- new features land in the current monoliths before extraction
- bed and platform parity start before ambulance-only signoff
- a second store layer appears before the existing reducer boundary is fully used
