---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Tracking Sheet Phase — Cross-Cutting Learnings

> **Reconciliation Note — 2026-05-24:** Living reference. The defect classes, heuristics, and the `useEffect` decision tree below have been integrated into:
>
> - [`../../REFACTORING_GUARDRAILS.md`](../../REFACTORING_GUARDRAILS.md) §1 (canonical version of the decision tree)
> - [`AGENTS.md`](../../../AGENTS.md) §Common Pitfalls (TDZ, hook API, layer disguise, ref sync, object truthiness, store semantics, fallback timers, auth/cache continuity)
> - [`AGENTS.md`](../../../AGENTS.md) §Debugging Doctrine (map-the-flow, fix-at-source, one-variable-at-a-time, minimal upstream fixes)
>
> This file remains the long-form rationale and source case studies. Treat as evergreen.

**Source**: Tracking sheet audit + stash review (`stash@{0}` from `recovery/clean-2026-04-25`)
**Date**: 2026-04-26 (updated 2026-04-28, reconciled 2026-05-24)
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

**Rule of thumb**: if you are not managing a subscription, timer, or cleanup, `useEffect` is probably wrong. The violation only surfaces as a bug _later_ — stale closure, missed dep, extra render, race condition — never at the point of writing.

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
  if (!sameTripIdentity(prev, next)) return next; // different trip → allow
  if (!Number.isFinite(prev.startedAt)) return next; // prev had none → allowtry i
  if (prev.startedAt === next.startedAt) return next; // unchanged → no-op
  return { ...next, startedAt: prev.startedAt }; // any other case → keep prev
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

| Sweep                             | Hypothesis                                                                     | Search seed                                                                |
| --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --- | -------------------------- |
| Modal renderer audit              | Other modals may share the rating-modal defect                                 | `<Modal`, `visible=`, search for ones inside conditionally-mounted parents |
| Raw status string sweep           | Phase 5 covered tracking subtree; rest of codebase may still have raw `===`    | grep `\.status === "`                                                      |
| AsyncStorage direct sweep         | Other features may be bypassing the database abstraction                       | grep `AsyncStorage\.(get                                                   | set | remove)`outside`database/` |
| Color-prop leakage sweep          | Status colors may be tinting icons in commit/payment/intake flows              | review props named `color`, `iconColor`, `tint` for status-aware variants  |
| Sheet phase formalisation         | Stash had a solid `validTransitions` pattern; consider XState for sheet itself | `stash@{0}:hooks/map/exploreFlow/useMapSheetPhase.js`                      |
| Local UI state ephemerality audit | `useState` calls that should survive Metro restart per the live-data principle | grep `useState\(` in screens, controllers, runtime hooks                   |
| Apple HIG sweep                   | Tracking sheet polish work likely applies to all card/sheet surfaces           | start with EmergencyRequestModal, payment screens, history sheet           |

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

### 2.15 Atom wipe + signature-ref deadlock → ETA display shows `"--"` on fresh trip open

**Pattern**: A Jotai atom holding live map route data (`durationSec`, `coordinates`) is reset to `null`/empty on a key-change event. The map component that populates the atom guards re-emission via a signature ref — it only fires `onRouteInfoChange` when the payload hash changes. If the reset happens while the route/hospital destination hasn't changed, the signature ref still matches and the map never re-emits. The atom stays empty until the next independent route event.

**Symptoms**:

- ETA arrival time shows `"--"` immediately after booking is approved and tracking opens.
- After Metro reload (which remounts the map and clears the signature ref), ETA displays correctly.
- Ambulance animation is unaffected (it reads `etaSeconds` from a different path).
- `km` / distance shows correctly; only the time countdown is blank.

**Diagnosis**: Trace every place the atom is reset. Check whether the map component's signature ref was already set to the same payload before the reset. If yes — signature matches → no re-emit → atom stays null.

**Fix recipe**:

