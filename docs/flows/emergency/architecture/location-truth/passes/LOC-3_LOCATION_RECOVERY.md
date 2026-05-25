---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# LOC-3 Location Recovery

**Status:** ✅ COMPLETE  
**Owner:** Map/Location Architecture  
**Layer Impact:** L3 (Zustand), L5 (Jotai)  
**Date:** 2026-05-15  
**Depends on:** None  
**Risk Level:** 🔴 High
**Baseline:** `TBD`  
**Commit:** `TBD`

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

- [x] Flag off: `locationError` remains string, existing UI works
- [x] Flag on: `errorDetails` present with type/classification
- [x] Permission denied shows "Open Settings" CTA
- [x] GPS timeout shows "Retry" or "Use Manual Entry" CTA
- [x] Services disabled shows "Enable Location Services" CTA

---

## Rollback

```bash
# Option 1: Revert commit
git revert <commit-hash> --no-edit

# Option 2: Disable flag
# Set ENABLE_LOC_HARDENING_LOC3 = false
```

---

## Implementation Summary

**Files Changed:**
- `atoms/mapScreenAtoms.js` - Added `locationErrorDetailsAtom`
- `contexts/GlobalLocationContext.jsx` - Added LOC-3 error classification

**Functions Added:**
- `classifyLocationError(error)` - Maps error strings to error types
- `LOCATION_ERROR_ACTIONS` - Type-specific CTAs

## Notes

- PULLBACK NOTE: `// PULLBACK NOTE: LOC-3 // OLD: string error // NEW: errorType + CTA`
- Fallback hierarchy: GPS → Demo Bootstrap → Manual
- Provides foundation for LOC-6 GPS quality warnings
