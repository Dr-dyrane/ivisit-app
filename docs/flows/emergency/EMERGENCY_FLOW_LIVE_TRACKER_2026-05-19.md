---
status: living
owner: product
last_updated: 2026-07-14
---

# Emergency Flow Live Tracker

Last updated: 2026-05-19

Purpose: keep one current, compact reference for the emergency product flow while the broader docs repo remains noisy. Treat this as the working map for diagnosis and fixes. Older docs can provide history, but this tracker owns the present investigation.

## Source-Of-Truth Chain

Use this order before auditing or changing emergency tracking:

1. This live tracker: current operational truth, known seams, and fix order.
2. `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`: durable `/map` architecture and state-residency contract.
3. `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md`: reusable defect classes and anti-patterns.
4. `docs/audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md`: active investigation evidence and candidate-patch log.
5. `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`: provider bootstrap and coverage behavior.

Rule: do not re-audit from the whole docs repo unless these references are missing the answer. If older docs conflict with this tracker, treat the older doc as historical until reviewed.

## Audit Posture

Default mode for this flow is audit first, patch second.

Before changing runtime behavior:

- trace the full flow impact, not only the local symptom
- identify which layer owns the truth being changed
- check whether unusual code is guarding a known race or production behavior
- record the suspected contract violation in the active pass doc
- keep candidate patches small enough to verify independently

## Product Rule

The app treats the bootstrapped provider experience as a real emergency flow. User-facing copy and UI should not describe it as a demo. The flow should feel continuous: welcome handoff, map, provider selection, request details, payment/approval, active tracking, telemetry, arrival, completion.

## Current Flow

1. Welcome enters the emergency map.
   - Entry: `screens/WelcomeScreen.jsx`
   - Route shell: `app/(auth)/map.js`
   - Owner: navigation + location handoff only
   - Current finding: not the likely regression source.

2. Map discovers coverage and may bootstrap provider coverage.
   - Map orchestration: `screens/MapScreen.jsx`
   - Flow hook: `hooks/map/exploreFlow/useMapExploreFlow.js`
   - Bootstrap hook: `hooks/map/exploreFlow/useMapExploreDemoBootstrap.js`
   - Backend bootstrap: `supabase/functions/bootstrap-demo-ecosystem`
   - Current risk: hospital/provider data may hydrate after tracking state starts.

3. User selects care and commits request details.
   - Decision/commit flow: `hooks/map/exploreFlow/useMapCommitFlow.js`
   - Details/triage/payment stages: `components/map/views/commit*`
   - Current risk: commit state and request state are separate clocks.

4. Payment or approval creates the active dispatch.
   - Controller: `components/map/views/commitPayment/useMapCommitPaymentController.js`
   - Request lifecycle: `hooks/emergency/useRequestFlow.js`
   - Cash approval helper: `services/paymentService.js`
   - Auto-approval edge function: `supabase/functions/demo-approve-cash-payment/index.ts`
   - RPC/trigger: `approve_cash_payment`, `auto_assign_driver`, `auto_assign_ambulance`
   - Current highest-risk seam: auto-approval can complete before the frontend has a hydrated responder/ambulance assignment.

5. Active trip is normalized and synced.
   - Server query: `hooks/emergency/useActiveTripQuery.js`
   - Realtime: `hooks/emergency/useEmergencyRealtime.js`
   - Zustand store: `stores/emergencyTripStore.js`
   - XState lifecycle: `hooks/emergency/useTripLifecycle.js`
   - Current risk: realtime merges into an existing trip but does not create the trip if the store has none.

6. Tracking sheet opens and renders.
   - Sheet lifecycle: `hooks/map/exploreFlow/useMapTracking.js`
   - Active request model: `components/map/core/mapActiveRequestModel.js`
   - Tracking state derivation: `components/map/views/tracking/mapTracking.derived.js`
   - Tracking base: `components/map/views/tracking/MapTrackingStageBase.jsx`
   - Current risk: `requestId + hasActiveTrip` is not enough to guarantee a tracking-ready dispatch snapshot.

7. Map telemetry and ambulance animation run.
   - Route sync: `hooks/map/tracking/useMapTrackingSync.js`
   - Map renderer: `components/map/FullScreenEmergencyMap.jsx`
   - Animation hook: `hooks/emergency/useAmbulanceAnimation.js`
   - Route sprite layer: `components/map/RouteLayer.jsx`
   - Heartbeat: `hooks/emergency/useEmergencyActions.js`
   - Current risk: simulated responder heartbeat depends on resolving the active trip hospital in demo-scoped hospitals. If that fails, telemetry goes stale/lost.

