# Stash Audit — `stash@{0}`
**Stash message**: "UNIFIED: Complete refactor checkpoint - Phase 2 orchestrator + new hooks, atoms, stores, docs (224 files total)"  
**Stash base**: `68a5e2b` (docs: correct consumer map, tighten Phase 6 gate)  
**Total files**: 224  
**Audit started**: 2026-04-26

## Legend
| Status | Meaning |
|---|---|
| ✅ PULLED | Logic adopted — already in codebase |
| ⚠️ REVIEW | Needs manual comparison before adopting |
| ❌ REJECTED | Bundled with big-bang stash, do not adopt (wrong pattern / superseded) |
| 🗑️ DELETE | Stash added docs/tooling files we don't want |
| ⏳ PENDING | Not yet reviewed |

---

## Deleted files in stash (D) — safe to ignore
These were deleted in the stash — already cleaned up in recovery branch.

| File | Status |
|---|---|
| `.trae/documents/iVisit _Uber for Emergency_ Roadmap.md` | ✅ PULLED — content in GOLD_STANDARD_STATE_ROADMAP.md |
| `.zenflow/tasks/new-task-6128/*` | ❌ REJECTED — tool artifacts |
| `.zenflow/tasks/new-task-7623/*` | ❌ REJECTED — tool artifacts |
| `services/googlePlacesService.js` | ✅ PULLED — migration to Mapbox already done |

---

## Runtime / Layout (app/)
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `app/_layout.js` | M | ✅ PULLED | runtime/ extracted — committed Phase 1B |
| `app/(user)/_layout.js` | M | ✅ PULLED | auth routing migrated |
| `app/runtime/OTAModalLayer.jsx` | A | ✅ PULLED | now at `runtime/OTAModalLayer.jsx` |
| `app/runtime/RootNavigator.jsx` | A | ✅ PULLED | now at `runtime/RootNavigator.jsx` |
| `app/runtime/RootProviders.jsx` | A | ✅ PULLED | now at `runtime/RootProviders.jsx` |
| `app/runtime/RootRuntimeGate.jsx` | A | ✅ PULLED — Phase 6a | now at `runtime/RootRuntimeGate.jsx` + hydrateModeStore |
| `app/runtime/navigation/deepLinkHelpers.js` | A | ✅ PULLED | now at `runtime/navigation/` |
| `app/runtime/navigation/useAuthRouting.js` | A | ✅ PULLED | |
| `app/runtime/navigation/useInitialRoute.js` | A | ✅ PULLED | |
| `app/runtime/navigation/useRoutePersistence.js` | A | ✅ PULLED | |
| `app/runtime/useRootRuntimeReady.js` | A | ✅ PULLED | |

---

## Atoms
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `atoms/commitAtoms.ts` | A | ⏳ PENDING | Ephemeral commit UI state — review for 6c |
| `atoms/emergencyAtoms.js` | A | ❌ REJECTED | Trip state atoms superseded by emergencyTripStore; mode atoms superseded by useModeStore — DELETE in 6e |
| `atoms/mapFlowAtoms.js` | A | ✅ PULLED | Sheet phase, search, viewport — canonical ephemeral UI atoms, keep |
| `atoms/mapScreenAtoms.js` | A | ⏳ PENDING | May overlap mapFlowAtoms — review before 6b |
| `atoms/paymentAtoms.ts` | A | ⏳ PENDING | Ephemeral payment UI state — review for 6c |
| `atoms/searchAtoms.ts` | A | ⏳ PENDING | Ephemeral search UI state — review for 6c |

---

## Contexts
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `contexts/EmergencyContext.jsx` | M | ⏳ PENDING | Still live — retirement target Phase 6d |
| `contexts/EmergencyContextAdapter.jsx` | A | ⚠️ REVIEW — Phase 6d | Adapter shim confirmed useful — install as new EmergencyContextProvider in 6d; re-exports useEmergency() from Zustand stores |
| `contexts/EmergencyContextProviders.jsx` | A | ⚠️ REVIEW | Provider split — review before Phase 6d |
| `contexts/GlobalLocationContext.jsx` | M | ✅ PULLED | Already updated in recovery |

