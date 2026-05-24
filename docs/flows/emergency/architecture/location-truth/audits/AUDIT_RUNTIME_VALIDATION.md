> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# LOC-6 Granular Audit: Runtime Validation

**Date:** 2026-05-15  
**Scope:** Verify GPS, permission, manual pickup, Places conversion scenarios  
**Status:** IN PROGRESS

---

## Requirement Checklist

### 1. Verify GPS scenario ✅
**Requirement:** GPS location should be used when available and valid

**Current State:**
```javascript
// contexts/GlobalLocationContext.jsx
const hasPreciseDeviceLocation = Boolean(
  userLocation?.latitude &&
    userLocation?.longitude &&
    locationSource === "device",
);
```

**Issues Found:**
- GPS location checked ✅
- BUT: No validation that GPS location is fresh (age check)
- BUT: No validation that GPS location has acceptable accuracy
- BUT: No validation that GPS location is within valid ranges
- BUT: No retry mechanism for stale GPS location

**Impact:** MEDIUM - GPS used but freshness/accuracy not validated

---

### 2. Verify permission scenario ✅
**Requirement:** Permission denied should trigger specific CTA (Open Settings)

**Current State:**
```javascript
// components/map/FullScreenEmergencyMap.jsx
if (locationError) {
  return (
    <Pressable onPress={requestLocationPermission}>
      Retry
    </Pressable>
  );
}
```

**Issues Found:**
- **CRITICAL:** Permission denied shows "Retry" instead of "Open Settings"
- **CRITICAL:** No check for permission status before showing CTA
- **CRITICAL:** No distinction between permission denied vs services disabled
- **CRITICAL:** No deep link to iOS Settings for location

**Impact:** HIGH - Wrong CTA for permission denied

---

### 3. Verify manual pickup scenario ✅
**Requirement:** Manual pickup should be geocoded and validated before use

**Current State:**
```javascript
// hooks/map/locationIntent/useManualEntryHandlers.js
const handleManualConfirm = useCallback(async () => {
  const geocoded = await addressAssistService.resolveManualDraft(address, {
    countryCode: manualDraft.countryCode || undefined,
    proximity: locationBias || undefined,
  });
  // ... no coordinate validation ...
  setActiveCandidate(normalized);
}, [...]);
```

**Issues Found:**
- Geocoding called ✅
- BUT: No validation that geocoding succeeded (null check)
- BUT: No validation that coordinates are finite
- BUT: No validation that coordinates are in valid ranges
- BUT: No retry for weak geocode results (<0.4 relevance)

**Impact:** HIGH - Manual pickup can have invalid coordinates

---

### 4. Verify Places conversion scenario ✅
**Requirement:** Places results should be marked and rendered separately

**Current State:**
```javascript
// services/hospitalsService.js
const importedFromGoogle = h?.google_only === true;
const importedFromMapbox = h?.mapbox_only === true;
```

**Issues Found:**
- Flags exist ✅
- BUT: No validation that Places have coordinates
- BUT: No validation that Places are within search radius
- BUT: No validation that Places are not duplicates of DB hospitals
- BUT: No validation that Places have required fields (name, address, phone)

**Impact:** MEDIUM - Places can be invalid or duplicate

---

## Scenario Analysis

### Scenario 1: GPS Available and Valid

**User Flow:**
1. User opens app
2. GPS permission granted
3. GPS location returned: 37.7749, -122.4194
4. Location source: "device"
5. Provider discovery uses GPS location

**Expected Behavior:**
- GPS location used as pickup
- Provider discovery uses GPS coordinates
- Hospitals sorted by distance from GPS

**Current Behavior:**
- GPS location used as pickup ✅
- Provider discovery uses GPS coordinates ✅
- Hospitals sorted by distance ✅
- **GAP:** No GPS freshness check
- **GAP:** No GPS accuracy check

**Test Case:**
```javascript
// GPS location is 1 hour old
// Expected: Refresh GPS or show stale warning
// Actual: Uses stale GPS without warning
```

---

### Scenario 2: GPS Permission Denied

**User Flow:**
1. User opens app
2. GPS permission requested
3. User denies permission
4. Location source: "denied"
5. User must enter manual address

**Expected Behavior:**
- Show "Open Settings" CTA
- Show "Enter Address Manually" CTA
- Block GPS-based provider discovery
- Allow manual address entry

**Current Behavior:**
- Shows "Retry" CTA ❌
- No "Enter Address Manually" CTA ❌
- Uses fallback location ❌
- Allows manual address entry ✅

**Test Case:**
```javascript
// Permission denied
// Expected CTA: "Open Settings"
// Actual CTA: "Retry" (wrong action)
```

---

### Scenario 3: Manual Address Entry

**User Flow:**
1. User taps "Enter address manually"
2. User types "123 Main St, San Francisco, CA"
3. User taps "Confirm"
4. Geocoding resolves to 37.7749, -122.4194
5. Manual pickup set with coordinates

**Expected Behavior:**
- Geocoding called with address
- Coordinates validated (finite, in range)
- Manual pickup set with coordinates
- Provider discovery uses manual coordinates

**Current Behavior:**
- Geocoding called ✅
- Coordinates not validated ❌
- Manual pickup set ✅
- Provider discovery uses manual coordinates ✅

**Test Case:**
```javascript
// Geocoding returns NaN, NaN
// Expected: Show error, retry
// Actual: Sets NaN, NaN as coordinates
```

---

