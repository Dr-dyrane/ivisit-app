# Audit Completion Checkpoint

> This is a checkpoint for the tracking-map audit. It separates evidence already
> gathered from evidence still missing. It is not an audit closeout and it is not
> permission to stop the audit.

## Checkpoint Verdict

The audit is still open. Source mapping is deep, but a complete audit needs the
remaining rendered `/map` proof and then another adversarial pass against the
expanded evidence.

| Layer                        | Checkpoint status        | Evidence                                                                                                     |
| ---------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Tracking source spine        | mapped, challenge again  | Coverage ledger in `02-system-contracts.md` is mapped for listed tracking tiers.                             |
| Backend/API contracts        | mapped with runtime help | RPC/status/store/query/realtime/chat lanes are mapped; local runtime confidence assertions pass.             |
| Audit skepticism             | first pass complete      | `08-adversarial-validation.md` defended the code and downgraded overbroad route/display/action claims.       |
| Reload/rehydrate source path | source-mapped            | Store/query/lifecycle/visual-atom hydration defenses are mapped in `03-backend-api-store.md`.                |
| Interactive `/map` UI proof  | open                     | Need rendered proof for detents, modal remount perception, reload visuals, chat, cancel, rating, and bed UX. |

## What Is Now Proven

### Source Proof

- The tracking stage/render/controller/header/open/sync/model files named in the
  coverage ledger have been read and connected to a module.
- Payment handoff, request normalization, trip store, query hydration, realtime,
  lifecycle machine, rating, history resume, Contact Dispatch, bed capacity, and
  demo provider truth are mapped.
- The audit has a state-disharmony register, edge-case matrix, fix order, and an
  adversarial validation pass.

### Local Runtime Contract Proof

These commands were run during this pass:

```text
npm run hardening:emergency-runtime-confidence-assert
npm run hardening:visits-runtime-confidence-assert
```

Both passed.

The emergency confidence assertion reads checked-in transition/e2e evidence and
requires:

- console transition cases including dispatch, approval, decline, reservation,
  and lifecycle families
- e2e scenarios `cardAmbulance`, `trackingContract`, `completion`,
  `cashAmbulance`, `bedReservation`, `tipFlow`, and `transitionAudit`

That evidence supports backend/runtime solidity. It does not prove what the map
screen looks like after a modal closes or after a phone reload.

### Prior Rendered Runtime Evidence

`docs/archive/historical/MAP_RUNTIME_PASS_PLAN_V1.md` records an earlier
browser-tested `/map` ambulance path through explore, ambulance decision, review
OTP, commit payment, tracking mount, map/tracking toggle, tracking triage,
arrival confirmation, completion, rating skip, and cleanup. The same historical
entry records a signed-in bed path through tracking mount and bed cancel cleanup.

That prior proof matters because it shows the app has already reached several
rendered tracking states in a real browser. It does not close this audit's
current proof gate by itself:

- it is historical evidence from a prior runtime pass, not a fresh observation
  from this audit snapshot
- it does not cover Contact Dispatch open/send/close, reload parity, raw rating
  close, half-snap action visibility, pickup-truth drift, or the current
  adversarial findings
- it documents regressions that were fixed in that pass, which is exactly why
  the current audit should re-check the updated runtime instead of assuming the
  old proof still settles the present code

### Live Browser Attempt

The local Expo web target was reachable during this pass at `/map`. The browser
landed on the pickup/location sheet, completed a manual Hemet pickup selection,
opened the ambulance decision sheet for `PHH Tech Center`, and reached the
`Contact email` commit-details gate after `Confirm & continue`.

The Google Play review lane still works in this local web session:

- local client flags enable `support@ivisit.ng`
- the documented review code advanced `Contact code` into the real `Payment`
  sheet
- that proves the commit-details client bridge, `review-demo-auth` edge
  function, generated Supabase OTP, and normal OTP verification still converge
  into a patient session for this path

