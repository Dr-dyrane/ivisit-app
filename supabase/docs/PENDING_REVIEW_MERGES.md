# Pending Review & Merge

Branches whose changes are **already applied live to the shared DB** but whose
canon commit is **not yet merged to `main`** — review and merge when ready.
Newest first.

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
