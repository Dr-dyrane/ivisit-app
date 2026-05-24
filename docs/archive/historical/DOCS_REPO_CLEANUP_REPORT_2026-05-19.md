---
status: historical
owner: -
last_updated: 2026-05-24
---

> **ARCHIVAL NOTICE â€” 2026-05-24:** This 2026-05-19 cleanup report is superseded by the current 2026-05-24 full-docs sweep:
> - Live tracker: [`docs/audit/DOCS_AUDIT_2026-05-24.md`](../../audit/DOCS_AUDIT_2026-05-24.md)
> - Reconciliation: [`docs/audit/RECONCILIATION_2026-05-24.md`](../../audit/RECONCILIATION_2026-05-24.md)
> - Verification log: [`docs/audit/VERIFICATION_LOG_2026-05-24.md`](../../audit/VERIFICATION_LOG_2026-05-24.md)
>
> This file is preserved for audit trail. The 2026-05-19 cleanup actions described below remain valid history; the 2026-05-24 sweep extended the cleanup further (console/, onboarding/, payment/, design/ folders archived/consolidated; DEMO_BOOTSTRAP audit relocated to `audit/demo/`).

---

# Docs Repo Cleanup Report

**Date:** 2026-05-19
**Scope:** `docs/` tree â€” iVisit app docs reorganization
**Goal:** Make the docs easier to navigate without deleting historical context.
**Primary source of current emergency-flow truth:** `docs/flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`

---

## Files Moved to Archive

All moves preserve git history. Archival notices were added to each moved file.

### Moved to `docs/archive/legacy_specs/`

| File (original location) | Reason |
|---|---|
| `docs/flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md` | Partially stale V1 implementation spec. Self-declares stale sections and defers to `MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`. No longer current. |
| `docs/flows/emergency/MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md` | Original V1 explore-intent audit. Superseded by the Explore Care dossier (`explore-care/EXPLORE_CARE_DOSSIER_V1.md`) and the EXP-pass series. |
| `docs/flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md` | Original sheet/map UI spec from 2026-04-21. Sheet-phase contracts are now owned by `MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` and `TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md`. |

### Moved to `docs/archive/historical/`

| File (original location) | Reason |
|---|---|
| `docs/flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md` | 98-section completed execution pass plan (98 KB). Passes described are done or superseded by Gold Standard roadmap. Kept for audit trail, removed from active architecture tree. |

---

## Files Left in Place â€” Marked Historical (Notice Added)

These files remain in their original folders but received a `> HISTORICAL NOTICE` block at the top pointing to current replacements.

| File | Reason left in place | Replacement pointer |
|---|---|---|
| `docs/flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md` | Still referenced by several docs; useful delta log for 2026-04-20/21 decisions. No longer working truth. | `EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`, `MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` |
| `docs/audit/emergency/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md` | Completed audit; issues addressed in tracking sheet passes Aâ€“G. Useful root-cause record. | `TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md` |
| `docs/audit/emergency/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md` | Completed audit; animation/state sync issues addressed in tracking passes. | `TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md` |
| `docs/audit/emergency/EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md` | Plan is complete â€” EmergencyContext.jsx fully retired (Phase 5, sub-passes 5aâ€“5f). | `GOLD_STANDARD_STATE_ROADMAP.md` |
| `docs/audit/planning/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md` | Refactor complete. 42 files changed, -6,990 lines. | `docs/audit/checkpoints/FINAL_MIGRATION_SUMMARY.md` |
| `docs/audit/planning/UNIFIED_MODULARIZATION_PASS_PLAN.md` | Pass plan complete. MapScreen passes 0â€“2 done. | `docs/audit/checkpoints/FINAL_MIGRATION_SUMMARY.md` |

---

## Current Recommended Reading Path â€” Emergency Flow Work

Read in this order for the full current picture:

1. **[docs/flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md](../flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md)**
   Working map of the live flow. Owns current suspicions and fix order. Start here.

2. **[docs/flows/emergency/MASTER_REFERENCE_FLOW_V1.md](../flows/emergency/MASTER_REFERENCE_FLOW_V1.md)**
   Locked product doctrine: map-first, state-driven emergency journey. Read for product intent.

3. **[docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)**
   Active implementation contract for `/(auth)/map`. Architecture, motion, file-organization rules.

4. **[docs/flows/emergency/DEMO_MODE_COVERAGE_FLOW.md](../flows/emergency/DEMO_MODE_COVERAGE_FLOW.md)**
   How demo/bootstrap coverage works and what it masks. Critical for understanding tracking regression.

5. **[docs/audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md](map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md)**
   Most recent tracking-state audit. Documents current defects and intended fixes.

6. **[docs/audit/map/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md](map/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md)**
   Full tracking sheet audit (passes Aâ€“G complete). Phase contracts, Apple HIG polish, defect classes.

### Supporting reads