The same authenticated map session later exposed Recent Visits and opened the
`PHH Tech Center` row into the current `VISIT_DETAIL` sheet surface with close,
action-strip, pickup, payment, and detail rows. That is rendered evidence for
the history-detail branch and confirms the source finding that the active map
path is the sheet stage/model path, not the older standalone detail modal file.

From that authenticated lane, selecting cash for `PHH Tech Center` created a
real request and remained at `Waiting for approval`. That does not disprove the
tracking proof path: source code gates demo cash auto-approval on a demo-backed
hospital through `demoEcosystemService.shouldSimulatePayments()`, not on the
Google review user alone. The Google testing flow has also now been checked with
a demo cash approval path by the user and reported working; the remaining proof
gap is rendered tracking-map behavior after that approval, not whether the demo
cash approval lane exists.

The live entry point still does not provide an already-seeded active tracking
session. Continuing the proof gate from here requires one of:

- a signed-in scenario with an active ambulance/bed request already available
- a demo-backed hospital cash flow that stays open long enough after the
  user-confirmed auto-approval path for tracking UI inspection
- a card/settlement path or explicit hospital approval that releases this
  request into tracking
- deliberate demo/test seeding that can survive long enough for UI inspection

## What Is Still Not Proven

### Interactive `/map` Proof Gate

| Scenario                             | Must inspect                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Pending cash ambulance               | Sheet/header copy, pending actions, no fake dispatched movement.                                        |
| Active no responder/no movement      | Assigning/preparing parity across header, hero, title, CTA.                                             |
| Active no responder plus route ETA   | ETA appears without responder-overclaim copy.                                                           |
| Responder plus movement              | Header/hero/route/ETA agree.                                                                            |
| Arrival before and after confirm     | Confirm vs complete action and hero semantics.                                                          |
| Complete to rating, then skip/submit | No live chrome resurrection; terminal context preserved only where needed.                              |
| Raw modal close on tracking rating   | Decide whether dismiss-only behavior is intended or a cleanup defect.                                   |
| Contact Dispatch open/send/close     | Request key, ETA, route line, header, and modal focus remain coherent.                                  |
| Pickup changes or reloads mid-trip   | Committed pickup coordinate, map route origin, route-card label, and share text remain product-correct. |
| Cancel pending/active/bed            | Failure and success feedback, sheet/header cleanup, reload result.                                      |
| Reload pending/active/arrived/rating | Cold-start hydration visuals and request-scoped phase/progress state.                                   |
| Bed ready/check-in/complete          | Capacity truth, ready/check-in copy, terminal cleanup.                                                  |
| Half-snap action limit               | Urgent next action remains visible or bottom-promoted on mobile.                                        |

## Audit Finish Gate

The audit is not finished until:

1. The interactive `/map` proof scenarios are exercised or explicitly blocked
   with the exact missing prerequisite.
2. Runtime observations are reconciled back into the source modules and edge
   case matrix.
3. Findings that runtime disproves are downgraded or removed.
4. A fresh adversarial validation pass challenges the updated findings.
5. Only then is the fix plan promoted from provisional to actionable.

## Current High-Confidence Findings

These survived the source audit and adversarial defense:

1. Lifecycle-gated live tracking chrome.
2. Active hospital object resolution versus active hospital id truth.
3. Header/sheet stage parity for assigning/preparing/route states.
4. Visit detail resume identity.
5. Raw rating close semantics.
6. Companion timing policy ambiguity.

These were narrowed, not discarded:

1. Route callback risk is contextual request stamping, not a missing alias set.
2. Display-label risk is provenance/fallback hardening, not universal UUID leak.
3. Bottom CTA disable behavior exists; mid-action and non-completion failure
   feedback are weaker.
4. Pickup truth is split across committed coordinate, ambient route origin, and
   ambient pickup label; runtime proof must decide whether that is correct.
