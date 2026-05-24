---
status: living
owner: patent
last_updated: 2026-05-24
---

# Emergency Commit Graph Algorithm Dossier

> Status: invention documentation draft
> Scope: iVisit patient app, emergency/provider discovery, commit/payment, and realtime tracking
> Purpose: preserve the problem, inputs, outputs, algorithm, invariants, and proof sketch for patent/trade-secret review.

## 1. Invention Summary

The Emergency Commit Graph is a staged decision and execution algorithm for converting an uncertain patient care intent into a safe, auditable emergency service request.

The algorithm does not merely find a nearby hospital. It constructs a bounded decision graph that:

1. validates or recovers the patient's location,
2. discovers and ranks candidate care providers using owned data first and external data only when needed,
3. binds the selected provider to a service choice, route context, price snapshot, identity snapshot, and optional triage snapshot,
4. delays the irreversible emergency request creation until the commit gate has enough truth,
5. atomically creates the emergency/payment state through backend RPCs, and
6. projects backend truth into realtime patient-facing tracking.

The protectable core is the staged commit graph and its guards: the system can show useful pre-dispatch choices without exposing live responder resources prematurely, then converts a committed choice into a deterministic backend lifecycle.

## 2. Problem Statement

Emergency-care marketplaces have three conflicting requirements:

- A patient needs a fast answer and cannot tolerate browsing friction.
- Providers, rooms, ambulances, payments, and identity can be incomplete or stale at the time of intent.
- A dispatched emergency record should not be created until enough facts exist to make the record safe, payable, and auditable.

The technical problem is to transform uncertain patient intent into an actionable emergency request while minimizing false commits, duplicate active requests, stale provider selection, and invisible state transitions.

## 3. System Inputs

### Patient and Intent Inputs

- `careIntent`: ambulance, bed, or paired ambulance plus bed.
- `patientLocation`: GPS, manually selected address, saved/recent location, or fallback last-known location.
- `patientIdentity`: email, phone, authenticated user, guest draft, or review/demo bridge.
- `patientSnapshot`: patient name/contact plus permitted medical/emergency-contact sharing.
- `triageSnapshot`: optional symptom/check-in signal captured before or after commit.

### Provider Inputs

- Canonical provider rows from Supabase.
- Provider category, emergency mode, radius, country code, and result limit.
- External provider rows from Google Places and/or Mapbox.
- Dispatchability signals: provider type, verification/import status, row status, demo status.
- Capacity signals: available beds, service pricing, room pricing, ambulance/service metadata.

### Routing and Cost Inputs

- Origin and destination coordinates.
- Route distance/ETA or fallback direct-route estimate.
- Service pricing or selected service price text.
- Organization fee, wallet/cash/card eligibility, billing quote, and payment method.

### Runtime Inputs

- Existing active ambulance/bed requests.
- Pending approval state.
- Realtime emergency request updates.
- Realtime ambulance telemetry.
- Realtime hospital bed updates.

## 4. System Outputs

### Pre-Commit Outputs

- Ranked candidate provider list.
- Recommended/nearest hospital and associated metadata.
- Selected hospital/service/room/transport payload.
- Route preview and ETA display where available.
- Pricing snapshot with total, fee, breakdown, and currency.
- Commit readiness state.

### Commit Outputs

- `emergency_requests` row created through `create_emergency_v4`.
- Payment row/state created or linked atomically.
- Canonical request UUID plus display ID.
- Pending approval state when cash/admin approval is required.
- Active trip or bed booking projection when dispatch is released.

### Post-Commit Outputs

- Patient-facing active tracking model.
- Realtime status projection: pending approval, in progress, accepted, arrived, completed, cancelled, or payment declined.
- Responder/ambulance telemetry when available.
- Hospital bed availability updates.
- Visit/history synchronization and rating/recovery affordances.

## 5. Algorithm Overview

### Phase A: Location Truth Acquisition

The algorithm selects a usable patient origin in this priority order:

1. request-provided coordinate,
2. current device location,
3. persisted last-known location,
4. default app coordinate as a cold-install fallback.

Manual locations without geocoded or valid coordinates are rejected at the map flow reducer.

Implementation evidence:

- `hooks/emergency/useRequestFlow.js`
- `hooks/map/state/mapExploreFlow.store.js`

