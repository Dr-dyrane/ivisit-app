---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Tracking Map Fix Plan

> Built from the evidence modules in this audit pass. This is an implementation
> plan, not new runtime evidence. The full preserved audit remains in
> `00-full-audit-preserved.md`.

> Audit gate: source induction and adversarial validation are complete for the
> mapped tracking-map scope. This plan is now actionable, but fixes should still
> preserve the narrowed conclusions in `08-adversarial-validation.md`.

## Fix Order

| Slice | Fix                             | Why first                                                                                 | Primary modules | Status  |
| ----- | ------------------------------- | ----------------------------------------------------------------------------------------- | --------------- | ------- |
| 1     | Lifecycle-gated live chrome     | Prevents completed, cancelled, or rating-preserved requests from keeping active UI alive. | 04, 05, 06      | planned |
| 2     | Active hospital resolver        | Stops stale sheet payloads from contradicting active request destination truth.           | 02, 04, 06      | planned |
| 3     | Header/sheet stage parity       | Makes compact header, hero, and CTA copy tell the same stage story.                       | 02, 04, 06      | planned |
| 4     | History/detail resume identity  | Prevents visit detail resume from opening the wrong current trip.                         | 05, 06          | planned |
| 5     | Action feedback and mid-actions | Ensures invalid or failed user actions show immediate visible feedback.                   | 04, 06          | planned |
| 6     | Companion action timing         | Keeps secondary add-ons from competing with arrival, check-in, or completion moments.     | 04, 06          | planned |
| 7     | Route request-key parity        | Keeps ETA/progress attached to the active request despite id/display-id aliasing.         | 04, 06          | planned |
| 8     | Display id label priority       | Protects human-facing request labels without changing mutation keys.                      | 02, 04, 06      | planned |
| 9     | Modal gate naming/consolidation | Makes header, FAB, recovery, and layout suppression intentional instead of incidental.    | 05, 06          | planned |
| 10    | Runtime proof pass              | Converts code-mapped conclusions into device-observed proof.                              | all             | planned |

## Slice 1 - Lifecycle-Gated Live Chrome

Goal: derive one live tracking predicate for header and sheet visibility, likely
equivalent to `Boolean(trackingRequestKey) && hasActiveTrip`, while preserving
optimistic payment-to-tracking entry.

Boundary: this slice is about live chrome lifecycle only. It must not be renamed
or implemented as a full tracking-ready predicate unless the stronger readiness
contract is separately proven: request id, hospital id, active status, route or
ETA seed, pickup/patient context when available, and responder or explicit
responder-hydrating truth.

Evidence:

- Tracking auto-open already considers `hasActiveTrip`, but close/header logic can
  still be request-key-gated.
- Terminal completion preserves trip context for rating, so request-key-only
  visibility is unsafe.
- Rating modal should keep terminal context, but live tracking chrome should not
  reopen after skip, submit, or close.

Likely files:

- `hooks/map/exploreFlow/useMapTracking.js`
- `hooks/map/exploreFlow/useMapTrackingHeader.js`
- `hooks/map/exploreFlow/useMapExploreFlow.js`
- `screens/MapScreen.jsx`

Acceptance checks:

- Pending approval still shows pending/preserved chrome that honestly reflects
  approval state.
- Accepted or in-progress active request with `hasActiveTrip` true shows tracking
  sheet and floating header.
- Completed, cancelled, or rating lifecycle false hides live tracking sheet/header
  even if terminal trip context remains preserved.
- Rating modal remains visible with terminal context.
- Contact Dispatch open/close does not resurrect stale tracking header state.

Runtime proof:

- Complete ambulance trip, then skip rating.
- Complete ambulance trip, then submit rating.
- Complete bed visit.
- Cancel active request.
- Receive staff terminal update while tracking is open.

## Slice 2 - Active Hospital Resolver

Goal: create or centralize a canonical active-hospital resolver where active
request `hospitalId` lookup wins. Payload hospital data may fill a shell only
when there is no active hospital id, or when it matches the active id.

Evidence:

- Active map request id resolution is stronger than object resolution.
- Several consumers still allow `sheetPayload.hospital`, `preferredHospital`, or
  payload hospital objects to outrank active request lookup results.
