# Tracking Sheet Phase Audit — 2026-04-26

**Scope**: Tracking sheet UI/UX + ongoing-request flow + rating display + visit-details resume
**Status**: AUDIT — no code changes proposed yet
**Architecture**: 5-layer state (Realtime → Query → Zustand → XState → Jotai)

---

## 1. Architectural Reality (Current)

### 5 Layers In Place
| Layer | File | Owns | Status |
|---|---|---|---|
| Realtime | Supabase subscriptions | Server truth | ✅ |
| Query cache | TanStack Query (`useActiveTripQuery`) | Server sync, refetch | ✅ |
| Persistent state | Zustand `emergencyTripStore` | `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval` | ✅ persists |
| Trip lifecycle | XState `tripLifecycleMachine` + `useTripLifecycle` | `isIdle`, `isPendingApproval`, `isActive`, `isArrived`, `isCompleting`, `isCompleted`, `isRatingPending`, `hasActiveTrip` | ✅ exists |
| UI state | Jotai atoms (`mapScreenAtoms`) | sheet phase, snap state, rating modal, visualization | ✅ exists, partially wired |

### Key files
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\hooks\map\exploreFlow\useMapTracking.js:1-138` — auto-open effect, `openTracking`/`closeTracking`
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\hooks\map\exploreFlow\useMapExploreFlow.js:270-353` — composes tracking + commit flow
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\hooks\emergency\useTripLifecycle.js:1-165` — XState adapter
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\machines\tripLifecycleMachine.js:1-349` — lifecycle states
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\components\map\views\tracking\MapTrackingStageBase.jsx:33-592` — sheet body
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\components\map\views\tracking\useMapTrackingController.js:1-548` — actions + rating
- `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\screens\MapScreen.jsx:365-405` — visit-details resume, sheet phase consumers

---

## 2. Identified Defects

### 2.1 Explore-intent does not auto-render tracking on mount with ongoing request

**Symptom**: User has active trip → app cold start lands on `MAP_SHEET_PHASES.EXPLORE_INTENT` → tracking sheet never opens until user takes action.

**Root cause** (`useMapTracking.js:93-130`):
1. Effect depends on `trackingRequestKey` + `sheetPhase`
2. `trackingRequestKey` is `activeMapRequest.requestId` — derived from Zustand store
3. Zustand hydration is async (via `database.read` in `RootRuntimeGate`)
4. On first paint: `trackingRequestKey === null` → effect runs but skips
5. On hydration complete: store updates → re-render → effect fires
6. **BUT**: `trackingDismissedRef.current` is `false` AND `sheetPhase === EXPLORE_INTENT` → should open

**Likely actual cause**: `prevSheetPhaseRef.current === EXPLORE_INTENT` is initial value, but after hydration the sheet may have transitioned through other phases. Need to verify with logs.

**Secondary issue**: No XState `hasActiveTrip` listener at MapScreen level. If we were to use the lifecycle flag instead of `trackingRequestKey`, the gate would be cleaner: `if (hasActiveTrip && sheetPhase === EXPLORE_INTENT && !dismissed) openTracking()`.

### 2.2 Payment → tracking transition relies on single signal

**Symptom**: After payment success, sometimes tracking does not open.

**Root cause**: `useMapCommitFlow.finishCommitPayment` calls `openTracking()` directly. If Zustand store hasn't yet absorbed the trip data (TanStack invalidate may not have completed), the `openTracking` resolves the wrong hospital or no-ops in downstream guards.

**User's proposed fix** (correct): "double-run" — call `openTracking` after payment, AND also have a sheet-phase listener that opens tracking whenever `hasActiveTrip` becomes true and we are on EXPLORE_INTENT.

### 2.3 Visit-details resume tracking broken

**Symptom**: `handleHistoryItemSelect` (`MapScreen.jsx:365-395`) calls `openTracking?.()` for live items, but tracking does not open.

**Root cause**: `openTracking` in `useMapTracking.js:56-86` reads from `activeMapRequest.hospital`/`hospitalId`. If the user is selecting a historical item that does not match the currently-active trip in the store (e.g. the user opened visit details for an old trip), `activeMapRequest.requestId` is null → `setSheetView(buildTrackingSheetView(...))` runs, but `useMapTracking`'s effect at `:93-130` sees `!trackingRequestKey` and immediately reverts to EXPLORE_INTENT (`:101-105`).

