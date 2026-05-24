---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Pass 3 â€” DB: Retire Existing Duplicate Demo Hospitals

**Track:** Database / Scripts
**Date:** 2026-05-10
**Status:** PLANNED â€” gated on Pass 1 + 2 staging verification
**Depends on:** Pass 1 and Pass 2 deployed and verified on staging
**Blocks:** nothing (cleanup only; system is functional without it, just noisier)

---

## Problem This Pass Solves

Pass 1 prevents future duplicate accumulation. Pass 2 retires stale hospitals on each new bootstrap run. Neither removes hospitals that already accumulated in the DB before this fix ships.

The Toronto user's issue (and similar users worldwide) shows rows that are already in the DB: multiple sets of `demo:p<coords>:â€¦` hospitals sitting `status = available` from prior coordinate-scoped bootstrap runs. These appear on the map and list immediately, regardless of what the new code does.

This pass cleans them up using the existing script infrastructure documented in the cleanup runbook.

---

## Execution Sequence

Follows the canonical sequence from `docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md Â§Demo Cleanup Runbook`:

```
1. node supabase/scripts/dedupe_demo_hospitals.js           (dry run â€” review output)
2. SQL coordinate-cluster SELECT                             (dry run â€” review candidates)
3. node supabase/scripts/dedupe_demo_hospitals.js --apply   (apply if staging output is clean)
4. SQL coordinate-cluster UPDATE                             (apply after dry-run review)
5. node supabase/scripts/cleanup_demo_orphans.js            (dry run â€” confirm no orphan drift)
6. node supabase/scripts/cleanup_demo_orphans.js --apply    (apply if zero orphan drift)
```

Only run steps 3, 4, 6 after explicitly reviewing the dry-run output of 1, 2, 5.

---

## SQL Coordinate-Cluster Dry Run

Run this on staging first. Review the candidate set before applying anything.

```sql
-- STEP 1: DRY RUN â€” identify duplicate demo hospital clusters
-- Groups by name (first 40 chars normalized) + 0.003Â° bucket (~330m)
-- Keeps newest row per cluster (by updated_at DESC)
-- Returns all rows that should be retired (rn > 1)

WITH clustered AS (
  SELECT
    id,
    place_id,
    name,
    organization_id,
    updated_at,
    status,
    latitude,
    longitude,
    ROUND(latitude::numeric, 3)  AS lat_bucket,
    ROUND(longitude::numeric, 3) AS lng_bucket,
    ROW_NUMBER() OVER (
      PARTITION BY
        LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))),
        ROUND(latitude::numeric, 3),
        ROUND(longitude::numeric, 3)
      ORDER BY updated_at DESC NULLS LAST
    ) AS rn
  FROM hospitals
  WHERE
    place_id LIKE 'demo:%'
    AND status = 'available'
)
SELECT
  id,
  place_id,
  name,
  lat_bucket,
  lng_bucket,
  rn,
  updated_at
FROM clustered
WHERE rn > 1
ORDER BY lat_bucket, lng_bucket, name;
```

**What to check in the output:**
- Are candidate rows actually duplicates (same name, same coordinate bucket)?
- Are any `place_id` values using the new `demo:<userSlug>:â€¦` format? (If yes, Pass 1+2 were already deployed â€” confirm before retiring)
- Row count â€” if >100 rows, consider batching the UPDATE

---

## SQL Retirement (Apply Only After Dry-Run Review)

```sql
-- STEP 2: APPLY â€” retire duplicate demo hospitals
-- Only run after reviewing the dry-run SELECT above
-- Status = 'full' is the only mutation â€” consistent with active pool rule and cleanup runbook

WITH clustered AS (
  SELECT
    id,
    ROUND(latitude::numeric, 3)  AS lat_bucket,
    ROUND(longitude::numeric, 3) AS lng_bucket,
    LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))) AS name_norm,
    ROW_NUMBER() OVER (
      PARTITION BY
        LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))),
        ROUND(latitude::numeric, 3),
        ROUND(longitude::numeric, 3)
      ORDER BY updated_at DESC NULLS LAST
    ) AS rn
  FROM hospitals
  WHERE
    place_id LIKE 'demo:%'
    AND status = 'available'
)
UPDATE hospitals
SET
  status = 'full',
  updated_at = now()
WHERE id IN (
  SELECT id FROM clustered WHERE rn > 1
);
```

