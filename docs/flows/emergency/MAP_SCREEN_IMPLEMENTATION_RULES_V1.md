# Map Screen Implementation Rules (v1)

> Status: Active implementation contract
> Scope: public `/(auth)/map`
> Purpose: lock the architectural, UI, motion, and file-organization rules for the new map-first emergency surface

Related references:

- [architecture/README.md](./architecture/README.md)
- [architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)
- [../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)
- [EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [MAP_FLOW_IMPLEMENTATION_V1.md](./MAP_FLOW_IMPLEMENTATION_V1.md)
- [MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md](./MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md)
- [../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md](../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md)

## 0. Standing reference order for `/map` UI work

Before changing the map shell, sheet shell, or active header UI, review these references in this order:

1. [../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)
   - first stop for Apple Maps behavior and latest Apple visual-language guidance
2. [EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
   - product-state and decision-surface spec
3. [../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md](../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md)
   - token, component-family, and reuse guidance
4. [MAP_FLOW_IMPLEMENTATION_V1.md](./MAP_FLOW_IMPLEMENTATION_V1.md)
   - runtime ownership and composition map
5. [architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)
   - sheet refactor boundaries and known visual exceptions
6. [architecture/README.md](./architecture/README.md)
   - current code-structure and refactor guide for welcome + map

Rule:

- when in doubt about map, sheet, or active-header UI direction, defer first to the Apple reference, then translate it through the iVisit product spec and implementation contract

## 1. Core Product Rule

The new emergency experience is no longer page-switched form flow.

It is:

- one persistent map canvas
- one persistent sheet shell
- one changing sheet mode
- temporary bridge modals only while the sheet-phase swap is incomplete

The app should not leave the map once the user enters it.

## 2. Route Rule

The public emergency entry is now:

- [WelcomeScreen.jsx](../../../screens/WelcomeScreen.jsx)
  - routes to `/(auth)/map`
- [MapScreen.jsx](../../../screens/MapScreen.jsx)
  - mounts the live persistent map surface
  - owns the startup loading overlay, hospital refresh, and `/map` demo-bootstrap timing through the shared flow hooks

Rule:

- do not use a separate blocking route just to show emergency entry loading
- the real `/map` surface should mount immediately and own readiness inside the shell

## 3. Screen Ownership Rule

[MapScreen.jsx](../../../screens/MapScreen.jsx) must stay thin.

It may compose:

- persistent map
- persistent sheet
- temporary bridge surfaces during migration only
- loading overlay

It must not become the business-logic controller.

Move state and side effects into:

- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)

## 4. Flow Ownership Rule

[useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js) is the source of truth for the public map flow.

Implementation note:

- the public import path stays `hooks/map/useMapExploreFlow.js`
- the grouped internal implementation now lives under `hooks/map/exploreFlow/`

It owns:

- sheet mode
- sheet phase
- sheet snap state
- temporary bridge visibility during migration
- profile/auth handoff
- location handoff
- hospital selection
- header coordination
- FAB coordination
- map readiness
- explicit demo bootstrap

Rule:

- if a new `/map` state needs decision logic or cross-surface side effects, add it here first

## 5. Persistent Map Rule

The live spatial layer is:

- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)

It must remain mounted while:

- sheet state changes
- care selection changes
- modals open and close

Rule:

- do not replace the map instance to express a normal flow state change

Touch contract:

- full-screen wrappers that sit above the map must use `pointerEvents="box-none"`
- phase transition wrappers must never intercept map gestures outside the visible sheet surface
- hidden or fading loading overlays must set the actual React Native `pointerEvents` prop to `none`; do not rely on `pointerEvents` inside a style object for this release path
- the sheet may receive touches only inside its visible host bounds
- map pan, zoom, and controls must remain available in `/map` mid-snap phases unless a real blocking modal is open or the sheet is intentionally expanded over the map

Regression captured:

- `MapPhaseTransitionView` was a full-screen `flex: 1` wrapper above the map and defaulted to touch-active behavior
- that made `/map` feel locked because the wrapper intercepted gestures while the visible sheet was only half-height
- the fix is `pointerEvents="box-none"` on `MapPhaseTransitionView`
- `MapExploreLoadingOverlay` must also release touches with `pointerEvents={resolvedVisible ? "auto" : "none"}` so its fade-out frame cannot block the map after loading

