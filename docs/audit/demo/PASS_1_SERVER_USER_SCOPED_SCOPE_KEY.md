> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Pass 1 — Server: User-Scoped Scope Key

**Track:** Backend / Edge Function
**Date:** 2026-05-10
**Status:** PLANNED — not yet implemented
**Depends on:** nothing (self-contained)
**Blocks:** Pass 2 (cross-org sweep assumes one org per user), Pass 3 (cleanup targets coordinate-scoped rows)

---

## Problem This Pass Solves

`resolveDemoSeedScopeKey` returns `ctx.coverageKey` for any city not in `CITY_DEMO_FALLBACK_CATALOGS`.
`ctx.coverageKey` encodes the user's GPS coordinates at ~1.1 km precision.
GPS drift of 10–50 m between sessions produces a new scope key → a new org → a new set of 5–6 hospitals written permanently alongside the previous set.

Toronto has no catalog entry. Every Toronto user (and every user outside Lagos) is fully exposed.

**Root function (server, index.ts ~line 715):**
```ts
const resolveDemoSeedScopeKey = (ctx: DemoContext) => {
  return catalog ? `city_${catalog.key}` : ctx.coverageKey;
};
```

---

## Exact Change

**File:** `supabase/functions/bootstrap-demo-ecosystem/index.ts`

```ts
// PULLBACK NOTE: Scope key was previously coordinate-based (ctx.coverageKey)
// for non-catalog locations. This caused a new org + 5-6 new hospitals on every
// ~1km GPS drift, accumulating duplicates worldwide (confirmed: Toronto user).
// Changed to ctx.userSlug — stable across all sessions and all cities.
// OLD: return catalog ? `city_${catalog.key}` : ctx.coverageKey;
// NEW: return ctx.userSlug;
const resolveDemoSeedScopeKey = (ctx: DemoContext) => {
  return ctx.userSlug;
};
```

### Why `ctx.userSlug` is safe

- Already on `DemoContext` (line 306, type: `string`)
- Already populated at the call site (line 1950: `userSlug: toSafeUserSlug(effectiveUserId)`)
- Derived from the Supabase auth user ID — stable across all sessions and all cities
- `toSafeUserSlug` already strips non-alphanumeric chars and clamps to 12 chars — safe for email and `place_id` embedding

---

## What Flows Through the Scope Key

Every downstream function reads scope via `resolveDemoSeedScopeKey`. This change propagates automatically:

| Call site | Effect after change |
|---|---|
| `toDemoPlaceId` | `place_id` format: `demo:<userSlug>:src:<sourceId>` |
| `ensureDemoOrganization` | org email: `demo+coverage-<userSlug>@ivisit-demo.local` |
| `toAuthEmail` | staff email: `demo-doctor-1+<userSlug>@ivisit-demo.local` |
| `getCatalogSeedHospitals` | catalog seed feature tag: `demo_scope:<userSlug>` |
| slot cleanup prefix | `demo:<userSlug>:slot:` — correct prefix for stale slot sweep |

---

## What Does NOT Change

| Item | Why unchanged |
|---|---|
| `CITY_DEMO_FALLBACK_CATALOGS` array | Still used as seed data source for hospital names/coords |
| `findCityDemoFallbackCatalog` function | Still called in `getCatalogSeedHospitals` and `ensureDemoHospitals` |
| `toCoverageKey` function | Still used to populate `ctx.coverageKey` — used only for client display/logging, not scope identity |
| `place_id LIKE 'demo:%'` prefix | Unchanged — all scripts, markers, and queries depend on this |
| `DEMO_MIN_HOSPITALS = 5` / `DEMO_MAX_HOSPITALS = 6` | Unchanged |
| `nearby_hospitals` RPC | Unchanged |
| `isDemoSeedRow` filter | Unchanged — still filters out demo rows from seed input |
| `upsert on place_id` conflict resolution | Unchanged — still correct, now benefits from stable keys |
| `status = 'full'` retirement pattern | Unchanged — active pool rule still applies |

---

## Edge Cases & Loop Holes

### EC-1: User with no auth ID (guest session)
`toSafeUserSlug` falls back to `"guestdemo"` when the normalized value is empty (line 352–354).
All guest users share the same slug and therefore the same org.
**This is acceptable and intentional** — guest sessions always shared one provisioning ID via `resolveProvisioningUserId` on the client. No regression.

