> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-1 Provider Taxonomy Constants

Status: Complete
Owner: App Data
Layer impact: constants only, no state or UI

## Goal

Define the canonical list of non-emergency provider categories, their display labels, icons, and marker tint colors.

## Files

- `constants/providerTypes.js`

## Reference Files

- `constants/emergency.js`
- `constants/colors.js`

## Guardrails

- Constants only — no logic, no hooks, no service calls.
- `PROVIDER_TYPES` values must match what the edge function and `nearby_providers` RPC accept as `provider_type`.
- `EXPLORE_CATEGORY_META` must include `label`, `iconName`, and `markerTint` for every entry in `EXPLORE_CATEGORIES`.

## Exports

- `PROVIDER_TYPES` — object map of category keys to string values
- `EXPLORE_CATEGORIES` — ordered array for chip rendering
- `EXPLORE_CATEGORY_META` — keyed lookup by `PROVIDER_TYPES` value

## Checklist

- Define `PROVIDER_TYPES`: `PHARMACY`, `LAB`, `CLINIC`, `DENTIST`, `OPTOMETRIST`, `SPECIALIST`.
- Define `EXPLORE_CATEGORIES` array matching chip display order.
- Define `EXPLORE_CATEGORY_META` with `label`, `iconName` (MaterialCommunityIcons), `markerTint` per type.
- Ensure tint colors are distinct and accessible against both light and dark map tiles.

## Acceptance

- All category chips in the modal render label + icon from `EXPLORE_CATEGORY_META`.
- `ProviderMarkers` applies the correct tint from `EXPLORE_CATEGORY_META[providerType].markerTint`.
- No hardcoded strings in UI components.

## Changed Files

- `constants/providerTypes.js` (created)

## Verification

- `PROVIDER_TYPES`, `EXPLORE_CATEGORIES`, and `EXPLORE_CATEGORY_META` exported correctly.
- All 6 categories have `label`, `iconName`, and `markerTint`.
- Values used in `MapCareHistoryModal`, `ProviderMarkers`, `MapProviderListSheet` all resolve without undefined.

## Rollback Notes

- Remove `constants/providerTypes.js`.
- Remove imports from any component that references it.
