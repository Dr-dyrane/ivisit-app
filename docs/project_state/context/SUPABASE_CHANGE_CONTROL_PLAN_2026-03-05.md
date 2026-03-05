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