### Phase B: Provider Sufficiency and Discovery

The algorithm first queries app-owned provider data. In emergency mode it uses emergency-eligible hospitals. In explore mode it uses category-aware providers.

It then evaluates whether the database results are sufficient:

- emergency mode counts dispatchable database rows,
- explore mode counts category-matching rows,
- local coverage must meet a local comfort target,
- total coverage must meet a broader comfort target.

If database coverage is insufficient, the algorithm fetches external provider data. In local-first regions, it first searches the local radius, then widens only if local results are below the comfort target. Results are normalized, optionally persisted, merged with canonical rows, deduplicated, and limited.

Implementation evidence:

- `supabase/functions/discovery/discover-hospitals/handler.ts`
- `supabase/functions/_shared/domain/providers/rows.ts`
- `supabase/functions/_shared/domain/providers/discoveryFlow.ts`
- `supabase/functions/_shared/domain/providers/response.ts`
- `services/hospitalsService.js`

### Phase C: Candidate Ranking

The legacy dispatch ranking scores hospitals by weighted criteria:

- distance score: 40 percent,
- bed availability score: 30 percent,
- wait time score: 20 percent,
- ambulance availability score: 10 percent.

Provider discovery also prefers canonical/dispatchable rows before external rows and uses distance as a stable ordering signal. The map flow independently derives nearest, local-nearby, bed-capable, featured, and recommended provider views from the discovered provider set.

Implementation evidence:

- `services/dispatchService.js`
- `hooks/map/exploreFlow/useMapDerivedData.js`
- `supabase/functions/_shared/domain/providers/rows.ts`

### Phase D: Decision Graph

The map sheet carries the patient through deterministic phases:

`explore_intent -> ambulance_decision | bed_decision -> commit_details -> commit_payment -> tracking`

For paired ambulance plus bed:

`explore_intent -> ambulance_decision -> bed_decision -> commit_details -> commit_payment -> tracking`

The paired flow saves the selected transport while the room is selected. If the hospital changes, the saved transport should be invalidated and recalculated against the new hospital.

If the user already has valid email and phone, `commit_details` can be skipped and the graph opens `commit_payment` directly with a draft identity payload.

Implementation evidence:

- `hooks/map/decision/useMapDecisionHandlers.js`
- `hooks/map/exploreFlow/useMapSheetNavigation.js`
- `hooks/map/state/mapExploreFlow.store.js`
- `components/map/core/MapSheetOrchestrator.jsx`

### Phase E: Commit Readiness and Payment Gate

The commit payment controller calculates or normalizes a cost snapshot, refreshes eligible payment methods, applies billing quotes, and locks submission while payment/dispatch finalization is running.

The request built for commit includes:

- generated display ID,
- hospital ID and hospital name,
- service type,
- selected transport or room,
- selected payment method,
- pricing snapshot,
- patient location,
- location label and confirmation timestamp,
- triage/check-in snapshot where present.

Implementation evidence:

- `components/map/views/commitPayment/useMapCommitPaymentController.js`
- `components/map/views/commitPayment/mapCommitPayment.helpers.js`
- `services/pricingService.js`

### Phase F: Atomic Emergency Creation

Before calling the backend RPC, the request flow checks for active requests of the same guarded service type and blocks duplicates. It computes distance/ETA, normalizes cost, chooses a payment method, detects cash/demo approval behavior, and invokes `emergencyRequestsService.create`.

The service then calls `create_emergency_v4` with request data and payment data. The backend returns canonical identifiers and payment/approval status.

Backend creation also records transition context, requires an authenticated owner or privileged actor, resolves hospital organization, parses patient location, creates the emergency request, creates a visit record, inserts payment metadata, and returns request/payment/approval identifiers.

Implementation evidence:

- `hooks/emergency/useRequestFlow.js`
- `services/emergencyRequestsService.js`
- `supabase/migrations/20260219000800_emergency_logic.sql`
- `supabase/migrations/20260219010000_core_rpcs.sql`
- `supabase/migrations/20260219000300_logistics.sql`

### Phase G: Realtime Truth Projection

After commit, the algorithm projects server truth into patient-facing runtime state:

