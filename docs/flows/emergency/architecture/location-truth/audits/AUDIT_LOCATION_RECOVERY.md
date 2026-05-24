---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# LOC-3 Granular Audit: Location Failure Recovery

**Date:** 2026-05-15  
**Scope:** Verify failure classification, specific CTAs  
**Status:** IN PROGRESS

---

## Requirement Checklist

### 1. Classify location failures âœ…
**Requirement:** Distinguish between permission/GPS/timeout/stale/missing failures

**Current State:**
```javascript
// contexts/GlobalLocationContext.jsx
const [locationPermissionStatus, setLocationPermissionStatus] = useState("undetermined");
const [locationError, setLocationError] = useState(null);
const [locationSource, setLocationSource] = useState("unknown");
```

**Location Permission Status Values:**
- "undetermined" - initial state
- "granted" - permission granted
- "denied" - permission denied
- "services_disabled" - location services disabled

**Location Source Values:**
- "unknown" - initial state
- "device" - GPS location
- "stored_fallback" - saved location fallback
- "manual_fallback" - saved manual fallback
- "location_unavailable" - location failed

**Issues Found:**
- **CRITICAL:** No explicit "GPS timeout" classification
- **CRITICAL:** No explicit "GPS stale" classification (old location)
- **CRITICAL:** No explicit "GPS unavailable" classification (no signal)
- **CRITICAL:** `locationError` is just a string - no structured error type
- **CRITICAL:** No error code or enum for failure types
- Permission status and location source are separate - not unified failure classification

**Impact:** HIGH - Cannot distinguish between different failure types for specific CTAs

---

### 2. Add specific CTAs for each failure type âœ…
**Requirement:** Each failure type should have a specific recovery action

**Current State:**
```javascript
// components/map/FullScreenEmergencyMap.jsx
if (locationError) {
  return (
    <View>
      <Text>{locationError}</Text>
      <Pressable onPress={requestLocationPermission}>
        Retry
      </Pressable>
    </View>
  );
}
```

**Issues Found:**
- **CRITICAL:** Single generic "Retry" button for all failures
- **CRITICAL:** Permission denied should show "Open Settings" not "Retry"
- **CRITICAL:** Services disabled should show "Enable Location Services"
- **CRITICAL:** GPS timeout should show "Retry GPS" (different from permission retry)
- **CRITICAL:** Stale location should show "Refresh Location"
- **CRITICAL:** No CTA for manual entry when GPS fails

**Impact:** HIGH - Users get wrong recovery action for their specific failure

---

## Failure Type Analysis

### Current Failure States

| Failure Type | Current Representation | CTA | Status |
|-------------|----------------------|-----|--------|
| Permission denied | `locationPermissionStatus === "denied"` | "Retry" | âŒ Wrong CTA |
| Services disabled | `locationPermissionStatus === "services_disabled"` | "Retry" | âŒ Wrong CTA |
| GPS timeout | Not classified | "Retry" | âŒ Not distinguished |
| GPS stale | Not classified | "Retry" | âŒ Not distinguished |
| GPS unavailable | `locationSource === "location_unavailable"` | "Retry" | âŒ Generic CTA |
| No location at all | `locationSource === "unknown"` | "Retry" | âŒ Generic CTA |

### Missing Failure Classifications

1. **GPS Timeout** - Location request timed out (no response in X seconds)
2. **GPS Stale** - Location is too old (> MAX_AGE)
3. **GPS Unavailable** - No GPS signal (indoors, airplane mode)
4. **GPS Low Accuracy** - Location has low accuracy (> ACCURACY threshold)
5. **Network Error** - Failed to fetch location due to network issue

---

## CTA Analysis

### Current CTAs

| Current CTA | When Shown | Correct? |
|-------------|------------|----------|
| "Retry" | All failures | âŒ No |
| "Open Settings" | Never | âŒ Missing |
| "Enable Location Services" | Never | âŒ Missing |
| "Enter Address Manually" | Never | âŒ Missing |
| "Refresh Location" | Never | âŒ Missing |

### Required CTAs by Failure Type

| Failure Type | Required CTA | Current CTA |
|-------------|--------------|-------------|
| Permission denied | Open Settings | Retry âŒ |
| Services disabled | Enable Location Services | Retry âŒ |
| GPS timeout | Retry GPS | Retry âš ï¸ (close but not specific) |
| GPS stale | Refresh Location | Retry âŒ |
| GPS unavailable | Enter Address Manually | Retry âŒ |
| GPS low accuracy | Retry GPS | Retry âš ï¸ |
| Network error | Retry GPS | Retry âš ï¸ |
| No location at all | Enter Address Manually | Retry âŒ |

---

## Error Message Analysis

### Current Error Messages