## 5.1 State Residency Rule

Do not move every `/map` value into global state. Globalizing transient sheet state makes reload bugs harder to see and creates stale cross-phase coupling.

Use this ownership model:

- `EmergencyContext.jsx` owns durable operational truth: active ambulance trip, active bed booking, pending approval, realtime status, assigned responder/vehicle, request id, and post-payment recovery state.
- `useMapExploreFlow.js` / the map flow store owns cross-phase UI decisions: sheet phase, selected care intent, selected hospital, saved combined-flow transport, sheet payload, active-header coordination, and route-to-sheet handoff.
- Stage components own local presentation state: input focus, scroll position, selector expansion, pressed/loading visuals, temporary validation messages, and animation-only state.
- Async resource snapshots own their own refresh contract: payment methods, route calculations, profile/contact hydration, pricing rows, and media should refresh/reconcile when the phase opens and after mutation instead of depending on a remount or sheet toggle.

Active-request exception:

- live tracking facts that must survive sheet remounts belong on `EmergencyContext`, even if they are produced by a sheet or map child
- examples: route-derived ETA, `startedAt`, route coordinates, triage draft, triage progress, and triage snapshot
- the producing UI should patch context immediately and persist to backend non-blockingly when possible
- do not store these facts only in `sheetPayload`; `sheetPayload` is navigation context, not operational truth

Regression pattern to avoid:

- A phase appears correct only after changing sheet state, closing/reopening, or restarting Metro.
- This means the data source is hydrated passively and the visible phase is not subscribing, refreshing, or reconciling at its entry point.

Required fix pattern:

- on phase entry, explicitly request or refresh the data needed by the first visible render
- render a compact skeleton or disabled CTA while the snapshot is unresolved
- after a mutation, update local visible state optimistically when safe and then reconcile from the canonical service/context response
- normalize service values at the boundary before storing them in flow/global state

Payment-method example:

- `COMMIT_PAYMENT` may use payment methods from a payment hook/service cache, but the phase must trigger a refresh when it opens and after adding/changing a method.
- The main CTA should show a non-final loading/select state until the selected method snapshot is available.
- The user should not have to change sheets for `Pay with` or `Select payment` to become correct.
- the first payment snapshot belongs in `MapCommitPaymentStageBase`, not only inside the expanded `PaymentMethodSelector`; otherwise half snap can render before methods hydrate
- selector changes should revalidate the chosen method against the refreshed wallet/card/cash snapshot before enabling the final pay action

## 6. Persistent Sheet Rule

The public map sheet is one shell, not many separate panels.

Current shell primitives:

- [MapSheetOrchestrator.jsx](../../../components/map/MapSheetOrchestrator.jsx)
- [MapSheetShell.jsx](../../../components/map/MapSheetShell.jsx)
- [mapSheet.constants.js](../../../components/map/mapSheet.constants.js)
- [mapSheetShell.styles.js](../../../components/map/mapSheetShell.styles.js)
- [mapSheetTokens.js](../../../components/map/mapSheetTokens.js)
- [mapMotionTokens.js](../../../components/map/mapMotionTokens.js)

Rule:

- `MapSheetOrchestrator` routes by mode only
- `MapSheetShell` owns shell geometry, drag behavior, material, and snap animation
- constants live outside JSX
- shell styles live outside JSX

## 7. Snap State Rule

Current shared snap states:

- `collapsed`
- `half`
- `expanded`

Rules:

- `half` is the default decision state
- `collapsed` should show only the essential top row
- `expanded` reveals more content inside the same shell
- header hides only when the sheet reaches `expanded`
- drag and tap on the handle must both work

## 8. Current First Mode Rule

The first live map state is:

- `explore_intent`

It is not called `idle`.

Reason:

- the user is actively exploring and choosing intent

## 9. Variant Structure Rule

Map sheet content must follow a variant structure like welcome and intake.

Current explore-intent structure:

