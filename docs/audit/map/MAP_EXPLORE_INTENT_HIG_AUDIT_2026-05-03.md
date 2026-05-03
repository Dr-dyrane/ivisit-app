# Map Explore Intent — Apple HIG Audit — 2026-05-03

**Scope**: `/map` explore intent phase — interaction, motion, progression feedback, accessibility
**Status**: AUDIT COMPLETE — Pass A in progress
**Standard**: Apple Human Interface Guidelines (interaction, motion, haptics, accessibility)
**Guardrails ref**: `docs/REFACTORING_GUARDRAILS.md` #1 Subsequent Pass Rule

---

## 1. Architecture

### Entry Points
| File | Responsibility |
|---|---|
| `components/map/views/exploreIntent/MapExploreIntentStageBase.jsx` | Sheet shell, pulse loop, scroll detents |
| `components/map/views/exploreIntent/MapExploreIntentStageParts.jsx` | TopRow, footer terms, screen section builder |
| `components/map/views/exploreIntent/MapExploreIntentCareSection.jsx` | `CareIntentOrb` + `CareIntentCard` — primary care selection surface |
| `components/map/views/exploreIntent/MapExploreIntentHospitalSummaryCard.jsx` | Hospital card tap → hospital list |
| `components/map/views/exploreIntent/MapExploreIntentProfileTrigger.jsx` | Avatar → profile modal |

### Animation Layers (Pre-Audit)
| Layer | Driver | Files |
|---|---|---|
| Pulse loop | `Animated.loop` `MAP_CARE_PULSE_MS` ease in-out | `MapExploreIntentStageBase.jsx:171-193` |
| Card pulse (primary) | `pulseProgress` interpolations — scale, translateY, rotateX, sheen, glow, floor | `MapExploreIntentCareSection.jsx:159-263` |
| Icon pulse | `pulseProgress` interpolations — scale, translateY, aura opacity | `MapExploreIntentCareSection.jsx:236-263` |
| Orb pulse (primary) | `pulseProgress` scale 1→1.03 | `MapExploreIntentCareSection.jsx:33-38` |
| Press feedback | Static opacity delta on `Pressable` pressed state | `CareIntentOrb:74`, `CareIntentCard:279` |
| Profile trigger press | `scale(0.96)` | `MapExploreIntentProfileTrigger.jsx:31` |

---

## 2. Identified Defects

### 🔴 Critical — Interaction Feedback

#### E-2.1 No haptic on care selection (primary CTA)
**Files**: `MapExploreIntentCareSection.jsx` — `CareIntentOrb:68`, `CareIntentCard:275`
**Current**: `Pressable` `onPress` fires `onChooseCare` with no `Haptics` call.
**HIG violation**: *"Use haptics to reinforce the result of an action, especially for critical or destructive actions."* Care selection (ambulance, bed space) is the highest-stakes decision on this surface.
**Fix**: Add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)` on `onPressIn` for both `CareIntentOrb` and `CareIntentCard`.

#### E-2.2 No haptic on hospital card tap
**File**: `MapExploreIntentHospitalSummaryCard.jsx` — all 3 layout `Pressable`s (canonical, hero, web-mobile)
**Current**: `onOpenHospitals` fires with no haptic.
**Fix**: Add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` on `onPressIn`.

#### E-2.3 No haptic on search pill tap
**File**: `MapExploreIntentStageParts.jsx` — `MapExploreIntentTopRow` search `Pressable:44`
**Current**: `onOpenSearch` fires with no haptic.
**Fix**: Add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on `onPressIn`.

#### E-2.4 No haptic on profile trigger
**File**: `MapExploreIntentProfileTrigger.jsx:18`
**Current**: `Pressable` has scale animation but no haptic.
**Fix**: Add `Haptics.selectionAsync()` on `onPressIn`.

#### E-2.5 No `hitSlop` on care orbs
**File**: `MapExploreIntentCareSection.jsx` — `CareIntentOrb:68`
**Current**: `Pressable` has `paddingVertical: 2, paddingHorizontal: 1` — effective touch target undersized on compact phones.
**Fix**: Add `hitSlop={8}` to `CareIntentOrb` `Pressable`.

