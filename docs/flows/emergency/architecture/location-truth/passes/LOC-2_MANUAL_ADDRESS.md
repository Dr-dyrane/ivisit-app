# LOC-2 Manual Address

**Status:** 🟡 PENDING  
**Owner:** Map/Location Architecture  
**Layer Impact:** L3 (Zustand reducer), L5 (Jotai)  
**Date:** 2026-05-15 (planned)  
**Depends on:** LOC-1  
**Risk Level:** 🔴 HIGH

---

## Goal

Ensure manual addresses always have geocoded coordinates before becoming pickup.

---

## Read First

- [audits/AUDIT_MANUAL_ADDRESS.md](../audits/AUDIT_MANUAL_ADDRESS.md)
- [LOC-1_PICKUP_SOURCES.md](./LOC-1_PICKUP_SOURCES.md)

---

## Implementation

### Files To Modify
1. `hooks/map/exploreFlow/useMapLocation.js` (handleSearchLocation)
2. `hooks/map/locationIntent/useManualEntryHandlers.js` (geocoding flags)
3. `hooks/map/state/mapExploreFlow.store.js` (defense-in-depth)

### Changes

```javascript
// 1. Entry-point validation (useMapLocation.js:244)
const handleSearchLocation = useCallback((nextLocation) => {
  if (!nextLocation?.location) return;
  
  if (ENABLE_LOC_HARDENING_LOC2) {
    // NEW: Coordinate validation at entry
    const lat = Number(nextLocation.location.latitude);
    const lng = Number(nextLocation.location.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn("[LOC-2] Invalid coordinates", nextLocation);
      return;
    }
  }
  
  // EXISTING: Original logic
  // ...
}, [...]);

// 2. Geocode metadata (useManualEntryHandlers.js:145)
const normalized = buildSelectedLocation({
  source: "manual",
  label,
  address: geocoded.formattedAddress || address,
  coords: { latitude, longitude },
  isGeocoded: true,                              // NEW
  geocodeRelevance: geocoded.relevance ?? null, // NEW
  geocodeSource: geocoded.source ?? "unknown",   // NEW
  confidence: geocoded.relevance < 0.4 ? "low" : "high", // NEW
});

// 3. Defense-in-depth reducer (mapExploreFlow.store.js:155)
SET_MANUAL_LOCATION: (state, action) => {
  if (ENABLE_LOC_HARDENING_LOC2 && action.value?.location) {
    // NEW: Reject non-geocoded without coords
    if (!action.value?.isGeocoded) {
      const hasCoords = Number.isFinite(Number(action.value.location.latitude)) &&
                        Number.isFinite(Number(action.value.location.longitude));
      if (!hasCoords) {
        console.warn("[LOC-2] Rejecting non-geocoded location without coords");
        return state;
      }
    }
  }
  return { ...state, location: { ...state.location, manualLocation: action.value } };
}

// 4. Feature flag (default: existing behavior)
const ENABLE_LOC_HARDENING_LOC2 = false;
```

---

## Verification

- [ ] Flag off: manual address entry works as before
- [ ] Flag on: invalid coordinates rejected at entry
- [ ] Geocoded locations have `isGeocoded: true`
- [ ] Weak geocode results (< 0.4) have `confidence: "low"`
- [ ] Reducer rejects non-geocoded locations without coords

---

## Rollback

```bash
# Option 1: Revert commit
git revert <commit-hash> --no-edit

# Option 2: Disable flag
# Set ENABLE_LOC_HARDENING_LOC2 = false
```

---

## Notes

- PULLBACK NOTE: `// PULLBACK NOTE: LOC-2 // OLD: no validation // NEW: entry validation`
- First validation at `handleSearchLocation` entry point
- Enhances existing weak geocode handling in `useManualEntryHandlers`
- Does not break legitimate edge cases
