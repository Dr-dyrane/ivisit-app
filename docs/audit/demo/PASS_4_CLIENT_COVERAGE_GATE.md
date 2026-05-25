---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Pass 4 — Client: Coverage Gate Owner Scoping

**Track:** Frontend / Client Services
**Date:** 2026-05-10
**Status:** PLANNED — not yet implemented
**Depends on:** Pass 1 (client must check pass-1-scoped hospitals only)
**Blocks:** nothing (standalone safety gate)
**Priority:** Low — reduces incorrect "coverage available" reads; not blocking for Pass 1+2 deploy

---

## Problem This Pass Solves

The client-side coverage gate `getPersistedDemoCoverageForLocation` checks whether nearby demo hospitals exist by filtering on coordinate proximity and `place_id LIKE 'demo:%'`. It does NOT filter to the current user's owner slug.

After Pass 1+2, old coordinate-scoped hospitals are retired to `status = full`. However, until Pass 3 cleans them from the DB, the client could read another user's `available` hospitals within 15 km and incorrectly report coverage — preventing a new bootstrap that the user actually needs.

Additionally, if two different users in the same city are both authenticated, User A could "see" User B's hospitals as sufficient and skip their own bootstrap.

---

## Affected Function

**File:** `services/demoEcosystemService.js`

```js
// Current implementation (pre-pass-4):
const getPersistedDemoCoverageForLocation = async (latitude, longitude) => {
  // Fetches demo hospitals within DEMO_PERSISTED_COVERAGE_RADIUS_KM (15 km)
  // Filters place_id LIKE 'demo:%' and status = 'available'
  // Does NOT scope to current user's owner slug
  // ...
};
```

---

## Exact Change

**File:** `services/demoEcosystemService.js`

The function already imports `matchesDemoOwner` from `hospitalIdentity.js` (confirmed in previous session). Use it to filter the result set.

```js
// PULLBACK NOTE: Added owner-slug scoping to coverage gate.
// Previously, any demo hospital within 15 km (any org) counted as sufficient coverage.
// After Pass 1, user's hospitals use stable userSlug scope. This filter ensures only
// the current user's own hospitals count, preventing false "coverage available" reads
// from other users' demo packs or from stale coordinate-scoped rows.
// OLD: hospitals.filter(h => isDemoSeedRow(h) && isWithinCoverageRadius(h, latitude, longitude))
// NEW: add matchesDemoOwner(h, currentUserSlug) predicate to the filter
const getPersistedDemoCoverageForLocation = async (latitude, longitude, currentUserSlug) => {
  // ... existing fetch logic unchanged ...

  // Filter: must be demo row, must be within radius, must belong to this user's scope
  const owned = hospitals.filter(h =>
    isDemoSeedRow(h) &&
    isWithinCoverageRadius(h, latitude, longitude) &&
    matchesDemoOwner(h, currentUserSlug)   // <-- new guard
  );

  return owned.length >= DEMO_MIN_HOSPITALS;
};
```

### How to get `currentUserSlug`
The call site for `getPersistedDemoCoverageForLocation` is `DemoModeContext` or the coverage hook. The `currentUserSlug` is already available via `toSafeUserSlug(supabase.auth.user()?.id)` — the same function used on the server. Import from the shared utility or re-derive inline.

---

## `matchesDemoOwner` Anatomy (Pre-Existing)

From `services/hospitalIdentity.js`:

```js
export const matchesDemoOwner = (hospital, ownerSlug) => {
  // Checks hospital.place_id contains the ownerSlug segment
  // Returns true if place_id is `demo:<ownerSlug>:…`
  // Returns false for coordinate-scoped place_ids that don't contain the slug
};
```

This function was designed for exactly this use case. After Pass 1, the server writes hospitals with `demo:<userSlug>:…` place_ids. `matchesDemoOwner(h, userSlug)` returns `true` for those and `false` for old coordinate-scoped rows.

---

## What Does NOT Change