- [MapExploreIntentOrchestrator.jsx](../../../components/map/views/exploreIntent/MapExploreIntentOrchestrator.jsx)
- [MapExploreIntentStageBase.jsx](../../../components/map/views/exploreIntent/MapExploreIntentStageBase.jsx)
- [MapExploreIntentIOSMobileView.jsx](../../../components/map/views/exploreIntent/MapExploreIntentIOSMobileView.jsx)
- [MapExploreIntentAndroidMobileView.jsx](../../../components/map/views/exploreIntent/MapExploreIntentAndroidMobileView.jsx)
- [MapExploreIntentWebMobileSmView.jsx](../../../components/map/views/exploreIntent/MapExploreIntentWebMobileSmView.jsx)
- [MapExploreIntentWebMobileMdView.jsx](../../../components/map/views/exploreIntent/MapExploreIntentWebMobileMdView.jsx)

Rule:

- any new map sheet mode should follow the same pattern
- do not build the next mode as one large inline JSX block inside `MapSheetOrchestrator`

## 10. File Separation Rule

Each map mode should separate concerns clearly.

Preferred structure:

- `*.jsx`
  - structure and composition only
  - no large copy blocks, token tables, style objects, or helper utilities embedded inline
- `*.styles.js`
  - styles only
- `*.content.js`
  - labels, copy, assets, and local content definitions
- `*.helpers.js`
  - formatting and derived helpers
- `*.tokens.js`
  - design or motion tokens shared by the surface family
- `*.constants.js`
  - enums, snap states, thresholds, and non-visual constants
- `use*.js`
  - state orchestration, side effects, and runtime coordination

Current status note:

- this separation is **not fully finished yet** in all `/map` files
- any mixed file should be treated as cleanup debt and split before it grows further
- do not keep adding new responsibilities to a mixed `*.jsx` file once the split is known

Current explore-intent files:

- [mapExploreIntent.content.js](../../../components/map/views/exploreIntent/mapExploreIntent.content.js)
- [mapExploreIntent.helpers.js](../../../components/map/views/exploreIntent/mapExploreIntent.helpers.js)
- [mapExploreIntent.styles.js](../../../components/map/views/exploreIntent/mapExploreIntent.styles.js)

Rule:

- no giant mixed file should own logic, copy, assets, and styles together

## 10.1 Reference Variant And Propagation Rule

iOS mobile is the canonical product reference for new emergency phases.

That does **not** mean other variants are allowed to drift.

Rules:

- design and interaction truth may be established on iOS mobile first
- once accepted, that truth must be moved into shared controller/model/theme/formatter boundaries so other variants inherit it
- do not â€œport laterâ€ by rebuilding the same feature separately on web, tablet, or Android
- if a wide-screen skeleton/header/CTA already encodes the intended placement but the live phase does not, that is a propagation bug, not a design decision

Parity is not only layout parity.

Every promoted `/map` phase must eventually inherit the same truth in these categories:

- shell geometry
  - panel/sheet padding
  - sidebar header placement
  - map control offsets
- UI composition
  - hero / CTA / detail hierarchy
  - loading and empty states
- action semantics
  - same CTA availability for the same runtime truth
  - same pressed / loading / disabled behavior
- data presentation
  - request id beautification / display formatting
  - ETA / arrival / distance formatting
  - service / hospital / room labels
  - status copy normalization
- runtime truth
  - same status transitions
  - same countdown/timer behavior
  - same reopen/recovery behavior
  - same share behavior when supported

Implementation rule:

- if a behavior belongs to more than one viewport or more than one service type, push it into shared helpers/modules before declaring the iOS implementation â€œdoneâ€

Web persistence rule:

- do not assume hidden browser tabs continue running timers or trip simulation work
- if `/map` needs active request truth after focus loss or reload, persist enough app-owned state to reconstruct it
- rebuild countdowns from persisted timestamps and backend truth on resume
- prefer the shared app storage boundary over new scattered direct `AsyncStorage` calls when adding `/map` persistence
- dynamic app-owned keys that cannot live in `StorageKeys` should still go through `database.readRaw/writeRaw/deleteRaw`
- do not move Supabase auth storage behind app-specific helpers; the Supabase client owns that AsyncStorage adapter contract

Minimum `/map` resume payload:

- active request id, service family, hospital id, transport/room id
- current phase, snap state, return target, and tracking/map visibility mode
- accepted/arrival/hold-expiry timestamps used to recompute ETA and countdowns
- route signature, last responder coordinate, heading, progress ratio, telemetry timestamp, and route source
- normalized status gates for arrived, completed, cancelled, and rating-pending states
- triage draft/progress, contact/profile draft, selected payment method id, and payment snapshot readiness
- last backend sync timestamp so stale local truth can be replaced quickly

### Specific target for `MapSheetShell`

The current `MapSheetShell.jsx` should keep moving toward this split:

```text
components/map/
  MapSheetShell.jsx                # render + slot composition only
  useMapSheetShell.js              # orchestration hook
  mapSheetShell.styles.js          # styles only
  mapSheetShell.helpers.js         # pure helper math / derived values
  mapSheetShell.gestures.js        # pan responder + handoff logic
  mapSheet.constants.js            # snap enums / indices / shell constants
  mapSheetTokens.js                # geometry + spacing + shell surface tokens
  mapMotionTokens.js               # cross-platform motion contract
  mapUI.tokens.js                  # shared map UI tokens
  mapGlassTokens.js                # liquid-glass / chrome tokens
```

Implementation principle:

- `MapSheetShell.jsx` should read like a thin view file
- gesture rules should live outside the render tree
- raw surface colors and glass treatments should come from tokens, not inline literals
- the same semantic token names should be mirrored to web through global CSS variables where needed
- iOS should remain the first-class source posture, with Android/web using platform overrides rather than a different design language

## 11. Modal Family Rule

Bridge modals must share one shell and one voice until they are replaced by sheet phases.

Shared shell:

- [MapModalShell.jsx](../../../components/map/surfaces/MapModalShell.jsx)
- [mapModalShell.styles.js](../../../components/map/surfaces/mapModalShell.styles.js)

Current bridge modal family:

- [MapPublicSearchModal.jsx](../../../components/map/surfaces/search/MapPublicSearchModal.jsx)
- [MapLocationModal.jsx](../../../components/map/surfaces/search/MapLocationModal.jsx)
- [MapHospitalModal.jsx](../../../components/map/MapHospitalModal.jsx)
- [MapHospitalDetailsModal.jsx](../../../components/map/MapHospitalDetailsModal.jsx)
- [MapCareHistoryModal.jsx](../../../components/map/MapCareHistoryModal.jsx)
- [MapGuestProfileModal.jsx](../../../components/map/MapGuestProfileModal.jsx)
- [MapRecentVisitsModal.jsx](../../../components/map/MapRecentVisitsModal.jsx)

Rules:

- one top row only
- title and close button only
- no extra close CTA inside the body
- close button must be the visible dismiss control
- keep copy minimal and task-specific
- these are temporary bridge surfaces, not the target end state for pre-dispatch map flow
- `search`, `hospital_list`, and `hospital_detail` should prefer persistent sheet phases before adding any new modal surface

## 11.1 Shared responsive surface metrics rule

All new `/welcome` and `/map` surfaces must size from shared responsive surface metrics, not ad hoc local numbers.

Canonical source:

- [viewportSurfaceMetrics.js](../../../utils/ui/viewportSurfaceMetrics.js)

Viewport readers:

- [useAuthViewport.js](../../../hooks/ui/useAuthViewport.js)
- [useResponsiveSurfaceMetrics.js](../../../hooks/ui/useResponsiveSurfaceMetrics.js)
- [useWebViewportMetrics.js](../../../hooks/ui/useWebViewportMetrics.js)

Current consumers:

- `/welcome`
  - [WelcomeStageBase.jsx](../../../components/welcome/shared/WelcomeStageBase.jsx)
  - [WelcomeWideWebView.jsx](../../../components/welcome/views/WelcomeWideWebView.jsx)
  - [IOSInstallGuideModal.jsx](../../../components/welcome/install/IOSInstallGuideModal.jsx)
  - [IOSInstallHintCard.jsx](../../../components/welcome/install/IOSInstallHintCard.jsx)
