#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_ROOT = ROOT;
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const SCHEMA_DUMP_CANDIDATES = [
  path.join(OUT_DIR, 'public_schema_dump.latest.sql'),
  path.join(OUT_DIR, 'public_schema_dump.sql'),
];
const CONSOLE_MATRIX_REPORT = path.join(
  OUT_DIR,
  'console_ui_crud_contract_matrix_report.json'
);

const ARGS = process.argv.slice(2);
const TABLE_ARG_INDEX = ARGS.findIndex((arg) => arg === '--table');
const TABLE_NAME =
  TABLE_ARG_INDEX >= 0 && ARGS[TABLE_ARG_INDEX + 1]
    ? String(ARGS[TABLE_ARG_INDEX + 1]).trim()
    : 'emergency_requests';

const OUT_FILE = path.join(OUT_DIR, `table_flow_trace_${TABLE_NAME}.json`);
const OUT_MD_FILE = path.join(OUT_DIR, `table_flow_trace_${TABLE_NAME}.md`);

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'build',
  'dist',
  '.expo',
  '.next',
  '.cache',
  'coverage',
  '.trae',
  '.zenflow',
  'docs',
  'supabase/tests/validation',
  'supabase/docs/archive',
]);
const GENERIC_COLUMNS = new Set(['id', 'user_id', 'status', 'type', 'created_at', 'updated_at']);

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[table-flow-trace] FAIL: ${message}`);
  process.exit(1);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function unique(values) {
  return [...new Set(values)];
}

function addColumn(columns, columnName) {
  if (!columnName) return;
  const normalized = columnName.replace(/"/g, '').trim();
  if (!normalized) return;
  if (!columns.includes(normalized)) columns.push(normalized);
}

function parseColumnDefinitionLine(rawLine) {
  const line = rawLine
    .replace(/--.*$/, '')
    .trim()
    .replace(/,$/, '');
  if (!line) return null;
  const lowered = line.toLowerCase();
  if (
    lowered.startsWith('constraint ') ||
    lowered.startsWith('primary key') ||
    lowered.startsWith('foreign key') ||
    lowered.startsWith('check ') ||
    lowered.startsWith('unique ') ||
    lowered.startsWith('exclude ') ||
    lowered.startsWith(')') ||
    lowered.startsWith('on ')
  ) {
    return null;
  }

  const colMatch = line.match(/^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+/);
  if (!colMatch) return null;
  return colMatch[1];
}

function parseCreateTableColumns(createBody) {
  const columns = [];
  const lines = createBody.split(/\r?\n/);
  for (const rawLine of lines) {
    const columnName = parseColumnDefinitionLine(rawLine);
    if (columnName) addColumn(columns, columnName);
  }
  return columns;
}

function extractColumnsFromSchemaDump(tableName) {
  const tableEscaped = escapeRegex(tableName);
  const tablePattern = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?"?${tableEscaped}"?\\s*\\(([\\s\\S]*?)\\);`,
    'i'
  );

  for (const candidate of SCHEMA_DUMP_CANDIDATES) {
    const content = readFileIfExists(candidate);
    if (!content) continue;
    const match = content.match(tablePattern);
    if (!match) continue;
    return {
      source: normalizePath(path.relative(ROOT, candidate)),
      columns: parseCreateTableColumns(match[1]),
    };
  }
  return null;
}

