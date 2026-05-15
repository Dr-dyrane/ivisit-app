# CD-2 RLS And RPC

Status: Not started
Owner: Backend / Security
Layer impact: Layer 1, Supabase security and write contract

## Goal

Secure Contact Dispatch so only authorized emergency participants can read or write room data.

## Files

- `supabase/migrations/20260219000700_security.sql`
- `supabase/migrations/20260219000800_emergency_logic.sql`
- `supabase/migrations/20260219010000_core_rpcs.sql`

Use the existing repo convention to choose whether RPCs belong in emergency logic or core RPCs.

## Guardrails

- Client cannot attach arbitrary participants.
- Client cannot create arbitrary rooms directly.
- RLS must scope reads to room participants and emergency owners.
- RPCs must be idempotent.
- No frontend implementation in this pass.

## Functions

Add:

- `p_is_emergency_chat_participant(p_room_id uuid)`
- `ensure_emergency_chat_room(p_request_id uuid)`
- `send_emergency_chat_message(p_room_id uuid, p_body text, p_kind text, p_client_message_id text, p_metadata jsonb)`
- `mark_emergency_chat_room_read(p_room_id uuid, p_message_id uuid)`
- archive trigger/function when emergency request completes or cancels

## Checklist

- Enable RLS for all three chat tables.
- Add select policy for rooms in participant/emergency scope.
- Add select policy for participants in participant/emergency scope.
- Add select policy for messages in participant/emergency scope.
- Route all room creation through `ensure_emergency_chat_room`.
- Route v1 message sends through `send_emergency_chat_message`.
- Use `ON CONFLICT` to avoid duplicate rooms and duplicate optimistic messages.
- Archive rooms on emergency completion/cancellation.

## Acceptance

- Patient can access only their emergency room.
- Attached responder/provider can access only rooms they are attached to.
- Unrelated authenticated user cannot read room, participants, or messages.
- Repeated ensure calls return the same room.
- Repeated send with same `client_message_id` returns one canonical message.
- Archived room is readable but send-blocked.

## Changed Files

- TBD

## Verification

- TBD

## Rollback Notes

- Revert RLS/RPC additions if not applied remotely.
- If applied remotely, keep RPCs inert and disable frontend entry.
