---
status: living
owner: architecture
last_updated: 2026-05-10
---

# UX-B â€” Visual Hierarchy and Transition Discipline

**Priority:** MEDIUM â€” information correctness and motion quality
**Date:** 2026-05-10
**Status:** PLANNED â€” awaiting execution approval
**Depends on:** UX-A (review in sequence; shares `MapBedDecisionStageParts.jsx`)
**Blocks:** UX-C (OTP timing confirmed before payment CTA work; transition wrapper confirmed complete)

---

## Issues Addressed

| Issue | Title | Severity |
|-------|-------|----------|
| Issue 4 | Hospital Badges Lack Meaning and Hierarchy | ðŸŸ¡ Open |
| Issue 5 | Mixed Entity Data in Hospital Cards | ðŸŸ¡ Open |
| Issue 10 | OTP CTA Timing In Emergency Commit | ðŸ”´ Open |
| Issue 12 | Blank Frames and Ungraceful Sheet Transitions | ðŸŸ¡ Open |

---

## Mandatory Pre-Read

1. `docs/REFACTORING_GUARDRAILS.md` â€” `useEffect` decision tree, loading state rule ("preserve layout shell, show pending state, never blank")
2. `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` â€” defect class 2.1 (modal/surface gated on transient parent), 2.13 (cascading `useEffect` churn)
3. `docs/architecture/refactoring/REFACTORING_BIBLE.md` â€” business logic in helpers not in components

---

## Files Changed

| File | Change |
|------|--------|
| `components/map/surfaces/hospitals/mapHospitalDetail.helpers.js` (lines 141â€“155) | Reorder badge priority; add `accessibilityHint` per badge; `"Standard"` â†’ muted styling |
| `components/map/views/hospitalList/MapHospitalListContent.jsx` | Audit and remove network-total data from individual hospital rows |
| `components/map/views/exploreIntent/MapExploreIntentHospitalSummaryCard.jsx` | Audit and remove cross-entity data from summary card |
| `components/map/views/commitDetails/useMapCommitDetailsController.js` | OTP: fire API on CTA press, not after animation completes |
| `components/map/views/commitDetails/MapCommitDetailsStageParts.jsx` | CTA state machine: `idle â†’ pressed â†’ requesting â†’ ready â†’ failed` |
| `MapPhaseTransitionView` (or relevant wrapper) | Verify all phase transitions use existing wrapper; patch any direct swap paths |

---

## Issue 4 â€” Hospital Badges Lack Meaning and Hierarchy

**Live file:** `mapHospitalDetail.helpers.js` (lines 141â€“155) â€” `buildHospitalHeroBadges`

**Root cause:** `"Verified"` with `tone: "verified"` pushes first, then `emergencyLevel` (`"Level 2"`, `tone: "alert"`). Both render peer-weight. `"Standard bed"` (line 6 constant) appears without contextual explanation.

**Fix:**
```js
// PULLBACK NOTE: UX-B â€” badge priority reorder
// OLD: Verified first (trust signal), then emergencyLevel
// NEW: Decision-critical signals first, trust/quality last
// Order: emergencyLevel â†’ waitTime â†’ ETA â†’ distance â†’ Verified â†’ Standard

// Standard badge: muted/secondary styling only when hospital has no higher capability tier
// Verified badge: moved to end â€” it is a trust signal, not a decision signal
```

Per badge, add `accessibilityHint`:
```js
{ label: "Level 2", tone: "alert", accessibilityHint: "Level 2 emergency center â€” handles complex trauma" }
{ label: "Standard", tone: "secondary", accessibilityHint: "General-purpose facility â€” no specialty trauma designation" }
```

`"Standard"` badge: only render when the hospital has no higher capability tier (audit the tier logic). When rendered, use `tone: "secondary"` / muted styling â€” it signals absence of specialty, not a feature.

**Invariants:** Badge rendering component (`HospitalBadge` or equivalent) unchanged â€” only helper output order and styling tone change. No layout changes to the hospital card itself.

---

## Issue 5 â€” Mixed Entity Data in Hospital Cards

**Live files:** `MapExploreIntentHospitalSummaryCard.jsx`, `MapHospitalListContent.jsx`

**Root cause:** Hospital cards show network-level totals (`nearbyHospitalCount`, `totalAvailableBeds`, `nearbyBedHospitals`) alongside hospital-specific data. The card data boundary is not enforced.

**Fix â€” data boundary audit:**
```
Hospital cards (list rows + summary card): hospital-specific data ONLY
  âœ“ name, distance, ETA, rating, price tier, emergency level badge
  âœ— nearbyHospitalCount â€” remove
  âœ— totalAvailableBeds (across ecosystem) â€” remove
  âœ— nearbyBedHospitals count â€” remove

Network totals belong in:
  âœ“ explore intent orb subtexts
  âœ“ care intent summary section
  âœ— NOT inside individual hospital cards
```

