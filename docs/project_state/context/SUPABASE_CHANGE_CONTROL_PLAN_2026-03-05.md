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

### SCC-022: Payments Surface Field Guard + UI Contract Reconciliation
Objective:
- Eliminate JS/JSX field drift in console wallet/payment surfaces where payments are fetched correctly but rendered with non-schema fields (for example, ledger-only `description` and legacy `payment_method_id` fallback).

Deliverables:
- deterministic payments surface guard:
  - `supabase/tests/scripts/assert_payments_surface_field_guard.js`
  - validation artifact:
    - `supabase/tests/validation/payments_surface_field_guard_report.json`
- hardening command:
  - `hardening:payments-surface-field-guard`
- payments UI contract patches in console:
  - `src/components/pages/WalletManagementPage.jsx`
  - `src/components/mobile/MobileWallet.jsx`
  - `src/components/modals/EmergencyDetailsModal.jsx`
  - remove non-schema payment field rendering in payment contexts,
  - keep ledger description rendering only in ledger contexts,
  - remove legacy non-schema fee fallback usage in emergency payment card.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table payments` green,
- `npm run hardening:payments-surface-field-guard` green,
- `npm run build` green in `ivisit-console/frontend`,
- `npm run hardening:console-ui-crud-matrix` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-023: Cash Approval Platform-Fee Deduction Hardening
Objective:
- Ensure cash emergency approval always deducts the iVisit platform fee from organization wallet balance when approval succeeds, including when legacy/default fee fields could mask the true fee value.

Deliverables:
- cash-approval contract hardening in canonical migrations:
  - `supabase/migrations/20260219000800_emergency_logic.sql`
  - `supabase/migrations/20260219010000_core_rpcs.sql`
  - ensure `create_emergency_v4` persists `ivisit_fee_amount` explicitly,
  - ensure `approve_cash_payment` resolves fee robustly:
    - `NULLIF(ivisit_fee_amount, 0)` guard,
    - metadata fallback (`fee_amount` and legacy `fee`),
    - organization fee-percentage fallback formula,
  - persist resolved fee back to `payments.ivisit_fee_amount` + metadata keys on approval.
- deterministic contract guard:
  - `supabase/tests/scripts/assert_cash_fee_deduction_contract.js`
  - artifact:
    - `supabase/tests/validation/cash_fee_deduction_contract_guard_report.json`
- npm hardening command:
  - `hardening:cash-fee-contract-guard`

Verification:
- `npm run hardening:cash-fee-contract-guard` green,
- `npm run hardening:finance-rpc-contract-guard` green,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-024: Runtime Data Integrity Audit + Deterministic Repair Lane
Objective:
- Add a mandatory live-data quality lane to catch and repair ghost slips that static contract checks cannot detect:
  - missing cash fee ledger movements,
  - pending-approval/payment coherence drift,
  - linked visit display-field gaps.

Deliverables:
- runtime integrity audit script:
  - `supabase/tests/scripts/assert_runtime_data_integrity.js`
  - artifact:
    - `supabase/tests/validation/runtime_data_integrity_report.json`
  - command:
    - `hardening:runtime-data-integrity`
- deterministic repair script:
  - `supabase/tests/scripts/repair_runtime_data_integrity.js`
  - artifact:
    - `supabase/tests/validation/runtime_data_integrity_repair_report.json`
  - command:
    - `hardening:runtime-data-repair`
    - supports dry-run and `--apply`.
- docs + tracker evidence updates proving:
  - issue detection,
  - repair execution,
  - post-repair green audit.

Verification:
- `npm run hardening:runtime-data-integrity` (initial detect) recorded,
- `npm run hardening:runtime-data-repair -- --apply` green,
- `npm run hardening:runtime-data-integrity` green post-repair,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-025: Hospitals Table Surface Contract Hardening (App + Console + Admin RPC)
Objective:
- Close `hospitals` table drift discovered in SCC table-flow review where UI/services referenced non-schema import/google columns and admin update RPC dropped canonical edits (`type`, `total_beds`, `place_id`).

Deliverables:
- app hospitals import hardening:
  - `services/hospitalImportService.js`
  - remove writes/filters against non-schema hospitals columns (`google_*`, `import_status`, `imported_from_google`, `last_google_sync`),
  - map provider onboarding state to canonical columns (`verification_status`, `verified`, `status`, `place_id`, base profile fields).
- console hospitals import/UI hardening:
  - `../ivisit-console/frontend/src/services/hospitalImportService.js`
  - `../ivisit-console/frontend/src/components/modals/HospitalModal.jsx`
  - `../ivisit-console/frontend/src/components/pages/HospitalsPage.jsx`
  - `../ivisit-console/frontend/src/components/views/HospitalListView.jsx`
  - `../ivisit-console/frontend/src/components/views/HospitalTableView.jsx`
  - replace legacy `import_status` dependencies with canonical `verification_status`,
  - remove non-schema `google_photos` image fallbacks in hospitals surfaces,
  - stop persisting non-schema `reserved_beds` from modal state.
- console hospitals CRUD payload hardening:
  - `../ivisit-console/frontend/src/services/hospitalsService.js`
  - canonicalize create/update payloads and persist `total_beds` + `place_id`.
- admin RPC hardening:
  - `supabase/migrations/20260219010000_core_rpcs.sql`
  - `update_hospital_by_admin` must persist `type`, `place_id`, and `total_beds`.
- deterministic guard:
  - `supabase/tests/scripts/assert_hospitals_surface_field_guard.js`
  - artifact:
    - `supabase/tests/validation/hospitals_surface_field_guard_report.json`
  - npm command:
    - `hardening:hospitals-surface-field-guard`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table hospitals` green,
