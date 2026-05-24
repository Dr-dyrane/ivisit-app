---
status: living
owner: product
last_updated: 2026-05-24
---

# Location Hardening Implementation Dossier V1

**Date:** 2026-05-15  
**Owner:** `/map` location architecture  
**Status:** AUDIT COMPLETE â€” Safe Implementation Ready  
**Scope:** LOC-1 through LOC-6 (Canonical Truth, Manual Address, Recovery, Cache, Places, Validation)  
**Related:** [REFACTORING_GUARDRAILS.md](../../../REFACTORING_GUARDRAILS.md), [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)

---

## Executive Summary

This dossier addresses critical gaps in location hardening for the refactored MapScreen architecture (Phase 5 complete). The work ensures manual addresses are always geocoded before provider discovery, establishes canonical pickup truth with explicit source hierarchy, and makes provider discovery deterministic based on canonical pickup.

**Problem Statement:**
- Manual pickup can be text-only (no coordinates) â†’ provider discovery fails or uses wrong location
- Pickup source enum values don't match runtime strings â†’ hierarchy checks fail
- Provider discovery uses non-canonical location â†’ cache collisions (manual vs GPS at same coords)
- Cache key lacks source â†’ collisions at same coordinates

**Solution Approach:**
1. Fix source enum mismatch, add metadata flags (LOC-1)
2. Ensure manual addresses always geocoded before pickup (LOC-2)
3. Classify location failures with specific CTAs (LOC-3)
4. Add coordinate/source to cache keys (LOC-4)
5. ~~Define Places rendering lanes~~ â€” SKIPPED: Already implemented via priority scoring
6. Add GPS freshness/accuracy validation (LOC-6)

---

## Current Architecture Context

### Stack Overview (Refactored MapScreen)
| Layer | Implementation | File |
|-------|---------------|------|
| Entry | `MapScreen.jsx` | `screens/MapScreen.jsx` |
| Orchestrator | `useMapExploreFlow()` | `hooks/map/exploreFlow/useMapExploreFlow.js` |
| Location | `useMapLocation()` â†’ `resolveMapPickupLocationTruth()` | `hooks/map/exploreFlow/useMapLocation.js` |
| State | Zustand reducer + Jotai atoms | `hooks/map/state/mapExploreFlow.store.js` |
| Hospitals | `useEmergency()` â†’ `useHospitals()` | `hooks/emergency/useHospitals.js` |

### Call Chain for Location
```
MapScreen.jsx
  â””â”€â”€ useMapExploreFlow()
      â”œâ”€â”€ useGlobalLocation()          [context]
      â”œâ”€â”€ useMapLocation()             [HOOK TARGET: LOC-2, LOC-3, LOC-6]
      â”‚   â”œâ”€â”€ resolveMapPickupLocationTruth()  [TARGET: LOC-1]
      â”‚   â””â”€â”€ handleSearchLocation()           [TARGET: LOC-2]
      â”œâ”€â”€ mapExploreFlow.store        [TARGET: LOC-2 - SET_MANUAL_LOCATION]
      â””â”€â”€ useEmergency()
          â””â”€â”€ useEmergencyHospitalSync()
              â””â”€â”€ useHospitals()       [TARGET: LOC-4]
                  â””â”€â”€ buildLocationBucketKey()
```

---

## Multi-Pass Plan

### LOC-0: Final Architecture Review âœ… COMPLETE

**Audit Scope:**
- [x] Current pickup truth files (`mapPickupLocationTruth.js`, `useMapLocation.js`)
- [x] Current manual address flow (`useManualEntryHandlers.js`, `addressAssistService`)
- [x] Current provider discovery (`hospitalsService.discoverNearby`, `useHospitals.js`)
- [x] Current hospital hooks (`useEmergencyHospitalSync.js`)
- [x] Current state management (`mapExploreFlow.store.js`, `locationStore.js`)
- [x] Current location failure UI (`FullScreenEmergencyMap.jsx`, `GlobalLocationContext.jsx`)

