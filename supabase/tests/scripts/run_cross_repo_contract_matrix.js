#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[cross-repo-contract-matrix] Missing Supabase credentials (.env/.env.local).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ROOT = process.cwd();
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend', 'src');
const APP_SCAN_DIRS = ['app', 'screens', 'services', 'contexts', 'components', 'providers', 'hooks'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const TYPES_CANDIDATES = [
  path.join(ROOT, 'supabase', 'database.ts'),
  path.join(ROOT, 'types', 'database.ts'),
  path.join(ROOT, 'supabase', 'database.types.ts'),
  path.join(CONSOLE_ROOT, '..', 'supabase_types.ts'),
];

const TABLE_REGEX = /\.from\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g;
const RPC_REGEX = /\.rpc\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
const FILTER_COLUMN_REGEX = /\.(?:eq|neq|gt|gte|lt|lte|ilike|like|in|contains|containedBy|overlaps|order|is|not)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
const SELECT_LITERAL_REGEX = /\.select\s*\(\s*(['"`])([\s\S]*?)\1/g;
const REALTIME_TABLE_REGEX =
  /postgres_changes[\s\S]{0,400}?table\s*:\s*['"`]([a-zA-Z0-9_]+)['"`]/g;

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (EXTENSIONS.has(path.extname(entry.name))) {
        out.push(abs);
      }
    }
  }
  return out;
}

function indexToLine(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function splitTopLevelComma(input) {
  const items = [];
  let current = '';
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let quote = null;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    current += ch;

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') depthParen += 1;
    if (ch === ')') depthParen = Math.max(0, depthParen - 1);
    if (ch === '[') depthBracket += 1;
    if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
    if (ch === '{') depthBrace += 1;
    if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);

    if (ch === ',' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      items.push(current.slice(0, -1));
      current = '';
    }
  }
  if (current.trim()) items.push(current);
  return items;
}

function normalizeSelectToken(token) {
  let item = (token || '').trim();
  if (!item || item === '*') return null;
  if (item.includes('(')) return null;
  if (item.includes(':')) {
    item = item.split(':').pop().trim();
  }
  if (item.includes('->')) {
    item = item.split('->')[0].trim();
  }
  item = item.replace(/["'`]/g, '').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item)) return null;
  return item;
}

function extractSelectColumns(windowText) {
  const columns = [];
  const re = new RegExp(SELECT_LITERAL_REGEX.source, 'g');
  let match;
  while ((match = re.exec(windowText)) !== null) {
    const body = match[2] || '';
    const parts = splitTopLevelComma(body);
    for (const part of parts) {
      const normalized = normalizeSelectToken(part);
      if (normalized) columns.push(normalized);
    }
  }
  return columns;
}

function extractStatementWindow(sourceText, fromIndex, maxLength = 2500) {
  const hardEnd = Math.min(sourceText.length, fromIndex + maxLength);
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let quote = null;
  let escaped = false;

  for (let i = fromIndex; i < hardEnd; i += 1) {
    const ch = sourceText[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') depthParen += 1;
    if (ch === ')') depthParen = Math.max(0, depthParen - 1);
    if (ch === '[') depthBracket += 1;
    if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
    if (ch === '{') depthBrace += 1;
    if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);

    if (ch === ';' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      return sourceText.slice(fromIndex, i + 1);
    }
  }

  return sourceText.slice(fromIndex, hardEnd);
}

function extractFirstObjectLiteral(sourceText, fromIndex) {
  const maxSearch = Math.min(sourceText.length, fromIndex + 2000);
  let start = -1;
  let quote = null;
  let escaped = false;

  for (let i = fromIndex; i < maxSearch; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      start = i;
      break;
    }
    if (ch === ')' || ch === ';') break;
  }
  if (start < 0) return null;

  let depth = 0;
  quote = null;
  escaped = false;
  for (let i = start; i < maxSearch; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(start, i + 1);
      }
    }
  }
  return null;
}

function extractTopLevelObjectKeys(objectText) {
  if (!objectText || objectText[0] !== '{') return [];
  const keys = [];
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = 0; i < objectText.length; i += 1) {
    const ch = objectText[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth !== 1) continue;

    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i + 1;
      while (j < objectText.length && /[a-zA-Z0-9_$]/.test(objectText[j])) j += 1;
      const key = objectText.slice(i, j);
      let k = j;
      while (k < objectText.length && /\s/.test(objectText[k])) k += 1;
      if (objectText[k] === ':') {
        keys.push(key);
      }
      i = j - 1;
      continue;
    }

    if (ch === "'" || ch === '"') {
      const q = ch;
      let j = i + 1;
      let value = '';
      while (j < objectText.length) {
        const c = objectText[j];
        if (c === '\\') {
          j += 2;
          continue;
        }
        if (c === q) break;
        value += c;
        j += 1;
      }
      let k = j + 1;
      while (k < objectText.length && /\s/.test(objectText[k])) k += 1;
      if (objectText[k] === ':' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        keys.push(value);
      }
      i = j;
    }
  }

  return keys;
}

