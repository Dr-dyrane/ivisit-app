# CD-7 Tracking Entry Integration

Status: Not started
Owner: Map Flow
Layer impact: tracking UI intent and map modal orchestration

## Goal

Expose Contact Dispatch from the active tracking sheet without making tracking own chat data.

## Files

- `components/map/views/tracking/mapTracking.model.js`
- `components/map/views/tracking/useMapTrackingController.js`
- `components/map/views/tracking/MapTrackingStageBase.jsx`
- `components/map/views/tracking/parts/MapTrackingParts.jsx`
- `components/map/MapModalOrchestrator.jsx`
- `hooks/map/exploreFlow/useMapExploreFlow.js`
- `screens/MapScreen.jsx` only for thin wiring if needed

## Guardrails

- Tracking emits intent; it does not fetch rooms/messages.
- MapScreen stays thin.
- Modal rendering belongs at map root/orchestrator level.
- Register Contact Dispatch as an active map modal so FAB/map controls behave correctly.
- Do not create a route.

## Tracking CTA Contract

CTA row should include:

- `Continue Check-In`
- `Reserve My Bed Space`
- `Contact Dispatch`

Hero card:

- add compact chat/message action if the hero layout supports it cleanly
- label may be `Dispatch` or icon-only with accessibility label `Contact dispatch`

## Checklist

- Add `onOpenContactDispatch` prop to tracking controller flow.
- Add Contact Dispatch action to `buildTrackingMidActions`.
- Set active request id atom on press.
- Open modal visible atom on press.
- Render `EmergencyContactDispatchModal` through `MapModalOrchestrator`.
- Include modal visibility in `hasActiveMapModal`.

## Acceptance

- User can open Contact Dispatch from tracking.
- Map remains mounted.
- Tracking sheet state is preserved behind modal.
- No chat RPCs are called from tracking stage.
- Contact Dispatch action gives immediate pressed/opening feedback.

## Changed Files

- TBD

## Verification

- TBD

## Rollback Notes

- Remove Contact Dispatch action from tracking model.
- Remove modal registration from `MapModalOrchestrator`.
- Keep backend/service/query layers inert.