- The same request can render one hospital in the sheet and another in route,
  focus, or provider metadata.

Likely files:

- `components/map/core/mapActiveRequestModel.js`
- `hooks/map/exploreFlow/useMapTracking.js`
- `components/map/views/tracking/mapTracking.derived.js`
- `hooks/map/shell/useMapFocusedState.js`
- `components/map/surfaces/MapSheetOrchestrator.jsx`

Acceptance checks:

- Stale `sheetPayload.hospital` cannot override an active request hospital id.
- Map focus, hero title, route destination, and provider label agree.
- Unknown active hospital id falls back gracefully without crashing.
- Payload hospital still works before the active request is hydrated.

## Slice 3 - Header/Sheet Stage Parity

Goal: feed the header from the same stage semantics as the tracking sheet, or
from a normalized projection that intentionally maps every tracking stage.

Evidence:

- Header presentation derives from active session status/route fields while sheet
  copy derives from tracking snapshot/stage/action eligibility.
- `dispatch_confirmed`, no-responder ETA, responder-without-movement, and arrival
  states can be valid data but contradictory UI meaning.

Likely files:

- `components/map/core/mapActiveSessionPresentation.js`
- `hooks/map/exploreFlow/useMapTrackingHeader.js`
- `components/map/views/tracking/mapTracking.stage.js`
- `components/map/views/tracking/mapTracking.hero.js`
- `components/map/views/tracking/mapTracking.model.js`

Acceptance checks:

- Assigning/preparing states do not appear as en route in the compact header.
- `dispatch_confirmed`, `en_route`, `approaching`, `arrived`, and terminal stages
  have matching header, hero, and CTA semantics.
- No-responder ETA is represented as ETA/pending dispatch, not responder travel.
- Arrival/check-in stages prefer action context over broad backend status labels.

## Slice 4 - History Detail Resume Identity

Goal: require selected visit/detail identity to match the current active request
before `openTracking()` can run from a history or visit detail surface.

Evidence:

- Row selection is selected-item aware.
- The primary detail CTA can still be action-label driven with a global active
  trip guard.
- History active keys are proposals, and `rating_pending` can appear in active
  grouping.

Likely files:

- `hooks/map/shell/useMapShell.js`
- `hooks/map/history/useMapHistoryFlow.js`
- `components/map/history/history.presentation.js`
- `components/map/surfaces/visitDetail/useMapVisitDetailModel.js`

Acceptance checks:

- Inactive history detail cannot resume an unrelated current trip.
- Route-opened visit detail cannot resume the wrong active request.
- Selected active request can still resume tracking.
- Rating-pending records route to rating/recovery behavior, not live tracking.

## Slice 5 - Action Feedback And Mid-Action Disable

Goal: every tracking action that can fail must give immediate visible feedback,
and every button must honor loading/disabled state before firing.

Evidence:

- Completion paths have stronger toast semantics than arrival/check-in/cancel.
- Some controller paths can return `{ ok: false }` without `runBusyAction()`
  surfacing the reason.
- Mid actions need the same interaction feedback standard as bottom CTAs.

Likely files:

- `components/map/views/tracking/useMapTrackingController.js`
- `components/map/views/tracking/mapTracking.model.js`
- `components/map/views/tracking/parts/MapTrackingParts.jsx`
- `components/map/views/tracking/mapTracking.actions.js`

Acceptance checks:

- Invalid arrival/check-in/cancel attempt shows a contextual toast.
- Failed mutation leaves local state intact.
- Repeated taps during pending action are blocked.
- Loading state is visible on primary and mid-action controls.

## Slice 6 - Companion Action Timing

Goal: companion actions must respect the primary action moment. Reserve bed,
request transport, or other add-ons should not compete with arrival, check-in,
or completion unless explicitly allowed by product policy.

Evidence:

- Companion policy is broad and does not consume primary action eligibility.
- Mid actions are capped by sheet snap state and priority, so poorly timed
  secondary actions can hide more important next steps.

Likely files:

- `components/map/views/tracking/mapTracking.actions.js`
- `components/map/views/tracking/useMapTrackingController.js`
- `components/map/views/tracking/mapTracking.model.js`

Acceptance checks:

- Arrival/check-in/complete moments own the visible action hierarchy.
- Companion actions remain available in safe active travel states.
- Half-snap action list does not hide urgent primary-adjacent work.

## Slice 7 - Route Request-Key Parity

Goal: route and ETA state must match the active request through a canonical key
or explicit alias set, without leaking route information across requests.

Evidence:

- Route callbacks can lack request id context.
- Sync code stamps current active key, but render-time comparison can still miss
  equivalent id/requestId/displayId shapes.

Likely files:

- `hooks/map/tracking/useMapTrackingSync.js`
- `components/map/views/tracking/useMapTrackingRuntime.js`
- `components/map/FullScreenEmergencyMap.jsx`
- `components/map/views/tracking/mapTracking.derived.js`

Acceptance checks:

- ETA/progress appears when the same request is represented by id, request id, or
  display id aliases.
- ETA/progress does not appear for a different active request.
- Request swap clears or rekeys stale route state.

## Slice 8 - Display Id Label Priority

Goal: human-facing labels prefer real display ids from aggregate, raw, pending,
or hydrated request records before any formatted UUID fallback.

Evidence:

- The formatter intentionally masks UUIDs as `REQ-last6`.
- The risk is fallback priority, not UUID mutation usage.

Likely files:

- `components/map/views/tracking/mapTracking.derived.js`
- `components/map/core/mapActiveRequestModel.js`
- `services/emergencyRequestsService.js`

Acceptance checks:

- Real `display_id` appears when available.
- Synthetic `REQ-last6` appears only as a last-resort display fallback.
- Mutations, chat rooms, realtime filters, and route keys still use canonical
  request identity, not display labels.

## Slice 9 - Modal Gate Naming And Consolidation

Goal: split or consolidate modal gates by intent so header, FAB, recovered
rating, and layout suppression do not accidentally share mismatched meanings.

Evidence:

- Explore flow and shell flow include different modal sets.
- Contact Dispatch is UI-only but participates in some header/layout suppression.
- Tracking rating and recovered rating have different ownership paths.

Likely files:

- `hooks/map/exploreFlow/useMapExploreFlow.js`
- `hooks/map/shell/useMapShell.js`
- `hooks/map/history/useMapHistoryFlow.js`
- `components/map/shell/MapModalOrchestrator.jsx`
- `screens/MapScreen.jsx`

Acceptance checks:

- Header-blocking, recovery-blocking, and layout-blocking modal sets are named by
  behavior.
- Contact Dispatch open/close does not change active tracking identity.
- Recovered rating can still open when appropriate and does not fight tracking
  rating ownership.

## Slice 10 - Runtime Proof Pass

Goal: after code fixes, run a device or browser-backed proof pass that exercises
the stories the code audit cannot prove alone.

| Scenario                              | Expected proof                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Cash ambulance approval, no responder | Pending/preparing copy; no fake en-route header.                              |
| Active accepted/in-progress with ETA  | Header, hero, CTA, route, and ETA agree.                                      |
| No responder plus ETA                 | ETA shown without implying responder movement.                                |
| Responder assigned, no movement       | Dispatch-confirmed/preparing copy stays honest.                               |
| Stale telemetry with route            | Route does not override lifecycle/action truth.                               |
| Arrival failure and success           | Failure toast, state preserved; success advances stage.                       |
| Complete ambulance to rating          | Live chrome hides; rating opens; skip/submit clears terminal state correctly. |
| Bed ready/check-in/complete           | Bed-capacity state and CTA semantics stay aligned.                            |
| Contact Dispatch open/send/close      | Chat realtime works; ambulance route/header state does not drift.             |
| Inactive history detail resume        | Detail does not open unrelated active tracking.                               |
| Route-opened visit detail resume      | Detail either matches active request or disables resume.                      |
| Stale sheet payload hospital          | Active request hospital wins across sheet, header, route, and focused map.    |

## Implementation Rule

- Fix one slice at a time.
- After each slice, update the relevant evidence module and edge-case status.
- Do not delete `00-full-audit-preserved.md`.
- Keep mutation identity, display labels, route keys, and modal ownership
  documented separately.
- A slice is not complete until its acceptance checks are either verified or
  explicitly marked as blocked.
