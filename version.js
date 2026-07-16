// version.js

// Runtime version. This string feeds app.config.js `version` and, via the
// `runtimeVersion.policy = "appVersion"` policy, becomes the OTA COMPATIBILITY KEY:
// an EAS update only reaches installs whose runtime matches this exactly.
// History lesson (82bd5e04 "Revert versions to 1.0.4 for APK compatibility",
// dd47e711 "bump to 1.0.7"): changing this orphans every EXISTING install from
// future OTAs -- so bump it only for a real new build/release (a fresh install),
// never merely to mark an OTA. To mark an OTA on the SAME runtime, use OTA_BUILD.
// 2026-07-15: bumped 1.0.6 -> 1.0.7 to ship a fresh installable build that frees
// Android testers stranded on the frozen 1.0.5 preview APK (see data/update.json).
const VERSION = "1.0.7";

// Release build counter -- DISPLAY-ONLY, never feeds runtimeVersion.
// Monotonic: increments on every release push, whether a native build (`eas build`)
// or an over-the-air update (`npm run ota:bump && eas update`). A tester reads
// `1.0.7.<N>` in Settings and knows a higher N = a fresher fix.
export const OTA_BUILD = 52;

// e.g. "1.0.7.51" -- runtime + build counter, for display surfaces (Settings footer).
export const FULL_VERSION = `${VERSION}.${OTA_BUILD}`;

export default VERSION;
