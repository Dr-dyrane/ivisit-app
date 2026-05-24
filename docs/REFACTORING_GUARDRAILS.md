---
status: living
owner: architecture
last_updated: 2026-05-11
---

# Refactoring Guardrails

> **Purpose**: Maintain architectural integrity during fixes and refactoring.  
> **Context**: iVisit emergency and map flows now use a five-layer state architecture with strict separation of concerns: Supabase/Realtime -> TanStack Query -> Zustand -> XState -> Jotai.

> **Source-of-truth note**: Global product and UI doctrine lives in [`docs/rules.json`](./rules.json). This document does not replace it; it translates those system rules into refactoring and pass-execution guardrails for implementation work.

---

## 1. State Management Rules

### Canonical Layers

- **Server truth** (live emergency rows, responder updates) -> Supabase / Realtime
- **Server cache + refetch control** (active trip query, hospitals, visits) -> TanStack Query
- **Persistent client state** (active trips, commit flow, user mode) -> Zustand
- **Lifecycle + legal transitions** (pending -> active -> arrived -> completed) -> XState
- **Ephemeral UI state** (sheet phase, rating modal, route visualization atoms) -> Jotai
- **Cross-component sync** -> Jotai atoms or store selectors, not ad-hoc prop drilling

### Emergency Contacts Rule

- `EmergencyContacts` is a formal five-layer feature, not a hook-plus-service exception
- canonical `EmergencyContact` is phone-first and does not include `email`
- legacy local contacts without a phone number must flow into migration review, not silent deletion
- no runtime writes to `StorageKeys.EMERGENCY_CONTACTS` outside migration compatibility code

### Pass Documentation Rule

- **Before any pass**: document intent, scope, invariants, and what layer(s) will change
- **After any pass**: document what changed, what stayed intentionally unchanged, and the verification result
- **Do not start implementation from a vague pass name alone**: write the target defect or behavior first

### Subsequent Pass Rule

Every subsequent pass must be framed and reviewed across **four explicit tracks**:

- **State management**: confirm the feature uses the correct layer ownership (`Supabase -> Query -> Zustand -> XState -> Jotai`) or explicitly document the remaining gap
- **UI quality**: improve the surface so it matches the current stack doctrine, not just "works"
- **DRY / modular code shape**: remove repeated structures, extract reusable parts, and keep files aligned with the screen anatomy
- **Documentation**: record intent before the pass and outcome after the pass in the correct docs subtree

If one of those four tracks is intentionally out of scope, the pass doc must say so explicitly.
Do not silently treat a pass as "UI-only" when it also touches data flow, state ownership, or repeated screen structure.

---

### âš¡ Quick Reference â€” The `useEffect` Decision Tree

> Before reaching for `useEffect`, walk this tree top to bottom.
> `useEffect` only wins the **last** branch. In practice: no subscription, no timer â†’ it's wrong.

```
"When X changes, I need Y"
         â”‚
         â–¼
Is Y a value derived from X?
  â†’ YES â†’ useMemo / inline const â€” no hook needed
           Example: ratingState + visits â†’ validatedRatingState (BUG-012 fix)

Is Y a ref that mirrors X?
  â†’ YES â†’ assign ref.current = X inline during render, no useEffect
           Example: totalCostValueRef = totalCostValue (useMapCommitPaymentController)

Is Y a machine state with named terminal values (IDLE, WAITING, FAILEDâ€¦)?
  â†’ YES â†’ Jotai atom (L5) or XState (L4)
           Example: submissionState in useMapCommitPaymentController

Is Y server data triggered by X?
  â†’ YES â†’ TanStack Query with X in queryKey or enabled: Boolean(X)
           Example: estimatedCost query enabled on hospitalId

Is Y a real side-effect â€” subscription, cleanup, timer, navigation?
  â†’ YES â†’ useEffect is correct here
           Example: Supabase realtime channel setup/teardown
```

**Rule of thumb**: if you are not managing a subscription, timer, or cleanup, `useEffect` is probably wrong. The violation only surfaces as a bug *later* â€” stale closure, missed dep, extra render, race condition â€” never at the point of writing.


### Loading State Rule

