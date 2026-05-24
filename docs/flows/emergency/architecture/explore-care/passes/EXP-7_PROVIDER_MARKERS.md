---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-7 Provider Markers

Status: Complete
Owner: UI / UX
Layer impact: presentation, map rendering

## Goal

Build `ProviderMarkers` â€” a map marker component that renders colored circular callout pins for non-emergency providers, with tintColor per category.

## Files

- `components/map/ProviderMarkers.jsx`

## Reference Files

- `components/map/HospitalMarkers.jsx`
- `constants/providerTypes.js` â€” `EXPLORE_CATEGORY_META[providerType].markerTint`

## Guardrails

- Do not render hospital-type providers (`provider_type === 'hospital'`). Those are `HospitalMarkers`' domain.
- Use colored circular callout markers, not PNG images, so any category color can be applied.
- No Supabase calls in this component.
- Component receives `providers` from its parent; it does not fetch.
- `selectedProviderId` drives pin highlight state.

## Props

- `providers` â€” array of normalized provider objects
- `selectedProviderId` â€” string | null; highlighted pin
- `onProviderPress(provider)` â€” called when a pin is tapped

## Marker Design

- Circle with `markerTint` fill
- Small callout label (provider name, truncated)
- Selected state: larger ring / elevated zIndex
- Uses `Marker` from `react-native-maps`

## Checklist

- Filter out `provider_type === 'hospital'` entries.
- Derive `markerTint` from `EXPLORE_CATEGORY_META[provider.providerType]?.markerTint`.
- Apply selected visual state when `provider.id === selectedProviderId`.
- Call `onProviderPress(provider)` on press.
- Use `tracksViewChanges={false}` for performance.

## Acceptance

- Markers render for all non-hospital providers in the `providers` array.
- Correct tint color per category.
- Selected pin has distinct visual treatment.
- Tapping a pin calls `onProviderPress` with the full provider object.
- No hospital pins rendered.

## Changed Files

- `components/map/ProviderMarkers.jsx` (created)

## Verification

- Hospital entries filtered out.
- `markerTint` correctly derived from `EXPLORE_CATEGORY_META`.
- `selectedProviderId` drives elevated zIndex / ring styling.
- `onProviderPress` fires on tap.
- `tracksViewChanges={false}` set for performance.

## Rollback Notes

- Set `extraMarkers={null}` in `MapScreen` to hide markers.
- Component can remain â€” it is inert without `providers`.