---

## Edge Cases & Loop Holes

### EC-1: Coordinate bucket (0.003Â°) clusters hospitals that are NOT duplicates
0.003Â° â‰ˆ 330 m. Two distinct hospitals 200 m apart with different names will NOT be clustered (different `name_norm`). Two distinct hospitals 200 m apart with identical names (uncommon but possible) WILL be clustered â€” one will be retired.
**Mitigation:** Review the dry-run output. If false positives exist, exclude their IDs before applying.

### EC-2: A retired row is still referenced by an active `emergency_request` or `visit`
`status = 'full'` does not cascade. The hospital row stays in the DB, foreign key references remain valid, the request or visit is unaffected. The hospital becomes unavailable for new dispatches only.
This is consistent with the cleanup runbook rule: "preserve demo hospitals still referenced by `emergency_requests` or `visits`."
**If a referenced hospital is mistakenly in the candidate set:** add a `NOT EXISTS` guard to the WHERE clause before applying.

### EC-3: Rows with `place_id` using new `demo:<userSlug>:â€¦` format are in the candidate set
This means Pass 1+2 were already deployed before Pass 3. The new-format rows are the keepers â€” the coordinate-format rows should be the ones retired.
**Mitigation:** The `ORDER BY updated_at DESC` keeps the newest row. If the new-format rows have a more recent `updated_at`, they survive. Confirm in dry-run before applying.

### EC-4: `cleanup_demo_orphans.js` removes an org that has zero available hospitals after this pass
After retiring duplicates, some orgs may have zero `available` hospitals. `cleanup_demo_orphans.js` classifies orgs with no active hospitals as orphan candidates. Verify the script's hard-delete guard: it must preserve orgs referenced by payment or payment-method rows.
The bloat remediation checkpoint confirmed this guard exists. Re-confirm by running the dry run before applying.

### EC-5: Re-running this SQL repeatedly
The `WHERE rn > 1` condition only selects rows with `status = 'available'`. After the first run, retired rows have `status = 'full'` and are excluded. Re-running is safe and idempotent.

### EC-6: `dedupe_demo_hospitals.js` already handles some deduplication
Run `dedupe_demo_hospitals.js` first. It may retire many rows. The SQL coordinate-cluster pass handles cases the script misses (e.g. different `place_id` same physical location). Always run script first, SQL second.

---

## Target Posture After This Pass

Per `DEMO_MODE_COVERAGE_FLOW.md Â§Acceptance Checks` and the bloat remediation checkpoint:

| Metric | Target |
|---|---|
| `orphan_demo_profiles` | 0 |
| `retired_demo_hospitals_prunable` | 0 |
| `hospitals_needing_repair` | 0 |
| Active demo hospitals per user scope | 5â€“6 |
| `demo:p<coords>:â€¦` rows with `status = available` | 0 |

---

## Verification Checklist

- [ ] `dedupe_demo_hospitals.js` dry run reviewed â€” output makes sense
- [ ] SQL coordinate-cluster SELECT dry run reviewed â€” no false positives
- [ ] `dedupe_demo_hospitals.js --apply` run on staging
- [ ] SQL UPDATE applied on staging
- [ ] `cleanup_demo_orphans.js` dry run on staging â€” zero orphan drift
- [ ] `cleanup_demo_orphans.js --apply` run on staging
- [ ] Active demo hospital count per user = 5â€“6 after cleanup
- [ ] Zero `demo:p<coords>:â€¦` rows with `status = available` remain
- [ ] Above steps repeated on production in a maintenance window
- [ ] Post-production dry run confirms target posture

---

## Files Changed

| File | Change |
|---|---|
| DB (hospitals table) | `status = 'full'` on duplicate coordinate-scoped demo rows |
| No code files changed | Pass 3 is a DB-only operation |

---

## Navigation

â† [Pass 2: Cross-Org Retirement Sweep](./PASS_2_SERVER_CROSS_ORG_SWEEP.md)
â†’ [Pass 4: Client Coverage Gate Owner Scoping](./PASS_4_CLIENT_COVERAGE_GATE.md)
