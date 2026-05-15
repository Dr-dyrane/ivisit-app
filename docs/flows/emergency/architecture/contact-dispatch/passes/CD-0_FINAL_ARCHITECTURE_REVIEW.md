# CD-0 Final Architecture Review

Status: Not started
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

- TBD

## Verification

- TBD

## Rollback Notes

- This pass is documentation only.
