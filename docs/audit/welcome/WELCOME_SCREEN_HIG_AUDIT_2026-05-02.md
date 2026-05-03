# Welcome Screen Apple HIG Audit — 2026-05-02

**Scope**: Welcome screen interaction, motion, and progression feedback
**Status**: AUDIT — implementation passes planned, not started
**Standard**: Apple Human Interface Guidelines (interaction, motion, accessibility)

---

## 1. Architecture (Current)

### Entry Points
| File | Responsibility |
|---|---|
| `app/(auth)/index.js` | Route mount |
| `screens/WelcomeScreen.jsx` | State orchestration, prewarm, routing |
| `components/welcome/WelcomeScreenOrchestrator.jsx` | View variant selection |
| `components/welcome/shared/WelcomeStageBase.jsx` | Animation engine, layout, theme |
| `components/entry/EntryActionButton.jsx` | Primary interaction surface |

### Animation Layers
| Layer | Driver | Files |
|---|---|---|
| Entrance | `Animated.parallel` (opacity + spring translate) | `WelcomeStageBase.jsx:144-157` |
| Hero drift | `Animated.loop` 2800ms ease in-out | `WelcomeStageBase.jsx:159-173` |
| Pulse ring | `Animated.loop` 1100ms ease in-out | `WelcomeStageBase.jsx:175-189` |
| Press micro | Static `transform: scale(0.985)` | `EntryActionButton.jsx:66` |

---

## 2. Identified Defects

### 🔴 Critical — Interaction Feedback

