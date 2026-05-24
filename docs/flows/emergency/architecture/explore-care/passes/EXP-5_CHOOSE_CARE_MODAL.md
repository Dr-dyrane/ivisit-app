---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-5 Choose Care Modal â€” Explore Section

Status: Complete
Owner: UI / UX
Layer impact: presentation only

## Goal

Add an "Explore Nearby Care" section with category chips to `MapCareHistoryModal`. Emergency section is unchanged.

## Files

- `components/map/MapCareHistoryModal.jsx`

## Reference Files

- `constants/providerTypes.js` â€” `EXPLORE_CATEGORIES`, `EXPLORE_CATEGORY_META`
- `components/map/surfaces/MapModalShell.jsx`

## Guardrails

- Emergency blade section must not change appearance or behavior.
- Category chips call `onExploreCare(providerType)` â€” no state ownership inside this component.
- Do not add query hooks or data fetching here.
- `paddingBottom` on content: 32px minimum.

## UI Structure

```txt
MapModalShell
  Emergency section
    Choose Ambulance blade
    Find a Bed blade
  [conditional] Explore Nearby Care section
    Section label
    Category chips row (horizontal scroll)
```

## Category Chips

- One chip per `EXPLORE_CATEGORIES` entry.
- Chip content: icon + label from `EXPLORE_CATEGORY_META`.
- Press: calls `onExploreCare(providerType)` from prop.
- `hasExploreSection` controls modal min height ratio.

## Props

- `onExploreCare(providerType)` â€” called when a chip is tapped

## Acceptance

- Emergency blades render identically to pre-EXP-5.
- Each explore chip shows correct icon and label.
- Tapping a chip calls `onExploreCare` with the correct `PROVIDER_TYPES` value.
- No state owned by this component.

## Changed Files

- `components/map/MapCareHistoryModal.jsx` (modified)

## Verification

- Emergency section visually unchanged.
- `EXPLORE_CATEGORIES` chips render in order.
- `onExploreCare` called with correct value on press.
- `hasExploreSection` drives `minHeightRatio` correctly.
- `paddingBottom` 32px applied to content.

## Rollback Notes

- Remove Explore section from `MapCareHistoryModal`.
- `onExploreCare` prop becomes unused; remove from `MapModalOrchestrator` passthrough.
