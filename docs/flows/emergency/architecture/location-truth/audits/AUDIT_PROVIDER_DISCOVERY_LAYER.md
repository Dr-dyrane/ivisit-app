# Audit Round 3: Provider Discovery Flow

**Date:** 2026-05-15  
**Scope:** Trace from canonical pickup → query key → cache → hospital list  
**Status:** COMPLETE

---

## Executive Summary

The provider discovery flow uses a module-level global cache (`globalHospitalCache`) with location-based bucket keys. However, the cache key does NOT include the pickup source, meaning manual and GPS locations at the same coordinates share the same cache entry.

**Critical Issue:** Provider discovery is not deterministic based on pickup source - manual location at coords X,Y returns same cached hospitals as GPS at coords X,Y, even though manual should take precedence.

---

## Code Path Analysis

### Path: Canonical Pickup → Hospital List

```
resolveMapPickupLocationTruth({ manualLocation, globalUserLocation, globalLocationSource })
    ↓
Returns: { activeLocation, source: "session_manual" | "device", ... }
    ↓
useEmergencyHospitalSync({ location: userLocation })
    ↓
useHospitals({ location: userLocation, demoModeEnabled, demoBootstrapEnabled, userId })
    ↓
normalizeLocation(location) - validates coordinates
    ↓
buildLocationBucketKey(normalizedLocation) - creates cache key
    ↓
globalHospitalCache.keyedSnapshots[locationKey] - check cache
    ↓
If cached: return cached hospitals
    ↓
If not cached: hospitalsService.discoverNearby(lat, lng, 50000)
    ↓
supabase.functions.invoke('discover-hospitals', { latitude, longitude, radius, ... })
    ↓
Edge Function returns: DB hospitals + Mapbox Places + Google Places
    ↓
_hydrateHospitalRows(rawHospitals) - enrich with images, wait times
    ↓
sortHospitalsByDistance(hydrated)
    ↓
categorizeHospitals(displaySource)
    ↓
getDisplayHospitals(displaySource, normalizedLocation)
    ↓
calculateDynamicWaitTime(hospital, normalizedLocation)
    ↓
globalHospitalCache.keyedSnapshots[locationKey] = snapshot
    ↓
Return: { hospitals, allHospitals, categories, isLoading, error }
```

**Key Files:**
- `hooks/map/exploreFlow/mapPickupLocationTruth.js` (lines 23-111)
- `hooks/emergency/useEmergencyHospitalSync.js` (lines 40-51)
- `hooks/emergency/useHospitals.js` (lines 130-376)
- `services/hospitalsService.js` (lines 602-642)
- `supabase/functions/discover-hospitals` (Edge Function)

---

## Cache Key Analysis

### buildLocationBucketKey()

**Location:** `hooks/emergency/useHospitals.js` (lines 100-118)

**Input:**
```javascript
{
  latitude: 37.7749,
  longitude: -122.4194
}
```

**Process:**
1. Round latitude to LOCATION_BUCKET_PRECISION (3 decimal places)
2. Round longitude to LOCATION_BUCKET_PRECISION (3 decimal places)
3. Return string: `"lat,lng"`

**Output:**
```javascript
"37.775,-122.419"
```

**Issues:**
- No pickup source in cache key
- Manual and GPS at same coords share cache
- Demo vs live not distinguished in cache key
- No timestamp in cache key (TTL handled separately)

---

### globalHospitalCache Structure

**Location:** `hooks/emergency/useHospitals.js` (lines 83-90)

```javascript
let globalHospitalCache = {
  hospitals: [],           // Current display hospitals
  allHospitals: [],        // All hospitals including non-dispatch-ready
  categories: {},          // Categorized hospitals
  timestamp: 0,            // Cache timestamp
  lastKey: null,          // Last location key used
  keyedSnapshots: {},      // Location-keyed snapshots
};
```

**keyedSnapshots Structure:**
```javascript
{
  "37.775,-122.419": {
    hospitals: [...],
    allHospitals: [...],
    categories: {...},
    timestamp: 1715782400000
  },
  "34.052,-118.243": {
    hospitals: [...],
    allHospitals: [...],
    categories: {...},
    timestamp: 1715782500000
  }
}
```

**Issues:**
- No source metadata in snapshot
- No way to distinguish manual vs GPS cache entries
- No way to invalidate cache when source changes

---

## Service Layer Analysis

### hospitalsService.discoverNearby()

**Location:** `services/hospitalsService.js` (lines 602-642)

**Input:**
```javascript
{
  lat: 37.7749,
  lng: -122.4194,
  radius: 50000,           // 50km
  options: {
    includeMapboxPlaces: true,
    includeGooglePlaces: false
  }
}
```

**Process:**
1. Call Supabase Edge Function `discover-hospitals`
2. Pass: latitude, longitude, radius, mode: 'nearby', limit: 15
3. Pass: includeProviderDiscovery: true
4. Pass: includeMapboxPlaces, includeGooglePlaces
5. Pass: mergeWithDatabase: true
6. If Edge Function fails: fallback to direct RPC `listNearby()`
7. If Edge Function returns empty: fallback to direct RPC
8. Hydrate hospital rows with images, wait times
9. Sort by distance