- Layout-bearing loading states should favor **skeletons** over generic activity indicators
- Use skeletons when the final surface is a list, card stack, form shell, summary panel, or route-owned canvas
- Reserve `ActivityIndicator`-style loaders for compact inline pending states such as button submit feedback, tiny refresh affordances, or small accessory status
- Do not let important screens fall back to a blank pause or a lone spinner when the final layout can be previewed structurally

### âœ… DO

- **Server state** (API data, caching, sync) â†’ TanStack Query
- **Persistent client state** (user prefs, active trips) â†’ Zustand
- **Ephemeral UI state** (modals, selections, sheet phase) â†’ Jotai atoms
- **Cross-component sync** â†’ Jotai atoms (not prop drilling)

### âŒ DON'T

- Mix server/client state in the same hook
- Use `useState` for values that need cross-component sync
- Store derived state (compute it in selectors)
- Access Zustand stores directly in UI components (use hooks)

---

## 2. File Organization Rules

### âœ… DO

| Concern              | Location                 |
| -------------------- | ------------------------ |
| Screen orchestration | `screens/*.jsx`          |
| Hook composition     | `hooks/map/exploreFlow/` |
| Pure UI components   | `components/map/views/`  |
| State atoms          | `atoms/*.js`             |
| Store definitions    | `stores/*.js`            |
| Service/API calls    | `services/*.js`          |

### âŒ DON'T

- Put business logic in screen files (screens = wiring only)
- Import from `contexts/` directly in components (use hooks)
- Create files >500 lines (extract when approaching limit)

---

## 3. Hook Design Rules

### âœ… DO

```js
// Single responsibility, descriptive name
function useMapHospitalActions({ selectHospital, openAmbulanceDecision }) {
  // Pure logic, no side effects at top level
  const handleSelect = useCallback(
    (hospital) => {
      // Implementation
    },
    [selectHospital],
  );

  return { handleSelect };
}
```

### âŒ DON'T

```js
// Anti-pattern: God hook with mixed concerns
function useMapEverything() {
  const [localState, setLocalState] = useState(); // âŒ Use atom instead
  const query = useQuery({...}); // âŒ Server state mixed with UI
  const store = useStore(); // âŒ Direct store access

  // âŒ Side effects at top level
  useEffect(() => { fetchData() }, []);

  return { ...20+ properties }; // âŒ Too broad
}
```

---

## 4. Context/Provider Rules

### âœ… DO

- Context providers are **thin** â€” they compose hooks, don't implement logic
- Adapter pattern: new provider must be **superset** of old (no missing exports)
- Use `useMemo` for context value with complete dependency array

### âŒ DON'T

- Export `setState` directly from context (use actions)
- Change provider without updating all consumers
- Create circular dependencies between contexts

---

## 5. Defensive Programming Patterns

### Null Safety

```js
// âŒ Default doesn't protect against explicit null
function useHook({ param = {} }) { param.map(...) } // Crashes if null passed

// âœ… Normalize inside function body
function useHook({ param }) {
  const safeParam = param || {};
  safeParam.map(...);
}
```

### TDZ Prevention

```js
// âŒ Variable used before defined
const { value } = useHook({ other }); // other not defined yet
const other = useOther();

// âœ… Define dependencies before use
const other = useOther();
const { value } = useHook({ other });
```

---

## 6. Naming Conventions

| Pattern       | Use For        | Example                 |
| ------------- | -------------- | ----------------------- |
| `useXxx`      | Custom hooks   | `useMapExploreFlow`     |
| `handleXxx`   | Event handlers | `handleChooseCare`      |
| `onXxx`       | Callback props | `onChooseCare`          |
| `isXxx`       | Booleans       | `isMapFrameReady`       |
| `xxxAtom`     | Jotai atoms    | `sheetPhaseAtom`        |
| `useXxxStore` | Zustand stores | `useEmergencyTripStore` |

### âš ï¸ Avoid Similar Names

- `closeHistoryVisitDetails` vs `closeVisitDetail` â€” caused bug 2026-04-26
- Always check for existing similar names before adding new ones

---

## 7. Before Committing Fixes

### Checklist

- [ ] No `useState` added for cross-component values (use atoms)
- [ ] No logic added to screen files (extract to hooks)
- [ ] No imports from `contexts/*` in components (use hooks)
- [ ] No `param = {}` without `|| {}` normalization
- [ ] No variables used before defined (TDZ check)
- [ ] Hook returns documented (JSDoc for complex objects)
- [ ] No files >500 lines without extraction plan