1. **Never wipe `durationSec` during a reset.** `durationSec` is pure live map data; it has no identity or staleness relative to the request key. Only coordinates and identity fields should be cleared on key change.
2. In every reset branch of the seed effect (`null` requestKey, fallthrough), preserve `current?.durationSec` in the new object.
3. As a secondary safety net, subscribe to the atom directly (`useAtomValue(trackingRouteInfoAtom)`) in the consumer hook and use `durationSec` as a fallback `etaSeconds` for `useTripProgress` when `activeAmbulanceTrip.etaSeconds` is null.

**Concrete sites fixed (2026-05-03)**:

- `@hooks/map/tracking/useMapTrackingSync.js` — all three reset branches now preserve `current?.durationSec`.
- `@components/map/views/tracking/useMapTrackingRuntime.js` — subscribes directly to `trackingRouteInfoAtom`; builds `ambulanceTripForProgress` with `durationSec` fallback before passing to `useTripProgress`.

**Rule**: Never wipe a live-data field to reset an identity field. Reset only what changed.

---

### 2.16 Dual rating modal from MapScreen decomposition — in-flow fires while recovered also triggers

**Pattern**: Two independent rating-modal triggers coexist after a modularization pass:

1. In-flow: `trackingRatingStateAtom` written by `useMapTrackingController` on trip completion.
2. Recovered: `recoveredRatingStateAtom` written by `useMapHistoryFlow` when a `RATING_PENDING` visit is found.

After decomposition, both hooks live at MapScreen level. When a trip completes, the visit transitions to `RATING_PENDING` in the history lane. If the recovered-rating effect fires before the in-flow modal is dismissed, both modals open simultaneously.

**Symptoms**:

- Two `ServiceRatingModal` components visible at the same time after a trip ends.
- Only appeared after the MapScreen monolith was broken into `useMapHistoryFlow` + `useTrackingRatingFlow`.
- Did not occur in the monolith because the recovered-rating effect only ran from MapScreen-level code that could directly reference the in-flow `ratingState` local variable.

**Diagnosis**: `useMapHistoryFlow.recoveredRatingEffect` only checked `recoveredRatingState?.visible` — it had no reference to `trackingRatingStateAtom` and could not see whether the in-flow modal was already open.

**Fix recipe**:

1. Import `trackingRatingStateAtom` in `useMapHistoryFlow`.
2. Read `inFlowRatingVisible = useAtomValue(trackingRatingStateAtom)?.visible ?? false`.
3. Add `|| inFlowRatingVisible` to the early-return guard in the recovered-rating trigger effect.
4. Add `inFlowRatingVisible` to the effect's dependency array.

**Permanent hardening update (2026-05-03)**:

- `MapScreen.jsx` now enforces view-layer exclusivity: `recoveredRatingState` is only rendered when `trackingRatingState?.visible` is false.
- `useMapTrackingController.js` clears `recoveredRatingStateAtom` before setting the in-flow `trackingRatingStateAtom` for ambulance/bed completion.
- `useTrackingRatingFlow.js.openRatingForVisit()` also clears `recoveredRatingStateAtom` before opening a history-rated visit in the same shared modal path.

**Concrete site fixed (2026-05-03)**: `@hooks/map/history/useMapHistoryFlow.js` lines 449–462, `@screens/MapScreen.jsx` rating modal render logic, `@components/map/views/tracking/useMapTrackingController.js`, and `@hooks/map/exploreFlow/useTrackingRatingFlow.js`.

**General rule**: When two independent hooks can both open a modal of the same type, each must check the other's atom before opening, and shared modal ownership should be enforced both at render time and along the open path. Cross-hook modal coordination belongs at the atom layer (L5), not via prop drilling.

---

### 2.17 Arrival CTA timing lag on ambulance tracking

**Pattern**: The arrival confirmation CTA was gated by a derived ambulance status value that only flipped to "Arrived" at 100% elapsed progress.

**Symptoms**:

- `Confirm arrival` appeared noticeably later than the arrival status UI.
- The tracking sheet entered the arrived phase (green state) before the CTA became actionable.
- The user experience felt like the screen was lagging behind realtime ambulance arrival.

