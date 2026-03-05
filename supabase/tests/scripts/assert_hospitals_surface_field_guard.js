#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_ROOT = ROOT;
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'hospitals_surface_field_guard_report.json');

const ROOTS = {
  app: APP_ROOT,
  console: CONSOLE_ROOT,
};

const RULES = [
  {
    id: 'app_hospital_import_no_legacy_google_columns',
    mode: 'forbid',
    root: 'app',
    file: 'services/hospitalImportService.js',
    pattern: /\bgoogle_(address|phone|website|photos|opening_hours|types|rating)\b/g,
    message: 'app hospital import service must not write/read non-schema hospitals.google_* columns.',
  },
  {
    id: 'app_hospital_import_no_legacy_import_status',
    mode: 'forbid',
    root: 'app',
    file: 'services/hospitalImportService.js',
    pattern: /\bimport_status\b/g,
    message: 'app hospital import service must use verification_status (not import_status).',
  },
  {
    id: 'app_hospital_import_no_last_google_sync',
    mode: 'forbid',
    root: 'app',
    file: 'services/hospitalImportService.js',
    pattern: /\blast_google_sync\b/g,
    message: 'app hospital import service must not reference non-schema hospitals.last_google_sync.',
  },
  {
    id: 'app_hospital_select_no_legacy_import_flags',
    mode: 'forbid',
    root: 'app',
    file: 'hooks/emergency/useHospitalSelection.js',
    pattern: /\bhospital\.(?:import_status|imported_from_google)\b/g,
    message: 'hospital selection hook must use mapped canonical properties (verificationStatus/importedFromGoogle).',
  },
  {
    id: 'app_hospital_call_no_google_phone_fallback',
    mode: 'forbid',
    root: 'app',
    file: 'components/emergency/EmergencyRequestModal.jsx',
    pattern: /\brequestHospital\?\.\s*google_phone\b/g,
    message: 'emergency request modal should call canonical requestHospital.phone only.',
  },
  {
    id: 'console_hospital_import_no_import_status_column_filter',
    mode: 'forbid',
    root: 'console',
    file: 'src/services/hospitalImportService.js',
    pattern: /\.eq\(\s*['"]import_status['"]/g,
    message: 'console hospital import service must not filter by import_status column.',
  },
  {
    id: 'console_hospital_import_no_import_status_writes',
    mode: 'forbid',
    root: 'console',
    file: 'src/services/hospitalImportService.js',
    pattern: /\bimport_status\s*:/g,
    message: 'console hospital import service must write verification_status instead of import_status.',
  },
  {
    id: 'console_hospital_modal_no_reserved_beds_field_write',
    mode: 'forbid',
    root: 'console',
    file: 'src/components/modals/HospitalModal.jsx',
    pattern: /\bformData\.reserved_beds\b|name=['"]reserved_beds['"]/g,
    message: 'hospital modal should not persist/read non-schema reserved_beds field.',
  },
  {
    id: 'console_hospital_modal_no_legacy_import_fields',
    mode: 'forbid',
    root: 'console',
    file: 'src/components/modals/HospitalModal.jsx',
    pattern: /\b(import_status|imported_from_google)\b/g,
    message: 'hospital modal should not emit legacy import status/flags on hospitals payload.',
  },
  {
    id: 'console_hospital_views_no_google_photos_fallback',
    mode: 'forbid',
    root: 'console',
    file: 'src/components/pages/HospitalsPage.jsx',
    pattern: /\bgoogle_photos\b/g,
    message: 'hospitals page should render canonical image field only.',
  },
  {
    id: 'console_hospital_list_no_google_photos_fallback',
    mode: 'forbid',
    root: 'console',
    file: 'src/components/views/HospitalListView.jsx',
    pattern: /\bgoogle_photos\b/g,
    message: 'hospital list view should render canonical image field only.',
  },
  {
    id: 'console_hospital_table_no_google_photos_fallback',
    mode: 'forbid',
    root: 'console',
    file: 'src/components/views/HospitalTableView.jsx',
    pattern: /\bgoogle_photos\b/g,
    message: 'hospital table view should render canonical image field only.',
  },
  {
    id: 'console_hospital_service_requires_total_beds_payload',
    mode: 'require',
    root: 'console',
    file: 'src/services/hospitalsService.js',
    pattern: /\bpayload\.total_beds\b/g,
    message: 'hospital service payload must include canonical total_beds persistence.',
  },
  {
    id: 'console_hospital_service_requires_place_id_payload',
    mode: 'require',
    root: 'console',
    file: 'src/services/hospitalsService.js',
    pattern: /\bpayload\.place_id\b/g,
    message: 'hospital service payload must include canonical place_id persistence.',
  },
  {
    id: 'db_hospital_rpc_requires_total_beds_update',
    mode: 'require',
    root: 'app',
    file: 'supabase/migrations/20260219010000_core_rpcs.sql',
    pattern: /total_beds\s*=\s*COALESCE\(\(payload->>'total_beds'\)::INT,\s*total_beds\)/g,
    message: 'update_hospital_by_admin must persist total_beds.',
  },
  {
    id: 'db_hospital_rpc_requires_place_id_update',
    mode: 'require',
    root: 'app',
    file: 'supabase/migrations/20260219010000_core_rpcs.sql',
    pattern: /place_id\s*=\s*COALESCE\(payload->>'place_id',\s*place_id\)/g,
    message: 'update_hospital_by_admin must persist place_id.',
  },
  {
    id: 'db_hospital_rpc_requires_type_update',
    mode: 'require',
    root: 'app',
    file: 'supabase/migrations/20260219010000_core_rpcs.sql',
    pattern: /type\s*=\s*COALESCE\(payload->>'type',\s*type\)/g,
    message: 'update_hospital_by_admin must persist type.',
  },
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[hospitals-surface-field-guard] FAIL: ${message}`);
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
    const baseRoot = ROOTS[rule.root];
    if (!baseRoot) {
      fail(`unsupported root "${rule.root}" for rule ${rule.id}`);
    }

    const fullPath = path.join(baseRoot, rule.file);
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
          file: normalizePath(path.join(rule.root, rule.file)),
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
          file: normalizePath(path.join(rule.root, rule.file)),
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
    source: 'assert_hospitals_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    rule_count: RULES.length,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[hospitals-surface-field-guard] FAIL: field-guard violations detected.');
    for (const violation of violations) {
      console.error(
        `- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`
      );
    }
    console.error(`[hospitals-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[hospitals-surface-field-guard] PASS: no hospitals surface field violations detected.');
  console.log(`[hospitals-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
