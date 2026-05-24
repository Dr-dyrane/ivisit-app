---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Global Gold Standard Passes
**Date**: 2026-04-27
**Status**: IN PROGRESS
**Scope**: Codebase-wide â€” not scoped to a single feature phase
**Guardrails**: `TRACKING_SHEET_LEARNINGS.md` defect classes 2.1â€“2.16 Â· 5-layer architecture Â· PULLBACK NOTE convention Â· DEPRECATED_FILE export standard
**Method**: Each pass is atomic. Line-by-line verification after every replacement. No silent drops, no TDZ, no missed variable references. Clean up diagnostic logs before closing each pass.

---

## Completed Pre-Work

### âœ… VD-A Diagnostic Log Cleanup (2026-04-27)
**Files**: `useMapVisitDetailModel.js`, `useMapTrackingController.js`, `useMapHistoryFlow.js`
**Action**: Removed all `[VD-A]`-tagged `console.log`/`console.warn` blocks added during audit instrumentation. Operational error-path logs preserved.
**Commit**: `5ff6b2b`

### âœ… Deprecated File Cluster â€” DEPRECATED_FILE Export Standard (2026-04-27)
**Problem**: `// @deprecated` comment at line 1 is invisible in grep results â€” any search for `useState`, function names, or imports surfaces the file without surfacing its deprecated status.
**Fix**: All deprecated files now export a named `DEPRECATED_FILE` constant immediately after the comment block. Any grep result in these files co-returns `DEPRECATED_FILE` on an adjacent line â€” structurally unmissable.

**Files tagged**:
| File | Phase | Replacement |
|---|---|---|
| `screens/MoreScreen.jsx` | 7a | MiniProfileModal + direct stack nav |
| `screens/RequestAmbulanceScreen.jsx` | 7a | MapSheetOrchestrator commit flow |
| `screens/BookBedRequestScreen.jsx` | 7a | MapSheetOrchestrator bed decision flow |
| `components/emergency/EmergencyRequestModal.jsx` | 7b | No live consumers â€” safe to delete |
| `components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx` | 7a | Deprecated with RequestAmbulanceScreen |

**Commit**: `56d48fd`

**Rule going forward**: Every deprecated file MUST export `DEPRECATED_FILE` â€” never use comment-only tags.

---

## Pass 1 â€” Raw Status String Sweep

**Status**: âœ… COMPLETE â€” commit `d92a994`
**Defect class**: Defect 2.2 (layer violation) â€” raw string literals used for status comparisons in live-trip logic instead of shared constants
**Guardrail**: Status strings must be defined once in a constants file and imported. Never compare `.status === "active"` inline in hooks or context files.

### Scope
- Exclude: `/map` surface (already swept â€” clean per tracking sheet audit)
- Exclude: presentation/filter layer (`history.presentation.js`, `useMapVisitDetailModel.js` label derivation â€” confirmed safe)
- Exclude: deprecated cluster (Phase 7a/7b files)
- Target: `hooks/emergency/`, `contexts/`, `services/`, `stores/`, remaining `screens/`, `hooks/visits/`

### Pre-Pass Inventory (grep `\.status\s*===\s*["']`)
_To be filled on pass execution._

### Pass Plan
1. Run grep â€” record every hit with file + line
2. For each hit: classify as (a) presentation-safe, (b) live-trip logic violation, or (c) service/query layer (acceptable)
3. For live-trip violations: identify the shared constants file (`REQUEST_STATUSES`, `VISIT_STATUSES`, etc.) and replace inline string with constant import
4. Line-by-line check: verify no variable goes undefined, no import is missing, no TDZ introduced
5. Run grep again to confirm zero remaining raw hits in live-trip paths
6. Remove any diagnostic logs added during the pass
7. Commit with PULLBACK NOTE on each changed line

### Acceptance Criteria â€” MET
- Zero `\.status === "` hits in `hooks/emergency/`, `contexts/`, `stores/`
- All replacements use imported constants, not new magic strings
- No functional change â€” same boolean evaluations, different syntax

### Changes shipped
| File | Change |
|---|---|
| `constants/emergency.js` | Added `AmbulanceStatus` frozen enum |
| `hooks/emergency/useEmergencyRealtime.js` | `EmergencyRequestStatus.COMPLETED/CANCELLED` |
| `hooks/emergency/useActiveTripQuery.js` | `EmergencyRequestStatus.PENDING_APPROVAL` |
| `hooks/emergency/useEmergencyActions.js` | `AmbulanceStatus.AVAILABLE` |
| `contexts/VisitsContext.jsx` | `VISIT_STATUS.UPCOMING/COMPLETED/CANCELLED/IN_PROGRESS` |

