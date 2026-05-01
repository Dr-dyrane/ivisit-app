# iVisit Workflow Maps

This folder contains distributed workflow maps by domain. The goal is to make backend flow visible without a single monolithic doc.

## Domain Maps

- [auth/workflow_map.md](./auth/workflow_map.md): Authentication and registration execution path.
- [emergency/workflow_map.md](./emergency/workflow_map.md): Deterministic emergency lifecycle from request to completion.
- [../audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md](../audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md): Shared map route-state hardening, directions dedupe, and loop-fix checkpoint.
- [emergency/architecture/MAP_ROUTE_STATE_PASS_PLAN_V1.md](./emergency/architecture/MAP_ROUTE_STATE_PASS_PLAN_V1.md): Architecture contract for the full five-layer shared map route state.
- [../audit/MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](../audit/MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md): Follow-on architecture audit for route state after dedupe hardening.
- [../audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the full five-layer route-state migration.
- [../audit/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md](../audit/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md): 48-hour guardrail reconciliation for recent stack-screen and route-state changes.
- [emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md](./emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md): Stack-screen contract for `welcome -> map -> stack` surfaces.
- [emergency/architecture/VISITS_STATE_PASS_PLAN_V1.md](./emergency/architecture/VISITS_STATE_PASS_PLAN_V1.md): Canonical visits-domain five-layer migration plan.
- [../audit/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](../audit/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md): Deep architecture audit for the visits-domain state lane.
- [../audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the visits-domain five-layer migration.
- [emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md](./emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md): Profile stack implementation plan and ownership split.
- [../audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the profile stack refactor.
- [emergency/architecture/SETTINGS_STACK_PASS_PLAN_V1.md](./emergency/architecture/SETTINGS_STACK_PASS_PLAN_V1.md): Settings stack implementation plan and ownership split.
- [../audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md](../audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md): Pre-pass comparison baseline for the settings stack refactor.
- [../audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the settings stack refactor.
- [emergency/architecture/MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md](./emergency/architecture/MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md): Medical profile stack implementation plan and ownership split.
- [../audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](../audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md): Pre-pass comparison baseline for the medical profile stack refactor.
- [../audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the medical profile stack refactor.
- [emergency/architecture/MEDICAL_PROFILE_STATE_PASS_PLAN_V1.md](./emergency/architecture/MEDICAL_PROFILE_STATE_PASS_PLAN_V1.md): Follow-on five-layer completion plan for medical profile state.
- [../audit/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](../audit/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md): Deep architecture audit for the medical-profile data lane.
- [../audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the medical-profile five-layer migration.
- [emergency/architecture/INSURANCE_STACK_PASS_PLAN_V1.md](./emergency/architecture/INSURANCE_STACK_PASS_PLAN_V1.md): Coverage stack implementation plan and ownership split.
- [../audit/INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md](../audit/INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md): Pre-pass comparison baseline for the coverage stack refactor.
- [../audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the coverage stack refactor.
- [emergency/architecture/SEARCH_STACK_PASS_PLAN_V1.md](./emergency/architecture/SEARCH_STACK_PASS_PLAN_V1.md): Search stack implementation plan and ownership split.
- [../audit/SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md](../audit/SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md): Pre-pass comparison baseline for the search stack refactor.
- [../audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the search stack refactor.
- [emergency/architecture/NOTIFICATIONS_STACK_PASS_PLAN_V1.md](./emergency/architecture/NOTIFICATIONS_STACK_PASS_PLAN_V1.md): Notifications stack implementation plan and ownership split.
- [../audit/NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md](../audit/NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md): Pre-pass comparison baseline for the notifications stack refactor.
- [../audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the notifications stack refactor.
- [emergency/architecture/NOTIFICATION_DETAILS_STACK_PASS_PLAN_V1.md](./emergency/architecture/NOTIFICATION_DETAILS_STACK_PASS_PLAN_V1.md): Notification-details stack implementation plan and ownership split.
- [../audit/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md](../audit/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md): Pre-pass comparison baseline for the notification-details stack refactor.
- [emergency/architecture/BOOK_VISIT_STACK_PASS_PLAN_V1.md](./emergency/architecture/BOOK_VISIT_STACK_PASS_PLAN_V1.md): Book Visit stack implementation plan and ownership split.
- [../audit/BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md](../audit/BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md): Pre-pass comparison baseline for the Book Visit stack refactor.
- [../audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the Book Visit stack refactor.
- [emergency/architecture/HELP_SUPPORT_STACK_PASS_PLAN_V1.md](./emergency/architecture/HELP_SUPPORT_STACK_PASS_PLAN_V1.md): Help Support stack implementation plan and ownership split.
- [../audit/HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md](../audit/HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md): Pre-pass comparison baseline for the Help Support stack refactor.
- [../audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the Help Support stack refactor.
- [payment/workflow_map.md](./payment/workflow_map.md): Payment and wallet flows, including cash approval path.

## Existing Deep Dives (Keep Using These)

- [auth/login.md](./auth/login.md)
- [auth/register.md](./auth/register.md)
- [emergency/MASTER_REFERENCE_FLOW_V1.md](./emergency/MASTER_REFERENCE_FLOW_V1.md)
- [emergency/ambulance_and_bed_booking.md](./emergency/ambulance_and_bed_booking.md)
- [payment/payment.md](./payment/payment.md)

## Supabase References

- [../../supabase/docs/REFERENCE.md](../../supabase/docs/REFERENCE.md)
- [../../supabase/docs/API_REFERENCE.md](../../supabase/docs/API_REFERENCE.md)
- [../../supabase/docs/SCHEMA_SNAPSHOT.md](../../supabase/docs/SCHEMA_SNAPSHOT.md)
- [../../supabase/docs/TESTING.md](../../supabase/docs/TESTING.md)

## System Audit Artifacts

- [../audit/ivisit_full_system_reconstruction_report_2026-03-02.md](../audit/ivisit_full_system_reconstruction_report_2026-03-02.md)
- [../audit/flow_dependency_graph_2026-03-02.json](../audit/flow_dependency_graph_2026-03-02.json)
- [../audit/rpc_dependency_graph_2026-03-02.json](../audit/rpc_dependency_graph_2026-03-02.json)
- [../audit/ui_db_parity_matrix_2026-03-02.json](../audit/ui_db_parity_matrix_2026-03-02.json)
