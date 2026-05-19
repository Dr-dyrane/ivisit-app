# SCC-054 Support FAQs Surface Contract Guard Hardening (2026-03-05)

## Objective
Close `support_faqs` app/generated/console type drift and add deterministic guard coverage so canonical FAQ field usage and mutation boundaries remain enforced.

## Scope
- app/generated type reconciliation:
  - `supabase/database.ts`
- console type/service reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - `../ivisit-console/frontend/src/services/supportFaqsService.js`
- guard lane:
  - `supabase/tests/scripts/assert_support_faqs_surface_field_guard.js`
  - `supabase/tests/validation/support_faqs_surface_field_guard_report.json`
- command/docs wiring:
  - `package.json`
  - `supabase/docs/TESTING.md`
- canonical data seeding/backfill:
  - `supabase/migrations/20260219000500_ops_content.sql`
  - `supabase/migrations/20260306000100_support_faqs_runtime_backfill.sql`
  - `supabase/seed.sql`
- governance docs:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
  - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Implemented Changes
1. Reconciled `support_faqs` type contracts in generated app+console surfaces:
   - aligned canonical UUID `id` type
   - aligned `created_at` nullability to canonical non-null shape.
2. Hardened console `supportFaqsService` payload handling:
   - added explicit writable-field allowlist (`question`, `answer`, `category`, `rank`)
   - normalized/trimmed string fields and rank
   - enforced required `question`/`answer` guards on create/update
   - blocked raw spread update drift by writing through payload builder
   - added empty update payload guard.
3. Added deterministic `support_faqs` guard enforcing:
   - app/generated/console `Row`/`Insert`/`Update` parity
   - approved console reference boundaries for direct `support_faqs` table usage
   - canonical select-column usage
   - mutation-boundary ownership and FAQ service payload-contract checks.
4. Wired npm command:
   - `hardening:support-faqs-surface-field-guard`
5. Added testing guide section for this guard lane.
6. Added canonical FAQ content backfill in core pillar migration (`0005_ops_content`) and mirrored the same FAQ catalog in `supabase/seed.sql` so fresh/local seed paths and runtime DB reads match app UI fallback copy.
7. Added forward runtime backfill migration (`20260306000100_support_faqs_runtime_backfill.sql`) so already-deployed environments receive canonical FAQ rows without reset/replay of historical migrations.

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table support_faqs` PASS (2026-03-06)
- `npm run hardening:table-field-runtime-coverage -- --table support_faqs` PASS (2026-03-06)
- `npm run hardening:support-faqs-surface-field-guard` PASS (2026-03-06)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-06)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-06)
- `npm run hardening:contract-drift-guard` PASS (2026-03-06)
- `npx supabase db push` applied:
  - `20260305000100_hospital_import_logs_restore.sql`
  - `20260306000100_support_faqs_runtime_backfill.sql` (2026-03-06)
- Post-push remote verification: `support_faqs_count=5` (2026-03-06)

## Outcome
`support_faqs` now has deterministic surface guard coverage and canonical app/generated/console contract parity with FAQ writes constrained to validated service payload lanes.
