---
status: living
owner: product
last_updated: 2026-07-22
---

# Explore Care Architecture

This folder owns the implementation dossier for the Explore Nearby Care feature.

Start here:

- [Explore Care Feature Dossier V1](./EXPLORE_CARE_DOSSIER_V1.md)
- [Implementation Passes](./passes/README.md)

Do not implement Explore Care changes from a loose ticket alone. The dossier defines the required Supabase, query, state, UI, and map wiring contracts.

## Hospital directory name recovery

Map hospital search has two deliberately separate owners:

- nearby emergency discovery returns only organization-backed, verified, dispatch-eligible hospitals from the canonical emergency contract;
- a debounced name search may query external provider directories in Explore Care mode, persist an unverified provider shadow for later claiming, and render that result as non-dispatchable.

This split covers provider records whose external taxonomy is incomplete. For
example, Google returns Nigerian Navy Hospital in Ojo for an explicit name
search, but classifies the listing only as `premise` and `street_address`, so a
Nearby Search restricted to type `hospital` cannot see it. The requested
hospital name is valid category evidence for the directory result; it is not
verification or emergency authority.

Implementation owners:

- `services/hospitalsService.js` owns the bounded `text_search` request and
  explicitly sends `emergencyMode: false` and `mergeWithDatabase: true`;
- `components/map/surfaces/search/useMapSearchSheetModel.js` owns debounce,
  cancellation, location bias, local/remote deduplication, and result ranking;
- `discover-hospitals` owns normalization and idempotent `place_id`
  persistence;
- Console claim and verification remain the only path from a provider shadow
  to organization ownership and patient emergency eligibility.

Do not replace nearby hospital discovery with generic Text Search. A generic
`hospital` query did not recover this facility, while an explicit name query
did. Do not copy directory rows into the emergency result or infer dispatch
eligibility from a hospital-looking name.
