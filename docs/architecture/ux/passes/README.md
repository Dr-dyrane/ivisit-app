---
status: living
owner: architecture
last_updated: 2026-05-10
---

# UX Issues â€” Pass Index

**Source plan:** [../UX_ISSUES_SUBPASS_PLAN_2026-05-10.md](../UX_ISSUES_SUBPASS_PLAN_2026-05-10.md)
**Source issue register:** [../IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md](../IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md)
**Carries forward from:** `PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md` deferred items C-1 through C-6

---

## Guiding Principle

The map surface is persistent, the sheet changes mode, chrome floats above both. No pass may break that contract.

---

## Pass Table

| Pass | Track | Title | Issues | Priority | Status |
|------|-------|-------|--------|----------|--------|
| [UX-A](./UX_A_DECISION_SURFACE_LAYOUT.md) | Frontend / Layout | Decision Surface Layout | 1, 2, 3, 6, 7, Â§1.5 | **HIGH** | PLANNED |
| [UX-B](./UX_B_VISUAL_HIERARCHY.md) | Frontend / Quality | Visual Hierarchy + Transition Discipline | 4, 5, 10, 12 | MEDIUM | PLANNED |
| [UX-C](./UX_C_PAYMENT_SURFACE.md) | Frontend / Payment | Payment Surface HIG Polish | 8, C-5, C-6/PT-7, C-6/PT-11, C-6/UX-5, C-6/UX-6 | **HIGH** | PLANNED |
| [UX-D](./UX_D_STATE_LAYER.md) | State / Architecture | State Layer Completion | 9, C-1, C-2, C-3, C-4 | MEDIUM | PLANNED |
| [UX-E](./UX_E_LOCATION_SHEET.md) | Frontend / Location | LocationSheet + Mini Profile | 11 | LOW | DEFERRED |

---

## Pass Order and Dependencies

```
UX-A (layout, triage)
  â†“
UX-B (hierarchy, transitions)   â† review in sequence with A; shares some files
  â†“
UX-C (payment polish)           â† must catalogue isSubmitting consumers for D
  â†“
UX-D (state architecture)       â† highest blast radius; do last in main sequence
  â†“
UX-E (location â€” blocked)       â† unblocks only after Location passes ship
```

UX-A and UX-B may be worked in parallel on non-overlapping file sets but must be reviewed in sequence before merge.

---

## Issue-to-Pass Map

| Issue | Title | Pass |
|-------|-------|------|
| 1 | Triage Questions Pre-Selected | UX-A |
| 2 | Room Card Layout in HALF Snap | UX-A |
| 3 | Saved Transport Card Bleeds Into Bed Decision | UX-A |
| 4 | Hospital Badges Lack Meaning and Hierarchy | UX-B |
| 5 | Mixed Entity Data in Hospital Cards | UX-B |
| 6 | Transport Screen Weak Hierarchy | UX-A |
| 7 | Transport Details Truncated Across Cards | UX-A |
| 8 | Payment Progression CTA | UX-C |
| 9 | Navigation Stack Resets State | UX-D |
| 10 | OTP CTA Timing In Emergency Commit | UX-B |
| 11 | Mini Profile Needs Address Entry Point | UX-E (deferred) |
| 12 | Blank Frames and Ungraceful Sheet Transitions | UX-B |
| Â§1.5 | MapTopLeftControl Back-Nav | UX-A |

---

## Deferred Item Assignments

| ID | Description | Pass |
|----|-------------|------|
| C-1 / PT-B | TanStack Query migration for payment methods + cost | UX-D |
| C-2 / CV-2 | Remove `isSubmitting` boolean | UX-D |
| C-3 / PT-4 | Atomic `transitionPendingToActive` Zustand action | UX-D |
| C-4 / PT-3 | `commitFlow` â†’ Jotai atom | UX-D |
| C-5 / EC-2 | Ghost settlement path â€” `FINALIZING_DISPATCH` UI surface | UX-C |
| C-6 / PT-7 | Stable display ID â€” `useRef` per mount | UX-C |
| C-6 / PT-11 | `"8 mins"` fabricated ETA fallback | UX-C |
| C-6 / UX-5 | Wallet method shown disabled with balance caption | UX-C |
| C-6 / UX-6 | CTA label Dynamic Type truncation | UX-C |

---

## Pre-Flight Line Count

Files that are already near or over architecture limits before any pass begins:

| File | Lines | Target | Status |
|------|-------|--------|--------|
| `MapBedDecisionStageParts.jsx` | 899 | max 450 | ðŸš¨ Exceeds |
| `MapAmbulanceDecisionStageParts.jsx` | 746 | max 450 | ðŸš¨ Exceeds |
| `MapCommitPaymentStageParts.jsx` | 898 | max 450 | ðŸš¨ Exceeds |
| `useMapCommitTriageController.js` | 603 | max 300 | ðŸš¨ Exceeds |
| `MapBedDecisionStageBase.jsx` | 467 | max 500 | âš ï¸ Near limit |

**Extraction rule:** If any UX-A/B/C change pushes a StageParts file past 950 lines, extract the new component into a named sub-file. Do not create standalone files for pure style extractions.

---

## Ground Truth â€” Already Done

These items are shipped. Do not re-touch.

| Item | Status |
|------|--------|
| PT-6: `WAITING_APPROVAL` removed from `isCommitPaymentDismissibleState` | âœ… DONE (PT-C) |
| PT-6: `awaitingApprovalRef` prevents `finally` reset | âœ… DONE (PT-C) |
| PT-2: `finishCommitPayment` â†’ `openTracking()` unconditionally | âœ… DONE (PT-E) |
| PT-D: `paymentAtoms` wired | âœ… DONE (PT-D) |
| PT-B2: Scalar deps fix for `loadCost` / `refreshPaymentMethodSnapshot` | âœ… DONE (PT-B2) |
| PT-12: Double `updateVisit` collapsed to single `MONITORING` write | âœ… DONE (PT-G) |
| ETA null guard in `useRequestFlow.js` | âœ… DONE (PT-G) |
| Explore Intent haptics, `reduceMotion`, skeleton, accessibility (HIG Passes Aâ€“D) | âœ… DONE |

---

## File Map

```
docs/architecture/ux/passes/
  README.md                           â† this file
  UX_A_DECISION_SURFACE_LAYOUT.md     â† Issues 1, 2, 3, 6, 7, Â§1.5
  UX_B_VISUAL_HIERARCHY.md            â† Issues 4, 5, 10, 12
  UX_C_PAYMENT_SURFACE.md             â† Issue 8, C-5, C-6 items
  UX_D_STATE_LAYER.md                 â† Issue 9, C-1 through C-4
  UX_E_LOCATION_SHEET.md              â† Issue 11 (deferred)
```
