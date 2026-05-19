# SCC-018 Emergency Requests Table Flow Trace (2026-03-05)

## Objective
Produce a deterministic, line-level `emergency_requests` flow trace from canonical schema contract through:
- SQL authority paths (migrations/functions/triggers),
- app runtime service/hook/component references,
- console runtime service/page/modal/view references.

This gives one artifact that can be used to audit CRUD/UI parity before runtime failures.

## Implementation
1. Added/expanded script:
   - `supabase/tests/scripts/export_table_flow_trace.js`
2. Added npm command:
   - `hardening:table-flow-trace`
3. Added test-doc command reference:
   - `supabase/docs/TESTING.md`
4. Generated artifacts:
   - `supabase/tests/validation/table_flow_trace_emergency_requests.json`
   - `supabase/tests/validation/table_flow_trace_emergency_requests.md`

## Trace Summary (Emergency Requests)
From `table_flow_trace_emergency_requests.json`:
- columns discovered: 30
- files touched: 41
- total references: 2167
- references by repo:
  - db: 1014
  - app: 433
  - console: 720
- columns without observed usage: none

## High-Signal Findings
1. Console emergency surface uses a dynamic RPC-backed payload path; matrix parity now stays explicit via:
   - `EMERGENCY_REQUEST_WRITABLE_FIELDS` in console emergency service.
2. Prior per-surface mismatch is resolved:
   - `missing_required_create_columns`: none
   - `modal_db_fields_not_persisted`: none
   - `service_unknown_columns`: none
3. SQL + runtime trail is now available in one place for line-by-line drill-down (table name + matched columns + snippet + file/line).

## Verification
- `npm run hardening:table-flow-trace` PASS (2026-03-05)
- `npm run hardening:console-ui-crud-matrix` PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)

## Notes
- Column extraction source for this run resolved from canonical migrations (no live schema dump fallback file used).
- This SCC is tracing/audit hardening; it does not directly mutate runtime business logic in app or console.
