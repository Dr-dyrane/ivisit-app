# Map Design System Overview (v1)

> Status: Active contributor reference
> Scope: public `/map` and future emergency map states

Related:

- [../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)
- [../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md](../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md)
- [../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [../flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md](../flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md)

## Goal

Keep the map flow visually familiar at a glance while making its structure, motion, materials, and active-header behavior production-grade.

## Current architecture concern: JSX vs JS separation

This concern is valid: the separation between `*.jsx` and supporting `*.js` files is **not fully complete yet** across the current `/map` work.

Target rule:

- `*.jsx` = structure, composition, and render wiring only
- `*.styles.js` = styles only
- `*.content.js` = copy, labels, and mode-local assets
- `*.helpers.js` = pure formatting and derived helpers
- `*.tokens.js` / `*.constants.js` = shared design, motion, and state constants
- `use*.js` hooks = orchestration, state, and side effects

If a map file still mixes JSX, copy, constants, and helper logic together, treat it as **active refactor debt**, not the desired end state.

## Main guiding docs for map / sheet / active-header UI

Use this reading order before changing `/map` UI, sheet behavior, or the active header contract.

1. [../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)
   - external Apple behavior + latest visual-language reference
2. [../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
   - iVisit product doctrine for map, sheet, and state transitions
3. [../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
   - implementation contract for map shell, sheet shell, and smart/active header
4. [../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md](../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md)
   - ownership map for runtime files and orchestration
5. [../flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md](../flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md)
   - cross-flow reference for header/intake continuity outside `/map`

## Recommended modularization target for `MapSheetShell`

Yes — `MapSheetShell` can and should be modularized into a reusable surface family.

Recommended split:

- `MapSheetShell.jsx`
  - render structure only
  - consumes tokens, hook output, and children slots
- `useMapSheetShell.js`
  - animated values, snap interpolation, safe-area handling, runtime orchestration
- `mapSheetShell.styles.js`
  - React Native style objects only
- `mapSheetShell.helpers.js`
  - derived layout/math helpers and non-side-effect utilities
- `mapSheetShell.gestures.js`
  - vertical pan ownership, release thresholds, gesture-vs-scroll handoff wiring
- `mapSheet.constants.js`
  - snap states, indices, and non-visual enums
- `mapSheetTokens.js`
  - geometry, spacing, radius, and shell-level surface tokens
- `mapMotionTokens.js`
  - spring, easing, resistance, velocity, and platform motion rules
- `mapUI.tokens.js`
  - shared card/chip/icon/text tokens used across map surfaces
- `mapGlassTokens.js` or `mapChromeTokens.js`
  - Liquid Glass / blur / overlay / shadow / chrome emphasis tokens
- web global CSS variables
  - mirror the same semantic tokens for web-specific presentation

Principle:

- do **not** let `MapSheetShell.jsx` keep absorbing raw RGBA values, motion thresholds, helper math, and gesture logic inline
- move those into support files so the shell stays easy to reason about, test, and reuse

## Core Pieces

### 1. Screen Controller

- [MapScreen.jsx](../../screens/MapScreen.jsx)

Responsibility:

- compose the persistent map, persistent sheet, and modal layer
- avoid owning business logic directly

### 2. Flow Controller

- [useMapExploreFlow.js](../../hooks/map/useMapExploreFlow.js)

Responsibility:

- phase state
- modal state
- profile/auth handoff
- location handoff
- hospital selection
- readiness gating
- explicit demo bootstrap for `/map`

### 3. Persistent Sheet

- [MapSheetOrchestrator.jsx](../../components/map/MapSheetOrchestrator.jsx)
- [MapSheetShell.jsx](../../components/map/MapSheetShell.jsx)
- [mapSheet.constants.js](../../components/map/mapSheet.constants.js)
- [mapSheetShell.styles.js](../../components/map/mapSheetShell.styles.js)
- [mapSheetTokens.js](../../components/map/mapSheetTokens.js)

Responsibility:

- `MapSheetOrchestrator` routes by mode
- `MapSheetShell` owns one persistent floating sheet shell
- one mode
- one snap state
- content changes without replacing the shell

Current view decomposition example:

- [components/map/views/exploreIntent](../../components/map/views/exploreIntent)

### 4. Modal Family

- [MapModalShell.jsx](../../components/map/surfaces/MapModalShell.jsx)
- [mapModalShell.styles.js](../../components/map/surfaces/mapModalShell.styles.js)

Responsibility:

- same open/close motion
- same backdrop behavior
- same close affordance
- same top-row alignment

### 5. Loading Family

- [MapExploreLoadingOverlay.jsx](../../components/map/surfaces/MapExploreLoadingOverlay.jsx)
- [mapExploreLoadingOverlay.styles.js](../../components/map/surfaces/mapExploreLoadingOverlay.styles.js)

Responsibility:

- believable pre-map skeleton
- same map + header + half-sheet silhouette as the real screen
- hides partial data states until readiness is satisfied

### 6. Motion Tokens

- [mapMotionTokens.js](../../components/map/mapMotionTokens.js)

Current shared tokens:

- modal spring
- sheet snap spring
- modal fade timings
- care pulse timing

## Design Rules

- One persistent map render.
- One persistent sheet shell.
- Modals are tasks, not separate mini-apps.
- Supporting text should default to `400` weight unless emphasis is truly required.
- The map should wait for meaningful readiness, not just mount.
- The hospital list shown on `/map` should come from the full discovered nearby set, not the display-trimmed subset.
- Sheet phase changes should feel like one surface changing state, not a route replacement.
- Motion should acknowledge intent immediately while staying calm and short.

## Corner And Material Contract

Apple's current HIG material guidance treats sheets, controls, navigation chrome, and grouped list/card sections as rounded, concentric elements that sit in a distinct functional layer above content. In this codebase, that means:

- Any map sheet, modal sheet, card, grouped list surface, non-full icon tile, compact button, or image card that uses a rounded rectangle must use continuous corners: `borderCurve: "continuous"` with its `borderRadius`, or a local `squircle(radius)` helper.
- True circles and full pills remain full-round: `borderRadius: 999`, exact half-height circles, marker dots, skeleton bars, and capsule chips do not need `borderCurve`.
- Map close buttons are also full-round controls, not squircles. Use `MapHeaderIconButton` for search, hospital list, hospital detail, service detail, and modal close affordances.
- Nested rounded elements should be concentric: inner cards and icon tiles need slightly smaller continuous radii than the parent surface.
- Primary emergency CTAs can remain solid color. Do not turn the only primary action into glass if that weakens action hierarchy.
- Prefer tokenized Liquid Glass through `MapSheetShell`, `MapModalShell`, `MapStageGlassPanel`, `mapGlassTokens`, and `mapUI.tokens`; do not add one-off opaque slabs inside phase content.

Reference:

- Apple HIG Materials: <https://developer.apple.com/design/human-interface-guidelines/materials>
- Apple developer guidance, Adopting Liquid Glass: <https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass>

## Liquid Glass Placement Audit

Use Liquid Glass where the element is chrome or a major floating surface:

- `MapSheetShell` and `MapModalShell` own the base material for persistent sheets and task sheets.
- Search pills, close controls, cycle/next controls, profile triggers, and sticky headers should read as functional glass chrome.
- Explore intent summary cards, hospital list rows, search result groups, and service-detail sections should use tokenized translucent card surfaces instead of flat opaque slabs.
- Hospital detail expanded state needs the hero/body overlap to remain glass-like, with gradient tapering where the body meets imagery.
- Wide-screen sidebar panels should keep the same sheet material and continuous radius as mobile sheets, only changing size and placement.

Avoid Liquid Glass where it adds noise:

- Do not layer glass on every small badge or metric chip; use muted card tokens unless the control is interactive chrome.
- Do not glass map pins, route lines, skeleton bars, or pure status dots.
- Do not stack multiple translucent layers under text without a contrast guard. Bright imagery needs a top/bottom mask before pills or text sit on it.

## Current Reuse Standard

New map surfaces should reuse these first:

1. `MapModalShell`
2. `mapMotionTokens`
3. `mapSheetTokens`
4. `MapHeaderIconButton`
5. `MapStageBodyScroll`
6. `useMapAndroidExpandedCollapse`
7. `MapPhaseTransitionView`
8. `useMapExploreFlow`
9. `MapLocationModal` / `MapHospitalModal` bridge task-sheet patterns, or the persistent `search` / `hospital_list` / `hospital_detail` sheet phases when the state already belongs in the main map shell

Only create new one-off modal or motion behavior if the shared contract truly cannot express the state.

## Motion And Gesture Contract

Map motion is tokenized in `components/map/tokens/mapMotionTokens.js`.

Rules:

- Use `MAP_SHEET_SNAP_SPRING` for sheet snap motion unless there is a documented platform exception.
- Use `MAP_PLATFORM_MOTION.sheet.expandedBodyGesture` for Android expanded-body collapse thresholds.
- Use wheel cooldown tokens for web/trackpad detents so a single gesture cannot produce multiple snap changes.
- Phase transitions should use `MapPhaseTransitionView` or an equivalent shared transition wrapper, not ad hoc opacity/translate code per phase.
- Avoid indefinite looping motion after the user has made a choice or after the surface is expanded; motion should guide attention, not keep advertising.
- Search focus must be user-intent-driven after the first open. Do not refocus inputs automatically when returning to `half`.
