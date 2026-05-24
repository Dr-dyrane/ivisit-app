---
status: living
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# WelcomeStageBase â€” Modularisation Pre-Pass Audit

**Date**: 2026-05-03  
**Status**: PRE â€” no code changed yet  
**Post-doc**: `WELCOME_STAGE_BASE_MODULARIZATION_POST_2026-05-03.md` (to be created)  
**Guardrail ref**: `REFACTORING_GUARDRAILS.md #11` (Safe Modularisation Methodology)

---

## 1. Problem Statement

`components/welcome/shared/WelcomeStageBase.jsx` is **746 lines**.  
Hard architectural limit for a UI component: **350 lines**.  
Mandatory refactor threshold: **500 lines**.

The file mixes four distinct responsibilities:
1. **Accessibility subscription** â€” `reduceMotion` state via `AccessibilityInfo`
2. **Animation engine** â€” entrance stagger, hero drift loop, pulse ring loop, derived interpolations
3. **Theme + layout derivation** â€” `createTheme()`, `resolveThemeOverrides()`, spacing calculations, layout booleans
4. **JSX composition** â€” `brandBlock`, `copyBlock`, `heroBlock`, `actionBlock`, `docked well`, scroll container

---

## 2. Phase 0 â€” Block Categorisation

| Lines | Block | Category | Target |
|---|---|---|---|
| 30â€“72 | `useHiddenWebScrollbars` | Pure hook (web side-effect) | `components/welcome/hooks/useHiddenWebScrollbars.js` |
| 74â€“91 | `getActionSpacing` | Pure helper | `utils/welcome/welcomeStageHelpers.js` |
| 128 | `reduceMotion` state | Accessibility side-effect (subscription) | `hooks/ui/useReducedMotion.js` |
| 129â€“136 | `Animated.Value` refs | Animation state | `hooks/welcome/useWelcomeStageAnimation.js` |
| 150â€“227 | Animation `useEffect` (stagger + loops) | Animation side-effect | `hooks/welcome/useWelcomeStageAnimation.js` |
| 229â€“287 | `themeContext` + `theme` useMemo | Theme derivation | `hooks/welcome/useWelcomeStageTheme.js` |
| 288â€“392 | Layout booleans + spacing derived values | Layout derivation | `hooks/welcome/useWelcomeStageLayout.js` |
| 393â€“412 | Animation interpolations (heroTranslate, ring) | Part of animation hook output | `hooks/welcome/useWelcomeStageAnimation.js` |
| 414â€“480 | `premiumHeadline`, `signInPressable`, `ctaFootnote` | Sub-components | `components/welcome/shared/WelcomeHeadlineBlock.jsx` |
| 482â€“555 | `actionContent`, `actionBlock`, `brandBlock`, `copyBlock` | JSX sub-blocks | Inline in base (keep, slim down) |
| 557â€“623 | `heroBlock` | JSX sub-component | `components/welcome/shared/WelcomeHeroBlock.jsx` |
| 625â€“744 | Render tree (ScrollView, docked well) | JSX shell | Stays in `WelcomeStageBase.jsx` |

---

## 3. Consumers (Regression Targets)

All 10 view files import from `components/welcome/views/WelcomeStageBase` (barrel re-export of shared):

- `WelcomeIOSMobileView.jsx` â€” `createTheme={createWelcomeMobileTheme}`, `actionContainer="well"`
- `WelcomeIOSPadView.jsx`
- `WelcomeAndroidMobileView.jsx`
- `WelcomeAndroidTabletView.jsx`
- `WelcomeAndroidFoldView.jsx`
- `WelcomeAndroidChromebookView.jsx`
- `WelcomeMacbookView.jsx`
- `WelcomeWebMdView.jsx`
- `WelcomeWebMobileView.jsx`
- `WelcomeWebSmWideView.jsx`
- `WelcomeWideWebView.jsx` (imports `shared/WelcomeStageBase` directly)

**Contract (props)**: `onRequestHelp`, `onFindHospitalBed`, `onSignIn`, `primaryActionLabel`, `isRequestOpening`, `createTheme`, `resolveThemeOverrides`, `animation`, `layout`, `actionContainer`, `useActionSlots`, `forceShowChip`, `useWebChrome`, `scrollNativeID`, `scrollbarStyleId`

