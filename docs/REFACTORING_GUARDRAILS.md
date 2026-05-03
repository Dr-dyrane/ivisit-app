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

### Loading State Rule

- Layout-bearing loading states should favor **skeletons** over generic activity indicators
- Use skeletons when the final surface is a list, card stack, form shell, summary panel, or route-owned canvas
- Reserve `ActivityIndicator`-style loaders for compact inline pending states such as button submit feedback, tiny refresh affordances, or small accessory status
- Do not let important screens fall back to a blank pause or a lone spinner when the final layout can be previewed structurally

### ✅ DO

- **Server state** (API data, caching, sync) → TanStack Query
- **Persistent client state** (user prefs, active trips) → Zustand
- **Ephemeral UI state** (modals, selections, sheet phase) → Jotai atoms
- **Cross-component sync** → Jotai atoms (not prop drilling)

### ❌ DON'T

- Mix server/client state in the same hook
- Use `useState` for values that need cross-component sync
- Store derived state (compute it in selectors)
- Access Zustand stores directly in UI components (use hooks)

---

## 2. File Organization Rules

### ✅ DO

| Concern              | Location                 |
| -------------------- | ------------------------ |
| Screen orchestration | `screens/*.jsx`          |
| Hook composition     | `hooks/map/exploreFlow/` |
| Pure UI components   | `components/map/views/`  |
| State atoms          | `atoms/*.js`             |
| Store definitions    | `stores/*.js`            |
| Service/API calls    | `services/*.js`          |

### ❌ DON'T

- Put business logic in screen files (screens = wiring only)
- Import from `contexts/` directly in components (use hooks)
- Create files >500 lines (extract when approaching limit)

---

## 3. Hook Design Rules

### ✅ DO

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

### ❌ DON'T

```js
// Anti-pattern: God hook with mixed concerns
function useMapEverything() {
  const [localState, setLocalState] = useState(); // ❌ Use atom instead
  const query = useQuery({...}); // ❌ Server state mixed with UI
  const store = useStore(); // ❌ Direct store access

  // ❌ Side effects at top level
  useEffect(() => { fetchData() }, []);

  return { ...20+ properties }; // ❌ Too broad
}
```

---

## 4. Context/Provider Rules

### ✅ DO

- Context providers are **thin** — they compose hooks, don't implement logic
- Adapter pattern: new provider must be **superset** of old (no missing exports)
- Use `useMemo` for context value with complete dependency array

### ❌ DON'T

- Export `setState` directly from context (use actions)
- Change provider without updating all consumers
- Create circular dependencies between contexts

---

## 5. Defensive Programming Patterns

### Null Safety

```js
// ❌ Default doesn't protect against explicit null
function useHook({ param = {} }) { param.map(...) } // Crashes if null passed

// ✅ Normalize inside function body
function useHook({ param }) {
  const safeParam = param || {};
  safeParam.map(...);
}
```

### TDZ Prevention

