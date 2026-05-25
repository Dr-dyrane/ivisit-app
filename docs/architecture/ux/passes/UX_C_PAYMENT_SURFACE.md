---
status: living
owner: architecture
last_updated: 2026-05-10
---

# UX-C â€” Payment Surface HIG Polish

**Priority:** HIGH â€” carries forward patient-safety-adjacent deferred items
**Date:** 2026-05-10
**Status:** PLANNED â€” awaiting execution approval
**Depends on:** UX-B (confirms no new `isSubmitting` consumers revealed by OTP state machine before UX-D removes it)
**Blocks:** UX-D (must catalogue all `isSubmitting` consumers before UX-D removes the boolean)

---

## Issues and Deferred Items Addressed

| ID | Title | Source | Severity |
|----|-------|--------|----------|
| Issue 8 | Payment Progression CTA â€” sticky + label | Issue Register | ðŸŸ¡ Open |
| C-5 / EC-2 | Ghost settlement path â€” `FINALIZING_DISPATCH` UI surface | Pre-tracking deferred | HIGH |
| C-6 / PT-7 | Stable display ID â€” `useRef` per mount not `Math.random()` | Pre-tracking deferred | HIGH |
| C-6 / PT-11 | `"8 mins"` fabricated ETA fallback | Pre-tracking deferred | HIGH (patient safety) |
| C-6 / UX-5 | Wallet method shown disabled with balance caption | Pre-tracking deferred | HIGH |
| C-6 / UX-6 | CTA label Dynamic Type truncation | Pre-tracking deferred | MEDIUM |

---

## Mandatory Pre-Read

1. `docs/REFACTORING_GUARDRAILS.md` â€” Loading State Rule ("preserve layout shell, show pending state, never blank")
2. `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` â€” defect class 2.1 (surface gated on transient parent), 2.14 (terminal state not locked)
3. `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` â€” LocationSheet sticky footer pattern; sheet snapping contract

---

## Files Changed

| File | Change |
|------|--------|
| `components/map/views/commitPayment/MapCommitPaymentStageParts.jsx` | Move terminal CTA to sticky footer outside scroll body |
| `components/map/views/commitPayment/MapCommitPaymentStageParts.jsx` | Add `FINALIZING_DISPATCH` UI surface |
| `components/map/views/commitPayment/MapCommitPaymentStageParts.jsx` | Wallet row: disabled state with balance caption |
| `components/map/views/commitPayment/mapCommitPayment.content.js` | Audit CTA label constants â€” task language |
| `components/map/views/commitPayment/useMapCommitPaymentController.js` | Stable display ID: `useRef` per mount (PT-7) |
| `components/map/views/commitPayment/mapCommitPayment.helpers.js` | Remove `"8 mins"` fallback ETA â€” return `null` (PT-11) |
| `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx` | ETA display: handle `null` â†’ `"Calculatingâ€¦"` or omit pill |

---

## Issue 8 â€” Payment CTA Sticky Footer

**Root cause:** `EntryActionButton` (the terminal payment CTA) sits inside the scroll body of `MapCommitPaymentSummaryCard`. In HALF snap on non-sidebar layouts the card content is long enough that the CTA falls below the visible scroll viewport. User cannot see the CTA without scrolling.

**Fix â€” extract to sticky footer:**
```jsx
// PULLBACK NOTE: UX-C â€” payment CTA moved to sticky footer outside scroll body
// OLD: EntryActionButton inside MapCommitPaymentSummaryCard scroll body
// NEW: EntryActionButton in MapCommitPaymentStageBase sticky footer slot

// In MapCommitPaymentStageBase.jsx:
// Prop thread: canConfirm, primaryActionTitle, onSubmit up from StageParts to StageBase
// StageBase renders EntryActionButton in a fixed-position footer below the scrollable area
// This matches the LocationSheet guardrail rule for all terminal CTAs
```

