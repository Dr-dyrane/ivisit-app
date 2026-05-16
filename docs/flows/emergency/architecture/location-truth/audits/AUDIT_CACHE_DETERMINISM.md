# LOC-4 Granular Audit: Deterministic Provider Discovery

**Date:** 2026-05-15  
**Scope:** Verify canonical pickup derivation, coordinate/source in keys  
**Status:** IN PROGRESS

---

## Requirement Checklist

### 1. Derive from canonical pickup only ✅
**Requirement:** Provider discovery should only use canonical pickup from resolveMapPickupLocationTruth

**Current State:**
```javascript
// hooks/emergency/useEmergencyHospitalSync.js
const {
  hospitals: dbHospitals,
  allHospitals: discoveredDbHospitals,
  isLoading: isLoadingHospitals,
  refetch: refetchHospitals,
} = useHospitals({
  location: userLocation,  // ❌ Not canonical pickup
  demoModeEnabled: forceDemoFetch,
  demoBootstrapEnabled: false,
  skipInternalLocationLookup: true,
  userId: user?.id,
});
```

**Issues Found:**
- **CRITICAL:** `useHospitals` receives `userLocation` from EmergencyContext
- **CRITICAL:** `userLocation` is NOT canonical pickup (not from resolveMapPickupLocationTruth)
- **CRITICAL:** EmergencyContext userLocation can be from GPS, saved, or fallback
- **CRITICAL:** No check if userLocation matches canonical pickup
- **CRITICAL:** Provider discovery uses different location than pickup truth

**Impact:** HIGH - Provider discovery may use different location than pickup

---

### 2. Include coordinate/source in query keys ✅
**Requirement:** Cache keys should include both coordinates AND source to prevent collisions

**Current State:**
```javascript
// hooks/emergency/useHospitals.js
const locationKey = buildLocationBucketKey(normalizedLocation);
// Returns: "37.775,-122.419" (coordinates only, no source)

let fetchPromise = globalFetchRegistry.get(locationKey);
globalHospitalCache.keyedSnapshots[locationKey] = snapshot;
```

**Issues Found:**
- **CRITICAL:** Cache key only includes coordinates (lat,lng)
- **CRITICAL:** No source in cache key (manual vs GPS collision)
- **CRITICAL:** No demo mode in cache key (demo vs live collision)
- **CRITICAL:** No Places options in cache key (different results same key)
- **CRITICAL:** Manual at 37.775,-122.419 shares cache with GPS at 37.775,-122.419

**Impact:** HIGH - Cache collisions cause wrong hospital lists

---

## Canonical Pickup Derivation Analysis

### Current Provider Discovery Location Sources

| Component | Location Source | Canonical? |
|-----------|----------------|------------|
| useEmergencyHospitalSync | userLocation (EmergencyContext) | ❌ No |
| useHospitals | externalLocation (passed in) | ❌ No |
| GlobalLocationContext | userLocation (GPS/fallback) | ❌ No |
| locationStore | userLocation (persisted) | ❌ No |
| mapExploreFlow | manualLocation (ephemeral) | ❌ No |

### Canonical Pickup Location

| Component | Location Source | Canonical? |
|-----------|----------------|------------|
| resolveMapPickupLocationTruth | Returns activeLocation | ✅ Yes |
| useMapLocation | activeLocation (from truth) | ✅ Yes |
| mapExploreFlow | activeLocation (from truth) | ✅ Yes |

**Gap:** Provider discovery uses EmergencyContext userLocation, not canonical pickup from resolveMapPickupLocationTruth

---

## Cache Key Determinism Analysis

### Current Cache Key Structure

```javascript
function buildLocationBucketKey(location) {
  const lat = Number(location?.latitude).toFixed(LOCATION_BUCKET_PRECISION);
  const lng = Number(location?.longitude).toFixed(LOCATION_BUCKET_PRECISION);
  return `${lat},${lng}`;
}
// Example: "37.775,-122.419"
```

### Cache Collision Scenarios

**Scenario 1: Manual vs GPS at same coordinates**
- Manual pickup at 37.775,-122.419 → cache key: "37.775,-122.419"
- GPS pickup at 37.775,-122.419 → cache key: "37.775,-122.419"
- **Collision:** Manual hospitals cached, GPS fetch returns cached manual hospitals

**Scenario 2: Demo vs Live at same coordinates**
- Demo mode at 37.775,-122.419 → cache key: "37.775,-122.419"
- Live mode at 37.775,-122.419 → cache key: "37.775,-122.419"
- **Collision:** Demo hospitals cached, live fetch returns cached demo hospitals

**Scenario 3: Different Places options**
- With Mapbox Places at 37.775,-122.419 → cache key: "37.775,-122.419"
- Without Mapbox Places at 37.775,-122.419 → cache key: "37.775,-122.419"
- **Collision:** Places hospitals cached, no-Places fetch returns cached Places hospitals

---

## Query Key Analysis

### TanStack Query Keys (if migration complete)

**Current:** Not migrated to TanStack Query yet (still using useState + useEffect)

