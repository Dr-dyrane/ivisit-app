# LOC-2 Granular Audit: Manual Address Coordinate Resolution

**Date:** 2026-05-15  
**Scope:** Verify geocoding, pickup attachment, text-only prevention  
**Status:** IN PROGRESS

---

## Requirement Checklist

### 1. Verify geocoding is always called for manual addresses ✅
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
- Geocoding IS called in `handleManualConfirm` ✅
- Fallback geocoding with partial address if primary fails ✅
- BUT: `setManualLocation()` can be called directly without geocoding (see below)

**Impact:** MEDIUM - Geocoding exists in manual entry flow, but bypass possible

---

### 2. Verify coordinates are attached to pickup object ✅
**Requirement:** Pickup object must have latitude/longitude from geocoding

**Current State:**
```javascript
// hooks/map/locationIntent/useManualEntryHandlers.js
const normalized = buildSelectedLocation({
  source: "manual",
  label,
  address: geocoded.formattedAddress || address,
  coords: { latitude, longitude },  // ✅ Coords attached
  countryCode: geocoded.countryCode || manualDraft.countryCode || null,
});
```

**Issues Found:**
- Coordinates ARE attached to candidate ✅
- BUT: No validation that coordinates are finite before attachment
- BUT: No validation that coordinates are in valid ranges (-90 to 90 lat, -180 to 180 lng)

**Impact:** MEDIUM - Coordinates attached, but not validated

---

### 3. Verify text-only discovery is prevented ✅
**Requirement:** Provider discovery should reject text-only locations

**Current State:**
```javascript
// hooks/map/exploreFlow/useMapLocation.js
const handleSearchLocation = useCallback((nextLocation) => {
  if (!nextLocation?.location) return;  // ❌ Only checks existence, not coordinates
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
    ↓
useManualEntryHandlers.handleManualConfirm()
    ↓
addressAssistService.resolveManualDraft() ✅ Geocoding
    ↓
buildSelectedLocation({ coords: { lat, lng } }) ✅ Coords attached
    ↓
setActiveCandidate(normalized)
    ↓
commitLocation()
    ↓
handleSearchLocation() ❌ No coordinate validation
    ↓
setManualLocation()
```

**Risk:** Geocoding happens, but final validation missing

---

### Path 2: Search Selection (Safe)
```
User selects from search results
    ↓
useCandidateHandlers.handleSearchResultSelect()
    ↓
buildSelectedLocation({ coords: { lat, lng } }) ✅ Coords attached from search
    ↓
commitLocation()
    ↓
handleSearchLocation() ❌ No coordinate validation
    ↓
setManualLocation()
```

**Risk:** Search results have coords, but final validation missing

---

### Path 3: Current Location (Safe)
```
User taps "Use current location"
    ↓
useCandidateHandlers.handleUseCurrentLocationCandidate()
    ↓
buildSelectedLocation({ coords: currentLocation }) ✅ Coords attached
    ↓
commitLocation()
    ↓
handleSearchLocation() ❌ No coordinate validation
    ↓
setManualLocation()
```

**Risk:** Device location has coords, but final validation missing

---

### Path 4: Saved Location (Safe)
```
User selects saved location
    ↓
useCandidateHandlers.handleUseSavedLocation()
    ↓
mapStoredLocationToCandidate() ✅ Coords attached from saved
    ↓
commitLocation()
    ↓
handleSearchLocation() ❌ No coordinate validation
    ↓
setManualLocation()
```

**Risk:** Saved locations have coords, but final validation missing

---

### Path 5: Direct setManualLocation (UNSAFE)
```
setManualLocation({ location: { latitude: null, longitude: null } })
    ↓
No validation ❌
    ↓
Provider discovery with invalid coords ❌
```

**Risk:** HIGH - Direct assignment bypasses all validation

---

## Coordinate Validation Check

### Current Validation Points

| Location | Validation | Status |
|----------|------------|--------|
| `addressAssistService.resolveManualDraft()` | `Number.isFinite(lat) && Number.isFinite(lng)` | ✅ Present |
| `normalizeAddressCandidate()` | `Number.isFinite(lat) && Number.isFinite(lng)` | ✅ Present |
| `handleSearchLocation()` | `if (!nextLocation?.location) return` | ❌ Insufficient |
| `setManualLocation()` | None | ❌ Missing |
| `mapExploreFlow.store` reducer | None | ❌ Missing |

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
   → Passes through `handleSearchLocation` (only checks existence)
   → Reaches `useHospitals` with invalid coordinates
   → Provider discovery fails or uses wrong location

2. **Malformed geocode result:**
   ```javascript
   const geocoded = await addressAssistService.resolveManualDraft(address);
   // If geocode returns { latitude: NaN, longitude: NaN }
   // normalizeAddressCandidate accepts it (finite check passes NaN as false)
   // But if it returns { latitude: 0, longitude: 0 } (valid but wrong)
   ```
   → Passes validation
   → Reaches provider discovery with wrong coordinates

3. **Saved location without coords:**
   ```javascript
   // If saved location has { latitude: null, longitude: null }
   mapStoredLocationToCandidate(location)
   // Returns null if no coords ✅
   // But caller might not check null
   ```
   → Null check exists ✅

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
