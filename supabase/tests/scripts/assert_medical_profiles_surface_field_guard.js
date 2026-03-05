#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, "types", "database.ts");
const APP_SERVICE_FILE = path.join(ROOT, "services", "medicalProfileService.js");

const CONSOLE_ROOT = path.resolve(ROOT, "..", "ivisit-console", "frontend");
const CONSOLE_TYPE_FILE = path.join(CONSOLE_ROOT, "src", "types", "database.ts");
const CONSOLE_SERVICE_FILE = path.join(CONSOLE_ROOT, "src", "services", "medicalProfilesService.js");

const OUT_DIR = path.join(ROOT, "supabase", "tests", "validation");
const OUT_FILE = path.join(OUT_DIR, "medical_profiles_surface_field_guard_report.json");

const TABLE_NAME = "medical_profiles";
const REQUIRED_ROW_FIELDS = [
  "allergies",
  "blood_type",
  "conditions",
  "created_at",
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relationship",
  "emergency_notes",
  "insurance_policy_number",
  "insurance_provider",
  "medications",
  "organ_donor",
  "updated_at",
  "user_id",
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[medical-profiles-surface-field-guard] FAIL: ${message}`);
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

function compareTypeParity(appContent, consoleContent, violations) {
  const appTable = extractTableBlock(appContent, TABLE_NAME);
  const consoleTable = extractTableBlock(consoleContent, TABLE_NAME);

  if (!appTable) {
    pushViolation(violations, {
      rule: "app_table_missing",
      file: "types/database.ts",
      message: "app type contract missing medical_profiles table block.",
    });
    return;
  }
  if (!consoleTable) {
    pushViolation(violations, {
      rule: "console_table_missing",
      file: "src/types/database.ts",
      message: "console type contract missing medical_profiles table block.",
    });
    return;
  }

  const appRowFields = extractSectionFields(appTable.block, "Row");
  const missingRequired = REQUIRED_ROW_FIELDS.filter((field) => !appRowFields.includes(field));
  if (missingRequired.length > 0) {
    pushViolation(violations, {
      rule: "app_row_missing_required_canonical_fields",
      file: "types/database.ts",
      line: getLineNumber(appContent, appTable.start),
      message: `app ${TABLE_NAME}.Row missing canonical fields: ${missingRequired.join(", ")}`,
    });
  }

  for (const sectionName of ["Row", "Insert", "Update"]) {
    const appFields = extractSectionFields(appTable.block, sectionName);
    const consoleFields = extractSectionFields(consoleTable.block, sectionName);

    const missingInConsole = appFields.filter((field) => !consoleFields.includes(field));
    const extraInConsole = consoleFields.filter((field) => !appFields.includes(field));

    if (missingInConsole.length > 0) {
      pushViolation(violations, {
        rule: `console_${sectionName.toLowerCase()}_missing_fields`,
        file: "src/types/database.ts",
        line: getLineNumber(consoleContent, consoleTable.start),
        message: `console ${TABLE_NAME}.${sectionName} missing fields: ${missingInConsole.join(", ")}`,
      });
    }
    if (extraInConsole.length > 0) {
      pushViolation(violations, {
        rule: `console_${sectionName.toLowerCase()}_extra_fields`,
        file: "src/types/database.ts",
        line: getLineNumber(consoleContent, consoleTable.start),
        message: `console ${TABLE_NAME}.${sectionName} has extra fields: ${extraInConsole.join(", ")}`,
      });
    }
  }

  const appRelationships = extractObjectByKey(appTable.block, "Relationships", 0);
  const consoleRelationships = extractObjectByKey(consoleTable.block, "Relationships", 0);
  const appHasFk = appRelationships?.block.includes("medical_profiles_user_id_fkey");
  const consoleHasFk = consoleRelationships?.block.includes("medical_profiles_user_id_fkey");
  if (appHasFk && !consoleHasFk) {
    pushViolation(violations, {
      rule: "console_relationship_missing_medical_profiles_user_id_fkey",
      file: "src/types/database.ts",
      line: getLineNumber(consoleContent, consoleTable.start),
      message: "console medical_profiles.Relationships missing medical_profiles_user_id_fkey.",
    });
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

function validateServices(violations) {
  runRuleChecks(
    CONSOLE_SERVICE_FILE,
    normalizePath(path.relative(CONSOLE_ROOT, CONSOLE_SERVICE_FILE)),
    [
      {
        id: "console_medical_payload_builder_present",
        mode: "require",
        pattern: /function\s+buildMedicalProfilePayload\s*\(/g,
        message: "console medical profiles service must use buildMedicalProfilePayload.",
      },
      {
        id: "console_medical_update_no_input_spread",
        mode: "forbid",
        pattern: /\{\s*\.\.\.input[\s\S]{0,80}?updated_at/g,
        message: "console medical profile update payload must not spread raw input.",
      },
      {
        id: "console_medical_no_non_schema_writes",
        mode: "forbid",
        pattern: /\bpayload\.(surgeries|notes|bloodType|insuranceProvider|insurancePolicyNumber)\s*=/g,
        message: "console medical profile payload must not assign non-schema fields.",
      },
    ],
    violations
  );

  runRuleChecks(
    APP_SERVICE_FILE,
    normalizePath(path.relative(ROOT, APP_SERVICE_FILE)),
    [
      {
        id: "app_medical_update_uses_upsert",
        mode: "require",
        pattern: /from\('medical_profiles'\)\s*\.upsert\(/g,
        message: "app medical profile service update path should upsert by user_id.",
      },
      {
        id: "app_medical_no_non_schema_payload_writes",
        mode: "forbid",
        pattern: /\bdbPayload\.(surgeries|notes|bloodType|insuranceProvider|insurancePolicyNumber)\s*=/g,
        message: "app medical profile dbPayload must not write non-schema fields.",
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

  compareTypeParity(appContent, consoleContent, violations);
  validateServices(violations);

  const report = {
    generated_at: nowIso(),
    source: "assert_medical_profiles_surface_field_guard.js",
    status: violations.length === 0 ? "pass" : "fail",
    table: TABLE_NAME,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error("[medical-profiles-surface-field-guard] FAIL: field-guard violations detected.");
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[medical-profiles-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log("[medical-profiles-surface-field-guard] PASS: no medical_profiles surface field violations detected.");
  console.log(`[medical-profiles-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
