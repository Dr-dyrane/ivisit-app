#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, 'types', 'database.ts');
const APP_SERVICE_FILE = path.join(ROOT, 'services', 'ambulanceService.js');
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const CONSOLE_TYPE_FILE = path.join(CONSOLE_ROOT, 'src', 'types', 'database.ts');
const CONSOLE_SERVICE_FILE = path.join(CONSOLE_ROOT, 'src', 'services', 'ambulancesService.js');

const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'ambulances_surface_field_guard_report.json');

const TABLE_NAME = 'ambulances';
const REQUIRED_ROW_FIELDS = [
  'base_price',
  'call_sign',
  'created_at',
  'crew',
  'current_call',
  'display_id',
  'eta',
  'hospital_id',
  'id',
  'license_plate',
  'location',
  'organization_id',
  'profile_id',
  'status',
  'type',
  'updated_at',
  'vehicle_number',
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[ambulances-surface-field-guard] FAIL: ${message}`);
  process.exit(1);
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === '\n') line += 1;
  }
  return line;
}

function pushViolation(violations, payload) {
  violations.push({
    rule: payload.rule,
    file: payload.file,
    line: payload.line || 1,
    message: payload.message,
    snippet: payload.snippet || '',
  });
}

function extractObjectByKey(text, key, startPos = 0) {
  const marker = `${key}: {`;
  const markerIndex = text.indexOf(marker, startPos);
  if (markerIndex < 0) return null;

  const openIndex = text.indexOf('{', markerIndex);
  if (openIndex < 0) return null;

  let depth = 0;
  let closeIndex = -1;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
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
    end: closeIndex + 1,
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
      rule: 'app_table_missing',
      file: 'types/database.ts',
      message: 'app type contract missing ambulances table block.',
    });
    return;
  }
  if (!consoleTable) {
    pushViolation(violations, {
      rule: 'console_table_missing',
      file: 'src/types/database.ts',
      message: 'console type contract missing ambulances table block.',
    });
    return;
  }

  const appRowFields = extractSectionFields(appTable.block, 'Row');
  const missingRequired = REQUIRED_ROW_FIELDS.filter((field) => !appRowFields.includes(field));
  if (missingRequired.length > 0) {
    pushViolation(violations, {
      rule: 'app_row_missing_required_canonical_fields',
      file: 'types/database.ts',
      line: getLineNumber(appContent, appTable.start),
      message: `app ${TABLE_NAME}.Row missing canonical fields: ${missingRequired.join(', ')}`,
    });
  }

  for (const sectionName of ['Row', 'Insert', 'Update']) {
    const appFields = extractSectionFields(appTable.block, sectionName);
    const consoleFields = extractSectionFields(consoleTable.block, sectionName);

    const missingInConsole = appFields.filter((field) => !consoleFields.includes(field));
    const extraInConsole = consoleFields.filter((field) => !appFields.includes(field));

    if (missingInConsole.length > 0) {
      pushViolation(violations, {
        rule: `console_${sectionName.toLowerCase()}_missing_fields`,
        file: 'src/types/database.ts',
        line: getLineNumber(consoleContent, consoleTable.start),
        message: `console ${TABLE_NAME}.${sectionName} missing fields: ${missingInConsole.join(', ')}`,
      });
    }
    if (extraInConsole.length > 0) {
      pushViolation(violations, {
        rule: `console_${sectionName.toLowerCase()}_extra_fields`,
        file: 'src/types/database.ts',
        line: getLineNumber(consoleContent, consoleTable.start),
        message: `console ${TABLE_NAME}.${sectionName} has extra fields: ${extraInConsole.join(', ')}`,
      });
    }
  }
}

function runRuleChecks(fullPath, relativeFile, rules, violations) {
  if (!fs.existsSync(fullPath)) {
    pushViolation(violations, {
      rule: 'file_missing',
      file: relativeFile,
      message: `required file missing: ${relativeFile}`,
    });
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const rule of rules) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    const match = regex.exec(content);

    if (rule.mode === 'require') {
      if (!match) {
        pushViolation(violations, {
          rule: rule.id,
          file: relativeFile,
          message: rule.message,
        });
      }
      continue;
    }

    if (rule.mode === 'forbid') {
      if (match) {
        pushViolation(violations, {
          rule: rule.id,
          file: relativeFile,
          line: getLineNumber(content, match.index),
          message: rule.message,
          snippet: content
            .slice(Math.max(0, match.index - 60), Math.min(content.length, match.index + 140))
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 240),
        });
      }
      continue;
    }

    fail(`unsupported rule mode "${rule.mode}" in ${rule.id}`);
  }
}

function validateConsoleValidColumns(violations) {
  const relativeFile = normalizePath(path.relative(CONSOLE_ROOT, CONSOLE_SERVICE_FILE));
  if (!fs.existsSync(CONSOLE_SERVICE_FILE)) {
    pushViolation(violations, {
      rule: 'console_service_missing',
      file: relativeFile,
      message: 'console ambulances service file is missing.',
    });
    return;
  }

  const content = fs.readFileSync(CONSOLE_SERVICE_FILE, 'utf8');
  const listMatch = content.match(/const\s+VALID_COLUMNS\s*=\s*\[([\s\S]*?)\]/m);
  if (!listMatch) {
    pushViolation(violations, {
      rule: 'console_valid_columns_missing',
      file: relativeFile,
      message: 'console ambulances service must declare VALID_COLUMNS whitelist.',
    });
    return;
  }

  const tokens = [];
  const tokenRegex = /'([^']+)'/g;
  let tokenMatch;
  while ((tokenMatch = tokenRegex.exec(listMatch[1])) !== null) {
    tokens.push(tokenMatch[1]);
  }

  const required = ['license_plate', 'current_call', 'profile_id', 'organization_id'];
  const forbidden = ['driver_id', 'currency', 'hospital', 'last_maintenance', 'rating'];

  const missingRequired = required.filter((column) => !tokens.includes(column));
  if (missingRequired.length > 0) {
    pushViolation(violations, {
      rule: 'console_valid_columns_missing_required',
      file: relativeFile,
      line: getLineNumber(content, listMatch.index),
      message: `VALID_COLUMNS missing canonical keys: ${missingRequired.join(', ')}`,
      snippet: listMatch[0].replace(/\s+/g, ' ').trim().slice(0, 240),
    });
  }

  const foundForbidden = forbidden.filter((column) => tokens.includes(column));
  if (foundForbidden.length > 0) {
    pushViolation(violations, {
      rule: 'console_valid_columns_contains_forbidden',
      file: relativeFile,
      line: getLineNumber(content, listMatch.index),
      message: `VALID_COLUMNS contains non-schema keys: ${foundForbidden.join(', ')}`,
      snippet: listMatch[0].replace(/\s+/g, ' ').trim().slice(0, 240),
    });
  }
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

  const appContent = fs.readFileSync(APP_TYPE_FILE, 'utf8');
  const consoleContent = fs.readFileSync(CONSOLE_TYPE_FILE, 'utf8');
  const violations = [];

  compareTypeParity(appContent, consoleContent, violations);

  runRuleChecks(
    APP_SERVICE_FILE,
    normalizePath(path.relative(ROOT, APP_SERVICE_FILE)),
    [
      {
        id: 'app_ambulance_mapper_has_display_id',
        mode: 'require',
        pattern: /\bdisplayId:\s*row\.display_id\b/g,
        message: 'app ambulance mapper must map canonical display_id.',
      },
      {
        id: 'app_ambulance_mapper_has_license_plate',
        mode: 'require',
        pattern: /\blicensePlate:\s*row\.license_plate\b/g,
        message: 'app ambulance mapper must map canonical license_plate.',
      },
      {
        id: 'app_ambulance_mapper_no_non_schema_reads',
        mode: 'forbid',
        pattern: /\brow\.(hospital|last_maintenance|rating)\b/g,
        message: 'app ambulance mapper must not read non-schema ambulance fields.',
      },
    ],
    violations
  );

  runRuleChecks(
    CONSOLE_SERVICE_FILE,
    normalizePath(path.relative(CONSOLE_ROOT, CONSOLE_SERVICE_FILE)),
    [
      {
        id: 'console_ambulance_no_non_schema_payload_writes',
        mode: 'forbid',
        pattern: /\bpayload\.(driver_id|currency|hospital|last_maintenance|rating)\s*=/g,
        message: 'console ambulances payload must not write non-schema ambulance keys.',
      },
    ],
    violations
  );
  validateConsoleValidColumns(violations);

  const report = {
    generated_at: nowIso(),
    source: 'assert_ambulances_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    table: TABLE_NAME,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[ambulances-surface-field-guard] FAIL: field-guard violations detected.');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[ambulances-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[ambulances-surface-field-guard] PASS: no ambulances surface field violations detected.');
  console.log(`[ambulances-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
