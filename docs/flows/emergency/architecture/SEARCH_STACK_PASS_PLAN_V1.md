# Search Stack Pass Plan (v1)

Status: Code implemented, runtime verification pending

## Intent

Bring `/(user)/(stacks)/search` into the same stack-screen family as payment, emergency contacts, profile, settings, medical profile, and insurance.

## Target Architecture

- `app/(user)/(stacks)/search.js` stays a thin route wrapper and keeps `SearchBoundary`
- `screens/SearchScreen.jsx` becomes composition-only
- `components/search/SearchScreenOrchestrator.jsx`
- `components/search/SearchStageBase.jsx`
- `components/search/SearchWideLayout.jsx`
- `hooks/search/useSearchScreenModel.js`
- `components/search/searchScreen.content.js`
- `components/search/searchScreen.theme.js`
- `components/search/searchSidebarLayout.js`

Supporting surfaces expected in this wave:

- `SearchContextPane`
- `SearchActionIsland`
- `SearchDiscoveryPanel`
- `SearchResultList`

## Primary Change

The route and screen should stop owning:

- header wiring
- shell animation and viewport branching
- discovery-tab state
- search results section building
- wide-screen composition
- loading-state decisions

The page becomes:

- a calm search-first surface
- one obvious primary action: search or select a useful shortcut
- a grouped result/discovery language that matches the refined stack family
- a wide-screen shell with context islands instead of stretched compact content

## State Management Posture

This wave improves state ownership but does not attempt a full five-layer migration.

Target posture after implementation:

- provider/local state: `query`, `recentQueries`, history persistence
- TanStack Query: trending searches, health news
- Jotai UI state: active discovery tab
- screen model: derived rows, action handlers, section switching

Explicitly deferred:

- Zustand canonical search store
- XState search lifecycle machine
- realtime discovery subscriptions

## Preserved Behavior

- manual healthcare search still works
- ranked search results still include hospitals, visits, and notifications
- specialty selection still influences booking search behavior
- recent searches still persist locally
- trending search and health news discovery still appear
- search result navigation still routes to SOS, visits, and notifications

## UI Direction

- copy stays short and task-led
- typography caps at `700`
- results and recent history lean on grouped blades instead of loud promotional cards
- wide desktop uses left context + center search surface + right utility island only when the ratio allows it
- route-sized and discovery-feed loading states use skeletons

## Verification Target

- search route no longer crashes when mounted directly
- search renders as a thin-route stack surface, not a route-owned monolith
- discovery feeds load through Query-backed loading states
- recent searches, discovery shortcuts, and result selection all still work
- wide layout remains healthy at `1280`, `1440`, and `1920`
- no activity-indicator-only loading states remain on the main search surface
