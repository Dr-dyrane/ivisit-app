---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# EXP-2 Edge Function â€” Category-Aware Places Fetch

Status: Complete
Owner: Backend
Layer impact: Layer 1, Supabase Edge Functions

## Goal

Extend the `discover-hospitals` edge function to support category-scoped provider discovery using Google Places and/or Mapbox, controlled by a `providerType` parameter.

## Files

- `supabase/functions/discover-hospitals/index.ts`

## Reference Files

- `services/hospitalsService.js` â€” client adapter that calls this function
- `constants/providerTypes.js` â€” `PROVIDER_TYPES` values sent as `providerType`

## Guardrails

- Do not break the existing `hospital` discovery path.
- `providerType = 'hospital'` must behave identically to the pre-existing call.
- Cost control: `includeGooglePlaces` defaults to `false`; `includeMapboxPlaces` defaults to `true`.
- Do not expose raw Google/Mapbox API keys in client responses.

## Behavior

When `providerType` is not `hospital`:
- Skip the Supabase `hospitals` table lookup.
- Run a Mapbox/Google Places search for the given category type near the coordinates.
- Return results in the same shape as hospital results (normalized to app schema).
- Apply `limit` and `radius` constraints.

## Checklist

- Accept `providerType` in the edge function request body.
- Branch on `providerType` to decide between Supabase lookup vs Places API.
- Normalize Places results to the same shape as hospital rows.
- Apply `limit` and `radius` to Places results.
- Return empty array (not error) when no results found.

## Acceptance

- Calling with `providerType = 'pharmacy'` returns nearby pharmacies.
- Calling with `providerType = 'hospital'` still returns hospital rows from Supabase (unchanged behavior).
- Results are in the same normalized shape for the client service.
- No API keys are exposed in responses.

## Changed Files

- `supabase/functions/discover-hospitals/index.ts` (modified)

## Verification

- Existing hospital discovery path unchanged.
- Category-aware Places fetch returns results for non-hospital types.
- Empty result case returns `[]` not an error.
- `limit` and `radius` constraints applied.

## Rollback Notes

- Revert `index.ts` to previous version.
- `hospitalsService.discoverNearbyProviders` will error for non-hospital types, but emergency path is unaffected.
