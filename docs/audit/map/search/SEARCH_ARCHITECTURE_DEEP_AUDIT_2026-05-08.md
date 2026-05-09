# Search Architecture Deep Audit

**Date:** 2026-05-08  
**Scope:** Complete search flow from context → model → UI  
**Finding:** Clean architecture but mode chips create friction.

---

## 1. Search State Architecture

### Layer 1: Global State (SearchContext)

**File:** `contexts/SearchContext.jsx`

- `query`, `recentQueries`, `trendingSearches`
- Persisted to `StorageKeys.SEARCH_HISTORY`
- ✅ Clean L3 (Zustand/database) pattern

### Layer 2: Sheet Model (useMapSearchSheetModel)

**File:** `hooks/map/surfaces/search/useMapSearchSheetModel.js`

- Mode system: SEARCH vs LOCATION
- Location suggestions from Mapbox
- ⚠️ Mode chips = friction point

### Layer 3: UI (MapSearchSheetSections)

**File:** `components/map/surfaces/search/MapSearchSheetSections.jsx`

- ModeChip row at top
- Sections: Current, Nearby, Recent, Popular
- ⚠️ Needs unification

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
