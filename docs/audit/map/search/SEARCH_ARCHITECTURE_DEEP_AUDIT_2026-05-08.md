---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Search Architecture Deep Audit

**Date:** 2026-05-08  
**Scope:** Complete search flow from context â†’ model â†’ UI  
**Finding:** Clean architecture but mode chips create friction.

---

## 1. Search State Architecture

### Layer 1: Global State (SearchContext)

**File:** `contexts/SearchContext.jsx`

- `query`, `recentQueries`, `trendingSearches`
- Persisted to `StorageKeys.SEARCH_HISTORY`
- âœ… Clean L3 (Zustand/database) pattern

### Layer 2: Sheet Model (useMapSearchSheetModel)

**File:** `hooks/map/surfaces/search/useMapSearchSheetModel.js`

- Mode system: SEARCH vs LOCATION
- Location suggestions from Mapbox
- âš ï¸ Mode chips = friction point

### Layer 3: UI (MapSearchSheetSections)

**File:** `components/map/surfaces/search/MapSearchSheetSections.jsx`

- ModeChip row at top
- Sections: Current, Nearby, Recent, Popular
- âš ï¸ Needs unification

---

## 2. Mode Chip Removal Strategy

**Remove:**
- `ModeChip` row (lines 302-327)
- `activeMode` state
- Mode-dependent conditional rendering

**Add:**
- `detectSearchIntent` helper
- Saved locations section at top
- Unified results (no mode branches)
- Recent queries as rows (not chips)

---

## 3. Implementation

| File | Changes |
|------|---------|
| `locationStore.js` | Add `savedLocations` array (+30 lines) |
| `MapSearchSheetSections.jsx` | Remove chips, add saved section (+30 net) |
| `useMapSearchSheetModel.js` | Remove mode, add intent detection (-20 net) |
| Helpers | Add `detectSearchIntent` (+20 lines) |

**Total:** ~60 lines removed, ~100 lines added

---

## Summary

**Current:** Clean architecture, mode chips create friction.

**Solution:** Remove mode chips, extend `locationStore`, unify search.

**Confidence:** High. All layers properly separated.

**Risk:** Low. No DB changes, no API changes.

**Ready to implement.**

---

## 2026-05-11 Re-Audit Required After LocationSheet Work

This search audit predates the recent LocationSheet implementation passes. The architecture now has both historical SearchSheet search behavior and newer LocationSheet-owned location search/manual-address behavior.

Current app-state additions:

- LocationSheet now owns selected-location decision states.
- Search result selection should create an address candidate, not commit pickup.
- Manual address search uses `addressAssistService` and `useManualDropController`.
- Manual typed fallback now allows continuing when provider suggestions are weak.
- Saved places, recents, and recent visits are rendered inside LocationSheet surfaces.

Re-audit required:

- Confirm SearchSheet and LocationSheet do not maintain duplicate provider-search contracts.
- Confirm suggestion mapping is not duplicated across SearchSheet, LocationSheet, emergency intake search, and legacy location modals.
- Confirm recent query history and recent pickup history remain separate.
- Confirm saved places do not leak into recents except through explicit recent-use records.
- Confirm LocationSheet search row visuals reuse SearchSheet surfaces rather than inventing a parallel row grammar.
- Confirm no location result commits pickup without the candidate decision CTA.

Cross-track audit:

- [`../LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md`](../LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md)
