# Demo Bootstrap Duplicate Hospital Bug - Pass Audit Index

**Subsystem:** `bootstrap-demo-ecosystem` Edge Function + client coverage gate
**Bug confirmed:** 2026-05-10
**Full root-cause audit:** [./DEMO_BOOTSTRAP_DUPLICATE_HOSPITAL_BUG_2026-05-10.md](./DEMO_BOOTSTRAP_DUPLICATE_HOSPITAL_BUG_2026-05-10.md)
**Upstream bloat checkpoint:** [../map/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md](../map/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md)
**Coverage flow source of truth:** [../../flows/emergency/DEMO_MODE_COVERAGE_FLOW.md](../../flows/emergency/DEMO_MODE_COVERAGE_FLOW.md)

---

## Root Cause (One Line)

`resolveDemoSeedScopeKey` returns GPS-coordinate-derived keys for any city outside Lagos; GPS drift of 10-50 m between sessions generates a new scope key -> new org -> new hospital set that the `place_id` upsert cannot merge.

---

## 2026-05-11 Status Reconciliation

The demo hospital docs still contain server and DB remediation passes that need a backend follow-up, but the client-side coverage owner matcher has now been hardened during the LocationSheet fix pass.

Audit required:

- Confirm whether Pass 1-3 and Pass 5 remain planned, are partially implemented, or have diverged from these docs.
- Inspect server bootstrap code for the actual scope-key behavior.
- Inspect cross-org retirement logic for the documented 16 km sweep.
- Inspect client coverage gate behavior after the LocationSheet changes and the `matchesDemoOwner()` hardening.
- Confirm that changing pickup through search/manual/saved/recent locations does not create new duplicate demo hospital pools.
- Confirm the docs still match current code and update pass statuses after verification.

Cross-track audit:

- [`../map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md`](../map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md)
---

## Pass Plan

| Pass | Track | Title | Priority | Status |
|------|-------|-------|----------|--------|
| [Pass 1](./PASS_1_SERVER_USER_SCOPED_SCOPE_KEY.md) | Backend | User-Scoped Scope Key | **High** - ship first | PLANNED |
| [Pass 2](./PASS_2_SERVER_CROSS_ORG_SWEEP.md) | Backend | Cross-Org Geographic Retirement Sweep | **High** - ship with Pass 1 | PLANNED |
| [Pass 3](./PASS_3_DB_CLEANUP_MIGRATION.md) | DB | Retire Existing Duplicate Demo Hospitals | **High** - post-deploy maintenance | PLANNED |
| [Pass 4](./PASS_4_CLIENT_COVERAGE_GATE.md) | Frontend | Coverage Gate Owner Scoping | Low - standalone safety gate | IMPLEMENTED - matcher hardened 2026-05-11 |
| [Pass 5](./PASS_5_DOC_UPDATE_AND_SQL_MIGRATION.md) | Docs / Post-Deploy | Documentation Update + SQL Migration | **High** - same commit as Pass 1+2 | PARTIAL - index reconciled, SQL/deploy docs still pending |

---

## Deploy Groupings

### Group A - Deploy Together (same commit, same PR)
- Pass 1: `resolveDemoSeedScopeKey` -> returns `ctx.userSlug` for all cities
- Pass 2: Cross-org geographic retirement sweep inside `ensureDemoHospitals`
- Pass 5 (doc portion): `DEMO_MODE_COVERAGE_FLOW.md` updated per carry-forward rule

### Group B - Post-Deploy Maintenance Window
- Pass 3: DB cleanup SQL + script execution (staging-verified first)
- Pass 5 (SQL portion): Production migration steps

### Group C - Independent (deploy when ready)
- Pass 4: Client coverage gate owner scoping - implemented in `services/demoEcosystemService.js`; still needs runtime confirmation with user-switched coverage data.

---

## Key Invariants This Fix Preserves

| Invariant | Source |
|-----------|--------|
| `place_id LIKE 'demo:%'` prefix on all demo hospitals | All passes |
| No DELETE - only `status = 'full'` retirement | Passes 2, 3 |
| `DEMO_MIN_HOSPITALS = 5`, `DEMO_MAX_HOSPITALS = 6` per user | Pass 1 |
| Lagos catalog path unchanged (`city_lagos` scope key) | Pass 1 |
| Guest session falls back to shared `"guestdemo"` slug | Pass 1 |
| Active pool rule: only `status = available` hospitals count | Passes 2, 3, 4 |

---

## Acceptance Checks (from DEMO_MODE_COVERAGE_FLOW.md Section 21-22)

| Check | Criterion | Owner |
|-------|-----------|-------|
| 21 | Two bootstrap runs, same user, any GPS offset -> same org ID, same place_id set, no new hospitals | Pass 1 |
| 22 | Stale hospitals from ANY org within 16 km retired on next active user bootstrap | Pass 2 |

---

## File Map

```
docs/audit/demo/
  README.md                                   <- this file
  PASS_1_SERVER_USER_SCOPED_SCOPE_KEY.md
  PASS_2_SERVER_CROSS_ORG_SWEEP.md
  PASS_3_DB_CLEANUP_MIGRATION.md
  PASS_4_CLIENT_COVERAGE_GATE.md
  PASS_5_DOC_UPDATE_AND_SQL_MIGRATION.md
```

---

## Related Scripts (pre-existing, no changes in this fix)

| Script | Purpose |
|--------|---------|
| `supabase/scripts/dedupe_demo_hospitals.js` | Dedup by place_id similarity |
| `supabase/scripts/cleanup_demo_orphans.js` | Remove orgs with no active hospitals |
| `supabase/scripts/cleanup_hospital_shadows.js` | Remove shadow/ghost hospital rows |
| `supabase/scripts/audit_demo_coverage.js` | Inventory active demo coverage state |