```js
// ❌ Variable used before defined
const { value } = useHook({ other }); // other not defined yet
const other = useOther();

// ✅ Define dependencies before use
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

### ⚠️ Avoid Similar Names

- `closeHistoryVisitDetails` vs `closeVisitDetail` — caused bug 2026-04-26
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

- Jotai atoms cause re-renders on any change — split atoms by concern
- Use `useMemo` for expensive derived state
- Don't create new objects/functions in render (use `useCallback`, `useMemo`)

---

## 10. When in Doubt

1. **Check existing patterns** — look at `hooks/map/exploreFlow/useMap*.js` for examples
2. **Ask**: "Does this belong here or in a specialized hook?"
3. **Ask**: "Will this need to sync with other components?" (if yes → atom)
4. **Ask**: "Is this server data?" (if yes → TanStack Query)
5. **Run Metro** — test the actual flow, don't assume

---

## 11. Safe Modularization Methodology (The "No Silent Drop" Protocol)

This is the exact process used to decompose `EmergencyContext.jsx` (1,756 lines → 189 lines) without breaking any consumer or dropping any logic.

### Phase 0 — Audit Before Touching

1. Count lines and flag files >500 lines as monolith candidates
2. Read the entire file top-to-bottom, categorizing every block:
   - Pure helpers / constants → `utils/`
   - Server fetch logic → hook (TanStack Query candidate)
   - Persistent state → hook (Zustand candidate)
   - Ephemeral UI state → hook (Jotai candidate)
   - Realtime subscriptions → dedicated hook
   - Actions / mutations → dedicated hook
3. List every key in the context value object — this is the **contract**. Nothing leaves that list.
4. List every consumer file that calls `useContext` / the custom hook. These are regression targets.

### Phase 1 — Extract Pure Helpers First (Zero Risk)

Move stateless functions and constants out before touching any hooks.

- Destination: `utils/<domain>Helpers.js`
- Rule: if it has no `useState`, `useEffect`, or closure over context state → it's a pure helper
- Import the helpers back immediately — confirm file still runs before continuing

### Phase 2 — Decompose Into Specialized Hooks (One at a Time)

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

### Phase 3 — Handle Circular Dependencies Explicitly

When hook A needs data from hook B but B also needs something from A:

**Pattern used (hospital ↔ coverage circular dep):**

1. Run hook B first (coverage) with `hospitals: null` (safe default)
2. Run hook A second (hospital sync) — it reads coverage outputs which are reactive
3. In the provider, use a `useState` bridge: `const [hospitalsBridge, setHospitalsBridge] = useState(null)`
4. `useEffect(() => { setHospitalsBridge(hospitals); }, [hospitals])` — feeds A's output back to B on next render
5. For function passing (e.g. `refetchHospitals`): use `useRef` + a setter exposed by the hook, wire via `useEffect`

**Never:** create a hook that imports another sibling hook. Composition belongs in the provider only.

### Phase 4 — Build the Thin Provider Shell

The provider must be **composition only**:

- Call hooks in dependency order (dependencies first)
- Bridge any circular deps via local `useState`
- Build `useMemo` value with **100% of the original contract keys** — verify against your Phase 0 list
- No logic, no effects that belong in hooks

### Phase 5 — Contract Verification

Before merging:

1. Compare new context value object keys against the original line-by-line
2. Grep every consumer file — confirm every destructured key is present in the new value
3. Line count: provider shell ≤200 lines, each hook ≤500 lines, each utils file ≤200 lines

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

### Phase 6 — Barrel Export

Add `hooks/<domain>/index.js` exporting all new hooks.
Update provider to use barrel imports.

---

## 12. EmergencyContext Decomposition Map (Reference Implementation)

```
EmergencyContext.jsx (original: 1,756 lines)
│
├── utils/emergencyContextHelpers.js (166 lines)
│   └── parseTimestampMs, areRuntimeStateValuesEqual, resolveStateUpdate,
│       formatTelemetryAge, deriveAmbulanceTelemetryHealth,
│       normalizeCoordinate, normalizeRouteCoordinates,
│       interpolateRoutePosition, enrichHospitalsWithServiceTypes
│
├── hooks/emergency/useEmergencyLocationSync.js (60 lines)
│   └── userLocation, setUserLocation, userLocationRef, parseEtaToSeconds
│
├── hooks/emergency/useEmergencyTripState.js (221 lines)
│   └── activeAmbulanceTrip, activeBedBooking, pendingApproval, commitFlow
│       mode, serviceType, selectedSpecialty, viewMode, selectedHospitalId
│       stable setters (equality-guarded), refs, hydration, persistence
│       patch helpers, UI actions (toggleMode, selectHospital, etc.)
│
├── hooks/emergency/useEmergencyServerSync.js (288 lines)
│   └── syncActiveTripsFromServer, ambulance detail hydration, in-flight guard
│
├── hooks/emergency/useEmergencyRealtime.js (294 lines)
│   └── emergency_requests subscription, ambulance_location subscription,
│       hospital_beds subscription, event gate (shouldApplyAmbulanceEvent),
│       resetAmbulanceEventVersion, handleRealtimeStatus, live GPS watch
│
├── hooks/emergency/useEmergencyCoverageMode.js (216 lines)
│   └── coverageModePreference, coverageModePreferenceLoaded,
│       effectiveCoverageMode, effectiveDemoModeEnabled, coverageStatus,
│       nearbyCoverageCounts, demoOwnerSlug, forceDemoFetch,
│       setCoverageMode (with bootstrap + refetch), setRefetchHospitals
│       CIRCULAR DEP RECEIVER: accepts hospitals prop + refetchHospitals ref
│
├── hooks/emergency/useEmergencyHospitalSync.js (229 lines)
│   └── hospitals, filteredHospitals, visibleHospitals, availableHospitals,
│       specialties, selectedHospital, isLoadingHospitals, activeAmbulances,
│       refetchHospitals, updateHospitals, refreshHospitals,
│       getActiveAmbulanceDemoHospital
│       CIRCULAR DEP PROVIDER: produces hospitals + refetchHospitals for coverage
│
├── hooks/emergency/useEmergencyActions.js (203 lines)
│   └── startAmbulanceTrip, stopAmbulanceTrip, setAmbulanceTripStatus,
│       startBedBooking, stopBedBooking, setBedBookingStatus,
│       ambulanceTelemetryHealth, demo responder heartbeat, telemetry ticker
│
└── contexts/EmergencyContext.jsx (189 lines) ← THIN SHELL ONLY
    └── Composes all hooks, resolves circular dep via hospitalsBridge state,
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

### Step 1 — Record the monolith baseline hash

Before the first pass on any file, find and record the last commit where it was a monolith:

```bash
git log --oneline --follow hooks/map/exploreFlow/useMapExploreFlow.js | Select-Object -Last 5
git show <hash>:<path_to_file> | Measure-Object -Line   # confirm line count
```

Record this in `docs/architecture/<MODULE>_MODULARIZATION.md` under **Git Reference**.

### Step 2 — Restore the monolith at any time

```bash
# Read the monolith without checking out
git show <monolith_hash>:<path_to_file>

# Diff monolith vs current
git diff <monolith_hash> -- <path_to_file>

# Save to temp file for side-by-side
git show <monolith_hash>:<path_to_file> > /tmp/<file>.monolith.js
```

### Step 3 — Commit after each complete pass (not mid-pass)

Structured commit message format:

```
refactor(<domain>): Pass N — <hook name> extraction

- What was extracted
- What was removed from orchestrator
- Any bug fixes applied (TDZ, duplication, etc.)
- Orchestrator line count before → after
```

**Never commit without explicit user permission.**

### Step 4 — Update the modularization doc

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

- Any callback or effect in the stash not present in the current version → add with PULLBACK NOTE
- Any derived value the stash computed that we haven't accounted for → evaluate and adopt or document why not
- Any prop the stash passed that we dropped → confirm intentional or restore

### Stash adoption rules

- **Never apply stash wholesale** — the stash may have broken features while attempting improvements
- **Adopt logic, not files** — copy specific functions/patterns, not entire files
- **Flag problematic stash deps** — anything depending on `EmergencyContextAdapter`, `emergencyTripStore`, or Jotai atoms belongs to the gold standard migration sprint, not modularization passes
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

**Last Updated**: 2026-04-26  
**Applies To**: All hooks, contexts, components, and screen files in ivisit-app
