# Emergency UX Progress Log — 2026-04-09

> Status: Active checkpoint log  
> Scope: `ivisit-app` `/map` entry, modal focus, location labeling, and demo coverage hardening  
> Purpose: preserve the exact decisions from today so the team can continue from the right source of truth.

## Proper doc assignment for today’s fixes

- **User-visible emergency runtime changes** → this file
- **Coverage/bootstrap rule changes** → [`DEMO_MODE_COVERAGE_FLOW.md`](../../flows/emergency/DEMO_MODE_COVERAGE_FLOW.md)
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
- `components/map/surfaces/MapExploreLoadingOverlay.jsx`
- `components/map/surfaces/mapExploreLoadingOverlay.styles.js`
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
- `components/map/surfaces/MapModalShell.jsx`
- `components/map/surfaces/mapModalShell.styles.js`
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
- `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`
- `docs/flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md`

#### Expected result after fix
- one faraway hospital should no longer make the app think the nearby experience is already filled
- `/map` should prefer hospitals inside `15 km` before showing farther browse-only options
- preview/demo support should stay eligible until there are enough actually nearby hospitals to make the map feel credible

---

### 8) Public discovery and nearby stability were hardened for real worldwide demo use

#### Problem addressed
- `/map` is public, but `discover-hospitals` was still deployed as JWT-protected
- guest/sponsor sessions could silently fall back to RPC-only discovery instead of using provider-backed discovery
- even when the database had enough real nearby hospitals, raw shadow/provider rows could crowd the top slice and make the sheet look thinner than the actual stored coverage

#### Change made
- `discover-hospitals` was redeployed as a public function (`verify_jwt = false`) so guest map discovery can use the intended provider-backed path
- the function now judges "database sufficient" from **dispatchable nearby hospitals**, not raw row count
- the function now orders dispatchable database hospitals ahead of shadow/provider rows before applying the response limit
- nearby-mode sufficiency is aligned to the `/map` comfort target of **5 dispatchable hospitals**
- a read-only live audit script was added at `supabase/scripts/audit_demo_coverage.js` to compare:
  - `nearby_hospitals`
  - `discover-hospitals`
  - visible dispatchable count after edge-function limiting

#### Files involved
- `supabase/functions/discovery/discover-hospitals/index.ts`
- `supabase/functions/discover-hospitals/index.ts`
- `supabase/config.toml`
- `supabase/scripts/audit_demo_coverage.js`
- `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`

#### Live verification snapshots
- Hemet:
  - `nearby_hospitals` 15 km = `5` dispatchable hospitals
  - `discover-hospitals` 50 km limited response = `8` dispatchable hospitals after prioritization
- Toronto:
  - `nearby_hospitals` 15 km = `6` dispatchable hospitals
  - `discover-hospitals` response preserved all `6`
- Lagos:
  - `nearby_hospitals` 15 km = `5` dispatchable hospitals
  - `discover-hospitals` response preserved all `5`
- Paris read-only provider preview (`mergeWithDatabase = false`) returned `5` provider hospitals with no DB writes, confirming the public provider path works when provider data exists
- Nairobi read-only provider preview still returned `0`, so fully worldwide real-name coverage remains provider-dependent and still falls back to synthetic coverage in no-data regions

#### Expected result after fix
- public `/map` should no longer depend on a hidden auth session to discover nearby hospitals
- real nearby hospitals should not disappear from the visible top slice just because shadow/provider rows are also present in the database
- once a location already has `5` dispatchable nearby hospitals, the discovery function should treat that area as healthy and stop burning provider calls unnecessarily

---

### 9) Dense-city demo coverage no longer reuses one static neighborhood pack across a whole metro

#### Problem addressed
- a city could look "covered" after one bootstrap even when users kilometers apart still needed different nearby hospitals
- persisted demo coverage was previously considered good enough as soon as there were `5` demo hospitals somewhere inside the broader nearby window
- old demo rows could be misread as valid nearby seeds because the bootstrap preview path was relying on raw `nearby_hospitals` output without all demo-identifying metadata

#### Change made
- persisted demo reuse is now local-density aware:
  - still requires at least `5` dispatchable demo hospitals inside `15 km`
  - now also requires at least `5` of those hospitals inside a tighter `8 km` local window before bootstrap is skipped
- bootstrap seed inspection now hydrates hospital metadata from the base `hospitals` table before deciding whether a nearby row is real coverage or an old demo row
- dense-city fallback can now use a shared metro catalog instead of repeated neighborhood slot packs
- the first metro catalog implementation is Lagos under shared scope `city_lagos`
- legacy Lagos per-bucket demo rows with the same hospital names are retired to `status = full` so they no longer pollute active nearby coverage

#### Files involved
- `services/demoEcosystemService.js`
- `supabase/functions/bootstrap-demo-ecosystem/index.ts`
- `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`

#### Sequential live verification
- Shared demo org:
  - Lagos metro now resolves to one shared demo organization `7894dcd6-e45e-408e-b020-700e1665416a`
  - that org currently stores a `13`-hospital Lagos metro catalog with real hospital identities and coordinates
- Legacy cleanup:
  - old Lagos scope rows such as `demo:p0652_p0338:slot:*` and `demo:p0645_p0325:slot:*` were observed in `status = full`, not `available`
  - current active Lagos rows are `demo:city_lagos:src:*`
