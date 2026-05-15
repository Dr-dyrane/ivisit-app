# CD-8 Backend Verification

Status: Pending Manual Verification
Owner: QA / Backend
Layer impact: verification only

## Goal

Verify database, RLS, RPC, and realtime behavior before UI release.

## Verification Steps

**Tools:** Supabase Dashboard SQL Editor, Supabase Realtime Inspector

### 1. Room Creation
- Create active emergency request as patient
- Call `ensure_emergency_chat_room(p_request_id)`
- Call again with same request ID
- Confirm same room ID is returned (idempotent)

### 2. Participants
- Verify patient participant exists in `emergency_chat_participants`
- Assign responder to request
- Verify responder participant is auto-created
- Confirm no duplicate participant rows
- Verify participant roles are correct

### 3. Message Send
- Call `send_emergency_chat_message` with text message
- Call with quick-action message (kind='quick_action')
- Send same `client_message_id` twice - confirm no duplicate
- Send empty body - confirm rejection
- Send 1001+ character body - confirm rejection

### 4. RLS
- Patient can SELECT from emergency_chat_rooms/messages/participants
- Attached responder can SELECT from their room/messages
- Unrelated authenticated user cannot SELECT from room/messages
- Unrelated user cannot call send RPC
- Archived room blocks send RPC

### 5. Realtime
- Subscribe to messages channel with `room_id` filter
- Participant A sends message
- Participant B receives insert event
- Unsubscribe removes channel
- Verify channel is room-scoped (not whole table)

## Acceptance

- All backend tests pass.
- No RLS leakage.
- No duplicate rooms.
- No duplicate idempotent messages.
- Realtime events arrive only for scoped room.

## Evidence

- TBD

## Rollback Notes

- Disable UI entry if any RLS or idempotency test fails.