**Fix path**: separate "resume from history" intent from "auto-open from active trip". History resume should hydrate the active trip into Zustand first (if it matches a live request), then trigger `openTracking`. If the visit is no longer live, history resume should open the visit detail sheet, not tracking.

### 2.4 Rating display fails outside tracking phase

**Symptom**: Trip completes → rating modal not shown.

**Root cause**: `<ServiceRatingModal />` is rendered inside `MapTrackingStageBase` (`MapTrackingStageBase.jsx:577-589`). `MapTrackingStageBase` only mounts when `sheetPhase === TRACKING`. When completion happens:
- If sheetPhase transitions away from TRACKING before the rating modal opens → modal unmounts immediately
- If user is not on the map at all (e.g. navigated to history) → modal never mounts

**Current partial fix attempt**: I made `trackingRatingStateAtom` persist (Phase 8). State survives, but the modal **renderer** is still gated on TRACKING phase.

**Real fix**: Lift the rating modal renderer to a level that survives sheet phase transitions — either `MapScreen` root, or even higher (a global rating overlay). Keep the state in Jotai (already done), drive visibility from `isRatingPending` (XState) + `trackingRatingStateAtom`.

### 2.X Hero card progress vs ambulance marker animation drift (noted, low priority)

**Symptom**: Hero card progress fill and the ambulance marker on the map are not pixel-coherent — they may show slightly different positions for the same instant.

**Root cause**:
- Hero card consumes `ambulanceTripProgress` (computed by `useTripProgress`) as a declarative width.
- Ambulance marker uses `useAmbulanceAnimation` which runs its own internal interpolation timer driven by `ambulanceTripEtaSeconds` + route coordinates.
- Both derive from the same upstream ETA + route, but compute progress independently → small drift accumulates.

**Defer to Pass G** (HIG polish). Not a correctness defect; only a visual coherence concern.

**Fix path** (when addressed): single source of truth for progress. Hero card and marker animation both read from one shared progress signal (Jotai `trackingProgressValueAtom`, already persisted), updated at one render tick.

---

### 2.5 Five-layer state not consistently applied to tracking

**Observation**: Tracking sheet today reads:
- Trip data: `activeMapRequest.raw.*` (props from `useMapExploreFlow`) — Zustand-backed ✅
- Lifecycle flags: `useEmergency().isArrived` — XState-backed ✅
- UI state: local `useState` + animated refs — partially Jotai ⚠️

The XState `hasActiveTrip` flag is **not used** to drive sheet auto-open. We rely on `trackingRequestKey` (raw Zustand). This works most of the time but bypasses the lifecycle machine, defeating the point of having it.

---

## 3. Pass Plan

> **Rule**: Complete + verify each pass before starting next. No batching.

### Pass A — Diagnostic logging (read-only, lowest risk)
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

### Pass B — Lift rating modal out of tracking sheet
**Goal**: Rating display works regardless of sheet phase.

**Actions**:
1. Move `<ServiceRatingModal />` from `MapTrackingStageBase` to `MapScreen` (or `MapSheetOrchestrator`).
2. Drive visibility from `trackingRatingStateAtom.visible` (already persisted).
3. `useMapTrackingController` keeps owning `closeRating`/`skipRating`/`submitRating` — but these are imported into `MapScreen` via a thin hook `useTrackingRatingModal()`.
4. Reset rating state to defaults inside `submitRating`/`skipRating` (already done in controller).

**Acceptance**: Trip completes → rating modal shows even if user navigated away from tracking sheet.

---

### Pass C — Use XState `hasActiveTrip` to gate auto-open
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

### Pass D — Sheet-phase listener as fallback for payment → tracking
**Goal**: "Double-run" so payment success never leaves user stranded.

**Actions**:
1. After payment, `finishCommitPayment` continues to call `openTracking()` directly (existing).
2. Pass C's effect now serves as the second runner: if payment-triggered openTracking fails (timing), the next render with `hasActiveTrip === true` re-triggers it.
3. No new effect needed — Pass C already provides it. Verify by deliberately delaying Zustand commit and confirming auto-recovery.

