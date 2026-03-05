#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, "types", "database.ts");
const APP_SERVICE_FILE = path.join(ROOT, "services", "insuranceService.js");

const CONSOLE_ROOT = path.resolve(ROOT, "..", "ivisit-console", "frontend");
const CONSOLE_TYPE_FILE = path.join(CONSOLE_ROOT, "src", "types", "database.ts");
const CONSOLE_SERVICE_FILE = path.join(CONSOLE_ROOT, "src", "services", "insuranceService.js");
const CONSOLE_POLICIES_SERVICE_FILE = path.join(
  CONSOLE_ROOT,
  "src",
  "services",
  "insurancePoliciesService.js"
);

const OUT_DIR = path.join(ROOT, "supabase", "tests", "validation");
const OUT_FILE = path.join(OUT_DIR, "insurance_surface_field_guard_report.json");

const TABLE_SPECS = [
  {
    table: "insurance_policies",
    requiredRowFields: [
      "coverage_details",
      "coverage_percentage",
      "created_at",
      "expires_at",
      "id",
      "is_default",
      "linked_payment_method",
      "plan_type",
      "policy_number",
      "provider_name",
      "starts_at",
      "status",
      "updated_at",
      "user_id",
      "verified",
    ],
  },
  {
    table: "insurance_billing",
    requiredRowFields: [
      "billing_date",
      "claim_number",
      "coverage_percentage",
      "created_at",
      "emergency_request_id",
      "hospital_id",
      "id",
      "insurance_amount",
      "insurance_policy_id",
      "paid_date",
      "status",
      "total_amount",
      "updated_at",
      "user_amount",
      "user_id",
    ],
  },
];

