#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, "types", "database.ts");

const CONSOLE_ROOT = path.resolve(ROOT, "..", "ivisit-console", "frontend");
const CONSOLE_TYPE_FILE = path.join(CONSOLE_ROOT, "src", "types", "database.ts");
const CONSOLE_SEARCH_SERVICE_FILE = path.join(CONSOLE_ROOT, "src", "services", "searchService.js");

const OUT_DIR = path.join(ROOT, "supabase", "tests", "validation");
const OUT_FILE = path.join(OUT_DIR, "doctors_surface_field_guard_report.json");

const TABLE_NAME = "doctors";
const REQUIRED_ROW_FIELDS = [
  "about",
  "consultation_fee",
  "created_at",
  "current_patients",
  "department",
  "display_id",
  "email",
  "experience",
  "hospital_id",
  "id",
  "image",
  "is_available",
  "is_on_call",
  "license_number",
  "max_patients",
  "name",
  "phone",
  "profile_id",
  "rating",
  "reviews_count",
  "specialization",
  "status",
  "updated_at",
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[doctors-surface-field-guard] FAIL: ${message}`);
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
      message: "app type contract missing doctors table block.",
    });
    return;
  }
  if (!consoleTable) {
    pushViolation(violations, {
      rule: "console_table_missing",
      file: "src/types/database.ts",
      message: "console type contract missing doctors table block.",
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

  const appRelationships = extractObjectByKey(appTable.block, "Relationships", 0)?.block || "";
  const consoleRelationships = extractObjectByKey(consoleTable.block, "Relationships", 0)?.block || "";

  for (const requiredFk of ["doctors_hospital_id_fkey", "doctors_profile_id_fkey"]) {
    if (appRelationships.includes(requiredFk) && !consoleRelationships.includes(requiredFk)) {
      pushViolation(violations, {
        rule: `console_relationship_missing_${requiredFk}`,
        file: "src/types/database.ts",
        line: getLineNumber(consoleContent, consoleTable.start),
        message: `console doctors.Relationships missing ${requiredFk}.`,
      });
    }
  }

  if (consoleRelationships.includes("available_hospitals")) {
    pushViolation(violations, {
      rule: "console_doctors_relationship_noncanonical_available_hospitals",
      file: "src/types/database.ts",
      line: getLineNumber(consoleContent, consoleTable.start),
      message: "console doctors.Relationships must not include available_hospitals relation drift.",
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
            .slice(Math.max(0, match.index - 80), Math.min(content.length, match.index + 180))
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

function validateConsoleDoctorSearch(violations) {
  runRuleChecks(
    CONSOLE_SEARCH_SERVICE_FILE,
    normalizePath(path.relative(CONSOLE_ROOT, CONSOLE_SEARCH_SERVICE_FILE)),
    [
      {
        id: "console_doctor_search_uses_canonical_specialization_field",
        mode: "require",
        pattern: /from\('doctors'\)[\s\S]{0,420}?specialization/g,
        message: "console doctor search must query canonical doctors.specialization.",
      },
      {
        id: "console_doctor_search_uses_hospital_relation_join",
        mode: "require",
        pattern: /from\('doctors'\)[\s\S]{0,420}?hospitals:hospital_id/g,
        message: "console doctor search must use hospital relation join (hospitals:hospital_id).",
      },
      {
        id: "console_doctor_search_no_legacy_specialty_field",
        mode: "forbid",
        pattern: /from\('doctors'\)[\s\S]{0,420}?\bspecialty\b/g,
        message: "console doctor search must not query legacy doctors.specialty field.",
      },
      {
        id: "console_doctor_search_no_legacy_avatar_url_field",
        mode: "forbid",
        pattern: /from\('doctors'\)[\s\S]{0,420}?\bavatar_url\b/g,
        message: "console doctor search must not query non-schema doctors.avatar_url field.",
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
  validateConsoleDoctorSearch(violations);

  const report = {
    generated_at: nowIso(),
    source: "assert_doctors_surface_field_guard.js",
    status: violations.length === 0 ? "pass" : "fail",
    table: TABLE_NAME,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error("[doctors-surface-field-guard] FAIL: field-guard violations detected.");
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[doctors-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log("[doctors-surface-field-guard] PASS: no doctors surface field violations detected.");
  console.log(`[doctors-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