### Quick Audit Commands

```bash
# Find potential issues
grep -r "useState" hooks/map/ --include="*.js" | grep -v "atom"
grep -r "param = {}" hooks/ --include="*.js"
grep -r "from.*contexts/" components/ --include="*.jsx"
```

---

## 8. Common Bug Patterns (Learned from This Refactor)

| Pattern                                             | Issue                      | Fix                                           |
| --------------------------------------------------- | -------------------------- | --------------------------------------------- | --- | ------------------- |
| `const { x } = useHook()` where x used in next hook | TDZ error                  | Reorder: compute x first                      |
| `param = {}` default                                | Crashes on explicit `null` | Use `param                                    |     | {}` inside function |
| Similar function names                              | Wrong function called      | Prefix with domain: `historyXxx` vs `xxx`     |
| Incomplete adapter                                  | Missing context properties | Full property audit vs original               |
| `useQueryClient()` outside provider                 | Runtime crash              | Use standalone QueryClient or ensure provider |
| Effect deps missing new variables                   | Stale closures             | Audit all deps when refactoring               |

---

## 9. Performance Watch

### Memory

- Clean up Jotai atoms when components unmount (if temporary)
- Don't store large objects in atoms (use refs or memoization)
- Zustand selectors should be stable (use `shallow` or memoized selectors)

### Re-renders

- Jotai atoms cause re-renders on any change â€” split atoms by concern
- Use `useMemo` for expensive derived state
- Don't create new objects/functions in render (use `useCallback`, `useMemo`)

---

## 10. When in Doubt

1. **Check existing patterns** â€” look at `hooks/map/exploreFlow/useMap*.js` for examples
2. **Ask**: "Does this belong here or in a specialized hook?"
3. **Ask**: "Will this need to sync with other components?" (if yes â†’ atom)
4. **Ask**: "Is this server data?" (if yes â†’ TanStack Query)
5. **Run Metro** â€” test the actual flow, don't assume

---

## 11. Safe Modularization Methodology (The "No Silent Drop" Protocol)

This is the exact process used to decompose `EmergencyContext.jsx` (1,756 lines â†’ 189 lines) without breaking any consumer or dropping any logic.

### Phase 0 â€” Audit Before Touching

1. Count lines and flag files >500 lines as monolith candidates
2. Read the entire file top-to-bottom, categorizing every block:
   - Pure helpers / constants â†’ `utils/`
   - Server fetch logic â†’ hook (TanStack Query candidate)
   - Persistent state â†’ hook (Zustand candidate)
   - Ephemeral UI state â†’ hook (Jotai candidate)
   - Realtime subscriptions â†’ dedicated hook
   - Actions / mutations â†’ dedicated hook
3. List every key in the context value object â€” this is the **contract**. Nothing leaves that list.
4. List every consumer file that calls `useContext` / the custom hook. These are regression targets.

### Phase 1 â€” Extract Pure Helpers First (Zero Risk)

Move stateless functions and constants out before touching any hooks.

- Destination: `utils/<domain>Helpers.js`
- Rule: if it has no `useState`, `useEffect`, or closure over context state â†’ it's a pure helper
- Import the helpers back immediately â€” confirm file still runs before continuing

### Phase 2 â€” Decompose Into Specialized Hooks (One at a Time)

For each responsibility area, create one hook. Commit or checkpoint after each.

| Hook                       | Owns                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `useEmergencyLocationSync` | `userLocation`, `userLocationRef`, `parseEtaToSeconds`                                                                                   |
| `useEmergencyTripState`    | `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow`, mode/filter UI state, hydration, persistence, stable setters |
| `useEmergencyServerSync`   | `syncActiveTripsFromServer`, ambulance hydration, in-flight guard                                                                        |
| `useEmergencyRealtime`     | All Supabase subscriptions (emergency_requests, ambulance_location, hospital_beds), event gate logic                                     |
| `useEmergencyCoverageMode` | Coverage mode prefs, demo slug, `effectiveCoverageMode`, `setCoverageMode`, `nearbyCoverageCounts`                                       |
| `useEmergencyHospitalSync` | Hospital fetch, distance/ETA localization, filtering, sorting, specialties, `refetchHospitals`                                           |
| `useEmergencyActions`      | `startAmbulanceTrip`, `stopAmbulanceTrip`, `startBedBooking`, `stopBedBooking`, demo heartbeat, telemetry ticker                         |