#### 2.1 No haptic feedback on emergency CTA press
**File**: `components/entry/EntryActionButton.jsx:46`
**Current**: `onPress` fires with no `Haptics` call.
**HIG violation**: *"Use haptics to reinforce the result of an action, especially for critical or destructive actions."*
**Fix**: Add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)` on `onPressIn` for primary variant.

#### 2.2 Loading state has no timeout or error recovery
**File**: `screens/WelcomeScreen.jsx:99-101`
**Current**: `setIsOpeningEmergency(true)` → `router.replace("/(auth)/map")`. If router hangs, button stays in "Opening…" forever.
**Fix**: Add 5s timeout that resets `isOpeningEmergency` and shows fallback retry state.

#### 2.3 No `hitSlop` on primary button
**File**: `components/entry/EntryActionButton.jsx:45-93`
**Current**: `Pressable` has no `hitSlop`. Edge taps may miss despite visual size.
**Fix**: Add `hitSlop={12}` (or greater) to ensure ≥44pt effective target per HIG.

---

### 🟡 High — Motion & Animation

#### 2.4 Ambient loops ignore reduced-motion preference
**File**: `components/welcome/shared/WelcomeStageBase.jsx:144-199`
**Current**: `driftLoop` and `pulseLoop` start unconditionally. No `useReducedMotion()` check.
**HIG violation**: *"Respect the user's preference for reduced motion."*
**Fix**: Gate loops behind `const isReducedMotion = useReducedMotion()` (pattern already in `MapTrackingStageBase.jsx:3`).

#### 2.5 Entrance animation is monolithic, not staged
**File**: `components/welcome/shared/WelcomeStageBase.jsx:144-157`
**Current**: Entire screen animates as one opacity/translate block.
**HIG violation**: *"Introduce content in stages to help people understand the hierarchy and relationships between elements."*
**Fix**: Split into staggered sequence:
- Brand/logo: 0ms
- Headline: 120ms
- Helper: 200ms
- Actions: 280ms

#### 2.6 Button press lacks spring physics
**File**: `components/entry/EntryActionButton.jsx:66`
**Current**: Static `scale(0.985)` with no spring. Feels mechanical.
**Fix**: Use `withSpring` (Reanimated) or `Animated.spring` with stiffness ~300, damping ~25.

#### 2.7 No exit animation on route transition
**File**: `screens/WelcomeScreen.jsx:101`
**Current**: `router.replace` fires instantly. Screen cuts away after choreographed entrance.
**Fix**: Add 150ms exit fade before routing, or use `Stack` transition presets.

---

### 🟡 High — Progression & Loading

#### 2.8 Prewarm has no readiness signal on the CTA
**File**: `screens/WelcomeScreen.jsx:60-96`, `components/entry/EntryActionButton.jsx`
**Current**: `refreshHospitals()` runs silently. User may tap emergency before prewarm completes, hitting a cold map.
**Fix**: Make the CTA button itself communicate readiness:
- Prewarming → `opacity: 0.92`, subtle ambient pulse ring
- Ready → Full opacity, ring disappears, haptic primed
- **No standalone skeleton or loading indicator on the welcome surface** (would add noise to a calm screen)

#### 2.9 "Opening…" label lacks step context
**File**: `components/welcome/welcomeContent.js:6`
**Current**: Plain "Opening…" with spinner. No sense of what stage is active.
**Fix**: Optional subtitle or step dots if the transition proves long enough to warrant it.

---

### 🟢 Medium — Accessibility

#### 2.10 No `accessibilityLiveRegion` on loading state change
**File**: `screens/WelcomeScreen.jsx:100`, `components/entry/EntryActionButton.jsx`
**Current**: Button text changes from "Continue" to "Opening…". VoiceOver may not announce the change.
**Fix**: Wrap action container with `accessibilityLiveRegion="polite"`.

#### 2.11 `ActivityIndicator` lacks accessibility label
**File**: `components/entry/EntryActionButton.jsx:144`
**Current**: Spinner renders with no `accessibilityLabel`.
**Fix**: Add `accessibilityLabel="Loading"`.

#### 2.12 Focus ring styles are web-only
**File**: `components/entry/EntryActionButton.jsx:54,69-89`
**Current**: Keyboard focus styling only applied for `Platform.OS === "web"`.
**Fix**: Add `tvParallaxProperties` or iOS focus ring via `Pressable` `focused` state.

---

## 3. What's Already Correct ✅

| Element | Evidence |
|---|---|
| Entrance spring | `WelcomeStageBase.jsx:151` — `Animated.spring` with tension/friction |
| Press micro-interaction | `EntryActionButton.jsx:66` — scale + opacity + translateY |
| Loading spinner | `EntryActionButton.jsx:131` — replaces content with `ActivityIndicator` |
| Dark mode awareness | `isDarkMode` gates colors throughout |
| Continuous corners | `borderCurve: "continuous"` on buttons |
| `adjustsFontSizeToFit` | `EntryActionButton.jsx:179` |
| Safe area insets | `useSafeAreaInsets` in stage base |
| Accessibility role | `accessibilityRole="button"` |
| Prewarm logic | `WelcomeScreen.jsx:84` — warms hospitals before map mount |

---

## 4. Pass Plan

### Pass A — Interaction (Highest Impact)
1. Add haptic feedback to `EntryActionButton` primary variant
2. Add `hitSlop` to `Pressable`
3. Add `isOpeningEmergency` timeout + error recovery

### Pass B — Motion Discipline
4. Gate ambient loops behind `useReducedMotion`
5. Stagger entrance animation into 4 phases
6. Replace static press scale with spring physics

### Pass C — Progression & Transitions
7. Add CTA readiness signal (prewarm → ready state on button)
8. Add 150ms exit fade before `router.replace`

### Pass D — Accessibility Polish
9. Add `accessibilityLiveRegion` on action container
10. Add `accessibilityLabel` to `ActivityIndicator`
11. Extend focus ring to iOS/tvOS

---

## 5. Reference

- Apple HIG: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- Apple HIG: [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- Apple HIG: [Haptics](https://developer.apple.com/design/human-interface-guidelines/haptics)
- Apple HIG: [Accessibility — Motion](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Existing pattern: `MapTrackingStageBase.jsx:3` — `useReducedMotion` usage
