---
status: living
owner: architecture
last_updated: 2026-05-10
---

# UX-A â€” Decision Surface Layout

**Priority:** HIGH â€” user-facing layout and information hierarchy
**Date:** 2026-05-10
**Status:** PLANNED â€” awaiting execution approval
**Depends on:** nothing (first pass)
**Blocks:** UX-B (shares `MapBedDecisionStageParts.jsx`; review in sequence to avoid conflicts)

---

## Issues Addressed

| Issue | Title | Severity |
|-------|-------|----------|
| Issue 1 | Triage Questions Pre-Selected | ðŸ”´ Open |
| Issue 2 | Room Card Layout in HALF Snap | ðŸ”´ Open |
| Issue 3 | Saved Transport Card Bleeds Into Bed Decision | ðŸ”´ Open |
| Issue 6 | Transport Screen Weak Hierarchy | ðŸŸ¡ Open |
| Issue 7 | Transport Details Truncated Across Cards | ðŸŸ¡ Open |
| Â§1.5 | MapTopLeftControl Back-Nav (architectural) | ðŸ”´ Open |

---

## Mandatory Pre-Read

Before touching any file in this pass:

1. `docs/REFACTORING_GUARDRAILS.md` â€” `useEffect` decision tree, subsequent pass rule
2. `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` â€” defect class 2.14 (terminal state not locked)
3. `docs/architecture/refactoring/REFACTORING_BIBLE.md` â€” Commandment 2 (no anonymous function props), Commandment 8 (baseline hash before monolith edit)
4. `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` â€” `MapScreen.jsx` stays thin

---

## Files Changed

| File | Change |
|------|--------|
| `screens/MapScreen.jsx` | `topLeftControlVisible` â€” phase-aware logic; `isDecisionPhase` derived inline; `onBack` prop for decision phases |
| `components/map/views/shared/MapTopLeftControl.jsx` | Add `isDecisionPhase` prop; update icon + handler branch; update `accessibilityLabel` |
| `components/map/views/commitTriage/useMapCommitTriageController.js` | Add `isFreshSession` guard â€” empty draft on fresh open, restore only on resume |
| `components/map/views/commitTriage/mapCommitTriage.helpers.js` | Add `buildFreshTriageDraft()` helper â€” returns empty dict keyed to step IDs |
| `components/map/views/bedDecision/MapBedDecisionStageBase.jsx` | HALF snap: RouteCard â†’ EXPANDED-only; SavedTransportCard â†’ status strip |
| `components/map/views/bedDecision/MapBedDecisionStageParts.jsx` | Add `MapBedDecisionTransportStatusStrip` compact inline row as named export |
| `components/map/views/ambulanceDecision/MapAmbulanceDecisionStageParts.jsx` | Switch pills: 2-line label allow; hero description: 3-line cap + "more" affordance |
| `components/map/views/ambulanceDecision/mapAmbulanceDecision.content.js` | Audit title copy â€” task language `"Select Transportation"` |
| `components/map/views/bedDecision/mapBedDecision.content.js` | Audit sheet title copy â€” `"Choose Your Room"` |

---

## Issue 1 â€” Triage Questions Pre-Selected

**Live file:** `components/map/views/commitTriage/useMapCommitTriageController.js`

**Root cause:** `initialDraft` reads from an 11-source fallback chain. On fresh flows, if `activeAmbulanceTrip` is populated from a prior session (cold-start restore / C-4 deferred), the chain falls through to trip-level triage, seeding stale answers. `useState(initialDraft)` then starts the form pre-filled; `getFirstOpenCommitTriageStepId` skips already-answered steps.

**Fix:**
```js
// PULLBACK NOTE: UX-A â€” fresh triage initialization
// OLD: initialDraft populated from 11-chain fallback (includes trip-level triage)
// NEW: when isFreshSession, initialDraft forced to null â€” options start neutral

const isFreshSession =
  !payload?.triageDraft || payload?.requestId !== activeAmbulanceTrip?.id;

const initialDraft = isFreshSession
  ? null
  : (payload?.triageDraft ?? /* ...existing chain... */ null);
```

