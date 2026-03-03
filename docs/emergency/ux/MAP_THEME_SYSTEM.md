# Map Theme System (iOS + Android)

## Goal
Deliver a premium, monochromatic map that keeps road hierarchy highly legible in both light and dark modes.

## Design Direction
- Base: desaturated neutral tones (low visual noise).
- Roads: explicit contrast ladder (`local` < `arterial` < `highway`) so routing is always easy to parse.
- Accent usage: iVisit red only for medical POIs and emergency overlays, not for full map tinting.

## Platform Behavior
- Android (`Google Maps`):
  - Uses `customMapStyle` from `components/map/mapStyles.js`.
  - Road and label colors are fully controlled by our JSON style.
- iOS (`Apple Maps`):
  - Uses `mapType="mutedStandard"` for a premium-muted baseline.
  - Uses `userInterfaceStyle` (`light` / `dark`) for appearance parity.
  - Apple Maps does not apply Google JSON style arrays.

## Theme Tokens
Defined in `components/map/mapStyles.js`:
- `MAP_THEME.light`
- `MAP_THEME.dark`

Core token groups:
- `base`, `land`, `poi`
- `roadLocal`, `roadArterial`, `roadHighway`, `roadStroke`, `roadLabel`
- `water`, `waterLabel`
- `medicalFill`, `medicalLabel`

## Implementation Entry Point
- `components/map/FullScreenEmergencyMap.jsx`
  - `mapType`:
    - iOS: `mutedStandard`
    - Android: `standard`
  - `customMapStyle`:
    - Android: apply JSON style
    - iOS: `undefined`

## Tuning Rules
- If roads feel too flat, adjust in this order:
  1. `roadStroke`
  2. `roadArterial`
  3. `roadHighway`
- If labels compete with overlays, reduce `roadLabel` contrast before touching road geometry.
- Keep medical accents subtle; avoid bright reds on non-medical features.
