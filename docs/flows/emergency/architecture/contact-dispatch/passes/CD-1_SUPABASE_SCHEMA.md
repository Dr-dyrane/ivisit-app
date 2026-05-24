> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# CD-1 Supabase Schema

Status: Implemented locally
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

- `supabase/migrations/20260219000300_logistics.sql`
- `supabase/docs/SCHEMA_SNAPSHOT.md`
- `supabase/docs/MODULE_SCHEMA_BIBLE.md`

## Verification

- Added `public.emergency_chat_rooms` with unique `emergency_request_id`.
- Added `public.emergency_chat_participants` with unique `(room_id, user_id)`.
- Added `public.emergency_chat_messages` with indexed `room_id`/time lookup and `client_message_id` idempotency index.
- Added body length check and updated-at triggers.
- Added `emergency_requests.communication_room_id` plus FK back to `emergency_chat_rooms`.
- `git diff --check` passed for the edited migration files.
- `npx supabase migration list` confirmed all existing pillar versions are already applied remotely.
- `npx supabase db push` returned `Remote database is up to date`.
- `npx supabase db push --dry-run` returned `Remote database is up to date`.
- `npx supabase db lint --linked --schema public --fail-on error` is currently blocked by pre-existing remote lint errors in PostGIS/legacy functions; dashboard-applied Contact Dispatch SQL still needs manual live verification.
- `npx supabase status` could not run local validation because Docker is not reachable on this Windows session.
- Per pillar ritual, `node supabase/scripts/sync_to_console.js` was run successfully.

Remote caveat:

- Because `20260219000300_logistics.sql` is already applied remotely, Supabase will not replay this edited pillar automatically. The new SQL was applied to the live database via the Supabase dashboard SQL editor on 2026-05-14.

## Rollback Notes

- Remove the three chat tables and `emergency_requests.communication_room_id`.
- If backend has already shipped, leave tables inert and hide UI entry until CD-2+ are complete.
