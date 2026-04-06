# Location Search Modal Dossier

> Status: Active
> Purpose: keep the location-search modal aligned across device variants and future refactors

## Route Chain

- [screens/RequestAmbulanceScreen.jsx](../screens/RequestAmbulanceScreen.jsx)
- [components/emergency/intake/EmergencyIntakeOrchestrator.jsx](../components/emergency/intake/EmergencyIntakeOrchestrator.jsx)
- iOS-standard source:
  - [components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx](../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)
- shared search sheet:
  - [components/emergency/intake/EmergencyLocationSearchSheet.jsx](../components/emergency/intake/EmergencyLocationSearchSheet.jsx)

## Current Source Of Truth

The location-search modal is now split cleanly:

- `EmergencyIOSMobileIntakeView` owns when the modal opens and closes.
- `EmergencyLocationSearchStageOrchestrator` owns the per-screen modal family.
- `EmergencyLocationSearchStageBase` holds the shared contract and passes the right variant into the shared sheet.
- `EmergencyLocationSearchSheet` owns the actual search, loading, empty, error, and selection behavior.

## Screen Family

Location search now has explicit screen wrappers for:

- `ios-mobile`
- `ios-pad`
- `android-mobile`
- `android-fold`
- `android-tablet`
- `android-chromebook`
- `macbook`
- `web-mobile`
- `web-sm-wide`
- `web-md`
- `web-lg`
- `web-xl`
- `web-2xl-3xl`
- `web-ultra-wide`

## Presentation Rules

- `ios-mobile`, `android-mobile`, `android-fold`, and `web-mobile` keep the compact sheet treatment.
- `ios-pad`, `web-sm-wide`, `web-md`, `web-lg`, `web-xl`, `web-2xl-3xl`, `web-ultra-wide`, and `macbook` use dialog-style layouts.
- `android-tablet` and `android-chromebook` keep the Android-aware sheet behavior, but with larger spacing and list capacity.

## UI States Covered

The shared location-search sheet handles:

1. idle
2. searching
3. search error
4. empty results
5. suggestion resolution
6. use-current-location handoff

## Interaction Rules

- Opening the modal should preserve the same search and selection behavior on every platform.
- Wrapper views stay thin and should only choose presentation behavior, not reimplement search logic.
- Size and spacing differences belong in the shared sheet so the family stays consistent.
- `ios-pad` is a first-class variant and should not fall back to the phone sheet behavior.

## Next Handoff

After a location is chosen, the flow returns to the shared intake state in:

- [components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx](../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)

That state then resumes the confirm-location and choose-hospital sequence.