- request row updates update active ambulance/bed state,
- ambulance location rows update responder telemetry,
- hospital rows update bed availability,
- realtime reconnect/recovery events trigger a debounced server truth sync,
- stale ambulance telemetry events are gated by event version.

Implementation evidence:

- `contexts/EmergencyContext.jsx`
- `hooks/emergency/useEmergencyRealtime.js`
- `machines/tripLifecycleMachine.js`
- `components/map/core/mapActiveRequestModel.js`

## 6. Canonical Pseudocode

```text
function emergencyCommitGraph(intent, locationInput, user, providerOptions):
  origin = resolveLocation(locationInput)
  if not validCoordinate(origin):
    origin = recoverLastKnownOrDefaultLocation()

  providerRows = queryOwnedProviders(origin, providerOptions)
  sufficiency = evaluateDatabaseSufficiency(providerRows, providerOptions)

  if not sufficiency.hasEnoughDbResults:
    externalRows = fetchExternalProviders(origin, providerOptions)
    normalizedRows = normalizeExternalProviders(externalRows)
    if providerOptions.mergeWithDatabase:
      providerRows = persistAndRefresh(normalizedRows, providerRows)

  candidates = mergeDeduplicateAndPrioritize(providerRows, normalizedRows)
  recommendation = deriveNearestOrBestCandidate(candidates, intent, origin)

  selection = collectServiceSelection(intent, recommendation)
  if intent == "ambulance+bed":
    transport = selection.transport
    room = collectRoomSelection(recommendation)
    if room.hospitalId != transport.hospitalId:
      transport = recalculateTransport(room.hospitalId)

  identityDraft = resolveIdentityDraft(user)
  if not identityDraft.hasEmailAndPhone:
    identityDraft = collectCommitDetails()

  pricingSnapshot = resolvePricing(selection, recommendation, origin)
  paymentMethod = resolveEligiblePaymentMethod(user, pricingSnapshot)

  if activeRequestExists(user.id, intent.guardedServiceType):
    return block("ALREADY_ACTIVE")

  requestPayload = buildEmergencyRequest(
    intent,
    recommendation,
    selection,
    origin,
    identityDraft,
    pricingSnapshot,
    paymentMethod,
  )

  result = createEmergencyAtomically(requestPayload)

  if result.requiresApproval:
    projectPendingApproval(result)
  else:
    projectActiveTripOrBooking(result)

  subscribeToRealtimeTruth(result.requestId)
  return result
```

## 7. Invariants

### Safety Invariants

- The irreversible request creation occurs only at the payment/commit phase.
- A user cannot create a second active ambulance request or second active bed request for the same guarded service type.
- Backend unique indexes enforce one active ambulance request and one active bed request per user.
- Patient mutations use canonical request UUIDs where possible, resolving display IDs before mutation.
- Manual locations without valid coordinates are rejected.
- Pre-dispatch selection uses stable hospital/service metadata, not live responder telemetry as the source of truth.

### Consistency Invariants

- Provider discovery always returns normalized rows to the app, regardless of database, Google, or Mapbox source.
- Canonical database rows are preferred over external rows when duplicates are merged.
- Emergency-mode provider discovery filters for dispatchable hospital rows.
- Explore-mode provider discovery filters by requested provider category.
- Payment and emergency request state are created together through backend RPC.

### UX/Runtime Invariants

- Every async commit path has pending/submitting/approval feedback.
- Realtime recovery triggers server truth sync rather than leaving stale local state.
- Active trip projection clears terminal states.
- ETA fallbacks must not fabricate confident arrival times when none are known.

## 8. Proof Sketch

### Claim 1: The algorithm prevents premature emergency creation.

Proof sketch:

The graph requires provider selection, service selection, identity resolution, pricing/payment readiness, and duplicate-active checks before `create_emergency_v4` is called. Earlier phases operate on pre-commit payloads and UI state only. Therefore, user exploration and decision changes cannot create irreversible emergency records.

### Claim 2: The algorithm remains useful when owned provider coverage is incomplete.

Proof sketch:

Provider discovery first evaluates owned database sufficiency. If the database fails comfort thresholds, external providers are fetched, normalized, optionally persisted, merged, and deduplicated. Therefore, the app can produce a first meaningful result in low-coverage regions while strengthening future owned coverage.

### Claim 3: The algorithm reduces duplicate active emergency states.

