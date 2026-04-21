# Map Runtime Pass Plan (v1)

> Status: Active execution plan
> Scope: `/map`
> Purpose: define the next implementation passes in order, with a target for each pass and a clear stop condition before the next pass begins

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

The next pass is **Pass 1. Runtime Boundary Cleanup**.

Why this is next:

- current files are too large for safe continued iteration
- ambulance-only flow is not signed off yet
- platform parity now would multiply unstable code
- the reducer-backed store already exists, so we should use the structure we have before introducing another state layer

## Success Metric

This plan is succeeding if each completed pass makes the next pass smaller and clearer.

It is failing if:

- new features land in the current monoliths before extraction
- bed and platform parity start before ambulance-only signoff
- a second store layer appears before the existing reducer boundary is fully used
