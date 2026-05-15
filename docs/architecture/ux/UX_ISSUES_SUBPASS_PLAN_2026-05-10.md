# UX Issues Sub-Pass Plan — 2026-05-10

**Status:** PLAN READY — awaiting execution approval  
**Scope:** Issues 1–9 + Issues 10–12 from `IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md`  
**Carries forward from:** `PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md` deferred items  
**Format:** Four-track pass framing per `REFACTORING_GUARDRAILS.md` #1 Subsequent Pass Rule

---

## Mandatory Pre-Read Before Any Pass Begins

Every implementer must read these in order before touching any file:

1. `docs/REFACTORING_GUARDRAILS.md` — state layer rules, `useEffect` decision tree, loading state rule, subsequent pass rule
2. `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` — defect classes 2.1–2.14, especially: 2.1 (modal gated on transient parent), 2.2 (imperative auto-open race), 2.13 (cascading useEffect churn), 2.14 (terminal state not locked)
3. `docs/architecture/refactoring/REFACTORING_BIBLE.md` — The Commandments (no >300-line files, no business logic in JSX, every pass has a git checkpoint)
4. `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` — one persistent map, one persistent sheet, one changing mode; `MapScreen.jsx` stays thin
5. `docs/architecture/ux/IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md` — the source issue register this plan implements

Guiding principle for all passes: **the map surface is persistent, the sheet changes mode, chrome floats above both**. No pass may break that contract.

---

## 0. Ground Truth — What Is Already Done

Before any pass begins, confirm these items are shipped and do not re-touch them:

| Item | File | Status |
|---|---|---|
| PT-6: `WAITING_APPROVAL` removed from `isCommitPaymentDismissibleState` | `mapCommitPayment.transaction.js` line 60–66 | ✅ DONE (PT-C) |
| PT-6: `awaitingApprovalRef` prevents `finally` reset during approval window | `useMapCommitPaymentController.js` | ✅ DONE (PT-C) |
| PT-2: `finishCommitPayment` calls `openTracking()` unconditionally | `useMapCommitFlow.js` | ✅ DONE (PT-E) |
| PT-D: `paymentAtoms` wired — `submissionState`, `estimatedCost`, `isLoadingCost` | `useMapCommitPaymentController.js` | ✅ DONE (PT-D) |
| PT-B2: Scalar deps fix for `loadCost` / `refreshPaymentMethodSnapshot` | `useMapCommitPaymentController.js` | ✅ DONE (PT-B2) |
| PT-12: Double `updateVisit` collapsed to single `MONITORING` write | `useRequestFlow.js` | ✅ DONE (PT-G) |
| ETA null guard | `useRequestFlow.js` | ✅ DONE (PT-G) |
| Explore Intent haptics (E-2.1–2.5) | `MapExploreIntentCareSection.jsx`, `MapExploreIntentHospitalSummaryCard.jsx`, `MapExploreIntentStageParts.jsx`, `MapExploreIntentProfileTrigger.jsx` | ✅ DONE (HIG Pass A) |
| Explore Intent `reduceMotion` gate + spring selection (E-2.6, E-2.8) | `MapExploreIntentStageBase.jsx`, `MapExploreIntentCareSection.jsx` | ✅ DONE (HIG Pass B) |
| Explore Intent skeleton timeout fallback + orb dimming (E-2.9, E-2.10) | `MapExploreIntentHospitalSummaryCard.jsx`, `MapExploreIntentCareSection.jsx` | ✅ DONE (HIG Pass C) |
| Explore Intent accessibility labels + live region (E-2.11–2.13) | `MapExploreIntentCareSection.jsx`, `MapExploreIntentHospitalSummaryCard.jsx` | ✅ DONE (HIG Pass D) |
| Service selection footer dock horizontal padding removed | `mapBedDecision.styles.js`, `mapAmbulanceDecision.styles.js`, `useMapStageResponsiveMetrics.js`, `MapBedDecisionStageParts.jsx`, `MapAmbulanceDecisionStageParts.jsx` | ✅ DONE (Quick fix — CTA row full-width without overflow) |

---

## 0.1 Open Deferred Items (From Pre-Tracking Audit)

These must be incorporated into the new passes below, not forgotten:

| ID | Description | Carry-forward pass |
|---|---|---|
| C-1 / PT-B | TanStack Query migration for payment methods + cost | UX-D |
| C-2 / CV-2 | Remove `isSubmitting` boolean — derive all from `submissionState.kind` | UX-D |
| C-3 / PT-4 | Atomic `transitionPendingToActive` Zustand action | UX-D |
| C-4 / PT-3 | `commitFlow` → Jotai atom (session-ephemeral) | UX-D |
| C-5 / EC-2 | Ghost settlement path — `FINALIZING_DISPATCH` UI surface | UX-C |
| C-6 / PT-7 | Stable `Math.random()` display ID — `useRef` per mount | UX-C |
| C-6 / PT-11 | `"8 mins"` fabricated ETA fallback in `mapCommitPayment.helpers.js` | UX-C |
| C-6 / UX-5 | Wallet method shown disabled with balance caption (not silently hidden) | UX-C |
| C-6 / UX-6 | CTA label Dynamic Type truncation (`"Dispatch ($12.00)"`) | UX-C |

---

## 1. Issue Register — Current State

### Issue 1 — Triage Questions Pre-Selected

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 1  
**Live file:** `components/map/views/commitTriage/useMapCommitTriageController.js`  
**Status:** 🔴 Open — not addressed in any prior pass

**Root cause (confirmed in code):**

`initialDraft` (lines 73–102) reads from 11 chained fallback sources:
```
payload?.triageDraft
payload?.triageSnapshot?.signals?.userCheckin
activeAmbulanceTrip?.triage?.signals?.userCheckin
activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin
activeAmbulanceTrip?.triageCheckin
activeBedBooking?.triage?.signals?.userCheckin
activeBedBooking?.triageSnapshot?.signals?.userCheckin
activeBedBooking?.triageCheckin
pendingApproval?.triage?.signals?.userCheckin
pendingApproval?.triageSnapshot?.signals?.userCheckin
pendingApproval?.initiatedData?.triageCheckin
```

On a fresh booking flow with no prior triage, `payload?.triageDraft` is null. However if `activeAmbulanceTrip` was populated by a prior session (cold-start restore, PT-3 / C-4 deferred), the chain falls through to trip-level triage data and populates `initialDraft`. The `useState(initialDraft)` at line 103 seeds the draft with stale answers. `getFirstOpenCommitTriageStepId(steps, initialDraft)` then skips already-answered steps — opening the triage view mid-flow with selections the user never made in this session.