8. Contact Dispatch opens from tracking.
   - Dossier: `docs/flows/emergency/architecture/contact-dispatch/CONTACT_DISPATCH_COMMUNICATION_ROOM_DOSSIER_V1.md`
   - Runtime QA pass: `docs/flows/emergency/architecture/contact-dispatch/passes/CD-9_RUNTIME_VERIFICATION.md`
   - Modal: `components/map/communication/EmergencyContactDispatchModal.jsx`
   - Tracking entry: `components/map/views/tracking/useMapTrackingController.js`
   - Service adapter: `services/emergencyChatService.js`
   - Edge reply: `supabase/functions/demo-dispatch-reply`
   - Current risk: Contact Dispatch room creation requires the canonical emergency request UUID. Demo tracking can expose display/request ids, so passing the wrong id makes the modal show a connection error even though dispatch itself is active.

## State Authority Target

The intended direction should be:

Server row and RPC result -> TanStack active-trip query -> Zustand trip store -> XState lifecycle -> Jotai/sheet presentation.

Rules:

- Server/query owns canonical request status, assignment, payment status, and responder identity.
- Zustand owns the active runtime snapshot used by map and sheet.
- XState owns lifecycle gating, not full trip payload.
- Jotai/sheet state owns presentation only.
- Tracking UI should consume a derived tracking-ready view model, not independently mix five partial layers.

## Required Tracking-Ready Snapshot

Before the app treats an ambulance request as tracking-ready, it should have:

- `requestId`
- `hospitalId`
- active status: `in_progress`, `accepted`, or `arrived`
- route or ETA seed
- patient/pickup location when available
- either assigned responder identity or an explicit responder-hydrating state

`in_progress` means payment-ready dispatch is still finding or offering a responder. It is not accepted dispatch. Responder identity, movement, ETA countdown, and telemetry health begin only after canonical `accepted` state. If assignment is not ready, the UI must say that it is finding a responder and must not imply that a unit is en route.

## Tracking And Payment Sheet Contract

The payment/approval sheet must hand tracking a warm dispatch snapshot before navigation. That snapshot should include the canonical emergency request UUID, hospital id, route seed, ETA seed, `startedAt`, pickup coordinate when known, and any responder identity returned by approval. Tracking should never require a Metro reload or app reload to discover ETA, arrival eligibility, or driver details that were already known during payment approval.

Tracking owns live presentation after the handoff:

- ETA and route progress must tick from `etaSeconds + startedAt` and hydrated active-trip data without waiting for a page reload.
- ETA may show "Arriving" but must never manufacture canonical arrival. The arrival phase and Confirm arrival CTA appear only after responder-owned `arrived` state.
- Arrival affordance is a full UI state, not just eligibility: show the arrival toast once, mute sibling CTA rows, and render Confirm arrival as the arrival-highlighted action.
- Confirm arrival acknowledges responder-owned arrival. It does not set request status or grant the patient completion authority.
- Ambulance completion belongs to the assigned responder. Bed completion belongs to an authorized hospital operator. The patient App derives rating eligibility from the completed, unrated visit.
- Mid snap shows at most three CTAs by hierarchy: Confirm Arrival, Contact Dispatch, medical information/reserve/request/share. Expanded snap can show the full group.
- If tracking telemetry is delayed, stale, or missing, the ambulance marker stays at the hospital or route start. It must not fall back to the user/pickup coordinate during tracking.
- During tracking, the ambulance sprite heading follows the route polyline. User-facing orientation remains a pre-tracking/payment-sheet fallback only.
- Contact Dispatch is tracking-adjacent: it must open above tracking, remain keyboard-aware on native, and preserve the tracking sheet state behind it.

Reload rule: tracking sheet ETA, status phase, CTA colors, and route progress must update from React state/store/query updates. Any fix that requires a Metro reload, app reload, or sheet remount to reveal current ETA or arrival state is incomplete.

## Current Suspicions

1. Cash auto-approval handoff starts tracking from an initiation payload, not the hydrated approval/assignment payload.
2. Realtime update cannot create an active trip if no trip exists yet; it only merges into the existing store trip.
3. Active-trip query runs on its own timing, so it may hydrate responder identity after the sheet has already opened.
4. Heartbeat may not run if `getActiveAmbulanceDemoHospital(activeAmbulanceTrip)` returns null while hospitals are still loading or filtered.
5. Ambulance sprite heading should follow route bearing whenever coordinate projection is route-derived; raw responder heading should be fallback only.
6. Contact Dispatch can show a connection-lost/error state in demo flows if the tracking entry passes a display id instead of the emergency request UUID, or if a failed room ensure loops without a user retry.