function extractWritePayloadKeys(windowText, fnName) {
  const keys = [];
  const re = new RegExp(`\\.${fnName}\\s*\\(`, 'g');
  let match;
  while ((match = re.exec(windowText)) !== null) {
    const objectText = extractFirstObjectLiteral(windowText, match.index + match[0].length);
    const objectKeys = extractTopLevelObjectKeys(objectText);
    keys.push(...objectKeys);
  }
  return keys;
}

function extractCallArgsText(sourceText, callStartIndex) {
  const openIndex = sourceText.indexOf('(', callStartIndex);
  if (openIndex < 0) return null;

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = openIndex; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(openIndex + 1, i);
      }
    }
  }
  return null;
}

function findKeyBlock(sourceText, key, fromIndex = 0) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`${escaped}\\s*:\\s*\\{`, 'g');
  keyRegex.lastIndex = fromIndex;
  const keyMatch = keyRegex.exec(sourceText);
  if (!keyMatch) return null;

  const openBraceIndex = sourceText.indexOf('{', keyMatch.index);
  if (openBraceIndex < 0) return null;

  let depth = 0;
  let quote = null;
  let escapedChar = false;
  for (let i = openBraceIndex; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escapedChar) {
        escapedChar = false;
        continue;
      }
      if (ch === '\\') {
        escapedChar = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(openBraceIndex, i + 1);
      }
    }
  }
  return null;
}

function findKeyArrayBlock(sourceText, key, fromIndex = 0) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`${escaped}\\s*:\\s*\\[`, 'g');
  keyRegex.lastIndex = fromIndex;
  const keyMatch = keyRegex.exec(sourceText);
  if (!keyMatch) return null;

  const openBracketIndex = sourceText.indexOf('[', keyMatch.index);
  if (openBracketIndex < 0) return null;

  let depth = 0;
  let quote = null;
  let escapedChar = false;
  for (let i = openBracketIndex; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escapedChar) {
        escapedChar = false;
        continue;
      }
      if (ch === '\\') {
        escapedChar = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(openBracketIndex, i + 1);
      }
    }
  }
  return null;
}

function extractTsObjectProps(objectText) {
  if (!objectText || objectText[0] !== '{') return [];
  const props = [];
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = 0; i < objectText.length; i += 1) {
    const ch = objectText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth !== 1) continue;

    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i + 1;
      while (j < objectText.length && /[a-zA-Z0-9_$]/.test(objectText[j])) j += 1;
      const key = objectText.slice(i, j);
      let optional = false;
      let k = j;
      while (k < objectText.length && /\s/.test(objectText[k])) k += 1;
      if (objectText[k] === '?') {
        optional = true;
        k += 1;
        while (k < objectText.length && /\s/.test(objectText[k])) k += 1;
      }
      if (objectText[k] === ':') {
        props.push({ key, optional });
      }
      i = j - 1;
      continue;
    }
  }

  return props;
}

function extractObjectBlocksFromArray(arrayText) {
  if (!arrayText || arrayText[0] !== '[') return [];
  const out = [];
  let quote = null;
  let escaped = false;
  let objectDepth = 0;
  let objectStart = -1;

  for (let i = 0; i < arrayText.length; i += 1) {
    const ch = arrayText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '{') {
      if (objectDepth === 0) objectStart = i;
      objectDepth += 1;
      continue;
    }

    if (ch === '}') {
      objectDepth -= 1;
      if (objectDepth === 0 && objectStart >= 0) {
        out.push(arrayText.slice(objectStart, i + 1));
        objectStart = -1;
      }
    }
  }

  return out;
}

function parseStringArrayFromObject(objectText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const match = regex.exec(objectText);
  if (!match) return [];
  const values = match[1]
    .split(',')
    .map((v) => v.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter((v) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v));
  return [...new Set(values)];
}

function parseSingleStringFromObject(objectText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'm');
  const match = regex.exec(objectText);
  return match ? match[1] : null;
}