```javascript
// GlobalLocationContext.jsx
setLocationError(errorMessage);  // Generic string
```

**Issues:**
- Error messages are generic strings
- No structured error object with type, code, message
- No way to programmatically determine error type from message
- No localized error messages

### Required Error Structure

```javascript
{
  type: "permission_denied" | "services_disabled" | "gps_timeout" | "gps_stale" | "gps_unavailable" | "gps_low_accuracy" | "network_error",
  code: string,  // e.g., "LOC_ERR_001"
  message: string,  // User-facing message
  canRetry: boolean,
  retryAction: "request_permission" | "retry_gps" | "open_settings" | "enable_services" | "enter_manual",
  manualEntryAllowed: boolean,
}
```

---

## Code Path Analysis

### Error Setting Locations

1. **GlobalLocationContext.setLocationError()**
   - Called when location request fails
   - Sets generic string error
   - No error classification

2. **useMapLocation.locationError**
   - Passed from GlobalLocationContext
   - Displayed in FullScreenEmergencyMap
   - No error classification

3. **MapSearchSheetSections.locationError**
   - Passed from useMapSearchSheetModel
   - Displayed in search sheet
   - No error classification

### Error Display Locations

1. **FullScreenEmergencyMap.jsx (line 702-728)**
   - Shows generic error message
   - Shows generic "Retry" button
   - Calls `requestLocationPermission` on retry

2. **MapSearchSheetSections.jsx (line 662-666)**
   - Shows generic error message
   - No CTA
   - No retry action

3. **MapExploreIntentHospitalSummaryCard.jsx (line 165-167)**
   - Shows generic location hint
   - No error classification
   - No CTA

---

## Recommendations

1. **Create error classification enum:**
   ```javascript
   export const LOCATION_ERROR_TYPES = {
     PERMISSION_DENIED: "permission_denied",
     SERVICES_DISABLED: "services_disabled",
     GPS_TIMEOUT: "gps_timeout",
     GPS_STALE: "gps_stale",
     GPS_UNAVAILABLE: "gps_unavailable",
     GPS_LOW_ACCURACY: "gps_low_accuracy",
     NETWORK_ERROR: "network_error",
     UNKNOWN: "unknown",
   };
   ```

2. **Create structured error object:**
   ```javascript
   {
     type: LOCATION_ERROR_TYPES.PERMISSION_DENIED,
     code: "LOC_ERR_001",
     message: "Location permission is required",
     canRetry: false,
     retryAction: "open_settings",
     manualEntryAllowed: true,
   }
   ```

3. **Add error classification in GlobalLocationContext:**
   ```javascript
   const [locationError, setLocationError] = useState(null);
   
   const setLocationErrorWithType = useCallback((type, message) => {
     setLocationError({
       type,
       code: getErrorCode(type),
       message,
       canRetry: canRetryForError(type),
       retryAction: getRetryAction(type),
       manualEntryAllowed: manualEntryAllowedForError(type),
     });
   }, []);
   ```

4. **Add specific CTAs in FullScreenEmergencyMap:**
   ```javascript
   const getErrorCTA = (error) => {
     switch (error.type) {
       case LOCATION_ERROR_TYPES.PERMISSION_DENIED:
         return { label: "Open Settings", action: openLocationSettings };
       case LOCATION_ERROR_TYPES.SERVICES_DISABLED:
         return { label: "Enable Location Services", action: openLocationSettings };
       case LOCATION_ERROR_TYPES.GPS_TIMEOUT:
       case LOCATION_ERROR_TYPES.GPS_STALE:
       case LOCATION_ERROR_TYPES.GPS_UNAVAILABLE:
       case LOCATION_ERROR_TYPES.GPS_LOW_ACCURACY:
       case LOCATION_ERROR_TYPES.NETWORK_ERROR:
         return { label: "Retry", action: requestLocationPermission };
       default:
         return { label: "Enter Address Manually", action: openManualEntry };
     }
   };
   ```

5. **Add manual entry CTA when GPS fails:**
   ```javascript
   if (error.manualEntryAllowed) {
     return (
       <Pressable onPress={openManualEntry}>
         Enter Address Manually
       </Pressable>
     );
   }
   ```

---

## Validation Status

- [ ] Failure types classified with enum
- [ ] Structured error object with type/code/message
- [ ] Permission denied has "Open Settings" CTA
- [ ] Services disabled has "Enable Location Services" CTA
- [ ] GPS timeout has "Retry GPS" CTA
- [ ] GPS stale has "Refresh Location" CTA
- [ ] GPS unavailable has "Enter Address Manually" CTA
- [ ] Manual entry available when GPS fails

**Overall:** 0/8 checks pass - no failure classification or specific CTAs exist
