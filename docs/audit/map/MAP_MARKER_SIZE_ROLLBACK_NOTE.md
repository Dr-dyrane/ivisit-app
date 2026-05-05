# Map Marker Size Fix Rollback Note

Status: Implemented and Published

## Summary

This note records the marker sizing/scale fix for native Android/iOS and web map markers.
Initially, the fix attempted to wrap the `<Image>` inside a sized `<View>` as children of the `<Marker>`. However, due to `react-native-maps` bugs on Android, this led to rendering failures and fallback to giant system 3D map pins when the `image` prop was manipulated.

### Final Resolution: Native Asset Scaling

To flawlessly support React Native Maps on Android and iOS without relying on buggy View-to-Bitmap snapshots, the following steps were taken:

1. **Physical Resizing of Assets**:
   - `assets/map/hospital.png` physically resized to `30x50`
   - `assets/map/selected_hospital.png` physically resized to `38x64`
   - `assets/map/ambulance-sprites/*.png` physically resized to `36x36`
2. **Reverting View Wrappers**:
   - `components/map/HospitalMarkers.jsx` reverted to pass `image={markerImage}` directly.
   - `components/map/RouteLayer.jsx` reverted to pass `image={ambulanceSprite}` directly.
3. **Web Support Maintained**:
   - Web platform still correctly receives and uses `imageSize={markerStyle}` for deterministic DOM sizing.

### Verification notes

- Directly passing `image` to `<Marker>` guarantees flawless bitmap rendering on both iOS and Android.
- The assets are strictly bound to their intended 1x sizes, eliminating any "bulging" or scaling conflicts.

### Rollback / Recovery Instructions

If you need to revert to the raw, high-resolution original assets (e.g. if you plan to use `@2x`/`@3x` suffixes instead of physical 1x resizing), you can easily rollback these changes:

1. **Revert the code**:
   ```bash
   git checkout HEAD~1 components/map/HospitalMarkers.jsx components/map/RouteLayer.jsx
   ```
2. **Revert the images**:
   If you have committed the resized images, you can checkout the previous commit's tree for the `assets/map` folder:
   ```bash
   git checkout HEAD~1 assets/map/
   ```
3. **Republish**:
   ```bash
   npx eas update --branch staging --message "rollback: revert map markers to original state"
   ```
