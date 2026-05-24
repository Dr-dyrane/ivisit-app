---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Stash Audit â€” `stash@{0}`

> **Reconciliation Note â€” 2026-05-24:** Historical record of the 224-file stash review. The stash itself has long since been resolved (selectively pulled, manually re-implemented, or rejected). Per-file status below remains as captured. No carryforward for new work â€” current architectural truth lives in [`../overview/ARCHITECTURE.md`](../overview/ARCHITECTURE.md) and [`../state/GOLD_STANDARD_STATE_ROADMAP.md`](../state/GOLD_STANDARD_STATE_ROADMAP.md).

**Stash message**: "UNIFIED: Complete refactor checkpoint - Phase 2 orchestrator + new hooks, atoms, stores, docs (224 files total)"  
**Stash base**: `68a5e2b` (docs: correct consumer map, tighten Phase 6 gate)  
**Total files**: 224  
**Audit started**: 2026-04-26 â€” Reconciled: 2026-05-24

## Legend
| Status | Meaning |
|---|---|
| âœ… PULLED | Logic adopted â€” already in codebase |
| âš ï¸ REVIEW | Needs manual comparison before adopting |
| âŒ REJECTED | Bundled with big-bang stash, do not adopt (wrong pattern / superseded) |
| ðŸ—‘ï¸ DELETE | Stash added docs/tooling files we don't want |
| â³ PENDING | Not yet reviewed |

---

## Deleted files in stash (D) â€” safe to ignore
These were deleted in the stash â€” already cleaned up in recovery branch.

| File | Status |
|---|---|
| `.trae/documents/iVisit _Uber for Emergency_ Roadmap.md` | âœ… PULLED â€” content in GOLD_STANDARD_STATE_ROADMAP.md |
| `.zenflow/tasks/new-task-6128/*` | âŒ REJECTED â€” tool artifacts |
| `.zenflow/tasks/new-task-7623/*` | âŒ REJECTED â€” tool artifacts |
| `services/googlePlacesService.js` | âœ… PULLED â€” migration to Mapbox already done |

---

## Runtime / Layout (app/)
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `app/_layout.js` | M | âœ… PULLED | runtime/ extracted â€” committed Phase 1B |
| `app/(user)/_layout.js` | M | âœ… PULLED | auth routing migrated |
| `app/runtime/OTAModalLayer.jsx` | A | âœ… PULLED | now at `runtime/OTAModalLayer.jsx` |
| `app/runtime/RootNavigator.jsx` | A | âœ… PULLED | now at `runtime/RootNavigator.jsx` |
| `app/runtime/RootProviders.jsx` | A | âœ… PULLED | now at `runtime/RootProviders.jsx` |
| `app/runtime/RootRuntimeGate.jsx` | A | âœ… PULLED â€” Phase 6a | now at `runtime/RootRuntimeGate.jsx` + hydrateModeStore |
| `app/runtime/navigation/deepLinkHelpers.js` | A | âœ… PULLED | now at `runtime/navigation/` |
| `app/runtime/navigation/useAuthRouting.js` | A | âœ… PULLED | |
| `app/runtime/navigation/useInitialRoute.js` | A | âœ… PULLED | |
| `app/runtime/navigation/useRoutePersistence.js` | A | âœ… PULLED | |
| `app/runtime/useRootRuntimeReady.js` | A | âœ… PULLED | |

---

## Atoms
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `atoms/commitAtoms.ts` | A | â³ PENDING | Ephemeral commit UI state â€” review for 6c |
| `atoms/emergencyAtoms.js` | A | âŒ REJECTED | Trip state atoms superseded by emergencyTripStore; mode atoms superseded by useModeStore â€” DELETE in 6e |
| `atoms/mapFlowAtoms.js` | A | âœ… PULLED | Sheet phase, search, viewport â€” canonical ephemeral UI atoms, keep |
| `atoms/mapScreenAtoms.js` | A | âœ… PULLED â€” MapScreen decomp | rating/history/trackingRoute atoms â€” no overlap with mapFlowAtoms (owns sheet/search/viewport) |
| `atoms/paymentAtoms.ts` | A | â³ PENDING | Ephemeral payment UI state â€” review for 6c |
| `atoms/searchAtoms.ts` | A | â³ PENDING | Ephemeral search UI state â€” review for 6c |

---

