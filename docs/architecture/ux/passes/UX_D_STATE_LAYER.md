# UX-D — State Layer Completion (Deferred Architecture)

**Priority:** MEDIUM — correctness and cold-start safety
**Date:** 2026-05-10
**Status:** PLANNED — awaiting execution approval
**Depends on:** UX-C (must have `isSubmitting` consumer catalogue before removing the boolean)
**Blocks:** nothing — but is the highest blast-radius pass; must come last in the main sequence
**Note:** Do NOT combine any sub-step in this pass with another. One stash file adopted per commit.

---

## Issues and Deferred Items Addressed

| ID | Title | Source | Severity |
|----|-------|--------|----------|
| Issue 9 | Navigation Stack Resets State | Issue Register | 🟡 Open |
| C-1 / PT-B | TanStack Query migration for payment methods + cost | Pre-tracking deferred | HIGH |
| C-2 / CV-2 | Remove `isSubmitting` boolean — derive from `submissionState.kind` | Pre-tracking deferred | HIGH |
| C-3 / PT-4 | Atomic `transitionPendingToActive` Zustand action | Pre-tracking deferred | MEDIUM |
| C-4 / PT-3 | `commitFlow` → Jotai atom (session-ephemeral) | Pre-tracking deferred | HIGH |

---

## Mandatory Pre-Read

1. `docs/REFACTORING_GUARDRAILS.md` — Canonical Layers, `useEffect` decision tree
2. `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` — §1.4 "never bundle gains" (one sub-step per commit), all defect classes
3. `docs/architecture/refactoring/REFACTORING_BIBLE.md` — Commandment 8 (monolith baseline hash before first pass), Commandment 2 (no anonymous function props)

---

## Files Changed

| File | Change |
|------|--------|
| `atoms/commitAtoms.ts` (from stash) | Adopt: `commitFlow` Jotai atom |
| `stores/emergencyTripStore.js` | Add `transitionPendingToActive(trip)` action; remove `commitFlow` field + actions |
| `hooks/useMapCommitFlow.js` | Rewire all `commitFlow` reads/writes to Jotai atom |
| `stores/emergencyTripStore.js` | `transitionPendingToActive` atomic single write |
| `hooks/payment/usePaymentMethodsQuery.ts` (from stash) | Adopt: payment methods TanStack Query |
| `hooks/payment/usePaymentCostCalculation.ts` (from stash) | Adopt: cost calculation TanStack Query |
| `hooks/payment/useWalletBalanceQuery.ts` (from stash) | Adopt: wallet balance TanStack Query |
| `components/map/views/commitPayment/useMapCommitPaymentController.js` | Replace `isSubmitting` boolean — derive all UI state from `submissionState.kind` |
| `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx` | Update consumers of `isSubmitting` — derive from `submissionState.kind` |

---

## Canonical Layer Assignments

| Data | Layer | Rationale |
|------|-------|-----------|
| `commitFlow` | Jotai (ephemeral UI state) | Session-scoped only — must not survive app restart (REFACTORING_GUARDRAILS §Canonical Layers) |
| Payment methods list | TanStack Query (server cache) | Remote data, not client state |
| Payment cost | TanStack Query (server cache) | Remote data, computed from session input |
| Wallet balance | TanStack Query (server cache) | Remote data |
| `isSubmitting` | REMOVE — derive from `submissionState.kind` | Single source of truth — boolean is redundant (useEffect decision tree: "machine state → Jotai atom or XState, not boolean useState") |
| `transitionPendingToActive` | Zustand action (persistent client state) | Trip is persistent client state — atomic write avoids partial update |

---

## Sub-Step Sequence (One Commit Per Step)

**Step D-1: Add `transitionPendingToActive` to `emergencyTripStore.js`**

Add the atomic action first — before any removal. Record baseline hash of `emergencyTripStore.js` before editing (REFACTORING_BIBLE Commandment 8).

```js
// PULLBACK NOTE: UX-D D-1 — atomic transitionPendingToActive action
// OLD: trip state updated in multiple writes across useRequestFlow.js
// NEW: single atomic Zustand action — one write, no partial state window

transitionPendingToActive: (trip) =>
  set((state) => ({
    activeAmbulanceTrip: trip,
    pendingApproval: null,
  })),
```

Verify behavior parity before D-2: trigger an approval → confirm the trip transitions correctly with the new action. Do not proceed to D-2 until verified.

---

**Step D-2: Adopt `commitAtoms.ts` — migrate `commitFlow` to Jotai**

Read `atoms/commitAtoms.ts` from stash against current `useMapCommitFlow.js` before adopting. Apply PULLBACK NOTE on every adoption.

```js
// PULLBACK NOTE: UX-D D-2 — commitFlow migrated from Zustand to Jotai
// OLD: commitFlow field in emergencyTripStore.js (persistent across app restarts)
// NEW: commitFlow in Jotai atom (atoms/commitAtoms.ts) — session-ephemeral, resets on restart
```

After migration, rewire all `commitFlow` reads/writes in `useMapCommitFlow.js`:
- `getCommitFlow()` → `useAtom(commitFlowAtom)[0]`
- `setCommitFlow(x)` → `useSetAtom(commitFlowAtom)(x)`
- `clearCommitFlow()` → `useSetAtom(commitFlowAtom)(null)`

Verify cold-start behavior: confirm `commitFlow` starts as `null` after app restart (Jotai reset). The restore effect in `useMapCommitFlow.js` must not fire when `commitFlow` is `null`.

