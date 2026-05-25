---
status: living
owner: architecture
last_updated: 2026-05-14
---

# Map Explore Flow — Modularization Record

**Status**: Complete  
**Completed**: 2026-04-26  
**Starting line count**: ~800+ (monolith)  
**Final orchestrator line count**: 557  
**Total hooks extracted**: 18  

---

## Context

`useMapExploreFlow.js` was a monolithic orchestrator that owned all map screen logic inline —
derived data, hospital selection, tracking lifecycle, sheet navigation, callbacks, effects,
and loading state all mixed together. This was the result of a rush implementation.

This document records the deliberate, pass-by-pass extraction that cleaned it up without
dropping any behaviour. Every pass was verified before the next began.

---

## Architecture — Hook Responsibility Map

```
useMapExploreFlow (orchestrator — 557 lines)
â”‚
â”œâ”€â”€ Context reads (inline — correct, 1-liners)
â”‚   â”œâ”€â”€ useTheme → isDarkMode
â”‚   â”œâ”€â”€ useAuth → user
â”‚   â”œâ”€â”€ useVisits → visits
â”‚   â”œâ”€â”€ useGlobalLocation → location data
â”‚   â”œâ”€â”€ useEmergency → hospitals, trips, coverage
â”‚   â””â”€â”€ useScrollAwareHeader / useHeaderState → header controls
â”‚
â”œâ”€â”€ Store
â”‚   â””â”€â”€ useMapExploreFlowStore → flowState + flowActions (Zustand)
â”‚
â”œâ”€â”€ Extracted hooks (in call order)
â”‚   â”œâ”€â”€ useMapViewport          → dimensions, sidebar, surfaceConfig
â”‚   â”œâ”€â”€ useMapLocation          → activeLocation, manual location, place label
â”‚   â”œâ”€â”€ useMapUserData          → isSignedIn, profileImageSource
â”‚   â”œâ”€â”€ useMapExploreDemoBootstrap → demo coverage bootstrapping
â”‚   â”œâ”€â”€ useMapEffects           → useFocusEffect: header hide/restore on nav
â”‚   â”œâ”€â”€ useMapDerivedData       → activeMapRequest, discoveredHospitals,
â”‚   â”‚                             nearestHospital, featuredHospitals,
â”‚   â”‚                             recentVisits, bed counts
â”‚   â”œâ”€â”€ useMapHospitalSelection → auto-select effect + 4 interaction callbacks
â”‚   â”‚                             (props-driven: receives derived data from above)
â”‚   â”œâ”€â”€ useMapTracking          → openTracking, closeTracking, nowMs clock
â”‚   â”‚   â””â”€â”€ useMapTrackingTimer → shared broadcast interval (1 setInterval, N listeners)
â”‚   â”œâ”€â”€ useMapSheetNavigation   → all sheet open/close handlers
â”‚   â”œâ”€â”€ useMapCommitFlow        → commit details/triage/payment lifecycle
â”‚   â”œâ”€â”€ useMapTrackingHeader    → header visibility, occlusion height, nowMs consumer
â”‚   â”œâ”€â”€ useMapServiceDetail     → service detail sheet
â”‚   â”œâ”€â”€ useMapCallbacks         → handleChooseCare, handleOpenFeaturedHospital,
â”‚   â”‚                             handleOpenProfile, handleMapReadinessChange
â”‚   â”œâ”€â”€ useMapExploreGuestProfileFab → guest profile FAB behaviour
â”‚   â”œâ”€â”€ useMapComputedBooleans  → hasActiveLocation, isMapFrameReady,
â”‚   â”‚                             isBackgroundCoverageLoading, etc.
â”‚   â””â”€â”€ useMapLoadingState      → shouldShowMapLoadingOverlay, mapLoadingState
â”‚
â””â”€â”€ Intentional inline (not extracted — correct)
    â”œâ”€â”€ needsCoverageExpansion / shouldBootstrapDemoCoverage  (pure fn calls)
    â”œâ”€â”€ defaultExploreSnapState                               (trivial ternary)
    â”œâ”€â”€ hasActiveMapModal                                     (local boolean OR)
    â”œâ”€â”€ trackingRequestKey = activeMapRequest.requestId       (single destructure)
    â””â”€â”€ useEffect → nowMsRef.current = nowMs                  (ref sync, unavoidable)
```

