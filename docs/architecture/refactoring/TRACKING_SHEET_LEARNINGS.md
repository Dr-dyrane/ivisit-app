# Tracking Sheet Phase — Cross-Cutting Learnings

**Source**: Tracking sheet audit + stash review (`stash@{0}` from `recovery/clean-2026-04-25`)
**Date**: 2026-04-26 (updated 2026-04-28)
**Audience**: Future passes across MapScreen, EmergencyContext, Commit flow, Visit history, Payment.
**Mandate**: These learnings apply codebase-wide. Treat as global rules for the same defect classes.

---

## ⚡ Quick Reference — The `useEffect` Decision Tree

> Before reaching for `useEffect`, walk this tree top to bottom.
> `useEffect` only wins the **last** branch. In practice: no subscription, no timer → it's wrong.

```
"When X changes, I need Y"
         │
         ▼
Is Y a value derived from X?
  → YES → useMemo / inline const — no hook needed
           Example: ratingState + visits → validatedRatingState (BUG-012 fix)

Is Y a ref that mirrors X?
  → YES → assign ref.current = X inline during render, no useEffect
           Example: totalCostValueRef = totalCostValue (useMapCommitPaymentController)

Is Y a machine state with named terminal values (IDLE, WAITING, FAILED…)?
  → YES → Jotai atom (L5) or XState (L4)
           Example: submissionState in useMapCommitPaymentController

Is Y server data triggered by X?
  → YES → TanStack Query with X in queryKey or enabled: Boolean(X)
           Example: estimatedCost query enabled on hospitalId

Is Y a real side-effect — subscription, cleanup, timer, navigation?
  → YES → useEffect is correct here
           Example: Supabase realtime channel setup/teardown
```

**Rule of thumb**: if you are not managing a subscription, timer, or cleanup, `useEffect` is probably wrong. The violation only surfaces as a bug *later* — stale closure, missed dep, extra render, race condition — never at the point of writing.

---

## 1. Stash Reconnaissance Summary

The stash on `recovery/clean-2026-04-25` contained 224 files including a parallel attempt at the same problem area. Three files matter for this audit.

### 1.1 `useTrackingRating.js` (270 lines, stash) — **SAME DEFECT AS CURRENT**
- Extracted rating into its own hook.
- Used local `useState(INITIAL_RATING_STATE)` — same pattern as today's `useMapTrackingController.js`.
- **Failure mode**: rating modal still lived downstream of `MapTrackingStageBase`; sheet phase change still unmounted it.
- **Lesson**: extracting into a hook is necessary but not sufficient. The renderer location is the actual defect.

### 1.2 `useMapScreenTracking.js` (164 lines, stash) — **PARTIAL CORRECT INSIGHT**
- Lifted **recovered** rating modal state to MapScreen level (`useState` for `recoveredRatingState`).
- Did NOT lift the in-flow rating state (still in tracking subtree).
- Used `useState` instead of Jotai → did not survive Metro restart or sheet phase navigation.
- **Lesson**: The stash author recognised the lifting requirement but only for half the problem (recovery). Apply it to BOTH in-flow and recovered rating, and back with persisted Jotai.

### 1.3 `useMapSheetPhase.js` (215 lines, stash) — **GAIN: EXPLICIT TRANSITION TABLE**
- Defined a `validTransitions` map: `{ EXPLORE_INTENT: [HOSPITAL_DETAIL, ..., TRACKING], ... }`.
- Had `transitionTo(targetPhase)` that warned on invalid transitions and blocked them.
- Had `goBack()` using `sheetPayload.sourcePhase` history.
- **Failure mode**: bundled with the rejected wholesale stash, so nothing landed.
- **Lesson worth adopting** (separately, in its own pass): formal sheet-phase state machine. We already have XState for trip lifecycle; we should consider an XState (or simple validated reducer) for sheet phase.

