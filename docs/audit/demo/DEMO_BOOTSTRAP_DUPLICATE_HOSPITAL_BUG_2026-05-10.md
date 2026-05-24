---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](./RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Demo Bootstrap â€” Duplicate Hospital Bug: Fix Plan
**Date:** 2026-05-10
**Status:** Root cause confirmed. Pass plan aligned to architecture. Ready to implement.
**Severity:** High â€” visible to all demo-mode users worldwide; causes map/list clutter, erodes trust.

---

## 0. Architecture Alignment

This plan was written after reading all relevant audit and architecture docs:

- `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md` â€” the canonical demo rules source
- `docs/audit/map/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md` â€” prior remediation and cleanup sequence
- `docs/architecture/overview/ARCHITECTURE.md` â€” three-layer separation of concerns
- `docs/architecture/refactoring/REFACTORING_BIBLE.md` â€” PULLBACK NOTE convention, pass discipline
- `docs/architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` â€” five-layer state ownership
- `docs/audit/checkpoints/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md` â€” useEffect guardrails
- `docs/audit/map/NEAREST_HOSPITAL_SELECTION_AUDIT_2026-05-07.md` â€” nearby lane discipline
- `docs/audit/map/MAP_LOCATION_NEARBY_AND_ROUTE_FAILURE_AUDIT_2026-05-07.md` â€” location truth contract
- `docs/audit/map/search/LOCATION_ARCHITECTURE_AUDIT_2026-05-08.md` â€” 5-layer location system
- `docs/architecture/ux/IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md` â€” no auto-commit, explicit CTAs
- `docs/architecture/ux/APP_WIDE_SURFACE_AUDIT_FOR_LOCATION_2026-05-10.md` â€” surface reuse rules

### Key prior decisions that constrain this pass

| Rule | Source | Constraint on this fix |
|---|---|---|
| Active demo pool = `status = available` only | DEMO_COVERAGE_FLOW Â§Active Demo Pool Rule | Retirement = `status = full`, never DELETE |
| Cleanup runs in order: dedupe â†’ orphans | DEMO_COVERAGE_FLOW Â§Cleanup Runbook | Fix must be script-compatible with existing tools |
| Metro catalog replaces per-bucket rows; legacy rows must be retired | DEMO_COVERAGE_FLOW Â§Metro Catalog Rule | Scope fix must not re-introduce per-bucket proliferation |
| `5â€“6 active hospitals` per scope | DEMO_COVERAGE_FLOW Â§Demo Bootstrap Volume Rule | Scope fix must not allow count to grow beyond 6 |
| Bootstrap is idempotent and upsert-safe | DEMO_COVERAGE_FLOW Â§Failure Handling | place_id stability is essential; cannot change format unpredictably |
| PULLBACK NOTE on every changed line | REFACTORING_BIBLE Â§Commandment 8 | All code changes must carry inline reversal comments |
| Carry-forward: update `DEMO_MODE_COVERAGE_FLOW.md` in the same pass | BLOAT_REMEDIATION checkpoint Â§Carry-Forward Rule | This doc must be updated alongside code |
| `nearestHospital` derived from strict `â‰¤5km` lane | NEAREST_HOSPITAL_SELECTION_AUDIT | Fix must not widen nearby lane beyond 5km for hospital markers |
| No `useEffect` to mirror state | STACK_GUARDRAIL_RECONCILIATION | No new effect-driven state sync on client |
| Location is the canonical owner of billing country | PICKUP_CONTROL_AND_QUOTE_ADOPTION_AUDIT | Demo scope change must not break locationâ†’billing chain |

---

## 1. Root Cause (Confirmed)

The scope key driving org identity and `place_id` generation embeds the user's **coordinates** at 1.1 km precision. GPS drift of 10â€“50 m between sessions produces a new scope â†’ new org â†’ new 5â€“6 hospitals written permanently alongside the previous set.

**Toronto** has no city catalog entry â€” only Lagos is in `CITY_DEMO_FALLBACK_CATALOGS`. Every Toronto user runs on the raw coordinate scope path with zero proliferation protection.

The correct fix: **scope = user slug, not location.**
- One org per user, stable forever across all cities
- `place_id` format: `demo:<userSlug>:src:<sourceId>` â€” stable per user+source
- Moving cities: slot-based fallback hospitals update coordinates in-place via upsert; source-based hospitals are retired by the existing stale sweep when out of range
- Works anywhere in the world with no catalog maintenance

---

## 2. What the Fix Must Not Break

Based on prior decisions:

1. **`dedupe_demo_hospitals.js` and `cleanup_demo_orphans.js`** â€” scripts remain valid; retirement = `status = full`
2. **Active pool rule** â€” only `status = available` rows count; fix must not re-activate retired rows
3. **Metro catalog seed data** â€” `CITY_DEMO_FALLBACK_CATALOGS` stays as a hospital seed source; only its scope-key override is removed
4. **5â€“6 hospital cap** â€” `DEMO_MIN_HOSPITALS = 5`, `DEMO_MAX_HOSPITALS = 6` unchanged
5. **`nearby_hospitals` RPC** â€” fix must not alter the discovery or nearby lane used by `/map`
6. **`isDemoSeedRow` filter** â€” `getNearbySeedHospitals` already filters demo rows from seeds; this must keep working
7. **Hospital marker render contract** â€” no change to `place_id LIKE 'demo:%'` prefix; markers, queries, and scripts all depend on this prefix
8. **`demo_owner:` feature flag** â€” still used by `matchesDemoOwner`; the feature tag format does not change
9. **Acceptance checks 21 & 22 in DEMO_COVERAGE_FLOW** â€” repeated bootstrap must not grow active count; historical `full` hospitals must not generate new staff

---

## Pass 1 â€” Server: User-Scoped Scope Key

**File:** `supabase/functions/bootstrap-demo-ecosystem/index.ts`
**Effort:** ~10 lines changed
**Risk:** Low â€” contained inside the function; all downstream logic uses the scope key value, not its derivation

### 1.1 Change `resolveDemoSeedScopeKey`

```ts
// PULLBACK NOTE: Scope key was previously coordinate-based (ctx.coverageKey) for
// non-catalog locations. Changed to ctx.userSlug so scope is user-stable across
// all cities worldwide â€” prevents per-session org proliferation from GPS drift.
// OLD: return catalog ? `city_${catalog.key}` : ctx.coverageKey;
// NEW: return ctx.userSlug;
const resolveDemoSeedScopeKey = (ctx: DemoContext) => {
  return ctx.userSlug;
};
```

`ctx.userSlug` is already on `DemoContext` (line 306) and populated at the call site (line 1950) via `toSafeUserSlug(effectiveUserId)`. It is derived from the Supabase auth user ID â€” stable across all sessions and all locations.

**Effect on place_id format:**
- Before: `demo:p4365_n7939:src:mapboxabc123`
- After:  `demo:<userSlug>:src:mapboxabc123`

One org per user. One upsert row per user per source hospital. Moving cities updates coordinates in-place for slot-based fallbacks; source-based hospitals are retired by the existing stale sweep when no longer in range.

### 1.2 Keep `CITY_DEMO_FALLBACK_CATALOGS` intact

The catalog path in `getCatalogSeedHospitals` and `findCityDemoFallbackCatalog` remains untouched. Catalog data is still used as a seed source for hospital names and coordinates. Only the scope-key override branch inside `resolveDemoSeedScopeKey` is removed.

Do NOT remove the catalog arrays or the `findCityDemoFallbackCatalog` function.

### 1.3 Org email key follows automatically

`ensureDemoOrganization` keys by `contact_email = demo+coverage-<scopeKey>@ivisit-demo.local`. After this change it becomes `demo+coverage-<userSlug>@ivisit-demo.local`. No code change needed â€” the value flows from `resolveDemoSeedScopeKey`. The lookup still uses `.maybeSingle()` (line 1116 â€” confirmed correct).

### Verification
- Deploy to staging
- Bootstrap from two GPS coordinates 200 m apart for the same user
- Confirm: same org ID returned both times
- Confirm: hospital count stays at 5â€“6, not 10â€“12
- Confirm: all `place_id` values share the same `<userSlug>` prefix

---

## Pass 2 â€” Server: Cross-Org Geographic Retirement Sweep

**File:** `supabase/functions/bootstrap-demo-ecosystem/index.ts`
**Location:** end of `ensureDemoHospitals`, after the existing `staleOrgDemoIds` retirement block
**Effort:** ~25 lines added
**Risk:** Low â€” sweep only retires, never deletes; mirrors the active pool rule already in place

The existing retirement sweep retires stale hospitals within the **current user's org only**. Hospitals from old coordinate-scoped orgs (e.g. `p4365_n7939`) across the city remain `status = available` and appear on the `/map` hospital markers and list.

Add a **cross-org sweep** bounded to a geographic radius:

```ts
// PULLBACK NOTE: Added cross-org stale sweep to retire demo hospitals from
// old coordinate-scoped orgs left over before user-slug scope migration.
// Radius = 0.15Â° (~16km) â€” wider than DEMO_HOSPITAL_OFFSETS (~1km) but
// tight enough to avoid retiring hospitals belonging to genuinely different users
// in distant parts of a city.
// OLD: sweep was organization_id-scoped only.
// NEW: sweep also retires demo rows from other orgs within bounding box.
const STALE_SWEEP_RADIUS_DEG = 0.15;

const { data: crossOrgStaleRows } = await admin
  .from("hospitals")
  .select("id,place_id,organization_id")
  .like("place_id", "demo:%")
  .eq("status", "available")
  .neq("organization_id", organizationId)
  .gte("latitude", ctx.latitude - STALE_SWEEP_RADIUS_DEG)
  .lte("latitude", ctx.latitude + STALE_SWEEP_RADIUS_DEG)
  .gte("longitude", ctx.longitude - STALE_SWEEP_RADIUS_DEG)
  .lte("longitude", ctx.longitude + STALE_SWEEP_RADIUS_DEG);

const crossOrgStaleIds = (Array.isArray(crossOrgStaleRows) ? crossOrgStaleRows : [])
  .map((row) => row.id)
  .filter(Boolean);

if (crossOrgStaleIds.length > 0) {
  await admin
    .from("hospitals")
    .update({ status: "full", updated_at: nowIso() })
    .in("id", crossOrgStaleIds);
}
```

**Why this is safe:** After Pass 1, each user has exactly one org. A cross-org demo hospital in the same area must belong to an old coordinate-scoped org from a prior bootstrap run. Retiring it is correct â€” it was already semantically stale.

**Invariant:** No hard deletes. `status = full` is the only mutation, consistent with the active pool rule and the cleanup runbook.

### Verification
- Seed the staging DB with two orgs for the same location (simulate old state)
- Run bootstrap for one user
- Confirm stale org's hospitals move to `status = full`
- Confirm active user's hospitals are untouched
- Rerun `cleanup_demo_orphans.js` â€” confirm no regressions in orphan counts

---

## Pass 3 â€” DB Cleanup: Retire Existing Duplicates

**File:** `supabase/scripts/dedupe_demo_hospitals.js` (extend existing script, or apply SQL manually)
**Effort:** SQL query + dry-run review
**Risk:** Medium â€” must be gated on dry-run confirmation before applying

Pass 1 + 2 prevent future proliferation. Pass 3 cleans up what already exists in the DB.

### Strategy

The existing `dedupe_demo_hospitals.js` already handles some deduplication. Extend or supplement it with a coordinate-cluster pass:

```sql
-- Step 1: DRY RUN â€” identify duplicate demo hospital clusters
-- Group by name + 0.003Â° coordinate bucket (~330m)
WITH clustered AS (
  SELECT
    id,
    place_id,
    name,
    updated_at,
    status,
    ROUND(latitude::numeric, 3)  AS lat_bucket,
    ROUND(longitude::numeric, 3) AS lng_bucket,
    ROW_NUMBER() OVER (
      PARTITION BY
        LOWER(LEFT(REGEXP_REPLACE(name, '\s+', ' ', 'g'), 40)),
        ROUND(latitude::numeric, 3),
        ROUND(longitude::numeric, 3)
      ORDER BY updated_at DESC NULLS LAST
    ) AS rn
  FROM hospitals
  WHERE
    place_id LIKE 'demo:%'
    AND status = 'available'
)
SELECT id, place_id, name, lat_bucket, lng_bucket, rn
FROM clustered
WHERE rn > 1
ORDER BY lat_bucket, lng_bucket, name;

-- Step 2: After verifying dry-run output, apply retirement (uncomment):
-- UPDATE hospitals
-- SET status = 'full', updated_at = now()
-- WHERE id IN (
--   SELECT id FROM clustered WHERE rn > 1
-- );
```

**Execution sequence** (consistent with existing cleanup runbook):
1. `node supabase/scripts/dedupe_demo_hospitals.js` â€” dry run first
2. Run the SQL dry-run SELECT above on staging
3. Review candidate rows â€” confirm no false positives
4. `node supabase/scripts/dedupe_demo_hospitals.js --apply` OR apply SQL UPDATE
5. `node supabase/scripts/cleanup_demo_orphans.js` â€” dry run to confirm zero orphan drift
6. If staging clean, apply to production in a quiet window

**Target posture after Pass 3 (per DEMO_COVERAGE_FLOW acceptance checks):**
- `orphan_demo_profiles = 0`
- `retired_demo_hospitals_prunable = 0`
- `hospitals_needing_repair = 0`
- Active demo hospitals per user scope: 5â€“6

---

## Pass 4 â€” Client: Coverage Gate Owner Scoping

**File:** `services/demoEcosystemService.js`
**Function:** `getPersistedDemoCoverageForLocation`
**Effort:** ~15 lines
**Risk:** Low â€” gate becomes stricter, not looser; worst case is an extra bootstrap call

Currently `getPersistedDemoCoverageForLocation` counts demo hospitals from **any org** within the radius. After Pass 1, a different user's org could have 5+ hospitals at the same location. The coverage gate would return `sufficient: true` and skip bootstrap â€” leaving the current user with no org and no hospitals they can dispatch.

Add owner slug to the coverage filter:

```js
// PULLBACK NOTE: Coverage gate previously counted demo hospitals from any org.
// Changed to filter by current user's owner slug so User B does not inherit
// User A's coverage count as sufficient and skip their own bootstrap.
// OLD: no owner filter in getPersistedDemoCoverageForLocation
// NEW: filter .filter((row) => this.matchesDemoOwner(row, ownerSlug))
```

Thread `userId` into `getPersistedDemoCoverageForLocation` from `ensureDemoEcosystemForLocation` (already has `provisioningUserId` in scope):

```js
const ownerSlug = toProvisioningOwnerSlug(provisioningUserId);
// In the .filter() chain after countsAsDemoCoverage:
.filter((row) => this.matchesDemoOwner(row, ownerSlug))
```

`matchesDemoOwner` already exists (line ~208 of `demoEcosystemService.js`) â€” no new logic needed.

**Architecture note:** This is a pure client-side filter on already-fetched rows. No new Supabase query. No `useEffect`. Consistent with the no-effect-mirroring guardrail.

### Verification
- Two test users bootstrap at the same location
- User B's coverage check must NOT count User A's hospitals as sufficient
- User B proceeds to bootstrap and receives their own org + hospitals

---

## Pass 5 â€” Doc: Update `DEMO_MODE_COVERAGE_FLOW.md`

**File:** `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`
**Per carry-forward rule in BLOAT_REMEDIATION checkpoint:** must update this doc in the same pass as any bootstrap logic change.

Add a new section after `Â§Active Demo Pool Rule`:

```markdown
## User-Scoped Bootstrap Rule (2026-05-10)

- Demo bootstrap scope is user-identity-based, not coordinate-based.
- The scope key is `ctx.userSlug` (derived from the authenticated user ID).
- Each user has exactly one demo org, stable across all sessions and all cities.
- Moving cities does not create a new org or a new set of place_ids.
- Slot-based fallback hospitals update coordinates in-place via upsert when the user moves.
- Source-based hospitals are retired by the stale sweep when the user moves beyond range.
- This rule applies worldwide â€” no per-city catalog entry is required.
- `CITY_DEMO_FALLBACK_CATALOGS` remain valid as seed data sources for hospital names and
  coordinates; they no longer override the scope key.
- A cross-org geographic sweep (radius ~16km) retires demo hospitals from old
  coordinate-scoped orgs on every bootstrap run.
- The duplicate-hospital acceptance check (check 21) is enforced by org stability:
  one user, one org, one upsert pass per bootstrap cycle.
```

---

## Execution Order

```
Pass 1 + 2  â†’  deploy Edge Function to staging
            â†’  verify same-user org stability (two coords, same org)
            â†’  verify cross-org sweep retires stale rows
Pass 3      â†’  dry-run SQL on staging â†’ review â†’ apply on staging
            â†’  cleanup_demo_orphans.js dry run â†’ confirm zero orphan drift
            â†’  apply on production in maintenance window
Pass 4      â†’  client PR, staging test with two users at same location
Pass 5      â†’  update DEMO_MODE_COVERAGE_FLOW.md in same commit as Pass 1+2
```

Pass 1 and 2 ship together in one Edge Function deployment.
Pass 5 ships in the same commit as Pass 1 + 2 (carry-forward rule).
Pass 3 is gated on staging verification.
Pass 4 is a separate client PR â€” system is correct without it; gate just becomes stricter.

---

## Files to Change

| File | Pass | Change |
|---|---|---|
| `supabase/functions/bootstrap-demo-ecosystem/index.ts` | 1, 2 | `resolveDemoSeedScopeKey` â†’ userSlug; cross-org sweep |
| `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md` | 5 | Add User-Scoped Bootstrap Rule section |
| `services/demoEcosystemService.js` | 4 | Owner slug filter in coverage gate |
| DB (via existing scripts or SQL) | 3 | Soft-retire existing duplicates |

---

## Invariants â€” Never Violate

- Never delete demo hospital rows â€” always `status = 'full'`
- Never add a unique constraint on `(latitude, longitude)`
- `place_id LIKE 'demo:%'` prefix stays â€” all scripts, queries, and markers depend on it
- `CITY_DEMO_FALLBACK_CATALOGS` stays â€” seed data, not scope control
- `DEMO_MIN_HOSPITALS = 5`, `DEMO_MAX_HOSPITALS = 6` unchanged
- `nearby_hospitals` RPC and the strict `â‰¤5km` nearby lane are untouched
- Pass 3 UPDATE is always gated on a dry-run SELECT first
- PULLBACK NOTE on every changed line