Method: grep for `nearbyHospitalCount`, `totalAvailableBeds`, `nearbyBedHospitals` inside `MapExploreIntentHospitalSummaryCard.jsx` and `MapHospitalListContent.jsx` before editing. Remove only the renders inside card boundaries â€” not the data derivation itself (it's used elsewhere).

**Invariants:** No visual redesign of the card. Data removed, not replaced. Orb subtext section unchanged.

---

## Issue 10 â€” OTP CTA Timing In Emergency Commit

**Live files:** `MapCommitDetailsStageParts.jsx`, `useMapCommitDetailsController.js`

**Root cause:** OTP API fires after the CTA animation completes, adding animation duration to the OTP round-trip. The user sees the OTP input before the OTP email/SMS is actually sent.

**Fix â€” CTA state machine:**
```js
// PULLBACK NOTE: UX-B â€” OTP API early trigger
// OLD: OTP API call fires after CTA animation ceremony completes
// NEW: OTP API call fires immediately on CTA press in parallel with animation

// CTA state machine:
// idle â†’ pressed (haptic, animation starts) â†’ requesting (OTP call fires) â†’ ready (OTP sheet opens) â†’ failed/retry

// In useMapCommitDetailsController.js handleConfirmPress:
const handleConfirmPress = useCallback(async () => {
  setCTAState("pressed");           // haptic + animation start (no await)
  Haptics.impactAsync(...);
  startCTAAnimation();              // non-blocking
  setCTAState("requesting");
  const result = await sendOTPRequest(); // OTP fires HERE â€” parallel to animation
  setCTAState(result.ok ? "ready" : "failed");
  if (result.ok) openOTPSheet();
}, [...]);
```

`setCTAState` drives the UI in `MapCommitDetailsStageParts.jsx`. Not a `useEffect` â€” the call is a side effect on press (network), which belongs directly in the event handler per REFACTORING_GUARDRAILS `useEffect` decision tree.

**Animation compression:** CTA press animation duration reduced to â‰¤200 ms (from current value â€” audit). The OTP round-trip typically takes 300â€“600 ms, so the animation and network call overlap.

**Invariants:** OTP API call signature unchanged. OTP sheet open/close logic unchanged. Only the trigger timing and CTA state representation change.

---

## Issue 12 â€” Blank Frames and Ungraceful Sheet Transitions

**Live files:** `MapPhaseTransitionView`, all `*StageBase.jsx` files

**Root cause:** Not all phase changes route through `MapPhaseTransitionView`. Direct view swaps create a blank-frame flash between phases on web.

**Fix â€” transition contract audit:**

Required sheet phase transition paths and their wrapper status:

| Transition | Required wrapper | Status to confirm |
|---|---|---|
| `COMMIT_TRIAGE` â†’ `COMMIT_PAYMENT` | preserve shell, fade body | audit |
| `BED_DECISION` â†’ `COMMIT_DETAILS` | preserve shell, slide body | audit |
| `AMBULANCE_DECISION` â†’ `COMMIT_TRIAGE` | preserve shell | audit |
| Any phase â†’ any phase (web) | `MapPhaseTransitionView` in render tree | audit |

For each uncovered path: wrap the body content in `MapPhaseTransitionView` â€” do not create a new animated wrapper (TRACKING_SHEET_LEARNINGS defect class 2.1: surface gated on transient parent).

Loading states: audit all `isLoading` + blank body patterns. Per REFACTORING_GUARDRAILS Â§Loading State Rule: preserve layout shell, show skeleton rows, never blank white. Skeleton rows are already established in the explore intent surface â€” extend the pattern.

**Invariants:** Only add `MapPhaseTransitionView` where it is missing. Do not restructure existing animated paths. `MapPhaseTransitionView` API signature unchanged.

---

## Four-Track Declaration

| Track | Scope |
|-------|-------|
| State management | `useMapCommitDetailsController.js` â€” OTP call moved earlier in press handler. No new state layer. |
| UI quality | Badge reorder, muted Standard badge, cross-entity data removed, OTP CTA animation compressed, phase transitions graceful. |
| DRY / modular | Badge builder helpers remain in `mapHospitalDetail.helpers.js`. No new files unless a StageParts file crosses 950 lines. |
| Documentation | PULLBACK NOTE on each change. Pass log in `UX_ISSUES_SUBPASS_PLAN_2026-05-10.md Â§3` updated post-commit. |

---

## Guardrails Compliance

| Rule | How complied |
|------|-------------|
| Business logic in helpers | Badge reorder is a pure helper function change â€” no component restructure |
| OTP not in `useEffect` | Call is a direct event handler side effect (network on press) â€” not a derived value |
| Phase transition | Use existing `MapPhaseTransitionView` â€” no new animated wrapper |
| Loading state rule | Skeleton rows, never blank â€” same pattern as explore intent surface |

---

## Invariants (Must Not Change)

- Badge rendering component unchanged â€” only helper output order and tone change
- Hospital card visual layout unchanged â€” data removed, not redesigned
- OTP API call signature unchanged â€” timing only
- Phase transition wrapper: only add where missing, do not restructure existing animated paths
- `MapPhaseTransitionView` API unchanged

---

## Verification Checklist

- [ ] Badge order: emergencyLevel first, Verified last in `buildHospitalHeroBadges` output
- [ ] `"Standard"` badge: muted styling; hidden when hospital has higher capability tier
- [ ] `accessibilityHint` on each badge â€” confirmed with VoiceOver/TalkBack
- [ ] Hospital list rows: no `nearbyHospitalCount` / `totalAvailableBeds` rendered
- [ ] Summary card: no cross-entity data rendered
- [ ] OTP CTA: confirmed OTP API fires before animation completes (log timestamps)
- [ ] OTP CTA state machine: idle â†’ pressed â†’ requesting â†’ ready/failed (all states tested)
- [ ] Phase transitions: no blank frame between `COMMIT_TRIAGE` â†’ `COMMIT_PAYMENT` on web
- [ ] Phase transitions: no blank frame between `BED_DECISION` â†’ `COMMIT_DETAILS` on web
- [ ] All `isLoading` + blank body patterns replaced with skeleton rows
- [ ] PULLBACK NOTE on every structural change
- [ ] No new `useEffect` added without decision tree justification

---

## Navigation

â† [UX-A: Decision Surface Layout](./UX_A_DECISION_SURFACE_LAYOUT.md)
â†’ [UX-C: Payment Surface HIG Polish](./UX_C_PAYMENT_SURFACE.md)
