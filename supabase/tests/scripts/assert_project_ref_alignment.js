#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const parseEnvFile = (filepath) => {
	if (!fs.existsSync(filepath)) return {};
	const raw = fs.readFileSync(filepath, "utf8");
	const out = {};
	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf("=");
		if (idx <= 0) continue;
		const key = trimmed.slice(0, idx).trim();
		const value = trimmed.slice(idx + 1).trim();
		out[key] = value;
	}
	return out;
};

const root = process.cwd();
const envLocal = parseEnvFile(path.join(root, ".env.local"));
const envBase = parseEnvFile(path.join(root, ".env"));
const supabaseUrl =
	(process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim() ||
	(envLocal.EXPO_PUBLIC_SUPABASE_URL || "").trim() ||
	(envBase.EXPO_PUBLIC_SUPABASE_URL || "").trim();

if (!supabaseUrl) {
	console.warn(
		"[project-ref-guard] SKIP: EXPO_PUBLIC_SUPABASE_URL not found in process env/.env.local/.env"
	);
	process.exit(0);
}

const urlMatch = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
if (!urlMatch) {
	console.error(
		`[project-ref-guard] FAIL: could not parse project ref from EXPO_PUBLIC_SUPABASE_URL (${supabaseUrl})`
	);
	process.exit(1);
}
const envProjectRef = urlMatch[1];

const linkedRefPath = path.join(root, "supabase", ".temp", "project-ref");
if (!fs.existsSync(linkedRefPath)) {
	console.warn("[project-ref-guard] SKIP: supabase/.temp/project-ref not found (project not linked).");
	process.exit(0);
}
const linkedProjectRef = fs.readFileSync(linkedRefPath, "utf8").trim();

if (!linkedProjectRef) {
	console.warn("[project-ref-guard] SKIP: linked project ref is empty.");
	process.exit(0);
}

if (linkedProjectRef !== envProjectRef) {
	console.error("[project-ref-guard] FAIL: Supabase project mismatch detected.");
	console.error(`- App env URL project ref: ${envProjectRef}`);
	console.error(`- Linked Supabase CLI ref: ${linkedProjectRef}`);
	process.exit(1);
}

console.log(`[project-ref-guard] PASS: project ref aligned (${envProjectRef}).`);
