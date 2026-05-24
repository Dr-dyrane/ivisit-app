> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Pass 5 — Documentation Update + Post-Deploy SQL Migration

**Track:** Documentation / Post-Deploy
**Date:** 2026-05-10
**Status:** PLANNED — must ship in same commit as Pass 1 + 2
**Depends on:** Pass 1 + Pass 2 (doc update must reflect the deployed behavior)
**Blocks:** nothing — but must not be deferred; the bloat remediation checkpoint requires it

---

## Problem This Pass Solves

`docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md` is the authoritative source of truth for demo mode rules, acceptance checks, and the cleanup runbook. It must stay current with the deployed bootstrap logic.

After Pass 1+2, two rules change:
1. **Scope key rule:** No longer coordinate-based for non-catalog cities — now always user-slug-based
2. **Retirement sweep rule:** Now covers all orgs within 16 km, not just the current org

Additionally, acceptance checks 21 and 22 require updated criteria to reflect the new scoping behavior.

The bloat remediation checkpoint states: *"any bootstrap logic change must update `DEMO_MODE_COVERAGE_FLOW.md` in the same commit."*

---

## Section-Level Changes to `DEMO_MODE_COVERAGE_FLOW.md`

### 1. Metro Catalog Rule (existing section)

**Current text (approximate):**
```
For cities not in CITY_DEMO_FALLBACK_CATALOGS, the scope key is derived from the
user's GPS coordinates using toCoverageKey() — creating approximately 1.1 km buckets.
```

**Replacement:**
```
For all cities (including those not in CITY_DEMO_FALLBACK_CATALOGS), the scope key is
the user's stable slug derived from their auth user ID via toSafeUserSlug().
Coordinate-based scope keys (toCoverageKey) are no longer used for demo org/place_id
scoping. toCoverageKey is retained for display and logging only.

Impact: Each authenticated user has exactly one demo org and one set of hospitals
across all sessions and all cities. GPS drift does not create new orgs or hospitals.
```

### 2. Active Demo Pool Rule (existing section)

Add the following invariant to the existing list:
```
Invariant (added Pass 2, 2026-05-10): The retirement sweep covers all demo hospitals
from all orgs within 0.15° (~16 km) of the current user's location, not just the
current user's org. This ensures stale coordinate-scoped hospitals from old bootstrap
runs are retired on the next active user bootstrap.
```

### 3. Acceptance Checks 21 and 22

**Acceptance Check 21 (pre-existing — coordinate proliferation):**

| Before | After |
|---|---|
| "Two bootstrap runs from coords 200 m apart → same hospital set" | "Two bootstrap runs from any distance, same user → same org ID, same place_id set, no new hospitals created" |

**Acceptance Check 22 (pre-existing — retirement sweep scope):**

| Before | After |
|---|---|
| "Stale hospitals from prior run are retired" | "Stale hospitals from ANY org within 16 km are retired to status = 'full' on next active user bootstrap" |

### 4. Carry-Forward Rules (existing section)

Add a row to the carry-forward table:
```
| toCoverageKey() scope | DEPRECATED for identity — retained for display/logging only | Pass 1, 2026-05-10 |
| Cross-org retirement sweep | Now global (0.15° bounding box) — not org-scoped | Pass 2, 2026-05-10 |
```

---

## Post-Deploy SQL Migration

This is a checklist for the production migration to be run in a maintenance window after Pass 1+2 are deployed and verified on staging.

### Prerequisites
- [ ] Pass 1 + 2 deployed and smoke-tested on production (new bootstrap creates `demo:<userSlug>:…` rows)
- [ ] Staging Pass 3 migration completed and verified
- [ ] DB backup confirmed

### Migration Steps

**Step 1 — Confirm environment**
```sql
-- Verify new-format rows exist (Pass 1+2 deployed)
SELECT COUNT(*) FROM hospitals
WHERE place_id LIKE 'demo:%'
  AND place_id NOT LIKE 'demo:p%'  -- new format does NOT start with 'p' coordinate prefix
  AND status = 'available';
-- Expected: > 0 if any users have bootstrapped after the deploy
```

**Step 2 — Count stale coordinate-scoped rows (dry run)**
```sql
SELECT COUNT(*) FROM hospitals
WHERE place_id ~ '^demo:[a-z][0-9]+_[a-z][0-9]+:'  -- old coordinate-scoped format
  AND status = 'available';
-- Review this count before proceeding
```

**Step 3 — Run dedupe script (staging-verified)**
```bash
node supabase/scripts/dedupe_demo_hospitals.js --apply
```

**Step 4 — Run coordinate-cluster SQL retirement (from Pass 3 doc)**
```sql
-- (Full SQL in PASS_3_DB_CLEANUP_MIGRATION.md)
-- Run the WITH clustered AS (...) UPDATE block
```

**Step 5 — Verify target posture**
```sql
-- Should all be 0 or negligible
SELECT
  (SELECT COUNT(*) FROM hospitals WHERE place_id ~ '^demo:[a-z][0-9]+' AND status = 'available') AS stale_coord_scoped,
  (SELECT COUNT(*) FROM hospitals WHERE place_id LIKE 'demo:%' AND status = 'available') AS total_active_demo;
```

**Step 6 — Run orphan cleanup**
```bash
node supabase/scripts/cleanup_demo_orphans.js --apply
```

**Step 7 — Post-migration acceptance check**
- [ ] Active demo hospitals per authenticated user = 5–6
- [ ] Stale coordinate-scoped `available` rows = 0
- [ ] `cleanup_demo_orphans.js` dry run shows 0 orphan drift

---

## Files Changed

| File | Change |
|---|---|
| `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md` | Metro Catalog Rule, Active Demo Pool Rule, Acceptance Checks 21+22, Carry-Forward table |
| DB (post-deploy migration) | `status = 'full'` on stale coordinate-scoped rows |

---

## Commit Requirements

This pass ships in the **same commit as Pass 1 + 2**. The doc update is not optional.

Commit message should reference:
- `fix(bootstrap): user-scoped scope key + cross-org retirement sweep`
- Mention: `DEMO_MODE_COVERAGE_FLOW.md` updated per carry-forward rule

---

## Verification Checklist

- [ ] `DEMO_MODE_COVERAGE_FLOW.md` Metro Catalog Rule updated
- [ ] `DEMO_MODE_COVERAGE_FLOW.md` Active Demo Pool Rule updated
- [ ] Acceptance checks 21 and 22 updated
- [ ] Carry-forward table has two new rows
- [ ] Doc changes reviewed in same PR as Pass 1 + 2 code changes
- [ ] Post-deploy SQL migration steps completed and verified on production
- [ ] Post-migration acceptance check passed

---

## Navigation

← [Pass 4: Client Coverage Gate Owner Scoping](./PASS_4_CLIENT_COVERAGE_GATE.md)
← [README](./README.md)
