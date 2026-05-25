---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-8 Provider Detail Views

Status: Wired — shell committed, runtime validation pending
Owner: UI / UX
Layer impact: new screen, map flow integration

## Goal

Build a shared provider detail shell with category-specific CTAs (directions, book ride, call).

**Data Note:** `providers` table shipped (commit `2bd6879`) with `provider_services`, `structured_hours`, `insurance_accepted` columns. Detail sheet consumes these fields. Hospital-specific fields (`available_beds`, `ambulances_count`, `emergency_level`) must be conditionally hidden for non-hospital provider types.

## Files

- `components/map/views/providerDetail/MapProviderDetailOrchestrator.jsx`
- `components/map/views/providerDetail/MapProviderDetailStageBase.jsx`
- `components/map/surfaces/providerDetail/MapProviderDetailBody.jsx`
- `components/map/surfaces/providerDetail/MapProviderDetailModel.js`

## Reference Files

- `components/map/surfaces/MapModalShell.jsx`
- `utils/bookRideUtils.js`
- `constants/providerTypes.js`

## Guardrails

- Do not navigate away from `/map`. Prefer an in-map modal shell.
- No Supabase calls directly in the component.
- CTA actions are category-aware (pharmacy → directions; lab → call; clinic → book visit).

## Implementation Note

- Shell wired into `MapSheetOrchestrator` under `PROVIDER_DETAIL` phase.
- `MapProviderDetailStageBase` mirrors `MapHospitalDetailStageBase` shell pattern.
- Pending: runtime validation of phase transitions (list → detail → close → back to list).

## Acceptance (when implemented)

- Tapping a provider card or pin opens the detail view.
- Detail view shows name, address, distance, hours if available.
- Category-appropriate CTA is visible.
- Closing returns user to the provider list + active map pins.

## Changed Files

- `components/map/views/providerDetail/MapProviderDetailOrchestrator.jsx` (created)
- `components/map/views/providerDetail/MapProviderDetailStageBase.jsx` (created)
- `components/map/surfaces/providerDetail/MapProviderDetailBody.jsx` (created)
- `components/map/surfaces/providerDetail/MapProviderDetailModel.js` (created)
- `components/map/core/MapSheetOrchestrator.jsx` — `PROVIDER_DETAIL` case wired
- `hooks/map/exploreFlow/mapExploreFlow.transitions.js` — `buildProviderDetailSheetView` added

## Rollback Notes

- Remove `PROVIDER_DETAIL` case from `MapSheetOrchestrator`.
- Remove `buildProviderDetailSheetView` import from any caller.
- Detail component dirs can remain — they are inert without phase routing.
