---
status: historical
owner: architecture
last_updated: 2026-07-15
---

# Android Marker Density Audit 2026-07-15

Giant map markers on installed Android builds (Play Store 1.0.7.52, EAS APK/AAB) while
Metro, web, and iOS rendered correctly. Root-caused, reproduced locally, fixed with
Android-only density-variant assets, and verified on the exact failing pipeline.
Amends [HOSPITAL_MARKER_RENDER_RULE_2026-05-06.md](./HOSPITAL_MARKER_RENDER_RULE_2026-05-06.md).

## Symptom

- Hospital pins, provider pins, and ambulance sprites rendered ~2.6-3.5x oversized on
  INSTALLED Android builds only (fresh Play/EAS installs).
- Metro dev on the same physical device: correct. Web: correct. iOS: correct.
- Marker code and PNGs byte-identical since 2026-05-19 — nothing recent caused it.

## Root Cause (mechanical chain, verified)

1. Every marker PNG shipped as a single scale-1 file with no `@2x`/`@3x` siblings
   (hospital 54x91, selected 68x114, 16 sprites 90x90, 16 provider pins).
2. `expo export:embed` buckets scale-1 assets into `res/drawable-mdpi/` — verified in
   the release build output: all 34 marker PNGs in `drawable-mdpi/`, none in `xhdpi+`.
3. On installed builds, `resolveAssetSource` emits a bare resource name, and
   react-native-maps 1.20.1 loads it via `BitmapDescriptorFactory.fromResource`
   (`MapMarker.java:365`) — an Android RESOURCE decode that treats mdpi pixels as dp
   and multiplies by device density: 54x91 -> ~162x273 physical px on a 3x phone.
4. Metro (`http://`) and OTA-downloaded assets (`file://`) take the OTHER branch in the
   same file (`MapMarker.java:351` -> Fresco -> raw pixels, no density scaling). The May
   2026 size contract ("native render size == PNG bitmap size") was calibrated on THIS
   branch — and its "APK validation" was actually republished via `eas update`, i.e.
   the Fresco path. The embedded-resource path was never exercised.
5. The defect stayed latent until the 1.0.7 runtime bump forced the first truly fresh
   embedded installs since May, unmasking it.
6. The app-level `imageSize` prop cannot compensate: it exists only in the app's web
   shim (`MapComponents.web.js`); native react-native-maps has no such prop.

## Why every May fix rolled back (git-hx timeline)

- `a25347cb` / `314a6bfa` (May 4): sized `<View><Image/></View>` Marker children —
  Android fell back to default red pins / "giant system 3D map pins". Rolled back.
- `ca7b74eb` (May 4): PNGs physically resized to 1x — too small on high-DPI Android.
- `beb444fe` (May 4): added `@2x`/`@3x` variants — the CORRECT release-side fix, but
  shared variants made iOS render tiny under the direct `image` prop (`95afcadc`).
- `4acbc0f2` (May 6): THE ROLLBACK — deleted all 36 density variants, restored big
  bitmaps. `afb833ad` then landed the split contract (web code-driven via `imageSize`,
  native asset-driven via physical PNG) — validated on Metro + OTA + web only.
- `93e1358d` (May 7): sprites regenerated to 90x90 under the same law.
- Every attempt was validated on a different pipeline branch than the one it broke.

## The Fix (this run)

Android-only density-variant assets + platform-guarded requires. iOS/web keep the
original single-scale assets untouched (prevents the `95afcadc` iOS-tiny regression
structurally, not procedurally).

- `assets/map/android/**`: 102 files — for each of the 34 markers, a 1x + `@2x`
  (high-quality bicubic downscales) and `@3x` (BYTE-COPY of the proven bitmap, zero
  redrawing). 54x91 -> 18x30/36x61/54x91; 68x114 -> 23x38/45x76/68x114; 90x90 ->
  30x30/60x60/90x90.
- 5 require sites gained `Platform.OS === "android"` ternaries (static requires; Metro
  cannot bundle dynamic paths): `HospitalMarkers.jsx`, `RouteLayer.jsx` (16 sprites),
  `ProviderMarkers.jsx` (16 pins), `EmergencyLocationPreviewMap.jsx`,
  `EmergencyHospitalRoutePreview.jsx`. Each carries an ANDROID MARKER LAW comment.
- Release now buckets the Android set into `drawable-xhdpi` (@2x) and
  `drawable-xxhdpi` (@3x); `fromResource` decodes ~1:1 on ~3x devices.

## Verification (both branches of the split, closing the May gap)

- Local repro rig: `cd android && gradlew.bat app:assembleRelease` (release signing =
  debug keystore) + install on a 420dpi (2.625x) emulator. NO Metro, NO EAS — the
  exact `fromResource` path Play users hit.
- BEFORE: markers mdpi-only; giant red pin beside a normal-size Google blue pin.
- AFTER: `assets_map_android_*` present in `xhdpi` + `xxhdpi`; pin renders at intended
  size beside the same blue pin. Screenshots in session records.
- Metro/iOS/web: no-regression pass (original asset path untouched on those platforms).

## Delivery semantics

- OTA (`eas update`) DELIVERS this fix to existing installs: the asset bytes changed,
  so they are downloaded and served over the Fresco `file://` branch, which selects the
  density-matched variant — correct size there too. Unchanged assets would have been
  deduped to the (broken) embedded copies; that is why merely republishing old assets
  could never fix it.
- Fresh installs inherit the fix in the next `eas build` (embedded buckets).

## Guardrail (supersedes the May guardrail's blind spot)

Any future marker change MUST be validated on an INSTALLED release build (local
`assembleRelease` rig or EAS artifact) — Metro/OTA validation alone is exactly the gap
that let this defect ship latent for two months. Check the density buckets in
`android/app/build/generated/res/createBundleReleaseJsAndAssets/` before installing.

## Rollback

```powershell
# Revert the platform guards + delete the Android variant set:
git restore --source <pre-fix-commit> -- components/map/HospitalMarkers.jsx components/map/RouteLayer.jsx components/map/ProviderMarkers.jsx components/emergency/intake/EmergencyLocationPreviewMap.jsx components/emergency/intake/EmergencyHospitalRoutePreview.jsx
Remove-Item -Recurse -Force assets/map/android
```
Rolling back re-exposes the giant-marker defect on installed Android builds.
