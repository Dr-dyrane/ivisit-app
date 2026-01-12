# Route Map Camera Tuning (Emergency)

This document captures the final, working parameters for the Emergency route map camera fit + placement.

## Final Parameters

- **Zoom factor**: `ROUTE_ZOOM_FACTOR = 0.125`
- **Edge padding used for route fit**
  - X margin: `marginXPx = 4`
  - Top extra margin: `marginTopPx = 48`
  - Bottom extra margin: `marginBottomPx = 4`
- **Post-fit vertical placement**: `centerBias = 1`
  - `0.5` is centered in visible area
  - `> 0.5` pushes the content lower (more “scroll down”)

## Where It Lives

- Route camera fit + placement: [FullScreenEmergencyMap.jsx](file:///c:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/FullScreenEmergencyMap.jsx)
  - Native fit: `fitToCoordinates(validRoute, { edgePadding })`
  - Post-fit placement: `scheduleCenterInVisibleArea(validRoute, { zoomFactor, centerBias })`

## Notes

- `centerBias` is a 0..1 value that picks the desired Y position inside the visible map area (screen minus top/bottom padding).
  - `1` aims at the bottom of the visible area, maximizing the “scroll down” effect while still respecting the bottom sheet padding.
- `initialRegion` must always include `latitudeDelta`/`longitudeDelta` to avoid “world zoom” / unstable deltas on first mount.

## Debugging Logs (Dev Only)

- `[RouteCamera] circle-fit` logs bounds, padding, and derived deltas.
- `[RouteCamera] offset-center` logs the visible-area math including `centerBias`.
- `[RouteZoom] region` logs the final region (programmatic + user gestures).