Proof sketch:

Client-side `canStartRequest` blocks active or pending requests by service type. `emergencyRequestsService.create` performs a server-backed preflight against active request statuses before calling the RPC. Database constraints/RPC transition rules provide an additional backend guard. Therefore, duplicate active requests are blocked at multiple layers.

### Claim 4: The algorithm preserves patient-visible truth after commit.

Proof sketch:

After commit, local runtime state subscribes to emergency request updates, ambulance location updates, and hospital bed updates. Realtime channel recovery triggers debounced server sync. Event-version checks prevent stale telemetry overwrites. Therefore, patient-visible state converges back to backend truth after network or subscription instability.

## 9. Patentable Claim Families to Review

These are not legal claims yet. They are invention families to discuss with patent counsel.

1. A staged emergency service commit graph that defers irreversible request creation until location, provider, service, identity, payment, and duplicate-active guards are satisfied.
2. A provider sufficiency algorithm that uses owned emergency-provider rows first, measures local and total comfort thresholds, then selectively invokes external provider discovery and persists normalized rows.
3. A pre-dispatch metadata truth layer that enables actionable service selection before live responder assignment while reserving live responder telemetry for post-commit tracking.
4. A paired ambulance-and-bed selection graph that invalidates or recalculates transport selection when the facility selection changes.
5. A realtime emergency projection algorithm that combines request state, responder telemetry, bed availability, event-version gating, and recovery truth sync into one patient-facing tracking model.

## 10. Trade Secret Candidates

The following are better protected as trade secrets unless and until filed:

- provider comfort thresholds and local/wide fallback policy,
- provider row merge keys and canonicalization heuristics,
- final ranking weights for dispatch recommendation,
- payment/approval timing states and submission locks,
- triage timing, severity bands, and post-request enrichment strategy,
- demo-to-live coverage strategy and provider bootstrap rules.

## 11. Route/ETA Fallback Proof

### Route Resolution Chain

Route preview and ETA are resolved by a three-tier route chain:

1. Validate origin/destination coordinates and build a deterministic route key.
2. Try Mapbox Directions for full driving geometry.
3. Try OSRM routing when available and not in browser runtime.
4. Build a direct fallback route if route APIs are unavailable.

Fallback routes are not treated as authoritative navigation. They are explicitly marked with `isFallback: true`, use a shorter cache TTL, and can surface retry/banner state in the map route hook.

Implementation evidence:

- `services/routeService.js`
- `hooks/emergency/useMapRoute.js`
- `constants/mapConfig.js`

### Route Cache and Freshness

The route key is the origin/destination coordinate tuple rounded to six decimals:

`originLat:originLng:destinationLat:destinationLng`

This makes route snapshots stable for the same coordinate pair while preventing stale route reuse across pickup or hospital changes. Normal route results use a two-minute freshness window; fallback route results use a shorter fifteen-second freshness window.

### ETA Fallback Logic

If no route API succeeds, the fallback route uses:

- direct line between origin and destination,
- road-distance estimate of `straightLineKm * 1.2`,
- minimum route distance of 250 meters,
- assumed urban speed of 30 km/h on web and 34 km/h elsewhere,
- minimum duration of 60 seconds.

When a request is created without a map route, request flow computes a simpler ETA from distance when possible. Tracking then prefers preserved route ETA if it exists and otherwise uses server snapshot ETA. Commit completion avoids fabricating a confident ETA when no known ETA exists.

Implementation evidence:

- `services/routeService.js`
- `hooks/emergency/useRequestFlow.js`
- `hooks/emergency/useActiveTripQuery.js`
- `components/map/views/commitPayment/mapCommitPayment.helpers.js`

### Failure-Mode Matrix

