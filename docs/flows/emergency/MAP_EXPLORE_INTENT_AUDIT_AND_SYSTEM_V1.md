# Map Explore / Intent Audit And System (v1)

> Status: Active audit and build plan
> Scope: `/map` -> `explore_intent`
> Platform priority: `ios-mobile` first, then `android-mobile`

Related references:

- [EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [MAP_FLOW_IMPLEMENTATION_V1.md](./MAP_FLOW_IMPLEMENTATION_V1.md)
- [../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md](../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md)
- [APPLE_MAPS_IPHONE_UI_REFERENCE.md](../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)
- [WelcomeScreenOrchestrator.jsx](../../../components/welcome/WelcomeScreenOrchestrator.jsx)
- [EmergencyIntakeOrchestrator.jsx](../../../components/emergency/intake/EmergencyIntakeOrchestrator.jsx)

External references used:

- Apple Human Interface Guidelines overview: https://developer.apple.com/design/human-interface-guidelines/
- Apple HIG Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Apple HIG Modality: https://developer.apple.com/design/human-interface-guidelines/modality
- Apple HIG Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Symbols framework docs: https://developer.apple.com/documentation/symbols/

## 1. Current Surface Audit

The current `/map` `explore_intent` state proves the new direction, but it is not yet an Apple-grade system.

The good:

- one persistent map canvas already exists
- one persistent sheet shell already exists
- search and hospital list now belong to dedicated sheet phases, not separate sibling modals
- the sheet already has a stable initial mode: `explore_intent`
- the map already frames a real route above the sheet

The weak points:

- the screen is still one large page controller instead of a variant system
- iconography is inconsistent and mixes platform grammar with library grammar
- the sheet shell has tokens, but the rest of the map UI does not
- modals still feel like individually repaired surfaces, not one family
- map controls, markers, route styling, and sheet content are not yet unified into one visual language

## 2. Where We Currently Miss Apple HIG

## 2.1 Surface Architecture

Apple-like behavior:

- one stable surface
- one stable content layer
- one changing decision layer
- platform-consistent materials and symbols

Current gap:

- [MapScreen.jsx](../../../screens/MapScreen.jsx) still owns too much:
  - map state
  - modal state
  - profile/auth state
  - sheet mode
  - hospital selection side effects
  - header coordination
  - FAB registration

Why this matters:

- Apple-quality interfaces are usually not just visually clean; they are structurally coherent
- if state ownership stays this flat and page-level, visual drift will keep happening

Conclusion:

- `MapScreen.jsx` should become a thin screen root
- state and view selection must move into a map-specific provider + orchestrator pair

## 2.2 Icon System

Apple guidance says:

- use familiar icons for familiar actions
- when text is clearer than an icon, prefer text
- symbols should feel consistent in weight and semantics

Current gap:

- [MapSheetOrchestrator.jsx](../../../components/map/MapSheetOrchestrator.jsx) mixes:
  - `Ionicons`
  - `MaterialCommunityIcons`
  - bitmap hospital assets
- care actions use illustrative service icons while chrome uses generic platform-ish icons
- control icons like `scan-circle-outline` feel technical, not human
- `hospital-box` and `hospital-building` are functional, but not refined enough for iOS chrome

What fails HIG here:

- too many icon dialects in one surface
- uneven stroke/fill behavior
- service icons and chrome icons do not belong to the same family

Decision:

- use one symbol family for chrome
- use one custom pictogram family for care types and map markers

That means:

- chrome symbols:
  - search
  - close
  - chevron
  - back
  - recenter
  - expand nearby
  - profile affordances
- custom care pictograms:
  - ambulance
  - bed space
  - both
  - hospital markers

Do not mix MaterialCommunityIcons into iOS chrome once iOS mobile is being solidified.

## 2.3 Buttons And Action Hierarchy

Apple guidance says:

- one obvious primary action per moment
- custom buttons need a press state
- avoid too many prominent actions in one view

Current gap:

- the half sheet currently presents:
  - search
  - nearest hospital card
  - profile trigger
  - choose care heading
  - three care actions

This is acceptable for exploration, but the care row and nearest hospital card are competing too much for visual attention.

What fails HIG here:

- the choice hierarchy is still slightly noisy
- the care icons are visually richer than the hospital preview card, even though the hospital preview is the stronger context object

Decision:

- on iOS mobile, the nearest hospital card should be visually stronger than the care row
- the care row should feel selectable, but secondary to map context

## 2.4 Modality

Apple guidance says:

- modal tasks should be short and narrowly scoped
- always provide an obvious dismiss path
- avoid making modal stacks feel like apps within the app

Current gap:

- the move toward one-row modal headers is correct
- but the modal family is still not truly unified:
  - hospital list
  - location search
  - choose care
  - guest profile

Each one still has slightly different layout rules and internal assumptions.

Decision:

- all `/map` modal tasks should share one modal shell contract
- only content changes

## 2.5 Materials

Apple guidance says:

- Liquid Glass establishes a separate functional layer above content
- controls float above content while preserving content legibility
- harmony matters: software and hardware curvature should align

Current gap:

- [mapSheetTokens.js](../../../components/map/mapSheetTokens.js) is a good start, but it only tokenizes the sheet
- map controls, modal close buttons, hospital cards, care icon orbs, and profile avatar surfaces do not all derive from one material system

Decision:

- build one reusable material token set for:
  - sheet shells
  - card blades
  - search pills
  - control pills
  - close buttons
  - avatar surfaces
  - marker chips

## 2.6 Layout And Safe Areas

Apple guidance says:

- layouts should harmonize with device curves and system bars
- avoid putting controls in unsafe bottom regions
- keep critical information clear of interference from bars and hardware

Current gap:

- the route framing is better, but still hand-tuned in [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)
- the sheet geometry is partly tokenized, but map camera padding is still mostly imperative

Decision:

- map camera framing must become part of the screen variant contract
- every variant should define:
  - top obstruction height
  - bottom obstruction height
  - default route framing padding
  - nearby framing padding

## 3. Reusable Design System Proposal

## 3.1 Core Rule

Do not keep building `/map` as a screen with many exceptions.

Build it as:

- one state provider
- one surface orchestrator
- one sheet shell
- one modal shell
- one marker system
- one icon system
- one camera system

## 3.2 New Structure

Recommended architecture:

- `MapFlowProvider`
  - owns mode, snap state, selection state, modal state, profile/auth triggers
- `MapScreenOrchestrator`
  - chooses screen variant exactly like welcome does
- `MapSurfaceBase`
  - renders shared map + shared modal layer + shared header coordination
- `MapSheetShell`
  - shared shell only
- `MapPhaseRenderer`
  - content for `explore_intent`, `hospital_preview`, `ambulance_decision`, and so on

## 3.3 Component Families

Create these primitives:

- `MapGlassSurface`
- `MapControlPill`
- `MapModalShell`
- `MapModalHeader`
- `MapSearchRow`
- `MapHospitalPreviewCard`
- `MapCareOptionOrb`
- `MapBladeRow`
- `MapProfileAvatar`
- `MapUserPuck`
- `MapHospitalMarker`
- `MapRouteStroke`

Every one of these should use shared tokens.

## 3.4 Token Groups

Expand beyond the current sheet tokens.

Recommended token groups:

- `mapMaterials`
  - `glassHeavy`
  - `glassMedium`
  - `glassLight`
  - `underlay`
  - `overlay`
- `mapRadii`
  - `sheet`
  - `card`
  - `pill`
  - `orb`
  - `marker`
- `mapSpacing`
  - `screenInset`
  - `sheetInset`
  - `cardGap`
  - `sectionGap`
  - `modalInset`
- `mapTypography`
  - `title`
  - `section`
  - `label`
  - `meta`
- `mapIcons`
  - `chromeFamily`
  - `careFamily`
  - `markerFamily`
- `mapCamera`
  - `topPadding`
  - `bottomPadding`
  - `sidePadding`
  - `nearbyRadius`

## 4. iOS Mobile Solidification Rules

This is the canonical reference variant.

Everything else should be derived from this.

## 4.1 Chrome

- back button stays in shared header
- current address stays in shared header
- profile trigger stays circular and minimal
- all close buttons use the same liquid/glass circle
- chrome icons use one iOS-appropriate family only

## 4.2 Explore / Intent Sheet

Required hierarchy:

1. search row
2. nearest hospital card
3. choose care trigger row
4. care orbs

Rules:

- no extra helper copy unless it is necessary
- no stacked headings inside the half sheet
- one clear content group at a time
- care row labels stay sentence case

## 4.3 Care Modal

Required hierarchy:

1. header row
2. care blades
3. recent visits only if present

No:

- explanatory intro copy
- auth copy
- recovery copy for first-time users

## 4.4 Guest Profile Sheet

Required hierarchy:

1. close button
2. avatar
3. `What’s your name?`
4. text field
5. shared FAB drives continue

No inline primary button.

## 4.5 Map Controls

Rules:

- one vertical pill
- one family
- one shared material surface
- compact padding
- no divider
- no technical icon naming in the final UI

Recommended control semantics:

- recenter on me
- show nearby hospitals

## 4.6 Markers

Rules:

- user puck should be platform-native in feel
- hospital markers should not be arbitrary mixed art styles
- selected hospital state must be clearer than unselected hospital state
- marker labels should not imitate Apple Maps place labels unless they are real map labels

Current direction:

- keep custom hospital marker assets for now
- redesign them into one coherent marker family next

## 5. Samsung Android Mobile Follow-On

Do not copy iOS literally.

Keep:

- same state model
- same hierarchy
- same care choices
- same modal family

Adjust:

- reduce blur reliance
- increase surface opacity
- use Android-appropriate chrome icon style
- use slightly firmer edges and less concentric softness
- give controls slightly more spacing for one-hand use

So the translation becomes:

- iOS mobile = reference expression
- Samsung Android mobile = platform adaptation, not redesign

## 6. Variant Plan

Just like welcome, `/map` needs explicit screen variants.

Recommended first set:

- `ios-mobile`
- `android-mobile`
- `web-mobile`
- `android-fold`
- `ios-pad`
- `android-tablet`
- `web-sm-wide`
- `web-md`
- `web-lg`

## 6.1 Variant Responsibility

Each variant should define:

- sheet geometry
- modal geometry
- camera padding
- control placement
- max card width
- header offset

Variants should not redefine:

- core mode names
- copy semantics
- marker semantics
- action hierarchy

## 6.2 Implementation Pattern

Mirror welcome:

- `MapScreenOrchestrator.jsx`
- `views/MapIOSMobileView.jsx`
- `views/MapAndroidMobileView.jsx`
- `views/MapWebMobileView.jsx`
- and so on

The base content stays shared. Variants own only layout and geometry.

## 7. Immediate Build Order

1. Solidify `ios-mobile`
   - icon system
   - modal shell family
   - material token family
   - care chooser hierarchy
   - profile sheet using shared FAB cleanly
2. Extract `MapScreenOrchestrator`
3. Extract `MapFlowProvider`
4. Build `android-mobile` adaptation
5. Build web mobile adaptation

## 8. Non-Negotiable Decisions

- `explore_intent` remains the first `/map` mode
- `/map` remains a persistent map-first route
- search and hospital list should remain within the persistent sheet-state family
- guest flow continues until commit
- iOS chrome uses one symbol family
- care/service icons become a separate, reusable pictogram family
- screen variants follow the welcome orchestration model
