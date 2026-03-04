#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONSOLE_COMPONENTS = path.resolve(ROOT, '..', 'ivisit-console', 'frontend', 'src', 'components');
const TARGET_DIRS = ['pages', 'modals'];

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function collectFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }
    if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function lineForIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}

function stripCommentsPreserveLength(source) {
  let stripped = source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));
  stripped = stripped.replace(/(^|[^:\\])\/\/[^\n]*/gm, (line, prefix) => {
    const suffixLength = line.length - prefix.length;
    return `${prefix}${' '.repeat(Math.max(0, suffixLength))}`;
  });
  return stripped;
}

function toRelativeConsolePath(absolutePath) {
  return path
    .relative(path.resolve(ROOT, '..', 'ivisit-console', 'frontend'), absolutePath)
    .split(path.sep)
    .join('/');
}

function run() {
  const startedAt = nowIso();
  console.log(`[console-direct-mutation] Starting at ${startedAt}`);

  if (!fs.existsSync(CONSOLE_COMPONENTS)) {
    console.error('[console-direct-mutation] Missing components root:', CONSOLE_COMPONENTS);
    process.exit(1);
  }

  const files = TARGET_DIRS.flatMap((dirName) => collectFiles(path.join(CONSOLE_COMPONENTS, dirName)));
  const directMutations = [];
  const rpcCalls = [];

  const mutationRegex = /\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)([\s\S]{0,500}?)\.(insert|update|upsert|delete)\s*\(/g;
  const rpcRegex = /\.rpc\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*(?:,|\))/g;

  for (const filePath of files) {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const content = stripCommentsPreserveLength(rawContent);
    const relativeFile = toRelativeConsolePath(filePath);

    let mm;
    while ((mm = mutationRegex.exec(content)) !== null) {
      const table = mm[1];
      const operation = mm[3];
      const line = lineForIndex(rawContent, mm.index);
      directMutations.push({
        file: relativeFile,
        line,
        table,
        operation,
      });
    }

    let rm;
    while ((rm = rpcRegex.exec(content)) !== null) {
      const rpc = rm[1];
      const line = lineForIndex(rawContent, rm.index);
      rpcCalls.push({
        file: relativeFile,
        line,
        rpc,
      });
    }
  }

  const tableCounts = {};
  const fileCounts = {};
  for (const mutation of directMutations) {
    tableCounts[mutation.table] = (tableCounts[mutation.table] || 0) + 1;
    fileCounts[mutation.file] = (fileCounts[mutation.file] || 0) + 1;
  }

  const report = {
    generated_at: nowIso(),
    source: 'run_console_direct_mutation_surface_report.js',
    summary: {
      scanned_files: files.length,
      direct_mutation_calls: directMutations.length,
      rpc_calls_in_components: rpcCalls.length,
      direct_mutation_tables: Object.keys(tableCounts).sort(),
      direct_mutation_files: Object.keys(fileCounts).sort(),
    },
    direct_mutations: directMutations,
    rpc_calls: rpcCalls,
    counts: {
      by_table: Object.fromEntries(Object.entries(tableCounts).sort((a, b) => a[0].localeCompare(b[0]))),
      by_file: Object.fromEntries(Object.entries(fileCounts).sort((a, b) => a[0].localeCompare(b[0]))),
    },
  };

  const outDir = path.join(ROOT, 'supabase', 'tests', 'validation');
  ensureDir(outDir);
  const outFile = path.join(outDir, 'console_direct_mutation_surface_report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log(`[console-direct-mutation] Report written: ${outFile}`);
  console.log(
    `[console-direct-mutation] scanned_files=${report.summary.scanned_files} direct_mutation_calls=${report.summary.direct_mutation_calls} rpc_calls_in_components=${report.summary.rpc_calls_in_components}`
  );
}

run();