| Failure mode | Detection | System response | Safety property |
| --- | --- | --- | --- |
| Missing origin or destination | `calculateRoute` receives null input | no route calculation is attempted | avoids invalid network calls |
| Invalid coordinates | `buildRouteKey` returns null | no route key, no fetch, no cache write | prevents malformed Mapbox/OSRM requests |
| Missing Mapbox token | Mapbox route returns null | OSRM attempted where allowed; otherwise fallback route | no blank route dependency on one provider |
| Mapbox timeout/HTTP/API failure | caught in `getMapboxRoute` | OSRM attempted next | graceful route-provider failover |
| Browser runtime with no Mapbox route | OSRM skipped in browser runtime | direct fallback route used | avoids browser CORS/runtime fragility |
| OSRM timeout/HTTP/API failure | caught in `getOSRMRoute` | direct fallback route used | patient still gets a bounded preview |
| Fallback route generated | `isFallback: true` | short TTL and retry banner state | fallback truth is visibly weaker and refreshed sooner |
| Route result duration is zero | normalized in `useMapRoute` | duration becomes 900 seconds | prevents zero-minute ETA display |
| Route APIs unavailable during commit | request flow computes distance-derived ETA or null | request still can commit, ETA may display as calculating/unknown | dispatch is not blocked by preview API failure |
| Server refetch lacks route | active trip query preserves previous route for same trip | avoids wiping a good route on partial server payload | patient-facing tracking remains stable |

### Route/ETA Proof Sketch

The route subsystem cannot corrupt the emergency commit graph because invalid coordinates terminate before network fetch, API failures collapse to explicitly marked fallback routes, fallback routes expire quickly, and request creation does not require a successful route API response. Post-commit tracking converges toward server truth while preserving previously known route/ETA data for the same trip identity.

## 12. End-to-End Trace Evidence

### Trace A: Ambulance-Only Flow

1. User selects ambulance intent from the map/explore surface.
2. Provider discovery returns nearby emergency-eligible hospitals.
3. The map derives nearest/recommended hospital metadata.
4. `handleUseHospital` opens `ambulance_decision`.
5. `handleConfirmAmbulanceDecision` either opens `commit_details` or skips to `commit_payment` if valid email and phone are already present.
6. `commit_payment` builds an ambulance request with hospital, transport, payment method, pricing snapshot, patient location, and optional triage.
7. `handleRequestInitiated` validates no active ambulance request exists, resolves location, calculates distance/ETA, normalizes cost, and calls `createRequest`.
8. `emergencyRequestsService.create` checks active requests again and calls `create_emergency_v4`.
9. If no approval/payment wait is required, `handleRequestComplete` projects an accepted ambulance trip and invalidates the active trip query.
10. Realtime subscriptions and active trip query keep the tracking sheet synchronized.

Primary implementation path:

- `hooks/map/decision/useMapDecisionHandlers.js`
- `components/map/views/commitPayment/useMapCommitPaymentController.js`
- `hooks/emergency/useRequestFlow.js`
- `services/emergencyRequestsService.js`
- `hooks/emergency/useActiveTripQuery.js`
- `hooks/emergency/useEmergencyRealtime.js`

### Trace B: Bed-Only Flow

1. User selects bed intent.
2. Provider discovery returns nearby hospitals/providers with room/bed context.
3. `handleUseHospital` opens `bed_decision`.
4. `handleConfirmBedDecision` captures the selected room and moves to `commit_details` or `commit_payment`.
5. `commit_payment` builds a bed request with hospital, room, payment method, pricing snapshot, patient location, and optional triage.
6. Request flow blocks existing active bed booking, creates request through the same atomic RPC path, and returns approval/payment state.
7. Completion projects a bed booking runtime state and invalidates active trip query.
8. Realtime hospital bed subscription updates availability while booking is active.

Primary implementation path:

- `hooks/map/decision/useMapDecisionHandlers.js`
- `components/map/views/bedDecision/MapBedDecisionStageBase.jsx`
- `components/map/views/commitPayment/mapCommitPayment.helpers.js`
- `hooks/emergency/useRequestFlow.js`
- `hooks/emergency/useEmergencyRealtime.js`

### Trace C: Paired Ambulance Plus Bed Flow

1. User selects paired intent.
2. `handleUseHospital` opens `ambulance_decision`.
3. `handleConfirmAmbulanceDecision` saves transport selection into the bed-decision payload instead of committing.
4. `bed_decision` displays the saved transport while the patient selects a room.
5. If the user changes hospital in the bed phase, `useMapSheetNavigation` compares the saved transport hospital ID with the new hospital ID and returns to `ambulance_decision` for the new hospital.
6. Once transport and room are hospital-consistent, `handleConfirmBedDecision` advances to `commit_details` or `commit_payment`.
7. The current implementation commits one guarded service request based on the commit payment mode, while carrying paired context in source payloads. A filing-grade claim should be careful to distinguish current implementation from future full atomic dual reservation.

