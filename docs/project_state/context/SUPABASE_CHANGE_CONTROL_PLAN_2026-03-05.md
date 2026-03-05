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