### Phase 3 â€” Handle Circular Dependencies Explicitly

When hook A needs data from hook B but B also needs something from A:

**Pattern used (hospital â†” coverage circular dep):**

1. Run hook B first (coverage) with `hospitals: null` (safe default)
2. Run hook A second (hospital sync) â€” it reads coverage outputs which are reactive
3. In the provider, use a `useState` bridge: `const [hospitalsBridge, setHospitalsBridge] = useState(null)`
4. `useEffect(() => { setHospitalsBridge(hospitals); }, [hospitals])` â€” feeds A's output back to B on next render
5. For function passing (e.g. `refetchHospitals`): use `useRef` + a setter exposed by the hook, wire via `useEffect`

**Never:** create a hook that imports another sibling hook. Composition belongs in the provider only.

### Phase 4 â€” Build the Thin Provider Shell

The provider must be **composition only**:

- Call hooks in dependency order (dependencies first)
- Bridge any circular deps via local `useState`
- Build `useMemo` value with **100% of the original contract keys** â€” verify against your Phase 0 list
- No logic, no effects that belong in hooks

### Phase 5 â€” Contract Verification

Before merging:

1. Compare new context value object keys against the original line-by-line
2. Grep every consumer file â€” confirm every destructured key is present in the new value
3. Line count: provider shell â‰¤200 lines, each hook â‰¤500 lines, each utils file â‰¤200 lines

---

## 12. Documentation and Encoding Integrity Guard

Warning: `ivisit-app` currently has confirmed text-integrity defects. This is not only a docs-formatting issue. The repo contains both:

- Real source corruption (`U+FFFD`, double-encoded punctuation, garbled box-drawing sequences) in tracked files
- UTF-16LE tracked text files that should be normalized before further hardening work

Current high-signal examples:

