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

### 6) Demo bootstrap no longer masks real hospital names behind placeholder coverage names

#### Problem addressed
- `/map` and demo coverage could show placeholder hospitals such as `Emergency Care Center 1` and `Emergency Care Center 2`
- this looked like leftover demo bootstrap data even in cases where real nearby hospital seeds existed

#### Initial error snapshot
- the edge function `bootstrap-demo-ecosystem` defined synthetic fallback names and addresses for uncovered regions
- that same bootstrap path was also replacing real database/provider seed identity with the synthetic fallback identity
- old client bootstrap state could keep earlier placeholder provisioning alive across reloads
- already-seeded placeholder rows could continue to surface even after better nearby rows existed

#### Change made
- demo bootstrap now preserves real seed `name` and `address` when the seed comes from database or provider discovery
- provider seed discovery now uses:
  1. nearby database hospitals
  2. Mapbox provider search
  3. Google provider search
  4. true synthetic fallback only if all seed sources fail
- client bootstrap state key moved to `@ivisit/demo-bootstrap-state:v2` so clients rerun provisioning after the naming fix
- client hospital hydration now suppresses legacy synthetic demo rows when a real-named replacement exists at the same coordinates

#### Deployment status
- `bootstrap-demo-ecosystem` was deployed to Supabase project `dlwtcmhdzoklveihuhjf` on `2026-04-10`

#### Files involved
- `supabase/functions/bootstrap-demo-ecosystem/index.ts`
- `services/demoEcosystemService.js`
- `services/hospitalsService.js`

#### Compare results against this baseline

Before fix:
- a location with real nearby coverage seeds could still render `Emergency Care Center 1/2`
- placeholder address strings like `Coverage ... Zone 1/2` could appear in the hospital data
- repeated reloads could keep showing the old placeholder result because bootstrap state was cached

After fix:
- if database, Mapbox, or Google hospital seeds exist, demo hospitals should use real hospital names and addresses
- placeholder `Emergency Care Center X` naming should appear only when no seed source exists at all for that slot
- reload or location change should trigger fresh bootstrap behavior under the `v2` bootstrap-state key
- stale placeholder rows should drop out when a real-named row exists at the same coordinates

#### Regression signals
- `Emergency Care Center X` still appears in a region where obvious real nearby hospitals exist
- placeholder and real-named hospitals appear side by side for the same coordinates
- clearing location or reloading still does not refresh old placeholder results

---

### 7) Nearby coverage now uses a real distance window instead of any discovered hospital

#### Problem addressed
- one demo hospital anywhere inside the `50 km` discovery radius could count as "nearby enough" and suppress bootstrap
- mixed live/demo lists could put farther hospitals ahead of closer ones just because they were live rows
- the product intent said "nearby help", but the runtime rule was effectively "anything discovered inside `50 km`"

#### Change made
- the runtime now treats distance bands as:
  1. `0-5 km` = immediate
  2. `>5-15 km` = nearby support
  3. `>15-50 km` = extended browse
- live coverage quality is now measured only from the combined `0-15 km` window
- the `/map` sheet comfort target is now **5 nearby hospitals** inside that same `0-15 km` window
- demo bootstrap is only considered sufficient when there are at least **5 demo hospitals** inside that nearby window
- a single demo hospital, or demo hospitals that only exist in the extended band, no longer suppress bootstrap
- mixed live/demo hospital lists are now ranked nearby-first, so closer hospitals stay ahead of extended browse results even in `hybrid`
- the demo edge function target was raised from **2-3** hospitals to **5-6** hospitals per coverage scope so the sheet has enough real rows to scroll

#### Files involved
- `services/coverageModeService.js`
- `contexts/EmergencyContext.jsx`
- `hooks/map/useMapExploreFlow.js`
- `screens/EmergencyScreen.jsx`
- `screens/MoreScreen.jsx`
- `supabase/functions/bootstrap-demo-ecosystem/index.ts`
- `docs/DEMO_MODE_COVERAGE_FLOW.md`
- `docs/flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md`

#### Expected result after fix
- one faraway hospital should no longer make the app think the nearby experience is already filled
- `/map` should prefer hospitals inside `15 km` before showing farther browse-only options
- preview/demo support should stay eligible until there are enough actually nearby hospitals to make the map feel credible

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

---

## Architecture direction now being formalized

This is the next-step doctrine for the emergency runtime and should guide future refactors.

### New target model

The emergency experience should be understood as:

- `map state`
- `sheet state`
- `header state`

Not as:

- a stack of separate modals
- a chain of separate pages

### Intended behavior

- the header is no longer a permanent top bar; it becomes quiet **active chrome** that only appears when the current activity needs it
- the sheet becomes the **main orchestrator**, starting from `explore` and leading to several deeper emergency states while reusing the same shell
- the map remains the stable spatial truth layer underneath the whole flow
- `profile` remains the one navigation-led exception used for broader app navigation, not the main expandable/collapsible emergency path

### Motion/interaction expectation

Each sheet-state switch should still feel like a modal-quality transition even though it is the same reusable sheet.

Desired characteristics:

- the sheet should feel like it grows smoothly from the bottom upward
- state changes should feel continuous, not like abrupt UI replacement
- the team should keep tuning:
  - detent resistance
  - velocity tuning
  - gesture-vs-scroll handoff
  - header/map chrome yielding
  - stable full-surface drag regions

### Practical implication for future work

The codebase is still in a transitional phase in places, but the forward direction is now clearer:

- fewer separate modal concepts
- more sheet-state orchestration
- more consistent map/sheet/header coordination
- no page-wizard feel inside the core emergency flow
