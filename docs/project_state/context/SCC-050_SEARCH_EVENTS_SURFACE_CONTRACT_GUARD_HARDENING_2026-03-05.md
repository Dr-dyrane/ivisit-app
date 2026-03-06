# SCC-050 Search Events Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `search_events` app/console type drift and add deterministic guard coverage so canonical event-field usage and mutation boundaries remain enforced for search analytics lanes.

## Scope
- app type reconciliation:
  - `supabase/database.ts`
- console type/service reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - `../ivisit-console/frontend/src/services/searchEventsService.js`
  - `../ivisit-console/frontend/src/services/searchService.js`
- guard lane:
  - `supabase/tests/scripts/assert_search_events_surface_field_guard.js`
  - `supabase/tests/validation/search_events_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled `search_events` type contracts in app+console:
   - aligned legacy `extra` field drift to canonical `metadata`
   - aligned `created_at` nullability to canonical non-null runtime contract.
2. Hardened console `searchEventsService` payload handling:
   - added explicit `SEARCH_EVENT_CREATE_FIELDS` allowlist
   - trimmed/defaulted canonical fields
   - kept `input.extra` compatibility only as fallback mapping into canonical `metadata`
   - enforced deterministic `created_at` stamping.
3. Hardened console `searchService` to use `SEARCH_EVENTS_TABLE` constant for `search_events` insert paths.
4. Added deterministic `search_events` guard enforcing:
   - app/console `Row`/`Insert`/`Update` parity
   - approved console reference boundaries for `search_events`
   - canonical select-column usage on `search_events` reads
   - mutation-boundary ownership in approved search services
   - service contract checks for allowlists/defaulting and canonical insert constant usage.
5. Wired npm command:
   - `hardening:search-events-surface-field-guard`
6. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table search_events` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table search_events` PASS (2026-03-05)
- `npm run hardening:search-events-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`search_events` now has deterministic surface guard coverage and canonical app/console contract parity with explicit mutation-boundary enforcement across approved search analytics services.
