# Welcome And Intake Flow Map

> Status: Active
> Purpose: make the entry flow easy to find, extend, and keep aligned across device variants

## Routes

- Welcome route:
  - [app/(auth)/index.js](../app/(auth)/index.js)
  - [screens/WelcomeScreen.jsx](../screens/WelcomeScreen.jsx)
- Map route:
  - [app/(auth)/map.js](../app/(auth)/map.js)
  - [screens/MapScreen.jsx](../screens/MapScreen.jsx)
- Legacy/new-intake route:
  - [app/(auth)/request-help.js](../app/(auth)/request-help.js)
  - [app/(user)/(stacks)/emergency/request-ambulance.js](../app/(user)/(stacks)/emergency/request-ambulance.js)
  - [screens/RequestAmbulanceScreen.jsx](../screens/RequestAmbulanceScreen.jsx)

## Welcome Phase

The welcome phase is the first actionable state.

Current orchestration path:

- [WelcomeScreen.jsx](../screens/WelcomeScreen.jsx)
- [WelcomeScreenOrchestrator.jsx](../components/welcome/WelcomeScreenOrchestrator.jsx)
- shared non-wide base:
  - [WelcomeStageBase.jsx](../components/welcome/views/WelcomeStageBase.jsx)
- shared wide web base:
  - [WelcomeWideWebView.jsx](../components/welcome/views/WelcomeWideWebView.jsx)

Runtime rule now locked:

- welcome may pre-warm emergency location and nearby hospitals
- welcome must not silently trigger demo bootstrap
- discovery warmup should only run after emergency state has actually synced to the same location as global location state
- welcome emergency CTA now routes directly into `/(auth)/map`
- `/map` owns the real loading overlay, coverage readiness, and demo bootstrap timing

## Intake Phase: "Where Are You?"

The intake phase still exists as the dedicated request-help family, but it is no longer the primary welcome emergency handoff.

Current rule:

- `/(auth)/map` is the primary welcome emergency route
- `/(auth)/request-help` remains the separate intake family for the legacy/new intake shell and related work
- both flows still rely on the same location and coverage doctrine

Current orchestration path:

- [RequestAmbulanceScreen.jsx](../screens/RequestAmbulanceScreen.jsx)
- [EmergencyIntakeOrchestrator.jsx](../components/emergency/intake/EmergencyIntakeOrchestrator.jsx)
- iOS-standard intake surface:
  - [EmergencyIOSMobileIntakeView.jsx](../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)

The actual "Where are you?" header state is set inside:

- [EmergencyIOSMobileIntakeView.jsx](../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)

The choose-location surface itself is split through:

- [EmergencyChooseLocationStageOrchestrator.jsx](../components/emergency/intake/views/chooseLocation/EmergencyChooseLocationStageOrchestrator.jsx)
- [EmergencyChooseLocationStageBase.jsx](../components/emergency/intake/views/chooseLocation/EmergencyChooseLocationStageBase.jsx)

Current runtime doctrine:

- [GlobalLocationContext.jsx](../contexts/GlobalLocationContext.jsx) is the single owner of initial device location and resolved place label
- [EmergencyContext.jsx](../contexts/EmergencyContext.jsx) consumes that location for hospital discovery
- explicit demo backfill belongs to [RequestAmbulanceScreen.jsx](../screens/RequestAmbulanceScreen.jsx), not the background welcome prewarm path
- in the `/map` flow, demo backfill is owned by [useMapExploreDemoBootstrap.js](../hooks/map/exploreFlow/useMapExploreDemoBootstrap.js) only after location and nearby-coverage quality are known

## Location Search Modal Phase

The location-search modal is the editable branch of the intake flow. It now follows the same screen-family pattern as the welcome and choose-hospital phases.

Current orchestration path:

- phase behavior and modal entry:
  - [EmergencyIOSMobileIntakeView.jsx](../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)