const LEGACY_POLICY_COLUMNS = [
  "group_number",
  "policy_holder_name",
  "front_image_url",
  "back_image_url",
  "coverage_type",
  "policy_type",
  "start_date",
  "end_date",
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[insurance-surface-field-guard] FAIL: ${message}`);
  process.exit(1);
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === "\n") line += 1;
  }
  return line;
}

function pushViolation(violations, payload) {
  violations.push({
    rule: payload.rule,
    file: payload.file,
    line: payload.line || 1,
    message: payload.message,
    snippet: payload.snippet || "",
  });
}

function extractObjectByKey(text, key, startPos = 0) {
  const marker = `${key}: {`;
  const markerIndex = text.indexOf(marker, startPos);
  if (markerIndex < 0) return null;

  const openIndex = text.indexOf("{", markerIndex);
  if (openIndex < 0) return null;

  let depth = 0;
  let closeIndex = -1;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        closeIndex = i;
        break;
      }
    }
  }
  if (closeIndex < 0) return null;

  return {
    start: markerIndex,
    block: text.slice(markerIndex, closeIndex + 1),
  };
}

function extractTableBlock(text, tableName) {
  const index = text.indexOf(`      ${tableName}: {`);
  if (index < 0) return null;
  return extractObjectByKey(text, tableName, Math.max(0, index - 8));
}

function extractSectionFields(tableBlock, sectionName) {
  const section = extractObjectByKey(tableBlock, sectionName, 0);
  if (!section) return [];
  const fields = [];
  const regex = /^\s{10}([a-zA-Z0-9_]+)\??:/gm;
  let match;
  while ((match = regex.exec(section.block)) !== null) {
    fields.push(match[1]);
  }
  return Array.from(new Set(fields));
}

function compareTypeParity(appContent, consoleContent, tableSpec, violations) {
  const tableName = tableSpec.table;
  const appTable = extractTableBlock(appContent, tableName);
  const consoleTable = extractTableBlock(consoleContent, tableName);

  if (!appTable) {
    pushViolation(violations, {
      rule: "app_table_missing",
      file: "types/database.ts",
      message: `app type contract missing ${tableName} table block.`,
    });
    return;
  }
  if (!consoleTable) {
    pushViolation(violations, {
      rule: "console_table_missing",
      file: "src/types/database.ts",
      message: `console type contract missing ${tableName} table block.`,
    });
    return;
  }

  const appRowFields = extractSectionFields(appTable.block, "Row");
  const missingRequired = tableSpec.requiredRowFields.filter((field) => !appRowFields.includes(field));
  if (missingRequired.length > 0) {
    pushViolation(violations, {
      rule: "app_row_missing_required_canonical_fields",
      file: "types/database.ts",
      line: getLineNumber(appContent, appTable.start),
      message: `app ${tableName}.Row missing canonical fields: ${missingRequired.join(", ")}`,
    });
  }

  for (const sectionName of ["Row", "Insert", "Update"]) {
    const appFields = extractSectionFields(appTable.block, sectionName);
    const consoleFields = extractSectionFields(consoleTable.block, sectionName);

    const missingInConsole = appFields.filter((field) => !consoleFields.includes(field));
    const extraInConsole = consoleFields.filter((field) => !appFields.includes(field));

    if (missingInConsole.length > 0) {
      pushViolation(violations, {
        rule: `console_${tableName}_${sectionName.toLowerCase()}_missing_fields`,
        file: "src/types/database.ts",
        line: getLineNumber(consoleContent, consoleTable.start),
        message: `console ${tableName}.${sectionName} missing fields: ${missingInConsole.join(", ")}`,
      });
    }
    if (extraInConsole.length > 0) {
      pushViolation(violations, {
        rule: `console_${tableName}_${sectionName.toLowerCase()}_extra_fields`,
        file: "src/types/database.ts",
        line: getLineNumber(consoleContent, consoleTable.start),
        message: `console ${tableName}.${sectionName} has extra fields: ${extraInConsole.join(", ")}`,
      });
    }
  }
}

function runRuleChecks(fullPath, relativeFile, rules, violations) {
  if (!fs.existsSync(fullPath)) {
    pushViolation(violations, {
      rule: "file_missing",
      file: relativeFile,
      message: `required file missing: ${relativeFile}`,
    });
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  for (const rule of rules) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    const match = regex.exec(content);

    if (rule.mode === "require") {
      if (!match) {
        pushViolation(violations, {
          rule: rule.id,
          file: relativeFile,
          message: rule.message,
        });
      }
      continue;
    }

    if (rule.mode === "forbid") {
      if (match) {
        pushViolation(violations, {
          rule: rule.id,
          file: relativeFile,
          line: getLineNumber(content, match.index),
          message: rule.message,
          snippet: content
            .slice(Math.max(0, match.index - 80), Math.min(content.length, match.index + 160))
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 280),
        });
      }
      continue;
    }

    fail(`unsupported rule mode "${rule.mode}" in ${rule.id}`);
  }
}

function validateLegacyMutationShape(violations) {
  const targets = [
    {
      path: APP_SERVICE_FILE,
      rel: normalizePath(path.relative(ROOT, APP_SERVICE_FILE)),
    },
    {
      path: CONSOLE_SERVICE_FILE,
      rel: normalizePath(path.relative(CONSOLE_ROOT, CONSOLE_SERVICE_FILE)),
    },
  ];

  const joinedLegacy = LEGACY_POLICY_COLUMNS.join("|");
  const directMutationPattern = new RegExp(
    `from\\(\\s*['"]insurance_policies['"]\\s*\\)[\\s\\S]{0,280}?\\.(insert|update|upsert)\\s*\\(\\s*\\{[\\s\\S]{0,300}?(?:${joinedLegacy})\\s*:`,
    "g"
  );
  const payloadLegacyAssignPattern = new RegExp(
    `\\bpayload\\.(?:${joinedLegacy})\\s*=`,
    "g"
  );

  for (const target of targets) {
    runRuleChecks(
      target.path,
      target.rel,
      [
        {
          id: "insurance_payload_builder_present",
          mode: "require",
          pattern: /function\s+buildInsuranceWritePayload\s*\(/g,
          message: "insurance service must use buildInsuranceWritePayload for canonical writes.",
        },
        {
          id: "insurance_no_legacy_direct_mutation_shape",
          mode: "forbid",
          pattern: directMutationPattern,
          message:
            "insurance policies insert/update payload must not write legacy columns directly.",
        },
        {
          id: "insurance_no_legacy_payload_assignments",
          mode: "forbid",
          pattern: payloadLegacyAssignPattern,
          message: "payload.* must not assign legacy top-level insurance policy columns.",
        },
      ],
      violations
    );
  }

  runRuleChecks(
    CONSOLE_POLICIES_SERVICE_FILE,
    normalizePath(path.relative(CONSOLE_ROOT, CONSOLE_POLICIES_SERVICE_FILE)),
    [
      {
        id: "console_get_user_policies_normalized",
        mode: "require",
        pattern: /return\s*\(data\s*\|\|\s*\[\]\)\.map\(normalizeInsurancePolicy\)/g,
        message: "console getUserInsurancePolicies must normalize rows for alias compatibility.",
      },
    ],
    violations
  );
}

function run() {
  if (!fs.existsSync(APP_TYPE_FILE)) {
    fail(`app types file missing: ${APP_TYPE_FILE}`);
  }
  if (!fs.existsSync(CONSOLE_ROOT)) {
    fail(`console frontend path not found: ${CONSOLE_ROOT}`);
  }
  if (!fs.existsSync(CONSOLE_TYPE_FILE)) {
    fail(`console types file missing: ${CONSOLE_TYPE_FILE}`);
  }

  const appContent = fs.readFileSync(APP_TYPE_FILE, "utf8");
  const consoleContent = fs.readFileSync(CONSOLE_TYPE_FILE, "utf8");
  const violations = [];

  for (const tableSpec of TABLE_SPECS) {
    compareTypeParity(appContent, consoleContent, tableSpec, violations);
  }
  validateLegacyMutationShape(violations);

  const report = {
    generated_at: nowIso(),
    source: "assert_insurance_surface_field_guard.js",
    status: violations.length === 0 ? "pass" : "fail",
    tables: TABLE_SPECS.map((spec) => spec.table),
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error("[insurance-surface-field-guard] FAIL: field-guard violations detected.");
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[insurance-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log("[insurance-surface-field-guard] PASS: no insurance surface field violations detected.");
  console.log(`[insurance-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