---

## Stores
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `stores/emergencyTripStore.js` | A | ✅ PULLED — Phase 1 | Battle-tested, canonical |
| `stores/emergencyTripSelectors.js` | A | ✅ PULLED — Phase 1 | |
| `stores/index.js` | A | ✅ PULLED — Phase 6a | modeStore exports added |
| `stores/paymentPreferencesStore.ts` | A | ✅ PULLED | |
| `stores/README.md` | A | ✅ PULLED | |
| `stores/modeStore.js` | — | ✅ PULLED — Phase 6a | New in Phase 6a, not in original stash |

---

## Hooks — Emergency
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/emergency/index.js` | A | ✅ PULLED | Barrel export |
| `hooks/emergency/useActiveTripQuery.ts` | A | ✅ PULLED — bug fix | Missing useInvalidateActiveTrip added |
| `hooks/emergency/useAmbulanceAnimation.js` | M | ✅ PULLED | |
| `hooks/emergency/useCoverageMode.js` | A | ❌ REJECTED | useState-based hook — pattern rejected; useCoverageStore (Zustand) implemented instead |
| `hooks/emergency/useDemoResponderHeartbeat.js` | A | ⚠️ REVIEW | Demo mode — relevant to Phase 6b |
| `hooks/emergency/useEmergencyHospitals.js` | A | ⚠️ REVIEW | Hospital query wrapper — relevant to Phase 6b |
| `hooks/emergency/useEmergencyJotai.js` | A | ❌ REJECTED | Jotai bridge for emergency state — superseded by Zustand stores |
| `hooks/emergency/useEmergencyLifecycle.js` | A | ⚠️ REVIEW | XState lifecycle — review before Phase 6c |
| `hooks/emergency/useEmergencyLocationSync.js` | A | ⚠️ REVIEW — Phase 6c | GPS watchPosition + server sync logic is solid; adopt when migrating GPS consumers off EmergencyContext |
| `hooks/emergency/useEmergencyRealtime.js` | A | ⚠️ REVIEW | Realtime subscriptions extracted — review before 6c |
| `hooks/emergency/useEmergencyRequestActions.js` | A | ⚠️ REVIEW | Request actions extracted — review before 6c |
| `hooks/emergency/useEmergencyServerSync.js` | A | ⚠️ REVIEW | Server sync extracted — replaces syncActiveTripsFromServer |
| `hooks/emergency/useEmergencySyncEngine.js` | A | ⚠️ REVIEW | Sync orchestrator — review before 6c |
| `hooks/emergency/useEmergencyTripRuntime.js` | A | ⚠️ REVIEW | Trip runtime hook — review before 6c |
| `hooks/emergency/useHospitalDiscovery.js` | A | ⚠️ REVIEW | Hospital discovery — relevant to Phase 6b |
| `hooks/emergency/useHospitalSelection.js` | M | ✅ PULLED | |
| `hooks/emergency/useHospitals.js` | M | ✅ PULLED | |
| `hooks/emergency/useHospitalsQuery.ts` | A | ✅ PULLED — Phase 2 | TanStack Query for hospitals |
| `hooks/emergency/useMapRoute.js` | M | ✅ PULLED | |
| `hooks/emergency/useStableAnimation.js` | A | ⚠️ REVIEW | Animation stability — review for MapScreen decomp |
| `hooks/emergency/useTripSync.js` | A | ⚠️ REVIEW | Trip sync — review before 6c |

---

## Hooks — Map ExploreFlow
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/map/exploreFlow/index.js` | A | ⏳ PENDING | Barrel — check if needed |
| `hooks/map/exploreFlow/mapExploreFlow.loading.js` | M | ✅ PULLED | |
| `hooks/map/exploreFlow/useMapBackgroundImage.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapCallbacks.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapCommitFlow.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapComputedBooleans.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapDecisionFlow.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapDerivedData.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapEffects.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapExploreFlow.js` | M | ✅ PULLED — Phase 5e | Raw trips → store selectors |
| `hooks/map/exploreFlow/useMapExploreFlowReturn.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapFlowAtoms.js` | A | ⚠️ REVIEW | Atom bridge — may overlap mapFlowAtoms.js |
| `hooks/map/exploreFlow/useMapFlowState.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapHospitalActions.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapHospitalSelection.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapLoadingState.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapLocationHandlers.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapSearchSheet.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapServiceDetail.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapSheetPhase.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapTracking.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapTrackingHeader.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapTrackingTimer.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapUIState.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapUserData.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapViewport.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |

---

## Hooks — Map Shell (⚠️ HIGH RISK — stash bundled 14 files)
> **Guardrail**: Stash warning in roadmap — `hooks/map/shell/` was bundled with everything else. Do NOT adopt wholesale. Each file needs individual review.

| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/map/shell/index.js` | A | ❌ REJECTED | Shell pattern rejected — see roadmap stash warning |
| `hooks/map/shell/useMapCommitHandlers.ts` | A | ⚠️ REVIEW | Commit handlers — may have useful logic for MapScreen decomp |
| `hooks/map/shell/useMapDecisionHandlers.js` | A | ⚠️ REVIEW | Decision handlers — MapScreen decomp candidate |
| `hooks/map/shell/useMapDerivedState.ts` | A | ⚠️ REVIEW | Derived state — MapScreen decomp candidate |
| `hooks/map/shell/useMapHistoryFlow.js` | A | ⚠️ REVIEW | History flow — MapScreen decomp candidate |
| `hooks/map/shell/useMapHospitalResolution.ts` | A | ⚠️ REVIEW | Hospital resolution — MapScreen decomp candidate |
| `hooks/map/shell/useMapMarkerState.ts` | A | ⚠️ REVIEW | Marker state — MapScreen decomp candidate |
| `hooks/map/shell/useMapModals.js` | A | ⚠️ REVIEW | Modals — MapScreen decomp candidate |
| `hooks/map/shell/useMapProfileActions.ts` | A | ⚠️ REVIEW | Profile actions — MapScreen decomp candidate |
| `hooks/map/shell/useMapScreenEffects.js` | A | ⚠️ REVIEW | Screen effects — MapScreen decomp candidate |
| `hooks/map/shell/useMapShell.js` | A | ❌ REJECTED | Monolithic shell hook — exact pattern we're avoiding |
| `hooks/map/shell/useMapTrackingActions.ts` | A | ⚠️ REVIEW | Tracking actions — MapScreen decomp candidate |
| `hooks/map/shell/useMapTrackingState.js` | A | ⚠️ REVIEW | Tracking state — MapScreen decomp candidate |
| `hooks/map/shell/useMapTrackingSync.ts` | A | ⚠️ REVIEW | Tracking sync — MapScreen decomp candidate |

