# CD-9 Runtime Verification

Status: Static Sweep Complete, Runtime QA Pending - Tracking Regression Added
Owner: QA / App
Layer impact: verification only

## Goal

Verify Contact Dispatch behaves correctly in the real tracking flow across platforms.

## Scenarios

### First Open

- Start active ambulance tracking.
- Tap Contact Dispatch.
- Room is created if missing.
- Modal opens without leaving map.
- Loading state is skeleton, not blank.

### Existing Room

- Reopen Contact Dispatch for same request.
- Existing messages appear.
- No duplicate room creation occurs.

### Send

- Send typed message.
- Send quick action.
- Message appears optimistically.
- Canonical message replaces optimistic state.
- Failed send can retry.

### Realtime

- Use two sessions/users attached to same room.
- Send from one.
- Message appears in the other without refresh.

### Keyboard

- iOS: composer visible with keyboard.
- Android: composer visible with keyboard.
- Web: composer and message list remain usable.

### Lifecycle

- Complete/cancel emergency request.
- Room becomes archived/read-only.
- Existing messages remain readable.

### Map Preservation

- Open modal while ambulance is moving.
- Close modal.
- Tracking sheet, route, and animation remain in correct state.

## Acceptance

- No page restart required.
- No Metro reload required.
- No sheet toggle required to hydrate room/messages.
- No blank modal body.
- No clipped text under large accessibility font.
- No map navigation away from tracking.

## Evidence

- Final static sweep fixed room lifecycle advancement, chronological message ordering, realtime/optimistic cache convergence, sender ownership display, sticky composer placement, and service null filtering.
- Tracking regression audit found two likely causes of demo "connection lost" states:
  - the tracking entry could pass the display request id to Contact Dispatch, but room creation requires the emergency request UUID
  - after a room ensure failure, the modal could retry room creation immediately instead of waiting for explicit Retry
- Candidate runtime patch now prefers the emergency request row UUID from tracking state and gates `ensureRoom()` behind the chat lifecycle `ensuringRoom` state.
- Local syntax and diff checks should pass before runtime QA.
- Manual runtime QA is still required on iOS, Android, and web with two authenticated participants.

## Current Scheduling Rule

Contact Dispatch runtime QA is folded into the tracking tightening lane only at the tracking entry point. Do not expand this into a separate Contact Dispatch redesign or backend cleanup while emergency tracking is still being stabilized.

Required tracking-lane checks:

1. Open Contact Dispatch from an active ambulance tracking sheet.
2. Confirm the room ensure path receives the emergency request row UUID.
3. Confirm Retry is user-controlled after a failed ensure.
4. Send one quick action and one typed message.
5. Confirm demo dispatch reply does not block the user-authored message.
6. Close and reopen the modal without disrupting route animation or tracking sheet state.

## Rollback Notes

- If runtime breaks tracking, remove Contact Dispatch tracking entry only.
- If realtime breaks, disable realtime hook and keep manual query refresh.