---

## Pass 2 â€” InsuranceScreen L2 Violation

**Status**: âœ… COMPLETE â€” commit `7a130ee`
**Defect class**: Defect class 2 (rule 1) â€” API-derived state in `useState` + async `useEffect` instead of TanStack Query
**File**: `screens/InsuranceScreen.jsx` (1223 lines)

### Violations Identified
| Line | Variable | Violation | Correct Layer |
|---|---|---|---|
| 312 | `policies` / `setPolicies` | `useState` + API `useEffect` at line 743 | L2 â€” TanStack Query |
| 313 | `loading` / `setLoading` | loading flag for API call | L2 â€” `isLoading` from `useQuery` |
| 314 | `refreshing` / `setRefreshing` | pull-to-refresh flag | L2 â€” `isFetching` from `useQuery` |
| 315 | `showAddModal` | L5 ephemeral UI toggle | âœ… Correct â€” keep as `useState` |
| 316 | `submitting` | form submission busy | L5 ephemeral â€” acceptable `useState` |
| 317 | `isScanning` | camera scan busy | L5 ephemeral â€” acceptable `useState` |
| 320 | `step` | form wizard step | L5 ephemeral â€” acceptable `useState` |
| 323 | `formData` | form draft | L5 ephemeral â€” acceptable `useState` |
| 437 | `shakeAnim` | animation value | Should be `useRef(new Animated.Value(0))` not `useState` |
| 499 | `editingId` | selected row ID | L5 ephemeral â€” acceptable `useState` |

### Pass Plan
1. Read `InsuranceScreen.jsx` in full â€” map the existing `useEffect` at line 743 (the fetch effect)
2. Identify the insurance service call â€” determine query key
3. Create `useInsurancePoliciesQuery` (or inline `useQuery`) with correct `queryKey`, `queryFn`, `staleTime`
4. Replace `policies`, `loading`, `refreshing` with query result destructure
5. Replace `shakeAnim` `useState` with `useRef`
6. Line-by-line: verify every consumer of `policies`, `loading`, `refreshing` still receives correct type/shape
7. Check for TDZ: ensure `policies` default is `[]` not `undefined` at all call sites
8. Remove old `useEffect` fetch â€” verify no other effects depended on the `loading` transition
9. Add PULLBACK NOTE on each changed line
10. Log cleanup â€” remove any debug logs added during pass
11. Commit

### Acceptance Criteria â€” MET
- `policies` sourced from `useQuery(['insurancePolicies'])` â€” cached, deduped, background-refetch
- `loading` = `isLoading` from query
- `refreshing` = `isFetching` from query â€” `setRefreshing(true)` in `onRefresh` removed
- `shakeAnim` is now a `useRef` â€” `useState` setter was never used
- All 5 `fetchPolicies()` call sites replaced with `void refetchPolicies()`
- `fetchPolicies` `useCallback` and its `useFocusEffect` trigger removed

---

## Pass 3 â€” Valid Transitions Reducer for Sheet Phase

**Status**: âœ… COMPLETE â€” commit `233be2b`
**Defect class**: Defect class from `TRACKING_SHEET_LEARNINGS.md` section 1.3 â€” sheet phase transitions are currently ad-hoc (`setSheetPhase(X)` called anywhere); no guard against invalid transitions, no history for `goBack()`
**Reference**: `stash@{0}:hooks/map/exploreFlow/useMapSheetPhase.js` â€” `validTransitions` table pattern (stash rejected wholesale but pattern is correct)

### Scope
- New file: `hooks/map/state/useMapSheetPhaseReducer.js` (or extend `mapExploreFlow.store.js`)
- Consumer: `useMapSheetNavigation.js` â€” all `setSheetPhase` calls routed through `transitionTo()`

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
1. Read `useMapSheetNavigation.js` in full â€” map every `setSheetPhase` call and its source phase
2. Read `mapExploreFlow.store.js` â€” understand current atom shape for `sheetPhase` + `sheetPayload`
3. Build `validTransitions` table from observed real call sites (not assumption)
4. Implement `transitionTo(targetPhase, payload)`:
   - In `__DEV__`: warn if transition not in `validTransitions[currentPhase]` â€” do NOT block (warn-only, non-breaking)
   - Always execute the transition (guard is observational in this pass, not enforced)
   - Record `sourcePhase` in `sheetPayload` for `goBack()` support
