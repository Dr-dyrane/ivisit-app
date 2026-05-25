---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# LOC-4 Cache Determinism

**Status:** ✅ COMPLETE  
**Owner:** Map/Location Architecture  
**Layer Impact:** L2 (TanStack Query), L3 (Zustand)  
**Date:** 2026-05-15  
**Depends on:** None  
**Risk Level:** 🔴 HIGH
**Baseline:** `751dc31`  
**Commit:** `05425d4`

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

- [x] Dual-key migration: old cache entries auto-migrated to new key
- [x] Manual vs GPS at same coords: different cache keys
- [x] Demo vs live at same coords: different cache keys
- [x] Cache stores both keys for backward compatibility
- [x] No feature flag — always active with dual-key design

## Implementation Summary

**Files Changed:**
- `hooks/emergency/useHospitals.js` (+40 lines, -7 lines)

**Key Changes:**
1. Added `buildDeterministicCacheKey(location, source, demoMode)` 
2. Dual-key lookup: try new key first, fall back to old key (auto-migration)
3. Store with both keys: `{newKey}` (primary) + `{oldKey}` (backward compat)
4. Cache key format: `{lat}:{lng}:{source}:{demo|live}`

**Migration Path:**
- Old cache entries at `33.748:-116.973` automatically copied to `33.748:-116.973:device:live`
- No data loss, no manual migration needed
- Backward compatible during transition period

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
