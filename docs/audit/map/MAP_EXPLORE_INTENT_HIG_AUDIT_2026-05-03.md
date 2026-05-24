---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Map Explore Intent â€” Apple HIG Audit â€” 2026-05-03

**Scope**: `/map` explore intent phase â€” interaction, motion, progression feedback, accessibility
**Status**: AUDIT COMPLETE â€” All passes DONE, pending device verification
**Standard**: Apple Human Interface Guidelines (interaction, motion, haptics, accessibility)
**Guardrails ref**: `docs/REFACTORING_GUARDRAILS.md` #1 Subsequent Pass Rule

---

## 1. Architecture

### Entry Points
| File | Responsibility |
|---|---|
| `components/map/views/exploreIntent/MapExploreIntentStageBase.jsx` | Sheet shell, pulse loop, scroll detents |
| `components/map/views/exploreIntent/MapExploreIntentStageParts.jsx` | TopRow, footer terms, screen section builder |
| `components/map/views/exploreIntent/MapExploreIntentCareSection.jsx` | `CareIntentOrb` + `CareIntentCard` â€” primary care selection surface |
| `components/map/views/exploreIntent/MapExploreIntentHospitalSummaryCard.jsx` | Hospital card tap â†’ hospital list |
| `components/map/views/exploreIntent/MapExploreIntentProfileTrigger.jsx` | Avatar â†’ profile modal |

### Animation Layers (Pre-Audit)
| Layer | Driver | Files |
|---|---|---|
| Pulse loop | `Animated.loop` `MAP_CARE_PULSE_MS` ease in-out | `MapExploreIntentStageBase.jsx:171-193` |
| Card pulse (primary) | `pulseProgress` interpolations â€” scale, translateY, rotateX, sheen, glow, floor | `MapExploreIntentCareSection.jsx:159-263` |
| Icon pulse | `pulseProgress` interpolations â€” scale, translateY, aura opacity | `MapExploreIntentCareSection.jsx:236-263` |
| Orb pulse (primary) | `pulseProgress` scale 1â†’1.03 | `MapExploreIntentCareSection.jsx:33-38` |
| Press feedback | Static opacity delta on `Pressable` pressed state | `CareIntentOrb:74`, `CareIntentCard:279` |
| Profile trigger press | `scale(0.96)` | `MapExploreIntentProfileTrigger.jsx:31` |

---

## 2. Identified Defects

### ðŸ”´ Critical â€” Interaction Feedback

#### E-2.1 No haptic on care selection (primary CTA)
**Files**: `MapExploreIntentCareSection.jsx` â€” `CareIntentOrb:68`, `CareIntentCard:275`
**Current**: `Pressable` `onPress` fires `onChooseCare` with no `Haptics` call.
**HIG violation**: *"Use haptics to reinforce the result of an action, especially for critical or destructive actions."* Care selection (ambulance, bed space) is the highest-stakes decision on this surface.
**Fix**: Add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)` on `onPressIn` for both `CareIntentOrb` and `CareIntentCard`.

#### E-2.2 No haptic on hospital card tap
**File**: `MapExploreIntentHospitalSummaryCard.jsx` â€” all 3 layout `Pressable`s (canonical, hero, web-mobile)
**Current**: `onOpenHospitals` fires with no haptic.
**Fix**: Add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` on `onPressIn`.

#### E-2.3 No haptic on search pill tap
**File**: `MapExploreIntentStageParts.jsx` â€” `MapExploreIntentTopRow` search `Pressable:44`
**Current**: `onOpenSearch` fires with no haptic.
**Fix**: Add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on `onPressIn`.

#### E-2.4 No haptic on profile trigger
**File**: `MapExploreIntentProfileTrigger.jsx:18`
**Current**: `Pressable` has scale animation but no haptic.
**Fix**: Add `Haptics.selectionAsync()` on `onPressIn`.

