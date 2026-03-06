const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, 'types', 'database.ts');
const APP_GENERATED_TYPE_FILE = path.join(ROOT, 'supabase', 'database.ts');
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const CONSOLE_SRC = path.join(CONSOLE_ROOT, 'src');
const CONSOLE_TYPE_FILE = path.join(CONSOLE_SRC, 'types', 'database.ts');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');

function nowIso() {
  return new Date().toISOString();
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

function fail(logPrefix, message) {
  console.error(`[${logPrefix}] FAIL: ${message}`);
  process.exit(1);
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

function compareTypeParity({
  leftContent,
  rightContent,
  rightFileLabel,
  tableName,
  violations,
}) {
  const leftTable = extractTableBlock(leftContent, tableName);
  const rightTable = extractTableBlock(rightContent, tableName);

  if (!leftTable) {
    pushViolation(violations, {
      rule: 'left_table_missing',
      file: 'types/database.ts',
      message: `app canonical type contract missing ${tableName} table block.`,
    });
    return null;
  }
  if (!rightTable) {
    pushViolation(violations, {
      rule: 'right_table_missing',
      file: rightFileLabel,
      message: `${rightFileLabel} missing ${tableName} table block.`,
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
        message: `${rightFileLabel} ${tableName}.${sectionName} missing fields: ${missingInRight.join(', ')}`,
      });
    }
    if (extraInRight.length > 0) {
      pushViolation(violations, {
        rule: `${rightFileLabel.replace(/[/.]/g, '_')}_${sectionName.toLowerCase()}_extra_fields`,
        file: rightFileLabel,
        line: getLineNumber(rightContent, rightTable.start),
        message: `${rightFileLabel} ${tableName}.${sectionName} has extra fields: ${extraInRight.join(', ')}`,
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

function compareRelationshipParity({
  typeParity,
  rightFileLabel,
  tableName,
  requiredRelationships,
  violations,
}) {
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
      message: `${rightFileLabel} ${tableName}.Relationships missing entries: ${missingInRight.join(', ')}`,
    });
  }
  if (extraInRight.length > 0) {
    pushViolation(violations, {
      rule: `${rightFileLabel.replace(/[/.]/g, '_')}_relationships_extra`,
      file: rightFileLabel,
      line: typeParity.rightTypeLine,
      message: `${rightFileLabel} ${tableName}.Relationships has extra entries: ${extraInRight.join(', ')}`,
    });
  }

  for (const requiredRel of requiredRelationships) {
    if (!typeParity.leftRelationships.includes(requiredRel)) {
      pushViolation(violations, {
        rule: 'app_required_relationship_missing',
        file: 'types/database.ts',
        message: `app ${tableName}.Relationships missing required FK: ${requiredRel}`,
      });
    }
    if (!typeParity.rightRelationships.includes(requiredRel)) {
      pushViolation(violations, {
        rule: `${rightFileLabel.replace(/[/.]/g, '_')}_required_relationship_missing`,
        file: rightFileLabel,
        line: typeParity.rightTypeLine,
        message: `${rightFileLabel} ${tableName}.Relationships missing required FK: ${requiredRel}`,
      });
    }
  }
}

function validateReferenceBoundaries({
  tableName,
  allowedReferencers,
  violations,
}) {
  const tableRefRegex = new RegExp(`['"]${tableName}['"]`);
  const files = listSourceFiles(CONSOLE_SRC);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!tableRefRegex.test(content)) continue;
    const relFile = normalizePath(path.relative(CONSOLE_ROOT, filePath));
    if (!allowedReferencers.has(relFile)) {
      pushViolation(violations, {
        rule: `${tableName}_reference_outside_allowed_surfaces`,
        file: relFile,
        line: 1,
        message: `${tableName} references must stay within approved type/service surfaces.`,
      });
    }
  }
}

function validateQueryColumnsAndMutations({
  tableName,
  allowedColumns,
  allowedMutationOwners,
  violations,
}) {
  const fromPattern = String.raw`(?:['"]${tableName}['"]|TABLE_NAME)`;
  const selectRegex = new RegExp(
    String.raw`from\(\s*${fromPattern}\s*\)[\s\S]{0,520}?\.select\(\s*['"]([^'"]*)['"]\s*\)`,
    'g'
  );
  const mutationRegex = new RegExp(
    String.raw`from\(\s*${fromPattern}\s*\)[\s\S]{0,320}?\.(insert|update|upsert|delete)\s*\(`,
    'g'
  );

  const files = listSourceFiles(CONSOLE_SRC);
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!new RegExp(`['"]${tableName}['"]`).test(content)) continue;
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
          rule: `non_schema_${tableName}_select_columns`,
          file: relFile,
          line,
          message: `${tableName} select contains non-canonical columns: ${invalidColumns.join(', ')}`,
          snippet: selected,
        });
      }
    }

    let mutationMatch;
    while ((mutationMatch = mutationRegex.exec(content)) !== null) {
      const op = mutationMatch[1];
      const line = getLineNumber(content, mutationMatch.index);
      if (!allowedMutationOwners.has(relFile)) {
        pushViolation(violations, {
          rule: `${tableName}_mutation_outside_allowed_services`,
          file: relFile,
          line,
          message: `direct ${tableName}.${op} mutation must stay in approved service lanes.`,
        });
      }
    }
  }
}

