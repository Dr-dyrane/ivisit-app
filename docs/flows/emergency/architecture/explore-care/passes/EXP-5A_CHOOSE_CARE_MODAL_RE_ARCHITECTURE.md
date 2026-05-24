> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-5A Choose Care Modal Re-Architecture

Status: Complete
Owner: UI / UX
Layer impact: presentation only — no state, no query, no schema changes

---

## Pre-Implementation Duplication Audit

Per standing rule: scan for duplication before writing any code.

### Tokens — what already exists, what to reuse

| Token | Source | Value |
|-------|--------|-------|
| `tokens.strongCardSurface` | `getMapUITokens` → `getMapSheetTokens` | dark: `rgba(255,255,255,0.08)` / light: `rgba(255,255,255,0.72)` |
| `tokens.mutedCardSurface` | `getMapUITokens` | dark: `rgba(255,255,255,0.06)` / light: `rgba(15,23,42,0.05)` |
| `tokens.titleColor` | `getMapUITokens` | dark: `#F8FAFC` / light: `#0F172A` |
| `tokens.mutedText` | `getMapUITokens` | dark: `#94A3B8` / light: `#64748B` |
| `tokens.bodyText` | `getMapUITokens` | dark: `#CBD5E1` / light: `#475569` |
| `tokens.cardRadius` | `getMapSheetTokens` | `30` |
| `tokens.glassUnderlay` | `getMapGlassTokens` | dark: `rgba(0,0,0,0.22)` / light: `rgba(15,23,42,0.10)` |
| `tokens.glassSurface` | `getMapGlassTokens` | dark: `rgba(8,15,27,0.84)` / light: `rgba(248,250,252,0.84)` |
| `MAP_SHEET_CARD_RADIUS` | `mapSheetTokens.js` | `30` |

Rule: **all colors and surfaces must come from `getMapSheetTokens`**. No hardcoded hex surfaces that aren't already in `EXPLORE_CATEGORY_META.markerTint`.

### EXPLORE_CATEGORY_META — already exists

Every category chip needs: `label`, `iconName`, `markerTint`.
All of this already lives in `constants/providerTypes.js` (`EXPLORE_CATEGORY_META`).

Reuse:
- `meta.label` → card label
- `meta.iconName` → MaterialCommunityIcons name
- `meta.markerTint` → icon tint + card accent tint (at `18` opacity hex / `0.10` alpha)

**Do not redeclare any color or icon name for categories in the modal file.**

### MapExploreIntentHospitalRail — horizontal rail pattern

`MapExploreIntentHospitalRail.jsx` already implements:
- horizontal `ScrollView` with `decelerationRate="fast"` + `snapToAlignment="start"` + `snapToInterval`
- `paddingLeft` / `gap` contentContainerStyle
- `FeaturedHospitalCard` pattern: icon + eyebrow + title + meta + action pill

**Adopt this exact pattern** for `ExploreCategoryCard`. Do not invent a new rail.

### MapExploreIntentHospitalSummaryCard — card anatomy

Already defines the canonical card anatomy:
- `borderRadius: tokens.cardRadius` + `borderCurve: "continuous"` — **mandatory on all cards**
- `SummaryIconTile` with tinted icon
- eyebrow (11px, 700, 0.8 letterSpacing, uppercase) → `tokens.mutedText`
- title (bold) → `tokens.titleColor`
- meta (regular) → `tokens.bodyText`
- trailing CTA pill with `tokens.mutedCardSurface`
- pressed state: `opacity: 0.96, scale: 0.996`

**All explore category cards must follow this exact anatomy.** No alien card patterns.

### Current MapCareHistoryModal — what exists

The current file (`components/map/MapCareHistoryModal.jsx`) already has:
- `MapModalShell` as shell — correct, keep
- `CareBlade` component for emergency actions — correct, keep
- `ExploreCategoryChip` — the current chip (small, inline, wrapped grid)
- `EXPLORE_CATEGORIES` array (duplicate of `EXPLORE_PROVIDER_TYPES` in `providerTypes.js` — can be removed, use the constant)
- Section labels using eyebrow pattern — correct, keep
- Token variables inline (`isDarkMode ? "#F8FAFC" : "#0F172A"`) — **replace with `tokens.*` from `getMapSheetTokens`**
- `bladeSurface` hardcoded — **replace with `tokens.strongCardSurface`**
- `viewportMetrics` from `useResponsiveSurfaceMetrics` — correct, keep

### What needs to change

| Current | Target |
|---------|--------|
| `ExploreCategoryChip` — small wrapped grid chip | `ExploreCategoryCard` — tall rail card with eyebrow + title + count + tint accent |
| `exploreGrid` flexWrap row | Horizontal `ScrollView` rail (pattern from `MapExploreIntentHospitalRail`) |
| Inline `isDarkMode ? "#..." : "#..."` color values | `tokens.titleColor`, `tokens.mutedText`, `tokens.bodyText` |
| `bladeSurface` hardcoded inline | `tokens.strongCardSurface` |
| Local `EXPLORE_CATEGORIES` array | Import `EXPLORE_PROVIDER_TYPES` from `constants/providerTypes` |