**If `MapCommitPaymentStageParts.jsx` exceeds 950 lines** after this change: extract `MapCommitPaymentStickyFooter` as a named export in a sub-file `mapCommitPayment.stickyFooter.jsx`. Current count: 898 lines â€” watch the threshold.

**Invariants:** `EntryActionButton` is the same primitive. Prop threading only goes up to StageBase â€” no new state layer. `isCommitPaymentDismissibleState` not touched (PT-C protection).

---

## C-5 / EC-2 â€” `FINALIZING_DISPATCH` UI Surface

**Root cause:** Ghost settlement path: payment processes successfully but the Supabase edge function response is delayed or times out. `submissionState.kind === "FINALIZING_DISPATCH"` is already a valid state constant but has no dedicated UI surface. The user sees a frozen/spinning CTA with no explanation.

**Fix:**
```jsx
// PULLBACK NOTE: UX-C â€” FINALIZING_DISPATCH UI surface added
// OLD: no UI branch for FINALIZING_DISPATCH â€” CTA appears frozen
// NEW: dedicated surface: "Payment sent â€” confirming dispatch"

// In MapCommitPaymentStageBase.jsx:
// Rendered at the StageBase level (not inside a child card that can unmount â€” defect class 2.1)
{submissionState.kind === "FINALIZING_DISPATCH" && (
  <MapCommitPaymentFinalizingView
    title="Payment confirmed"
    subtitle="Confirming your dispatch â€” this may take a moment"
    // Non-retryable: no CTA, no dismiss affordance
  />
)}
```

`FINALIZING_DISPATCH` is already in `MAP_COMMIT_PAYMENT_TRANSACTION_STATES` â€” no state machine changes. The surface is purely additive.

**Invariant:** This surface must be rendered at StageBase level, not inside a scrollable card. Unmounting risk = user sees blank during ghost settlement.

---

## C-6 / PT-7 â€” Stable Display ID

**Root cause:** `Math.random()` is called per submit to generate a display confirmation ID. On every retry or re-render, a new random ID appears â€” the user sees a different number each time.

**Fix:**
```js
// PULLBACK NOTE: UX-C â€” display ID stabilized with useRef
// OLD: displayId = Math.random().toString(36).slice(2) called per submit
// NEW: displayId = useRef(generateStableId()).current â€” initialized once per mount

// In useMapCommitPaymentController.js:
const displayIdRef = useRef(generateStableId());
// displayIdRef.current is stable across all re-renders and retries for this mount
```

`generateStableId()` is the same logic as before â€” moved into a one-time call. `useRef` initialized inline â€” not a `useEffect` (per REFACTORING_GUARDRAILS: ref â†’ assign inline, not in effect).

---

## C-6 / PT-11 â€” Remove Fabricated ETA Fallback

**Root cause:** `mapCommitPayment.helpers.js` returns `"8 mins"` as a hardcoded string when real ETA data is unavailable. This is a fabricated data point in an emergency medical context â€” a patient safety issue (Apple HIG trust standard: "never present fabricated data as real").

**Fix:**
```js
// PULLBACK NOTE: UX-C â€” fabricated ETA fallback removed (patient safety)
// OLD: return eta ?? "8 mins"
// NEW: return eta ?? null
```

**Downstream:** `MapCommitPaymentStageBase.jsx` must handle `null` ETA:
```jsx
// PULLBACK NOTE: UX-C â€” null ETA display
// OLD: <EtaPill value={eta} /> â€” renders "8 mins" when no real data
// NEW: eta ? <EtaPill value={eta} /> : <EtaPill label="Calculatingâ€¦" muted />
// Or: omit the pill entirely when null â€” confirm with design before commit
```

**Verification required before commit:** Confirm the tracking sheet ETA display null-path is also handled. If tracking sheet reads ETA from the same source, it must show `"Calculatingâ€¦"` not `"8 mins"`.

---

## C-6 / UX-5 â€” Wallet Method Disabled Caption

**Root cause:** When `walletBalance < checkoutTotal`, the wallet payment option is silently removed from the list. User cannot tell whether the app has a wallet feature or why it's absent.

