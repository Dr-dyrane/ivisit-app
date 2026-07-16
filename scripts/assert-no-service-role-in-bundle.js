#!/usr/bin/env node
// Fail loud if a Supabase SERVICE-ROLE key can reach the shipped JS bundle.
//
// WHY THIS EXISTS
// The service-role key bypasses RLS entirely: it can read and write every row of
// every table for every user. It is currently named with an EXPO_PUBLIC_ prefix
// (EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY), and Expo INLINES the literal value of
// any EXPO_PUBLIC_* variable that bundled code references. So a single innocent
// import inside app/, components/, hooks/, services/ (etc.) would compile the
// master key of the production database into every APK/IPA/OTA bundle, where
// anyone can read it out of the JS.
//
// Today no bundled file references it (audit 2026-07-16, item T1) -- this guard
// keeps that true rather than trusting it to stay true.
//
// SCOPE: bundled roots only. scripts/ and supabase/functions/ run server-side or
// on a maintainer's machine and legitimately use the key; they are not scanned.
//
// THE REAL FIX (needs coordination, not yet done): rename the variable to
// SUPABASE_SERVICE_ROLE_KEY (no EXPO_PUBLIC_ prefix) so Expo cannot inline it
// even if referenced. That requires updating the maintainer's .env/.env.local and
// any EAS secret in step, so it is a deliberate change -- not a silent one. Until
// then, this guard is the safety net.
//
// Usage:
//   node scripts/assert-no-service-role-in-bundle.js
//   npm run assert:no-service-role
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Directories whose contents are bundled by Metro and shipped to devices.
const BUNDLED_ROOTS = [
  "app",
  "atoms",
  "components",
  "constants",
  "contexts",
  "data",
  "hooks",
  "lib",
  "runtime",
  "screens",
  "services",
  "store",
  "utils",
];

const CODE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

// Any env var whose name carries SERVICE_ROLE, and the bare key shape itself.
const FORBIDDEN_PATTERNS = [
  {
    name: "service-role env var reference",
    regex: /process\.env\.[A-Z0-9_]*SERVICE_ROLE[A-Z0-9_]*/g,
  },
  {
    name: "service-role env var via Expo config extra",
    regex: /[A-Za-z0-9_.\[\]"']*SERVICE_ROLE[A-Za-z0-9_"']*/g,
  },
];

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, out);
      continue;
    }
    if (CODE_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
};

const violations = [];

for (const root of BUNDLED_ROOTS) {
  const dir = path.join(ROOT, root);
  if (!fs.existsSync(dir)) continue;

  for (const file of walk(dir)) {
    const source = fs.readFileSync(file, "utf8");
    if (!/SERVICE_ROLE/.test(source)) continue;

    const relative = path.relative(ROOT, file).replace(/\\/g, "/");
    for (const { name, regex } of FORBIDDEN_PATTERNS) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(source)) !== null) {
        const line = source.slice(0, match.index).split("\n").length;
        violations.push({ relative, line, name, text: match[0].trim() });
        break; // one report per pattern per file is enough to fail the build
      }
    }
  }
}

if (violations.length > 0) {
  console.error("[service-role-guard] FAILED: a service-role key reference reached bundled code.\n");
  for (const violation of violations) {
    console.error(`  ${violation.relative}:${violation.line}`);
    console.error(`    ${violation.name}: ${violation.text}`);
  }
  console.error("");
  console.error("  The service-role key BYPASSES RLS -- it can read and write every row of every");
  console.error("  table for every user. EXPO_PUBLIC_* variables are INLINED into the bundle, so");
  console.error("  this reference would ship the production database's master key inside every");
  console.error("  APK/IPA/OTA, readable by anyone who unzips it.");
  console.error("");
  console.error("  Bundled code must use the ANON key via lib/supabase (RLS applies).");
  console.error("  Service-role work belongs in scripts/ or supabase/functions/ (server-side).");
  process.exit(1);
}

console.log(
  `[service-role-guard] PASS -- no service-role reference in ${BUNDLED_ROOTS.length} bundled root(s).`
);
