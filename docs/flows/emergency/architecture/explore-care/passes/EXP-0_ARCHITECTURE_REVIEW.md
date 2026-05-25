---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-0 Architecture Review

Status: Complete
Owner: CTO / System Architect
Layer impact: documentation only

## Goal

Confirm Explore Care is a non-emergency ephemeral query feature, not a new navigation domain or emergency extension.

## Read First

- `docs/REFACTORING_GUARDRAILS.md`
- `docs/flows/emergency/architecture/explore-care/EXPLORE_CARE_DOSSIER_V1.md`
- `docs/architecture/map/MAP_EXPLORE_FLOW_MODULARIZATION.md`
- `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`

## Questions To Resolve

- Should explore care share the `nearby_hospitals` RPC or have its own `nearby_providers` RPC?
- Should provider rows live in TanStack Query or be pushed to Zustand for map cross-context sharing?
- Does explore care need a navigation route or can it live entirely inside the map modal stack?
- Should `ProviderMarkers` share the same `MapView` as `HospitalMarkers`?

## Audit Tasks

- Confirm `nearby_hospitals` RPC applies `emergency_eligible=true` and cannot be safely reused without a new RPC.
- Confirm `hospitalsService.js` can be extended without breaking emergency path.
- Confirm `EmergencyLocationPreviewMap` can accept an `extraMarkers` prop without disrupting hospital/user markers.
- Confirm `MapModalShell` is the correct surface for `MapProviderListSheet`.

## Decisions

- Explore care is owned by the map explore flow, not the emergency domain.
- `nearby_providers` RPC added to `core_rpcs` migration — no emergency filter.
- `nearby_hospitals` RPC emergency filter is not changed.
- Provider rows stay in TanStack Query (L2). No Zustand entry.
- No new navigation route. Sheet mounts inside `/map` screen tree.
- `ProviderMarkers` renders inside the existing `EmergencyLocationPreviewMap` `MapView` via `extraMarkers` prop.
- `MapModalShell` is the correct surface for `MapProviderListSheet`.
- `exploreProviderCategoryAtom` and `exploreProviderIdAtom` own all ephemeral selection state.

## Verification

- Reviewed five-layer guardrails.
- Confirmed `nearby_hospitals` RPC has hard `emergency_eligible=true` filter in `20260219010000_core_rpcs.sql`.
- Confirmed `EmergencyLocationPreviewMap` can accept `extraMarkers` without changing hospital/user pin logic.
- Confirmed no existing explore-provider query hook existed before this pass.

## Rollback Notes

- This pass is documentation only.