---

### 🟡 High — Motion & Animation

#### E-2.6 Pulse loop ignores `reduceMotion` preference
**File**: `MapExploreIntentStageBase.jsx:164-193`
**Current**: `pulseLoop` starts unconditionally. All card/orb pulse animations (sheen sweep, glow scale, rotateX tilt, floor expansion) play regardless of system Reduce Motion setting.
**HIG violation**: *"Respect the user's preference for reduced motion."*
**Fix**: Gate loop behind `const reduceMotion = useReducedMotion()` (pattern: `MapTrackingStageBase.jsx:3`). When `reduceMotion`, skip loop start and hold `pulseProgress` at 0.

#### E-2.7 Sheet content entrance has no stagger
**Current**: Hospital card, care section, and search TopRow appear simultaneously as sheet rises.
**HIG violation**: *"Introduce content in stages to help people understand hierarchy."*
**Fix**: Stagger reveal — TopRow at 0ms, hospital card at 80ms, care section at 160ms.

#### E-2.8 Care selection has no spring confirmation micro-animation
**File**: `MapExploreIntentCareSection.jsx:85, 291`
**Current**: `isSelected` flips → card snaps statically to `scale(1.01)`. No spring, no pop.
**Fix**: Drive the selected state scale through a short spring `Animated.spring` (stiffness ~320, damping ~22) to give tactile confirmation. Pattern matches `EntryActionButton` press spring intent.

---

### 🟡 High — Progression

#### E-2.9 Hospital loading skeleton has no timeout or fallback
**File**: `MapExploreIntentHospitalSummaryCard.jsx:64-89` (`SummaryLoadingCopy`)
**Current**: Skeleton renders indefinitely when `!nearestHospital?.name`. If location permission is denied or data never arrives, user sees a permanent loading state with no recovery copy.
**Fix**: After ~6s, replace skeleton with neutral fallback: `"Tap to find nearby hospitals"`.

#### E-2.10 Care orbs show full opacity before network data is ready
**Current**: Care orbs/cards render at full opacity with subtext like "3 nearby" even when `nearbyHospitalCount === 0`. Tapping ambulance with no nearby hospitals drops user into an empty list.
**Fix**: Apply `opacity: 0.54` to secondary/tertiary orbs when `nearbyHospitalCount === 0 && totalAvailableBeds === 0` (data still loading). Primary orb retains full opacity — it remains tappable to show loading state in the list.

---

### 🟢 Medium — Accessibility

#### E-2.11 Care orbs/cards have no `accessibilityLabel`
**File**: `MapExploreIntentCareSection.jsx` — `CareIntentOrb:68`, `CareIntentCard:275`
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

## 3. What's Already Correct ✅

| Element | Evidence |
|---|---|
| `borderCurve: "continuous"` on all cards | Throughout CareSection + HospitalSummaryCard |
| Pulse loop gated on `selectedCare` and `isExpanded` | `StageBase.jsx:165` — stops cleanly on selection |
| Press opacity feedback | `CareIntentOrb:75`, `CareIntentCard:279` |
| `isSelected` visual state — scale bump + check badge | `CareIntentCard:392` `Ionicons checkmark`, scale `1.01` |
| Shadow hierarchy — primary > secondary > tertiary | Fully respected across both card types |
| Profile trigger press scale | `MapExploreIntentProfileTrigger.jsx:31` — `scale(0.96)` |
| `pulseProgress` shared single ref, not per-component | `StageBase.jsx:49` — single `Animated.Value` threaded down |
| Pulse stops on `isExpanded` | Avoids animation during expanded list browsing |
| `useNativeDriver: true` on all pulse interpolations | All `Animated.timing` calls in pulse loop |
| `accessibilityRole="button"` | `MapTopLeftControl.jsx` (left control) |

---

## 4. Four-Track Pass Framing

> Required per `REFACTORING_GUARDRAILS.md` #1 Subsequent Pass Rule. Each pass must declare scope across all four tracks. If a track is out of scope, that must be stated explicitly.

