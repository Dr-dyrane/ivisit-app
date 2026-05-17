# Checkpoint: Pre-Provider Detail Phase
**Date:** 2026-05-17  
**Branch:** main (uncommitted working tree)  
**Status:** ✅ CLEAN — no regressions found in 47-file audit

---

## What Changed (30 modified + 7 new files)

### Core Sheet Infrastructure
- `mapSheet.constants.js` — Added `PROVIDER_LIST`, `PROVIDER_DETAIL` phases
- `mapFlowContracts.js` — Phase contracts, EXPANDED_ONLY, PAYLOAD_OPTIONAL for new phases
- `useMapSheetPhaseReducer.js` — Valid transitions: EXPLORE_INTENT↔PROVIDER_LIST↔PROVIDER_DETAIL
- `MapSheetOrchestrator.jsx` — Renders both new phases via MapProviderListOrchestrator + MapProviderDetailOrchestrator

### Explore Care Flow (EXP-4 through EXP-10)
- `mapExploreFlow.transitions.js` — `buildProviderListSheetView` added
- `useMapSheetNavigation.js` — `openProviderList(category, selectedId)` added
- `useMapExploreFlow.js` — `handleExploreCare` → `openProviderList`
- `MapModalOrchestrator.jsx` — `handleExploreCare` prop wired (was missing — gap closed)
- `atoms/mapFlowAtoms.js` — `exploreProviderCategoryAtom`, `exploreProviderIdAtom`, `exploreCareSessionAtom` (L5 Jotai)
- `screens/MapScreen.jsx` — All provider phase props + selectedProvider + mapFocusedProviderCoordinate wired

### Map Focus (EXP-7)
- `useMapFocusedState.js` — Provider phases suppress hospital focus; `mapFocusedProviderCoordinate` + `mapFocusedProviderType` added
- `ProviderMarkers.jsx` — No sibling suppression on selection (hospital suppression handled at map level)

### Hospital List UI
- `mapHospitalList.helpers.js` — `bucketHospitalsByTime`, `HOSPITAL_TIME_BUCKETS` added
- `MapHospitalListContent.jsx` — Time-bucket section headers (falls back to flat list if only 1 bucket)
- `mapHospitalList.styles.js` — Tightened: squircle 28→20, marginBottom 14→6, removed uppercase badge
- `mapHospitalListStage.styles.js` — Eyebrow: 700→600 weight, removed uppercase

### Android Gesture
- `useMapAndroidExpandedCollapse.js` — Added HALF→EXPANDED expand gesture; combined with collapse gesture; backward-compat alias preserved

### Modal Shell
- `MapModalShell.jsx` — `snapState` + `onSnapStateChange` props added; `headerLayout !== "none"` guard fixed

### Choose Care Modal (this session)
- `MapCareHistoryModal.jsx` — 2×2 blade grid, expand-modal chevron, two subtaxonomy rails (Direct / Specialist)

### Service Layer
- `hospitalsService.js` — `discoverNearby` hard-locked to hospital category (EXP-4); `discoverNearbyProviders` + `listNearbyProviders` added for explore mode

### Persistence (Issue-3)
- `stores/lastHospitalStore.js` — Zustand + AsyncStorage cache for last selected hospital (eliminates reload lag)
- `useEmergencyHospitalSync.js` — Migrated from deleted `useHospitals` to `useEmergencyHospitalsQuery` (L2 TanStack); persists last hospital on select
- `database/keys.js` — `EXPLORE_CARE_SESSION`, `LAST_HOSPITAL_CACHE` storage keys
- `runtime/RootRuntimeGate.jsx` — `hydrateLastHospitalStore()` added to hydration sequence

---

## New Files Justification

| File | Reason | Risk |
|---|---|---|
| `constants/providerTypes.js` | Single source of truth for taxonomy, capability tags, classify helpers | None |
| `hooks/emergency/useNearbyProviders.js` | TanStack L2 hook — explore providers, no emergency filter | None |
| `stores/lastHospitalStore.js` | Reload-lag fix — hospital cache survives app kill | None |
| `utils/bookRideUtils.js` | Uber/Maps deep-link for explore CTAs | `UBER_CLIENT_ID` is empty string — needs env config |
| `components/map/views/providerList/` | Provider list sheet phase (5 files) | See review notes below |
| `components/map/views/providerDetail/` | Provider detail sheet phase (5 files) | See review notes below |
| `components/map/surfaces/providerDetail/` | Body, model, styles | See review notes below |

**Deleted:** `hooks/emergency/useHospitals.js` — confirmed no remaining importers. Replaced by `useEmergencyHospitalsQuery`.

---

## Known TODOs Before Provider Detail Phase

1. **`UBER_CLIENT_ID`** in `utils/bookRideUtils.js` — must be set via env before ride CTA goes live
2. **`MapProviderListSheet.jsx`** (28KB) — largest new file, needs full review pass before touching
3. **`MapProviderDetailStageBase.jsx`** — review body sections: hours, distance, rating, capabilities, book/ride CTAs
4. **`useMapProviderDetailModel.js`** — confirm data completeness (name, address, phone, hours, distance, rating)
5. **Back-navigation UX** — PROVIDER_DETAIL → back → PROVIDER_LIST should restore scroll position / selected state

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
