# Tracking Sheet State / UX Deep Audit - 2026-05-20

Status: Modular audit index
Scope: `/map` tracking sheet, tracking header, payment handoff, rating handoff, route/ETA, active-request UI decisions, Contact Dispatch, history resume, bed capacity, and demo-provider truth.
Purpose: keep the audit readable while preserving every documented finding and evidence note.

## Lossless Preservation

This file is now the command center for the audit. The pre-modularization artifact is preserved verbatim here:

- [00-full-audit-preserved.md](tracking-sheet-full-system-audit-2026-05-20/00-full-audit-preserved.md)

No documented truth was intentionally deleted. Topic modules below are extracted from the preserved artifact and can be edited independently as the line-by-line audit continues.

## Modules

| Module                                                                                                     | Owns                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01-core-map.md](tracking-sheet-full-system-audit-2026-05-20/01-core-map.md)                               | Core diagnosis, state owners, user flow, invariants, regression candidates, UI copy/action safety, next runtime pass.                                                                                                  |
| [02-system-contracts.md](tracking-sheet-full-system-audit-2026-05-20/02-system-contracts.md)               | Backend/API/UI audit frame, source-of-truth table, coverage ledger, decision map, state/status contracts, field source map.                                                                                            |
| [03-backend-api-store.md](tracking-sheet-full-system-audit-2026-05-20/03-backend-api-store.md)             | Backend/API evidence, service adapters, request flow, store/query/realtime, API solidity, payment-to-tracking handoff.                                                                                                 |
| [04-tracking-ui-surfaces.md](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)       | Open/header/route, shell/session, snapshot/render, active hospital resolution, actions, bed runtime, telemetry, route/share, render, companion/header action, route-key, failure feedback, bed/capacity/demo evidence. |
| [05-modals-terminal-history.md](tracking-sheet-full-system-audit-2026-05-20/05-modals-terminal-history.md) | Rating, completion/lifecycle, contact dispatch, cancel/cleanup, history resume, recovered rating.                                                                                                                      |
| [06-edge-case-matrix.md](tracking-sheet-full-system-audit-2026-05-20/06-edge-case-matrix.md)               | Flow checklists, edge-case coverage tracker, audit method, regression-to-watch contract.                                                                                                                               |
| [07-fix-plan.md](tracking-sheet-full-system-audit-2026-05-20/07-fix-plan.md)                               | Ordered implementation slices, acceptance checks, and runtime proof matrix built from the mapped findings.                                                                                                             |
| [08-adversarial-validation.md](tracking-sheet-full-system-audit-2026-05-20/08-adversarial-validation.md)   | Skeptical source-code pass that tries to disprove the audit and separates survived findings from narrowed or overbroad claims.                                                                                         |

## Core Diagnosis

Tracking is no longer failing from one obvious missing field. It is now a multi-owner consistency problem.

The product asks one user-facing question:

```text
Where is my active care request, and what can I safely do next?
```

The runtime currently answers that question from several partially overlapping layers: Supabase row/status truth, TanStack active-trip query, Zustand active trip/pending approval store, XState lifecycle flags, Jotai route/visual/rating atoms, sheet phase/payload navigation state, and tracking snapshot/view-state/hero/action/header models.

That layering is valid, but the boundaries are soft. A user can move from payment to tracking while the active request exists, but lifecycle, route atom, hospital payload, visual status atom, and rating/modal state may still be settling.

## Critical Invariants

1. **Active tracking identity must be canonical.** `emergency_requests.id` is the mutation/subscription key. `display_id` is UI only.
2. **Opening tracking is not the same as tracking being ready.** The sheet may open immediately, but stage copy must honestly show pending, assigning, or dispatch-confirmed states until responder/route/ETA are ready.
3. **Sheet payload is navigation context, not active request truth.** It can help choose a first hospital shell, but must not override canonical active request hospital truth.
4. **Lifecycle false should close or suppress active tracking chrome.** A lingering request key during completion/rating cleanup is not enough to keep tracking visible.
5. **One tracking stage should drive title, hero, CTA safety, header tone, and visual atoms.** Multiple stage engines can disagree under async updates.
6. **Rating is a modal flow over completed tracking, not a second tracking lifecycle.** Completing a trip can clear active trip state while rating remains visible; tracking must not re-open from stale store identity.

## Current Confirmed Solid Areas

1. Payment-to-tracking identity handoff now carries canonical UUID and display id separately through `handleRequestComplete()` and `startAmbulanceTrip()`.
2. Store/query hydration is alias-aware and preserves ETA/start/route for same-request records.
3. Tracking runtime reads the scoped route atom directly, so fresh route ETA can render before the store is patched.
4. The arrived hero subtitle is now action-aware and matches `Confirm arrival` vs `Complete request`.
5. The duplicate rating-modal renderer was consolidated earlier; remaining rating flashes should be audited as state/cleanup timing.
6. Tracking visual atoms prefer the runtime snapshot stage and are request-scoped.
7. Route sync preserves duration during recalculation and seeds from same-request stored ETA/route.
8. The May 19 no-reload payment-to-tracking hydration fix (`09d9195c`) is a protected lesson captured in `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` section 2.24.

## Current High-Value Audit Targets

