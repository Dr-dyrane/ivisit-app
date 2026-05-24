---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Adversarial Validation

> Purpose: defend the current code and try to disprove the audit. A finding only
> stays strong here if the source code still supports it after looking for
> existing guards, fallback paths, and prior fixes.

## Verdict Summary

| Audit claim                          | Adversarial verdict     | Result                                                                                                                  |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Lifecycle-gated live chrome          | Survives                | Auto-open is mostly gated, but header visibility and tracking close still have request-key-only paths.                  |
| Active hospital resolver             | Survives                | Id selection is stronger than object selection, but object selection still lets preferred/payload win.                  |
| Header/sheet stage parity            | Survives                | Header has useful action awareness, but non-terminal ambulance fallback still says `En Route`.                          |
| History/detail resume identity       | Survives, narrowed      | Row selection is defended; detail modal resume remains global `hasActiveTrip` plus `openTracking()`.                    |
| Action feedback and disabled states  | Partially survives      | Bottom action disabling exists; mid actions and `{ ok: false }` surfacing remain weaker.                                |
| Companion action timing              | Survives                | Current policy blocks idle/pending/terminal only, not arrival/check-in/complete substate.                               |
| Route request-key parity             | Downgraded              | The hook does contextual request stamping; the remaining risk is stale contextual callbacks, not alias.                 |
| Display id label priority            | Downgraded              | `activeMapRequest` already prefers record `displayId`; remaining risk is fallback priority hardening.                   |
| Rating close semantics               | Survives                | Skip/submit finalize; raw close only clears the atom.                                                                   |
| Modal gate mismatch                  | Survives as naming risk | The mismatch is intentional in places, but the current names do not expose those distinct meanings.                     |
| Live chrome vs tracking readiness    | Survives correction     | Written contracts explicitly say `requestId + hasActiveTrip` is not tracking-ready proof.                               |
| Runtime responder fallback truth     | Survives                | Trip start can enrich responder identity from broadly listed ambulances without explicit handoff assignment.            |
| Readiness chain field ownership      | Survives, narrowed      | Identity/hospital/status, pickup context, route/ETA, and assignment come from different producers.                      |
| Pickup coordinate versus label truth | Survives, narrowed      | Trip/request pickup coordinate is preserved, but route origin and rendered/share pickup copy read shell location truth. |
| New induction proof set              | Defended, survives      | The second pass narrows several findings but does not disprove the core source-induction results.                       |

## Fresh Adversarial Pass - Source Induction Claims

This pass starts from the position that the current code is probably more
careful than the audit implies. The audit claim only survives where the code
still leaves contradictory meaning possible after existing guards are credited.

| Induction claim                          | Best defense of current code                                                                                                                                                                                                                                                                                   | Result after defense                                                                                                                                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live chrome is not fully lifecycle-gated | `useMapTracking()` already requires `trackingRequestKey` and `hasActiveTrip` for normal auto-open, preserves an intentional commit-force path, and closes tracking when the request key disappears. The header also suppresses itself during expanded sheet and active modal states.                           | Survives, narrowed. The ordinary open path is defended, but `isHeaderVisible`, `useMapTrackingHeader().trackingHeaderVisible`, and the auto-close effect still accept a truthy request key without proving `hasActiveTrip`. The issue is stale chrome, not initial open.   |
| Pending/no-responder semantics overstate | The sheet stage resolver explicitly protects pending approval, assigns `ASSIGNING` for active ambulance states with no responder and no movement signal, and the hero can say `Assigning driver`. Route/ETA promotion can be read as useful logistics confidence rather than fake responder confidence.        | Survives, narrowed. The sheet/hero are largely defensible. The surviving defect is the floating header vocabulary collapsing active ambulance states to `En Route`, plus the unresolved product decision that route/ETA without responder may read as dispatch proof.      |
| Route/ETA can attach to wrong request    | `useMapTrackingSync()` stamps incoming route data with the current normalized request key, resets on request-key changes, seeds from stored trip ETA/route for same-request ambulance trips, scopes runtime reads by request key, and only patches the active ambulance trip when tracking is active.          | Survives, heavily narrowed. Cross-request reads are well defended. The remaining risk is contextual producer ownership: `EmergencyLocationPreviewMap` emits route data without request/hospital id, so a stale callback can be stamped as current if focus/origin drifted. |
| Terminal/rating cleanup is incomplete    | Active and pending cancel paths clean only after backend/visit writes; completion-to-rating intentionally defers store cleanup so the rating modal has visit/service context; skip and submit both resolve the visit/recovery claim and finalize local tracking state.                                         | Survives only for raw close semantics. The terminal flow is mostly defended. `closeRating()` still only clears the rating atom, and `MapModalOrchestrator` wires tracking modal close directly to it, so close is not equivalent to skip/submit/finalize.                  |
| Marker flicker means tracking truth bug  | Web markers and polylines are render adapters around Google Maps objects. Recreating a marker when coordinate/image/title/handler props change is a presentation lifecycle event, and `RouteLayer` sprite remounts are a visual implementation detail. None of this mutates backend, lifecycle, or trip store. | Downgraded. Marker/hospital/ambulance flicker is not evidence that backend tracking or Chrome geolocation truth is wrong. It remains a visual performance/stability finding, with one bridge: route callbacks can still feed route/ETA truth.                              |
| Runtime responder truth is fake          | `startAmbulanceTrip()` enriches trips from explicit assignment first, then by id/hospital/list fallback. That gives the UI a useful responder-like object while the request continues hydrating, and query hydration preserves richer same-request data rather than erasing it.                                | Survives as provenance, not falsehood. The code is allowed to show useful runtime responder information, but the audit must not treat `hasResponder` as proof that canonical backend assignment arrived in the payment handoff.                                            |
| Pickup truth split is always wrong       | Ambient current location is a legitimate live-device source for route recalculation, while `patientLocation` preserves the committed request coordinate. Removing pickup edits from tracking also reduced one obvious local-state lie.                                                                         | Survives as disharmony risk, not automatic bug. The source code intentionally has separate lanes; the audit should flag only places where copy/share/route claims request pickup while reading ambient shell location.                                                     |

