# CD-1 Supabase Schema

Status: Not started
Owner: Backend
Layer impact: Layer 1, Supabase truth

## Goal

Add canonical emergency communication room tables and the emergency request attachment field.

## Files

- `supabase/migrations/20260219000300_logistics.sql`
- `supabase/docs/SCHEMA_SNAPSHOT.md`
- `supabase/docs/MODULE_SCHEMA_BIBLE.md`

## Guardrails

- Do not create a one-off fix migration.
- Edit the correct pillar migration.
- Use indexed ownership fields.
- Keep messages append-only for v1.
- Do not add frontend state in this pass.

## Tables

Add:

- `public.emergency_chat_rooms`
- `public.emergency_chat_participants`
- `public.emergency_chat_messages`

Add to `public.emergency_requests`:

- `communication_room_id UUID NULL`

## Checklist

- Add `emergency_chat_rooms` with unique `emergency_request_id`.
- Add `emergency_chat_participants` with unique `(room_id, user_id)`.
- Add `emergency_chat_messages` with `client_message_id`.
- Add message body length check.
- Add indexes for room lookup, participants, messages by room/time.
- Add updated_at triggers using existing `handle_updated_at`.
- Update Supabase schema docs.

## Acceptance

- One room can exist per emergency request.
- Messages can be queried efficiently by room.
- Participants can be queried efficiently by room and user.
- Schema docs reflect the new tables.

## Changed Files

- TBD

## Verification

- TBD

## Rollback Notes

- Remove the three chat tables and `emergency_requests.communication_room_id`.
- If backend has already shipped, leave tables inert and hide UI entry until CD-2+ are complete.
