# LOC-4 Cache Determinism

**Status:** 🟡 PENDING  
**Owner:** Map/Location Architecture  
**Layer Impact:** L2 (TanStack Query), L3 (Zustand)  
**Date:** 2026-05-15 (planned)  
**Depends on:** LOC-1  
**Risk Level:** 🔴 HIGH

---

## Goal

Add coordinate + source to cache keys for deterministic provider discovery.

---

## Read First

- [audits/AUDIT_CACHE_DETERMINISM.md](../audits/AUDIT_CACHE_DETERMINISM.md)
- [LOC-1_PICKUP_SOURCES.md](./LOC-1_PICKUP_SOURCES.md)

---

## Implementation

### Files To Modify
1. `hooks/emergency/useHospitals.js` (new key builder, dual-key lookup)
2. `hooks/emergency/useEmergencyHospitalSync.js` (pass canonical location)

### Changes

```javascript
// 1. Keep existing function (backward compatible)
const buildLocationBucketKey = (location) => {
  const normalizedLocation = normalizeLocation(location);
  if (!normalizedLocation) return "fallback";
  return [
    normalizedLocation.latitude.toFixed(LOCATION_BUCKET_PRECISION),
    normalizedLocation.longitude.toFixed(LOCATION_BUCKET_PRECISION),
  ].join(":");
};

// 2. Add new deterministic key builder
const buildDeterministicCacheKey = (location, source, demoMode, placesOptions) => {
  const baseKey = buildLocationBucketKey(location);
  const src = normalizePickupSource(source) || "unknown";
  const demo = demoMode ? "demo" : "live";
  const places = placesOptions?.includeMapboxPlaces ? "places" : "noplaces";
  return `${baseKey}:${src}:${demo}:${places}`;
};

// 3. Dual-key lookup (migration path)
const performFetch = useCallback(async (location, source, demoMode) => {
  const oldKey = buildLocationBucketKey(location);           // Legacy
  const newKey = buildDeterministicCacheKey(location, source, demoMode); // New
  
  // Check new key first
  const newSnapshot = globalHospitalCache.keyedSnapshots?.[newKey];
  if (newSnapshot && hasFreshSnapshot(newSnapshot)) {
    return newSnapshot;
  }
  
  // Fall back to old key (migration)
  const oldSnapshot = globalHospitalCache.keyedSnapshots?.[oldKey];
  if (oldSnapshot && hasFreshSnapshot(oldSnapshot)) {
    globalHospitalCache.keyedSnapshots[newKey] = oldSnapshot; // Migrate
    return oldSnapshot;
  }
  
  // Fetch fresh, store with BOTH keys during migration
  const data = await hospitalsService.discoverNearby({...});
  globalHospitalCache.keyedSnapshots[newKey] = data;
  globalHospitalCache.keyedSnapshots[oldKey] = data; // Backward compatibility
  return data;
}, []);

// 4. Use canonical pickup (useEmergencyHospitalSync.js)
const { activeLocation, sourceMetadata } = useMapLocationContext();

const { hospitals } = useHospitals({
  location: activeLocation,
  locationSource: sourceMetadata?.canonicalSource,
  demoModeEnabled: effectiveDemoModeEnabled,
});

// 5. Feature flag (default: existing behavior)
const ENABLE_LOC_HARDENING_LOC4 = false;
```

---

## Verification

- [ ] Flag off: uses old key format, existing cache honored
- [ ] Flag on: uses new key format with source/demo/places
- [ ] Dual-key migration: old cache entries migrated to new key
- [ ] Manual vs GPS at same coords: different cache keys
- [ ] Demo vs live at same coords: different cache keys
- [ ] Cache hit rate maintained or improved

---

## Rollback

```bash
# Option 1: Revert commit
git revert <commit-hash> --no-edit

# Option 2: Disable flag
# Set ENABLE_LOC_HARDENING_LOC4 = false

# Note: Cache keys created with new format will remain,
# but lookups will use old format only
```

---

## Notes

- PULLBACK NOTE: `// PULLBACK NOTE: LOC-4 // OLD: coord-only key // NEW: coord+source+demo+places key`
- Dual-key migration preserves existing cache during transition
- Most disruptive pass — do last in sequence
- Monitor cache hit rate after enabling
