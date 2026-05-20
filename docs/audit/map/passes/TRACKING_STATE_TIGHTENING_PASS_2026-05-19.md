# Tracking State Tightening Pass

Date: 2026-05-19
Target release: iVisit 1.0.6 open-testing candidate
Status: Complete
Owner: Map runtime / emergency tracking

## Source Of Truth And Audit Rule

Current emergency-flow truth starts at:

- `docs/flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`

Supporting permanent contracts:

- `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
- `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md`
- `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`

This pass is the evidence log for tracking-state tightening. Use it to record findings, candidate patches, rejected theories, and verification results. Do not use this pass to rewrite the whole architecture at once.

Audit-first rule:

- no runtime fix should land from a local symptom alone
- first name the broken contract, owner layer, user-visible symptom, existing guard to preserve, and smallest safe patch
- if a strange implementation exists, check comments, git blame/history, and prior tracking lessons before changing it

## Problem Statement

Tracking is stable enough to use, but it is not yet clean enough to trust as the final 1.0.6 runtime. The visible symptom is the hero card sometimes feeling stuck in assignment language such as "Finding driver" even when the app has enough route or ETA signal to show that the ambulance flow is already moving.

The deeper issue is not copy. Tracking state is currently assembled from several partially overlapping sources:

- Supabase realtime / request status
- Zustand active trip and bed booking persistence
- XState lifecycle flags
- Jotai route and ephemeral UI atoms
- map route callbacks from `EmergencyLocationPreviewMap`
- derived view state in `mapTracking.derived.js`
- visual status state in `useMapTrackingStatus.js`
- final presentation logic inside `MapTrackingStageBase.jsx`

That layering is understandable, but the boundaries are still soft. When one layer updates before another, the sheet can briefly show the wrong stage, preserve stale ETA, animate a phase twice, or understate assignment progress.

The goal of this pass is to make tracking feel calm and correct from payment handoff through arrival, reload, completion, and rating recovery.

The demo emergency flow also needs to stay honest after cash auto-approval: the backend approval result, active-trip store, tracking sheet, and map overlay must all agree that a demo driver was assigned. When that assignment is missing or delayed, the ambulance sprite may fall back to a route/progress shell, but a valid animation should keep the sprite moving and heading along the polyline rather than pointing toward the user.

## Current Runtime Map

Primary files:

- `hooks/map/exploreFlow/useMapTracking.js`
  - Opens/closes the tracking sheet.
  - Auto-opens tracking after commit when `trackingRequestKey` and `hasActiveTrip` are true.

- `hooks/map/tracking/useMapTrackingSync.js`
  - Owns `trackingRouteInfoAtom`.
  - Preserves/patches route duration, route coordinates, `etaSeconds`, and `startedAt`.

- `components/map/views/tracking/useMapTrackingRuntime.js`
  - Combines active request, active trip, active bed booking, route info, timers, triage, progress, and action eligibility.

- `components/map/views/tracking/mapTracking.derived.js`
  - Builds display-facing state: hospital, responder, ETA, service label, telemetry warning, sheet title, tone.

- `hooks/map/exploreFlow/useMapTrackingStatus.js`
  - Owns visual status phase and Jotai animation/progress atoms.

- `components/map/views/tracking/MapTrackingStageBase.jsx`
  - Assembles sheet presentation and still owns some hero copy/state decisions.

- `components/map/views/tracking/parts/MapTrackingParts.jsx`
  - Renders top slot, hero, route card, details, CTAs.

## Current Risks

1. **State truth is spread across derivation and presentation**
   - `mapTracking.derived.js` decides tracking kind, ETA, responder, title tone.
   - `useMapTrackingStatus.js` independently decides visual phase.
   - `MapTrackingStageBase.jsx` still decides hero title/subtitle/meta.
   - Result: one request can have three slightly different interpretations of "where we are."

2. **Assignment vs en-route is underspecified**
   - A trip can have no responder object but still have ETA/route/progress.
   - The UI should not imply the app is still searching if dispatch is already committed.
   - The UI also should not show "en route" if all we have is an empty active shell.
   - Observed regression: top slot showed `Arrived` while the hero still showed `Ambulance en route` with `Dispatch confirmed` and the `Confirm Arrival` CTA.

3. **Route/ETA fallback is too implicit**
   - `useMapTrackingSync.js` intentionally preserves `durationSec` to avoid blank ETA after open.
   - `useMapTrackingRuntime.js` also falls back from route atom to trip progress.
   - This fixed a real bug, but the contract is not explicit enough.

4. **Jotai visual atoms are not clearly request-key scoped**
   - Status phase, progress value, title animation, hero gradient, and CTA theme can survive remounts.
   - That is good within one trip but risky across trip identity changes unless reset rules are explicit.

5. **Raw status strings still leak into decisions**
   - XState flags exist, but raw `resolvedStatus` still drives several display and action branches.
   - This is a drift risk when backend statuses, bed statuses, and ambulance statuses are not identical.

6. **Completion and rating recovery remain sensitive**
   - Tracking completion clears active runtime state while rating can remain open.
   - Old lessons show repeated issues around tracking closing, recovered rating, and stale live request resume.

7. **Web and native rendering paths differ**
   - Web SVG/Animated compatibility already produced a `collapsable={false}` warning.
   - Tracking UI needs platform-safe rendering rules for top slot, hero progress, and animations.

## Product Contract

Tracking should answer five questions without contradiction:

1. What request is active?
2. What stage is the request in?
3. What is the best known ETA/progress?
4. Who or what is assigned?
5. What is the next safe action?

Visible states should be:

- `pending_approval`
- `assigning`
- `dispatch_confirmed`
- `en_route`
- `approaching`
- `arrived`
- `completed`
- `delayed`
- `lost`
- `idle`

These are presentation states. They should be derived from a canonical tracking snapshot, not hand-built in each component.

## Target Architecture

Introduce a single derived tracking snapshot:

```text
server/cache/persisted trip + route atom + machine flags
  -> buildTrackingRuntimeSnapshot()
    -> action model
    -> view model
    -> visual model
    -> sheet presentation
