> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Feature Pass: iVisit 3D Ambulance Telemetry Renderer

**Date:** 2026-05-19  
**Target:** deferred from iVisit 1.0.6  
**Status:** planning record only. Runtime implementation was removed after testing showed the GLB path was too heavy and did not reliably load.

---

## Goal

Upgrade the ambulance telemetry renderer from 16-direction PNG sprites to a
premium 3D GLB ambulance overlay, while preserving existing route-following
logic and keeping sprites as fallback.

The renderer must stay visual only. It may consume:

- `ambulanceCoordinate`
- `ambulanceHeading`
- `routeCoordinates`
- `animateAmbulance`

It must not own route progress, emergency lifecycle, payment state, dispatch
assignment, or tracking state.

Tracking reliability remains the gate for any renderer revival. The ambulance
sprite/model should follow the active polyline during animation and use
patient-facing/user-facing heading only as a fallback when route projection is
unavailable or tracking has genuinely been lost.

---

## Current Decision

For the active app, iVisit stays on the proven sprite renderer:

- `components/map/RouteLayer.jsx`
- `hooks/emergency/useAmbulanceAnimation.js`
- `assets/map/ambulance-sprites/ambulance_00.png` through `ambulance_15.png`

The experimental 3D runtime was removed:

- `components/map/ambulance/*`
- `assets/map/3d/ambulance.glb`
- `scripts/map/optimize-ambulance-glb.ps1`
- `scripts/map/strip-ambulance-glb-materials.js`
- `three`, `expo-gl`, `@react-three/fiber`, `@react-three/drei`

This keeps 1.0.6 focused on tracking state correctness and runtime reliability.

---

## Future Architecture

Because iVisit uses native Google/Apple maps through `react-native-maps`, do not
inject Three.js into the map engine. Render the model as an absolute overlay
above `MapView`.

```text
coordinate
  -> mapRef.current.pointForCoordinate(coordinate)
  -> screen x/y
  -> Reanimated overlay position
  -> rotate GLB by ambulanceHeading
```

If projection, GL, model loading, reduced motion, or platform support fails,
fallback to the existing sprite marker.

---

## Future Files

- `components/map/ambulance/AmbulanceTelemetryRenderer.jsx`
- `components/map/ambulance/Ambulance3DOverlay.jsx`
- `components/map/ambulance/Ambulance3DOverlay.native.jsx`
- `components/map/ambulance/AmbulanceSpriteFallback.jsx`
- `components/map/ambulance/useProjectedMapCoordinate.js`
- `components/map/ambulance/useAmbulanceRendererCapability.js`
- `components/map/ambulance/useAmbulanceRendererCapability.native.js`
- `components/map/ambulance/ambulance3d.constants.js`

Prefer keeping `RouteLayer.jsx` re-exports for:

- `getAmbulanceSpriteBucketForHeading`
- `getAmbulanceSpriteForHeading`

`EmergencyLocationPreviewMap.jsx` depends on that compatibility path.

---

## Asset Contract

Planned GLB:

- Low-poly mobile-ready model
- Under 1 MB preferred
- Origin centered
- Nose points to a known forward axis
- No interior
- No skeletal animation
- Single/simple material preferred
- Readable from top-down and 45-degree map angle

Experimental optimization reached 231,432 bytes and validator-clean output, but
the runtime loader path still did not meet release confidence.

---

## Subpass Tracker

| Pass | Scope | Status |
|---|---|---|
| 1 | Safe sprite extraction | Reverted |
| 2 | Renderer shell | Removed |
| 3 | 3D capability layer | Removed |
| 4 | Native 3D overlay | Removed |
| 5 | Motion polish | Deferred |
| 6 | Performance guardrails | Deferred |
| 7 | Documentation | Complete |
| 8 | Native device visual QA | Required before revival |

---

## Revival Gates

Do not re-enable the 3D ambulance until:

- iOS device render is verified
- Android device render is verified
- GLB appears quickly and consistently
- Web build never imports native Three/GL paths
- Sprite fallback remains first-frame and failure-safe
- Heading is visually correct, or `AMBULANCE_3D_HEADING_OFFSET` is set
- Tracking sheet state is stable after payment commit
