---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Audit Round 1: Pickup Truth Resolution Flow

**Date:** 2026-05-15  
**Scope:** Trace all code paths from manual/device/saved → canonical pickup  
**Status:** COMPLETE

---

## Executive Summary

The pickup truth resolution flow has THREE separate location stores that can get out of sync:
1. **GlobalLocationContext** - GPS tracking (React context)
2. **locationStore** - Zustand store with saved locations
3. **mapExploreFlow store** - Manual location for map flow

**Critical Issue:** `useMapExploreFlow` reads from GlobalLocationContext, but `useEmergencyLocationSync` writes to locationStore. These two stores are not synchronized, creating a split-brain situation.

---

## Code Path Analysis

### Path 1: GPS/Device Location

```
GPS Hardware
    ↓
GlobalLocationContext.requestLocationPermission()
    ↓
GlobalLocationContext.setUserLocation(location, "device")
    ↓
useEmergencyLocationSync (syncs to locationStore)
    ↓
locationStore.setUserLocation(location, "device")
    ↓
useMapExploreFlow (reads from GlobalLocationContext, NOT locationStore)
    ↓
useMapLocation (receives globalUserLocation as prop)
    ↓
resolveMapPickupLocationTruth({ globalUserLocation, globalLocationSource })
    ↓
Returns: { activeLocation, source: "device", ... }
```

**Key Files:**
- `contexts/GlobalLocationContext.jsx` (lines 205-362)
- `hooks/emergency/useEmergencyLocationSync.js` (lines 27-54)
- `stores/locationStore.js` (lines 43-72)
- `hooks/map/exploreFlow/useMapExploreFlow.js` (lines 73-80)
- `hooks/map/exploreFlow/useMapLocation.js` (lines 58-67)
- `hooks/map/exploreFlow/mapPickupLocationTruth.js` (lines 23-111)

**Issues:**
- useMapExploreFlow reads from GlobalLocationContext (line 73)
- useEmergencyLocationSync writes to locationStore (line 38)
- These two stores are NOT synchronized
- If locationStore has a location but GlobalLocationContext doesn't, it's ignored by map flow

---

### Path 2: Manual Location Entry

```
User enters address in LocationSheet
    ↓
useManualEntryHandlers.handleManualConfirm()
    ↓
addressAssistService.resolveManualDraft(address) - geocodes text
    ↓
buildSelectedLocation({ source: "manual", coords: { lat, lng }, ... })
    ↓
setActiveCandidate(normalized) - sets in locationIntentAtoms
    ↓
User confirms selection
    ↓
commitLocation(selectedLocation) - NEED TO TRACE THIS
    ↓
setManualLocation({ location, source: "session_manual" })
    ↓
mapExploreFlow store (reducer action SET_MANUAL_LOCATION)
    ↓
useMapLocation (reads manualLocation from store)
    ↓
resolveMapPickupLocationTruth({ manualLocation })
    ↓
Returns: { activeLocation, source: "session_manual", ... }
```

**Key Files:**
- `hooks/map/locationIntent/useManualEntryHandlers.js` (lines 65-169)
- `services/addressAssistService.js` (lines 82-110)
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx` (lines 126-131, 839)
- `hooks/map/state/mapExploreFlow.store.js` (lines 155-162, 337-338)
- `hooks/map/exploreFlow/useMapLocation.js` (lines 269-272)

**Issues:**
- commitLocation function not found in grep - needs manual trace
- Manual location stored in mapExploreFlow store, not in locationStore
- No synchronization between mapExploreFlow store and locationStore
- Manual location not persisted across app restarts (only in reducer state)

---

### Path 3: Saved Location Fallback

```
locationStore.savedLocations array
    ↓
getStoredLocationFallback({ allowDevice: false })
    ↓
Reads locationStore.userLocation
    ↓
If source === "manual": returns { location, source: "manual_fallback" }
    ↓
If source === "device" || "persisted": returns { location, source: "stored_fallback" }
    ↓
GlobalLocationContext.requestLocationPermission() (on GPS failure)
    ↓
applyResolvedLocation({ locationData: fallback, source: fallback.source })
    ↓
GlobalLocationContext.setUserLocation(fallback.location, fallback.source)
    ↓
useMapExploreFlow reads from GlobalLocationContext
    ↓
resolveMapPickupLocationTruth({ globalUserLocation, globalLocationSource })
    ↓
