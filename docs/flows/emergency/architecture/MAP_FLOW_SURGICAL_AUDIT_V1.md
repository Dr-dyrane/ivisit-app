# Map Flow Surgical Audit (v1)

> Status: Active audit and hardening baseline  
> Scope: `/(auth)/map`, legacy emergency request flow, promoted emergency sheets  
> Standard: correctness, parity, architecture, UX clarity, and failure resilience

## 1. Current `/map` Flow Audit

Current user-visible sheet states:

| State | User job | Primary UI role | Current transition source |
| --- | --- | --- | --- |
| `explore_intent` | Decide what help to request | calm entry, nearest providers, profile/history access | default, close/back, completed recovery |
| `search` | Search/change location | location lookup and current-location recovery | search CTA, location change |
| `hospital_list` | Compare hospitals | list selection and source return | browse hospitals, service decision hospital switch |
| `hospital_detail` | Review a provider | provider confidence and service entry | map marker/card press |
| `service_detail` | Review transport/room details | explain selected service without losing source state | service row/details press |
| `ambulance_decision` | Choose transport | ambulance service selection | ambulance intent, combined flow step 1 |
| `bed_decision` | Choose bed/room | bed selection | bed intent, combined flow step 2, add bed from tracking |
| `commit_details` | Confirm contact identity | minimum user info gate | missing email/phone before payment |
| `commit_triage` | Add/update medical context | deterministic information update | tracking header/sheet, optional commit lane |
| `commit_payment` | Pay/submit request | payment method, request creation, dispatch handoff | commit details or identity auto-skip |
| `tracking` | Monitor/resolve active request | active status, route, triage, add bed, share ETA, cancel/complete | active request, payment completion, header toggle |

Current transition graph:

- `explore_intent -> ambulance_decision | bed_decision | search | hospital_list | hospital_detail`
- `hospital_detail -> service_detail | ambulance_decision | bed_decision`
- `ambulance_decision -> bed_decision` for combined flow, else `commit_details | commit_payment`
- `bed_decision -> commit_details | commit_payment`
- `commit_details -> commit_payment`
- `commit_triage -> commit_payment` for pre-dispatch or `tracking` when launched from tracking
- `commit_payment -> tracking | explore_intent | pending approval state`
- `tracking -> explore_intent` when hidden behind map mode
- `tracking -> commit_triage | bed_decision`
- close/back paths use `sourcePhase`, `sourceSnapState`, and `sourcePayload`

Underlying data requirements:

- location: global user location, manual selected location, formatted place label
- provider discovery: hospitals, selected hospital id, featured hospital, service selections, coverage mode
- request state: active ambulance trip, active bed booking, pending approval, commit flow
- service choice: transport item, room item, combined saved transport
- payment: payment methods, wallet balance, cash eligibility, cost snapshot, payment settlement
- triage: draft, deterministic progress, AI/copilot prompt, backend triage snapshot
- tracking: route polyline, route signature, ETA seconds, started timestamp, responder coordinate, heading, telemetry timestamp
- recovery: last public route, commit flow, rating recovery claim, local triage draft, legacy intake draft

Async actions and side effects:

- location permission/get-current-location/reverse geocode
- hospital discovery, coverage mode persistence, demo bootstrap
- route calculation and map readiness updates
- payment method refresh, wallet/cash eligibility, cost calculation
- request creation via emergency request service, card intent creation, Stripe confirmation, settlement polling
- cash approval realtime, pending approval persistence, demo auto approval
- active trip hydration and realtime emergency request updates
- responder telemetry projection and route timeline reconciliation
- triage live patch and backend persistence
- rating recovery claim write/delete and visit lifecycle updates
- global header/FAB/tab visibility coordination

State ownership today:

| Concern | Current owner | Assessment |
| --- | --- | --- |
| durable active request truth | `EmergencyContext` | correct owner, but too broad and still mixes hydration, telemetry, user-location sync, patch helpers, and service state |
| sheet phase/snap/payload | `useMapExploreFlow` reducer store | correct owner, now needs stricter contracts |
| source-return payloads | `sheetPayload` and `commitFlow` | useful, but drift-prone when both carry overlapping commit data |
| request creation/completion | `useRequestFlow` via stage controllers | reusable, but legacy-oriented and location/payment assumptions leak upward |
| payment method snapshot | `useMapCommitPaymentController` | improved, but must remain phase-entry refreshed and not depend on remount |
| triage draft/progress | commit triage controller plus active request patches | improved, but needs one durable request-scoped truth model |
| tracking display model | tracking model/presentation/runtime modules | improved, still depends on multiple raw trip fields and header-local derivation |
| map animation/runtime | map component plus trip context plus animation hook | functional, but must be audited for route-adherence and restart resilience |

Improper mixing and drift sources:

