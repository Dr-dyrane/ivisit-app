#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'profiles_surface_field_guard_report.json');

const TYPE_FILE = 'src/types/database.ts';
const SERVICE_FILE = 'src/services/profilesService.js';

const EXPECTED_ALLOWED_FIELDS = [
  'email',
  'phone',
  'username',
  'first_name',
  'last_name',
  'full_name',
  'image_uri',
  'avatar_url',
  'role',
  'organization_id',
  'provider_type',
  'bvn_verified',
  'address',
  'gender',
  'date_of_birth',
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[profiles-surface-field-guard] FAIL: ${message}`);
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

function pushViolation(violations, { rule, file, line = 1, message, snippet = '' }) {
  violations.push({
    rule,
    file: normalizePath(file),
    line,
    message,
    snippet,
  });
}

function assertTypeDisplayIdParity(typeContent, violations) {
  const checks = [
    {
      id: 'profiles_row_has_display_id',
      pattern: /profiles:\s*{[\s\S]*?Row:\s*{[\s\S]*?display_id:\s*string\s*\|\s*null/g,
      message: 'console profiles Row type must include canonical display_id.',
    },
    {
      id: 'profiles_insert_has_display_id',
      pattern: /profiles:\s*{[\s\S]*?Insert:\s*{[\s\S]*?display_id\?:\s*string\s*\|\s*null/g,
      message: 'console profiles Insert type must include canonical display_id.',
    },
    {
      id: 'profiles_update_has_display_id',
      pattern: /profiles:\s*{[\s\S]*?Update:\s*{[\s\S]*?display_id\?:\s*string\s*\|\s*null/g,
      message: 'console profiles Update type must include canonical display_id.',
    },
  ];

  for (const check of checks) {
    const regex = new RegExp(check.pattern.source, check.pattern.flags);
    if (!regex.test(typeContent)) {
      pushViolation(violations, {
        rule: check.id,
        file: TYPE_FILE,
        message: check.message,
      });
    }
  }
}

function parseAllowedFields(serviceContent, violations) {
  const match = serviceContent.match(/const\s+allowedFields\s*=\s*\[([\s\S]*?)\];/);
  if (!match) {
    pushViolation(violations, {
      rule: 'profiles_service_allowed_fields_missing',
      file: SERVICE_FILE,
      message: 'profiles service must define an explicit allowedFields whitelist for updates.',
    });
    return [];
  }

  const block = match[1];
  const fields = [];
  const fieldRegex = /'([^']+)'/g;
  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(block)) !== null) {
    fields.push(fieldMatch[1]);
  }
  return fields;
}

function assertAllowedFields(fields, serviceContent, violations) {
  if (fields.length === 0) {
    pushViolation(violations, {
      rule: 'profiles_service_allowed_fields_empty',
      file: SERVICE_FILE,
      message: 'profiles allowedFields whitelist cannot be empty.',
    });
    return;
  }

  const expected = new Set(EXPECTED_ALLOWED_FIELDS);
  const seen = new Set();
  const duplicates = [];
  for (const field of fields) {
    if (seen.has(field)) duplicates.push(field);
    seen.add(field);
  }

  const disallowed = fields.filter((field) => !expected.has(field));
  const missing = EXPECTED_ALLOWED_FIELDS.filter((field) => !seen.has(field));

  if (duplicates.length > 0) {
    pushViolation(violations, {
      rule: 'profiles_service_allowed_fields_duplicates',
      file: SERVICE_FILE,
      message: `profiles allowedFields contains duplicates: ${duplicates.join(', ')}`,
    });
  }

  if (disallowed.length > 0) {
    pushViolation(violations, {
      rule: 'profiles_service_allowed_fields_non_schema',
      file: SERVICE_FILE,
      message: `profiles allowedFields contains non-schema/non-approved keys: ${disallowed.join(', ')}`,
    });
  }

  if (missing.length > 0) {
    pushViolation(violations, {
      rule: 'profiles_service_allowed_fields_missing_expected',
      file: SERVICE_FILE,
      message: `profiles allowedFields is missing expected keys: ${missing.join(', ')}`,
    });
  }

  const updatedAtIndex = serviceContent.indexOf('payload.updated_at = new Date().toISOString();');
  if (updatedAtIndex < 0) {
    pushViolation(violations, {
      rule: 'profiles_service_updated_at_required',
      file: SERVICE_FILE,
      message: 'profiles update payload must stamp updated_at before persistence.',
    });
  }
}

function run() {
  if (!fs.existsSync(CONSOLE_ROOT)) {
    fail(`console frontend path not found: ${CONSOLE_ROOT}`);
  }

  const violations = [];

  const typePath = path.join(CONSOLE_ROOT, TYPE_FILE);
  const servicePath = path.join(CONSOLE_ROOT, SERVICE_FILE);

  if (!fs.existsSync(typePath)) {
    fail(`required file missing: ${typePath}`);
  }
  if (!fs.existsSync(servicePath)) {
    fail(`required file missing: ${servicePath}`);
  }

  const typeContent = fs.readFileSync(typePath, 'utf8');
  const serviceContent = fs.readFileSync(servicePath, 'utf8');

  assertTypeDisplayIdParity(typeContent, violations);
  const fields = parseAllowedFields(serviceContent, violations);
  assertAllowedFields(fields, serviceContent, violations);

  const report = {
    generated_at: nowIso(),
    source: 'assert_profiles_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    expected_allowed_fields: EXPECTED_ALLOWED_FIELDS,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[profiles-surface-field-guard] FAIL: field-guard violations detected.');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    }
    console.error(`[profiles-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[profiles-surface-field-guard] PASS: no profiles surface field violations detected.');
  console.log(`[profiles-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
