# PASS_LOC{N}_{SHORT_NAME}.md

**Date Started:** YYYY-MM-DD  
**Date Completed:** YYYY-MM-DD / In Progress  
**Status:** Draft / In Progress / Complete / Rolled Back  
**Branch:** feat/grand-refactor  
**Baseline Commit:** `abc1234`  
**Commits:** `abc1234`, `def5678`

---

## Pass Summary

**Goal:** One-sentence description of what this pass achieves  
**Risk Level:** 🔴 High / 🟡 Medium / 🟢 Low  
**Dependencies:** LOC-X, LOC-Y (must be completed first)  
**Blocks:** LOC-Z (cannot start until this is done)

---

## Changes Made

### Files Modified
| File | Lines | Change Type | Description |
|------|-------|-------------|-------------|
| `hooks/map/exploreFlow/example.js` | +45/-12 | Add | Added feature flag and validation logic |
| `hooks/map/state/example.store.js` | +12/-0 | Modify | Defense-in-depth reducer validation |

### Feature Flag
```javascript
const ENABLE_LOC_HARDENING_LOC{N} = false; // Default: existing behavior
```

### Key Code Changes
```javascript
// Example: New validation at entry point
const handleExample = useCallback((input) => {
  if (ENABLE_LOC_HARDENING_LOC{N}) {
    // NEW: LOC-{N} validation logic
    const validated = validateInput(input);
    if (!validated) {
      console.warn("[LOC-{N}] Invalid input", input);
      return;
    }
  }
  
  // EXISTING: Original logic continues
  // ...
}, [...]);
```

---

## Verification Checklist

Before declaring this pass complete, verify:

- [ ] **Flag off = original behavior**
  - Disable flag, test full manual flow
  - Result: No regressions
  
- [ ] **Flag on = new behavior**
  - Enable flag, test full manual flow
  - Result: New validation working
  
- [ ] **Toggle safety**
  - Switch flag 3x during single session
  - Result: No state drift, no crashes
  
- [ ] **Edge cases**
  - [ ] Edge case 1 description
  - [ ] Edge case 2 description
  
- [ ] **Cache/data preservation**
  - localStorage keys unchanged: Yes/No
  - Data migration needed: Yes/No
  
- [ ] **No new dependencies**
  - package.json unchanged: Yes/No

---

## Testing Notes

### Test Scenarios
| Scenario | Steps | Expected | Actual | Pass |
|----------|-------|----------|--------|------|
| Valid input | Enter valid address → Submit | Success | | |
| Invalid input | Enter invalid address → Submit | Rejected with warning | | |
| Flag toggle | Switch flag mid-session | Behavior changes immediately | | |

### Known Issues
- Issue 1: Description and workaround
- Issue 2: Description and workaround

---

## Rollback Information

### Safe to Revert: Yes/No

If **No**, explain why:
```
This pass modifies shared state shape. Reverting without reverting LOC-X 
first will cause runtime errors.
```

### Revert Order (if dependent on other passes)
1. Revert LOC-{N+1} first (if it depends on this)
2. Revert this pass: `git revert <commit-hash>`
3. Or disable flag: Set `ENABLE_LOC_HARDENING_LOC{N} = false`

### Data Migration Required: Yes/No

If **Yes**, provide migration script:
```javascript
// Migration to revert state changes
const migrateDown = () => {
  // Remove added keys, restore original shape
};
```

### Quick Rollback Commands
```bash
# Find the pass commit
git log --oneline --grep="LOC-{N}"

# Revert the commit
git revert <hash> --no-edit

# Or disable flag (faster)
# Edit file, set ENABLE_LOC_HARDENING_LOC{N} = false
# git commit -m "hotfix(location): Disable LOC-{N}"
```

---

## Code Guardrails (MUST CHECK BEFORE IMPLEMENTING)

> **Source:** [REFACTORING_GUARDRAILS.md](../../../../REFACTORING_GUARDRAILS.md)  
> **Tracking Learnings:** [TRACKING_SHEET_LEARNINGS.md](../../../../architecture/refactoring/TRACKING_SHEET_LEARNINGS.md)

### 1. Five-Layer State Architecture

**Correct owner for each state type:**

| Layer | Owner | Use For | DON'T Use For |
|-------|-------|---------|---------------|
| **L1** | Supabase Realtime | Live emergency rows, responder updates | — |
| **L2** | TanStack Query | Server cache, refetch control (active trip query, hospitals) | Client-only state |
| **L3** | Zustand + persist | Persistent client state (trips, auth, location) | Ephemeral UI state |
| **L4** | XState | Lifecycle + legal transitions (trip state machine) | Raw status strings |
| **L5** | Jotai atoms | Ephemeral UI state (sheet phase, modals, selection) | Cross-component sync |

**THIS PASS CHECKLIST:**
- [ ] New server data → TanStack Query (not useState + useEffect)
- [ ] New persistent state → Zustand (not localStorage directly)
- [ ] New machine-like state → XState or Jotai atom
- [ ] New ephemeral UI → Jotai atom (not useState for cross-component)

### 2. useEffect Decision Tree (MUST WALK BEFORE ADDING)