Fresh-pass conclusion: the code is not sloppy. It has meaningful gates,
preservation logic, request-key scoping, and terminal cleanup protections. The
findings that remain are therefore narrower and more architectural: predicate
ownership, provenance, callback ownership, and visual lifecycle stability.

## Claims That Survived

### Lifecycle-Gated Live Chrome

Defense found:

- `useMapTracking()` auto-open requires `trackingRequestKey` and
  `hasActiveTrip`, except the intentional commit-force path.
- The hook comment accurately describes the auto-open guard.

Why the finding survives:

- `isHeaderVisible` in `useMapTracking()` is still computed from
  `trackingRequestKey` plus sheet phase, not `hasActiveTrip`.
- The close/suppress effect returns only when `!trackingRequestKey`; it does not
  close `TRACKING` when the lifecycle goes false while a key remains.
- `useMapTrackingHeader()` computes `trackingHeaderVisible` from
  `trackingRequestKey`, phase ownership, snap/layout, and modal state. It does
  not receive `hasActiveTrip`.

Narrowed fix: do not remove the commit optimism. Add a separately named live
chrome predicate for header/sheet visibility and cleanup, while preserving the
commit-origin path that opens an assigning/pending shell.

### Live Chrome Vs Tracking Readiness

Defense found:

- `useMapTracking()` is intentionally allowed to open an optimistic sheet after
  commit while the richer snapshot is still settling.
- The code already has a runtime snapshot and a stage table, so it is not using
  only one raw request key for every visual decision.

Why the correction survives:

- `EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md` explicitly says tracking-ready is
  stronger than `requestId + hasActiveTrip`.
- `MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` requires hospital id, active status,
  route or ETA seed, pickup/patient context when available, and responder or
  responder-hydrating truth in addition to request identity.
- Current `buildTrackingRuntimeSnapshot().isTrackingReady` is computed from
  request id plus stage metadata and does not carry all of those fields.

Narrowed conclusion: a lifecycle/session predicate may still be right for live
chrome visibility and terminal cleanup, but it is not the final readiness
predicate. The audit must keep those boundaries separate.

### Active Hospital Resolver

Defense found:

- `buildActiveMapRequestModel()` computes `hospitalId` from active record first.
- Unknown ids fall back rather than crashing.

Why the finding survives:

- The actual `hospital` object is selected as
  `preferredHospital || payload?.hospital || findHospitalById(...)`.
- `useMapTracking.openTracking()` calls `resolveMapFlowHospital()` with
  `preferredHospital: activeMapRequest.hospital || sheetPayload?.hospital`.
- `resolveMapFlowHospital()` also prefers the object before the id lookup.
- `buildTrackingViewState()` resolves as
  `activeMapRequest?.hospital || hospital || payload?.hospital || lookup`.

Narrowed fix: keep all fallbacks, but require active request hospital id lookup
to outrank preferred/payload objects when an active id exists.

### Header/Sheet Stage Parity

Defense found:

- `mapActiveSessionPresentation.js` is not naive. It knows pending approval,
  completion, arrival, `canConfirmArrival`, `canCompleteAmbulance`, stale, and
  lost telemetry.

