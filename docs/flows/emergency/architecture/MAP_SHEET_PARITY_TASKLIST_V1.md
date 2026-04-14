# Map Sheet Parity Tasklist (v1)

> Status: Active implementation backlog
> Scope: `/map`
> Reference baseline: `explore_intent`
> Purpose: compare all current sheet phases against the most mature sheet behavior, then convert the gaps into explicit execution tasks

Related references:

- [MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)
- [../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)

## 0. Baseline

The baseline behavior is still `explore_intent`.

Why:

- it has the cleanest resting shell
- it has the strongest `collapsed -> half -> expanded` mental model
- it already carries the most coherent glass/material rhythm
- its expanded hospital rail uses width and edge treatment better than the newer detail rails

Every newer sheet phase should be compared against that contract before new polish work is added.

## 1. Phase Matrix

## `explore_intent`

Current strengths:

- mature collapsed resting island
- stable top row rhythm
- strongest scroll-driven detent model
- good contained-vs-full-bleed decisions in expanded state
- clean expanded hospital rail width usage
- pulse attention now stops after selection or expanded context

Current gaps:

- growth choreography between half and expanded can still be more continuous
- liquid-glass material is stronger here than in sibling phases, which exposes drift

## `search`

Current strengths:

- now uses the shared sheet shell
- now shares one body-scroll implementation with sibling phases
- collapsed search row exists
- top controls are persistent
- search autofocus is now one-time on direct expanded open, not every snap restoration
- expanded-to-half collapse dismisses the keyboard

Current gaps:

- still behaves more like a search surface placed in a sheet than a natural sibling of `explore_intent`
- top row rhythm is closer now, but still not fully identical in feel
- content sections still read heavier and denser than the baseline half-sheet rhythm
- wide-screen modal/sidebar presentation needs live verification after the new shared layout pass

## `hospital_list`

Current strengths:

- persistent close control
- no modal sibling leak
- stage now shares more of the same shell contract
- now shares one body-scroll implementation with sibling phases
- close button uses the shared map header icon primitive

Current gaps:

- `half -> expanded -> half` behavior now shares more logic but still needs product verification against `explore_intent`
- left panel / sidebar posture is still visually unstable for the newer states
- header/body proportions feel more list-like than system-like
- Android drag-collapse has shared gesture plumbing, but still needs device verification

## `hospital_detail`

Current strengths:

- collapsed summary row exists
- half and expanded states exist inside the persistent shell
- top title fallback exists
- endless hospital cycling exists
- hero swipe exists in expanded state
- selection state is owned above the body surface
- stage now shares one body-scroll implementation with sibling phases
- Android expanded-body drag collapse now uses shared motion tokens
- half-state title fallback and close/cycle controls use the shared header icon primitive

Current gaps:

- half-to-expanded growth still has a structural visual constraint
- sticky header reveal timing still needs product verification
- hospital rail cards are visually noisier than the main CTA in half state
- ambulance and room rail cards clip before reaching a clean right-edge finish
- ambulance imagery on web is still unreliable
- expanded and half glass treatment still drift from the `explore_intent` material feel
- expanded hero/title/body composition must not be flattened during future refactors

## 2. Cross-Phase Gap List

## PSG-01 Shared detent behavior is still not proven parity-complete

Observed:

- `explore_intent` remains the only phase users consistently trust for detent behavior
- Android drag-down from `expanded` to `half` now has a shared gesture-handler path in newer phases
- newer phases still need platform verification, not just code reuse

Acceptance:

- `search`, `hospital_list`, and `hospital_detail` all support the same expected downward and upward transitions as allowed by their phase rules
- Android native behavior matches iOS/web expectations for permitted detents
- web wheel/trackpad gestures do not double-trigger snap changes

## PSG-02 Wide-screen left panel states are unstable

Observed:

- new sheet states do not yet read as one disciplined sidebar family on wider screens
- left panel posture is reported as being in disarray for the newer phases

Acceptance:

- `search`, `hospital_list`, and `hospital_detail` all obey the same left panel geometry, max-height, and internal-scroll rules
- state changes do not break the island shape or overflow the viewport

## PSG-03 Hospital detail rails fail the current UI standard

Observed:

- rails clip before they visually complete toward the right edge
- ambulance imagery is not dependable on web
- rail cards compete too strongly with the primary arrival CTA in half state
- compact rail hierarchy is still too loud by default

Acceptance:

- rail viewport uses full available width cleanly, like the expanded `explore_intent` hospital rail
- cards do not appear prematurely clipped
- web image rendering is deterministic
- default half-state rail appearance is secondary until selected

## PSG-04 Hospital detail CTA/rail hierarchy needs stronger selection logic

Observed:

- `7 min` should remain the obvious primary action
- ambulance rail cards should start more subdued
- the top pill copy and tone should clearly distinguish ready-state transport options from ordinary preview cards

Acceptance:

- unselected ambulance cards read as quiet preview options
- selected cards elevate clearly
- `Ready` pill uses muted iVisit red treatment that differentiates it from the primary CTA without overpowering it

## PSG-05 Material language still drifts by phase

Observed:

- `explore_intent` still feels like the most coherent glass implementation
- `search`, `hospital_list`, and `hospital_detail` are closer now but still not one family
- close buttons now have one shared primitive, reducing header chrome drift

Acceptance:

