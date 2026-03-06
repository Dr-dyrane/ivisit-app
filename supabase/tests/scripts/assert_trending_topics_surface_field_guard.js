#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, 'types', 'database.ts');
const APP_GENERATED_TYPE_FILE = path.join(ROOT, 'supabase', 'database.ts');
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const CONSOLE_SRC = path.join(CONSOLE_ROOT, 'src');
const CONSOLE_TYPE_FILE = path.join(CONSOLE_SRC, 'types', 'database.ts');
const CONSOLE_TRENDING_TOPICS_SERVICE_FILE = path.join(
  CONSOLE_SRC,
  'services',
  'trendingTopicsService.js'
);

const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'trending_topics_surface_field_guard_report.json');

const TABLE_NAME = 'trending_topics';
const REQUIRED_RELATIONSHIPS = [];
const ALLOWED_TRENDING_TOPICS_REFERENCERS = new Set([
  'src/types/database.ts',
  'src/services/trendingTopicsService.js',
]);
const ALLOWED_MUTATION_OWNERS = new Set(['src/services/trendingTopicsService.js']);
const EXPECTED_CREATE_FIELDS = ['query', 'category', 'rank'];
const EXPECTED_UPDATE_FIELDS = ['query', 'category', 'rank'];
const TRENDING_RPC_RETURN_EXPECTATION = `update_trending_topics_from_search: { Args: never; Returns: Json }`;

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[trending-topics-surface-field-guard] FAIL: ${message}`);
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

function compareTypeParity(appContent, consoleContent, violations) {
  const appTable = extractTableBlock(appContent, TABLE_NAME);
  const consoleTable = extractTableBlock(consoleContent, TABLE_NAME);

  if (!appTable) {
    pushViolation(violations, {
      rule: 'app_table_missing',
      file: 'types/database.ts',
      message: 'app type contract missing trending_topics table block.',
    });
    return null;
  }
  if (!consoleTable) {
    pushViolation(violations, {
      rule: 'console_table_missing',
      file: 'src/types/database.ts',
      message: 'console type contract missing trending_topics table block.',
    });
    return null;
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

  return {
    appRowFields: extractSectionFields(appTable.block, 'Row'),
    appRelationships: extractRelationshipNames(appTable.block),
    consoleRelationships: extractRelationshipNames(consoleTable.block),
    consoleTypeLine: getLineNumber(consoleContent, consoleTable.start),
  };
}

function compareRelationshipParity(typeParity, violations) {
  if (!typeParity) return;

  const missingInConsole = typeParity.appRelationships.filter(
    (name) => !typeParity.consoleRelationships.includes(name)
  );
  const extraInConsole = typeParity.consoleRelationships.filter(
    (name) => !typeParity.appRelationships.includes(name)
  );

  if (missingInConsole.length > 0) {
    pushViolation(violations, {
      rule: 'console_relationships_missing',
      file: 'src/types/database.ts',
      line: typeParity.consoleTypeLine,
      message: `console ${TABLE_NAME}.Relationships missing entries: ${missingInConsole.join(', ')}`,
    });
  }
  if (extraInConsole.length > 0) {
    pushViolation(violations, {
      rule: 'console_relationships_extra',
      file: 'src/types/database.ts',
      line: typeParity.consoleTypeLine,
      message: `console ${TABLE_NAME}.Relationships has extra entries: ${extraInConsole.join(', ')}`,
    });
  }

  for (const requiredRel of REQUIRED_RELATIONSHIPS) {
    if (!typeParity.appRelationships.includes(requiredRel)) {
      pushViolation(violations, {
        rule: 'app_required_relationship_missing',
        file: 'types/database.ts',
        message: `app ${TABLE_NAME}.Relationships missing required FK: ${requiredRel}`,
      });
    }
    if (!typeParity.consoleRelationships.includes(requiredRel)) {
      pushViolation(violations, {
        rule: 'console_required_relationship_missing',
        file: 'src/types/database.ts',
        line: typeParity.consoleTypeLine,
        message: `console ${TABLE_NAME}.Relationships missing required FK: ${requiredRel}`,
      });
    }
  }
}

function validateRpcReturnParity(appContent, generatedContent, consoleContent, violations) {
  if (!appContent.includes(TRENDING_RPC_RETURN_EXPECTATION)) {
    pushViolation(violations, {
      rule: 'app_trending_rpc_return_mismatch',
      file: 'types/database.ts',
      message: `app types must contain "${TRENDING_RPC_RETURN_EXPECTATION}".`,
    });
  }
  if (!generatedContent.includes(TRENDING_RPC_RETURN_EXPECTATION)) {
    pushViolation(violations, {
      rule: 'generated_trending_rpc_return_mismatch',
      file: 'supabase/database.ts',
      message: `generated app types must contain "${TRENDING_RPC_RETURN_EXPECTATION}".`,
    });
  }
  if (!consoleContent.includes(TRENDING_RPC_RETURN_EXPECTATION)) {
    pushViolation(violations, {
      rule: 'console_trending_rpc_return_mismatch',
      file: 'src/types/database.ts',
      message: `console types must contain "${TRENDING_RPC_RETURN_EXPECTATION}".`,
    });
  }
}

function validateReferenceBoundaries(violations) {
  const tableRefRegex = /['"]trending_topics['"]/;

  const files = listSourceFiles(CONSOLE_SRC);
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!tableRefRegex.test(content)) continue;
    const relFile = normalizePath(path.relative(CONSOLE_ROOT, filePath));
    if (!ALLOWED_TRENDING_TOPICS_REFERENCERS.has(relFile)) {
      pushViolation(violations, {
        rule: 'trending_topics_reference_outside_allowed_surfaces',
        file: relFile,
        line: 1,
        message: 'trending_topics table references must stay within approved type/service surfaces.',
      });
    }
  }
}

function validateQueryColumnsAndMutations(allowedColumns, violations) {
  const fromPattern = String.raw`(?:['"]trending_topics['"]|TABLE_NAME|TRENDING_TOPICS_TABLE)`;
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
    if (!/['"]trending_topics['"]/.test(content)) continue;
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
          rule: 'non_schema_trending_topics_select_columns',
          file: relFile,
          line,
          message: `trending_topics select contains non-canonical columns: ${invalidColumns.join(', ')}`,
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
          rule: 'trending_topics_mutation_outside_allowed_services',
          file: relFile,
          line,
          message: `direct ${TABLE_NAME}.${op} mutation must stay in approved trending topic service lanes.`,
        });
      }
    }
  }
}

