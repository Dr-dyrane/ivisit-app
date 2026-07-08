# Pending Review & Merge

Branches whose changes are **already applied live to the shared DB** but whose
canon commit is **not yet merged to `main`** — review and merge when ready.
Newest first.

---

## `fix/hospital-array-coalesce` — update_hospital_by_admin preserves arrays

- **Created:** 2026-07-08
- **Branch:** `fix/hospital-array-coalesce` (commit `35c8c969`)
- **Status:** APPLIED live + verified (deployed fn has the COALESCE-preserve) — PENDING review + merge
- **Pillar touched:** `supabase/migrations/20260219010000_core_rpcs.sql`
- **What:** the RPC set `specialties/service_types/features` unconditionally, blanking
  them on a partial update. Now extracts each array only when the payload includes the
  key (else NULL) and `COALESCE(v_*, existing)` in the UPDATE — omitted key preserves,
  explicit `[]` still clears. Let the console delete `mergePreservedHospitalArrays`
  (ivisit-console `f2bfb5c7`).
- **Rollback:** revert the two hunks (extraction + the three `COALESCE(v_*, …)` lines)
  back to the prior unconditional `v_*` assignment; `CREATE OR REPLACE` re-applies.

---

## `fix/revoke-anon-org-financial-fns` — close anon leak on org-financial RPCs

- **Created:** 2026-07-08
- **Branch:** `fix/revoke-anon-org-financial-fns` (commit `ed3ffb94`)
- **Status:** APPLIED live + verified (anon removed from both acls) — PENDING review + merge
- **Pillar touched:** `supabase/migrations/20260219010000_core_rpcs.sql`
- **What:** `REVOKE EXECUTE ... FROM anon` on `check_cash_eligibility(uuid)` and
  `get_org_stripe_status(uuid)` (both `SECURITY DEFINER`, read org financials past RLS).
  authenticated + service_role retained. **Follow-up (not done):** add an in-body
  org-scope guard so authenticated users can't read another org's status by id.
- **Rollback:** `GRANT EXECUTE ON FUNCTION public.check_cash_eligibility(uuid) TO anon; GRANT EXECUTE ON FUNCTION public.get_org_stripe_status(uuid) TO anon;`

---

## `fix/console-operator-select-rls` — console operator SELECT on visits + medical_profiles

- **Created:** 2026-07-08
- **Branch:** `fix/console-operator-select-rls` (commit `270d1a4b`)
- **Status:** APPLIED live to the shared DB (`dlwtcmhdzoklveihuhjf`) — PENDING your review + merge to `main`
- **Pillar touched:** `supabase/migrations/20260219000700_security.sql`

**What it does** — two additive, SELECT-only RLS policies (owner-read and all
write policies untouched):

- `visits` → `"Console operators see org visits"`: admins + any org member,
  scoped via `hospital_id` → org. Mirrors the existing `emergency_requests`
  `"Org Admins see their hospital emergencies"` policy.
- `medical_profiles` → `"Org operators read medical profiles via visits"`:
  admins + operators for patients who have a visit at a hospital in their org
  (org-scoped via the visits join; `medical_profiles` has no direct org column).

**Why it's on a branch:** applied live via the CONTRIBUTING SOP (temp dated
migration -> `supabase db push` -> `supabase migration repair --status reverted`
-> pillar canon), but the canon commit was kept OFF `main` for your review. The
console-side mirror is already committed on the `ivisit-console` branch
(`codex/ivisit-console-revamp-checkpoint-20260707`, commit `ff3cdb4e`).

**To merge (after review):**

```bash
git checkout main
git merge --no-ff fix/console-operator-select-rls
# review the security.sql diff, then push when satisfied:
git push origin main
```

**Rollback (additive + safe to drop, if ever needed):**

```sql
DROP POLICY IF EXISTS "Console operators see org visits" ON public.visits;
DROP POLICY IF EXISTS "Org operators read medical profiles via visits" ON public.medical_profiles;
```