| Item | Why unchanged |
|---|---|
| `isDemoSeedRow` | Still the primary demo-row filter |
| `isWithinCoverageRadius` / `getHospitalFacilityKey` dedup | Still used for coordinate proximity dedup |
| `DEMO_PERSISTED_COVERAGE_RADIUS_KM` (15 km) | Unchanged |
| `getHospitalsByProximity` RPC | Unchanged |
| Any non-demo hospital path | Completely unaffected |

---

## Call Site Survey

Before implementing, audit all call sites of `getPersistedDemoCoverageForLocation`:

```
grep -r "getPersistedDemoCoverageForLocation" services/ app/ components/ hooks/
```

All call sites must pass `currentUserSlug`. If any call site does not have access to the user slug, use `toSafeUserSlug(supabase.auth.user()?.id)` inline.

---

## Edge Cases & Loop Holes

### EC-1: Guest user (no auth ID)
`toSafeUserSlug(null)` returns `"guestdemo"`. Guest users' hospitals use `demo:guestdemo:…` place_ids. `matchesDemoOwner(h, "guestdemo")` correctly matches those and only those.
No regression for guest sessions.

### EC-2: User hasn't bootstrapped yet (no hospitals exist with their slug)
`getPersistedDemoCoverageForLocation` returns `false` (zero owned hospitals found). This triggers a bootstrap run — the correct behavior. No regression.

### EC-3: Pass 3 not yet run — old coordinate-scoped rows still in DB
`matchesDemoOwner(h, userSlug)` returns `false` for `demo:p4365_n7939:…` rows. They are filtered out. The gate correctly sees zero owned hospitals for the user and triggers bootstrap. This is the exact scenario this pass addresses.

### EC-4: Two users at same location, one has hospitals, one doesn't
After Pass 1+2, User A's hospitals: `demo:userA:…`. User B's hospitals: `demo:userB:…`.
User A's call: filters to `demo:userA:…` only → finds 5–6 hospitals → coverage OK.
User B's call (pre-bootstrap): filters to `demo:userB:…` → finds 0 → triggers bootstrap.
Correct. No cross-user contamination.

### EC-5: `matchesDemoOwner` returns `true` for a partial slug match (e.g. `demo:abc123:…` matches slug `abc`)
`matchesDemoOwner` should match the full slug segment between the first and second colon. If the implementation uses `includes(ownerSlug)` instead of exact segment match, it could false-positive.
**Action:** Read the `matchesDemoOwner` implementation before closing this pass. If it uses `includes`, patch it to use a segment-exact match: `place_id.startsWith("demo:" + ownerSlug + ":")`.

---

## Verification Checklist

- [ ] `matchesDemoOwner` implementation read — confirm segment-exact matching (not `includes`)
- [ ] All call sites of `getPersistedDemoCoverageForLocation` surveyed
- [ ] All call sites updated to pass `currentUserSlug`
- [ ] Test: authenticated user sees only their own hospitals counted in coverage gate
- [ ] Test: guest user coverage gate works correctly
- [ ] Test: user with no bootstrapped hospitals triggers bootstrap correctly
- [ ] Test: two users at same location do not see each other's hospitals in gate
- [ ] PULLBACK NOTE on every changed line
- [ ] No regression in Lagos catalog path (catalog users have same slug-scoped hospitals after Pass 1)

---

## Files Changed

| File | Change |
|---|---|
| `services/demoEcosystemService.js` | `getPersistedDemoCoverageForLocation` — add `currentUserSlug` param and `matchesDemoOwner` guard |
| Any call sites of `getPersistedDemoCoverageForLocation` | Pass `currentUserSlug` |

---

## Navigation

← [Pass 3: DB Cleanup Migration](./PASS_3_DB_CLEANUP_MIGRATION.md)
→ [Pass 5: Documentation + SQL Migration](./PASS_5_DOC_UPDATE_AND_SQL_MIGRATION.md)