5. Implement `goBack()` using `sheetPayload.sourcePhase`
6. Replace every direct `setSheetPhase` in `useMapSheetNavigation.js` with `transitionTo()`
7. Line-by-line: verify `sourcePhase` is always set before any transition that uses it
8. Verify `goBack()` has a safe fallback (â†’ `EXPLORE_INTENT`) when `sourcePhase` is null
9. In `__DEV__` only â€” log all transitions for one session to validate the table
10. Remove transition logs before committing (same as VD-A cleanup discipline)
11. Commit

### Acceptance Criteria â€” MET
- All handler-level sheet phase changes go through `transitionTo()` â€” zero raw `setSheetView` calls in `useMapSheetNavigation.js` handler bodies
- `goBack()` used for all close/return handlers â€” reads `sheetPayload.sourcePhase`, falls back to `EXPLORE_INTENT`
- Warn-only in `__DEV__` â€” no user-facing regressions
- `VALID_TRANSITIONS` table built from observed real call sites only

### Files shipped
- `hooks/map/state/useMapSheetPhaseReducer.js` â€” new file
- `hooks/map/exploreFlow/useMapSheetNavigation.js` â€” all handlers use `transitionTo`/`goBack`
- `hooks/map/exploreFlow/useMapExploreFlow.js` â€” `sheetPhase` wired into call site

---

## âœ… Pass 4 â€” Modal Renderer Audit (sweep-modal)

**Scope**: All live modal render sites â€” check for modals inside conditionally-mounted parents that could lose state on phase change

### Findings
| Component | Status | Notes |
|---|---|---|
| `ServiceRatingModal` (tracking) | âœ… Clean | Already lifted to MapScreen root in Pass B |
| `ServiceRatingModal` (recovered) | âœ… Clean | Rendered at MapScreen root |
| `MapModalShell`-based modals (History, Care, Guest, Profile) | âœ… Clean | All at MapScreen root, `shouldRender` latch |
| `useMapCommitDetailsController` draft state | âœ… Clean | Persisted via `setCommitFlow` (Zustand L3) + re-seeds from `sheetPayload` on mount |
| `useMapCommitTriageController` draft state | âœ… Clean | Seeds from `payload?.triageDraft` + `payload?.activeStep` on mount |
| `EmergencyLocationSearchSheet` | â„¹ï¸ Legacy island | No live consumer â€” entirely in deprecated cluster |
| `CoverageDisclaimerModal`, `DemoBootstrapModal`, `TriageIntakeModal` | â„¹ï¸ Orphaned | Imported only from deprecated `EmergencyRequestModal` |

**Verdict**: Live codebase is clean. Persist/restore loop via Zustand `commitFlow` correctly preserves form state across sheet phase transitions. No structural remount defects in non-deprecated code.

---

## âœ… Pass 5 â€” Apple HIG Sweep â€” Commit + History Screens (sweep-hig)

**Scope**: Payment/triage/details commit stage parts + history filter chips â€” tap targets, Dynamic Type, hitSlop

### Tap Target Fixes (â‰¥44pt minimum)
| File | Style | Old | Fix |
|---|---|---|---|
| `mapCommitPayment.styles.js` | `paymentChangePill` | `minHeight: 38` | `minHeight: 44` |
| `mapCommitPayment.styles.js` | `statusSecondaryAction` | `paddingVertical: 8` (~33pt) | `paddingVertical: 13` |
| `mapCommitTriage.styles.js` | `skipAllButton` | `paddingVertical: 8` (~31pt) | `paddingVertical: 14` |
| `mapCommitTriage.styles.js` | `showMoreButton` | `paddingVertical: 8` (~29pt) | `paddingVertical: 14` |
| `mapCommitDetails.styles.js` | `phoneCountryChip` | `minHeight: 36` | `minHeight: 44` |
| `history.styles.js` | `filterChip` | `paddingVertical: 8` (~32pt) | `paddingVertical: 14` |

### hitSlop Additions
| File | Pressable | hitSlop |
|---|---|---|
| `MapCommitPaymentStageParts.jsx` | Collapse payment methods pill | 8 |
| `MapCommitTriageStageParts.jsx` | Skip All button | 8 |
| `MapCommitTriageStageParts.jsx` | Show More Symptoms button | 8 |
| `MapCommitDetailsStageParts.jsx` | Phone country chip | 8 |

### Dynamic Type (`allowFontScaling`)
- `MapCommitPaymentStageParts.jsx`: heroHeaderTitle, heroHeaderSubtitle, heroAction labels, breakdownTitle, actionGroup labels, status title/description, paymentHero title/subtitle, infoGroup values