---

## Hooks — Map Screen
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/map/screen/useMapLoadingState.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapModals.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenHospitals.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenLayout.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenModals.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenPayment.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenTracking.js` | A | ⚠️ REVIEW | MapScreen decomp candidate |

---

## Hooks — Commit
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/commit/index.ts` | A | ⏳ PENDING | Review before 6c |
| `hooks/commit/useCommitFormSubmission.ts` | A | ⏳ PENDING | Review before 6c |
| `hooks/commit/useCommitOtpFlow.ts` | A | ⏳ PENDING | Review before 6c |
| `hooks/commit/useCommitWizardSteps.ts` | A | ⏳ PENDING | Review before 6c |

---

## Hooks — Payment
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/payment/index.ts` | A | ✅ PULLED | Barrel export |
| `hooks/payment/usePaymentCostCalculation.ts` | A | ⏳ PENDING | |
| `hooks/payment/usePaymentMethodSelection.ts` | A | ⏳ PENDING | |
| `hooks/payment/usePaymentMethodsQuery.ts` | A | ⏳ PENDING | TanStack Query for payment methods |
| `hooks/payment/usePaymentScreenModel.js` | M | ✅ PULLED — Phase 2 | useInvalidateActiveTrip fix applied |
| `hooks/payment/usePaymentSubmission.ts` | A | ⏳ PENDING | |
| `hooks/payment/useWalletBalanceQuery.ts` | A | ⏳ PENDING | TanStack Query for wallet |

---

## Hooks — Other
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/performance/usePerformanceMonitor.js` | A | ⏳ PENDING | Performance monitoring |
| `hooks/search/useLocationSearchQuery.ts` | A | ⏳ PENDING | TanStack Query for location search |
| `hooks/search/useSearchRanking.js` | M | ✅ PULLED | |
| `hooks/visits/useBookVisit.js` | M | ✅ PULLED | |

