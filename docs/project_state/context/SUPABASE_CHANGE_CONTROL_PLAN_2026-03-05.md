# Supabase Change Control Plan (2026-03-05)

## Purpose
Establish a strict, documented execution plan for database and service hardening so every change is:
- planned before implementation,
- traceable to a specific objective,
- verified with deterministic evidence,
- and compliant with Supabase contribution rules.

## Source Rules (Mandatory)
Derived from:
- `supabase/docs/CONTRIBUTING.md`
- `supabase/docs/TESTING.md`

Required operating rules:
1. Edit core pillar migration files only (no fix-migration sprawl).
2. Keep scope aligned to the 11-module pillar model.
3. Run validation before/after schema-impacting work.
4. Sync migration/doc/type changes to console (`node supabase/scripts/sync_to_console.js`).
5. Enforce zero side-effects before commit/push:
   - `npm run hardening:cleanup-dry-run-guard`
6. Enforce contract parity before commit/push:
   - `npm run hardening:contract-drift-guard`
7. Keep canonical shared service patterns aligned across app/console for ID resolution and Supabase helpers.

## Execution Model
Each work item follows:
1. Plan
2. Implement
3. Verify
4. Document evidence
5. Close

No item is "done" without verification artifact links in the tracker.

## Tracker Coupling
All items in this plan must exist in:
- `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

Status values:
- `planned`
- `in_progress`
- `implemented`
- `validated`
- `blocked`

## Initial Backlog (Start Point)

### SCC-001: `emergency_requests` Contract Audit
Objective:
- Audit every `emergency_requests` field used by app + console + RPCs + triggers.

Deliverables:
- field-level ownership map (writer, reader, authority),
- status/payment transition map,
- mismatch list and correction plan.

Verification:
- contract drift guard green,
- deterministic evidence in tracker.

### SCC-002: `emergency_requests` -> `visits` Synchronization Audit
Objective:
- Verify `visits` rows are populated and updated correctly from emergency lifecycle.

Deliverables:
- mapping of source fields to `visits`,
- trigger/RPC path authority list,
- identified "Unknown Facility"/status mismatch root causes.

Verification:
- reproducible scenario notes,
- tracker evidence links to code/migration updates and validation results.

### SCC-003: Console/App Emergency Status Action Safety
Objective:
- Ensure console actions cannot dispatch terminal requests and UI reflects actionable states in real time without refresh dependency.

Deliverables:
- action guard matrix,
- state transition authority map,
- remediation list (UI and/or RPC gate corrections).

Verification:
- transition matrix pass evidence,
- runtime scenario confirmation in tracker.

### SCC-004: Modular Schema Bible Baseline
Objective:
- Establish a canonical modular schema index linking owner pillars, runtime app/console service touchpoints, and RPC authority boundaries.

Deliverables:
- modular schema bible document in `supabase/docs`,
- baseline audit note in `docs/project_state/context`,
- duplicate RPC ownership watchlist and operational rules for future SCC slices.

Verification:
- contract drift guard green,
- cleanup guard green,
- evidence links in tracker.

### SCC-005: Logistics + Finance Contract Audit
Objective:
- Audit table contracts and mutation authority for `0003_logistics` and `0004_finance` against app/console runtime usage and current RPC wiring.

Deliverables:
- logistics/finance contract audit document with findings and severity,
- writer authority map (tables, RPCs, triggers),
- runtime touchpoint matrix (app and console service surfaces),
- remediation queue for follow-on SCC slices.

Verification:
- `npm run hardening:mutation-matrix` green,
- `npm run hardening:cash-matrix` green,
- `npm run hardening:cleanup-dry-run-guard` green,
- `npm run hardening:contract-drift-guard` green.

### SCC-006: Logistics/Finance Type-Contract Reconciliation
Objective:
- Reconcile app canonical type contracts for `emergency_requests`, `payments`, and wallet-adjacent finance tables with live schema and runtime service payloads.

Deliverables:
- updated canonical type definitions (`types/database.ts`) for targeted finance tables,
- core finance migration alignment where canonical table definitions lag live/runtime contract,
- SCC audit note documenting reconciled columns and remaining gaps.

Verification:
- `npm run hardening:cleanup-dry-run-guard` green,
- `npm run hardening:contract-drift-guard` green,
- `npm run hardening:cash-matrix` green.

### SCC-007: Console Logistics/Finance Type-Contract Reconciliation
Objective:
- Reconcile console-side canonical type contracts and schema helper maps for `emergency_requests`, `payments`, and wallet-adjacent finance tables to live schema.

Deliverables:
- updated console `src/types/database.ts` targeted table shapes,
- updated console `src/types/emergency.ts` model alignment,
- updated console schema helper maps (`databaseFields`, `schemaValidator`) removing stale fields.

Verification:
- console build green (`npm run build` in `ivisit-console/frontend`),
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-008: Console Emergency Row Normalization + Canonical Field Adoption
Objective:
- Normalize emergency request rows at console ingress and migrate high-traffic emergency UI/action surfaces to canonical field contracts while preserving compatibility aliases in one mapper boundary.

Deliverables:
- shared emergency row mapper utility with:
  - canonical status normalization,
  - payment method/status enrichment support from `payments`,
  - canonical alias fields for ETA/bed category display.
- emergency request fetch path enriched with latest payment lookup keyed by `payments.emergency_request_id`.
- emergency table/mobile/details/dispatch surfaces updated to canonical reads (`payment_method`, `eta_display`, `bed_category`) with mapper-level compatibility.

Verification:
- console build green (`npm run build` in `ivisit-console/frontend`),
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-009: Console Emergency/Payment Realtime Synchronization
Objective:
- Remove refresh dependency for approval/dispatch state by synchronizing emergency request rows and payment updates in realtime for both list/table and details modal surfaces.

Deliverables:
- emergency page realtime channel listens to both `emergency_requests` and `payments`,
- selected request snapshot auto-refreshes from normalized rows after each fetch,
- emergency details modal subscribes to request-scoped payment and emergency updates while open,
- live transitions refresh payment visibility and terminal visit outcome surface without manual reload.

Verification:
- console build green (`npm run build` in `ivisit-console/frontend`),
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-010: Live Schema Inventory Refresh + Coverage Guard
Objective:
- Refresh the live schema inventory artifact and enforce deterministic coverage checks for logistics/finance critical tables, including transition audit table visibility.

Deliverables:
- inventory refresh script that probes live table/column contracts and writes:
  - `docs/audit/live_schema_inventory_<YYYY-MM-DD>.json`
  - `docs/audit/live_schema_inventory_latest.json`
- inventory guard script that enforces:
  - inventory freshness window,
  - required logistics/finance table presence,
  - required `emergency_status_transitions` columns.
- npm hardening commands:
  - `hardening:inventory-refresh`
  - `hardening:inventory-guard`

Verification:
- `npm run hardening:inventory-refresh` green,
- `npm run hardening:inventory-guard` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-011: RPC Duplicate Authority Guard
Objective:
- Enforce canonical ownership for cross-module duplicate RPC signatures so wrapper-vs-domain authority drift is explicit and detected before merge.

Deliverables:
- deterministic RPC authority guard script that:
  - scans migration function signatures,
  - detects cross-file duplicate signatures,
  - validates each duplicate against an allowlisted canonical owner map,
  - detects same-file duplicate signatures and enforces explicit debt allowlist.
- machine-readable validation artifact in `supabase/tests/validation`.
- npm hardening command:
  - `hardening:rpc-authority-guard`

Verification:
- `npm run hardening:rpc-authority-guard` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-012: Hardening Pipeline Governance Integration
Objective:
- Make governance checks non-optional by integrating inventory and RPC authority guards into the canonical `hardening:full` pipeline at both pre-run and post-cleanup gates.

Deliverables:
- governance aggregate script:
  - `hardening:governance-guards` (`inventory-guard` + `rpc-authority-guard`)
- updated `hardening:full` command to run governance guards:
  - before contract/matrix suites,
  - after cleanup-apply and before final contract guard.

Verification:
- `npm run hardening:governance-guards` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-013: Targeted Emergency/Payments/Wallet Matrix Coverage Guard
Objective:
- Enforce deterministic coverage for `emergency_requests`, `payments`, and wallet-adjacent contracts by requiring both console CRUD matrix surfaces and runtime relationship assertions in one explicit guard lane.

Deliverables:
- targeted matrix coverage guard script:
  - validates required console UI CRUD surfaces for:
    - `emergency_requests`
    - `organization_wallets`
    - `wallet_ledger`
    - `payments`
    - `payment_methods`
  - validates required runtime relationship assertions and mirror counts for:
    - `emergency_requests`
    - `payments`
    - `organization_wallets`
    - `wallet_ledger`
    - `patient_wallets`
    - `ivisit_main_wallet`
  - writes machine-readable validation artifact in `supabase/tests/validation`.
- npm hardening command:
  - `hardening:targeted-matrix-guard`

Verification:
- `npm run hardening:targeted-matrix-guard` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-014: Finance RPC Legacy-Field Contract Hardening
Objective:
- Remove legacy finance RPC column assumptions (`emergency_requests.estimated_amount`, `payments.payment_method_id`) from canonical migration logic and enforce deterministic guard checks against regression.

Deliverables:
- migration hardening update for `retry_payment_with_different_method` in `0004_finance` to:
  - source amount from canonical `emergency_requests.total_cost`,
  - write canonical `payments.payment_method` and `payments.metadata`,
  - avoid legacy `payments.payment_method_id` insert usage.
- finance RPC contract guard script:
  - `supabase/tests/scripts/assert_finance_rpc_contract.js`
  - emits `supabase/tests/validation/finance_rpc_contract_guard_report.json`
- npm hardening command:
  - `hardening:finance-rpc-contract-guard`

Verification:
- `npm run hardening:finance-rpc-contract-guard` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-015: Automation Contract Hardening for Emergency->Visit Sync
Objective:
- Remove stale automation references to non-existent `emergency_requests` fields and harden `sync_emergency_to_visit` to keep visits lifecycle/facility fields aligned with emergency transitions (not only completion).

Deliverables:
- canonical migration update in `0009_automations`:
  - remove `NEW.estimated_arrival` references from ambulance automation paths,
  - expand `sync_emergency_to_visit` to map/update non-terminal statuses (`accepted`, `arrived`, `cancelled`) and lifecycle metadata.
- deterministic automation contract guard script:
  - `supabase/tests/scripts/assert_automation_contract.js`
  - emits `supabase/tests/validation/automation_contract_guard_report.json`
- npm hardening command:
  - `hardening:automation-contract-guard`

Verification:
- `npm run hardening:automation-contract-guard` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-016: Console Visits Presentation Normalization from Emergency Context
Objective:
- Eliminate `Unknown Facility` and stale `upcoming`/`General` visit render states when a visit is linked to an emergency request by deriving canonical display fields from emergency context in console list/table/mobile surfaces.

Deliverables:
- console visits data normalization update in:
  - `src/components/pages/VisitsPage.jsx`
  - enrich visits with linked `emergency_requests` + `hospitals` data for display fallback
  - map emergency status to visit display status where visit status is legacy/sparse
  - map type fallback from emergency service type where visit type missing
- console list/mobile render fallback updates:
  - `src/components/views/VisitListView.jsx`
  - `src/components/mobile/MobileVisits.jsx`
  - prefer `hospital_name` before generic fallback labels.

Verification:
- console build green (`npm run build` in `ivisit-console/frontend`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-017: Modal Domain Coverage Guard (Emergency/Visits/Wallet/Pricing + Core Entities)
Objective:
- Add deterministic guard coverage for modal/page/service CRUD domain wiring across high-touch linked surfaces:
  - emergency requests,
  - visits,
  - wallet/payments,
  - pricing,
  - users/profiles,
  - hospitals,
  - organizations.

Deliverables:
- modal domain guard script:
  - `supabase/tests/scripts/assert_modal_domain_coverage.js`
  - validates required surface IDs in console CRUD matrix report
  - enforces zero risk/unknown-column regressions for required domain surfaces
  - emits `supabase/tests/validation/modal_domain_coverage_report.json`
- npm hardening command:
  - `hardening:modal-domain-guard`

Verification:
- `npm run hardening:modal-domain-guard` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-018: Comprehensive Table Flow Trace (`emergency_requests` Baseline)
Objective:
- Produce a deterministic, line-level end-to-end trace for `emergency_requests` from schema contract through SQL authority surfaces and app/console UI/service touchpoints so CRUD regressions can be diagnosed before runtime failures.

Deliverables:
- table flow trace script:
  - `supabase/tests/scripts/export_table_flow_trace.js`
  - resolves table columns from canonical schema sources,
  - classifies SQL references (insert/update/delete/select, triggers, RPC/function bodies),
  - classifies app/console references at line level (inputs, table cells, display nodes, service queries/mutations, RPC calls),
  - emits machine-readable artifact:
    - `supabase/tests/validation/table_flow_trace_emergency_requests.json`
- npm hardening command:
  - `hardening:table-flow-trace`
- SCC evidence note documenting audit findings and follow-on queue for next table slice.

Verification:
- `npm run hardening:table-flow-trace` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-019: Emergency Runtime Confidence Gate
Objective:
- Enforce runtime-behavior confidence for the `emergency_requests` lifecycle so closure requires both contract parity and live-flow behavior validation (console actions + app/E2E flow assertions), reducing regression ripple risk.

Deliverables:
- runtime confidence assertion script:
  - `supabase/tests/scripts/assert_emergency_runtime_confidence.js`
  - validates `console_transition_matrix_report.json` and `e2e_flow_matrix_report.json`:
    - no failed console transition cases,
    - required emergency transition case coverage present and passing,
    - required E2E emergency scenarios present with all assertions true,
    - critical terminal-state checks (`completion`, `approval`, `transitionAudit`) pass.
  - emits machine-readable artifact:
    - `supabase/tests/validation/emergency_runtime_confidence_report.json`
- npm hardening commands:
  - `hardening:emergency-runtime-confidence-assert`
  - `hardening:emergency-runtime-confidence`
- integrate runtime assertion into `hardening:full` after E2E matrix execution.

Verification:
- `npm run hardening:emergency-runtime-confidence` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-020: Comprehensive Table Flow Trace (`visits` Baseline)
Objective:
- Apply the same deterministic trace + closure method used for `emergency_requests` to `visits`, including schema authority, app/console UI service paths, and modal/list/table/card parity visibility.

Deliverables:
- table flow trace artifacts for `visits`:
  - `supabase/tests/validation/table_flow_trace_visits.json`
  - `supabase/tests/validation/table_flow_trace_visits.md`
- SCC context audit note with:
  - high-signal mismatches,
  - direct patch plan,
  - closure criteria.
- deterministic stale-field guard for JS/JSX visits surfaces:
  - `supabase/tests/scripts/assert_visits_surface_field_guard.js`
  - validation artifact:
    - `supabase/tests/validation/visits_surface_field_guard_report.json`
- follow-up parity/runtime guards (if new gaps are found) documented under this SCC before moving to next table.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table visits` green,
- `npm run hardening:visits-surface-field-guard` green,
- `npm run hardening:console-ui-crud-matrix` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-021: Visits Runtime Confidence Gate
Objective:
- Enforce runtime confidence for `visits` lifecycle outcomes (creation/sync/completion) from live E2E matrix evidence so we do not rely on static schema/UI parity alone.

Deliverables:
- visits runtime assertion script:
  - `supabase/tests/scripts/assert_visits_runtime_confidence.js`
  - validates required visit outcomes in `e2e_flow_matrix_report.json`:
    - visit creation in emergency and bed flows,
    - completed visit terminal state after completion flow,
    - visit cost/status sync assertions.
  - emits:
    - `supabase/tests/validation/visits_runtime_confidence_report.json`
- npm hardening commands:
  - `hardening:visits-runtime-confidence-assert`
  - `hardening:visits-runtime-confidence`
- integrate visits runtime assert into `hardening:full` after E2E execution.

Verification:
- `npm run hardening:visits-runtime-confidence` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

## Required Validation Gate Per Item
At minimum, before closing an item:
1. `npm run hardening:cleanup-dry-run-guard`
2. `npm run hardening:contract-drift-guard`
3. relevant targeted matrix/test command(s) for the item

## Change Intake Rules
Any new work must be added to this plan first with:
- unique ID (`SCC-###`),
- objective,
- impacted pillars/files,
- expected verification command(s),
- explicit acceptance criteria.

If an implementation is done without a planned ID, it must be marked as an exception in the tracker.
