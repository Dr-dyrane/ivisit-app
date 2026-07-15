#!/usr/bin/env node
// Increments OTA_BUILD in version.js by 1. Run before every `eas update` push so
// the Settings footer's `1.0.6.<N>` marker advances (50 -> 51 -> ...), letting a
// tester confirm at a glance they are on the newest OTA of the current runtime.
//
//   npm run ota:bump        # 50 -> 51
//
// Display-only: this never touches the leading VERSION string (the OTA runtime key).
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "version.js");
const src = fs.readFileSync(file, "utf8");

const match = src.match(/export const OTA_BUILD = (\d+);/);
if (!match) {
  console.error("[ota:bump] Could not find `export const OTA_BUILD = <n>;` in version.js");
  process.exit(1);
}

const current = parseInt(match[1], 10);
const next = current + 1;
const updated = src.replace(
  /export const OTA_BUILD = \d+;/,
  `export const OTA_BUILD = ${next};`,
);
fs.writeFileSync(file, updated);

const version = (src.match(/const VERSION = "([^"]+)";/) || [])[1] || "?";
console.log(`[ota:bump] OTA_BUILD ${current} -> ${next}  (FULL_VERSION ${version}.${next})`);
console.log(`[ota:bump] Now publish:  eas update --branch <production|staging> --message "..."`);
