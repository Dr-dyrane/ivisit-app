---
status: active
owner: architecture
last_updated: 2026-07-16
---

# Build 1.0.9 Backlog — build-required findings (do NOT ship these via OTA)

> Source: 2026-07-16 delivery-classified app defect audit (37 findings; classified matrix
> preserved at claude.ai artifact 83a9c4e8). These six CANNOT ride an `eas update`: they touch
> native modules, `app.config.js`, permissions, or build-time behavior. Shipping any of them
> to runtime 1.0.8 via OTA is the 1.0.7.53 crash class
> (see docs/audit/map/ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md).
>
> RULE: when the 1.0.9 build is cut, this file is the first checklist. B3 + B5 are inert
> build-time guards and MAY land in the repo before the cut (they do not affect OTA exports).

## B1 — No push notification pipeline (feature track)
- **Fact:** no `expo-notifications` in package.json; zero push-token references repo-wide.
  Every notification — including URGENT emergency updates — is foreground-only.
- **Fix:** add expo-notifications + config plugin; register push token to the profile;
  Android channels mapped to NOTIFICATION_PRIORITY; response listener routes through
  `routeNotificationDestination`. Server companion: fan-out on notifications INSERT
  (edge function / trigger) — coordinate with the console repo (audit item N4).
- **Size:** feature, not a patch. Own branch + staging test before the build.

## B2 — Dead native modules compiled into every build
- **Fact:** `react-native-vision-camera` (+ its plugin in app.config.js), `expo-camera`,
  `expo-contacts` are in package.json with ZERO imports under bundled roots; READ_CONTACTS
  permission + NSContactsUsageDescription declared for a feature that does not exist.
- **Fix:** remove all three deps, the vision-camera plugin, READ_CONTACTS,
  NSContactsUsageDescription. KEEP expo-image-picker + mlkit-ocr (real consumers).
- **Win:** smaller binary + fewer store-review questions about unused sensitive permissions.

## B3 — Android Maps API key silently optional (MAY LAND EARLY)
- **Fact:** app.config.js:80-88 spreads the googleMaps config only when the env key exists;
  a build machine with a missing env produces a binary with a BLANK home-screen map, no error.
- **Fix:** throw in app.config.js when `EAS_BUILD_PLATFORM === 'android'` and the key is
  absent. Dev/web unaffected. Build-time only — safe to land any time.

## B4 — Unused sensitive permissions declared
- **Fact:** RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, READ/WRITE_EXTERNAL_STORAGE (legacy) in
  app.config.js:94-98 with no consuming code path (only audio use is playback via expo-av).
- **Fix:** delete the four permissions; on the 1.0.9 release build verify insurance-card
  capture + profile image pick still work (scoped-storage paths).

## B5 — IVISIT_RUNTIME_OVERRIDE unguarded at build time (MAY LAND EARLY)
- **Fact:** app.config.js:43-46 lets IVISIT_RUNTIME_OVERRIDE rewrite `version`. It exists for
  `scripts/ota-publish-dual.js` (expo export). If the env var leaks into an `eas build`, the
  binary is silently version-regressed — reopening the runtime-mismatch/OTA-crash class.
- **Fix:** throw in app.config.js when the var is present during a BUILD (detect
  EAS_BUILD/EAS_BUILD_PLATFORM). Zero effect on ota-publish-dual. Safe to land any time.

## B6 — android.userInterfaceStyle "dark" booby trap
- **Fact:** app.config.js:79 sets android userInterfaceStyle "dark" while top-level says
  "automatic". Without expo-system-ui the android key is a NO-OP today; if anyone installs
  expo-system-ui later, Android silently locks to forced dark.
- **Fix:** decide intent at build cut: delete the key (automatic applies), or install
  expo-system-ui deliberately and document the asymmetry.

## Cross-references
- OTA-safe remediation (running separately): E1..E29 in the classified plan artifact.
- Server-side companions: N1 (delete_user), N2 (insurance storage policy), N3 (reschedule
  self-exclusion), N4 (push fan-out, pairs with B1).
- Repo tooling: T1 (EXPO_PUBLIC_ service-role rename), T2 (marker-density law guard script).