## Contexts
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `contexts/EmergencyContext.jsx` | M | â³ PENDING | Still live â€” retirement target Phase 6d |
| `contexts/EmergencyContextAdapter.jsx` | A | âš ï¸ REVIEW â€” Phase 6d | Adapter shim confirmed useful â€” install as new EmergencyContextProvider in 6d; re-exports useEmergency() from Zustand stores |
| `contexts/EmergencyContextProviders.jsx` | A | âš ï¸ REVIEW | Provider split â€” review before Phase 6d |
| `contexts/GlobalLocationContext.jsx` | M | âœ… PULLED | Already updated in recovery |

---

## Stores
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `stores/emergencyTripStore.js` | A | âœ… PULLED â€” Phase 1 | Battle-tested, canonical |
| `stores/emergencyTripSelectors.js` | A | âœ… PULLED â€” Phase 1 | |
| `stores/index.js` | A | âœ… PULLED â€” Phase 6a | modeStore exports added |
| `stores/paymentPreferencesStore.ts` | A | âœ… PULLED | |
| `stores/README.md` | A | âœ… PULLED | |
| `stores/modeStore.js` | â€” | âœ… PULLED â€” Phase 6a | New in Phase 6a, not in original stash |

---

## Hooks â€” Emergency
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/emergency/index.js` | A | âœ… PULLED | Barrel export |
| `hooks/emergency/useActiveTripQuery.ts` | A | âœ… PULLED â€” bug fix | Missing useInvalidateActiveTrip added |
| `hooks/emergency/useAmbulanceAnimation.js` | M | âœ… PULLED | |
| `hooks/emergency/useCoverageMode.js` | A | âŒ REJECTED | useState-based hook â€” pattern rejected; useCoverageStore (Zustand) implemented instead |
| `hooks/emergency/useDemoResponderHeartbeat.js` | A | âš ï¸ REVIEW | Demo mode â€” relevant to Phase 6b |
| `hooks/emergency/useEmergencyHospitals.js` | A | âš ï¸ REVIEW | Hospital query wrapper â€” relevant to Phase 6b |
| `hooks/emergency/useEmergencyJotai.js` | A | âŒ REJECTED | Jotai bridge for emergency state â€” superseded by Zustand stores |
| `hooks/emergency/useEmergencyLifecycle.js` | A | âš ï¸ REVIEW | XState lifecycle â€” review before Phase 6c |
| `hooks/emergency/useEmergencyLocationSync.js` | A | âš ï¸ REVIEW â€” Phase 6c | GPS watchPosition + server sync logic is solid; adopt when migrating GPS consumers off EmergencyContext |
| `hooks/emergency/useEmergencyRealtime.js` | A | âš ï¸ REVIEW | Realtime subscriptions extracted â€” review before 6c |
| `hooks/emergency/useEmergencyRequestActions.js` | A | âš ï¸ REVIEW | Request actions extracted â€” review before 6c |
| `hooks/emergency/useEmergencyServerSync.js` | A | âš ï¸ REVIEW | Server sync extracted â€” replaces syncActiveTripsFromServer |
| `hooks/emergency/useEmergencySyncEngine.js` | A | âš ï¸ REVIEW | Sync orchestrator â€” review before 6c |
| `hooks/emergency/useEmergencyTripRuntime.js` | A | âš ï¸ REVIEW | Trip runtime hook â€” review before 6c |
| `hooks/emergency/useHospitalDiscovery.js` | A | âš ï¸ REVIEW | Hospital discovery â€” relevant to Phase 6b |
| `hooks/emergency/useHospitalSelection.js` | M | âœ… PULLED | |
| `hooks/emergency/useHospitals.js` | M | âœ… PULLED | |
| `hooks/emergency/useHospitalsQuery.ts` | A | âœ… PULLED â€” Phase 2 | TanStack Query for hospitals |
| `hooks/emergency/useMapRoute.js` | M | âœ… PULLED | |
| `hooks/emergency/useStableAnimation.js` | A | âš ï¸ REVIEW | Animation stability â€” review for MapScreen decomp |
| `hooks/emergency/useTripSync.js` | A | âš ï¸ REVIEW | Trip sync â€” review before 6c |

---

## Hooks â€” Map ExploreFlow
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/map/exploreFlow/index.js` | A | â³ PENDING | Barrel â€” check if needed |
| `hooks/map/exploreFlow/mapExploreFlow.loading.js` | M | âœ… PULLED | |
| `hooks/map/exploreFlow/useMapBackgroundImage.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapCallbacks.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapCommitFlow.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapComputedBooleans.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapDecisionFlow.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapDerivedData.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapEffects.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapExploreFlow.js` | M | âœ… PULLED â€” Phase 5e | Raw trips â†’ store selectors |
| `hooks/map/exploreFlow/useMapExploreFlowReturn.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapFlowAtoms.js` | A | âš ï¸ REVIEW | Atom bridge â€” may overlap mapFlowAtoms.js |
| `hooks/map/exploreFlow/useMapFlowState.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapHospitalActions.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapHospitalSelection.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapLoadingState.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapLocationHandlers.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapSearchSheet.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapServiceDetail.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapSheetPhase.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapTracking.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapTrackingHeader.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapTrackingTimer.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapUIState.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapUserData.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/exploreFlow/useMapViewport.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |

---

## Hooks â€” Map Shell (âš ï¸ HIGH RISK â€” stash bundled 14 files)
> **Guardrail**: Stash warning in roadmap â€” `hooks/map/shell/` was bundled with everything else. Do NOT adopt wholesale. Each file needs individual review.

| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/map/shell/index.js` | A | âŒ REJECTED | Shell barrel rejected |
| `hooks/map/shell/useMapCommitHandlers.ts` | A | âš ï¸ REVIEW | Commit handlers â€” MapScreen decomp Pass 3 |
| `hooks/map/shell/useMapDecisionHandlers.js` | A | âš ï¸ REVIEW | Decision handlers â€” MapScreen decomp Pass 3 |
| `hooks/map/shell/useMapDerivedState.ts` | A | âš ï¸ REVIEW | Derived state â€” review for overlap |
| `hooks/map/shell/useMapHistoryFlow.js` | A | âš ï¸ REVIEW â€” NEXT | History + rating recovery â€” MapScreen decomp Pass 2 |
| `hooks/map/shell/useMapHospitalResolution.ts` | A | âš ï¸ REVIEW | Hospital resolution â€” MapScreen decomp candidate |
| `hooks/map/shell/useMapMarkerState.ts` | A | âš ï¸ REVIEW | Marker state â€” MapScreen decomp candidate |
| `hooks/map/shell/useMapModals.js` | A | âš ï¸ REVIEW | Modals â€” MapScreen decomp candidate |
| `hooks/map/shell/useMapProfileActions.ts` | A | âš ï¸ REVIEW | Profile actions â€” MapScreen decomp candidate |
| `hooks/map/shell/useMapScreenEffects.js` | A | âš ï¸ REVIEW | Screen effects â€” MapScreen decomp candidate |
| `hooks/map/shell/useMapShell.js` | A | âœ… PULLED â€” MapScreen decomp Pass 1 | Viewport/layout/hasActiveMapModal extracted from MapScreen.jsx |
| `hooks/map/shell/useMapTrackingActions.ts` | A | âš ï¸ REVIEW | Tracking actions â€” MapScreen decomp candidate |
| `hooks/map/shell/useMapTrackingState.js` | A | âš ï¸ REVIEW | Tracking state â€” MapScreen decomp candidate |
| `hooks/map/shell/useMapTrackingSync.ts` | A | âš ï¸ REVIEW â€” Pass 4 | Route reconciliation â€” MapScreen decomp Pass 4 |

