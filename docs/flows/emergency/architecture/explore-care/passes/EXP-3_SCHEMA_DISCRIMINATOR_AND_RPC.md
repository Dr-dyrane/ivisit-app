> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-3 Schema — Discriminator Columns + nearby_providers RPC

Status: Complete
Owner: Backend
Layer impact: Layer 1, Supabase schema and RPCs

## Goal

Add `provider_type` and `emergency_eligible` discriminator columns to the `hospitals` table, and add a `nearby_providers` RPC for category-scoped explore queries.

## Files

- `supabase/migrations/20260219000200_org_structure.sql` — discriminator columns
- `supabase/migrations/20260219010000_core_rpcs.sql` — `nearby_providers` RPC
- `supabase/docs/MODULE_SCHEMA_BIBLE.md`
- `supabase/docs/SCHEMA_SNAPSHOT.md`

## Guardrails

- Do not create a one-off fix migration. Edit the correct pillar migration.
- `nearby_hospitals` RPC must retain its existing `emergency_eligible=true` filter.
- `nearby_providers` RPC must NOT include an emergency filter.
- All existing emergency flow tests must continue to pass.

## Schema Changes

Add to `public.hospitals`:
- `provider_type TEXT NOT NULL DEFAULT 'hospital' CHECK (provider_type IN ('hospital', 'pharmacy', 'lab', 'clinic', 'dentist', 'optometrist', 'specialist'))`
- `emergency_eligible BOOLEAN NOT NULL DEFAULT true`

## RPC Contract

### nearby_providers

Inputs:
- `p_lat FLOAT`
- `p_lng FLOAT`
- `p_provider_type TEXT`
- `p_radius_m INT DEFAULT 20000`
- `p_limit INT DEFAULT 15`

Returns providers within radius matching `provider_type`, ordered by distance. No emergency filter.

## Checklist

- Add `provider_type` column with CHECK constraint.
- Add `emergency_eligible` column with default `true`.
- Update `nearby_hospitals` RPC to filter `WHERE emergency_eligible = true`.
- Add `nearby_providers` RPC without emergency filter.
- Update schema docs.

## Acceptance

- `nearby_hospitals` returns only `emergency_eligible=true` providers.
- `nearby_providers` returns providers matching the given `provider_type`.
- No emergency-flow RPC behavior has changed.
- Schema docs reflect new columns and RPC.

## Changed Files

- `supabase/migrations/20260219000200_org_structure.sql` (modified)
- `supabase/migrations/20260219010000_core_rpcs.sql` (modified)
- `supabase/docs/MODULE_SCHEMA_BIBLE.md` (modified)
- `supabase/docs/SCHEMA_SNAPSHOT.md` (modified)

## Verification

- Discriminator columns added to `org_structure` migration section 7.
- `nearby_providers` RPC added to `core_rpcs` migration section 1.
- `nearby_hospitals` RPC emergency filter confirmed unchanged.
- Redundant standalone taxonomy migration deleted; remote history repaired.
- `node supabase/scripts/sync_to_console.js` ran successfully.

## Rollback Notes

- Remove `provider_type` and `emergency_eligible` columns.
- Remove `nearby_providers` RPC.
- Emergency path is unaffected — `nearby_hospitals` filter is independent.
