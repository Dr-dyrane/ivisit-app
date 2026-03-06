# SCC-055: admin_audit_log + user_sessions + id_mappings Surface Contract Hardening (2026-03-06)

## Objective
Close remaining shared identity/admin table drift by hardening type parity and deterministic guard coverage for:
- `admin_audit_log`
- `user_sessions`
- `id_mappings`

## Implemented
1. Reconciled generated/shared type contracts:
- Added `admin_audit_log` table block to `supabase/database.ts` and console `src/types/database.ts`.
- Added `user_sessions` table block to `supabase/database.ts` and console `src/types/database.ts`.
- Normalized `id_mappings` nullability in generated + console contracts to match canonical app contract:
  - `created_at: string`
  - `entity_id: string`

2. Added reusable guard engine:
- `supabase/tests/scripts/assert_table_surface_field_guard_core.js`

3. Added SCC-specific guard scripts:
- `supabase/tests/scripts/assert_admin_audit_log_surface_field_guard.js`
- `supabase/tests/scripts/assert_user_sessions_surface_field_guard.js`
- `supabase/tests/scripts/assert_id_mappings_surface_field_guard.js`

4. Wired hardening commands:
- `hardening:admin-audit-log-surface-field-guard`
- `hardening:user-sessions-surface-field-guard`
- `hardening:id-mappings-surface-field-guard`

5. Documented command usage:
- `supabase/docs/TESTING.md`

## Verification
- `npm run hardening:admin-audit-log-surface-field-guard` PASS
- `npm run hardening:user-sessions-surface-field-guard` PASS
- `npm run hardening:id-mappings-surface-field-guard` PASS
- `node supabase/tests/scripts/export_table_flow_trace.js --table admin_audit_log` PASS
- `node supabase/tests/scripts/export_table_flow_trace.js --table user_sessions` PASS
- `node supabase/tests/scripts/export_table_flow_trace.js --table id_mappings` PASS
- `npm run hardening:table-field-runtime-coverage -- --table admin_audit_log` PASS
- `npm run hardening:table-field-runtime-coverage -- --table user_sessions` PASS
- `npm run hardening:table-field-runtime-coverage -- --table id_mappings` PASS
- `npm run build` (console frontend) PASS
- `npm run hardening:cleanup-dry-run-guard` PASS
- `npm run hardening:contract-drift-guard` PASS

## Artifacts
- `supabase/tests/validation/admin_audit_log_surface_field_guard_report.json`
- `supabase/tests/validation/user_sessions_surface_field_guard_report.json`
- `supabase/tests/validation/id_mappings_surface_field_guard_report.json`
- `supabase/tests/validation/table_flow_trace_admin_audit_log.json`
- `supabase/tests/validation/table_flow_trace_admin_audit_log.md`
- `supabase/tests/validation/table_flow_trace_user_sessions.json`
- `supabase/tests/validation/table_flow_trace_user_sessions.md`
- `supabase/tests/validation/table_flow_trace_id_mappings.json`
- `supabase/tests/validation/table_flow_trace_id_mappings.md`
- `supabase/tests/validation/table_field_runtime_coverage_admin_audit_log.json`
- `supabase/tests/validation/table_field_runtime_coverage_user_sessions.json`
- `supabase/tests/validation/table_field_runtime_coverage_id_mappings.json`