## Audit Checkpoint: 2026-05-19

Current evidence is recorded in `docs/audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md`.

Key contracts confirmed:

- Realtime is a patch stream. It cannot create a missing active trip.
- Tracking auto-open is currently `requestId + hasActiveTrip`, not `tracking-ready`.
- `pending_approval` intentionally participates in active-trip identity, so removing it from active query status is risky without a real stage snapshot.
- Route/ETA preservation exists because previous fixes prevented blank ETA and route callback deadlocks.
- Runtime currently has candidate patches for hydrated cash approval payloads, hospital fallback for heartbeat, and route-first ambulance heading. These still need full-flow verification before being treated as final.
- Contact Dispatch is included in the same fix scope. Current candidate patch prefers the emergency request row UUID for room creation and prevents the modal from repeatedly re-ensuring a failed room until the user taps Retry.

## Fix Order

Run this as one uninterrupted lane:

1. Finish active dispatch handoff: approval result, completion payload, active-trip write, XState transition, and tracking open.
2. Finish the pure tracking snapshot and stage taxonomy.
3. Route hero/top-slot/action presentation through the snapshot without redesigning the sheet.
4. Harden ETA, route preservation, heartbeat hospital fallback, and route-first ambulance heading.
5. Verify Contact Dispatch only as a tracking-adjacent surface: first open, retry, quick action send, demo dispatch reply, close/reopen, and tracking preservation behind the modal.
6. Run syntax/static checks, targeted smoke assertions, and then live runtime QA.

No-distraction rule:

- Do not switch to booking visit, Explore Care, provider discovery, docs cleanup, or unrelated UI polish until this lane is complete.
- New discoveries get logged in the tracking pass doc unless they directly block the current lane.
- Contact Dispatch remains in scope only because it is launched from tracking and can show a false connection-lost state during active emergency flow.

## Do Not Lose

- The tracking sheet is a product highlight.
- Telemetry, route animation, and responder identity should feel alive even when simulated.
- Do not remove the layered architecture; make the layers directional and less improvisational.
- Do not let docs sprawl decide behavior. Code and this tracker are the current working truth until the docs repo is cleaned.

## Dropped-Feature Audit: 2026-07-14

### Scope And Baseline

The audit compared the working emergency/map lineage through `ec4c0674`, the production dispatch authority in `c21d71b3`, and the App hardening in `a75b4265`. It traced database/RPC/Edge authority through App query/store/realtime projection, map UI actions, Console presentation, notifications, reload behavior, and two authenticated patient sessions.

The recurring defect class was: a hardening change correctly removed an unauthorized client write, but the user-visible capability was deleted before its canonical backend owner was wired back into the journey.

### Findings And Disposition

