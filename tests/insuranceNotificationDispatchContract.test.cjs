const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

const hookSource = read("hooks/insurance/useInsuranceScreenModel.js");
const serviceSource = read("services/insuranceService.js");
const dispatcherSource = read("services/notificationDispatcher.js");

// The insurance screen model must not re-dispatch notifications after a
// write: insuranceService.create owns the "created" dispatch, and a dead
// dispatcher call after a successful write turns success into a failure
// toast (users retry and duplicate policies).
assert.ok(
  !hookSource.includes("dispatchInsuranceEvent"),
  "useInsuranceScreenModel must not call the removed dispatchInsuranceEvent API",
);
assert.ok(
  !hookSource.includes("notificationDispatcher"),
  "useInsuranceScreenModel must leave insurance notifications to insuranceService",
);

// The service-level dispatch exists and can never fail the write.
assert.match(
  serviceSource,
  /try \{\s*await notificationDispatcher\.dispatchInsuranceUpdate\("created", normalized\);\s*\} catch/,
  "insuranceService.create must dispatch the created notification inside its own try/catch",
);
assert.match(dispatcherSource, /async dispatchInsuranceUpdate\(/);

// Every dispatcher method referenced anywhere in app code must exist on the
// dispatcher, so a rename can never strand a call site again.
const sourceDirs = ["hooks", "services", "components", "contexts", "utils", "app"];
const sourceFiles = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      sourceFiles.push(full);
    }
  }
};
for (const dir of sourceDirs) {
  const full = path.join(ROOT, dir);
  if (fs.existsSync(full)) collect(full);
}

const referencePattern = /notificationDispatcher\.(\w+)\(/g;
const missing = [];
let referenceCount = 0;
for (const file of sourceFiles) {
  if (path.resolve(file) === path.resolve(ROOT, "services/notificationDispatcher.js")) {
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(referencePattern)) {
    referenceCount += 1;
    const method = match[1];
    if (!dispatcherSource.includes(`async ${method}(`)) {
      missing.push(`${path.relative(ROOT, file)} -> notificationDispatcher.${method}()`);
    }
  }
}
assert.ok(referenceCount > 0, "expected at least one dispatcher call site (guard must not be vacuous)");
assert.deepEqual(missing, [], `dispatcher call sites reference missing methods: ${missing.join(", ")}`);

console.log("PASS insurance notification dispatch contract");