---

## Goal

Re-architect the "Explore Nearby Care" section of `MapCareHistoryModal` from a small chip grid into a horizontal premium category card rail — while keeping `MapModalShell`, `CareBlade`, section eyebrows, and all existing token infrastructure.

**Emergency section does not change.**

---

## Design System Constraints

**All of the following are non-negotiable:**

- `borderRadius: tokens.cardRadius` (30) + `borderCurve: "continuous"` on every card
- `tokens.strongCardSurface` for card backgrounds
- `tokens.mutedCardSurface` for secondary surfaces / CTA pills
- `tokens.titleColor`, `tokens.mutedText`, `tokens.bodyText` for text
- `meta.markerTint` for icon and accent tint only — no markerTint as a card background
- Card accent = `markerTint + "18"` (hex alpha) or `markerTint` at `0.10` opacity for icon tile background
- No gradients on category cards in v1 (LinearGradient reserved for emergency blades which already use it)
- Pressed state: `opacity: 0.96, transform: scale(0.996)` — same as existing `hospitalCardPressed`
- `decelerationRate="fast"` + `snapToAlignment="start"` — same as `MapExploreIntentHospitalRail`

---

## New Component Plan

### `ExploreCategoryCard` (inline sub-component in `MapCareHistoryModal.jsx`)

Card layout:
```
[icon tile — markerTint tinted circle]
[eyebrow — category label, mutedText]
[title — "Nearby" or nearby count if available, titleColor]
[action pill — "Explore nearby", mutedCardSurface]
```

Dimensions:
- Width: ~140–160px (fixed, rail-snapped)
- Height: ~160–180px (aspect ratio ~1.1:1)
- Matches the feel of `FeaturedHospitalCard` but without imagery (category icon instead)

### `ExploreCategoryRail` (inline sub-component)

```jsx
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  decelerationRate="fast"
  snapToAlignment="start"
  snapToInterval={CARD_WIDTH + CARD_GAP}
  contentContainerStyle={{ paddingHorizontal: 2, gap: CARD_GAP }}
>
  {EXPLORE_PROVIDER_TYPES.filter(t => t !== PROVIDER_TYPES.HOSPITAL).map(...)}
</ScrollView>
```

---

## Files to Change

- `components/map/MapCareHistoryModal.jsx` — replace `ExploreCategoryChip` + `exploreGrid` with `ExploreCategoryCard` + `ExploreCategoryRail`

## Files NOT to change

- `constants/providerTypes.js` — already correct
- `components/map/tokens/mapSheetTokens.js` — already correct
- `components/map/surfaces/MapModalShell.jsx` — no change
- `components/map/MapModalOrchestrator.jsx` — no change
- `screens/MapScreen.jsx` — no change
- Any query hook, atom, or service — no change

---

## Acceptance

- Category cards use `tokens.strongCardSurface` — no alien colors
- `markerTint` used only for icon tint + icon tile background alpha — not as card fill
- `borderRadius: tokens.cardRadius` + `borderCurve: "continuous"` on every card
- Emergency section (CareBlade) visually unchanged
- Section eyebrow labels unchanged
- Rail scrolls horizontally with inertia and snap
- `EXPLORE_PROVIDER_TYPES` from `constants/providerTypes` is the source of categories
- No hardcoded hex surface colors outside `EXPLORE_CATEGORY_META.markerTint`
- pressed state matches `hospitalCardPressed` pattern

---

## Changed Files

- `components/map/MapCareHistoryModal.jsx` (modified)

## Verification

- `getMapSheetTokens` imported; `tokens` derived in component body — no hardcoded hex surface colors.
- `tokens.titleColor`, `tokens.mutedText`, `tokens.mutedCardSurface`, `tokens.strongCardSurface` used exclusively.
- `EXPLORE_PROVIDER_TYPES` from `constants/providerTypes` is the single source of categories — local `EXPLORE_CATEGORIES` array removed.
- `PROVIDER_TYPES.HOSPITAL` filtered out of rail categories — hospital surfaces in emergency section.
- `ExploreCategoryCard` uses `tokens.cardRadius` (30) + `borderCurve: "continuous"` — matches existing anatomy.
- `markerTint` used only for icon tile background at `"18"` hex alpha — not as card fill.
- `ExploreCategoryRail` uses `decelerationRate="fast"` + `snapToAlignment="start"` + `snapToInterval` — matches `MapExploreIntentHospitalRail`.
- Emergency `CareBlade` section visually unchanged.
- `bladeSurface` background replaced with `tokens.strongCardSurface` — no alien color.
- Pressed state: `opacity: 0.96, scale: 0.996` — matches `hospitalCardPressed`.
- `LinearGradient` import kept (used by `CareBlade` — emergency blades).
- No state, query, schema, or navigation changes.

## Rollback Notes

- Revert `MapCareHistoryModal.jsx` to chip-grid `ExploreCategoryChip` + `exploreGrid`.
- No other files affected.
