---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Billing Quote Adoption Gap Audit

Date: 2026-05-07
Scope: billing display after SCC-058 quote lane

## Summary

✅ **IMPLEMENTED 2026-05-07**: Billing quote adoption now complete in active map decision surfaces.

The billing quote lane is live and fully adopted across runtime pricing surfaces for ambulance and bed service selection.

## Implementation Status

| Surface | Status | Implementation |
|---------|--------|----------------|
| Ambulance decision | ✅ Complete | `useMapAmbulanceDecisionModel` + `mapAmbulanceDecision.helpers` |
| Bed decision | ✅ Complete | `useMapBedDecisionModel` + `mapBedDecision.helpers` |
| Payment/commit | ✅ Complete | Already using `useBillingQuoteQuery` |

## Implementation Details

### Ambulance Service Selection
**Files Modified:**
- `components/map/views/ambulanceDecision/useMapAmbulanceDecisionModel.js`
- `components/map/views/ambulanceDecision/mapAmbulanceDecision.helpers.js`

**Approach:**
- Added `useQuotedPriceMap` hook to fetch quoted prices for each service option
- Uses pickup country (`origin?.countryCode`) or billing preferences as context
- `buildAmbulanceDecisionModel` receives `quotedPriceMap` and injects quoted prices into service options
- Returns `serviceOptionsWithQuotes` and `recommendedServiceWithQuote` with quoted display labels
- Falls back to canonical pricing if no quote available

### Bed Service Selection
**Files Modified:**
- `components/map/views/bedDecision/useMapBedDecisionModel.js`
- `components/map/views/bedDecision/mapBedDecision.helpers.js`

**Approach:**
- Same pattern as ambulance - `useQuotedPriceMap` for room rows
- `buildBedDecisionModel` injects quoted prices into room options
- Returns `roomOptionsWithQuotes` and `recommendedRoomWithQuote`

## Guardrail (Maintained)

- service row amount = canonical source truth
- service selection label = quoted display projection
- checkout amount = quoted display projection
- settlement amount = canonical source truth

## Legacy Flow Note

Legacy `EmergencyRequestModal` flow was NOT modified - it remains with canonical USD pricing. This is acceptable as the active `/map` flow is the primary user path.