- `npm run hardening:hospitals-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-026: Organizations Table Surface Contract Hardening (Console Types + CRUD Payload)
Objective:
- Close `organizations` table surface drift by aligning console type contracts and organizations CRUD payload sanitation with canonical schema (including `display_id` presence in type contract and strict numeric fee persistence).

Deliverables:
- console organizations service hardening:
  - `../ivisit-console/frontend/src/services/organizationsService.js`
  - add deterministic payload builder/sanitizer:
    - trim nullable text fields,
    - sanitize `ivisit_fee_percentage` as numeric,
    - prune undefined keys before insert/update.
- console organizations type contract reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - ensure canonical `organizations` contract includes `display_id` in:
    - `Row`
    - `Insert`
    - `Update`.
- deterministic organizations surface guard:
  - `supabase/tests/scripts/assert_organizations_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/organizations_surface_field_guard_report.json`
  - npm command:
    - `hardening:organizations-surface-field-guard`.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table organizations` green,
- `npm run hardening:organizations-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-027: Profiles Table Surface Contract Hardening (Type Parity + Guard Lane)
Objective:
- Lock `profiles` table contract parity between app and console type surfaces and add a deterministic guard lane to prevent future `display_id`-class type drift in high-traffic profile flows.

Deliverables:
- console profile type contract reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - ensure canonical `profiles.Update` includes:
    - `display_id?: string | null`
  - keep `profiles` row/insert/update parity aligned with app canonical type contract for audited fields.
- deterministic profiles surface guard:
  - `supabase/tests/scripts/assert_profiles_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/profiles_surface_field_guard_report.json`
  - npm command:
    - `hardening:profiles-surface-field-guard`.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table profiles` green,
- `npm run hardening:profiles-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-028: Organization Wallets Surface Contract Hardening (Type Parity + Query Field Guard)
Objective:
- Lock `organization_wallets` contract parity and enforce deterministic query-field safety in console wallet surfaces so reads only use canonical wallet fields and type drift (including FK relationship cardinality flags) is blocked.

Deliverables:
- console organization-wallet type parity fix:
  - `../ivisit-console/frontend/src/types/database.ts`
  - align `organization_wallets` relationship metadata with app canonical contract:
    - `organization_wallets_organization_id_fkey` -> `isOneToOne: true`.
- deterministic organization-wallets guard:
  - `supabase/tests/scripts/assert_organization_wallets_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/organization_wallets_surface_field_guard_report.json`
  - command:
    - `hardening:organization-wallets-surface-field-guard`
  - enforce:
    - app/console `organization_wallets` Row/Insert/Update field parity,
    - console `organization_wallets` relationship cardinality parity for `organization_wallets_organization_id_fkey`,
    - console `organization_wallets` select clauses use only canonical columns (or `*`) in wallet surfaces.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table organization_wallets` green,
- `npm run hardening:organization-wallets-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-029: Patient Wallets Surface Contract Guard Hardening (Preventive Parity Lock)
Objective:
- Add a deterministic preventive guard lane for `patient_wallets` to lock app/console type parity and enforce canonical column safety for any future patient-wallet query surfaces.

Deliverables:
- deterministic patient-wallets guard:
  - `supabase/tests/scripts/assert_patient_wallets_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/patient_wallets_surface_field_guard_report.json`
  - command:
    - `hardening:patient-wallets-surface-field-guard`
  - enforce:
    - app/console `patient_wallets` `Row`/`Insert`/`Update` parity,
    - relationship cardinality parity for `patient_wallets_user_id_fkey`,
    - canonical select-column safety for any console `.from('patient_wallets')` query paths.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table patient_wallets` green,