**Compound path:** Even without cold-start restore, if `commitFlow` persists in Zustand (C-4 not done), returning from triage back to bed/ambulance decision and re-opening triage rebuilds `initialDraft` from the same sources, replaying the previous session's answers.

**Fix scope (UX-A):**
- Add `isFreshSession` prop to the controller. When `true`, `initialDraft` is forced to `null` regardless of the fallback chain — options start neutral.
- Distinguish two init modes:
  - **Resume** (`payload?.triageDraft` exists and `payload?.requestId` matches an active trip) — restore draft and step position. This is intentional recovery.
  - **Fresh** (no `payload?.triageDraft` or no matching `requestId`) — always start with empty draft, always open at step 0.
- The existing session-key effect (lines 121–130) correctly resets when the session changes — this already handles the re-open scenario if the session key is stable.
- CTA in `MapCommitTriageStageParts.jsx` must remain disabled until the user actively selects an option for the current step. Audit existing guard.

---

### Issue 2 — Room Card Layout in HALF Snap

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 2  
**Live files:** `MapBedDecisionStageBase.jsx` (lines 345–465), `MapBedDecisionStageParts.jsx`  
**Status:** 🔴 Open

**Root cause (confirmed in code):**

In HALF snap (`!isExpanded`), the render tree contains:
1. `MapBedDecisionHero` — hero room card (always)
2. `MapBedDecisionSavedTransportCard` — when `careIntent === "both"` (always, at this snap state)
3. `MapBedDecisionRoomSwitchRow` — when `decision.roomOptions.length > 1` (always in HALF)
4. `MapBedDecisionRouteCard` — in the HALF else branch (line 429) — always present

Four information clusters visible simultaneously in a half-height sheet. The `MapBedDecisionDetailsCard` is correctly EXPANDED-only (good), but the RouteCard at line 429 renders in HALF as well — adding a second substantial card below the switch rail before the footer.

**Fix scope (UX-A):**
- In HALF snap: Hero + SwitchRow only. RouteCard is EXPANDED-only.
- `MapBedDecisionSavedTransportCard` is a full card in HALF snap (see Issue 3 below). It must become a status pill in HALF.
- Add a visual "expand for more" affordance below the switch rail in HALF (chevron + muted copy).
- EXPANDED: Hero, SwitchRow (or `MapBedDecisionExpandedRoomChoices`), RouteCard, DetailsCard — full depth.

---

### Issue 3 — Saved Transport Card Bleeds Into Bed Decision (Combined Flow)

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 3  
**Live files:** `MapBedDecisionStageBase.jsx` (lines 357–371), `MapBedDecisionStageParts.jsx` (lines 551–629)  
**Status:** 🔴 Open

**Root cause (confirmed in code):**

`MapBedDecisionSavedTransportCard` renders a full glass panel card with icon, title, meta row, and service name when `careIntent === "both"`. It occupies approximately the same visual weight as the Hero card — two full-weight cards in the bed decision context.

The `MapBedDecisionSavedTransportCard` component already has the right intent (confirmation badge with checkmark icon, `MAP_BED_DECISION_COPY.SAVED_TRANSPORT_STEP` label) but is rendered as a full-height card rather than a contextual status pill.

**Fix scope (UX-A):**
- Replace `MapBedDecisionSavedTransportCard` (full card) with a compact inline status strip:
  - Icon: Ionicons `checkmark-circle` (keeps existing pattern)
  - Copy: `"Ambulance confirmed — [tier name]"` or `"Transport: [title]"` in muted caption style
  - No glass panel, no card container — inline row beneath Hero, above SwitchRow
  - Tappable: navigates back to ambulance decision for changes (secondary affordance)
- In HALF snap: this strip collapses further to a micro pill (icon + 1-line label, no tappable action)
- The step header in the bed decision sheet title area should say `"Choose your room"` — not surface transport context

---

### Issue 4 — Hospital Badges Lack Meaning and Hierarchy

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 4  
**Live file:** `components/map/surfaces/hospitals/mapHospitalDetail.helpers.js` (lines 141–155)  
**Status:** 🟡 Open — lower priority, no patient safety impact

**Root cause (confirmed in code):**

`buildHospitalHeroBadges` pushes `"Verified"` with `tone: "verified"` first, then `emergencyLevel` (e.g. `"Level 2"`) with `tone: "alert"`. Both render as peer-weight badges. The `"Standard bed"` constant (line 6) appears without any contextual explanation.

**Fix scope (UX-B):**
- Reorder badge priority: decision-critical signals first (emergencyLevel, wait time, ETA, distance) → trust/quality signals last (Verified, Standard).
- Pair each capability badge with a tooltip/accessible hint: `"Level 2 emergency center — handles complex trauma"`.
- `"Standard"` badge: only show when the hospital has no higher capability tier. When it renders, give it muted/secondary styling — it signals absence of specialty, not a positive feature.

---

### Issue 5 — Mixed Entity Data in Hospital Cards

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 5  
**Live file:** `components/map/views/exploreIntent/MapExploreIntentHospitalSummaryCard.jsx`, `MapHospitalListContent.jsx`  
**Status:** 🟡 Open — lower priority

**Root cause:** Hospital summary cards show network-level totals (total available beds across the ecosystem) alongside hospital-specific data. The card data boundary is not enforced.

**Fix scope (UX-B):**
- Hospital cards (list rows and summary card): hospital-specific data only — name, distance, ETA, rating, price tier, emergency level badge.
- Network totals (`nearbyHospitalCount`, `totalAvailableBeds`, `nearbyBedHospitals`) belong only in the explore intent orb subtexts and the care intent summary section — not inside individual hospital cards.
- Audit `MapExploreIntentHospitalSummaryCard.jsx` and `MapHospitalListContent.jsx` for any cross-boundary data renders.

---

### Issue 6 — Transport Screen Weak Hierarchy

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 6  
**Live files:** `MapAmbulanceDecisionStageBase.jsx`, `MapAmbulanceDecisionStageParts.jsx`  
**Status:** 🟡 Open

**Root cause (confirmed in code):**

The ambulance decision sheet title comes from `mapAmbulanceDecision.content.js` — not dynamically set to `"Select Transportation Option"`. Switch pills in `MapAmbulanceDecisionSwitchRow` use `numberOfLines={1}` which truncates tier names. The `MapAmbulanceDecisionHero` description uses `numberOfLines={2}` — truncates service detail at 2 lines.

