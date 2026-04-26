# iVisit Documentation Index

Last Updated: 2026-04-26

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
| Routes | 20–100 | 150 | >800 = refactor, >1000 = violation |
| Screens | 250–400 | 500 | |
| Components | 80–250 | 350 | |
| Hooks | 80–200 | 300 | |

**See [README.md > Architecture Compliance](./README.md#architecture-compliance-rules) for full table.**

---

## Folder Structure

```text
docs/
  INDEX.md
  README.md
  MASTER_BLUEPRINT.md

  flows/
    README.md
    auth/
      workflow_map.md
      login.md
      register.md
      REGISTRATION_UI_UX.md
      OAUTH_TROUBLESHOOTING.md
    emergency/
      workflow_map.md
      ambulance_and_bed_booking.md
    payment/
      workflow_map.md
      payment.md

  emergency/
    README.md
    checklists/
    refactor/
    ux/

  architecture/
    EMERGENCY_STATE_REFACTOR.md
    REFACTORING_BIBLE.md
    MAP_EXPLORE_FLOW_MODULARIZATION.md
    GOLD_STANDARD_STATE_ROADMAP.md
    overview/
      ARCHITECTURE.md
    roadmap/
      PRODUCT_EXECUTION_ROADMAP.md
      IMPLEMENTATION_ROADMAP.md

  platform/
    METRO_ROUTING_FIXES.md

  console/
  onboarding/
  product_design/
    marketing/
      STRATEGY.md
      MANUSCRIPT.md
  project_state/
  audit/
    LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md
    LAYOUT_SHELL_PASS_PLAN_2026-04-24.md
    RISK_STATUS_2026-04-23.md
    EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md
    EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md
    EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md
    MONOLITH_EXTRACTION_PASS_PLAN_2026-04-24.md
    MONOLITH_INVENTORY_2026-04-24.md
    MODULARIZATION_COMPLETE_SUMMARY_2026-04-24.md
    MODULARIZATION_SUMMARY_2026-04-24.md
    MODULARIZATION_FINAL_2026-04-24.md
    REAUDIT_2026-04-25.md
    UNIFIED_MODULARIZATION_PASS_PLAN.md
    PERFORMANCE_STABILITY_MODULARIZATION.md
    PASS_0_BASELINE_2026-04-24.md
    PASS_16_INTEGRATION_PROGRESS.md
    PASS_16_PACKAGE_INTEGRATION_PLAN.md
  archive/
```

## Primary Navigation

- Product blueprint: [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
- Welcome + intake flow map: [flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md](./flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md)
- Emergency flow doctrine: [flows/emergency/MASTER_REFERENCE_FLOW_V1.md](./flows/emergency/MASTER_REFERENCE_FLOW_V1.md)
- `/map` current state: [flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md](./flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md)
- Emergency state refactor: [architecture/EMERGENCY_STATE_REFACTOR.md](./architecture/EMERGENCY_STATE_REFACTOR.md)
- **Map explore flow modularization (2026-04-26):** [architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md](./architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md)
- **Gold standard state migration roadmap:** [architecture/GOLD_STANDARD_STATE_ROADMAP.md](./architecture/GOLD_STANDARD_STATE_ROADMAP.md)
- Metro routing fixes: [platform/METRO_ROUTING_FIXES.md](./platform/METRO_ROUTING_FIXES.md)
- _layout runtime audit: [audit/LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md](./audit/LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md)
- _layout pass plan: [audit/LAYOUT_SHELL_PASS_PLAN_2026-04-24.md](./audit/LAYOUT_SHELL_PASS_PLAN_2026-04-24.md)
  - ✅ Pass 0: Baseline
  - ✅ Pass 1: Remove double loading state
  - ✅ Pass 1B: Runtime orchestration extraction
  - ✅ Pass 2: RootNavigator decomposition
  - ✅ Pass 3: Auth redirect migration to route groups
  - ✅ Pass 4: Provider ownership alignment
  - ✅ Pass 5: Final cleanup (OTA modal extraction)
- _layout baseline (Pass 0): [audit/PASS_0_BASELINE_2026-04-24.md](./audit/PASS_0_BASELINE_2026-04-24.md)
- Archived screen dossiers (historical): [archive/legacy_specs/](./archive/legacy_specs/)
- Archived progress logs (historical): [archive/historical/](./archive/historical/)
- Map sheet implementation notes: [flows/emergency/architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./flows/emergency/architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)
- Docs entry: [README.md](./README.md)
- Workflow map hub: [flows/README.md](./flows/README.md)
- Android glass standard: [product_design/ANDROID_GLASS_PATTERN.md](./product_design/ANDROID_GLASS_PATTERN.md)
- Marketing strategy: [product_design/marketing/STRATEGY.md](./product_design/marketing/STRATEGY.md)
- Ad manuscript: [product_design/marketing/MANUSCRIPT.md](./product_design/marketing/MANUSCRIPT.md)

## Workflow Maps

- Auth: [flows/auth/workflow_map.md](./flows/auth/workflow_map.md)
- Emergency: [flows/emergency/workflow_map.md](./flows/emergency/workflow_map.md)
- Payment: [flows/payment/workflow_map.md](./flows/payment/workflow_map.md)

## Supabase Source of Truth

All schema, RPC, and migration conventions are under `supabase/docs/`.

- [../supabase/docs/REFERENCE.md](../supabase/docs/REFERENCE.md)
- [../supabase/docs/API_REFERENCE.md](../supabase/docs/API_REFERENCE.md)
- [../supabase/docs/SCHEMA_SNAPSHOT.md](../supabase/docs/SCHEMA_SNAPSHOT.md)
- [../supabase/docs/CONTRIBUTING.md](../supabase/docs/CONTRIBUTING.md)
- [../supabase/docs/TESTING.md](../supabase/docs/TESTING.md)

## Orchestrator Refactor (2026-04-25)

**Current State:** [audit/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md](./audit/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md) ← **START HERE**

### Master Documents
- **Current State:** [audit/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md](./audit/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md)
- **Validation Plan:** [audit/BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md](./audit/BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md)
- **MapScreen Summary:** [audit/FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md](./audit/FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md)

### Active Architecture
- **State Sync:** [audit/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md](./audit/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md)
- **Full Cycle:** [audit/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md](./audit/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md)

### Historical (Archived)
- [Archive Notice](./archive/historical/ORCHESTRATOR_REFACTOR_ARCHIVE_NOTICE_2026-04-25.md) - All pass checkpoints and superseded summaries

### Results
- **42 files changed**, **-6,990 lines net**
- MapScreen: 1,153 → 535 lines (**-54%**)
- EmergencyContext: 2,958 → ~1,200 lines (**-59%**)
- **23 hooks created** across architecture
- Three-layer architecture: TanStack Query + Zustand + Jotai

## Audit Artifacts

- [audit/ivisit_full_system_reconstruction_report_2026-03-02.md](./audit/ivisit_full_system_reconstruction_report_2026-03-02.md)
- [audit/flow_dependency_graph_2026-03-02.json](./audit/flow_dependency_graph_2026-03-02.json)
- [audit/rpc_dependency_graph_2026-03-02.json](./audit/rpc_dependency_graph_2026-03-02.json)
- [audit/ui_db_parity_matrix_2026-03-02.json](./audit/ui_db_parity_matrix_2026-03-02.json)

## Active Change Control

- [project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md](./project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md)
- [project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md](./project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md)
- [project_state/context/SCC-001_EMERGENCY_REQUESTS_CONTRACT_AUDIT_2026-03-05.md](./project_state/context/SCC-001_EMERGENCY_REQUESTS_CONTRACT_AUDIT_2026-03-05.md)
- [project_state/context/SCC-025_HOSPITALS_SURFACE_CONTRACT_HARDENING_2026-03-05.md](./project_state/context/SCC-025_HOSPITALS_SURFACE_CONTRACT_HARDENING_2026-03-05.md)

## Documentation Maintenance Rules

### **Update Order of Operations**

1. **Runtime paths change** → Update workflow/flow maps FIRST
2. **Deep implementation details** → Keep in dedicated docs
3. **Source of truth** → One location only; link elsewhere

### **INDEX.md Sync Checklist**

When adding a new document:

- [ ] Add to correct folder in **Folder Structure**
- [ ] Add to **Primary Navigation** if user-facing
- [ ] Add to **Workflow Maps** if flow-related
- [ ] Add to **Audit Artifacts** if audit/checkpoint
- [ ] Add to **Active Change Control** if SCC item
- [ ] Mark as **Historical** if superseded

### **Archival Requirements**

- Move superseded docs to `docs/archive/<historical|legacy_specs>/`
- Add `[ARCHIVED]` prefix to title in this INDEX
- Include archival notice with link to replacement
- Preserve for audit trails