Why the finding survives:

- For ambulance requests that are not pending, terminal, arrived, stale, or lost,
  `resolveSessionStatusLabel()` falls back to `En Route`.
- `resolveTrackingStage()` can return `ASSIGNING` when active status exists
  without responder/movement.
- `resolveTrackingStage()` can also return `DISPATCH_CONFIRMED` for active
  status plus movement signal even without a responder.

Narrowed fix: the header does not need to mirror every sheet detail, but its
fallback stage vocabulary should be responder-aware so assigning/preparing does
not read as en route.

### Runtime Responder Fallback Truth

Defense found:

- `buildCommitPaymentCompletionPayload()` only constructs
  `assignedAmbulance` when approval/result data includes responder assignment
  evidence.
- Query hydration preserves responder identity for the same request instead of
  erasing richer runtime data with a partial row.

Why the finding survives:

- `startAmbulanceTrip()` does not stop at explicit handoff assignment. It falls
  back from explicit assignment to ambulance lookup by id, hospital, any
  available ambulance, then the first ambulance.
- `useAmbulances()` loads `ambulanceService.list()`, and `ambulanceService.list()`
  selects the ambulances table broadly rather than only the request's assigned
  ambulance/current call.
- `buildTrackingRuntimeSnapshot()` derives `hasResponder` from the resulting
  active trip assignment-like fields.

Narrowed conclusion: `hasResponder=true` is a runtime fact, but not by itself
proof that canonical backend assignment reached the payment handoff. The audit
must track canonical assignment, optimistic local responder enrichment, and
responder-hydrating state separately.

### Readiness Chain Field Ownership

Defense found:

- `approve_cash_payment()` returns responder/ambulance fields from the request
  after approval.
- The demo auto-approval edge function rehydrates the approved request and may
  call `auto_assign_ambulance()` before returning a wrapped result.
- Payment completion invalidates the active-trip query after optimistic trip
  start, so the store is not expected to live forever on only handoff payload.

Why the field map still survives:

- The direct approval RPC output is assignment-focused; the demo edge function
  is the path that rehydrates and embeds a request row in the returned result.
- Card settlement polling selects a request row with id, display id, hospital,
  status, payment status, ambulance and responder columns, but route remains a
  map/runtime concern.
- Commit request initiation carries pickup/patient context into request creation
  and completion payload, while the runtime snapshot does not itself verify that
  context.
- Query hydration can rebuild patient location and responder fields from the
  active request row, while realtime remains patch-only for an already existing
  trip and does not create route truth.

Narrowed conclusion: the readiness chain is not one payload. The audit should
continue labeling fields by producer and reconciliation path before it decides
which presentation states may claim dispatch, responder, or telemetry
confidence.

### Pickup Coordinate Versus Label Truth

Defense found:

- Commit payment captures `patientLocation` from the commit-time pickup and the
  trip/query path preserves that coordinate.
- Stored tracking route coordinates can continue to feed the map once they are
  available.
- Tracking no longer exposes an in-sheet pickup edit control because that local
  shell mutation was not a live request destination update.

Why the finding survives:

- Commit initiation captures `locationLabel`, but the completion payload that
  starts tracking carries `patientLocation` forward without that label.
- `MapScreen` passes `currentLocationDetails` into the tracking sheet and
  `activeLocation` into the preview map.
- `buildTrackingViewState()` creates route-card pickup label/detail from
  `currentLocation` only; it does not read `activeAmbulanceTrip.patientLocation`.
- `buildTrackingSharePayload()` uses the view-state `pickupLabel`.
- `EmergencyLocationPreviewMap` calculates its route origin from the live
  `location` prop before emitting new route info.

Narrowed conclusion: this is not proof that the route card is always wrong. It
is proof that tracking currently has separate producers for committed pickup
coordinate, ambient route origin, and human pickup label. The runtime proof gate
must deliberately change or reload location during an active trip before the
audit decides whether that split is product-correct or a state-disharmony bug.

### History/Detail Resume Identity

Defense found:

- `handleSelectHistoryItem()` already builds selected item keys and checks them
  against `activeHistoryRequestKeys` before directly opening tracking.
- The row-selection path is not a hallucinated global resume.

Why the finding survives:

- `handleResumeHistoryRequest()` only checks `hasActiveTrip`, closes details,
  and calls `openTracking()`.
- `activeHistoryRequestKeys` includes active map request id/request id and
  display ids, but omits active trip and bed canonical ids in some shapes.

Narrowed fix: preserve the row-selection guard. Extend the same selected-item
identity check to the detail primary resume action.

### Companion Action Timing

Defense found:

- Companion construction prevents duplicate companion prompts: ambulance without
  bed shows `Reserve bed`, bed without ambulance shows `Request transport`.