Two init modes:
- **Resume:** `payload?.triageDraft` exists AND `payload?.requestId` matches an active trip â†’ restore draft and step position
- **Fresh:** no `triageDraft` or no matching `requestId` â†’ always `null`, always step 0

Add `buildFreshTriageDraft()` helper in `mapCommitTriage.helpers.js` â€” returns `{}` keyed to step IDs â€” for the reset path in the existing session-key effect.

**Invariants:**
- Step progression, live save, copilot prompt logic â€” entirely untouched
- CTA in `MapCommitTriageStageParts.jsx` must stay disabled until user actively selects an option for the current step â€” audit existing guard, do not remove it

---

## Issue 2 â€” Room Card Layout in HALF Snap

**Live files:** `MapBedDecisionStageBase.jsx` (lines 345â€“465), `MapBedDecisionStageParts.jsx`

**Root cause:** HALF snap renders four information clusters simultaneously: Hero, SavedTransportCard (full glass panel), RoomSwitchRow, and RouteCard. The RouteCard at line 429 is in the HALF else branch â€” always present â€” adding a second substantial card before the footer.

**HALF snap target:**
- Hero card
- Transport status strip (compact, not full card) â€” see Issue 3
- RoomSwitchRow
- "Show more" expand affordance (chevron + muted copy)

**EXPANDED snap target (unchanged):**
- Hero, SwitchRow (or `MapBedDecisionExpandedRoomChoices`), RouteCard, DetailsCard â€” full depth

**Implementation:**
```js
// PULLBACK NOTE: UX-A â€” RouteCard moved to EXPANDED-only
// OLD: RouteCard rendered in HALF else branch (line 429)
// NEW: RouteCard wrapped in isExpanded guard
{isExpanded && <MapBedDecisionRouteCard ... />}
```

Add "expand for more" affordance in HALF: a single `<TouchableOpacity>` below SwitchRow with `chevron-down` icon and `"More details"` caption in `secondaryText` style. Tap â†’ `onExpandSheet()`. Not a new component â€” inline JSX, <30 lines.

---

## Issue 3 â€” Saved Transport Card Bleeds Into Bed Decision

**Live files:** `MapBedDecisionStageBase.jsx` (lines 357â€“371), `MapBedDecisionStageParts.jsx` (lines 551â€“629)

**Root cause:** `MapBedDecisionSavedTransportCard` renders a full glass panel card (same visual weight as Hero) when `careIntent === "both"`. Two full-weight cards compete for attention.

**Fix â€” replace full card with `MapBedDecisionTransportStatusStrip`:**
```jsx
// PULLBACK NOTE: UX-A â€” SavedTransportCard demoted to status strip in HALF snap
// OLD: <MapBedDecisionSavedTransportCard /> â€” full glass panel in HALF
// NEW: <MapBedDecisionTransportStatusStrip /> â€” compact inline row in HALF
//      Full card preserved in EXPANDED via {isExpanded && <MapBedDecisionSavedTransportCard />}

// MapBedDecisionTransportStatusStrip (new named export in StageParts):
// - Icon: Ionicons `checkmark-circle` (14pt) in `successTint`
// - Copy: "Ambulance confirmed â€” [tier name]" in `caption` style
// - No glass panel container â€” inline row only
// - Tappable in HALF: onPress â†’ navigates back to ambulance decision (secondary affordance)
// - In micro-compact (pill mode): icon + 1-line label only, no onPress affordance
```

`MapBedDecisionSavedTransportCard` full card: preserved and rendered in EXPANDED snap. Not deleted.

**If `MapBedDecisionStageParts.jsx` exceeds 950 lines after addition:** extract `MapBedDecisionTransportStatusStrip` into `mapBedDecision.transportStrip.jsx` as a named export file.

---

## Issues 6 + 7 â€” Transport Hierarchy and Truncation

**Live files:** `MapAmbulanceDecisionStageBase.jsx`, `MapAmbulanceDecisionStageParts.jsx` (lines 266â€“335)

**Root cause:** Switch pills use `numberOfLines={1}` â€” truncates tier names. Hero description uses `numberOfLines={2}` â€” truncates service detail. Sheet title not audited against task language.

