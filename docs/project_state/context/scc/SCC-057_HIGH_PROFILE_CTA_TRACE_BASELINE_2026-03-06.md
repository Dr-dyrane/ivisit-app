# SCC-057: High-Profile UX CTA/Action Trace Baseline (2026-03-06)

## Objective
Create a deterministic, UX-first validation lane that verifies high-impact app/console CTAs from UI handlers through service logic to backend authority boundaries (RPC/trigger), with runtime confidence prerequisites.

## Scope
- Added a new high-profile CTA trace matrix script:
  - `supabase/tests/scripts/run_high_profile_cta_trace_matrix.js`
- Wired command:
  - `npm run hardening:high-profile-cta-trace`
- Documented command in:
  - `supabase/docs/TESTING.md`
- Registered SCC plan item in:
  - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`

## What The New Lane Validates
P0/P1 journeys:
1. `app_quick_emergency_dispatch`
2. `app_request_modal_submit`
3. `app_cash_approval_notification_lane`
4. `console_cash_approve_decline_actions`
5. `console_dispatch_actions`
6. `console_retry_payment_action`
7. `emergency_visit_sync_hydration`
8. `triage_parallel_capture_lane`
9. `rating_and_tip_completion_lane`

Per journey checks:
- UI wiring in app/console source
- flow/service wiring in app/console services/hooks
- canonical backend authority signature presence in `supabase/migrations/*.sql`

Runtime guard prerequisites (read from validation artifacts):
- `emergency_runtime_confidence_report.json`
- `visits_runtime_confidence_report.json`
- `modal_domain_coverage_report.json`
- `console_transition_matrix_report.json`
- `e2e_flow_matrix_report.json`

## Verification Evidence
- `npm run hardening:emergency-runtime-confidence` PASS (2026-03-06)
- `npm run hardening:visits-runtime-confidence` PASS (2026-03-06)
- `npm run hardening:modal-domain-guard` PASS (2026-03-06)
- `npm run hardening:high-profile-cta-trace` PASS (2026-03-06)
- `npm run hardening:cleanup-apply` executed (2026-03-06, removed runtime test side-effects)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-06)
- `npm run hardening:contract-drift-guard` PASS (2026-03-06)

Generated artifacts:
- `supabase/tests/validation/high_profile_cta_trace_report.json`
- `supabase/tests/validation/high_profile_cta_trace_report.md`

High-profile trace summary snapshot:
- Runtime guards: `5/5` passed
- High-profile traces: `9/9` passed
- App interaction handler inventory: `891`
- Console interaction handler inventory: `1184`

## Notes
- This lane is intentionally high-impact first (UX-critical journeys), not a full exhaustive CTA crawl of every low-risk button.
- Next expansion can layer table-by-table or page-by-page CTA traces onto the same script format without changing the governance pattern.
