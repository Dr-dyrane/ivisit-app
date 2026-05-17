# EXP-10 Monetization Hooks

Status: Complete
Owner: Product
Layer impact: constants + UI display flags only

## Goal

Add `featured` and `sponsored` flags to provider results so the filter strip and card UI can surface promoted providers correctly.

## Files

- `constants/providerTypes.js` — sort mode constants
- `components/map/views/providerList/MapProviderListSheet.jsx` — FilterStrip + ProviderCard badge

## Reference Files

- `services/hospitalsService.js` — `discoverNearbyProviders` response shape

## Guardrails

- No new Supabase tables needed for v1. Flags come from Places API metadata or a simple `isFeatured` / `isSponsored` boolean in the normalized provider row.
- No payment or billing logic in this pass — flags are display-only.
- `Sponsored` sort mode shows sponsored providers first, then by distance.
- `Featured` sort mode shows featured providers first, then by distance.
- `Nearest` sort mode ignores flags entirely.

## Flag Source

For v1:
- `isFeatured` — set by the service adapter based on Places API `rating >= 4.5` or explicit metadata field.
- `isSponsored` — reserved for future ad/partnership integration; defaults to `false` in v1.

## Sort Behavior

| Sort Mode | Order |
|-----------|-------|
| Nearest | distance ascending |
| Featured | isFeatured desc, then distance asc |
| Sponsored | isSponsored desc, then distance asc |

## UI

- `ProviderCard` shows a small `Featured` or `Sponsored` badge when flag is true.
- Badge uses `EXPLORE_CATEGORY_META[providerType].markerTint` as accent.
- No badge shown for `Nearest` sort mode display.

## Acceptance

- FilterStrip Nearest/Featured/Sponsored tabs work correctly.
- Featured providers appear first when Featured is selected.
- Badge renders on cards with `isFeatured=true`.
- No crash when flags are undefined/null (default to false).

## Changed Files

- `constants/providerTypes.js` — sort mode constants added
- `components/map/views/providerList/MapProviderListSheet.jsx` — badge + sort logic

## Verification

- `SORT_MODES` constant defined (`nearest`, `featured`, `sponsored`).
- `sortProviders` utility applies correct sort per mode.
- `ProviderCard` renders badge conditionally.
- Null/undefined flag guard in place.

## Rollback Notes

- Revert sort logic to distance-only.
- Remove badge from `ProviderCard`.
- `FilterStrip` can be simplified to distance-only tab.
