# Technical Specification: Fix Notification Creation and Prevent Rapid Click Crashes

## Task Difficulty Assessment: **Medium**

This task involves moderate complexity with multiple architectural considerations:
- Service layer modifications for notification creation
- State management race condition handling
- Proper debouncing implementation
- Multiple file modifications with careful testing

## Technical Context

**Language:** JavaScript (React Native)
**Framework:** React Native (Expo) with expo-router
**Key Dependencies:**
- React Context API for state management
- AsyncStorage for persistence via Supabase
- expo-haptics for feedback

## Problem Analysis

### Issue 1: Missing Notification Creation for Visits

**Current Flow:**
1. `EmergencyScreen.jsx` → `useRequestFlow.js` → `handleRequestComplete()`
2. Lines 110 and 141 in `useRequestFlow.js` call `addVisit()` with visit data
3. `addVisit()` in `useVisitsData.js:29-40` calls `visitsService.create(visit)`
4. `visitsService.create()` (lines 69-92) creates the visit in the database
5. **No notification is created**

**Root Cause:**
Notification creation logic is missing at the service layer. When a visit is created, no corresponding notification is generated to inform the user.

**Architecture Review:**
- `notificationsService.create()` exists and works correctly
- `addNotification()` is available in NotificationsContext
- The proper place to create notifications is at the service layer after a visit is successfully created

### Issue 2: App Crashes on Rapid Filter Clicks

**Current Flow:**
1. User rapidly clicks `ServiceTypeSelector` or `SpecialtySelector` buttons
2. Each click triggers:
   - `ServiceTypeSelector.jsx:44` → `handleSelect()` → `onSelect(type)`
   - `SpecialtySelector.jsx:45` → `handleSelect()` → `onSelect(specialty)`
3. In `EmergencyScreen.jsx`:
   - Line 286: `handleServiceTypeSelect()` → `selectServiceType(type)`
   - Line 295: `handleSpecialtySelect()` → `selectSpecialty(specialty)`
4. These cause immediate state updates without guards

**Root Cause:**
No debouncing or state transition guards exist to prevent:
- Multiple rapid consecutive state updates
- Race conditions during re-renders
- Potential access to undefined/null values during state transitions (e.g., `counts[specialty]` at `SpecialtySelector.jsx:125`)

**Specific Crash Location:**
`SpecialtySelector.jsx:125`: `{counts[specialty] ?? 0}`
- If `counts` is `undefined` or `null` during a race condition, accessing properties fails
- The nullish coalescing operator (`??`) doesn't protect against accessing properties on falsy values

## Implementation Approach

### Solution 1: Add Notification Creation to Visit Service

**Strategy:** Enhance `visitsService.create()` to automatically generate a notification after successfully creating a visit.

**Design Decisions:**
- Keep notification creation at the service level (single responsibility)
- Create visit-specific notifications with appropriate type and priority
- Use consistent notification structure based on `normalizeNotification`
- Handle errors gracefully (visit creation should not fail if notification creation fails)

**Notification Structure for Visits:**
```javascript
{
  id: `notification_${visitId}_${Date.now()}`,
  type: NOTIFICATION_TYPES.VISIT,
  priority: NOTIFICATION_PRIORITY.HIGH,
  title: `${visitType} Scheduled`,
  message: `Your ${visitType} at ${hospitalName} is ${status}`,
  read: false,
  timestamp: new Date().toISOString(),
  actionType: "navigate",
  actionData: {
    screen: "visits",
    visitId: visit.id
  }
}
```

### Solution 2: Implement Debouncing and Guards for Filter Selectors

**Strategy:** Add multiple layers of protection:
1. **Debounce rapid clicks** - Prevent multiple triggers within short time windows
2. **Guard against undefined/null** - Ensure safe property access
3. **State transition validation** - Only update if value actually changes

**Implementation Pattern:**
- Use React's `useCallback` with proper dependencies
- Implement a simple debounce mechanism using `useRef` for timestamps
- Add null/undefined guards for `counts` prop access
- Add value comparison to prevent redundant state updates

**Debounce Approach:**
```javascript
const lastCallTime = useRef(0);
const DEBOUNCE_MS = 300;

const handleSelect = (value) => {
  const now = Date.now();
  if (now - lastCallTime.current < DEBOUNCE_MS) {
    return; // Ignore rapid clicks
  }
  lastCallTime.current = now;
  // ... proceed with selection
};
```

## Source Code Structure Changes

### Files to Modify

1. **`services/visitsService.js`** (lines 69-92)
   - Add notification creation after successful visit creation
   - Import `notificationsService`
   - Generate appropriate notification based on visit type
   - Wrap notification creation in try-catch to prevent visit creation failure