- `/map`
  - [MapModalShell.jsx](../../../components/map/surfaces/MapModalShell.jsx)
  - [MapExploreLoadingOverlay.jsx](../../../components/map/surfaces/MapExploreLoadingOverlay.jsx)
  - [MapGuestProfileModal.jsx](../../../components/map/MapGuestProfileModal.jsx)
  - [MapCareHistoryModal.jsx](../../../components/map/MapCareHistoryModal.jsx)
  - [MapRecentVisitsModal.jsx](../../../components/map/MapRecentVisitsModal.jsx)
  - [MapLocationModal.jsx](../../../components/map/surfaces/search/MapLocationModal.jsx)
  - [components/map/views/shared/useMapStageResponsiveMetrics.js](../../../components/map/views/shared/useMapStageResponsiveMetrics.js)
  - [components/map/views/exploreIntent/useMapExploreIntentResponsiveMetrics.js](../../../components/map/views/exploreIntent/useMapExploreIntentResponsiveMetrics.js)

Rules:

- on web mobile and tablet, visible viewport height is the sizing source of truth
- child surfaces may derive local helpers from the shared metrics, but they must not invent a second viewport system
- spacing, radii, CTA heights, title scales, card/media sizes, and modal geometry should come from shared semantic metrics first
- fixed values are allowed only for true optical constants that do not need to scale materially across supported breakpoints
- if a surface needs a responsive exception, add a semantic token/helper next to the shared metric consumer instead of scattering new inline numbers through JSX

## 12. Header Rule

The header is **not** navigation chrome or a page-title bar for `/map`.

It is reserved for true active emergency-session states after dispatch has actually started.

Header coordination lives in:

- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)

Shared header implementation:

- [constants/header.js](../../../constants/header.js)
- [ScrollAwareHeader.jsx](../../../components/headers/ScrollAwareHeader.jsx)
- [ActionWrapper.jsx](../../../components/headers/ActionWrapper.jsx)
- [HeaderLocationButton.jsx](../../../components/headers/HeaderLocationButton.jsx)

Rules:

- all top-surface state should flow through `setHeaderState(...)` and `getHeaderBehavior(...)`
- use shared header modes (`MAP_OVERLAY`, `FIXED`, `HIDDEN`) instead of local one-off booleans
- `explore_intent`, hospital browsing, and other pre-dispatch sheet states should keep the header hidden
- `COMMIT_DETAILS`, `COMMIT_TRIAGE`, and `COMMIT_PAYMENT` should also keep the header hidden in v1; they are focused sheet tasks, not live-session header states
- the header must not appear just to guide the user toward dispatch; it should appear only after dispatch is already live
- when active, the header should express real session state such as matched/tracking/progress, not page identity
- the active header may expand downward and should compress/collapse the sheet below it instead of floating as unrelated chrome
- modal/focused states should hide the header through the same global header contract
- on web, glass blur must be handled explicitly, not by falling back to Android styling

## 13. Pre-Dispatch Resource Data Rule

Pre-dispatch `/map` phases must prefer stable hospital-scoped pricing metadata over live logistics tables.

Preferred pre-dispatch sources:

- `hospitals`
- `service_pricing`
- `room_pricing`
- route preview / camera data

Do not build pre-dispatch UI around:

- live `ambulances` unit identity
- call sign
- plate
- live vehicle location
- assigned responder name / phone
- exact `ambulances.crew`

Reason:

- the legacy request modal already made ambulance choice from `service_pricing`
- this keeps guest-first and pre-authorization flow stable
- it prevents the public map sheet from depending on live dispatch inventory

Current security note:

- current RLS permits public `SELECT` on both `service_pricing` and `ambulances`
- that does not change the UI contract
- pre-dispatch surfaces should behave as if `ambulances` may later become authenticated-only or dispatch-only

Rendering rule for `ambulance_decision`:

- header = hospital + away line
- hero = selected ambulance tier
- hero pill 1 = crew
- hero pill 2 = price
- compact selector = centered icon + text only
- selected compact pill = app CTA color + optional filled icon state
- do not use a trailing chevron inside the compact selected pill
- first tap selects, second tap on the same pill may advance
- expanded state = alternative tiers, compact route surface, notes

