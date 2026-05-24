---
status: historical
owner: -
last_updated: 2026-04-28
---

# Payment Controller Refactor Plan

**Target:** `useMapCommitPaymentController.js` (867 lines -> <400 lines)
**Date:** 2026-04-25

---

## Architecture Violation

**File:** `components/map/views/commitPayment/useMapCommitPaymentController.js`
**Current:** 867 lines
**Max Allowed:** 400 lines
**Status:** MANDATORY REFACTOR (>800 lines)

**Responsibility Leakage:**
- Payment method management (150 lines)
- Cost calculation (120 lines)
- Transaction/submission flow (200 lines)
- Demo mode handling (100 lines)
- UI state coordination (200 lines)
- All in single controller -> violates single behavior principle

---

## Pass 1: Extract Payment Method Selection

**Goal:** Remove 150 lines from main controller
**Extract to:** `hooks/payment/usePaymentMethodSelection.ts`

**Scope:**
- `refreshPaymentMethodSnapshot()` function
- Method selection handlers
- Default method resolution logic
- Wallet/cash/demo method filtering

**Lines to move:** ~150
**Expected controller reduction:** 867 -> 717

---

## Pass 2: Extract Cost Calculation

**Goal:** Remove 120 lines from main controller
**Extract to:** `hooks/payment/usePaymentCostCalculation.ts`

**Scope:**
- `loadCost()` useEffect and logic
- Distance calculation
- Pricing service calls
- Cost normalization

**Lines to move:** ~120
**Expected controller reduction:** 717 -> 597

---

## Pass 3: Extract Payment Submission Orchestrator

**Goal:** Remove 200 lines from main controller
**Extract to:** `hooks/payment/usePaymentSubmission.ts`

**Scope:**
- `handleSubmit()` function
- Transaction state management
- Request building (ambulance/bed)
- Demo auto-approval logic
- Error handling flow

**Lines to move:** ~200
**Expected controller reduction:** 597 -> 397

---

## Final Result

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Main controller | 867 | 397 | **-470 lines** |
| Extracted hooks | 0 | 3 files | **+470 lines** |
| Per-hook average | - | 157 lines | Within 150-300 range |
| Compliance | - Violation | - Compliant | Under 400 max |

**Architecture:** Single behavior per hook, clear composition in main controller.

---

## Checkpoint Format

```
PLAN: Payment Controller Refactor
CURRENT_PASS: Pass 1 - Method Selection Extraction
STATUS: IN_PROGRESS

COMPLETED_PASSES:
- (none yet)

CURRENT_STEP:
- Create usePaymentMethodSelection.ts
- Move refreshPaymentMethodSnapshot logic
- Update controller imports
- Wire new hook

NEXT:
- Pass 2: Cost calculation extraction

FILES_CHANGED:
- (pending)

VALIDATION:
- Controller < 400 lines
- All hooks < 300 lines
- No behavior change
```