---

## Hooks â€” Map Screen
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/map/screen/useMapLoadingState.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapModals.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenHospitals.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenLayout.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenModals.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenPayment.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |
| `hooks/map/screen/useMapScreenTracking.js` | A | âš ï¸ REVIEW | MapScreen decomp candidate |

---

## Hooks â€” Commit
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/commit/index.ts` | A | â³ PENDING | Review before 6c |
| `hooks/commit/useCommitFormSubmission.ts` | A | â³ PENDING | Review before 6c |
| `hooks/commit/useCommitOtpFlow.ts` | A | â³ PENDING | Review before 6c |
| `hooks/commit/useCommitWizardSteps.ts` | A | â³ PENDING | Review before 6c |

---

## Hooks â€” Payment
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/payment/index.ts` | A | âœ… PULLED | Barrel export |
| `hooks/payment/usePaymentCostCalculation.ts` | A | â³ PENDING | |
| `hooks/payment/usePaymentMethodSelection.ts` | A | â³ PENDING | |
| `hooks/payment/usePaymentMethodsQuery.ts` | A | â³ PENDING | TanStack Query for payment methods |
| `hooks/payment/usePaymentScreenModel.js` | M | âœ… PULLED â€” Phase 2 | useInvalidateActiveTrip fix applied |
| `hooks/payment/usePaymentSubmission.ts` | A | â³ PENDING | |
| `hooks/payment/useWalletBalanceQuery.ts` | A | â³ PENDING | TanStack Query for wallet |

