---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# LOC-0 Architecture Review

**Status:** âœ… COMPLETE  
**Owner:** Map/Location Architecture  
**Layer Impact:** Documentation only  
**Date:** 2026-05-15

---

## Goal

Establish canonical pickup truth hierarchy and identify all location architecture gaps before implementation begins.

---

## Read First

- [DOSSIER_LOCATION_HARDENING_V1.md](../DOSSIER_LOCATION_HARDENING_V1.md)
- [REFACTORING_GUARDRAILS.md](../../../../../REFACTORING_GUARDRAILS.md)
- [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [audits/AUDIT_PICKUP_SOURCES.md](../audits/AUDIT_PICKUP_SOURCES.md)
- [audits/AUDIT_LOCATION_TRUTH_LAYER.md](../audits/AUDIT_LOCATION_TRUTH_LAYER.md)

---

## Questions To Resolve

- Where does canonical pickup truth live? (answer: `mapPickupLocationTruth.js`)
- Is manual location persisted? (answer: No â€” ephemeral in `mapExploreFlow.store`)
- Are source enum values consistent? (answer: No â€” enum uses `"saved_manual_fallback"`, code uses `"manual_fallback"`)
- Is provider discovery deterministic? (answer: No â€” cache key lacks source)
- Are location failures classified? (answer: No â€” generic error strings)
- Are Places separated from verified hospitals? (answer: No â€” merged in single list)

---

## Audit Tasks

- [x] Inspect `mapPickupLocationTruth.js` â€” canonical truth resolution
- [x] Inspect `useMapLocation.js` â€” location handoff to map flow
- [x] Inspect `mapExploreFlow.store.js` â€” manual location state
- [x] Inspect `locationStore.js` â€” persisted location
- [x] Inspect `GlobalLocationContext.jsx` â€” global location state
- [x] Inspect `useHospitals.js` â€” cache key determinism
- [x] Inspect `FullScreenEmergencyMap.jsx` â€” error UI
- [x] Verify no duplicate location state architectures exist

---

## Acceptance

- [x] Six location hardening passes defined (LOC-1 through LOC-6)
- [x] Implementation order determined (LOC-5 â†’ LOC-1 â†’ LOC-2 â†’ LOC-6 â†’ LOC-3 â†’ LOC-4)
- [x] All passes have safe implementation paths documented
- [x] No duplicate truth resolution introduced
- [x] Rollback strategy defined for each pass

---

## Decisions

1. **Pickup truth ownership:** `mapPickupLocationTruth.js` owns canonical hierarchy (SESSION_MANUAL â†’ DEVICE â†’ SAVED_*_FALLBACK â†’ MISSING)

2. **Source enum fix:** Add `normalizePickupSource()` mapper rather than changing enum values (backward compatible)

3. **Manual location persistence:** Store in `locationStore` with source field, sync with `mapExploreFlow.store`

4. **Cache determinism:** Add `buildDeterministicCacheKey()` alongside existing key function, dual-key lookup during migration

5. **Error classification:** Add `locationErrorDetailsAtom` (Jotai) alongside existing `locationError` string

6. **Places lanes:** Derive `verifiedHospitals` and `placesHospitals` separately in `useMapDerivedData`

7. **Feature flags:** Each pass gets `ENABLE_LOC_HARDENING_LOC{N}` flag, default `false`

8. **Commit protocol:** One pass = one commit, structured message, verification checklist

---

## Verification

- [x] Reviewed five-layer state architecture guardrails
- [x] Confirmed MapScreen decomposition is complete (Phase 5)
- [x] Verified no existing implementation of source-aware cache keys
- [x] Confirmed no existing structured location error classification
- [x] Validated that Places are currently merged with DB hospitals
- [x] Ensured all six passes are independently reversible

---

## Rollback Notes

- This pass is documentation only â€” no rollback needed
- Baseline commit recorded: `feat/grand-refactor` HEAD
- Backup branch: `backup/loc-0-architecture-review-2026-05-15`
