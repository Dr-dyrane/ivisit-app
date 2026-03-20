# iVisit Documentation Index

Last Updated: 2026-03-19

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
    overview/
      ARCHITECTURE.md
    roadmap/
      PRODUCT_EXECUTION_ROADMAP.md
      IMPLEMENTATION_ROADMAP.md

  console/
  onboarding/
  product_design/
    marketing/
      STRATEGY.md
      MANUSCRIPT.md
  project_state/
  audit/
  archive/
```

## Primary Navigation

- Product blueprint: [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
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

## Documentation Maintenance

- Update maps first when runtime path changes.
- Keep long deep-dive docs for implementation details.
- Avoid duplicate source-of-truth text across files.
