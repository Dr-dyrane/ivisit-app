# Location Architecture Audit

**Date:** 2026-05-08  
**Scope:** Current location flow from GPS → Search → Pickup  
**Finding:** App has sophisticated 5-layer location architecture. Saved locations fit naturally.

---

## 1. Location Flow Architecture

### Layer 1: Real-Time GPS (GlobalLocationContext)

**File:** `contexts/GlobalLocationContext.jsx`

Real-time GPS monitoring, permission handling, live updates, fallback to stored location.

### Layer 2: Persistence (locationStore)

**File:** `stores/locationStore.js`

Auto-saves to `StorageKeys.LOCATION_CACHE`. Extending with `savedLocations` is natural.

### Layer 3: Priority Resolution (Pickup Location Truth)

**File:** `hooks/map/exploreFlow/mapPickupLocationTruth.js`

Priority order: SESSION_MANUAL → DEVICE → SAVED_*_FALLBACK → MISSING

### Layer 4: Location Control (useMapLocation)

**File:** `hooks/map/exploreFlow/useMapLocation.js`

Composes location from all sources, builds UI models.

### Layer 5: Search Integration (useMapSearchSheetModel)

**File:** `hooks/map/surfaces/search/useMapSearchSheetModel.js`

Mode chips let user choose between SEARCH and LOCATION.

---

## 2. How Saved Locations Fit

**Extend `locationStore`:**
```javascript
savedLocations: [
  { id: 'home', label: 'home', address: '...', lat, lng, countryCode },
  { id: 'work', label: 'work', address: '...', lat, lng, countryCode },
]
```

**Persistence:** Automatic via existing subscription.

**Integration:** Show at top of search sheet: Current Location → Home → Work → Recent → Popular

---

## 3. Unified Search (Remove Mode Chips)

**Current:** Mode chips [Find care] [Set pickup] — User must decide
**Proposed:** Unified interface — Smart detection

**Smart Detection:**
- Query matches hospital name → Show hospital results
- Query matches address → Show Mapbox locations  
- Default → Show mixed results

---

## Summary

✅ **Architecture is solid** — 5 layers properly separated
✅ **Persistence ready** — `locationStore` auto-saves
✅ **No DB changes needed** — Zustand extension only
✅ **Offline support** — Local storage works without network

**Ready to implement.**
