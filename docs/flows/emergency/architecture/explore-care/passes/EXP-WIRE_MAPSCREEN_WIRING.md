> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-WIRE MapScreen Wiring

Status: Complete
Owner: Map Flow
Layer impact: L2 query consumption, L5 Jotai, map integration

## Goal

Wire all Explore Care components into `MapScreen` — atoms, handlers, shared `useNearbyProviders` cache, `extraMarkers` on the map, and conditional `MapProviderListSheet` mount.

## Files

- `screens/MapScreen.jsx`
- `atoms/mapFlowAtoms.js`
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`
- `components/map/MapModalOrchestrator.jsx`

## Guardrails

- MapScreen stays thin — wiring only, no query logic inline beyond the shared cache call.
- No Supabase calls in MapScreen.
- Emergency flow must be completely unaffected.
- `ProviderMarkers` only renders when `exploreProviderCategory` is active AND providers have loaded.
- `MapProviderListSheet` only mounts when `exploreProviderCategory` is non-null.
- Atoms reset on close — no explore state survives session restart.

## Atoms

Added to `atoms/mapFlowAtoms.js`:
- `exploreProviderCategoryAtom` — `atom(null)`
- `exploreProviderIdAtom` — `atom(null)`

## Handlers in MapScreen

- `handleExploreCare(providerType)` → `setExploreProviderCategory(providerType)`
- `handleCloseProviderList()` → resets both atoms to null
- `handleSelectExploreProvider(provider)` → `setExploreProviderId(provider?.id ?? null)`

## Shared Query

```js
const { providers: exploreProviders } = useNearbyProviders({
  providerCategory: exploreProviderCategory,
  location: activeLocation,
  enabled: !!exploreProviderCategory,
});
```

Query key `["providers", providerCategory, lat, lng, 20000]` is identical to `MapProviderListSheet` — TanStack Query deduplicates, zero extra network requests.

## extraMarkers Prop

```jsx
extraMarkers={
  exploreProviderCategory && exploreProviders.length > 0 ? (
    <ProviderMarkers
      providers={exploreProviders}
      selectedProviderId={exploreProviderId}
      onProviderPress={handleSelectExploreProvider}
    />
  ) : null
}
```

## MapProviderListSheet Mount

```jsx
{exploreProviderCategory ? (
  <MapProviderListSheet
    visible
    providerCategory={exploreProviderCategory}
    location={activeLocation}
    onClose={handleCloseProviderList}
    onSelectProvider={handleSelectExploreProvider}
  />
) : null}
```

`visible` must be explicitly passed so `useNearbyProviders`'s `enabled: visible && !!providerCategory` guard evaluates correctly.

## MapModalOrchestrator

`handleExploreCare` prop added to `MapModalOrchestrator` passthrough → forwarded to `MapCareHistoryModal` as `onExploreCare`.

## EmergencyLocationPreviewMap

`extraMarkers` prop added:
- Renders additional children inside `MapView` before the user location pin.
- Hospital markers and user pin are unchanged.

## Checklist

- [x] `exploreProviderCategoryAtom` and `exploreProviderIdAtom` added to `atoms/mapFlowAtoms.js`
- [x] `useAtom` for both atoms in `MapScreen`
- [x] `handleExploreCare`, `handleCloseProviderList`, `handleSelectExploreProvider` defined
- [x] `useNearbyProviders` called with shared query key
- [x] `extraMarkers` passed to `EmergencyLocationPreviewMap`
- [x] `ProviderMarkers` mounted via `extraMarkers` when category + providers available
- [x] `MapProviderListSheet` conditionally mounted with `visible` prop
- [x] `handleExploreCare` passed to `MapModalOrchestrator`
- [x] `extraMarkers` prop added to `EmergencyLocationPreviewMap`

## Acceptance

- Tapping category chip → sheet opens, providers load, markers appear on map.
- Tapping a pin → highlights pin and matching card.
- Tapping a card → highlights pin via `exploreProviderIdAtom`.
- Closing sheet → atoms reset, sheet unmounts, markers disappear.
- Emergency flow unaffected in all phases.
- No duplicate network requests.

## Changed Files

- `atoms/mapFlowAtoms.js` (modified — atoms added)
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx` (modified — `extraMarkers` prop)
- `screens/MapScreen.jsx` (modified — imports, atoms, handlers, query, extraMarkers, sheet mount, orchestrator prop)
- `components/map/MapModalOrchestrator.jsx` (modified — `handleExploreCare` passthrough)

## Verification

- `exploreProviderCategoryAtom` and `exploreProviderIdAtom` exported from `atoms/mapFlowAtoms.js`.
- `useNearbyProviders` query key matches `MapProviderListSheet` exactly — confirmed by reading both call sites.
- `extraMarkers` renders `ProviderMarkers` only when category is active and providers array is non-empty.
- `MapProviderListSheet` receives `visible` prop (truthy) — `enabled` guard inside sheet resolves correctly.
- `handleExploreCare` received by `MapModalOrchestrator` and forwarded to `MapCareHistoryModal.onExploreCare`.
- Emergency flow tested: hospital markers, user pin, routing, tracking — all unaffected.

## Rollback Notes

- Set `extraMarkers={null}` in `MapScreen` to remove markers.
- Remove conditional `MapProviderListSheet` mount.
- Remove `handleExploreCare` from `MapModalOrchestrator` props.
- Atoms remain in `mapFlowAtoms.js` — inert without wiring.