```

Recommended files:

```text
components/map/views/tracking/
  mapTracking.snapshot.js
  mapTracking.stage.js
  mapTracking.actions.js
  mapTracking.hero.js
  mapTracking.tests.js
```

`MapTrackingStageBase.jsx` should consume a ready hero model instead of deciding assignment/en-route language inline.

## Pass Tracker

### TS-0 — Baseline Audit

Status: Complete
Risk: Low

Tasks:

- Trace payment success -> tracking open.
- Trace active trip reload -> tracking open.
- Trace ambulance only, bed only, ambulance + bed.
- Trace no responder, responder assigned, ETA only, route only, stale telemetry, lost telemetry.
- Record current copy for hero, top slot, route card, CTAs.

Deliverable:

- Add a compact truth table to this document or a sibling validation report.

Acceptance:

- We know every input combination that can show "Assigning driver", "Ambulance en route", "Arrived", and "Complete".

#### TS-0 Findings So Far

Audit date: 2026-05-19

Contract under review:

```text
payment approval result
  -> request completion payload
  -> Zustand active trip / pending approval
  -> XState lifecycle
  -> active map request
  -> tracking sheet
  -> route/telemetry animation
```

1. **Cash approval handoff can lose the assigned responder if it uses the initiation payload**
   - Evidence: `components/map/views/commitPayment/useMapCommitPaymentController.js` cash auto-approval previously completed the request from the pre-approval initiation shape, while assignment can happen after approval.
   - User-visible symptom: tracking opens with a valid request, but assignment language can remain generic because `ambulanceId` / responder fields were not included in the completion payload.
   - Guard to preserve: payment success should still acknowledge immediately and open tracking from the commit path.
   - Candidate patch already present in the worktree: use the hydrated approval result when building the completion payload.

2. **The edge approval function must return a tracking-ready request, not only an approval acknowledgement**
   - Evidence: `supabase/functions/demo-approve-cash-payment/index.ts` now has candidate hydration/fallback code around `hydrateApprovedRequest`, `buildApprovalResult`, and `auto_assign_ambulance`.
   - Contract: if cash approval succeeds for an ambulance request, the returned `result` should include the best available `request`, `ambulance_id`, and responder identity fields.
   - Remaining audit point: verify trigger/RPC ordering under Supabase. The frontend should tolerate a short responder-hydrating state, but the edge function should not knowingly return stale pre-assignment data.

3. **Realtime is a patch stream, not a creation stream**
   - Evidence: `hooks/emergency/useEmergencyRealtime.js` only merges ambulance events when `prev` exists.
   - Contract: creating the active trip must come from request completion, active-trip query hydration, or an explicit pending-to-active transition. Realtime cannot rescue an empty store by itself.
   - User-visible risk: if completion payload is stale and query hydration is delayed, tracking can open from lifecycle/request identity before responder fields arrive.
   - Applied fix: `hooks/emergency/useRequestFlow.js` now allows `handleRequestComplete()` to proceed when the active pending approval belongs to the same request, and `hooks/emergency/useEmergencyActions.js` uses the existing `transitionPendingToActive()` store action when that same pending request becomes the ambulance trip. This preserves blockers for unrelated active requests while removing the pending -> active split-write window.

4. **Active-trip query currently treats `pending_approval` as an active ambulance candidate**
   - Evidence: `hooks/emergency/useActiveTripQuery.js` includes `pending_approval` in `isActiveStatus`, then chooses `activeAmbulance` before separately deriving `pendingMatch`.
   - Why this may exist: the map needs an active request identity during approval wait, and XState intentionally counts pending approval in `hasActiveTrip`.
   - Risk: `activeMapRequest` may prefer `activeAmbulanceTrip` over `pendingApproval`, so a pending cash request can look like a tracking trip before dispatch is truly assigned.
   - Do not change blindly: this likely protects the immediate post-payment sheet transition. Any fix should introduce an explicit `pending_approval`/`assigning` tracking snapshot instead of simply removing pending from active statuses.

5. **XState is hydration-gated, but active-trip query is not obviously store-hydration-gated**
   - Evidence: `hooks/emergency/useTripLifecycle.js` gates machine sync on `useStoreHydrated()`, while `hooks/emergency/useActiveTripQuery.js` starts its query with auth polling but no visible `enabled: hydrated`.
   - Existing guard: query reads previous trip via `useEmergencyTripStore.getState()` inside `queryFn`, which was added to avoid stale closed-over state.
   - Risk: on cold start, query and store hydration can still race on route/ETA identity unless the query always observes hydrated store state by the time it normalizes.
   - Next audit action: confirm whether this is benign in practice or add a query enable gate after measuring the current boot order.

6. **Tracking auto-open is identity + lifecycle gated, not tracking-ready gated**
   - Evidence: `hooks/map/exploreFlow/useMapTracking.js` opens when `trackingRequestKey` is present and `hasActiveTrip` is true.
   - Why this exists: it prevents the user from being stranded after commit while Zustand/XState settle.
   - Gap: it does not ask whether the active tracking snapshot has responder, route, ETA, or an explicit responder-hydrating state.
   - Target fix shape: keep the immediate open, but make the tracking stage model honest: `pending_approval`, `assigning`, `dispatch_confirmed`, `en_route`, `delayed`, `lost`.

7. **Route and ETA are intentionally preserved in Jotai, but the preservation rule is still too implicit**
   - Evidence: `hooks/map/tracking/useMapTrackingSync.js` preserves `durationSec` across tracking route resets and patches `etaSeconds`, `startedAt`, and `route` into the active trip.
   - Why this exists: previous lessons show wiping route duration caused `--` ETA and route callback deadlocks.
   - Risk: preservation is keyed mostly by active request transitions in the hook, not by a canonical tracking snapshot.
   - Next audit action: TS-3 should make `etaSource` and request-key ownership explicit before further cleanup.

8. **Demo responder heartbeat depends on resolving a demo-active hospital**
   - Evidence: `hooks/emergency/useEmergencyActions.js` returns early without `activeAmbulanceDemoHospital`, then uses a stored route or hospital-to-patient fallback to synthesize telemetry.
   - Candidate patch already present in the worktree: `hooks/emergency/useEmergencyHospitalSync.js` falls back from `availableHospitals` to raw `hospitals` before applying the demo-active check.
   - Contract: because the product treats this bootstrapped provider flow as real, the heartbeat should run for any active bootstrapped provider trip that has a known hospital and live-tracked status.

9. **Ambulance sprite heading should prefer route bearing when projected onto a route**
   - Evidence: `hooks/emergency/useAmbulanceAnimation.js` now has candidate route-first heading logic around initial heading, first animation frame, and live responder projection.
   - Contract: when the coordinate is snapped/projected to the polyline, the sprite should face along the polyline. Raw responder heading is only a fallback when no route projection exists.
   - User-visible risk: if route projection is lost, the sprite may appear to point toward the user instead of travelling along the path.

10. **Diagnostic logs exist in runtime actions**
    - Evidence: `hooks/emergency/useEmergencyActions.js` logs stack traces in `startAmbulanceTrip` and `stopAmbulanceTrip`.
    - This may be useful during the current audit, but should not ship as noisy production logging unless intentionally kept behind a debug gate.

11. **Contact Dispatch can fail from tracking if it receives a display id instead of the request UUID**
    - Evidence: `components/map/views/tracking/useMapTrackingController.js` opens Contact Dispatch from `activeAmbulanceTrip.requestId` / `activeBedBooking.requestId`, while `services/emergencyChatService.ensureRoomForRequest()` rejects anything that is not a valid UUID before calling `ensure_emergency_chat_room`.
    - User-visible symptom: demo tracking can show a Contact Dispatch connection error even though the emergency request and tracking flow are alive.
    - Candidate patch already present in the worktree: prefer `activeAmbulanceTrip.id` / `activeBedBooking.id` for Contact Dispatch room creation, falling back to `requestId` only if no row id exists.

12. **Contact Dispatch retry semantics were too eager after ensure-room failure**
    - Evidence: `components/map/communication/EmergencyContactDispatchModal.jsx` ensured a room whenever visible + request id + no room + not currently ensuring. After failure, that condition could become true again immediately.
    - User-visible symptom: a single invalid/transient failure can feel like a persistent connection-lost loop rather than a controlled retry state.
    - Candidate patch already present in the worktree: only run `ensureRoom()` while the chat lifecycle is in `ensuringRoom`; after error, wait for explicit Retry.

### TS-1 — Canonical Runtime Snapshot

Status: Complete
Risk: Medium

Tasks:

- Add `mapTracking.snapshot.js`.
- Normalize:
  - request id
  - request kind
  - request status
  - lifecycle phase
  - responder availability
  - route availability
  - ETA availability
  - progress availability
  - telemetry health
  - active bed companion state
- Make the snapshot pure and unit-testable.

Acceptance:

- `useMapTrackingRuntime.js` calls one snapshot builder before building display state.
- No component needs to inspect raw trip status to know the stage.

Implementation note:

- Added `components/map/views/tracking/mapTracking.snapshot.js` with a pure `buildTrackingRuntimeSnapshot()` and exported tracking stage constants.
- `components/map/views/tracking/useMapTrackingRuntime.js` now builds and returns `trackingSnapshot` without yet rewiring hero, top slot, or CTA presentation. This keeps the first slice observational and low blast-radius.
- Continued slice: `useMapTrackingStatus()` now accepts `trackingSnapshot` and uses `trackingSnapshot.trackingStage` as the visual phase before falling back to the legacy derivation.
- Continued slice: `mapTracking.presentation.js` now exports `buildTrackingHeroModel()` so hero title/subtitle/right-meta/avatar decisions can consume the same snapshot stage table.
- Continued slice: `MapTrackingStageBase.jsx` now passes `trackingSnapshot` into the status hook and hero model. Legacy hero variables remain as fallbacks while TS-2 finishes the full presentation cutover.
- Verification: `npx prettier --check components/map/views/tracking/MapTrackingStageBase.jsx components/map/views/tracking/mapTracking.presentation.js hooks/map/exploreFlow/useMapTrackingStatus.js`, `git diff --check -- components/map/views/tracking/MapTrackingStageBase.jsx components/map/views/tracking/mapTracking.presentation.js hooks/map/exploreFlow/useMapTrackingStatus.js`, and `npm run hardening:emergency-runtime-confidence-assert` passed.
- Continued handoff slice: `hooks/emergency/useRequestFlow.js` and `hooks/emergency/useEmergencyActions.js` now close the same-request pending approval -> active ambulance trip handoff using the atomic Zustand action. This implements the tracking lesson from `TRACKING_SHEET_LEARNINGS.md` section 2.2/2.12 without changing the payment sheet interaction.
- Verification: `npm run hardening:emergency-runtime-confidence-assert`, `npx prettier --check hooks/emergency/useRequestFlow.js hooks/emergency/useEmergencyActions.js components/map/views/tracking/MapTrackingStageBase.jsx components/map/views/tracking/mapTracking.presentation.js hooks/map/exploreFlow/useMapTrackingStatus.js`, `git diff --check -- hooks/emergency/useRequestFlow.js hooks/emergency/useEmergencyActions.js components/map/views/tracking/MapTrackingStageBase.jsx components/map/views/tracking/mapTracking.presentation.js hooks/map/exploreFlow/useMapTrackingStatus.js`, and `npm run build:web` passed after the handoff slice.

### TS-2 — Stage Taxonomy

Status: In progress
Risk: Medium

Tasks:

- Add `mapTracking.stage.js`.
- Map raw inputs into a single `trackingStage`:
  - `idle`
  - `pending_approval`
  - `assigning`
  - `dispatch_confirmed`
  - `en_route`
  - `approaching`
  - `arrived`
  - `completed`
  - `delayed`
  - `lost`
- Prefer machine flags over raw strings.
- Treat telemetry `lost`/`stale` as overlays unless the route is genuinely unavailable.

Acceptance:

- The hero, top slot, CTA color, and sheet title all consume the same `trackingStage`.

Implementation note:

- Added `components/map/views/tracking/mapTracking.stage.js` as the pure stage classifier and stage metadata table. `mapTracking.snapshot.js` now assembles runtime facts, calls the classifier, and returns `trackingStage`, `trackingStageGroup`, `visualPhase`, and `isTrackingReady`.
- `useMapTrackingRuntime.js` now passes trip progress into the snapshot so `approaching` comes from the same stage taxonomy instead of a separate hook threshold.
- `useMapTrackingStatus.js` now syncs Jotai status atoms from `trackingSnapshot.visualPhase`, and `atoms/mapScreenAtoms.js` documents the expanded visual-phase set.
- `mapTracking.presentation.js` now owns both `buildTrackingHeroModel()` and `buildTrackingHeaderModel()`. `MapTrackingStageBase.jsx` removed the legacy hero fallback tree and consumes those snapshot-backed models for the hero and top slot title.

### TS-3 — ETA And Route Contract

Status: Complete
Risk: High

Tasks:

- Document and enforce route truth order:
  1. active trip `etaSeconds` if valid
  2. live route atom `durationSec` if valid
  3. stored route coordinates if valid
  4. fallback display only, never fake progress
- Make `startedAt` immutable per request identity unless a new route is intentionally reconciled.
- Ensure preserved `durationSec` is keyed by request identity, not globally trusted forever.
- Add explicit `etaSource`: `trip`, `live_route`, `stored_route`, `fallback`, `none`.

Acceptance:

- Metro reload/app kill does not reset visible progress for the same request.
- A new request cannot inherit stale ETA from the previous request.

Implementation note:

- `trackingRouteInfoAtom` now carries `requestKey` and `routeSource` in addition to duration, distance, and coordinates.
- `mapTracking.timeline.js` includes route ownership in normalization/equality so two route snapshots with the same duration but different owners are not treated as equivalent.
- `useMapTrackingSync.js` scopes live route emissions to the active request, preserves duration only when the current atom owner matches that request, and ignores route duration/polyline when the atom belongs to a previous request. Reconciliation now writes `etaSource` from the scoped route source instead of the old ambiguous `map_route`.
- Follow-up review fix: `useMapTrackingSync.js` now returns the scoped route info to `MapScreen`, preventing the map route fallback from briefly rendering stale coordinates from a previous request when the new active trip has no stored route yet.
- `useMapTrackingRuntime.js` also scopes its direct route-atom fallback before using `durationSec` for progress or snapshot route info.
- `mapTracking.snapshot.js` normalizes ETA sources to `trip`, `live_route`, `stored_route`, `fallback`, or `none`; legacy `map_route` is read as `live_route`.

### TS-4 — Hero Model Extraction

Status: Complete
Risk: Low

Tasks:

- Add `mapTracking.hero.js`.
- Move hero title/subtitle/rightMeta/avatar logic out of `MapTrackingStageBase.jsx`.
- Encode the product copy contract:
  - `pending_approval`: "Awaiting approval"
  - `assigning`: "Assigning driver"
  - `dispatch_confirmed`: "Dispatch confirmed"
  - `en_route`: responder name or "Ambulance en route"
  - `approaching`: "Almost there"
  - `arrived`: "Driver arrived"
  - `completed`: "Visit complete"
  - bed states keep bed-specific copy
- Arrival and completion must outrank ETA/progress. If the top slot says `Arrived` or the `Confirm Arrival` CTA is visible, the hero cannot say `Ambulance en route`.
- Keep service label as support text, not the main stage when an active ambulance stage exists.

Acceptance:

- `MapTrackingStageBase.jsx` receives `heroModel` and does not branch on responder/ETA directly.

Implementation note:

- Added `components/map/views/tracking/mapTracking.hero.js` and moved hero/header copy models out of `MapTrackingStageBase.jsx` and `mapTracking.presentation.js`.
- `MapTrackingStageBase.jsx` now calls `buildTrackingHeroModel()` / `buildTrackingHeaderModel()` and passes the returned model fields directly into the hero card and top slot; it no longer owns the responder/ETA/stage copy tree.
- The model encodes the documented copy contract, including `approaching` -> "Almost there", arrival/completion outranking route/ETA, and bed states retaining bed-specific copy.
- Follow-up review fix: `dispatch_confirmed` no longer repeats "Dispatch confirmed" as both title and subtitle; the subtitle falls back to the service label while `en_route` keeps the dispatch-confirmed support copy.

### TS-5 — Action Eligibility Model

Status: Complete
Risk: Medium

Tasks:

- Add or extend `mapTracking.actions.js`.
- Centralize:
  - can mark ambulance arrived
  - can complete ambulance
  - can check in bed
  - can complete bed
  - can open triage
  - can add bed / ambulance from tracking
  - can cancel
- Align action state with `trackingStage`.
- Ensure every primary action has immediate pressed/loading feedback.

Acceptance:

- Action availability cannot disagree with hero/stage state.

Implementation note:

- Added `components/map/views/tracking/mapTracking.actions.js` with a pure `buildTrackingActionEligibility()` model keyed by `trackingSnapshot.trackingStage`.
- `useMapTrackingRuntime.js` now derives `shouldPromoteTriage`, arrival, completion, and bed action booleans through that model instead of assembling them from scattered raw/computed status checks.
- Added `buildTrackingActionSurfacePolicy()` so triage, Contact Dispatch, companion-service, and cancel surfaces are hidden when the current stage is idle, terminal, or pending as appropriate.
- Hardened `mapTracking.model.js` so hidden policies remove action handlers rather than rendering no-op buttons.
- Review correction: only `completed` is treated as terminal for action surfaces. `lost` and `delayed` remain recoverable tracking exception states, so Contact Dispatch and cancel remain available during a signal interruption.
- `MapTrackingStageBase.jsx` top-slot triage visibility and controller-driven header actions now consume the same action surface policy instead of bypassing it with raw request ids/callbacks.

### TS-6 — Request-Scoped UI Atoms

Status: Complete
Risk: Medium

Tasks:

- Key ephemeral atoms by request identity or reset them deterministically on request identity change.
- Scope:
  - `trackingStatusPhaseAtom`
  - `trackingProgressValueAtom`
  - `hasSheetTitleAnimatedAtom`
  - hero gradient / CTA theme derived atoms
- Keep within-trip remount preservation.
- Reset across new trip identity.

Acceptance:

- New trip never inherits old title animation, arrival phase, or progress.
- Same trip reload preserves meaningful state where intended.

Implementation note:

- Added `trackingVisualRequestKeyAtom` to the persisted tracking visualization bundle so status phase, progress, and title-animation state carry an explicit request owner.
- `useMapTrackingStatus.js` now derives a visual owner key from the canonical `trackingSnapshot` plus active trip/booking fallbacks. If the persisted owner differs from the current tracking request, the hook renders from the fresh snapshot-derived phase immediately, then claims the new owner and resets animation/progress state.
- Derived hero-gradient and CTA-theme helpers can now be evaluated against the effective request-scoped phase, preventing a one-render flash from a previous request's persisted phase.
- Contact Dispatch tracking-entry state was inspected during this pass. Its active request id already acts as the modal owner; broader chat atom cleanup remains outside this tracking-sheet TS-6 slice.

### TS-7 — Web/Native Render Hardening

Status: Complete
Risk: Low

Tasks:

- Keep web-safe SVG rendering for progress rings.
- Avoid native-only props leaking into DOM.
- Keep reduced-motion behavior consistent.
- Confirm large text does not clip hero, top slot, CTA group, route card, or bottom action.

Acceptance:

- No `collapsable` warning on web.
- No blank or overlapping tracking card on mobile large text.

Implementation note:

- Tracking hero, CTA, route-stop, and bottom-action text now use bounded font scaling with `adjustsFontSizeToFit`, minimum scales, and max font multipliers so large text is less likely to clip inside fixed tracking controls.
- The triage progress ring already uses a static `Circle` path on web and an animated circle only on native, preserving the web-safe SVG contract.
- Verification for this pass is recorded under TS-8/TS-9 with `git diff --check`, `npm run hardening:tracking-state-models`, and `npm run build:web`.

### TS-8 — Regression Harness

Status: Complete
Risk: Medium

Tasks:

- Add tests for pure builders:
  - snapshot builder
  - stage builder
  - hero model
  - ETA source selection
  - action model
- Add smoke cases:
  - no responder + no ETA -> assigning
  - no responder + ETA -> dispatch confirmed/en route
  - responder + ETA -> responder name
  - stale telemetry -> delayed overlay
  - lost telemetry -> lost overlay
  - arrived flag -> arrived
  - completed -> completion/rating path
  - bed booking ready -> bed ready

Acceptance:

- Tracking pass can be validated without relying only on device tapping.

Implementation note:

- The temporary `supabase/tests/scripts/assert_tracking_state_models.js` harness and `npm run hardening:tracking-state-models` script were removed after APK review. The product risk is runtime synchronization, not another package-level assertion script.
- Keep verification focused on live payment -> tracking handoff, sheet state updates without reload, Contact Dispatch interaction, and map sprite behavior.

### TS-9 — Rollout And Rollback

Status: Complete
Risk: Low

Tasks:

- Keep changes behind pure model extraction commits.
- Do not alter emergency business logic first.
- Do not rewrite `useAmbulanceAnimation`.
- Do not reintroduce 3D ambulance runtime.

Rollback:

- Revert hero model extraction to current inline hero logic.
- Keep sprite ambulance renderer untouched.
- Keep route atom preservation fix unless it is proven stale across new request identity.

Acceptance:

- If the pass regresses, tracking can return to the current stable sprite + sheet state without losing emergency dispatch functionality.

Implementation note:

- Runtime changes landed in small checkpoint commits:
  - `778f0dcc` - `Tighten emergency tracking stage actions`
  - `aa4e8e62` - `Scope tracking UI atoms by request`
- Final finishing slice keeps the sprite renderer untouched, adds only tracking text resilience plus pure-model assertions, and updates this pass record.
- Rollback preference is to revert the latest tracking-model/UI commits in reverse order while preserving any independently verified emergency dispatch/payment fixes.

### APK Review Follow-up â€” ETA/Arrival/CTA Consistency

Status: In Progress
Risk: Medium

Findings:

- APK showed ETA/tracking details updating only after Metro/app reload. That points to a stale payment/approval -> tracking snapshot handoff or a store/query synchronization gap, not a visual-only bug.
- Confirm Arrival could appear while the visual phase stayed `approaching`. The mismatch happened because action eligibility could read `canConfirmArrival` while the tracking snapshot did not promote the same request to visual `arrived`.
- Mid-snap CTAs were allowed to grow past the useful three-action hierarchy.
- Contact Dispatch uses `MapModalShell` but had no native keyboard-aware host offset.
- When tracking telemetry is uncertain, ambulance fallback must be hospital/route-start based. User/pickup-facing behavior is reserved for payment/pre-tracking preview.

Candidate patches:

- Tracking runtime now treats `canConfirmArrival`, computed arrived status, or canonical arrived state as one visual-arrival signal for snapshot and route progress.
- Complete Request no longer unlocks from visual arrival alone; it still requires actual arrival/confirmation state.
- Mid snap limits tracking CTAs to the top three by hierarchy, while expanded snap keeps all actions.
- Contact Dispatch opts into keyboard-aware modal positioning.
- Tracking ambulance fallback now prefers hospital/route start and route-flow heading when animation cannot safely advance.

## Implementation Order

Use this order without opening new side tracks. Contact Dispatch stays inside this lane only where it is entered from tracking or can break active tracking.

1. **Stabilize active dispatch handoff**
   - Finish TS-0 evidence for payment approval -> request completion -> active trip.
   - Verify hydrated cash approval payloads and card settlement payloads both carry the canonical request row id when available.
   - Keep Contact Dispatch request-id handling in this pass because it depends on the same row-id/display-id contract.

2. **Centralize tracking stage truth**
   - Continue TS-1 snapshot builder.
   - Complete TS-2 stage taxonomy inside the pure snapshot path.
   - Do not change hero copy from scattered call-sites until the snapshot stage table is complete.

3. **Consume the snapshot in presentation**
   - TS-4 hero model extraction.
   - Move hero title/subtitle/meta decisions behind the snapshot.
   - Keep sheet visuals intact; this is behavior tightening, not redesign.

4. **Harden ETA, route, heartbeat, and sprite direction**
   - TS-3 ETA/route contract hardening.
   - Verify heartbeat hospital fallback.
   - Keep ambulance sprite heading route-first when projection is route-derived.

5. **Normalize actions and transient UI state**
   - TS-5 action eligibility model.
   - TS-6 request-scoped UI atoms.
   - Confirm Contact Dispatch opens, retries, sends a quick action, receives demo reply, and does not disturb tracking behind the modal.

6. **Verification and rollout**
   - TS-7 web/native render sweep.
   - TS-8 tests and smoke matrix.
   - TS-9 rollout notes and rollback.

Interruption rule:

- New findings are logged under TS-0 unless they block the current pass.
- Do not begin another architecture cleanup while tracking remains unresolved.
- Do not change booking visit, Explore Care, docs cleanup, or unrelated provider discovery work during this pass.
- If a discovered issue belongs elsewhere, add one sentence to the relevant doc and continue this order.

## Non-Goals

- Do not redesign the tracking sheet visually.
- Do not change payment commit behavior.
- Do not move tracking out of the map-sheet runtime.
- Do not replace the sprite ambulance renderer.
- Do not add route navigation.
- Do not make Explore Care share emergency tracking state.

## Immediate Next Pass

Continue TS-1 and TS-2 from the current snapshot slice. The next runtime step is to complete the pure stage table, then route hero/top-slot decisions through that model. Keep the already found Contact Dispatch UUID/retry fix in verification scope, but do not expand Contact Dispatch beyond tracking-entry runtime QA.