#### E-2.5 No `hitSlop` on care orbs
**File**: `MapExploreIntentCareSection.jsx` â€” `CareIntentOrb:68`
**Current**: `Pressable` has `paddingVertical: 2, paddingHorizontal: 1` â€” effective touch target undersized on compact phones.
**Fix**: Add `hitSlop={8}` to `CareIntentOrb` `Pressable`.

---

### ðŸŸ¡ High â€” Motion & Animation

#### E-2.6 Pulse loop ignores `reduceMotion` preference
**File**: `MapExploreIntentStageBase.jsx:164-193`
**Current**: `pulseLoop` starts unconditionally. All card/orb pulse animations (sheen sweep, glow scale, rotateX tilt, floor expansion) play regardless of system Reduce Motion setting.
**HIG violation**: *"Respect the user's preference for reduced motion."*
**Fix**: Gate loop behind `const reduceMotion = useReducedMotion()` (pattern: `MapTrackingStageBase.jsx:3`). When `reduceMotion`, skip loop start and hold `pulseProgress` at 0.

#### E-2.7 Sheet content entrance has no stagger
**Current**: Hospital card, care section, and search TopRow appear simultaneously as sheet rises.
**HIG violation**: *"Introduce content in stages to help people understand hierarchy."*
**Fix**: Stagger reveal â€” TopRow at 0ms, hospital card at 80ms, care section at 160ms.

#### E-2.8 Care selection has no spring confirmation micro-animation
**File**: `MapExploreIntentCareSection.jsx:85, 291`
**Current**: `isSelected` flips â†’ card snaps statically to `scale(1.01)`. No spring, no pop.
**Fix**: Drive the selected state scale through a short spring `Animated.spring` (stiffness ~320, damping ~22) to give tactile confirmation. Pattern matches `EntryActionButton` press spring intent.

---

### ðŸŸ¡ High â€” Progression

#### E-2.9 Hospital loading skeleton has no timeout or fallback
**File**: `MapExploreIntentHospitalSummaryCard.jsx:64-89` (`SummaryLoadingCopy`)
**Current**: Skeleton renders indefinitely when `!nearestHospital?.name`. If location permission is denied or data never arrives, user sees a permanent loading state with no recovery copy.
**Fix**: After ~6s, replace skeleton with neutral fallback: `"Tap to find nearby hospitals"`.

#### E-2.10 Care orbs show full opacity before network data is ready
**Current**: Care orbs/cards render at full opacity with subtext like "3 nearby" even when `nearbyHospitalCount === 0`. Tapping ambulance with no nearby hospitals drops user into an empty list.
**Fix**: Apply `opacity: 0.54` to secondary/tertiary orbs when `nearbyHospitalCount === 0 && totalAvailableBeds === 0` (data still loading). Primary orb retains full opacity â€” it remains tappable to show loading state in the list.

---

### ðŸŸ¢ Medium â€” Accessibility

#### E-2.11 Care orbs/cards have no `accessibilityLabel`
**File**: `MapExploreIntentCareSection.jsx` â€” `CareIntentOrb:68`, `CareIntentCard:275`
**Current**: `Pressable` has no `accessibilityLabel` or `accessibilityHint`. VoiceOver reads nothing useful.
**Fix**: Pass computed label: `"Request ambulance"`, `"Book bed space"`, `"Compare care options"`. Add hint: `"${subtext}"`.

#### E-2.12 Hospital card has no `accessibilityLabel`
**File**: `MapExploreIntentHospitalSummaryCard.jsx`
**Current**: `Pressable` `onOpenHospitals` has no `accessibilityLabel`.
**Fix**: Derive from content: `"${nearestHospital?.name || 'Nearest hospital'}, ${nearestHospitalMeta.join(', ')}"`.

#### E-2.13 No `accessibilityLiveRegion` on care selection change
**Current**: When `isSelected` changes, VoiceOver won't announce the confirmation.
**Fix**: Add `accessibilityLiveRegion="polite"` on the care row/grid container.

---

## 3. What's Already Correct âœ…

