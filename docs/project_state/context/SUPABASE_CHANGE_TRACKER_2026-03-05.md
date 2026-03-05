# Supabase Change Tracker (2026-03-05)

## Scope
Tracks planned vs implemented vs validated work for the change-control plan:
- `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`

## Update Rules
1. Create/update an entry before implementation starts.
2. Keep "Planned Change" immutable once implementation begins (use "Variance" for deltas).
3. "Validated" requires command output or artifact reference.
4. No commit/push closure if cleanup/contract guards are not green.

## Status Legend
- `planned`: documented but not started
- `in_progress`: active implementation
- `implemented`: code/migration/doc changes applied
- `validated`: verification completed with evidence
- `blocked`: waiting on dependency or decision

## Change Log

| ID | Planned Change | Scope | Planned Verification | Implemented Change | Variance (Planned vs Actual) | Evidence | Status | Updated |
|---|---|---|---|---|---|---|---|---|
| SCC-001 | Audit `emergency_requests` field ownership and lifecycle authority across app/console/RPC/triggers. | `services/*`, `src/services/*`, `supabase/migrations/*`, emergency flows docs | `npm run hardening:contract-drift-guard` + targeted emergency matrix command(s) | Produced field/authority audit with DB writer map, app/console read map, and mismatch list. | Console source files are not present in this workspace; console evidence derived from audit artifacts (`static_supabase_usage` + `ui_db_parity_matrix`). | `docs/project_state/context/SCC-001_EMERGENCY_REQUESTS_CONTRACT_AUDIT_2026-03-05.md`; `supabase/migrations/20260219000300_logistics.sql`; `supabase/migrations/20260219000800_emergency_logic.sql`; `supabase/migrations/20260219000900_automations.sql`; `supabase/migrations/20260219010000_core_rpcs.sql`; `services/emergencyRequestsService.js`; `hooks/emergency/useRequestFlow.js`; `hooks/emergency/useEmergencyHandlers.js`; `services/visitsService.js`; `utils/domainNormalize.js`; `docs/audit/static_supabase_usage_2026-03-02.json`; `docs/audit/ui_db_parity_matrix_2026-03-02.json`; `npm run hardening:contract-drift-guard` PASS (2026-03-05); `npm run hardening:emergency` PASS (2026-03-05) | validated | 2026-03-05 |
| SCC-002 | Audit and correct `emergency_requests -> visits` mapping and sync behavior. | `supabase/migrations/*` (`0009_automations`, `0100_core_rpcs`), app/console visits services | contract drift guard + targeted lifecycle smoke/matrix evidence | Implemented request-aware visit mutation path in app service: resolve emergency request key -> visit row via `request_id`; mapped `hospital_name`/`doctor_name` consistently; blocked emergency-key fallback upserts; updated visit state replacement to match `id`/`requestId`/`displayId`; corrected stale trigger reference comment. | Planned scope included migrations and console services; this pass required no SQL or console code change because root causes were in app-layer key resolution + mapping. | `services/visitsService.js`; `hooks/visits/useVisitsData.js`; `hooks/emergency/useRequestFlow.js`; `npm run hardening:mutation-matrix` PASS (2026-03-05); `npm run hardening:emergency` PASS (2026-03-05); `npm run hardening:cleanup-apply` executed (2026-03-05); `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05); `npm run hardening:contract-drift-guard` PASS (2026-03-05) | validated | 2026-03-05 |
| SCC-003 | Harden console/app emergency action gating to prevent invalid terminal-state dispatch actions and stale UI action surfaces. | `src/components/pages/EmergencyRequestsPage.jsx`, `src/services/emergencyResponseService.js`, related app status consumers | transition matrix + contract drift guard | Added shared console action-state resolver (`frontend/src/utils/emergencyActions.js`) and wired page/list/table action rendering to canonical status gates; dispatch now pre-checks request state and auto-refreshes on stale terminal/approval errors. | Console UI source lives in sibling repo (`ivisit-console/frontend`), so implementation was applied there while DB/RPC verification remained in `ivisit-app` hardening suite. | `c:\\Users\\Dyrane\\Documents\\GitHub\\ivisit-console\\frontend\\src\\utils\\emergencyActions.js`; `c:\\Users\\Dyrane\\Documents\\GitHub\\ivisit-console\\frontend\\src\\components\\pages\\EmergencyRequestsPage.jsx`; `c:\\Users\\Dyrane\\Documents\\GitHub\\ivisit-console\\frontend\\src\\components\\views\\EmergencyRequestListView.jsx`; `c:\\Users\\Dyrane\\Documents\\GitHub\\ivisit-console\\frontend\\src\\components\\views\\EmergencyRequestTableView.jsx`; `npm run build` (console frontend) PASS (2026-03-05); `npm run hardening:console-matrix` PASS (2026-03-05); `npm run hardening:contract-drift-guard` PASS (2026-03-05); `npm run hardening:cleanup-apply` executed (2026-03-05); `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05) | validated | 2026-03-05 |

## Validation Gate Checklist (Per Closure)
- [ ] Cleanup guard passed (`npm run hardening:cleanup-dry-run-guard`)
- [ ] Contract drift guard passed (`npm run hardening:contract-drift-guard`)
- [ ] Item-specific validation command(s) passed
- [ ] Evidence links added
- [ ] Status moved to `validated`
