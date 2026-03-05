#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VALIDATION_DIR = path.join(ROOT, 'supabase', 'tests', 'validation');
const E2E_REPORT = path.join(VALIDATION_DIR, 'e2e_flow_matrix_report.json');
const OUT_FILE = path.join(VALIDATION_DIR, 'visits_runtime_confidence_report.json');

const REQUIRED_SCENARIOS = ['cardAmbulance', 'completion', 'bedReservation'];

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

  const e2eReport = readJson(E2E_REPORT);
  const scenarios = e2eReport.scenarios || {};

  const missingScenarios = REQUIRED_SCENARIOS.filter((name) => !scenarios[name]);
  if (missingScenarios.length > 0) {
    failures.push(`missing required visit scenarios: ${missingScenarios.join(', ')}`);
  }

  const card = scenarios.cardAmbulance;
  if (card) {
    if (!card.visit?.id) failures.push('cardAmbulance.visit.id missing');
    if (!allAssertionsTrue(card.assertions)) failures.push('cardAmbulance assertions not all true');
    if (card.assertions?.visitCreated !== true) failures.push('cardAmbulance visitCreated assertion false');
  }

  const completion = scenarios.completion;
  if (completion) {
    if (completion.failed === true) failures.push('completion.failed is true');
    if (!completion.visit?.id) failures.push('completion.visit.id missing');
    if (completion.visit?.status !== 'completed') {
      failures.push(`completion.visit.status expected completed, got ${completion.visit?.status || 'null'}`);
    }
    if (!allAssertionsTrue(completion.assertions)) failures.push('completion assertions not all true');
    if (completion.assertions?.visitCompleted !== true) failures.push('completion visitCompleted assertion false');
    if (completion.assertions?.visitCostSynced !== true) failures.push('completion visitCostSynced assertion false');
  }

  const bed = scenarios.bedReservation;
  if (bed) {
    if (!bed.visit?.id) failures.push('bedReservation.visit.id missing');
    if (!allAssertionsTrue(bed.assertions)) failures.push('bedReservation assertions not all true');
    if (bed.assertions?.visitCreated !== true) failures.push('bedReservation visitCreated assertion false');
  }

  const cleanupWarnings = Array.isArray(e2eReport.cleanupWarnings) ? e2eReport.cleanupWarnings : [];
  if (cleanupWarnings.length > 0) {
    warnings.push(`e2e cleanup warnings detected: ${cleanupWarnings.length}`);
  }

  const report = {
    generated_at: nowIso(),
    source: 'assert_visits_runtime_confidence.js',
    status: failures.length === 0 ? 'pass' : 'fail',
    failures,
    warnings,
    evidence: {
      e2e_flow: {
        tag: e2eReport.tag || null,
        startedAt: e2eReport.startedAt || null,
        completedAt: e2eReport.completedAt || null,
        required_scenarios: REQUIRED_SCENARIOS,
        scenarios_present: Object.keys(scenarios),
      },
    },
  };

  fs.mkdirSync(VALIDATION_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    console.error('[visits-runtime-confidence] FAIL: visits runtime confidence checks failed.');
    for (const failure of failures) console.error(`- ${failure}`);
    if (warnings.length > 0) {
      console.error('[visits-runtime-confidence] warnings:');
      for (const warning of warnings) console.error(`- ${warning}`);
    }
    console.error(`[visits-runtime-confidence] Report written: ${OUT_FILE}`);
    process.exit(1);
  }

  console.log('[visits-runtime-confidence] PASS: visits runtime confidence checks passed.');
  if (warnings.length > 0) {
    console.log('[visits-runtime-confidence] warnings:');
    for (const warning of warnings) console.log(`- ${warning}`);
  }
  console.log(`[visits-runtime-confidence] Report written: ${OUT_FILE}`);
}

run();