| Track | Pass A | Pass B | Pass C | Pass D |
|---|---|---|---|---|
| **State management** | Out of scope — no layer changes | Out of scope | Out of scope | Out of scope |
| **UI quality** | Haptics + `hitSlop` on all interactive surfaces | Motion discipline — `reduceMotion` gate + selection spring | Progression — skeleton timeout + data-readiness dimming | Accessibility labels + live regions |
| **DRY / modular code shape** | No new duplication introduced — haptic calls follow `EntryActionButton` pattern | No structural changes | `SummaryLoadingCopy` gains timeout logic inline | Accessibility props added inline — no extraction needed |
| **Documentation** | Pre/post log updated in this file | Pre/post log updated | Pre/post log updated | Pre/post log updated |

---

## 5. Pass Log

### Pass A — Haptics

**Pre-pass intent**: Add haptic feedback to all interactive surfaces. Zero state or structural changes.

**Invariants**:
- No new imports beyond `expo-haptics`
- No logic moved, no props changed
- All `Haptics` calls on `onPressIn` (not `onPress`) — fires before gesture resolution
- `Heavy` for primary care selection, `Medium` for hospital card, `Light` for search, `selectionAsync` for profile

**Status**: ⏳ Pending implementation

| File | Change | Defect fixed |
|---|---|---|
| `MapExploreIntentCareSection.jsx` | `Heavy` on `CareIntentOrb` + `CareIntentCard` `onPressIn` | E-2.1 |
| `MapExploreIntentHospitalSummaryCard.jsx` | `Medium` on all 3 layout `Pressable`s `onPressIn` | E-2.2 |
| `MapExploreIntentStageParts.jsx` | `Light` on search pill `onPressIn` | E-2.3 |
| `MapExploreIntentProfileTrigger.jsx` | `selectionAsync` on `onPressIn` | E-2.4 |
| `MapExploreIntentCareSection.jsx` | `hitSlop={8}` on `CareIntentOrb` | E-2.5 |

**Post-pass verification**: _(to be filled after implementation)_
- [ ] Haptic fires on real iOS device for each surface
- [ ] No haptic on web (`expo-haptics` no-ops silently on web — acceptable)
- [ ] No regression on press visual feedback
- [ ] No new files created, no structural changes

---

### Pass B — Motion Discipline
**Status**: ⏳ Pending

---

### Pass C — Progression
**Status**: ⏳ Pending

---

### Pass D — Accessibility
**Status**: ⏳ Pending

---

## 6. Pass Plan

### Pass A — Haptics ✅ IN PROGRESS
1. `CareIntentOrb` → `Heavy` impact on `onPressIn`
2. `CareIntentCard` → `Heavy` impact on `onPressIn`
3. `MapExploreIntentHospitalSummaryCard` (all 3 layouts) → `Medium` impact on `onPressIn`
4. `MapExploreIntentTopRow` search pill → `Light` impact on `onPressIn`
5. `MapExploreIntentProfileTrigger` → `selectionAsync` on `onPressIn`
6. Add `hitSlop={8}` to `CareIntentOrb`

### Pass B — Motion Discipline
7. Gate `pulseLoop` behind `useReducedMotion()` in `MapExploreIntentStageBase`
8. Add spring micro-animation on `isSelected` in `CareIntentCard` + `CareIntentOrb`

### Pass C — Progression
9. Add 6s timeout fallback in `SummaryLoadingCopy`
10. Dim secondary/tertiary care orbs when network data not yet ready

### Pass D — Accessibility
11. `accessibilityLabel` + `accessibilityHint` on all care `Pressable`s
12. `accessibilityLabel` on hospital card (derived from content)
13. `accessibilityLiveRegion="polite"` on care section container

---

## 7. Reference

- Apple HIG: [Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- Apple HIG: [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- Apple HIG: [Accessibility — Motion](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Existing pattern: `MapTrackingStageBase.jsx` — `useReducedMotion` usage
- Existing pattern: `EntryActionButton.jsx:46` — `Heavy` impact on primary CTA `onPressIn`
- Existing pattern: `MapTopLeftControl.jsx:37` — `Haptics.selectionAsync()` on map controls
