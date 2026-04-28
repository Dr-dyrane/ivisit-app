# Refactoring Bible: The "Apple Way" Architecture

**Status**: Active / In Progress
**Date**: 2026-02-10 — Last Updated: 2026-04-26
**Goal**: Create a codebase that is readable, scalable, modular, and principled. We aim for "The Apple Way": clean user experience, efficient memory usage, and structured complexity that feels simple to the user.

---

## 1. Executive Summary
The codebase is transitioning from a **Monolithic Component Anti-Pattern** to a **View-Hook-Service** architecture.
We prioritize:
1.  **Separation of Concerns**: View (UI) -> Hook (State/Logic) -> Service (Data/Business Rules).
2.  **DRY (Don't Repeat Yourself)**: Centralized validation, error handling, and data mapping.
3.  **Performance**: Aggressive use of `useMemo`, `useCallback`, and `debounce` to prevent re-renders and memory leaks.
4.  **Debuggability**: Clear data flow so errors are easy to trace.

---

## 2. The Audit: Status Report

### 🚨 Critical Severity (Legacy)
| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `screens/ProfileScreen.jsx` | ~1048 | 🟡 In Progress | Form logic partially extracted. Still needs UI decomposition. |
| `screens/SearchScreen.jsx` | ~1043 | 🟢 Resolved | Ranking logic moved to `hooks/useSearchRanking.js` & `utils/searchScoring.js`. |
| `screens/EmergencyContactsScreen.jsx` | ~977 | 🟢 Resolved | Decomposed into `ContactCard` and `useEmergencyContactsForm`. |
| `services/authService.js` | ~935 | 🟢 Resolved | Split into `authErrorUtils`, `userMapper`, `oauthService`. Main file now ~500 lines. |

---

## 3. The Architecture: View-Hook-Service

### 🟢 1. View (The "Dummy" UI)
*   **Role**: Purely renders data. "The dumb terminal."
*   **Location**: `screens/`, `components/`
*   **Rules**:
    *   **No** `useEffect` for data fetching (call a hook instead).
    *   **No** complex calculation (move to `utils/` or hooks).
    *   **No** inline sub-component definitions.
    *   **Inline Documentation**: Generous comments explaining *why* UI decisions were made (e.g., "Using `absolute` positioning here to avoid layout shift during animation").

### 🟡 2. Controller (Custom Hooks)
*   **Role**: Connects UI to Logic/State.
*   **Location**: `hooks/`
*   **Rules**:
    *   **Encapsulates Complexity**: `useState`, `useEffect`, `useContext`, `useMemo`, `useCallback`.
    *   **Performance First**:
        *   Use `useMemo` for expensive calculations (filtering lists, scoring).
        *   Use `debounce` for search inputs and rapid API calls.
    *   **Return Values**: Only what the View needs.

### 🟣 3. Context (Global State)
*   **Role**: Stores truly global data (Theme, Auth User).
*   **Location**: `contexts/`
*   **Rules**:
    *   **Circular Dependency Warning**: NEVER import a Hook that consumes a Context *into* that same Context.
    *   **Lightweight**: Contexts should store state. Heavy logic belongs in Services/Hooks.

### 🔴 4. Service (Pure Logic)
*   **Role**: The "Brain". Independent of React.
*   **Location**: `services/`, `utils/`
*   **Rules**:
    *   **Validation**: Centralized in `utils/validation.js`.
    *   **Pure Functions**: Input -> Output. Easy to unit test.

### 5. Route Container Ownership
*   **Role**: Defines which layer owns the viewport and which layer only renders inside it.
*   **Location**: route layouts, stack layouts, screen shells
*   **Rules**:
    *   A route must explicitly choose between **shell containment** and **viewport ownership**.
    *   Full-canvas, map-adjacent, and panel-led routes must opt out of shell surface wrappers.
    *   Stack layouts must not add global padding that fights the screen's own header or panel geometry.
    *   Screen-level horizontal padding is not a substitute for route-level layout ownership.
    *   Forms should not dominate stack pages inline; move dense editing into sheets, modals, or panels for progressive disclosure.
    *   Wide-screen behavior must be owned by the route or screen shell, not by accidental nested containers.
    *   When a page feels trapped on desktop, audit in this order:
        1. shell wrapper
        2. stack layout padding
        3. screen container padding
        4. internal panel max width
    *   A stack page should behave like `/map` when it is a viewport-first experience: full canvas first, internal surfaces second.

---

## 4. The Commandments (The Apple Way)

1.  **Thou Shalt Not Exceed 300 Lines**: If a file exceeds 300 lines, it is a candidate for splitting.
    *   *Exception*: If the extra lines are purely **Documentation**. We value clarity over brevity.
2.  **Memory is Sacred**:
    *   Avoid anonymous functions in props (causes re-renders).
    *   Clean up listeners and timers in `useEffect` return functions.
3.  **Business Logic is Forbidden in JSX**:
    *   *Bad*: `{data.filter(x => x.active).map(...)}` 
    *   *Good*: `{activeItems.map(...)}` (filtering happens in the Hook with `useMemo`).
4.  **Inline Docs are Mandatory**:
    *   Explain *why*, not just *what*.
    *   "// Debouncing this input to prevent API spam on every keystroke"
5.  **Centralized Validation**:
    *   Never write a regex in a component. Import it from `utils/validation.js`.
6.  **Container Ownership Must Be Explicit**:
    *   Do not let route shell, stack layout, and screen padding all compete to control width and insets.
    *   If a route owns the viewport, parent surface wrappers must be disabled.
7.  **Progressive Disclosure Over Inline Density**:
    *   Long stack pages should not become form walls.
    *   Move editing, advanced controls, and secondary management into sheets, modals, and panels.
8.  **Every Pass Has a Git Checkpoint**:
    *   Record the monolith baseline hash before the first pass — restore it at any time with `git show <hash>:<file>`.
    *   Commit after each complete pass (never mid-pass), with a structured message logging what changed and the line count delta.
    *   Compare against any stash prior art before closing the pass — never drop logic silently.
    *   Full protocol in `docs/REFACTORING_GUARDRAILS.md` section 13–14.

---

## 5. Refactoring Roadmap

### Phase 1: Search Logic Extraction (Completed)
- [x] Extract scoring algorithm to `utils/searchScoring.js`.
- [x] Move ranking logic to `hooks/search/useSearchRanking.js`.

### Phase 2: Auth Flow Modernization (In Progress)
- [x] Centralize validation in `utils/validation.js`.
- [x] Refactor `LoginInputModal` to use `useLogin` hook.
- [ ] **Next**: Audit and refactor `SignupInputModal` / Registration flow to match.
- [ ] **Next**: Ensure `useSignup` hook uses centralized validation.

### Phase 3: Profile & Emergency (Ongoing)
- [x] Emergency Contacts decomposed.
- [ ] ProfileScreen UI decomposition.

### Phase 4: Map Explore Flow Hook Modularization (Complete — 2026-04-26)
- [x] `useMapExploreFlow.js`: 1,638 lines → 557 lines (−66%)
- [x] 18 specialized hooks extracted (Passes 1–16)
- [x] Monolith baseline hash: `754a4c6` — restorable at any time
- [x] Barrel `index.js` created for all exploreFlow hooks
- [x] Full record: `docs/architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md`

### Phase 5: Gold Standard State Migration (Planned)
- [ ] Phase 1: Zustand + persist for trip state
- [ ] Phase 2: TanStack Query for hospitals + server sync
- [ ] Phase 3: Jotai atoms for map UI state
- [ ] Phase 4: XState for trip lifecycle
- [ ] Phase 5: Retire EmergencyContext
- Full roadmap: `docs/architecture/GOLD_STANDARD_STATE_ROADMAP.md`

---
