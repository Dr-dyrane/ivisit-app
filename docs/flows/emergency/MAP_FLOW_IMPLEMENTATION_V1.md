# Map Flow Implementation (v1)

> Status: Active implementation note
> Scope: `/map` -> `explore_intent`, decision phases, commit, payment, tracking

Status note:

- This file contains older planning sections that still mention legacy bed-booking handoff and some earlier tracking assumptions.
- Current verified state is tracked in [MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md](./MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md).
- Use the audit file as the current-state source of truth when implementation and this note disagree.

2026-04-21 correction:

- `COMMIT_TRIAGE` is no longer required before payment.
- Fast path is now `commit_details -> commit_payment`.
- `COMMIT_TRIAGE` remains available from tracking as `My information` update.

Related:

- [EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md](./MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md)
- [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](./MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)
- [../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md](../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md)

## Current Architecture

The public map flow now follows this shape:

- [MapScreen.jsx](../../../screens/MapScreen.jsx)
  - thin composition layer only
- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)
  - owns explore-intent state, sheet phase state, profile/auth handoff, hospital selection, explicit demo bootstrap, and readiness gating
- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)
  - owns the persistent map render and route preview
- [MapSheetOrchestrator.jsx](../../../components/map/core/MapSheetOrchestrator.jsx)
  - thin sheet-phase router only
- [MapSheetShell.jsx](../../../components/map/MapSheetShell.jsx)
  - owns persistent sheet shell behavior
- [components/map/views/exploreIntent](../../../components/map/views/exploreIntent)
  - owns the current first mode using variant-based files
- [components/map/views/ambulanceDecision](../../../components/map/views/ambulanceDecision)
  - owns the dispatch-decision phase after the ambulance CTA
- [components/map/views/bedDecision](../../../components/map/views/bedDecision)
  - owns the room decision phase after `bed`, and after ambulance selection in the combined flow
- [components/map/views/commitDetails](../../../components/map/views/commitDetails)
  - owns email, OTP, and phone capture before request creation
- [components/map/views/commitTriage](../../../components/map/views/commitTriage)
  - owns the native optional triage/update phase (not a required pre-payment gate)
- [components/map/views/commitPayment](../../../components/map/views/commitPayment)
  - owns native payment, pending approval, and failure/success resolution
- [components/map/views/tracking](../../../components/map/views/tracking)
  - owns the first native post-payment active-request sheet state

## Readiness Contract

The screen should not expose a partial or broken first state.

`/map` now stays in loading until:

- location is resolved
- hospital discovery is resolved
- map instance is ready
- route is ready when a route is expected
- explicit demo coverage bootstrap is finished when needed

Supporting files:

- [MapExploreLoadingOverlay.jsx](../../../components/map/surfaces/MapExploreLoadingOverlay.jsx)
- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)

## Sheet And Modal Contract

The persistent pre-dispatch map flow now routes `search`, `hospital_list`, `hospital_detail`, `ambulance_decision`, and `bed_decision` through the shared sheet shell.

Persistent sheet path:

- [MapSheetOrchestrator.jsx](../../../components/map/core/MapSheetOrchestrator.jsx)
- [components/map/views/search](../../../components/map/views/search)
- [components/map/views/hospitalList](../../../components/map/views/hospitalList)
- [components/map/views/hospitalDetail](../../../components/map/views/hospitalDetail)
- [components/map/views/ambulanceDecision](../../../components/map/views/ambulanceDecision)
- [components/map/views/bedDecision](../../../components/map/views/bedDecision)

Bridge modals that still share one shell:

- [MapModalShell.jsx](../../../components/map/surfaces/MapModalShell.jsx)
- [mapModalShell.styles.js](../../../components/map/surfaces/mapModalShell.styles.js)

Applied to:

- [MapPublicSearchModal.jsx](../../../components/map/surfaces/search/MapPublicSearchModal.jsx)
- [MapCareHistoryModal.jsx](../../../components/map/MapCareHistoryModal.jsx)
- [MapGuestProfileModal.jsx](../../../components/map/MapGuestProfileModal.jsx)
- [MapLocationModal.jsx](../../../components/map/surfaces/search/MapLocationModal.jsx)
- [MapHospitalModal.jsx](../../../components/map/MapHospitalModal.jsx)
- [MapHospitalDetailsModal.jsx](../../../components/map/MapHospitalDetailsModal.jsx)