### Notes
- `topSlotCloseButton` (38pt): compensated by `MapHeaderIconButton` default `hitSlop=10` â†’ 58pt effective. No layout change needed.
- No Reanimated animations in parts files â†’ `useReducedMotion` not applicable here (applies to `StageBase` level)

---

## Pass 6 â€” Local UI State Ephemerality (sweep-local-state)

**Status**: âœ… COMPLETE â€” pending commit
**Defect class**: Rule 2 â€” named machine-like or user-input state in `useState` that loses user data on sheet collapse, background, or Metro restart. Correct layer: Jotai L5 atom.
**Question for each `useState`**: *"If this component unmounts mid-session, does the user lose something they worked to produce?"*

### Full Triage

| File | State | Verdict | Reason |
|---|---|---|---|
| `InsuranceScreen.jsx:326` | `step` | ðŸ”´ **Fix** | Wizard step â€” user loses progress through multi-step add-insurance flow on remount |
| `InsuranceScreen.jsx:329` | `formData` | ðŸ”´ **Fix** | Multi-field form draft â€” loses all typed input on remount (e.g. backgrounded during camera scan) |
| `InsuranceScreen.jsx:321` | `showAddModal` | ðŸ”´ **Fix** | Modal open state â€” user loses flow context if remount dismisses the modal mid-fill |
| `MedicalProfileScreen.jsx:66` | `localProfile` | ðŸ”´ **Fix** | Unsaved profile edits â€” all in-progress edits lost on remount |
| `MedicalProfileScreen.jsx:64` | `stableHasChanges` | ðŸ”´ **Fix** | Dirty flag â€” FAB save button disappears on remount even if unsaved changes exist |
| `MapHospitalListContent.jsx:68` | `selectedSpecialty` | ðŸ”´ **Fix** | User's active filter â€” resets to "All" on every sheet phase change |
| `MapHospitalDetailServiceRail.jsx:94` | `uncontrolledSelectedId` | ðŸ”´ **Fix** | Service selection â€” lost if hospital detail sheet remounts mid-commit flow |
| `useMapSearchSheetModel.js:42` | `activeMode` | ðŸ”´ **Fix** | Search mode (hospital vs location) â€” resets on sheet collapse |
| `HelpSupportScreen.jsx:49-50` | `subject`, `message` | ðŸŸ¡ **Fix** | Support ticket draft â€” user loses typed message on navigation away |
| `InsuranceScreen.jsx:497` | `editingId` | âœ… Fine | Which row is in edit mode â€” correct to reset on remount |
| `InsuranceScreen.jsx:322-323` | `submitting`, `isScanning` | âœ… Fine | In-flight busy flags â€” correct to reset |
| `MedicalProfileScreen.jsx:65` | `isSaving` | âœ… Fine | Save busy flag â€” correct to reset |
| `MapCommitPaymentStageParts.jsx:401` | `isExpanded` | âœ… Fine | Selector toggle â€” correct to reset closed |
| `useMapSearchSheetModel.js:38-41` | `locationSuggestions`, `isSearching`, errors | âœ… Fine | Search fetch results â€” correct to refetch on remount |
| `MapHospitalDetailStageBase.jsx:50-51` | `showFloatingTitle`, `expandedHeaderBottom` | âœ… Fine | Scroll-derived â€” correct to reset |
| All tracking `nowMs` | timer tick | âœ… Fine | Clock â€” correct to reset |

### Atoms file
All new atoms go into: `hooks/map/state/mapEphemeral.atoms.js` (new file, or extend if exists)
Non-map screens (`InsuranceScreen`, `MedicalProfileScreen`, `HelpSupportScreen`) atoms go into: `stores/uiEphemeral.atoms.js` (new file)

### Pass Plan
1. Check if `mapEphemeral.atoms.js` and `uiEphemeral.atoms.js` exist â€” create if not
2. **Fix #1** â€” `InsuranceScreen`: `step`, `formData`, `showAddModal` â†’ atoms; reset atoms in `openCreate`/`cancelCreate` handlers âœ…
3. **Fix #2** â€” `MedicalProfileScreen`: `localProfile`, `stableHasChanges` â†’ atoms; reset atom in save/cancel handlers âœ…
4. **Fix #3** â€” `MapHospitalListContent`: `selectedSpecialty` â†’ atom; reset in unmount or phase-change effect âœ…
5. **Fix #4** â€” `MapHospitalDetailServiceRail`: `uncontrolledSelectedId` â†’ atom; reset when `selectionEnabled` goes false âœ…
6. **Fix #5** â€” `useMapSearchSheetModel`: `activeMode` â€” â›” CANCELLED: `activeMode` is intentionally reset to `mode` prop on every `visible` change (lines 67, 88). Converting to atom would override caller's `mode` prop on re-open â€” regression. Correct as `useState`.
7. **Fix #6** â€” `HelpSupportScreen`: `subject`, `message` â†’ atoms; reset on successful submit âœ…
8. Line-by-line diff verification per Pre-Commit Protocol on all changed files âœ…
9. Wait for user confirmation before commit