- `useMapExploreFlow.js` still mixes header rendering, sheet transitions, map readiness, location handoff, tracking metrics, and active request routing.
- `MapScreen.jsx` still owns recovered rating orchestration, route reconciliation, map marker state, and sheet composition.
- `EmergencyContext.jsx` mixes backend hydration, realtime subscriptions, operational state, telemetry health, and mutation helpers.
- `sheetPayload`, `commitFlow`, and active trip objects can duplicate hospital, transport, triage, pricing, and source-state values.
- Tracking header derives status/arrival/distance separately from tracking sheet models.
- Bed and ambulance share backend concepts but still diverge in UI and timing support.
- Legacy bridge screens still carry useful behavior that is not fully promoted into `/map`.

## 2. Legacy Emergency Flow Extraction

Important legacy user-facing steps:

- choose emergency or booking mode
- search/filter hospitals and specialties
- review hospital card, distance, wait/ETA, beds, and call fallback
- choose ambulance service or bed options
- preview ambulance/room details and price
- collect triage before booking and while waiting
- confirm identity and payment
- wait for cash approval when applicable
- show dispatched/request confirmation
- track ambulance or bed reservation
- mark ambulance arrived or bed occupied
- complete request
- show rating modal and optional tip
- cancel active request
- call 911 / coverage disclaimer for poor live coverage
- demo bootstrap for sparse test coverage

Important functional/data steps:

- auto-dispatch fallback can select best hospital
- current location fallback uses app default when permissions fail
- duplicate active request protection exists per service type
- request creation persists patient, shared medical profile, emergency contacts, location, pricing, payment method, triage snapshot
- backend creates/syncs visits
- payment can be card, cash approval, or demo cash simulation
- settlement can complete, fail, or remain pending
- active request lifecycle writes status and visit lifecycle
- triage persists non-blockingly at post-request, waiting-approval, and routing stages
- rating updates visit lifecycle to rated or post-completion

Legacy loading, error, retry, and recovery:

- coverage disclaimer and demo bootstrap explain sparse coverage
- payment and request submission have pending states
- cash approval can stay waiting and recover via realtime/sync
- failed route/cost/payment paths preserve a retryable state where possible
- active request survives route changes through `EmergencyContext`
- rating could be reopened from local recovery in the new flow, improving legacy behavior

## 3. Legacy-to-`/map` Parity Matrix

| Capability | Current parity | Notes |
| --- | --- | --- |
| map-first emergency entry | improved | `/map` keeps one persistent map/sheet instead of stack switching |
| hospital discovery | preserved | needs full device parity and stale/empty coverage checks |
| coverage disclaimer | partially implemented | legacy modal still exists, `/map` has demo bootstrap but not full disclaimer parity |
| demo bootstrap | preserved/improved | now part of `/map` readiness, but should remain behind shared storage boundary |
| choose ambulance service | improved | `/map` decision sheet and service detail are calmer than legacy modal |
| ambulance service user-facing labels | preserved/improved | uses visual profile copy, must be shared everywhere |
| choose bed/room | partially implemented | bed decision exists, but bed runtime parity is not signed off |
| combined ambulance + bed | partially implemented | ambulance then bed exists; reverse add-on and unified tracking rules are incomplete |
| contact identity gate | improved | `commit_details` is narrower than legacy profile/auth spread |
| Google auth in commit | intentionally removed for now | kept out to avoid urgency flow breakage |
| triage before payment | intentionally removed from required ambulance path | booking is faster; triage is now updateable during tracking |
| tracking-time triage update | improved | `/map` right/header action and CTA route to commit triage |
| deterministic triage progress | partially implemented | six-step map triage exists, persistence after reload still needs hard verification |
| payment method refresh on phase open | preserved/improved | commit payment refreshes methods and disables pending CTA |
| card payment and settlement | preserved | uses same services through commit payment controller |
| cash approval wait | preserved | pending approval state exists, needs `/map` UI parity pass |
| request creation and active trip start | preserved | uses `useRequestFlow`, but request-model normalization should be promoted |
| active ambulance tracking | improved | route-projected animation and persistent sheet, needs long-session validation |
| active bed reservation tracking | partially implemented | needs countdown/hold window and hero parity |
| mark arrived / confirm arrival | preserved/improved | tracking model supports arrived gate, copy updated |
| complete request -> rating | preserved/improved | `/map` adds device-local rating recovery claim |
| cancel active request | preserved | available from tracking, visual hierarchy improved |
| share ETA | partially implemented | text share exists; tokenized live share is future pass |
| call hospital/911 fallback | partially implemented | legacy call affordances not fully mapped into `/map` emergency states |
| poor location/missing location handling | partially implemented | map loading handles location, commit/request needs explicit failure UI contract |
| refresh/reconnect recovery | partially implemented | active request hydration exists, minimum persisted truth contract is now documented |

