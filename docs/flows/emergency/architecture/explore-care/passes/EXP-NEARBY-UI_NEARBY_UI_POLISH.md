---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-NEARBY-UI Nearby UI Polish

Status: Complete
Owner: UI / UX
Layer impact: presentation only

## Goal

Polish the `MapProviderListSheet` UI — time-bucket section headers, skeleton rows, FilterStrip tab behavior, ProviderCard layout, and EmptyState design.

## Files

- `components/map/views/providerList/MapProviderListSheet.jsx`

## Reference Files

- `components/map/history/MapRecentVisitsModal.jsx` — section header pattern reference
- `constants/providerTypes.js` — `EXPLORE_CATEGORY_META`

## Guardrails

- No logic changes — this pass is presentation polish only.
- Skeleton must match final card layout (no layout shift on load).
- No decorative borders.
- No card-in-card nesting.
- Section headers must be muted, not competing with card content.

## UI Checklist

### SkeletonList
- 4 skeleton rows matching the height of `ProviderCard`.
- Shimmer animation via opacity pulse.
- Never shows blank — always skeleton or content.

### SectionHeader
- Time bucket label (e.g. `< 5 min`).
- Provider count badge.
- Muted typography — does not compete with card content.

### ProviderCard
- Icon (category icon from `EXPLORE_CATEGORY_META`) in tinted circle.
- Name (bold), address (muted), distance chip.
- `Featured` or `Sponsored` badge when applicable.
- "Get there" chevron / ride CTA at trailing edge.
- `borderRadius: 18` with `borderCurve: continuous`.
- No borders — elevated surface via background color.

### FilterStrip
- Three tabs: Nearest / Featured / Sponsored.
- Active tab: `markerTint` fill, white text.
- Inactive tab: muted background.
- `borderRadius: 20` with `borderCurve: continuous`.

### EmptyState
- Category icon centered.
- Title: `No [category label] nearby`.
- Body: `Try expanding your search or check back later.`

### FooterNote
- `N [category label] within 20 km` — muted, centered, small.

## Acceptance

- No layout shift between skeleton and loaded state.
- Section buckets render in correct order.
- FilterStrip active state clearly communicates selection.
- Empty state is informative and calm.
- No blank loading states anywhere in the sheet.
- Accessible text sizes and contrast.

## Changed Files

- `components/map/views/providerList/MapProviderListSheet.jsx` (modified)

## Verification

- SkeletonList row count and height match real `ProviderCard`.
- SectionHeader renders bucket label and count.
- FilterStrip tab active state updates on press.
- EmptyState renders category icon and copy.
- FooterNote shows correct count and label.
- No decorative borders on any element.

## Rollback Notes

- Revert styling changes only.
- No state or schema changes to revert.