Primary implementation path:

- `hooks/map/decision/useMapDecisionHandlers.js`
- `hooks/map/exploreFlow/useMapSheetNavigation.js`
- `components/map/views/bedDecision/MapBedDecisionStageParts.jsx`
- `components/map/core/mapSheetFlowPayloads.js`

### Trace D: Payment Approval Flow

1. `commit_payment` enters `PROCESSING_PAYMENT` and validates the selected payment method.
2. Request creation returns either immediate dispatch, `requiresApproval`, or `awaitsPaymentConfirmation`.
3. If `requiresApproval`, pending approval state is written into the emergency trip store and submission moves to `WAITING_APPROVAL`.
4. For demo cash approval, an auto-approval request is made after a short timeout.
5. If approval succeeds, completion payload is built, `handleRequestComplete` projects active state, active trip query is invalidated, pending approval is cleared, and transaction state becomes `DISPATCHED`.
6. If auto-approval fails, the controller polls settlement as recovery before surfacing failure.
7. If card confirmation is required, saved-card confirmation is attempted; settlement is polled before finalizing dispatch.

Primary implementation path:

- `components/map/views/commitPayment/useMapCommitPaymentController.js`
- `components/map/views/commitPayment/mapCommitPayment.transaction.js`
- `services/paymentService.js`
- `services/stripeSavedCardConfirmation.js`
- `hooks/emergency/useActiveTripQuery.js`

### Trace E: Realtime Recovery Flow

1. Emergency provider mounts realtime subscriptions for user-scoped emergency request updates.
2. Active ambulance trips also subscribe to request-specific emergency updates and ambulance location updates.
3. Active bed bookings subscribe to hospital bed row updates.
4. Realtime status changes are tracked by channel name.
5. Recovery or resubscribe statuses trigger a debounced `syncActiveTripsFromServer`.
6. Ambulance telemetry events pass through an event-version gate before mutating local trip state.
7. Active trip query periodically refetches and also refetches after explicit invalidation from payment completion.
8. Query-to-store sync preserves terminal trips and responder identity when server payloads are partial.

Primary implementation path:

- `contexts/EmergencyContext.jsx`
- `hooks/emergency/useEmergencyRealtime.js`
- `hooks/emergency/useActiveTripQuery.js`
- `utils/emergencyRealtimeProjection.js`
- `stores/emergencyTripStore.js`

## 13. Prior-Art Landscape and Differentiation

This is an initial engineering comparison, not a legal patentability opinion or exhaustive prior-art search.

### Ambulance Dispatch and Tracking

`US10832579B2`, "Integrated ambulance tracking system," describes receiving a patient ambulance request, determining an available ambulance based on patient device location, identifying a hospital, and sharing information with ambulance/hospital devices.

Differentiation target:

- iVisit should not claim generic ambulance request, ambulance tracking, or hospital notification.
- The narrower claim should focus on staged pre-dispatch metadata selection plus a commit/payment gate before atomic emergency creation.

Source:

- https://patents.google.com/patent/US10832579B2/en

### Hospital Diversion and Dispatch Facility Selection

`US11250529B2`, "Computer-aided dispatch including automatic diversions," covers facility status visibility, diverting status warnings, and dispatcher commands for emergency location dispatch and recommended facility transport.

Differentiation target:

- iVisit should not claim generic diversion awareness or dispatcher facility recommendation.
- iVisit can differentiate around patient-facing commit readiness, paired service selection, and pre-dispatch provider sufficiency under incomplete owned coverage.

Source:

- https://patents.google.com/patent/US11250529B2/en

### Bed Management and Occupancy

`US7720695B2`, "Managing patient bed assignments and bed occupancy in a health care facility," covers scheduling/reserving/requesting bed assignments, ED transfers, occupancy management, reports, and alerts.

Differentiation target:

- iVisit should not claim bed management inside a facility by itself.
- iVisit's stronger angle is cross-facility patient-side emergency commit: bed/transport selection, hospital-scoped invalidation, payment gate, and realtime post-commit projection.

Source:

- https://patents.google.com/patent/US7720695B2/en

