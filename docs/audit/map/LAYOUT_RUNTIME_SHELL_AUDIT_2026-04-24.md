# _layout Runtime Shell Audit

**Date:** 2026-04-24  
**Target:** `app/_layout.js`  
**Auditor:** Technical Lead  
**Status:** Complete - Ready for Pass Plan

---

## Executive Summary

The root `_layout.js` is functional but violates separation of concerns. It currently acts as both the app shell AND the auth gate, redirect coordinator, route persistence engine, and deep link handler. The recent Metro reload fix (removing `user?.isAuthenticated` from `hydrateInitialRoute` deps) stabilized the shell, but architectural debt remains.

**Corrective Architecture: _layout must become composition-only.**

The target final shape:
```javascript
export default function RootLayout() {
  return (
    <RootRuntimeGate>
      <RootProviders>
        <RootNavigator />
      </RootProviders>
    </RootRuntimeGate>
  );
}
```

- **RootRuntimeGate** owns startup readiness, splash sequencing, migrations
- **RootProviders** owns provider order only  
- **RootNavigator** owns Stack.Screen definitions only
- **app/_layout** imports and composes only - no inline logic

**Verdict:** Extract runtime orchestration before continuing with feature extractions. The shell must become a composition boundary, not a logic container.

---

## Audit Summary

### What `_layout` Currently Does

**RootLayout (lines 37-91):**
- Wraps app in provider tree: `GestureHandlerRootView` -> `GlobalErrorBoundary` -> `GlobalLocationProvider` -> `AppProviders`
- Manages `appIsReady` state for migrations
- Handles splash screen hide with 200ms delay
- Renders `AuthenticatedStack` and floating `ThemeToggle`

**AuthenticatedStack (lines 202-457):**
- Uses `useAuth`, `useTheme`, `useToast`, `useOTAUpdates`
- Manages **5 distinct effects**:
  1. Sync `pathnameRef` with pathname changes
  2. **Initial route hydration** (deep links, stored routes) - runs once with `hydrateCompletedRef` guard
  3. Persist public routes to storage on pathname changes
  4. **Auth-based routing decisions** (login redirect, profile completion)
  5. Clear `startupPublicRoute` once reached

**Helper Functions:**
- `getPublicAuthRouteFromUrl()` - Deep link parsing
- `normalizeStoredPublicRoute()` - Route normalization
- `isBaseAppUrl()` - Dev/production URL detection
- `readStoredPublicRoute()` / `writeStoredPublicRoute()` - Persistence

---

## Current Problems

### 1. Redirect Logic in Layout ! **CRITICAL**
Lines 342-400: Auth redirect effect runs on every auth/profile state change.
- Race conditions during auth restoration
- Redirect loops if dependencies unstable
- Hard to test/maintain

### 2. Double Loading State
`appIsReady` (RootLayout) + `AuthContext.loading` (AuthenticatedStack) = two spinners:
1. Splash screen (RootLayout)
2. "Opening iVisit..." spinner (AuthenticatedStack lines 415-431)

Confusing UX and unnecessary complexity.

### 3. Too Many Providers at Root
`AppProviders.jsx` nests 12+ contexts. Many should be route-group specific:
- `VisitsProvider`, `SearchProvider`, `EmergencyProvider` -> `(user)` group only
- `StripeProvider` -> payment routes only
- `NotificationsProvider` -> could be lazy

### 4. No Font Loading Gate
`appIsReady` only waits for migrations, not fonts. Risk of FOUT/layout shift.

### 5. Route Persistence in Layout
Storing `LAST_PUBLIC_ROUTE` on every pathname change (lines 326-340) belongs in a route change listener, not layout.

### 6. Missing: Zustand Store Hydration Gate
New `emergencyTripStore` has no hydration gate. On Metro reload, store starts empty while async storage loads.

### 7. OTA Update Modals in Layout
Update modals (lines 441-454) shouldn't block routing logic or be in the shell.

---

## Risks

| Risk | Severity | Impact |
|------|----------|--------|
| Redirect loops during auth | High | App unusable, requires reinstall |
| Double loading confusion | Medium | Poor perceived performance |
| Provider bloat at root | Medium | Slower startup, harder debugging |
| Missing font gate | Low | Visual flash on cold start |
| Store hydration race | High | Emergency state lost on reload |

---

## What Should Stay in `_layout`

Per iVisit rule: *"The router is only the shell."*

**Correct Responsibilities:**
1. **Provider mounting** - Root-level wrappers only (truly global)
2. **App readiness gate** - Block render until migrations/fonts ready
3. **Initial route hydration** - One-time deep link / stored route resolution
4. **Auth gate** - Binary decision: allow render or show loading

**Minimal Correct `_layout` (Composition-Only):**
```javascript
// app/_layout.js - Composition only, no inline logic
import { RootRuntimeGate } from "../src/app/runtime/RootRuntimeGate";
import { RootProviders } from "../src/app/runtime/RootProviders";
import { RootNavigator } from "../src/app/runtime/RootNavigator";

export default function RootLayout() {
  return (
    <RootRuntimeGate>
      <RootProviders>
        <RootNavigator />
      </RootProviders>
    </RootRuntimeGate>
  );
}
```

**Each component has single responsibility:**