---

## Pass Log

| Pass | Hook created / changed | Key change |
|------|------------------------|------------|
| 1 | `useMapViewport` | Viewport dimensions, sidebar |
| 2 | `useMapLocation` | Location resolution, manual override |
| 3 | `useMapHospitalSelection` | Hospital derived data + auto-select (original) |
| 4 | `useMapTrackingHeader` | Tracking header + nowMs (original — had internal timer) |
| 5 | `useMapCommitFlow` | Commit flow lifecycle |
| 6 | `useMapSheetNavigation` | Sheet phase transitions |
| 7 | `useMapServiceDetail` | Service detail sheet |
| 8 | `useMapLoadingState` | Loading overlay state |
| 9 | Orchestrator cleanup | Removed dead imports |
| TDZ fix | `useMapExploreFlow` + `useMapVisitDetailModel` | Hoisted declarations above consuming memos |
| 10 | `useMapTrackingTimer` | Shared broadcast clock (replaces per-hook setInterval) |
| 11 | `useMapTracking` | openTracking, closeTracking, auto-open effect, nowMs |
| 12 | `useMapDerivedData` | activeMapRequest, all hospital memos, recentVisits |
| 13 | `useMapComputedBooleans` | Boolean loading/readiness flags |
| 14a | `useMapHospitalSelection` refactor | Stripped duplicate memos — now props-driven from useMapDerivedData |
| 14b | `useMapCallbacks` | 4 UI interaction callbacks |
| 14c | `useMapUserData` | isSignedIn, profileImageSource |
| 15 | `useMapEffects` | useFocusEffect header lifecycle |
| 16 | `index.js` | Barrel export for all 18 hooks |
| 19D | `useMapExploreFlow` + `useMapHospitalSelection` | Hybrid marker selection + TDZ fixes (map flow atoms) |

---

## Key Architectural Decisions

### Single source of truth for hospital data
`useMapDerivedData` owns all hospital memo computation.  
`useMapHospitalSelection` accepts them as props — no duplication.  
**Pass 14a fixed a double-computation bug** introduced when Pass 12 was added.

### Shared broadcast clock
`useMapTrackingTimer` runs **one** `setInterval` for the whole screen.  
Both `useMapTracking` and `useMapTrackingHeader` subscribe to it.  
Old pattern had each hook running its own interval — redundant and drift-prone.

### nowMs TDZ safety
`activeMapRequest` needs `nowMs` to compute ETAs.  
But `nowMs` comes from `useMapTracking` which depends on `activeMapRequest`.  
Resolution: `nowMsRef` seeded to `Date.now()` before `useMapDerivedData` runs.  
`useEffect` keeps the ref in sync after each clock tick. First render is stable.

### PASS 19D — Hybrid Marker Selection + TDZ Fixes
**Date:** 2026-05-14  
**Objective:** Fix temporal dead zone errors and implement hybrid marker selection using map flow atoms

**Changes:**
1. **Added map flow atoms (L5 Jotai):**
   - `mapSelectedHospitalIdAtom` — ephemeral UI state for hospital selection
   - `mapFeaturedHospitalAtom` — ephemeral UI state for featured hospital
   - These survive sheet collapse (unlike component state)

2. **Created `selectHospitalForMap` function:**
   - Updates map flow atoms (primary source for map interactions)
   - Updates EMERGENCY context state (fallback for emergency flow compatibility)
   - Returns hospital object for caller to open hospital detail sheet
   - Fixed duplicate hospital lookup (cached in variable)

3. **Fixed TDZ errors:**
   - Moved `selectHospitalForMap` definition after `discoveredHospitals` (line 310-346 after line 320-331)
   - Reordered hooks: `useMapHospitalSelection` before `useMapSheetNavigation`
   - Removed `openHospitalDetail` from `useMapHospitalSelection` props
   - Wrapped `handleMapHospitalPress` to call `openHospitalDetail` after definition