Rendering rule for `bed_decision`:

- header = hospital + away line
- hero = selected room
- hero pill 1 = availability
- hero pill 2 = price
- compact selector row in half state should stay room-first and use the same centered icon + text grammar as `ambulance_decision`
- selected compact pill = app CTA color + optional filled icon state
- do not add nested trailing affordances to compact room pills
- first tap selects, second tap on the same room pill may advance
- expanded state = room comparison blades first
- route stays compact and should not wrap address subtext into two lines when avoidable
- current legacy handoff consumes room preselection
- in the combined flow, `bed_decision` must stay room-only even when `careIntent === "both"`
- combined care should use `ambulance_decision` first, then `bed_decision`, rather than mounting a third dedicated sheet phase
- when combined care is active, use the top subtitle line for step guidance:
  - `ambulance_decision` = `Step 1 of 2`
  - `bed_decision` = `Step 2 of 2`
- `savedTransport` in the combined flow is display state only and must be bound to its source hospital
- if the user changes hospitals during `bed_decision` step 2, `savedTransport` is stale and the flow must restart `ambulance_decision` for the newly selected hospital
- this invalidation belongs in flow orchestration (`useMapExploreFlow.js`), not inside `MapBedDecisionStageBase.jsx` or its parts

Rendering parity rule for `service_detail`:

- half state should mirror the compact selector grammar used in `ambulance_decision`
- expanded state should prefer flatter comparison blades over repeated pill controls
- inline footer CTA is preferred over sticky footer CTA on short screens
- unresolved price should use skeleton treatment or omission, not fallback text like `Price shown before booking`

Decision-boundary rule for `hospital_detail` and `service_detail`:

- `hospital_detail` is an upstream browse/select surface, not a commit surface
- `service_detail` is an upstream inspect/select surface, not a commit surface
- neither phase should jump directly into `COMMIT_DETAILS`, OTP, or auth
- intent routing from `hospital_detail` must stay:
  - ambulance intent = `hospital_detail -> ambulance_decision`
  - bed intent = `hospital_detail -> bed_decision`
  - combined intent = `hospital_detail -> ambulance_decision` first
- service rails/cards should continue to:
  - open `service_detail`, or
  - select the service directly into the correct decision phase
- auth and commit begin only after the user has locked the actual hospital + service choice inside a decision phase

Rendering rule for `commit_details`:

- first implementation scope is ambulance only
- open directly in `expanded`
- keep the map mounted behind it
- keep the phase sheet-led; do not switch on the global active header in v1
- top slot should carry the locked selection summary and short phase title
- ask one question at a time, not a stacked form
- email question first
- OTP verification second
- phone confirmation only when the resolved authenticated profile still lacks a reachable callback number
- triage moves to `COMMIT_TRIAGE`; it remains optional and skippable before payment
- do not block v1 on a dedicated name step
- use existing app auth primitives (`SmartContactInput`, `OTPInputCard`, `authService.requestOtp`, `authService.verifyOtp`)
- keep the new `/map` presentation and borrow stronger legacy behavior under it instead of reverting to the legacy auth modal UI
- back should step between microsteps before leaving the phase
- `COMMIT_DETAILS` prepares a local request draft only; DB create still belongs to `COMMIT_PAYMENT`
- if the selected hospital is demo-backed, preserve that hospital context through the draft so `COMMIT_PAYMENT` can resolve the demo auto-approval lane
- `COMMIT_PAYMENT` is now native for the ambulance path and must not route back through `RequestAmbulanceScreen`
- payment copy must stay patient-facing; backend demo/simulation terms are not allowed in visible labels, helper text, toasts, or waiting states

Rendering rule for `commit_triage`:

- first implementation scope is ambulance only
- open directly in `expanded`
- keep the map mounted behind it
- keep the global active header hidden
- ask one focused question at a time where possible
- borrow the strongest legacy triage question logic, not the legacy modal visuals
- use short patient language and visual chips/cards instead of clinical survey blocks
- `Skip` is allowed and must be visibly safe
- no diagnosis promise and no AI promise in user-facing copy
- output should enrich `patient_snapshot.triage` / `triageSnapshot` without blocking payment unless backend rules later require a field

