# iVisit Workflow Maps

This folder contains distributed workflow maps by domain. The goal is to make backend flow visible without a single monolithic doc.

## Domain Maps

- [auth/workflow_map.md](./auth/workflow_map.md): Authentication and registration execution path.
- [emergency/workflow_map.md](./emergency/workflow_map.md): Deterministic emergency lifecycle from request to completion.
- [emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md](./emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md): Stack-screen contract for `welcome -> map -> stack` surfaces.
- [emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md](./emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md): Profile stack implementation plan and ownership split.
- [../audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md): Post-pass checkpoint for the profile stack refactor.
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
