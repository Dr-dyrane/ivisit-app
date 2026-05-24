---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-DB DB Migration Push + Docs Update

Status: Complete
Owner: Backend
Layer impact: Layer 1, Supabase remote + documentation

## Goal

Ensure all taxonomy schema changes and the `nearby_providers` RPC are applied to the live remote database, and that `MODULE_SCHEMA_BIBLE.md` and `SCHEMA_SNAPSHOT.md` reflect the new tables and columns.

## Files

- `supabase/migrations/20260219000200_org_structure.sql`
- `supabase/migrations/20260219010000_core_rpcs.sql`
- `supabase/docs/MODULE_SCHEMA_BIBLE.md`
- `supabase/docs/SCHEMA_SNAPSHOT.md`

## Guardrails

- Do not create a one-off fix migration.
- Because pillar migrations are already applied remotely, new SQL must be applied via the Supabase dashboard SQL editor.
- After applying, run `node supabase/scripts/sync_to_console.js` to keep console in sync.
- If a redundant standalone migration exists for taxonomy, delete it and repair remote history.

## Checklist

- Apply `provider_type` and `emergency_eligible` column SQL to live DB via dashboard.
- Apply `nearby_providers` RPC SQL to live DB via dashboard.
- Delete any redundant standalone taxonomy migration file.
- Repair remote migration history: `npx supabase migration repair --status reverted <version>`.
- Update `MODULE_SCHEMA_BIBLE.md` â€” add taxonomy columns to `hospitals` section.
- Update `MODULE_SCHEMA_BIBLE.md` â€” add `nearby_providers` to RPC section.
- Update `SCHEMA_SNAPSHOT.md` â€” add column entries.
- Run `node supabase/scripts/sync_to_console.js`.

## Acceptance

- Live DB has `provider_type` and `emergency_eligible` on `hospitals`.
- Live DB has `nearby_providers` RPC callable from the client.
- No redundant migration files in `supabase/migrations/`.
- `MODULE_SCHEMA_BIBLE.md` and `SCHEMA_SNAPSHOT.md` are accurate.
- Console is synced.

## Changed Files

- `supabase/migrations/20260219000200_org_structure.sql` (modified)
- `supabase/migrations/20260219010000_core_rpcs.sql` (modified)
- `supabase/docs/MODULE_SCHEMA_BIBLE.md` (modified)
- `supabase/docs/SCHEMA_SNAPSHOT.md` (modified)

## Verification

- `20260601000000_provider_taxonomy.sql` deleted; remote history repaired with `migration repair --status reverted`.
- Taxonomy columns confirmed in `org_structure` migration section 7.
- `nearby_providers` RPC confirmed in `core_rpcs` migration section 1.
- `npx supabase db push --dry-run` returns `Remote database is up to date` after dashboard apply.
- `node supabase/scripts/sync_to_console.js` ran successfully.
- MODULE_SCHEMA_BIBLE updated with taxonomy columns and RPC.

## Remote Caveat

Because `20260219000200_org_structure.sql` and `20260219010000_core_rpcs.sql` are already applied remotely, Supabase does not replay them automatically. New SQL was applied to the live database via the Supabase dashboard SQL editor.

## Rollback Notes

- Drop `provider_type` and `emergency_eligible` columns via dashboard.
- Drop `nearby_providers` RPC via dashboard.
- Emergency path is unaffected â€” `nearby_hospitals` RPC filter is independent.
