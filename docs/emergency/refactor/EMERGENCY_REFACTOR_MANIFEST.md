# Emergency Refactor Manifest: Feature Tracking

This document tracks all features, side effects, and UI details for `EmergencyBottomSheet` refactor to ensure no functionality is lost during modularization.

## Current Production Flow Reference
- User flow (SOS): [ambulance_and_bed_booking.md](../../flows/emergency/ambulance_and_bed_booking.md)

## 1. Global Side Effects (Managed in `EmergencyScreen.jsx`)
- **Tab Bar Visibility**: Hidden when `selectedHospital` is set OR during active trip/booking.
- **Floating Action Button (FAB)**: Hidden when `selectedHospital` is set OR during active trip/booking OR when sheet is collapsed (index 0).
- **Map Bottom Padding**: Dynamically adjusted based on `sheetSnapIndex` and `isRequestFlowOpen` via `getMapPaddingForSnapIndex`.
- **Header Title/Icon**: Switches between "Ambulance Call" and "Reserve Bed" based on `mode`.
- **Map Content**: `hospitalsForMap` prioritizes destination hospital during an active trip.

## 2. Bottom Sheet Internal Logic & Features
- **Initial Snap Logic**: 
  - `isDetailMode` → index 0 (collapsed/bottom-only)
  - `isRequestFlowActive` → index 1 (semi-full/60%)
  - Default → index 1 (half)
- **Sheet Locking (The "Surgical" Point)**: 
  - Prevents sheet from being expanded to "Full" when a hospital is selected (locks to halfway).
  - Locks to index 1 during "Dispatched" (tracking) state.
- **Request Flow State**:
  - `requestStep`: "select" → "dispatched".

## 3. UI/UX Elements to Preserve
- **Haptics**:
    - `Medium` on avatar press.
    - `Light` on request cancel/done.
    - `Warning` on request submission.
    - `Success` notification on dispatch.
- **Animations**:
    - `RequestAmbulanceFAB` & `RequestBedFAB` scale animations on press.
    - Sheet snap transitions use Apple-style easing.
    - Ambulance animation on map (active during trip).
- **Styling**:
    - Dark mode support for all request cards and tiles.
    - Muted text and background colors with specific opacity (e.g., `rgba(255,255,255,0.70)`).
    - Custom handle and background gradients.

## 4. Refactor Goals
- [ ] Move `renderRequestFlow` into `RequestFlowContent.jsx`.
- [ ] Move Request State (ambulance type, bed count) into the new component or a hook.
- [ ] Remove duplicate logic from `EmergencyRequestModal.jsx`.
- [ ] Ensure `onSnapChange` continues to trigger map padding updates.
- [ ] Verify `expand()` still works correctly after modularization.
