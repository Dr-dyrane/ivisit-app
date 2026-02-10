# Refactoring Bible: The "View-Hook-Service" Architecture

**Status**: Draft
**Date**: 2026-02-09
**Goal**: Reduce technical debt, improve debuggability, and enforce Separation of Concerns.

---

## 1. Executive Summary
The codebase suffers from the **Monolithic Component Anti-Pattern**. UI components (Screens) are currently responsible for:
1.  Rendering complex UI.
2.  Managing local and global state.
3.  Handling API side-effects.
4.  Executing business logic (search ranking, form validation).

This makes files large (>1000 lines), hard to read, and impossible to debug in isolation. We are moving to a **View-Hook-Service** architecture to decouple these concerns.

---

## 2. The Audit: Top Offenders

The following files have been identified as critical targets for refactoring.

### 🚨 Critical Severity
| File | Lines | Primary Issues |
|------|-------|----------------|
| `screens/ProfileScreen.jsx` | ~1048 | **Form Controller + UI**. Manages 10+ state variables, image uploading logic, and complex animations inline. |
| `screens/SearchScreen.jsx` | ~1043 | **Logic in View**. Contains a 150+ line `useMemo` block that implements a search ranking algorithm inside the component. |
| `screens/EmergencyContactsScreen.jsx` | ~977 | **Inline Components**. Defines `ContactCard` (~180 lines) inside the file. Mixes list management with form validation. |
| `services/authService.js` | ~935 | **God Object**. Handles API calls, error mapping, session persistence, and OAuth redirect logic in one file. |

---

## 3. The Architecture: View-Hook-Service

We will enforce a strict unidirectional data flow.

### 🟢 1. View (The "Dummy" UI)
*   **Role**: purely renders data.
*   **Location**: `screens/`, `components/`
*   **Rules**:
    *   **No** `useEffect` for data fetching (call a hook instead).
    *   **No** complex calculation (move to `utils/` or hooks).
    *   **No** inline sub-component definitions (move to `components/`).
*   **Example**:
    ```jsx
    // Good
    const { results, isLoading } = useSearchRanking(query);
    return <FlatList data={results} ... />
    ```

### 🟡 2. Controller (Custom Hooks)
*   **Role**: Connects UI to Logic/State.
*   **Location**: `hooks/`
*   **Rules**:
    *   Encapsulates `useState`, `useEffect`, and **`useContext`**.
    *   **Context usage should be hidden here**. Components should rarely consume Context directly if a hook can provide a cleaner interface.
    *   Returns only what the View needs (data + handlers).
    *   Handles "dirty" state, loading states, and error toggles.
*   **Example**: `useProfileForm`, `useSearchRanking`, `useEmergencyContactList`.

### 🟣 4. Context (Global State)
*   **Role**: Stores truly global data (Theme, Auth User, Socket Connection).
*   **Location**: `contexts/`
*   **Rules**:
    *   **Providers Only**: Defines the Provider and the raw `useContext` hook.
    *   **No Heavy Logic**: Contexts should mostly just store state and expose setters. Heavy processing of that state (filtering, sorting) belongs in a Hook or Service.
    *   **Access**: Should generally be accessed via specific hooks (e.g., `useAuth`) rather than raw `useContext(AuthContext)`.


### 🔴 3. Service (Pure Logic)
*   **Role**: The "Brain". Independent of React.
*   **Location**: `services/`, `utils/`
*   **Rules**:
    *   **No** React code (hooks, JSX).
    *   Pure functions (Input -> Output) whenever possible.
    *   Handles API calls, storage, and complex algorithms (scoring, sorting).

---

## 4. The Commandments (Guidelines)

1.  **Thou Shalt Not Exceed 300 Lines**: If a component exceeds 300 lines, it MUST be split.
    *   *Solution*: Extract sub-components or move logic to hooks.
2.  **Thou Shalt Not Define Components Inside Components**:
    *   *Bad*: `const Screen = () => { const Item = () => <View/>; ... }`
    *   *Good*: Move `Item` to `components/ScreenName/Item.jsx`.
3.  **Business Logic is Forbidden in JSX**:
    *   *Bad*: `{data.filter(x => x.active && x.score > 10).map(...)}`
    *   *Good*: `{activeItems.map(...)}` (filtering happens in the Hook).
4.  **Hooks Must Be Single-Purpose**:
    *   Don't create `useScreenLogic()`. Create `useFormState()`, `useDataFetcher()`, `useAnimation()`.

---

## 5. Refactoring Roadmap

### Phase 1: Search Logic Extraction (High Impact)
**Target**: `SearchScreen.jsx`
1.  Extract scoring algorithm to `utils/searchScoring.js`.
2.  Move ranking logic to `hooks/search/useSearchRanking.js`.
3.  Create `components/search/SearchResultItem.jsx`.

### Phase 2: Profile Form Modularization
**Target**: `ProfileScreen.jsx`
1.  Extract form state to `hooks/user/useProfileForm.js`.
2.  Move `Animated` logic to `hooks/ui/useProfileAnimations.js`.
3.  Extract render code to `components/profile/ProfileForm.jsx`.

### Phase 3: Emergency Contacts Cleanup
**Target**: `EmergencyContactsScreen.jsx`
1.  Extract `ContactCard` to `components/emergency/ContactCard.jsx`.
2.  Extract form validation logic to `utils/validation.js`.

### Phase 4: Service Decomposition
**Target**: `authService.js`
1.  Split into `services/auth/authApi.js` (Supabase calls) and `services/auth/errorMapper.js`.

---

**Approved By**: Engineering Team