**Diagnosis**: `useTripProgress` computed `ambulanceComputedStatus` as "Arrived" only when `tripProgress >= 1`. The visual status phase and arrival action both already accepted `progress >= 0.95`, so the CTA was waiting for a stricter condition than the rest of the arriving flow.

**Fix recipe**:

1. Keep the same progress-based arrival model, but align the status computation threshold with the rest of the tracking flow.
2. In `hooks/emergency/useTripProgress.js`, introduce `TRIP_ARRIVED_THRESHOLD = 0.95`.
3. Treat `tripProgress >= TRIP_ARRIVED_THRESHOLD` as "Arrived" for `computedStatus`.

**Concrete site fixed (2026-05-03)**:

- `@hooks/emergency/useTripProgress.js`

**General rule**: Status and action availability should use the same arrival threshold. If the UI already treats 95% progress as arrived, the underlying status computation must not require 100%.

---

### 2.18 Direct provider API calls from a render component (LocationSheet, 2026-05-10)

**Pattern**: A React component or stage base calls `mapboxService.suggestAddresses()` directly inside a `useEffect` with a manual timer ref for debounce. The plan mandates an app-owned service boundary (`addressAssistService`) between components and provider APIs.

**Symptoms**:

- Provider API details (Mapbox types, proximity, countryCode) leak into JSX-level logic.
- Debounce timer is re-created on every render that touches the ref.
- Search results are not cached — same query fires again if the component remounts.
- Provider swap (Mapbox → OSM) requires editing the component, not the service.

**Diagnosis**: `MapLocationIntentStageBase.jsx` lines 554–591 — `useEffect` + `manualDropTimerRef` calling `mapboxService.suggestAddresses` for manual step `search-drop` fields. This is the same anti-pattern as the old `SearchSheet` debounce loop the architecture plan explicitly called out.

**Fix recipe**:

1. Create `services/addressAssistService.js` wrapping `mapboxService` with typed methods: `suggestRegions`, `suggestCities`, `suggestStreetsOrPlaces`, `resolveManualDraft`.
2. Create `hooks/map/locationIntent/useManualDropController.js` — owns query state + uses `useLocationSearchQuery` (TanStack) pattern, not a raw `useEffect` timer.
3. Stage base receives `{ manualDropResults, isSearchingManualDrop, setManualDropQuery }` from the controller hook only.
4. No component ever imports `mapboxService` directly for UI-driven suggestions.

**Rule**: Components never call provider APIs directly. They call app service methods. Service methods call providers.

---

### 2.19 Multi-mode workaround instead of canonical mode (LocationSheet, 2026-05-10)

**Pattern**: A new product concept (candidate decision surface) is implemented by composing three existing mode constants (`PLACE_SELECTED || CONFIRM || PIN_ADJUST`) into a derived boolean rather than adding the canonical mode the plan calls for (`CANDIDATE_DECISION`).

**Symptoms**:

- `isCandidateDecisionMode` appears in 6+ places across the stage base.
- Navigation back-stack logic branches on all three modes independently.
- Adding a new candidate source requires updating every branch.
- The mode constant `PLACE_SELECTED` does not match what the screen is actually doing (deciding on a candidate, not selecting a place).

**Diagnosis**: `MapLocationIntentStageBase.jsx` line 296 — `isCandidateDecisionMode = mode === PLACE_SELECTED || mode === CONFIRM || mode === PIN_ADJUST`. This is a symptom of deferring mode rename while adding behavior.

**Fix recipe**:

1. Add `CANDIDATE_DECISION: "candidateDecision"` to `LOCATION_INTENT_MODES`.
2. Keep `PLACE_SELECTED` as a PULLBACK alias temporarily: `PLACE_SELECTED: "candidateDecision"`.
3. Replace all `isCandidateDecisionMode` checks with `mode === LOCATION_INTENT_MODES.CANDIDATE_DECISION`.
4. Update `useLocationSheetNavigation` — `openPlaceSelected` → `openCandidateDecision`.
5. Remove the alias once all callers are migrated.

