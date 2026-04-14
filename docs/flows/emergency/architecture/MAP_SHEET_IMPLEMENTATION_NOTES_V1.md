# Map Sheet Implementation Notes (v1)

> Status: Active implementation reference
> Scope: `/map` sheet phases
> Purpose: record the sheet implementation lessons that should stay true even when phase internals are refactored

Related references:

- [README.md](./README.md)
- [MAP_SHEET_PARITY_TASKLIST_V1.md](./MAP_SHEET_PARITY_TASKLIST_V1.md)
- [../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [../MAP_FLOW_IMPLEMENTATION_V1.md](../MAP_FLOW_IMPLEMENTATION_V1.md)
- [../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)

## 1. Current shared stage structure

The newer sheet phases now share one body-scroll wrapper:

- `components/map/views/shared/MapStageBodyScroll.jsx`

This wrapper owns:

- the phase `ScrollView`
- the shared `react-native-gesture-handler` `GestureDetector` path used for Android expanded-to-half collapse
- the non-collapsable child wrapper required by RNGH on Fabric / Expo

Rule:

- phase stages may compose their own top-slot and body content
- they should not each re-implement the same scroll-shell wrapper unless a phase has a hard visual or behavioral exception

## 2. Hospital detail exception

`hospital_detail` is the important exception.

Its expanded state is not just a taller version of the half state.

The intended visual contract is:

- hero image remains the dominant visual anchor
- title/subtitle block lives on the lower image area in expanded state
- the glass body overlaps under the hero
- the overlap should feel like image + glass continuity, not a flat slab sitting on top of the image

What failed in a recent refactor:

- the half and expanded trees were collapsed into one persistent body tree
- this removed the explicit expanded hero/title/body composition
- the replacement tried to simulate the old look with panel gradients
- the result broke the intended visual hierarchy and created an obvious slab over the image

Working rule:

- do not flatten `hospital_detail` expanded and half layouts into one generic body tree unless the expanded hero/title overlap is preserved exactly
- behavior reuse is not enough if the visual contract changes

## 3. Preserve structure before abstracting

When refactoring map sheet phases:

1. preserve the product-visible structure first
2. verify the exact hero/title/body relationship on device
3. only then abstract common scaffolding

For `hospital_detail`, the safe abstraction boundary is:

- stage shell wiring
- scroll wrapper
- top-slot composition helpers
- selection state ownership

The unsafe abstraction boundary is:

- collapsing the expanded and half visual trees into one simplified content tree without pixel-level validation

## 4. Selection-state lesson

For rail/card selection inside a sheet phase:

- selection that should survive snap-state changes belongs above the surface component
- `hospital_detail` card selection is currently owned at the stage layer, keyed by hospital id

Rule:

- surface components should render selection
- stage or flow state should own selection persistence

## 5. Gesture lesson

The current Android expanded-to-half fix works because gesture ownership is explicit:

- top-of-scroll is still tracked from the phase scroll view
- collapse is driven by a dedicated gesture-handler path mounted on the body region
- the gesture must run on JS via `.runOnJS(true)` for the current Expo/Reanimated setup
- the gesture child must be wrapped in a non-collapsable `View`

Rule:

- do not stack multiple competing responder systems when one explicit gesture path can own the behavior

## 6. Corner and Liquid Glass lesson

The map sheet family should share one corner/material language:

- non-full rounded rectangles use continuous corners through `borderCurve: "continuous"` or a local `squircle(radius)` helper
- true circles and full pills remain full-round and do not need the squircle helper
- `MapSheetShell`, `MapModalShell`, and `MapStageGlassPanel` are the preferred Liquid Glass owners
- `MapLiquidGlassLayer` owns the soft rainbow/prismatic sheen so it stays consistent across iOS, Android, and web
- phase internals should use tokenized translucent surfaces, not hard-coded opaque slabs
- primary red emergency CTAs stay solid when action hierarchy would be weakened by glass

Rule:

- if a new map surface introduces a rounded card, button, or sheet without continuous corners or a tokenized material decision, treat it as visual-system drift

## 7. Practical review checklist

Before closing any future map-sheet refactor:

- verify `collapsed`, `half`, and `expanded` on iOS
- verify `collapsed`, `half`, and `expanded` on Android
- verify drag-down from expanded to half on Android
- verify the `hospital_detail` hero/title/body overlap visually
- verify search input focus timing after expand
- verify rail selection persists across snap-state changes when expected

If any refactor improves code reuse but weakens the visible sheet contract, revert the structural change first and redesign the abstraction boundary second.