Returns: { activeLocation, source: "saved_manual_fallback" or "saved_device_fallback", ... }
```

**Key Files:**
- `stores/locationStore.js` (lines 31-33, 268-299)
- `contexts/GlobalLocationContext.jsx` (lines 31-52, 231-248, 259-283, 322-336)
- `hooks/map/exploreFlow/mapPickupLocationTruth.js` (lines 62-90)

**Issues:**
- Saved location only used when GPS fails
- No way to explicitly select saved location as pickup
- Saved location not distinguished from other fallbacks in UI
- "manual_fallback" and "stored_fallback" sources not in MAP_PICKUP_LOCATION_SOURCES

---

## Source Hierarchy Issues

### Current MAP_PICKUP_LOCATION_SOURCES (mapPickupLocationTruth.js)

```javascript
export const MAP_PICKUP_LOCATION_SOURCES = {
  SESSION_MANUAL: "session_manual",
  DEVICE: "device",
  SAVED_MANUAL_FALLBACK: "saved_manual_fallback",
  SAVED_DEVICE_FALLBACK: "saved_device_fallback",
  MISSING: "missing",
};
```

### Missing Sources
1. **DEMO_BOOTSTRAP** - Demo hospitals injected without clear marking
2. **RESOLVED_PLACE** - Search selection not distinguished from manual entry
3. **LOCATION_UNAVAILABLE** - Separate from MISSING (no location vs location failed)
4. **MANUAL_FALLBACK** - Used in getStoredLocationFallback but not in MAP_PICKUP_LOCATION_SOURCES
5. **STORED_FALLBACK** - Used in getStoredLocationFallback but not in MAP_PICKUP_LOCATION_SOURCES

### Source Values in Wild
From grep results:
- "device" - GPS location
- "manual" - Manual location (in locationStore)
- "session_manual" - Manual location (in map flow)
- "manual_fallback" - Saved manual location (in GlobalLocationContext)
- "stored_fallback" - Saved device location (in GlobalLocationContext)
- "persisted" - Hydrated from storage (in locationStore)
- "services_disabled" - GPS turned off
- "permission_denied" - Permission permanently denied
- "permission_required" - Permission not granted
- "location_unavailable" - GPS timeout/failure

**Issue:** 10+ source values in code, only 5 in MAP_PICKUP_LOCATION_SOURCES enum.

---

## Dual Store Problem

### Store 1: GlobalLocationContext (React Context)
**Purpose:** GPS tracking and permission management
**State:**
- userLocation (GPS coordinates)
- locationSource (where location came from)
- locationPermissionStatus
- resolvedPlace (reverse geocoded address)

**Readers:**
- useMapExploreFlow (line 73)
- useEmergencyLocationSync (line 15)
- useMapLocation (emergency screen)
- useCountryDetection
- useMapSearchSheetModel

**Writers:**
- GlobalLocationContext.requestLocationPermission (line 171)
- GlobalLocationContext.applyResolvedLocation (line 171)

---

### Store 2: locationStore (Zustand)
**Purpose:** Persistent location storage and saved locations
**State:**
- userLocation (coordinates)
- userLocationSource (where location came from)
- locationPermission
- savedLocations (array of saved addresses)

**Readers:**
- useEmergencyLocationSync (line 18)
- GlobalLocationContext.getStoredLocationFallback (line 32)
- useMapSearchSheetModel

**Writers:**
- locationStore.setUserLocation (line 43)
- useEmergencyLocationSync (line 38)
- locationStore.hydrate (line 268)

---

### Store 3: mapExploreFlow Store (useReducer)
**Purpose:** Map flow ephemeral state
**State:**
- location.manualLocation (manual pickup for map)

**Readers:**
- useMapExploreFlow (line 182)
- useMapLocation (line 224)

**Writers:**
- mapExploreFlowStore.setManualLocation (line 337)
- useMapLocation (line 269, 319)

---

### Synchronization Issues

1. **GPS sync is one-way:**
   - useEmergencyLocationSync writes GPS to locationStore
   - useMapExploreFlow reads GPS from GlobalLocationContext
   - If locationStore has GPS but GlobalLocationContext doesn't, map flow ignores it

2. **Manual location is isolated:**
   - Manual location stored in mapExploreFlow store only
   - Not persisted to locationStore
   - Lost on app restart
   - Not accessible to emergency flow

3. **Saved location is fallback-only:**
   - Saved locations in locationStore
   - Only used when GPS fails
   - No explicit selection mechanism
   - Not accessible to map flow as primary pickup

---

## Critical Findings

### Finding 1: No Single Source of Truth for Pickup
**Impact:** HIGH  
**Evidence:** Three separate stores with no synchronization

### Finding 2: Manual Location Not Persisted
**Impact:** HIGH  
**Evidence:** Stored in ephemeral mapExploreFlow store, lost on restart

### Finding 3: GPS Sync Broken
**Impact:** MEDIUM  
**Evidence:** useEmergencyLocationSync writes to locationStore, but useMapExploreFlow reads from GlobalLocationContext

### Finding 4: Source Enum Incomplete
**Impact:** MEDIUM  
**Evidence:** 10+ source values in code, only 5 in MAP_PICKUP_LOCATION_SOURCES

### Finding 5: No Demo Source Marking
**Impact:** MEDIUM  
**Evidence:** Demo hospitals injected without explicit DEMO_BOOTSTRAP source

### Finding 6: No Search Selection Source
**Impact:** LOW  
**Evidence:** RESOLVED_PLACE not distinguished from manual entry

---

## Recommendations for LOC-1

1. **Consolidate to single pickup truth:**
   - Make locationStore the single source of truth
   - Remove GPS state from GlobalLocationContext
   - GlobalLocationContext only manages permission tracking

2. **Add missing sources to MAP_PICKUP_LOCATION_SOURCES:**
   - DEMO_BOOTSTRAP
   - RESOLVED_PLACE
   - LOCATION_UNAVAILABLE
   - MANUAL_FALLBACK
   - STORED_FALLBACK

3. **Persist manual location:**
   - Store manual location in locationStore
   - Add source field to distinguish manual from GPS
   - Sync with mapExploreFlow store

4. **Fix GPS sync:**
   - Remove useEmergencyLocationSync (redundant)
   - GlobalLocationContext writes directly to locationStore
   - useMapExploreFlow reads from locationStore

5. **Add source metadata:**
   - Attach source metadata to pickup object
   - Include isDemo, isFallback, isResolvedPlace flags
   - Use in resolveMapPickupLocationTruth for hierarchy enforcement

---

## Next Steps

- **Audit Round 2:** Deep dive into manual address geocoding flow
- **Audit Round 3:** Deep dive into provider discovery flow
- **LOC-1 Implementation:** Apply recommendations from this audit