**Fix scope (UX-A):**
- Sheet title: ensure the `MapAmbulanceDecisionTopSlot` title always reads the task-language label `"Select Transportation"` (or equivalent from content file — audit current copy).
- Switch pills: allow 2-line labels for longer tier names on compact viewports. Or: use shortLabel for pills + full label in hero.
- Hero description: 3–4 line cap instead of 2. Add `"See full details →"` link to `ServiceDetail` only when description is actually truncated.
- Visual hierarchy: hospital summary compact strip at top, then transport options, then selected option explanation. Route summary below the fold in HALF, accessible in EXPANDED.

---

### Issue 7 — Transport Details Truncated Across Cards

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 7  
**Live files:** `MapAmbulanceDecisionStageParts.jsx` (lines 266–335: `MapAmbulanceDecisionSwitchRow`)  
**Status:** 🟡 Partially addressed by existing SwitchRow+Hero accordion

**Root cause (confirmed in code):**

The current architecture is already close to correct: `SwitchRow` acts as the compressed picker, `Hero` card shows the selected option detail. The issue is that `numberOfLines={1}` on switch pill text (line 327) truncates service names, and the hero description at 2 lines means users must navigate to `ServiceDetail` for any meaningful information about a tier they haven't dispatched yet.

**Fix scope (UX-A):** Combined with Issue 6 — same pass. Accordion discipline is already implemented. Polish only:
- Pills: `numberOfLines={1}` → allow wrapping on 2 lines for pill labels, or use visual shortLabel from content
- Hero: 3-line description cap with "more" affordance
- No accordion expansion of non-selected pills — existing pattern is correct

---

### Issue 8 — Payment Progression CTA

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 8  
**Live files:** `MapCommitPaymentStageParts.jsx` (lines 216–275), `MapCommitPaymentStageBase.jsx`  
**Status:** 🟡 Partially addressed (CTA exists, label and sticky positioning need audit)

**Root cause (confirmed in code):**

`MapCommitPaymentSummaryCard` receives `primaryActionTitle` and renders `EntryActionButton` at the bottom of the card — inside the scroll body, not in a sticky footer. When the payment sheet is in HALF snap (default on non-sidebar layouts), the CTA can fall below the visible scroll viewport if the card content is long.

The CTA label flows from `mapCommitPayment.content.js` → `MAP_COMMIT_PAYMENT_COPY` → needs audit. Deferred items C-5 (`FINALIZING_DISPATCH` surface), C-6 UX-5 (wallet disabled caption), C-6 UX-6 (Dynamic Type truncation) are all in scope here.

**Fix scope (UX-C):**
- Move terminal payment CTA to a sticky footer outside the scroll body — matches the LocationSheet guardrail rule.
- CTA label: task-language — `"Confirm & Dispatch"` (cash/approval), `"Pay $X.XX"` (card) — not generic `"Continue"`. Audit `MAP_COMMIT_PAYMENT_COPY` constants.
- Add `FINALIZING_DISPATCH` UI surface for EC-2 ghost settlement path (carry-forward C-5).
- UX-5: Wallet method shown as disabled row with `"Balance $X.XX — not enough for $Y.YY"` caption. Never silently hidden.
- UX-6: CTA label layout — cost on one line, action verb on second line at large Dynamic Type. Audit with Accessibility Inspector.

---

### Issue 9 — Navigation Stack Resets State

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 9  
**Live files:** `stores/emergencyTripStore.js`, `useMapCommitFlow.js`, `mapCommitPayment.transaction.js`  
**Status:** 🟡 Mostly addressed by Zustand + commitFlow restore. One live gap remains.

**Root cause:**

PT-3 / C-4 (deferred): `commitFlow` persists in Zustand (layer 3), not Jotai (session-ephemeral). This means back navigation within the map sheet restores correctly during the session (Zustand survives navigation), but cold starts see a stale restore (EC-1). The most dangerous state was PT-6 (WAITING_APPROVAL dismissible) — already fixed.

**Fix scope (UX-D):**
- Migrate `commitFlow` from Zustand to Jotai (carry-forward C-4) using `atoms/commitAtoms.ts` from stash.
- Verify the cold-start restore effect in `useMapCommitFlow.js` does not fire when `commitFlow` is null (Jotai reset on app restart).
- This is the correct fix for Issue 9 — it makes back-navigation state restoration session-scoped only, never cross-session.

---

### Issue 10 — OTP CTA Timing In Emergency Commit

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 10  
**Live files:** `MapCommitDetailsStageParts.jsx`, `useMapCommitDetailsController.js`  
**Status:** 🔴 Open — not addressed in any prior pass

**Fix scope (UX-B):**
- On confirmed CTA press in the commit details OTP step: trigger OTP API immediately in parallel with CTA animation.
- CTA state machine: `idle` → `pressed` (haptic) → `requesting` (spinner, OTP call fires) → `ready` (OTP sheet opens) → `failed/retry`.
- Animation duration: compress CTA press animation so the OTP network round-trip is not blocked by a slow ceremony.
- The goal: by the time the user sees the OTP input, the OTP email/SMS is already sent or in-flight.

---

### Issue 11 — Mini Profile Needs Address Entry Point

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 11  
**Live files:** Mini profile surface (TBD — not yet identified in audit)  
**Status:** 🔵 Deferred — LocationSheet must be stable first

**Fix scope (UX-E — LocationSheet dependent):**
- Add address/location management row to mini profile action group.
- Row opens LocationSheet (same owner), not a separate modal.
- Preserve source metadata so LocationSheet can return to mini profile on close.
- Do not implement until LocationSheet decision tree is stable (separate Location passes).

---

### Issue 12 — Blank Frames and Ungraceful Sheet Transitions

**Source doc:** IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS §Issue 12  
**Live files:** `MapPhaseTransitionView`, all `*StageBase.jsx` files, `WelcomeScreen`, `WelcomeMapHandoffCover`, root/auth stack layouts  
**Status:** 🟡 Open — systemic pattern issue; Welcome -> Map route handoff patched

**Fix scope (UX-B):**
- Every sheet phase change must go through `MapPhaseTransitionView` or equivalent staged wrapper.
- Sheet phase transition contract required for all phases:
  - `COMMIT_TRIAGE` → `COMMIT_PAYMENT`: preserve shell, fade body
  - `BED_DECISION` → `COMMIT_DETAILS`: preserve shell, slide body
  - `AMBULANCE_DECISION` → `COMMIT_TRIAGE`: preserve shell
- Loading states: skeleton rows not blank white — audit all `isLoading` + blank body patterns.
- Web sheet swap: verify `MapPhaseTransitionView` is in the render tree for all phase changes on web.

