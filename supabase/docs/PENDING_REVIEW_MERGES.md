# Historical Branch Review

These branches contain changes that were already applied to the shared database
before their pillar commits reached `main`. This file preserves that history and
records the 2026-07-13 consolidation review.

## Current Decision

Do not merge the three July fix branches into the current dirty `main` worktree.
Their exact behavior is already absorbed in the App-owned pillar files, and the
current shared-contract pack adds stronger follow-up protections. Review and
commit the consolidated pillar worktree instead, then apply only the still-new
SQL through the approved linked-project workflow.

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
this behavior.

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

The stronger in-body scope and `PUBLIC` revokes are new source work and still
require reviewed linked-project application.

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

---

## Deployment Boundary

Absorbed source is not proof that every new statement is live. The dated pillar
versions are already recorded by Supabase, so they will not replay automatically.
After the consolidated App source is committed, use the maintained rollback
contracts and approved deployment workflow, then verify role, organization,
concurrency, ACL, and reflected-read behavior before claiming live parity.
