# SCC-033: Emergency Status Transitions Surface Contract Guard Hardening (2026-03-05)

## Objective
Add canonical app/console type visibility for the `emergency_status_transitions` append-only audit table and enforce deterministic prevention of direct mutation surfaces.

## Scope
- App type contract: `types/database.ts`
- Console type contract: `../ivisit-console/frontend/src/types/database.ts`
- New guard: `supabase/tests/scripts/assert_emergency_status_transitions_surface_field_guard.js`
- Hardening command: `hardening:emergency-status-transitions-surface-field-guard`
- Testing docs / plan / tracker updates

## Implemented Changes
1. Added canonical `emergency_status_transitions` table blocks to app and console type contracts:
   - `Row`/`Insert`/`Update` fields,
   - relationships for:
     - `emergency_status_transitions_emergency_request_id_fkey`
     - `emergency_status_transitions_actor_user_id_fkey`.
2. Added deterministic surface guard:
   - validates app/console type parity (`Row`/`Insert`/`Update`),
   - enforces canonical required row fields for transition audit data,
   - forbids direct `.insert/.update/.delete/.upsert` against this append-only table across app/console source surfaces,
   - validates select-column safety for direct table selects.

## Verification
- `node supabase/tests/scripts/export_table_flow_trace.js --table emergency_status_transitions` PASS (2026-03-05)
- `npm run hardening:emergency-status-transitions-surface-field-guard` PASS (2026-03-05)
- `npm run build` in `../ivisit-console/frontend` PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Evidence Artifacts
- `supabase/tests/validation/table_flow_trace_emergency_status_transitions.json`
- `supabase/tests/validation/table_flow_trace_emergency_status_transitions.md`
- `supabase/tests/validation/emergency_status_transitions_surface_field_guard_report.json`
- `supabase/tests/validation/cross_repo_contract_matrix_report.json`

## Variance
No scope variance.