**Granular Audit Documents:**
- [x] [audits/AUDIT_PICKUP_SOURCES.md](./audits/AUDIT_PICKUP_SOURCES.md) â€” LOC-1 detailed findings
- [x] [audits/AUDIT_MANUAL_ADDRESS.md](./audits/AUDIT_MANUAL_ADDRESS.md) â€” LOC-2 detailed findings
- [x] [audits/AUDIT_LOCATION_RECOVERY.md](./audits/AUDIT_LOCATION_RECOVERY.md) â€” LOC-3 detailed findings
- [x] [audits/AUDIT_CACHE_DETERMINISM.md](./audits/AUDIT_CACHE_DETERMINISM.md) â€” LOC-4 detailed findings
- [x] [audits/AUDIT_PLACES_RENDERING.md](./audits/AUDIT_PLACES_RENDERING.md) â€” LOC-5 detailed findings
- [x] [audits/AUDIT_RUNTIME_VALIDATION.md](./audits/AUDIT_RUNTIME_VALIDATION.md) â€” LOC-6 detailed findings
- [x] [audits/AUDIT_LOCATION_TRUTH_LAYER.md](./audits/AUDIT_LOCATION_TRUTH_LAYER.md) â€” Layer analysis
- [x] [audits/AUDIT_GEOCODING_LAYER.md](./audits/AUDIT_GEOCODING_LAYER.md) â€” Layer analysis
- [x] [audits/AUDIT_PROVIDER_DISCOVERY_LAYER.md](./audits/AUDIT_PROVIDER_DISCOVERY_LAYER.md) â€” Layer analysis

---

### LOC-1: Canonical Pickup Truth

**Goal:** Fix source enum mismatch, add metadata flags, normalize hierarchy

**Status:** ðŸŸ¡ READY FOR IMPLEMENTATION

**Critical Finding:**
```javascript
// Enum values don't match runtime strings:
// mapPickupLocationTruth.js
SAVED_MANUAL_FALLBACK: "saved_manual_fallback"  // Enum
// GlobalLocationContext uses: "manual_fallback"    // Runtime
// locationStore uses: "manual", "persisted"      // Runtime (not in enum)
```

**Safe Implementation:**
1. Add new sources without changing existing enum values
2. Create `normalizePickupSource(runtimeValue)` mapper function
3. Add `sourceMetadata` to truth return (isDemo, isResolvedPlace, isLocationUnavailable)
4. Update all consumers to use mapper when reading source

**Files:**
- `hooks/map/exploreFlow/mapPickupLocationTruth.js` (add sources, mapper, metadata)
- `hooks/map/exploreFlow/useMapLocation.js` (consume sourceMetadata)
- `contexts/GlobalLocationContext.jsx` (use mapper when setting source)

**Risk:** ðŸ”´ HIGH â€” affects all location resolution

**Backward Compatibility:** âœ… Maintained via mapper function

---

### LOC-2: Manual Address Coordinate Resolution

**Goal:** Ensure manual addresses always have geocoded coordinates before pickup

**Status:** ðŸŸ¡ READY FOR IMPLEMENTATION

**Critical Finding:**
```javascript
// useMapLocation.js:244 (handleSearchLocation)
if (!nextLocation?.location) return;  // âŒ Only checks existence, not coordinates

// mapExploreFlow.store.js:155 (reducer)
SET_MANUAL_LOCATION: (state, action) => {
  // âŒ No coordinate validation
  return { ...state, location: { ...state.location, manualLocation: action.value } };
}
```

**Safe Implementation:**
1. Add coordinate validation at `handleSearchLocation` entry point (first validation here)
2. Add `isGeocoded`, `geocodeRelevance`, `confidence` flags at geocoding source
3. Defense-in-depth in reducer: reject non-geocoded locations without coords

**Files:**
- `hooks/map/exploreFlow/useMapLocation.js:244-273` (entry validation)
- `hooks/map/locationIntent/useManualEntryHandlers.js:145-160` (isGeocoded flag)
- `hooks/map/state/mapExploreFlow.store.js:155-162` (defense-in-depth)

**Risk:** ðŸ”´ HIGH â€” entry point for all manual locations

