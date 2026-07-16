#!/usr/bin/env node
// ANDROID MARKER DENSITY LAW -- automated guard (read-only; repo tooling only).
//
//   node scripts/assert-marker-density-law.js                 # audit, exit 1 on breach
//   node scripts/assert-marker-density-law.js --ota           # audit in OTA mode (baseline drift is FATAL)
//   node scripts/assert-marker-density-law.js --update-baseline
//   npm run assert:marker-law
//
// WHY THIS EXISTS
// Marker PNGs shipped as single-scale files bucket into res/drawable-mdpi at
// `expo export:embed`. On INSTALLED Android builds react-native-maps loads a
// Marker image= via BitmapDescriptorFactory.fromResource, which treats mdpi
// pixels as dp and multiplies by device density -> ~3x giant markers. Metro
// (http://) and OTA assets (file://) take the OTHER branch of MapMarker.java
// (Fresco, raw pixels), so the defect is INVISIBLE to dev/OTA validation.
//
// The fix is structural: Android-only density variants (1x + @2x + @3x) under
// assets/map/android/**, selected by a `Platform.OS === "android"` ternary at
// each require site. iOS/web keep the original single-scale assets (shared
// variants regressed iOS to tiny in May 2026: beb444fe -> 4acbc0f2 rollback).
//
// THE HARD LAW: density-variant native asset changes are BUILD-ONLY. OTA-ing a
// bundle that references NEW drawable resources to a runtime whose embedded
// builds predate them crashes at map mount:
//   Resources$NotFoundException: Resource ID #0x0 (MapMarker.setImage:370)
// That shipped once (1.0.7.53) and crashed every install at startup.
//
// See docs/audit/map/ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md
//
// This file is repo tooling. It is never imported by app code and never enters
// the JS bundle.
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const ASSET_ROOT_REL = "assets/map";
const ANDROID_ROOT_REL = "assets/map/android";
const BASELINE_REL = "scripts/marker-density-baseline.json";
const AUDIT_DOC = "docs/audit/map/ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md";
const REQUIRED_SCALES = ["@2x", "@3x"];

// A deleted platform fork is a regression, not a refactor. These five sites are
// the known owners of every Android marker require; the guard asserts the set is
// still covered rather than trusting discovery alone.
const REQUIRED_FORK_SITES = [
  "components/map/HospitalMarkers.jsx",
  "components/map/RouteLayer.jsx",
  "components/map/ProviderMarkers.jsx",
  "components/emergency/intake/EmergencyLocationPreviewMap.jsx",
  "components/emergency/intake/EmergencyHospitalRoutePreview.jsx",
];

// Directories that never hold hand-written app source (build output, native
// projects, vendored code). Matched against the repo-relative posix path.
const IGNORED_PREFIXES = [
  ".expo",
  ".git",
  ".next",
  ".tmp",
  ".trae",
  ".vercel",
  "android",
  "artifacts",
  "build",
  "coverage",
  "dist",
  "docs",
  "ios",
  "node_modules",
  "public",
  "scripts",
  "test-results",
  "tmp",
  "web-build",
];
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

const args = process.argv.slice(2);
const MODE_UPDATE_BASELINE = args.includes("--update-baseline");
const MODE_OTA = args.includes("--ota");

const failures = [];
const warnings = [];
const fail = (check, message) => failures.push(`[marker-law] CHECK ${check} FAILED: ${message}`);
const warn = (message) => warnings.push(`[marker-law] WARN: ${message}`);

// ---------------------------------------------------------------------------
// path helpers
// ---------------------------------------------------------------------------
const toPosix = (p) => p.split(path.sep).join("/");
const repoRel = (abs) => toPosix(path.relative(REPO_ROOT, abs));
const repoAbs = (rel) => path.join(REPO_ROOT, rel.split("/").join(path.sep));

const SCALE_RE = /@(\d+(?:\.\d+)?)x(\.[^.]+)$/;
const isScaledPath = (rel) => SCALE_RE.test(rel);
const baseOfScaled = (rel) => rel.replace(SCALE_RE, "$2");
const withScale = (rel, scale) => {
  const ext = path.posix.extname(rel);
  return `${rel.slice(0, -ext.length)}${scale}${ext}`;
};

