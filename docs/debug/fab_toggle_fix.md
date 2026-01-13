# Debug Fix: FAB Toggle and BottomSheet Snap Points

## Issue
After locking the bottom sheet snap points to **40%** and **50%** for "compact mode" (active trips/bookings), the Floating Action Button (FAB) became unresponsive or invisible. This prevented users from toggling between Emergency and Booking modes when a visit was active.

## Root Cause Analysis
1.  **Visibility Logic**: The FAB visibility in `EmergencyScreen.jsx` was hardcoded to hide when `sheetSnapIndex === 0`.
2.  **Snap Point Misalignment**: In standard mode, index 0 is ~22%. In compact mode (active trip), index 0 is locked to 40%. The logic didn't account for index 0 being a valid, visible state in compact mode.
3.  **Mode-Specific Logic**: The `isCompactMode` check was too narrow, causing the FAB to hide immediately after a mode toggle if the *new* mode didn't have an active trip, even though the *previous* mode did.

## Implementation Fix
- **File**: `screens/EmergencyScreen.jsx`
- **Change**: Replaced `isCompactMode` with `hasAnyVisitActive` (checking both `activeAmbulanceTrip` and `activeBedBooking`).
- **Logic**: Updated `shouldHideFAB` to allow visibility at `sheetSnapIndex === 0` if `hasAnyVisitActive` is true.
- **Context Prop**: Added `mode: mode` to `registerFAB` to ensure the FAB context is aware of the current active mode for correct icon/label rendering.

## Results
- FAB remains visible at the 40% snap point during active trips.
- FAB remains visible after toggling modes, allowing the user to switch back to the active trip summary.
- Snap points correctly transition between compact (2 points) and standard (3 points) modes.
