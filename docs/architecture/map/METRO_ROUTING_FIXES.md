# Platform Idiosyncrasies & State Management Fixes

## Summary

Fixed multiple platform-specific issues affecting Expo Go / Metro reload behavior and global state management.

## Fixes Applied

### 1. Missing `immer` Dependency (Build Error)
**Issue**: `Unable to resolve "immer" from "node_modules\zustand\middleware\immer.js"`

**Root Cause**: Zustand's `immer` middleware requires `immer` as a peer dependency, which wasn't installed.

**Fix**: Installed `immer@10.1.1`:
```bash
npm install immer@10.1.1 --save-exact
```

---

### 2. Metro Reload Routing Issue (iOS/Android)
**Issue**: When on `/(auth)/map` and Metro reloads, user doesn't stay on map screen.

**Root Causes Identified**:

#### A. Effect Dependency on Auth State (`app/_layout.js:316`)
The `hydrateInitialRoute` effect was re-running when `user?.isAuthenticated` changed, causing race conditions and duplicate navigation.

**Fix**: Removed `user?.isAuthenticated` from dependencies. Added `hydrateCompletedRef` guard to prevent duplicate runs.

```javascript
// OLD:
}, [router, user?.isAuthenticated]);

// NEW:
}, [router]);
// + hydrateCompletedRef to prevent duplicate runs
```

#### B. Stored Route Not Checked When URL Present (`app/_layout.js:271-289`)
When `Linking.getInitialURL()` returned a URL (even with no routing info), the code exited early WITHOUT checking stored routes.

**Fix**: Always check stored routes as fallback, even when URL is present:
```javascript
// OLD:
if (url) {
    await handleDeepLink({ url });
    if (isBaseAppUrl(url)) {
        // ...check stored route
    }
    return;  // EXITED HERE - stored route not checked for non-base URLs
}

// NEW:
if (url) {
    await handleDeepLink({ url });
}
// Always check stored route as fallback
const restoredPublicRoute = ...;
if (restoredPublicRoute) {
    // ...restore route
}
```

#### C. Deep Link Parser Missed Expo Go Paths (`app/_layout.js:93-114`)
`getPublicAuthRouteFromUrl` didn't recognize paths like `(auth)/map` from Expo Go URLs.

**Fix**: Added handling for `(auth)/map` path:
```javascript
if (normalizedPath === "(auth)/map") return "/(auth)/map";
// ...
if (url.includes("/(auth)/map")) return "/(auth)/map";
```

#### D. `isBaseAppUrl` Didn't Handle All Expo Go Patterns (`app/_layout.js:136-156`)
Missed ngrok tunnel URLs and Expo Go URLs with `/--/` path segments.

**Fix**: Enhanced detection:
```javascript
const isDevUrl =
    (url.includes(":8081") || url.includes(".ngrok.io") || url.includes(".ngrok-free.app")) &&
    !url.includes("?") &&
    !url.includes("#");
const isExpoGoWithPath = url.includes("/--/");
return isProductionRoot || isDevUrl || isExpoGoWithPath;
```

---

### 3. Stale Closure in `finishCommitPayment`
**Issue**: After payment completion, `trackingRequestKey` from closure was stale.

**Fix**: Read current state from store at execution time:
```javascript
// OLD:
if (trackingRequestKey) {
    openTracking();
    return;
}

// NEW:
const store = useEmergencyTripStore.getState();
const hasActiveTrip = !!(store.activeAmbulanceTrip?.requestId || store.activeBedBooking?.requestId);
if (hasActiveTrip) {
    openTracking();
    return;
}
```

---

## File Changes

### `app/_layout.js`
- `getPublicAuthRouteFromUrl()`: Added `(auth)/map` path handling
- `isBaseAppUrl()`: Added ngrok and `/--/` pattern detection
- `hydrateInitialRoute` effect: Removed auth dependency, added completion guard, always check stored routes

### `hooks/map/exploreFlow/useMapExploreFlow.js`
- Added imports for `useEmergencyTripStore` and `useEmergencyTripRuntime`
- Switched trip state from `useEmergency()` to new store-based hooks
- Fixed `finishCommitPayment` stale closure

### `components/map/views/tracking/mapTracking.theme.js`
- Fixed gradient unmasking by deriving fade colors from surface color
- Connector colors now adapt to tracking kind (ambulance vs bed)

### `package.json`
- Added `immer@10.1.1` dependency

---

## Testing Checklist

- [ ] Metro reload on `/(auth)/map` while authenticated -> stays on map
- [ ] Metro reload on `/(auth)/map` while unauthenticated -> stays on map
- [ ] Sign out while on map -> stays on map (existing behavior preserved)
- [ ] Payment completion -> triggers tracking correctly (no stale closure)
- [ ] iOS Expo Go URL handling -> restores correct route
- [ ] Android Expo Go URL handling -> restores correct route
- [ ] Ngrok tunnel URLs -> handled correctly

---

## Key Principles Applied

1. **Deterministic Route Restoration**: Always check stored routes, don't rely solely on deep link URL parsing
2. **Effect Isolation**: Initial route hydration should run once, not re-run on auth changes
3. **Fresh State Reads**: Use `store.getState()` at execution time to avoid stale closures
4. **Platform Awareness**: Handle Expo Go's specific URL patterns (`:8081`, `/--/`, ngrok)
