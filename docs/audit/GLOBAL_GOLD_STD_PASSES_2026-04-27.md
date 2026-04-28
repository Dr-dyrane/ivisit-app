# Global Gold Standard Passes
**Date**: 2026-04-27
**Status**: IN PROGRESS
**Scope**: Codebase-wide — not scoped to a single feature phase
**Guardrails**: `TRACKING_SHEET_LEARNINGS.md` defect classes 2.1–2.16 · 5-layer architecture · PULLBACK NOTE convention · DEPRECATED_FILE export standard
**Method**: Each pass is atomic. Line-by-line verification after every replacement. No silent drops, no TDZ, no missed variable references. Clean up diagnostic logs before closing each pass.

---

## Completed Pre-Work

### ✅ VD-A Diagnostic Log Cleanup (2026-04-27)
**Files**: `useMapVisitDetailModel.js`, `useMapTrackingController.js`, `useMapHistoryFlow.js`
**Action**: Removed all `[VD-A]`-tagged `console.log`/`console.warn` blocks added during audit instrumentation. Operational error-path logs preserved.
**Commit**: `5ff6b2b`

### ✅ Deprecated File Cluster — DEPRECATED_FILE Export Standard (2026-04-27)
**Problem**: `// @deprecated` comment at line 1 is invisible in grep results — any search for `useState`, function names, or imports surfaces the file without surfacing its deprecated status.
**Fix**: All deprecated files now export a named `DEPRECATED_FILE` constant immediately after the comment block. Any grep result in these files co-returns `DEPRECATED_FILE` on an adjacent line — structurally unmissable.

**Files tagged**:
| File | Phase | Replacement |
|---|---|---|
| `screens/MoreScreen.jsx` | 7a | MiniProfileModal + direct stack nav |
| `screens/RequestAmbulanceScreen.jsx` | 7a | MapSheetOrchestrator commit flow |
| `screens/BookBedRequestScreen.jsx` | 7a | MapSheetOrchestrator bed decision flow |
| `components/emergency/EmergencyRequestModal.jsx` | 7b | No live consumers — safe to delete |
| `components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx` | 7a | Deprecated with RequestAmbulanceScreen |

**Commit**: `56d48fd`

**Rule going forward**: Every deprecated file MUST export `DEPRECATED_FILE` — never use comment-only tags.

---

## Pass 1 — Raw Status String Sweep

**Status**: 🔲 PENDING
**Defect class**: Defect 2.2 (layer violation) — raw string literals used for status comparisons in live-trip logic instead of shared constants
**Guardrail**: Status strings must be defined once in a constants file and imported. Never compare `.status === "active"` inline in hooks or context files.

### Scope
- Exclude: `/map` surface (already swept — clean per tracking sheet audit)
- Exclude: presentation/filter layer (`history.presentation.js`, `useMapVisitDetailModel.js` label derivation — confirmed safe)
- Exclude: deprecated cluster (Phase 7a/7b files)
- Target: `hooks/emergency/`, `contexts/`, `services/`, `stores/`, remaining `screens/`, `hooks/visits/`

### Pre-Pass Inventory (grep `\.status\s*===\s*["']`)
_To be filled on pass execution._

### Pass Plan
1. Run grep — record every hit with file + line
2. For each hit: classify as (a) presentation-safe, (b) live-trip logic violation, or (c) service/query layer (acceptable)
3. For live-trip violations: identify the shared constants file (`REQUEST_STATUSES`, `VISIT_STATUSES`, etc.) and replace inline string with constant import
4. Line-by-line check: verify no variable goes undefined, no import is missing, no TDZ introduced
5. Run grep again to confirm zero remaining raw hits in live-trip paths
6. Remove any diagnostic logs added during the pass
7. Commit with PULLBACK NOTE on each changed line

### Acceptance Criteria
- Zero `\.status === "` hits in `hooks/emergency/`, `contexts/`, `stores/`
- All replacements use imported constants, not new magic strings
- No functional change — same boolean evaluations, different syntax

