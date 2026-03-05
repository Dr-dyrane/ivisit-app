#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VALIDATION_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const CONSOLE_REPORT = path.join(VALIDATION_DIR, 'console_transition_matrix_report.json');
const E2E_REPORT = path.join(VALIDATION_DIR, 'e2e_flow_matrix_report.json');
const OUT_FILE = path.join(VALIDATION_DIR, 'emergency_runtime_confidence_report.json');

const REQUIRED_CONSOLE_CASES = [
  'D1',
  'D2',
  'D3',
  'C1',
  'C2',
  'C3',
  'AP1',
  'AP2',
  'AP3',
  'DR1',
  'DR2',
  'DR3',
  'DR4',
  'DR5',
  'DR6',
  'DR7',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
];

const REQUIRED_E2E_SCENARIOS = [
  'cardAmbulance',
  'trackingContract',
  'completion',
  'cashAmbulance',
  'bedReservation',
  'transitionAudit',
];

function nowIso() {
  return new Date().toISOString();
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing required report: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function allAssertionsTrue(assertions) {
  if (!assertions || typeof assertions !== 'object') return false;
  const values = Object.values(assertions);
  if (values.length === 0) return false;
  return values.every(Boolean);
}

function run() {
  const failures = [];
  const warnings = [];
  const consoleReport = readJson(CONSOLE_REPORT);
  const e2eReport = readJson(E2E_REPORT);

  const consoleResults = Array.isArray(consoleReport.results) ? consoleReport.results : [];
  const consoleSummary = consoleReport.summary || {};
  const failedConsoleCases = consoleResults.filter((r) => !r?.passed).map((r) => r.caseId || 'unknown');

  if (!consoleResults.length) failures.push('console transition report has no results');
  if (Number(consoleSummary.failed || 0) !== 0) {
    failures.push(`console transition summary reports failed=${consoleSummary.failed}`);
  }
  if (failedConsoleCases.length > 0) {
    failures.push(`console transition has failed cases: ${failedConsoleCases.join(', ')}`);
  }

  const consoleCaseMap = new Map(consoleResults.map((r) => [r.caseId, r]));
  const missingConsoleCases = REQUIRED_CONSOLE_CASES.filter((caseId) => !consoleCaseMap.has(caseId));
  if (missingConsoleCases.length > 0) {
    failures.push(`console transition missing required cases: ${missingConsoleCases.join(', ')}`);
  }

  const nonPassingRequiredCases = REQUIRED_CONSOLE_CASES.filter((caseId) => {
    const row = consoleCaseMap.get(caseId);
    return !row || row.passed !== true;
  });
  if (nonPassingRequiredCases.length > 0) {
    failures.push(`required console cases not passing: ${nonPassingRequiredCases.join(', ')}`);
  }

  const scenarios = e2eReport.scenarios || {};
  const missingScenarios = REQUIRED_E2E_SCENARIOS.filter((name) => !scenarios[name]);
  if (missingScenarios.length > 0) {
    failures.push(`e2e report missing required scenarios: ${missingScenarios.join(', ')}`);
  }

  for (const scenarioName of REQUIRED_E2E_SCENARIOS) {
    const scenario = scenarios[scenarioName];
    if (!scenario) continue;
    if (!allAssertionsTrue(scenario.assertions)) {
      failures.push(`e2e scenario assertions not all true: ${scenarioName}`);
    }
  }

  if (scenarios.completion) {
    if (scenarios.completion.failed === true) {
      failures.push('e2e completion scenario reports failed=true');
    }
    if (scenarios.completion?.emergency?.status !== 'completed') {
      failures.push(
        `e2e completion emergency status expected completed, got ${scenarios.completion?.emergency?.status || 'null'}`
      );
    }
  }

  if (scenarios.cashAmbulance) {
    const status = scenarios.cashAmbulance?.afterApproval?.status;
    if (status !== 'accepted' && status !== 'in_progress') {
      failures.push(
        `cash approval post-state expected accepted|in_progress, got ${status || 'null'}`
      );
    }
  }

  if (scenarios.transitionAudit) {
    if (scenarios.transitionAudit.error) {
      failures.push(`transition audit error: ${scenarios.transitionAudit.error}`);
    }
    const rows = Array.isArray(scenarios.transitionAudit.rows) ? scenarios.transitionAudit.rows : [];
    if (rows.length === 0) {
      failures.push('transition audit rows are empty');
    }
  }

  const cleanupWarnings = Array.isArray(e2eReport.cleanupWarnings) ? e2eReport.cleanupWarnings : [];
  if (cleanupWarnings.length > 0) {
    warnings.push(`e2e cleanup warnings detected: ${cleanupWarnings.length}`);
  }

  const report = {
    generated_at: nowIso(),
    source: 'assert_emergency_runtime_confidence.js',
    status: failures.length === 0 ? 'pass' : 'fail',
    failures,
    warnings,
    evidence: {
      console_transition: {
        tag: consoleReport.tag || null,
        startedAt: consoleReport.startedAt || null,
        summary: consoleSummary,
        total_results: consoleResults.length,
        required_cases: REQUIRED_CONSOLE_CASES,
      },
      e2e_flow: {
        tag: e2eReport.tag || null,
        startedAt: e2eReport.startedAt || null,
        completedAt: e2eReport.completedAt || null,
        scenarios_present: Object.keys(scenarios),
        required_scenarios: REQUIRED_E2E_SCENARIOS,
        cleanup_warnings: cleanupWarnings.length,
      },
    },
  };

  fs.mkdirSync(VALIDATION_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    console.error('[emergency-runtime-confidence] FAIL: runtime confidence checks failed.');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    if (warnings.length > 0) {
      console.error('[emergency-runtime-confidence] warnings:');
      for (const warning of warnings) console.error(`- ${warning}`);
    }
    console.error(`[emergency-runtime-confidence] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[emergency-runtime-confidence] PASS: runtime confidence checks passed.');
  if (warnings.length > 0) {
    console.log('[emergency-runtime-confidence] warnings:');
    for (const warning of warnings) console.log(`- ${warning}`);
  }
  console.log(`[emergency-runtime-confidence] Report written: ${OUT_FILE}`);
}

run();