| Element | Evidence |
|---|---|
| `borderCurve: "continuous"` on all cards | Throughout CareSection + HospitalSummaryCard |
| Pulse loop gated on `selectedCare` and `isExpanded` | `StageBase.jsx:165` â€” stops cleanly on selection |
| Press opacity feedback | `CareIntentOrb:75`, `CareIntentCard:279` |
| `isSelected` visual state â€” scale bump + check badge | `CareIntentCard:392` `Ionicons checkmark`, scale `1.01` |
| Shadow hierarchy â€” primary > secondary > tertiary | Fully respected across both card types |
| Profile trigger press scale | `MapExploreIntentProfileTrigger.jsx:31` â€” `scale(0.96)` |
| `pulseProgress` shared single ref, not per-component | `StageBase.jsx:49` â€” single `Animated.Value` threaded down |
| Pulse stops on `isExpanded` | Avoids animation during expanded list browsing |
| `useNativeDriver: true` on all pulse interpolations | All `Animated.timing` calls in pulse loop |
| `accessibilityRole="button"` | `MapTopLeftControl.jsx` (left control) |

---

## 4. Four-Track Pass Framing

> Required per `REFACTORING_GUARDRAILS.md` #1 Subsequent Pass Rule. Each pass must declare scope across all four tracks. If a track is out of scope, that must be stated explicitly.

| Track | Pass A | Pass B | Pass C | Pass D |
|---|---|---|---|---|
| **State management** | Out of scope â€” no layer changes | Out of scope | Out of scope | Out of scope |
| **UI quality** | Haptics + `hitSlop` on all interactive surfaces | Motion discipline â€” `reduceMotion` gate + selection spring | Progression â€” skeleton timeout + data-readiness dimming | Accessibility labels + live regions |
| **DRY / modular code shape** | No new duplication introduced â€” haptic calls follow `EntryActionButton` pattern | No structural changes | `SummaryLoadingCopy` gains timeout logic inline | Accessibility props added inline â€” no extraction needed |
| **Documentation** | Pre/post log updated in this file | Pre/post log updated | Pre/post log updated | Pre/post log updated |

---

## 5. Pass Log

### Pass A â€” Haptics

**Pre-pass intent**: Add haptic feedback to all interactive surfaces. Zero state or structural changes.

**Invariants**:
- No new imports beyond `expo-haptics`
- No logic moved, no props changed
- All `Haptics` calls on `onPressIn` (not `onPress`) â€” fires before gesture resolution
- `Heavy` for primary care selection, `Medium` for hospital card, `Light` for search, `selectionAsync` for profile

**Status**: DONE

| File | Change | Defect fixed |
|---|---|---|
| `MapExploreIntentCareSection.jsx` | `Heavy` on `CareIntentOrb` + `CareIntentCard` `onPressIn`; `hitSlop={8}` on orb | E-2.1, E-2.5 |
| `MapExploreIntentHospitalSummaryCard.jsx` | `Medium` on all 3 layout `Pressable`s `onPressIn` | E-2.2 |
| `MapExploreIntentStageParts.jsx` | `Light` on search pill `onPressIn` | E-2.3 |
| `MapExploreIntentProfileTrigger.jsx` | `selectionAsync` on `onPressIn` | E-2.4 |

**Post-pass verification**:
- [ ] Haptic fires on real iOS device for each surface
- [ ] No haptic on web (`expo-haptics` no-ops silently on web â€” acceptable)
- [ ] No regression on press visual feedback
- [ ] No new files created, no structural changes

---

### Pass B â€” Motion Discipline

**Pre-pass intent**: Gate pulse loop behind `reduceMotion`; spring-drive `isSelected` scale in both care components.

**Status**: DONE

| File | Change | Defect fixed |
|---|---|---|
| `MapExploreIntentStageBase.jsx` | `useReducedMotion()` import + gate on `reduceMotion` in pulse loop effect + dep array | E-2.6 |
| `MapExploreIntentCareSection.jsx` | `selectionScaleAnim` `Animated.spring` in `CareIntentOrb` | E-2.8 |
| `MapExploreIntentCareSection.jsx` | `cardSelectionScaleAnim` `Animated.spring` in `CareIntentCard` | E-2.8 |

