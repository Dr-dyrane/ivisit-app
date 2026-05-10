# Pass 2 — Server: Cross-Org Geographic Retirement Sweep

**Track:** Backend / Edge Function
**Date:** 2026-05-10
**Status:** PLANNED — not yet implemented
**Depends on:** Pass 1 (must deploy together)
**Blocks:** Pass 3 (reduces volume of rows the cleanup migration must handle)

---

## Problem This Pass Solves

The existing retirement sweep inside `ensureDemoHospitals` retires stale hospitals for the **current user's org only**. Demo hospitals from previously-created coordinate-scoped orgs (e.g. `p4365_n7939`) in the same geographic area remain `status = available` and appear on the `/map` hospital markers and list.

After Pass 1, each user has exactly one stable org. Hospitals from old coordinate-scoped orgs are permanently stale and must be retired on the next bootstrap run.

---

## Exact Change

**File:** `supabase/functions/bootstrap-demo-ecosystem/index.ts`
**Location:** inside `ensureDemoHospitals`, immediately after the existing `staleOrgDemoIds` retirement block (~line 1490)

```ts
// PULLBACK NOTE: Added cross-org geographic retirement sweep.
// Retires demo hospitals from old coordinate-scoped orgs within ~16km bounding box.
// These rows accumulate from pre-Pass-1 bootstraps where scope = GPS coords.
// Retirement = status 'full' — never DELETE, consistent with active pool rule.
// OLD: sweep was organization_id-scoped only.
// NEW: sweep also covers demo rows from other orgs within 0.15° bounding box.
const STALE_SWEEP_RADIUS_DEG = 0.15; // ~16.6 km at equator, ~11 km at 48°N (Toronto)

const { data: crossOrgStaleRows, error: crossOrgSweepError } = await admin
  .from("hospitals")
  .select("id,place_id,organization_id")
  .like("place_id", "demo:%")
  .eq("status", "available")
  .neq("organization_id", organizationId)
  .gte("latitude", ctx.latitude - STALE_SWEEP_RADIUS_DEG)
  .lte("latitude", ctx.latitude + STALE_SWEEP_RADIUS_DEG)
  .gte("longitude", ctx.longitude - STALE_SWEEP_RADIUS_DEG)
  .lte("longitude", ctx.longitude + STALE_SWEEP_RADIUS_DEG);

if (crossOrgSweepError) {
  // Non-fatal: log and continue. A sweep failure should not block the user's bootstrap.
  console.warn("[bootstrap] cross-org sweep failed:", crossOrgSweepError.message);
} else {
  const crossOrgStaleIds = (Array.isArray(crossOrgStaleRows) ? crossOrgStaleRows : [])
    .map((row) => row.id)
    .filter(Boolean);

  if (crossOrgStaleIds.length > 0) {
    const { error: crossOrgRetireError } = await admin
      .from("hospitals")
      .update({ status: "full", updated_at: nowIso() })
      .in("id", crossOrgStaleIds);

    if (crossOrgRetireError) {
      console.warn("[bootstrap] cross-org retirement failed:", crossOrgRetireError.message);
    }
  }
}
```

---

## Design Decisions

### Why `0.15°` radius?
- At the equator: 0.15° ≈ 16.6 km — wide enough to catch all coordinate-scoped orgs a user could have created from one physical location (GPS drift is <1 km)
- At Toronto latitude (43.7°N): 0.15° lat ≈ 16.6 km, 0.15° lng ≈ 12 km — still adequate
- Narrower than the `DEMO_PERSISTED_COVERAGE_RADIUS_KM = 15 km` client threshold — consistent
- Wider than `DEMO_HOSPITAL_OFFSETS` slot spacing (~0.5–1 km) — catches all nearby synthetic slots

### Why bounding box instead of Haversine?
- Supabase PostgREST `.gte/.lte` on columns is a simple indexed range scan
- No RPC needed — avoids adding a second DB call path
- The bounding box over-selects slightly at corners (diagonal ~23 km) but this is safe: extra-selected hospitals are from other orgs and are legitimately stale

### Why non-fatal error handling?
- A sweep failure must not block the user's bootstrap — they need their hospitals
- Logged as `console.warn` for observability
- Next bootstrap run will re-attempt the sweep

### Why `neq("organization_id", organizationId)`?
- Preserves the current user's own org's hospitals unconditionally
- Only targets hospitals from foreign orgs — cannot accidentally retire the user's own active pack

---

## Invariants Preserved