```
"When X changes, I need Y"
         │
         ▼
Is Y derived from X? → YES → useMemo / inline const (no useEffect!)

Is Y a ref mirroring X? → YES → Assign inline during render
         
Is Y machine state (IDLE, WAITING, FAILED)? → YES → Jotai atom (L5) or XState (L4)

Is Y server data triggered by X? → YES → TanStack Query with X in queryKey

Is Y real side-effect (subscription, timer, cleanup)? → YES → useEffect correct here
```

**RULE:** If not managing subscription/timer/cleanup, `useEffect` is wrong.  
**THIS PASS:** No new useEffect blocks unless absolutely necessary.

### 3. Tracking Sheet Lessons (MUST AVOID)

#### ❌ Lesson 1: Modal Renderer Gated on Transient Parent
**Mistake:** Modal inside component that mounts/unmounts with screen state  
**Symptoms:** "Modal sometimes doesn't show", "Toast disappears on navigate"  
**THIS PASS CHECK:**
- [ ] Any new modal rendered at screen root level, not transient subtree
- [ ] Modal state in Jotai atom (survives remount), not local useState

#### ❌ Lesson 2: Imperative Auto-Open Relying on Data Race
**Mistake:** `openTracking()` assumes state is ready (race condition)  
**Symptoms:** "Sometimes tracking doesn't open after payment"  
**THIS PASS CHECK:**
- [ ] No imperative auto-open without derived effect on canonical flag
- [ ] Use "double-run" pattern: imperative call + effect on XState flag

#### ❌ Lesson 3: Raw Status String Comparisons
**Mistake:** `if (trip?.status === "in_progress")` scattered across codebase  
**Symptoms:** Behavior drifts, 75+ files need editing for new status  
**THIS PASS CHECK:**
- [ ] Use `useTripLifecycle()` flags: `isIdle`, `isActive`, `hasActiveTrip`
- [ ] Never re-derive from raw status strings

#### ❌ Lesson 4: Raw AsyncStorage Instead of `database` Abstraction
**Mistake:** Direct `AsyncStorage` import in feature files  
**Symptoms:** Namespace collisions, inconsistent prefixing  
**THIS PASS CHECK:**
- [ ] Use `database.read()` / `database.write()` through `StorageKeys`
- [ ] Add key to `StorageKeys` registry, use `SingletonKeys` or `CollectionKeys`

#### ❌ Lesson 5: Bundling Related State into Separate Atoms
**Mistake:** 4 atoms each persisting individually → storage thrash  
**Symptoms:** 4 storage writes per update, hydration race  
**THIS PASS CHECK:**
- [ ] Cluster related state under one storage key
- [ ] Use bundled atom pattern (see `mapScreenAtoms.js:19-73`)

#### ❌ Lesson 6: Visualization Wrappers Without Checking Existing Parts
**Mistake:** New feature adds animation/gradient without checking target component  
**Symptoms:** Double underlays, padding stacked twice, fighting animations  
**THIS PASS CHECK:**
- [ ] Read target component end-to-end before adding visual scaffolding
- [ ] Extend props on existing component, don't wrap

### 4. File Size & Decomposition Guardrails

| File Type | Target | Hard Max | Action If Exceeded |
|-----------|--------|----------|-------------------|
| Routes | 20-100 lines | 150 | Extract to screen |
| Screens | 250-400 lines | 500 | Decompose to views |
| Components | 80-250 lines | 350 | Extract parts |
| Complex Components | 150-300 lines | 450 | Extract helpers |
| Hooks | 80-200 lines | 300 | Split or extract |
| Controllers | 150-300 lines | 400 | Extract orchestration |
| State Files | 30-150 lines | 250 | Split by domain |
| Service Files | 100-300 lines | 500 | Extract pure helpers |

**THIS PASS CHECK:**
- [ ] Modified files stay under hard max
- [ ] If approaching max, extract BEFORE adding new code

### 5. PULLBACK NOTE Format (Required)

Every significant change must include:

```javascript
// PULLBACK NOTE: LOC-{N} 
// OLD: [What was there before]
// NEW: [What replaced it]
// REASON: [Why this change was made]
// LAYER: [L1/L2/L3/L4/L5 — which state layer was touched]
// RISK: [None/Low/Medium/High]
```

---

## Decisions & Notes

### Decision 1: Title
**Context:** Why this choice was made  
**Decision:** What was decided  
**Consequences:** What this means for future passes

### PULLBACK NOTES
```javascript
// PULLBACK NOTE: LOC-{N} 
// OLD: Previous implementation
// NEW: New implementation
// REASON: Why this change was made
```

---

## Related

- Parent Dossier: [DOSSIER_LOCATION_HARDENING_V1.md](../DOSSIER_LOCATION_HARDENING_V1.md)
- Pre-Implementation Audit: [audits/AUDIT_EXAMPLE.md](../audits/AUDIT_EXAMPLE.md)
- Next Pass: [PASS_LOC{N+1}_NEXT.md](./PASS_LOC{N+1}_NEXT.md) (when created)

---

## Post-Pass Review

**Completed by:** @name  
**Date:** YYYY-MM-DD  

### What Went Well
- 

### What Could Be Better
- 

### Lessons for Future Passes
- 
