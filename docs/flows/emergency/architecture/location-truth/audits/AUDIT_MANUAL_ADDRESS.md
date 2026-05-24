---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# LOC-2 Granular Audit: Manual Address Coordinate Resolution

**Date:** 2026-05-15  
**Scope:** Verify geocoding, pickup attachment, text-only prevention  
**Status:** IN PROGRESS

---

## Requirement Checklist

### 1. Verify geocoding is always called for manual addresses âœ…
**Requirement:** Manual entry must go through geocoding before becoming pickup

**Current State:**
```javascript
// hooks/map/locationIntent/useManualEntryHandlers.js
const handleManualConfirm = useCallback(async () => {
  // ... validation ...
  const geocoded = await addressAssistService.resolveManualDraft(address, {
    countryCode: manualDraft.countryCode || undefined,
    proximity: locationBias || undefined,
  });
  // ... normalization ...
  setActiveCandidate(normalized);
}, [buildSelectedLocation, locationBias, manualDraft, ...]);
```

**Issues Found:**
- Geocoding IS called in `handleManualConfirm` âœ…
- Fallback geocoding with partial address if primary fails âœ…
- BUT: `setManualLocation()` can be called directly without geocoding (see below)

**Impact:** MEDIUM - Geocoding exists in manual entry flow, but bypass possible

---

### 2. Verify coordinates are attached to pickup object âœ…
**Requirement:** Pickup object must have latitude/longitude from geocoding

**Current State:**
```javascript
// hooks/map/locationIntent/useManualEntryHandlers.js
const normalized = buildSelectedLocation({
  source: "manual",
  label,
  address: geocoded.formattedAddress || address,
  coords: { latitude, longitude },  // âœ… Coords attached
  countryCode: geocoded.countryCode || manualDraft.countryCode || null,
});
```

**Issues Found:**
- Coordinates ARE attached to candidate âœ…
- BUT: No validation that coordinates are finite before attachment
- BUT: No validation that coordinates are in valid ranges (-90 to 90 lat, -180 to 180 lng)

**Impact:** MEDIUM - Coordinates attached, but not validated

---

### 3. Verify text-only discovery is prevented âœ…
**Requirement:** Provider discovery should reject text-only locations

**Current State:**
```javascript
// hooks/map/exploreFlow/useMapLocation.js
const handleSearchLocation = useCallback((nextLocation) => {
  if (!nextLocation?.location) return;  // âŒ Only checks existence, not coordinates
  // ... no coordinate validation ...
  setManualLocation({
    ...nextLocation,
    source: nextSource,
  });
}, [...]);
```

