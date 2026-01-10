# Emergency Screen Refactoring Plan

**Last Audit Date**: 2026-01-10  
**Status**: Comprehensive audit completed | Ready for implementation  
**Priority**: Medium-High  

---

## Executive Summary

The Emergency Screen has been extensively refactored with real-time data synchronization and proper Supabase integration. However, a **final audit identified 4 critical issues** that need to be addressed to ensure stability and maintainability. This document provides a detailed implementation roadmap.

---

## Current State Analysis

### ✅ What's Working Well

1. **Real-time Data Synchronization**
   - Visits sync via `useVisitsData` hook with Supabase subscriptions
   - Notifications sync via `useNotificationsData` hook with Supabase subscriptions
   - UI automatically updates when database records change

2. **Request → Visit → Notification Lifecycle**
   - Request status properly tracked in Supabase
   - Visits created and updated correctly
   - Notifications generated and persisted

3. **Map Integration**
   - Hospital selection and zoom working
   - Route calculation for ambulances
   - Proper padding calculations for bottom sheet

4. **Separation of Concerns**
   - EmergencyContext: Data state (hospitals, trips, bookings)
   - EmergencyUIContext: UI state (animations, snapping, search)
   - Proper hook-based architecture

---

## Identified Issues & Fixes

### Issue 1: Missing `addNotification` Import ⚠️ CRITICAL

**Location**: `EmergencyScreen.jsx` lines 538, 562  
**Severity**: Critical - Runtime Error

**Problem**:
```javascript
// Line 538: Used but not imported
addNotification({
    id: `bed_cancel_${activeBedBooking.requestId}`,
    type: NOTIFICATION_TYPES.APPOINTMENT,
    // ...
});
```

**Current Impact**: Would throw `ReferenceError: addNotification is not defined` at runtime

**Solution**:
```javascript
// Add to imports at top of EmergencyScreen.jsx
import { useNotifications } from "../contexts/NotificationsContext";

// Add to hook calls in component
const { addNotification } = useNotifications();
```

**Why This Works**: `useNotifications` is already exported from NotificationsContext and properly provides `addNotification` function

---

### Issue 2: Race Conditions in Completion Handlers ⚠️ HIGH PRIORITY

**Location**: `EmergencyScreen.jsx` lines 518-578  
**Severity**: High - Data Loss Risk

**Problem**: Handlers call async functions without awaiting:
```javascript
// Line 518: onCompleteAmbulanceTrip
onCompleteAmbulanceTrip={() => {
    if (activeAmbulanceTrip?.requestId) {
        setRequestStatus(activeAmbulanceTrip.requestId, EmergencyRequestStatus.COMPLETED);
        completeVisit(activeAmbulanceTrip.requestId);  // ❌ Not awaited
    }
    stopAmbulanceTrip();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);  // ❌ Executes before async operations complete
}}
```

**Why It's a Problem**:
1. `setRequestStatus()` and `completeVisit()` are async operations
2. Without awaiting, they may not complete before UI state changes
3. setTimeout executes immediately instead of after database updates
4. Creates race condition: UI state clears before data is saved

**Solution - Make Handlers Async**:
```javascript
// Before
onCompleteAmbulanceTrip={() => {
    // ...
}}

// After
onCompleteAmbulanceTrip={async () => {
    if (activeAmbulanceTrip?.requestId) {
        try {
            await Promise.all([
                setRequestStatus(activeAmbulanceTrip.requestId, EmergencyRequestStatus.COMPLETED),
                completeVisit(activeAmbulanceTrip.requestId)
            ]);
        } catch (err) {
            console.error('[EmergencyScreen] Complete trip error:', err);
        }
    }
    stopAmbulanceTrip();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

**Apply Same Pattern To**:
- `onCompleteAmbulanceTrip` (line 518)
- `onCompleteBedBooking` (line 555)
- `onCancelAmbulanceTrip` (line 505)
- `onCancelBedBooking` (line 531)

---

### Issue 3: Inconsistent Error Handling ⚠️ MEDIUM PRIORITY

**Location**: `EmergencyScreen.jsx` lines 285, 560  
**Severity**: Medium - Silent Failures

**Problem 1 - Async IIFE with Empty Catch**:
```javascript
// Line 250-286: handleRequestComplete uses async IIFE
(async () => {
    try {
        const shareMedicalProfile = preferences?.privacyShareMedicalProfile === true;
        // ... validation logic ...
        await createRequest({ /* ... */ });
    } catch {}  // ❌ Silent catch, no logging
})();
```

**Problem 2 - Silent Error on Completion**:
```javascript
// Line 560: onCompleteBedBooking catches but doesn't log
setRequestStatus(activeBedBooking.requestId, EmergencyRequestStatus.COMPLETED).catch(() => {});
```

**Why It's a Problem**:
1. Errors are completely hidden from debugging
2. Can't identify root cause of failures
3. No user feedback about what went wrong

**Solution - Proper Error Handling**:
```javascript
// Instead of:
(async () => {
    try {
        // ...
    } catch {}  // Bad
})();

