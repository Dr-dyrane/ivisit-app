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
// Keep SUPPORTED_RUNTIMES in sync with the runtimes that still have live installs.
// Drop a runtime here once its installs have all migrated to a newer build.
const { execSync } = require("child_process");

const SUPPORTED_RUNTIMES = ["1.0.7", "1.0.6"];

const [, , branch, ...messageParts] = process.argv;
const message = messageParts.join(" ").trim();

if (!branch || !message) {
  console.error('Usage: node scripts/ota-publish-dual.js <branch> "<message>"');
  process.exit(1);
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