function validateAllowlist(name, expectedFields, serviceContent, violations) {
  const regex = new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const match = serviceContent.match(regex);
  if (!match) {
    pushViolation(violations, {
      rule: `${name.toLowerCase()}_missing`,
      file: 'src/services/trendingTopicsService.js',
      message: `trending topics service must declare ${name}.`,
    });
    return;
  }

  const fields = parseQuotedList(match[1]);
  const expected = new Set(expectedFields);
  const seen = new Set();
  const duplicates = [];
  for (const field of fields) {
    if (seen.has(field)) duplicates.push(field);
    seen.add(field);
  }

  const missing = expectedFields.filter((field) => !seen.has(field));
  const extra = fields.filter((field) => !expected.has(field));

  if (duplicates.length > 0) {
    pushViolation(violations, {
      rule: `${name.toLowerCase()}_duplicates`,
      file: 'src/services/trendingTopicsService.js',
      message: `${name} contains duplicate fields: ${duplicates.join(', ')}`,
    });
  }
  if (missing.length > 0) {
    pushViolation(violations, {
      rule: `${name.toLowerCase()}_missing_expected`,
      file: 'src/services/trendingTopicsService.js',
      message: `${name} is missing fields: ${missing.join(', ')}`,
    });
  }
  if (extra.length > 0) {
    pushViolation(violations, {
      rule: `${name.toLowerCase()}_extra_fields`,
      file: 'src/services/trendingTopicsService.js',
      message: `${name} has non-canonical fields: ${extra.join(', ')}`,
    });
  }
}

