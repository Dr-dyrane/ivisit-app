# CD-0 Final Architecture Review

Status: Completed
Owner: CTO / System Architect
Layer impact: documentation only

## Goal

Confirm Contact Dispatch is an emergency-request-owned communication room, not a generic chat or support ticket feature.

## Read First

- `docs/REFACTORING_GUARDRAILS.md`
- `docs/flows/emergency/architecture/contact-dispatch/CONTACT_DISPATCH_COMMUNICATION_ROOM_DOSSIER_V1.md`
- `docs/architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md`
- `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`

## Questions To Resolve

- Should Contact Dispatch be available during `pending_approval`, or only after dispatch starts?
- Should quick actions send immediately or fill the composer first?
- Is provider console room UI part of v1 or v1.1?
- Is `emergency_requests.responder_id` reliable enough for v1 participant seeding?
- Which hospital-side roles should be attached in v1: `dispatcher`, `org_admin`, `provider`, or only direct responder?

## Audit Tasks

- Inspect `support_tickets` and confirm it is not suitable for emergency-flow room ownership.
- Inspect `notifications` and confirm it is not suitable for two-way operational messaging.
- Inspect `emergency_requests`, `visits`, `profiles`, `ambulances`, and `hospitals` for participant source fields.
- Confirm if `communication_room_id` belongs on `emergency_requests` as fast attachment metadata.
- Confirm no existing service/query hook already owns emergency chat semantics.

## Acceptance

- Final v1 product decisions recorded in this file.
- No duplicate generic chat architecture introduced.
- Room ownership remains `emergency_requests`.
- Implementation can begin with CD-1 without open ownership ambiguity.

## Decisions

- Contact Dispatch v1 is owned by `emergency_requests`, not `support_tickets`, notifications, or a generic social chat layer.
- `emergency_requests.communication_room_id` is valid fast attachment metadata, while the canonical uniqueness rule remains `emergency_chat_rooms.emergency_request_id`.
- `support_tickets` is not suitable because it is asynchronous support infrastructure, not live emergency-flow coordination.
- `notifications` is not suitable because it is one-way delivery/read state, not a shared operational room.
- Participant seeding can begin from `emergency_requests.user_id` and `emergency_requests.responder_id`.
- Hospital-side access is scoped by `profiles.organization_id` matching the request hospital organization for `org_admin`, `dispatcher`, and `provider` roles.
- Message writes should go through RPCs for v1. Direct client inserts are intentionally not granted.
- System/status messages require nullable `sender_id`; user-authored messages are still enforced by RPC auth.
- Contact Dispatch can be created whenever the emergency request exists, but frontend exposure should remain tied to active tracking/dispatch UX.

## Verification

- Reviewed the existing Supabase pillar split:
  - `20260219000300_logistics.sql` owns request/visit runtime tables.
  - `20260219000700_security.sql` owns RLS and security helpers.
  - `20260219010000_core_rpcs.sql` owns app/console RPC boundaries.
- Reviewed existing five-layer data flow guardrails and emergency map rules.
- Confirmed no existing emergency chat room semantics already existed.
- Confirmed Supabase remote has the existing pillar migration versions already applied; live application of edited pillar SQL must be handled deliberately because migrations are not replayed by version.

## Rollback Notes

- This pass is documentation only.