function runSurfaceGuard(options) {
  const {
    tableName,
    reportFileName,
    logPrefix,
    requiredRelationships = [],
    allowedReferencers = [],
    allowedMutationOwners = [],
  } = options;

  if (!tableName || !reportFileName || !logPrefix) {
    fail('table-surface-field-guard-core', 'tableName, reportFileName, and logPrefix are required.');
  }

  if (!fs.existsSync(APP_TYPE_FILE)) fail(logPrefix, `app types file missing: ${APP_TYPE_FILE}`);
  if (!fs.existsSync(APP_GENERATED_TYPE_FILE)) {
    fail(logPrefix, `generated app types file missing: ${APP_GENERATED_TYPE_FILE}`);
  }
  if (!fs.existsSync(CONSOLE_ROOT)) fail(logPrefix, `console frontend path not found: ${CONSOLE_ROOT}`);
  if (!fs.existsSync(CONSOLE_TYPE_FILE)) {
    fail(logPrefix, `console types file missing: ${CONSOLE_TYPE_FILE}`);
  }

  const appContent = fs.readFileSync(APP_TYPE_FILE, 'utf8');
  const generatedContent = fs.readFileSync(APP_GENERATED_TYPE_FILE, 'utf8');
  const consoleContent = fs.readFileSync(CONSOLE_TYPE_FILE, 'utf8');

  const violations = [];
  const consoleParity = compareTypeParity({
    leftContent: appContent,
    rightContent: consoleContent,
    rightFileLabel: 'src/types/database.ts',
    tableName,
    violations,
  });
  const generatedParity = compareTypeParity({
    leftContent: appContent,
    rightContent: generatedContent,
    rightFileLabel: 'supabase/database.ts',
    tableName,
    violations,
  });

  compareRelationshipParity({
    typeParity: consoleParity,
    rightFileLabel: 'src/types/database.ts',
    tableName,
    requiredRelationships,
    violations,
  });
  compareRelationshipParity({
    typeParity: generatedParity,
    rightFileLabel: 'supabase/database.ts',
    tableName,
    requiredRelationships,
    violations,
  });

  validateReferenceBoundaries({
    tableName,
    allowedReferencers: new Set(allowedReferencers),
    violations,
  });

  const allowedColumns = new Set([...(consoleParity?.leftRowFields || []), '*']);
  validateQueryColumnsAndMutations({
    tableName,
    allowedColumns,
    allowedMutationOwners: new Set(allowedMutationOwners),
    violations,
  });

  const report = {
    generated_at: nowIso(),
    source: `${path.basename(reportFileName, '.json')}.js`,
    status: violations.length === 0 ? 'pass' : 'fail',
    table: tableName,
    required_relationships: requiredRelationships,
    allowed_columns: Array.from(allowedColumns).sort(),
    allowed_referencers: allowedReferencers,
    allowed_mutation_owners: allowedMutationOwners,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, reportFileName);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error(`[${logPrefix}] FAIL: violations detected.`);
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[${logPrefix}] Report written: ${outFile}`);
    process.exit(1);
  }

  console.log(`[${logPrefix}] PASS: no ${tableName} surface field violations detected.`);
  console.log(`[${logPrefix}] Report written: ${outFile}`);
}

module.exports = {
  runSurfaceGuard,
};
