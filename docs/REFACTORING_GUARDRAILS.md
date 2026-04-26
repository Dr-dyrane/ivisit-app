# Refactoring Guardrails

> **Purpose**: Maintain architectural integrity during fixes and refactoring.  
> **Context**: iVisit uses a three-layer state architecture (TanStack Query + Zustand + Jotai) with strict separation of concerns.

---

## 1. State Management Rules

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
| Concern | Location |
|---------|----------|
| Screen orchestration | `screens/*.jsx` |
| Hook composition | `hooks/map/exploreFlow/` |
| Pure UI components | `components/map/views/` |
| State atoms | `atoms/*.js` |
| Store definitions | `stores/*.js` |
| Service/API calls | `services/*.js` |

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
  const handleSelect = useCallback((hospital) => {
    // Implementation
  }, [selectHospital]);
  
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

| Pattern | Use For | Example |
|---------|---------|---------|
| `useXxx` | Custom hooks | `useMapExploreFlow` |
| `handleXxx` | Event handlers | `handleChooseCare` |
| `onXxx` | Callback props | `onChooseCare` |
| `isXxx` | Booleans | `isMapFrameReady` |
| `xxxAtom` | Jotai atoms | `sheetPhaseAtom` |
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

| Pattern | Issue | Fix |
|---------|-------|-----|
| `const { x } = useHook()` where x used in next hook | TDZ error | Reorder: compute x first |
| `param = {}` default | Crashes on explicit `null` | Use `param || {}` inside function |
| Similar function names | Wrong function called | Prefix with domain: `historyXxx` vs `xxx` |
| Incomplete adapter | Missing context properties | Full property audit vs original |
| `useQueryClient()` outside provider | Runtime crash | Use standalone QueryClient or ensure provider |
| Effect deps missing new variables | Stale closures | Audit all deps when refactoring |

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

| Hook | Owns |
|---|---|
| `useEmergencyLocationSync` | `userLocation`, `userLocationRef`, `parseEtaToSeconds` |
| `useEmergencyTripState` | `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow`, mode/filter UI state, hydration, persistence, stable setters |
| `useEmergencyServerSync` | `syncActiveTripsFromServer`, ambulance hydration, in-flight guard |
| `useEmergencyRealtime` | All Supabase subscriptions (emergency_requests, ambulance_location, hospital_beds), event gate logic |
| `useEmergencyCoverageMode` | Coverage mode prefs, demo slug, `effectiveCoverageMode`, `setCoverageMode`, `nearbyCoverageCounts` |
| `useEmergencyHospitalSync` | Hospital fetch, distance/ETA localization, filtering, sorting, specialties, `refetchHospitals` |
| `useEmergencyActions` | `startAmbulanceTrip`, `stopAmbulanceTrip`, `startBedBooking`, `stopBedBooking`, demo heartbeat, telemetry ticker |

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

**Last Updated**: 2026-04-26  
**Applies To**: All hooks, contexts, components, and screen files in ivisit-app
