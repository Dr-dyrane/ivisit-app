# CD-6 Contact Dispatch Modal UI

Status: Not started
Owner: UI / UX
Layer impact: presentation and Layer 5 UI consumption

## Goal

Build the calm, operational communication room UI as a map-root modal.

## Files

- `components/map/communication/EmergencyContactDispatchModal.jsx`
- `components/map/communication/EmergencyContactDispatchMessageList.jsx`
- `components/map/communication/EmergencyContactDispatchComposer.jsx`
- `components/map/communication/EmergencyContactDispatchQuickActions.jsx`
- `components/map/communication/emergencyContactDispatch.styles.js`
- `components/map/communication/emergencyContactDispatch.theme.js`
- `components/map/communication/emergencyContactDispatch.content.js`
- `components/map/communication/emergencyContactDispatch.helpers.js`

## Reference Files

- `components/map/surfaces/MapModalShell.jsx`
- `components/emergency/ServiceRatingModal.jsx`
- `components/map/history/MapHistoryModal.jsx`
- `components/map/views/tracking/parts/MapTrackingParts.jsx`

## Guardrails

- Use `MapModalShell`.
- Do not navigate away from `/map`.
- Do not put chat UI inside `MapTrackingStageBase`.
- No decorative borders.
- No card-in-card layout.
- No blank loading state.
- Sticky composer must survive keyboard.
- Split JSX, styles, theme, content, helpers.

## UI Structure

```txt
MapModalShell
  Header
  Status strip
  Message list
  Quick actions
  Composer
```

## Required States

- ensuring room
- loading messages
- empty room
- ready with messages
- sending optimistic message
- failed send retry
- reconnecting
- archived/read-only
- permission/error fallback

## Quick Actions

- `Moving toward ambulance`
- `Meet halfway?`
- `Pickup changed`
- `Please call me`
- `We arrived`

## Acceptance

- Full-screen/modal presentation feels native on iOS, Android, and web.
- Composer is always reachable.
- Messages are readable with large accessibility text.
- Loading uses skeleton bubbles.
- Empty state invites a useful first action.
- Screen reader labels expose sender, role, timestamp, and message.

## Changed Files

- TBD

## Verification

- TBD

## Rollback Notes

- Remove modal component and leave service/query layers intact.