4. **Updated `handleMapHospitalPress`:**
   - Now uses `selectHospitalForMap` instead of direct `selectHospital`
   - Returns hospital object (documented with JSDoc)
   - Removed unused `sheetPhase` prop

5. **Added user location marker tap handler:**
   - `onUserLocationPress` prop added to map components
   - Triggers location sheet phase on user location marker tap

**Files Changed:**
- `hooks/map/exploreFlow/useMapExploreFlow.js` (+124/-30)
- `hooks/map/exploreFlow/useMapHospitalSelection.js` (+15/-?)
- `screens/MapScreen.jsx` (+1)
- `components/emergency/EmergencyMapContainer.jsx` (+3)
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx` (+2)
- `components/map/FullScreenEmergencyMap.jsx` (+2)

**Guardrails Compliance:**
- ✅ State Management: Jotai atoms for ephemeral UI state (L5)
- ✅ TDZ Prevention: All temporal dead zone errors fixed
- ✅ Hook Design: Single responsibility, proper deps
- ✅ File Organization: Hooks in correct location
- ✅ Defensive Programming: Null safety, optional chaining

### Hook call ordering (dependency order)
```
useMapDerivedData          ← first: produces discoveredHospitals, activeMapRequest
useMapHospitalSelection    ← second: consumes discoveredHospitals, nearestHospital
useMapTracking             ← third: consumes trackingRequestKey from activeMapRequest
useMapSheetNavigation      ← fourth: consumes discoveredHospitals, nearestHospital
useMapCommitFlow           ← fifth: consumes openTracking from useMapTracking
useMapTrackingHeader       ← sixth: consumes nowMs from useMapTracking
useMapCallbacks            ← seventh: consumes handleOpenFeaturedHospitalBase from useMapHospitalSelection
```

### PULLBACK NOTE convention
All changes follow this inline comment format:
```js
// PULLBACK NOTE: Brief description
// OLD: original
// NEW: updated
```
Every extracted hook has this at the top. Every wiring change in the orchestrator has it inline.
This makes every change fully reversible with clear context.

---

## Known Deferred Issues

### Hospital marker intermittent visibility
**Not introduced by these passes.**  
Root cause: loading race — `nearestHospital` is null on first render before hospitals load.  
`selectHospital` fires from `useMapHospitalSelection`'s auto-select effect, but `selectedHospital`
hasn't propagated back through `EmergencyContext` yet when the map renders.  
Fix: requires `useEmergency` timing audit — deferred to state migration sprint.

---

## Git Reference — Checkpoints

### How to use these hashes

```bash
# View the monolith at any time
git show 754a4c6:hooks/map/exploreFlow/useMapExploreFlow.js

# Diff monolith vs current orchestrator
git diff 754a4c6 -- hooks/map/exploreFlow/useMapExploreFlow.js

# Restore monolith to a temp file for side-by-side comparison
git show 754a4c6:hooks/map/exploreFlow/useMapExploreFlow.js > /tmp/useMapExploreFlow.monolith.js