- Idle, pending, and terminal stages are blocked.

Why the finding survives:

- `buildTrackingActionSurfacePolicy()` allows companion services for every
  non-idle, non-terminal, non-pending stage.
- It does not consume `canMarkArrived`, `canCompleteAmbulance`, `canCheckInBed`,
  or `canCompleteBed`.
- Secondary actions are promoted into mid actions before contact dispatch and
  before primary/share fallback.

Narrowed fix: this is product-policy sensitive. The code is defensible if late
companion booking is intended, but the audit remains valid as a UX ambiguity.

### Rating Close Semantics

Defense found:

- `skipRating()` resolves the visit, deletes recovery claim, finalizes tracking,
  refetches, and shows feedback.
- `submitRating()` resolves the visit, removes recovery claim, finalizes
  tracking, refetches, and invokes post-submit handling.

Why the finding survives:

- `closeRating()` only sets `trackingRatingStateAtom` back to initial state.
- `MapModalOrchestrator` wires modal `onClose` directly to `closeTrackingRating`
  for tracking rating.

Narrowed fix: raw modal close should probably route through skip semantics or be
renamed as a dismiss-only path with clear product intent.

## Claims That Were Downgraded

### Route Request-Key Parity

Original audit wording was too broad.

Defense found:

- `MapScreen` passes `activeRequestKey: activeMapRequest?.requestId`.
- `useMapTrackingSync()` stamps every incoming route payload with the current
  normalized active request key.
- `useMapTrackingRuntime()` only consumes live route atom data when
  `liveRouteInfo.requestKey === trackingRouteRequestKey`.
- The runtime falls back to prop `routeInfo` only when scoped live route data is
  not usable.

Remaining risk:

- `FullScreenEmergencyMap` still emits route data without an explicit request id.
- The route callback is therefore contextual. If an old map calculation fires
  after the active request/focused hospital changes, the setter can stamp it with
  the current request key.

Revised finding: not "alias parity is missing." Better wording is "route
callbacks are context-scoped instead of event-scoped."

### Display Id Label Priority

Original audit wording overstated the gap.

Defense found:

- `buildActiveMapRequestModel()` sets `displayId` from `record?.displayId ??
requestId`.
- Because the active map request record is the active trip/bed/pending record,
  `activeMapRequest?.displayId` often already represents the real display id.
- `buildTrackingViewState()` prefers `activeMapRequest?.displayId` before raw
  request ids.

Remaining risk:

- Once `activeMapRequest.displayId` has been formatted from `requestId`, the
  view layer cannot tell whether it is a true display id or a synthetic UUID
  fallback.
- Raw `activeAmbulanceTrip?.displayId` and `activeBedBooking?.displayId` are not
  directly included after `pendingApproval?.displayId` in the view-state fallback
  list.

Revised finding: not "UUIDs will display whenever a display id exists." Better
wording is "display label fallback should preserve provenance and prefer raw
display-id fields before formatted canonical-id fallbacks."

### Action Feedback And Disabled States

Original audit wording was too absolute.

Defense found:

- Primary and destructive action models set `loading`.
- Bottom action button disables itself while loading or semantically disabled.
- Completion handlers inspect `{ ok: false }` and show an error toast.

Remaining risk:

- `TrackingCtaButton` does not pass `disabled={action.loading}`.
- `runBusyAction()` returns handler results but does not interpret `{ ok: false
}` or show fallback error feedback.
- Arrival/check-in/cancel paths use `runBusyAction()` directly and do not have
  the completion path's explicit toast handling.

Revised finding: bottom CTA protection exists; mid/action-card loading feedback
and non-completion failure messaging remain the real target.

## Claims To Reword In Existing Modules

- Replace broad "route alias parity" language with "route callback is
  context-scoped, not event-scoped."
- Replace broad "display id can fall back to UUID" language with "display label
  fallback loses provenance after formatting."
- Replace broad "every button lacks disabled feedback" language with "bottom CTA
  has disabled protection; mid CTA/loading surfaces are weaker."
- Preserve the lifecycle, hospital resolver, header parity, detail resume,
  companion timing, and raw rating close findings as active.

## Current Impact

These passes disproved several overbroad phrasings, preserved several real
findings, and added boundaries the fixes must keep distinct:

1. live chrome lifecycle vs tracking-ready snapshot
2. canonical responder assignment vs optimistic runtime responder enrichment
3. committed pickup coordinate vs ambient route origin and pickup label

Implementation order is now actionable in `07-fix-plan.md`. Optional rendered
runtime proof can still confirm visual and interaction behavior, but it is not a
source-audit blocker.