Shared behavior:

- same spring-up motion
- same backdrop fade
- same close affordance
- same top-row header contract
- same bottom-sheet surface treatment

## Foreground API Interaction Feedback

All foreground, user-triggered API calls in `/map` must use the shared perceptible-pending pattern.

Implementation rule:

- start the visible pending state immediately on press
- record `pendingStartedAt = Date.now()` before calling the API
- await the API result
- call `waitForMinimumPending(pendingStartedAt)` before changing phase, unmounting the control, or showing the final success/error state
- normalize pipe-formatted errors with `normalizeApiErrorMessage(...)` before rendering them

Shared helper:

- [apiInteractionFeedback.js](../../../utils/ui/apiInteractionFeedback.js)

Current default:

- minimum foreground pending window: `2000ms`
- intended for submit, resend, verify, commit, payment, and other user-visible route or phase actions
- not intended for passive discovery, map preload, realtime hydration, or silent cache refreshes

Reason:

- fast APIs are good, but instant phase changes can hide the feedback and make the app feel unresponsive
- the app should acknowledge user intent first, then transition after the pending state has been perceived

Responsive sizing contract:

- shared sizing truth now lives in [viewportSurfaceMetrics.js](../../../utils/ui/viewportSurfaceMetrics.js)
- web mobile and tablet flows must size against the visible viewport via [useAuthViewport.js](../../../hooks/ui/useAuthViewport.js) / [useWebViewportMetrics.js](../../../hooks/ui/useWebViewportMetrics.js), not the large viewport
- child map modals and welcome helpers should consume [useResponsiveSurfaceMetrics.js](../../../hooks/ui/useResponsiveSurfaceMetrics.js) or a phase-level responsive hook before adding any new fixed dimensions
- current responsive adoption now covers:
  - `/welcome` stage composition and install helpers
  - `/map` shell and bridge modals
  - `MapPublicSearchModal`
  - `explore_intent`
  - `ambulance_decision`
  - `bed_decision`
  - `service_detail`
  - shared search sheet surfaces

Shared implementation note:

- `search`, `hospital_list`, and `hospital_detail` now share a stage body-scroll wrapper through [`MapStageBodyScroll.jsx`](../../../components/map/views/shared/MapStageBodyScroll.jsx)
- `ambulance_decision` now reuses the same shell, detent, route, and service-detail seam as the existing map phases
- `bed_decision` now reuses that same shell, route seam, and service-detail seam for room-first booking only
- `ambulance + bed` now uses a sequential flow: `ambulance_decision -> bed_decision -> legacy booking`
- when `careIntent === "both"`, `ambulance_decision` top subtitle should show a `Step 1 of 2` cue and `bed_decision` top subtitle should show a `Step 2 of 2` cue
- `hospital_detail` remains the visual exception where expanded hero/title/body structure must be preserved exactly even if other stage internals are refactored
- `hospital_detail` and `service_detail` remain upstream browse/select phases; they must not open `COMMIT_DETAILS` or auth directly
- `hospital_detail` CTA routing must stay intent-bound:
  - ambulance intent = `hospital_detail -> ambulance_decision`
  - bed intent = `hospital_detail -> bed_decision`
  - combined intent = `hospital_detail -> ambulance_decision` first
- service rails/cards may inspect through `service_detail` or select directly into the proper decision phase, but they must stay upstream of commit/auth
- `ambulance_decision` now confirms into `COMMIT_DETAILS`
- `COMMIT_DETAILS` now stays in `/map` and hands off directly to native `COMMIT_PAYMENT` for the primary commit path
- `COMMIT_TRIAGE` remains available as optional in-flow update from tracking (`My information`)
- `bed_decision` currently confirms into the existing legacy bed-booking route after the sheet decision; room preselection is forwarded
- in the combined flow, paired ambulance selection is preserved from `ambulance_decision` and then forwarded when `bed_decision` confirms
- that saved ambulance selection is hospital-scoped; if the user changes hospitals during `bed_decision`, the flow must return to `ambulance_decision` for the new hospital before step 2 can continue
- flow ownership stays in `useMapExploreFlow.js`; stage components should not own cross-phase invalidation rules

## Locked `COMMIT_DETAILS` Plan

First implementation scope:

- `ambulance_decision -> COMMIT_DETAILS -> COMMIT_TRIAGE -> COMMIT_PAYMENT -> TRACKING`
- `bed_decision` and combined bed booking continue to bridge through the legacy booking route for now
- do not widen this into a new combined-care commit surface before the ambulance path is stable

Locked posture:

- keep the user on `/map`
- keep the map mounted
- open `COMMIT_DETAILS` directly in the normal expanded sheet posture
- keep it sheet-led, not modal-led and not route-led
- keep the global smart header reserved for tracking; `COMMIT_DETAILS` uses the sheet's own compact modal header

Locked interaction model:

- one question at a time
- no long form
- local backflow between microsteps before leaving the phase
- immediate feedback on every submit / resend / verify action

Locked microstep order:

1. sheet header owns locked hospital + step context
2. email question
3. OTP verification
4. phone confirmation only when the resolved authenticated profile still lacks a reachable callback number

Rendering rule:

- do not repeat hospital/service summary inside the body
- the body should feel like the guest profile identity bridge: avatar, one prompt, one input, one CTA
- header copy stays user-facing: task as title (`Confirm email`, `Enter code`, `Add phone number`), request context as subtitle (`For {hospital} · {transport tier}`)
- single-input microsteps use the shared squircle inline action input: input and CTA share one continuous field, with a reserved right slide lane for press/loading motion
- email and phone may prefill from local AsyncStorage contact memory only when the draft/session has no stronger value; clearing the field removes the remembered value

- keep the new `/map` presentation; do not visually fall back to the legacy auth modal layout
- borrow stronger legacy behavior under the new shell instead of rebuilding weaker versions:
  - phone step keeps the map inline field but should use legacy-grade country detection, country picking, phone validation, and E.164 normalization
  - OTP step keeps the map commit card but should use legacy-grade OTP autofill, paste, focus choreography, and resend discipline
- email remains the simplest map-native inline field
- harden these identity mechanics before introducing the optional `COMMIT_TRIAGE` sheet phase

Review account rule:

- Google Play closed testing may use `support@ivisit.ng` inside the emergency `COMMIT_DETAILS` flow
- static review OTP is allowed only when the app build has `EXPO_PUBLIC_REVIEW_DEMO_AUTH_ENABLED=true` and the deployed `review-demo-auth` Edge Function has `REVIEW_DEMO_AUTH_ENABLED=true`
- the client never stores the static OTP or service-role credentials; it sends the entered code to the Edge Function, receives a short-lived real Supabase OTP, then verifies through normal Supabase auth
- `support@ivisit.ng` must remain a patient review profile, not an admin/provider profile

Google Play closed-testing note:

- current reviewer email: `support@ivisit.ng`
- current reviewer code: `123456`
- Supabase project: `dlwtcmhdzoklveihuhjf`
- deployed function: `review-demo-auth`
- deployed secrets: `REVIEW_DEMO_AUTH_ENABLED=true`, `REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng`, `REVIEW_DEMO_AUTH_OTP=123456`
- EAS profile that enables the client flag: `staging`
- verified behavior: correct code returns a real short-lived Supabase OTP; wrong code returns `401 Invalid review code`
- if the code changes, update the Supabase secret and the Play Console reviewer instructions together

Locked non-goals for `COMMIT_DETAILS`:

- no payment decision inside this phase
- no separate visible `COMMIT_AUTH` phase
- no blocking name step in v1
- no Google-first auth detour

Reason:

- the live app already has email OTP primitives and a minimal email-first profile bridge
- the live request RPC does not require a separate name field before request creation
- reachable callback data matters more than profile enrichment at this point in the flow

## `COMMIT_DETAILS` Draft Contract

The phase should prepare a local request draft only. It should not write the real request yet.

Required draft fields before `COMMIT_TRIAGE` / `COMMIT_PAYMENT`:

- authenticated actor/session
- `hospital_id`
- `hospital_name`
- `service_type`
- selected ambulance tier / `ambulance_type` when known
- patient location / pickup context
- patient email
- patient phone confirmation
- `patient_snapshot`
- optional `triageSnapshot` added by `COMMIT_TRIAGE`

Not a blocking v1 prerequisite:

- patient name as its own dedicated step

Runtime evidence:

- `create_emergency_v4` currently consumes `hospital_id`, `hospital_name`, `service_type`, `specialty`, `ambulance_type`, `patient_location`, `patient_snapshot`, and payment data
- `authService.requestOtp` / `authService.verifyOtp` already support the email OTP path the phase needs

## Demo / Hybrid Commit Note

`COMMIT_DETAILS` must preserve demo-context truth for the next phase. It does not need a special demo RPC payload, but it must not discard the selected demo hospital or coverage mode.

Locked rule:

- demo and hybrid coverage use the same `COMMIT_DETAILS` UI
- no `demo` language appears in the commit surface
- the request draft must preserve the selected hospital object so `COMMIT_PAYMENT` can still determine whether the flow is demo-backed

Current runtime evidence:

- `demoEcosystemService.shouldSimulatePayments(...)` keys off the selected hospital plus `effectiveDemoModeEnabled`
- the live request path still calls the real `create_emergency_v4` cash lane
- demo hospitals then use the `demo-approve-cash-payment` edge function to auto-approve the pending cash payment through the real `approve_cash_payment` RPC

Product implication:

- demo payment is operationally simulated, not structurally fake
- demo payment must not introduce a human org-admin approval wait
- the request should still enter real tracking truth after auto-approval instead of switching to a fake tracking branch

## `COMMIT_TRIAGE` Plan

`COMMIT_TRIAGE` is the next map-native sheet phase after identity/contact and before payment.

Why it lives before payment:

- payment is the real release gate
- once payment starts, the flow has created or is creating live operational truth
- triage should enrich the request draft before that irreversible action

Scope:

- ambulance-only first
- skippable by default
- no route handoff and no legacy modal
- uses the same map sheet shell, expanded posture, and compact modal header as `COMMIT_DETAILS`
- carries the locked hospital + transport context forward
- preserves the request draft, selected hospital, selected transport, pickup context, and any auth/contact details

Content model:

- borrow the strongest legacy triage ideas, not the old screen shape
- ask one focused question at a time where possible
- use short patient language, not clinical survey language
- avoid explanatory blocks; use visual chips/cards and immediate pressed states
- allow `Skip` as a secondary action that is visibly safe

Minimum v1 triage fields:

- primary concern / what happened
- consciousness/breathing severity signal when relevant
- pain or urgency level when relevant
- free-text note only as a final optional field

Draft output:

- `triageSnapshot`
- `patient_snapshot.triage`
- short display summary for payment/tracking handoff if useful

Non-goals:

- no diagnosis
- no required long form
- no AI promise in user-facing copy
- no payment blocking unless a field is operationally required by backend rules

Transition rule:

- `COMMIT_DETAILS` confirms identity/contact
- `COMMIT_TRIAGE` enriches or skips the draft
- `COMMIT_PAYMENT` remains the first phase that can call the real create RPC

## `COMMIT_PAYMENT` First Pass

The ambulance path now has a native map `COMMIT_PAYMENT` phase.

Current scope:

- ambulance-only
- opens after `COMMIT_DETAILS` completes identity/contact and `COMMIT_TRIAGE` is completed or skipped
- keeps the map shell mounted
- resolves a live cost through `serviceCostService.calculateEmergencyCost(...)`
- falls back to the selected transport tier price text only for display continuity
- lets the user choose a payment method through the existing payment service lane
- submits through `useRequestFlow.handleRequestInitiated(...)`, which calls `create_emergency_v4`
- uses `handleRequestComplete(...)` to activate the local ambulance trip context when approval is not required
- sets `pendingApproval` when cash approval is required

Locked boundary:

- triage is its own skippable `COMMIT_TRIAGE` phase before payment, not a hidden field inside payment
- `TRACKING` still needs its own native map sheet projection after payment stabilization
- backend demo/simulation state must never leak into patient-facing payment copy
- payment method labels should read as real-world states such as `Provider confirmation`, `Not available for this request`, or `Balance checkout`
- once a payment method is selected, the payment section collapses to a compact row such as `Cash · Provider confirmation` with a small `Change` pill; tapping `Change` expands the full selector list
- web and native both use the same SetupIntent-backed add-card lane: native mounts Stripe `CardField`, web mounts Stripe.js Elements, and both persist only safe card metadata through `paymentService.addPaymentMethod(...)`

## `COMMIT_PAYMENT` Resolution States

