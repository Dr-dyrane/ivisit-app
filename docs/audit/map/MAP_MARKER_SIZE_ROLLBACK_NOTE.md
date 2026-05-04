# Map Marker Size Fix Rollback Note

Status: Draft

## Summary

This note records the marker sizing/scale fix for native Android/iOS and web map markers.

### Root cause

- Android native `react-native-maps` markers were being rendered with raw asset images and no explicit size limit, causing excessively large marker pins in the deployed Android build.
- Web marker rendering in `components/map/MapComponents.web.js` supports `imageSize`, but marker consumers were not consistently supplying it.
- **Additional issue discovered**: Web `buildResolvedMarkerIcon` function was overriding explicit `imageSize` props with its own scaling logic, causing markers to be larger than intended.
- **Android-specific issue**: Native markers may still use default marker images even when children are provided, causing scaling conflicts.

### Fix applied

- `components/map/HospitalMarkers.jsx`
  - Native mobile markers now render custom marker children with explicit `width`/`height`.
  - Web markers now pass `imageSize` and `image` through the shared `Marker` props.
  - Added `image={null}` to explicitly disable default marker images on native platforms.
  - Moved sizing from Image to View wrapper with Image filling 100% of container.
- `components/map/RouteLayer.jsx`
  - Ambulance markers now use explicit `imageSize` on web.
  - Native mobile ambulance markers now render a fixed-size image child.
  - Added `image={null}` for native markers.
- `components/map/MapComponents.web.js`
  - Modified `buildResolvedMarkerIcon` to respect explicit `imageSize` when provided, preventing unwanted scaling.

### Verification notes

- Code review confirms `MapComponents.web.js` already supports explicit `imageSize`.
- The native fix is consistent with existing marker child rendering patterns in `react-native-maps`.
- The web fix ensures `imageSize` props are honored over automatic scaling.
- A staging OTA should now be safe to publish once the code has been validated by local tests.

### Git snapshot

- branch: `main`
- HEAD: `28dea4b`

## EAS update

This environment cannot execute `eas update` because it lacks remote Expo credentials and network access.

To publish this fix to staging, run locally from the `ivisit-app` repo:

```bash
git checkout main
git pull origin main
npm install
npm run lint
npm run test
npx eas update --branch staging --message "fix(map): normalize marker sizing for native + web"
```

Then verify the latest update with:

```bash
eas update:list --branch staging
```

## App link / applink note

- After the OTA is published, update the appropriate app link file or `appLinks.ts` entry if your release workflow requires a new staging `exp://` or `u.expo.dev` group URL.
- This file does not contain the new OTA URL because the update could not be published from this environment.
