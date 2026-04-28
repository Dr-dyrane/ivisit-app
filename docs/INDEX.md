# iVisit Documentation Index

Last Updated: 2026-04-27

## Quick Rules Reference

| Rule Type | Source | Authority |
|-----------|--------|-----------|
| **System Rules** | [`rules.json`](./rules.json) | **Tiebreaker** — HIG compliance, product doctrine |
| **Blueprint** | [`MASTER_BLUEPRINT.md`](./MASTER_BLUEPRINT.md) | Locked — Product vision |
| **Sprint State** | [`SPONSOR_SPRINT.md`](./SPONSOR_SPRINT.md) | Mutable — Current priorities |
| **Code Standards** | [`.agent/workflows/code-standards.md`](../.agent/workflows/code-standards.md) | Development patterns |
| **Doc Model** | [`README.md`](./README.md) | Folder roles, routing rules |

### **File Size Compliance**

| Type | Target | Max | Violation |
|------|--------|-----|-----------|
| Routes | 20-100 | 150 | >800 = refactor, >1000 = violation |
| Screens | 250-400 | 500 | |
| Components | 80-250 | 350 | |
| Hooks | 80-200 | 300 | |

**See [README.md > Architecture Compliance](./README.md#architecture-compliance-rules) for full table.**

---

## Folder Structure

```text
docs/
  INDEX.md              <- this file
  README.md             <- docs portal + folder roles
  MASTER_BLUEPRINT.md   <- locked product doctrine
  SPONSOR_SPRINT.md     <- active sprint state
  REFACTORING_GUARDRAILS.md
  rules.json            <- tiebreaker system rules

  architecture/
    ARCHITECTURE_README.md
    EMERGENCY_STATE_REFACTOR.md
    GOLD_STANDARD_STATE_ROADMAP.md
    MAP_EXPLORE_FLOW_MODULARIZATION.md
    METRO_ROUTING_FIXES.md
    REFACTORING_BIBLE.md
    STASH_AUDIT.md
    STORES_README.md
    TRACKING_SHEET_LEARNINGS.md
    ZERO_COST_MAPBOX_MIGRATION.md
    overview/
      ARCHITECTURE.md
    roadmap/
      PRODUCT_EXECUTION_ROADMAP.md
      IMPLEMENTATION_ROADMAP.md

  audit/
    AUDIT_CHECKLIST.md
    ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md
    BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md
    CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md
    EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md
    EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md
    EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md
    FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md
    FINAL_MIGRATION_SUMMARY.md
    LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md
    MAP_ARCHITECTURE_PASS_PLAN_2026-04-25.md
    PERFORMANCE_STABILITY_MODULARIZATION.md
    PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md
    REAUDIT_2026-04-25.md
    RISK_STATUS_2026-04-23.md
    TEMPORAL_DEAD_ZONE_FIXES.md
    TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md
    UNIFIED_MODULARIZATION_PASS_PLAN.md
    VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md
    ivisit_full_system_reconstruction_report_2026-03-02.md
    (+ JSON schema/rpc artifacts from 2026-03-02)

  archive/
    historical/
      COMMIT_DETAILS_CONTROLLER_REFACTOR_PLAN.md
      DOCS_README.md
      EMERGENCY_UX_PROGRESS_LOG_*.md
      ORCHESTRATOR_REFACTOR_ARCHIVE_NOTICE_2026-04-25.md
      PAYMENT_CONTROLLER_REFACTOR_PLAN.md
      ROOT_README.md
    legacy_specs/

  console/
  deployment/
  design/
  flows/
    README.md
    auth/
    emergency/
    payment/
  onboarding/
  product_design/
  project_state/
  research/
```

---

## Primary Navigation

- **Docs entry**: [README.md](./README.md)
- **Product blueprint**: [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
- **Sprint state**: [SPONSOR_SPRINT.md](./SPONSOR_SPRINT.md)
- **Workflow map hub**: [flows/README.md](./flows/README.md)

### Flows
- Welcome + intake: [flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md](./flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md)
- Emergency doctrine: [flows/emergency/MASTER_REFERENCE_FLOW_V1.md](./flows/emergency/MASTER_REFERENCE_FLOW_V1.md)
- `/map` current state: [flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md](./flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md)
- Map sheet notes: [flows/emergency/architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./flows/emergency/architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)

### Architecture
- **Gold standard state roadmap**: [architecture/GOLD_STANDARD_STATE_ROADMAP.md](./architecture/GOLD_STANDARD_STATE_ROADMAP.md)
- **Tracking sheet learnings**: [architecture/TRACKING_SHEET_LEARNINGS.md](./architecture/TRACKING_SHEET_LEARNINGS.md)
- Emergency state refactor: [architecture/EMERGENCY_STATE_REFACTOR.md](./architecture/EMERGENCY_STATE_REFACTOR.md)
- Map explore flow modularization: [architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md](./architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md)
- Refactoring bible: [architecture/REFACTORING_BIBLE.md](./architecture/REFACTORING_BIBLE.md)
- Stores inventory: [architecture/STORES_README.md](./architecture/STORES_README.md)
- Metro/platform fixes: [architecture/METRO_ROUTING_FIXES.md](./architecture/METRO_ROUTING_FIXES.md)
- Mapbox migration: [architecture/ZERO_COST_MAPBOX_MIGRATION.md](./architecture/ZERO_COST_MAPBOX_MIGRATION.md)
- System overview: [architecture/overview/ARCHITECTURE.md](./architecture/overview/ARCHITECTURE.md)

### Design / Product
- Android glass standard: [product_design/ANDROID_GLASS_PATTERN.md](./product_design/ANDROID_GLASS_PATTERN.md)
- Marketing strategy: [product_design/marketing/STRATEGY.md](./product_design/marketing/STRATEGY.md)
- Ad manuscript: [product_design/marketing/MANUSCRIPT.md](./product_design/marketing/MANUSCRIPT.md)

---

## Audit Register

### Active (2026-04-27)
| Doc | Status |
|-----|--------|
| [VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md](./audit/VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md) | ✅ All passes complete (VD-A–G) |
| [TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md](./audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md) | ✅ All passes complete (A–G) |
| [PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md](./audit/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md) | ✅ Reference |
| [RISK_STATUS_2026-04-23.md](./audit/RISK_STATUS_2026-04-23.md) | R1–R10 tracker |
| [TEMPORAL_DEAD_ZONE_FIXES.md](./audit/TEMPORAL_DEAD_ZONE_FIXES.md) | |
| [AUDIT_CHECKLIST.md](./audit/AUDIT_CHECKLIST.md) | |

### Orchestrator Refactor (2026-04-25)
- **START HERE**: [audit/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md](./audit/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md)
- [audit/BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md](./audit/BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md)
- [audit/FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md](./audit/FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md)
- [audit/FINAL_MIGRATION_SUMMARY.md](./audit/FINAL_MIGRATION_SUMMARY.md)
- [audit/MAP_ARCHITECTURE_PASS_PLAN_2026-04-25.md](./audit/MAP_ARCHITECTURE_PASS_PLAN_2026-04-25.md)
- [audit/REAUDIT_2026-04-25.md](./audit/REAUDIT_2026-04-25.md)
- [audit/UNIFIED_MODULARIZATION_PASS_PLAN.md](./audit/UNIFIED_MODULARIZATION_PASS_PLAN.md)
- [audit/PERFORMANCE_STABILITY_MODULARIZATION.md](./audit/PERFORMANCE_STABILITY_MODULARIZATION.md)
- **Results**: 42 files changed, -6,990 lines net; MapScreen 1,153 → 535 lines (-54%)

### Emergency Flow (2026-04-24)
- [audit/EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md](./audit/EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md)
- [audit/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md](./audit/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md)
- [audit/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md](./audit/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md)
- [audit/LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md](./audit/LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md)

### Historical Artifacts
- [audit/ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md](./audit/ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md)
- [audit/ivisit_full_system_reconstruction_report_2026-03-02.md](./audit/ivisit_full_system_reconstruction_report_2026-03-02.md)
- JSON artifacts: `flow_dependency_graph`, `rpc_dependency_graph`, `ui_db_parity_matrix`, `live_schema_inventory`, etc.
- [archive/historical/](./archive/historical/) — superseded checkpoints and refactor notices

---

## Workflow Maps

- Auth: [flows/auth/workflow_map.md](./flows/auth/workflow_map.md)
- Emergency: [flows/emergency/workflow_map.md](./flows/emergency/workflow_map.md)
- Payment: [flows/payment/workflow_map.md](./flows/payment/workflow_map.md)

---

## Supabase Source of Truth

All schema, RPC, and migration conventions live under `supabase/docs/`.

- [../supabase/docs/REFERENCE.md](../supabase/docs/REFERENCE.md)
- [../supabase/docs/API_REFERENCE.md](../supabase/docs/API_REFERENCE.md)
- [../supabase/docs/SCHEMA_SNAPSHOT.md](../supabase/docs/SCHEMA_SNAPSHOT.md)
- [../supabase/docs/CONTRIBUTING.md](../supabase/docs/CONTRIBUTING.md)
- [../supabase/docs/TESTING.md](../supabase/docs/TESTING.md)

---

## Active Change Control

- [project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md](./project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md)
- [project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md](./project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md)
- [project_state/context/SCC-001_EMERGENCY_REQUESTS_CONTRACT_AUDIT_2026-03-05.md](./project_state/context/SCC-001_EMERGENCY_REQUESTS_CONTRACT_AUDIT_2026-03-05.md)
- [project_state/context/SCC-025_HOSPITALS_SURFACE_CONTRACT_HARDENING_2026-03-05.md](./project_state/context/SCC-025_HOSPITALS_SURFACE_CONTRACT_HARDENING_2026-03-05.md)

---

## Documentation Maintenance Rules

### Update Order of Operations

1. **Runtime paths change** → Update workflow/flow maps FIRST
2. **Deep implementation details** → Keep in dedicated docs
3. **Source of truth** → One location only; link elsewhere

### INDEX.md Sync Checklist

When adding a new document:

- [ ] Add to correct folder in **Folder Structure**
- [ ] Add to **Primary Navigation** if user-facing
- [ ] Add to **Workflow Maps** if flow-related
- [ ] Add to **Audit Register** if audit/checkpoint
- [ ] Add to **Active Change Control** if SCC item
- [ ] Move to `archive/historical/` + mark as archived if superseded

### Archival Requirements

- Move superseded docs to `docs/archive/<historical|legacy_specs>/`
- Include archival notice with link to replacement
- Preserve for audit trails
