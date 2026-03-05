#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, "types", "database.ts");

const CONSOLE_ROOT = path.resolve(ROOT, "..", "ivisit-console", "frontend");
const CONSOLE_TYPE_FILE = path.join(CONSOLE_ROOT, "src", "types", "database.ts");
const CONSOLE_PRICING_SERVICE_FILE = path.join(CONSOLE_ROOT, "src", "services", "pricingService.js");

const OUT_DIR = path.join(ROOT, "supabase", "tests", "validation");
const OUT_FILE = path.join(OUT_DIR, "pricing_surface_field_guard_report.json");

const TABLE_SPECS = [
  {
    table: "service_pricing",
    requiredRowFields: [
      "base_price",
      "created_at",
      "description",
      "hospital_id",
      "id",
      "service_name",
      "service_type",
      "updated_at",
    ],
  },
  {
    table: "room_pricing",
    requiredRowFields: [
      "created_at",
      "description",
      "hospital_id",
      "id",
      "price_per_night",
      "room_name",
      "room_type",
      "updated_at",
    ],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[pricing-surface-field-guard] FAIL: ${message}`);
  process.exit(1);
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

function validatePricingServiceRules(violations) {
  const relativeFile = "src/services/pricingService.js";
  runRuleChecks(
    CONSOLE_PRICING_SERVICE_FILE,
    relativeFile,
    [
      {
        id: "pricing_uses_upsert_service_rpc",
        mode: "require",
        pattern: /rpc\(\s*['"]upsert_service_pricing['"]/g,
        message: "console pricing service must use upsert_service_pricing RPC for service pricing writes.",
      },
      {
        id: "pricing_uses_upsert_room_rpc",
        mode: "require",
        pattern: /rpc\(\s*['"]upsert_room_pricing['"]/g,
        message: "console pricing service must use upsert_room_pricing RPC for room pricing writes.",
      },
      {
        id: "pricing_uses_delete_service_rpc",
        mode: "require",
        pattern: /rpc\(\s*['"]delete_service_pricing['"]/g,
        message: "console pricing service must use delete_service_pricing RPC for service pricing deletes.",
      },
      {
        id: "pricing_uses_delete_room_rpc",
        mode: "require",
        pattern: /rpc\(\s*['"]delete_room_pricing['"]/g,
        message: "console pricing service must use delete_room_pricing RPC for room pricing deletes.",
      },
      {
        id: "pricing_no_direct_service_table_mutations",
        mode: "forbid",
        pattern:
          /from\(\s*['"]service_pricing['"]\s*\)[\s\S]{0,240}?\.(insert|update|upsert|delete)\s*\(/g,
        message: "console pricing service must not mutate service_pricing directly.",
      },
      {
        id: "pricing_no_direct_room_table_mutations",
        mode: "forbid",
        pattern:
          /from\(\s*['"]room_pricing['"]\s*\)[\s\S]{0,240}?\.(insert|update|upsert|delete)\s*\(/g,
        message: "console pricing service must not mutate room_pricing directly.",
      },
      {
        id: "pricing_payload_no_non_schema_currency",
        mode: "forbid",
        pattern: /\bpayload\.currency\s*=/g,
        message: "pricing payload must not write non-schema currency field.",
      },
      {
        id: "pricing_payload_no_non_schema_is_active",
        mode: "forbid",
        pattern: /\bpayload\.is_active\s*=/g,
        message: "pricing payload must not write non-schema is_active field.",
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
  validatePricingServiceRules(violations);

  const report = {
    generated_at: nowIso(),
    source: "assert_pricing_surface_field_guard.js",
    status: violations.length === 0 ? "pass" : "fail",
    tables: TABLE_SPECS.map((spec) => spec.table),
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error("[pricing-surface-field-guard] FAIL: field-guard violations detected.");
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[pricing-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log("[pricing-surface-field-guard] PASS: no pricing surface field violations detected.");
  console.log(`[pricing-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