**Resolved subcase — Welcome -> Map empty frame:**
- Problem: pressing **Continue / Request Help** could expose a brief empty route frame before `MapScreen` and `MapExploreLoadingOverlay` painted.
- Root cause: the navigation transition shell was not fully themed, and the source screen faded out before the destination's route-owned loading overlay could visibly take over.
- Implemented correction:
  - themed root/provider/auth stack surfaces through shared app surface tokens,
  - kept `WelcomeScreen` routing directly to `/(auth)/map`,
  - kept `MapExploreLoadingOverlay` as the only `/map` startup loader,
  - added `WelcomeMapHandoffCover` as a source-owned bridge cue with iVisit red progress feedback.
- Guardrail: do not reintroduce `app/(auth)/map-loading.js`; the bridge must not fetch location, refresh hospitals, bootstrap demo data, or own any map readiness logic.

---

## 1.5 MapTopLeftControl — Back-Navigation Capability (Architectural Note)

**File:** `components/map/views/shared/MapTopLeftControl.jsx`  
**Rendered in:** `screens/MapScreen.jsx` line 597–605  
**Current behaviour (confirmed in code):**

```
visible={!isSignedIn && !hasFocusedSheetPhase && !mapLoadingState?.visible}
```

- Shown **only when unauthenticated AND in EXPLORE_INTENT** (`hasFocusedSheetPhase = false`).
- Unauthenticated: renders `chevron-back` → `router.replace("/(auth)/")`
- Authenticated: renders user avatar → `onOpenProfile`
- Hidden entirely once the sheet enters any focused phase (bed/ambulance decision, commit, tracking).

**What the user flagged:** This control already exists as a floating map-chrome button on the left side. It should be extended to provide back-navigation for **authenticated** users across multiple sheet phases — not just for unauthenticated users going back to Welcome.

**Architectural opportunity — what to expand in UX-A:**

The `MapTopLeftControl` already has `onBack` and `isSignedIn` props wired. The component's internal `handlePress` correctly branches on `isSignedIn`. The only missing piece is the `visible` condition in `MapScreen.jsx`.

Proposed expanded visibility contract:

| Sheet phase | Unauthenticated | Authenticated |
|---|---|---|
| `EXPLORE_INTENT` | chevron-back → Welcome | avatar → profile |
| `AMBULANCE_DECISION` | — (not reachable) | chevron-back → EXPLORE_INTENT |
| `BED_DECISION` | — (not reachable) | chevron-back → EXPLORE_INTENT |
| `HOSPITAL_LIST` | — (not reachable) | chevron-back → EXPLORE_INTENT |
| `HOSPITAL_DETAIL` | — (not reachable) | chevron-back → previous phase |
| `COMMIT_DETAILS` | — (not reachable) | **Not shown** — sheet header owns the back button in deep commit phases |
| `COMMIT_TRIAGE` | — (not reachable) | **Not shown** — sheet header owns the back button |
| `COMMIT_PAYMENT` | — (not reachable) | **Not shown** — WAITING_APPROVAL lock must not be bypassed via chrome |
| `TRACKING` | — (not reachable) | **Not shown** — tracking is a terminal state, no back |

**Reasoning for the split:**

- Decision phases (AMBULANCE, BED, HOSPITAL_LIST, HOSPITAL_DETAIL) are exploratory — the user is browsing, not committed. Back via map chrome is natural and low-risk. The sheet header's close button already exists; the chrome back is an additive affordance that mirrors Apple Maps behavior.
- Commit phases (DETAILS, TRIAGE, PAYMENT) already have back buttons in the sheet `TopSlot` header via `MapHeaderIconButton`. Adding a second concurrent back affordance on the map chrome in these phases would be redundant and could create confusion about what "back" means mid-flow.
- `COMMIT_PAYMENT` during `WAITING_APPROVAL` must never offer any back path — this is the PT-6 patient-safety rule. The chrome button must not bypass it.
- `TRACKING` is terminal. No back.

**Implementation scope (UX-A):**

In `MapScreen.jsx`, replace the single `visible` condition with phase-aware logic:

```js
// PULLBACK NOTE: UX-A — MapTopLeftControl back-nav expanded to authenticated users in decision phases
// OLD: visible only for unauthenticated users in EXPLORE_INTENT
// NEW: visible for authenticated users in decision phases (AMBULANCE, BED, HOSPITAL_LIST, HOSPITAL_DETAIL)
//      as a back-to-explore-intent affordance; hidden in commit + tracking phases
const isDecisionPhase =
  sheetPhase === MAP_SHEET_PHASES.AMBULANCE_DECISION ||
  sheetPhase === MAP_SHEET_PHASES.BED_DECISION ||
  sheetPhase === MAP_SHEET_PHASES.HOSPITAL_LIST ||
  sheetPhase === MAP_SHEET_PHASES.HOSPITAL_DETAIL;

const topLeftControlVisible =
  !mapLoadingState?.visible &&
  (!isSignedIn
    ? !hasFocusedSheetPhase          // unauthenticated: EXPLORE_INTENT only
    : isDecisionPhase);              // authenticated: decision phases only
```

The `onBack` prop for authenticated decision phases should call `onCloseDecisionPhase` (or equivalent) — which routes back to EXPLORE_INTENT via `buildExploreIntentSheetView`. This matches the existing `closeCommitDetails` / `closeCommitPayment` pattern in `useMapCommitFlow.js` — use `buildSourceReturnSheetView` or `buildExploreIntentSheetView`.

**Component changes in `MapTopLeftControl.jsx`:**

The component must handle the authenticated back case. Currently `isSignedIn ? onOpenProfile() : onBack()`. Needs a third prop `onDecisionBack` (or: pass `onBack` separately from `onOpenProfile` and drive it from the phase-aware `visible` logic above):

```js
// Cleaner approach — no new prop: caller controls visible, component just calls the right handler
// When visible in decision phase (authenticated): show chevron-back, call onBack
// When visible in explore intent (authenticated): show avatar, call onOpenProfile

// MapTopLeftControl renders chevron-back when:
//   (!isSignedIn) OR (isSignedIn && isDecisionPhase)
// renders avatar when:
//   isSignedIn && !isDecisionPhase
```

Pass `isDecisionPhase` as a prop to the component:

```jsx
<MapTopLeftControl
  isSignedIn={isSignedIn}
  isDecisionPhase={isDecisionPhase}         // new prop
  profileImageSource={profileImageSource}
  onBack={isDecisionPhase ? handleDecisionBack : () => router.replace("/(auth)/")}
  onOpenProfile={handleOpenProfile}
  visible={topLeftControlVisible}
  usesSidebarLayout={usesSidebarLayout}
  sidebarOcclusionWidth={sidebarOcclusionWidth}
/>
```

Inside `MapTopLeftControl`, update the icon and handler:

