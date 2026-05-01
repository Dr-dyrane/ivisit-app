# iVisit Documentation Index

Last Updated: 2026-04-29

## Quick Rules Reference

| Rule Type          | Source                                                                        | Authority                                         |
| ------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| **System Rules**   | [`rules.json`](./rules.json)                                                  | **Tiebreaker** — HIG compliance, product doctrine |
| **Blueprint**      | [`MASTER_BLUEPRINT.md`](./MASTER_BLUEPRINT.md)                                | Locked — Product vision                           |
| **Sprint State**   | [`SPONSOR_SPRINT.md`](./SPONSOR_SPRINT.md)                                    | Mutable — Current priorities                      |
| **Code Standards** | [`.agent/workflows/code-standards.md`](../.agent/workflows/code-standards.md) | Development patterns                              |
| **Doc Model**      | [`README.md`](./README.md)                                                    | Folder roles, routing rules                       |

### **File Size Compliance**

| Type       | Target  | Max | Violation                          |
| ---------- | ------- | --- | ---------------------------------- |
| Routes     | 20-100  | 150 | >800 = refactor, >1000 = violation |
| Screens    | 250-400 | 500 |                                    |
| Components | 80-250  | 350 |                                    |
| Hooks      | 80-200  | 300 |                                    |

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
    EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md
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
    BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md
    BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md
    HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md
    HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md
    INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md
    MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md
    MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md
    MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md
    MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md
    MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md
    NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md
    NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md
    PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md
    SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md
    SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
    VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md
    VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md
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
- Map route-state hardening checkpoint: [audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md](./audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md)
- Map route-state completion plan: [flows/emergency/architecture/MAP_ROUTE_STATE_PASS_PLAN_V1.md](./flows/emergency/architecture/MAP_ROUTE_STATE_PASS_PLAN_V1.md)
- Map route-state implementation checkpoint: [audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Visits state audit: [audit/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](./audit/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md)
- Visits state plan: [flows/emergency/architecture/VISITS_STATE_PASS_PLAN_V1.md](./flows/emergency/architecture/VISITS_STATE_PASS_PLAN_V1.md)
- Visits state implementation checkpoint: [audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Medical profile state audit: [audit/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](./audit/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md)
- Medical profile state plan: [flows/emergency/architecture/MEDICAL_PROFILE_STATE_PASS_PLAN_V1.md](./flows/emergency/architecture/MEDICAL_PROFILE_STATE_PASS_PLAN_V1.md)
- Medical profile state implementation checkpoint: [audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Stack guardrail reconciliation checkpoint: [audit/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md](./audit/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md)
- Stack surface contract: [flows/emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md](./flows/emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md)
- Profile implementation plan: [flows/emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md)
- Profile implementation checkpoint: [audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Settings implementation plan: [flows/emergency/architecture/SETTINGS_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/SETTINGS_STACK_PASS_PLAN_V1.md)
- Settings comparison audit: [audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md)
- Settings implementation checkpoint: [audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Medical profile implementation plan: [flows/emergency/architecture/MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md)
- Medical profile comparison audit: [audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md)
- Medical profile implementation checkpoint: [audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Coverage implementation plan: [flows/emergency/architecture/INSURANCE_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/INSURANCE_STACK_PASS_PLAN_V1.md)
- Coverage comparison audit: [audit/INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md)
- Coverage implementation checkpoint: [audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Search implementation plan: [flows/emergency/architecture/SEARCH_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/SEARCH_STACK_PASS_PLAN_V1.md)
- Search comparison audit: [audit/SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md)
- Search implementation checkpoint: [audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Notifications implementation plan: [flows/emergency/architecture/NOTIFICATIONS_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/NOTIFICATIONS_STACK_PASS_PLAN_V1.md)
- Notifications comparison audit: [audit/NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md)
- Notifications implementation checkpoint: [audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Notification details implementation plan: [flows/emergency/architecture/NOTIFICATION_DETAILS_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/NOTIFICATION_DETAILS_STACK_PASS_PLAN_V1.md)
- Notification details comparison audit: [audit/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md)
- Book Visit implementation plan: [flows/emergency/architecture/BOOK_VISIT_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/BOOK_VISIT_STACK_PASS_PLAN_V1.md)
- Book Visit comparison audit: [audit/BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md)
- Book Visit implementation checkpoint: [audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Help Support implementation plan: [flows/emergency/architecture/HELP_SUPPORT_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/HELP_SUPPORT_STACK_PASS_PLAN_V1.md)
- Help Support comparison audit: [audit/HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md)
- Help Support implementation checkpoint: [audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)

### Architecture

- **Gold standard state roadmap**: [architecture/GOLD_STANDARD_STATE_ROADMAP.md](./architecture/GOLD_STANDARD_STATE_ROADMAP.md)
- **Emergency contacts five-layer contract**: [architecture/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md](./architecture/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md)
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

| Doc                                                                                                                                    | Status                                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md](./audit/VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md)                                               | ✅ All passes complete (VD-A–G)                      |
| [TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md](./audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md)                                           | ✅ All passes complete (A–G)                         |
| [EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md](./audit/EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md)                                   | Pre-pass five-layer baseline                         |
| [MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md](./audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md)                       | Shared route-state hardening and loop-fix pass       |
| [MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](./audit/MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md)                           | Route-state follow-on audit for full five-layer      |
| [MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)             | Route-state five-layer implementation checkpoint     |
| [VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](./audit/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md)                                 | Canonical visits-domain state audit                  |
| [VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)                   | Visits-domain five-layer implementation checkpoint   |
| [MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](./audit/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md)               | Medical-profile state-lane follow-on audit           |
| [MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) | Medical-profile five-layer implementation checkpoint |
| [STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md](./audit/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md)             | 48-hour stack and route guardrail reconciliation     |
| [BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md)                             | Book Visit vs modern stack baseline                  |
| [BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)           | Book Visit stack implementation checkpoint           |
| [HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md)                         | Help Support vs modern stack baseline                |
| [HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)       | Help Support stack implementation checkpoint         |
| [INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md)                               | Coverage vs modern stack baseline                    |
| [INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)             | Coverage stack implementation checkpoint             |
| [MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md)                   | Medical profile vs stack-screen baseline             |
| [MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) | Medical profile stack implementation checkpoint      |
| [NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md)         | Notification details vs modern stack baseline        |
| [NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md)                       | Notifications vs modern stack baseline               |
| [NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)     | Notifications stack implementation checkpoint        |
| [PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md)                                   | Profile vs payment/emergency-contacts baseline       |
| [PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)                 | Profile stack implementation checkpoint              |
| [SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md)                                     | Search vs modern stack baseline                      |
| [SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)                   | Search stack implementation checkpoint               |
| [SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md)                                 | Settings vs payment/emergency/profile baseline       |
| [SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)               | Settings stack implementation checkpoint             |
| [PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md](./audit/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md)                                   | ✅ Reference                                         |
| [RISK_STATUS_2026-04-23.md](./audit/RISK_STATUS_2026-04-23.md)                                                                         | R1–R10 tracker                                       |
| [TEMPORAL_DEAD_ZONE_FIXES.md](./audit/TEMPORAL_DEAD_ZONE_FIXES.md)                                                                     |                                                      |
| [AUDIT_CHECKLIST.md](./audit/AUDIT_CHECKLIST.md)                                                                                       |                                                      |

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