**Issues Found:**
- **CRITICAL:** `handleSearchLocation` only checks `nextLocation?.location` existence
- **CRITICAL:** No validation that `location` has finite coordinates
- **CRITICAL:** Text-only objects can pass through: `{ location: { latitude: null, longitude: null } }`
- **CRITICAL:** No check for `isGeocoded` flag (doesn't exist yet)

**Impact:** HIGH - Text-only locations can reach provider discovery

---

## Code Path Analysis

### Path 1: Manual Entry with Geocoding (Safe)
```
User enters address in LocationSheet
    â†“
useManualEntryHandlers.handleManualConfirm()
    â†“
addressAssistService.resolveManualDraft() âœ… Geocoding
    â†“
buildSelectedLocation({ coords: { lat, lng } }) âœ… Coords attached
    â†“
setActiveCandidate(normalized)
    â†“
commitLocation()
    â†“
handleSearchLocation() âŒ No coordinate validation
    â†“
setManualLocation()
```

**Risk:** Geocoding happens, but final validation missing

---

### Path 2: Search Selection (Safe)
```
User selects from search results
    â†“
useCandidateHandlers.handleSearchResultSelect()
    â†“
buildSelectedLocation({ coords: { lat, lng } }) âœ… Coords attached from search
    â†“
commitLocation()
    â†“
handleSearchLocation() âŒ No coordinate validation
    â†“
setManualLocation()
```

**Risk:** Search results have coords, but final validation missing

---

### Path 3: Current Location (Safe)
```
User taps "Use current location"
    â†“
useCandidateHandlers.handleUseCurrentLocationCandidate()
    â†“
buildSelectedLocation({ coords: currentLocation }) âœ… Coords attached
    â†“
commitLocation()
    â†“
handleSearchLocation() âŒ No coordinate validation
    â†“
setManualLocation()
```

**Risk:** Device location has coords, but final validation missing

---

### Path 4: Saved Location (Safe)
```
User selects saved location
    â†“
useCandidateHandlers.handleUseSavedLocation()
    â†“
mapStoredLocationToCandidate() âœ… Coords attached from saved
    â†“
commitLocation()
    â†“
handleSearchLocation() âŒ No coordinate validation
    â†“
setManualLocation()
```

**Risk:** Saved locations have coords, but final validation missing

---

### Path 5: Direct setManualLocation (UNSAFE)
```
setManualLocation({ location: { latitude: null, longitude: null } })
    â†“
No validation âŒ
    â†“
Provider discovery with invalid coords âŒ
```

**Risk:** HIGH - Direct assignment bypasses all validation

---

## Coordinate Validation Check

### Current Validation Points

| Location | Validation | Status |
|----------|------------|--------|
| `addressAssistService.resolveManualDraft()` | `Number.isFinite(lat) && Number.isFinite(lng)` | âœ… Present |
| `normalizeAddressCandidate()` | `Number.isFinite(lat) && Number.isFinite(lng)` | âœ… Present |
| `handleSearchLocation()` | `if (!nextLocation?.location) return` | âŒ Insufficient |
| `setManualLocation()` | None | âŒ Missing |
| `mapExploreFlow.store` reducer | None | âŒ Missing |

### Missing Validations

1. **Range validation:** No check that lat is -90 to 90, lng is -180 to 180
2. **Land validation:** No check that coordinates are on land (not in ocean)
3. **Precision validation:** No check for too many decimal places
4. **Geocode source tracking:** No flag to distinguish Mapbox vs OpenStreetMap vs manual entry

---

## Text-Only Prevention Analysis

### Can text-only locations reach provider discovery?

**YES** - Multiple paths:

1. **Direct setManualLocation call:**
   ```javascript
   setManualLocation({ 
     location: { latitude: null, longitude: null },
     source: "session_manual"
   })
   ```
   â†’ Passes through `handleSearchLocation` (only checks existence)
   â†’ Reaches `useHospitals` with invalid coordinates
   â†’ Provider discovery fails or uses wrong location

2. **Malformed geocode result:**
   ```javascript
   const geocoded = await addressAssistService.resolveManualDraft(address);
   // If geocode returns { latitude: NaN, longitude: NaN }
   // normalizeAddressCandidate accepts it (finite check passes NaN as false)
   // But if it returns { latitude: 0, longitude: 0 } (valid but wrong)
   ```
   â†’ Passes validation
   â†’ Reaches provider discovery with wrong coordinates

3. **Saved location without coords:**
   ```javascript
   // If saved location has { latitude: null, longitude: null }
   mapStoredLocationToCandidate(location)
   // Returns null if no coords âœ…
   // But caller might not check null
   ```
   â†’ Null check exists âœ…

---

## Geocoding State Tracking

### Current State
- No explicit "pending geocode" state for manual drafts
- No "geocode failed" state
- No "geocode weak" state (relevance < 0.4)

### Issues
- User can't distinguish between "geocoding in progress" vs "geocode failed"
- Weak geocode results (<0.4 relevance) treated same as strong results
- No way to retry geocoding after failure

---

## Recommendations

1. **Add coordinate validation to handleSearchLocation:**
   ```javascript
   const handleSearchLocation = useCallback((nextLocation) => {
     if (!nextLocation?.location) return;
     
     const lat = Number(nextLocation.location.latitude);
     const lng = Number(nextLocation.location.longitude);
     
     if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
       console.warn("[handleSearchLocation] Invalid coordinates", nextLocation);
       return;  // Reject text-only
     }
     
     if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
       console.warn("[handleSearchLocation] Coordinates out of range", nextLocation);
       return;  // Reject invalid ranges
     }
     
     setManualLocation({ ...nextLocation, source: nextSource });
   }, [...]);
   ```

2. **Add coordinate validation to setManualLocation reducer:**
   ```javascript
   SET_MANUAL_LOCATION: (state, { value }) => {
     if (value?.location) {
       const lat = Number(value.location.latitude);
       const lng = Number(value.location.longitude);
       if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
         console.warn("[SET_MANUAL_LOCATION] Invalid coordinates", value);
         return state;  // Reject
       }
     }
     return { ...state, manualLocation: value };
   }
   ```

3. **Add isGeocoded flag to pickup object:**
   ```javascript
   {
     location: { latitude, longitude },
     source: "session_manual",
     isGeocoded: true,
     geocodeRelevance: 0.95,
     geocodeSource: "mapbox",
   }
   ```

4. **Add geocode state tracking:**
   ```javascript
   // In manual draft state
   {
     geocodeStatus: "idle" | "pending" | "success" | "weak" | "failed",
     geocodeRelevance: number,
     geocodeSource: "mapbox" | "openstreetmap",
   }
   ```

---

## Validation Status

- [ ] Geocoding always called for manual entry
- [ ] Coordinates attached to pickup object
- [ ] Coordinates validated before setManualLocation
- [ ] Coordinates validated in handleSearchLocation
- [ ] Text-only locations rejected before provider discovery
- [ ] Coordinate range validation present
- [ ] isGeocoded flag on pickup object
- [ ] Geocode state tracking present

**Overall:** 2/8 checks pass - critical validation gaps found