---

## Components
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `components/emergency/EmergencyRequestModal.jsx` | M | ✅ PULLED — Phase 5d | |
| `components/emergency/intake/EmergencyLocationPreviewMap.jsx` | M | ✅ PULLED | |
| `components/emergency/intake/EmergencyLocationSearchSheet.jsx` | M | ✅ PULLED | |
| `components/emergency/intake/mapPreviewHelpers.js` | A | ⏳ PENDING | |
| `components/emergency/intake/useMapPreviewEffects.js` | A | ⏳ PENDING | |
| `components/emergency/intake/useMapPreviewState.js` | A | ⏳ PENDING | |
| `components/errorBoundary/MapErrorBoundary.jsx` | A | ⏳ PENDING | Error boundary for map |
| `components/map/MapScreenModals.jsx` | A | ⚠️ REVIEW | MapScreen modal extraction — review for decomp |
| `components/map/core/MapSheetOrchestrator.jsx` | M | ✅ PULLED — Phase 5c | |
| `components/map/core/mapActiveSessionPresentation.js` | M | ✅ PULLED | |
| `components/map/core/mapMetricPresentation.js` | M | ✅ PULLED | |
| `components/map/core/mapOverlayHeaderLayout.js` | M | ✅ PULLED | |
| `components/map/surfaces/search/MapLocationModal.jsx` | M | ✅ PULLED | |
| `components/map/surfaces/search/useMapSearchSheetModel.js` | M | ✅ PULLED | |
| `components/map/views/commitDetails/useMapCommitDetailsController.js` | M | ✅ PULLED — Phase 5f | useEmergency removed |
| `components/map/views/commitPayment/useMapCommitPaymentController.js` | M | ✅ PULLED — Phase 5d | |
| `components/map/views/commitTriage/useMapCommitTriageController.js` | M | ✅ PULLED — Phase 5d | |
| `components/map/views/commitTriage/useTriageCopilotPrompt.js` | A | ⏳ PENDING | |
| `components/map/views/commitTriage/useTriageLiveSync.js` | A | ⏳ PENDING | |
| `components/map/views/commitTriage/useTriageStepNavigation.js` | A | ⏳ PENDING | |
| `components/map/views/shared/TrackHeaderIcon.jsx` | A | ⏳ PENDING | |
| `components/map/views/tracking/MapTrackingStageBase.jsx` | M | ✅ PULLED — Phase 5c | |
| `components/map/views/tracking/mapTracking.styles.js` | M | ✅ PULLED | |
| `components/map/views/tracking/mapTracking.theme.js` | M | ✅ PULLED | |
| `components/map/views/tracking/parts/MapTrackingParts.jsx` | M | ✅ PULLED | |
| `components/map/views/tracking/useMapTrackingController.js` | M | ✅ PULLED | |
| `components/map/views/tracking/useMapTrackingRuntime.js` | M | ✅ PULLED | |
| `components/map/views/tracking/useTrackingActions.js` | A | ⏳ PENDING | |
| `components/map/views/tracking/useTrackingRating.js` | A | ⏳ PENDING | Rating — relevant to rating modal fix |

---

