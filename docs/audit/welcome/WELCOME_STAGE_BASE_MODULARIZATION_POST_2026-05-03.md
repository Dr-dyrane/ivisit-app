# WelcomeStageBase — Modularisation Post-Pass Record

**Date**: 2026-05-03  
**Status**: COMPLETE  
**Pre-doc**: [`WELCOME_STAGE_BASE_MODULARIZATION_PRE_2026-05-03.md`](./WELCOME_STAGE_BASE_MODULARIZATION_PRE_2026-05-03.md)  
**Git baseline**: `58a6c47`

---

## Four-Track Review

### Track 1 — State Management
- `reduceMotion` was inline `useState` + `AccessibilityInfo` subscription. Extracted to `hooks/ui/useReducedMotion.js` (shared, reusable). Correct layer: subscription side-effect.
- No state added. No layer violations introduced.

### Track 2 — UI Quality
- No visual changes. All animations, layout, and styling are byte-for-byte identical from the consumer perspective.
- `signInPressable` was dead code (commented out at both call sites). Removed cleanly.

### Track 3 — DRY / Modular Code Shape

| File | Lines Before | Lines After | Status |
|---|---|---|---|
| `WelcomeStageBase.jsx` | 746 | **470** | ✅ Below 500 limit |
| `useWelcomeStageAnimation.js` | — | 130 | ✅ New, single responsibility |
| `useReducedMotion.js` | — | 22 | ✅ New, shared utility |
| `WelcomeHeroBlock.jsx` | — | 96 | ✅ New, single surface |
| `WelcomeHeadlineBlock.jsx` | — | 60 | ✅ New, single surface |
| `useHiddenWebScrollbars.js` | — | 55 | ✅ Moved from inline |
| `welcomeStageHelpers.js` | — | 26 | ✅ Pure helper |

### Track 4 — Documentation
- Pre-pass doc written before any code changed ✅
- This post-pass doc closes the record ✅

---

## Pass Log

### Pass 1 — Pure helpers extracted
- `useHiddenWebScrollbars` → `components/welcome/hooks/useHiddenWebScrollbars.js`
- `getActionSpacing` → `utils/welcome/welcomeStageHelpers.js`
- Imported back immediately. File still ran before continuing.

### Pass 2 — `useReducedMotion` shared hook
- Created `hooks/ui/useReducedMotion.js`
- Replaced inline `useState(false)` + `useEffect` (AccessibilityInfo subscription) in `WelcomeStageBase`
- `AccessibilityInfo` import removed from `WelcomeStageBase`

### Pass 3 — `useWelcomeStageAnimation` hook
- Created `hooks/welcome/useWelcomeStageAnimation.js`
- Extracted: all 8 `Animated.Value` refs, animation `useEffect` (stagger + entrance + drift/pulse loops), and 5 interpolations
- Returns: `{ entranceOpacity, entranceTranslate, brandOpacity, headlineOpacity, helperOpacity, actionsOpacity, heroTranslateX, trailTranslateX, trailOpacity, ringScale, ringOpacity }`
- Takes: `{ reduceMotion, duration, tension, friction, isDarkMode }`
- `Easing` import removed from `WelcomeStageBase`

### Pass 4 — `WelcomeHeroBlock` sub-component
- Created `components/welcome/shared/WelcomeHeroBlock.jsx`
- Extracted split + single layout hero JSX (65 lines)
- Props: `{ layout, isDarkMode, sharedMetrics, viewport, heroTranslateX, trailTranslateX, trailOpacity, ringScale, ringOpacity, styles }`
- `HERO` asset require and `AnimatedLinearGradient` removed from `WelcomeStageBase`

### Pass 5 — `WelcomeHeadlineBlock` sub-component
- Created `components/welcome/shared/WelcomeHeadlineBlock.jsx`
- Extracted web CSS gradient + native MaskedView gradient headline (50 lines)
- Props: `{ styles, headlineDisplayStyle, colors, isDarkMode }`
- `MaskedView`, `COLORS` imports removed from `WelcomeStageBase`

### Dead code removal
- `signInPressable` variable removed (was commented out at both call sites — `actionContent` and `actionBlock`)
- `Pressable` import removed from `WelcomeStageBase`

---

## Invariant Verification

| Invariant | Status |
|---|---|
| All 15 props unchanged (`onRequestHelp`, `onFindHospitalBed`, `onSignIn`, etc.) | ✅ |
| All 10 view consumers unaffected (pass props through, no internals) | ✅ |
| Barrel re-export `views/WelcomeStageBase.jsx` unchanged | ✅ |
| `WelcomeWideWebView.jsx` not touched | ✅ |
| Animation behaviour identical (same values, same timing, same loops) | ✅ |
| `reduceMotion` gate behaviour identical | ✅ |
| No logic moved to screen files | ✅ |

---

## What Was Intentionally Left Out of Scope

| Item | Reason |
|---|---|
| `WelcomeWideWebView.jsx` modularisation | Has its own parallel animation logic; separate pass |
| `useWelcomeStageLayout` hook extraction (layout booleans, spacing) | `WelcomeStageBase` is now at 470 lines — below hard limit. Extracting layout derivations is a quality improvement, not urgent. Deferred. |
| `brandBlock` / `copyBlock` sub-components | Both are ~25 lines each inline; extraction would add overhead without reducing file size meaningfully at this point. Deferred. |
| `createTheme` / `welcomeMobile.styles.js` audit | Separate style architecture concern |

---

## Files Changed

| File | Change |
|---|---|
| `components/welcome/shared/WelcomeStageBase.jsx` | 746 → 470 lines |
| `components/welcome/hooks/useHiddenWebScrollbars.js` | Extracted (55 lines) |
| `utils/welcome/welcomeStageHelpers.js` | Created (26 lines) |
| `hooks/ui/useReducedMotion.js` | Created (22 lines) |
| `hooks/welcome/useWelcomeStageAnimation.js` | Created (130 lines) |
| `components/welcome/shared/WelcomeHeroBlock.jsx` | Created (96 lines) |
| `components/welcome/shared/WelcomeHeadlineBlock.jsx` | Created (60 lines) |
| `docs/audit/welcome/WELCOME_STAGE_BASE_MODULARIZATION_PRE_2026-05-03.md` | Created |
| `docs/audit/welcome/WELCOME_STAGE_BASE_MODULARIZATION_POST_2026-05-03.md` | This file |