# See all files that existed before passes began
git show 754a4c6 --stat
```

### Commit hashes

| Checkpoint | Hash | Description | Orchestrator lines |
|-----------|------|-------------|-------------------|
| **Monolith (baseline)** | `754a4c6` | Last commit before Pass 1 began — full 1638-line monolith | 1638 |
| Pass 1–3 (viewport, location, hospital selection) | `e6f86ec` | First extraction commit | — |
| Pass 4 (tracking header) | `87e37e5` | useMapTrackingHeader extracted | — |
| Pass 5 (commit flow) | `059754c` | useMapCommitFlow extracted | — |
| Pass 6 (sheet navigation) | `d74f923` | useMapSheetNavigation extracted | — |
| Pass 7 (service detail) | `be51a59` | useMapServiceDetail extracted | — |
| Pass 8 (loading state) | `fa29003` | useMapLoadingState extracted — last committed pass | ~585 |
| **Passes 10–16 + docs** | uncommitted | useMapTracking, useMapTrackingTimer, useMapDerivedData, useMapComputedBooleans, useMapCallbacks, useMapUserData, useMapEffects, index.js, Pass 14a dedup, docs | **557** |

### Branch
All work on: `recovery/clean-2026-04-25`

### Recommended: commit Passes 10–16 before next sprint
Uncommitted files as of 2026-04-26:
- `hooks/map/exploreFlow/useMapTracking.js` (new)
- `hooks/map/exploreFlow/useMapTrackingTimer.js` (new)
- `hooks/map/exploreFlow/useMapDerivedData.js` (new)
- `hooks/map/exploreFlow/useMapComputedBooleans.js` (new)
- `hooks/map/exploreFlow/useMapCallbacks.js` (new)
- `hooks/map/exploreFlow/useMapUserData.js` (new)
- `hooks/map/exploreFlow/useMapEffects.js` (new)
- `hooks/map/exploreFlow/index.js` (new)
- `hooks/map/exploreFlow/useMapExploreFlow.js` (modified)
- `hooks/map/exploreFlow/useMapHospitalSelection.js` (modified — Pass 14a dedup)
- `hooks/map/exploreFlow/useMapTrackingHeader.js` (modified — nowMs lifted)
- `components/map/surfaces/visitDetail/useMapVisitDetailModel.js` (modified — TDZ fix)
- `docs/./architecture/map/MAP_EXPLORE_FLOW_MODULARIZATION.md` (new)
- `docs/./architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` (new)
- `docs/INDEX.md` (modified)

---

## Files Changed

```
hooks/map/exploreFlow/
â”œâ”€â”€ useMapExploreFlow.js          (orchestrator — 557 lines)
â”œâ”€â”€ useMapViewport.js
â”œâ”€â”€ useMapLocation.js
â”œâ”€â”€ useMapHospitalSelection.js    (refactored Pass 14a)
â”œâ”€â”€ useMapTrackingHeader.js       (nowMs lifted out)
â”œâ”€â”€ useMapCommitFlow.js
â”œâ”€â”€ useMapSheetNavigation.js
â”œâ”€â”€ useMapServiceDetail.js
â”œâ”€â”€ useMapLoadingState.js
â”œâ”€â”€ useMapTracking.js             (new Pass 11)
â”œâ”€â”€ useMapTrackingTimer.js        (new Pass 10)
â”œâ”€â”€ useMapDerivedData.js          (new Pass 12)
â”œâ”€â”€ useMapComputedBooleans.js     (new Pass 13)
â”œâ”€â”€ useMapCallbacks.js            (new Pass 14b)
â”œâ”€â”€ useMapUserData.js             (new Pass 14c)
â”œâ”€â”€ useMapEffects.js              (new Pass 15)
â”œâ”€â”€ useMapExploreDemoBootstrap.js
â”œâ”€â”€ useMapExploreGuestProfileFab.js
â””â”€â”€ index.js                      (new Pass 16 — barrel)

components/map/surfaces/visitDetail/
â””â”€â”€ useMapVisitDetailModel.js     (TDZ fix — hoisted canResume/canRate declarations)
```

---

## Reconciliation Note - 2026-05-24

> Appended during the 2026-05-24 docs update sweep (Pass 4 - living-verify batch).

**Doc body status** - the architecture record above (18-hook extraction map, pass-by-pass commit log) remains accurate as a historical modularization record.

**Drift against current HEAD**

- The "Final orchestrator line count: 557" figure is the 2026-04-26 post-extraction snapshot. `hooks/map/exploreFlow/useMapExploreFlow.js` currently measures ~744 lines on HEAD.
- The growth is incremental glue added by later passes (additional sheet-navigation surfaces, decision-handler wiring, tracking-rating threading) rather than re-monolithization.

**Carryforward**

- If line count exceeds ~800, treat as a trigger to evaluate a follow-up extraction pass against the responsibility map above.
- Do NOT edit the historical "Final orchestrator line count" figure in the body - it documents the post-modularization checkpoint, not the live state.
