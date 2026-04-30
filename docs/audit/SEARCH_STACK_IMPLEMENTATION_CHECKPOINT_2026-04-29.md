# Search Stack Implementation Checkpoint (2026-04-29)

Status: Code implemented  
Verification state: Runtime/device matrix still pending

## Scope

`SearchScreen` stack-surface modernization against the current payment, profile, settings, medical profile, and coverage contract.

## What Landed

- `app/(user)/(stacks)/search.js` now keeps `SearchBoundary` at the route edge, so direct stack routing no longer crashes on a missing provider.
- `screens/SearchScreen.jsx` is now a thin composition root that only mounts `SearchScreenOrchestrator`.
- `components/search/SearchScreenOrchestrator.jsx` now owns header wiring, focus refresh, compact vs wide composition choice, and pull-to-refresh wiring.
- `components/search/SearchStageBase.jsx` now owns viewport-aware shell, motion boot, compact scroll plumbing, and `stackViewportConfig.js` consumption.
- `hooks/search/useSearchScreenModel.js` now owns:
  - Jotai-backed discovery tab state
  - derived quick-action, discovery, recent, and result rows
  - specialty filter interaction
  - result-count and summary label derivation
  - primary-action behavior
- `components/search/SearchWideLayout.jsx` now uses:
  - left context island
  - center search/result surface
  - XL right action island only when the ratio allows it
- `components/search/SearchDiscoveryPanel.jsx`, `SearchResultList.jsx`, and `SearchGroupedRows.jsx` replace the older loud route-owned discovery/result composition with the quieter grouped blade grammar used by the refined stack family.
- `components/search/SuggestiveContent.jsx` and `SearchSpecialtySelector.jsx` were removed after the ownership split landed.

## State Management Status

`Search` is improved, but it is **not** a full five-layer feature.

Current posture after this pass:

- provider/local state: `query`, `recentQueries`, local history persistence
- query cache: `useSearchDiscoveryFeeds()` for trending searches and health news
- Jotai UI state: discovery tab selection
- screen model: section switching, row derivation, action handlers

Still deferred:

- Zustand canonical search store
- XState lifecycle machine
- Search-specific realtime lane

## Data-Path Hardening

- `SearchContext` no longer writes an empty recent-history snapshot back to storage before the initial history read completes.
- discovery feeds now live behind TanStack Query instead of provider-owned fetch effects.
- ranked results still route through the same hospital, visit, and notification navigation paths after the ranking hook cleanup.

## Preserved Behavior

- manual search still returns hospitals, visits, and notifications
- specialty selection still influences booking-focused search
- recent searches still persist locally
- trending searches and health news still appear on the search route
- search result actions still navigate into SOS, visits, and notifications

## Surface Outcome

- compact/mobile now behaves like a calm search-first stack page instead of a route-owned discovery page
- wide screens use a left context island and optional right utility island instead of stretching the compact layout
- grouped result, discovery, and recent-history surfaces now align with the mini-profile / profile / settings blade grammar
- route-sized and discovery-feed loading states now favor structural skeletons over lone activity indicators

## Remaining Verification

Still needed before calling this fully closed:

- seven-width visual matrix: `375, 430, 744, 1024, 1280, 1440, 1920`
- runtime smoke for:
  - direct route open of `/(user)/(stacks)/search`
  - manual search input + blur commit
  - hospital result navigation into SOS
  - visit result navigation
  - notification result navigation
  - specialty filter interaction in booking mode
  - pull-to-refresh discovery feeds
