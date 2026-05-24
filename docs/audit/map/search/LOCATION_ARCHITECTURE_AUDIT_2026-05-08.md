---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Location Architecture Audit

**Date:** 2026-05-08  
**Scope:** Current location flow from GPS â†’ Search â†’ Pickup  
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

Priority order: SESSION_MANUAL â†’ DEVICE â†’ SAVED_*_FALLBACK â†’ MISSING

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

**Integration:** Show at top of search sheet: Current Location â†’ Home â†’ Work â†’ Recent â†’ Popular

---

## 3. Unified Search (Remove Mode Chips)

**Current:** Mode chips [Find care] [Set pickup] â€” User must decide
**Proposed:** Unified interface â€” Smart detection

**Smart Detection:**
- Query matches hospital name â†’ Show hospital results
- Query matches address â†’ Show Mapbox locations  
- Default â†’ Show mixed results

---

## Summary

âœ… **Architecture is solid** â€” 5 layers properly separated
âœ… **Persistence ready** â€” `locationStore` auto-saves
âœ… **No DB changes needed** â€” Zustand extension only
âœ… **Offline support** â€” Local storage works without network

**Ready to implement.**