### Scenario 4: Places Discovery

**User Flow:**
1. User at location 37.7749, -122.4194
2. Provider discovery called
3. Mapbox Places API returns "General Hospital" at 37.775, -122.418
4. Google Places API returns "Urgent Care" at 37.776, -122.417
5. DB returns "City Hospital" at 37.774, -122.419

**Expected Behavior:**
- Places marked with source flags
- Places rendered in separate lane
- Duplicates removed
- Places validated (coordinates, required fields)

**Current Behavior:**
- Places marked with source flags ✅
- Places mixed with DB hospitals ❌
- Duplicates not removed ❌
- Places not validated ❌

**Test Case:**
```javascript
// Mapbox Place without coordinates
// Expected: Reject or geocode
// Actual: Included in list without coords
```

---

## Validation Gap Analysis

### Missing Validations

| Validation Point | Current Check | Missing Check |
|------------------|---------------|---------------|
| GPS freshness | None | Age check (<5 minutes) |
| GPS accuracy | None | Accuracy threshold (<100m) |
| GPS range | None | Lat -90 to 90, lng -180 to 180 |
| Permission status | None | Denied vs disabled distinction |
| Manual geocode success | Null check | Coordinate validation |
| Manual coordinate range | None | Lat -90 to 90, lng -180 to 180 |
| Places coordinates | None | Finite check |
| Places required fields | None | Name, address, phone validation |
| Places duplicates | None | Name/location deduplication |
| Cache key source | None | Source in cache key |

---

## Runtime Error Scenarios

### Scenario 1: GPS Returns Invalid Coordinates

**Error:** GPS returns { latitude: 999, longitude: 999 }

**Current Behavior:**
- Location set as-is
- Provider discovery uses invalid coords
- Likely API error or empty results

**Expected Behavior:**
- Validate coordinate ranges
- Reject invalid GPS
- Show "GPS signal unavailable" error
- Offer manual entry

---

### Scenario 2: Geocoding Returns Null

**Error:** Geocoding fails, returns null

**Current Behavior:**
- Null check exists
- Shows error message
- Allows retry

**Expected Behavior:**
- ✅ Current behavior is correct
- Add specific error message (geocode failed vs network error)

---

### Scenario 3: Cache Collision

**Error:** Manual and GPS at same coordinates share cache

**Current Behavior:**
- Manual hospitals cached
- GPS fetch returns manual hospitals
- Wrong hospital list for GPS

**Expected Behavior:**
- Include source in cache key
- Separate manual and GPS caches
- No cache collisions

---

### Scenario 4: Place Without Coordinates

**Error:** Mapbox Place returns { name: "Hospital", latitude: null, longitude: null }

**Current Behavior:**
- Place included in list
- No coordinates for distance calculation
- Likely sorting errors

**Expected Behavior:**
- Validate Place has coordinates
- Reject or geocode Place
- Don't include invalid Places

---

## Recommendations

1. **Add GPS freshness check:**
   ```javascript
   const GPS_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
   
   const isGPSFresh = (location, timestamp) => {
     if (!timestamp) return false;
     return Date.now() - timestamp < GPS_MAX_AGE_MS;
   };
   
   if (!isGPSFresh(userLocation, lastUpdated)) {
     setLocationError("Location is stale, refreshing...");
     refreshLocation();
   }
   ```

2. **Add GPS accuracy check:**
   ```javascript
   const GPS_MIN_ACCURACY_METERS = 100;
   
   const isGPSAccurate = (location) => {
     const accuracy = location?.coords?.accuracy;
     return accuracy === null || accuracy < GPS_MIN_ACCURACY_METERS;
   };
   ```

3. **Add permission-specific CTAs:**
   ```javascript
   const getPermissionCTA = (status) => {
     switch (status) {
       case "denied":
         return { label: "Open Settings", action: openLocationSettings };
       case "services_disabled":
         return { label: "Enable Location Services", action: openLocationSettings };
       default:
         return { label: "Retry", action: requestLocationPermission };
     }
   };
   ```

4. **Add manual coordinate validation:**
   ```javascript
   const validateManualCoordinates = (coords) => {
     const lat = Number(coords?.latitude);
     const lng = Number(coords?.longitude);
     
     if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
       throw new Error("Invalid coordinates");
     }
     
     if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
       throw new Error("Coordinates out of range");
     }
     
     return { latitude: lat, longitude: lng };
   };
   ```

5. **Add Places validation:**
   ```javascript
   const validatePlace = (place) => {
     const coords = validateManualCoordinates(place);
     
     if (!place?.name || !place?.address) {
       throw new Error("Place missing required fields");
     }
     
     return { ...place, ...coords };
   };
   ```

6. **Add Places deduplication:**
   ```javascript
   const deduplicatePlaces = (places, dbHospitals) => {
     const seen = new Set();
     
     return places.filter(place => {
       const key = `${place.name}:${place.latitude}:${place.longitude}`;
       if (seen.has(key)) return false;
       seen.add(key);
       return true;
     });
   };
   ```

---

## Validation Status

- [ ] GPS freshness check
- [ ] GPS accuracy check
- [ ] GPS coordinate range validation
- [ ] Permission-specific CTAs
- [ ] Manual coordinate validation
- [ ] Manual coordinate range validation
- [ ] Places coordinate validation
- [ ] Places required fields validation
- [ ] Places deduplication
- [ ] Cache key source validation

**Overall:** 0/10 checks pass - no runtime validation exists
