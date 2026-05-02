# Demo Bootstrap Bloat Remediation Checkpoint

Date: 2026-05-01
Scope: demo coverage bootstrap, Supabase data hygiene, sponsor-QA preparation

## Why This Pass Happened

Single-user testing was still creating runaway demo staff and auth identities. The symptom in Supabase was severe enough to matter for sponsor review:

- too many demo profiles and auth users
- repeated metro testing reusing old hospitals badly
- new doctors and drivers being created for stale demo hospitals

The root cause was not the app route shell. It was the demo bootstrap and cleanup contract:

1. `bootstrap-demo-ecosystem` capped newly selected hospitals to `5-6`, but still allowed the same-org active pool to keep old `demo:*` hospitals available.
2. Staffing then ran across the returned hospital list, so stale hospitals kept generating doctors, drivers, and ambulances.
3. Existing cleanup scripts removed obvious duplicates and orphan rows, but they were not yet cleaning retired demo hospitals plus their dependent staff rows as one controlled pass.

## Production Changes

### Edge function hardening

Updated:

- [`supabase/functions/bootstrap-demo-ecosystem/index.ts`](../../supabase/functions/bootstrap-demo-ecosystem/index.ts)

Behavioral changes:

- `listDemoHospitals(...)` now treats only `status = available` demo hospitals as active coverage.
- same-org demo hospitals that are no longer in the current selected pack are retired out of the active pool by setting `status = full`.
- staffing now operates only on the active selected pack returned by the current cycle, not the whole same-org historical catalog.

Deployment:

- deployed with `npx supabase functions deploy bootstrap-demo-ecosystem --project-ref dlwtcmhdzoklveihuhjf`

### Cleanup hardening

Updated:

- [`supabase/scripts/cleanup_demo_orphans.js`](../../supabase/scripts/cleanup_demo_orphans.js)

Behavioral changes:

- demo hospitals are split into active (`available`) vs retired (`!= available`)
- retired demo hospitals with no `emergency_requests` or `visits` are now prunable
- the script now removes dependent demo ambulances, doctors, and pricing rows tied only to those prunable retired hospitals
- `hospitals.org_admin_id` is unlinked before demo profile deletion so cleanup does not fail on referential constraints

## Cleanup Sequence Used

1. Dry-run audit:
   - `node supabase/scripts/cleanup_demo_orphans.js`
   - `node supabase/scripts/dedupe_demo_hospitals.js`
2. Applied duplicate cleanup:
   - `node supabase/scripts/dedupe_demo_hospitals.js --apply`
3. Resynced oversized scopes through the deployed edge function so stale hospitals were retired out of `available`
4. Applied orphan + retired-hospital cleanup:
   - `node supabase/scripts/cleanup_demo_orphans.js --apply`
5. Re-ran `cleanup_demo_orphans.js` without `--apply` to confirm sponsor-QA hygiene targets

## Metrics

### Before remediation

- total auth users: `267`
- demo auth users: `255`
- demo profiles: `255`
- demo hospitals: `106`
- demo ambulances: `108`
- demo doctors: `108`
- `city_lagos` alone had `43` active demo hospitals and `87` demo auth users

### After remediation

- total auth users: `212`
- demo auth users: `200`
- demo profiles: `200`
- demo hospitals: `36`
- active demo hospitals: `32`
- retained historical full demo hospitals: `4`
- demo ambulances tied to demo hospitals: `36`
- demo doctors tied to demo hospitals: `36`

Representative post-cleanup scopes:

- `city_lagos`: `8` total demo hospitals -> `6 available`, `2 full`
- `p3375_n11700`: `7` total -> `6 available`, `1 full`
- `p4377_n7919`: `6` total -> `6 available`, `0 full`

The remaining `full` demo hospitals are intentionally preserved because they are still referenced by historical requests or visits.

## Final Verification

Post-apply dry-run of [`cleanup_demo_orphans.js`](../../supabase/scripts/cleanup_demo_orphans.js):

```json
{
  "orphan_demo_orgs": 2,
  "hard_delete_orgs": 0,
  "orphan_demo_profiles": 0,
  "orphan_demo_auth_users": 0,
  "orphan_demo_doctors": 0,
  "orphan_demo_ambulances": 0,
  "retired_demo_hospitals_prunable": 0,
  "retired_demo_profiles_prunable": 0,
  "retired_demo_doctors_prunable": 0,
  "retired_demo_ambulances_prunable": 0,
  "dirty_request_names": 0,
  "dirty_visit_names": 0,
  "hospitals_needing_repair": 0,
  "active_orgs_missing_admin": 0
}
```

Interpretation:

- cleanup targets are exhausted
- there are no more removable retired demo hospitals
- there are no orphan demo auth or profile rows
- two demo orgs still exist, but none are hard-delete eligible under the current payment/payment-method guard

## Carry-Forward Rule

When demo bootstrap logic changes again:

- update [`docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`](../flows/emergency/DEMO_MODE_COVERAGE_FLOW.md) in the same pass
- keep the active-vs-retired pool rule explicit
- always verify with a dry-run cleanup summary after any manual or scripted demo repair