// ---------------------------------------------------------------------------
// source scanning
// ---------------------------------------------------------------------------
function walkSourceFiles(dirAbs, out) {
  let entries;
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch (_error) {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dirAbs, entry.name);
    const rel = repoRel(abs);
    if (IGNORED_PREFIXES.some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
    if (entry.isDirectory()) {
      walkSourceFiles(abs, out);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(abs);
    }
  }
  return out;
}

// Replace comment BODIES with spaces, preserving byte offsets and newlines, so
// require()/ternary scanning never trips over prose or the rollback snippets in
// the HOSPITAL_MARKER_SIZE_CHECKPOINT block comments. String literals are kept
// intact (they carry the asset paths).
function blankComments(src) {
  let out = "";
  let i = 0;
  let state = "code";
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === "code") {
      if (c === "/" && c2 === "/") { state = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && c2 === "*") { state = "block"; out += "  "; i += 2; continue; }
      if (c === "'" || c === '"' || c === "`") { state = c; out += c; i += 1; continue; }
      out += c; i += 1; continue;
    }
    if (state === "line") {
      if (c === "\n") { state = "code"; out += c; i += 1; continue; }
      out += " "; i += 1; continue;
    }
    if (state === "block") {
      if (c === "*" && c2 === "/") { state = "code"; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : " "; i += 1; continue;
    }
    // inside a string literal: state holds the opening quote character
    if (c === "\\") { out += c + (src[i + 1] || ""); i += 2; continue; }
    if (c === state) { state = "code"; out += c; i += 1; continue; }
    out += c; i += 1;
  }
  return out;
}

// Given the offset just after a ternary "?", return the offset of the matching
// top-level ":" (the end of the Android branch), or -1 if this is not a ternary
// we can prove the shape of.
function findTernaryAlternate(src, from) {
  let depth = 0;
  let nested = 0;
  let i = from;
  let state = "code";
  while (i < src.length) {
    const c = src[i];
    if (state !== "code") {
      if (c === "\\") { i += 2; continue; }
      if (c === state) state = "code";
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { state = c; i += 1; continue; }
    if (c === "(" || c === "[" || c === "{") { depth += 1; i += 1; continue; }
    if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) return -1;
      depth -= 1;
      i += 1;
      continue;
    }
    if (depth === 0) {
      if (c === "?" && (src[i + 1] === "." || src[i + 1] === "?")) { i += 2; continue; }
      if (c === "?") { nested += 1; i += 1; continue; }
      if (c === ":") {
        if (nested === 0) return i;
        nested -= 1;
        i += 1;
        continue;
      }
      if (c === ";") return -1;
    }
    i += 1;
  }
  return -1;
}