Rendering rule for `commit_payment`:

- first implementation scope is ambulance only
- open directly in `expanded`
- keep the map mounted behind it
- keep the global active header hidden
- hero/payment card should feel like Apple Pay: locked hospital, transport, pickup, and total
- payment selector collapses after choice into one readable summary row with a small `Change` pill
- full payment method list expands only after `Change`
- the main dispatch CTA remains the only primary action
- own post-submit states inside the map sheet: `submitting`, `pending_approval`, `approved`, `denied`, and `failed`
- pending approval should stay in the sheet; do not show a legacy pending modal
- denied/failed should preserve the draft and expose recovery through `Change payment` / `Try again`
- approved should briefly acknowledge acceptance before switching to `TRACKING`
- payment copy must stay patient-facing; backend demo/simulation terms are not allowed in visible labels, helper text, toasts, or waiting states

Rendering rule for `tracking`:

- `TRACKING` is the first active emergency-session phase and may turn on the app-owned smart / scroll-aware header
- top header should express live route truth, not page identity
- Apple Maps direction: large active instruction/status capsule, compact secondary line, and visible route context
- sheet should compress beneath the active header rather than fighting it as separate chrome
- default sheet posture should be a compact route card with arrival time, minutes, and distance first
- expanded controls can include destination, share ETA, call hospital/driver when available, report issue, and cancel/end only when backend status rules allow it
- animate the ambulance/responder marker from realtime coordinates when available; use smooth route-progress projection only as a fallback

## 13.1 Shared request-model inheritance rule

Ambulance and bed flows are different product states, but they are not separate runtime families.

Rules:

- when ambulance and bed share the same emergency request / visit fields, they should share controller/model/formatter logic
- service-specific differences should live in service-specific presentation helpers or derived-model branches, not in a second disconnected stack
- bed parity should reuse the established ambulance commit/tracking architecture wherever possible
- formatting parity must inherit too:
  - request id beautification
  - metric formatting
  - status normalization
  - share action behavior
- if bed introduces a countdown/hold-window behavior, that behavior must use the same shared timing/metric presentation contracts the tracking header and hero already rely on

## 14. Loading Rule

There is now **one** startup loading layer inside the live `/map` route.

Active file:

- [MapExploreLoadingOverlay.jsx](../../../components/map/surfaces/MapExploreLoadingOverlay.jsx)

Retired/dead path:

- `app/(auth)/map-loading.js` removed
- [MapEntryLoadingScreen.jsx](../../../screens/MapEntryLoadingScreen.jsx) no longer owns public map entry

Rules:

- no separate blocking `map-loading` route
- the real map mounts immediately and owns the startup state
- one calm overlay protects readiness while location/map/provider context settles
- provider expansion, demo bootstrap, and route enrichment continue in the background
- do not flash a half-broken map surface before route and hospital context are ready

## 15. Current `/map` UI Inventory Reference

This is the current element inventory to reference during cleanup or global consistency passes.

### Route / shell layer
- `WebAppShell`
- `ScrollAwareHeader` via auth layout / shared header state
- `GlobalFAB`

### Base map canvas
- `EmergencyLocationPreviewMap`
- `MapView`
- hospital markers
- selected hospital marker
- user location marker
- route polyline
- `MapControls`

### Main sheet surface
- `MapSheetOrchestrator`
- search pill
- profile trigger / avatar
- nearest hospital summary card
- care choice section (`Ambulance`, `Bed space`, `Compare`)
- featured hospital rail in expanded posture
- terms footer in expanded posture

### Loading surface
- `MapExploreLoadingOverlay`
- muted static map backdrop image (when available)
- soft gradient scrim
- ghost header + ghost sheet treatment
- loading copy, status chips, and placeholder rows

### Modal family
- `MapLocationModal`
- `MapPublicSearchModal`
- `MapHospitalDetailsModal`
- `MiniProfileModal`
- `MapGuestProfileModal`
- `MapCareHistoryModal`
- `MapRecentVisitsModal`
- `AuthInputModal`

### Active sheet phases
- `explore_intent`
- `search`
- `hospital_list`
- `hospital_detail`
- `service_detail`

