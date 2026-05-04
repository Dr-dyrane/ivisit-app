# Map Marker Size Fix Rollback Note

Status: Draft

## Summary

This note records the marker sizing/scale fix for native Android/iOS and web map markers.

### Root cause

- Android native `react-native-maps` markers were being rendered with raw asset images and no explicit size limit, causing excessively large marker pins in the deployed Android build.
- Web marker rendering in `components/map/MapComponents.web.js` supports `imageSize`, but marker consumers were not consistently supplying it.

### Fix applied

- `components/map/HospitalMarkers.jsx`
  - Native mobile markers now render custom marker children with explicit `width`/`height`.
  - Web markers now pass `imageSize` and `image` through the shared `Marker` props.
- `components/map/RouteLayer.jsx`
  - Ambulance markers now use explicit `imageSize` on web.
  - Native mobile ambulance markers now render a fixed-size image child.

### Verification notes

- Code review confirms `MapComponents.web.js` already supports explicit `imageSize`.
- The native fix is consistent with existing marker child rendering patterns in `react-native-maps`.
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