- Neighborhood-specific nearby subsets from the same metro catalog:
  - Lagos Island `nearby_hospitals` 15 km returned hospitals such as:
    - `Lagos Island General Hospital`
    - `St. Nicholas Hospital`
    - `Reddington Hospital`
    - `Victoria Island Emergency Centre`
  - Ikeja `nearby_hospitals` 15 km returned a different subset led by:
    - `General Hospital Ikeja`
    - `Lagos State University Teaching Hospital`
    - `Gbagada General Hospital`
  - Lekki `nearby_hospitals` 15 km returned a different subset again, including:
    - `Lekki Coast Medical Centre`
    - `First Consultant Medical Centre`
    - `Reddington Hospital`
  - Surulere and Yaba likewise produced their own nearby mixes

#### Expected result after fix
- a single successful bootstrap in a large city should no longer freeze the whole city into one static 5-hospital experience
- nearby demo sufficiency should now be judged by local density, not just metro-wide count
- a shared metro fallback catalog may back multiple neighborhoods, but the user-facing nearby hospitals should still change with the user's coordinates

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

- the header is no longer a permanent top bar; it stays hidden through explore and all pre-dispatch decisions
- the header does **not** guide the user into dispatch; it only appears after dispatch has actually started and there is a true active session to show
- once active, the header becomes expandable downward session chrome and may compress/collapse the sheet below it, closer to Apple Maps live-session behavior
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

### Open architecture cleanup item

One valid concern remains: the separation between `*.jsx` and supporting `*.js` files is not fully complete yet.

The desired rule is:

- `*.jsx` for structure/composition only
- `*.styles.js` for styles
- `*.content.js` / `*.helpers.js` / `*.tokens.js` / `*.constants.js` for non-render support logic
- `use*.js` hooks for orchestration and side effects

This should be treated as ongoing cleanup work, especially anywhere a map view file is still absorbing constants, copy, helpers, and render structure together.

---

## 2026-04-12: Hospital media pipeline made seamless for emergency flows

### Initial problem
- The app could discover real hospital names, but image delivery was not normalized.
- Bootstrapped/demo hospitals usually had no trustworthy media path.
- Existing emergency and `/map` UIs already read `hospital.image`, so without a canonical data-layer image pipeline the experience stayed inconsistent.
- Google legacy Places endpoints were still present in some live provider paths and were already denied by the project configuration.

### Fix implemented
- Added a dedicated hospital media model and metadata columns via:
  - [`20260412050000_hospital_media_pipeline.sql`](../../../supabase/migrations/20260412050000_hospital_media_pipeline.sql)
- Added public proxy delivery for hospital images via:
  - [`hospital-media`](../../../supabase/functions/hospital-media/index.ts)
- Migrated live provider fetchers to Google Places API (New):
  - [`bootstrap-demo-ecosystem`](../../../supabase/functions/bootstrap-demo-ecosystem/index.ts)
  - [`discover-hospitals`](../../../supabase/functions/discovery/discover-hospitals/index.ts)
- Added DB normalization/backfill via:
  - [`backfill_hospital_media.js`](../../../supabase/scripts/backfill_hospital_media.js)

### Delivery model now
- Emergency/map flows continue to use the existing hydrated `hospital.image` field.
- `hospital.image` now points to a stable app-controlled proxy URL when the chosen image source is managed media.
- The proxy resolves:
  - active `hospital_media` rows first
  - direct provider photo fallback by `place_id` when no stored media row exists yet
  - deterministic fallback only when no trusted real source is available

### Live rollout and verification
- Remote migration status: already applied; `supabase db push` returned `Remote database is up to date.`
- Functions redeployed to project `dlwtcmhdzoklveihuhjf`:
  - `bootstrap-demo-ecosystem`
  - `discover-hospitals`
  - `hospital-media`
- Full backfill applied across live hospital rows:
  - `118` scanned
  - `118` touched
  - `118` active primary `hospital_media` rows now present

### Live media result distribution after backfill
- `provider_photo`: `42`
- `official_website_image`: `25`
- `domain_logo`: `4`
- `deterministic_fallback`: `47`

### Spot checks completed
- Official website image proxy check:
  - `Hemet Valley Medical Center` returned `302` to a real hospital website image URL
- Provider photo proxy check:
  - `First Consultant Medical Centre` returned `302` to a Google Places photo URL
- Raw provider `place_id` proxy check:
  - `hospital-media?place_id=ChIJmwNFsCz1OxARvDhke17z6tk` returned `302` to a Google Places photo URL without requiring a pre-existing hospital row

### User experience effect
- Existing emergency hospital cards, rails, and hospital detail surfaces do not need UI rewiring.
- Once a hospital row is hydrated from the DB, the current UI automatically receives the normalized image path through `hospital.image`.
- Newly discovered provider hospitals can now render a real provider photo immediately through the proxy fallback, instead of waiting for a later manual backfill.

### Residual reality
- Not every hospital can or should show a “real” photo.
- Some rows still fall back deliberately because no trustworthy official/provider image was available.
- The global hospital table still contains noisy/non-ideal facilities in some regions; this media pass does not certify facility quality, it only normalizes the image delivery path for whatever hospital rows are already considered visible/dispatchable by the runtime.

---

## 2026-04-12: Hospital rail and modal count contract aligned

### Problem
- The horizontal hospital rail in the explore sheet was using a clipped subset while the hospital modal used the full nearby list.
- Even when both surfaces were technically correct, the user could read that as contradictory hospital counts.

### Fix
- The rail now reads from the same full discovered nearby hospital set as the modal.
- Placeholder rail cards were removed so the rail no longer implies extra hidden/fake entries just to maintain scroll awareness.

### Result
- Rail and modal now follow one simpler contract: same hospital collection, different presentation.
- Any visible difference is now card layout/viewport only, not a data mismatch.
