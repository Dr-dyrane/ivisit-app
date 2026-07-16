---
status: historical
owner: architecture
last_updated: 2026-07-15
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

> **AMENDMENT 2026-07-15 — rule 2 below was HALF-right and shipped a latent defect.**
> "Native sizing is asset-driven" holds only on the Fresco path (Metro `http://` and
> OTA-downloaded `file://` assets = raw pixels). On INSTALLED builds, embedded assets
> load via `BitmapDescriptorFactory.fromResource`, which density-scales `drawable-mdpi`
> resources — single-scale PNGs rendered ~3x giant on real devices. The May "Expo native
> and APK" validation was actually republished via `eas update` (OTA/Fresco), so the
> embedded path was never exercised. Fixed 2026-07-15 with Android-only density-variant
> assets (`assets/map/android/**`, @3x = byte-copy of the proven bitmaps) behind
> `Platform.OS === "android"` requires — iOS/web keep the assets below unchanged.
> Marker owners now also include `ProviderMarkers.jsx` and `RouteLayer.jsx`. Any future
> marker change MUST be verified on an installed release build (local `assembleRelease`
> rig), not Metro/OTA alone. Full chain, timeline, and rollback:
> [ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md](./ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md)

---

# Hospital Marker Render Rule 2026-05-06

## Outcome

The hospital marker issue was fixed in the staging build once the marker contract matched the real cross-platform render behavior.

Current checkpoint:
- Web hospital marker: `28 x 48`
- Web selected hospital marker: `38 x 64`
- Native hospital marker: `54 x 91`
- Native selected hospital marker: `68 x 114`

Primary owners:
- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)
- [HospitalMarkers.jsx](../../../components/map/HospitalMarkers.jsx)
- [EmergencyHospitalRoutePreview.jsx](../../../components/emergency/intake/EmergencyHospitalRoutePreview.jsx)

Checkpoint ledger:
- [HOSPITAL_MARKER_SIZE_CHECKPOINT.json](./HOSPITAL_MARKER_SIZE_CHECKPOINT.json)

## What Actually Fixed It

The fix was not "just make the markers smaller" or "just tweak JSX props."

The real rule is:

1. Web sizing is code-driven.
   - On web, the map wrapper respects `imageSize`.
   - So web marker scale changes only when the explicit width and height contract changes in code.

2. Native sizing is asset-driven.
   - On Expo native and APK builds, `react-native-maps` image markers use the actual PNG bitmap dimensions as the effective size contract.
   - `imageSize` is not the reliable native sizing authority here.

3. The live `/map` owner is not the only marker owner.
   - The main live owner is `EmergencyLocationPreviewMap.jsx`.
   - But `HospitalMarkers.jsx` and `EmergencyHospitalRoutePreview.jsx` must stay aligned or another map surface will drift later.

## The Secret

The "secret" was to split the contract instead of forcing one fake universal size path:

- Web was fixed by shrinking the explicit `imageSize` contract.
- Native was fixed by enlarging the actual PNG assets to the desired release size.

That is why:
- web changed only when the JSX sizes changed
- Expo and APK changed only when `hospital.png` and `selected_hospital.png` were resized

## Guardrail

When hospital markers change again:

1. Update the web size contract in the live `/map` owner.
2. Resize the native PNG assets if the native build should change.
3. Keep all three hospital-marker owners in sync.
4. Record the rollback command and checkpoint before publishing OTA.

## Rollback

Base checkpoint commit:
- `2afd31c793a315018aa76843190197d0bd50a7e8`

Restore command:

```powershell
git restore --source 2afd31c -- assets/map/hospital.png assets/map/selected_hospital.png components/emergency/intake/EmergencyLocationPreviewMap.jsx components/emergency/intake/EmergencyHospitalRoutePreview.jsx components/map/HospitalMarkers.jsx
```
