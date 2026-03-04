# Hardening Closure Plan (2026-03-04)

## Scope
Close remaining ecosystem hardening work without schema churn, while keeping strict side-effect cleanup and contract parity gates.

## Checkpoint Status
- Payment approval lane docs updated to recovery-aware realtime truth-sync semantics.
- Runtime CRUD batch expanded for optional docs tables (`document_invites`, `access_requests`) with readback assertions and cleanup.
- CI cleanup workflow now auto-applies cleanup before zero-side-effect guard.
- Runtime CRUD parity report is green (`runtime_crud_relationship_batch_report.json`, 2026-03-04 11:17).
- Console transition matrix is green (`console_transition_matrix_report.json`, 32/32 passed, includes `RA4` and `DR7`).
- Contract drift guard is green (`cross_repo_contract_matrix_report.json`, missing tables/RPCs = 0).
- AI triage lane is now fully wired end-to-end (non-blocking captures at post-request + routing, persisted via `patient_snapshot.triage` merge path).

## Lane Status
1. Runtime CRUD sweep: **Complete**
2. Driver telemetry/map truth-sync continuity: **Complete**
3. Closed-loop reassignment automation validation: **Complete**
4. AI-assisted triage lane (non-blocking, post-request enrichment): **Complete**

## AI Triage Lane Plan (Non-Blocking)
### Guardrails
- Keep one-tap emergency request creation path unchanged (`create_emergency_v4` dispatch path must not wait on triage).
- Run triage capture as fire-and-forget after request create and again on routing activation.
- Persist triage into existing `emergency_requests.patient_snapshot.triage` (no schema churn).
- Triage output is advisory for hospital suitability and care-type recommendation; it must not block dispatch.

### Execution Steps
1. Add app triage service to derive:
   - severity band (`critical|urgent|moderate|low`)
   - care-type recommendation (`emergency_department|urgent_care|observation`)
   - hospital suitability ranking (top candidates + selected-hospital delta)
2. Trigger non-blocking triage snapshot at:
   - post-request create (while payment/approval path proceeds)
   - routing phase (while ambulance/bed flow is active)
3. Extend `patient_update_emergency_request` to accept `triage_snapshot` payload and merge to `patient_snapshot.triage`.
4. Keep UI optional for this checkpoint:
   - data can be auto-collected from request + profile + route context first
   - user check-in prompts can be added later without backend contract changes

### Exit Criteria
- Emergency request creation latency remains unchanged (no awaiting triage in critical path).
- `patient_snapshot.triage` is present for new requests after post-request capture.
- Routing stage triage refresh writes updated `stage` and timestamp.
- When recommendation differs from selected hospital, payload includes `recommendedDifferent=true` and top candidates.

## Task Verification Matrix
| Lane | Acceptance Criteria | Verification Commands | Evidence Artifact |
|---|---|---|---|
| Runtime CRUD parity | Insert/update/readback/cleanup for scoped tables; no orphan rows | `npm run hardening:runtime-crud-batch` then `npm run hardening:cleanup-dry-run-guard` | `supabase/tests/validation/runtime_crud_relationship_batch_report.json` |
| Payment realtime truth-sync | Approval wait path reflects canonical DB state after reconnect; no polling dependency | `npm run hardening:emergency` and `npm run hardening:cash-matrix` | `supabase/tests/validation/emergency_hardening_report.json` |
| Cross-repo contract parity | No table/column/RPC drift between app + console + schema docs | `npm run hardening:contract-drift-guard` | `supabase/tests/validation/cross_repo_contract_matrix_report.json` |
| Console CRUD integrity | Console mutation/read paths remain aligned with app consumers | `npm run hardening:console-ui-crud-matrix` | `supabase/tests/validation/console_ui_crud_contract_matrix_report.json` |
| Role/isolation guarantees | No unauthorized mutation paths; role matrix stable | `npm run hardening:console-matrix && npm run hardening:mutation-matrix && npm run hardening:cash-matrix` | matrix JSON reports under `supabase/tests/validation/` |
| AI triage (non-blocking) | Request create/dispatch path does not await triage; triage snapshots persist and refresh on routing | `npm run hardening:emergency` + targeted manual smoke (`RequestAmbulanceScreen`, `BookBedRequestScreen`) | `emergency_requests.patient_snapshot->'triage'` sample rows + app console logs |

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