```js
// PULLBACK NOTE: UX-A — authenticated back chevron in decision phases
// OLD: isSignedIn ? onOpenProfile() : onBack()
// NEW: (isSignedIn && !isDecisionPhase) ? onOpenProfile() : onBack()
const showAvatar = isSignedIn && !isDecisionPhase && profileImageSource;
const showBack = !isSignedIn || isDecisionPhase;
```

**Guardrail compliance:**

- `MapScreen.jsx` stays thin — phase-aware `visible` logic is two lines, not business logic
- No new chrome component — extends existing `MapTopLeftControl` with one new boolean prop
- No `useEffect` for visibility — derived inline from `sheetPhase` (REFACTORING_GUARDRAILS §useEffect Decision Tree: "derived value → inline const")
- `WAITING_APPROVAL` lock not bypassed — `COMMIT_PAYMENT` is explicitly excluded from `isDecisionPhase`
- Haptic is already present on `handlePress` via `Haptics.selectionAsync()` — no change needed
- `accessibilityLabel` must update: add `"Back to map"` when in decision phase

---

## 2. Pass Plan

One PR per pass. No combining across passes. Four-track declaration required for each.

---

### UX-A — Decision Surface Layout

**Priority:** HIGH — user-facing layout and information hierarchy  
**Defects addressed:** Issue 1 (triage pre-selection), Issue 2 (HALF snap layout), Issue 3 (saved transport card), Issue 6 (transport hierarchy), Issue 7 (transport truncation), MapTopLeftControl back-nav (§1.5)  
**Files touched:**

| File | Change |
|---|---|
| `screens/MapScreen.jsx` | `topLeftControlVisible` — phase-aware logic; `isDecisionPhase` derived inline; `onBack` prop for decision phases |
| `components/map/views/shared/MapTopLeftControl.jsx` | Add `isDecisionPhase` prop; update icon + handler branch; update `accessibilityLabel` |
| `useMapCommitTriageController.js` | Add `isFreshSession` guard — empty draft on fresh open, restore only on resume |
| `mapCommitTriage.helpers.js` | Add `buildFreshTriageDraft()` helper — returns empty dict keyed to step IDs |
| `MapBedDecisionStageBase.jsx` | In HALF snap: RouteCard → compact single-row strip (not full removal); SavedTransportCard → status strip |
| `MapBedDecisionStageParts.jsx` | Add `MapBedDecisionTransportStatusStrip` (compact inline row) as named export |
| `MapAmbulanceDecisionStageParts.jsx` | Switch pills: 2-line label allow; hero description: 3-line cap + "more" affordance |
| `mapAmbulanceDecision.content.js` | Audit title copy — task language `"Select Transportation"` |
| `mapBedDecision.content.js` | Audit sheet title copy — `"Choose Your Room"` |

**Four-track:**

| Track | Scope |
|---|---|
| State management | `useMapCommitTriageController.js` — initialization path change only. No new state layer. `isDecisionPhase` derived inline (not `useEffect`) — per REFACTORING_GUARDRAILS §useEffect Decision Tree: derived value → `useMemo` or inline const. |
| UI quality | MapTopLeftControl back chevron in decision phases. Bed decision HALF snap: Hero + compact RouteStrip + SwitchRow. Transport pills: 2-line. Transport status strip replaces full card in HALF. |
| DRY / modular | `MapBedDecisionTransportStatusStrip` as named export in StageParts. If StageParts exceeds 950 lines after addition, extract to `mapBedDecision.transportStrip.jsx`. No inline lambda props introduced (REFACTORING_BIBLE Commandment 2: avoid anonymous functions in props). |
| Documentation | PULLBACK NOTE on every structural change (format per §6). This file §3 pass log updated post-commit. |

**Guardrails compliance for UX-A:**

- `MapScreen.jsx` remains thin — `isDecisionPhase` is two derived lines, not business logic (MAP_SCREEN_IMPLEMENTATION_RULES_V1 §3)
- `COMMIT_PAYMENT` excluded from `isDecisionPhase` — WAITING_APPROVAL lock cannot be bypassed via chrome (TRACKING_SHEET_LEARNINGS defect class 2.14)
- No `useEffect` for phase-aware visibility — derived from `sheetPhase` prop already in scope
- No anonymous functions in props — `handleDecisionBack` extracted as `useCallback` in `MapScreen.jsx` (REFACTORING_BIBLE Commandment 2)
- Triage `isFreshSession` guard: no `useEffect` introduced — guard is applied during `useMemo` initialization, not as a side effect

**Invariants (must not change):**

- `MapBedDecisionSavedTransportCard` full-card kept and rendered in EXPANDED snap — no deletion
- No removal of `careIntent === "both"` logic — visual scope reduced in HALF only
- Triage step progression, live save, copilot prompt logic — entirely untouched
- `MapTopLeftControl` unauthenticated → Welcome behaviour — unchanged
- No network calls added or changed in any UX-A file

---

### UX-B — Visual Hierarchy and Transition Discipline

**Priority:** MEDIUM — information correctness and motion quality  
**Defects addressed:** Issue 4 (badge hierarchy), Issue 5 (entity data boundary), Issue 10 (OTP timing), Issue 12 (sheet transitions)  
**Files touched:**

| File | Change |
|---|---|
| `mapHospitalDetail.helpers.js` | Reorder badge priority: capability first → trust/quality last. Add `accessibilityHint` per badge. `"Standard"` badge → muted styling. |
| `MapHospitalListContent.jsx` | Audit and remove any network-total data from individual hospital rows |
| `MapExploreIntentHospitalSummaryCard.jsx` | Audit and remove any cross-entity data from the summary card |
| `useMapCommitDetailsController.js` | OTP: fire API on CTA press, not after animation completes |
| `MapCommitDetailsStageParts.jsx` | CTA state machine: `idle → pressed → requesting → ready → failed` |
| `MapPhaseTransitionView` (or relevant wrapper) | Verify all phase transitions use the existing wrapper; patch any direct swap paths |

**Four-track:**

| Track | Scope |
|---|---|
| State management | `useMapCommitDetailsController.js` — OTP call moved earlier in the press handler. No new state layer. |
| UI quality | Badge reorder, muted Standard, cross-entity data removed, OTP CTA animation compressed, phase transitions graceful. |
| DRY / modular | Badge builder helpers remain in `mapHospitalDetail.helpers.js`. No new files. |
| Documentation | PULLBACK NOTE on each. Pass log updated. |

**Guardrails compliance for UX-B:**