**Acceptance**: Payment success → tracking always opens within 1-2 render cycles.

---

### Pass E — Fix visit-details resume tracking
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
4. Drop the immediate revert in `useMapTracking.js:101-105` — that effect should not force-close tracking if `trackingRequestKey` becomes null mid-frame; let Zustand settle.

**Acceptance**: Resume-from-history opens tracking if and only if history item matches active trip; otherwise opens visit detail.

---

### Pass F — Sheet phase audit and document the canonical flow
**Goal**: Single source of truth for "what should happen when".

**Actions**:
1. Update `docs/architecture/GOLD_STANDARD_STATE_ROADMAP.md` (or new sibling doc) with a state diagram:
   - Inputs: XState lifecycle, Zustand store, sheet phase, payment events, history selection
   - Output: which sheet phase should be active
2. Add a single derived selector (Jotai `atom((get) => ...)`) that computes the desired sheet phase from these inputs. Use it as a debug overlay in dev to visualize divergence between desired and actual.

**Acceptance**: New devs can read one diagram and understand sheet phase transitions.

---

## 4. Out of Scope (Tracked Separately)

- Hero card visualization (gradient underlay, status pill, CTA muting) — **DONE** in Phase 8 polish
- Sheet title animation — **DONE**
- AM/PM removal — **DONE**
- Persistent tracking visualization storage — **DONE** (uses `database` abstraction + `StorageKeys.TRACKING_VISUALIZATION`)
- MapScreen 1,434-line decomposition — separate roadmap track
- `EmergencyContext` retirement Phase 6f+ — separate roadmap track

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

### 7.1 Visual Hierarchy — Current State

| Element | Apple Pattern | Current State | Verdict |
|---|---|---|---|
| Sheet handle | Single grabber, 36×5pt, system gray | Custom handle | ✓ Verify token alignment |
| Top slot title | Single weight, primary text color, breathing room | Animated status color | ⚠️ Color-as-status is loud; HIG prefers icon + neutral text |
| Subtitle | `.subheadline` muted | OK | ✓ |
| Status communication | SF Symbol + label OR pill in trailing | Hero gradient underlay + animated title color | ⚠️ Two parallel status channels (redundant) |
| Primary CTA | Filled, large, accent color | Bottom action button — green on completion | ✓ |
| Secondary CTAs | Tinted, grouped, neutral until contextually relevant | Mid-action group, muted on arrival | ✓ Matches HIG "calm by default, light up on context" |
| Sheet detents | Medium + Large, with smooth interpolation | Three snap states (collapsed/medium/expanded) | ✓ |
| Header chevron | System chevron, subtle | Now uses original token color | ✓ Fixed in last pass |

### 7.2 Motion Discipline — Current State

| Animation | HIG Principle | Current State | Verdict |
|---|---|---|---|
| Sheet open/close | Spring, 0.35s, damping ~28 | Native sheet animation | ✓ |
| Title color shift | Run **once** per status change, hold | Animates once via `hasSheetTitleAnimatedAtom` | ✓ Correct |
| Hero progress fill | Linear or eased, never bouncy on data | `TrackingTeamHeroCard` progress fill | ✓ |
| Triage ring breathing | Subtle pulse, ≤3% scale, ≤2s loop | 1.018× scale, 1.6s in/out | ✓ Within HIG envelope |
| Snap state transitions | Continuous, gesture-driven | Native | ✓ |
| Avoid | "Disco" effects, multiple simultaneous color shifts | Currently no violation | ✓ |

### 7.3 Cognitive Load — Apple Underpaid-App Test

**Question**: If a user glances at the sheet for 0.5s, do they know:
1. Are we tracking? (yes/no)
2. What stage? (en-route / approaching / arrived)
3. What's the next action? (single primary CTA)

**Current state**:
- (1) ✓ — sheet itself communicates tracking
- (2) ⚠️ — status communicated via title color + hero progress + (now removed) status pill. Three channels saying the same thing was overload. After our cleanup: title color + hero. Still 2 channels.
- (3) ✓ — bottom CTA is unambiguous

