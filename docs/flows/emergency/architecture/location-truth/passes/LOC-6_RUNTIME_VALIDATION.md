# LOC-6 Runtime Validation

**Status:** 🟡 PENDING  
**Owner:** Map/Location Architecture  
**Layer Impact:** L3 (Zustand), L5 (Jotai)  
**Date:** 2026-05-15 (planned)  
**Depends on:** LOC-1, LOC-2  
**Risk Level:** 🟡 MEDIUM

---

## Goal

Add GPS freshness, accuracy, and permission validation with warnings (not blocks).

---

## Read First

- [audits/AUDIT_RUNTIME_VALIDATION.md](../audits/AUDIT_RUNTIME_VALIDATION.md)
- [LOC-1_PICKUP_SOURCES.md](./LOC-1_PICKUP_SOURCES.md)
- [LOC-2_MANUAL_ADDRESS.md](./LOC-2_MANUAL_ADDRESS.md)

---

## Implementation

### Files To Modify
1. `contexts/GlobalLocationContext.jsx` (assessGPSQuality)
2. `hooks/map/exploreFlow/useMapLocation.js` (show warnings)
3. `components/map/surfaces/MapExploreLoadingOverlay.jsx` (render warnings)

### Changes

```javascript
// 1. GPS quality assessment (GlobalLocationContext.jsx)
const GPS_WARN_ACCURACY_METERS = 100;
const GPS_WARN_AGE_MS = 5 * 60 * 1000;

const assessGPSQuality = (location) => {
  const accuracy = location?.coords?.accuracy;
  const age = Date.now() - (location?.timestamp || 0);
  
  const warnings = [];
  if (accuracy && accuracy > GPS_WARN_ACCURACY_METERS) {
    warnings.push({
      type: "low_accuracy",
      message: "Location accuracy is low. Move outdoors if possible.",
      severity: "warning",
    });
  }
  if (age > GPS_WARN_AGE_MS) {
    warnings.push({
      type: "stale",
      message: "Location may be outdated. Refreshing...",
      severity: "info",
    });
  }
  
  return {
    isValid: Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude),
    accuracy,
    age,
    warnings,
    quality: warnings.length === 0 ? "high" : 
            warnings.some(w => w.severity === "error") ? "poor" : "fair",
  };
};

// 2. Show warnings in UI (useMapLocation.js)
const gpsQuality = useMemo(() => assessGPSQuality(userLocation), [userLocation]);

const locationControl = useMemo(() => ({
  // ... existing fields
  gpsQuality: ENABLE_LOC_HARDENING_LOC6 ? gpsQuality : null,
  hasGPSWarning: ENABLE_LOC_HARDENING_LOC6 ? gpsQuality.warnings.length > 0 : false,
}), [...]);

// 3. Render warning banner (MapExploreLoadingOverlay.jsx or nearby)
{ENABLE_LOC_HARDENING_LOC6 && gpsQuality?.warnings.length > 0 && (
  <LocationWarningBanner 
    warning={gpsQuality.warnings[0]}
    onRefresh={refreshLocation}
  />
)}

// 4. Retry logic for weak signals (GlobalLocationContext.jsx)
const getCurrentLocationWithRetry = async () => {
  const result = await getCurrentLocationAsync();
  const quality = assessGPSQuality(result);
  
  if (ENABLE_LOC_HARDENING_LOC6 && quality.quality === "poor") {
    await new Promise(r => setTimeout(r, 500));
    const retryResult = await getCurrentLocationAsync();
    return retryResult; // Return best available
  }
  
  return result;
};

// 5. Feature flag (default: existing behavior)
const ENABLE_LOC_HARDENING_LOC6 = false;
```

---

## Verification

- [ ] Flag off: no GPS quality warnings shown
- [ ] Flag on: warnings appear for low accuracy (>100m)
- [ ] Flag on: warnings appear for stale location (>5 min)
- [ ] One automatic retry for poor quality signals
- [ ] User never blocked — only warned
- [ ] No performance regression in location fetching

---

## Rollback

```bash
# Option 1: Revert commit
git revert <commit-hash> --no-edit

# Option 2: Disable flag
# Set ENABLE_LOC_HARDENING_LOC6 = false
```

---

## Notes

- PULLBACK NOTE: `// PULLBACK NOTE: LOC-6 // OLD: no quality check // NEW: assessGPSQuality with warnings`
- Warnings, not rejections — never block user
- Uses LOC-1 source classification for context
- Builds on LOC-2 validation patterns