- `contexts/VisitsContext.jsx`
- `docs/console/dashboard-crud-plan.md`
- `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
- `supabase/migrations/20260219000800_emergency_logic.sql`
- `supabase/docs/archive/legacy-references/20260218060000_consolidated_schema.sql`

Required guardrails until cleanup is closed:

- Treat copied punctuation from older docs, generated SQL, and logs as untrusted input.
- New or edited text files must be committed as UTF-8.
- Do not accept replacement characters (`U+FFFD`) in comments, docs, SQL, generated types, or test fixtures.
- If a tracked file is UTF-16LE, normalize it before broad refactors so diffs and grep-based QA stay trustworthy.
- If a migration, generated schema artifact, or audit note is regenerated, rerun the mojibake audit before merge.

Pre-merge audit for touched files:

```bash
rg -nP "\\x{FFFD}|\\x{00C2}\\x{00A7}|\\x{00E2}\\x{20AC}|\\x{251C}\\x{00F3}\\x{0393}\\x{00C7}" contexts docs screens supabase
```

Release gate:

- No new mojibake signatures in touched files
- No new UTF-16LE tracked text files
- Any existing corruption called out in current-state docs until repaired

### Phase 6 â€” Barrel Export

Add `hooks/<domain>/index.js` exporting all new hooks.
Update provider to use barrel imports.

---

## 12. EmergencyContext Decomposition Map (Reference Implementation)

```
EmergencyContext.jsx (original: 1,756 lines)
â”‚
â”œâ”€â”€ utils/emergencyContextHelpers.js (166 lines)
â”‚   â””â”€â”€ parseTimestampMs, areRuntimeStateValuesEqual, resolveStateUpdate,
â”‚       formatTelemetryAge, deriveAmbulanceTelemetryHealth,
â”‚       normalizeCoordinate, normalizeRouteCoordinates,
â”‚       interpolateRoutePosition, enrichHospitalsWithServiceTypes
â”‚
â”œâ”€â”€ hooks/emergency/useEmergencyLocationSync.js (60 lines)
â”‚   â””â”€â”€ userLocation, setUserLocation, userLocationRef, parseEtaToSeconds
â”‚
â”œâ”€â”€ hooks/emergency/useEmergencyTripState.js (221 lines)
â”‚   â””â”€â”€ activeAmbulanceTrip, activeBedBooking, pendingApproval, commitFlow
â”‚       mode, serviceType, selectedSpecialty, viewMode, selectedHospitalId
â”‚       stable setters (equality-guarded), refs, hydration, persistence
â”‚       patch helpers, UI actions (toggleMode, selectHospital, etc.)
â”‚
â”œâ”€â”€ hooks/emergency/useEmergencyServerSync.js (288 lines)
â”‚   â””â”€â”€ syncActiveTripsFromServer, ambulance detail hydration, in-flight guard
â”‚
â”œâ”€â”€ hooks/emergency/useEmergencyRealtime.js (294 lines)
â”‚   â””â”€â”€ emergency_requests subscription, ambulance_location subscription,
â”‚       hospital_beds subscription, event gate (shouldApplyAmbulanceEvent),
â”‚       resetAmbulanceEventVersion, handleRealtimeStatus, live GPS watch
â”‚
â”œâ”€â”€ hooks/emergency/useEmergencyCoverageMode.js (216 lines)
â”‚   â””â”€â”€ coverageModePreference, coverageModePreferenceLoaded,
â”‚       effectiveCoverageMode, effectiveDemoModeEnabled, coverageStatus,
â”‚       nearbyCoverageCounts, demoOwnerSlug, forceDemoFetch,
â”‚       setCoverageMode (with bootstrap + refetch), setRefetchHospitals
â”‚       CIRCULAR DEP RECEIVER: accepts hospitals prop + refetchHospitals ref
â”‚
â”œâ”€â”€ hooks/emergency/useEmergencyHospitalSync.js (229 lines)
â”‚   â””â”€â”€ hospitals, filteredHospitals, visibleHospitals, availableHospitals,
â”‚       specialties, selectedHospital, isLoadingHospitals, activeAmbulances,
â”‚       refetchHospitals, updateHospitals, refreshHospitals,
â”‚       getActiveAmbulanceDemoHospital
â”‚       CIRCULAR DEP PROVIDER: produces hospitals + refetchHospitals for coverage
â”‚
â”œâ”€â”€ hooks/emergency/useEmergencyActions.js (203 lines)
â”‚   â””â”€â”€ startAmbulanceTrip, stopAmbulanceTrip, setAmbulanceTripStatus,
â”‚       startBedBooking, stopBedBooking, setBedBookingStatus,
â”‚       ambulanceTelemetryHealth, demo responder heartbeat, telemetry ticker
â”‚
â””â”€â”€ contexts/EmergencyContext.jsx (189 lines) â† THIN SHELL ONLY
    â””â”€â”€ Composes all hooks, resolves circular dep via hospitalsBridge state,
        builds useMemo value (100% contract superset), exports useEmergency()
```

**Original contract (all keys preserved in new shell):**
`hospitals`, `allHospitals`, `filteredHospitals`, `specialties`, `selectedHospitalId`,
`selectedHospital`, `mode`, `userLocation`, `activeAmbulanceTrip`, `ambulanceTelemetryHealth`,
`activeBedBooking`, `serviceType`, `selectedSpecialty`, `viewMode`, `pendingApproval`,
`commitFlow`, `isLoadingHospitals`, `hasActiveFilters`, `coverageMode`, `coverageModePreference`,
`coverageModePreferenceLoaded`, `coverageStatus`, `nearbyCoverageCounts`, `effectiveDemoModeEnabled`,
`isLiveOnlyAvailable`, `hasDemoHospitalsNearby`, `hasComfortableDemoCoverage`,
`hasComfortableNearbyCoverage`, `coverageModeOperation`, `selectHospital`, `clearSelectedHospital`,
`toggleMode`, `setMode`, `toggleViewMode`, `selectSpecialty`, `selectServiceType`, `resetFilters`,
`startAmbulanceTrip`, `stopAmbulanceTrip`, `setAmbulanceTripStatus`, `patchActiveAmbulanceTrip`,
`startBedBooking`, `stopBedBooking`, `setBedBookingStatus`, `patchActiveBedBooking`,
`updateHospitals`, `refreshHospitals`, `setUserLocation`, `setPendingApproval`,
`patchPendingApproval`, `setCommitFlow`, `setCoverageMode`, `clearCommitFlow`

**Consumers verified (19 files):** All destructured keys confirmed present post-refactor.

---

## 13. Git Checkpoint Protocol (Every Pass)

Every modularization pass must be bookended by git checkpoints. This is non-negotiable.

### Step 1 â€” Record the monolith baseline hash

Before the first pass on any file, find and record the last commit where it was a monolith:

```bash
git log --oneline --follow hooks/map/exploreFlow/useMapExploreFlow.js | Select-Object -Last 5
git show <hash>:<path_to_file> | Measure-Object -Line   # confirm line count
```

Record this in `docs/architecture/<MODULE>_MODULARIZATION.md` under **Git Reference**.

### Step 2 â€” Restore the monolith at any time

```bash
# Read the monolith without checking out
git show <monolith_hash>:<path_to_file>