| Severity | Finding | Classification | Disposition |
|---|---|---|---|
| P0 | An offered ambulance could appear accepted and animate en route because `in_progress`, ambulance identity, route progress, and ETA were combined as dispatch truth. | Accidental regression over a pre-existing false-authority path. | Repaired. `in_progress` is assigning only; accepted responder evidence gates identity, movement, telemetry, and the dispatched milestone. Console desktop, tablet, phone, and modal share the same presentation rule. |
| P0 | Demo cash approval created an offer but had no responder-side accept/telemetry/arrival replacement after patient status writes were removed. | Accidental feature drop. | Repaired through `demo-emergency-lifecycle`, which invisibly simulates the responder using the production RPCs. Demo and live retain the same patient UI and lifecycle contract. |
| P0 | Responder-owned completion produced a completed visit but the App rating recovery only recognized `rating_pending`. | Accidental feature drop; removing patient completion was intentional. | Repaired by treating completed, unrated emergency visits as rating-eligible while preserving duplicate, rated, skipped, cancelled, and handled-id guards. |
| P0 | The App requested demo `mark_completed`, but its service allowlist rejected the action even though the deployed Edge Function supported it. The direct Edge live test therefore missed a broken App adapter. | Accidental feature drop in the dirty repair. | Repaired. The adapter now permits `mark_completed`, and the static contract explicitly guards the allowlist. |
| P1 | Canonical notification actions (`view_payment`, `track_emergency`, `acknowledge_responder_arrival`, `view_emergency_request`, `view_emergency_visit`) were emitted but not routed by the App. | Accidental consumer drift. | Repaired with table-driven labels and destinations while preserving legacy actions and fallback behavior. |
| P1 | Scheduled-visit and async-consult notifications were also emitted without App destinations, while emergency completion supplied a request relation that the visit router discarded. | Accidental consumer drift from the scheduled-care rollout. | Repaired. `view_scheduled_visit` and `open_async_consult` open the existing visit-detail route, and `view_emergency_visit` can resolve that route by canonical request ID. |
| P1 | The RPC returned `canonical_total`, but the App discarded it; request payloads also omitted `distance_km` and selected bed metadata. | Contract drift, with older bed-field loss exposed by hardening. | Partially repaired. Distance and bed selection now cross the service boundary, the canonical total is retained, wallet/card settlement uses it, and changed totals fail closed. Database `create_emergency_v4` still persists only `bed_number`; `bed_type` and `bed_count` require a separately proved receiver update. |
| P1 | Bed Check in and Complete stay disappeared after direct patient lifecycle writes were disabled. | Authority correction exposed an incomplete live bed contract. | Open. `console_accept_bed_emergency` and authorized bed completion exist, but no canonical patient check-in receiver or bed live E2E currently exists. Do not restore direct patient status writes. |
| P1 | Cancellation still raced a request write, visit cancellation, and visit lifecycle update from the client. A rejected request transition could therefore leave visit history ahead of canonical emergency truth. | Accidental duplicate-owner residue. | Repaired. Ambulance, bed, and pending-approval cancellation now issue only the canonical request transition; `sync_emergency_to_visit()` owns the visit projection. Tracking sheet layout, detents, presentation stages, and CTA placement are unchanged. |
| P1 | Backend completion could leave a terminal trip mounted, which blocked same-device rating recovery even though a fresh device could recover the completed visit. | Accidental terminal-state handoff gap. | Repaired. A matching terminal request may hand off to the existing rating recovery modal, then the persisted ambulance or bed trip is cleared. Nonterminal and unrelated requests still block recovery. |
| P1 | A paid `in_progress` bed request was labelled `Bed reserved` before a facility executed `console_accept_bed_emergency`. | Premature UI truth. | Repaired at the presentation boundary. `in_progress` now reads `Awaiting facility`; reservation copy requires canonical acceptance. No tracking-sheet layout or detent changed. |
| P2 | Foreground and fresh-device recovery were weaker than the generic focus test implied. | Proof gap. | Active-trip query now refetches on window/app focus. Completed-unrated visit recovery covers a cold session, but native background push delivery remains a documented pre-existing no-go until separately proved. |

### Intentional Corrections To Preserve

- Patient request status writes remain limited to cancellation.
- Patient Confirm arrival remains an acknowledgement after responder-owned arrival.
- ETA and route progress never create `arrived` state.
- Patient UI never completes an ambulance request; assigned responder authority remains required.
- Client-authored payment/lifecycle notifications stay removed; canonical backend notifications own delivery.
- Offered assignments never expose accepted responder identity or movement.

### Live Proof

`supabase/tests/scripts/run_demo_emergency_lifecycle_live_e2e.js` passed 21 linked-project checks on `dlwtcmhdzoklveihuhjf` with zero residue:

- canonical cash request and provider fee authority
- offered-to-accepted responder assignment
- two independent patient Auth sessions observing the same accepted state
- canonical telemetry sequence advanced from both sessions
- responder-owned arrival
- patient arrival acknowledgement and idempotent replay
- denial of patient completion authority
- responder-owned completion and ambulance release
- singular accepted, arrived, acknowledged, and completed notifications
- exact fixture cleanup, including audit/activity rows and Auth identities

The existing production emergency harness also remains the authority for role/RLS, two-session concurrency, Storage, no-fleet fallback, idempotency, realtime, and cleanup coverage.

### Live Incident Evidence

The latest user-created request inspected on 2026-07-14, `REQ-85C779`, was payment-complete and `in_progress` with no responder assignment, ambulance, ETA, telemetry, arrival transition, or patient acknowledgement. Its linked visit had nevertheless been written to `lifecycle_state = arrived` by the previously released client path. This explains why the old App could show arrival progress while Console and a fresh session still saw an unassigned request, and why canonical Confirm arrival correctly remained unavailable.

The repair does not infer arrival from that visit row or from elapsed ETA. The deployed demo lifecycle Edge Function must first create and accept a real assignment, report telemetry, and execute responder-owned arrival. The App then exposes the existing Confirm arrival CTA as a patient acknowledgement. Delivering that client orchestration requires an EAS update for runtime `1.0.6`; no database schema migration is part of this repair.

### Adversarial Backend Findings

These findings are not corrected by the App/Edge repair and must remain visible in launch decisions:

