# Emergency Documentation

Last Updated: 2026-03-02
Status: Active

## What This Folder Contains

This folder is focused on emergency-specific docs (UX notes, checklists, and refactor plans).

- `checklists/`: validation and QA checklists.
- `ux/`: map and interaction UX notes.
- `refactor/`: emergency screen refactor planning.

## Workflow Map First

For runtime flow visibility (UI -> service -> RPC -> trigger -> realtime), start with:

- [../flows/emergency/workflow_map.md](../flows/emergency/workflow_map.md)

Then use the detailed scenario doc:

- [../flows/emergency/ambulance_and_bed_booking.md](../flows/emergency/ambulance_and_bed_booking.md)

## Supabase References

- [../../supabase/docs/REFERENCE.md](../../supabase/docs/REFERENCE.md)
- [../../supabase/docs/API_REFERENCE.md](../../supabase/docs/API_REFERENCE.md)
- [../../supabase/docs/SCHEMA_SNAPSHOT.md](../../supabase/docs/SCHEMA_SNAPSHOT.md)

## Related Artifacts

- [../audit/deterministic_emergency_state_model_2026-03-02.json](../audit/deterministic_emergency_state_model_2026-03-02.json)
- [../audit/flow_dependency_graph_2026-03-02.json](../audit/flow_dependency_graph_2026-03-02.json)
- [../audit/rpc_dependency_graph_2026-03-02.json](../audit/rpc_dependency_graph_2026-03-02.json)
