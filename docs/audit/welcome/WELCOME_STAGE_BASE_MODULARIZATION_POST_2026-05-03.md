---
status: living
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# WelcomeStageBase â€” Modularisation Post-Pass Record

**Date**: 2026-05-03  
**Status**: COMPLETE  
**Pre-doc**: [`WELCOME_STAGE_BASE_MODULARIZATION_PRE_2026-05-03.md`](./WELCOME_STAGE_BASE_MODULARIZATION_PRE_2026-05-03.md)  
**Git baseline**: `58a6c47`

---

## Four-Track Review

### Track 1 â€” State Management
- `reduceMotion` was inline `useState` + `AccessibilityInfo` subscription. Extracted to `hooks/ui/useReducedMotion.js` (shared, reusable). Correct layer: subscription side-effect.
- No state added. No layer violations introduced.

### Track 2 â€” UI Quality
- No visual changes. All animations, layout, and styling are byte-for-byte identical from the consumer perspective.
- `signInPressable` was dead code (commented out at both call sites). Removed cleanly.

### Track 3 â€” DRY / Modular Code Shape

| File | Lines Before | Lines After | Status |
|---|---|---|---|
| `WelcomeStageBase.jsx` | 746 | **470** | âœ… Below 500 limit |
| `useWelcomeStageAnimation.js` | â€” | 130 | âœ… New, single responsibility |
| `useReducedMotion.js` | â€” | 22 | âœ… New, shared utility |
| `WelcomeHeroBlock.jsx` | â€” | 96 | âœ… New, single surface |
| `WelcomeHeadlineBlock.jsx` | â€” | 60 | âœ… New, single surface |
| `useHiddenWebScrollbars.js` | â€” | 55 | âœ… Moved from inline |
| `welcomeStageHelpers.js` | â€” | 26 | âœ… Pure helper |

### Track 4 â€” Documentation
- Pre-pass doc written before any code changed âœ…
- This post-pass doc closes the record âœ…

---

## Pass Log

### Pass 1 â€” Pure helpers extracted
- `useHiddenWebScrollbars` â†’ `components/welcome/hooks/useHiddenWebScrollbars.js`
- `getActionSpacing` â†’ `utils/welcome/welcomeStageHelpers.js`
- Imported back immediately. File still ran before continuing.

### Pass 2 â€” `useReducedMotion` shared hook
- Created `hooks/ui/useReducedMotion.js`
- Replaced inline `useState(false)` + `useEffect` (AccessibilityInfo subscription) in `WelcomeStageBase`
- `AccessibilityInfo` import removed from `WelcomeStageBase`

### Pass 3 â€” `useWelcomeStageAnimation` hook
- Created `hooks/welcome/useWelcomeStageAnimation.js`
- Extracted: all 8 `Animated.Value` refs, animation `useEffect` (stagger + entrance + drift/pulse loops), and 5 interpolations
- Returns: `{ entranceOpacity, entranceTranslate, brandOpacity, headlineOpacity, helperOpacity, actionsOpacity, heroTranslateX, trailTranslateX, trailOpacity, ringScale, ringOpacity }`
- Takes: `{ reduceMotion, duration, tension, friction, isDarkMode }`
- `Easing` import removed from `WelcomeStageBase`

### Pass 4 â€” `WelcomeHeroBlock` sub-component
- Created `components/welcome/shared/WelcomeHeroBlock.jsx`
- Extracted split + single layout hero JSX (65 lines)
- Props: `{ layout, isDarkMode, sharedMetrics, viewport, heroTranslateX, trailTranslateX, trailOpacity, ringScale, ringOpacity, styles }`
- `HERO` asset require and `AnimatedLinearGradient` removed from `WelcomeStageBase`

### Pass 5 â€” `WelcomeHeadlineBlock` sub-component
- Created `components/welcome/shared/WelcomeHeadlineBlock.jsx`
- Extracted web CSS gradient + native MaskedView gradient headline (50 lines)
- Props: `{ styles, headlineDisplayStyle, colors, isDarkMode }`
- `MaskedView`, `COLORS` imports removed from `WelcomeStageBase`

### Dead code removal
- `signInPressable` variable removed (was commented out at both call sites â€” `actionContent` and `actionBlock`)
- `Pressable` import removed from `WelcomeStageBase`

---

## Invariant Verification

| Invariant | Status |
|---|---|
| All 15 props unchanged (`onRequestHelp`, `onFindHospitalBed`, `onSignIn`, etc.) | âœ… |
| All 10 view consumers unaffected (pass props through, no internals) | âœ… |
| Barrel re-export `views/WelcomeStageBase.jsx` unchanged | âœ… |
| `WelcomeWideWebView.jsx` not touched | âœ… |
| Animation behaviour identical (same values, same timing, same loops) | âœ… |
| `reduceMotion` gate behaviour identical | âœ… |
| No logic moved to screen files | âœ… |

---

## What Was Intentionally Left Out of Scope

| Item | Reason |
|---|---|
| `WelcomeWideWebView.jsx` modularisation | Has its own parallel animation logic; separate pass |
| `useWelcomeStageLayout` hook extraction (layout booleans, spacing) | `WelcomeStageBase` is now at 470 lines â€” below hard limit. Extracting layout derivations is a quality improvement, not urgent. Deferred. |
| `brandBlock` / `copyBlock` sub-components | Both are ~25 lines each inline; extraction would add overhead without reducing file size meaningfully at this point. Deferred. |
| `createTheme` / `welcomeMobile.styles.js` audit | Separate style architecture concern |

---

## Files Changed

| File | Change |
|---|---|
| `components/welcome/shared/WelcomeStageBase.jsx` | 746 â†’ 470 lines |
| `components/welcome/hooks/useHiddenWebScrollbars.js` | Extracted (55 lines) |
| `utils/welcome/welcomeStageHelpers.js` | Created (26 lines) |
| `hooks/ui/useReducedMotion.js` | Created (22 lines) |
| `hooks/welcome/useWelcomeStageAnimation.js` | Created (130 lines) |
| `components/welcome/shared/WelcomeHeroBlock.jsx` | Created (96 lines) |
| `components/welcome/shared/WelcomeHeadlineBlock.jsx` | Created (60 lines) |
| `docs/audit/welcome/WELCOME_STAGE_BASE_MODULARIZATION_PRE_2026-05-03.md` | Created |
| `docs/audit/welcome/WELCOME_STAGE_BASE_MODULARIZATION_POST_2026-05-03.md` | This file |