---

## Hooks â€” Other
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `hooks/performance/usePerformanceMonitor.js` | A | â³ PENDING | Performance monitoring |
| `hooks/search/useLocationSearchQuery.ts` | A | â³ PENDING | TanStack Query for location search |
| `hooks/search/useSearchRanking.js` | M | âœ… PULLED | |
| `hooks/visits/useBookVisit.js` | M | âœ… PULLED | |

---

## Components
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `components/emergency/EmergencyRequestModal.jsx` | M | âœ… PULLED â€” Phase 5d | |
| `components/emergency/intake/EmergencyLocationPreviewMap.jsx` | M | âœ… PULLED | |
| `components/emergency/intake/EmergencyLocationSearchSheet.jsx` | M | âœ… PULLED | |
| `components/emergency/intake/mapPreviewHelpers.js` | A | â³ PENDING | |
| `components/emergency/intake/useMapPreviewEffects.js` | A | â³ PENDING | |
| `components/emergency/intake/useMapPreviewState.js` | A | â³ PENDING | |
| `components/errorBoundary/MapErrorBoundary.jsx` | A | â³ PENDING | Error boundary for map |
| `components/map/MapScreenModals.jsx` | A | âš ï¸ REVIEW | MapScreen modal extraction â€” review for decomp |
| `components/map/core/MapSheetOrchestrator.jsx` | M | âœ… PULLED â€” Phase 5c | |
| `components/map/core/mapActiveSessionPresentation.js` | M | âœ… PULLED | |
| `components/map/core/mapMetricPresentation.js` | M | âœ… PULLED | |
| `components/map/core/mapOverlayHeaderLayout.js` | M | âœ… PULLED | |
| `components/map/surfaces/search/MapLocationModal.jsx` | M | âœ… PULLED | |
| `components/map/surfaces/search/useMapSearchSheetModel.js` | M | âœ… PULLED | |
| `components/map/views/commitDetails/useMapCommitDetailsController.js` | M | âœ… PULLED â€” Phase 5f | useEmergency removed |
| `components/map/views/commitPayment/useMapCommitPaymentController.js` | M | âœ… PULLED â€” Phase 5d | |
| `components/map/views/commitTriage/useMapCommitTriageController.js` | M | âœ… PULLED â€” Phase 5d | |
| `components/map/views/commitTriage/useTriageCopilotPrompt.js` | A | â³ PENDING | |
| `components/map/views/commitTriage/useTriageLiveSync.js` | A | â³ PENDING | |
| `components/map/views/commitTriage/useTriageStepNavigation.js` | A | â³ PENDING | |
| `components/map/views/shared/TrackHeaderIcon.jsx` | A | â³ PENDING | |
| `components/map/views/tracking/MapTrackingStageBase.jsx` | M | âœ… PULLED â€” Phase 5c | |
| `components/map/views/tracking/mapTracking.styles.js` | M | âœ… PULLED | |
| `components/map/views/tracking/mapTracking.theme.js` | M | âœ… PULLED | |
| `components/map/views/tracking/parts/MapTrackingParts.jsx` | M | âœ… PULLED | |
| `components/map/views/tracking/useMapTrackingController.js` | M | âœ… PULLED | |
| `components/map/views/tracking/useMapTrackingRuntime.js` | M | âœ… PULLED | |
| `components/map/views/tracking/useTrackingActions.js` | A | â³ PENDING | |
| `components/map/views/tracking/useTrackingRating.js` | A | â³ PENDING | Rating â€” relevant to rating modal fix |

---

