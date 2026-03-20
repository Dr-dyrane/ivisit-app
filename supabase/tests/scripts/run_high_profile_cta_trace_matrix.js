#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONSOLE_FRONTEND = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const VALIDATION_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const OUT_JSON = path.join(VALIDATION_DIR, 'high_profile_cta_trace_report.json');
const OUT_MD = path.join(VALIDATION_DIR, 'high_profile_cta_trace_report.md');

const APP_SOURCE_DIRS = ['app', 'components', 'screens', 'hooks', 'services'].map((dir) =>
  path.join(ROOT, dir)
);
const CONSOLE_SOURCE_DIRS = [
  path.join(CONSOLE_FRONTEND, 'src', 'components'),
  path.join(CONSOLE_FRONTEND, 'src', 'services'),
];

const INVENTORY_RULES = {
  app: [
    { id: 'on_press', regex: /\bonPress\s*=/g },
    { id: 'pressable', regex: /\bPressable\b/g },
    { id: 'touchable', regex: /\bTouchable(?:Opacity|Highlight|WithoutFeedback)\b/g },
    { id: 'on_submit', regex: /\bonSubmit\s*=/g },
  ],
  console: [
    { id: 'on_click', regex: /\bonClick\s*=/g },
    { id: 'button_tag', regex: /<Button\b/g },
    { id: 'on_submit', regex: /\bonSubmit\s*=/g },
    { id: 'dropdown_item_action', regex: /<DropdownMenuItem[^>]+onClick=/g },
  ],
};

const RUNTIME_GUARDS = [
  {
    id: 'emergency_runtime_confidence',
    report: 'emergency_runtime_confidence_report.json',
    evaluate: (json) => Boolean(json?.status === 'pass' && Array.isArray(json?.failures) && json.failures.length === 0),
    summary: (json) => `status=${json?.status || 'unknown'} failures=${Array.isArray(json?.failures) ? json.failures.length : 'n/a'}`,
  },
  {
    id: 'visits_runtime_confidence',
    report: 'visits_runtime_confidence_report.json',
    evaluate: (json) => Boolean(json?.status === 'pass' && Array.isArray(json?.failures) && json.failures.length === 0),
    summary: (json) => `status=${json?.status || 'unknown'} failures=${Array.isArray(json?.failures) ? json.failures.length : 'n/a'}`,
  },
  {
    id: 'modal_domain_coverage',
    report: 'modal_domain_coverage_report.json',
    evaluate: (json) => Boolean(json?.success === true && Array.isArray(json?.failures) && json.failures.length === 0),
    summary: (json) => `success=${Boolean(json?.success)} failures=${Array.isArray(json?.failures) ? json.failures.length : 'n/a'}`,
  },
  {
    id: 'console_transition_matrix',
    report: 'console_transition_matrix_report.json',
    evaluate: (json) => {
      const failed = Number(json?.summary?.failed ?? Number.MAX_SAFE_INTEGER);
      return Number.isFinite(failed) && failed === 0;
    },
    summary: (json) => `passed=${json?.summary?.passed ?? 'n/a'} failed=${json?.summary?.failed ?? 'n/a'} total=${json?.summary?.totalCases ?? 'n/a'}`,
  },
  {
    id: 'e2e_flow_matrix',
    report: 'e2e_flow_matrix_report.json',
    evaluate: (json) => {
      const scenarios = json?.scenarios || {};
      const required = ['cardAmbulance', 'cashAmbulance', 'completion', 'bedReservation', 'tipFlow', 'transitionAudit'];
      return required.every((key) => Object.prototype.hasOwnProperty.call(scenarios, key));
    },
    summary: (json) => {
      const scenarioKeys = Object.keys(json?.scenarios || {});
      return `scenarios=${scenarioKeys.length} keys=${scenarioKeys.join(',')}`;
    },
  },
];

