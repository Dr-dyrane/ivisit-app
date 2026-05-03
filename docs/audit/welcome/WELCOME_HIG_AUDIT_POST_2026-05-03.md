# Welcome Screen Apple HIG Audit — Post-Pass Record

**Date**: 2026-05-03  
**Status**: COMPLETE  
**Pre-pass doc**: [`WELCOME_SCREEN_HIG_AUDIT_2026-05-02.md`](./WELCOME_SCREEN_HIG_AUDIT_2026-05-02.md)  
**Scope**: `WelcomeScreen.jsx`, `WelcomeStageBase.jsx`, `WelcomeWideWebView.jsx`, `EntryActionButton.jsx`

---

## Four-Track Review (per Subsequent Pass Rule)

### Track 1 — State Management
- `screenOpacity` (`Animated.Value`) was placed inline in `screens/WelcomeScreen.jsx` as a `useRef`. This is animation/ephemeral UI state: it belongs in a hook, not a screen.
- **Corrected**: extracted to `hooks/ui/useWelcomeExitTransition.js`. Screen is wiring-only again.
- `isOpeningEmergency` remains a Jotai atom (L5) — correct layer, unchanged.
- The 5s recovery timeout is now owned by `useWelcomeExitTransition` alongside the animation it guards. Single responsibility maintained.

### Track 2 — UI Quality
All HIG violations addressed. See pass log below.

### Track 3 — DRY / Modular Code Shape
- `WelcomeScreen.jsx`: 82 lines (was briefly ~81 lines with inline animation, would have grown). Wiring only ✅
- `useWelcomeExitTransition.js`: 52 lines. Single responsibility ✅
- `WelcomeStageBase.jsx` / `WelcomeWideWebView.jsx`: animation logic kept inside their own component animation `useEffect` — correct location for component-owned motion.
- No new repeated structures introduced.

### Track 4 — Documentation
- Pre-pass audit: `WELCOME_SCREEN_HIG_AUDIT_2026-05-02.md` (existed prior, identified all defects).
- This document is the post-pass record.
- **Gap acknowledged**: documentation was not written before implementation started in the session; this post-pass doc closes that gap retroactively.

---

## Pass Log

### Pass A — Interaction Quality

#### A1 — Haptic feedback on primary `onPressIn`
**File**: `components/entry/EntryActionButton.jsx`  
**Change**: Added `handlePressIn` wrapper; calls `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)` when `isPrimary && !disabled && !loading`.  
**Defect closed**: #2.1

#### A2 — `hitSlop={12}` on `Pressable`
**File**: `components/entry/EntryActionButton.jsx`  
**Change**: Added `hitSlop={12}` to `Pressable`. Ensures ≥44pt effective target.  
**Defect closed**: #2.3

#### A3 — `isOpeningEmergency` 5s timeout recovery
**File**: `hooks/ui/useWelcomeExitTransition.js` (extracted from `screens/WelcomeScreen.jsx`)  
**Change**: `startExitTransition` accepts `{ onRecovery }` callback. Schedules a `setTimeout(onRecovery, 5000)` cleared on successful navigation. Prevents infinite "Opening…" state.  
**Defect closed**: #2.2

---

### Pass B — Motion Discipline

#### B1 — Gate ambient loops behind `reduceMotion`
**Files**: `WelcomeStageBase.jsx`, `WelcomeWideWebView.jsx`  
**Change**: Added `reduceMotion` state via `AccessibilityInfo.isReduceMotionEnabled()` + `addEventListener("reduceMotionChanged")`. `driftLoop` and `pulseLoop` only start if `!reduceMotion`. If `reduceMotion` is true, all animated values snap to final state immediately via `setValue`.  
**Defect closed**: #2.4