## 4. Architectural Problems And Drift Sources

Primary problems:

- no single explicit sheet-state contract existed before this pass
- transitions were plain object writes, so invalid phase/snap/payload combinations were easy to introduce
- commit flow and sheet payload overlap but are not normalized as a request draft model
- active request display is derived independently in header, tracking sheet, map marker, and request context
- payment, request creation, and tracking start cross multiple hooks without an explicit transaction model
- bed and ambulance are treated as separate UI lanes even when they share backend request fields
- wide-screen parity was added after iOS design instead of inherited through shell contracts

Drift-prone areas:

- tracking status copy and arrival gates
- ETA/distance formatting
- request id/display id formatting
- triage progress count and draft persistence
- bed countdown and reservation timing
- modal/header interaction when tracking is hidden behind map mode
- map animation restart/resume behavior
- payment method availability after method changes

## 5. Target Architecture

Layer responsibilities:

| Layer | Responsibility | Should not do |
| --- | --- | --- |
| presentation/UI | render visual components from explicit props | fetch, mutate backend, infer domain transitions |
| UX orchestration | move between valid phases, own source-return, header/sheet coordination | own backend request truth |
| domain/state logic | normalize request/trip/bed/payment/triage models, expose selectors | render UI |
| async/service layer | call Supabase/payment/location/routing services with explicit results | mutate UI state directly |
| persistence/shared state | store minimum app-owned truth and hydrate from backend | duplicate derived display labels |
| derived view state | compute labels, CTAs, disabled/loading/error states | store mutable copies unless needed for animation |

Target module direction:

- `mapFlowContracts`: valid phases, snap defaults, payload rules, transition invariants
- `mapRequestModel`: one normalized model for active ambulance, bed, pending approval, and combined states
- `mapTrackingSelectors`: one source for arrival/status/distance/CTA gates used by header and tracking sheet
- `mapCommitTransaction`: one explicit submit state machine for request creation, payment confirmation, pending approval, dispatch start
- `mapPersistence`: minimum resume payload read/write/reconcile with backend truth
- `mapFailurePresentation`: shared user-facing fallback/error copy for location, payment, route, request, tracking

## 6. State And Transition Model

Domain states:

- `idle`: no active request, explore sheet allowed
- `choosing_service`: ambulance or bed decision active
- `collecting_identity`: commit details active
- `collecting_triage`: commit triage active
- `paying`: payment snapshot and submit active
- `pending_approval`: backend request exists, waiting for provider/cash approval
- `tracking`: request accepted/live
- `arrived`: responder/bed reached user-facing arrival gate
- `completing`: user is resolving request
- `rating_pending`: backend complete, rating surface open/recoverable
- `resolved`: no active operational request
- `cancelled`: request cancelled and cleaned up
- `failed_retryable`: user can retry without losing safe data
- `failed_blocked`: user must change input, payment, hospital, or location

Valid high-level transitions:

- `idle -> choosing_service`
- `choosing_service -> collecting_identity | paying`
- `collecting_identity -> paying`
- `tracking -> collecting_triage -> tracking`
- `paying -> pending_approval | tracking | failed_retryable | failed_blocked`
- `pending_approval -> tracking | cancelled | failed_retryable`
- `tracking -> arrived -> completing -> rating_pending -> resolved`
- `tracking -> cancelled`
- `tracking -> choosing_service` only for explicit add-on flow

## 7. Invariants

- every sheet phase must be one known phase
- every sheet snap state must be allowed for its current phase and viewport
- `explore_intent` and `search` do not retain stale commit/tracking payload
- active operational truth lives in `EmergencyContext`, not only `sheetPayload`
- `sheetPayload` may describe navigation context, not canonical request truth
- commit payloads must carry hospital/service/draft data explicitly
- async actions expose pending, success, failure, and retry behavior
- duplicate request submissions are blocked per service type
- payment CTA cannot be final while method snapshot is unresolved
- request status gates must be consistent between smart header and tracking sheet
- completion must create or preserve a rating recovery path before active trip cleanup
- route progress must be derived from route/timestamps/telemetry, not from remount side effects
- persisted local state seeds recovery only; backend truth wins on reconcile

## 8. Failure-Mode Checklist