The native payment phase must own all post-submit outcomes before entering `TRACKING`.

Required visible states:

- `submitting`: CTA/loading state holds for the perceptible pending window and does not unmount too quickly
- `pending_approval`: cash/provider approval is waiting; keep the map visible and show a focused waiting card in the same sheet
- `approved`: request/payment is accepted; show a short success transition before switching to tracking
- `denied`: payment was declined or provider declined cash approval; show a recoverable state with `Change payment` and `Try again`
- `failed`: network/system failure; keep the draft and allow retry without losing the locked request

Rules:

- do not route to legacy modals for pending, approved, denied, or failed payment states
- do not switch to `TRACKING` until the request has a real request id and a payment state that allows dispatch/tracking
- if cash approval is pending, subscribe to realtime truth and converge to `approved`, `denied`, or still-waiting without polling drift
- demo-backed auto-approval may collapse the wait quickly, but UI copy must remain real-world: provider confirmation, not demo language
- denial should not destroy the request draft unless backend marks the request terminal and unrecoverable

## `TRACKING` Plan

`TRACKING` is the first true active emergency-session state. This is where the global smart / scroll-aware header becomes appropriate.

Tracking entry conditions:

- real request id exists
- active trip/request context is present in `EmergencyContext.jsx`
- payment is approved, completed, or in an allowed dispatch-progress state
- route context can be computed from pickup, destination, and assigned responder when available

Map behavior:

- keep the same `/map` route mounted
- switch the map from browse camera to active route camera
- draw pickup -> hospital route immediately
- when an assigned ambulance/responder location exists, animate the ambulance marker along realtime coordinates
- if realtime responder coordinates are missing, use a conservative route-progress projection until truth arrives
- road-snap only when route quality is high enough; otherwise use smooth coordinate interpolation

Smart header behavior:

- activate the app-owned smart / scroll-aware header only after tracking starts
- header should express active route truth, not page identity
- Apple Maps reference direction:
  - large dark instruction capsule at the top for the next maneuver / active status
  - compressed secondary line for next step or destination context
  - avoid using the header during auth, triage, or payment
- header can own high-priority status such as `Ambulance en route`, next maneuver, ETA, or approval transition
- sheet should compress beneath the header rather than fighting it as separate chrome

Tracking sheet behavior:

- default to a compact bottom route card, not a full modal
- move `arrival / ETA / distance` into the smart active header; do not repeat them as a large sheet hero row
- give tracking its own sheet top slot with:
  - left chevron for half/expanded toggle where detents exist
  - right `map` action for minimize / return-to-map
  - concise title + subtitle only, no duplicate metrics
- keep the smart header alive after minimizing tracking so the user can always return to the active route
- use the header left action for reopen/toggle and reserve the right action for map return, not close/dismiss
- restore legacy lifecycle truth in the new sheet language:
  - cancel request / booking
  - mark ambulance arrived
  - check in to bed when ready
  - complete route / stay when the backend state allows it
- keep one raised primary action only when user action is actually required; otherwise keep utilities secondary
- preserve responder identity, hospital destination, and late bed-add from active ambulance tracking
- keep cancel out of half-snap when there is no immediate destructive need; prefer expanded-only destructive placement
- if check-in / triage already exists, detect whether it is complete and downgrade it from primary to secondary `Update check-in`
- support expanded controls similar to Apple Maps:
  - destination/hospital
  - share ETA
  - call hospital/driver when available
  - report issue
  - cancel/end route only when backend status rules allow it
- keep one obvious destructive action and isolate it visually
- avoid explanatory copy; use labels and system state

Post-payment implementation order:

1. add native `COMMIT_TRIAGE`
2. complete `COMMIT_PAYMENT` resolution states
3. add `TRACKING` sheet phase shell
4. wire smart header for active session only
5. animate route and ambulance marker from active emergency truth

## Bed Decision Data Contract

The current `/map` `bed_decision` phase is room-first only.

Current runtime path:

- [useMapBedDecisionModel.js](../../../components/map/views/bedDecision/useMapBedDecisionModel.js)
  - calls `hospitalsService.getRooms(...)`
- [hospitalsService.js](../../../services/hospitalsService.js)
  - reads `room_pricing`, `bed_availability`, and hospital bed counts
