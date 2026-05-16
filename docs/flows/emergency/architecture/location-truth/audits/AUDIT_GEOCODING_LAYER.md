# Audit Round 2: Manual Address Geocoding Flow

**Date:** 2026-05-15  
**Scope:** Trace from text input → geocode → coordinates → pickup  
**Status:** COMPLETE

---

## Executive Summary

The manual address geocoding flow has a robust fallback mechanism (Mapbox → OpenStreetMap) and relevance scoring. However, the geocoded coordinates are NOT validated before becoming pickup, and there's no explicit "isGeocoded" flag on the pickup object.

**Critical Issue:** Text-only manual locations can bypass geocoding in some code paths, leading to provider discovery with invalid coordinates.

---

## Code Path Analysis

### Path: Manual Address Entry → Geocode → Candidate → Pickup

```
User enters address in LocationSheet
    ↓
useManualEntryHandlers.handleManualConfirm()
    ↓
addressAssistService.resolveManualDraft(address, { proximity, countryCode })
    ↓
mapboxService.geocodeAddress(address, { proximity, countryCode })
    ↓
If Mapbox fails: mapboxService.geocodeAddressWithOpenStreetMap(address)
    ↓
Returns: { latitude, longitude, formattedAddress, relevance, countryCode, source }
    ↓
If relevance < 0.4: weak result
    ↓
If geocode fails: try fallback address (city + adminArea + country)
    ↓
If still fails: show error "We couldn't place the pin yet"
    ↓
If succeeds: buildSelectedLocation({ source: "manual", coords, ... })
    ↓
useAddressCandidateController.buildCandidate()
    ↓
normalizeAddressCandidate({ ... })
    ↓
setActiveCandidate(normalized) - sets in Jotai atom (locationCandidateAtom)
    ↓
User confirms selection
    ↓
commitLocation(selectedLocation)
    ↓
mapCandidateToPickupPayload(selectedLocation)
    ↓
onSelectLocation(pickupPayload) - passed through MapSheetOrchestrator
    ↓
handleSearchLocation(nextLocation) in useMapLocation.js
    ↓
setManualLocation({ location, source: "session_manual" })
    ↓
mapExploreFlow store (reducer action SET_MANUAL_LOCATION)
    ↓
resolveMapPickupLocationTruth({ manualLocation })
    ↓
Returns: { activeLocation, source: "session_manual", ... }
```

**Key Files:**
- `hooks/map/locationIntent/useManualEntryHandlers.js` (lines 65-169)
- `services/addressAssistService.js` (lines 82-110)
- `services/mapboxService.js` (lines 102-196)
- `hooks/map/locationIntent/useAddressCandidateController.js` (lines 17-57)
- `services/locationAddressService.js` (lines 199-219)
- `hooks/map/locationIntent/useCandidateHandlers.js` (lines 56-72)
- `hooks/map/exploreFlow/useMapLocation.js` (lines 244-282)
- `hooks/map/state/mapExploreFlow.store.js` (lines 155-162, 337-338)

---

## Geocoding Service Analysis

### addressAssistService.resolveManualDraft()

**Input:** 
- `address` (string) - full address text
- `proximity` (optional) - { latitude, longitude } for regional bias
- `countryCode` (optional) - ISO country code

**Process:**
1. Call `mapboxService.geocodeAddress(address, { proximity, countryCode })`
2. Validate coordinates are finite
3. Extract relevance score (0.0-1.0 from Mapbox, 0.5 for Nominatim)
4. Return normalized result

**Output:**
```javascript
{
  latitude: 37.7749,
  longitude: -122.4194,
  formattedAddress: "123 Main St, San Francisco, CA",
  relevance: 0.95,
  countryCode: "US",
  source: "mapbox" | "openstreetmap"
}
```

**Issues:**
- No validation that coordinates are within valid ranges (-90 to 90 lat, -180 to 180 lng)
- No validation that coordinates are on land (not in ocean)
- No caching of geocode results
- No retry mechanism for transient failures

