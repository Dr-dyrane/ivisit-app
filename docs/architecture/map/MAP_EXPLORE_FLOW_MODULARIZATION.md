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
│
├── Context reads (inline — correct, 1-liners)
│   ├── useTheme → isDarkMode
│   ├── useAuth → user
│   ├── useVisits → visits
│   ├── useGlobalLocation → location data
│   ├── useEmergency → hospitals, trips, coverage
│   └── useScrollAwareHeader / useHeaderState → header controls
│
├── Store
│   └── useMapExploreFlowStore → flowState + flowActions (Zustand)
│
├── Extracted hooks (in call order)
│   ├── useMapViewport          → dimensions, sidebar, surfaceConfig
│   ├── useMapLocation          → activeLocation, manual location, place label
│   ├── useMapUserData          → isSignedIn, profileImageSource
│   ├── useMapExploreDemoBootstrap → demo coverage bootstrapping
│   ├── useMapEffects           → useFocusEffect: header hide/restore on nav
│   ├── useMapDerivedData       → activeMapRequest, discoveredHospitals,
│   │                             nearestHospital, featuredHospitals,
│   │                             recentVisits, bed counts
│   ├── useMapHospitalSelection → auto-select effect + 4 interaction callbacks
│   │                             (props-driven: receives derived data from above)
│   ├── useMapTracking          → openTracking, closeTracking, nowMs clock
│   │   └── useMapTrackingTimer → shared broadcast interval (1 setInterval, N listeners)
│   ├── useMapSheetNavigation   → all sheet open/close handlers
│   ├── useMapCommitFlow        → commit details/triage/payment lifecycle
│   ├── useMapTrackingHeader    → header visibility, occlusion height, nowMs consumer
│   ├── useMapServiceDetail     → service detail sheet
│   ├── useMapCallbacks         → handleChooseCare, handleOpenFeaturedHospital,
│   │                             handleOpenProfile, handleMapReadinessChange
│   ├── useMapExploreGuestProfileFab → guest profile FAB behaviour
│   ├── useMapComputedBooleans  → hasActiveLocation, isMapFrameReady,
│   │                             isBackgroundCoverageLoading, etc.
│   └── useMapLoadingState      → shouldShowMapLoadingOverlay, mapLoadingState
│
└── Intentional inline (not extracted — correct)
    ├── needsCoverageExpansion / shouldBootstrapDemoCoverage  (pure fn calls)
    ├── defaultExploreSnapState                               (trivial ternary)
    ├── hasActiveMapModal                                     (local boolean OR)
    ├── trackingRequestKey = activeMapRequest.requestId       (single destructure)
    └── useEffect → nowMsRef.current = nowMs                  (ref sync, unavoidable)
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
├── useMapExploreFlow.js          (orchestrator — 557 lines)
├── useMapViewport.js
├── useMapLocation.js
├── useMapHospitalSelection.js    (refactored Pass 14a)
├── useMapTrackingHeader.js       (nowMs lifted out)
├── useMapCommitFlow.js
├── useMapSheetNavigation.js
├── useMapServiceDetail.js
├── useMapLoadingState.js
├── useMapTracking.js             (new Pass 11)
├── useMapTrackingTimer.js        (new Pass 10)
├── useMapDerivedData.js          (new Pass 12)
├── useMapComputedBooleans.js     (new Pass 13)
├── useMapCallbacks.js            (new Pass 14b)
├── useMapUserData.js             (new Pass 14c)
├── useMapEffects.js              (new Pass 15)
├── useMapExploreDemoBootstrap.js
├── useMapExploreGuestProfileFab.js
└── index.js                      (new Pass 16 — barrel)

components/map/surfaces/visitDetail/
└── useMapVisitDetailModel.js     (TDZ fix — hoisted canResume/canRate declarations)
```
