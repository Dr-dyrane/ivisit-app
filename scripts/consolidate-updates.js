/**
 * Consolidate Updates Script
 * 
 * This script manages the update.json file based on EAS update group ID.
 * 
 * Logic:
 * - If EAS update group ID has changed: wipe update.json and start fresh
 * - If EAS update group ID is the same: consolidate (append) to existing entry
 * 
 * Usage:
 * node scripts/consolidate-updates.js --wipe  (force wipe)
 * node scripts/consolidate-updates.js --consolidate (force consolidate)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const UPDATE_JSON_PATH = path.join(__dirname, '../data/update.json');
const GROUP_ID_KEY = '_easUpdateGroupId';

// Get current EAS update group ID from app.config.js or eas.json
function getEasUpdateGroupId() {
  try {
    // Try to read from app.config.js
    const appConfigPath = path.join(__dirname, '../app.config.js');
    if (fs.existsSync(appConfigPath)) {
      const content = fs.readFileSync(appConfigPath, 'utf8');
      const match = content.match(/updateId:\s*['"]([^'"]+)['"]/);
      if (match) return match[1];
    }

    // Try to read from eas.json
    const easJsonPath = path.join(__dirname, '../eas.json');
    if (fs.existsSync(easJsonPath)) {
      const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
      return easConfig.cli?.update?.id || easConfig.update?.id;
    }

    // Fallback: get from git branch or commit
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    return branch;
  } catch (error) {
    console.warn('[consolidate-updates] Could not determine EAS update group ID:', error.message);
    return 'main';
  }
}

// Get current commit hash
function getCurrentCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('[consolidate-updates] Could not get commit hash:', error.message);
    return 'unknown';
  }
}

// Get current commit date
function getCurrentCommitDate() {
  try {
    return execSync('git log -1 --pretty=format:"%ad" --date=iso', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('[consolidate-updates] Could not get commit date:', error.message);
    return new Date().toISOString();
  }
}

// Wipe update.json and create fresh entry
function wipeUpdateJson(version, title, summary, changes) {
  const freshEntry = {
    _lastCommitHash: getCurrentCommitHash(),
    _lastCommitDate: getCurrentCommitDate(),
    _easUpdateGroupId: getEasUpdateGroupId(),
    version,
    date: new Date().toISOString().split('T')[0],
    title,
    summary,
    changes,
  };

  fs.writeFileSync(UPDATE_JSON_PATH, JSON.stringify(freshEntry, null, 2));
  console.log('[consolidate-updates] Wiped update.json with fresh entry');
}

// Consolidate: append changes to existing entry
function consolidateUpdateJson(newChanges) {
  if (!fs.existsSync(UPDATE_JSON_PATH)) {
    console.error('[consolidate-updates] update.json does not exist');
    return;
  }

  const current = JSON.parse(fs.readFileSync(UPDATE_JSON_PATH, 'utf8'));
  current._lastCommitHash = getCurrentCommitHash();
  current._lastCommitDate = getCurrentCommitDate();
  current.changes = [...current.changes, ...newChanges];
  
  fs.writeFileSync(UPDATE_JSON_PATH, JSON.stringify(current, null, 2));
  console.log('[consolidate-updates] Consolidated changes into existing entry');
}

// Main logic
function main() {
  const args = process.argv.slice(2);
  const forceWipe = args.includes('--wipe');
  const forceConsolidate = args.includes('--consolidate');

  const currentGroupId = getEasUpdateGroupId();

  if (!fs.existsSync(UPDATE_JSON_PATH)) {
    console.log('[consolidate-updates] update.json does not exist, creating fresh');
    // Will be created by the normal update process
    return;
  }

  const current = JSON.parse(fs.readFileSync(UPDATE_JSON_PATH, 'utf8'));
  const storedGroupId = current._easUpdateGroupId;

  if (forceWipe) {
    console.log('[consolidate-updates] Force wipe requested');
    console.log('[consolidate-updates] Use normal update.json editing to create fresh entry');
    return;
  }

  if (forceConsolidate) {
    console.log('[consolidate-updates] Force consolidate requested');
    console.log('[consolidate-updates] Use normal update.json editing to append changes');
    return;
  }

  if (storedGroupId && storedGroupId !== currentGroupId) {
    console.log(`[consolidate-updates] EAS update group ID changed: ${storedGroupId} -> ${currentGroupId}`);
    console.log('[consolidate-updates] Recommendation: WIPE update.json and start fresh');
    console.log('[consolidate-updates] Run: node scripts/consolidate-updates.js --wipe');
  } else {
    console.log(`[consolidate-updates] EAS update group ID unchanged: ${currentGroupId}`);
    console.log('[consolidate-updates] Recommendation: CONSOLIDATE (append) to existing entry');
    console.log('[consolidate-updates] Run: node scripts/consolidate-updates.js --consolidate');
  }
}

main();