---

### mapboxService.geocodeAddress()

**Input:**
- `address` (string)
- `proximity` (optional) - { latitude, longitude }
- `countryCode` (optional)

**Process:**
1. Build Mapbox Geocoding API URL
2. Add proximity bias if provided
3. Add country filter if provided
4. Fetch from Mapbox API
5. Extract first feature
6. Return normalized coordinates

**Fallback:**
If Mapbox fails or no access token, calls `geocodeAddressWithOpenStreetMap()`

**Output:**
```javascript
{
  latitude: feature.center[1],
  longitude: feature.center[0],
  formatted_address: feature.place_name,
  relevance: feature.relevance,
  countryCode: extracted country code,
  feature: raw feature,
  source: "mapbox"
}
```

**Issues:**
- No timeout handling (relies on fetch default)
- No rate limiting protection
- No error classification (network vs API vs invalid input)

---

### mapboxService.geocodeAddressWithOpenStreetMap()

**Input:**
- `address` (string)
- `proximity` (optional) - NOT USED
- `countryCode` (optional)

**Process:**
1. Build Nominatim API URL
2. Add country code filter if provided
3. Fetch from OpenStreetMap Nominatim
4. Extract first result
5. Return normalized coordinates

**Output:**
```javascript
{
  latitude,
  longitude,
  formatted_address: display_name,
  countryCode,
  feature: raw feature,
  source: 'openstreetmap'
}
```