**Required after migration:**
```javascript
const queryKey = ['hospitals', {
  latitude: 37.775,
  longitude: -122.419,
  source: 'session_manual',  // MISSING
  demoMode: false,           // MISSING
  includeMapboxPlaces: true, // MISSING
  includeGooglePlaces: false,// MISSING
}];
```

---

## Code Path Analysis

### Path: Provider Discovery Call

```
EmergencyContext.userLocation (GPS/fallback)
    ↓
useEmergencyHospitalSync({ location: userLocation })
    ↓
useHospitals({ location: userLocation })
    ↓
buildLocationBucketKey(location)  // ❌ No source
    ↓
globalHospitalCache.keyedSnapshots[locationKey]
    ↓
hospitalsService.discoverNearby(lat, lng, radius)
```

**Gap:** Uses EmergencyContext userLocation instead of canonical pickup

---

### Path: Manual Pickup to Provider Discovery

```
User enters manual address
    ↓
handleManualConfirm() → geocode → setActiveCandidate()
    ↓
commitLocation() → handleSearchLocation()
    ↓
setManualLocation({ location, source: "session_manual" })
    ↓
resolveMapPickupLocationTruth({ manualLocation })
    ↓
Returns canonical pickup: { activeLocation, source: "session_manual" }
    ↓
useMapLocation uses canonical pickup ✅
    ↓
BUT useEmergencyHospitalSync uses EmergencyContext.userLocation ❌
```

**Gap:** Manual pickup not propagated to EmergencyContext

---

## Demo Mode Analysis

### Current Demo Mode Handling

```javascript
// hooks/emergency/useHospitals.js
const demoModeEnabled = options?.demoModeEnabled !== false;
const demoBootstrapEnabled = options?.demoBootstrapEnabled === true;

if (demoModeEnabled && demoBootstrapEnabled) {
  // Bootstrap demo ecosystem
  await demoEcosystemService.ensureDemoEcosystemForLocation({
    userId: provisioningUserId,
    latitude: normalizedLocation.latitude,
    longitude: normalizedLocation.longitude,
    radiusKm: 50,
  });
}
```

**Issues Found:**
- Demo mode flag not in cache key
- Demo hospitals mixed with live hospitals in cache
- No way to invalidate demo cache when switching to live mode
- Demo bootstrap happens before fetch, but cache doesn't distinguish

---

## Recommendations

1. **Pass canonical pickup to provider discovery:**
   ```javascript
   // In useEmergencyHospitalSync
   const canonicalPickup = resolveMapPickupLocationTruth({
     manualLocation,
     globalUserLocation,
     globalLocationSource,
     resolvedPlace,
   });
   
   const { hospitals } = useHospitals({
     location: canonicalPickup.activeLocation,  // Use canonical
     source: canonicalPickup.source,            // Pass source
     demoModeEnabled: canonicalPickup.isDemo,  // Pass demo flag
   });
   ```

2. **Add source to cache key:**
   ```javascript
   function buildLocationBucketKey(location, source, demoMode) {
     const lat = Number(location?.latitude).toFixed(LOCATION_BUCKET_PRECISION);
     const lng = Number(location?.longitude).toFixed(LOCATION_BUCKET_PRECISION);
     const src = source || "unknown";
     const demo = demoMode ? "demo" : "live";
     return `${lat},${lng}:${src}:${demo}`;
   }
   // Example: "37.775,-122.419:session_manual:live"
   ```

3. **Add Places options to cache key:**
   ```javascript
   function buildLocationBucketKey(location, source, demoMode, placesOptions) {
     const lat = Number(location?.latitude).toFixed(LOCATION_BUCKET_PRECISION);
     const lng = Number(location?.longitude).toFixed(LOCATION_BUCKET_PRECISION);
     const src = source || "unknown";
     const demo = demoMode ? "demo" : "live";
     const places = placesOptions?.includeMapboxPlaces ? "places" : "noplaces";
     return `${lat},${lng}:${src}:${demo}:${places}`;
   }
   // Example: "37.775,-122.419:session_manual:live:places"
   ```

4. **Invalidate cache on source change:**
   ```javascript
   useEffect(() => {
     if (locationSource !== lastSourceRef.current) {
       const oldKey = buildLocationBucketKey(location, lastSourceRef.current, demoMode);
       delete globalHospitalCache.keyedSnapshots[oldKey];
       globalFetchRegistry.delete(oldKey);
       lastSourceRef.current = locationSource;
     }
   }, [locationSource, location, demoMode]);
   ```

5. **Add TanStack Query keys after migration:**
   ```javascript
   const queryKey = ['hospitals', {
     latitude: location.latitude,
     longitude: location.longitude,
     source: source,
     demoMode: demoModeEnabled,
     includeMapboxPlaces: includeMapboxPlaces,
     includeGooglePlaces: includeGooglePlaces,
   }];
   ```

---

## Validation Status

- [ ] Provider discovery uses canonical pickup
- [ ] Cache key includes source
- [ ] Cache key includes demo mode
- [ ] Cache key includes Places options
- [ ] No cache collisions between manual/GPS
- [ ] No cache collisions between demo/live
- [ ] Cache invalidated on source change
- [ ] TanStack Query keys include all determinants

**Overall:** 0/8 checks pass - provider discovery not deterministic