```javascript
// RootRuntimeGate - owns startup readiness only
export function RootRuntimeGate({ children }) {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    async function prepare() {
      await SplashScreen.preventAutoHideAsync();
      await appMigrationsService.run();
      setIsReady(true);
    }
    prepare();
  }, []);

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;
  return children;
}

// RootProviders - owns provider order only
export function RootProviders({ children }) {
  return (
    <GestureHandlerRootView>
      <GlobalErrorBoundary>
        <GlobalLocationProvider>
          <AppProviders>
            {children}
          </AppProviders>
        </GlobalLocationProvider>
      </GlobalErrorBoundary>
    </GestureHandlerRootView>
  );
}

// RootNavigator - owns Stack.Screen definitions only
export function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(user)" />
    </Stack>
  );
}
```

---

## What Should Move Out

| Current Location | Move To | Why |
|------------------|---------|-----|
| `AuthenticatedStack` component | `app/(auth)/_layout.js` & `app/(user)/_layout.js` | Route groups handle their own requirements |
| Auth redirect logic (lines 342-400) | Route group layouts or HOC | Late auth pattern - render first, redirect if needed |
| Route persistence (lines 326-340) | `useRouteChangeListener` hook | Separation of concerns |
| `startupPublicRoute` state | Zustand store or URL state | Global nav state in store |
| Deep link handling | `app/(auth)/_layout.js` | Each route group handles its entry points |
| `ThemeToggle` | `app/(user)/_layout.js` only | Not needed in auth flow |
| OTA update modals | Separate overlay component | Shouldn't block routing logic |

---

## Recommended Provider Order

**Current (AppProviders.jsx):** 12+ nested contexts

**Recommended:**

```
// Root _layout.js (minimal)
GestureHandlerRootView
  ErrorBoundary
    ThemeProvider (needed for loading states)
      AuthProvider (all other providers need auth context)
        AppProviders (only truly global providers)
          Stack

// Route group layouts
// app/(auth)/_layout.js - Auth flow only
// app/(user)/_layout.js - Authenticated features
```

**Truly Global (stay in AppProviders):**
- `AuthProvider`
- `ThemeProvider`
- `PreferencesProvider`
- `ToastProvider`
- `OTAUpdatesProvider`

**Move to `(user)` group:**
- `VisitsProvider`
- `SearchProvider`
- `EmergencyProvider`
- `EmergencyUIProvider`
- `FABProvider`
- `NotificationsProvider`
- `HeaderStateProvider`
- `ScrollAwareHeaderProvider`
- `TabBarVisibilityProvider`
- `UnifiedScrollProvider`
- `HelpSupportProvider`

**Lazy/conditional:**
- `StripeProvider` -> wrap only payment screens
- `GlobalLocationProvider` -> keep at root (needed for map)

---

## Recommended Route/Auth Gate Strategy

**Late Auth Pattern** (iVisit philosophy: map is runtime):

```javascript
// app/_layout.js - No auth redirects
export default function RootLayout() {
  // Only app readiness, no auth logic
  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(user)" />
      </Stack>
    </Providers>
  );
}

// app/(auth)/_layout.js - Public routes, no auth check
export default function AuthLayout() {
  return <Slot />;
}

// app/(user)/_layout.js - Protected routes
export default function UserLayout() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)" />;
  
  return <Slot />;
}
```

**Benefits:**
- `/map` can exist before login (public map flow preserved)
- No redirect loops in root layout
- Auth logic colocated with protected routes
- Cleaner separation: shell vs. gates

---

## First Small Fix

**Fix: Remove double loading state and add font loading gate.**

Current: `AuthenticatedStack` shows "Opening iVisit..." while `AuthContext` is restoring.

**Action:**
1. Keep `appIsReady` in RootLayout for migrations
2. Add font loading to RootLayout gate
3. Remove the `loading` spinner from `AuthenticatedStack` (lines 415-431)
4. Let `AuthContext.loading` be the single source of truth for auth readiness

```javascript
// app/_layout.js - Add font loading
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded] = useFonts({ /* your fonts */ });

  if (!appIsReady || !fontsLoaded) {
    return null; // Keep splash screen visible
  }

  return (
    <GestureHandlerRootView>
      <AuthenticatedStack />
    </GestureHandlerRootView>
  );
}

// AuthenticatedStack - Simplify loading
function AuthenticatedStack() {
  const { loading } = useAuth();
  
  if (loading) {
    return null; // Or minimal spinner
  }
  
  return <Stack />;
}
```

**This is surgical** - reduces complexity without restructuring.

---

## Final Verdict

### Recommendation: **Extract to Composition-Only Architecture**

Pass 1 removed the double loading state as a quick cleanup, but the architectural debt remains. `_layout.js` still contains:
- Auth redirect logic
- Route persistence effects
- Deep link parsing
- Storage reads/writes
- Feature concerns (OTA modals)

**Rule:** `_layout` must become **composition-only**.

### Revised Incremental Path:

1. - **Pass 1:** Fix double loading state (completed)
2. **Pass 1B:** Extract runtime orchestration - Create `RootRuntimeGate`, `RootProviders`, `RootNavigator` 
3. **Pass 2:** Move route persistence to dedicated hook
4. **Pass 3:** Extract auth redirects to route group layouts
5. **Pass 4:** Move provider nesting to route groups
6. **Pass 5:** Clean up remaining feature concerns

**Do NOT add more logic to _layout.** Every extraction must move toward the composition-only target shape.

---

## Related Documents

- [LAYOUT_SHELL_PASS_PLAN_2026-04-24.md](./LAYOUT_SHELL_PASS_PLAN_2026-04-24.md) - Incremental remediation plan
- [../architecture/emergency/EMERGENCY_STATE_REFACTOR.md](../architecture/emergency/EMERGENCY_STATE_REFACTOR.md) - Store architecture
- [../platform/METRO_ROUTING_FIXES.md](../platform/METRO_ROUTING_FIXES.md) - Recent reload fixes
