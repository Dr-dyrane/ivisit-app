---
status: historical
owner: architecture
last_updated: 2026-05-24
---

# Checkpoint: Pre-Provider Detail Phase

> **Reconciliation Note â€” 2026-05-24:** Provider Detail sheet phase has shipped. `PROVIDER_LIST` and `PROVIDER_DETAIL` phases referenced below are now live in `mapSheet.constants.js`, `mapFlowContracts.js`, `useMapSheetPhaseReducer.js`, and `MapSheetOrchestrator.jsx`. This checkpoint is historical evidence of pre-ship cleanliness. For current map sheet doctrine see [`../../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`](../../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md) and [`../map/MAP_EXPLORE_FLOW_MODULARIZATION.md`](../map/MAP_EXPLORE_FLOW_MODULARIZATION.md).

**Date:** 2026-05-17  
**Branch:** main (uncommitted working tree)  
**Status:** âœ… CLEAN â€” no regressions found in 47-file audit (reconciled 2026-05-24: provider-detail phase shipped)

---

## What Changed (30 modified + 7 new files)

### Core Sheet Infrastructure
- `mapSheet.constants.js` â€” Added `PROVIDER_LIST`, `PROVIDER_DETAIL` phases
- `mapFlowContracts.js` â€” Phase contracts, EXPANDED_ONLY, PAYLOAD_OPTIONAL for new phases
- `useMapSheetPhaseReducer.js` â€” Valid transitions: EXPLORE_INTENTâ†”PROVIDER_LISTâ†”PROVIDER_DETAIL
- `MapSheetOrchestrator.jsx` â€” Renders both new phases via MapProviderListOrchestrator + MapProviderDetailOrchestrator

### Explore Care Flow (EXP-4 through EXP-10)
- `mapExploreFlow.transitions.js` â€” `buildProviderListSheetView` added
- `useMapSheetNavigation.js` â€” `openProviderList(category, selectedId)` added
- `useMapExploreFlow.js` â€” `handleExploreCare` â†’ `openProviderList`
- `MapModalOrchestrator.jsx` â€” `handleExploreCare` prop wired (was missing â€” gap closed)
- `atoms/mapFlowAtoms.js` â€” `exploreProviderCategoryAtom`, `exploreProviderIdAtom`, `exploreCareSessionAtom` (L5 Jotai)
- `screens/MapScreen.jsx` â€” All provider phase props + selectedProvider + mapFocusedProviderCoordinate wired

### Map Focus (EXP-7)
- `useMapFocusedState.js` â€” Provider phases suppress hospital focus; `mapFocusedProviderCoordinate` + `mapFocusedProviderType` added
- `ProviderMarkers.jsx` â€” No sibling suppression on selection (hospital suppression handled at map level)

### Hospital List UI
- `mapHospitalList.helpers.js` â€” `bucketHospitalsByTime`, `HOSPITAL_TIME_BUCKETS` added
- `MapHospitalListContent.jsx` â€” Time-bucket section headers (falls back to flat list if only 1 bucket)
- `mapHospitalList.styles.js` â€” Tightened: squircle 28â†’20, marginBottom 14â†’6, removed uppercase badge
- `mapHospitalListStage.styles.js` â€” Eyebrow: 700â†’600 weight, removed uppercase

### Android Gesture
- `useMapAndroidExpandedCollapse.js` â€” Added HALFâ†’EXPANDED expand gesture; combined with collapse gesture; backward-compat alias preserved

### Modal Shell
- `MapModalShell.jsx` â€” `snapState` + `onSnapStateChange` props added; `headerLayout !== "none"` guard fixed

### Choose Care Modal (this session)
- `MapCareHistoryModal.jsx` â€” 2Ã—2 blade grid, expand-modal chevron, two subtaxonomy rails (Direct / Specialist)

### Service Layer
- `hospitalsService.js` â€” `discoverNearby` hard-locked to hospital category (EXP-4); `discoverNearbyProviders` + `listNearbyProviders` added for explore mode

### Persistence (Issue-3)
- `stores/lastHospitalStore.js` â€” Zustand + AsyncStorage cache for last selected hospital (eliminates reload lag)
- `useEmergencyHospitalSync.js` â€” Migrated from deleted `useHospitals` to `useEmergencyHospitalsQuery` (L2 TanStack); persists last hospital on select
- `database/keys.js` â€” `EXPLORE_CARE_SESSION`, `LAST_HOSPITAL_CACHE` storage keys
- `runtime/RootRuntimeGate.jsx` â€” `hydrateLastHospitalStore()` added to hydration sequence

---

## New Files Justification

| File | Reason | Risk |
|---|---|---|
| `constants/providerTypes.js` | Single source of truth for taxonomy, capability tags, classify helpers | None |
| `hooks/emergency/useNearbyProviders.js` | TanStack L2 hook â€” explore providers, no emergency filter | None |
| `stores/lastHospitalStore.js` | Reload-lag fix â€” hospital cache survives app kill | None |
| `utils/bookRideUtils.js` | Uber/Maps deep-link for explore CTAs | `UBER_CLIENT_ID` is empty string â€” needs env config |
| `components/map/views/providerList/` | Provider list sheet phase (5 files) | See review notes below |
| `components/map/views/providerDetail/` | Provider detail sheet phase (5 files) | See review notes below |
| `components/map/surfaces/providerDetail/` | Body, model, styles | See review notes below |

**Deleted:** `hooks/emergency/useHospitals.js` â€” confirmed no remaining importers. Replaced by `useEmergencyHospitalsQuery`.

---

## Known TODOs Before Provider Detail Phase

1. **`UBER_CLIENT_ID`** in `utils/bookRideUtils.js` â€” must be set via env before ride CTA goes live
2. **`MapProviderListSheet.jsx`** (28KB) â€” largest new file, needs full review pass before touching
3. **`MapProviderDetailStageBase.jsx`** â€” review body sections: hours, distance, rating, capabilities, book/ride CTAs
4. **`useMapProviderDetailModel.js`** â€” confirm data completeness (name, address, phone, hours, distance, rating)
5. **Back-navigation UX** â€” PROVIDER_DETAIL â†’ back â†’ PROVIDER_LIST should restore scroll position / selected state

---

## Rollback Notes

To revert all uncommitted changes:
```
git restore .
git clean -fd components/map/surfaces/providerDetail components/map/views/providerDetail components/map/views/providerList constants/providerTypes.js hooks/emergency/useNearbyProviders.js stores/lastHospitalStore.js utils/bookRideUtils.js
```

To restore deleted file only:
```
git checkout HEAD -- hooks/emergency/useHospitals.js
```