**Output:**
```javascript
[
  {
    id: "uuid",
    name: "General Hospital",
    latitude: 37.775,
    longitude: -122.418,
    distance: 0.5,
    isDispatchReady: true,
    importedFromGoogle: false,
    verificationStatus: "verified",
    // ... other fields
  },
  // Mapbox Places have:
  // importedFromMapbox: true,
  // verificationStatus: "pending"
]
```

**Issues:**
- No source parameter passed to Edge Function
- Edge Function doesn't know if location is manual vs GPS
- No way to prioritize manual location results
- Mapbox Places not distinguished from DB hospitals in cache

---

### Edge Function: discover-hospitals

**Location:** `supabase/functions/discover-hospitals/index.ts`

**Process:**
1. Receive: latitude, longitude, radius, mode, limit
2. Query DB hospitals within radius using PostGIS
3. If includeProviderDiscovery: query Mapbox Places API
4. If includeGooglePlaces: query Google Places API
5. Merge results with DB hospitals (dedupe by name/location)
5. Return merged hospital list

**Issues:**
- No awareness of pickup source
- No special handling for manual location
- No way to prioritize certain providers based on source

---

## Query Key Determinism Analysis

### Current Query Key Structure

**Location Key:** `buildLocationBucketKey(location)`
- Format: `"lat,lng"` (3 decimal precision)
- Example: `"37.775,-122.419"`

**Cache Lookup:** `globalHospitalCache.keyedSnapshots[locationKey]`

**Determinism Issues:**

1. **Source Not Included:**
   - Manual location at 37.775,-122.419 → key: `"37.775,-122.419"`
   - GPS location at 37.775,-122.419 → key: `"37.775,-122.419"`
   - Same cache entry for both sources

2. **Demo Mode Not Included:**
   - Demo hospitals at 37.775,-122.419 → key: `"37.775,-122.419"`
   - Live hospitals at 37.775,-122.419 → key: `"37.775,-122.419"`
   - Same cache entry for both modes

3. **Places Options Not Included:**
   - With Mapbox Places → key: `"37.775,-122.419"`
   - Without Mapbox Places → key: `"37.775,-122.419"`
   - Same cache entry for both options

---

## Critical Findings

### Finding 1: Cache Key Missing Source
**Impact:** HIGH  
**Evidence:** `buildLocationBucketKey()` only uses coordinates, not pickup source

### Finding 2: Manual vs GPS Cache Collision
**Impact:** HIGH  
**Evidence:** Manual and GPS at same coordinates share cache entry

### Finding 3: Demo Mode Not in Cache Key
**Impact:** MEDIUM  
**Evidence:** Demo and live hospitals share cache at same coordinates

### Finding 4: Places Options Not in Cache Key
**Impact:** MEDIUM  
**Evidence:** Mapbox Places option not reflected in cache key

### Finding 5: No Source-Aware Discovery
**Impact:** MEDIUM  
**Evidence:** Edge Function doesn't receive pickup source

### Finding 6: Global Cache Not Source-Aware
**Impact:** MEDIUM  
**Evidence:** `globalHospitalCache` has no source metadata

---

## Recommendations for LOC-4

1. **Add source to cache key:**
   ```javascript
   function buildLocationBucketKey(location, source) {
     const lat = Number(location?.latitude).toFixed(LOCATION_BUCKET_PRECISION);
     const lng = Number(location?.longitude).toFixed(LOCATION_BUCKET_PRECISION);
     const src = source || "unknown";
     return `${lat},${lng}:${src}`;
   }
   ```

2. **Add demo mode to cache key:**
   ```javascript
   function buildLocationBucketKey(location, source, demoMode) {
     const lat = Number(location?.latitude).toFixed(LOCATION_BUCKET_PRECISION);
     const lng = Number(location?.longitude).toFixed(LOCATION_BUCKET_PRECISION);
     const src = source || "unknown";
     const demo = demoMode ? "demo" : "live";
     return `${lat},${lng}:${src}:${demo}`;
   }
   ```

3. **Pass source to Edge Function:**
   ```javascript
   hospitalsService.discoverNearby(lat, lng, radius, {
     pickupSource: source,
     demoMode: demoModeEnabled,
     includeMapboxPlaces,
     includeGooglePlaces
   })
   ```

4. **Add source metadata to cache snapshot:**
   ```javascript
   const nextSnapshot = {
     hospitals: hospitalsWithWaitTimes,
     allHospitals: data,
     categories: categorized,
     timestamp: Date.now(),
     source: source,
     demoMode: demoModeEnabled,
   };
   ```

5. **Invalidate cache on source change:**
   ```javascript
   useEffect(() => {
     if (locationSource !== lastSourceRef.current) {
       const oldKey = buildLocationBucketKey(location, lastSourceRef.current);
       delete globalHospitalCache.keyedSnapshots[oldKey];
       globalFetchRegistry.delete(oldKey);
       lastSourceRef.current = locationSource;
     }
   }, [locationSource, location]);
   ```

---

## Next Steps

- All 3 audit rounds complete
- LOC-1 through LOC-6 implementation passes ready to begin
- User approval required before implementation
