# LOC-1 Pickup Sources

**Status:** ✅ COMPLETE  
**Owner:** Map/Location Architecture  
**Layer Impact:** L3 (Zustand), L5 (Jotai)  
**Date:** 2026-05-15  
**Depends on:** None  
**Risk Level:** 🔴 HIGH
**Baseline:** `TBD`  
**Commit:** `TBD`

---

## Goal

Fix source enum mismatch, add metadata flags, normalize pickup source hierarchy.

---

## Read First

- [audits/AUDIT_PICKUP_SOURCES.md](../audits/AUDIT_PICKUP_SOURCES.md)
- [LOC-0_ARCHITECTURE_REVIEW.md](./LOC-0_ARCHITECTURE_REVIEW.md)

---

## Implementation

### Files To Modify
1. `hooks/map/exploreFlow/mapPickupLocationTruth.js`
2. `hooks/map/exploreFlow/useMapLocation.js`
3. `contexts/GlobalLocationContext.jsx`

### Changes

```javascript
// 1. Add new sources to enum (keep existing values)
export const MAP_PICKUP_LOCATION_SOURCES = {
  SESSION_MANUAL: "session_manual",
  RESOLVED_PLACE: "resolved_place",           // NEW
  DEVICE: "device",
  DEMO_BOOTSTRAP: "demo_bootstrap",           // NEW
  SAVED_MANUAL_FALLBACK: "saved_manual_fallback",
  SAVED_DEVICE_FALLBACK: "saved_device_fallback",
  LOCATION_UNAVAILABLE: "location_unavailable", // NEW
  MISSING: "missing",
};

// 2. Add mapper function
export function normalizePickupSource(runtimeValue) {
  const sourceMap = {
    "manual": MAP_PICKUP_LOCATION_SOURCES.SAVED_MANUAL_FALLBACK,
    "manual_fallback": MAP_PICKUP_LOCATION_SOURCES.SAVED_MANUAL_FALLBACK,
    "persisted": MAP_PICKUP_LOCATION_SOURCES.SAVED_DEVICE_FALLBACK,
    "stored_fallback": MAP_PICKUP_LOCATION_SOURCES.SAVED_DEVICE_FALLBACK,
    "location_unavailable": MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
  };
  return sourceMap[runtimeValue] || runtimeValue;
}

// 3. Add sourceMetadata to truth return
return {
  activeLocation, source, currentCountryCode,
  requiresLocationSelection, isFallback, isDevice, isManual, isSaved,
  sourceMetadata: {  // NEW
    isDemo: source === MAP_PICKUP_LOCATION_SOURCES.DEMO_BOOTSTRAP,
    isResolvedPlace: source === MAP_PICKUP_LOCATION_SOURCES.RESOLVED_PLACE,
    isLocationUnavailable: source === MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
    canonicalSource: normalizePickupSource(source),
  }
};

// 4. Feature flag (default: existing behavior)
const ENABLE_LOC_HARDENING_LOC1 = false;
```

---

## Verification

- [x] New sources added: RESOLVED_PLACE, DEMO_BOOTSTRAP, LOCATION_UNAVAILABLE
- [x] `normalizePickupSource()` mapper function implemented
- [x] `sourceMetadata` included in all truth returns
- [x] Enum values unchanged (backward compatible)
- [x] No feature flag — always active

## Implementation Summary

**Files Changed:**
- `hooks/map/exploreFlow/mapPickupLocationTruth.js` (+47 lines)
  - Extended enum with 3 new sources
  - Added `normalizePickupSource()` mapper
  - Added `sourceMetadata` to all return paths

---

## Rollback

```bash
# Option 1: Revert commit
git revert <commit-hash> --no-edit

# Option 2: Disable flag (faster)
# Set ENABLE_LOC_HARDENING_LOC1 = false
```

---

## Notes

- PULLBACK NOTE format: `// PULLBACK NOTE: LOC-1 // OLD: ... // NEW: ...`
- Existing enum values preserved — only added new sources
- `normalizePickupSource()` provides backward compatibility for legacy strings
- `sourceMetadata` enables LOC-4 cache determinism with canonical source
