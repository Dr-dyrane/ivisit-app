#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONSOLE_ROOT = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const OUT_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_FILE = path.join(OUT_DIR, 'payments_surface_field_guard_report.json');

const RULES = [
  {
    id: 'payments_wallet_ui_no_payment_method_id_alias',
    mode: 'forbid',
    file: 'src/components/pages/WalletManagementPage.jsx',
    pattern: /\bpayment\?\.\s*payment_method_id\b/g,
    message:
      'Wallet payments UI should not read payment_method_id; use canonical payments.payment_method.',
  },
  {
    id: 'payments_wallet_ui_no_raw_payment_description_desktop',
    mode: 'forbid',
    file: 'src/components/pages/WalletManagementPage.jsx',
    pattern: /\{\s*item\.description\s*\}/g,
    message:
      'Wallet payments desktop row should not render raw item.description for payments rows.',
  },
  {
    id: 'payments_wallet_ui_no_raw_payment_description_mobile',
    mode: 'forbid',
    file: 'src/components/mobile/MobileWallet.jsx',
    pattern: /value=\{\s*item\.description\s*\|\|/g,
    message:
      'Mobile wallet payment row should not render raw item.description for payments rows.',
  },
  {
    id: 'payments_wallet_ui_requires_payment_description_desktop',
    mode: 'require',
    file: 'src/components/pages/WalletManagementPage.jsx',
    pattern: /formatPaymentDescription\(item\)/g,
    message:
      'Wallet desktop payments rows must use formatPaymentDescription(item) for canonical display text.',
  },
  {
    id: 'payments_wallet_ui_requires_payment_description_mobile',
    mode: 'require',
    file: 'src/components/mobile/MobileWallet.jsx',
    pattern: /formatPaymentDescription\(item\)/g,
    message:
      'Wallet mobile payments rows must use formatPaymentDescription(item) for canonical display text.',
  },
  {
    id: 'payments_modal_no_legacy_fee_amount_fallback',
    mode: 'forbid',
    file: 'src/components/modals/EmergencyDetailsModal.jsx',
    pattern: /\brequest\.fee_amount\b/g,
    message:
      'Emergency details modal should not read request.fee_amount; use canonical request.total_cost/payment amount.',
  },
];

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[payments-surface-field-guard] FAIL: ${message}`);
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
    .slice(Math.max(0, index - 80), Math.min(content.length, index + 140))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
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
      fail(`unsupported rule mode: ${rule.mode}`);
    }
  }

  const report = {
    generated_at: nowIso(),
    source: 'assert_payments_surface_field_guard.js',
    status: violations.length === 0 ? 'pass' : 'fail',
    rule_count: RULES.length,
    violations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    console.error('[payments-surface-field-guard] FAIL: field-guard violations detected.');
    for (const violation of violations) {
      console.error(
        `- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`
      );
    }
    console.error(`[payments-surface-field-guard] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[payments-surface-field-guard] PASS: no stale payments/wallet field references detected.');
  console.log(`[payments-surface-field-guard] Report written: ${OUT_FILE}`);
}

run();
