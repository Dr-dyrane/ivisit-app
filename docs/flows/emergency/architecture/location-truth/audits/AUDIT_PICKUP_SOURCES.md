---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# LOC-1 Granular Audit: Canonical Pickup Truth

**Date:** 2026-05-15  
**Scope:** Verify source hierarchy, manual wins, fallback/demo/missing markers  
**Status:** IN PROGRESS

---

## Requirement Checklist

### 1. Normalize pickup source hierarchy âœ…
**Requirement:** Define canonical source enum with clear hierarchy

**Current State:**
```javascript
// hooks/map/exploreFlow/mapPickupLocationTruth.js
export const MAP_PICKUP_LOCATION_SOURCES = {
  SESSION_MANUAL: "session_manual",
  DEVICE: "device",
  SAVED_MANUAL_FALLBACK: "saved_manual_fallback",
  SAVED_DEVICE_FALLBACK: "saved_device_fallback",
  MISSING: "missing",
};

const GLOBAL_SAVED_FALLBACK_SOURCES = new Set([
  "manual_fallback",
  "stored_fallback",
  "location_unavailable",
]);
```

**Issues Found:**
- **CRITICAL:** Enum values don't match actual source strings used in code
  - Enum: `SAVED_MANUAL_FALLBACK: "saved_manual_fallback"` 
  - Code uses: `"manual_fallback"` (GlobalLocationContext, locationStore)
  - Enum: `SAVED_DEVICE_FALLBACK: "saved_device_fallback"`
  - Code uses: `"stored_fallback"` (GlobalLocationContext, locationStore)
- **CRITICAL:** `GLOBAL_SAVED_FALLBACK_SOURCES` is separate from enum, creates confusion
- **CRITICAL:** locationStore uses `"manual"`, `"persisted"` - not in enum at all
- **MISSING:** No `DEMO_BOOTSTRAP` source (demo hospitals injected without marking)
- **MISSING:** No `RESOLVED_PLACE` source (search selection not distinguished)
- **MISSING:** No `LOCATION_UNAVAILABLE` in enum (only in GLOBAL_SAVED_FALLBACK_SOURCES)

**Impact:** HIGH - Source hierarchy checks will fail because enum values don't match runtime values

---

### 2. Ensure manual wins âœ…
**Requirement:** SESSION_MANUAL should have highest priority

**Current State:**
```javascript
// hooks/map/exploreFlow/mapPickupLocationTruth.js
if (hasValidPickupCoordinates(sessionManualLocation)) {
  return {
    activeLocation: sessionManualLocation,
    source: MAP_PICKUP_LOCATION_SOURCES.SESSION_MANUAL,
    // ...
  };
}
```

**Issues Found:**
- Session manual is checked first (correct priority)
- BUT: `sessionManualLocation` comes from `mapExploreFlow.store` which is ephemeral
- Manual location not persisted to `locationStore` (documented in LOCATION_TRUTH_LAYER_ANALYSIS.md)
- Manual location lost on app restart

**Impact:** MEDIUM - Manual wins in runtime but not persisted

---

### 3. Mark fallback/demo/missing explicitly âœ…
**Requirement:** Add metadata flags to distinguish fallback, demo, missing states

**Current State:**
```javascript
// hooks/map/exploreFlow/mapPickupLocationTruth.js
return {
  activeLocation,
  source,
  currentCountryCode,
  requiresLocationSelection,
  isFallback: true,  // Only for saved fallbacks
  isDevice: true,   // Only for device
  isSaved: false,   // Only for saved fallbacks
};
```

**Issues Found:**
- `isFallback` flag exists but only set for saved fallbacks
- No `isDemo` flag (demo locations not marked)
- No `isResolvedPlace` flag (search selection not distinguished)
- No `isLocationUnavailable` flag (conflated with MISSING)
- No `sourceMetadata` object as specified in dossier

**Impact:** MEDIUM - Fallback marked, but demo/resolved_place/missing not distinguished

---

## Source Value Mapping Analysis

### Enum vs Runtime Value Mismatch