After verifying parity, remove `commitFlow` field + `setCommitFlow` / `clearCommitFlow` from `emergencyTripStore.js` in the same commit.

---

**Step D-3: Adopt `usePaymentMethodsQuery.ts`**

Read stash file against current `useMapCommitPaymentController.js` before adopting. One stash file per commit — do not bundle D-3, D-4, D-5.

```js
// PULLBACK NOTE: UX-D D-3 — payment methods migrated to TanStack Query
// OLD: refreshPaymentMethodSnapshot() imperative fetch in useMapCommitPaymentController
// NEW: usePaymentMethodsQuery() — TanStack Query with automatic refetch on invalidation
```

**Wire invalidation before removing `refreshPaymentMethodSnapshot`:**
```js
// In the add-card handler:
queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
// ONLY remove refreshPaymentMethodSnapshot after confirming invalidation is wired
```

Verify: add a new card → list refreshes automatically. Then remove `refreshPaymentMethodSnapshot`. Never leave a gap window.

---

**Step D-4: Adopt `usePaymentCostCalculation.ts`**

Same pattern as D-3. Read stash file, apply PULLBACK NOTE, verify parity before removing imperative cost fetch.

---

**Step D-5: Adopt `useWalletBalanceQuery.ts`**

Same pattern. Read, adopt, verify, remove imperative fetch.

**Safety invariant for D-5:** Wallet eligibility filter `walletBalance >= checkoutTotal` must be preserved. Confirm the TanStack Query hook exposes `walletBalance` in the same shape used by the filter. Do not remove the filter — only migrate the data source.

---

**Step D-6: Remove `isSubmitting` boolean**

**Before removing:** grep every consumer using the catalogue from UX-C. Confirm every consumer now reads from `submissionState.kind`.

```js
// PULLBACK NOTE: UX-D D-6 — isSubmitting removed; UI state derived from submissionState.kind
// OLD: isSubmitting boolean in useMapCommitPaymentController
// NEW: derive from submissionState.kind:
//   isSubmitting = submissionState.kind === "SUBMITTING" || submissionState.kind === "FINALIZING_DISPATCH"
//   isDisabled = isSubmitting || !canConfirm

// In MapCommitPaymentStageBase.jsx and all consumers:
// Replace: {isSubmitting && <Spinner />}
// With:    {(submissionState.kind === "SUBMITTING" || submissionState.kind === "FINALIZING_DISPATCH") && <Spinner />}
```

Blast-radius audit is mandatory. Do not remove `isSubmitting` until every consumer is migrated.

---

## Guardrails Compliance

| Rule | How complied |
|------|-------------|
| `emergencyTripStore.js` high blast-radius | Baseline hash recorded before first edit (Commandment 8) |
| Stash adoption | Read each stash file against current code before adopting — never drop logic silently (TRACKING_SHEET_LEARNINGS §1.4) |
| `isSubmitting` removal | Blast-radius audit from UX-C catalogue — every consumer migrated before boolean removed |
| TanStack Query invalidation gap | `invalidateQueries` wired before `refreshPaymentMethodSnapshot` removed — never leave gap window |
| Cold-start restore | Verify `commitFlow` is `null` after app restart — restore effect must not fire on null |
| One sub-step per commit | No bundling of D-1 through D-6 in a single commit |

---

## Invariants (CRITICAL — Highest Blast-Radius Pass)

- One stash file adopted per sub-step. Verify behaviour parity before proceeding.
- `emergencyTripStore.js`: add `transitionPendingToActive` first, verify, then remove `commitFlow` — never simultaneously.
- `isSubmitting` removal: audit every consumer before removing from controller.
- TanStack Query: `QueryClient.invalidateQueries` wired into add-card handler before removing `refreshPaymentMethodSnapshot` — no gap window.
- Wallet eligibility filter `walletBalance >= checkoutTotal` — preserved as disabled condition (from UX-C).
- `isCommitPaymentDismissibleState` not touched — PT-C fix protected across all sub-steps.

---

## Verification Checklist

- [ ] D-1: `transitionPendingToActive` fires a single atomic write — no partial state window
- [ ] D-1: Approval → active trip transition works correctly
- [ ] D-2: `commitFlow` is `null` after cold start (Jotai reset)
- [ ] D-2: Back navigation within session restores `commitFlow` correctly (Zustand → Jotai parity)
- [ ] D-2: `emergencyTripStore.js` has no `commitFlow` field after D-2
- [ ] D-3: Add card → payment methods list refreshes automatically
- [ ] D-3: `refreshPaymentMethodSnapshot` removed only after invalidation wired
- [ ] D-4: Cost recalculates when session input changes — no stale cost shown
- [ ] D-5: Wallet balance updates on next refetch — eligibility filter works correctly
- [ ] D-6: `isSubmitting` grep returns 0 results after removal
- [ ] D-6: All spinner / disabled states correctly read from `submissionState.kind`
- [ ] D-6: `WAITING_APPROVAL` still locks CTA (PT-C regression guard)
- [ ] Pre-tracking audit deferred items C-1 through C-4 marked resolved
- [ ] PULLBACK NOTE on every structural change across all sub-steps

---

## Navigation

← [UX-C: Payment Surface HIG Polish](./UX_C_PAYMENT_SURFACE.md)
→ [UX-E: LocationSheet + Mini Profile](./UX_E_LOCATION_SHEET.md)
