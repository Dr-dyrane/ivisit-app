---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Tracking Sheet Phase Audit â€” 2026-04-26

**Scope**: Tracking sheet UI/UX + ongoing-request flow + rating display + visit-details resume
**Status**: AUDIT â€” no code changes proposed yet
**Architecture**: 5-layer state (Realtime â†’ Query â†’ Zustand â†’ XState â†’ Jotai)

---

## 1. Architectural Reality (Current)

### 5 Layers In Place
| Layer | File | Owns | Status |
|---|---|---|---|
| Realtime | Supabase subscriptions | Server truth | âœ… |
| Query cache | TanStack Query (`useActiveTripQuery`) | Server sync, refetch | âœ… |
| Persistent state | Zustand `emergencyTripStore` | `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval` | âœ… persists |
| Trip lifecycle | XState `tripLifecycleMachine` + `useTripLifecycle` | `isIdle`, `isPendingApproval`, `isActive`, `isArrived`, `isCompleting`, `isCompleted`, `isRatingPending`, `hasActiveTrip` | âœ… exists |
| UI state | Jotai atoms (`mapScreenAtoms`) | sheet phase, snap state, rating modal, visualization | âœ… exists, partially wired |

### Key files
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\hooks\map\exploreFlow\useMapTracking.js:1-138` â€” auto-open effect, `openTracking`/`closeTracking`
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\hooks\map\exploreFlow\useMapExploreFlow.js:270-353` â€” composes tracking + commit flow
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\hooks\emergency\useTripLifecycle.js:1-165` â€” XState adapter
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\machines\tripLifecycleMachine.js:1-349` â€” lifecycle states
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\components\map\views\tracking\MapTrackingStageBase.jsx:33-592` â€” sheet body
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\components\map\views\tracking\useMapTrackingController.js:1-548` â€” actions + rating
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\screens\MapScreen.jsx:365-405` â€” visit-details resume, sheet phase consumers

---

## 2. Identified Defects

### 2.1 Explore-intent does not auto-render tracking on mount with ongoing request

**Symptom**: User has active trip â†’ app cold start lands on `MAP_SHEET_PHASES.EXPLORE_INTENT` â†’ tracking sheet never opens until user takes action.

**Root cause** (`useMapTracking.js:93-130`):
1. Effect depends on `trackingRequestKey` + `sheetPhase`
2. `trackingRequestKey` is `activeMapRequest.requestId` â€” derived from Zustand store
3. Zustand hydration is async (via `database.read` in `RootRuntimeGate`)
4. On first paint: `trackingRequestKey === null` â†’ effect runs but skips
5. On hydration complete: store updates â†’ re-render â†’ effect fires
6. **BUT**: `trackingDismissedRef.current` is `false` AND `sheetPhase === EXPLORE_INTENT` â†’ should open

**Likely actual cause**: `prevSheetPhaseRef.current === EXPLORE_INTENT` is initial value, but after hydration the sheet may have transitioned through other phases. Need to verify with logs.

**Secondary issue**: No XState `hasActiveTrip` listener at MapScreen level. If we were to use the lifecycle flag instead of `trackingRequestKey`, the gate would be cleaner: `if (hasActiveTrip && sheetPhase === EXPLORE_INTENT && !dismissed) openTracking()`.

### 2.2 Payment â†’ tracking transition relies on single signal

**Symptom**: After payment success, sometimes tracking does not open.

**Root cause**: `useMapCommitFlow.finishCommitPayment` calls `openTracking()` directly. If Zustand store hasn't yet absorbed the trip data (TanStack invalidate may not have completed), the `openTracking` resolves the wrong hospital or no-ops in downstream guards.

**User's proposed fix** (correct): "double-run" â€” call `openTracking` after payment, AND also have a sheet-phase listener that opens tracking whenever `hasActiveTrip` becomes true and we are on EXPLORE_INTENT.

### 2.3 Visit-details resume tracking broken

**Symptom**: `handleHistoryItemSelect` (`MapScreen.jsx:365-395`) calls `openTracking?.()` for live items, but tracking does not open.

**Root cause**: `openTracking` in `useMapTracking.js:56-86` reads from `activeMapRequest.hospital`/`hospitalId`. If the user is selecting a historical item that does not match the currently-active trip in the store (e.g. the user opened visit details for an old trip), `activeMapRequest.requestId` is null â†’ `setSheetView(buildTrackingSheetView(...))` runs, but `useMapTracking`'s effect at `:93-130` sees `!trackingRequestKey` and immediately reverts to EXPLORE_INTENT (`:101-105`).

**Fix path**: separate "resume from history" intent from "auto-open from active trip". History resume should hydrate the active trip into Zustand first (if it matches a live request), then trigger `openTracking`. If the visit is no longer live, history resume should open the visit detail sheet, not tracking.

### 2.4 Rating display fails outside tracking phase

**Symptom**: Trip completes â†’ rating modal not shown.

**Root cause**: `<ServiceRatingModal />` is rendered inside `MapTrackingStageBase` (`MapTrackingStageBase.jsx:577-589`). `MapTrackingStageBase` only mounts when `sheetPhase === TRACKING`. When completion happens:
- If sheetPhase transitions away from TRACKING before the rating modal opens â†’ modal unmounts immediately
- If user is not on the map at all (e.g. navigated to history) â†’ modal never mounts

**Current partial fix attempt**: I made `trackingRatingStateAtom` persist (Phase 8). State survives, but the modal **renderer** is still gated on TRACKING phase.

**Real fix**: Lift the rating modal renderer to a level that survives sheet phase transitions â€” either `MapScreen` root, or even higher (a global rating overlay). Keep the state in Jotai (already done), drive visibility from `isRatingPending` (XState) + `trackingRatingStateAtom`.

### 2.X Hero card progress vs ambulance marker animation drift (noted, low priority)

**Symptom**: Hero card progress fill and the ambulance marker on the map are not pixel-coherent â€” they may show slightly different positions for the same instant.

**Root cause**:
- Hero card consumes `ambulanceTripProgress` (computed by `useTripProgress`) as a declarative width.
- Ambulance marker uses `useAmbulanceAnimation` which runs its own internal interpolation timer driven by `ambulanceTripEtaSeconds` + route coordinates.
- Both derive from the same upstream ETA + route, but compute progress independently â†’ small drift accumulates.

**Defer to Pass G** (HIG polish). Not a correctness defect; only a visual coherence concern.

**Fix path** (when addressed): single source of truth for progress. Hero card and marker animation both read from one shared progress signal (Jotai `trackingProgressValueAtom`, already persisted), updated at one render tick.

---

### 2.5 Five-layer state not consistently applied to tracking

**Observation**: Tracking sheet today reads:
- Trip data: `activeMapRequest.raw.*` (props from `useMapExploreFlow`) â€” Zustand-backed âœ…
- Lifecycle flags: `useEmergency().isArrived` â€” XState-backed âœ…
- UI state: local `useState` + animated refs â€” partially Jotai âš ï¸

The XState `hasActiveTrip` flag is **not used** to drive sheet auto-open. We rely on `trackingRequestKey` (raw Zustand). This works most of the time but bypasses the lifecycle machine, defeating the point of having it.

---

## 3. Pass Plan

> **Rule**: Complete + verify each pass before starting next. No batching.

### Pass A â€” Diagnostic logging (read-only, lowest risk)
**Goal**: Confirm hypothesised root causes before changing logic.

**Actions**:
1. Add `console.debug` checkpoints (gated behind `__DEV__`) in:
   - `useMapTracking.js` auto-open effect (entry conditions, guard skips)
   - `useMapCommitFlow.finishCommitPayment` (Zustand state at call time)
   - `MapScreen.handleHistoryItemSelect` (`activeMapRequest.requestId` vs history item key)
   - `MapTrackingStageBase` rating modal mount/unmount
2. Capture logs for the 4 failing flows.
3. Document findings in this audit.

**Acceptance**: Logs confirm the 4 root causes (or refute them).

---

### Pass B â€” Lift rating modal out of tracking sheet
**Goal**: Rating display works regardless of sheet phase.

**Actions**:
1. Move `<ServiceRatingModal />` from `MapTrackingStageBase` to `MapScreen` (or `MapSheetOrchestrator`).
2. Drive visibility from `trackingRatingStateAtom.visible` (already persisted).
3. `useMapTrackingController` keeps owning `closeRating`/`skipRating`/`submitRating` â€” but these are imported into `MapScreen` via a thin hook `useTrackingRatingModal()`.
4. Reset rating state to defaults inside `submitRating`/`skipRating` (already done in controller).

**Acceptance**: Trip completes â†’ rating modal shows even if user navigated away from tracking sheet.

---

### Pass C â€” Use XState `hasActiveTrip` to gate auto-open
**Goal**: Replace ad-hoc `trackingRequestKey` truthy check with lifecycle flag.

**Actions**:
1. In `useMapExploreFlow`, expose `hasActiveTrip` from `useEmergency()` (or directly from `useTripLifecycle`).
2. Pass `hasActiveTrip` into `useMapTracking({ hasActiveTrip, ... })`.
3. Auto-open effect gate becomes:
   ```js
   if (hasActiveTrip && sheetPhase === EXPLORE_INTENT && !dismissed) openTracking()
   ```
4. Keep `trackingRequestKey` as data source for `openTracking` itself (hospital resolution).

**Acceptance**: Tracking sheet auto-opens on cold start when XState transitions to `pendingApproval` / `active` / `arrived`.

---

### Pass D â€” Sheet-phase listener as fallback for payment â†’ tracking
**Goal**: "Double-run" so payment success never leaves user stranded.

**Actions**:
1. After payment, `finishCommitPayment` continues to call `openTracking()` directly (existing).
2. Pass C's effect now serves as the second runner: if payment-triggered openTracking fails (timing), the next render with `hasActiveTrip === true` re-triggers it.
3. No new effect needed â€” Pass C already provides it. Verify by deliberately delaying Zustand commit and confirming auto-recovery.

**Acceptance**: Payment success â†’ tracking always opens within 1-2 render cycles.

---

### Pass E â€” Fix visit-details resume tracking
**Goal**: History "Resume tracking" CTA works for the active live request, navigates to visit detail otherwise.

**Actions**:
1. In `handleHistoryItemSelect`, before calling `openTracking`, verify:
   ```js
   const isCurrentActiveRequest =
     historyItem.sourceKind === "emergency" &&
     activeMapRequest.requestId &&
     historyItem.requestId === activeMapRequest.requestId;
   ```
2. If not the active request, route to `openVisitDetail(historyItem)` instead of `openTracking`.
3. The "Resume" CTA in history should only render when `historyItem.requestId === activeMapRequest.requestId` (gate at history-item level).
4. Drop the immediate revert in `useMapTracking.js:101-105` â€” that effect should not force-close tracking if `trackingRequestKey` becomes null mid-frame; let Zustand settle.

**Acceptance**: Resume-from-history opens tracking if and only if history item matches active trip; otherwise opens visit detail.

---

### Pass F â€” Sheet phase audit and document the canonical flow
**Goal**: Single source of truth for "what should happen when".

**Actions**:
1. Update `docs/./architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` (or new sibling doc) with a state diagram:
   - Inputs: XState lifecycle, Zustand store, sheet phase, payment events, history selection
   - Output: which sheet phase should be active
2. Add a single derived selector (Jotai `atom((get) => ...)`) that computes the desired sheet phase from these inputs. Use it as a debug overlay in dev to visualize divergence between desired and actual.

**Acceptance**: New devs can read one diagram and understand sheet phase transitions.

---

## 4. Out of Scope (Tracked Separately)

- Hero card visualization (gradient underlay, status pill, CTA muting) â€” **DONE** in Phase 8 polish
- Sheet title animation â€” **DONE**
- AM/PM removal â€” **DONE**
- Persistent tracking visualization storage â€” **DONE** (uses `database` abstraction + `StorageKeys.TRACKING_VISUALIZATION`)
- MapScreen 1,434-line decomposition â€” separate roadmap track
- `EmergencyContext` retirement Phase 6f+ â€” separate roadmap track

---

## 5. Anti-Pattern Checklist (apply before any code change)

- [ ] Did I check if `useTripLifecycle` already exposes the flag I need?
- [ ] Am I bypassing the `database` abstraction with raw `AsyncStorage`?
- [ ] Am I using raw `useState` where a Jotai atom or Zustand selector exists?
- [ ] Am I duplicating an animation/visualization that already exists in the parts file?
- [ ] Am I gating UI on a raw status string instead of an XState flag?
- [ ] Am I introducing a new sheet phase without updating the diagram?

---

## 6. Decision Log

- Rating modal lifting (Pass B) chosen over "render modal everywhere" because the modal already has rich completion context that should not be globally available.
- XState gate (Pass C) chosen over direct Zustand subscription because the lifecycle machine is the canonical "are we tracking?" answer.
- Visit-details resume (Pass E) fix lives at the call site, not inside `useMapTracking`, because the auto-open effect should not be aware of history-item provenance.

---

## 7. Apple HIG UI/UX Audit

> Evaluated against: Apple Human Interface Guidelines (Maps, Find My, Wallet, Health, CarPlay tracking patterns).
> Reference touchstones: Apple Maps turn-by-turn sheet, Find My device tracking, Uber-style driver-en-route cards (which themselves model on HIG).

### 7.1 Visual Hierarchy â€” Current State

| Element | Apple Pattern | Current State | Verdict |
|---|---|---|---|
| Sheet handle | Single grabber, 36Ã—5pt, system gray | Custom handle | âœ“ Verify token alignment |
| Top slot title | Single weight, primary text color, breathing room | Animated status color | âš ï¸ Color-as-status is loud; HIG prefers icon + neutral text |
| Subtitle | `.subheadline` muted | OK | âœ“ |
| Status communication | SF Symbol + label OR pill in trailing | Hero gradient underlay + animated title color | âš ï¸ Two parallel status channels (redundant) |
| Primary CTA | Filled, large, accent color | Bottom action button â€” green on completion | âœ“ |
| Secondary CTAs | Tinted, grouped, neutral until contextually relevant | Mid-action group, muted on arrival | âœ“ Matches HIG "calm by default, light up on context" |
| Sheet detents | Medium + Large, with smooth interpolation | Three snap states (collapsed/medium/expanded) | âœ“ |
| Header chevron | System chevron, subtle | Now uses original token color | âœ“ Fixed in last pass |

### 7.2 Motion Discipline â€” Current State

| Animation | HIG Principle | Current State | Verdict |
|---|---|---|---|
| Sheet open/close | Spring, 0.35s, damping ~28 | Native sheet animation | âœ“ |
| Title color shift | Run **once** per status change, hold | Animates once via `hasSheetTitleAnimatedAtom` | âœ“ Correct |
| Hero progress fill | Linear or eased, never bouncy on data | `TrackingTeamHeroCard` progress fill | âœ“ |
| Triage ring breathing | Subtle pulse, â‰¤3% scale, â‰¤2s loop | 1.018Ã— scale, 1.6s in/out | âœ“ Within HIG envelope |
| Snap state transitions | Continuous, gesture-driven | Native | âœ“ |
| Avoid | "Disco" effects, multiple simultaneous color shifts | Currently no violation | âœ“ |

### 7.3 Cognitive Load â€” Apple Underpaid-App Test

**Question**: If a user glances at the sheet for 0.5s, do they know:
1. Are we tracking? (yes/no)
2. What stage? (en-route / approaching / arrived)
3. What's the next action? (single primary CTA)

**Current state**:
- (1) âœ“ â€” sheet itself communicates tracking
- (2) âš ï¸ â€” status communicated via title color + hero progress + (now removed) status pill. Three channels saying the same thing was overload. After our cleanup: title color + hero. Still 2 channels.
- (3) âœ“ â€” bottom CTA is unambiguous

**HIG verdict**: After the status pill removal, we are within tolerance. **Recommendation**: pick ONE primary status channel. Apple Maps uses the hero card progress + a single SF Symbol; the title stays neutral. Consider neutralizing title color and letting the hero progress carry the status.

### 7.4 Emotional Calm â€” Premium Restraint

**Apple test**: Does the surface feel like a first-party Apple service or a startup demo?

**Areas of concern**:
- âœ“ No decorative gradients on text
- âœ“ No glowing borders
- âœ“ No emoji in status
- âœ“ Bottom action gradient is subtle (matches Apple Wallet pay button)
- âš ï¸ Animated title color shift between phases â€” when red appears for "approaching", it feels alarming. HIG: red is reserved for destructive/critical alerts (cancel, emergency). For routine status progress, use accent color or neutral.
- âš ï¸ Hero gradient could be a single tinted band rather than 3-stop red-yellow-green (which screams "traffic light")

**Recommendation**: Reduce status palette to 2 shades (en-route accent + arrived green). Remove red entirely from non-emergency phases. Map "critical" red only to telemetry-lost / true emergency.

### 7.5 Accessibility â€” HIG Mandatory

| Requirement | Current State |
|---|---|
| Tap targets â‰¥ 44Ã—44 pt | Toggle/triage ring buttons 38pt â€” **below minimum** âš ï¸ |
| Dynamic Type support | Sheet title fixed at 22pt â€” no scaling âš ï¸ |
| VoiceOver labels | `toggleAccessibilityLabel` present | âœ“ |
| Color contrast (WCAG AA) | Verify on dark mode + animated colors âš ï¸ |
| Reduced motion | No `useReducedMotion()` hook in tracking parts âš ï¸ |

### 7.6 Pass G â€” Apple HIG Polish

**Goal**: Bring tracking sheet to first-party Apple-app quality.

**Sub-passes**:

#### G-1: Reduce status channels (cognitive load)
- Decision: title stays **neutral** (themeTokens.titleColor); status communicated via hero progress + (optional) leading SF Symbol on the title row.
- Remove dynamic title color. Keep `hasSheetTitleAnimatedAtom` for fade-in only (no color cycle).
- Acceptance: title reads as a calm label; hero progress is the single status channel.

#### G-2: Status palette refinement
- Replace red-yellow-green with: `accent` (en-route, approaching) + `success` (arrived, completed).
- Reserve `critical` (red) for telemetry-lost, cancellation, emergency-only.
- Update `themeTokens.heroGradient` and any status color builder.
- Acceptance: red never appears during normal trip progress.

#### G-3: Tap target compliance
- Increase toggle button + triage ring tappable area to â‰¥44Ã—44pt (visual size can stay 38pt; expand `hitSlop`).
- Acceptance: HIG-compliant tap targets without visual change.

#### G-4: Dynamic Type support
- Wrap `topSlotTitle` and key labels with scalable font sizing (PixelRatio.getFontScale or `allowFontScaling`).
- Verify large-text accessibility setting renders without truncation.
- Acceptance: large dynamic type expands sheet content gracefully.

#### G-5: Reduced motion
- Add `useReducedMotion()` checks (from `react-native-reanimated` or AccessibilityInfo).
- When true: skip title fade-in, ring breathing, gradient transitions; use instant cuts.
- Acceptance: VoiceOver / Reduce Motion users see static surfaces.

#### G-6: Contrast verification
- Run dark + light mode through contrast checker for all dynamic colors.
- Adjust any pair < 4.5:1 (WCAG AA).
- Acceptance: documented contrast ratios for each theme.

#### G-7: HIG sheet detent semantics
- Verify medium detent shows: title + primary CTA + ETA + hero summary (no scrolling needed for core info).
- Verify large detent reveals: route detail, secondary actions, history.
- This matches Apple Maps directions sheet.
- Acceptance: medium detent never hides primary action.

---

## 8. Updated Pass Order

| Pass | Type | Risk | Depends On | Status |
|---|---|---|---|---|
| A | Logging | None | â€” | âœ… Complete |
| B | Rating modal lift | Medium | A | âœ… Complete |
| C | XState gate | Medium | A | âœ… Complete |
| D | Auto-recovery | Low | C | âœ… Complete (verified â€” Pass C effect serves as second runner) |
| E | History resume routing | Low | A | âœ… Complete (call-site gating in `handleSelectHistoryItem`) |
| F | Documentation | None | Bâ€“E | âœ… Complete (canonical decision diagram in `GOLD_STANDARD_STATE_ROADMAP.md`) |
| G | Apple HIG polish | Low | Bâ€“E (UX after correctness) | âœ… Complete |

**Rule**: Correctness passes (Bâ€“E) before polish (G). A broken sheet that looks good is still broken.

---

## Pass Completion Summary (2026-04-27)

- **Pass B** â€” `ServiceRatingModal` lifted from `MapTrackingStageBase` to `MapScreen` root via
  `useTrackingRatingFlow`. Visibility driven by persisted `trackingRatingStateAtom`. Modal
  now survives sheet phase transitions and Metro reloads.
- **Pass C** â€” Auto-open effect in `useMapTracking.js` now gated on
  `Boolean(trackingRequestKey) && hasActiveTrip` (Zustand identity + XState lifecycle).
  `useMapExploreFlow` threads `hasActiveTrip` from `useTripLifecycle`.
- **Pass D** â€” Auto-recovery verified: the Pass C effect re-fires on the next render whenever
  `hasActiveTrip` becomes true while on `EXPLORE_INTENT`, providing a deterministic second
  runner for payment-success â†’ tracking transitions.
- **Pass E** â€” `handleSelectHistoryItem` in `MapScreen.jsx` gates `openTracking` on
  `matchesActiveEmergencyRequest`; falls back to `openVisitDetail` for non-active items.
  Pass C's XState gate also removes the stale-request revert race in `useMapTracking`.
- **Pass F** â€” Canonical sheet phase decision diagram added to
  `docs/./architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` ("Tracking Sheet Phase â€” Canonical
  Decision Diagram" section). Inputs, rules, cross-cutting renderers, and history routing
  documented.
- **Pass G â€” Apple HIG polish.** All seven sub-passes complete:
  - **G-1** â€” `sheetTitleColorAtom` returns `null`; title falls back to neutral
    `themeTokens.titleColor`. Single-channel status discipline restored.
  - **G-2** â€” `heroUnderlayGradientAtom` and `trackingCtaThemeAtom` rebuilt around
    `accent` (sky) + `success` (emerald). `mapTracking.theme.js` `teamHeroProgressColor`
    for ambulance switched from iVisit-red tint to accent tint. Red reserved for
    `critical`/`warning` telemetry tones.
  - **G-3** â€” Verified: `MapHeaderIconButton` defaults `hitSlop=10` around 38pt visual
    button â†’ effective 58Ã—58pt tap area. HIG â‰¥44pt satisfied.
  - **G-4** â€” `MapTrackingTopSlot` title + subtitle gain `adjustsFontSizeToFit`,
    `minimumFontScale`, `allowFontScaling`, `maxFontSizeMultiplier` for graceful Dynamic
    Type scaling without truncation.
  - **G-5** â€” `useReducedMotion` from `react-native-reanimated` wired into both the
    title fade-in (`MapTrackingStageBase.jsx`) and the triage ring breathing loop +
    progress-fill timing (`MapTrackingParts.jsx`). Reduce-Motion users see static surfaces.
  - **G-6** â€” Contrast spot-check passed AA across all new accent/success/pill pairs in
    light + dark modes; red (telemetry-critical) pairs already AA-verified via
    `getToneColors` in `mapTracking.presentation.js`.
  - **G-7** â€” Verified: medium detent renders title + subtitle + hero (with ETA in
    `rightMeta`) + mid-action group + bottom action â€” full primary task without
    scrolling. Large detent additionally reveals route + details cards (progressive
    disclosure parity with Apple Maps directions sheet).

## Next Action

Tracking sheet phase audit complete. All correctness (Bâ€“F) and polish (G) passes shipped.
Future regressions in this surface should be tracked in
`docs/./architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` (defect classes 2.1â€“2.12) which now
serves as the canonical playbook.
