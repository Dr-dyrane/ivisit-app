# Historical Branch Review

These branches contain changes that were already applied to the shared database
before their pillar commits reached `main`. This file preserves that history and
records the 2026-07-13 consolidation review.

## Current Decision

The three July fix branches were reviewed, found absorbed or superseded, and
deleted locally on 2026-07-13. No matching remote branch remains. Their durable
behavior lives in the App-owned pillar files on `main`, together with the
stronger shared-contract protections verified for Console.

The separate `feature/book-visit-map-sheet-infusion` branch does not belong in
this shared Console contract pack. Its generated `types/database.ts` is identical
to `main`; only its Book Visit architecture and audit documents remain unique.

---

## `fix/hospital-array-coalesce`

- **Created:** 2026-07-08
- **Commit:** `35c8c969`
- **Historical live state:** applied and verified
- **2026-07-13 source decision:** absorbed; no standalone merge required
- **Pillar:** `supabase/migrations/20260219010000_core_rpcs.sql`

The current pillar contains the branch's key-aware extraction and
`COALESCE(v_*, existing)` updates. Omitted taxonomy arrays are preserved, while
an explicit `[]` still clears a field. The shared Console contract guard locks
this behavior. The historical branch was deleted after this equivalence was
confirmed.

---

## `fix/revoke-anon-org-financial-fns`

- **Created:** 2026-07-08
- **Commit:** `ed3ffb94`
- **Historical live state:** anonymous ACL removal applied and verified
- **2026-07-13 source decision:** superseded; no standalone merge required
- **Pillar:** `supabase/migrations/20260219010000_core_rpcs.sql`

The current pillar preserves the anonymous revokes and completes the branch's
documented follow-up. Both organization-finance helpers now revoke `PUBLIC` and
`anon`, grant only `authenticated` and `service_role`, and enforce platform-admin
or same-organization org-admin scope inside the SECURITY DEFINER body.

The stronger in-body scope and `PUBLIC` revokes were applied to the linked
project and passed the live role, organization-scope, and ACL catalog checks.
The historical branch was deleted after the stronger contract was verified.

---

## `fix/console-operator-select-rls`

- **Created:** 2026-07-08
- **Commit:** `270d1a4b`
- **Historical live state:** applied to project `dlwtcmhdzoklveihuhjf`
- **2026-07-13 source decision:** absorbed; no standalone merge required
- **Pillar:** `supabase/migrations/20260219000700_security.sql`

The current pillar contains both additive SELECT policies:

- `Console operators see org visits`
- `Org operators read medical profiles via visits`

Owner-read and write policies remain unchanged. The consolidated policy source
is synchronized to Console and covered by the shared-contract guard.
The historical branch was deleted after the live policies were verified.

---

## Deployment Evidence

The dated pillars were already recorded, so the new statements were deployed to
project `dlwtcmhdzoklveihuhjf` through a generated exact-source temporary
migration. The temporary version was then marked reverted and removed. Both
`supabase migration list` and `supabase db push --dry-run` now show only the
eleven canonical owner pillars and no pending migration.

Verification completed on 2026-07-13:

- static shared-contract guard: 16/16
- live shared-contract catalog guard: 16/16
- payment retry: cross-user denial, owner success, two-session concurrent reuse,
  one pending payment, one transition, reflected request state, and zero residue
- Console onboarding rollback contract and live E2E: passed with cleanup
- temporary Auth, database, and Storage records: removed

The deployment runner remains a maintained verifier and exact-source generator;
it does not leave a permanent fix migration in the repository.