**Fixes (combined â€” same files):**
```js
// PULLBACK NOTE: UX-A â€” switch pill + hero description line cap adjustment
// OLD: numberOfLines={1} on pills, numberOfLines={2} on hero description
// NEW: numberOfLines={2} on pills (long tier names), numberOfLines={3} on hero description
//      + "See full details â†’" link when description is actually truncated (onTextLayout)
```

Sheet title: audit `mapAmbulanceDecision.content.js` â€” confirm or update to `"Select Transportation"`.
Bed decision sheet title: audit `mapBedDecision.content.js` â€” confirm or update to `"Choose Your Room"`.

No accordion expansion of non-selected pills â€” existing pattern is correct and must not change.

---

## Â§1.5 â€” MapTopLeftControl Back-Nav

**Live files:** `screens/MapScreen.jsx` (line 597â€“605), `components/map/views/shared/MapTopLeftControl.jsx`

**Root cause:** `visible` condition is unauthenticated-only. Authenticated users have no back affordance in decision phases.

**Phase-aware visibility:**
```js
// PULLBACK NOTE: UX-A â€” MapTopLeftControl back-nav expanded to authenticated users in decision phases
// OLD: visible only for unauthenticated users in EXPLORE_INTENT
// NEW: visible for authenticated users in AMBULANCE_DECISION, BED_DECISION, HOSPITAL_LIST, HOSPITAL_DETAIL
//      Hidden entirely in commit + tracking phases

const isDecisionPhase =
  sheetPhase === MAP_SHEET_PHASES.AMBULANCE_DECISION ||
  sheetPhase === MAP_SHEET_PHASES.BED_DECISION ||
  sheetPhase === MAP_SHEET_PHASES.HOSPITAL_LIST ||
  sheetPhase === MAP_SHEET_PHASES.HOSPITAL_DETAIL;

const topLeftControlVisible =
  !mapLoadingState?.visible &&
  (!isSignedIn
    ? !hasFocusedSheetPhase        // unauthenticated: EXPLORE_INTENT only
    : isDecisionPhase);            // authenticated: decision phases only
```

Component update (one new boolean prop):
```js
// PULLBACK NOTE: UX-A â€” authenticated back chevron in decision phases
// OLD: isSignedIn ? onOpenProfile() : onBack()
// NEW: (isSignedIn && !isDecisionPhase) ? onOpenProfile() : onBack()
const showAvatar = isSignedIn && !isDecisionPhase && profileImageSource;
const showBack = !isSignedIn || isDecisionPhase;
```

`accessibilityLabel` update: `"Back to map"` when `isDecisionPhase`, `"Open profile"` otherwise.

`handleDecisionBack`: extracted as `useCallback` in `MapScreen.jsx` â€” calls `buildExploreIntentSheetView()` or `closeDecisionPhase()` per the existing pattern in `useMapCommitFlow.js`. No anonymous function in prop.

**Safety invariant â€” WAITING_APPROVAL cannot be bypassed:** `COMMIT_PAYMENT` is explicitly excluded from `isDecisionPhase`. The PT-C fix is not touched. The chrome button is hidden in all commit phases.

---

## Four-Track Declaration

| Track | Scope |
|-------|-------|
| State management | `useMapCommitTriageController.js` â€” initialization path only. `isDecisionPhase` derived inline â€” not `useEffect` (REFACTORING_GUARDRAILS: derived value â†’ inline const). |
| UI quality | MapTopLeftControl back chevron in decision phases. Bed HALF snap: Hero + strip + SwitchRow. Transport pills: 2-line. Transport status strip replaces full card in HALF. |
| DRY / modular | `MapBedDecisionTransportStatusStrip` as named export. Extract to sub-file if StageParts >950 lines. No inline lambda props (REFACTORING_BIBLE Commandment 2). |
| Documentation | PULLBACK NOTE on every structural change. Pass log in `UX_ISSUES_SUBPASS_PLAN_2026-05-10.md Â§3` updated post-commit. |

---

## Guardrails Compliance