**Rule**: When the plan names a mode, add the mode. Never substitute a composed boolean that duplicates the same test in N places.

---

### 2.20 Ephemeral sheet state in `useState` instead of Jotai atoms (LocationSheet, 2026-05-10)

**Pattern**: State that must survive sheet snap collapse and Metro remount is stored in component-local `useState`. The LocationSheet can collapse to a minimised snap state and re-expand; any `useState` inside the stage base resets on that cycle.

**Symptoms**:

- User starts to save a place (chooses category), collapses the sheet accidentally, re-expands — `pendingSaveCategory` is null, flow resets to default.
- User fills in save details, swaps app, returns — `saveDetailsDraft` is empty.
- `savedPlaceFeedback` (confirmation copy) disappears on layout transition.

**Diagnosis**: `MapLocationIntentStageBase.jsx` lines 115–122 — `pendingPlaceLabel`, `savedPlaceFeedback`, `pendingSaveCategory`, `saveDetailsDraft` are all raw `useState`. Per the 5-layer rule: ephemeral UI state that must survive remount belongs in Jotai (L5).

**Fix recipe**:

1. Create `store/atoms/locationIntentAtoms.js`.
2. Bundle related fields: `locationCandidateAtom` (active candidate + source), `locationSaveFlowAtom` (pendingCategory, saveDetailsDraft, savedPlaceFeedback, isConfirmingRemove).
3. Read via `useAtomValue`, write via `useSetAtom`.
4. Reset atoms on `returnToDefault` / sheet close — do not rely on component unmount.

**Rule**: If state must survive snap collapse or Metro restart, it is Jotai (L5), not `useState`.

---

### 2.21 Store CRUD actions called directly from stage component (LocationSheet, 2026-05-10)

**Pattern**: `addSavedLocation`, `updateSavedLocation`, `removeSavedLocation` are imported from a Zustand store and called directly inside a 1,100-line stage base component. No CRUD status machine exists — success/failure is tracked with ad-hoc `useState` strings (`savedPlaceFeedback`).

**Symptoms**:

- No Idle → Saving → Saved/Failed transitions. UI cannot show a pending save state.
- Error recovery from a failed save is impossible (no `failed` state to render from).
- Home/Work update-in-place logic is spread across the component instead of owned by one hook.
- Every new save action type requires editing the stage base.

**Diagnosis**: `MapLocationIntentStageBase.jsx` lines 124–126 — direct store action calls without a controller layer.

**Fix recipe**:

1. Create `hooks/map/locationIntent/useSavedAddressActions.js`.
2. Hook owns: `save(candidate, options)`, `update(id, patch)`, `remove(id)`, `crudStatus` (Idle → Draft → Validating → Saving → Saved/Failed).
3. Home/Work singleton upsert logic lives in the hook, not JSX.
4. Stage base receives `{ save, update, remove, crudStatus }` only.

**Rule**: Store mutation actions are never called from a render component. They go through a controller hook that owns the CRUD state machine.

---

### 2.22 File size violation accepted as temporary — becomes permanent (LocationSheet, 2026-05-10)

**Pattern**: A stage base grows beyond the 450-line guardrail during feature development. The plan defers extraction because "the hooks haven't landed yet." The hooks then land inside the same file as convenience additions rather than extractions, and the file ends at 1,100+ lines.

**Symptoms**:

- `MapLocationIntentStageBase.jsx` at 1,108 lines — mandatory refactor candidate per guardrails.
- `MapLocationIntentStageParts.jsx` at 1,151 lines — exceeds 950-line extraction threshold.
- Every new feature pass adds to already-bloated files rather than creating dedicated files.

**Fix recipe**:

