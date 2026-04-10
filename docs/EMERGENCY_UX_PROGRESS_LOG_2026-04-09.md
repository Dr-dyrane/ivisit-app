# Emergency UX Progress Log — 2026-04-09

> Status: Active checkpoint log  
> Scope: `ivisit-app` `/map` entry, modal focus, location labeling, and demo coverage hardening  
> Purpose: preserve the exact decisions from today so the team can continue from the right source of truth.

## Proper doc assignment for today’s fixes

- **User-visible emergency runtime changes** → this file
- **Coverage/bootstrap rule changes** → [`DEMO_MODE_COVERAGE_FLOW.md`](./DEMO_MODE_COVERAGE_FLOW.md)
- **Fast continuation memory for code work** → repo memory under `/memories/repo/`

---

## What we fixed today

### 1) `/map` now opens directly instead of trapping the user on a separate loading route

#### Problem addressed
- users could get stuck on a dedicated `map-loading` experience that felt broken or disconnected from the real map

#### Change made
- welcome/emergency entry now routes straight into the real `/(auth)/map`
- the old `map-loading` route has been retired/removed as dead code
- the loading state now lives **inside the real map surface**

#### Files involved
- `screens/WelcomeScreen.jsx`
- `app/_layout.js`
- `screens/MapScreen.jsx`
- `hooks/map/useMapExploreFlow.js`
- reference rules now live in `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`

---

### 2) The map loading UI is now informative and more seamless

#### Problem addressed
- users could see flashing/blinking loading states and not know what the app was doing

#### Change made
- the in-map loading overlay now explains progress with steps like:
  - `Location`
  - `Nearby care`
  - `Map + route`
- the overlay is latched to initial map entry / explicit location changes
- it fades out instead of snapping away

#### Files involved
- `components/map/MapExploreLoadingOverlay.jsx`
- `components/map/mapExploreLoadingOverlay.styles.js`
- `hooks/map/useMapExploreFlow.js`

---

### 3) `/map` location labels no longer fall back to raw latitude/longitude

#### Problem addressed
- deployed web sometimes showed raw coordinates in the header when reverse geocoding failed

#### Change made
- resolution chain is now:
  1. `expo-location`
  2. `Mapbox`
  3. `OpenStreetMap / Nominatim`
  4. `Google`
  5. friendly copy: `Current location` / `Nearby area`
- final fallback no longer exposes raw coordinates to the user

#### Files involved
- `contexts/GlobalLocationContext.jsx`
- `services/googlePlacesService.js`
- `services/mapboxService.js`

---

### 4) `/map` modals now behave like one coordinated focus system

#### Problem addressed
- modal height and focus treatment could drift away from the expanded sheet behavior
- header chrome could remain visible when the user needed a focused modal view

#### Change made
- shared `MapModalShell` now matches the expanded-sheet footprint by default
- modal motion uses the Apple easing curve `bezier(0.21, 0.47, 0.32, 0.98)`
- header is hidden while `/map` modals are open for a true focused state

#### Files involved
- `components/map/MapModalShell.jsx`
- `components/map/mapModalShell.styles.js`
- `hooks/map/useMapExploreFlow.js`

---

### 5) Demo/fallback coverage now stays active until there are at least **3 verified live hospitals**

#### Problem addressed
- one verified hospital could suppress bootstrap/demo expansion even though the UI/UX still felt too sparse
- live-only could remain active under poor real coverage

#### Change made
- the cutoff is now aligned around **3 verified nearby live hospitals**
- `1–2 verified` hospitals are treated as **poor** coverage, not good coverage
- hybrid/demo help remains eligible below that threshold
- bootstrap/backfill now continues until the nearby experience is fuller

#### Files involved
- `services/coverageModeService.js`
- `contexts/EmergencyContext.jsx`
- `hooks/map/useMapExploreFlow.js`
- `screens/RequestAmbulanceScreen.jsx`

---

## Verification evidence from today

- Toronto validation for `43.6532, -79.3832` returned **15 nearby hospitals** through both:
  - `nearby_hospitals`
  - `discover-hospitals`
- repeated build verification succeeded with:

```bash
npm run build:web
```

Result each time: **`Exported: dist`**

---

## Continuation note

If work resumes later, the most important current doctrine is:

1. `/map` should feel live immediately, not blocked by a separate loading page
2. modal focus should hide extra chrome and match the expanded sheet posture
3. live-only coverage should only feel "good" when the nearby verified experience is actually credible (current cutoff: **3**)
