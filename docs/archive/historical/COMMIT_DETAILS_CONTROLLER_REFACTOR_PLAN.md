---
status: historical
owner: -
last_updated: 2026-04-28
---

# Commit Details Controller Refactor Plan

**Target:** `useMapCommitDetailsController.js` (678 lines -> <400 lines)
**Date:** 2026-04-25
**Pattern:** Same 3-pass extraction as Payment Controller

---

## Architecture Violation

**File:** `components/map/views/commitDetails/useMapCommitDetailsController.js`
**Current:** 678 lines
**Max Allowed:** 400 lines
**Status:** MANDATORY REFACTOR

**Responsibility Leakage:**
- Wizard step management (80 lines)
- OTP/countdown timer logic (120 lines)
- Email/phone validation & submission (200 lines)
- Contact memory hydration (80 lines)
- Auth reconciliation (100 lines)
- UI state coordination (100 lines)

---

## Pass 1: Extract Wizard Step Management

**Goal:** Remove ~80 lines from main controller
**Extract to:** `hooks/commit/useCommitWizardSteps.ts`

**Scope:**
- Step history tracking
- Step navigation (next/back)
- Step validation per step
- getInitialCommitDetailsStep integration

**Lines to move:** ~80
**Expected controller reduction:** 678 -> 598

---

## Pass 2: Extract OTP & Timer Logic

**Goal:** Remove ~120 lines from main controller
**Extract to:** `hooks/commit/useCommitOtpFlow.ts`

**Scope:**
- OTP countdown timer useEffect
- OTP auto-submit logic
- OTP validation
- OTP resend handling

**Lines to move:** ~120
**Expected controller reduction:** 598 -> 478

---

## Pass 3: Extract Form Validation & Submission

**Goal:** Remove ~200 lines from main controller
**Extract to:** `hooks/commit/useCommitFormSubmission.ts`

**Scope:**
- Email submission handler
- Phone submission handler
- OTP verification handler
- Contact memory persistence
- Auth reconciliation logic

**Lines to move:** ~200
**Expected controller reduction:** 478 -> 278

---

## Final Result

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Main controller | 678 | 278 | **-400 lines** |
| Extracted hooks | 0 | 3 files | **+400 lines** |
| Per-hook average | - | 133 lines | Within 150-300 range |
| Compliance | - Violation | - Compliant | Under 400 max |

---

## Checkpoint Format

```
PLAN: Commit Details Controller Refactor
CURRENT_PASS: Pass 1 - Wizard Step Extraction
STATUS: IN_PROGRESS

COMPLETED_PASSES:
- (none yet)

CURRENT_STEP:
- Create useCommitWizardSteps.ts
- Move step history + navigation logic
- Update controller imports

NEXT:
- Pass 2: OTP & Timer extraction

FILES_CHANGED:
- (pending)
```