**Post-pass verification**:
- [ ] With Reduce Motion ON: pulse loop stays at 0, care orbs static
- [ ] With Reduce Motion OFF: pulse loop runs normally
- [ ] Care selection animates with spring pop, not static jump

---

### Pass C â€” Progression

**Pre-pass intent**: Add skeleton timeout fallback; dim secondary/tertiary orbs when no network data.

**Status**: DONE

| File | Change | Defect fixed |
|---|---|---|
| `MapExploreIntentHospitalSummaryCard.jsx` | `SummaryLoadingCopy` â€” 6s `setTimeout` â†’ fallback neutral copy | E-2.9 |
| `MapExploreIntentCareSection.jsx` | `isNetworkDataReady` + `notReadyStyle` applied to secondary/tertiary orbs in canonical layout | E-2.10 |

**Post-pass verification**:
- [ ] With no location/network: after 6s skeleton replaces with fallback copy
- [ ] With counts = 0: bed and compare orbs appear dimmed
- [ ] Once counts resolve: orbs return to full hierarchy opacity

---

### Pass D â€” Accessibility

**Pre-pass intent**: Add `accessibilityLabel`, `accessibilityHint`, and `accessibilityLiveRegion` to all care surfaces and hospital card.

**Status**: DONE

| File | Change | Defect fixed |
|---|---|---|
| `MapExploreIntentCareSection.jsx` | `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` on `CareIntentOrb` | E-2.11 |
| `MapExploreIntentCareSection.jsx` | `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` on `CareIntentCard` | E-2.11 |
| `MapExploreIntentCareSection.jsx` | `accessibilityLiveRegion="polite"` on canonical care row `View` | E-2.13 |
| `MapExploreIntentHospitalSummaryCard.jsx` | `accessibilityRole`, `accessibilityLabel` (derived from `nearestHospital.name` + meta) on all 3 layouts | E-2.12 |

**Post-pass verification**:
- [ ] VoiceOver reads care orb label + subtext as hint
- [ ] VoiceOver reads hospital name + distance on card
- [ ] VoiceOver announces selection change via liveRegion

---

## 6. Pass Plan

### Pass A â€” Haptics âœ… DONE
1. `CareIntentOrb` â†’ `Heavy` impact on `onPressIn`
2. `CareIntentCard` â†’ `Heavy` impact on `onPressIn`
3. `MapExploreIntentHospitalSummaryCard` (all 3 layouts) â†’ `Medium` impact on `onPressIn`
4. `MapExploreIntentTopRow` search pill â†’ `Light` impact on `onPressIn`
5. `MapExploreIntentProfileTrigger` â†’ `selectionAsync` on `onPressIn`
6. Add `hitSlop={8}` to `CareIntentOrb`

### Pass B â€” Motion Discipline
7. Gate `pulseLoop` behind `useReducedMotion()` in `MapExploreIntentStageBase`
8. Add spring micro-animation on `isSelected` in `CareIntentCard` + `CareIntentOrb`

### Pass C â€” Progression
9. Add 6s timeout fallback in `SummaryLoadingCopy`
10. Dim secondary/tertiary care orbs when network data not yet ready

### Pass D â€” Accessibility
11. `accessibilityLabel` + `accessibilityHint` on all care `Pressable`s
12. `accessibilityLabel` on hospital card (derived from content)
13. `accessibilityLiveRegion="polite"` on care section container

---

## 7. Reference

- Apple HIG: [Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- Apple HIG: [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- Apple HIG: [Accessibility â€” Motion](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Existing pattern: `MapTrackingStageBase.jsx` â€” `useReducedMotion` usage
- Existing pattern: `EntryActionButton.jsx:46` â€” `Heavy` impact on primary CTA `onPressIn`
- Existing pattern: `MapTopLeftControl.jsx:37` â€” `Haptics.selectionAsync()` on map controls