1. Do not merge hooks into the stage base as a "quick fix." Create the file.
2. After each hook extraction (LS-1 through LS-4), measure the stage base line count. Stop adding to it when it reaches 450.
3. Split `MapLocationIntentStageParts.jsx` into: `MapLocationIntentCandidateParts.jsx`, `MapLocationIntentManageParts.jsx`, `MapLocationIntentStageParts.jsx` (default/search/manual only).

**Rule**: Extracting a hook does not count as done if the hook body is pasted into the same file. A new file is required.

---

## LocationSheet Execution Guardrails (Applied to LS-1 through LS-8)

These guardrails apply to every LocationSheet pass. Check before starting each pass, not after.

**Before writing any new `useEffect`:**

- Walk the decision tree (Quick Reference at top of this file).
- Manual drop search → TanStack query via `useManualDropController`, not a timer ref.
- Candidate map preview → stable callback, not an effect triggered by `selectedLocation` object identity.

**Before adding any `useState`:**

- Ask: does this need to survive snap collapse? → Jotai atom.
- Ask: is this CRUD status? → state machine in `useSavedAddressActions`, not ad-hoc string.
- Ask: is this derived from existing state? → `useMemo` or inline const.

**Before calling a store action from a component:**

- Route through the appropriate controller hook.
- CRUD operations go through `useSavedAddressActions`.
- Pickup commits go through `useMapLocation` / `mapCandidateToPickupPayload` pipeline.

**Before adding a new mode branch:**

- Check `LOCATION_INTENT_MODES` — the mode should already exist or needs to be added canonically.
- Never compose 3 existing modes into a derived boolean as a substitute for naming the concept.

**Before adding behavior to `MapLocationIntentStageBase.jsx`:**

- Check current line count. If >450, the behavior belongs in a new hook or extracted part file.
- A feature that touches candidate state → `useAddressCandidateController`.
- A feature that touches saved address CRUD → `useSavedAddressActions`.
- A feature that touches manual field assistance → `useManualDropController`.

**Before calling any provider API (`mapboxService`, `nominatimService`) from a component:**

- Route through `addressAssistService`.
- If `addressAssistService` doesn't have the method yet, add it there first.

---

### 2.23 Server-fetched data owned by `useState` + module-level cache instead of TanStack Query (L2 violation)

**Pattern**: A hook that fetches server data manages its own `useState` array, a module-level SWR cache object, a fetch dedup `Map`, a `requestSequenceRef` race guard, and a `useEffect([serverData])` trigger — manually reimplementing everything TanStack Query provides natively.

**Symptoms**:

- `useEffect([userLocation, performFetch])` fires a new network request every time location changes — this is the exact guardrails §1 decision-tree violation: "Is Y server data triggered by X? → YES → TanStack Query with X in queryKey."
- Module-level `globalHospitalCache` object is a manual reimplementation of `QueryClient` cache with hand-rolled TTL (`HOSPITAL_CACHE_TTL_MS`) instead of `staleTime`.
- `globalFetchRegistry` dedup `Map` reimplements TanStack's native in-flight deduplication.
- `requestSequenceRef` + `activeRequestId` guard reimplements TanStack's query cancellation on key change.
- `hasFetchedRef`, `lastLocationRef`, `lastLocationKeyRef` are all workarounds for the absence of proper cache semantics.
- The `demoBootstrapEnabled` side-effect was bundled inside the `queryFn` — a queryFn must be a pure fetch, not a side-effectful provisioning routine.
- A TypeScript `.ts` replacement (`useHospitalsQuery.ts`) was already written and marked complete in `GOLD_STANDARD_STATE_ROADMAP.md` (Phase 2, commit `8bdce65`), but `useEmergencyHospitalSync.js` was never updated to point at it. The old `.js` file survived as a zombie alongside the `.ts` replacement.

**Diagnosis**: `hooks/emergency/useHospitals.js` — entire file. `hooks/emergency/useEmergencyHospitalSync.js` line 45 — still importing `useHospitals`.

**Fix recipe**:

1. Add `useEmergencyHospitalsQuery` to the existing `hooks/emergency/useHospitalsQuery.ts` — full-featured variant with `allHospitals` split, 3dp bucket precision queryKey, `discoverNearby` (50km), `demoModeEnabled`, and `gcTime: 5min`.
2. Demo bootstrap extracted to its own `useEffect` with `bootstrapKeyRef` dedup — a provisioning call IS a real side-effect and belongs in `useEffect`, not inside a `queryFn`.
3. `useEmergencyHospitalSync.js` updated to import `useEmergencyHospitalsQuery` from `.ts`.
4. `useHospitals.js` deleted — zero live importers confirmed before deletion.
5. The duplicate `useHospitalsQuery.js` created in error during this session was also deleted immediately after discovery.

**General rule**: If a hook fetches data from a server and re-runs when a dependency changes, it belongs in TanStack Query with that dependency in the `queryKey`. The `useEffect([serverTrigger])` → `setState` pattern is always a Layer 2 violation. Check for an existing `.ts` Query hook in the same directory before creating a new one.

**Concrete sites fixed (2026-05-17)**:

- `@hooks/emergency/useHospitals.js` — deleted
- `@hooks/emergency/useHospitalsQuery.ts` — `useEmergencyHospitalsQuery` added
- `@hooks/emergency/useEmergencyHospitalSync.js` — import updated

---

### 2.24 Payment-to-tracking hydration fix deserves protection (2026-05-19)

**Pattern**: Payment approval creates an optimistic tracking trip before backend, query, persisted store, and realtime layers have all converged. The live handoff can carry one identity shape while server hydration later returns another. If the app treats those shapes as different trips, ETA, route, `startedAt`, responder identity, and visual stage are lost until a page/Metro reload rebuilds from settled backend truth.

**Symptoms**:

- Cash approval succeeds and tracking opens, but arrival ETA shows `"--"` or `"Tracking delayed"`.
- Reloading the page/Metro makes ETA and tracking details appear.
- Logs show the same real request moving through payment and tracking, but active trip/query/store comparisons do not preserve runtime fields.
- Contact Dispatch or another remount may temporarily make the issue disappear because it forces a fresh truth read/remount instead of fixing the first handoff.

**Diagnosis**: Commit `09d9195c803f64f0f04b0c584e18b76698cddea3` (`stabilize payment tracking handoff`) fixed the right defect class. The problem was not just visual ETA rendering. It was state identity and hydration readiness across four writers: optimistic payment completion, persisted Zustand hydration, TanStack active-trip query hydration, and Supabase realtime patches.

**What was good about the fix**:

1. It normalized runtime identity at trip start: `useEmergencyActions.startAmbulanceTrip()` separates canonical request UUID from `displayId` instead of letting `requestId` drift between UUID and display id.
2. It made same-request comparison alias-aware: store/query helpers compare `id`, `requestId`, `displayId`, `display_id`, `_realId`, `bookingId`, and nested request ids.
3. It preserved tracking runtime fields at the store boundary: same-trip writes keep `startedAt`, `etaSeconds`, `estimatedArrival`, `etaSource`, and `route` instead of accepting a thinner server/query payload.
4. It made hydration deterministic: `useActiveTripQuery()` waits for store hydration and reads previous store snapshots imperatively with `useEmergencyTripStore.getState()` inside the query function.
5. It kept pending approval separate from dispatched tracking: pending rows are handled as pending, while dispatched rows are `in_progress`, `accepted`, or `arrived`.
6. It strengthened payment completion payloads: commit-payment helpers and `useRequestFlow` pass canonical `id` plus display-facing `displayId` into active tracking.
7. It respected a key limitation: realtime can patch an existing trip, but it cannot rescue a missing or malformed first active-trip snapshot.

**Fix recipe**:

1. At every payment-to-tracking boundary, carry both fields explicitly:
   - `id` / canonical request UUID for mutations, subscriptions, query matching, and route ownership.
   - `displayId` for user-facing labels.
