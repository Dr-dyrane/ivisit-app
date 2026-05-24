---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Nearest Hospital Selection Audit

Date: `2026-05-07`
Scope: live `/map` explore-intent nearest-hospital behavior

## Problem Statement

In Lagos, users can be physically close to hospitals around `2.2 km` away and still see a first surfaced hospital at `13 km` or more.

The issue is not one single bug. It is a stack of selection rules that currently optimize for:

- dispatchable canonical hospitals
- broad 50km discovery coverage
- fallback completeness

instead of:

- closest local hospital first
- truthful nearby counts
- explicit distinction between dispatch-ready and secondary/provider hospitals

## Main Finding

The live `/map` nearest-hospital summary is not driven by a true local-nearest lane.

It is driven by:

1. a broad `50km` discovery fetch
2. dispatchability filtering
3. a raw canonical list preference
4. a trivial `first item wins` nearest selection

That combination is why Lagos can surface a far hospital even when a physically closer one exists.

## Root Causes

### 1. The fetch radius is broad by default

File:

- [useHospitals.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/emergency/useHospitals.js)

Current behavior:

- `performFetch()` calls:
  - `hospitalsService.discoverNearby(latitude, longitude, 50000)`
- `50000` means `50km`

Impact:

- the canonical candidate set is wide from the start
- the live map is not operating on a tight local-nearest set

### 2. The map summary does not use the curated display hospital list

Files:

- [useHospitals.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/emergency/useHospitals.js)
- [useMapDerivedData.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/map/exploreFlow/useMapDerivedData.js)
- [mapExploreFlow.derived.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/map/exploreFlow/mapExploreFlow.derived.js)

Current behavior:

- `useHospitals` builds:
  - `allHospitals`: raw discovered set
  - `hospitals`: curated display set from `getDisplayHospitals(...)`
- but `getDiscoveredHospitals(allHospitals, hospitals)` returns `allHospitals` whenever it exists
- then `getNearestHospital(selectedHospital, discoveredHospitals)` just returns:
  - `selectedHospital`, else
  - `discoveredHospitals[0]`

Impact:

- the explore-intent summary nearest hospital bypasses the curated display lane
- it uses the raw canonical order instead of a dedicated local-first selection contract

This is one of the most important causes.

### 3. Dispatchability filtering excludes closer secondary/provider hospitals

Files:

- [hospitalsService.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/hospitalsService.js)
- [discover-hospitals/index.ts](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/discovery/discover-hospitals/index.ts)

Current behavior:

- the client filters through `isDispatchableHospital(...)`
- provider-only rows are inserted as:
  - `verified: false`
  - `import_status: "pending"`
- dispatchability requires:
  - `status === "available"`
  - and one of:
    - `verified === true`
    - demo row
    - `verification_status === "verified"`
    - `verification_status === "not_certified"`

Impact:

- a physically closer provider-discovered hospital can exist
- but if it is still provider-shadow / pending verification, it is removed before the user sees it

This is why the behavior can feel like:

- "we are not allowing secondary hospitals in Lagos"

That suspicion is materially correct.

### 4. Provider discovery may be skipped before local close options are considered

File:

- [discover-hospitals/index.ts](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/discovery/discover-hospitals/index.ts)

Current behavior:

- edge function calculates:
  - `databaseComfortTarget = min(limit, 5)` for nearby mode
- if dispatchable DB results are already `>= 5`, provider discovery is skipped with:
  - `providerDiscoverySkipReason = "database_sufficient"`

Impact:

- if Lagos already has `5` dispatchable canonical hospitals within the broad search radius,
- the provider lane can be skipped entirely,
- even if the skipped provider lane contains closer local hospitals

So â€œsufficient database coverageâ€ currently means:

- enough hospitals somewhere in the 50km lane

not:

- enough hospitals very close to the user

### 5. â€œNearbyâ€ labels are semantically false

Files:

- [mapExploreFlow.derived.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/map/exploreFlow/mapExploreFlow.derived.js)
- [MapExploreIntentHospitalSummaryCard.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/exploreIntent/MapExploreIntentHospitalSummaryCard.jsx)

Current behavior:

- `getNearbyHospitalCount(discoveredHospitals)` counts every discovered hospital
- it does not apply a nearby radius threshold

Impact:

- the UI says `nearby`
- but code means `all discovered hospitals in the current canonical set`

That makes the Lagos behavior feel even more broken because the language promises locality while the selector does not.

## Why A 2.2km Hospital Can Lose To A 13km Hospital

This happens when one or more of these are true:

1. the `2.2km` hospital is provider-shadow / secondary / pending and gets rejected by dispatchability rules
2. provider discovery was skipped because the DB already had five dispatchable hospitals somewhere in the 50km band
3. the summary nearest lane is taking the first raw canonical result instead of a tighter local display lane
4. the list is broad enough that â€œgood enough coverageâ€ beats â€œclosest actual optionâ€

## Distinction We Need

The app currently conflates two different concepts:

1. `closest area hospitals`
2. `closest dispatch-ready hospitals`

Those should not be the same derived selector.

If you want a smooth Lagos experience, we need separate lanes.

## Recommended Fix

### Canonical lanes

1. `canonicalDiscoveredHospitals`
- broad dispatchable set for flow safety

2. `displayHospitals`
- curated set for list rendering

3. `localNearbyHospitals`
- strict nearby threshold:
  - `<= 5km`
  - if no hospitals exist inside `5km`, the app must stop calling wider coverage "nearby"

4. `nearestHospitalSummary`
- selected from `localNearbyHospitals`, not from `allHospitals[0]`

### Policy lane

Decide explicitly whether secondary/provider hospitals should:

- appear in explore intent with a label like `Provider found` / `Not yet dispatch-ready`
- or stay hidden entirely

Right now they are mostly hidden by dispatchability.

### Edge-function improvement

Provider discovery should not be skipped merely because:

- `5` dispatchable DB rows exist inside a `50km` lane

It should be skipped only if there is already healthy local coverage inside the nearby band.

## Safe Implementation Order

1. split `nearestHospitalSummary` away from raw `discoveredHospitals[0]`
2. create a true nearby threshold lane and use it for counts + summary
3. keep the broad dispatchable lane for booking safety
4. decide whether provider/secondary hospitals should appear visibly as non-primary options

## Current Implementation Checkpoint

The first client-side remediation slice is now in place.

Implemented:

- `hospitalsService` now preserves nearby hospitals even when they are not dispatch-ready and marks them with `isDispatchReady`
- `useHospitals` now keeps:
  - `allHospitals` as the physically nearby lane
  - `hospitals` as the dispatch-ready display lane, with fallback to all hospitals only when no dispatch-ready set exists
- live `/map` explore intent now uses a separate summary lane so the card can surface the physically nearest hospital while deeper booking flows still use the dispatch-ready lane
- the strict nearby lane is now fixed to `<= 5km`; anything outside that radius is wider coverage, not nearby
- `discover-hospitals` now only skips provider discovery when both of these are true:
  - the broad dispatchable lane is comfortable
  - the local dispatchable lane inside `5km` is also comfortable

Still remaining:

- provider or secondary visibility policy inside hospital list and deeper selection surfaces

## Conclusion

The current Lagos behavior is happening because the app is not truly selecting â€œnearest hospital.â€

It is selecting:

- first raw canonical dispatchable hospital from a broad discovery lane

That is why a `13 km` hospital can win over a closer `2.2 km` option.
