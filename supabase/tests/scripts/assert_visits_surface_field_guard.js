#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'visits_surface_field_guard_report.json');

const RULES = [
  {
    id: 'visits_no_legacy_doctor_id_reads',
    file: 'src/components/pages/VisitsPage.jsx',
    pattern: /\bvisit\.doctor_id\b/g,
    message: 'Visits page should not read visit.doctor_id (column is not in visits contract).',
  },
  {
    id: 'visits_no_legacy_doctor_id_reads_list',
    file: 'src/components/views/VisitListView.jsx',
    pattern: /\bvisit\.doctor_id\b/g,
    message: 'Visit list should not read visit.doctor_id (column is not in visits contract).',
  },
  {
    id: 'visits_no_legacy_patient_name_reads_mobile',
    file: 'src/components/mobile/MobileVisits.jsx',
    pattern: /\b(?:v|visit)\.patient_name\b/g,
    message: 'Mobile visits should not read patient_name (use patient.username/full_name from linked profile).',
  },
  {
    id: 'visits_no_patient_name_query_comment_drift',
    file: 'src/components/pages/VisitsPage.jsx',
    pattern: /\bpatient_name\b/gi,
    message: 'Visits page contains stale patient_name reference; keep search paths aligned to schema.',
  },
  {
    id: 'visits_no_non_schema_summary_write',
    file: 'src/services/visitsService.js',
    pattern: /\bsummary\s*:/g,
    message: 'visitsService should not write summary column (not in visits schema contract).',
  },
  {
    id: 'visits_no_non_schema_prescriptions_write',
    file: 'src/services/visitsService.js',
    pattern: /\bprescriptions\s*:/g,
    message: 'visitsService should not write prescriptions column (not in visits schema contract).',
  },
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[visits-surface-field-guard] FAIL: ${message}`);
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
        message: `required file missing: ${rule.file}`,
        snippet: '',
      });
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const line = getLineNumber(content, match.index);
      const snippet = content
        .slice(Math.max(0, match.index - 60), Math.min(content.length, match.index + 120))
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);

      violations.push({
        rule: rule.id,
        file: normalizePath(rule.file),
        line,
        message: rule.message,
        snippet,
      });
    }
  }

  const report = {
    generated_at: nowIso(),
    source: 'assert_visits_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    rule_count: RULES.length,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[visits-surface-field-guard] FAIL: field-guard violations detected.');
    for (const violation of violations) {
      console.error(
        `- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`
      );
    }
    console.error(`[visits-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[visits-surface-field-guard] PASS: no stale visits field references detected.');
  console.log(`[visits-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
