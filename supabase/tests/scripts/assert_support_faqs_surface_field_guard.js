#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, 'types', 'database.ts');
const APP_GENERATED_TYPE_FILE = path.join(ROOT, 'supabase', 'database.ts');
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const CONSOLE_SRC = path.join(CONSOLE_ROOT, 'src');
const CONSOLE_TYPE_FILE = path.join(CONSOLE_SRC, 'types', 'database.ts');
const CONSOLE_SUPPORT_FAQS_SERVICE_FILE = path.join(
  CONSOLE_SRC,
  'services',
  'supportFaqsService.js'
);

const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'support_faqs_surface_field_guard_report.json');

const TABLE_NAME = 'support_faqs';
const REQUIRED_RELATIONSHIPS = [];
const ALLOWED_SUPPORT_FAQS_REFERENCERS = new Set([
  'src/types/database.ts',
  'src/services/supportFaqsService.js',
]);
const ALLOWED_MUTATION_OWNERS = new Set(['src/services/supportFaqsService.js']);
const EXPECTED_WRITABLE_FIELDS = ['question', 'answer', 'category', 'rank'];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[support-faqs-surface-field-guard] FAIL: ${message}`);
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

function extractArrayByKey(text, key, startPos = 0) {
  const marker = `${key}: [`;
  const markerIndex = text.indexOf(marker, startPos);
  if (markerIndex < 0) return null;

  const openIndex = text.indexOf('[', markerIndex);
  if (openIndex < 0) return null;

  let depth = 0;
  let closeIndex = -1;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '[') depth += 1;
    if (ch === ']') {
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

function extractFunctionBlock(text, functionName) {
  const marker = `export async function ${functionName}`;
  const markerIndex = text.indexOf(marker);
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

function extractRelationshipNames(tableBlock) {
  const relationships = extractArrayByKey(tableBlock, 'Relationships', 0);
  if (!relationships) return [];

  const names = [];
  const regex = /foreignKeyName:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(relationships.block)) !== null) {
    names.push(match[1]);
  }
  return Array.from(new Set(names));
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

function parseTopLevelCsv(input) {
  const items = [];
  let current = '';
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (ch === '(') parenDepth += 1;
    if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (ch === '[') bracketDepth += 1;
    if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (ch === '{') braceDepth += 1;
    if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);

    if (ch === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      if (current.trim()) items.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

function normalizeSelectColumnToken(rawToken) {
  const token = rawToken.trim();
  if (!token || token === '*') return null;
  if (token.includes('(') || token.includes(')')) return null;
  if (token.includes('!')) return null;

  const aliasParts = token.split(':');
  let source = aliasParts[aliasParts.length - 1].trim();
  if (/\s+as\s+/i.test(source)) source = source.split(/\s+as\s+/i)[0].trim();
  if (source.includes('::')) source = source.split('::')[0].trim();
  if (/\s/.test(source)) source = source.split(/\s+/)[0].trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(source)) return null;
  return source;
}

function parseQuotedList(rawList) {
  if (!rawList) return [];
  const fields = [];
  const regex = /'([^']+)'/g;
  let match;
  while ((match = regex.exec(rawList)) !== null) fields.push(match[1]);
  return fields;
}

function compareTypeParity(leftContent, rightContent, rightFileLabel, violations) {
  const leftTable = extractTableBlock(leftContent, TABLE_NAME);
  const rightTable = extractTableBlock(rightContent, TABLE_NAME);

  if (!leftTable) {
    pushViolation(violations, {
      rule: 'left_table_missing',
      file: 'types/database.ts',
      message: 'app canonical type contract missing support_faqs table block.',
    });
    return null;
  }
  if (!rightTable) {
    pushViolation(violations, {
      rule: 'right_table_missing',
      file: rightFileLabel,
      message: `${rightFileLabel} missing support_faqs table block.`,
    });
    return null;
  }

  for (const sectionName of ['Row', 'Insert', 'Update']) {
    const leftFields = extractSectionFields(leftTable.block, sectionName);
    const rightFields = extractSectionFields(rightTable.block, sectionName);

    const missingInRight = leftFields.filter((field) => !rightFields.includes(field));
    const extraInRight = rightFields.filter((field) => !leftFields.includes(field));

    if (missingInRight.length > 0) {
      pushViolation(violations, {
        rule: `${rightFileLabel.replace(/[/.]/g, '_')}_${sectionName.toLowerCase()}_missing_fields`,
        file: rightFileLabel,
        line: getLineNumber(rightContent, rightTable.start),
        message: `${rightFileLabel} ${TABLE_NAME}.${sectionName} missing fields: ${missingInRight.join(', ')}`,
      });
    }
    if (extraInRight.length > 0) {
      pushViolation(violations, {
        rule: `${rightFileLabel.replace(/[/.]/g, '_')}_${sectionName.toLowerCase()}_extra_fields`,
        file: rightFileLabel,
        line: getLineNumber(rightContent, rightTable.start),
        message: `${rightFileLabel} ${TABLE_NAME}.${sectionName} has extra fields: ${extraInRight.join(', ')}`,
      });
    }
  }

  return {
    leftRowFields: extractSectionFields(leftTable.block, 'Row'),
    leftRelationships: extractRelationshipNames(leftTable.block),
    rightRelationships: extractRelationshipNames(rightTable.block),
    rightTypeLine: getLineNumber(rightContent, rightTable.start),
  };
}

function compareRelationshipParity(typeParity, rightFileLabel, violations) {
  if (!typeParity) return;

  const missingInRight = typeParity.leftRelationships.filter(
    (name) => !typeParity.rightRelationships.includes(name)
  );
  const extraInRight = typeParity.rightRelationships.filter(
    (name) => !typeParity.leftRelationships.includes(name)
  );

  if (missingInRight.length > 0) {
    pushViolation(violations, {
      rule: `${rightFileLabel.replace(/[/.]/g, '_')}_relationships_missing`,
      file: rightFileLabel,
      line: typeParity.rightTypeLine,
      message: `${rightFileLabel} ${TABLE_NAME}.Relationships missing entries: ${missingInRight.join(', ')}`,
    });
  }
  if (extraInRight.length > 0) {
    pushViolation(violations, {
      rule: `${rightFileLabel.replace(/[/.]/g, '_')}_relationships_extra`,
      file: rightFileLabel,
      line: typeParity.rightTypeLine,
      message: `${rightFileLabel} ${TABLE_NAME}.Relationships has extra entries: ${extraInRight.join(', ')}`,
    });
  }

  for (const requiredRel of REQUIRED_RELATIONSHIPS) {
    if (!typeParity.leftRelationships.includes(requiredRel)) {
      pushViolation(violations, {
        rule: 'app_required_relationship_missing',
        file: 'types/database.ts',
        message: `app ${TABLE_NAME}.Relationships missing required FK: ${requiredRel}`,
      });
    }
    if (!typeParity.rightRelationships.includes(requiredRel)) {
      pushViolation(violations, {
        rule: `${rightFileLabel.replace(/[/.]/g, '_')}_required_relationship_missing`,
        file: rightFileLabel,
        line: typeParity.rightTypeLine,
        message: `${rightFileLabel} ${TABLE_NAME}.Relationships missing required FK: ${requiredRel}`,
      });
    }
  }
}

function validateReferenceBoundaries(violations) {
  const tableRefRegex = /['"]support_faqs['"]/;
  const files = listSourceFiles(CONSOLE_SRC);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!tableRefRegex.test(content)) continue;
    const relFile = normalizePath(path.relative(CONSOLE_ROOT, filePath));
    if (!ALLOWED_SUPPORT_FAQS_REFERENCERS.has(relFile)) {
      pushViolation(violations, {
        rule: 'support_faqs_reference_outside_allowed_surfaces',
        file: relFile,
        line: 1,
        message: 'support_faqs references must stay within approved type/service surfaces.',
      });
    }
  }
}

function validateQueryColumnsAndMutations(allowedColumns, violations) {
  const fromPattern = String.raw`(?:['"]support_faqs['"]|TABLE_NAME)`;
  const selectRegex = new RegExp(
    String.raw`from\(\s*${fromPattern}\s*\)[\s\S]{0,420}?\.select\(\s*['"]([^'"]*)['"]\s*\)`,
    'g'
  );
  const mutationRegex = new RegExp(
    String.raw`from\(\s*${fromPattern}\s*\)[\s\S]{0,260}?\.(insert|update|upsert|delete)\s*\(`,
    'g'
  );

  const files = listSourceFiles(CONSOLE_SRC);
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!/['"]support_faqs['"]/.test(content)) continue;
    const relFile = normalizePath(path.relative(CONSOLE_ROOT, filePath));

    let selectMatch;
    while ((selectMatch = selectRegex.exec(content)) !== null) {
      const selected = selectMatch[1].trim();
      const line = getLineNumber(content, selectMatch.index);
      if (selected === '*') continue;

      const tokens = parseTopLevelCsv(selected);
      const invalidColumns = [];
      for (const token of tokens) {
        const column = normalizeSelectColumnToken(token);
        if (!column) continue;
        if (!allowedColumns.has(column)) invalidColumns.push(column);
      }

      if (invalidColumns.length > 0) {
        pushViolation(violations, {
          rule: 'non_schema_support_faqs_select_columns',
          file: relFile,
          line,
          message: `support_faqs select contains non-canonical columns: ${invalidColumns.join(', ')}`,
          snippet: selected,
        });
      }
    }

    let mutationMatch;
    while ((mutationMatch = mutationRegex.exec(content)) !== null) {
      const op = mutationMatch[1];
      const line = getLineNumber(content, mutationMatch.index);
      if (!ALLOWED_MUTATION_OWNERS.has(relFile)) {
        pushViolation(violations, {
          rule: 'support_faqs_mutation_outside_allowed_services',
          file: relFile,
          line,
          message: `direct ${TABLE_NAME}.${op} mutation must stay in approved FAQ service lanes.`,
        });
      }
    }
  }
}

function validateSupportFaqServiceContract(violations) {
  if (!fs.existsSync(CONSOLE_SUPPORT_FAQS_SERVICE_FILE)) {
    pushViolation(violations, {
      rule: 'support_faqs_service_missing',
      file: 'src/services/supportFaqsService.js',
      message: 'supportFaqsService.js not found.',
    });
    return;
  }

  const content = fs.readFileSync(CONSOLE_SUPPORT_FAQS_SERVICE_FILE, 'utf8');

  const allowlistMatch = content.match(
    /const\s+SUPPORT_FAQ_WRITABLE_FIELDS\s*=\s*\[([\s\S]*?)\];/
  );
  if (!allowlistMatch) {
    pushViolation(violations, {
      rule: 'support_faq_writable_fields_missing',
      file: 'src/services/supportFaqsService.js',
      message: 'supportFaqsService must declare SUPPORT_FAQ_WRITABLE_FIELDS.',
    });
  } else {
    const fields = parseQuotedList(allowlistMatch[1]);
    const expected = new Set(EXPECTED_WRITABLE_FIELDS);
    const missing = EXPECTED_WRITABLE_FIELDS.filter((field) => !fields.includes(field));
    const extra = fields.filter((field) => !expected.has(field));

    if (missing.length > 0) {
      pushViolation(violations, {
        rule: 'support_faq_writable_fields_missing_expected',
        file: 'src/services/supportFaqsService.js',
        message: `SUPPORT_FAQ_WRITABLE_FIELDS missing fields: ${missing.join(', ')}`,
      });
    }
    if (extra.length > 0) {
      pushViolation(violations, {
        rule: 'support_faq_writable_fields_extra',
        file: 'src/services/supportFaqsService.js',
        message: `SUPPORT_FAQ_WRITABLE_FIELDS has non-canonical fields: ${extra.join(', ')}`,
      });
    }
  }

  const createFn = extractFunctionBlock(content, 'createSupportFAQ');
  if (!createFn) {
    pushViolation(violations, {
      rule: 'create_support_faq_missing',
      file: 'src/services/supportFaqsService.js',
      message: 'createSupportFAQ function is missing.',
    });
  } else {
    if (!/buildSupportFaqPayload\(input,\s*\{\s*forInsert:\s*true\s*\}\)/.test(createFn.block)) {
      pushViolation(violations, {
        rule: 'create_support_faq_payload_builder_missing',
        file: 'src/services/supportFaqsService.js',
        line: getLineNumber(content, createFn.start),
        message: 'createSupportFAQ must use buildSupportFaqPayload(input, { forInsert: true }).',
      });
    }
    if (!/if\s*\(!payload\.question\s*\|\|\s*!payload\.answer\)/.test(createFn.block)) {
      pushViolation(violations, {
        rule: 'create_support_faq_required_field_guard_missing',
        file: 'src/services/supportFaqsService.js',
        line: getLineNumber(content, createFn.start),
        message: 'createSupportFAQ must validate required question/answer.',
      });
    }
  }

  const updateFn = extractFunctionBlock(content, 'updateSupportFAQ');
  if (!updateFn) {
    pushViolation(violations, {
      rule: 'update_support_faq_missing',
      file: 'src/services/supportFaqsService.js',
      message: 'updateSupportFAQ function is missing.',
    });
  } else {
    if (/\.\.\.input/.test(updateFn.block)) {
      pushViolation(violations, {
        rule: 'update_support_faq_spread_forbidden',
        file: 'src/services/supportFaqsService.js',
        line: getLineNumber(content, updateFn.start),
        message: 'updateSupportFAQ must not spread raw input into update payload.',
      });
    }
    if (!/Object\.keys\(payload\)\.length\s*===\s*0/.test(updateFn.block)) {
      pushViolation(violations, {
        rule: 'update_support_faq_empty_payload_guard_missing',
        file: 'src/services/supportFaqsService.js',
        line: getLineNumber(content, updateFn.start),
        message: 'updateSupportFAQ should guard empty payload updates.',
      });
    }
  }
}

function run() {
  if (!fs.existsSync(APP_TYPE_FILE)) fail(`app types file missing: ${APP_TYPE_FILE}`);
  if (!fs.existsSync(APP_GENERATED_TYPE_FILE)) {
    fail(`generated app types file missing: ${APP_GENERATED_TYPE_FILE}`);
  }
  if (!fs.existsSync(CONSOLE_ROOT)) fail(`console frontend path not found: ${CONSOLE_ROOT}`);
  if (!fs.existsSync(CONSOLE_TYPE_FILE)) fail(`console types file missing: ${CONSOLE_TYPE_FILE}`);

  const appContent = fs.readFileSync(APP_TYPE_FILE, 'utf8');
  const generatedContent = fs.readFileSync(APP_GENERATED_TYPE_FILE, 'utf8');
  const consoleContent = fs.readFileSync(CONSOLE_TYPE_FILE, 'utf8');

  const violations = [];
  const consoleParity = compareTypeParity(appContent, consoleContent, 'src/types/database.ts', violations);
  const generatedParity = compareTypeParity(
    appContent,
    generatedContent,
    'supabase/database.ts',
    violations
  );
  compareRelationshipParity(consoleParity, 'src/types/database.ts', violations);
  compareRelationshipParity(generatedParity, 'supabase/database.ts', violations);
  validateReferenceBoundaries(violations);

  const allowedColumns = new Set([...(consoleParity?.leftRowFields || []), '*']);
  validateQueryColumnsAndMutations(allowedColumns, violations);
  validateSupportFaqServiceContract(violations);

  const report = {
    generated_at: nowIso(),
    source: 'assert_support_faqs_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    table: TABLE_NAME,
    required_relationships: REQUIRED_RELATIONSHIPS,
    expected_writable_fields: EXPECTED_WRITABLE_FIELDS,
    allowed_columns: Array.from(allowedColumns).sort(),
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[support-faqs-surface-field-guard] FAIL: violations detected.');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[support-faqs-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log(
    '[support-faqs-surface-field-guard] PASS: no support_faqs surface field violations detected.'
  );
  console.log(`[support-faqs-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