- Badge reorder is a pure helper function change — no component restructure, no state (REFACTORING_BIBLE: business logic in helpers not components)
- OTP API early trigger: verify it does not violate the `useEffect` decision tree — the call is a side effect on press (timer/network), so a direct call in the event handler is correct. Do not wrap it in `useEffect`
- Phase transition: use existing `MapPhaseTransitionView` — do not create a new animated wrapper (TRACKING_SHEET_LEARNINGS defect class 2.1: modal/surface gated on transient parent)
- No new files created unless a StageParts file crosses 950 lines

**Invariants:**

- Badge rendering component unchanged — only helper output order changes
- Hospital card visual layout unchanged — data removed, not redesigned
- OTP API call signature unchanged — timing only
- Phase transition wrapper: only add where missing, do not restructure existing animated paths

---

### UX-C — Payment Surface HIG Polish

**Priority:** HIGH (carries forward patient-safety-adjacent deferred items)  
**Defects addressed:** Issue 8 (payment CTA sticky + label), C-5 (FINALIZING_DISPATCH surface), C-6/PT-7 (display ID stable), C-6/PT-11 (ETA fallback), C-6/UX-5 (wallet caption), C-6/UX-6 (Dynamic Type)  
**Files touched:**

| File | Change |
|---|---|
| `MapCommitPaymentStageParts.jsx` | Move terminal CTA to sticky footer outside scroll body |
| `MapCommitPaymentStageParts.jsx` | Add `FINALIZING_DISPATCH` UI surface — non-retryable "Payment sent — confirming dispatch" |
| `MapCommitPaymentStageParts.jsx` | Wallet row: disabled state with balance caption `"Balance $X.XX — not enough"` |
| `mapCommitPayment.content.js` | Audit CTA label constants — task language: `"Confirm & Dispatch"` / `"Pay $X.XX"` |
| `useMapCommitPaymentController.js` | Stable display ID: `useRef` per mount instead of `Math.random()` per submit (PT-7) |
| `mapCommitPayment.helpers.js` | Remove `"8 mins"` fallback ETA — return `null` (PT-11) |
| `MapCommitPaymentStageBase.jsx` | ETA display: handle `null` → show `"Calculating…"` or omit pill |

**Four-track:**

| Track | Scope |
|---|---|
| State management | No layer changes. `FINALIZING_DISPATCH` already exists as a `submissionState.kind` constant — only the UI surface is new. |
| UI quality | Sticky footer for terminal CTA, `FINALIZING_DISPATCH` surface, wallet disabled caption, task-language CTA, Dynamic Type audit. |
| DRY / modular | `MapCommitPaymentStageParts.jsx` is 898 lines. If sticky footer extraction pushes it past 950, extract `MapCommitPaymentStickyFooter` as a named export. |
| Documentation | PULLBACK NOTE on each. Pass log updated. |

**Guardrails compliance for UX-C:**

- Sticky footer CTA: `EntryActionButton` stays the same primitive. Prop threading (`canConfirm`, `primaryActionTitle`, `onSubmit`) goes up to StageBase — this is correct layer ownership (view composes, controller owns handlers). Not a state layer change.
- `FINALIZING_DISPATCH` UI: check TRACKING_SHEET_LEARNINGS defect class 2.1 — the `FINALIZING_DISPATCH` surface must be rendered at the StageBase level, not inside a child card that can unmount
- Wallet disabled state: render the option with `disabled` styling + caption. Do not conditionally remove it from the list. Per REFACTORING_GUARDRAILS §Loading State Rule: preserve the layout shell, show pending/disabled state, never blank
- PT-7 display ID: `useRef` initialized once on mount — not a `useEffect` (derived constant via ref, per useEffect decision tree: "Y is a ref → assign inline")
- PT-11 ETA `null`: removing the `"8 mins"` string is the only change. The tracking sheet ETA display null-path must be verified before commit — no fabricated data in emergency context (Apple HIG trust standard)

**Invariants:**

- `FINALIZING_DISPATCH` is already a valid `MAP_COMMIT_PAYMENT_TRANSACTION_STATES` constant — no state machine changes
- `isCommitPaymentDismissibleState` not touched — PT-C fix protected
- `awaitingApprovalRef` pattern not touched — PT-C fix protected
- CTA sticky footer uses the same `EntryActionButton` component — no new button primitive

---

### UX-D — State Layer Completion (Deferred Architecture)

**Priority:** MEDIUM — correctness and cold-start safety  
**Defects addressed:** Issue 9 (navigation reset), C-1/PT-B (TanStack Query), C-2/CV-2 (`isSubmitting` removal), C-3/PT-4 (atomic store transition), C-4/PT-3 (`commitFlow` → Jotai)  
**Files touched:**

| File | Change |
|---|---|
| `atoms/commitAtoms.ts` (stash) | Adopt: `commitFlow` Jotai atom |
| `stores/emergencyTripStore.js` | Remove `commitFlow` field + `setCommitFlow` / `clearCommitFlow` actions |
| `useMapCommitFlow.js` | Rewire all `commitFlow` reads/writes to Jotai atom |
| `emergencyTripStore.js` | Add `transitionPendingToActive(trip)` action — atomic single write |
| `useMapCommitPaymentController.js` | Replace `isSubmitting` boolean — derive all UI state from `submissionState.kind` |
| `MapCommitPaymentStageBase.jsx` | Update consumers of `isSubmitting` — derive from `submissionState.kind` |
| `hooks/payment/usePaymentMethodsQuery.ts` (stash) | Adopt: payment methods TanStack Query |
| `hooks/payment/usePaymentCostCalculation.ts` (stash) | Adopt: cost calculation TanStack Query |
| `hooks/payment/useWalletBalanceQuery.ts` (stash) | Adopt: wallet balance TanStack Query |

**Four-track:**

| Track | Scope |
|---|---|
| State management | `commitFlow` → Jotai (session-ephemeral). Payment data → TanStack Query (layer 2). `isSubmitting` removed (single source of truth). `transitionPendingToActive` Zustand action added. |
| UI quality | No visual changes. Data already correct — this pass removes the loading churn that the user perceives as flicker. |
| DRY / modular | Stash adoption: read each stash file against current code before adopting. Apply PULLBACK NOTE on every adoption. |
| Documentation | PULLBACK NOTE on each. Constraint entries C-1 through C-4 marked resolved in the pre-tracking audit doc. |

**Guardrails compliance for UX-D:**

- State layer assignments per REFACTORING_GUARDRAILS §Canonical Layers:
  - `commitFlow` → Jotai (ephemeral UI state, not persistent client state) ✓
  - Payment methods list → TanStack Query (server cache) ✓
  - `isSubmitting` → remove (derived from `submissionState.kind`, per useEffect decision tree: "machine state → Jotai atom or XState, not boolean useState")
  - `transitionPendingToActive` → Zustand action (persistent client state) ✓
