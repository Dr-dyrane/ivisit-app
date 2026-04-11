# Map Screen Implementation Rules (v1)

> Status: Active implementation contract
> Scope: public `/(auth)/map-loading` and `/(auth)/map`
> Purpose: lock the architectural, UI, motion, and file-organization rules for the new map-first emergency surface

Related references:

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

Rule:

- when in doubt about map, sheet, or active-header UI direction, defer first to the Apple reference, then translate it through the iVisit product spec and implementation contract

## 1. Core Product Rule

The new emergency experience is no longer page-switched form flow.

It is:

- one persistent map canvas
- one persistent sheet shell
- one changing sheet mode
- a small set of task modals

The app should not leave the map once the user enters it.

## 2. Route Rule

The public emergency entry is now:

- [WelcomeScreen.jsx](../../../screens/WelcomeScreen.jsx)
  - routes to `/(auth)/map-loading`
- [MapEntryLoadingScreen.jsx](../../../screens/MapEntryLoadingScreen.jsx)
  - shows entry skeleton
  - resolves location, hospital refresh, and demo bootstrap
  - replaces to `/(auth)/map`
- [MapScreen.jsx](../../../screens/MapScreen.jsx)
  - mounts the live persistent map surface

Rule:

- do not route welcome directly into the live map surface if core emergency data is not ready

## 3. Screen Ownership Rule

[MapScreen.jsx](../../../screens/MapScreen.jsx) must stay thin.

It may compose:

- persistent map
- persistent sheet
- task modals
- loading overlay

It must not become the business-logic controller.

Move state and side effects into:

- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)

## 4. Flow Ownership Rule

[useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js) is the source of truth for the public map flow.

It owns:

- sheet mode
- sheet snap state
- modal visibility
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
  - structure and composition
- `*.styles.js`
  - styles only
- `*.content.js`
  - labels, copy, assets, constants local to the mode
- `*.helpers.js`
  - formatting and derived helpers

Current explore-intent files:

- [mapExploreIntent.content.js](../../../components/map/views/exploreIntent/mapExploreIntent.content.js)
- [mapExploreIntent.helpers.js](../../../components/map/views/exploreIntent/mapExploreIntent.helpers.js)
- [mapExploreIntent.styles.js](../../../components/map/views/exploreIntent/mapExploreIntent.styles.js)

Rule:

- no giant mixed file should own logic, copy, assets, and styles together

## 11. Modal Family Rule

Map task modals must share one shell and one voice.

Shared shell:

- [MapModalShell.jsx](../../../components/map/MapModalShell.jsx)
- [mapModalShell.styles.js](../../../components/map/mapModalShell.styles.js)

Current modal family:

- [MapPublicSearchModal.jsx](../../../components/map/MapPublicSearchModal.jsx)
- [MapLocationModal.jsx](../../../components/map/MapLocationModal.jsx)
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

## 12. Header Rule

The smart-header fix is the **global contract** for `/map`; the map should drive it intentionally instead of inventing separate top chrome.

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
- map state should set the header title from the resolved location model
- modal/focused states should hide the header through the same global header contract
- on web, glass blur must be handled explicitly, not by falling back to Android styling

## 13. Loading Rule

There is now **one** startup loading layer inside the live `/map` route.

Active file:

- [MapExploreLoadingOverlay.jsx](../../../components/map/MapExploreLoadingOverlay.jsx)

Retired/dead path:

- `app/(auth)/map-loading.js` removed
- [MapEntryLoadingScreen.jsx](../../../screens/MapEntryLoadingScreen.jsx) no longer owns public map entry

Rules:

- no separate blocking `map-loading` route
- the real map mounts immediately and owns the startup state
- one calm overlay protects readiness while location/map/provider context settles
- provider expansion, demo bootstrap, and route enrichment continue in the background
- do not flash a half-broken map surface before route and hospital context are ready

## 14. Current `/map` UI Inventory Reference

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
- `MapHospitalModal`
- `MapHospitalDetailsModal`
- `MiniProfileModal`
- `MapGuestProfileModal`
- `MapCareHistoryModal`
- `MapRecentVisitsModal`
- `AuthInputModal`

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
- main search opens the public search modal
- search modal can reuse legacy search logic, but it must use map-modal voice and shell

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