| Rule | How complied |
|------|-------------|
| `MapScreen.jsx` stays thin | `isDecisionPhase` is two derived lines â€” not business logic |
| WAITING_APPROVAL lock not bypassed | `COMMIT_PAYMENT` excluded from `isDecisionPhase` (TRACKING_SHEET_LEARNINGS 2.14) |
| No `useEffect` for phase-aware visibility | Derived from `sheetPhase` prop already in scope |
| No anonymous functions in props | `handleDecisionBack` extracted as `useCallback` |
| Triage `isFreshSession` guard | Applied in `useMemo` initialization, not as `useEffect` side effect |

---

## Invariants (Must Not Change)

- `MapBedDecisionSavedTransportCard` full-card preserved and rendered in EXPANDED â€” not deleted
- No removal of `careIntent === "both"` logic â€” visual scope reduced in HALF only
- Triage step progression, live save, copilot prompt logic â€” entirely untouched
- `MapTopLeftControl` unauthenticated â†’ Welcome behaviour â€” unchanged
- No network calls added or changed in any UX-A file
- `isCommitPaymentDismissibleState` not touched (PT-C)
- `awaitingApprovalRef` pattern not touched (PT-C)

---

## Verification Checklist

- [ ] HALF snap visual: Hero + compact transport strip + SwitchRow visible; no full RouteCard
- [ ] EXPANDED snap: RouteCard + DetailsCard visible; full SavedTransportCard visible
- [ ] Triage fresh open: all options neutral, step 0, CTA disabled
- [ ] Triage resume (matching requestId + triageDraft): prior answers restored, step restored
- [ ] `MapTopLeftControl` â€” authenticated in `AMBULANCE_DECISION`: back chevron visible, returns to EXPLORE_INTENT
- [ ] `MapTopLeftControl` â€” authenticated in `COMMIT_PAYMENT`: control hidden entirely
- [ ] `MapTopLeftControl` â€” authenticated in `EXPLORE_INTENT`: avatar visible, opens profile
- [ ] `MapTopLeftControl` â€” unauthenticated in `EXPLORE_INTENT`: back chevron â†’ `/(auth)/` (regression guard)
- [ ] Switch pill labels: tier names not clipped at 1 line
- [ ] Hero description: 3-line cap in place
- [ ] Sheet titles: `"Select Transportation"` and `"Choose Your Room"` confirmed
- [ ] No new `useEffect` added â€” any added must be justified against decision tree
- [ ] `MapBedDecisionStageParts.jsx` line count checked â€” if >950, extract transport strip
- [ ] PULLBACK NOTE on every structural change

---

## Navigation

â† [README](./README.md)
â†’ [UX-B: Visual Hierarchy and Transition Discipline](./UX_B_VISUAL_HIERARCHY.md)

---

## Reconciliation Note - 2026-05-24

> Appended during the 2026-05-24 docs update sweep (Pass 4 - UX passes batch). The pass plan body above documents the intended changes. This note records the shipped state against current HEAD; the header "Status: PLANNED" is now outdated.

**Status: SHIPPED** - all planned changes verified in code.

**Shipped evidence**

- **Issue 1 (Triage pre-selected) - fresh-session guard** - Shipped in `components/map/views/commitTriage/useMapCommitTriageController.js` (`isFreshSession` references confirmed). Step progression / live save preserved.
- **Issue 2 / 3 (Bed HALF snap + transport strip)** - `MapBedDecisionTransportStatusStrip` shipped as a named export in `MapBedDecisionStageParts.jsx` and consumed by `MapBedDecisionStageBase.jsx`. Full `MapBedDecisionSavedTransportCard` preserved for EXPANDED snap per plan invariant.
- **Issues 6 / 7 (Transport hierarchy + truncation)** - Audit lives in `MapAmbulanceDecisionStageParts.jsx`; switch-pill / hero line caps applied. Sheet title constants live in `mapAmbulanceDecision.content.js` / `mapBedDecision.content.js`.
- **Section 1.5 (MapTopLeftControl back-nav)** - `isDecisionPhase` derived in `screens/MapScreen.jsx` and threaded into `components/map/views/shared/MapTopLeftControl.jsx`. `COMMIT_PAYMENT` correctly excluded - PT-C lock preserved.

**Carryforward** - none. If a UX regression surfaces, re-run the verification checklist in the body above.