### 1.4 Why the stash was rejected wholesale
- 224 files in one bundle violated the "one phase at a time" rule.
- Mixed correct insights (rating lifting, transition validation, atom-backed state) with rejected patterns (`EmergencyContextAdapter`).
- **Lesson**: never bundle gains. Cherry-pick patterns into discrete passes.

---

## 2. Cross-Cutting Defect Classes

These show up everywhere in the codebase. Document once, hunt them down systematically.

### 2.1 Modal renderer gated on transient parent

**Pattern**: A modal is rendered inside a component that mounts/unmounts based on screen state.

**Symptoms**:
- "Rating modal sometimes doesn't show."
- "Toast disappears when I navigate."
- "Confirmation dialog flashes and vanishes."

**Diagnosis**: Modal lives at the wrong level of the tree. State may persist; renderer doesn't.

**Fix recipe**:
1. Lift the renderer to a level that survives the relevant transitions (often: screen root, sometimes: app root).
2. Keep state in Jotai (or Zustand) so it survives reload.
3. Drive `visible` from the persisted state, not from local props.
4. If modal needs context-rich data, store the snapshot at the moment of trigger — do not rely on live derived data.

**Other suspected sites in this codebase**:
- Recovered rating modal (history visits)
- Cancellation confirmation modals if any are inside transient sheets
- Triage in-flow prompts
- Payment success/failure overlays

---

### 2.2 Imperative auto-open relying on data race

**Pattern**: After event X completes, call `openY()` directly. Works most of the time; fails when state is async-hydrated.

**Symptoms**:
- "Sometimes after payment, tracking doesn't open."
- "Cold start with active trip lands on the wrong sheet."
- "First load after Metro restart shows blank state for a beat."

**Diagnosis**: The single-shot imperative call assumes state is ready. Zustand hydration, TanStack invalidation, and Realtime sync all complete asynchronously.