- [mapHospitalDetail.helpers.js](../../../components/map/surfaces/hospitals/mapHospitalDetail.helpers.js)
  - maps room rows into room service cards
- [mapBedDecision.helpers.js](../../../components/map/views/bedDecision/mapBedDecision.helpers.js)
  - derives room hero + route content from those rows plus route data

Current backend-backed fields available to the sheet:

- room side:
  - `room_type`
  - `room_label` / `room_name`
  - `available_units` / `available`
  - `price_per_night` / `base_price`

Current derived UI fields:

- selected room title
- room availability label
- room price label

Current flow rule:

- `bed` CTA now opens `bed_decision`
- half state stays room-first for smaller screens
- expanded state exposes alternate room options
- service detail can drill into room items and returns back into `bed_decision`
- hospital list can now return to `bed_decision` with its original payload instead of dropping back to explore

## Combined Care Flow Note

The current `/map` `ambulance + bed` experience is intentionally sequential:

- `ambulance + bed` first opens `ambulance_decision`
- ambulance selection is saved in map state
- confirm then advances into `bed_decision`
- `bed_decision` stays room-only in UI
- final bed confirm forwards both the chosen room and the previously chosen ambulance into the legacy bed-booking route

## Ambulance Decision Data Contract

The current `/map` `ambulance_decision` phase intentionally does not read a live assigned ambulance unit.

Current runtime path:

- [useMapAmbulanceDecisionModel.js](../../../components/map/views/ambulanceDecision/useMapAmbulanceDecisionModel.js)
  - calls `hospitalsService.getServicePricing(...)`
- [hospitalsService.js](../../../services/hospitalsService.js)
  - reads `service_pricing`
- [mapHospitalDetail.helpers.js](../../../components/map/surfaces/hospitals/mapHospitalDetail.helpers.js)
  - maps ambulance pricing rows into the three dispatch tiers
- [mapAmbulanceDecision.helpers.js](../../../components/map/views/ambulanceDecision/mapAmbulanceDecision.helpers.js)
  - derives hero + option content from those rows plus route data

Current backend-backed fields available to the sheet:

- `id`
- `service_name`
- `service_type`
- `description`
- `base_price`

Current derived UI fields:

- selected tier title
- crew label / crew count presentation
- `Ready` / enabled state
- confidence label
- price text

Legacy compatibility note:

- [EmergencyRequestModal.jsx](../../../components/emergency/EmergencyRequestModal.jsx) already made the same product decision
- it fetches `service_pricing`, filters ambulance rows, and synthesizes the user-facing crew copy from `service_type`
- this means the new map sheet is aligned with the legacy pre-dispatch contract instead of inventing a second source of truth

RLS / survivability note:

- `service_pricing` currently has public read RLS:
  - [20260219000800_emergency_logic.sql](../../../supabase/migrations/20260219000800_emergency_logic.sql)
- `ambulances` also currently has public read RLS:
  - [20260219000700_security.sql](../../../supabase/migrations/20260219000700_security.sql)
- even so, pre-dispatch UI should continue to depend on `service_pricing`, not `ambulances`

Reason:

- `service_pricing` is stable pre-authorization metadata
- `ambulances` is live logistics inventory and may be tightened later without breaking the public map flow
- the pre-dispatch sheet should survive future hardening where live ambulance-unit visibility becomes authenticated-only or dispatch-only

Practical rendering rule for the current hero:

- header owns hospital + away line
- hero owns selected ambulance tier
- hero pill 1 should be crew
- hero pill 2 should be price
- do not render live unit identity in pre-dispatch phases

Practical selector rule for the current dispatch choice row:

- selected state should read from the whole pill, not a nested trailing affordance
- selected pill uses the shared app CTA color
- selected tier icon may switch from outline to filled
- unselected pills stay tier-tinted and quieter
- first tap selects
- second tap on the already-selected tier advances
- do not add a trailing chevron to compact 3-up selector pills; it crowds web and small-phone layouts

Current parity note for `service_detail`:

- half state now follows the same compact icon + text selector grammar as `ambulance_decision`
- expanded state switches to flatter comparison blades
- the primary CTA now sits inline at the bottom of scroll content instead of staying sticky
- missing price should not fall back to explanatory copy; it should render as a skeleton or remain omitted when the upstream item is unresolved

## Hospital Data Consistency Fix

