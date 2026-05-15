# CD-8 Backend Verification

Status: Not started
Owner: QA / Backend
Layer impact: verification only

## Goal

Verify database, RLS, RPC, and realtime behavior before UI release.

## Test Matrix

### Room Creation

- patient creates active emergency request
- call `ensure_emergency_chat_room`
- call it again
- confirm same room id returns

### Participants

- patient participant exists
- responder participant exists when responder is assigned
- no duplicate participant rows
- participant role is correct

### Message Send

- patient sends text message
- patient sends quick-action message
- same `client_message_id` does not duplicate
- empty message is rejected
- overlong message is rejected

### RLS

- patient can select room/messages
- attached responder can select room/messages
- unrelated authenticated user cannot select room/messages
- unrelated authenticated user cannot send
- archived room blocks send

### Realtime

- participant A receives participant B message insert
- channel is filtered by `room_id`
- unsubscribe removes channel

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