**Fix:**
```jsx
// PULLBACK NOTE: UX-C â€” wallet method shown as disabled row, not hidden
// OLD: wallet option conditionally excluded from the methods list
// NEW: wallet option always rendered; when ineligible, shown as disabled row with caption

<PaymentMethodRow
  method={walletMethod}
  disabled={walletBalance < checkoutTotal}
  caption={
    walletBalance < checkoutTotal
      ? `Balance $${walletBalance.toFixed(2)} â€” not enough for $${checkoutTotal.toFixed(2)}`
      : undefined
  }
/>
```

Per REFACTORING_GUARDRAILS Â§Loading State Rule: preserve the layout shell, show pending/disabled state, never blank. Same principle: preserve the option, show its state.

**Invariant:** Wallet eligibility filter `walletBalance >= checkoutTotal` is NOT removed â€” it remains as the guard for whether the wallet option is `disabled`. The filter's outcome is now surfaced to the user instead of silently hiding the row.

---

## C-6 / UX-6 â€” CTA Label Dynamic Type Truncation

**Root cause:** `"Dispatch ($12.00)"` at large Dynamic Type sizes exceeds the CTA button width, truncating the price.

**Fix â€” CTA label audit:**
```js
// PULLBACK NOTE: UX-C â€” CTA label task language + Dynamic Type layout
// OLD: "Dispatch ($12.00)" on one line â€” truncates at large text
// NEW: action verb and cost on two lines at large Dynamic Type
//      Audit MAP_COMMIT_PAYMENT_COPY constants for task language:
//        - Cash/approval flow: "Confirm & Dispatch"
//        - Card flow: "Pay $X.XX"
//        - Two-line at large text: "Pay\n$12.00"
```

Audit `mapCommitPayment.content.js` for all CTA label constants. Replace generic `"Continue"` or `"Dispatch"` with task-language labels per flow type. Use Accessibility Inspector to verify at Accessibility â†’ Larger Text â†’ Maximum before committing.

---

## Four-Track Declaration

| Track | Scope |
|-------|-------|
| State management | No layer changes. `FINALIZING_DISPATCH` already valid constant â€” only UI surface is new. `displayIdRef` is a ref, not state. |
| UI quality | Sticky footer CTA, `FINALIZING_DISPATCH` surface, wallet disabled caption, task-language CTA labels, Dynamic Type audit. |
| DRY / modular | `MapCommitPaymentStageParts.jsx` at 898 lines â€” extract `MapCommitPaymentStickyFooter` to sub-file if pushed past 950. |
| Documentation | PULLBACK NOTE on each. Deferred items C-5 through C-6 marked resolved in pre-tracking audit doc. Pass log updated. |

---

## Guardrails Compliance

| Rule | How complied |
|------|-------------|
| Sticky footer | `EntryActionButton` unchanged â€” only prop threading + position change |
| `FINALIZING_DISPATCH` surface | Rendered at StageBase level â€” not inside child card that can unmount (defect class 2.1) |
| Wallet disabled state | Always rendered, disabled + caption â€” never blank (Loading State Rule) |
| PT-7 display ID | `useRef` initialized inline â€” not a `useEffect` |
| PT-11 ETA | `null` returned â€” no fabricated data in emergency context (Apple HIG trust standard) |
| PT-C protection | `isCommitPaymentDismissibleState` not touched; `awaitingApprovalRef` not touched |

---

## Invariants (Must Not Change)

- `FINALIZING_DISPATCH` is already a valid `MAP_COMMIT_PAYMENT_TRANSACTION_STATES` constant â€” no state machine changes
- `isCommitPaymentDismissibleState` not touched â€” PT-C fix protected
- `awaitingApprovalRef` pattern not touched â€” PT-C fix protected
- `EntryActionButton` primitive â€” same component, new position only
- Wallet eligibility check `walletBalance >= checkoutTotal` â€” preserved as the `disabled` condition

---