The inconsistent “one hospital vs several hospitals” behavior had three causes:

1. `useHospitals` caches by location bucket, and the previous bucket precision was too coarse for map exploration.
2. `useHospitals` exposes both a display subset and the full discovered set, but `EmergencyContext` was consuming the display subset.
3. `/map` was not explicitly bootstrapping demo coverage when demo mode was allowed and discovery came back empty.

Current fixes:

- [useHospitals.js](../../../hooks/emergency/useHospitals.js)
  - location bucket precision raised from `2` to `3`
- [EmergencyContext.jsx](../../../contexts/EmergencyContext.jsx)
  - now prefers the full discovered hospital set for emergency state, but ranks it in nearby-first order so `0-15 km` hospitals stay ahead of extended browse results
- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)
  - explicitly calls `ensureDemoEcosystemForLocation(...)` for `/map` when live nearby coverage is weak and demo nearby support is still insufficient

## Nearby Priority Contract

The map keeps the full discovered set available, but it should not treat every discovered hospital as equally relevant.

- `0-5 km` = immediate nearby care
- `>5-15 km` = nearby support
- `>15-50 km` = extended browse only
- The current `/map` sheet should aim for about **5 nearby hospitals** so the summary card, hospital rail, and modal list all feel comfortably populated.
- The hospital rail and the hospital modal should now read from the same full discovered nearby set; the rail is no longer an artificially clipped preview subset.
- Any visible difference between rail and modal should come only from viewport/card layout, not from different hospital collections.
- Live coverage quality is decided from the `0-15 km` window.
- Demo bootstrap sufficiency is decided from the `0-15 km` window and should keep filling while the nearby set is still below that map comfort target.
- One faraway demo hospital must not suppress bootstrap.
- Mixed live/demo hospital lists should rank close-by hospitals ahead of extended browse results, even in `hybrid` mode.

## Hospital Media Contract

Hospital media should remain a data-layer concern.

- Emergency and `/map` surfaces continue to read the existing `hospital.image` field.
- `hospital.image` is now expected to be a canonical render URL, often backed by the public [`hospital-media`](../../../supabase/functions/hospital-media/index.ts) proxy.
- New provider-discovered hospitals may use a direct `place_id` proxy path immediately.
- Existing hospitals should be normalized through [`backfill_hospital_media.js`](../../../supabase/scripts/backfill_hospital_media.js) so the current UI receives stable image delivery without per-surface image logic.
- When no trustworthy real image exists, deterministic fallback remains valid and should be preferred over misleading random media.

## Tracking Reliability Hardening (Applied)

The `/map` tracking runtime now has a stricter truth order for ETA/progress and ambulance movement:

- **Single timeline source** for trip progress:
  - [useTripProgress.js](../../../hooks/emergency/useTripProgress.js) now resolves one timeline from:
    - `etaSeconds` (first)
    - parsed `estimatedArrival` (fallback)
    - `startedAt` -> `createdAt` -> (`updatedAt - eta`) as final fallback
- **Canonical route priority** for animated ambulance:
  - [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx) owns the visible `/map` route calculation.
  - during active tracking, the ambulance marker must use the same rendered polyline route, not a synthetic responder coordinate that can drift outside the line.
  - [MapScreen.jsx](../../../screens/MapScreen.jsx) receives the map route callback and patches the route coordinates back into `activeAmbulanceTrip.route` for context recovery and demo heartbeat fallback.
- **Polyline-adherent animation anchor**:
  - [useAmbulanceAnimation.js](../../../hooks/emergency/useAmbulanceAnimation.js) now accepts `initialProgress` and starts from the correct elapsed point on the route instead of always from route origin.
- **Explicit source observability** in dev:
  - map logs current source mode (`live_responder`, `simulated_route_polyline`, `fallback_stationary`) for faster field debugging.

Regression: tracking arrival showed `--` / `Live` until Metro reload.

Observed behavior:

- after payment, `TRACKING` mounted but the smart header still showed no arrival
- changing/reloading state later made arrival appear
- ambulance could animate from a synthetic coordinate and visually leave the red route

Root causes:

- the visible `/map` route calculation lived in `EmergencyLocationPreviewMap`, but the active header read only `activeAmbulanceTrip.etaSeconds`
- `activeAmbulanceTrip.etaSeconds` could be missing or string-typed, and the header helpers rejected non-number values with `Number.isFinite(...)`
- live/synthetic responder coordinates were allowed to override route animation even when the rendered route polyline was available