# Diff monolith vs current
git diff <monolith_hash> -- <path_to_file>

# Save to temp file for side-by-side
git show <monolith_hash>:<path_to_file> > /tmp/<file>.monolith.js
```

### Step 3 â€” Commit after each complete pass (not mid-pass)

Structured commit message format:

```
refactor(<domain>): Pass N â€” <hook name> extraction

- What was extracted
- What was removed from orchestrator
- Any bug fixes applied (TDZ, duplication, etc.)
- Orchestrator line count before â†’ after
```

**Never commit without explicit user permission.**

### Step 4 â€” Update the modularization doc

After committing, update the pass log table in `docs/architecture/<MODULE>_MODULARIZATION.md`:

- New hash recorded
- Pass logged with line count change
- Any deferred issues noted

---

## 14. Stash Comparison Protocol

Whenever a git stash exists with prior art on the module being modularized, compare it before completing the pass.

### Check what the stash has

```bash
git stash list
git show stash@{0}:<path_to_relevant_file>
git diff stash@{0} -- <path_to_current_file>
```

### What to look for

- Any callback or effect in the stash not present in the current version â†’ add with PULLBACK NOTE
- Any derived value the stash computed that we haven't accounted for â†’ evaluate and adopt or document why not
- Any prop the stash passed that we dropped â†’ confirm intentional or restore

### Stash adoption rules

- **Never apply stash wholesale** â€” the stash may have broken features while attempting improvements
- **Adopt logic, not files** â€” copy specific functions/patterns, not entire files
- **Flag problematic stash deps** â€” anything depending on `EmergencyContextAdapter`, `emergencyTripStore`, or Jotai atoms belongs to the gold standard migration sprint, not modularization passes
- **Document every stash adoption** with a PULLBACK NOTE citing the stash

### Reference: known stash files (ivisit-app)

| Stash file                             | What it contains         | Sprint                |
| -------------------------------------- | ------------------------ | --------------------- |
| `stores/emergencyTripStore.js`         | Zustand trip state       | Gold Standard Phase 1 |
| `hooks/emergency/useHospitalsQuery.ts` | TanStack Query hospitals | Gold Standard Phase 2 |
| `atoms/mapFlowAtoms.js`                | Jotai map UI atoms       | Gold Standard Phase 3 |
| `contexts/EmergencyContextAdapter.jsx` | Context adapter          | Gold Standard Phase 5 |

See `docs/./architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` for full migration plan.

---

## 15. The `useEffect + setTimeout` Fetch Exception

> **Why this section exists**: During the LocationSheet search fix (2026-05-11), `useAddressSearchController` was
> migrated *away* from TanStack Query back to a direct `useEffect + setTimeout` debounce because the TanStack
> approach produced silent empty results. That choice was justified â€” but it is a **narrow exception** that carries
> its own failure modes. This section documents when the pattern is valid, what guards are mandatory, and how to
> detect the same silent-failure class elsewhere.

---

### When `useEffect + setTimeout` is valid for a fetch

This pattern is acceptable **only when all of the following are true**:

| Condition | Explanation |
|---|---|
| The fetch is **UI-local** | Results are displayed only in the current component/hook scope. No other surface needs the same data simultaneously. |
| The data is **non-cacheable** | Results are query-specific and ephemeral â€” caching them across sessions or across identical queries has no product value (e.g. live autocomplete suggestions). |
| The trigger is **user input** | The effect re-runs on every keystroke/query change. A query key in TanStack would change just as often, eliminating deduplication gains. |
| **`enabled` gating is complex or stateful** | e.g. the query should only fire when a navigation mode flag (`isActive`) is also `true`. TanStack's `enabled` is evaluated once per render; layering multiple runtime conditions on it creates subtle race windows. |
| The failure mode is **visible** | If the fetch silently fails, the UI shows empty state or an inline error â€” not a cached stale result. |

If **any** condition above is false â†’ use TanStack Query (L2) instead.

---

### Mandatory safety guards for this pattern

Every `useEffect + setTimeout` fetch **must** include all of the following:

```js
// 1. Request ID ref â€” cancels stale responses after component re-renders
const requestIdRef = useRef(0);