### Bed Availability Based EMS Recommendation

The BMC Health Services Research article "The emergency medical service dispatch recommendation system using simulation based on bed availability" describes forecasting ED/ICU bed availability, integrating with Google Maps, and recommending ED destinations for ambulance dispatch.

Differentiation target:

- iVisit should not claim bed-availability-based hospital recommendation broadly.
- iVisit can focus on owned-provider sufficiency scoring, external provider fallback/persistence, and the staged commit/payment graph that converts recommendation into an auditable patient request.

Source:

- https://link.springer.com/article/10.1186/s12913-024-12006-8

### Healthcare Navigation

`US12004839B2`, "Computer-assisted patient navigation and information systems and methods," covers patient data intake, abnormality analysis, and navigation personnel guiding a patient to medical providers.

Differentiation target:

- iVisit should not claim symptom-based navigation or communication with navigators broadly.
- The stronger iVisit claim is machine-enforced transition from uncertain intent to atomic emergency/payment state, without requiring human navigation personnel as the central routing actor.

Source:

- https://patents.google.com/patent/US12004839B2/en

### General Patient Routing

`US20120016688A1`, "Method and apparatus for routing a patient to a health care provider and location," is an older patient-provider routing application.

Differentiation target:

- iVisit should avoid broad "route patient to provider" language.
- Claim around emergency-specific guarded request creation, duplicate-active prevention, payment/approval gating, and realtime truth projection.

Source:

- https://patents.google.com/patent/US20120016688A1/en

### Ride-Hailing Dispatch

`US11704608B2`, "Session-based transportation dispatch," covers predicting a transportation request from session information, reserving a provider, and later dispatching when the request materializes.

Differentiation target:

- iVisit should not claim pre-dispatch matching or reserving generic drivers.
- iVisit can distinguish medical safety constraints: provider capacity/disptachability, hospital-scoped service invalidation, payment-gated emergency creation, and server-enforced emergency lifecycle transitions.

Source:

- https://patents.google.com/patent/US11704608B2/en

### Medical IoT Bed Vacancy and Emergency Vehicle Rerouting

`AU2021107444A4`, "Medical-IoT system for estimating hospital beds vacancy, re-routing of emergency human logistic vehicle," appears close on bed vacancy and rerouting emergency vehicles.

Differentiation target:

- iVisit should avoid claiming IoT bed vacancy estimation or rerouting emergency vehicles by bed vacancy alone.
- The stronger claim should emphasize patient-side staged commit, provider sufficiency fallback/persistence, payment/approval readiness, and realtime state projection after atomic request creation.

Source:

- https://patents.google.com/patent/AU2021107444A4/en

### Claim Strategy After Prior-Art Scan

The broadest risky claims are:

- request an ambulance from a phone,
- route patient to nearest/best hospital,
- use bed availability in ambulance dispatch,
- reserve/request a hospital bed,
- track an ambulance on a map,
- match rider/passenger to a vehicle.

The stronger claim nucleus is:

> A staged emergency-care commit graph that combines owned-provider sufficiency evaluation, external-provider fallback/persistence, hospital-scoped service selection and invalidation, identity/payment readiness, duplicate-active guards, atomic emergency/payment creation, and realtime truth projection into one patient-facing emergency request lifecycle.

That nucleus should be decomposed into dependent claims around:

1. local/total database sufficiency thresholds before external discovery,
2. canonical-provider preference during merge/deduplication,
3. pre-dispatch service metadata instead of live responder telemetry,
4. hospital-scoped paired transport/bed invalidation,
5. payment/approval state as a dispatch gate,
6. route/ETA fallback with explicit fallback labeling and shortened cache TTL,
7. realtime recovery truth sync with event-version gating.

## 14. Open Proof Obligations

The requested route/ETA proof, end-to-end traces, initial prior-art comparison, SQL creation path, status-transition validator, duplicate active request indexes, and paired ambulance-bed invalidation path have been located in the repo or public sources.

To make this dossier filing-grade, the next pass should produce:

- exact code/SQL line exhibits for each claim element,
- sequence diagrams for the five traces,
- empirical trace logs from a local or staging run,
- claim charts comparing iVisit against the cited references,
- attorney-reviewed independent/dependent claim language,
- a foreign-filing risk review before any public disclosure.