// Use:
const handleRequestComplete = useCallback(async (request) => {
    try {
        // ... validation ...
        await createRequest({ /* ... */ });
    } catch (err) {
        console.error('[EmergencyScreen] Request creation failed:', err);
        // Could add user feedback here if needed
    }
}, [/* deps */]);
```

**Error Handling Guidelines**:
- Always log errors with context: `[EmergencyScreen]` prefix
- Include the function name: `[EmergencyScreen] handleRequestComplete:`
- Include relevant IDs: `visitId=${visitId}`
- Don't swallow errors unless absolutely necessary

---

### Issue 4: Missing Notification Hook Dependencies ⚠️ MEDIUM PRIORITY

**Location**: `EmergencyScreen.jsx` callback dependencies  
**Severity**: Medium - Performance/Stability

**Problem**: Once `addNotification` is imported, it needs to be included in useCallback dependencies for handlers that use it:

```javascript
// Current (will be incorrect once addNotification is added):
const handler = useCallback(() => {
    addNotification({ /* ... */ });
}, [/* addNotification missing */]);

// Should be:
const handler = useCallback(() => {
    addNotification({ /* ... */ });
}, [addNotification, /* other deps */]);
```

**Affected Handlers**:
- `onCancelBedBooking` (line 531)
- `onCompleteBedBooking` (line 555)

---

## Implementation Roadmap

### Phase 1: Critical Fixes (1-2 hours)
- [ ] Add `useNotifications` import
- [ ] Extract `addNotification` from hook
- [ ] Fix callback dependency arrays
- [ ] Test: Verify notifications appear on bed cancellation/completion

### Phase 2: Race Condition Resolution (2-3 hours)
- [ ] Convert handlers to async
- [ ] Add proper await on async operations
- [ ] Use `Promise.all()` for parallel operations
- [ ] Add error handling with logging
- [ ] Test: Verify request status updates before UI state changes

### Phase 3: Error Handling Improvements (1-2 hours)
- [ ] Refactor async IIFE to proper async function
- [ ] Replace silent catches with proper error logging
- [ ] Add console context prefixes throughout
- [ ] Test: Manually trigger errors and verify logging

### Phase 4: Testing & Validation (2-3 hours)
- [ ] Integration test: Request creation flow
- [ ] Integration test: Completion handlers
- [ ] Integration test: Cancellation flows
- [ ] Integration test: Notification creation
- [ ] Manual QA: Both ambulance and bed booking flows

---

## Detailed Code Changes

### Change 1: Add Import & Hook Usage

**File**: `screens/EmergencyScreen.jsx`

**Add after line 23**:
```javascript
import { useNotifications } from "../contexts/NotificationsContext";
```

**Add after line 52 in component body**:
```javascript
const { addNotification } = useNotifications();
```

---

### Change 2: Fix onCompleteAmbulanceTrip Handler

**File**: `screens/EmergencyScreen.jsx`  
**Replace lines 518-530**:

**Before**:
```javascript
onCompleteAmbulanceTrip={() => {
    if (activeAmbulanceTrip?.requestId) {
        setRequestStatus(
            activeAmbulanceTrip.requestId,
            EmergencyRequestStatus.COMPLETED
        );
        completeVisit(activeAmbulanceTrip.requestId);
    }
    stopAmbulanceTrip();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

**After**:
```javascript
onCompleteAmbulanceTrip={async () => {
    if (activeAmbulanceTrip?.requestId) {
        try {
            await Promise.all([
                setRequestStatus(activeAmbulanceTrip.requestId, EmergencyRequestStatus.COMPLETED),
                completeVisit(activeAmbulanceTrip.requestId)
            ]);
            console.log('[EmergencyScreen] Ambulance trip completed:', activeAmbulanceTrip.requestId);
        } catch (err) {
            console.error('[EmergencyScreen] onCompleteAmbulanceTrip error:', err);
        }
    }
    stopAmbulanceTrip();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

---

### Change 3: Fix onCancelAmbulanceTrip Handler

**File**: `screens/EmergencyScreen.jsx`  
**Replace lines 505-517**:

**Before**:
```javascript
onCancelAmbulanceTrip={() => {
    if (activeAmbulanceTrip?.requestId) {
        setRequestStatus(
            activeAmbulanceTrip.requestId,
            EmergencyRequestStatus.CANCELLED
        );
        cancelVisit(activeAmbulanceTrip.requestId);
    }
    stopAmbulanceTrip();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

**After**:
```javascript
onCancelAmbulanceTrip={async () => {
    if (activeAmbulanceTrip?.requestId) {
        try {
            await Promise.all([
                setRequestStatus(activeAmbulanceTrip.requestId, EmergencyRequestStatus.CANCELLED),
                cancelVisit(activeAmbulanceTrip.requestId)
            ]);
            console.log('[EmergencyScreen] Ambulance trip cancelled:', activeAmbulanceTrip.requestId);
        } catch (err) {
            console.error('[EmergencyScreen] onCancelAmbulanceTrip error:', err);
        }
    }
    stopAmbulanceTrip();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

---

### Change 4: Fix onCancelBedBooking Handler

**File**: `screens/EmergencyScreen.jsx`  
**Replace lines 531-554**:

**Before**:
```javascript
onCancelBedBooking={() => {
    if (activeBedBooking?.requestId) {
        setRequestStatus(
            activeBedBooking.requestId,
            EmergencyRequestStatus.CANCELLED
        );
        cancelVisit(activeBedBooking.requestId);
        addNotification({
            id: `bed_cancel_${activeBedBooking.requestId}`,
            type: NOTIFICATION_TYPES.APPOINTMENT,
            title: "Bed reservation cancelled",
            message: "You cancelled the active bed reservation.",
            timestamp: new Date().toISOString(),
            read: false,
            priority: NOTIFICATION_PRIORITY.NORMAL,
            actionType: null,
            actionData: { visitId: activeBedBooking.requestId },
        });
    }
    stopBedBooking();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

**After**:
```javascript
onCancelBedBooking={async () => {
    if (activeBedBooking?.requestId) {
        try {
            await Promise.all([
                setRequestStatus(activeBedBooking.requestId, EmergencyRequestStatus.CANCELLED),
                cancelVisit(activeBedBooking.requestId),
                addNotification({
                    id: `bed_cancel_${activeBedBooking.requestId}`,
                    type: NOTIFICATION_TYPES.APPOINTMENT,
                    title: "Bed reservation cancelled",
                    message: "You cancelled the active bed reservation.",
                    timestamp: new Date().toISOString(),
                    read: false,
                    priority: NOTIFICATION_PRIORITY.NORMAL,
                    actionType: null,
                    actionData: { visitId: activeBedBooking.requestId },
                })
            ]);
            console.log('[EmergencyScreen] Bed booking cancelled:', activeBedBooking.requestId);
        } catch (err) {
            console.error('[EmergencyScreen] onCancelBedBooking error:', err);
        }
    }
    stopBedBooking();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

---

### Change 5: Fix onCompleteBedBooking Handler

**File**: `screens/EmergencyScreen.jsx`  
**Replace lines 555-578**:

**Before**:
```javascript
onCompleteBedBooking={() => {
    if (activeBedBooking?.requestId) {
        setRequestStatus(
            activeBedBooking.requestId,
            EmergencyRequestStatus.COMPLETED
        ).catch(() => {});
        completeVisit(activeBedBooking.requestId);
        addNotification({
            id: `bed_complete_${activeBedBooking.requestId}`,
            type: NOTIFICATION_TYPES.APPOINTMENT,
            title: "Bed booking completed",
            message: "Your bed booking has been marked complete.",
            timestamp: new Date().toISOString(),
            read: false,
            priority: NOTIFICATION_PRIORITY.NORMAL,
            actionType: "view_summary",
            actionData: { visitId: activeBedBooking.requestId },
        });
    }
    stopBedBooking();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

**After**:
```javascript
onCompleteBedBooking={async () => {
    if (activeBedBooking?.requestId) {
        try {
            await Promise.all([
                setRequestStatus(activeBedBooking.requestId, EmergencyRequestStatus.COMPLETED),
                completeVisit(activeBedBooking.requestId),
                addNotification({
                    id: `bed_complete_${activeBedBooking.requestId}`,
                    type: NOTIFICATION_TYPES.APPOINTMENT,
                    title: "Bed booking completed",
                    message: "Your bed booking has been marked complete.",
                    timestamp: new Date().toISOString(),
                    read: false,
                    priority: NOTIFICATION_PRIORITY.NORMAL,
                    actionType: "view_summary",
                    actionData: { visitId: activeBedBooking.requestId },
                })
            ]);
            console.log('[EmergencyScreen] Bed booking completed:', activeBedBooking.requestId);
        } catch (err) {
            console.error('[EmergencyScreen] onCompleteBedBooking error:', err);
        }
    }
    stopBedBooking();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(1);
    }, 0);
}}
```

---

### Change 6: Refactor handleRequestComplete Function

**File**: `screens/EmergencyScreen.jsx`  
**Replace lines 241-353** (the entire function):

**Before**:
```javascript
const handleRequestComplete = useCallback((request) => {
    if (request?.serviceType !== "ambulance" && request?.serviceType !== "bed") return;
    const hospitalId = requestHospitalId ?? selectedHospital?.id ?? null;
    if (!hospitalId) return;
    const now = new Date();
    const visitId = request?.requestId ? String(request.requestId) : `local_${Date.now()}`;
    const hospital = hospitals.find((h) => h?.id === hospitalId) ?? null;
    const date = now.toISOString().slice(0, 10);
    const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    (async () => {
        try {
            const shareMedicalProfile = preferences?.privacyShareMedicalProfile === true;
            const shareEmergencyContacts = preferences?.privacyShareEmergencyContacts === true;
            // ... rest of async logic ...
        } catch {}
    })();
    // ... rest of sync logic ...
}, [/* deps */]);
```

**After**:
```javascript
const handleRequestComplete = useCallback((request) => {
    if (request?.serviceType !== "ambulance" && request?.serviceType !== "bed") return;
    const hospitalId = requestHospitalId ?? selectedHospital?.id ?? null;
    if (!hospitalId) return;
    const now = new Date();
    const visitId = request?.requestId ? String(request.requestId) : `local_${Date.now()}`;
    const hospital = hospitals.find((h) => h?.id === hospitalId) ?? null;
    const date = now.toISOString().slice(0, 10);
    const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    
    const createRequestAsync = async () => {
        try {
            const shareMedicalProfile = preferences?.privacyShareMedicalProfile === true;
            const shareEmergencyContacts = preferences?.privacyShareEmergencyContacts === true;

            const shared = {
                medicalProfile: shareMedicalProfile ? medicalProfile : null,
                emergencyContacts: shareEmergencyContacts ? emergencyContacts : null,
            };

            const patient = {
                fullName: user?.fullName ?? null,
                phone: user?.phone ?? null,
                email: user?.email ?? null,
                username: user?.username ?? null,
            };

            await createRequest({
                id: visitId,
                requestId: visitId,
                serviceType: request.serviceType,
                hospitalId,
                hospitalName: request?.hospitalName ?? hospital?.name ?? null,
                specialty: request?.specialty ?? selectedSpecialty ?? null,
                ambulanceType: request?.ambulanceType ?? null,
                ambulanceId: request?.ambulanceId ?? null,
                bedNumber: request?.bedNumber ?? null,
                bedType: request?.bedType ?? null,
                bedCount: request?.bedCount ?? null,
                estimatedArrival: request?.estimatedArrival ?? null,
                status: EmergencyRequestStatus.IN_PROGRESS,
                patient,
                shared,
            });
            console.log('[EmergencyScreen] handleRequestComplete: Request created', { visitId, serviceType: request.serviceType });
        } catch (err) {
            console.error('[EmergencyScreen] handleRequestComplete: Request creation failed:', err);
        }
    };
    
    createRequestAsync();
    
    if (request?.serviceType === "ambulance") {
        startAmbulanceTrip({
            hospitalId,
            requestId: visitId,
            ambulanceId: request?.ambulanceId ?? null,
            ambulanceType: request?.ambulanceType ?? null,
            estimatedArrival: request?.estimatedArrival ?? null,
            hospitalName: request?.hospitalName ?? null,
            route: currentRoute?.coordinates ?? null
        });

        addVisit({
            id: visitId,
            visitId,
            requestId: visitId,
            hospitalId: String(hospitalId),
            hospital: request?.hospitalName ?? hospital?.name ?? "Hospital",
            doctor: "Ambulance Dispatch",
            specialty: "Emergency Response",
            date,
            time,
            type: VISIT_TYPES.AMBULANCE_RIDE,
            status: VISIT_STATUS.IN_PROGRESS,
            image: hospital?.image ?? null,
            address: hospital?.address ?? null,
            phone: hospital?.phone ?? null,
            notes: "Ambulance requested via iVisit.",
        });
    }
    if (request?.serviceType === "bed") {
        startBedBooking({
            hospitalId,
            requestId: visitId,
            hospitalName: request?.hospitalName ?? null,
            specialty: request?.specialty ?? null,
            bedNumber: request?.bedNumber ?? null,
            bedType: request?.bedType ?? null,
            bedCount: request?.bedCount ?? null,
            estimatedWait: request?.estimatedArrival ?? null,
        });

        addVisit({
            id: visitId,
            visitId,
            requestId: visitId,
            hospitalId: String(hospitalId),
            hospital: request?.hospitalName ?? hospital?.name ?? "Hospital",
            doctor: "Admissions Desk",
            specialty: request?.specialty ?? selectedSpecialty ?? "General Care",
            date,
            time,
            type: VISIT_TYPES.BED_BOOKING,
            status: VISIT_STATUS.IN_PROGRESS,
            image: hospital?.image ?? null,
            address: hospital?.address ?? null,
            phone: hospital?.phone ?? null,
            notes: "Bed reserved via iVisit.",
            roomNumber: request?.bedNumber ?? null,
            estimatedDuration: request?.estimatedArrival ?? null,
        });
    }
    clearSelectedHospital();
    setTimeout(() => {
        bottomSheetRef.current?.snapToIndex?.(0);
    }, 0);
}, [addVisit, clearSelectedHospital, hospitals, mode, requestHospitalId, selectedHospital?.id, selectedSpecialty, startAmbulanceTrip, startBedBooking, user?.email, user?.fullName, user?.phone, user?.username, createRequest, preferences, medicalProfile, emergencyContacts, currentRoute]);
```

---

## Testing Strategy

### Unit Tests (if applicable)
- Test individual handler functions with mocked dependencies
- Verify proper error handling in each handler
- Test dependency arrays for useCallback hooks

### Integration Tests
1. **Request Creation Flow**
   - Create ambulance request → verify visit created → verify notification created
   - Create bed booking → verify visit created → verify notification created

2. **Completion Handlers**
   - Complete ambulance trip → verify request status = "completed"
   - Complete bed booking → verify request status = "completed"
   - Verify notifications created with correct data

3. **Cancellation Handlers**
   - Cancel ambulance trip → verify request status = "cancelled"
   - Cancel bed booking → verify request status = "cancelled"
   - Verify cancellation notification created

### Manual QA Checklist
- [ ] Start ambulance request, complete it, verify all data persisted
- [ ] Start bed booking, complete it, verify all data persisted
- [ ] Start ambulance, cancel it, verify status in database
- [ ] Start bed booking, cancel it, verify notification appears
- [ ] Check browser console for error logs (should be none)
- [ ] Verify request status visible in VisitsScreen
- [ ] Verify notifications appear in NotificationsScreen

---

## Success Criteria

✅ **Issue 1 - Fixed**: `addNotification` properly imported and used  
✅ **Issue 2 - Fixed**: All handlers are async with proper await/Promise.all  
✅ **Issue 3 - Fixed**: All errors logged with context  
✅ **Issue 4 - Fixed**: Dependency arrays updated for all callbacks  

**Verification**:
- No console errors during normal operation
- Request statuses persist in database
- Notifications appear immediately after trip/booking completion
- Console logs show proper sequencing of async operations

---

## Performance Considerations

1. **Promise.all() Impact**: Uses concurrent operations instead of sequential, slightly faster
2. **Callback Dependencies**: Properly set dependencies prevent unnecessary re-renders
3. **Async Handlers**: Don't block UI, setTimeout provides visual feedback

---

## Future Improvements (Out of Scope)

1. **Custom Hook for Trip Completion**: Extract common logic from handlers into a `useCompleteTrip` hook
2. **Error Boundary**: Wrap EmergencyScreen in error boundary for better error handling
3. **Retry Logic**: Implement exponential backoff for failed requests
4. **Loading States**: Add visual indicators while async operations complete
5. **Undo Functionality**: Allow cancellation of recent actions

---

## References

- **EmergencyScreen.jsx**: Main component file
- **NotificationsContext.jsx**: Provides addNotification hook
- **useVisitsData.js**: Handles visit CRUD operations
- **useEmergencyRequests.js**: Handles request CRUD operations
- **emergencyRequestsService.js**: Supabase integration for requests

---

## Sign-Off

**Audit Completed By**: Zencoder  
**Date**: 2026-01-10  
**Status**: Ready for Implementation  
**Estimated Duration**: 6-10 hours (development + testing)