| Failure mode | User sees | System action | Preserved state | Retry |
| --- | --- | --- | --- | --- |
| missing location | compact location recovery state | ask/refresh location or use manual selection | selected care intent | yes |
| stale hospitals | loading/refreshing provider state | refresh hospitals/demo coverage | location and care intent | yes |
| no hospital available | coverage/911 fallback | show live/demo/call options | location | yes |
| route calculation delayed | map skeleton/route pending | keep sheet usable where safe | selected hospital/service | automatic |
| payment methods delayed | disabled/selecting payment CTA | refresh snapshot | draft, triage, service | automatic/manual |
| payment declined | declined state with method change | keep request/payment context | request id, draft, selected service | yes |
| card confirmation interrupted | finalizing or retryable failure | poll settlement before failing | request id and payment intent context | yes |
| cash approval pending | waiting approval surface | subscribe/sync backend | request id, triage, payment id | automatic |
| backend rejects optimistic request | failure copy and no active trip start | rollback pending UI if needed | draft/service/payment choice | yes |
| app reloads during active trip | tracking or explore with active header | hydrate from backend and local seed | request id, route seed, rating claim | automatic |
| tracking opens without hospital | fallback hospital name and route missing state | resolve by id from hospital list | request id | automatic |
| telemetry stale/lost | delayed/lost tone | keep route and last known marker | route, last coordinate | automatic |
| complete succeeds but rating closes | rating recovery reopens | local claim plus visit lifecycle | visit id | yes |
| modal opens while tracking hidden | modal remains closable, header hidden | suppress tracking header | active request | no action needed |

## 9. Phased Implementation Plan

Canonical execution now lives in [`MAP_RUNTIME_PASS_PLAN_V1.md`](./MAP_RUNTIME_PASS_PLAN_V1.md).

The surgical audit requirements are folded into that plan as follows:

| Surgical audit pass | Canonical runtime pass |
| --- | --- |
| Pass A: contracts and reducer guardrails | Pass 1 plus the completed contract guardrail addendum |
| Pass B: normalized request model | Pass 4A |
| Pass C: commit transaction model | Pass 3 structurally, Pass 4B behaviorally |
| Pass D: bed parity | Pass 6 and Pass 7 |
| Pass E: persistence and recovery | Pass 4, Pass 6, and Pass 8 |
| Pass F: failure UX and device matrix | Pass 5 and Pass 8 |

Do not execute this A-F list separately. Use the runtime plan's pass order, stop conditions, and status tracking.

## 10. Initial Implementation In This Pass

Implemented:

- added `components/map/core/mapFlowContracts.js`
- added `components/map/core/mapActiveRequestModel.js`
- routed reducer sheet writes through `normalizeMapSheetView`
- added `utils/locationSubscriptions.js` for safe Expo Location watcher cleanup
- moved remaining app-owned direct storage usages in `contexts/OTAUpdatesContext.jsx` and `screens/EmergencyScreen.jsx` behind `database.readRaw/writeRaw/deleteRaw`

Contract protected:

- invalid phase strings fall back to `explore_intent`
- invalid snap states fall back to phase defaults
- web/new-arch location cleanup cannot crash the provider tree
- app-owned persistence has one allowed boundary; only Supabase auth keeps a direct `AsyncStorage` adapter
- expanded-only phases cannot accidentally stay half/collapsed
- non-payload phases cannot retain stale payload objects
- dynamic callers still keep existing public action names
- active session header, tracking sheet, map marker, tracking triage handoff, and recovered-rating suppression now share a normalized active request model
- commit payment state naming is now contract-backed through `mapCommitPayment.transaction.js`, so controller and status UI read one submit-state vocabulary instead of duplicating raw string literals
- commit payment duplicate-submit prevention and timer cleanup now live in the controller boundary instead of being implicit timing behavior
- tracking-mounted rating and recovered rating now share the same persistence helper path for lifecycle writes, claim deletion, and tip settlement side effects
- request-id display fallback is now normalized through a shared formatter so UI paths do not leak raw backend UUIDs when only request truth is available
- arrival/minutes/distance display formatting is now normalized through one shared formatter contract instead of duplicated helpers in the header/tracking stack
- bed booking timing/runtime normalization now shares one source of truth across hydrate/start/realtime update paths, protecting the legacy 15-minute fallback hold window from reset drift
- bed tracking now inherits the fallback `Share ETA` action path already used by ambulance tracking, rather than silently omitting that capability

Legacy parity restored or improved:

- reduces source-return drift inherited from legacy route/step navigation
- makes hidden stale payload bugs less likely when location/search returns to explore
- creates the contract boundary needed before lifting legacy bed and failure behavior into `/map`
- restores the legacy expectation that active request identity/status is interpreted once and reused across the visible operational surfaces
- restores a legacy-grade payment transaction boundary where approval, confirmation, finalization, decline, and failure are explicit states rather than incidental UI branches
- reduces post-completion drift by making rating skip/submit persistence behave the same whether the rating modal is opened from live tracking or later recovery
- restores the legacy expectation that operational request labels look like user-facing request tokens rather than internal storage identifiers
- reduces presentation drift between smart header and tracking sheet by making primary operational metrics share the same formatting rules
- restores a core part of legacy bed timing parity by making reservation countdown state survive internal runtime handoffs instead of restarting opportunistically
- closes one obvious action-parity gap between ambulance and bed tracking by exposing `Share ETA` in both lanes