function validateTrendingTopicsServiceContract(violations) {
  if (!fs.existsSync(CONSOLE_TRENDING_TOPICS_SERVICE_FILE)) {
    pushViolation(violations, {
      rule: 'trending_topics_service_missing',
      file: 'src/services/trendingTopicsService.js',
      message: 'trendingTopicsService.js not found.',
    });
    return;
  }

  const content = fs.readFileSync(CONSOLE_TRENDING_TOPICS_SERVICE_FILE, 'utf8');
  validateAllowlist('TRENDING_TOPIC_CREATE_FIELDS', EXPECTED_CREATE_FIELDS, content, violations);
  validateAllowlist('TRENDING_TOPIC_UPDATE_FIELDS', EXPECTED_UPDATE_FIELDS, content, violations);

  const createFn = extractFunctionBlock(content, 'createTrendingTopic');
  if (!createFn) {
    pushViolation(violations, {
      rule: 'create_trending_topic_missing',
      file: 'src/services/trendingTopicsService.js',
      message: 'createTrendingTopic function is missing.',
    });
  } else {
    if (!/pickAllowedFields\(input,\s*TRENDING_TOPIC_CREATE_FIELDS\)/.test(createFn.block)) {
      pushViolation(violations, {
        rule: 'create_trending_topic_allowlist_missing',
        file: 'src/services/trendingTopicsService.js',
        line: getLineNumber(content, createFn.start),
        message: 'createTrendingTopic must build payload via TRENDING_TOPIC_CREATE_FIELDS allowlist.',
      });
    }
    if (!/payload\.rank\s*=\s*normalizeRank\(/.test(createFn.block)) {
      pushViolation(violations, {
        rule: 'create_trending_topic_rank_normalizer_missing',
        file: 'src/services/trendingTopicsService.js',
        line: getLineNumber(content, createFn.start),
        message: 'createTrendingTopic should normalize rank via normalizeRank.',
      });
    }
  }

  const updateFn = extractFunctionBlock(content, 'updateTrendingTopic');
  if (!updateFn) {
    pushViolation(violations, {
      rule: 'update_trending_topic_missing',
      file: 'src/services/trendingTopicsService.js',
      message: 'updateTrendingTopic function is missing.',
    });
  } else {
    if (/\.\.\.input/.test(updateFn.block)) {
      pushViolation(violations, {
        rule: 'update_trending_topic_spread_forbidden',
        file: 'src/services/trendingTopicsService.js',
        line: getLineNumber(content, updateFn.start),
        message: 'updateTrendingTopic must not spread raw input into update payload.',
      });
    }
    if (!/pickAllowedFields\(input,\s*TRENDING_TOPIC_UPDATE_FIELDS\)/.test(updateFn.block)) {
      pushViolation(violations, {
        rule: 'update_trending_topic_allowlist_missing',
        file: 'src/services/trendingTopicsService.js',
        line: getLineNumber(content, updateFn.start),
        message: 'updateTrendingTopic must build payload via TRENDING_TOPIC_UPDATE_FIELDS allowlist.',
      });
    }
    if (!/payload\.updated_at\s*=\s*new Date\(\)\.toISOString\(\);/.test(updateFn.block)) {
      pushViolation(violations, {
        rule: 'update_trending_topic_updated_at_stamp_missing',
        file: 'src/services/trendingTopicsService.js',
        line: getLineNumber(content, updateFn.start),
        message: 'updateTrendingTopic should stamp payload.updated_at.',
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
  const typeParity = compareTypeParity(appContent, consoleContent, violations);
  compareRelationshipParity(typeParity, violations);
  validateRpcReturnParity(appContent, generatedContent, consoleContent, violations);
  validateReferenceBoundaries(violations);

  const allowedColumns = new Set([...(typeParity?.appRowFields || []), '*']);
  validateQueryColumnsAndMutations(allowedColumns, violations);
  validateTrendingTopicsServiceContract(violations);

  const report = {
    generated_at: nowIso(),
    source: 'assert_trending_topics_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    table: TABLE_NAME,
    required_relationships: REQUIRED_RELATIONSHIPS,
    expected_create_fields: EXPECTED_CREATE_FIELDS,
    expected_update_fields: EXPECTED_UPDATE_FIELDS,
    allowed_columns: Array.from(allowedColumns).sort(),
    rpc_return_expectation: TRENDING_RPC_RETURN_EXPECTATION,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[trending-topics-surface-field-guard] FAIL: violations detected.');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[trending-topics-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log(
    '[trending-topics-surface-field-guard] PASS: no trending_topics surface field violations detected.'
  );
  console.log(`[trending-topics-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
