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

If assignment is not ready, the UI can show a believable "dispatch accepted, assigning responder" moment, but should not imply live telemetry is healthy.

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