**Issues:**
- Proximity bias ignored (Nominatim doesn't support it)
- No relevance score (always treated as 0.5)
- No timeout handling
- No rate limiting protection

---

## Candidate Building Analysis

### buildSelectedLocation()

**Location:** Passed as prop from `useAddressCandidateController.buildCandidate`

**Input:**
```javascript
{
  source: "manual" | "search" | "saved" | "current" | "pin",
  label: "Home" | "Work" | "Manual pickup",
  address: "123 Main St",
  coords: { latitude, longitude },
  countryCode: "US",
  confidence: "high" | "medium" | "low",
  unit: "Apt 4B",
  responderNote: "Ring doorbell",
  pendingPlaceLabel: "home",
  pendingSaveCategory: "home"
}
```

**Process:**
1. Call `normalizeAddressCandidate()` from `locationAddressService`
2. Merge with manualDraft fields (unit, responderNote)
3. Merge with save flow fields (pendingPlaceLabel, pendingSaveCategory)
4. Set confidence based on geocode relevance

**Output:**
```javascript
{
  id: "candidate-uuid",
  label: "Home",
  address: "123 Main St",
  coords: { latitude, longitude },
  countryCode: "US",
  source: "manual",
  confidence: "medium",
  unit: "Apt 4B",
  responderNote: "Ring doorbell",
  pendingSaveCategory: "home"
}
```

**Issues:**
- No explicit `isGeocoded` flag
- No `geocodeRelevance` score preserved
- No `geocodeSource` (mapbox vs openstreetmap)
- No validation that coords are finite before normalization

---

### normalizeAddressCandidate()

**Location:** `services/locationAddressService`

**Process:**
1. Validate required fields (coords, label, address)
2. Normalize coords to finite numbers
3. Generate ID if missing
4. Set defaults for optional fields
5. Return normalized candidate

**Validation:**
- coords.latitude must be finite
- coords.longitude must be finite
- label must be non-empty string

**Issues:**
- No range validation (-90 to 90 lat, -180 to 180 lng)
- No land validation (reject ocean coordinates)
- No precision validation (too many decimal places)

---

## Pickup Commitment Analysis

### commitLocation()

**Location:** `hooks/map/locationIntent/useCandidateHandlers.js` (lines 56-72)

**Process:**
1. Call `mapCandidateToPickupPayload(selectedLocation)`
2. Call `onSelectLocation(pickupPayload)`
3. Add to recents if source is manual/search/recent/saved/visit/pin

**Output:**
```javascript
{
  primaryText: "Home",
  secondaryText: "123 Main St",
  formattedAddress: "123 Main St",
  location: { latitude, longitude },
  countryCode: "US",
  source: "manual"
}
```

**Issues:**
- No validation that coordinates are finite before commit
- No validation that coordinates are geocoded (not user-entered)
- No check for text-only locations (no coords)

---

### mapCandidateToPickupPayload()

**Location:** `services/locationAddressService.js` (lines 199-219)

**Process:**
1. Call `normalizeAddressCandidate(candidate)`
2. Extract fields for pickup payload
3. Return payload

**Output:**
```javascript
{
  primaryText: normalized.label,
  secondaryText: normalized.address,
  formattedAddress: normalized.address,
  location: normalized.coords,
  countryCode: normalized.countryCode,
  source: normalized.source
}
```

**Issues:**
- No explicit `isGeocoded` flag in payload
- No `geocodeRelevance` in payload
- No `geocodeSource` in payload

---

### handleSearchLocation()

**Location:** `hooks/map/exploreFlow/useMapLocation.js` (lines 244-282)

**Process:**
1. Validate nextLocation has location
2. Check for meaningful location change
3. Convert to emergency location format
4. Determine source
5. Call `setManualLocation({ location, source })`
6. Call `clearLocationScopedMapState()`
7. Build return sheet view

**Issues:**
- No validation that location has finite coordinates
- No validation that location is geocoded
- No check for text-only locations

---

## Critical Findings

### Finding 1: No Explicit Geocoding Validation
**Impact:** HIGH  
**Evidence:** No `isGeocoded` flag on pickup object, no check that coordinates came from geocoding service

### Finding 2: Text-Only Locations Can Reach Pickup
**Impact:** HIGH  
**Evidence:** `handleSearchLocation()` doesn't validate coordinates before setting manual location

### Finding 3: Relevance Score Not Preserved
**Impact:** MEDIUM  
**Evidence:** Geocode relevance (0.0-1.0) is used for confidence but not preserved in pickup payload

### Finding 4: No Coordinate Range Validation
**Impact:** MEDIUM  
**Evidence:** No validation that lat is -90 to 90, lng is -180 to 180

### Finding 5: No Land Validation
**Impact:** LOW  
**Evidence:** No check that coordinates are on land (not in ocean)

### Finding 6: Geocode Source Not Tracked
**Impact:** LOW  
**Evidence:** No distinction between Mapbox and OpenStreetMap results in pickup

---

## Recommendations for LOC-2

1. **Add isGeocoded flag to pickup object:**
   ```javascript
   {
     location: { latitude, longitude },
     source: "session_manual",
     isGeocoded: true,
     geocodeRelevance: 0.95,
     geocodeSource: "mapbox",
   }
   ```

2. **Validate coordinates before setManualLocation:**
   ```javascript
   const setManualLocationWithValidation = useCallback((location) => {
     if (location && !isValidCoordinate(location)) {
       console.warn("[setManualLocation] Invalid coordinates");
       return;
     }
     setManualLocation(location);
   }, [setManualLocation]);
   ```

3. **Prevent text-only pickup:**
   - `resolveMapPickupLocationTruth()` should reject manual locations without coordinates
   - If manual has text but no coords, trigger geocode before acceptance

4. **Add coordinate range validation:**
   ```javascript
   function isValidCoordinate(location) {
     const lat = Number(location?.latitude);
     const lng = Number(location?.longitude);
     return (
       Number.isFinite(lat) &&
       Number.isFinite(lng) &&
       lat >= -90 && lat <= 90 &&
       lng >= -180 && lng <= 180
     );
   }
   ```

5. **Add geocode retry logic:**
   - If geocode fails with low relevance (<0.4), offer user to place pin manually
   - If geocode fails completely, show specific error (not generic "location error")

---

## Next Steps

- **Audit Round 3:** Deep dive into provider discovery flow
- **LOC-2 Implementation:** Apply recommendations from this audit
