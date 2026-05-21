# Adversarial Validation

> Purpose: defend the current code and try to disprove the audit. A finding only
> stays strong here if the source code still supports it after looking for
> existing guards, fallback paths, and prior fixes.

## Verdict Summary

| Audit claim                         | Adversarial verdict     | Result                                                                                                  |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Lifecycle-gated live chrome         | Survives                | Auto-open is mostly gated, but header visibility and tracking close still have request-key-only paths.  |
| Active hospital resolver            | Survives                | Id selection is stronger than object selection, but object selection still lets preferred/payload win.  |
| Header/sheet stage parity           | Survives                | Header has useful action awareness, but non-terminal ambulance fallback still says `En Route`.          |
| History/detail resume identity      | Survives, narrowed      | Row selection is defended; detail modal resume remains global `hasActiveTrip` plus `openTracking()`.    |
| Action feedback and disabled states | Partially survives      | Bottom action disabling exists; mid actions and `{ ok: false }` surfacing remain weaker.                |
| Companion action timing             | Survives                | Current policy blocks idle/pending/terminal only, not arrival/check-in/complete substate.               |
| Route request-key parity            | Downgraded              | The hook does contextual request stamping; the remaining risk is stale contextual callbacks, not alias. |
| Display id label priority           | Downgraded              | `activeMapRequest` already prefers record `displayId`; remaining risk is fallback priority hardening.   |
| Rating close semantics              | Survives                | Skip/submit finalize; raw close only clears the atom.                                                   |
| Modal gate mismatch                 | Survives as naming risk | The mismatch is intentional in places, but the current names do not expose those distinct meanings.     |

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

## Implementation Impact

The audit is not hallucinating, but it was too aggressive in a few phrasings.
The highest-confidence implementation order after adversarial review is:

1. Lifecycle-gated live chrome.
2. Active hospital resolver.
3. Header/sheet stage parity.
4. Detail resume identity.
5. Raw rating close semantics.
6. Mid-action failure feedback.
7. Companion timing policy.
8. Route callback event scoping.
9. Display label provenance hardening.
