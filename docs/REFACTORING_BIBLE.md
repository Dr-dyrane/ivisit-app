# Refactoring Bible: The "Apple Way" Architecture

**Status**: Active / In Progress
**Date**: 2026-02-10
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

## 6. Circular Dependency Watchlist

We must be vigilant about "Hook vs Context" naming collisions and circular dependencies.

*   **Rule**: A Context (`AuthProvider`) must never import a Hook (`useSignUp`) that depends on that same Context.
*   **Current Risk**: `contexts/LoginContext.jsx` exports `useLogin` (context accessor), and `hooks/auth/useLogin.js` exports `useLogin` (logic controller).
    *   *Mitigation*: Always alias the logic hook when importing: `import { useLogin as useLoginHook } from "../../hooks/auth";`

## 7. The Hit List (Files > 300 Lines)

*Updated: 2026-02-10*

| File | Lines | Priority | Plan |
|------|-------|----------|------|
| `screens/EmergencyScreen.jsx` | 959 | 🚨 Critical | Complex UI + Map logic. Split into `EmergencyMap`, `EmergencyStatus`, `EmergencyActions`. |
| `contexts/EmergencyContext.jsx` | 844 | 🚨 Critical | Too much logic in Context. Extract to `services/emergencyService.js` and `hooks/useEmergencyLogic.js`. |
| `screens/ProfileScreen.jsx` | 902 | 🚨 Critical | Split into `ProfileHeader`, `ProfileStats`, `ProfileSettings`. |
| `screens/SettingsScreen.jsx` | 754 | 🟠 High | Extract sub-sections (Notifications, Privacy, Account) to components. |
| `components/login/LoginInputModal.jsx` | 671 | 🟠 High | Further decompose. Extract `PasswordLogic` and `OTPLogic` into sub-hooks or components. |
| `screens/SearchScreen.jsx` | 698 | 🟡 Medium | Already improved. Further split UI into `SearchFilters` and `SearchResults`. |
| `screens/FullScreenEmergencyMap.jsx` | 652 | 🟡 Medium | Map logic is heavy. Consider custom hook for MapView state. |
| `services/authService.js` | 600 | 🟢 Stable | Acceptable size for a core service facade. |