- `emergencyTripStore.js` is high blast-radius: git checkpoint before any edit (REFACTORING_BIBLE Commandment 8: "Record monolith baseline hash before first pass")
- Stash adoption: read each stash file against current code before adopting — never drop logic silently (TRACKING_SHEET_LEARNINGS §1.4 "never bundle gains")
- `isSubmitting` removal: grep all consumers before removing — blast radius audit is mandatory, not optional
- TanStack Query: `QueryClient.invalidateQueries` must be wired before `refreshPaymentMethodSnapshot` is removed — never leave a gap window where methods list is stale after a new card is added
- One sub-step per commit. Do not batch stash adoptions. Each adoption is its own checkpoint.

**Invariants (CRITICAL — high blast-radius pass):**

- One stash file adopted per sub-step. Verify behaviour parity before proceeding.
- `emergencyTripStore.js` changes: add `transitionPendingToActive` first, verify, then remove `commitFlow`.
- `isSubmitting` removal: audit every consumer of `isSubmitting` in `MapCommitPaymentStageBase.jsx` before removing from controller.
- TanStack Query adoption: must preserve wallet eligibility filter (`walletBalance >= checkoutTotal`) — this is a safety check.
- Payment method add flow: `QueryClient.invalidateQueries` must be wired into the add-card handler before removing `refreshPaymentMethodSnapshot`.

---

### UX-E — LocationSheet + Mini Profile (Location Passes Dependent)

**Priority:** LOW — blocked on LocationSheet stability  
**Defects addressed:** Issue 11 (mini profile address entry), LocationSheet guardrail compliance  
**Status:** DEFERRED until Location passes are complete

**Prerequisites:**
- LocationSheet decision tree (search → candidate → save category → save details → pickup commit) is stable
- LocationSheet has a single owner (not multiple modals)
- Location passes have shipped

**When unblocked, scope:**
- Mini profile: add `"Address & Location"` row → opens LocationSheet with `sourcePhase: "miniProfile"` metadata
- LocationSheet close: when `sourcePhase === "miniProfile"`, return to mini profile (not explore intent)
- No new address management surface — LocationSheet is the sole owner

---

## 3. Pass Order and Dependencies

```
UX-A (layout, triage)
  ↓
UX-B (hierarchy, transitions)
  ↓
UX-C (payment polish)
  ↓
UX-D (state architecture)    ← highest blast radius, do last
  ↓
UX-E (location — blocked)    ← unblocks after Location passes
```

UX-A and UX-B can be worked in parallel on different file sets, but should be reviewed in sequence to avoid conflicting changes to shared surfaces.

UX-D must come after UX-C because UX-C may reveal new consumers of `isSubmitting` that need to be catalogued before UX-D removes it.

---

## 4. File Line Count Pre-Flight

Current line counts (must stay within architecture targets):

| File | Lines | Target | Status |
|---|---|---|---|
| `MapBedDecisionStageParts.jsx` | 899 | max 450 (Complex Feature Component) | 🚨 Exceeds — flag responsibility leakage |
| `MapAmbulanceDecisionStageParts.jsx` | 746 | max 450 | 🚨 Exceeds |
| `MapCommitPaymentStageParts.jsx` | 898 | max 450 | 🚨 Exceeds |
| `useMapCommitTriageController.js` | 603 | max 300 (Hook) | 🚨 Exceeds |
| `MapBedDecisionStageBase.jsx` | 467 | max 500 (Screen file) | ⚠️ Near limit |
| `mapCommitPayment.transaction.js` | 166 | max 250 (State file) | ✅ |

**StageParts file policy:** These files are multi-export component libraries, not single surfaces. They follow the "Complex Feature Component" target of max 450 lines per logical group. When a StageParts file exceeds 900 lines, mandatory extraction applies.

**Extraction rule for UX passes:** If any UX-A/B/C change pushes a StageParts file past 950 lines, extract the new component into a named sub-file (e.g., `mapBedDecision.transportStrip.jsx`). Do not create standalone files for pure style extractions.

---

## 5. Verification Protocol Per Pass

After each pass:

1. **Behaviour parity check** — every component that existed before still renders the same data; only layout/order/copy changed
2. **HALF snap visual test** — bed decision sheet with `careIntent === "both"`: Hero + compact RouteStrip + StatusStrip + SwitchRow visible; no full RouteCard
3. **Triage fresh open** — fresh booking (no prior triageDraft): all options neutral; step 0 open; CTA disabled
4. **Triage resume** — return to triage with matching requestId + triageDraft: prior answers restored; step restored
5. **Payment CTA** — in HALF snap on non-sidebar layout: CTA visible without scrolling
6. **WAITING_APPROVAL** — re-tap CTA during approval wait: CTA locked (no dismiss) — this is the PT-C regression guard
7. **MapTopLeftControl back-nav** — authenticated user in AMBULANCE_DECISION: back chevron visible, tap returns to EXPLORE_INTENT. In COMMIT_PAYMENT: control is hidden entirely. In EXPLORE_INTENT: avatar visible, opens profile.
8. **Unauthenticated back-nav unchanged** — unauthenticated user in EXPLORE_INTENT: back chevron → `/(auth)/`. Regression guard for existing behaviour.
9. **useEffect audit** — any new `useEffect` added in the pass must be justified against the decision tree in REFACTORING_GUARDRAILS. If it derives a value, convert to `useMemo` or inline const before merging.
10. **Line count** — no file introduced that exceeds its architecture target without documented justification and a noted extraction plan

---

## 6. PULLBACK NOTE Convention

Every changed line must carry a PULLBACK NOTE if it reverses or diverges from a prior documented decision:

```js
// PULLBACK NOTE: UX-A — fresh triage initialization
// OLD: initialDraft populated from 11-chain fallback (includes trip-level triage)
// NEW: when isFreshSession, initialDraft forced to null — options start neutral
```

Format: `UX-[pass letter]` prefix, `OLD:` what it was, `NEW:` what it is, one sentence each.

---

## 7. Authorship and Review

- Each pass results in one focused commit
- Commit message format: `fix(ux-[pass]): [what changed, one line]`
- Pre-commit: verify PULLBACK NOTE present on every structural change
- Post-commit: update §3 Pass Log in this document with actual files changed and test results

Done when:
- UX-A through UX-D are shipped and pass verification protocol
- All `🔴 Open` issues in §1 are moved to ✅
- No C-1 through C-6 items remain in the open deferred list
- LocationSheet passes have unblocked UX-E