const TRACE_CASES = [
  {
    id: 'app_quick_emergency_dispatch',
    priority: 'P0',
    journey: 'mobile_emergency',
    description: 'Quick emergency CTA submits an ambulance request through the auto-dispatch path.',
    checks: [
      {
        layer: 'ui',
        repo: 'app',
        file: 'screens/EmergencyScreen.jsx',
        mode: 'all',
        patterns: [
          'const handleQuickEmergencyAction = useCallback(async () => {',
          'onPress={handleQuickEmergencyPress}',
          'handleQuickEmergency("ambulance")',
        ],
      },
      {
        layer: 'flow',
        repo: 'app',
        file: 'hooks/emergency/useRequestFlow.js',
        mode: 'all',
        patterns: [
          'const handleQuickEmergency = useCallback(async (serviceType = "ambulance") => {',
          'const result = await handleRequestInitiated({',
        ],
      },
      {
        layer: 'service',
        repo: 'app',
        file: 'services/emergencyRequestsService.js',
        mode: 'all',
        patterns: ["supabase.rpc('create_emergency_v4'", 'requiresApproval: data.requires_approval'],
      },
      {
        layer: 'db',
        repo: 'migrations',
        mode: 'all',
        patterns: ['CREATE OR REPLACE FUNCTION public.create_emergency_v4('],
      },
    ],
  },
  {
    id: 'app_request_modal_submit',
    priority: 'P0',
    journey: 'mobile_emergency',
    description: 'Ambulance/bed request modals submit and complete via shared request flow handlers.',
    checks: [
      {
        layer: 'ui',
        repo: 'app',
        file: 'screens/RequestAmbulanceScreen.jsx',
        mode: 'all',
        patterns: ['onRequestInitiated={handleRequestInitiated}', 'onRequestComplete={handleDispatched}'],
      },
      {
        layer: 'ui',
        repo: 'app',
        file: 'screens/BookBedRequestScreen.jsx',
        mode: 'all',
        patterns: ['onRequestInitiated={handleRequestInitiated}', 'onRequestComplete={handleDispatched}'],
      },
      {
        layer: 'flow',
        repo: 'app',
        file: 'hooks/emergency/useRequestFlow.js',
        mode: 'all',
        patterns: ['const handleRequestInitiated = useCallback(', 'const createdRequest = await createRequest({'],
      },
      {
        layer: 'service',
        repo: 'app',
        file: 'services/emergencyRequestsService.js',
        mode: 'all',
        patterns: ['async create(request)', "supabase.rpc('create_emergency_v4'"],
      },
    ],
  },
  {
    id: 'app_cash_approval_notification_lane',
    priority: 'P0',
    journey: 'mobile_to_console_cash_approval',
    description: 'Cash-payment requests notify org admins and push pending-approval updates without blocking request creation.',
    checks: [
      {
        layer: 'flow',
        repo: 'app',
        file: 'hooks/emergency/useRequestFlow.js',
        mode: 'all',
        patterns: [
          'await notificationDispatcher.dispatchCashApprovalToOrgAdmins({',
          "await notificationDispatcher.dispatchEmergencyUpdate(",
          "'pending_approval'",
        ],
      },
      {
        layer: 'service',
        repo: 'app',
        file: 'services/notificationDispatcher.js',
        mode: 'all',
        patterns: ["async dispatchCashApprovalToOrgAdmins({", "supabase.rpc('notify_cash_approval_org_admins'"],
      },
      {
        layer: 'ui',
        repo: 'console',
        file: 'src/components/pages/EmergencyRequestsPage.jsx',
        mode: 'all',
        patterns: [
          ".on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, fetchRequests)",
          ".on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchRequests)",
        ],
      },
      {
        layer: 'db',
        repo: 'migrations',
        mode: 'all',
        patterns: ['CREATE OR REPLACE FUNCTION public.notify_cash_approval_org_admins('],
      },
    ],
  },
  {
    id: 'console_cash_approve_decline_actions',
    priority: 'P0',
    journey: 'console_cash_approval',
    description: 'Console approval modal exposes approve/decline CTAs wired to canonical cash-payment RPCs.',
    checks: [
      {
        layer: 'ui',
        repo: 'console',
        file: 'src/components/modals/EmergencyDetailsModal.jsx',
        mode: 'all',
        patterns: [
          'onClick={handleApprove}',
          'onClick={handleDecline}',
          'await approveCashPayment(paymentData.id, request.id);',
          'await declineCashPayment(paymentData.id, request.id);',
        ],
      },
      {
        layer: 'service',
        repo: 'console',
        file: 'src/services/emergencyService.js',
        mode: 'all',
        patterns: [
          'export async function approveCashPayment(paymentId, requestId)',
          'export async function declineCashPayment(paymentId, requestId)',
          "supabase.rpc('approve_cash_payment'",
          "supabase.rpc('decline_cash_payment'",
        ],
      },
      {
        layer: 'db',
        repo: 'migrations',
        mode: 'all',
        patterns: [
          'CREATE OR REPLACE FUNCTION public.approve_cash_payment(',
          'CREATE OR REPLACE FUNCTION public.decline_cash_payment(',
        ],
      },
    ],
  },
  {
    id: 'console_dispatch_actions',
    priority: 'P0',
    journey: 'console_dispatch',
    description: 'Dispatch CTAs route through dispatch handlers and canonical dispatch RPC.',
    checks: [
      {
        layer: 'ui',
        repo: 'console',
        file: 'src/components/pages/EmergencyRequestsPage.jsx',
        mode: 'all',
        patterns: [
          'const handleDispatch = useCallback(async (request) => {',
          'const result = await dispatchEmergency(request.id, request);',
          'onClick={() => handleDispatch(req)}',
        ],
      },
      {
        layer: 'service',
        repo: 'console',
        file: 'src/services/emergencyResponseService.js',
        mode: 'all',
        patterns: [
          'export async function dispatchEmergency(emergencyId, emergencyDetails)',
          "supabase.rpc('console_dispatch_emergency'",
        ],
      },
      {
        layer: 'db',
        repo: 'migrations',
        mode: 'all',
        patterns: ['CREATE OR REPLACE FUNCTION public.console_dispatch_emergency('],
      },
    ],
  },
  {
    id: 'console_retry_payment_action',
    priority: 'P0',
    journey: 'console_payment_recovery',
    description: 'Retry-payment CTA is available in emergency surfaces and calls canonical retry RPC.',
    checks: [
      {
        layer: 'ui',
        repo: 'console',
        file: 'src/components/pages/EmergencyRequestsPage.jsx',
        mode: 'all',
        patterns: [
          'const handleRetryPayment = useCallback(async (request, preferredPaymentMethodId = null) => {',
          'await retryPaymentWithDifferentMethod(requestId, selectedMethodId, userId);',
          'onClick={() => handleRetryPayment(req)}',
        ],
      },
      {
        layer: 'ui',
        repo: 'console',
        file: 'src/components/modals/EmergencyDetailsModal.jsx',
        mode: 'all',
        patterns: ['const handleRetry = async () => {', 'onClick={handleRetry}'],
      },
      {
        layer: 'service',
        repo: 'console',
        file: 'src/services/emergencyService.js',
        mode: 'all',
        patterns: [
          'export async function retryPaymentWithDifferentMethod(requestId, paymentMethodId, userId)',
          "supabase.rpc('retry_payment_with_different_method'",
        ],
      },
      {
        layer: 'db',
        repo: 'migrations',
        mode: 'all',
        patterns: ['CREATE OR REPLACE FUNCTION public.retry_payment_with_different_method('],
      },
    ],
  },
  {
    id: 'emergency_visit_sync_hydration',
    priority: 'P0',
    journey: 'mobile_visit_hydration',
    description: 'Emergency lifecycle data is synchronized into visits and consumed in app lifecycle handlers.',
    checks: [
      {
        layer: 'flow',
        repo: 'app',
        file: 'hooks/emergency/useRequestFlow.js',
        mode: 'all',
        patterns: ['Visit is NOW created by backend trigger (sync_emergency_to_visit)'],
      },
      {
        layer: 'flow',
        repo: 'app',
        file: 'hooks/emergency/useEmergencyHandlers.js',
        mode: 'all',
        patterns: ['setVisitLifecycle(', 'EMERGENCY_VISIT_LIFECYCLE'],
      },
      {
        layer: 'service',
        repo: 'app',
        file: 'services/visitsService.js',
        mode: 'all',
        patterns: ['request_id'],
      },
      {
        layer: 'service',
        repo: 'app',
        file: 'services/visitsService.js',
        mode: 'any',
        patterns: ["const TABLE = \"visits\";", '.from(TABLE)'],
      },
      {
        layer: 'db',
        repo: 'migrations',
        mode: 'all',
        patterns: [
          'CREATE OR REPLACE FUNCTION public.sync_emergency_to_visit()',
          'FOR EACH ROW EXECUTE PROCEDURE public.sync_emergency_to_visit();',
        ],
      },
    ],
  },
  {
    id: 'triage_parallel_capture_lane',
    priority: 'P1',
    journey: 'mobile_triage_parallel',
    description: 'Triage capture runs in parallel post-request/waiting/routing and persists through request updates.',
    checks: [
      {
        layer: 'flow',
        repo: 'app',
        file: 'hooks/emergency/useRequestFlow.js',
        mode: 'all',
        patterns: [
          'Non-blocking AI triage lane: collect + persist in parallel without delaying dispatch.',
          '.collectAndPersist({',
          'stage: "post_request"',
          'stage: "waiting_approval"',
          'stage: "routing"',
        ],
      },
      {
        layer: 'service',
        repo: 'app',
        file: 'services/triageService.js',
        mode: 'all',
        patterns: ['const TRIAGE_VERSION = "triage_v1";', 'collectAndPersist = async ({', 'buildTriageSnapshot({'],
      },
      {
        layer: 'service',
        repo: 'app',
        file: 'services/emergencyRequestsService.js',
        mode: 'all',
        patterns: ['async updateTriage(id, triageSnapshot, options = {})', "supabase.rpc('patient_update_emergency_request'"],
      },
      {
        layer: 'db',
        repo: 'migrations',
        mode: 'all',
        patterns: ['CREATE OR REPLACE FUNCTION public.patient_update_emergency_request('],
      },
    ],
  },
  {
    id: 'rating_and_tip_completion_lane',
    priority: 'P0',
    journey: 'mobile_post_visit_settlement',
    description: 'Rating modal submit supports wallet tip and cash tip fallback via canonical finance RPCs.',
    checks: [
      {
        layer: 'ui',
        repo: 'app',
        file: 'screens/EmergencyScreen.jsx',
        mode: 'all',
        patterns: [
          'onSubmit={async ({ rating, comment, serviceType, tipAmount, tipCurrency }) => {',
          'const tipResult = await paymentService.processVisitTip(',
          'const cashTipResult = await paymentService.recordVisitCashTip(',
        ],
      },
      {
        layer: 'service',
        repo: 'app',
        file: 'services/paymentService.js',
        mode: 'all',
        patterns: [
          'async processVisitTip(visitId, tipAmount, currency = \'USD\')',
          "supabase.rpc('process_visit_tip'",
          'async recordVisitCashTip(visitId, tipAmount, currency = \'USD\')',
          "supabase.rpc('record_visit_cash_tip'",
        ],
      },
      {
        layer: 'db',
        repo: 'migrations',
        mode: 'all',
        patterns: [
          'CREATE OR REPLACE FUNCTION public.process_visit_tip(',
          'CREATE OR REPLACE FUNCTION public.record_visit_cash_tip(',
        ],
      },
    ],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function toPosixRelative(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join('/');
}

function listFilesRecursive(startDir, extensions, out = []) {
  if (!fs.existsSync(startDir)) return out;
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.expo') {
        continue;
      }
      listFilesRecursive(abs, extensions, out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (extensions.includes(ext)) out.push(abs);
  }
  return out;
}

function safeRead(absPath) {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

function countRegex(content, regex) {
  const matches = content.match(regex);
  return Array.isArray(matches) ? matches.length : 0;
}

function computeInventory(sourceDirs, rules) {
  const files = [];
  for (const dir of sourceDirs) {
    listFilesRecursive(dir, ['.js', '.jsx', '.ts', '.tsx'], files);
  }

  const totals = Object.fromEntries(rules.map((rule) => [rule.id, 0]));
  const fileScores = [];

  for (const absPath of files) {
    const content = safeRead(absPath);
    if (typeof content !== 'string') continue;

    let score = 0;
    for (const rule of rules) {
      const count = countRegex(content, rule.regex);
      totals[rule.id] += count;
      score += count;
    }
    if (score > 0) {
      fileScores.push({
        file: toPosixRelative(absPath),
        score,
      });
    }
  }

  fileScores.sort((a, b) => b.score - a.score);

  return {
    scanned_files: files.length,
    totals,
    total_interaction_handlers: Object.values(totals).reduce((sum, n) => sum + n, 0),
    top_files: fileScores.slice(0, 20),
  };
}

function checkPatterns(content, patterns, mode = 'all') {
  const matched = [];
  const missing = [];

  for (const pattern of patterns) {
    if (content.includes(pattern)) matched.push(pattern);
    else missing.push(pattern);
  }

  const passed = mode === 'any' ? matched.length > 0 : missing.length === 0;
  return { passed, matched, missing };
}

function runRuntimeGuards() {
  return RUNTIME_GUARDS.map((guard) => {
    const filePath = path.join(VALIDATION_DIR, guard.report);
    const exists = fs.existsSync(filePath);
    if (!exists) {
      return {
        id: guard.id,
        report: toPosixRelative(filePath),
        exists: false,
        passed: false,
        summary: 'missing report file',
      };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      return {
        id: guard.id,
        report: toPosixRelative(filePath),
        exists: true,
        passed: false,
        summary: `invalid JSON: ${error.message}`,
      };
    }

    const passed = Boolean(guard.evaluate(parsed));
    return {
      id: guard.id,
      report: toPosixRelative(filePath),
      exists: true,
      passed,
      summary: guard.summary(parsed),
    };
  });
}

function evaluateTraceCases(migrationsContent) {
  const results = [];

  for (const trace of TRACE_CASES) {
    const checkResults = [];

    for (const check of trace.checks) {
      if (check.repo === 'migrations') {
        const outcome = checkPatterns(migrationsContent, check.patterns, check.mode || 'all');
        checkResults.push({
          layer: check.layer,
          repo: check.repo,
          target: 'supabase/migrations/*.sql',
          mode: check.mode || 'all',
          passed: outcome.passed,
          matched_patterns: outcome.matched,
          missing_patterns: outcome.missing,
          missing_file: false,
        });
        continue;
      }

      const baseDir = check.repo === 'console' ? CONSOLE_FRONTEND : ROOT;
      const targetPath = path.join(baseDir, check.file);
      const content = safeRead(targetPath);
      if (content == null) {
        checkResults.push({
          layer: check.layer,
          repo: check.repo,
          target: check.file,
          mode: check.mode || 'all',
          passed: false,
          matched_patterns: [],
          missing_patterns: check.patterns,
          missing_file: true,
        });
        continue;
      }

      const outcome = checkPatterns(content, check.patterns, check.mode || 'all');
      checkResults.push({
        layer: check.layer,
        repo: check.repo,
        target: check.file,
        mode: check.mode || 'all',
        passed: outcome.passed,
        matched_patterns: outcome.matched,
        missing_patterns: outcome.missing,
        missing_file: false,
      });
    }

    const passed = checkResults.every((check) => check.passed);
    const failedChecks = checkResults.filter((check) => !check.passed);

    results.push({
      id: trace.id,
      priority: trace.priority,
      journey: trace.journey,
      description: trace.description,
      passed,
      checks: checkResults,
      failed_check_count: failedChecks.length,
      failed_checks: failedChecks.map((check) => ({
        layer: check.layer,
        repo: check.repo,
        target: check.target,
        missing_file: check.missing_file,
        missing_patterns: check.missing_patterns,
      })),
    });
  }

  return results;
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# High-Profile CTA Trace Report');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Source: ${report.source}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Runtime guards passed: ${report.summary.runtime_guards_passed}/${report.summary.runtime_guards_total}`);
  lines.push(`- High-profile traces passed: ${report.summary.traces_passed}/${report.summary.traces_total}`);
  lines.push(`- App interaction handlers (inventory): ${report.inventory.app.total_interaction_handlers}`);
  lines.push(`- Console interaction handlers (inventory): ${report.inventory.console.total_interaction_handlers}`);
  lines.push('');
  lines.push('## Runtime Guards');
  lines.push('');
  for (const guard of report.runtime_guards) {
    lines.push(`- [${guard.passed ? 'PASS' : 'FAIL'}] ${guard.id} -> ${guard.summary} (${guard.report})`);
  }
  lines.push('');
  lines.push('## High-Profile Traces');
  lines.push('');
  for (const trace of report.traces) {
    lines.push(`### ${trace.id} (${trace.priority})`);
    lines.push(`- Journey: ${trace.journey}`);
    lines.push(`- Status: ${trace.passed ? 'PASS' : 'FAIL'}`);
    lines.push(`- Description: ${trace.description}`);
    if (trace.failed_checks.length > 0) {
      lines.push('- Missing:');
      for (const failed of trace.failed_checks) {
        const missing = failed.missing_patterns.length > 0 ? failed.missing_patterns.join(' | ') : 'n/a';
        lines.push(
          `  - ${failed.layer} ${failed.repo} ${failed.target}: ${failed.missing_file ? 'missing file' : missing}`
        );
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(CONSOLE_FRONTEND)) {
    console.error(`[high-profile-cta-trace] Missing console frontend path: ${CONSOLE_FRONTEND}`);
    process.exit(1);
  }
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`[high-profile-cta-trace] Missing migrations path: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const migrationFiles = listFilesRecursive(MIGRATIONS_DIR, ['.sql']);
  const migrationsContent = migrationFiles
    .map((filePath) => safeRead(filePath) || '')
    .join('\n\n');

  const runtimeGuards = runRuntimeGuards();
  const inventory = {
    app: computeInventory(APP_SOURCE_DIRS, INVENTORY_RULES.app),
    console: computeInventory(CONSOLE_SOURCE_DIRS, INVENTORY_RULES.console),
  };
  const traces = evaluateTraceCases(migrationsContent);

  const runtimeFailures = runtimeGuards.filter((guard) => !guard.passed);
  const traceFailures = traces.filter((trace) => !trace.passed);

  const report = {
    generated_at: nowIso(),
    source: 'run_high_profile_cta_trace_matrix.js',
    summary: {
      runtime_guards_total: runtimeGuards.length,
      runtime_guards_passed: runtimeGuards.length - runtimeFailures.length,
      traces_total: traces.length,
      traces_passed: traces.length - traceFailures.length,
      traces_failed: traceFailures.length,
      app_interaction_handlers: inventory.app.total_interaction_handlers,
      console_interaction_handlers: inventory.console.total_interaction_handlers,
    },
    runtime_guards: runtimeGuards,
    inventory,
    traces,
    failures: [
      ...runtimeFailures.map((guard) => ({
        type: 'runtime_guard',
        id: guard.id,
        summary: guard.summary,
        report: guard.report,
      })),
      ...traceFailures.map((trace) => ({
        type: 'trace_case',
        id: trace.id,
        failed_checks: trace.failed_checks,
      })),
    ],
    success: runtimeFailures.length === 0 && traceFailures.length === 0,
  };

  fs.mkdirSync(VALIDATION_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  fs.writeFileSync(OUT_MD, buildMarkdownReport(report));

  console.log(`[high-profile-cta-trace] Report written: ${OUT_JSON}`);
  console.log(`[high-profile-cta-trace] Markdown written: ${OUT_MD}`);
  console.log(
    `[high-profile-cta-trace] runtime_guards_passed=${report.summary.runtime_guards_passed}/${report.summary.runtime_guards_total} traces_passed=${report.summary.traces_passed}/${report.summary.traces_total}`
  );
  console.log(
    `[high-profile-cta-trace] inventory app_handlers=${report.summary.app_interaction_handlers} console_handlers=${report.summary.console_interaction_handlers}`
  );

  if (!report.success) {
    console.error('[high-profile-cta-trace] FAIL: one or more runtime guards or trace cases failed.');
    process.exit(1);
  }

  console.log('[high-profile-cta-trace] PASS: all runtime guards and high-profile CTA traces passed.');
}

main();