function parseRelationships(relationshipsArrayText) {
  const blocks = extractObjectBlocksFromArray(relationshipsArrayText);
  return blocks.map((block) => ({
    foreign_key_name: parseSingleStringFromObject(block, 'foreignKeyName'),
    columns: parseStringArrayFromObject(block, 'columns'),
    referenced_relation: parseSingleStringFromObject(block, 'referencedRelation'),
    referenced_columns: parseStringArrayFromObject(block, 'referencedColumns'),
  }));
}

function resolveTableMetaFromTypes(tableName, typeFiles) {
  for (const typeFile of typeFiles) {
    const publicBlock = findKeyBlock(typeFile.content, 'public');
    if (!publicBlock) continue;
    const tablesBlock = findKeyBlock(publicBlock, 'Tables');
    if (!tablesBlock) continue;
    const tableBlock = findKeyBlock(tablesBlock, tableName);
    if (!tableBlock) continue;

    const rowBlock = findKeyBlock(tableBlock, 'Row');
    const insertBlock = findKeyBlock(tableBlock, 'Insert');
    const relationshipsBlock = findKeyArrayBlock(tableBlock, 'Relationships');

    const rowProps = extractTsObjectProps(rowBlock);
    const insertProps = extractTsObjectProps(insertBlock);

    const columns = rowProps.map((prop) => prop.key);
    const requiredInsertColumns = insertProps
      .filter((prop) => !prop.optional)
      .map((prop) => prop.key);

    const relationships = parseRelationships(relationshipsBlock);
    return {
      columns: [...new Set(columns)].sort(),
      required_insert_columns: [...new Set(requiredInsertColumns)].sort(),
      relationships,
    };
  }
  return {
    columns: [],
    required_insert_columns: [],
    relationships: [],
  };
}

function classifySource(filePath) {
  if (filePath.startsWith(ROOT)) return 'app';
  if (filePath.startsWith(path.resolve(ROOT, '..', 'ivisit-console'))) return 'console';
  return 'unknown';
}

function makeEmptyTableUsage(name) {
  return {
    table: name,
    references: [],
    operations: new Set(),
    columns: new Set(),
    insertKeys: new Set(),
    updateKeys: new Set(),
    realtimeReferences: [],
  };
}

function makeEmptyRpcUsage(name) {
  return {
    rpc: name,
    references: [],
    argKeys: new Set(),
  };
}

function scanFileForUsage(filePath, tableUsageMap, rpcUsageMap) {
  const content = safeRead(filePath);
  if (!content) return;
  const source = classifySource(filePath);

  let match;
  const tableRe = new RegExp(TABLE_REGEX.source, 'g');
  while ((match = tableRe.exec(content)) !== null) {
    const table = match[1];
    const index = match.index;
    const line = indexToLine(content, index);
    const localWindow = extractStatementWindow(content, index, 2500);

    if (!tableUsageMap.has(table)) tableUsageMap.set(table, makeEmptyTableUsage(table));
    const usage = tableUsageMap.get(table);
    usage.references.push({ file: filePath, line, source });

    const ops = ['select', 'insert', 'update', 'upsert', 'delete'];
    for (const op of ops) {
      const opRegex = new RegExp(`\\.${op}\\s*\\(`);
      if (opRegex.test(localWindow)) usage.operations.add(op);
    }

    const filterRegex = new RegExp(FILTER_COLUMN_REGEX.source, 'g');
    let fm;
    while ((fm = filterRegex.exec(localWindow)) !== null) {
      usage.columns.add(fm[1]);
    }

    const selectColumns = extractSelectColumns(localWindow);
    for (const column of selectColumns) usage.columns.add(column);

    const writeFns = ['insert', 'upsert', 'update'];
    for (const fn of writeFns) {
      const keys = extractWritePayloadKeys(localWindow, fn);
      for (const key of keys) {
        usage.columns.add(key);
        if (fn === 'update') usage.updateKeys.add(key);
        if (fn === 'insert' || fn === 'upsert') usage.insertKeys.add(key);
      }
    }
  }

  const rpcRe = new RegExp(RPC_REGEX.source, 'g');
  while ((match = rpcRe.exec(content)) !== null) {
    const rpc = match[1];
    const line = indexToLine(content, match.index);
    if (!rpcUsageMap.has(rpc)) rpcUsageMap.set(rpc, makeEmptyRpcUsage(rpc));
    const usage = rpcUsageMap.get(rpc);
    usage.references.push({ file: filePath, line, source });

    const callArgs = extractCallArgsText(content, match.index);
    if (callArgs) {
      const args = splitTopLevelComma(callArgs);
      if (args.length >= 2) {
        const secondArg = args[1] || '';
        const objectText = extractFirstObjectLiteral(secondArg, 0);
        const argKeys = extractTopLevelObjectKeys(objectText);
        for (const key of argKeys) usage.argKeys.add(key);
      }
    }
  }

  const realtimeRe = new RegExp(REALTIME_TABLE_REGEX.source, 'g');
  while ((match = realtimeRe.exec(content)) !== null) {
    const table = match[1];
    const line = indexToLine(content, match.index);
    if (!tableUsageMap.has(table)) tableUsageMap.set(table, makeEmptyTableUsage(table));
    const usage = tableUsageMap.get(table);
    usage.realtimeReferences.push({ file: filePath, line, source });
  }
}