- `npm run hardening:patient-wallets-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-030: Payment Methods Surface Contract Guard Hardening (Preventive Control Lane)
Objective:
- Add a deterministic preventive guard lane for `payment_methods` so app/console type parity stays locked, query columns remain canonical, and console bypass mutations do not drift around edge-function control paths.

Deliverables:
- deterministic payment-methods guard:
  - `supabase/tests/scripts/assert_payment_methods_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/payment_methods_surface_field_guard_report.json`
  - command:
    - `hardening:payment-methods-surface-field-guard`
  - enforce:
    - app/console `payment_methods` `Row`/`Insert`/`Update` parity,
    - relationship-cardinality parity for:
      - `payment_methods_organization_id_fkey`
      - `payment_methods_user_id_fkey`,
    - canonical select-column safety for any console `.from('payment_methods').select(...)`,
    - no direct console `.insert/.update/.delete/.upsert` against `payment_methods` (edge-function lane only).
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table payment_methods` green,
- `npm run hardening:payment-methods-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-031: Wallet Ledger Surface Contract Guard Hardening (Preventive Control Lane)
Objective:
- Add a deterministic preventive guard lane for `wallet_ledger` so app/console type parity and query-column safety remain locked while console ledger writes stay constrained to approved insert-only repair paths.

Deliverables:
- deterministic wallet-ledger guard:
  - `supabase/tests/scripts/assert_wallet_ledger_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/wallet_ledger_surface_field_guard_report.json`
  - command:
    - `hardening:wallet-ledger-surface-field-guard`
  - enforce:
    - app/console `wallet_ledger` `Row`/`Insert`/`Update` parity,
    - canonical select-column safety for any console `.from('wallet_ledger').select(...)`,
    - forbid direct console `.update/.delete/.upsert` against `wallet_ledger`,
    - constrain direct console `.insert(...)` against `wallet_ledger` to approved wallet service paths only.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table wallet_ledger` green,
- `npm run hardening:wallet-ledger-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-032: Ambulances Surface Contract Guard Hardening (Type + Service Parity Lane)
Objective:
- Lock `ambulances` contract parity between app and console to canonical logistics schema fields, and prevent non-schema ambulance field drift at service/mapping boundaries.

Deliverables:
- app ambulances type parity update:
  - `types/database.ts`
  - ensure canonical `ambulances` fields include:
    - `crew`, `current_call`, `display_id`, `eta`, `license_plate`.
- console ambulances type parity reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - align `ambulances.Row/Insert/Update` with app canonical contract and remove non-schema fields:
    - `currency`, `driver_id`, `hospital`, `last_maintenance`, `rating`
  - ensure canonical FK relationship parity includes:
    - `ambulances_profile_id_fkey`.
- app ambulance mapper hardening:
  - `services/ambulanceService.js`
  - map canonical ambulance columns only and block non-schema row reads.
- deterministic ambulances surface guard:
  - `supabase/tests/scripts/assert_ambulances_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/ambulances_surface_field_guard_report.json`
  - command:
    - `hardening:ambulances-surface-field-guard`.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table ambulances` green,
- `npm run hardening:ambulances-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-033: Emergency Status Transitions Surface Contract Guard Hardening (Append-Only Audit Lane)
Objective:
- Add canonical app/console type contract visibility for `emergency_status_transitions` and enforce a deterministic guard that blocks direct mutation surfaces for this append-only audit table.

Deliverables:
- app + console type contract parity:
  - `types/database.ts`
  - `../ivisit-console/frontend/src/types/database.ts`
  - add canonical `emergency_status_transitions` `Row`/`Insert`/`Update` contract blocks and relationships:
    - `emergency_status_transitions_emergency_request_id_fkey`
    - `emergency_status_transitions_actor_user_id_fkey`.
- deterministic emergency-status-transitions guard:
  - `supabase/tests/scripts/assert_emergency_status_transitions_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/emergency_status_transitions_surface_field_guard_report.json`
  - command:
    - `hardening:emergency-status-transitions-surface-field-guard`
  - enforce:
    - app/console type parity for `Row`/`Insert`/`Update`,
    - canonical required row fields,
    - no direct `.insert/.update/.delete/.upsert` usage against `emergency_status_transitions` in app/console source surfaces.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table emergency_status_transitions` green,