---

## Pass 19B Finding - Ambulance Sprite First-Paint Direction

**Status:** commit-payment preview fixed; tracking animation follow-up recommended.

Confirmed issue:

- The ambulance sprite uses 16 pre-rendered directional buckets.
- `0` means north/up and is a valid direction, not an unknown value.
- In commit-payment preview, a missing heading fallback of `0` caused the ambulance to face north even when pickup was south/lower than the hospital.

Confirmed correction:

- `useMapFocusedState` now returns `null` when it cannot compute ambulance heading.
- `EmergencyLocationPreviewMap` then computes the preview heading from hospital -> pickup using its own selected hospital and pickup coordinates.

Tracking follow-up:

- `useAmbulanceAnimation` still initializes heading to `responderHeading` or `0`.
- If there is no live responder heading, the tracking marker can briefly paint north before the route lookahead heading is calculated.
- Recommended next pass: seed tracking animation heading synchronously from route start -> lookahead before the first marker render.

---

## Pass 19C Finding - Service Selection CTA Row

**Status:** ambulance and bed decision footer rows refined.

Confirmed issue:

- The footer dock already owned horizontal padding, so no new row inset was needed.
- The secondary hospital exploration CTA used a fixed `50` height while the primary CTA read responsive footer metrics.
- The secondary CTA also used fixed no-shrink behavior, so compact exploration copy needed a calmer row-safe label.

Confirmed correction:

- Ambulance and bed decision rows now share one CTA height/radius contract from `stageMetrics.footer`.
- Secondary exploration copy is now `Browse`.
- The browse pill can shrink within a bounded max width while the primary CTA keeps the main action slot.
- CTA labels use one-line scale-down behavior instead of vertical clipping under larger accessibility text.

Implementation rule:

- Service-selection footer rows must keep a single horizontal padding owner: the footer dock.
- Primary and secondary CTAs in the same row must share the same min-height/radius source.
- Exploration actions should use calm, explicit copy. Use `Browse` for compact service-selection CTA rows; reserve fuller copy for roomier surfaces.

---

## Pass 19F Finding - Surface Text Resilience

**Status:** shared primitive created; first high-risk emergency/map surfaces migrated.

Confirmed issue:

- The app had two local fade-end implementations: LocationChrome pickup subtitle and Explore Intent hospital title.
- Many compact emergency/map surfaces still relied on raw `numberOfLines={1}`, creating harsh ellipsis or abrupt truncation.
- Some compact controls used fixed text container heights where `minHeight` plus padding would better survive Dynamic Type.

Confirmed correction:

- `components/ui/FadeEndText.jsx` is now the shared dense-surface clipping primitive.
- It preserves the full accessible label while visually clipping under a trailing non-interactive surface overlay; it does not add its own blur, border, shadow, or elevation, so existing glass/blur surfaces remain the single depth owner.
- The overlay renders only after measured overflow; it should not appear as decoration when the label already fits.
- Location chrome, Explore hospital hero, map search rows/chips, manual location rows/summaries, recents/history rows, ambulance/bed route labels, and legacy emergency hospital cards now use the primitive.
- Manual location search bar changed from fixed `height` to `minHeight` plus vertical padding.

Implementation rule:

- For compact single-line entity labels in map/emergency sheets, prefer `FadeEndText` over visible ellipsis.
- Call sites must pass a resolved parent surface color, not a low-alpha tint token, otherwise the fade can look like a sharp strip instead of a continuation of the surface.
- Use `minHeight` plus padding around text-bearing controls unless the element is a deliberately compact chrome control.
- Horizontal text rows must provide `minWidth: 0` / `flexShrink` at the copy container so text can yield before it clips.
- Do not globally disable font scaling. Cap scaling only on tiny chrome where the control has a fixed physical contract.

---

## Pass 19G Finding - Dynamic Type Vertical Text Clipping

**Status:** first high-risk shared surfaces hardened; broader app audit remains open.

Confirmed issue:

- Several emergency/map controls already used `minHeight`, but compact text rows still lacked local scale ceilings, explicit shrink behavior, or enough vertical padding.
- Some button-like surfaces used fixed `height` even though they contained labels that can grow under iOS Dynamic Type or Android font scaling.
- The most immediate risk was in shared intent orbs/cards, manual address sticky CTA, payment summary rows, ambulance type cards, and ambulance/bed decision headers.

Confirmed correction:

- Shared `IntentOrb` and `IntentCard` labels now use compact local scale caps and shrink behavior, preserving accessibility scaling without allowing the orb/card text to vertically crop the surface.
- Manual address sticky CTA changed from fixed `height` to `minHeight` plus vertical padding, with centered shrinkable labels.
- Manual completed summaries and active context hints now cap compact row text locally.
- Places Hub pinned and saved-place rows now use a shrink-safe copy column, explicit subtitle line height, and local scale caps so individual place rows do not vertically clip under large fonts.
- Service-selection ambulance and bed phases now apply `FadeEndText` to hero titles, compact switch-pill labels, and route subtext so long transport/room/hospital/address labels do not fall back to harsh clipping.
- Ambulance type cards gained explicit line heights, shrink-safe header/value columns, and wrapping pills so large text does not crop meta rows.
- Commit payment hero, summary, breakdown, info, and action rows now use local `maxFontSizeMultiplier` and shrink-safe copy/value layout.
- Location save-detail primary action changed from fixed `height` to `minHeight` plus vertical padding.
- Ambulance and bed decision top header text now caps compact one-line labels locally; decorative media wrappers changed away from text-bearing fixed height where relevant.

Implementation rule:

- Text-bearing controls should use `minHeight` plus `paddingVertical`; fixed `height` is allowed for pure icons, media, skeletons, and intentionally tiny chrome only.
- Emergency-critical labels should generally support up to `1.4`; compact CTA titles around `1.25`; supporting subtext around `1.3`.
- Horizontal rows must set `minWidth: 0` on copy columns and `flexShrink: 1` on text that can yield.
- Do not solve Dynamic Type clipping with global `allowFontScaling={false}`.
- When a surface must remain single-line, cap scaling locally and preserve the full value through accessible labels or full-detail drill-in paths.

Remaining audit:

- `CountryFlagGlyph` intentionally disables font scaling because it is a flag glyph, not user-readable copy.
- `EmergencyLocationSearchSheet` still has list `maxHeight` constraints that should be reviewed in a later sheet-scroll pass.
- The legacy emergency/request modal cluster has more fixed visual dimensions; only the active ambulance card surface was hardened in this pass.
- Continue checking saved-place/list-row variants outside the Location Sheet before marking the app-wide Dynamic Type audit closed.