// Offset ranges covering the CONSEQUENT of every
//   Platform.OS === "android" ? <android branch> : <default branch>
// ternary in the file. This is the one canonical shape the law allows -- an
// inverted or restructured guard must be re-proved on an installed release
// build before this list is widened.
function androidGuardRanges(masked) {
  const ranges = [];
  const re = /Platform\.OS\s*===\s*(["'])android\1/g;
  let m;
  while ((m = re.exec(masked)) !== null) {
    let i = m.index + m[0].length;
    while (i < masked.length && /\s/.test(masked[i])) i += 1;
    if (masked[i] !== "?") continue;
    const start = i + 1;
    const end = findTernaryAlternate(masked, start);
    if (end === -1) continue;
    ranges.push({ start, end });
  }
  return ranges;
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

function collectMarkerRequires(fileAbs) {
  const src = fs.readFileSync(fileAbs, "utf8");
  const masked = blankComments(src);
  const re = /require\(\s*(["'])([^"'`]*?)\1\s*\)/g;
  const requires = [];
  let m;
  while ((m = re.exec(masked)) !== null) {
    const spec = m[2];
    if (!spec.includes(`${ASSET_ROOT_REL}/`)) continue;
    const resolvedAbs = path.resolve(path.dirname(fileAbs), spec);
    const rel = repoRel(resolvedAbs);
    if (!rel.startsWith(`${ASSET_ROOT_REL}/`)) continue;
    requires.push({
      spec,
      rel,
      index: m.index,
      line: lineOf(masked, m.index),
      isAndroid: rel.startsWith(`${ANDROID_ROOT_REL}/`),
      asset: rel.startsWith(`${ANDROID_ROOT_REL}/`)
        ? rel.slice(ANDROID_ROOT_REL.length + 1)
        : rel.slice(ASSET_ROOT_REL.length + 1),
    });
  }
  return { requires, ranges: androidGuardRanges(masked) };
}

// ---------------------------------------------------------------------------
// asset scanning
// ---------------------------------------------------------------------------
function walkAssets(dirAbs, out) {
  let entries;
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch (_error) {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) walkAssets(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function androidAssetInventory() {
  const rootAbs = repoAbs(ANDROID_ROOT_REL);
  if (!fs.existsSync(rootAbs)) return null;
  const files = walkAssets(rootAbs, []).map((abs) => ({
    rel: toPosix(path.relative(rootAbs, abs)),
    size: fs.statSync(abs).size,
  }));
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return files;
}

// ---------------------------------------------------------------------------
// baseline
// ---------------------------------------------------------------------------
function buildBaseline(inventory) {
  const files = {};
  for (const f of inventory) files[f.rel] = f.size;
  return {
    $comment: [
      "SHIPPED-BUILD MANIFEST for assets/map/android/** -- the OTA-crash tripwire.",
      "Every entry here is a drawable resource that the last SHIPPED build compiled",
      "into res/drawable-*. A bundle that references a marker asset NOT in this",
      "manifest must never reach installs OTA: the resource-name fallback resolves",
      "to id 0 and MapMarker.setImage throws at map mount (the 1.0.7.53 incident).",
      "Adding/renaming/rebuilding an Android marker asset therefore requires a NEW",
      "BUILD + runtime bump, then `node scripts/assert-marker-density-law.js",
      "--update-baseline` committed alongside it.",
      `See ${AUDIT_DOC}`,
    ].join(" "),
    root: ANDROID_ROOT_REL,
    fileCount: inventory.length,
    files,
  };
}

function readBaseline() {
  const abs = repoAbs(BASELINE_REL);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (error) {
    return { __parseError: error.message };
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
  console.log("[marker-law] ANDROID MARKER DENSITY LAW");
  console.log(`[marker-law] authority: ${AUDIT_DOC}`);
  console.log(`[marker-law] mode: ${MODE_UPDATE_BASELINE ? "update-baseline" : MODE_OTA ? "ota (baseline drift is FATAL)" : "audit"}`);

  const inventory = androidAssetInventory();
  if (!inventory) {
    console.error(`[marker-law] CHECK 0 FAILED: ${ANDROID_ROOT_REL}/ does not exist. The Android density set is GONE -- installed builds will render giant markers. See ${AUDIT_DOC}`);
    process.exit(1);
  }

  if (MODE_UPDATE_BASELINE) {
    const baseline = buildBaseline(inventory);
    fs.writeFileSync(repoAbs(BASELINE_REL), `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    console.log(`[marker-law] baseline written: ${BASELINE_REL} (${baseline.fileCount} files)`);
    console.log("[marker-law] Commit this ONLY alongside the build that embeds these drawables.");
    return;
  }

  const diskRels = new Set(inventory.map((f) => f.rel));
  const diskBaseRels = inventory.map((f) => f.rel).filter((rel) => !isScaledPath(rel));

  // -- gather requires across the tree ---------------------------------------
  const sourceFiles = walkSourceFiles(REPO_ROOT, []);
  const sites = new Map();
  for (const abs of sourceFiles) {
    const { requires, ranges } = collectMarkerRequires(abs);
    if (requires.length === 0) continue;
    sites.set(repoRel(abs), { requires, ranges });
  }

  // == CHECK 1: every marker require site is platform-forked ==================
  let androidRequireCount = 0;
  const referencedAndroidAssets = new Set();
  const forkedSites = new Set();

  for (const [file, { requires, ranges }] of sites) {
    const inGuard = (index) => ranges.some((r) => index > r.start && index < r.end);
    const androidAssets = new Set(requires.filter((r) => r.isAndroid).map((r) => r.asset));

    for (const req of requires) {
      if (!req.isAndroid) continue;
      androidRequireCount += 1;
      referencedAndroidAssets.add(req.asset);
      if (!inGuard(req.index)) {
        fail(1, `${file}:${req.line} requires the Android density asset "${req.spec}" WITHOUT a \`Platform.OS === "android" ? ... : ...\` fork. Unforked Android assets ship to iOS/web (May 2026: shared variants regressed iOS to tiny).`);
      } else {
        forkedSites.add(file);
      }
      const plainCounterpart = requires.some((r) => !r.isAndroid && r.asset === req.asset);
      if (!plainCounterpart) {
        fail(1, `${file}:${req.line} forks "${ASSET_ROOT_REL}/android/${req.asset}" for Android but the fork has NO iOS/web branch requiring "${ASSET_ROOT_REL}/${req.asset}". A fork must have both branches.`);
      }
    }

    for (const req of requires) {
      if (req.isAndroid) continue;
      const hasDensitySet = diskRels.has(req.asset);
      if (!hasDensitySet) continue; // not a density-managed marker (e.g. decorative art)
      if (!androidAssets.has(req.asset)) {
        fail(1, `${file}:${req.line} requires the marker "${req.spec}" with NO Android fork, but "${ANDROID_ROOT_REL}/${req.asset}" exists on disk. Installed Android builds would load the mdpi asset via fromResource -> giant marker. Add: Platform.OS === "android" ? require(".../assets/map/android/${req.asset}") : require("${req.spec}")`);
      } else if (inGuard(req.index)) {
        fail(1, `${file}:${req.line} places the single-scale marker "${req.spec}" INSIDE the \`Platform.OS === "android"\` branch. Android must receive the density-variant asset, not the mdpi one.`);
      }
    }
  }

  for (const site of REQUIRED_FORK_SITES) {
    if (!fs.existsSync(repoAbs(site))) {
      fail(1, `known fork site ${site} no longer exists. If it moved, update REQUIRED_FORK_SITES in ${BASELINE_REL.replace("marker-density-baseline.json", "assert-marker-density-law.js")} deliberately -- a silently dropped site is how the defect returns.`);
      continue;
    }
    if (!forkedSites.has(site)) {
      fail(1, `known fork site ${site} has NO guarded Android marker require. The platform fork was dropped -- installed Android builds regress to the giant-marker defect.`);
    }
  }

  // == CHECK 2: the density set is complete (1x + @2x + @3x) =================
  for (const base of diskBaseRels) {
    for (const scale of REQUIRED_SCALES) {
      const variant = withScale(base, scale);
      if (!diskRels.has(variant)) {
        fail(2, `${ANDROID_ROOT_REL}/${base} has no ${scale} sibling (${ANDROID_ROOT_REL}/${variant} is MISSING). An incomplete density set buckets back into drawable-mdpi -> giant markers on installed Android builds.`);
      }
    }
  }
  for (const rel of diskRels) {
    if (!isScaledPath(rel)) continue;
    const base = baseOfScaled(rel);
    if (!diskRels.has(base)) {
      fail(2, `${ANDROID_ROOT_REL}/${rel} is a density variant with no 1x base (${ANDROID_ROOT_REL}/${base} is MISSING). Metro resolves variants from the 1x path; without it the require cannot be written.`);
    }
  }

  // == CHECK 3: reference integrity (no broken refs, no orphans) =============
  for (const [file, { requires }] of sites) {
    for (const req of requires) {
      if (!req.isAndroid) continue;
      if (isScaledPath(req.asset)) {
        fail(3, `${file}:${req.line} requires a SCALED path directly ("${req.spec}"). Requires must name the 1x base; Metro resolves @2x/@3x by bucket.`);
        continue;
      }
      if (!diskRels.has(req.asset)) {
        fail(3, `${file}:${req.line} requires "${req.spec}" but ${ANDROID_ROOT_REL}/${req.asset} does NOT exist on disk. This is the crash class: the resource-name fallback resolves to id 0 -> Resources$NotFoundException at MapMarker.setImage:370.`);
      }
    }
  }
  for (const base of diskBaseRels) {
    if (!referencedAndroidAssets.has(base)) {
      fail(3, `${ANDROID_ROOT_REL}/${base} is an ORPHAN -- it exists on disk (and compiles into res/drawable-*) but no require references it. Either wire it into a platform fork or delete its whole density set.`);
    }
  }

  // == CHECK 4: baseline drift = the OTA-crash tripwire ======================
  const baseline = readBaseline();
  if (!baseline) {
    fail(4, `${BASELINE_REL} is MISSING. Regenerate it from the currently SHIPPED asset set: node scripts/assert-marker-density-law.js --update-baseline`);
  } else if (baseline.__parseError) {
    fail(4, `${BASELINE_REL} is unparseable JSON (${baseline.__parseError}).`);
  } else {
    const baseFiles = baseline.files || {};
    const added = [];
    const removed = [];
    const changed = [];
    for (const f of inventory) {
      if (!(f.rel in baseFiles)) added.push(f.rel);
      else if (baseFiles[f.rel] !== f.size) changed.push(`${f.rel} (${baseFiles[f.rel]} -> ${f.size} bytes)`);
    }
    for (const rel of Object.keys(baseFiles)) {
      if (!diskRels.has(rel)) removed.push(rel);
    }
    const drift = added.length + removed.length + changed.length;
    if (drift > 0) {
      const detail = [
        added.length ? `NEW: ${added.join(", ")}` : null,
        removed.length ? `REMOVED: ${removed.join(", ")}` : null,
        changed.length ? `REBUILT: ${changed.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      if (MODE_OTA) {
        fail(4, `assets/map/android/** DIFFERS from the last shipped build's manifest (${BASELINE_REL}). ${detail}\n` +
          `           OTA IS FORBIDDEN. New/renamed/rebuilt drawables do not exist in the embedded builds of the runtimes you are about to publish to; the resource-name fallback resolves to id 0 and the app CRASHES AT MAP MOUNT (this happened: 1.0.7.53, rolled back on every branch).\n` +
          `           Required path: ship a BUILD, bump the runtime, close the old runtime in SUPPORTED_RUNTIMES, then commit the refreshed baseline (--update-baseline). See ${AUDIT_DOC}`);
      } else {
        warn(`assets/map/android/** differs from ${BASELINE_REL}. ${detail}`);
        warn("This change is BUILD-ONLY. It must NOT be published with `eas update` to any runtime whose embedded builds predate it (--ota mode will refuse). After the build ships: node scripts/assert-marker-density-law.js --update-baseline");
      }
    }
  }

  // -- report ----------------------------------------------------------------
  console.log(`[marker-law] fork sites discovered: ${sites.size} (${androidRequireCount} Android requires)`);
  for (const file of [...sites.keys()].sort()) console.log(`[marker-law]   - ${file}`);
  console.log(`[marker-law] android assets: ${inventory.length} files / ${diskBaseRels.length} markers x (1x + ${REQUIRED_SCALES.join(" + ")})`);
  if (baseline && !baseline.__parseError) {
    console.log(`[marker-law] baseline: ${BASELINE_REL} (${Object.keys(baseline.files || {}).length} files)`);
  }

  for (const w of warnings) console.warn(w);

  if (failures.length > 0) {
    console.error("");
    for (const f of failures) console.error(f);
    console.error("");
    console.error(`[marker-law] ${failures.length} violation(s). The ANDROID MARKER DENSITY LAW is broken.`);
    console.error(`[marker-law] Read ${AUDIT_DOC} before changing anything under ${ANDROID_ROOT_REL}/ or any marker require site.`);
    process.exit(1);
  }

  console.log(`[marker-law] PASS -- checks 1-4 clean${warnings.length ? ` (${warnings.length} warning(s))` : ""}.`);
}

main();
