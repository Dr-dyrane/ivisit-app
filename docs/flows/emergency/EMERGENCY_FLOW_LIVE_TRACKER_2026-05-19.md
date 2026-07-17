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

## Payment-To-Tracking Commitment Contract (2026-07-15)

Before payment creates a request, the selected hospital must be a canonical
hospital row that is available, emergency eligible, dispatch eligible, and
linked to an active verified organization. Provider-search previews never cross
the emergency commitment boundary.

Price is a server-owned input to the same handoff:

- The map can use raw pricing rows to decide which transport tier is offered.
- The server resolves the chosen BLS/ALS/CCT tier and its non-blocking fallback.
- That quote is the displayed payment amount; request creation recalculates and
  persists the same authority result.
- The payment sheet carries the returned canonical total and pricing provenance
  into its pending/approval presentation. It does not fabricate a local price
  or fee before tracking opens.

This protects the tracking handoff from two false starts: a provider that cannot
legally/operationally receive an emergency request, and a visual price that the
server cannot settle.

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

### Production Release: 2026-07-15

The repaired lifecycle was released from clean App `main` commit `fb4396c6` after the consolidated Supabase checkpoint `07bc5090`. Console tablet and lifecycle parity reached clean `main` commit `220f3a08` after shared contract checkpoint `06d5b01f`.

Release verification passed:

- all 9 App contract files
- emergency hardening guards
- Android production export with 3,188 modules
- linked Supabase dry-run with no pending migrations
- Console full suite: 215 suites and 1,437 tests
- Console data, encoding, UI hardgate, mobile grammar, and optimized production build
- real-device request `REQ-C6988A` through dispatch, telemetry, arrival acknowledgement, responder completion, and persisted 5-star rating

EAS production release evidence:

- branch: `production`
- runtime: `1.0.6`
- group: `9f9ba054-66c6-4b45-bcdf-b15d6d8987ec`
- Android: `019f639f-44e7-7197-800d-f1df50dbdfea`
- iOS: `019f639f-44e7-7e0b-8686-c6fefde47556`
- commit: `fb4396c6b20cf02477f71368a84b64cf16784f76`
- dashboard: `https://expo.dev/accounts/dyrane/projects/ivisit/updates/9f9ba054-66c6-4b45-bcdf-b15d6d8987ec`

The production branch contains exactly one new group for this release. No AAB or APK was built.

## Tracking Sheet Git Genealogy And Browser Repair Audit: 2026-07-14

### Verified Lineage

The tracking surface did not regress in one rewrite. It accumulated several independently reasonable changes whose ownership boundaries later diverged:

```text
236ce610  2026-04-20  tracking sheet and orchestrator introduced
|- e58a710c             monolithic tracking header and interaction polish
|- b630a446  2026-04-21 controller/runtime/presentation/timeline decomposition
|  `- 15db1938 2026-04-22 floating active-session header and animation model
|- 9aac4ce3  2026-04-26 XState lifecycle flags enter tracking runtime
|- ddd655bb             EmergencyContext removed from the subtree; MapScreen prop-drilling
|- dc8ae3d8  2026-04-27 persisted startedAt and reload recovery
|  `- c9b89b4c          route reconciliation extracted from MapScreen
|- 4e1408b2  2026-04-28 realtime and route-projection gap repair
|- ceab6c64  2026-05-03 live ETA atom fallback after request-key reset
|- 8d717951  2026-05-19 explicit tracking snapshot and stage taxonomy
|  `- 778f0dcc          stage-owned action eligibility
|     |- d11b1792       arrival-stage synchronization
|     `- b07abef7       Confirm arrival CTA emphasis
|- 09d9195c             payment-to-tracking identity and hydration stabilization
|- a75b4265  2026-07-14 responder-owned lifecycle authority; patient arrival acknowledgement RPC
`- fb4396c6             active-trip recovery, demo lifecycle continuity, rating handoff
```

The important asymmetry is now explicit:

- `MapTrackingStageBase.jsx` continued changing through the July continuity repair.
- `useMapTrackingSync.js` continued changing through the July continuity repair.
- `useMapTrackingHeader.js` was extracted on 2026-04-26 and its route-data contract did not evolve with the May and July tracking changes.
- `mapActiveSessionPresentation.js` was created on 2026-04-22 and still projected only the older `activeMapRequest` snapshot.

The sheet, route synchronizer, and top pill therefore no longer observed the same state graph.

### Root Cause: Payment To Route Pill

The pre-payment map calculates route duration, distance, and coordinates before a canonical emergency request UUID exists. That route is stored with `requestKey = null`. Payment completion then creates or hydrates the canonical request and changes the active tracking key to its UUID.

The request-key effect in `useMapTrackingSync.js` preserved route data only when the atom already had the new request key. On the actual payment transition it therefore discarded the preview duration, distance, and coordinates. It also omitted `distanceMeters` while seeding even for an already matching request. The map route callback commonly did not emit again because its route signature had not changed.

The top pill had a second, independent gap: it rendered `arrivalLabel`, `minuteValue`, and `distanceValue` only from `activeMapRequest`. It did not subscribe to the scoped live route atom used by the tracking sheet. Store reconciliation could not repair the gap immediately because responder-authority rules correctly prevent route/movement state from being committed while the request is only `in_progress` and still finding a responder.

### Root Cause: Confirm Arrival Appeared Dead

The July authority repair correctly changed Confirm arrival from a patient status write into `patient_acknowledge_responder_arrival`. The linked production endpoint exists and denies anonymous execution as expected. The remaining client problem was interaction continuity:

- the handler waited for active-trip invalidation/refetch after the RPC had already succeeded;
- a refetch problem could turn a successful acknowledgement into an apparent failed action;
- the controller did not inspect the returned `{ ok, error }` result;
- the patient received no success or failure toast;
- the local trip did not immediately receive the canonical acknowledgement timestamp.

This preserved backend authority but violated the UI rule that every primary action must acknowledge intent and outcome.

### Surgical Repair

The repair keeps the July lifecycle authority intact:

1. A pure request-seed projection promotes an unscoped live preview only during the observed `null -> canonical UUID` payment handoff.
2. A route belonging to an older request is rejected, so the repair cannot leak stale ETA or geometry into a later emergency.
3. Duration, distance, and coordinates survive both the payment handoff and same-request reseeding.
4. The top pill subscribes to the same request-scoped route atom as the sheet and overlays live metrics only for canonical `accepted` ambulance state.
5. `in_progress` remains `Finding responder`, with no manufactured responder movement or arrival.
6. Confirm arrival still calls only `patient_acknowledge_responder_arrival`.
7. On RPC success, the returned canonical acknowledgement timestamp is identity-guarded into the active trip immediately; active-trip refetch becomes background verification.
8. The CTA retains its pending state and now reports a visible success or error toast.

### Verification Added

`tests/emergencyPaymentLifecycleContract.test.cjs` now proves:

- preview route promotion to the canonical request key;
- rejection of a route belonging to an older request;
- accepted-state header synchronization for arrival, minutes, and kilometers;
- `in_progress` header copy remains `Finding responder` with no movement ETA;
- arrival acknowledgement updates local trip truth and refetches without blocking the successful RPC;
- success and failure feedback remain wired at the tracking controller.

The focused emergency payment/lifecycle contract, rating recovery contract, and production web export pass after the repair.

### Release Gate

Before calling the deployed browser incident closed, publish the App change and run one fresh authenticated browser journey:

`payment confirmed -> in_progress/Finding responder -> accepted/live top pill -> arrived/Confirm arrival -> acknowledgement removed -> responder completion -> rating`

Record the request UUID and display ID, verify `patient_acknowledged_arrival_at`, and confirm that a hard refresh resumes the same request without route identity leakage.

### Browser Follow-up: Responder-Owned Completion And Rating Recovery (2026-07-15)

A local authenticated browser journey confirmed the repaired tracking handoff through patient acknowledgement. The canonical request advanced from `arrived` to patient acknowledgement, then the responder completed it. That completion exposed one remaining recovery deadlock: `activeMapRequest` remained mounted as a terminal request, and the rating-recovery guard rejected every active request before the recovery effect could clear that terminal snapshot.

The repair is deliberately narrow:

1. A nonterminal active request still blocks rating recovery.
2. A terminal request may enter recovery only when one of its canonical request keys matches the completed, unrated Visit.
3. The history recovery effect clears that terminal trip before rendering the recovered rating state.
4. An already-visible in-flow rating state still wins, so the responder-completion path cannot create a second physical rating modal.

Browser proof after the repair: the terminal pill cleared, exactly one `Rate your transport` modal appeared for the matching completed visit, Skip resolved it through the canonical visit command, and a hard reload showed no duplicate rating modal. The completed request still projects terminal `Complete` truth when it is intentionally retained as context; it no longer presents stale en-route state or blocks rating recovery.

### Production Release: 2026-07-15 (lifecycle polish group)

Released from clean App `main` commit `f26e2959` (scheduled-visit + emergency continuity
polish across map surfaces, incl. migrations `20260715124000_emergency_pricing_hospital_commitment`
and `20260715131500_emergency_hospital_discovery_commitment`). Console lifecycle close-out
reached clean `main` commit `b737587a` (runtime CRUD audit: 92 findings resolved, 0 confirmed
failures; 484/484 contract tests; merged branches dropped).

Release verification passed:

- App local contract gates: emergency-continuity 7/7; scheduled-visits UI/state/async-consult/auth-return all PASS
- Console: 484/484 contract suites + 105/105 lifecycle unit tests, data-contract (475 verified column refs), encoding + mojibake clean, optimized production build

EAS production release evidence:

- branch: `production`
- runtime: `1.0.6`
- group: `d334c57b-7879-4780-aac3-5b370b37bd70`
- Android: `019f660d-89cc-7cda-a91a-8edd7a81ed9a`
- iOS: `019f660d-89cc-7b34-9da8-b86a956ed5aa`
- commit: `f26e2959b668a3775cb9cc9bfe1c0a19ff4f66a9`
- dashboard: `https://expo.dev/accounts/dyrane/projects/ivisit/updates/d334c57b-7879-4780-aac3-5b370b37bd70`