- **[docs/architecture/state/GOLD_STANDARD_STATE_ROADMAP.md](../architecture/state/GOLD_STANDARD_STATE_ROADMAP.md)** â€” Five-layer architecture phases 1â€“7, completion record.
- **[docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md](../architecture/refactoring/TRACKING_SHEET_LEARNINGS.md)** â€” Defect classes 2.1â€“2.14, heuristics H1â€“H5, sweep targets.
- **[docs/audit/map/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md](map/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md)** â€” Pre-tracking gate requirements.

---

## Duplicates / Superseded Docs Found

### Confirmed superseded (moved or noticed above)

- `MAP_FLOW_IMPLEMENTATION_V1.md` â†’ moved to archive; replaced by `MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
- `MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md` â†’ moved to archive; replaced by Explore Care dossier + EXP passes
- `EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md` â†’ moved to archive; replaced by tracking audit + implementation rules
- `MAP_RUNTIME_PASS_PLAN_V1.md` â†’ moved to archive; replaced by Gold Standard roadmap
- `EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md` â†’ noticed in-place; EmergencyContext retired

### Overlapping but distinct â€” left in place

These pairs cover overlapping ground but contain distinct enough detail to keep:

| Pair | Distinction |
|---|---|
| `MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md` vs `TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md` | The 04-20 audit covers the full flow; the 04-26 audit is tracking-specific with passes Aâ€“G. Different scopes. |
| `PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md` vs `TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md` | The 04-27 audit is the pre-gate requirements baseline. The 05-19 pass is the current live investigation. |
| `EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md` vs `EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md` | Different angles of the same date â€” full cycle vs animation/state sync specifically. Both marked historical. |
| `IVISIT_SERVICE_FLOW_BASELINE_MATRIX_2026-05-19.md` vs `IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md` | Baseline matrix (raw data) vs simplification plan (design decisions). Complementary, not duplicate. |

### `ambulance_and_bed_booking.md`

- **Location:** `docs/flows/emergency/ambulance_and_bed_booking.md`
- **Status:** Needs senior review. Contains detailed bed-booking spec. Bed-booking may be partially active, partially deprecated. Not marked historical; left in place.

---

## Open Questions / Needs Senior Review

These docs were left untouched pending senior review:

| Doc | Risk / Question |
|---|---|
| `docs/flows/emergency/ambulance_and_bed_booking.md` | Is bed-booking still an active product path? If fully deprecated, this should move to `archive/legacy_specs/`. |
| `docs/flows/emergency/architecture/MAP_SHEET_PARITY_TASKLIST_V1.md` | Contains a large task checklist. Unknown completion status. Could be fully done or still tracking open items. |
| `docs/flows/emergency/architecture/MAP_FLOW_SURGICAL_AUDIT_V1.md` | Large surgical audit. Unknown whether it tracks open items or is a completed historical record. |
| `docs/flows/emergency/architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md` | Still referenced by `MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`. Likely still active but has not been reviewed. |
| `docs/flows/emergency/architecture/STACK_SCREENS_PASS_V1.md` | 32 KB pass doc. Unknown if complete. Check status before archiving. |
| `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md` | 87 KB â€” the largest single doc. Active change control or historical? |
| `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md` | 109 KB â€” the largest single doc. Active tracker or frozen? |
| `docs/project_state/context/` â€” SCC-001 through SCC-058 | 57 contract/hardening docs from 2026-03-05. Are any still tracking open items, or are they all closed? |
| `docs/audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md` | 30 KB audit plan from 05-11. Active or completed? |
| `docs/audit/map/LOCATION_SEARCH_UIUX_DEMO_DEEP_AUDIT_FINDINGS_2026-05-11.md` | 26 KB findings doc from 05-11. Active or historical? |
| `docs/architecture/refactoring/STASH_AUDIT.md` | 224-file stash categorization. May have pending items not yet absorbed. |
| `docs/architecture/refactoring/CHECKPOINT_PRE_PROVIDER_DETAIL.md` | Pre-checkpoint doc. May be superseded by subsequent passes. |

---

## What Was Not Touched

Per task constraints, the following were left strictly untouched:

- All application code (zero app files modified)
- All Supabase docs (`supabase/docs/`)
- All `docs/project_state/context/SCC-*` docs (pending senior review)
- All `docs/audit/inventory/` JSON artifacts (machine-generated)
- All `docs/flows/emergency/architecture/` sub-pass docs (EXP, LOC, contact-dispatch passes â€” active work in progress)
- All `docs/architecture/ux/passes/` (UX-A through UX-E â€” PLANNED/ACTIVE)
- All `docs/audit/demo/` passes (PLANNED â€” active work)
- `docs/MASTER_BLUEPRINT.md`, `docs/REFACTORING_GUARDRAILS.md`, `docs/SPONSOR_SPRINT.md`, `docs/rules.json`

---

## Summary

| Action | Count |
|---|---|
| Files moved to archive | 4 |
| Files marked historical in-place (notice added) | 6 |
| Files left fully untouched | ~200+ |
| Files needing senior review | 12 |
| Application code changed | 0 |