- `npm run hardening:emergency-status-transitions-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-034: Insurance Policies/Billing Surface Contract Guard Hardening (Type + Coverage Lane)
Objective:
- Eliminate insurance contract drift by locking `insurance_policies` + `insurance_billing` app/console type parity and enforcing canonical insurance policy write surfaces (including `coverage_percentage` + `status` coverage).

Deliverables:
- console insurance type reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - add missing `insurance_billing` contract block,
  - align `insurance_policies` to canonical columns/relationships:
    - include `coverage_percentage`, `status`, `linked_payment_method` (string contract),
    - remove legacy top-level policy card fields from schema contract.
- insurance service surface hardening:
  - `services/insuranceService.js` (app)
  - `../ivisit-console/frontend/src/services/insuranceService.js`
  - canonicalize insert/update payload construction through one builder boundary,
  - preserve legacy UI aliases through `coverage_details` normalization only,
  - prevent legacy top-level column writes.
- console insurance policies service normalization fix:
  - `../ivisit-console/frontend/src/services/insurancePoliciesService.js`
  - ensure `getUserInsurancePolicies` returns normalized policy rows.
- deterministic insurance surface guard:
  - `supabase/tests/scripts/assert_insurance_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/insurance_surface_field_guard_report.json`
  - npm command:
    - `hardening:insurance-surface-field-guard`.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table insurance_policies` green,
- `node supabase/tests/scripts/export_table_flow_trace.js --table insurance_billing` green,
- `npm run hardening:insurance-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-035: Pricing Surface Contract Guard Hardening (Service + Room Pricing Lane)
Objective:
- Eliminate pricing type drift and lock canonical write lanes for `service_pricing` + `room_pricing` across app/console surfaces.

Deliverables:
- console pricing type reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - align `service_pricing` + `room_pricing` to canonical schema fields/relationships:
    - remove non-schema drift (`currency`, `is_active`),
    - restore FK relationships to `hospitals`.
- deterministic pricing surface guard:
  - `supabase/tests/scripts/assert_pricing_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/pricing_surface_field_guard_report.json`
  - npm command:
    - `hardening:pricing-surface-field-guard`
  - enforce:
    - app/console type parity for `service_pricing` + `room_pricing`,
    - canonical pricing required fields,
    - console pricing service uses RPC mutation lanes (`upsert_*` / `delete_*`) only,
    - no pricing payload writes for non-schema fields (`currency`, `is_active`).
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table service_pricing` green,
- `node supabase/tests/scripts/export_table_flow_trace.js --table room_pricing` green,
- `npm run hardening:pricing-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-036: Medical Profiles Surface Contract Guard Hardening (Patient Safety Data Lane)
Objective:
- Eliminate `medical_profiles` type/service drift by locking app/console contract parity and ensuring profile updates use canonical payloads with missing-row safety.

Deliverables:
- console medical profile type reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - restore canonical `medical_profiles_user_id_fkey` relationship parity.
- medical profile service hardening:
  - `services/medicalProfileService.js` (app)
  - `../ivisit-console/frontend/src/services/medicalProfilesService.js`
  - enforce explicit whitelist payload builder for profile writes,
  - normalize profile text/array inputs,
  - app update path uses upsert keyed on `user_id` for row bootstrap safety.
- deterministic medical profile surface guard:
  - `supabase/tests/scripts/assert_medical_profiles_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/medical_profiles_surface_field_guard_report.json`
  - npm command:
    - `hardening:medical-profiles-surface-field-guard`.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table medical_profiles` green,
- `npm run hardening:medical-profiles-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
- app cleanup guard green (`npm run hardening:cleanup-dry-run-guard`),
- app cross-repo contract guard green (`npm run hardening:contract-drift-guard`).

### SCC-037: Doctors Surface Contract Guard Hardening (Provider Discovery + Scheduling Lane)
Objective:
- Eliminate `doctors` type/search surface drift by reconciling console type contract parity and enforcing canonical doctor-search field usage.

Deliverables:
- console doctors type reconciliation:
  - `../ivisit-console/frontend/src/types/database.ts`
  - align `Row`/`Insert`/`Update` fields with app canonical `doctors`,
  - restore `doctors_profile_id_fkey`,
  - remove non-canonical `available_hospitals` relationship drift.
- console doctor search surface hardening:
  - `../ivisit-console/frontend/src/services/searchService.js`
  - use canonical doctor fields (`specialization`, `department`, `image`),
  - resolve hospital label via relation join (`hospitals:hospital_id`),
  - remove legacy/non-schema doctor fields (`specialty`, `avatar_url`).
- deterministic doctors surface guard:
  - `supabase/tests/scripts/assert_doctors_surface_field_guard.js`
  - report:
    - `supabase/tests/validation/doctors_surface_field_guard_report.json`
  - npm command:
    - `hardening:doctors-surface-field-guard`.
- testing docs update:
  - `supabase/docs/TESTING.md`.

Verification:
- `node supabase/tests/scripts/export_table_flow_trace.js --table doctors` green,
- `npm run hardening:doctors-surface-field-guard` green,
- `npm run build` green in `../ivisit-console/frontend`,
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