### Migration Consolidation: 2026-07-15 (deployment shims retired)

The two temporary deployment shims (`20260715124000_emergency_pricing_hospital_commitment`,
`20260715131500_emergency_hospital_discovery_commitment`) were verified byte-identical to their
pillar sources (resolve_emergency_pricing, create_emergency_v4 in `20260219000800_emergency_logic`;
calculate_emergency_cost_v2, nearby_hospitals in `20260219010000_core_rpcs`; REVOKE posture
matched), then deleted, and the remote migration history repaired
(`supabase migration repair --status reverted`). Post-repair verification: migration list shows
pillars only with local == remote, `db push --dry-run` reports the remote database up to date, and
live read-only probes confirm `resolve_emergency_pricing` (generic-fallback quote returned) and
`nearby_hospitals` (7 rows) remain live. Same procedure as the 20260714* consolidation (`06d5b01f`).

### Build Release: 2026-07-15 (1.0.7.52 - footer cap + doctor alignment)

Released from clean App `main` commit `b9dc8a35` (marker 1.0.7.52) on top of `23bac300`
(Select Transportation footer CTA maxWidth cap; SDK-54 patch alignment, expo doctor 18/18;
mlkit-ocr excluded with migration TODO). Tracking sheet untouched (ETA re-anchor attempt
reverted after live regression despite green contracts -- data-layer plan documented).

Artifacts (both runtime 1.0.7, embedded 1.0.7.52):
- Android APK versionCode 30 (preview, sideload): build 2e70ebf9, saved at
  artifacts/eas-builds/android-preview-1.0.7-build-30/
- Android AAB versionCode 31 (production, Play Console manual upload): build a1bc3c5d,
  saved at artifacts/eas-builds/android-production-1.0.7-build-31/

OTA parity: 1.0.7.52 published to production (47969d6f rt1.0.7 / 99c29246 rt1.0.6) and
staging (9a1b0e3e rt1.0.7 / 697f8e2f rt1.0.6); web deployed from the same push.

Open investigation: intermittent giant map markers on installed APKs only (Metro/web
render correctly; marker code unchanged since June) -- verify on build 30 sideload.

### Cross-Stream Realtime Ordering Repair: 2026-07-17