function toRelPath(filePath) {
  if (filePath.startsWith(ROOT)) return path.relative(ROOT, filePath);
  return filePath;
}

function loadTypeFileContents() {
  const contents = [];
  for (const filePath of TYPES_CANDIDATES) {
    if (!fs.existsSync(filePath)) continue;
    const content = safeRead(filePath);
    if (!content) continue;
    contents.push({ filePath, content });
  }
  return contents;
}

function extractArgKeysFromBlock(argBlock) {
  if (!argBlock || /^\s*never\s*$/i.test(argBlock)) return [];
  const keys = [];
  const keyRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\??\s*:/g;
  let km;
  while ((km = keyRegex.exec(argBlock)) !== null) {
    keys.push(km[1]);
  }
  return [...new Set(keys)].sort();
}

function resolveRpcArgKeysFromTypes(rpcName, typeFiles) {
  const escaped = rpcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const oneLinePattern = new RegExp(`${escaped}\\s*:\\s*\\{\\s*Args:\\s*\\{([^}]*)\\}`, 'm');
  const multiLinePattern = new RegExp(
    `${escaped}\\s*:\\s*\\{[\\s\\S]*?Args:\\s*(never|\\{[\\s\\S]*?\\})[\\s\\S]*?Returns\\s*:`,
    'm'
  );

  for (const typeFile of typeFiles) {
    const { content } = typeFile;

    const oneLineMatch = oneLinePattern.exec(content);
    if (oneLineMatch) {
      return extractArgKeysFromBlock(oneLineMatch[1] || '');
    }

    const multiLineMatch = multiLinePattern.exec(content);
    if (multiLineMatch) {
      const raw = (multiLineMatch[1] || '').trim();
      if (/^never$/i.test(raw)) return [];
      const block = raw.startsWith('{') && raw.endsWith('}')
        ? raw.slice(1, -1)
        : raw;
      const keys = extractArgKeysFromBlock(block);
      if (keys.length > 0 || /^never$/i.test(raw)) {
        return keys;
      }
    }
  }

  return [];
}

function parseMissingColumnFromError(error) {
  const message = String(error?.message || '');
  const pgrst = message.match(/Could not find the '([^']+)' column/i);
  if (pgrst) return pgrst[1];
  const postgres = message.match(/column\s+["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i);
  if (postgres) return postgres[1];
  return null;
}

function isMissingTableError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code === 'PGRST205' ||
    message.includes('Could not find the table') ||
    message.includes('does not exist')
  );
}

function isMissingFunctionError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code === 'PGRST202' ||
    message.includes('Could not find the function') ||
    message.includes('function') && message.includes('does not exist')
  );
}

const ARG_KEY_ALIASES = new Map([
  ['status', 'p_status'],
  ['p_org_id', 'p_organization_id'],
  ['sql_query', 'sql'],
]);

function dedupeKeyArrays(list) {
  const seen = new Set();
  const out = [];
  for (const keys of list) {
    const normalized = [...new Set((keys || []).filter(Boolean))].sort();
    const hash = normalized.join('|');
    if (seen.has(hash)) continue;
    seen.add(hash);
    out.push(normalized);
  }
  return out;
}

function transformArgKey(key) {
  if (!key) return key;
  if (ARG_KEY_ALIASES.has(key)) return ARG_KEY_ALIASES.get(key);
  return key;
}

function buildArgKeyCandidates(keys) {
  const base = [...new Set((keys || []).filter(Boolean))];
  if (base.length === 0) return [[]];

  const candidates = [];
  candidates.push(base);
  candidates.push(base.map((key) => transformArgKey(key)));
  candidates.push(
    base.map((key) => {
      if (key.startsWith('p_')) return key;
      return `p_${key}`;
    })
  );
  candidates.push(
    base.map((key) => {
      if (key.startsWith('p_')) return key.slice(2);
      return key;
    })
  );

  // Probe variants with a single argument removed (common stale extra-arg drift).
  if (base.length > 1) {
    for (let i = 0; i < base.length; i += 1) {
      candidates.push(base.filter((_, idx) => idx !== i));
      candidates.push(base.filter((_, idx) => idx !== i).map((key) => transformArgKey(key)));
    }
  }

  return dedupeKeyArrays(candidates);
}