1. **Closed P0 organization-role patient/wallet authority:** `create_emergency_v4` now permits organization operators to create only cash/card requests inside their own organization and rejects wallet selection for another patient. Both `process_wallet_payment` signatures require the patient actor or service role. Linked hardening guards and the isolated live matrix prove cross-patient wallet denial, same-patient two-session convergence, and canonical idempotent settlement.
2. **P1 caller-owned distance:** base pricing is server-owned, but `distance_km` is accepted from the caller rather than derived or verified from canonical patient/hospital coordinates. Wallet and card settlement then correctly enforce the resulting, potentially underpriced total.
3. **P1 bed capacity and identity:** `bed_type` and `bed_count` are not persisted by the canonical create receiver, occupancy decrements one without a proved capacity reservation, and bed acceptance replay does not prove the same hospital/bed payload.
4. **P1 emergency visit/rating authority:** patient RLS still allows broad updates to request-derived visits, while the separate rating RPC does not provide the same completion and one-rating guarantees as the App adapter.
5. **P1 dispatcher payment contradiction:** dispatcher command authority, payment row visibility, and cash-approval notification recipients do not currently describe one coherent role contract.
6. **P1 create recovery:** active-request uniqueness prevents duplicate emergencies but does not return the existing request for a lost-response or second-device idempotent retry.

These are backend contract findings, not evidence that the restored demo responder lane failed its 21-check live proof. They do mean the ecosystem should not be described as fully production-ready until the P0 authority chain and the applicable P1 launch contracts are closed.

### Remaining Release Gates

1. Derive or verify billable distance from canonical coordinates instead of trusting caller mileage.
2. Define and prove the bed acceptance, check-in, occupancy, capacity, completion, and rating contract with a full live E2E.
3. Persist `bed_type` and `bed_count` through the canonical request receiver and regenerate shared types only if schema shape changes.
4. Add a resumable user path for a post-create canonical price change. Current wallet/card behavior correctly refuses to charge a changed amount, but recovery should not depend only on leaving the sheet and reopening payment.
5. Add idempotent create recovery for lost responses and second-device retries.
6. Converge emergency-visit rating authority and dispatcher payment/read/notification authority.
7. Prove actual native background notification delivery before advertising background dispatch alerts. Foreground realtime and refetch are not background push proof.

### Notification And Migration Closure: 2026-07-14

The completion/rating notification error exposed stale client ownership rather than a failed visit lifecycle. Notification creation and canonical payload fields remain backend-owned. App and Console clear actions now persist recipient-owned `dismissed_at` state, while physical delete, client insert, and canonical-field edits remain denied. The linked two-session RLS proof passed with the canonical event row retained and zero test residue.

The emergency, wallet-authority, ambulance-compatibility, and notification deployment SQL was then folded into the 11 canonical pillars. Ten temporary July migration files were deleted and their remote ledger versions repaired as reverted. `supabase migration list` now shows the same 11 pillars locally and remotely, and `supabase db push --linked --dry-run` reports the database is up to date.

### Real-Device Lifecycle Closure: 2026-07-14

The native Android App, linked Supabase project, and local Console were exercised as one user-visible journey using request `REQ-C6988A` (`60fc8610-24db-4857-bb4e-b28d04a3b830`). This was not a direct SQL lifecycle simulation.

Observed canonical sequence:

- cash request created and approved
- responder assignment `53f01b8f-9517-4030-9e82-9b956e92f8da` accepted by Demo Driver 3
- telemetry advanced to sequence 52
- responder marked arrived
- patient Confirm Arrival persisted `patient_acknowledged_arrival_at`
- responder completed the request and assignment
- patient Complete Visit opened the existing rating flow
- 5-star feedback persisted on visit `VIST-C27138` (`b56448dd-6bd4-4190-a5b1-ea6891808817`)

Final truth is converged: request `completed`, assignment `completed`, visit `rated`, rating `5`, and no active tracking sheet remained after feedback submission. The Console lifecycle projection tests also passed across phone, tablet, and desktop action rules.

One presentation race was found and repaired. A newly committed rating state could be hidden while the invalidated Visits query still contained older rows. The cold-start phantom guard remains intact, but an explicit `completionCommitted` handoff now survives that short query lag; matching rated truth still closes it immediately. The focused rating recovery contract and the real device both passed.

The Console tablet maximum-update-depth report was traced to Radix Checkbox Presence inside `TabletRecordRow`. Tablet selection now uses the stateless console-owned checkbox primitive. The restarted server serves chunk `co-0f4842`; reports naming old chunk `co-3490e9` are stale browser instances and require a hard refresh.

On Android resume, Supabase Auth can emit a development LogBox banner for a transient `Network request failed` while TanStack Query refocuses. It is not the product Toast surface and does not ship in EAS production. The refetch recovered, the rating write succeeded, and canonical lifecycle state remained intact. Treat repeated production connectivity failures separately from this development overlay.
