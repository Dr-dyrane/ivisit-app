# Hardening Closure Plan (2026-03-04)

## Scope
Close remaining ecosystem hardening work without schema churn, while keeping strict side-effect cleanup and contract parity gates.

## Checkpoint Status
- Payment approval lane docs updated to recovery-aware realtime truth-sync semantics.
- Runtime CRUD batch expanded for optional docs tables (`document_invites`, `access_requests`) with readback assertions and cleanup.
- CI cleanup workflow now auto-applies cleanup before zero-side-effect guard.

## Remaining Lanes
1. Non-critical CRUD sweep completion (remaining low-risk tables not referenced by emergency-critical flows).
2. Driver telemetry/map truth-sync continuity validation under assignment churn.
3. Closed-loop reassignment automation validation (doctor/driver unavailable mid-flow).
4. AI-assisted triage design lane (non-blocking, post-request enrichment).

## Task Verification Matrix
| Lane | Acceptance Criteria | Verification Commands | Evidence Artifact |
|---|---|---|---|
| Runtime CRUD parity | Insert/update/readback/cleanup for scoped tables; no orphan rows | `npm run hardening:runtime-crud-batch` then `npm run hardening:cleanup-dry-run-guard` | `supabase/tests/validation/runtime_crud_relationship_batch_report.json` |
| Payment realtime truth-sync | Approval wait path reflects canonical DB state after reconnect; no polling dependency | `npm run hardening:emergency` and `npm run hardening:cash-matrix` | `supabase/tests/validation/emergency_hardening_report.json` |
| Cross-repo contract parity | No table/column/RPC drift between app + console + schema docs | `npm run hardening:contract-drift-guard` | `supabase/tests/validation/cross_repo_contract_matrix_report.json` |
| Console CRUD integrity | Console mutation/read paths remain aligned with app consumers | `npm run hardening:console-ui-crud-matrix` | `supabase/tests/validation/console_ui_crud_contract_matrix_report.json` |
| Role/isolation guarantees | No unauthorized mutation paths; role matrix stable | `npm run hardening:console-matrix && npm run hardening:mutation-matrix && npm run hardening:cash-matrix` | matrix JSON reports under `supabase/tests/validation/` |

## Monitoring and Control
- Pre-push hard gate:
  - `npm run hardening:cleanup-dry-run-guard`
  - `npm run hardening:contract-drift-guard`
- Heavy-suite auto-clean policy:
  - `npm run hardening:full` now auto-runs cleanup apply before final guards.
- CI guardrail (`cleanup-side-effects-guard`):
  - Auto cleanup apply
  - Enforce zero side-effects
  - Enforce zero contract drift

## Operational Rules
- No new migration files for patch fixes; edit core pillar files only.
- Never push with non-zero cleanup dry-run planned counts.
- Treat matrix JSON outputs as release artifacts for checkpoint review.