| Invariant | How preserved |
|---|---|
| Active pool rule: only `status = available` counts | Sweep selects `status = available` only; sets to `status = full` |
| No DELETE | `update({ status: "full" })` only — consistent with cleanup runbook |
| Current user's org untouched | `.neq("organization_id", organizationId)` guard |
| `place_id LIKE 'demo:%'` filter | Sweep only targets demo rows — cannot touch real hospitals |
| Marker/query prefix unchanged | No change to `place_id` format |

---

## Edge Cases & Loop Holes

### EC-1: Two different real users bootstrapping at the same physical location
After Pass 1, User A has `org_A` and User B has `org_B`. If User A bootstraps after User B, the sweep retires User B's hospitals within 16 km.
**Impact:** User B's hospitals become `status = full`. User B's next bootstrap run creates a new active pack (same org, upsert in-place).
**Acceptable:** Demo hospitals are not user-data-critical. The next bootstrap run for User B is automatic and fast. This is a known trade-off for global retirement hygiene.
**Mitigation in Pass 4:** The client coverage gate owner-scoping fix (Pass 4) ensures User B does not count User A's hospitals as sufficient, so User B will re-bootstrap correctly.

### EC-2: User bootstrapping from a moving vehicle
Fast movement could trigger multiple bootstrap calls from different coordinates within 16 km. The sweep is idempotent — rows already `status = full` are not re-selected by `.eq("status", "available")`. No double-retirement risk.

### EC-3: Legitimate multi-org scenario (future feature)
Currently there is no multi-org demo feature. If one is added later, the `.neq("organization_id", organizationId)` guard would need to be scoped to the current user's allowed org IDs. Flag this for future review if multi-org demo is planned.

### EC-4: RLS blocking the sweep
`admin` client uses `serviceRoleKey` — bypasses RLS. Sweep query is admin-privileged. No RLS block risk.

### EC-5: Large cities with many stale demo orgs
In a city like Lagos that had 43 active demo hospitals before the previous remediation, the sweep could select many rows. Supabase `.in("id", [...])` has a practical limit of ~500 IDs per call.
**Mitigation:** The cross-org stale rows should be O(tens) at most after Pass 3 migration. If ever large, batch the `.in()` call in groups of 100. Not needed now — add if monitoring shows >50 retired rows per sweep.

### EC-6: `crossOrgStaleIds` contains a hospital still referenced by an active `emergency_request` or `visit`
Setting `status = full` on a hospital referenced by an active request does not delete the request or visit. The hospital becomes unavailable for new dispatches but existing references remain valid. This is consistent with how `cleanup_demo_orphans.js` preserves referenced rows.

---

## Dropped Function Risk Audit

No functions are added or removed. The change inserts a new query block inside `ensureDemoHospitals`. All existing code paths in the function execute before this block and are unaffected.

The `STALE_SWEEP_RADIUS_DEG` constant is new — local to the function, no export needed.

---

## Performance Impact

| Operation | Cost |
|---|---|
| Cross-org select | One indexed range scan on `(latitude, longitude)` + `status` + `place_id` prefix. Negligible for O(tens) rows. |
| Retirement update | One `UPDATE ... IN (ids)` — O(affected rows). Negligible. |
| Total added latency | <50 ms in typical case |

The sweep runs once per `ensureDemoHospitals` invocation. Bootstrap is not on the hot path — it runs once per session or city change.

---

## Verification Checklist

- [ ] Seed staging DB with two orgs at same location (simulate old coordinate-scoped state)
- [ ] Run bootstrap for one user
- [ ] Confirm stale org's hospitals move to `status = full`
- [ ] Confirm active user's hospitals are `status = available` and count = 5–6
- [ ] Confirm `cleanup_demo_orphans.js` dry run shows zero regressions post-sweep
- [ ] Confirm sweep is non-fatal: manually simulate a DB error and verify bootstrap completes
- [ ] EC-1 test: User B bootstraps after User A sweep → User B re-bootstraps correctly
- [ ] PULLBACK NOTE on every changed line
- [ ] Ships in same deployment as Pass 1

---

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/bootstrap-demo-ecosystem/index.ts` | ~30 lines added inside `ensureDemoHospitals` |

---

## Navigation

← [Pass 1: User-Scoped Scope Key](./PASS_1_SERVER_USER_SCOPED_SCOPE_KEY.md)
→ [Pass 3: DB Cleanup Migration](./PASS_3_DB_CLEANUP_MIGRATION.md)