Fix:

- [MapScreen.jsx](../../../screens/MapScreen.jsx) now backfills active-trip ETA, `startedAt`, and route coordinates from `trackingRouteInfo` as soon as the map route callback fires
- [useMapExploreFlow.js](../../../hooks/map/exploreFlow/useMapExploreFlow.js) normalizes ETA seconds before formatting header minutes, arrival time, and elapsed/arrived state
- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx) keeps active-tracking ambulance animation on the rendered route polyline and only falls back when no route exists
- active-trip route backfill is no longer gated by the `TRACKING` sheet being visible; the map route callback can keep operational truth hydrated while the user is in another `/map` sheet
- ambulance animation is keyed to an active tracking timeline, not to tracking sheet mount state, so closing/reopening tracking must not restart the visible ambulance from route origin

Rule:

- never rely on a remount, Metro reload, or sheet toggle to hydrate active tracking data
- route-derived ETA must be pushed into active trip truth or consumed directly by the active header through an explicit state bridge
- all ETA values crossing service/context boundaries must be normalized to finite seconds before UI formatting

## Commit Triage Live State

Triage is no longer a pre-payment blocker. It is a live, skippable request update surfaced from tracking as **My Information**.

Current contract:

- the map-native triage flow has six deterministic steps: urgent concern, breathing, consciousness, bleeding, pain, responder note
- `MapCommitTriageStageBase` must seed from the active request snapshot first, then local commit payload fallback
- every meaningful draft change patches `activeAmbulanceTrip.triage`, `triageSnapshot`, `triageCheckin`, and `triageProgress` immediately for live UI progress
- option-based triage steps write a non-blocking `emergencyRequestsService.updateTriage(...)` immediately; free-text note edits may debounce so typing remains calm
- request hydration must normalize `patient_snapshot.triage` into `triage`, `triageSnapshot`, `triageCheckin`, and `triageProgress` before writing active request state
- Expo/Metro reload must restore triage progress from persisted request state; never depend on in-memory sheet payload for the tracking ring
- tracking progress reads the same six map triage steps; do not mix it with the legacy waiting-step set
- AI/copilot prompt support is optional and must never change the deterministic six-step structure; static prompts remain the fallback

Regression guarded:

- opening **My Information** after answering triage should resume from the first unanswered step, not restart from question one
- closing and reopening tracking must keep the triage ring progress from active request state, not local sheet payload only
- reloading Expo Go after answering triage must not fall back to step one if `patient_snapshot.triage` exists on the active request

## Commit Payment Method Hydration

Regression guarded: `COMMIT_PAYMENT` could show `Select payment` until the user expanded/collapsed the sheet because payment methods were only hydrated by the expanded selector.

Fix:

- `MapCommitPaymentStageBase` now refreshes payment methods on phase entry, independently of whether the expanded selector is mounted
- the refresh builds the same checkout-aware snapshot used by the selector: saved cards, wallet balance, cached default, cash eligibility, and demo cash-only mode
- method selection/addition triggers a parent refresh and revalidation before the final pay CTA becomes actionable again
- the footer CTA shows a loading/disabled `Checking payment` state until the selected method snapshot is ready

Rule:

- `PaymentMethodSelector` is the detailed picker, not the source of first render truth for `COMMIT_PAYMENT`
- half snap must never depend on expanding the sheet to hydrate a payment method
- after method mutation, refresh/reconcile from payment services before enabling pay

## Next Steps

For `ios-mobile` solidification, build in this order:

1. keep `MapScreen.jsx` thin
2. add more sheet modes into `useMapExploreFlow.js`
3. finish `COMMIT_DETAILS` as a map-native identity/contact phase
4. keep triage skippable and available from tracking (`My Information`) instead of blocking pre-payment
5. harden `COMMIT_PAYMENT` pending/approved/denied/failed states in the map sheet
6. continue polishing `TRACKING` action hierarchy and post-resolution states (rating + closure)
7. keep remaining bridge modal tasks on `MapModalShell`
8. add a `MapScreenOrchestrator` once Android and web variants start to diverge
9. migrate any remaining map-adjacent legacy overlays only if they are reintroduced into `/map`
