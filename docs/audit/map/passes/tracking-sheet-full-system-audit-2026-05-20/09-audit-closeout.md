---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Audit Source Closeout

> This is the source closeout for the tracking-map audit. It separates defended
> source findings from optional rendered confirmation and implementation work.

## Source Verdict

The source-induction pass is now complete for the core tracking-map invariant
families, and the fresh adversarial validation pass has challenged the expanded
proof set. Rendered `/map` testing is useful later as confirmation, but it is
not the finish gate for this source audit.

| Layer                          | Checkpoint status        | Evidence                                                                                                |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Tracking source spine          | mapped, challenge again  | Coverage ledger in `02-system-contracts.md` is mapped for listed tracking tiers.                        |
| Backend/API contracts          | mapped with runtime help | RPC/status/store/query/realtime/chat lanes are mapped; local runtime confidence assertions pass.        |
| Audit skepticism               | fresh pass complete      | `08-adversarial-validation.md` defended the code twice and narrowed overbroad source-induction claims.  |
| Reload/rehydrate source path   | source-mapped            | Store/query/lifecycle/visual-atom hydration defenses are mapped in `03-backend-api-store.md`.           |
| Tracking induction proof       | source-proved            | Core transition families are proved in the induction progress table below.                              |
| Map render lifecycle proof     | source-proved            | Marker, polyline, camera, route-info, and location/render boundaries are mapped and classified.         |
| Optional rendered confirmation | deferred                 | Browser/device proof may confirm the source proof later, but it is no longer the audit close condition. |

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

## Source Induction Results

### Proof Gate Results

| Transition / state family            | Source proof result                                                                                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pending cash ambulance               | Pending approval copy is protected in sheet/hero/header; it does not claim dispatch before approval.                                                             |
| Active no responder/no movement      | Sheet/hero can honestly render assigning/preparing; floating header still overstates with `En Route`.                                                            |
| Active no responder plus route ETA   | Route/ETA can promote to `dispatch_confirmed` without responder proof; product meaning remains a surviving finding.                                              |
| Responder plus movement              | Runtime responder identity is useful but may be local/fallback-enriched, not necessarily backend assignment proof.                                               |
| Arrival before and after confirm     | Hero/action model refines arrived semantics; broader header/stage parity remains a finding.                                                                      |
| Complete to rating, then skip/submit | Completion-to-rating intentionally defers cleanup; skip/submit are proved terminal finalizers.                                                                   |
| Raw modal close on tracking rating   | Raw close only clears the rating atom and is not a terminal finalizer.                                                                                           |
| Contact Dispatch open/send/close     | Chat is room/modal-scoped; mapped as not a direct route/trip mutator, with modal-gate naming risk documented.                                                    |
| Pickup changes or reloads mid-trip   | Committed `patientLocation`, ambient route origin, and rendered pickup label are separate producers; source proof preserves the split as a finding.              |
| Mobile-web marker stability          | Marker/polyline/camera churn is render lifecycle, not backend/location truth.                                                                                    |
| Cancel pending/active/bed            | Successful cancel paths clean pending/trip/bed state after backend/visit writes.                                                                                 |
| Reload pending/active/arrived/rating | Store/query/lifecycle/route seeding are mapped; route atom reads are request-key scoped while producer ownership remains contextual.                             |
| Bed ready/check-in/complete          | Bed lifecycle/timer/capacity semantics are separate from ambulance movement; completion follows the same deferred rating cleanup model when rating is requested. |
| Half-snap action limit               | Action policy and bottom-action promotion are mapped; unresolved UX priority belongs in fix planning, not source truth discovery.                                |

### Induction Progress

| Slice                                    | Status        | Result                                                                                                                                                                       |
| ---------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live chrome session vs readiness         | source-proved | Lifecycle predicate exists and commit optimism is intentional, but header/close consumers still accept request-key-only visibility after lifecycle false.                    |
| Pending/assigning/no-responder semantics | source-proved | Pending is protected and clean no-responder/no-route sheet semantics are honest; route/ETA promotion and floating-header `En Route` collapse remain findings.                |
| Route/ETA request ownership              | source-proved | Atom reads/seeding are request-key scoped, but route callback payloads are unowned and context-stamped, so stale focus/origin/hospital can still become current-route truth. |
| Terminal/rating cleanup                  | source-proved | Cancel success cleans active store; complete-to-rating intentionally defers cleanup; skip/submit finalize; raw rating close remains non-finalizing.                          |
| Map render lifecycle                     | source-proved | Marker/polyline/camera churn is presentation-side; only route-info emission crosses into tracking truth, and Chrome geolocation is not the primary proven cause.             |

## Audit Finish Gate

The source audit gate is now satisfied for the mapped tracking-map scope:

1. Every source writer/reader/fallback for the core invariants is linked back to
   the relevant module and edge-case row.
2. Findings that the code disproves are downgraded or removed.
3. A fresh adversarial validation pass challenges the updated findings.
4. The fix plan is promoted from provisional to actionable.

This does not mean every product behavior is correct. It means the audit has
done the source work needed before advising fixes: the surviving findings are
defended, narrowed, and mapped to source evidence.

## Current High-Confidence Findings

These survived the source audit and adversarial defense:

1. Lifecycle-gated live tracking chrome.
2. Active hospital object resolution versus active hospital id truth.
3. Header/sheet stage parity for assigning/preparing/route states.
4. Visit detail resume identity.
5. Raw rating close semantics.
6. Companion timing policy ambiguity.
7. Route/ETA callback ownership as contextual producer risk.
8. Mobile-web marker/polyline churn as a visual lifecycle stability issue.

These were narrowed, not discarded:

1. Route callback risk is contextual request stamping, not a missing alias set.
2. Display-label risk is provenance/fallback hardening, not universal UUID leak.
3. Bottom CTA disable behavior exists; mid-action and non-completion failure
   feedback are weaker.
4. Pickup truth is split across committed coordinate, ambient route origin, and
   ambient pickup label; induction proof must decide whether that is correct.