The fresh web journey required by the release gate reproduced an intermittent
stale tracking state on `REQ-99F595`. Responder telemetry and the route remained
active, but the top pill/sheet retained an earlier dispatch projection until a
hard refresh. The canonical database lifecycle was ahead of the mounted App.

Git history shows a latent ownership error rather than a new visual regression:

```text
2ba4f8fb  2026-03-04  generic realtime timestamp guard and telemetry projection
00a793d0  2026-04-26  EmergencyContext extraction; one shared event-gate ref
4e1408b2  2026-04-28  realtime/projection gap repair
a75b4265  2026-07-14  canonical responder lifecycle and telemetry authority
fb4396c6  2026-07-14  demo responder continuity and recovery
f26e2959  2026-07-15  payment/tracking/rating continuity polish
c566d7ff  2026-07-16  realtime cleanup and OTA lifecycle hygiene
```

The stale-event guard was valid within one source, but the hook applied one
clock to two sources. A newer `ambulances.updated_at` could advance the shared
gate and cause a valid `emergency_requests.updated_at` lifecycle transition to
be discarded. `mergeAmbulanceRealtimeTrip()` also copied the ambulance row time
into the trip's lifecycle `updatedAt`, allowing the contamination to survive
later renders.

The repair preserves the five-layer architecture:

1. Supabase remains canonical for request lifecycle and responder telemetry.
2. Realtime still patches an existing trip and query/refetch remains recovery.
3. Zustand still owns the persistent active-trip snapshot.
4. XState still receives canonical lifecycle legality.
5. Jotai still owns request-scoped tracking presentation.

Only the Layer 1 ordering boundary changed: emergency-request events and
ambulance-location events now have separate gates, and ambulance timestamps
are stored as `ambulanceUpdatedAt` instead of overwriting lifecycle
`updatedAt`.

Verification:

- the focused emergency continuity suite passed 7/7;
- the new adversarial test proves telemetry at `T+10` cannot reject an arrived
  request event at `T+5`;
- production web export passed;
- the live browser journey completed Confirm Arrival successfully, the CTA
  immediately became `Arrival confirmed`, responder-owned completion followed,
  exactly one rating modal rendered, Skip resolved it, and hard refresh showed
  neither a stale tracking request nor a duplicate rating;
- read-only database proof for UUID
  `152df5be-29cc-443b-ba51-5952a437380a` showed one completed request, one
  completed/post-completion Visit, a non-null
  `patient_acknowledged_arrival_at`, and the full ordered transition chain.

Local behavior is closed. Deployed web remains intentionally unsigned until
this source change is published and the same journey passes without refresh.

### Deployed Follow-up: Pickup-to-payment hospital identity race - 2026-07-17

The first deployed journey on merged App `main` was cancelled before request
creation because it exposed a stale discovery handoff:

1. payment for Hemet Valley Medical Center was closed;
2. pickup was changed through the Location sheet;
3. the transportation sheet displayed San Gorgonio Memorial Hospital at
   `$160.00`;
4. `Confirm & continue` opened payment for the prior Hemet Valley Medical
   Center selection at `$190.65`.

Git history tied this to a regression in the May location migration:

- the May 7 audit and implementation made a meaningful pickup change a
  hospital-state reset boundary;
- the May 17 TanStack migration (`f2af061b`) added
  `placeholderData(previousData)` to the location-keyed emergency hospital
  query;
- that placeholder allowed one pickup's hospital lane to render under another
  pickup until discovery settled.

The repair removes cross-key placeholder reuse while keeping same-key TanStack
cache/background refresh behavior. It also restores
`defaultExploreSnapState` at the `useMapLocation` call boundary.

Local browser proof after the repair:

`LifeStream decision ($200.84) -> Confirm & continue -> LifeStream payment
($200.84, cash)`

The surrounding map hospital set refreshed during the handoff, but the explicit
clicked hospital and quote remained stable in payment. No request or payment
was created during this identity test.

Verification:

- emergency continuity contract: 7/7;
- emergency discovery contract includes a no-cross-pickup-placeholder guard;
- local web runtime booted and the pickup-to-payment identity sequence passed.

Production lifecycle sign-off still requires publishing this repair, then
running the fresh no-refresh request through approval, accepted, arrived,
Confirm Arrival, completion, single rating, and hard-refresh recovery.