## Screens
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `screens/BookBedRequestScreen.jsx` | M | â³ PENDING | 6c consumer migration target |
| `screens/EmergencyScreen.jsx` | M | âŒ REJECTED | Deprecated â€” zero router entry points, delete in 6e |
| `screens/MapEntryLoadingScreen.jsx` | M | â³ PENDING | 6c consumer migration target |
| `screens/MapScreen.jsx` | M | âš ï¸ REVIEW | 1434-line monolith â€” MapScreen decomp track |
| `screens/MoreScreen.jsx` | M | â³ PENDING | 6c consumer migration target |
| `screens/NotificationDetailsScreen.jsx` | M | â³ PENDING | 6c consumer migration target |
| `screens/NotificationsScreen.jsx` | M | â³ PENDING | 6c consumer migration target |
| `screens/RequestAmbulanceScreen.jsx` | M | â³ PENDING | 6c consumer migration target |
| `screens/SearchScreen.jsx` | M | â³ PENDING | **6c PILOT** â€” simplest consumer |
| `screens/WelcomeScreen.jsx` | M | â³ PENDING | 6c consumer migration target |

---

## Providers
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `providers/AppProviders.jsx` | M | âœ… PULLED | |
| `providers/AppProviders.web.jsx` | M | âœ… PULLED | |
| `providers/QueryProvider.jsx` | A | âœ… PULLED â€” Phase 2 | TanStack Query provider |
| `providers/UserProviders.jsx` | M | âœ… PULLED | |

---

## Services / Config / Utils
| File | Stash Op | Status | Notes |
|---|---|---|---|
| `services/discoveryService.js` | M | âœ… PULLED | |
| `services/hospitalImportService.js` | M | âœ… PULLED | |
| `constants/mapConfig.js` | M | âœ… PULLED | |
| `utils/navigationHelpers.js` | M | âœ… PULLED | |
| `metro.config.js` | M | âœ… PULLED | Metro resolution fix |
| `babel.config.js` | M | âœ… PULLED | |
| `eslint.config.js` | A | â³ PENDING | |
| `package.json` | M | âœ… PULLED | Dependencies updated |
| `supabase/functions/hospital-media/index.ts` | M | âœ… PULLED | |

---

## Docs â€” Archive / Historical (all âŒ REJECTED â€” do not re-introduce)
> These are stash-era checkpoint docs. Our roadmap supersedes all of them.

`docs/archive/historical/*` â€” 20 files â€” âŒ REJECTED  
`docs/audit/*` â€” 11 files â€” âŒ REJECTED (content absorbed into GOLD_STANDARD_STATE_ROADMAP.md)  
`docs/platform/METRO_ROUTING_FIXES.md` â€” âœ… PULLED (Metro fix already applied)  
`docs/./architecture/emergency/EMERGENCY_STATE_REFACTOR.md` â€” âš ï¸ REVIEW before 6b  
`docs/./architecture/map/ZERO_COST_MAPBOX_MIGRATION.md` â€” â³ PENDING (separate track)  

---

## Phase-gated Review Queue

### Phase 6b âœ… COMPLETE
- `hooks/emergency/useCoverageMode.js` âŒ REJECTED (useState pattern)
- `hooks/emergency/useEmergencyLocationSync.js` â†’ deferred to 6c (GPS consumer migration)
- `docs/./architecture/emergency/EMERGENCY_STATE_REFACTOR.md` âœ… READ â€” EmergencyContextAdapter pattern noted for 6c

### Phase 6c (Consumer migration)
- `atoms/commitAtoms.ts`, `paymentAtoms.ts`, `searchAtoms.ts` â³
- `hooks/commit/*` â³
- `contexts/EmergencyContextAdapter.jsx` âš ï¸
- `contexts/EmergencyContextProviders.jsx` âš ï¸
- All screens marked â³

### MapScreen Decomposition (Parallel track)
- All `hooks/map/exploreFlow/use*.js` (new files) âš ï¸
- All `hooks/map/screen/*` âš ï¸
- `hooks/map/shell/*` â€” individual review only, NOT wholesale âš ï¸
- `components/map/MapScreenModals.jsx` âš ï¸

---

## Summary Stats
| Status | Count |
|---|---|
| âœ… PULLED | ~65 |
| âš ï¸ REVIEW | ~55 |
| â³ PENDING | ~40 |
| âŒ REJECTED | ~15 |
| ðŸ—‘ï¸ Archive docs | ~35 |

> **Rule**: Before touching any âš ï¸ REVIEW file in a phase, read stash version vs current, adopt with PULLBACK NOTE if logic is better, otherwise ignore.
