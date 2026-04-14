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
- `components/map/views/shared/useMapAndroidExpandedCollapse.js`

This wrapper owns:

- the phase `ScrollView`
- the shared `react-native-gesture-handler` `GestureDetector` path used for Android expanded-to-half collapse
- the non-collapsable child wrapper required by RNGH on Fabric / Expo
- the Android-only visual pull feedback applied to expanded body content before a collapse commits

Rule:

- phase stages may compose their own top-slot and body content
- they should not each re-implement the same scroll-shell wrapper unless a phase has a hard visual or behavioral exception
- Android expanded-body collapse must use `mapMotionTokens.sheet.expandedBodyGesture`, not local magic thresholds

## 2. Phase transition rule

The persistent sheet should not hard-cut between sheet phases.

Current shared transition:

- `components/map/views/shared/MapPhaseTransitionView.jsx`
- mounted by `components/map/core/MapSheetOrchestrator.jsx`

Rule:

- phase changes should use a small opacity/translate transition so the user sees one persistent sheet changing state
- transitions should orient the user, not perform; keep durations short and easing Apple-like
- do not remount the whole map or replace the sheet shell to create a phase transition

## 3. Header chrome and close control rule

Map sheet and modal close controls now use one shared primitive:

- `components/map/views/shared/MapHeaderIconButton.jsx`

Contract:

- size: `38 x 38`
- icon size: `17` unless the icon itself needs optical compensation
- close buttons are full-round: `borderRadius: 999`
- search close, hospital list close, hospital detail close, service detail close, and modal close should all use this primitive
- the surface color should come from the same sheet/token family as the mid-snap hospital detail close control

Rule:

- do not add one-off close buttons in `/map` unless the shared primitive cannot express the state
- non-close icon tiles may be squircle/continuous; close buttons remain fully rounded

## 4. Focus and keyboard rule

Search focus is intentional state, not a side effect of every snap change.

Rules:

- opening the `search` phase directly into `expanded` may autofocus once
- expanding from `half` because the user focused the input may focus naturally
- collapsing from `expanded` to `half` must dismiss the keyboard
- returning from `expanded` to `half` should reset body scroll to top so the next half state shows the CTA/top content, not stale deep scroll
- do not autofocus when restoring `half`; the user must explicitly focus the input

## 5. Scroll, wheel, and gesture rule

Scroll detents must feel deliberate, not loose.

Rules:

- scroll/wheel detents use `mapMotionTokens`, including platform-specific cooldowns
- web wheel detents require a cooldown so one trackpad gesture does not cause multiple snaps
- Android uses explicit body gesture collapse only when the scroll body is at top
- upward expansion and downward collapse thresholds should feel balanced; do not make upward swipes easier than downward swipes by accident
- never allow expanded-to-half to accidentally close the phase

## 6. Hospital detail exception

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

## 7. Planned sheet-growth choreography refactor

Current problem:

- during drag, the shell can visually move the current half-height sheet upward before committing the expanded height
- this makes the sheet feel like a lifted card instead of a bottom-anchored surface growing upward
- the same issue appears in reverse when collapsing, where the sheet can look like it jumps before settling

Desired behavior:

- the sheet bottom remains anchored to the bottom safe area during normal snap changes
- dragging upward continuously increases sheet height from `half` toward `expanded`
- dragging downward continuously decreases sheet height from `expanded` toward `half`
- release velocity and distance choose the final detent
- the spring animates height to the chosen detent
- `translateY` is reserved for dismissal/offscreen motion, not ordinary half-to-expanded growth

Implementation plan:

1. Add a continuous `animatedSheetHeight` driver in `useMapSheetShell`.
2. Clamp live height between the active allowed detents.
3. Feed pan gesture translation into height instead of visually lifting the sheet.
4. On release, choose the next detent using the existing tokenized distance/velocity rules.
5. Spring `animatedSheetHeight` to the selected detent, then commit `snapState`.
6. Reuse the same height spring for scroll and wheel detent changes so iOS, Android, and web share one choreography path.
7. Keep phase content untouched during the first pass; only the shell growth model changes.

Guardrails:

- do not implement this phase-by-phase
- do not break Android body scroll handoff
- do not allow expanded-to-half to skip into collapsed/close
- verify `explore_intent` first before rolling confidence to `search`, `hospital_list`, `hospital_detail`, and `service_detail`

## 8. Preserve structure before abstracting

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

## 9. Selection-state lesson

For rail/card selection inside a sheet phase:

- selection that should survive snap-state changes belongs above the surface component
- `hospital_detail` card selection is currently owned at the stage layer, keyed by hospital id

Rule:

- surface components should render selection
- stage or flow state should own selection persistence

## 10. Gesture lesson

The current Android expanded-to-half fix works because gesture ownership is explicit:

- top-of-scroll is still tracked from the phase scroll view
- collapse is driven by a dedicated gesture-handler path mounted on the body region
- the gesture must run on JS via `.runOnJS(true)` for the current Expo/Reanimated setup
- the gesture child must be wrapped in a non-collapsable `View`

Rule:

- do not stack multiple competing responder systems when one explicit gesture path can own the behavior

## 11. Corner and Liquid Glass lesson

The map sheet family should share one corner/material language:

- non-full rounded rectangles use continuous corners through `borderCurve: "continuous"` or a local `squircle(radius)` helper
- true circles and full pills remain full-round and do not need the squircle helper
- `MapSheetShell`, `MapModalShell`, and `MapStageGlassPanel` are the preferred Liquid Glass owners
- phase internals should use tokenized translucent surfaces, not hard-coded opaque slabs
- primary red emergency CTAs stay solid when action hierarchy would be weakened by glass

Rule:

- if a new map surface introduces a rounded card, button, or sheet without continuous corners or a tokenized material decision, treat it as visual-system drift

## 12. Practical review checklist

Before closing any future map-sheet refactor:

- verify `collapsed`, `half`, and `expanded` on iOS
- verify `collapsed`, `half`, and `expanded` on Android
- verify drag-down from expanded to half on Android
- verify the `hospital_detail` hero/title/body overlap visually
- verify search input focus timing after expand
- verify collapsed/half close controls use the shared `38 x 38` full-round header icon primitive
- verify web wheel/trackpad detents do not double-trigger
- verify rail selection persists across snap-state changes when expected

If any refactor improves code reuse but weakens the visible sheet contract, revert the structural change first and redesign the abstraction boundary second.