**Backward Compatibility:** âœ… Existing valid flows unaffected

---

### LOC-3: Location Failure Recovery

**Goal:** Classify location failures with specific CTAs

**Status:** ðŸŸ¡ READY FOR IMPLEMENTATION

**Critical Finding:**
```javascript
// GlobalLocationContext.jsx
const [locationError, setLocationError] = useState(null);  // String only

// FullScreenEmergencyMap.jsx:702
<Pressable onPress={requestLocationPermission}>
  Retry  // âŒ Generic "Retry" for all errors
</Pressable>
```

**Safe Implementation:**
1. Keep `locationError` as string for backward compatibility
2. Add new Jotai atom: `locationErrorDetailsAtom` (structured data)
3. Set both in error handlers
4. Update display component: check `errorDetails` first, fall back to `locationError`

**Files:**
- `contexts/GlobalLocationContext.jsx` (add setStructuredLocationError)
- `atoms/mapScreenAtoms.js` (add locationErrorDetailsAtom)
- `components/map/FullScreenEmergencyMap.jsx` (consume errorDetails)

**Risk:** ðŸŸ¡ MEDIUM â€” string backward compatible

**Backward Compatibility:** âœ… locationError stays string

---

### LOC-4: Cache Determinism

**Goal:** Add coordinate + source to cache keys

**Status:** ðŸŸ¡ READY FOR IMPLEMENTATION

**Critical Finding:**
```javascript
// useHospitals.js:110
return [
  normalizedLocation.latitude.toFixed(LOCATION_BUCKET_PRECISION),
  normalizedLocation.longitude.toFixed(LOCATION_BUCKET_PRECISION),
].join(":");  // â† Only coordinates, no source
// Manual at 37.775,-122.419 shares cache with GPS at 37.775,-122.419
```

**Safe Implementation:**
1. Keep `buildLocationBucketKey()` unchanged (backward compatible)
2. Add new `buildDeterministicCacheKey(location, source, demoMode)`
3. Dual-key lookup: check new key first, fall back to old key during migration
4. Store with both keys during migration period

**Files:**
- `hooks/emergency/useHospitals.js` (add buildDeterministicCacheKey, dual-key lookup)
- `hooks/emergency/useEmergencyHospitalSync.js` (pass canonical location + source)

**Risk:** ðŸ”´ HIGH â€” cache changes affect performance

**Backward Compatibility:** âœ… Dual-key migration preserves existing cache

---

### LOC-5: Places Rendering â€” SKIPPED

**Status:** âšª **NOT NEEDED** â€” Current implementation sufficient

**Live Code Finding:**
```javascript
// services/hospitalsService.js:96-107
const hospitalPriorityScore = (hospital) => {
  let score = 0;
  const isDemo = isDemoLikeHospital(hospital);
  if (hospital?.verified === true && !isDemo) score += 40;  // Verified first
  if (!isDemo) score += 10;  // Places lower priority
  // ...
};
```

**Verdict:** Verified hospitals already appear first via priority scoring. No UI change needed.

---

### LOC-6: Runtime Validation

**Goal:** Add GPS freshness and accuracy validation

**Status:** ðŸŸ¡ READY FOR IMPLEMENTATION

**Critical Finding:**
```javascript
// GlobalLocationContext.jsx
const hasPreciseDeviceLocation = Boolean(
  userLocation?.latitude && userLocation?.longitude && locationSource === "device"
);  // âŒ No accuracy or freshness check
```

**Safe Implementation:**
1. Add `assessGPSQuality(location)` â†’ returns `{ isValid, accuracy, age, warnings[], quality }`
2. Show warnings in UI ("Low accuracy â€” move outdoors if possible")
3. Add retry logic for weak signals (one automatic retry)
4. Never block user â€” only warn

**Files:**
- `contexts/GlobalLocationContext.jsx` (add assessGPSQuality)
- `hooks/map/exploreFlow/useMapLocation.js` (show warnings in locationControl)
- `components/map/surfaces/MapExploreLoadingOverlay.jsx` (render warnings)

**Risk:** ðŸŸ¡ MEDIUM â€” adds UI complexity

