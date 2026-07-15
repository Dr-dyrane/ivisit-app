// version.js

// Runtime version. This string feeds app.config.js `version` and, via the
// `runtimeVersion.policy = "appVersion"` policy, becomes the OTA COMPATIBILITY KEY:
// an EAS update only reaches installs whose runtime matches this exactly.
// History lesson (82bd5e04 "Revert versions to 1.0.4 for APK compatibility",
// dd47e711 "bump to 1.0.7"): bumping this silently orphans every existing install
// from future OTAs. Do NOT change it to mark an OTA build -- use OTA_BUILD below.
const VERSION = "1.0.6";

// OTA build counter -- DISPLAY-ONLY, never feeds runtimeVersion.
// Increments on every `eas update` push (run `npm run ota:bump` first), so a tester
// can read `1.0.6.<N>` in Settings and know they are on the newest over-the-air
// bundle of the current runtime. A higher N = a fresher fix.
export const OTA_BUILD = 50;

// e.g. "1.0.6.50" -- runtime + OTA build, for display surfaces (Settings footer).
export const FULL_VERSION = `${VERSION}.${OTA_BUILD}`;

export default VERSION;