**Fix recipe** (the "double-run" pattern):
1. Keep the imperative call (it's correct when state is ready).
2. Add a derived effect that fires on the canonical lifecycle flag (e.g. XState `hasActiveTrip`).
3. Effect runs at every render where the flag is true and the target phase has not yet been entered.
4. Use a dismissed-ref to allow user to opt out of auto-open.

**Other suspected sites**:
- Payment success → tracking auto-open
- Active trip on cold start → tracking auto-open
- Ambulance approval → snap-to-medium sheet detent
- Bed booking confirmed → tracking sheet

---

### 2.3 Raw status string comparisons instead of XState flag

**Pattern**: `if (trip?.status === "in_progress" || trip?.status === "accepted")` scattered across the codebase.

**Symptoms**:
- Behaviour drifts between files (one checks for `"accepted"`, another forgets).
- Adding a new status requires editing 75+ files (audit confirmed this number in Phase 5 work).
- Illegal-state combinations possible.

**Diagnosis**: XState `tripLifecycleMachine` already encodes legal transitions. Raw string checks bypass it.

**Fix recipe**:
1. For any boolean derived from status, use `useTripLifecycle()` flags: `isIdle`, `isPendingApproval`, `isActive`, `isArrived`, `isCompleting`, `isCompleted`, `isRatingPending`, `hasActiveTrip`.
2. Never re-derive these flags inline.
3. If a flag is missing, add it to the machine, not to the consumer.

**Currently safe sites** (per Phase 5 audit): tracking subtree, commit controllers.
**Currently UNSAFE sites**: anything still doing raw `status ===` checks. A grep is the next sweep.

---

### 2.4 Persistent state via raw AsyncStorage instead of `database` abstraction

**Pattern**: `import AsyncStorage from "@react-native-async-storage/async-storage"` directly in a feature file.

**Symptoms**:
- Inconsistent prefixing → namespace collisions across builds.
- Skips timeout/error wrapping.
- Storage not auditable — `getActiveKeys()`/`stats()` won't see the value.

**Diagnosis**: All persistence goes through `database` + `StorageKeys` (`@c:\Users\Dyrane\Documents\GitHub\ivisit-app\database\index.js`).

**Fix recipe**:
1. Add a key to `StorageKeys` in `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\database\keys.js`.
2. Register in `SingletonKeys` or `CollectionKeys`.
3. Use `database.read(key, default)` and `database.write(key, value)`.
4. For Jotai atoms, build a small adapter pattern (see `mapScreenAtoms.js:46-73` `persistedTrackingAtom`) that bundles related fields under one storage key.

**Lesson reinforced this session**: I personally violated this and wrote raw `AsyncStorage` calls. User caught it. The fix path is documented above.

---

### 2.5 Bundling related ephemeral state into separate atoms

**Pattern**: Four atoms each persisting individually. Each write triggers four storage operations.

**Symptoms**:
- Storage thrash on hot updates (e.g. progress value changing every second).
- Hydration race — atoms read at different times, see inconsistent state.

**Fix recipe**:
1. Identify the cluster (e.g. tracking visualization: `statusPhase`, `progressValue`, `hasSheetTitleAnimated`, `ratingState`).
2. One storage key (`StorageKeys.TRACKING_VISUALIZATION`).
3. One in-memory cache, single hydrate, atomic writes.
4. Each atom reads from / writes to its field in the bundle.

**Implementation reference**: `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\atoms\mapScreenAtoms.js:19-73`.

---

### 2.6 Visualization wrappers added without checking existing parts

**Pattern**: A new feature adds an animation/gradient/underlay without checking if the target component already has one.

**Symptoms**:
- Double underlays.
- Two animations fighting each other.
- Padding stacked twice.

**Fix recipe**:
1. Before adding visual scaffolding, read the target component end to end.
2. Look for existing `progressFill`, `gradientOverlay`, animated values.
3. Extend props on the existing component instead of wrapping it.
4. If you must wrap, document why the existing primitive is insufficient.

**Lesson reinforced this session**: I wrapped `TrackingTeamHeroCard` in a redundant `LinearGradient`. User caught it.

---

### 2.7 Dynamic theme colors leaking to icon/chrome

**Pattern**: A semantic color (e.g. status red/yellow/green) is passed as a generic prop, ends up tinting unrelated UI (chevrons, icons).

**Symptoms**:
- Toggle button changes color when status changes.
- Subtle visual hierarchy degradation.

**Fix recipe**:
1. Separate semantic props: `titleColor` (chrome) vs `titleTextColor` (status-aware).
2. Default the status-aware prop to the chrome color.
3. Audit downstream consumers to ensure each uses the right channel.

---

### 2.8 Local UI state surviving across mount cycles

**Pattern**: Animated values reset on remount; user perceives "tracking restarted."

**Symptoms**:
- Title re-animates on every Metro restart.
- Progress visually jumps back to zero before resyncing.

**Fix recipe**:
1. Identify what the user perceives as "live data." (Tracking position is live; "title has animated" is also live.)
2. Persist that perception via `database` + Jotai atom.
3. Component-local `Animated.Value` refs initialise from the persisted value, not zero.
4. Only animate the delta from persisted to current; not the full range.

---

### 2.12 Defending immutable real-world moments at the store mutation layer

**Pattern**: A piece of state represents an immutable real-world moment (trip start time, payment timestamp, booking creation time). Multiple independent writers (TanStack queries, realtime patches, optimistic local updates, hydration) all replace the parent object on every update — and one or more of them sometimes derive the moment from `Date.now()` because the upstream payload doesn't carry it. Even with a "preserve when next is null" guard, a writer producing a fresh `Date.now()` (a finite number) slips through and silently resets the moment, restarting any UI that derives elapsed time from it.

**Symptoms**:
- "Trip start time keeps drifting forward across writes."
- "Progress bar restarts on Metro reload even though the trip object survives hydration."
- "After hydration the value is correct for a few writes, then jumps to a fresh `Date.now()`."

**Diagnosis**: Defending only against `null`/non-finite is not enough. A real-world moment is **immutable per identity** — the only acceptable change is `null → finite`, never `finite → finite_different`.

**Fix recipe (store invariant)**:
```js
// One-time write semantics for immutable timestamps per identity.
const preserveTripStartedAt = (prev, next) => {
  if (!next || !prev) return next;
  if (!sameTripIdentity(prev, next)) return next;       // different trip → allow
  if (!Number.isFinite(prev.startedAt)) return next;    // prev had none → allow
  if (prev.startedAt === next.startedAt) return next;   // unchanged → no-op
  return { ...next, startedAt: prev.startedAt };        // any other case → keep prev
};
```
- Apply the invariant inside every store mutation that can replace the parent object: full-replace setters, patch helpers, hydration helpers.
- Identify "same identity" by stable IDs (`requestId`/`id`) using loose-string compare to absorb number/string drift across server payloads.

**Concrete site fixed (2026-04-27)**: `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\stores\emergencyTripStore.js` — added `sameTripIdentity` + `preserveTripStartedAt` helpers, applied them inside `setActiveAmbulanceTrip`, `setActiveBedBooking`, `patchActiveAmbulanceTrip`, `patchActiveBedBooking`, and `hydrateFromServer`. After this, `startedAt` is locked to its first-finite value across the trip's entire lifetime regardless of which writer fires.

**Why this is the right layer**: enforcing immutability at the store boundary protects against ALL writers — including ones added in the future that might not know about the invariant. Pushing the rule down to a single defensive helper is more durable than auditing every writer.

---

### 2.11 Zustand v5 `subscribe(selector, listener)` without `subscribeWithSelector` middleware

**Pattern**: A Zustand store calls `store.subscribe(selectorFn, listenerFn)` (two-arg form) to auto-persist a slice of state to storage on changes. The store is created with only `immer` (or any subset) middleware. In Zustand v5, the two-arg subscribe overload requires the `subscribeWithSelector` middleware. Without it, `subscribe` accepts only `subscribe(listener)`. The runtime treats the first argument as the listener and silently ignores the second.

**Symptoms**:
- "State changes never persist." (Catastrophic — looks like nothing is being saved.)
- "Metro reload always shows fresh state, no matter how long the user was active."
- "Hydration runs but always reads back nothing or stale defaults."
- No errors, no warnings — silent contract failure.

**Diagnosis**: The persist callback never fires. The "selector" runs as the listener every state change, returns its slice object, and the return value is discarded.

**Fix recipe**:
1. Either compose `subscribeWithSelector` middleware in `create(...)`, or refactor to a single-arg `subscribe((state) => { ... })` listener that does its own change detection and write.
2. The single-listener pattern is preferable when only one persistence consumer exists — it avoids the extra middleware cost and is explicit about the slice being watched.
3. Add manual identity-based change detection on the slice fields to suppress redundant writes on unrelated state changes.

**Concrete site fixed (2026-04-27)**: `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\stores\emergencyTripStore.js` — replaced `subscribe(selector, listener)` two-arg form with `subscribe(listener)` plus manual `lastPersistedSnapshot` identity check. This restored auto-persistence of `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow`, and `eventGates`. Without this fix, **the trip object was never written to storage at all**, which is why every Metro reload restarted trip progress from zero.

**Other suspected sites**: every other Zustand store in `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\stores\` that uses two-arg `subscribe`. Sweep:
```
grep -n "subscribe(\s*(state)" stores/
```
Each match needs to either gain `subscribeWithSelector` middleware or be refactored to single-arg.

---

### 2.10 Server-sync queryFn capturing pre-hydration React state

**Pattern**: A TanStack Query reads the previous snapshot from a Zustand-backed React selector (`useStore((s) => s.x)`) and closes over it inside `queryFn`. On cold start, the `queryFn` is created/dispatched before persistent-store hydration completes — so the captured `previousX` is `null`. When the network response merges with `previousX`, it computes "fresh" defaults (e.g. `startedAt = Date.now()`) and writes them back, **clobbering the value that hydration restored a few ms later**.

**Symptoms**:
- "Trip progress resets to zero on every Metro reload, even though I see the trip object exists."
- "Hydrated value flashes correctly for a frame, then snaps back to defaults."
- "Refetches during a session preserve the field correctly, but cold start does not."

**Diagnosis**: The queryFn closure observes the initial render's store value, not the post-hydration value. A second-mounted refetch is fine; the very first mount loses.

**Fix recipe**:
1. Read the previous snapshot **imperatively** inside `queryFn` via `useStore.getState()`. Never close over a React-selected value when the read needs to be timing-resilient.
2. Gate the query on the store's `hydrated` flag (`enabled: hydrated`) so the network roundtrip cannot resolve before persistence has settled.
3. Apply the same imperative-read pattern to any sibling field whose preservation depends on the previous snapshot (e.g. routes, ETAs, bookings).

**Concrete site fixed (2026-04-27)**: `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\hooks\emergency\useActiveTripQuery.js` — replaced `useEmergencyTripStore((s) => s.activeAmbulanceTrip)` closure capture with `useEmergencyTripStore.getState()` inside `queryFn`; added `enabled: hydrated` to the `useQuery` config. Same change applied to `activeBedBooking`.

**Other suspected sites**: any `useQuery` whose queryFn merges with previous Zustand-backed snapshots. Sweep for queryFn bodies that reference closed-over `useStore((s) => ...)` values.

---

### 2.9 Normalizers silently rewriting timestamps with `Date.now()`

**Pattern**: A normalizer used in the persistence path coerces a timestamp to `Date.now()` whenever it is not the exact expected runtime type (e.g. accepts only finite ms, rejects ISO strings). Because the normalizer runs on every auto-persist, the persisted value is rewritten to "now" continuously. On Metro reload, hydration reads the most recent rewrite — losing the original.

**Symptoms**:
- "Trip progress resets near zero on every Metro reload."
- "Hero progress and ambulance marker both restart even though the trip is still active."
- "ETA looks correct after reload but elapsed time is wrong."

**Diagnosis**: The normalizer is destructive, not defensive. Any input it cannot recognise becomes a fresh `Date.now()`, masquerading as data preservation.

**Fix recipe**:
1. Build a lossless coercer (`coerceStartedAtMs`) that accepts ms numbers, numeric strings, ISO date strings, and `Date` instances; returns `null` only when truly unparseable.
2. In the normalizer, call the coercer and fall back to `Date.now()` only on `null`. Never on "wrong type."
3. Audit every other "fallback to now" in normalizers for the same defect.

**Concrete site fixed (2026-04-27)**: `@c:\Users\Dyrane\Documents\GitHub\ivisit-app\utils\domainNormalize.js` — `normalizeEmergencyState` for `activeAmbulanceTrip.startedAt` and `activeBedBooking.startedAt`. Server payloads send ISO strings → normalizer rewrote to `Date.now()` on every auto-persist subscription → Metro reload rehydrated with a near-current `startedAt` → `useTripProgress.tripProgress` calculated `elapsed ≈ 0` → progress bar reset.

**Other suspected sites**: any other timestamp field in normalizers under `@utils/domainNormalize.js` (visit timestamps, lifecycle timestamps, eta caches). Sweep for `Number.isFinite(...) ? ... : Date.now()`.

---

## 3. Architectural Heuristics (Apply Everywhere)

These are not bug fixes; they are decisions to apply by default.

### H1. The 5-layer state question
For any new state, ask in order:
1. Is this server truth? → Realtime
2. Is this server cache? → TanStack Query
3. Is this persistent client state? → Zustand
4. Is this lifecycle / transitions? → XState
5. Is this ephemeral UI? → Jotai

If two layers seem to fit, prefer the higher-level one. UI state is the cheapest to undo.

### H2. The "is the answer already computed?" question
Before adding `useState`, `useMemo`, or new boolean derivation:
- Search XState machine for the same flag.
- Search Jotai atoms barrel.
- Search Zustand store selectors.

The cheapest code is code you do not write.

### H3. The "what is the renderer location?" question
For any modal, toast, overlay, or floating UI:
- Where does it render?
- What unmounts it?
- Does that match the user's expectation of when it should disappear?

### H4. The "double-run" question
For any "after X, do Y" pattern:
- Is X synchronous? Then a single call works.
- Is X async (storage, network, store hydration)? Then add a derived listener as backup.

### H5. The "Apple HIG glance test"
For any sheet/card/overlay:
- 0.5-second glance: can the user answer "what state am I in?", "what action is next?".
- More than 2 visual channels saying the same thing: cut to one.
- Red color anywhere not destructive/critical: replace with accent.

### H6. The "`useEffect` or not?" question
Before writing `useEffect`, walk the decision tree (see Quick Reference at top of file):

1. **Is Y derived from X?** → `useMemo` or inline `const`. No hook.
2. **Is Y a ref mirroring X?** → assign `ref.current = X` during render. No hook.
3. **Is Y a machine state?** → Jotai atom (L5) or XState (L4).
4. **Is Y server data?** → TanStack Query with `enabled: Boolean(X)` or X in `queryKey`.
5. **Is Y a real side-effect?** → `useEffect` is correct.

The cost of a misplaced `useEffect`: stale closure bugs, double-runs, missed deps, and race conditions that only appear in production. A misplaced `useMemo` is harmless by comparison.

---

## 4. Process Lessons

### P1. Audit before fix
This session started with rapid-fire fixes. Each fix introduced a new defect (duplicate underlay, padding regressions, color leak). The audit step that came late should come first.

### P2. Stash review is mandatory before re-doing prior work
Three useful insights from the stash were almost lost because we did not check first:
- `recoveredRatingState` lifted to MapScreen
- `validTransitions` table for sheet phases
- Bundled atom storage pattern

### P3. One pass at a time
The stash failed because it was 224 files. Our worry should be the same: every "while I'm at it" is a future regression.

### P4. Read the file end-to-end before editing
The duplicate hero underlay happened because I edited around the existing `progressFill` without reading it. The padding regression happened because I added an `Animated.View` wrapper without checking layout impact.

### P5. Acknowledge contract violations
When the user said "you're calling AsyncStorage directly, are you no longer bound by code conduct?" — that was a hard reset. The right response was to fix the contract, not defend the local optimum. Apply the same skepticism to my own code in every session.

---

## 5. Sweep Targets (Future Passes)

Based on these learnings, the following codebase sweeps are warranted (each is its own pass plan):

| Sweep | Hypothesis | Search seed |
|---|---|---|
| Modal renderer audit | Other modals may share the rating-modal defect | `<Modal`, `visible=`, search for ones inside conditionally-mounted parents |
| Raw status string sweep | Phase 5 covered tracking subtree; rest of codebase may still have raw `===` | grep `\.status === "` |
| AsyncStorage direct sweep | Other features may be bypassing the database abstraction | grep `AsyncStorage\.(get|set|remove)` outside `database/` |
| Color-prop leakage sweep | Status colors may be tinting icons in commit/payment/intake flows | review props named `color`, `iconColor`, `tint` for status-aware variants |
| Sheet phase formalisation | Stash had a solid `validTransitions` pattern; consider XState for sheet itself | `stash@{0}:hooks/map/exploreFlow/useMapSheetPhase.js` |
| Local UI state ephemerality audit | `useState` calls that should survive Metro restart per the live-data principle | grep `useState\(` in screens, controllers, runtime hooks |
| Apple HIG sweep | Tracking sheet polish work likely applies to all card/sheet surfaces | start with EmergencyRequestModal, payment screens, history sheet |

---

### 2.13 Cascading `useEffect` loading state churn

**Pattern**: A loading flag (`isRefreshing`) is reset to `true` by multiple independent `useEffect` hooks whose dependencies overlap. Hook A depends on value X. Hook B sets X as a side effect. Hook A re-fires when B completes — not because the user did anything, but because B changed its input.

**Symptoms**:
- "The sheet loads 2–4 times before showing content."
- Loading skeleton re-appears after user has already seen data.
- Perceived performance is worse than actual network time.

**Diagnosis**: Find all `useEffect` hooks that call `setLoading(true)` or `setReady(false)`. Trace each dependency. Ask: "can any other `useEffect` in this file write a value in this dep array?" If yes, the effect will chain-fire.

**Fix recipe**:
1. Assign each data concern its own TanStack Query. Queries are independently cached and do not re-fetch because another query completed.
2. If two queries produce values that feed into each other, use `useQuery` with `enabled: Boolean(dep)` — the second waits for the first, but does not re-run the first.
3. Never put a derived computed value in a `useEffect` dependency array if that value is also set by another `useEffect` in the same hook. Extract it to TanStack Query or a stable `useMemo`.
4. Loading UI must gate on `isLoading && !data` (first load only). Once data is present, show it — even while a background refetch runs.

**Concrete site**: `useMapCommitPaymentController.js` — `refreshPaymentMethodSnapshot` re-fires because `totalCostValue` (set by `loadCost` effect) is in its `useCallback` dep array. Fix: adopt `usePaymentMethodsQuery` + `usePaymentCostCalculation` from stash (⏳ PENDING in STASH_AUDIT.md).

---

### 2.14 Terminal intermediate states must be visually locked and non-dismissible

**Pattern**: A submission flow has a state (e.g. `WAITING_APPROVAL`, `FINALIZING_DISPATCH`) that is logically committed from the user's perspective but is still processing server-side. The UI does not visually distinguish this from a recoverable "try again" state — the CTA is re-tappable and the form looks idle.

**Symptoms**:
- User re-taps CTA during approval wait → silently dismisses the sheet.
- User sees an idle-looking form while a server action is pending.
- Retry creates duplicate server records.
- `finally` block resets `isSubmitting = false` at the moment of early `return`, making the CTA appear pressable while `submissionState.kind` is `WAITING_APPROVAL`.

**Diagnosis**: Map every non-`IDLE` state in the submission machine to one of: `RECOVERABLE` (can retry), `COMMITTED` (cannot dismiss), `TERMINAL` (show result, auto-dismiss). For each `COMMITTED` state: is the CTA locked? Is dismissal blocked? If user can tap again, what does that action do?

**Fix recipe**:
1. In `isCommitPaymentDismissibleState`, remove `WAITING_APPROVAL` from the dismissible list. It is a committed server action.
2. Add `WAITING_APPROVAL` to the CTA disabled derivation: `isPaymentMethodSnapshotPending || submissionState.kind === WAITING_APPROVAL`.
3. Remove the parallel `isSubmitting` boolean — use `submissionState.kind` as the **single source of truth** for all busy/disabled state. `isSubmitting` and `submissionState.kind` diverge during the window between line 492 (`setIsSubmitting(true)`) and the first `setTransactionState` call, causing a frame where `isIdleState = true` but `isSubmitting = true`.
4. Keep `isSubmitting = true` for the entire approval wait window — set to `false` only on `DISPATCHED`, `FAILED`, or `PAYMENT_DECLINED`.

**Concrete site**: `useMapCommitPaymentController.js` — `WAITING_APPROVAL` listed as dismissible in `isCommitPaymentDismissibleState`. `finally` block resets `isSubmitting = false` at the moment of the `return` on the approval path. Fix: PT-C pass (pre-tracking audit).

---

## 6. Update This Document

Every future pass that uncovers a new defect class should append to this file. This is the canonical record of "lessons we paid for."

Section template:
```
### N.X New Defect Class
**Pattern**: ...
**Symptoms**: ...
**Diagnosis**: ...
**Fix recipe**: ...
**Other suspected sites**: ...
```