## isSubmitting Consumer Catalogue (Required Before UX-D)

Before closing this pass, grep and document every consumer of `isSubmitting` in the payment surface:

```bash
grep -rn "isSubmitting" components/map/views/commitPayment/
```

This catalogue is the blast-radius input for UX-D's `isSubmitting` removal. Record here before committing UX-C.

---

## Verification Checklist

- [ ] Payment CTA visible without scrolling in HALF snap on non-sidebar layout (iPhone SE viewport)
- [ ] `FINALIZING_DISPATCH` surface renders at StageBase level â€” not inside scrollable card
- [ ] Ghost settlement simulation: confirm surface appears and CTA is non-retryable
- [ ] `WAITING_APPROVAL` â€” re-tap CTA: CTA locked (PT-C regression guard)
- [ ] Display ID stable: force two re-renders in same mount â€” same ID shown
- [ ] Display ID fresh: navigate away and back â€” new ID generated on remount
- [ ] ETA `null`: `"Calculatingâ€¦"` shown (or pill omitted) â€” no `"8 mins"` text anywhere
- [ ] Tracking sheet ETA null-path confirmed
- [ ] Wallet row visible and disabled (not hidden) when balance insufficient
- [ ] Wallet caption shows correct balance and checkout total amounts
- [ ] CTA label: task language confirmed â€” `"Confirm & Dispatch"` / `"Pay $X.XX"` not generic `"Continue"`
- [ ] Dynamic Type at maximum: CTA label not truncated
- [ ] `isSubmitting` consumer catalogue recorded in this doc
- [ ] `MapCommitPaymentStageParts.jsx` line count: if >950, extraction done
- [ ] PULLBACK NOTE on every structural change

---

## Navigation

â† [UX-B: Visual Hierarchy and Transition Discipline](./UX_B_VISUAL_HIERARCHY.md)
â†’ [UX-D: State Layer Completion](./UX_D_STATE_LAYER.md)

---

## Reconciliation Note - 2026-05-24

> Appended during the 2026-05-24 docs update sweep (Pass 4 - UX passes batch). The pass plan body above documents the intended changes. The header "Status: PLANNED" is outdated.

**Status: SHIPPED** - all six planned items verified in code.

**Shipped evidence**

- **Issue 8 (Sticky footer CTA)** - `EntryActionButton` now rendered in `MapCommitPaymentStageBase.jsx` footer slot, outside the scrollable card body. Prop threading matches plan.
- **C-5 / EC-2 (FINALIZING_DISPATCH UI surface)** - State constant + surface live in `mapCommitPayment.transaction.js`, `mapCommitPayment.presentation.js`, `useMapCommitPaymentController.js`, and `MapCommitPaymentStageParts.jsx`. Rendered at StageBase level per defect class 2.1 invariant.
- **C-6 / PT-7 (Stable display ID)** - Display ID now sourced from server (`result.displayId` / `request.display_id`) first via `mapCommitPayment.helpers.js`; no `Math.random()` used for display IDs (remaining `Math.random` calls are for internal `AMB-` / `BED-` request key generation, not user-visible display IDs).
- **C-6 / PT-11 (Fabricated ETA removed)** - Confirmed in `mapCommitPayment.helpers.js`: `estimatedArrival: result?.estimatedArrival || hospital?.eta || null` with PULLBACK NOTE retiring the `"8 mins"` fallback. The only remaining `"8 mins"` text is inside the PULLBACK comment.
- **C-6 / UX-5 (Wallet disabled caption)** - Wallet method now rendered with `disabled` + caption state instead of being hidden; eligibility filter preserved as the `disabled` guard.
- **C-6 / UX-6 (CTA Dynamic Type)** - Task-language labels audited in `mapCommitPayment.content.js`.

**isSubmitting consumer catalogue** - was the gating deliverable for UX-D and is now satisfied: `isSubmitting` is derived via `isSubmittingPaymentAtom` (Jotai) - see UX-D Reconciliation.

**Carryforward** - none.
