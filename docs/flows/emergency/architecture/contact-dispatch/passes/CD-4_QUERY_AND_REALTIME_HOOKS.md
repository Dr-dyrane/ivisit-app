# CD-4 Query And Realtime Hooks

Status: Not started
Owner: App State
Layer impact: Layer 2, TanStack Query and realtime invalidation

## Goal

Make Contact Dispatch query-driven and realtime-aware without storing canonical messages in local UI state.

## Files

- `hooks/emergencyChat/emergencyChat.queryKeys.js`
- `hooks/emergencyChat/useEmergencyChatRoom.js`
- `hooks/emergencyChat/useEmergencyChatMessages.js`
- `hooks/emergencyChat/useEmergencyChatMutations.js`
- `hooks/emergencyChat/useEmergencyChatRealtime.js`

## Guardrails

- Query owns room/message/participant fetch lifecycle.
- Realtime invalidates or patches query cache; it does not mutate UI atoms.
- No screen-level subscription effects.
- No whole-table subscriptions.
- Use optimistic send with server reconciliation.

## Query Keys

```js
export const emergencyChatQueryKeys = {
  all: ["emergencyChat"],
  roomByRequest: (requestId) => ["emergencyChat", "room", requestId],
  messages: (roomId) => ["emergencyChat", "messages", roomId],
  participants: (roomId) => ["emergencyChat", "participants", roomId],
};
```

## Checklist

- Add stable query key builder.
- Add room ensure hook, disabled until request id exists.
- Add messages hook, disabled until room id exists.
- Add send mutation with `clientMessageId`.
- Add optimistic bubble state in query cache.
- Reconcile optimistic bubble with canonical server row.
- Add realtime subscription hook filtered by `room_id`.
- Invalidate or patch messages query on insert.
- Unsubscribe on unmount/room change.

## Acceptance

- Opening modal fetches room/messages without restart.
- New messages appear via realtime.
- Sending a message shows immediate feedback.
- Failed send leaves retry state visible.
- Query cache remains canonical frontend data source.

## Changed Files

- TBD

## Verification

- TBD

## Rollback Notes

- Disable realtime hook first if instability appears.
- Keep query fetch/mutation working without realtime.
