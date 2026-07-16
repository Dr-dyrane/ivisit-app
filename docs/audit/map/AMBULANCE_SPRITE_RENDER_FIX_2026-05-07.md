---
status: historical
owner: architecture
last_updated: 2026-07-15
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

> **AMENDMENT 2026-07-15:** the 90x90 single-scale sprites below rendered giant on
> INSTALLED Android builds (mdpi bucket + `fromResource` density scaling — the same
> defect as the hospital pins). Android now loads a density-variant sprite set from
> `assets/map/android/ambulance-sprites/` (@3x = byte-copy of these 90x90 bitmaps)
> behind a `Platform.OS === "android"` require split in `RouteLayer.jsx`; iOS/web keep
> the sprites below unchanged. Details + guardrail:
> [ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md](./ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md)

---

# Ambulance Sprite Render Fix 2026-05-07

## Problem

Ambulance sprites on Android native build render at incorrect size (128Ã—128 - the raw PNG bitmap dimension) instead of the intended design size (~46Ã—46 or ~90Ã—90).

## Root Cause

Same as hospital markers (`HOSPITAL_MARKER_RENDER_RULE_2026-05-06.md`):

1. **Web sizing is code-driven** - `imageSize` prop is respected
2. **Native sizing is asset-driven** - `react-native-maps` uses actual PNG bitmap dimensions, ignores `imageSize`

Current ambulance sprites are 128Ã—128 (from `generate-ambulance-sprites.ps1` CanvasSize=128), but code specifies `imageSize: 46Ã—46` which only works on web.

## Solution Pattern (Following Hospital Marker Fix)

### Proportional Sizing Applied

Hospital markers use consistent web→native ratio:
- Normal: 28Ã—48 (web) → 54Ã—91 (native) = ~1.93x width, 1.9x height
- Selected: 38Ã—64 (web) → 68Ã—114 (native) = ~1.79x width, 1.78x height
- **Average ratio: ~1.9x**

Applied to ambulance sprite (46Ã—46 web):
- **Native target: 46 Ã— 1.96 = ~90Ã—90**

### Implementation Strategy

1. **Code changes** (immediate): Define 90Ã—90 native size in `imageSize`
2. **Asset regeneration** (required for native): Resize PNGs from 128Ã—128 → 90Ã—90

## Implementation

### Files Changed

1. **`components/emergency/intake/EmergencyLocationPreviewMap.jsx`**
   - Add `AMBULANCE_SPRITE_DIMENSIONS` constant with proportional sizing
   - Add `getAmbulanceSpriteDimensions(isWeb)` helper
   - Update ambulance Marker to use platform-specific `imageSize`

2. **`components/map/RouteLayer.jsx`**
   - Add `AMBULANCE_SPRITE_DIMENSIONS` constant with proportional sizing
   - Add `getAmbulanceSpriteDimensions()` helper
   - Add `imageSize` prop to ambulance Marker

### Size Contract

| Platform | Size | Ratio |
|----------|------|-------|
| Web | 46Ã—46 | 1x (base) |
| Native (iOS/Android) | 90Ã—90 | 1.96x (matches hospital ~1.9x) |

**Note**: Current PNGs are 128Ã—128. Native builds will show oversized sprites until PNGs are regenerated at 90Ã—90.

## Rollback

```powershell
git restore --source HEAD -- components/emergency/intake/EmergencyLocationPreviewMap.jsx components/map/RouteLayer.jsx
```

## PNG Asset Regeneration (Required)

The ambulance sprites must be regenerated at 90Ã—90 instead of 128Ã—128:

**File**: `scripts/map/generate-ambulance-sprites.ps1`

**Change**: Update CanvasSize from 128 to 90:
```powershell
# OLD
[int]$CanvasSize = 128

# NEW  
[int]$CanvasSize = 90
```

**Regenerate**:
```powershell
cd scripts/map
.\generate-ambulance-sprites.ps1
```

This will regenerate all 16 ambulance heading sprites (ambulance_00.png through ambulance_15.png) at the correct 90Ã—90 size.

## Verification

- [ ] Web: Ambulance sprite renders at 46Ã—46
- [ ] Android native: Ambulance sprite renders at 90Ã—90 (after PNG regeneration)
- [ ] iOS native: Ambulance sprite renders at 90Ã—90 (after PNG regeneration)
- [ ] Sprite rotation (16 headings) works on all platforms
- [ ] Size ratio matches hospital markers (~1.9x web→native)

## Related

- `HOSPITAL_MARKER_RENDER_RULE_2026-05-06.md` - Original hospital marker fix pattern
- `HOSPITAL_MARKER_SIZE_CHECKPOINT.json` - Hospital marker checkpoint