| Target                           | Why it matters                                                                  | First module                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle-gated tracking session | Prevent tracking/header from surviving completion/rating cleanup.               | [01](tracking-sheet-full-system-audit-2026-05-20/01-core-map.md), [05](tracking-sheet-full-system-audit-2026-05-20/05-modals-terminal-history.md)   |
| Active hospital resolution       | Prevent stale selection/payload from overriding active request provider object. | [04](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)                                                                        |
| Assignment vs movement wording   | Prevent fake dispatch confidence when only route/ETA is seeded.                 | [01](tracking-sheet-full-system-audit-2026-05-20/01-core-map.md), [04](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)      |
| Header-stage parity              | Prevent header, sheet title, and hero from saying different states.             | [04](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)                                                                        |
| Terminal/rating transition       | Prevent rating modal from fighting tracking cleanup.                            | [05](tracking-sheet-full-system-audit-2026-05-20/05-modals-terminal-history.md)                                                                     |
| Display id defense-in-depth      | Prevent UUIDs in user-facing request labels.                                    | [01](tracking-sheet-full-system-audit-2026-05-20/01-core-map.md), [04](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)      |
| Rating close semantics           | Preserve shell-close-as-skip and prevent raw-close-only terminal dismissals.    | [05](tracking-sheet-full-system-audit-2026-05-20/05-modals-terminal-history.md)                                                                     |
| Route request-key parity         | Prevent route atom hiding valid ETA because active key and trip key differ.     | [04](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)                                                                        |
| Contact dispatch stability       | Prevent chat lifecycle from perturbing tracking/header/ETA state.               | [05](tracking-sheet-full-system-audit-2026-05-20/05-modals-terminal-history.md)                                                                     |
| Companion action timing          | Prevent add-on services from appearing after arrival/completion boundary.       | [04](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)                                                                        |
| Cancel parity                    | Prevent server cancellation without matching local UI/lifecycle cleanup.        | [05](tracking-sheet-full-system-audit-2026-05-20/05-modals-terminal-history.md)                                                                     |
| Action failure feedback          | Prevent loading states from silently resetting after blocked arrival/cancel.    | [04](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)                                                                        |
| Bed capacity vs ready state      | Prevent local hold-timer readiness from being mistaken for backend capacity.    | [04](tracking-sheet-full-system-audit-2026-05-20/04-tracking-ui-surfaces.md)                                                                        |
| Reload persistence parity        | Prevent persisted trip, visual atom, and lifecycle hydration from disagreeing.  | [03](tracking-sheet-full-system-audit-2026-05-20/03-backend-api-store.md), [06](tracking-sheet-full-system-audit-2026-05-20/06-edge-case-matrix.md) |
| History resume identity          | Prevent a historical item from resuming whichever trip is globally active.      | [05](tracking-sheet-full-system-audit-2026-05-20/05-modals-terminal-history.md)                                                                     |

## State Disharmony Register

These findings match the user-visible problem class: the app can be technically working while two UI surfaces tell different stories.

| Disharmony                                      | UI contradiction                                                                                                                                 | Fix shape                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Arrived says "confirm arrival" after confirmed  | Hero subtitle can describe the previous action while CTA says complete request.                                                                  | Keep broad stage, but render hero subtitle from action context.                                                  |
| Header says `En Route` while sheet is assigning | Floating header overstates dispatch when no responder exists.                                                                                    | Feed header from tracking snapshot/stage, or replicate responder-aware stage refinement.                         |
| Tracking survives completion/rating cleanup     | Live chrome can remain while rating/terminal flow owns the user moment.                                                                          | Derive `isTrackingSessionActive = trackingRequestKey && hasActiveTrip`; keep rating separate.                    |
| Correct request id, wrong provider label        | Sheet/header/details can show stale selected hospital for an active request.                                                                     | When active request exists, lookup by `hospitalId` first; payload fallback only if id matches or lookup missing. |
| Contact Dispatch appears to break ETA           | Header hides, chat realtime closes, tracking remount can make ETA seem unstable.                                                                 | Treat chat as modal-only; prove request key/route atom/snapshot unchanged across open/close/send.                |
| History resume opens wrong live request         | Detail primary CTA can become a generic "open current tracking" action even though row selection/collapsed action have stronger identity checks. | Require selected visit id to match expanded active request keys before `openTracking()`.                         |
| Rating close flashes/settles                    | Closing/remounting rating can expose terminal tracking context for a frame.                                                                      | Shell close already routes through skip; guard against any raw close path that only clears the atom.             |

## Audit Method

For each tracker row:

1. Capture the backend row shape and legal transition.
2. Capture the API/service payload shape after each boundary.
3. Capture the local store shape before and after hydration/realtime.
4. Capture the tracking snapshot stage.
5. Capture rendered header, hero, details, mid actions, bottom action, modal.
6. Mark contradictions as UI sync, state sync, API sync, or backend contract.

Do not apply broad sync changes until the contradiction is assigned to one of those four buckets.

## Regression To Watch

Do not fix this by delaying the tracking sheet until everything is perfect. That would make payment feel dead.

The desired behavior is:

```text
payment succeeds
  -> sheet opens immediately
  -> active request identity is canonical
  -> UI shows pending/assigning honestly if responder is not ready
  -> ETA appears as soon as trip ETA or scoped route ETA exists
  -> header and sheet agree
  -> lifecycle false removes tracking chrome even if rating/modal remains
```
