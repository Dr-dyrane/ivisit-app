#!/usr/bin/env node
// Publish the current JS bundle as an over-the-air update to EVERY supported
// runtime, so no install is orphaned when the app moves to a newer runtime.
//
//   node scripts/ota-publish-dual.js <branch> "<message>"
//   npm run ota:publish-dual -- production "fix: ...."
//
// An `eas update` tags the update with ONE runtime (resolved from app.config
// `version`, appVersion policy). To serve several runtimes you publish once per
// runtime; IVISIT_RUNTIME_OVERRIDE selects it per export without editing files.
// The Settings footer reads the LIVE runtime (expo-updates), so each install shows
// its own "runtime.<OTA_BUILD>" from the same bundle.
//
// Keep SUPPORTED_RUNTIMES in sync with the runtimes whose EMBEDDED builds contain
// every native resource the CURRENT main bundle references.
//
// HARD LAW (2026-07-15, OTA crash incident): runtimes 1.0.7 and 1.0.6 are CLOSED to
// main-code OTAs. Main now requires assets/map/android/* as Android RESOURCES, which
// builds vc31 and older never compiled in -- an OTA from main to those runtimes
// crashes at map mount (Resources$NotFoundException #0x0, MapMarker.setImage:370;
// see docs/audit/map/ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md). If a 1.0.7 hotfix
// is ever needed, publish it from the pre-marker-fix lineage (0aacc6bd), never main.
//
// The HARD LAW above is now MACHINE-ENFORCED: scripts/assert-marker-density-law.js
// runs in --ota mode before any `eas update` and aborts the publish if the Android
// marker asset set drifted from the last shipped build's manifest.
const { execSync, spawnSync } = require("child_process");
const path = require("path");

const SUPPORTED_RUNTIMES = ["1.0.8"];

const [, , branch, ...messageParts] = process.argv;
const message = messageParts.join(" ").trim();

if (!branch || !message) {
  console.error('Usage: node scripts/ota-publish-dual.js <branch> "<message>"');
  process.exit(1);
}

// ANDROID MARKER DENSITY LAW gate -- BEFORE any eas update, never after.
// An OTA that references a drawable the target runtime's embedded build never
// compiled crashes every install at map mount (Resources$NotFoundException #0x0,
// MapMarker.setImage:370). That shipped once as 1.0.7.53 and was rolled back on
// all branches. This gate exists so it cannot ship twice.
{
  const guard = path.join(__dirname, "assert-marker-density-law.js");
  const result = spawnSync(process.execPath, [guard, "--ota"], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("\n[ota:publish-dual] ABORTED before `eas update`: the ANDROID MARKER DENSITY LAW gate failed.");
    console.error("[ota:publish-dual] Nothing was published. Android marker asset changes are BUILD-ONLY --");
    console.error("[ota:publish-dual] ship a build + bump the runtime instead of publishing this bundle OTA.");
    console.error("[ota:publish-dual] Authority: docs/audit/map/ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md");
    process.exit(1);
  }
}

// Staging carries the App-Review demo-auth env; preserve it so review sign-in never regresses.
const stagingEnv =
  branch === "staging"
    ? { EXPO_PUBLIC_REVIEW_DEMO_AUTH_ENABLED: "true", EXPO_PUBLIC_REVIEW_DEMO_AUTH_EMAIL: "support@ivisit.ng" }
    : {};

let failures = 0;
for (const runtime of SUPPORTED_RUNTIMES) {
  console.log(`\n=== eas update -> branch "${branch}" @ runtime ${runtime} ===`);
  try {
    execSync(
      `npx eas update --branch ${branch} --message "${message} [rt ${runtime}]" --non-interactive`,
      {
        stdio: "inherit",
        env: { ...process.env, ...stagingEnv, IVISIT_RUNTIME_OVERRIDE: runtime },
      },
    );
  } catch (error) {
    failures += 1;
    console.error(`[ota:publish-dual] runtime ${runtime} FAILED: ${error.message}`);
  }
}

if (failures) {
  console.error(`\n[ota:publish-dual] ${failures}/${SUPPORTED_RUNTIMES.length} runtime publishes failed.`);
  process.exit(1);
}
console.log(`\n[ota:publish-dual] Served all ${SUPPORTED_RUNTIMES.length} runtimes on "${branch}".`);
