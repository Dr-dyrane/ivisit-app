# SCC-052 Health News Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `health_news` app/generated/console type drift and add deterministic guard coverage so canonical health-news field usage and mutation boundaries remain enforced.

## Scope
- app/generated type reconciliation:
  - `supabase/database.ts`
- console type/service reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - `../ivisit-console/frontend/src/services/healthNewsService.js`
- guard lane:
  - `supabase/tests/scripts/assert_health_news_surface_field_guard.js`
  - `supabase/tests/validation/health_news_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled `health_news` type contracts in generated app+console surfaces:
   - removed non-schema legacy fields (`icon`, `time`, `updated_at`)
   - restored canonical `image_url`
   - aligned `created_at` nullability to canonical non-null shape.
2. Hardened console `healthNewsService` payload handling:
   - retained canonical writable allowlist (`title`, `source`, `category`, `url`, `published`, `image_url`)
   - trimmed/sanitized incoming string fields
   - enforced required create fields (`title`, `source`)
   - blocked empty-string updates for required fields and guarded empty update payloads.
3. Added deterministic `health_news` guard enforcing:
   - app/generated/console `Row`/`Insert`/`Update` parity
   - approved console reference boundaries for direct `health_news` table usage
   - canonical select-column usage
   - mutation-boundary ownership and health-news service allowlist/required-field checks.
4. Wired npm command:
   - `hardening:health-news-surface-field-guard`
5. Added testing guide section for this guard lane.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table health_news` PASS (2026-03-05)
- `npm run hardening:table-field-runtime-coverage -- --table health_news` PASS (2026-03-05)
- `npm run hardening:health-news-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Outcome
`health_news` now has deterministic surface guard coverage and canonical app/generated/console contract parity with explicit mutation-boundary enforcement in the console health-news service lane.
