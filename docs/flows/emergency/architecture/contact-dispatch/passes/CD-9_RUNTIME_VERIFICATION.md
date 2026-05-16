# CD-9 Runtime Verification

Status: Static Sweep Complete, Runtime QA Pending
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
- Local syntax and diff checks should pass before runtime QA.
- Manual runtime QA is still required on iOS, Android, and web with two authenticated participants.

## Rollback Notes

- If runtime breaks tracking, remove Contact Dispatch tracking entry only.
- If realtime breaks, disable realtime hook and keep manual query refresh.