| Enum Key | Enum Value | Runtime Value | Location |
|----------|------------|---------------|----------|
| SESSION_MANUAL | "session_manual" | "session_manual" | mapExploreFlow store |
| DEVICE | "device" | "device" | GlobalLocationContext |
| SAVED_MANUAL_FALLBACK | "saved_manual_fallback" | "manual_fallback" | GlobalLocationContext, locationStore |
| SAVED_DEVICE_FALLBACK | "saved_device_fallback" | "stored_fallback" | GlobalLocationContext, locationStore |
| MISSING | "missing" | "unknown" | GlobalLocationContext initial state |

### Additional Runtime Sources Not in Enum

| Runtime Value | Location | Should Be In Enum? |
|---------------|----------|-------------------|
| "persisted" | locationStore | YES - saved location |
| "manual" | locationStore | YES - saved manual location |
| "location_unavailable" | GlobalLocationContext | YES - distinct from MISSING |
| "permission_denied" | GlobalLocationContext | NO - permission state, not source |
| "services_disabled" | GlobalLocationContext | NO - permission state, not source |

---

## Hierarchy Enforcement Check

### Current Hierarchy in resolveMapPickupLocationTruth()

1. SESSION_MANUAL (session manual location)
2. DEVICE (global location with source === "device")
3. SAVED_MANUAL_FALLBACK (global location with source === "manual_fallback")
4. SAVED_DEVICE_FALLBACK (global location with source in GLOBAL_SAVED_FALLBACK_SOURCES)
5. MISSING (no location)

**Issues Found:**
- Missing RESOLVED_PLACE (search selection) - should be #2 after SESSION_MANUAL
- Missing DEMO_BOOTSTRAP - should be before saved fallbacks
- Missing LOCATION_UNAVAILABLE - should be before MISSING
- GLOBAL_SAVED_FALLBACK_SOURCES check comes after explicit manual_fallback check (redundant)

---

## Code Paths That Bypass resolveMapPickupLocationTruth()

### Direct location assignments without truth resolution

1. **locationStore.setUserLocation()** - direct assignment, no source validation
2. **GlobalLocationContext.setUserLocation()** - direct assignment, no source validation
3. **mapExploreFlow.setManualLocation()** - direct assignment, no source validation
4. **useMapLocation.handleSearchLocation()** - calls setManualLocation directly

**Impact:** HIGH - Location can be set without going through truth resolution

---

## Recommendations

1. **Fix enum value mismatch:**
   ```javascript
   export const MAP_PICKUP_LOCATION_SOURCES = {
     SESSION_MANUAL: "session_manual",
     RESOLVED_PLACE: "resolved_place",  // NEW
     DEVICE: "device",
     DEMO_BOOTSTRAP: "demo_bootstrap",  // NEW
     SAVED_MANUAL: "manual",            // CHANGED from saved_manual_fallback
     SAVED_DEVICE: "persisted",         // CHANGED from saved_device_fallback
     LOCATION_UNAVAILABLE: "location_unavailable",  // NEW
     MISSING: "missing",
   };
   ```

2. **Add source metadata:**
   ```javascript
   return {
     activeLocation,
     source,
     sourceMetadata: {
       isDemo: source === MAP_PICKUP_LOCATION_SOURCES.DEMO_BOOTSTRAP,
       isFallback: [SAVED_MANUAL, SAVED_DEVICE].includes(source),
       isResolvedPlace: source === MAP_PICKUP_LOCATION_SOURCES.RESOLVED_PLACE,
       isLocationUnavailable: source === MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
     }
   };
   ```

3. **Enforce truth resolution:**
   - All location setters should call `resolveMapPickupLocationTruth()` internally
   - Or add validation in setters to ensure source is in enum

4. **Add missing sources to hierarchy:**
   ```javascript
   // New order:
   1. SESSION_MANUAL
   2. RESOLVED_PLACE
   3. DEVICE
   4. DEMO_BOOTSTRAP
   5. SAVED_MANUAL
   6. SAVED_DEVICE
   7. LOCATION_UNAVAILABLE
   8. MISSING
   ```

---

## Validation Status

- [ ] Source enum values match runtime values
- [ ] All runtime sources are in enum
- [ ] Hierarchy enforced in all code paths
- [ ] Demo locations marked explicitly
- [ ] Search selections distinguished from manual
- [ ] Missing vs unavailable separated
- [ ] Direct location assignments go through truth resolution

**Overall:** 0/7 checks pass - critical gaps found