---

## Pass 2 — InsuranceScreen L2 Violation

**Status**: 🔲 PENDING
**Defect class**: Defect class 2 (rule 1) — API-derived state in `useState` + async `useEffect` instead of TanStack Query
**File**: `screens/InsuranceScreen.jsx` (1223 lines)

### Violations Identified
| Line | Variable | Violation | Correct Layer |
|---|---|---|---|
| 312 | `policies` / `setPolicies` | `useState` + API `useEffect` at line 743 | L2 — TanStack Query |
| 313 | `loading` / `setLoading` | loading flag for API call | L2 — `isLoading` from `useQuery` |
| 314 | `refreshing` / `setRefreshing` | pull-to-refresh flag | L2 — `isFetching` from `useQuery` |
| 315 | `showAddModal` | L5 ephemeral UI toggle | ✅ Correct — keep as `useState` |
| 316 | `submitting` | form submission busy | L5 ephemeral — acceptable `useState` |
| 317 | `isScanning` | camera scan busy | L5 ephemeral — acceptable `useState` |
| 320 | `step` | form wizard step | L5 ephemeral — acceptable `useState` |
| 323 | `formData` | form draft | L5 ephemeral — acceptable `useState` |
| 437 | `shakeAnim` | animation value | Should be `useRef(new Animated.Value(0))` not `useState` |
| 499 | `editingId` | selected row ID | L5 ephemeral — acceptable `useState` |

### Pass Plan
1. Read `InsuranceScreen.jsx` in full — map the existing `useEffect` at line 743 (the fetch effect)
2. Identify the insurance service call — determine query key
3. Create `useInsurancePoliciesQuery` (or inline `useQuery`) with correct `queryKey`, `queryFn`, `staleTime`
4. Replace `policies`, `loading`, `refreshing` with query result destructure
5. Replace `shakeAnim` `useState` with `useRef`
6. Line-by-line: verify every consumer of `policies`, `loading`, `refreshing` still receives correct type/shape
7. Check for TDZ: ensure `policies` default is `[]` not `undefined` at all call sites
8. Remove old `useEffect` fetch — verify no other effects depended on the `loading` transition
9. Add PULLBACK NOTE on each changed line
10. Log cleanup — remove any debug logs added during pass
11. Commit

### Acceptance Criteria
- `policies` sourced from TanStack Query — cached, deduped, background-refetch on focus
- `loading` replaced by `isLoading && !policies.length` (first load only)
- `refreshing` replaced by `isFetching`
- `shakeAnim` is a ref
- No regressions — pull-to-refresh, add policy, scan, edit, delete all verified post-replacement

---

## Pass 3 — Valid Transitions Reducer for Sheet Phase

**Status**: 🔲 PENDING
**Defect class**: Defect class from `TRACKING_SHEET_LEARNINGS.md` §1.3 — sheet phase transitions are currently ad-hoc (`setSheetPhase(X)` called anywhere); no guard against invalid transitions, no history for `goBack()`
**Reference**: `stash@{0}:hooks/map/exploreFlow/useMapSheetPhase.js` — `validTransitions` table pattern (stash rejected wholesale but pattern is correct)

### Scope
- New file: `hooks/map/state/useMapSheetPhaseReducer.js` (or extend `mapExploreFlow.store.js`)
- Consumer: `useMapSheetNavigation.js` — all `setSheetPhase` calls routed through `transitionTo()`