async function probeTableColumns(table, columns) {
  const probe = {
    table,
    tableExists: false,
    missingColumns: [],
    probeError: null,
  };

  const tableProbe = await supabase.from(table).select('*', { head: true, count: 'exact' });
  if (tableProbe.error) {
    if (isMissingTableError(tableProbe.error)) {
      probe.tableExists = false;
      probe.probeError = tableProbe.error.message || tableProbe.error.code || 'table missing';
      return probe;
    }
    probe.tableExists = false;
    probe.probeError = tableProbe.error.message || tableProbe.error.code || 'table probe failed';
    return probe;
  }

  probe.tableExists = true;

  let remaining = [...columns];
  const missing = [];
  const maxLoops = Math.max(remaining.length + 2, 4);

  for (let i = 0; i < maxLoops; i += 1) {
    if (remaining.length === 0) break;
    const selectExpr = remaining.join(',');
    const { error } = await supabase.from(table).select(selectExpr).limit(1);
    if (!error) break;

    const missingCol = parseMissingColumnFromError(error);
    if (missingCol && remaining.includes(missingCol)) {
      missing.push(missingCol);
      remaining = remaining.filter((c) => c !== missingCol);
      continue;
    }

    probe.probeError = error.message || error.code || 'column probe failed';
    break;
  }

  probe.missingColumns = [...new Set(missing)];
  return probe;
}

async function probeRpc(name) {
  const { error } = await supabase.rpc(name, {});
  if (!error) {
    return { rpc: name, exists: true, status: 'ok', error: null };
  }
  if (isMissingFunctionError(error)) {
    return { rpc: name, exists: false, status: 'missing', error: error.message || error.code || 'missing rpc' };
  }
  return { rpc: name, exists: true, status: 'exists_with_runtime_error', error: error.message || error.code || 'runtime error' };
}

async function probeRpcWithArgs(name, observedArgKeys, typedArgKeys) {
  const observed = [...new Set((observedArgKeys || []).filter(Boolean))];
  const typed = [...new Set((typedArgKeys || []).filter(Boolean))];

  const sameKeySet =
    observed.length === typed.length && observed.every((key) => typed.includes(key));

  const runProbe = async (keys) => {
    const payload = keys.length > 0
      ? Object.fromEntries(keys.map((key) => [key, null]))
      : {};

    const { error } = await supabase.rpc(name, payload);
    if (!error) {
      return { exists: true, status: 'ok', error: null };
    }
    if (isMissingFunctionError(error)) {
      return {
        exists: false,
        status: keys.length === 0 ? 'unknown_signature' : 'missing_or_stale_signature',
        error: error.message || error.code || 'rpc missing/stale signature',
      };
    }
    return {
      exists: true,
      status: 'exists_with_runtime_error',
      error: error.message || error.code || 'runtime error',
    };
  };

  if (observed.length > 0) {
    const observedResult = await runProbe(observed);
    if (observedResult.exists) {
      return { rpc: name, ...observedResult, probe_source: 'observed', probe_keys: observed };
    }

    const observedCandidates = buildArgKeyCandidates(observed).filter((keys) => {
      const sameLen = keys.length === observed.length;
      const sameSet = sameLen && keys.every((k) => observed.includes(k));
      return !sameSet;
    });

    for (const keys of observedCandidates) {
      const result = await runProbe(keys);
      if (result.exists) {
        return {
          rpc: name,
          exists: true,
          status: 'stale_call_signature',
          error: observedResult.error,
          probe_source: 'observed_candidate',
          probe_keys: keys,
        };
      }
    }

    if (!sameKeySet && typed.length > 0) {
      const typedResult = await runProbe(typed);
      if (typedResult.exists) {
        return {
          rpc: name,
          exists: true,
          status: 'stale_call_signature',
          error: observedResult.error,
          probe_source: 'typed',
          probe_keys: typed,
        };
      }
      const typedCandidates = buildArgKeyCandidates(typed).filter((keys) => {
        const sameLen = keys.length === typed.length;
        const sameSet = sameLen && keys.every((k) => typed.includes(k));
        return !sameSet;
      });
      for (const keys of typedCandidates) {
        const result = await runProbe(keys);
        if (result.exists) {
          return {
            rpc: name,
            exists: true,
            status: 'stale_call_signature',
            error: observedResult.error,
            probe_source: 'typed_candidate',
            probe_keys: keys,
          };
        }
      }

      return {
        rpc: name,
        ...typedResult,
        probe_source: 'typed',
        probe_keys: typed,
      };
    }

    return {
      rpc: name,
      ...observedResult,
      probe_source: 'observed',
      probe_keys: observed,
    };
  }

  if (typed.length > 0) {
    const typedResult = await runProbe(typed);
    if (!typedResult.exists) {
      const typedCandidates = buildArgKeyCandidates(typed).filter((keys) => {
        const sameLen = keys.length === typed.length;
        const sameSet = sameLen && keys.every((k) => typed.includes(k));
        return !sameSet;
      });
      for (const keys of typedCandidates) {
        const result = await runProbe(keys);
        if (result.exists) {
          return {
            rpc: name,
            exists: true,
            status: 'stale_call_signature',
            error: typedResult.error,
            probe_source: 'typed_candidate',
            probe_keys: keys,
          };
        }
      }
    }
    return {
      rpc: name,
      ...typedResult,
      probe_source: 'typed',
      probe_keys: typed,
    };
  }

  const emptyResult = await runProbe([]);
  return {
    rpc: name,
    ...emptyResult,
    probe_source: 'empty',
    probe_keys: [],
  };
}