No consumer accesses internals directly â€” all pass props only. Refactor is safe.

---

## 4. Extraction Plan

### Pass 1 â€” Pure helpers (zero risk)
Extract `useHiddenWebScrollbars` and `getActionSpacing` out of `WelcomeStageBase.jsx`.  
- `useHiddenWebScrollbars` â†’ `components/welcome/hooks/useHiddenWebScrollbars.js`  
- `getActionSpacing` â†’ `utils/welcome/welcomeStageHelpers.js`  
Import back immediately.

### Pass 2 â€” `useReducedMotion` (shared hook)
Check if a shared `useReducedMotion` hook already exists in `hooks/ui/`.  
If not, create `hooks/ui/useReducedMotion.js` â€” `AccessibilityInfo.isReduceMotionEnabled()` + `addEventListener` subscription.  
Replace inline `useState` + `useEffect` in `WelcomeStageBase`.

### Pass 3 â€” `useWelcomeStageAnimation`
Extract all `Animated.Value` refs + animation `useEffect` + interpolations into `hooks/welcome/useWelcomeStageAnimation.js`.  
**Returns**: `{ entranceOpacity, entranceTranslate, brandOpacity, headlineOpacity, helperOpacity, actionsOpacity, heroTranslateX, trailTranslateX, trailOpacity, ringScale, ringOpacity }`  
Takes: `{ reduceMotion, duration, tension, friction, isDarkMode }`

### Pass 4 â€” `useWelcomeStageLayout`
Extract layout booleans + spacing derivations into `hooks/welcome/useWelcomeStageLayout.js`.  
**Returns**: `{ actionsMarginTop, elevatedActionsMarginTop, resolvedActionsMarginTop, dockedActionClearance, isTallSingleLayout, usesShortHeightSingleLayout, shouldDockSingleActionBlock, shouldCenterSingleLayoutCluster, shouldShowWebInstallHint, showChip, spacingKey }`  
Takes: `{ layout, actionContainer, metrics, sharedMetrics, viewport, height, width, useWebChrome }`

### Pass 5 â€” `WelcomeHeroBlock` sub-component
Extract `heroBlock` JSX into `components/welcome/shared/WelcomeHeroBlock.jsx`.  
Props: `{ layout, isDarkMode, sharedMetrics, viewport, heroTranslateX, trailTranslateX, trailOpacity, ringScale, ringOpacity, styles }`

### Pass 6 â€” `WelcomeHeadlineBlock` sub-component
Extract `premiumHeadline` + `ctaFootnote` into `components/welcome/shared/WelcomeHeadlineBlock.jsx`.  
`signInPressable` is commented out â€” leave commented in place.

### Pass 7 â€” `WelcomeStageBase` slim shell
After all extractions, the base should be ~150â€“200 lines: imports, hook calls, `brandBlock`, `copyBlock`, `actionBlock`, scroll container, docked well.

---

## 5. Invariants

1. **Props contract unchanged** â€” all 15 props pass through identically.
2. **No logic moved to screen files** â€” all extracted code goes to hooks or sub-components.
3. **`WelcomeWideWebView.jsx` must not be touched during this refactor** â€” it has its own parallel animation logic; its modularisation is a separate pass.
4. **Barrel re-export `views/WelcomeStageBase.jsx` unchanged** â€” consumers keep working.
5. **`useHiddenWebScrollbars` stays in `components/welcome/hooks/`** â€” it's welcome-specific, not a global UI hook.
6. **Each pass committed or checkpointed before the next starts.**

---

## 6. Out of Scope

- `WelcomeWideWebView.jsx` modularisation â€” separate pass (also a monolith candidate at 396 lines, approaching limit)
- `welcomeMobile.styles.js` and other `createTheme` implementations â€” separate style audit
- `WelcomeAmbientGlows` â€” already its own component, no change needed
- `WelcomeScreenOrchestrator` restructure â€” separate concern

---

## 7. Git Baseline

Record before starting Pass 1:
```
git log --oneline -1 -- components/welcome/shared/WelcomeStageBase.jsx
```
Expected: `58a6c47` (the HIG audit commit just pushed).