- top controls, close buttons, search pills, and interior surfaces all feel cut from the same glass/material system
- platform differences remain implementation details, not visible design drift

## PSG-06 Motion language needs final device verification

Observed:

- phase transitions now use a shared fade/translate wrapper
- snap springs and Android body gesture thresholds are tokenized
- looping pulse motion is reduced after selection/expanded state
- current drag feedback can still lift a fixed-height sheet before the final detent height commits

Acceptance:

- phase changes feel continuous without looking like route changes
- Android pull-down collapse feels deliberate, not loose
- iOS/web scroll-detents remain steady and do not collapse too far
- half-to-expanded and expanded-to-half growth stays bottom-anchored instead of visually jumping
- no animated feedback runs after it has stopped serving user intent

## 3. Immediate Task Backlog

## Task A. Sheet-state comparison pass

Goal:

- verify actual behavior for each phase/state/platform combination instead of relying on memory

Checklist:

- compare `collapsed`, `half`, `expanded` for:
  - `explore_intent`
  - `search`
  - `hospital_list`
  - `hospital_detail`
- verify:
  - drag up behavior
  - drag down behavior
  - scroll-down collapse behavior
  - wheel behavior on web
  - sidebar behavior on wide screens

Deliverable:

- a pass/fail matrix attached to this tasklist or tracker

## Task B. Verify Android expanded-to-half collapse after shared wrapper pass

Goal:

- keep parity stable after the shared wrapper and stage-parts refactor

Acceptance:

- dragging down in Android from hospital detail `expanded` reliably lands in `half`
- no accidental phase close
- no gesture dead zone
- search, hospital list, hospital detail, and service detail all use the shared body gesture path where applicable

Status:

- Implementation path added; still requires Android device verification.

## Task C. Repair hospital detail rail viewport layout

Goal:

- stop the detail rails from looking clipped and underusing horizontal space

Acceptance:

- cards visually travel to a proper right-edge finish
- horizontal padding and trailing affordance match the cleaner `explore_intent` rail behavior
- no premature clip at the viewport edge

## Task D. Fix ambulance media rendering on web

Goal:

- make ambulance images stable and intentional on RN web

Acceptance:

- ambulance cards render on web consistently
- image fit and centering rules are explicit and documented
- no dependence on fragile side effects

## Task E. Finalize half-state hospital detail hierarchy

Goal:

- make the half-state clearly prioritize the arrival CTA over the rails

Acceptance:

- CTA row remains first in hierarchy
- ambulance and room rails start visually muted
- `Ready` pill uses muted red styling
- only selected cards elevate into second hierarchy

## Task F. Normalize wide-screen left panel behavior for all new phases

Goal:

- make new phases obey the same island discipline as the baseline

Acceptance:

- `search`, `hospital_list`, and `hospital_detail` remain stable in sidebar/floating modal postures
- no Y-axis overflow
- no shape breakage during state changes

## Task G. Final glass/material parity pass

Goal:

- finish the material system only after behavioral parity is stable

Acceptance:

- all top controls, shell surfaces, and internal cards feel like the same family
- `explore_intent` is no longer visibly ahead of the other phases

## Task H. Verify shared motion and header chrome pass

Goal:

- confirm recent shared primitives hold across all `/map` phases

Acceptance:

- `MapHeaderIconButton` is used for search, hospital list, hospital detail, service detail, and modal close controls
- close buttons render as full-round `38 x 38` controls
- `MapPhaseTransitionView` wraps phase-level orchestration
- `mapMotionTokens` owns gesture sensitivity and wheel cooldowns
- search keyboard behavior follows the focus rule

## Task I. Refactor sheet snap choreography to bottom-anchored height growth

Goal:

- replace lifted-card drag feedback with continuous bottom-anchored sheet growth

Acceptance:

- dragging from `half` to `expanded` visibly grows sheet height upward while the bottom stays planted
- dragging from `expanded` to `half` visibly shrinks sheet height downward while the bottom stays planted
- release springs to the chosen detent using the shared motion tokens
- `translateY` is reserved for dismiss/offscreen movement, not ordinary detent growth
- scroll, wheel, and Android pan detents all feed the same shell-level height animation path
- phase internals do not need custom snap choreography

Status:

- First-pass shell-level implementation added through `useMapSheetShell` and `mapSheetShell.gestures.js`.
- Still requires device verification across iOS, Android, web wheel/trackpad, and wide-screen presentations.

## 4. Recommended Execution Order

Use this order:

1. Task A. Sheet-state comparison pass
2. Task B. Android hospital-detail expanded-to-half collapse
3. Task C. Hospital detail rail viewport layout
4. Task D. Ambulance media rendering on web
5. Task E. Half-state hospital detail hierarchy and `Ready` pill treatment
6. Task F. Wide-screen left panel parity
7. Task G. Final glass/material parity pass
8. Task H. Shared motion and header chrome verification
9. Task I. Bottom-anchored sheet-growth choreography refactor

Reason:

- behavior failures should be fixed before visual polish
- viewport and media failures should be fixed before final material tuning
- wide-screen parity should be verified after state behavior is stable
- hospital detail visual structure should be preserved while refactoring, not simplified first and repaired later

## 5. Working Rule

Before marking any task done:

- verify on iOS
- verify on Android
- verify on web
- verify on at least one wider-screen presentation

Code reuse alone is not proof of parity.