### Design (from stash pattern + our constraints)
```js
const validTransitions = {
  EXPLORE_INTENT:   [HOSPITAL_DETAIL, TRACKING, VISIT_DETAIL, COMMIT_DETAILS, COMMIT_TRIAGE, COMMIT_PAYMENT, BED_DECISION, AMBULANCE_DECISION, SERVICE_DETAIL],
  HOSPITAL_DETAIL:  [EXPLORE_INTENT, COMMIT_DETAILS, COMMIT_TRIAGE, COMMIT_PAYMENT, BED_DECISION, AMBULANCE_DECISION, SERVICE_DETAIL],
  TRACKING:         [EXPLORE_INTENT, COMMIT_TRIAGE, VISIT_DETAIL],
  VISIT_DETAIL:     [EXPLORE_INTENT, TRACKING],
  COMMIT_DETAILS:   [EXPLORE_INTENT, HOSPITAL_DETAIL, COMMIT_TRIAGE, COMMIT_PAYMENT],
  COMMIT_TRIAGE:    [EXPLORE_INTENT, COMMIT_DETAILS, COMMIT_PAYMENT, TRACKING],
  COMMIT_PAYMENT:   [EXPLORE_INTENT, COMMIT_TRIAGE, COMMIT_DETAILS],
  BED_DECISION:     [EXPLORE_INTENT, HOSPITAL_DETAIL, COMMIT_DETAILS],
  AMBULANCE_DECISION: [EXPLORE_INTENT, HOSPITAL_DETAIL, COMMIT_DETAILS],
  SERVICE_DETAIL:   [EXPLORE_INTENT, HOSPITAL_DETAIL],
};
```

### Pass Plan
1. Read `useMapSheetNavigation.js` in full — map every `setSheetPhase` call and its source phase
2. Read `mapExploreFlow.store.js` — understand current atom shape for `sheetPhase` + `sheetPayload`
3. Build `validTransitions` table from observed real call sites (not assumption)
4. Implement `transitionTo(targetPhase, payload)`:
   - In `__DEV__`: warn if transition not in `validTransitions[currentPhase]` — do NOT block (warn-only, non-breaking)
   - Always execute the transition (guard is observational in this pass, not enforced)
   - Record `sourcePhase` in `sheetPayload` for `goBack()` support
5. Implement `goBack()` using `sheetPayload.sourcePhase`
6. Replace every direct `setSheetPhase` in `useMapSheetNavigation.js` with `transitionTo()`
7. Line-by-line: verify `sourcePhase` is always set before any transition that uses it
8. Verify `goBack()` has a safe fallback (→ `EXPLORE_INTENT`) when `sourcePhase` is null
9. In `__DEV__` only — log all transitions for one session to validate the table
10. Remove transition logs before committing (same as VD-A cleanup discipline)
11. Commit

### Acceptance Criteria
- All sheet phase changes go through `transitionTo()` — zero raw `setSheetPhase` calls in `useMapSheetNavigation.js`
- `goBack()` works from every phase that has a `sourcePhase`
- Warn-only in `__DEV__` — no user-facing regressions
- `validTransitions` table matches actual observed call sites — no phantom transitions added

---

## Upcoming (Queued, Not Started)

| Pass | Scope | Trigger |
|---|---|---|
| Pass 4 — Payment Screen HIG | `MapCommitPaymentStageBase` + `MapCommitPaymentStageParts` — wide/md left-panel layout, tap targets ≥44pt, Dynamic Type, reduced motion | After Pass 3 |
| Pass 5 — Apple HIG sweep (remaining stack pages) | Stack pages linked from MiniProfile + Settings — wide-screen left-panel pattern per payment screen | After Pass 4 |

---

## Guardrails (apply to every pass)

1. **Read the full file before editing** — never edit around unseen code
2. **Line-by-line check after every replacement** — verify no consumer receives `undefined` where it expected a value
3. **No TDZ** — if a variable is referenced before its new declaration path, it is a TDZ bug. Fix it at the source.
4. **PULLBACK NOTE on every changed line** — `// OLD: ... NEW: ...` format
5. **DEPRECATED_FILE export** on any file newly found to be deprecated
6. **Log cleanup before commit** — diagnostic logs added during a pass are removed before the pass commit
7. **One pass at a time** — do not bundle passes into a single commit
8. **Warn-only guards in `__DEV__`** — never ship blocking assertions to production paths
