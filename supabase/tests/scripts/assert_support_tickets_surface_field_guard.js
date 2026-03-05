#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_TYPE_FILE = path.join(ROOT, 'types', 'database.ts');
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const CONSOLE_SRC = path.join(CONSOLE_ROOT, 'src');
const CONSOLE_TYPE_FILE = path.join(CONSOLE_SRC, 'types', 'database.ts');
const CONSOLE_SERVICE_FILE = path.join(CONSOLE_SRC, 'services', 'supportTicketsService.js');

const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'support_tickets_surface_field_guard_report.json');

const TABLE_NAME = 'support_tickets';
const REQUIRED_RELATIONSHIPS = [
  'support_tickets_assigned_to_fkey',
  'support_tickets_organization_id_fkey',
  'support_tickets_user_id_fkey',
];
const EXPECTED_CREATE_FIELDS = [
  'user_id',
  'organization_id',
  'subject',
  'message',
  'category',
  'priority',
  'status',
  'assigned_to',
];
const EXPECTED_UPDATE_FIELDS = [
  'user_id',
  'organization_id',
  'subject',
  'message',
  'category',
  'priority',
  'status',
  'assigned_to',
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[support-tickets-surface-field-guard] FAIL: ${message}`);
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

  if (/\s+as\s+/i.test(source)) {
    source = source.split(/\s+as\s+/i)[0].trim();
  }
  if (source.includes('::')) {
    source = source.split('::')[0].trim();
  }
  if (/\s/.test(source)) {
    source = source.split(/\s+/)[0].trim();
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(source)) return null;
  return source;
}

function compareTypeParity(appContent, consoleContent, violations) {
  const appTable = extractTableBlock(appContent, TABLE_NAME);
  const consoleTable = extractTableBlock(consoleContent, TABLE_NAME);

  if (!appTable) {
    pushViolation(violations, {
      rule: 'app_table_missing',
      file: 'types/database.ts',
      message: 'app type contract missing support_tickets table block.',
    });
    return null;
  }
  if (!consoleTable) {
    pushViolation(violations, {
      rule: 'console_table_missing',
      file: 'src/types/database.ts',
      message: 'console type contract missing support_tickets table block.',
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

function validateQueryColumnsAndMutationBoundaries(allowedColumns, violations) {
  const selectRegex =
    /from\(\s*['"]support_tickets['"]\s*\)[\s\S]{0,420}?\.select\(\s*['"]([^'"]*)['"]\s*\)/g;
  const mutationRegex =
    /from\(\s*['"]support_tickets['"]\s*\)[\s\S]{0,260}?\.(insert|update|upsert|delete)\s*\(/g;
  const canonicalMutationOwner = 'src/services/supportTicketsService.js';

  const files = listSourceFiles(CONSOLE_SRC);
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
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
        if (!allowedColumns.has(column)) {
          invalidColumns.push(column);
        }
      }

      if (invalidColumns.length > 0) {
        pushViolation(violations, {
          rule: 'non_schema_support_tickets_select_columns',
          file: relFile,
          line,
          message: `support_tickets select contains non-canonical columns: ${invalidColumns.join(', ')}`,
          snippet: selected,
        });
      }
    }

    let mutationMatch;
    while ((mutationMatch = mutationRegex.exec(content)) !== null) {
      const op = mutationMatch[1];
      const line = getLineNumber(content, mutationMatch.index);
      if (relFile !== canonicalMutationOwner) {
        pushViolation(violations, {
          rule: 'support_tickets_mutation_outside_service',
          file: relFile,
          line,
          message: `direct ${TABLE_NAME}.${op} mutation must stay in ${canonicalMutationOwner}.`,
        });
      }
    }
  }
}

function parseQuotedList(rawList) {
  if (!rawList) return [];
  const fields = [];
  const regex = /'([^']+)'/g;
  let match;
  while ((match = regex.exec(rawList)) !== null) {
    fields.push(match[1]);
  }
  return fields;
}

function validateAllowlist(name, expectedFields, serviceContent, violations) {
  const regex = new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const match = serviceContent.match(regex);
  if (!match) {
    pushViolation(violations, {
      rule: `${name.toLowerCase()}_missing`,
      file: 'src/services/supportTicketsService.js',
      message: `support tickets service must declare ${name}.`,
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
      file: 'src/services/supportTicketsService.js',
      message: `${name} contains duplicate fields: ${duplicates.join(', ')}`,
    });
  }
  if (missing.length > 0) {
    pushViolation(violations, {
      rule: `${name.toLowerCase()}_missing_expected`,
      file: 'src/services/supportTicketsService.js',
      message: `${name} is missing fields: ${missing.join(', ')}`,
    });
  }
  if (extra.length > 0) {
    pushViolation(violations, {
      rule: `${name.toLowerCase()}_extra_fields`,
      file: 'src/services/supportTicketsService.js',
      message: `${name} has non-canonical fields: ${extra.join(', ')}`,
    });
  }
}

function validateServicePayloadContract(violations) {
  if (!fs.existsSync(CONSOLE_SERVICE_FILE)) {
    pushViolation(violations, {
      rule: 'support_service_missing',
      file: 'src/services/supportTicketsService.js',
      message: 'supportTicketsService.js not found.',
    });
    return;
  }

  const serviceContent = fs.readFileSync(CONSOLE_SERVICE_FILE, 'utf8');

  validateAllowlist(
    'SUPPORT_TICKET_CREATE_FIELDS',
    EXPECTED_CREATE_FIELDS,
    serviceContent,
    violations
  );
  validateAllowlist(
    'SUPPORT_TICKET_UPDATE_FIELDS',
    EXPECTED_UPDATE_FIELDS,
    serviceContent,
    violations
  );

  const createBlock = extractFunctionBlock(serviceContent, 'createSupportTicket');
  if (!createBlock) {
    pushViolation(violations, {
      rule: 'create_support_ticket_missing',
      file: 'src/services/supportTicketsService.js',
      message: 'createSupportTicket function is missing.',
    });
  } else {
    if (/created_at\s*:/.test(createBlock.block)) {
      pushViolation(violations, {
        rule: 'create_support_ticket_created_at_forbidden',
        file: 'src/services/supportTicketsService.js',
        line: getLineNumber(serviceContent, createBlock.start),
        message:
          'createSupportTicket must not set created_at explicitly; DB default should own timestamp.',
      });
    }
    if (/updated_at\s*:/.test(createBlock.block)) {
      pushViolation(violations, {
        rule: 'create_support_ticket_updated_at_forbidden',
        file: 'src/services/supportTicketsService.js',
        line: getLineNumber(serviceContent, createBlock.start),
        message:
          'createSupportTicket must not set updated_at explicitly; DB default/trigger should own timestamp.',
      });
    }
  }

  const updateBlock = extractFunctionBlock(serviceContent, 'updateSupportTicket');
  if (!updateBlock) {
    pushViolation(violations, {
      rule: 'update_support_ticket_missing',
      file: 'src/services/supportTicketsService.js',
      message: 'updateSupportTicket function is missing.',
    });
  } else if (!/payload\.updated_at\s*=/.test(updateBlock.block)) {
    pushViolation(violations, {
      rule: 'update_support_ticket_missing_updated_at_stamp',
      file: 'src/services/supportTicketsService.js',
      line: getLineNumber(serviceContent, updateBlock.start),
      message: 'updateSupportTicket must stamp payload.updated_at before persistence.',
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
  const typeParity = compareTypeParity(appContent, consoleContent, violations);
  compareRelationshipParity(typeParity, violations);

  const allowedColumns = new Set([...(typeParity?.appRowFields || []), '*']);
  validateQueryColumnsAndMutationBoundaries(allowedColumns, violations);
  validateServicePayloadContract(violations);

  const report = {
    generated_at: nowIso(),
    source: 'assert_support_tickets_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    table: TABLE_NAME,
    required_relationships: REQUIRED_RELATIONSHIPS,
    expected_create_fields: EXPECTED_CREATE_FIELDS,
    expected_update_fields: EXPECTED_UPDATE_FIELDS,
    allowed_columns: Array.from(allowedColumns).sort(),
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[support-tickets-surface-field-guard] FAIL: violations detected.');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[support-tickets-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log(
    '[support-tickets-surface-field-guard] PASS: no support_tickets surface field violations detected.'
  );
  console.log(`[support-tickets-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