function extractColumnsFromMigrations(tableName) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const tableEscaped = escapeRegex(tableName);
  const createPattern = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?"?${tableEscaped}"?\\s*\\(([\\s\\S]*?)\\);`,
    'ig'
  );
  const alterPattern = new RegExp(
    `ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:public\\.)?"?${tableEscaped}"?[\\s\\S]*?;`,
    'ig'
  );

  const columns = [];
  for (const fileName of migrationFiles) {
    const fullPath = path.join(MIGRATIONS_DIR, fileName);
    const content = fs.readFileSync(fullPath, 'utf8');

    let createMatch;
    while ((createMatch = createPattern.exec(content)) !== null) {
      const found = parseCreateTableColumns(createMatch[1]);
      found.forEach((column) => addColumn(columns, column));
    }

    let alterMatch;
    while ((alterMatch = alterPattern.exec(content)) !== null) {
      const alterStatement = alterMatch[0];
      let addMatch;
      const addColumnRegex = /ADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;
      while ((addMatch = addColumnRegex.exec(alterStatement)) !== null) {
        addColumn(columns, addMatch[1]);
      }

      let dropMatch;
      const dropColumnRegex = /DROP\s+COLUMN(?:\s+IF\s+EXISTS)?\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;
      while ((dropMatch = dropColumnRegex.exec(alterStatement)) !== null) {
        const col = dropMatch[1].replace(/"/g, '').trim();
        const idx = columns.indexOf(col);
        if (idx >= 0) columns.splice(idx, 1);
      }

      let renameMatch;
      const renameColumnRegex =
        /RENAME\s+COLUMN\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+TO\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;
      while ((renameMatch = renameColumnRegex.exec(alterStatement)) !== null) {
        const from = renameMatch[1];
        const to = renameMatch[2];
        const fromIdx = columns.indexOf(from);
        if (fromIdx >= 0) columns.splice(fromIdx, 1);
        addColumn(columns, to);
      }
    }
  }

  return unique(columns);
}

function listSourceFiles(basePath, scanEntries = null) {
  if (!fs.existsSync(basePath)) return [];
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const rel = normalizePath(path.relative(basePath, fullPath));
      if (entry.isDirectory()) {
        if (
          IGNORE_DIRS.has(entry.name) ||
          IGNORE_DIRS.has(rel) ||
          rel.startsWith('supabase/tests/validation') ||
          rel.startsWith('supabase/docs/archive')
        ) {
          continue;
        }
        walk(fullPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (SOURCE_EXTENSIONS.has(ext)) files.push(fullPath);
    }
  }

  if (Array.isArray(scanEntries) && scanEntries.length > 0) {
    for (const entry of scanEntries) {
      const fullPath = path.join(basePath, entry);
      if (!fs.existsSync(fullPath)) continue;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(fullPath).toLowerCase();
        if (SOURCE_EXTENSIONS.has(ext)) files.push(fullPath);
      }
    }
  } else {
    walk(basePath);
  }

  return files;
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => path.join(MIGRATIONS_DIR, name));
}

function inferSurface(filePath) {
  const normalized = normalizePath(filePath).toLowerCase();
  if (normalized.includes('/components/modals/')) return 'modal';
  if (normalized.includes('/components/pages/')) return 'page';
  if (normalized.includes('/components/views/')) return 'view';
  if (normalized.includes('/components/mobile/')) return 'mobile';
  if (normalized.includes('/services/')) return 'service';
  if (normalized.includes('/hooks/')) return 'hook';
  if (normalized.includes('/contexts/')) return 'context';
  if (normalized.includes('/providers/')) return 'provider';
  if (normalized.includes('/screens/')) return 'screen';
  if (normalized.includes('/types/')) return 'type';
  if (normalized.includes('/utils/')) return 'utility';
  if (normalized.endsWith('/app.js')) return 'entry';
  return 'other';
}

function classifySourceLine(line) {
  const text = line.trim();
  if (!text) return 'unknown';

  if (/\.from\(\s*['"`][a-z0-9_]+['"`]\s*\)/i.test(text)) return 'db_from';
  if (/\.select\(/i.test(text)) return 'db_select';
  if (/\.insert\(/i.test(text)) return 'db_insert';
  if (/\.update\(/i.test(text)) return 'db_update';
  if (/\.upsert\(/i.test(text)) return 'db_upsert';
  if (/\.delete\(/i.test(text)) return 'db_delete';
  if (/\.rpc\(\s*['"`][a-z0-9_]+['"`]/i.test(text)) return 'rpc_call';

  if (/<(Modal|Dialog|BottomSheet)\b/.test(text)) return 'ui_modal';
  if (
    /<(TextInput|Input|Textarea|Select|Checkbox|Switch|Radio|DatePicker|TimePicker|SegmentedControl)\b/i.test(
      text
    )
  ) {
    return 'ui_input';
  }
  if (/<(Table|TableRow|TableCell|TableHead|th|td|tr)\b/i.test(text)) return 'ui_table';
  if (/<(Card|Badge|Chip|div|span|p|label|Text|Typography|Heading)\b/i.test(text)) return 'ui_display';
  if (/set[A-Z][A-Za-z0-9_]*\(/.test(text)) return 'state_write';
  if (/const\s+[A-Za-z0-9_]+\s*=/.test(text) || /return\s*{/.test(text)) return 'mapping';
  return 'unknown';
}

function classifySqlLine(line, tableName) {
  const lower = line.toLowerCase();
  const tableLower = tableName.toLowerCase();
  const tablePattern = `(?:public\\.)?"?${escapeRegex(tableLower)}"?`;

  if (new RegExp(`\\binsert\\s+into\\s+${tablePattern}\\b`, 'i').test(lower)) return 'sql_insert';
  if (new RegExp(`\\bupdate\\s+${tablePattern}\\b`, 'i').test(lower)) return 'sql_update';
  if (new RegExp(`\\bdelete\\s+from\\s+${tablePattern}\\b`, 'i').test(lower)) return 'sql_delete';
  if (/\bcreate\s+trigger\b/i.test(lower) && new RegExp(`\\bon\\s+${tablePattern}\\b`, 'i').test(lower)) {
    return 'sql_trigger_on_table';
  }
  if (
    new RegExp(`\\b(from|join|into)\\s+${tablePattern}\\b`, 'i').test(lower) ||
    new RegExp(`\\bon\\s+${tablePattern}\\b`, 'i').test(lower)
  ) {
    return 'sql_select_or_ref';
  }
  if (/\bcreate\s+or\s+replace\s+function\b/i.test(lower)) return 'sql_function_declaration';
  return 'sql_reference';
}

function inferAccess(kind) {
  const writes = new Set(['db_insert', 'db_update', 'db_upsert', 'db_delete', 'sql_insert', 'sql_update', 'sql_delete']);
  const reads = new Set(['db_select', 'db_from', 'sql_select_or_ref']);
  if (writes.has(kind)) return 'write';
  if (reads.has(kind)) return 'read';
  return 'unknown';
}

function readConsoleMatrixSurface(tableName) {
  const raw = readFileIfExists(CONSOLE_MATRIX_REPORT);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const surfaces = Array.isArray(parsed.surfaces) ? parsed.surfaces : [];
    const matched = surfaces.filter(
      (surface) => surface?.table === tableName || surface?.id === tableName
    );
    return {
      source: normalizePath(path.relative(ROOT, CONSOLE_MATRIX_REPORT)),
      summary: parsed.summary || null,
      surfaces: matched,
    };
  } catch (_error) {
    return null;
  }
}

function buildColumnRegexes(columns) {
  return Object.fromEntries(
    columns.map((column) => [column, new RegExp(`\\b${escapeRegex(column)}\\b`, 'i')])
  );
}

function collectSourceReferences({ tableName, tableColumns, repoRoots }) {
  const tableRegex = new RegExp(`\\b(?:public\\.)?"?${escapeRegex(tableName)}"?\\b`, 'i');
  const columnRegexes = buildColumnRegexes(tableColumns);
  const consoleMatrix = readConsoleMatrixSurface(tableName);
  const matrixSeedFiles = new Set();
  if (consoleMatrix && Array.isArray(consoleMatrix.surfaces)) {
    for (const surface of consoleMatrix.surfaces) {
      if (surface.modal) matrixSeedFiles.add(normalizePath(surface.modal));
      if (surface.page) matrixSeedFiles.add(normalizePath(surface.page));
      if (surface.service) matrixSeedFiles.add(normalizePath(surface.service));
    }
  }

  const references = [];
  const repoFiles = [];

  for (const repo of repoRoots) {
    const files = listSourceFiles(repo.root, repo.scanEntries);
    for (const filePath of files) {
      repoFiles.push({ repo: repo.id, filePath });
    }
  }

  const tableScopedFiles = new Set();
  const candidateFiles = [];

  for (const { repo, filePath } of repoFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasTable = tableRegex.test(content);
    if (hasTable) tableScopedFiles.add(filePath);
    const repoRoot = repoRoots.find((x) => x.id === repo).root;
    const relPath = normalizePath(path.relative(repoRoot, filePath));
    const isMatrixSeed = repo === 'console' && matrixSeedFiles.has(relPath);
    if (hasTable || isMatrixSeed) candidateFiles.push({ repo, filePath, isMatrixSeed });
  }

  for (const { repo, filePath, isMatrixSeed } of candidateFiles) {
    const relPath = normalizePath(path.relative(repoRoots.find((x) => x.id === repo).root, filePath));
    const fileLines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const isTableScoped = tableScopedFiles.has(filePath);
    const surface = inferSurface(relPath);
    const tableLineNumbers = [];
    for (let i = 0; i < fileLines.length; i += 1) {
      if (tableRegex.test(fileLines[i])) tableLineNumbers.push(i + 1);
    }

    fileLines.forEach((line, index) => {
      const hasTable = tableRegex.test(line);
      const matchedColumns = tableColumns.filter((column) => {
        if (!columnRegexes[column].test(line)) return false;
        if (GENERIC_COLUMNS.has(column) && !hasTable && !isTableScoped && !isMatrixSeed) return false;
        return true;
      });

      if (!hasTable && matchedColumns.length === 0) return;

      if (!hasTable && matchedColumns.length > 0 && !isMatrixSeed) {
        const lineNumber = index + 1;
        const inTableContext = tableLineNumbers.some((tableLine) => Math.abs(tableLine - lineNumber) <= 60);
        if (!inTableContext) return;
      }

      const kind = classifySourceLine(line);
      references.push({
        origin: 'source',
        repo,
        file: relPath,
        line: index + 1,
        kind,
        access: inferAccess(kind),
        surface,
        has_table_name: hasTable,
        matched_columns: matchedColumns,
        snippet: line.trim().slice(0, 280),
      });
    });
  }

  return references;
}

function collectMigrationReferences({ tableName, tableColumns }) {
  const migrationFiles = listMigrationFiles();
  const references = [];
  if (migrationFiles.length === 0) return references;

  const tableRegex = new RegExp(`\\b(?:public\\.)?"?${escapeRegex(tableName)}"?\\b`, 'i');
  const columnRegexes = buildColumnRegexes(tableColumns);

  for (const filePath of migrationFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasTable = tableRegex.test(content);
    if (!hasTable) continue;

    const lines = content.split(/\r?\n/);
    const relPath = normalizePath(path.relative(ROOT, filePath));
    let currentFunction = null;
    let currentDollarMarker = null;
    let tableContextWindow = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const functionMatch = line.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)/i);
      if (functionMatch) {
        currentFunction = functionMatch[1];
        const markerMatch = line.match(/AS\s+(\$[A-Za-z0-9_]*\$)/i);
        currentDollarMarker = markerMatch ? markerMatch[1] : '$$';
      }

      if (currentFunction && currentDollarMarker && line.includes(`${currentDollarMarker};`)) {
        if (!/CREATE\s+OR\s+REPLACE\s+FUNCTION/i.test(line)) {
          currentFunction = null;
          currentDollarMarker = null;
        }
      }

      const hasTableLine = tableRegex.test(line);
      if (hasTableLine) {
        tableContextWindow = 80;
      } else if (tableContextWindow > 0) {
        tableContextWindow -= 1;
      }

      const matchedColumns = tableColumns.filter((column) => {
        if (!columnRegexes[column].test(line)) return false;
        if (GENERIC_COLUMNS.has(column) && !hasTableLine && tableContextWindow === 0) return false;
        return true;
      });

      if (!hasTableLine && matchedColumns.length === 0) continue;
      if (!hasTableLine && matchedColumns.length > 0 && tableContextWindow === 0) continue;

      const kind = classifySqlLine(line, tableName);
      const triggerMatch = line.match(/CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)/i);
      references.push({
        origin: 'migration',
        repo: 'db',
        file: relPath,
        line: i + 1,
        kind,
        access: inferAccess(kind),
        surface: 'migration',
        has_table_name: hasTableLine,
        matched_columns: matchedColumns,
        function_name: currentFunction,
        trigger_name: triggerMatch ? triggerMatch[1] : null,
        snippet: line.trim().slice(0, 280),
      });
    }
  }

  return references;
}

function summarizeReferences(references, tableColumns) {
  const summaryByRepo = {};
  const summaryByKind = {};
  const summaryByAccess = {};
  const summaryBySurface = {};
  const columnUsage = Object.fromEntries(tableColumns.map((column) => [column, 0]));
  const filesTouched = new Set();

  for (const ref of references) {
    summaryByRepo[ref.repo] = (summaryByRepo[ref.repo] || 0) + 1;
    summaryByKind[ref.kind] = (summaryByKind[ref.kind] || 0) + 1;
    summaryByAccess[ref.access] = (summaryByAccess[ref.access] || 0) + 1;
    summaryBySurface[ref.surface] = (summaryBySurface[ref.surface] || 0) + 1;
    filesTouched.add(`${ref.repo}:${ref.file}`);
    for (const column of ref.matched_columns) {
      columnUsage[column] += 1;
    }
  }

  const columnsWithoutUsage = tableColumns.filter((column) => columnUsage[column] === 0);

  return {
    files_touched: filesTouched.size,
    total_references: references.length,
    references_by_repo: summaryByRepo,
    references_by_kind: summaryByKind,
    references_by_access: summaryByAccess,
    references_by_surface: summaryBySurface,
    columns_without_observed_usage: columnsWithoutUsage,
    column_usage: columnUsage,
  };
}

function buildMarkdown(output) {
  const lines = [];
  lines.push(`# Table Flow Trace: ${output.table}`);
  lines.push('');
  lines.push(`- Generated: ${output.generated_at}`);
  lines.push(`- Script: ${output.source}`);
  lines.push(`- Columns: ${output.table_columns.length}`);
  lines.push(`- Repositories scanned: ${output.repos_scanned.join(', ')}`);
  lines.push(`- Total references: ${output.summary.total_references}`);
  lines.push(`- Files touched: ${output.summary.files_touched}`);
  lines.push('');

  lines.push('## Coverage Summary');
  lines.push('');
  lines.push('### References by Repo');
  lines.push('');
  lines.push('| Repo | Count |');
  lines.push('| --- | ---: |');
  Object.entries(output.summary.references_by_repo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([repo, count]) => lines.push(`| ${repo} | ${count} |`));
  lines.push('');

  lines.push('### References by Access');
  lines.push('');
  lines.push('| Access | Count |');
  lines.push('| --- | ---: |');
  Object.entries(output.summary.references_by_access)
    .sort((a, b) => b[1] - a[1])
    .forEach(([access, count]) => lines.push(`| ${access} | ${count} |`));
  lines.push('');

  lines.push('### References by Surface');
  lines.push('');
  lines.push('| Surface | Count |');
  lines.push('| --- | ---: |');
  Object.entries(output.summary.references_by_surface)
    .sort((a, b) => b[1] - a[1])
    .forEach(([surface, count]) => lines.push(`| ${surface} | ${count} |`));
  lines.push('');

  lines.push('## Columns Without Observed Usage');
  lines.push('');
  if (output.summary.columns_without_observed_usage.length === 0) {
    lines.push('- none');
  } else {
    output.summary.columns_without_observed_usage.forEach((column) => lines.push(`- ${column}`));
  }
  lines.push('');

  if (output.console_matrix_surface) {
    lines.push('## Console CRUD Matrix Cross-Check');
    lines.push('');
    lines.push(`- Source: ${output.console_matrix_surface.source}`);
    lines.push(
      `- Matched surfaces: ${Array.isArray(output.console_matrix_surface.surfaces) ? output.console_matrix_surface.surfaces.length : 0}`
    );
    const matched = output.console_matrix_surface.surfaces || [];
    for (const surface of matched) {
      const risks = Array.isArray(surface.risks) ? surface.risks.length : 0;
      lines.push(`- ${surface.id} (${surface.table}) risks=${risks}`);
    }
    lines.push('');
  }

  lines.push('## Key References (Top 120)');
  lines.push('');
  lines.push('| Origin | Repo | File | Line | Kind | Access | Surface | Columns | Snippet |');
  lines.push('| --- | --- | --- | ---: | --- | --- | --- | --- | --- |');

  const priority = { write: 0, read: 1, unknown: 2 };
  const topRefs = [...output.references]
    .sort((a, b) => {
      const pa = priority[a.access] ?? 3;
      const pb = priority[b.access] ?? 3;
      if (pa !== pb) return pa - pb;
      if (a.repo !== b.repo) return a.repo.localeCompare(b.repo);
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.line - b.line;
    })
    .slice(0, 120);

  for (const ref of topRefs) {
    const cols = ref.matched_columns.join(', ') || '-';
    const snippet = ref.snippet.replace(/\|/g, '\\|');
    lines.push(
      `| ${ref.origin} | ${ref.repo} | ${ref.file} | ${ref.line} | ${ref.kind} | ${ref.access} | ${ref.surface} | ${cols} | ${snippet} |`
    );
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function run() {
  const schemaDumpColumns = extractColumnsFromSchemaDump(TABLE_NAME);
  const migrationColumns = extractColumnsFromMigrations(TABLE_NAME);

  const tableColumns = unique([
    ...(schemaDumpColumns?.columns || []),
    ...migrationColumns,
  ]);

  if (tableColumns.length === 0) {
    fail(`could not extract columns for table "${TABLE_NAME}" from schema dump or migrations`);
  }

  const repoRoots = [
    {
      id: 'app',
      root: APP_ROOT,
      scanEntries: [
        'app',
        'components',
        'constants',
        'contexts',
        'hooks',
        'providers',
        'screens',
        'services',
        'types',
        'utils',
        'supabase/functions',
        'App.js',
        'index.js',
      ],
    },
    {
      id: 'console',
      root: CONSOLE_ROOT,
      scanEntries: ['src'],
    },
  ].filter((repo) => fs.existsSync(repo.root));

  const sourceReferences = collectSourceReferences({
    tableName: TABLE_NAME,
    tableColumns,
    repoRoots,
  });

  const migrationReferences = collectMigrationReferences({
    tableName: TABLE_NAME,
    tableColumns,
  });

  const references = [...migrationReferences, ...sourceReferences];
  const summary = summarizeReferences(references, tableColumns);
  const consoleMatrixSurface = readConsoleMatrixSurface(TABLE_NAME);

  const output = {
    generated_at: nowIso(),
    source: 'export_table_flow_trace.js',
    table: TABLE_NAME,
    table_columns: tableColumns,
    column_sources: {
      schema_dump: schemaDumpColumns?.source || null,
      migration_scan: normalizePath(path.relative(ROOT, MIGRATIONS_DIR)),
    },
    repos_scanned: ['db', ...repoRoots.map((repo) => repo.id)],
    summary,
    console_matrix_surface: consoleMatrixSurface,
    references,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  fs.writeFileSync(OUT_MD_FILE, buildMarkdown(output));

  console.log(`[table-flow-trace] table=${TABLE_NAME}`);
  console.log(`[table-flow-trace] columns=${tableColumns.length} refs=${summary.total_references}`);
  console.log(`[table-flow-trace] json=${OUT_FILE}`);
  console.log(`[table-flow-trace] markdown=${OUT_MD_FILE}`);
}

run();
