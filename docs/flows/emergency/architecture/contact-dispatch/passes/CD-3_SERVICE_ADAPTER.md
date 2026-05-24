> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# CD-3 Service Adapter

Status: Complete
Owner: App Data
Layer impact: Layer 1 adapter, no UI

## Goal

Create the frontend service that maps Supabase rows, normalizes input, calls RPCs, and exposes filtered realtime helpers.

## Files

- `services/emergencyChatService.js`

## Reference Files

- `services/emergencyContactsApiService.js`
- `services/emergencyRequestsService.js`
- `services/supabaseHelpers.js`
- `services/displayIdService.js`

## Guardrails

- No Supabase calls in UI components.
- No `SELECT *` without an intentional field list.
- Import canonical UUID helpers instead of inline regex.
- Filter realtime subscriptions by `room_id`.
- Service owns casing conversion from DB snake_case to app camelCase.

## Exports

- `mapEmergencyChatRoomRow`
- `mapEmergencyChatParticipantRow`
- `mapEmergencyChatMessageRow`
- `normalizeEmergencyChatMessageInput`
- `ensureRoomForRequest(requestId)`
- `listMessages(roomId, { limit, before })`
- `sendMessage(roomId, input)`
- `markRoomRead(roomId, messageId)`
- `subscribeToMessages(roomId, onEvent, onStatus)`

## Checklist

- Define explicit select field lists.
- Normalize empty body to validation error.
- Trim body before sending.
- Generate/accept `clientMessageId`.
- Map archived room status.
- Return neutral values for missing disabled inputs.
- Wrap reads in existing retry pattern if appropriate.

## Acceptance

- Service can ensure room.
- Service can list messages.
- Service can send idempotent messages.
- Service can subscribe to room message changes.
- No UI files import Supabase for chat.

## Changed Files

- `services/emergencyChatService.js` (created)

## Verification

- Service exports all required functions
- Row mappers convert snake_case to camelCase
- Input normalization validates body length and kind
- RPC calls use withRetry and withTimeout
- Message listing filters soft-deleted rows with `.is("deleted_at", null)`, clamps page size, and returns chronological order for chat UI consumption.
- Realtime subscription validates room UUIDs and is filtered by room_id.
- Explicit SELECT field lists (no SELECT *)

## Rollback Notes

- Remove `services/emergencyChatService.js`.
- No UI should break if hooks are not yet created.
