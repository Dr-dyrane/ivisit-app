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

**Last Updated**: 2026-04-26  
**Applies To**: All hooks, contexts, components, and screen files in ivisit-app