### EC-2: Two authenticated users with userIds that collide after slug normalization
`toSafeUserSlug` strips non-alphanumeric chars and clamps to 12 chars.
UUID collision after 12-char alphanumeric truncation is extremely unlikely (UUIDs contain hex chars only — `a-f0-9` — so collisions require first 12 hex chars to match).
**Risk: negligible.** If a collision occurs, two users share one org — same as the old guest behavior. Not a safety issue for demo mode.

### EC-3: Existing coordinate-scoped rows in DB after this deploy
Old rows like `demo:p4365_n7939:src:mapboxabc123` remain `status = available` in the DB.
They still match `place_id LIKE 'demo:%'` and will appear on the map until Pass 2 (cross-org sweep) retires them.
**Must ship Pass 1 + Pass 2 together.** Pass 1 alone is not sufficient.

### EC-4: `resolveDemoSeedScopeKey` called inside `findCityDemoFallbackCatalog`?
No — `findCityDemoFallbackCatalog` only reads `ctx.latitude/longitude` to check distance from catalog reference points. It does not call `resolveDemoSeedScopeKey`. No circular dependency.

### EC-5: Slot cleanup prefix after scope change
The stale slot cleanup at line 1428 uses:
```ts
const slotPrefix = `demo:${resolveDemoSeedScopeKey(ctx)}:slot:`;
```
After the change, prefix becomes `demo:<userSlug>:slot:`. This correctly targets only the current user's slot-based hospitals. Old coordinate-scoped slot rows (`demo:p4365:slot:1`) are NOT cleaned by this prefix — they are handled by the cross-org sweep in Pass 2.

### EC-6: `getCatalogSeedHospitals` feature tag `demo_scope:`
At line 1318: `\`demo_scope:${ctx.coverageKey}\``
This is a feature flag embedded in the hospital row, not the scope key itself.
**Action required:** audit whether `demo_scope:` is used anywhere in queries or client logic. If only used for display/tagging, it can stay as `ctx.coverageKey`. If used to filter hospitals for a specific scope, it should change to `ctx.userSlug`.

**Lookup:**
```ts
// line 1318 in ensureDemoHospitals:
`demo_scope:${ctx.coverageKey}`,
```
Cross-check: `matchesDemoScope` or similar function that reads this feature — confirm in `demoEcosystemService.js` and `hospitalIdentity.js` before closing this pass.

### EC-7: `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md` carry-forward rule
The bloat remediation checkpoint mandates updating this doc in the same commit as any bootstrap logic change.
Pass 5 is the doc update — must ship in the same commit as Pass 1 + 2.

---

## Dropped Function Risk Audit

| Function | Still called after change? | Safe? |
|---|---|---|
| `toCoverageKey` | Yes — used to set `ctx.coverageKey` at line 1951 | Safe — ctx field still exists for logging |
| `toCoverageAxisKey` | Yes — called by `toCoverageKey` | Safe |
| `findCityDemoFallbackCatalog` | Yes — called in `getCatalogSeedHospitals`, `ensureDemoHospitals` | Safe |
| `getCatalogSeedHospitals` | Yes — still returns hospital templates | Safe |
| `resolveDemoSeedScopeKey` | Yes — one-liner change only | Safe |

No functions are dropped. One function body changes by one line.

---

## Verification Checklist

- [ ] `resolveDemoSeedScopeKey` returns `ctx.userSlug` for all cities including Lagos
- [ ] Two bootstrap calls from coords 200 m apart for the same user → same org ID
- [ ] `place_id` values for new hospitals all share `demo:<userSlug>:` prefix
- [ ] Hospital count per user stays at 5–6
- [ ] Catalog seed hospitals still appear (Lagos test)
- [ ] `EC-6` `demo_scope:` feature tag impact confirmed (client search before closing pass)
- [ ] PULLBACK NOTE on every changed line
- [ ] Pass 5 doc update included in same commit

---

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/bootstrap-demo-ecosystem/index.ts` | `resolveDemoSeedScopeKey` body: 1 line |

---

## Navigation

← [README](./README.md)
→ [Pass 2: Cross-Org Retirement Sweep](./PASS_2_SERVER_CROSS_ORG_SWEEP.md)
