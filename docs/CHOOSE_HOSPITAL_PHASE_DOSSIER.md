# Choose Hospital Phase Dossier

> Status: Active
> Purpose: keep the hospital-selection phase aligned across device variants and future refactors

## Route Chain

- [screens/RequestAmbulanceScreen.jsx](../screens/RequestAmbulanceScreen.jsx)
- [components/emergency/intake/EmergencyIntakeOrchestrator.jsx](../components/emergency/intake/EmergencyIntakeOrchestrator.jsx)
- iOS-standard source:
  - [components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx](../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)
- choose-hospital sheet:
  - [components/emergency/intake/EmergencyHospitalChoiceSheet.jsx](../components/emergency/intake/EmergencyHospitalChoiceSheet.jsx)
- route preview:
  - [components/emergency/intake/EmergencyHospitalRoutePreview.jsx](../components/emergency/intake/EmergencyHospitalRoutePreview.jsx)

## Current Source Of Truth

The hospital-selection phase is now split cleanly:

- `RequestAmbulanceScreen` owns hospital readiness and option quality.
- `EmergencyIOSMobileIntakeView` owns the phase behavior and immediate review-state transitions.
- `EmergencyHospitalChoiceSheet` owns the bottom-sheet UI for loading, empty, and ready states.
- `EmergencyChooseHospitalStageOrchestrator` now owns the per-screen review family.
- `EmergencyChooseHospitalStageBase` holds the shared review contract.
- wrapper views stay thin and keep inheriting the shared stage behavior.

## Inputs

The choose-hospital phase currently depends on:

- `recommendedHospital`
- `alternativeHospitals`
- `hospitalChoiceState`
- `onRefreshHospitalOptions`

`hospitalChoiceState` is the business-ready contract for this phase. Right now it carries:

- `status`
- `message`
- `totalOptions`
- `verifiedOptions`
- `isRefreshingCatalog`

## UI States Covered

The phase now handles these explicit states:

1. `loading`
2. `ready`
3. `empty`
4. `refreshing catalog`
5. `refreshing route after selection`

## Web Layout

For `web-sm-wide`, `web-md`, and the wider web families, choose hospital now uses a dedicated split review layout:

- left side: persistent route/map preview
- right side: ETA, hospital summary, and decision actions

Mobile still keeps the bottom-overlay review treatment.

## Screen Family

Choose hospital now has explicit screen wrappers for:

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

## Interaction Rules

- The proposed-hospital review shell should reflect the pending hospital immediately after selection.
- If the route is still refreshing, the review shell should acknowledge that state before continuing.
- Loading and empty states belong in the shared choose-hospital sheet, not in per-platform wrappers.
- Any new platform-specific treatment should wrap the shared state contract rather than reimplement it.

## Next Handoff

The next phase after choose hospital is the request-dispatch handoff into:

- [components/emergency/EmergencyRequestModal.jsx](../components/emergency/EmergencyRequestModal.jsx)

That handoff should keep using the hospital selected in the choose-hospital phase as the committed source for dispatch.
