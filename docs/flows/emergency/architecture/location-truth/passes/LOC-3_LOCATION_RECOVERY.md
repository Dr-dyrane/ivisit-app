# LOC-3 Location Recovery

**Status:** 🟡 PENDING  
**Owner:** Map/Location Architecture  
**Layer Impact:** L5 (Jotai atom), L3 (Zustand)  
**Date:** 2026-05-15 (planned)  
**Depends on:** LOC-1  
**Risk Level:** 🟡 MEDIUM

---

## Goal

Classify location failures with specific CTAs (permission/GPS/timeout/stale).

---

## Read First

- [audits/AUDIT_LOCATION_RECOVERY.md](../audits/AUDIT_LOCATION_RECOVERY.md)
- [LOC-1_PICKUP_SOURCES.md](./LOC-1_PICKUP_SOURCES.md)

---

## Implementation

### Files To Modify
1. `contexts/GlobalLocationContext.jsx` (structured error setter)
2. `atoms/mapScreenAtoms.js` (new atom)
3. `components/map/FullScreenEmergencyMap.jsx` (consume new atom)

### Changes

```javascript
// 1. Add Jotai atom (atoms/mapScreenAtoms.js)
export const locationErrorDetailsAtom = atom(null); // NEW

// 2. Structured error setter (GlobalLocationContext.jsx)
const setStructuredLocationError = useCallback((type, message, metadata = {}) => {
  // Keep string for existing consumers (backward compatible)
  setLocationError(message);
  
  if (ENABLE_LOC_HARDENING_LOC3) {
    // NEW: Structured details for new consumers
    setLocationErrorDetails({
      type, // "permission_denied" | "gps_timeout" | "gps_stale" | "services_disabled" | "unknown"
      code: getErrorCode(type),
      message,
      canRetry: canRetryForError(type),
      retryAction: getRetryAction(type), // "request_permission" | "open_settings" | "manual_entry"
      manualEntryAllowed: manualEntryAllowedForError(type),
      isRecoverable: isRecoverableError(type),
      ...metadata,
    });
  }
}, []);

// 3. UI consumption (FullScreenEmergencyMap.jsx)
const errorDetails = useAtomValue(locationErrorDetailsAtom);
const displayError = errorDetails?.message || locationError;
const errorCTA = errorDetails 
  ? getErrorCTA(errorDetails) // Returns { label, action, icon }
  : { label: "Retry", action: requestLocationPermission };

// 4. Feature flag (default: existing behavior)
const ENABLE_LOC_HARDENING_LOC3 = false;
```

---

## Verification

- [ ] Flag off: `locationError` remains string, existing UI works
- [ ] Flag on: `errorDetails` present with type/classification
- [ ] Permission denied shows "Open Settings" CTA
- [ ] GPS timeout shows "Retry" or "Use Manual Entry" CTA
- [ ] Services disabled shows "Enable Location Services" CTA

---

## Rollback

```bash
# Option 1: Revert commit
git revert <commit-hash> --no-edit

# Option 2: Disable flag
# Set ENABLE_LOC_HARDENING_LOC3 = false
```

---

## Notes

- PULLBACK NOTE: `// PULLBACK NOTE: LOC-3 // OLD: string error // NEW: string + structured atom`
- Additive only — string `locationError` preserved
- UI components check for `errorDetails` first, fall back to `locationError`
- Type-safe error classification enables specific CTAs