- location-search stage family:
  - [EmergencyLocationSearchStageOrchestrator.jsx](../components/emergency/intake/views/locationSearch/EmergencyLocationSearchStageOrchestrator.jsx)
  - [EmergencyLocationSearchStageBase.jsx](../components/emergency/intake/views/locationSearch/EmergencyLocationSearchStageBase.jsx)
- shared search sheet:
  - [EmergencyLocationSearchSheet.jsx](../components/emergency/intake/EmergencyLocationSearchSheet.jsx)
- dedicated dossier:
  - [LOCATION_SEARCH_MODAL_DOSSIER.md](./LOCATION_SEARCH_MODAL_DOSSIER.md)

## Choose Hospital Phase

The choose-hospital phase begins once nearby help resolves into a proposed hospital and alternate options.

Current orchestration path:

- hospital readiness and option quality:
  - [RequestAmbulanceScreen.jsx](../screens/RequestAmbulanceScreen.jsx)
- phase behavior and review shell:
  - [EmergencyIOSMobileIntakeView.jsx](../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)
- choose-hospital stage family:
  - [EmergencyChooseHospitalStageOrchestrator.jsx](../components/emergency/intake/views/chooseHospital/EmergencyChooseHospitalStageOrchestrator.jsx)
  - [EmergencyChooseHospitalStageBase.jsx](../components/emergency/intake/views/chooseHospital/EmergencyChooseHospitalStageBase.jsx)
- shared choose-hospital surface:
  - [EmergencyHospitalChoiceSheet.jsx](../components/emergency/intake/EmergencyHospitalChoiceSheet.jsx)
- shared route preview:
  - [EmergencyHospitalRoutePreview.jsx](../components/emergency/intake/EmergencyHospitalRoutePreview.jsx)
- dedicated dossier:
  - [CHOOSE_HOSPITAL_PHASE_DOSSIER.md](./CHOOSE_HOSPITAL_PHASE_DOSSIER.md)

## Flow Phases

Current high-level order:

1. Welcome
2. `/map` idle / explore intent
3. Search / confirm location when needed
4. Finding nearby help
5. Proposed hospital or nearby hospital list
6. Continue into commit phase
7. Optional triage / transport detail
8. Add patient details + verify identity (email OTP, phone collected as contact data)
9. Pay & commit
10. Responder matched or reservation confirmed
11. Live tracking / directions
12. Completion / handoff

Canonical product reference:

- [flows/emergency/MASTER_REFERENCE_FLOW_V1.md](./flows/emergency/MASTER_REFERENCE_FLOW_V1.md)
- [flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)

## Current Source Of Truth

- Welcome non-wide family now shares one stage base.
- Intake family already uses the iOS-standard intake surface as the main source of truth, with platform wrappers around it.
- The choose-location phase already uses a shared stage base.
- The location-search modal phase now has its own wrapper family, with `ios-pad` and the web families using dialog-style treatments and the mobile families keeping the sheet pattern.
- The choose-hospital phase now has an explicit `loading`, `ready`, `empty`, and `refreshing` contract driven from `RequestAmbulanceScreen` and consumed by the shared sheet and review shell.

## Current Legacy Seam

The remaining architectural seam is after the decision phases:

- [screens/MapScreen.jsx](../screens/MapScreen.jsx) correctly owns the persistent `/map` shell
- [hooks/map/exploreFlow/useMapExploreFlow.js](../hooks/map/exploreFlow/useMapExploreFlow.js) now owns the pre-dispatch map flow, including coverage/bootstrap timing
- but after `ambulance_decision` it still eventually hands off into [EmergencyRequestModal.jsx](../components/emergency/EmergencyRequestModal.jsx) through the legacy request bridge
- that modal is still the legacy commit/runtime surface to replace next

Target direction:

- keep the current welcome and `/map` families
- replace the legacy modal handoff with a dedicated commit-phase stage family
- reuse existing request orchestration and backend services instead of rebuilding the backend

## Extension Rule

- Keep wrapper views thin.
- Add loading, fetching, error, and debug state handling in the shared base layers before adding per-platform overrides.