async function run() {
  const startedAt = nowIso();
  console.log(`[cross-repo-contract-matrix] Starting at ${startedAt}`);

  const tableUsageMap = new Map();
  const rpcUsageMap = new Map();
  const typeFiles = loadTypeFileContents();

  const appFiles = APP_SCAN_DIRS
    .map((dir) => path.join(ROOT, dir))
    .filter((dir) => fs.existsSync(dir))
    .flatMap((dir) => listFilesRecursive(dir));

  const consoleFiles = listFilesRecursive(CONSOLE_ROOT);

  for (const filePath of [...appFiles, ...consoleFiles]) {
    scanFileForUsage(filePath, tableUsageMap, rpcUsageMap);
  }

  const tableEntries = [...tableUsageMap.values()]
    .map((entry) => ({
      table: entry.table,
      references: entry.references.map((ref) => ({
        file: toRelPath(ref.file),
        line: ref.line,
        source: ref.source,
      })),
      operations: [...entry.operations].sort(),
      columns: [...entry.columns]
        .filter((c) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c))
        .sort(),
      insert_keys: [...entry.insertKeys]
        .filter((c) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c))
        .sort(),
      update_keys: [...entry.updateKeys]
        .filter((c) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c))
        .sort(),
      realtime_references: entry.realtimeReferences.map((ref) => ({
        file: toRelPath(ref.file),
        line: ref.line,
        source: ref.source,
      })),
    }))
    .sort((a, b) => a.table.localeCompare(b.table));

  const rpcEntries = [...rpcUsageMap.values()]
    .map((entry) => ({
      rpc: entry.rpc,
      references: entry.references.map((ref) => ({
        file: toRelPath(ref.file),
        line: ref.line,
        source: ref.source,
      })),
      arg_keys: [...entry.argKeys].sort(),
      type_arg_keys: resolveRpcArgKeysFromTypes(entry.rpc, typeFiles),
    }))
    .sort((a, b) => a.rpc.localeCompare(b.rpc));

  const tableProbeResults = [];
  const tableTypeMetaMap = new Map();
  for (const entry of tableEntries) {
    tableTypeMetaMap.set(entry.table, resolveTableMetaFromTypes(entry.table, typeFiles));
    const result = await probeTableColumns(entry.table, entry.columns);
    tableProbeResults.push(result);
  }

  const rpcProbeResults = [];
  for (const entry of rpcEntries) {
    const result = await probeRpcWithArgs(entry.rpc, entry.arg_keys, entry.type_arg_keys);
    rpcProbeResults.push(result);
  }

  const tableProbeByName = new Map(tableProbeResults.map((row) => [row.table, row]));
  const rpcProbeByName = new Map(rpcProbeResults.map((row) => [row.rpc, row]));

  const tables = tableEntries.map((entry) => {
    const probe = tableProbeByName.get(entry.table);
    const typeMeta = tableTypeMetaMap.get(entry.table) || {
      columns: [],
      required_insert_columns: [],
      relationships: [],
    };
    const referencesBySource = entry.references.reduce(
      (acc, ref) => {
        if (ref.source === 'app') acc.app += 1;
        if (ref.source === 'console') acc.console += 1;
        if (ref.source !== 'app' && ref.source !== 'console') acc.other += 1;
        return acc;
      },
      { app: 0, console: 0, other: 0 }
    );

    const writesInsert = entry.operations.includes('insert') || entry.operations.includes('upsert');
    const missingRequiredInsertColumns = writesInsert
      ? typeMeta.required_insert_columns.filter((col) => !entry.insert_keys.includes(col))
      : [];

    const unknownColumnDrift = typeMeta.columns.length > 0
      ? entry.columns.filter((col) => !typeMeta.columns.includes(col))
      : [];

    const insertCoverageStatus = !writesInsert
      ? 'n/a'
      : entry.insert_keys.length === 0
        ? 'unknown_payload_shape'
        : missingRequiredInsertColumns.length > 0
          ? 'missing_required_columns'
          : 'ok';

    return {
      table: entry.table,
      reference_count: entry.references.length,
      operations: entry.operations,
      referenced_columns: entry.columns,
      observed_insert_keys: entry.insert_keys,
      observed_update_keys: entry.update_keys,
      insert_coverage_status: insertCoverageStatus,
      missing_required_insert_columns: missingRequiredInsertColumns,
      unknown_type_columns: unknownColumnDrift,
      type_columns: typeMeta.columns,
      type_required_insert_columns: typeMeta.required_insert_columns,
      relationships: typeMeta.relationships,
      references_by_source: referencesBySource,
      realtime_reference_count: entry.realtime_references.length,
      realtime_references: entry.realtime_references.slice(0, 8),
      missing_columns: probe?.missingColumns || [],
      table_exists: probe?.tableExists || false,
      probe_error: probe?.probeError || null,
      sample_references: entry.references.slice(0, 8),
    };
  });

  const rpcs = rpcEntries.map((entry) => {
    const probe = rpcProbeByName.get(entry.rpc);
    const referencesBySource = entry.references.reduce(
      (acc, ref) => {
        if (ref.source === 'app') acc.app += 1;
        if (ref.source === 'console') acc.console += 1;
        if (ref.source !== 'app' && ref.source !== 'console') acc.other += 1;
        return acc;
      },
      { app: 0, console: 0, other: 0 }
    );
    return {
      rpc: entry.rpc,
      reference_count: entry.references.length,
      references_by_source: referencesBySource,
      argument_keys_observed: entry.arg_keys,
      argument_keys_from_types: entry.type_arg_keys,
      exists: !!probe?.exists,
      status: probe?.status || 'unknown',
      probe_error: probe?.error || null,
      probe_source: probe?.probe_source || null,
      probe_keys: probe?.probe_keys || [],
      sample_references: entry.references.slice(0, 8),
    };
  });

  const missingTables = tables.filter((t) => !t.table_exists).map((t) => t.table);
  const tablesWithMissingColumns = tables
    .filter((t) => t.table_exists && t.missing_columns.length > 0)
    .map((t) => ({ table: t.table, missing_columns: t.missing_columns }));
  const tablesWithMissingRequiredInsertColumns = tables
    .filter((t) => t.insert_coverage_status === 'missing_required_columns')
    .map((t) => ({ table: t.table, missing_required_insert_columns: t.missing_required_insert_columns }));
  const tablesWithUnknownInsertPayloadShape = tables
    .filter((t) => t.insert_coverage_status === 'unknown_payload_shape')
    .map((t) => t.table);
  const tablesWithUnknownTypeColumns = tables
    .filter((t) => t.unknown_type_columns.length > 0)
    .map((t) => ({ table: t.table, unknown_type_columns: t.unknown_type_columns }));
  const tablesWithRealtimeSubscriptions = tables.filter((t) => t.realtime_reference_count > 0).length;
  const totalRelationshipEdges = tables.reduce(
    (sum, t) => sum + (Array.isArray(t.relationships) ? t.relationships.length : 0),
    0
  );
  const staleCallSignatureRpcs = rpcs
    .filter((r) => r.status === 'stale_call_signature')
    .map((r) => r.rpc);
  const missingRpcs = rpcs
    .filter((r) => r.status === 'missing_or_stale_signature')
    .map((r) => r.rpc);
  const unresolvedSignatureRpcs = rpcs
    .filter((r) => r.status === 'unknown_signature')
    .map((r) => r.rpc);

  const summary = {
    scanned_files: appFiles.length + consoleFiles.length,
    app_files: appFiles.length,
    console_files: consoleFiles.length,
    referenced_tables: tables.length,
    referenced_rpcs: rpcs.length,
    missing_tables: missingTables.length,
    tables_with_missing_columns: tablesWithMissingColumns.length,
    tables_with_missing_required_insert_columns: tablesWithMissingRequiredInsertColumns.length,
    tables_with_unknown_insert_payload_shape: tablesWithUnknownInsertPayloadShape.length,
    tables_with_unknown_type_columns: tablesWithUnknownTypeColumns.length,
    tables_with_realtime_subscriptions: tablesWithRealtimeSubscriptions,
    relationship_edges_indexed: totalRelationshipEdges,
    missing_rpcs: missingRpcs.length,
    stale_call_signatures: staleCallSignatureRpcs.length,
    unresolved_signature_rpcs: unresolvedSignatureRpcs.length,
  };

  const severity = {
    critical: [],
    high: [],
    medium: [],
  };
  if (missingTables.length > 0) {
    severity.critical.push(`Missing referenced tables: ${missingTables.length}`);
  }
  if (missingRpcs.length > 0) {
    severity.critical.push(`Missing referenced RPCs: ${missingRpcs.length}`);
  }
  if (staleCallSignatureRpcs.length > 0) {
    severity.critical.push(`RPC calls with stale argument signatures: ${staleCallSignatureRpcs.length}`);
  }
  if (unresolvedSignatureRpcs.length > 0) {
    severity.high.push(`RPCs with unresolved signature probes: ${unresolvedSignatureRpcs.length}`);
  }
  if (tablesWithMissingColumns.length > 0) {
    severity.high.push(`Tables with missing referenced columns: ${tablesWithMissingColumns.length}`);
  }
  if (tablesWithMissingRequiredInsertColumns.length > 0) {
    severity.high.push(
      `Tables with insert payloads missing required columns: ${tablesWithMissingRequiredInsertColumns.length}`
    );
  }
  if (tablesWithUnknownInsertPayloadShape.length > 0) {
    severity.medium.push(
      `Tables with insert/upsert usage but dynamic payload shape: ${tablesWithUnknownInsertPayloadShape.length}`
    );
  }
  if (tablesWithUnknownTypeColumns.length > 0) {
    severity.medium.push(
      `Tables with referenced columns not found in local DB types: ${tablesWithUnknownTypeColumns.length}`
    );
  }
  const rpcRuntimeErrors = rpcs.filter((r) => r.exists && r.status === 'exists_with_runtime_error').length;
  if (rpcRuntimeErrors > 0) {
    severity.medium.push(`RPCs requiring parameter/runtime validation: ${rpcRuntimeErrors}`);
  }

  const report = {
    generated_at: nowIso(),
    source: 'run_cross_repo_contract_matrix.js',
    supabase_url: supabaseUrl,
    summary,
    severity,
    missing_tables: missingTables,
    tables_with_missing_columns: tablesWithMissingColumns,
    tables_with_missing_required_insert_columns: tablesWithMissingRequiredInsertColumns,
    tables_with_unknown_insert_payload_shape: tablesWithUnknownInsertPayloadShape,
    tables_with_unknown_type_columns: tablesWithUnknownTypeColumns,
    missing_rpcs: missingRpcs,
    stale_call_signatures: staleCallSignatureRpcs,
    unresolved_signature_rpcs: unresolvedSignatureRpcs,
    tables,
    rpcs,
  };

  const outDir = path.join(ROOT, 'supabase', 'tests', 'validation');
  ensureDir(outDir);
  const outFile = path.join(outDir, 'cross_repo_contract_matrix_report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log(`[cross-repo-contract-matrix] Report written: ${outFile}`);
  console.log(`[cross-repo-contract-matrix] tables=${summary.referenced_tables} rpcs=${summary.referenced_rpcs}`);
  console.log(
    `[cross-repo-contract-matrix] missing tables=${summary.missing_tables} missing columns=${summary.tables_with_missing_columns} missing required insert columns=${summary.tables_with_missing_required_insert_columns} missing rpcs=${summary.missing_rpcs} stale signatures=${summary.stale_call_signatures} unresolved rpc signatures=${summary.unresolved_signature_rpcs}`
  );
  if (severity.critical.length > 0) {
    console.log('[cross-repo-contract-matrix] Critical findings:');
    for (const line of severity.critical) console.log(`  - ${line}`);
  }
}

run().catch((error) => {
  console.error('[cross-repo-contract-matrix] Failed:', error);
  process.exit(1);
});