useEffect(() => {
  const trimmed = query.trim();

  // 2. Early-exit guard â€” clears state and skips fetch when not ready
  if (!isActive || trimmed.length < 2) {
    setResults([]);
    setIsLoading(false);
    setError(null);
    return;  // â† no timeout started, no stale state
  }

  // 3. Increment before async work â€” each render gets a unique ID
  const requestId = ++requestIdRef.current;

  const timeout = setTimeout(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await service.fetch(trimmed, context);

      // 4. Stale check â€” discard if a newer request has fired
      if (requestIdRef.current !== requestId) return;
      setResults(Array.isArray(data) ? data : []);
    } catch (_err) {
      if (requestIdRef.current !== requestId) return;
      setResults([]);
      setError(ERROR_COPY);  // â† always a user-readable string, never raw error
    } finally {
      // 5. Loading flag reset only for the owning request
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, DEBOUNCE_MS);  // â† always a named constant, never a magic number

  // 6. Cleanup â€” clears timeout if deps change before it fires
  return () => clearTimeout(timeout);
}, [isActive, query, context]);  // â† all inputs that affect what is fetched
```

**Additionally**, the `clearSearch` / reset path must increment `requestIdRef.current` to cancel any in-flight request:

```js
const clearSearch = useCallback(() => {
  setQuery("");
  setResults([]);
  setError(null);
  requestIdRef.current += 1;  // â† cancels any pending timeout callback
}, []);
```

---

### Silent failure signals â€” how this pattern breaks

| Symptom | Root cause |
|---|---|
| Search always returns empty, no error shown | Early-exit guard too broad â€” `isActive` or another flag never becomes `true` |
| Results flash then disappear | Stale-check ID mismatch â€” `requestIdRef` incremented too aggressively (e.g. on every render, not just on clear/reset) |
| Old results shown after clearing | Missing `requestIdRef.current += 1` in the clear/reset path |
| Loading spinner never stops | `finally` block guarded by stale-check that is always false |
| Searches fire on every render, not on input | Effect deps include unstable object references (e.g. `locationBias` object instead of `locationBias?.latitude, locationBias?.longitude`) |
| No error shown on network failure | `catch` block sets `setError(err)` with a raw `Error` object instead of a user-readable string |

---

### Audit grep â€” find this pattern in the codebase

```bash
# Find all useEffect blocks that contain both setTimeout and a service/fetch call
# These are candidates for either correct implementation or silent-failure risk
rg -n "setTimeout" hooks/ components/ --include="*.js" --include="*.jsx" -l

# Within those files, check for missing requestIdRef
rg -n "requestIdRef" hooks/ components/ --include="*.js" --include="*.jsx"

# Find async fetches inside useEffect without a requestId guard
rg -A 20 "useEffect.*=>" hooks/ --include="*.js" | grep -A 10 "async"
```

Any file returned by the first grep that is **not** returned by the second grep is a missing-stale-guard candidate.

---

### Layer decision summary (updated)

```
"I need to fetch data when the user types"
         â”‚
         â–¼
Is the result needed by >1 component or surface simultaneously?
  â†’ YES â†’ TanStack Query â€” shared cache, single network request (L2)

Is the result cacheable across sessions or identical queries?
  â†’ YES â†’ TanStack Query â€” staleTime + placeholderData give this for free (L2)

Is the enabled condition simple (single boolean, no navigation mode)?
  â†’ YES â†’ TanStack Query with enabled: Boolean(flag) (L2)

Is the UI-local, non-cacheable, enabled condition complex/stateful?
  â†’ YES â†’ useEffect + setTimeout with ALL guards from Section 15 âœ“
```

---

**Last Updated**: 2026-05-11  
**Applies To**: All hooks, contexts, components, and screen files in ivisit-app
