---
status: living
owner: product
last_updated: 2026-05-14
---

# Contact Dispatch Passes

This folder breaks Contact Dispatch into small implementation passes that can be updated independently.

Parent dossier:

- [Contact Dispatch Communication Room Dossier V1](../CONTACT_DISPATCH_COMMUNICATION_ROOM_DOSSIER_V1.md)

Pass order:

1. [CD-0 Final Architecture Review](./CD-0_FINAL_ARCHITECTURE_REVIEW.md)
2. [CD-1 Supabase Schema](./CD-1_SUPABASE_SCHEMA.md)
3. [CD-2 RLS And RPC](./CD-2_RLS_AND_RPC.md)
4. [CD-3 Service Adapter](./CD-3_SERVICE_ADAPTER.md)
5. [CD-4 Query And Realtime Hooks](./CD-4_QUERY_AND_REALTIME_HOOKS.md)
6. [CD-5 State Layers](./CD-5_STATE_LAYERS.md)
7. [CD-6 Contact Dispatch Modal UI](./CD-6_CONTACT_DISPATCH_MODAL_UI.md)
8. [CD-7 Tracking Entry Integration](./CD-7_TRACKING_ENTRY_INTEGRATION.md)
9. [CD-8 Backend Verification](./CD-8_BACKEND_VERIFICATION.md)
10. [CD-9 Runtime Verification](./CD-9_RUNTIME_VERIFICATION.md)

Update rule:

- Before starting a pass, mark its status as `In progress`.
- After finishing a pass, add changed files, decisions, verification, and any rollback notes.
- Do not start a later pass if an earlier pass still has unresolved architecture questions that affect ownership.
