#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VALIDATION_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');

const NON_RUNTIME_FILE_PATTERNS = [
  /^docs\//,
  /^supabase\/docs\//,
  /^supabase\/tests\//,
  /^supabase\/database\.ts$/,
  /^types\/database\.ts$/,
  /^src\/types\//,
  /^supabase\/seed\.sql$/,
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--table') {
      args.table = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--allow-missing') {
      args.allowMissing = (argv[i + 1] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
  }
  return args;
}

function normalizePath(p) {
  return String(p || '').replace(/\\/g, '/');
}

function isRuntimeFile(file) {
  const normalized = normalizePath(file);
  if (!normalized) return false;
  return !NON_RUNTIME_FILE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function fail(message) {
  console.error(`[table-field-runtime-coverage] FAIL: ${message}`);
  process.exit(1);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeMarkdown(filePath, report) {
  const lines = [];
  lines.push(`# Table Field Runtime Coverage: ${report.table}`);
  lines.push('');
  lines.push(`- Generated: ${report.generated_at}`);
  lines.push(`- Trace Source: ${report.trace_file}`);
  lines.push(`- Runtime References Scanned: ${report.runtime_reference_count}`);
  lines.push(`- Missing Runtime Columns: ${report.missing_columns.length}`);
  if (report.allowed_missing_columns.length > 0) {
    lines.push(`- Allowed Missing Columns: ${report.allowed_missing_columns.join(', ')}`);
  }
  lines.push('');
  lines.push('## Column Coverage');
  lines.push('');
  lines.push('| Column | Runtime Refs | Read | Write | Repos | Sample Files |');
  lines.push('| --- | ---: | ---: | ---: | --- | --- |');
  for (const row of report.columns) {
    const repos = row.repos.length ? row.repos.join(', ') : '-';
    const files = row.sample_files.length ? row.sample_files.join('<br/>') : '-';
    lines.push(`| ${row.column} | ${row.runtime_refs} | ${row.read_refs} | ${row.write_refs} | ${repos} | ${files} |`);
  }
  lines.push('');
  if (report.missing_columns.length > 0) {
    lines.push('## Missing Runtime Coverage');
    lines.push('');
    for (const col of report.missing_columns) {
      lines.push(`- ${col}`);
    }
    lines.push('');
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const { table, allowMissing = [] } = parseArgs(process.argv.slice(2));
  if (!table) {
    fail('Missing required --table argument.');
  }

  const traceFile = path.join(VALIDATION_DIR, `table_flow_trace_${table}.json`);
  if (!fs.existsSync(traceFile)) {
    fail(`Trace file not found: ${normalizePath(traceFile)}. Run: node supabase/tests/scripts/export_table_flow_trace.js --table ${table}`);
  }

  const trace = JSON.parse(fs.readFileSync(traceFile, 'utf8'));
  const references = Array.isArray(trace.references) ? trace.references : [];
  const runtimeReferences = references.filter((ref) => (
    isRuntimeFile(ref.file)
    && String(ref.surface || '').toLowerCase() !== 'type'
  ));
  const tableColumns = Array.isArray(trace.table_columns) ? trace.table_columns : [];
  const allowedMissingSet = new Set(allowMissing);

  const columns = tableColumns.map((column) => {
    const columnRefs = runtimeReferences.filter((ref) => (
      Array.isArray(ref.matched_columns) && ref.matched_columns.includes(column)
    ));
    const readRefs = columnRefs.filter((ref) => ref.access === 'read').length;
    const writeRefs = columnRefs.filter((ref) => ref.access === 'write').length;
    const repos = [...new Set(columnRefs.map((ref) => ref.repo).filter(Boolean))].sort();
    const sampleFiles = [...new Set(columnRefs.map((ref) => normalizePath(ref.file)).filter(Boolean))].slice(0, 5);
    return {
      column,
      runtime_refs: columnRefs.length,
      read_refs: readRefs,
      write_refs: writeRefs,
      repos,
      sample_files: sampleFiles,
    };
  });

  const missingColumns = columns
    .filter((row) => row.runtime_refs === 0 && !allowedMissingSet.has(row.column))
    .map((row) => row.column);

  const report = {
    generated_at: new Date().toISOString(),
    table,
    trace_file: normalizePath(path.relative(ROOT, traceFile)),
    runtime_reference_count: runtimeReferences.length,
    allowed_missing_columns: [...allowedMissingSet].sort(),
    missing_columns: missingColumns,
    columns,
  };

  const outJson = path.join(VALIDATION_DIR, `table_field_runtime_coverage_${table}.json`);
  const outMd = path.join(VALIDATION_DIR, `table_field_runtime_coverage_${table}.md`);
  writeJson(outJson, report);
  writeMarkdown(outMd, report);

  if (missingColumns.length > 0) {
    fail(`Missing runtime coverage for columns: ${missingColumns.join(', ')}`);
  }

  console.log(`[table-field-runtime-coverage] PASS: ${table} has runtime coverage for all columns.`);
  console.log(`[table-field-runtime-coverage] Report written: ${normalizePath(path.relative(ROOT, outJson))}`);
}

main();