### Suppressed internals
- `EmergencyLocationPreviewMap` internal skeleton exists but is disabled on `/map` via `showInternalSkeleton={false}`

## 14. Readiness Rule

`/map` is only ready when:

- active location exists
- hospital discovery is settled
- map is ready
- route is ready when a route is expected
- demo bootstrap is finished when needed

Rule:

- readiness should be truth-based, not timer-based

## 15. Data Truth Rule

Hospital rails and hospital choice on `/map` must use real discovered hospitals first.

Rules:

- no fake hospital names to pad UI
- use muted placeholders only for scroll awareness
- placeholders must look obviously non-real
- the app should use the full discovered nearby set, not a display-trimmed subset, as source data

## 16. Explore / Intent Rule

Current `explore_intent` content hierarchy:

Half:

- search row
- nearest hospital trigger
- choose care trigger and care row

Expanded:

- same half content
- hospital image rail
- footer terms link

Collapsed:

- drag affordance
- search row
- profile trigger

Rules:

- collapsed must not show dead empty strip under search
- hospital rail is edge-to-edge at wrapper level
- normal content sections keep their own local gutter
- supporting copy defaults to `400` weight

## 17. Hospital Rail Rule

Hospital cards in expanded state are not a generic list.

Rules:

- rail wrapper reaches sheet edges
- rail content owns its own x-padding
- real hospitals first
- two muted placeholders remain for scroll awareness
- if enough cards exist, the rail should read as a partial-visibility horizontal carousel
- placeholders should use static skeleton structure, not fake hospital copy

## 18. Search Rule

The main sheet search is public iVisit search, not location change.

Rules:

- location change belongs in the header trigger
- main search should become the `search` sheet phase
- any remaining search modal behavior is bridge-only and should be removed as the swap lands

## 18.1 Collapsed-state swap rules

- `search`
  - collapsed state matches the resting `explore_intent` shell
  - same search row and profile trigger posture
  - does not autofocus when restored to `half`
- `hospital_list`
  - no collapsed state in the first migration pass
  - minimum posture is `half`
- `hospital_detail`
  - collapsed state may compress into a one-row summary
  - row includes:
    - leading CTA / affordance
    - centered hospital title
    - distance subtext
    - trailing close icon

## 18.2 Sheet motion and gesture rules

Rules:

- sheet snap, drag, wheel, and Android body-collapse thresholds belong in `mapMotionTokens`
- wheel and trackpad detents must have cooldown protection so one gesture does not cause multiple snaps
- Android expanded-to-half collapse must be available from the body region when the body scroll is at top
- expanded-to-half collapse should reset the body scroll to top before the half state is shown again
- phase changes should use shared transition treatment so the sheet reads as one continuous surface
- looping attention motion must stop once the user has selected an option or the expanded surface already reveals the full context

## 18.3 Header chrome rules

Rules:

- `/map` close controls use `MapHeaderIconButton`
- close controls are `38 x 38`, full-round, and use a `17` icon by default
- the visual surface for close controls should match the shared sheet chrome token, not a one-off opaque color
- non-close icon tiles may use continuous/squircle corners, but close buttons stay fully rounded

## 19. Auth Rule

Exploration is guest-friendly.

Rules:

- user may explore as guest
- profile trigger may offer email-first restore/auth path
- auth should not block map exploration
- auth remains later in commitment flows

## 20. Typography Rule

Rules:

- supporting text defaults to `400`
- use heavier weights only for actual hierarchy
- do not over-bold subtext or metadata

## 21. Reuse Rule

Before creating a new map UI primitive, reuse in this order:

1. `MapSheetShell`
2. `MapModalShell`
3. `mapSheetTokens`
4. `mapMotionTokens`
5. `useMapExploreFlow`
6. existing variant folder structure

## 22. Refactor Rule Going Forward

No new `/map` mode should be added by growing one file past readability again.

Expected shape for future modes:

- `components/map/views/<mode>/`
  - `<Mode>Orchestrator.jsx`
  - `<Mode>StageBase.jsx`
  - platform variant wrappers
  - `<mode>.content.js`
  - `<mode>.helpers.js`
  - `<mode>.styles.js`

That is the current standard.