2. **`components/emergency/ServiceTypeSelector.jsx`** (lines 44-52)
   - Add debounce logic using `useRef`
   - Add guard to prevent selecting same value
   - Add null check for `counts` prop (line 118)

3. **`components/emergency/SpecialtySelector.jsx`** (lines 45-53)
   - Add debounce logic using `useRef`
   - Fix null/undefined access at line 125: `{counts?.[specialty] ?? 0}`
   - Add guard to prevent redundant state updates

4. **`screens/EmergencyScreen.jsx`** (lines 285-300)
   - Add value comparison guards in `handleServiceTypeSelect`
   - Add value comparison guards in `handleSpecialtySelect`

## Data Model Changes

### Notification Schema
No schema changes required. Existing notification structure supports visit notifications:
- `type`: NOTIFICATION_TYPES.VISIT
- `priority`: NOTIFICATION_PRIORITY.HIGH
- `actionType`: "navigate"
- `actionData`: Contains navigation metadata

## Interface Changes

No public API or interface changes. All modifications are internal:
- `visitsService.create()` signature remains unchanged
- Selector component props remain unchanged
- Parent component callbacks remain unchanged

## Verification Approach

### Manual Testing
1. **Notification Creation:**
   - Create ambulance request via EmergencyScreen
   - Verify notification appears in NotificationsScreen
   - Create bed booking request
   - Verify notification appears with correct type and message
   - Check notification links to correct visit

2. **Rapid Click Prevention:**
   - Rapidly click ServiceTypeSelector buttons (5+ clicks in 1 second)
   - Verify app doesn't crash
   - Rapidly click SpecialtySelector buttons (5+ clicks in 1 second)
   - Verify app doesn't crash
   - Verify correct final selection is applied

### Automated Testing
Project likely uses React Native Testing Library based on structure:
```bash
npm test
```

### Lint & Type Check
```bash
npm run lint
npx expo-doctor
```

### Integration Testing
1. Create visit via emergency flow → verify notification created
2. Create visit via bed booking flow → verify notification created
3. Navigate from notification to visit → verify navigation works
4. Test filters with rapid clicks → verify no crashes
5. Test filters with null/undefined data → verify safe fallback

## Edge Cases & Considerations

### Notification Creation Edge Cases
1. **Database failure:** Visit created but notification fails
   - Solution: Log error, don't fail visit creation
2. **User not authenticated:** Should never happen (visit creation requires auth)
   - Already handled by service layer
3. **Duplicate notifications:** Multiple calls to create same visit
   - Use unique notification IDs based on visit ID + timestamp

### Rapid Click Edge Cases
1. **Click during state transition:** counts is undefined
   - Solution: Default to empty object `{}`
2. **Click with same value repeatedly:** Redundant state updates
   - Solution: Compare before updating
3. **Click faster than debounce window:** Multiple updates queued
   - Solution: Ignore all but first within window

## Risk Assessment

**Low Risk:**
- Notification creation is additive (doesn't break existing functionality)
- Debouncing is defensive (prevents errors, doesn't change behavior)
- Changes are isolated to specific components

**Potential Issues:**
- Notification spam if visit creation is called multiple times (mitigated by unique IDs)
- Debounce delay might feel unresponsive (300ms is industry standard)
- Need to ensure real-time subscriptions trigger properly for notifications

## Performance Considerations

- Notification creation adds ~100-200ms to visit creation (database write)
- Debouncing reduces unnecessary re-renders and state updates
- Overall performance should improve due to fewer race conditions

## Testing Checklist

- [ ] Visit creation generates notification (ambulance)
- [ ] Visit creation generates notification (bed booking)
- [ ] Notification has correct type, priority, and message
- [ ] Notification navigation works to visit details
- [ ] Rapid clicks on ServiceTypeSelector don't crash
- [ ] Rapid clicks on SpecialtySelector don't crash
- [ ] Filters still work correctly after changes
- [ ] Counts display correctly with null/undefined data
- [ ] Debounce timing feels responsive (not sluggish)
- [ ] Multiple rapid visits don't create duplicate notifications
- [ ] Lint and type checks pass
- [ ] No console errors in development

## Dependencies & Compatibility

**No new dependencies required**

Existing dependencies used:
- React hooks (useRef, useCallback)
- expo-haptics (already in use)
- Constants from `constants/notifications.js`
- Service layer (visitsService, notificationsService)

**Compatibility:**
- React Native: Compatible
- Expo SDK: Compatible
- AsyncStorage/Supabase: Compatible