## Screens
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `screens/BookBedRequestScreen.jsx` | M | ⏳ PENDING | 6c consumer migration target |
| `screens/EmergencyScreen.jsx` | M | ❌ REJECTED | Deprecated — zero router entry points, delete in 6e |
| `screens/MapEntryLoadingScreen.jsx` | M | ⏳ PENDING | 6c consumer migration target |
| `screens/MapScreen.jsx` | M | ⚠️ REVIEW | 1434-line monolith — MapScreen decomp track |
| `screens/MoreScreen.jsx` | M | ⏳ PENDING | 6c consumer migration target |
| `screens/NotificationDetailsScreen.jsx` | M | ⏳ PENDING | 6c consumer migration target |
| `screens/NotificationsScreen.jsx` | M | ⏳ PENDING | 6c consumer migration target |
| `screens/RequestAmbulanceScreen.jsx` | M | ⏳ PENDING | 6c consumer migration target |
| `screens/SearchScreen.jsx` | M | ⏳ PENDING | **6c PILOT** — simplest consumer |
| `screens/WelcomeScreen.jsx` | M | ⏳ PENDING | 6c consumer migration target |

---

## Providers
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `providers/AppProviders.jsx` | M | ✅ PULLED | |
| `providers/AppProviders.web.jsx` | M | ✅ PULLED | |
| `providers/QueryProvider.jsx` | A | ✅ PULLED — Phase 2 | TanStack Query provider |
| `providers/UserProviders.jsx` | M | ✅ PULLED | |

---

## Services / Config / Utils
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `services/discoveryService.js` | M | ✅ PULLED | |
| `services/hospitalImportService.js` | M | ✅ PULLED | |
| `constants/mapConfig.js` | M | ✅ PULLED | |
| `utils/navigationHelpers.js` | M | ✅ PULLED | |
| `metro.config.js` | M | ✅ PULLED | Metro resolution fix |
| `babel.config.js` | M | ✅ PULLED | |
| `eslint.config.js` | A | ⏳ PENDING | |
| `package.json` | M | ✅ PULLED | Dependencies updated |
| `supabase/functions/hospital-media/index.ts` | M | ✅ PULLED | |

---

## Docs — Archive / Historical (all ❌ REJECTED — do not re-introduce)
> These are stash-era checkpoint docs. Our roadmap supersedes all of them.

`docs/archive/historical/*` — 20 files — ❌ REJECTED  
`docs/audit/*` — 11 files — ❌ REJECTED (content absorbed into GOLD_STANDARD_STATE_ROADMAP.md)  
`docs/platform/METRO_ROUTING_FIXES.md` — ✅ PULLED (Metro fix already applied)  
`docs/architecture/EMERGENCY_STATE_REFACTOR.md` — ⚠️ REVIEW before 6b  
`docs/architecture/ZERO_COST_MAPBOX_MIGRATION.md` — ⏳ PENDING (separate track)  

---

## Phase-gated Review Queue

### Phase 6b ✅ COMPLETE
- `hooks/emergency/useCoverageMode.js` ❌ REJECTED (useState pattern)
- `hooks/emergency/useEmergencyLocationSync.js` → deferred to 6c (GPS consumer migration)
- `docs/architecture/EMERGENCY_STATE_REFACTOR.md` ✅ READ — EmergencyContextAdapter pattern noted for 6c

### Phase 6c (Consumer migration)
- `atoms/commitAtoms.ts`, `paymentAtoms.ts`, `searchAtoms.ts` ⏳
- `hooks/commit/*` ⏳
- `contexts/EmergencyContextAdapter.jsx` ⚠️
- `contexts/EmergencyContextProviders.jsx` ⚠️
- All screens marked ⏳

### MapScreen Decomposition (Parallel track)
- All `hooks/map/exploreFlow/use*.js` (new files) ⚠️
- All `hooks/map/screen/*` ⚠️
- `hooks/map/shell/*` — individual review only, NOT wholesale ⚠️
- `components/map/MapScreenModals.jsx` ⚠️

---

## Summary Stats
| Status | Count |
|---|---|
| ✅ PULLED | ~65 |
| ⚠️ REVIEW | ~55 |
| ⏳ PENDING | ~40 |
| ❌ REJECTED | ~15 |
| 🗑️ Archive docs | ~35 |

> **Rule**: Before touching any ⚠️ REVIEW file in a phase, read stash version vs current, adopt with PULLBACK NOTE if logic is better, otherwise ignore.
