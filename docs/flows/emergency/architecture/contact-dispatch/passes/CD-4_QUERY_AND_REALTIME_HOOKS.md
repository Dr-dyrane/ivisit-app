---
status: living
owner: product
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../../../../audit/RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# CD-4 Query And Realtime Hooks

Status: Complete
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

- `hooks/emergencyChat/emergencyChat.queryKeys.js` (created)
- `hooks/emergencyChat/useEmergencyChatRoom.js` (created)
- `hooks/emergencyChat/useEmergencyChatMessages.js` (created)
- `hooks/emergencyChat/useEmergencyChatMutations.js` (created)
- `hooks/emergencyChat/useEmergencyChatRealtime.js` (created)

## Verification

- Query keys follow stable pattern (all, roomByRequest, messages, participants)
- Room hook uses mutation for ensureRoom, disabled until requestId exists
- Messages hook uses query for listMessages, disabled until roomId exists
- Send mutation uses optimistic bubble with clientMessageId reconciliation
- Message cache is chronological, with optimistic sends appended and canonical server rows deduped by id/clientMessageId.
- Realtime hook filtered by room_id, patches cache on INSERT/UPDATE/DELETE.
- Query-key arrays are memoized before use in effects/callbacks so realtime does not resubscribe on harmless renders.
- All hooks auto-unsubscribe on unmount/room change

## Rollback Notes

- Disable realtime hook first if instability appears.
- Keep query fetch/mutation working without realtime.
