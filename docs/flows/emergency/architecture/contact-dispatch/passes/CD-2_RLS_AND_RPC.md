---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# CD-2 RLS And RPC

Status: Implemented locally
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

- `supabase/migrations/20260219000700_security.sql`
- `supabase/migrations/20260219010000_core_rpcs.sql`
- `supabase/docs/MODULE_SCHEMA_BIBLE.md`

## Verification

- Added `public.p_is_emergency_chat_participant(p_room_id uuid)`.
- Enabled RLS for `emergency_chat_rooms`, `emergency_chat_participants`, and `emergency_chat_messages`.
- Added participant/emergency-scoped SELECT policies for rooms, participants, and messages.
- Added `ensure_emergency_chat_room(p_request_id uuid)` for idempotent room creation/attachment.
- Added `send_emergency_chat_message(p_room_id uuid, p_body text, p_kind text, p_client_message_id text, p_metadata jsonb)` for RPC-owned sends and optimistic-message idempotency.
- Added `mark_emergency_chat_room_read(p_room_id uuid, p_message_id uuid)` for participant read state.
- Added archive trigger function on `emergency_requests.status` completion/cancellation.
- Direct client table writes are not granted for chat tables.
- `git diff --check` passed for the edited migration files.
- `npx supabase migration list` confirmed all existing pillar versions are already applied remotely.
- `npx supabase db push` returned `Remote database is up to date`.
- `npx supabase db push --dry-run` returned `Remote database is up to date`.
- `npx supabase db lint --linked --schema public --fail-on error` is currently blocked by pre-existing remote lint errors in PostGIS/legacy functions; dashboard-applied Contact Dispatch SQL still needs manual live verification.
- `npx supabase status` could not run local validation because Docker is not reachable on this Windows session.
- Per pillar ritual, `node supabase/scripts/sync_to_console.js` was run successfully.

Remote caveat:

- Because `20260219000700_security.sql` and `20260219010000_core_rpcs.sql` are already applied remotely, Supabase will not replay these edited pillars automatically. The new SQL was applied to the live database via the Supabase dashboard SQL editor on 2026-05-14.

## Rollback Notes

- Revert RLS/RPC additions if not applied remotely.
- If applied remotely, keep RPCs inert and disable frontend entry.