2. Never let `requestId` be the only truth when crossing layers. If it remains for compatibility, treat it as ambiguous and compare aliases.
3. Gate active-trip query hydration on the persisted store `hydrated` flag.
4. Inside query functions, read previous Zustand state with `store.getState()`, not a React selector captured before hydration.
5. Preserve runtime tracking fields on same identity at the store mutation layer, not at one individual caller.
6. Keep route/ETA preservation request-scoped. A same request can inherit route/ETA; a new request must not.
7. Verify the live no-reload path, not just reload recovery.

**Regression test prompt**:

```text
Create a cash ambulance request, approve it, and do not reload.
Expected: tracking opens with canonical UUID in active trip, display id in UI,
ETA/arrival and distance populated or intentionally assigning, no "--" ETA
when a scoped route duration exists, and no loss of route/startedAt after the
first active-trip query refetch.
```

**Concrete sites fixed by `09d9195c`**:

- `@components/map/views/commitPayment/mapCommitPayment.helpers.js`
- `@hooks/emergency/useRequestFlow.js`
- `@hooks/emergency/useEmergencyActions.js`
- `@hooks/emergency/useActiveTripQuery.js`
- `@stores/emergencyTripStore.js`
- `@utils/emergencyRealtimeProjection.js`
- `@docs/audit/map/PAYMENT_TO_TRACKING_FULL_FLOW_MAP_2026-05-20.md`

**General rule**: Reload fixing tracking is evidence of a missed live-state handoff. Preserve the settled backend shape, but make the first optimistic tracking state converge into that shape without remounting.

---

### 2.25 Realtime ordering gates must be stream-scoped (2026-07-17)

**Pattern**: Two independently versioned Supabase tables update one runtime trip, but both subscriptions share one timestamp gate. The code compares timestamps as if every row came from a single ordered log.

**Symptoms**:

- The top tracking pill or sheet remains at `Dispatch confirmed`, `En route`, or an old ETA after the backend has advanced.
- Ambulance movement can remain live while the lifecycle status is stale.
- A hard refresh immediately reveals the correct `accepted` or `arrived` state.
- The defect is intermittent because it depends on whether a GPS/telemetry row with a newer `updated_at` reaches the client before the lifecycle row.

**Diagnosis**: `shouldApplyTripEvent()` was correct for one ordered source, but `useEmergencyRealtime()` used one ref for both `emergency_requests.updated_at` and `ambulances.updated_at`. A newer ambulance row could advance that gate past an emergency request transition and reject the valid lifecycle event as stale. `mergeAmbulanceRealtimeTrip()` also copied the ambulance timestamp into the trip's generic `updatedAt`, so the effect that primes the lifecycle gate could reproduce the same contamination.

The history explains why the defect became visible:

1. `2ba4f8fb` introduced the generic timestamp guard and telemetry projection.
2. `00a793d0` extracted the realtime hook with one shared active-ambulance event ref.
3. `4e1408b2` repaired subscription and projection gaps without splitting source clocks.
4. `a75b4265` made responder telemetry and lifecycle authority canonical, increasing the chance that the two clocks interleaved.
5. `fb4396c6`, `f26e2959`, and `c566d7ff` improved accepted-state continuity, recovery, and channel cleanup but preserved the shared ordering assumption.

**Fix recipe**:

1. Keep a dedicated event gate for `emergency_requests`.
2. Keep a separate event gate for `ambulances`.
3. Prime the lifecycle gate only from the canonical emergency-request `updatedAt`.
4. Store ambulance-row time separately as `ambulanceUpdatedAt`; never write it into lifecycle `updatedAt`.
5. Continue using identity matching inside each stream.
6. Prove the adversarial order in a unit contract: a telemetry row at `T+10` must not reject an `arrived` lifecycle row at `T+5`.
7. Run a fresh no-refresh browser journey through accepted, arrived, patient acknowledgement, responder completion, and one rating modal.

**General rule**: Timestamp ordering is meaningful only inside the source that owns the clock. Rows from different tables, services, devices, or domains are not one total order merely because they all have `updated_at`.

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