### Files shipped
| File | Change |
|---|---|
| `atoms/uiEphemeral.atoms.js` | New file â€” `insuranceShowAddModalAtom`, `insuranceWizardStepAtom`, `insuranceFormDataAtom`, `INSURANCE_FORM_DEFAULT`, `medicalProfileLocalAtom`, `medicalProfileHasChangesAtom`, `helpSupportSubjectAtom`, `helpSupportMessageAtom` |
| `atoms/mapFlowAtoms.js` | Added `mapHospitalListSelectedSpecialtyAtom`, `mapHospitalServiceUncontrolledIdAtom`, `mapSearchActiveModeAtom` |
| `screens/InsuranceScreen.jsx` | `showAddModal`, `step`, `formData` â†’ `useAtom` |
| `screens/MedicalProfileScreen.jsx` | `localProfile`, `stableHasChanges` â†’ `useAtom` |
| `screens/HelpSupportScreen.jsx` | `subject`, `message` â†’ `useAtom` |
| `components/map/surfaces/hospitals/MapHospitalListContent.jsx` | `selectedSpecialty` â†’ `useAtom` |
| `components/map/surfaces/hospitals/MapHospitalDetailServiceRail.jsx` | `uncontrolledSelectedId` â†’ `useAtom` |

### Acceptance Criteria
- All ðŸ”´ state survives a Metro reload / component remount mid-session
- All atoms reset at the correct lifecycle point (not on mount â€” on intent to discard)
- No `useState` setter left dangling (every `setX` either removed or still used)
- No TDZ â€” every atom read has a defined default
- PULLBACK NOTE on every changed line
- Pre-commit diff protocol completed and presented to user before commit

---

## Upcoming (Queued, Not Started)

| Pass | Scope | Trigger |
|---|---|---|
| Pass 7 â€” Apple HIG sweep (remaining stack pages) | Stack pages linked from MiniProfile + Settings â€” wide-screen left-panel pattern | After Pass 6 |

---

## Guardrails (apply to every pass)

1. **Read the full file before editing** â€” never edit around unseen code
2. **Line-by-line check after every replacement** â€” verify no consumer receives `undefined` where it expected a value
3. **No TDZ** â€” if a variable is referenced before its new declaration path, it is a TDZ bug. Fix it at the source.
4. **PULLBACK NOTE on every changed line** â€” `// OLD: ... NEW: ...` format
5. **DEPRECATED_FILE export** on any file newly found to be deprecated
6. **Log cleanup before commit** â€” diagnostic logs added during a pass are removed before the pass commit
7. **One pass at a time** â€” do not bundle passes into a single commit
8. **Warn-only guards in `__DEV__`** â€” never ship blocking assertions to production paths

---

## Pre-Commit Verification Protocol (MANDATORY â€” every pass)

Before ANY commit, for EVERY file edited in the pass:

### Step 1 â€” `git diff --stat`
Run `git diff --stat` and confirm the insertion/deletion counts are proportionate to the intended change. Unexpectedly large deletions = STOP.

### Step 2 â€” Per-file diff review
Run `git diff <file>` for each changed file. For every deleted line (`-`), confirm it is either:
- **Reformatted** â€” same content, different whitespace/line breaks (verify the `+` counterpart exists)
- **Intentionally removed** â€” explicitly called out in the pass plan

If any deleted line cannot be accounted for â†’ STOP, investigate, restore before proceeding.

### Step 3 â€” Undefined reference check
For every function, variable, or import that appears in `+` lines:
- Confirm it is defined in the same file, or correctly imported
- Confirm nothing in `-` lines was the sole definition of something still referenced

### Step 4 â€” Wait for user confirmation
**Cascade never runs `git commit` or `git push`.** After completing Steps 1â€“3, present the verified diff summary to the user and wait for explicit "commit" instruction.

### Lessons encoded (from this sprint)
- `multi_edit` on large files with non-unique anchors (bare `}`) can silently drop code blocks between two matched positions â†’ always use the most specific surrounding context as anchor
- Wrong barrel import (`components/map/MapSheetOrchestrator` vs `components/map/core/MapSheetOrchestrator`) produces `undefined` on destructure with no import error â€” only crashes at `.property` access â€” always verify re-export list of barrel files before importing from them
