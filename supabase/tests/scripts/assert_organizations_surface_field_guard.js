#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'organizations_surface_field_guard_report.json');

const RULES = [
  {
    id: 'console_organizations_type_row_has_display_id',
    mode: 'require',
    file: 'src/types/database.ts',
    pattern: /organizations:\s*{[\s\S]*?Row:\s*{[\s\S]*?display_id:\s*string\s*\|\s*null/g,
    message: 'console organizations Row type must include canonical display_id.',
  },
  {
    id: 'console_organizations_type_insert_has_display_id',
    mode: 'require',
    file: 'src/types/database.ts',
    pattern: /organizations:\s*{[\s\S]*?Insert:\s*{[\s\S]*?display_id\?:\s*string\s*\|\s*null/g,
    message: 'console organizations Insert type must include canonical display_id.',
  },
  {
    id: 'console_organizations_type_update_has_display_id',
    mode: 'require',
    file: 'src/types/database.ts',
    pattern: /organizations:\s*{[\s\S]*?Update:\s*{[\s\S]*?display_id\?:\s*string\s*\|\s*null/g,
    message: 'console organizations Update type must include canonical display_id.',
  },
  {
    id: 'console_organizations_service_no_non_schema_write_keys',
    mode: 'forbid',
    file: 'src/services/organizationsService.js',
    pattern: /\b(status|verified|verification_status|description)\s*:/g,
    message: 'organizations service must not write/read non-schema organizations keys in payload mapping.',
  },
  {
    id: 'console_organizations_service_numeric_fee_sanitization',
    mode: 'require',
    file: 'src/services/organizationsService.js',
    pattern: /\bivisit_fee_percentage:\s*toFiniteOrNull\(org\.ivisit_fee_percentage\)/g,
    message: 'organizations service must sanitize ivisit_fee_percentage numerically before persistence.',
  },
  {
    id: 'console_organizations_service_prunes_undefined_payload',
    mode: 'require',
    file: 'src/services/organizationsService.js',
    pattern: /return\s+pruneUndefined\(payload\)/g,
    message: 'organizations payload builder must prune undefined keys before insert/update.',
  },
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[organizations-surface-field-guard] FAIL: ${message}`);
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

function snippetAround(content, index) {
  return content
    .slice(Math.max(0, index - 80), Math.min(content.length, index + 180))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

function run() {
  if (!fs.existsSync(CONSOLE_ROOT)) {
    fail(`console frontend path not found: ${CONSOLE_ROOT}`);
  }

  const violations = [];

  for (const rule of RULES) {
    const fullPath = path.join(CONSOLE_ROOT, rule.file);
    if (!fs.existsSync(fullPath)) {
      violations.push({
        rule: rule.id,
        file: normalizePath(rule.file),
        line: 1,
        mode: rule.mode,
        message: `required file missing: ${rule.file}`,
        snippet: '',
      });
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        line: getLineNumber(content, match.index),
        snippet: snippetAround(content, match.index),
      });
    }

    if (rule.mode === 'forbid') {
      for (const found of matches) {
        violations.push({
          rule: rule.id,
          file: normalizePath(rule.file),
          line: found.line,
          mode: rule.mode,
          message: rule.message,
          snippet: found.snippet,
        });
      }
    } else if (rule.mode === 'require') {
      if (matches.length === 0) {
        violations.push({
          rule: rule.id,
          file: normalizePath(rule.file),
          line: 1,
          mode: rule.mode,
          message: rule.message,
          snippet: '',
        });
      }
    } else {
      fail(`unsupported rule mode "${rule.mode}" for rule ${rule.id}`);
    }
  }

  const report = {
    generated_at: nowIso(),
    source: 'assert_organizations_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    rule_count: RULES.length,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[organizations-surface-field-guard] FAIL: field-guard violations detected.');
    for (const violation of violations) {
      console.error(
        `- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`
      );
    }
    console.error(`[organizations-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[organizations-surface-field-guard] PASS: no organizations surface field violations detected.');
  console.log(`[organizations-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