**HIG verdict**: After the status pill removal, we are within tolerance. **Recommendation**: pick ONE primary status channel. Apple Maps uses the hero card progress + a single SF Symbol; the title stays neutral. Consider neutralizing title color and letting the hero progress carry the status.

### 7.4 Emotional Calm — Premium Restraint

**Apple test**: Does the surface feel like a first-party Apple service or a startup demo?

**Areas of concern**:
- ✓ No decorative gradients on text
- ✓ No glowing borders
- ✓ No emoji in status
- ✓ Bottom action gradient is subtle (matches Apple Wallet pay button)
- ⚠️ Animated title color shift between phases — when red appears for "approaching", it feels alarming. HIG: red is reserved for destructive/critical alerts (cancel, emergency). For routine status progress, use accent color or neutral.
- ⚠️ Hero gradient could be a single tinted band rather than 3-stop red-yellow-green (which screams "traffic light")

**Recommendation**: Reduce status palette to 2 shades (en-route accent + arrived green). Remove red entirely from non-emergency phases. Map "critical" red only to telemetry-lost / true emergency.

### 7.5 Accessibility — HIG Mandatory

| Requirement | Current State |
|---|---|
| Tap targets ≥ 44×44 pt | Toggle/triage ring buttons 38pt — **below minimum** ⚠️ |
| Dynamic Type support | Sheet title fixed at 22pt — no scaling ⚠️ |
| VoiceOver labels | `toggleAccessibilityLabel` present | ✓ |
| Color contrast (WCAG AA) | Verify on dark mode + animated colors ⚠️ |
| Reduced motion | No `useReducedMotion()` hook in tracking parts ⚠️ |

### 7.6 Pass G — Apple HIG Polish

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
- Increase toggle button + triage ring tappable area to ≥44×44pt (visual size can stay 38pt; expand `hitSlop`).
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
| A | Logging | None | — | ✅ Complete |
| B | Rating modal lift | Medium | A | ✅ Complete |
| C | XState gate | Medium | A | ✅ Complete |
| D | Auto-recovery | Low | C | ✅ Complete (verified — Pass C effect serves as second runner) |
| E | History resume routing | Low | A | ✅ Complete (call-site gating in `handleSelectHistoryItem`) |
| F | Documentation | None | B–E | ✅ Complete (canonical decision diagram in `GOLD_STANDARD_STATE_ROADMAP.md`) |
| **G** | **Apple HIG polish** | **Low** | **B–E (UX after correctness)** | 🔜 Next |

**Rule**: Correctness passes (B–E) before polish (G). A broken sheet that looks good is still broken.

---

## Pass Completion Summary (2026-04-27)

- **Pass B** — `ServiceRatingModal` lifted from `MapTrackingStageBase` to `MapScreen` root via
  `useTrackingRatingFlow`. Visibility driven by persisted `trackingRatingStateAtom`. Modal
  now survives sheet phase transitions and Metro reloads.
- **Pass C** — Auto-open effect in `useMapTracking.js` now gated on
  `Boolean(trackingRequestKey) && hasActiveTrip` (Zustand identity + XState lifecycle).
  `useMapExploreFlow` threads `hasActiveTrip` from `useTripLifecycle`.
- **Pass D** — Auto-recovery verified: the Pass C effect re-fires on the next render whenever
  `hasActiveTrip` becomes true while on `EXPLORE_INTENT`, providing a deterministic second
  runner for payment-success → tracking transitions.
- **Pass E** — `handleSelectHistoryItem` in `MapScreen.jsx` gates `openTracking` on
  `matchesActiveEmergencyRequest`; falls back to `openVisitDetail` for non-active items.
  Pass C's XState gate also removes the stale-request revert race in `useMapTracking`.
- **Pass F** — Canonical sheet phase decision diagram added to
  `docs/architecture/GOLD_STANDARD_STATE_ROADMAP.md` ("Tracking Sheet Phase — Canonical
  Decision Diagram" section). Inputs, rules, cross-cutting renderers, and history routing
  documented.

## Next Action

**Pass G — Apple HIG polish.** Begin with G-1 + G-2 (status channel reduction + palette
refinement): neutralize sheet title color, replace red-yellow-green with accent + success,
reserve red exclusively for critical/emergency states.
