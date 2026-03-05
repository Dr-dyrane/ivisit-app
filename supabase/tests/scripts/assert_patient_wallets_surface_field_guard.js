#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, 'types', 'database.ts');
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const CONSOLE_SRC = path.join(CONSOLE_ROOT, 'src');
const CONSOLE_TYPE_FILE = path.join(CONSOLE_SRC, 'types', 'database.ts');

const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'patient_wallets_surface_field_guard_report.json');

const TABLE_NAME = 'patient_wallets';
const EXPECTED_RELATION = 'patient_wallets_user_id_fkey';
const ALLOWED_COLUMNS = new Set([
  'id',
  'display_id',
  'user_id',
  'balance',
  'currency',
  'created_at',
  'updated_at',
  '*',
]);

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[patient-wallets-surface-field-guard] FAIL: ${message}`);
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
    file: normalizePath(payload.file),
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
      message: 'app type contract missing patient_wallets table block.',
    });
    return;
  }
  if (!consoleTable) {
    pushViolation(violations, {
      rule: 'console_table_missing',
      file: 'src/types/database.ts',
      message: 'console type contract missing patient_wallets table block.',
    });
    return;
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

  const relationRegex = new RegExp(
    `foreignKeyName:\\s*"${EXPECTED_RELATION}"[\\s\\S]*?isOneToOne:\\s*(true|false)`,
    'm'
  );
  const appRel = appTable.block.match(relationRegex);
  const consoleRel = consoleTable.block.match(relationRegex);

  if (!appRel) {
    pushViolation(violations, {
      rule: 'app_relation_missing',
      file: 'types/database.ts',
      line: getLineNumber(appContent, appTable.start),
      message: `app ${TABLE_NAME} relationship ${EXPECTED_RELATION} missing.`,
    });
  }
  if (!consoleRel) {
    pushViolation(violations, {
      rule: 'console_relation_missing',
      file: 'src/types/database.ts',
      line: getLineNumber(consoleContent, consoleTable.start),
      message: `console ${TABLE_NAME} relationship ${EXPECTED_RELATION} missing.`,
    });
  }

  if (appRel && consoleRel && appRel[1] !== consoleRel[1]) {
    pushViolation(violations, {
      rule: 'relation_cardinality_mismatch',
      file: 'src/types/database.ts',
      line: getLineNumber(consoleContent, consoleTable.start),
      message: `console ${TABLE_NAME}.${EXPECTED_RELATION} isOneToOne=${consoleRel[1]} but app canonical is ${appRel[1]}.`,
    });
  }
}

function listSourceFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue;
      out.push(full);
    }
  }
  return out;
}

function validateQueryColumns(violations) {
  const selectRegex =
    /from\(\s*['"]patient_wallets['"]\s*\)[\s\S]{0,220}?\.select\(\s*['"]([^'"]*)['"]\s*\)/g;

  const files = listSourceFiles(CONSOLE_SRC);
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = selectRegex.exec(content)) !== null) {
      const selected = match[1].trim();
      const line = getLineNumber(content, match.index);
      if (selected === '*') continue;

      const columns = selected
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const invalid = columns.filter((column) => !ALLOWED_COLUMNS.has(column));
      if (invalid.length > 0) {
        pushViolation(violations, {
          rule: 'non_schema_patient_wallet_select_columns',
          file: path.relative(CONSOLE_ROOT, filePath),
          line,
          message: `patient_wallets select contains non-canonical columns: ${invalid.join(', ')}`,
          snippet: selected,
        });
      }
    }
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
  validateQueryColumns(violations);

  const report = {
    generated_at: nowIso(),
    source: 'assert_patient_wallets_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    table: TABLE_NAME,
    allowed_columns: Array.from(ALLOWED_COLUMNS).sort(),
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[patient-wallets-surface-field-guard] FAIL: violations detected.');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[patient-wallets-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log(
    '[patient-wallets-surface-field-guard] PASS: no patient_wallets surface field violations detected.'
  );
  console.log(`[patient-wallets-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