#### B2 — Stagger entrance animation into 4 phases
**Files**: `WelcomeStageBase.jsx`, `WelcomeWideWebView.jsx`  
**Change**: Replaced single `entranceOpacity` block with four dedicated `Animated.Value`s (`brandOpacity`, `headlineOpacity`, `helperOpacity`, `actionsOpacity`) driven by `Animated.stagger(60, [...])`. Phases: brand (0ms) → headline (60ms) → helper (120ms) → actions (180ms). Each wired to its corresponding `Animated.View` wrapper.  
**Defect closed**: #2.5

#### B3 — Deepen press spring physics
**File**: `components/entry/EntryActionButton.jsx`  
**Change**: Press scale `0.985 → 0.96` (primary) / `0.975` (secondary). `translateY 1 → 2`. Opacity `0.98 → 0.97`. Gives confident tactile spring feel within Pressable's native animation.  
**Defect closed**: #2.6

---

### Pass C — Transitions

#### C1 — 150ms exit fade before `router.replace`
**File**: `hooks/ui/useWelcomeExitTransition.js` (new)  
**Change**: `startExitTransition(onComplete, { onRecovery })` runs `Animated.timing(screenOpacity, { toValue: 0, duration: 150 })` then calls `onComplete` in the `.start()` callback. `WelcomeScreen` wraps the orchestrator in `<Animated.View style={{ flex: 1, opacity: screenOpacity }}>`.  
`resetOpacity()` is called inside `useFocusEffect` so opacity snaps back to 1 on screen refocus (back navigation, recovery).  
**Defect closed**: #2.7

---

### Pass D — Accessibility

#### D1 — `accessibilityLiveRegion` on action container
**File**: `components/welcome/shared/WelcomeStageBase.jsx`  
**Change**: Added `accessibilityLiveRegion="polite"` to the actions `View` inside `actionBlock`. VoiceOver/TalkBack will announce when the button label changes from "Get Help Now" to "Opening…".  
**Defect closed**: #2.10

#### D2 — `accessibilityLabel` on `ActivityIndicator`
**File**: `components/entry/EntryActionButton.jsx`  
**Change**: Added `accessibilityLabel="Loading"` to the `ActivityIndicator` in the loading state branch.  
**Defect closed**: #2.11

---

## Invariant Verification

| Invariant | Status |
|---|---|
| `WelcomeScreen.jsx` is wiring-only (no animation logic) | ✅ Confirmed — 82 lines, hooks + routing only |
| `screenOpacity` and exit animation owned by `useWelcomeExitTransition` | ✅ Confirmed |
| `isOpeningEmergency` is a Jotai atom reset on focus | ✅ Confirmed |
| 5s recovery timeout is co-located with animation that guards it | ✅ Confirmed |
| `reduceMotion` gates both `driftLoop` and `pulseLoop` in both stage components | ✅ Confirmed |
| `resetOpacity()` called in `useFocusEffect` (handles back-navigation + recovery) | ✅ Confirmed |
| No logic added to screen files | ✅ Confirmed |

---

## What Was Intentionally Left Out of Scope

| Item | Reason |
|---|---|
| #2.8 CTA prewarm readiness signal | Requires hospital query readiness signal from TanStack Query layer. Separate sprint item. |
| #2.9 "Opening…" step context/subtitle | No evidence transition is long enough to warrant step dots. Deferred pending user testing. |
| #2.12 iOS/tvOS focus ring extension | Low-impact on primary usage. Deferred to tvOS pass if required. |

---

## Files Changed

| File | Change |
|---|---|
| `hooks/ui/useWelcomeExitTransition.js` | **Created** — 52 lines |
| `screens/WelcomeScreen.jsx` | Edited — animation logic extracted to hook; `resetOpacity` added to `useFocusEffect` |
| `components/entry/EntryActionButton.jsx` | Edited — haptic, hitSlop, press scale, accessibilityLabel |
| `components/welcome/shared/WelcomeStageBase.jsx` | Edited — reduceMotion gate, 4-phase stagger, accessibilityLiveRegion |
| `components/welcome/views/WelcomeWideWebView.jsx` | Edited — reduceMotion gate, 4-phase stagger |

---

*Post-pass record. All invariants verified.*
