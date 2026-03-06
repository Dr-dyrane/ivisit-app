#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const filePath = path.join(
	process.cwd(),
	"supabase",
	"migrations",
	"20260219000400_finance.sql"
);

if (!fs.existsSync(filePath)) {
	console.error(`[tip-rpc-sql-guard] Missing canonical migration file: ${filePath}`);
	process.exit(1);
}

const sql = fs.readFileSync(filePath, "utf8");

const forbiddenPatterns = [
	{
		label: "forbidden emergency_requests.organization_id projection",
		regex: /SELECT\s+id\s*,\s*organization_id\s*,\s*hospital_id\s+INTO\s+v_request\s+FROM\s+public\.emergency_requests/gi,
	},
	{
		label: "forbidden v_request.organization_id assignment",
		regex: /v_org_id\s*:=\s*v_request\.organization_id\s*;/gi,
	},
];

const requiredPatterns = [
	{
		label: "required emergency request hospital lookup",
		regex: /SELECT\s+hospital_id\s+INTO\s+v_request_hospital_id\s+FROM\s+public\.emergency_requests/gi,
		minCount: 2, // wallet + cash tip RPCs
	},
	{
		label: "required hospital organization lookup",
		regex: /SELECT\s+organization_id\s+INTO\s+v_org_id\s+FROM\s+public\.hospitals/gi,
		minCount: 2, // wallet + cash tip RPCs
	},
];

const failures = [];

for (const rule of forbiddenPatterns) {
	rule.regex.lastIndex = 0;
	if (rule.regex.test(sql)) {
		failures.push(`forbidden pattern detected: ${rule.label}`);
	}
}

for (const rule of requiredPatterns) {
	rule.regex.lastIndex = 0;
	const matches = sql.match(rule.regex) || [];
	if (matches.length < rule.minCount) {
		failures.push(
			`missing required pattern: ${rule.label} (expected >= ${rule.minCount}, found ${matches.length})`
		);
	}
}

if (failures.length > 0) {
	console.error("[tip-rpc-sql-guard] FAIL");
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log("[tip-rpc-sql-guard] PASS");