**Backward Compatibility:** âœ… Warnings don't block existing flows

---

## Implementation Order (Post-Audit)

| Order | Pass | Status | Risk | Rationale |
|-------|------|--------|------|-----------|
| 1 | LOC-4 (Cache) | ðŸŸ¡ Pending | ðŸ”´ High | Real collision risk â€” do first |
| 2 | LOC-2 (Manual) | ðŸŸ¡ Pending | ðŸ”´ High | Entry validation gap |
| 3 | LOC-1 (Sources) | ðŸŸ¡ Pending | ðŸ”´ High | Enum mismatch |
| 4 | LOC-3 (Recovery) | ðŸŸ¡ Pending | ðŸŸ¡ Medium | Generic errors work |
| 5 | LOC-6 (Runtime) | ðŸŸ¡ Pending | ðŸŸ¡ Medium | Nice to have |
| â€” | LOC-5 (Places) | âšª **SKIPPED** | â€” | Already implemented |

---

## Implementation Protocol

See [passes/PASS_TEMPLATE.md](./passes/PASS_TEMPLATE.md) for:
- Git checkpoint protocol
- Feature flag patterns
- Code guardrails (5-layer state, useEffect rules, tracking lessons)
- PULLBACK NOTE format

### Pre-Implementation Checklist

- [ ] Git baseline recorded: `git log --oneline -1 > passes/LOC-{N}-BASELINE.txt`
- [ ] Backup branch created: `git checkout -b backup/loc-{N}-{desc}-{date}`
- [ ] Pass document created from template in `passes/`
- [ ] All consumers identified:
  ```bash
  grep -r "resolveMapPickupLocationTruth\|handleSearchLocation\|SET_MANUAL_LOCATION\|buildLocationBucketKey" hooks/ --include="*.js"
  ```
- [ ] Feature flag added: `ENABLE_LOC_HARDENING_{PASS_NAME} = false`
- [ ] Baseline metrics recorded: cache hit rate, geocoding latency, error rate
- [ ] Tests written for both flag-on and flag-off states
- [ ] Rollback procedure tested (revert commit locally)
- [ ] Documentation updated (this dossier + pass doc) before code changes

---

## Related Documentation

### Audits (Pre-Implementation Findings)
- [audits/AUDIT_PICKUP_SOURCES.md](./audits/AUDIT_PICKUP_SOURCES.md) â€” LOC-1 granular audit
- [audits/AUDIT_MANUAL_ADDRESS.md](./audits/AUDIT_MANUAL_ADDRESS.md) â€” LOC-2 granular audit
- [audits/AUDIT_LOCATION_RECOVERY.md](./audits/AUDIT_LOCATION_RECOVERY.md) â€” LOC-3 granular audit
- [audits/AUDIT_CACHE_DETERMINISM.md](./audits/AUDIT_CACHE_DETERMINISM.md) â€” LOC-4 granular audit
- ~~[audits/AUDIT_PLACES_RENDERING.md](./audits/AUDIT_PLACES_RENDERING.md)~~ â€” Removed: LOC-5 skipped
- [audits/AUDIT_RUNTIME_VALIDATION.md](./audits/AUDIT_RUNTIME_VALIDATION.md) â€” LOC-6 granular audit
- [audits/AUDIT_LOCATION_TRUTH_LAYER.md](./audits/AUDIT_LOCATION_TRUTH_LAYER.md) â€” Layer analysis
- [audits/AUDIT_GEOCODING_LAYER.md](./audits/AUDIT_GEOCODING_LAYER.md) â€” Layer analysis
- [audits/AUDIT_PROVIDER_DISCOVERY_LAYER.md](./audits/AUDIT_PROVIDER_DISCOVERY_LAYER.md) â€” Layer analysis

### Passes (Implementation Records)
- [passes/](./passes/) â€” Directory for pass implementation records (populated during work)

### Architecture
- [REFACTORING_GUARDRAILS.md](../../../REFACTORING_GUARDRAILS.md) â€” Architecture rules
- [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md) â€” Map flow contract
- [README.md](./README.md) â€” This directory's documentation guide
