const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const readSource = (...segments) =>
  fs.readFileSync(path.resolve(__dirname, "..", ...segments), "utf8");

const authContext = readSource("contexts", "AuthContext.jsx");
const authService = readSource("services", "authService.js");
const medicalProfileService = readSource("services", "medicalProfileService.js");
const insuranceService = readSource("services", "insuranceService.js");

const logoutStart = authContext.indexOf("const logout = useCallback(async () => {");
const deleteAccountStart = authContext.indexOf("const deleteAccount = useCallback", logoutStart);

assert.ok(logoutStart >= 0 && deleteAccountStart > logoutStart, "logout implementation must exist");

const logoutImplementation = authContext.slice(logoutStart, deleteAccountStart);

assert.match(logoutImplementation, /finally\s*\{\s*await clearLocalAuthState\(\);\s*\}/);
assert.match(logoutImplementation, /Logged out locally; remote sign-out failed/);
assert.ok(
  logoutImplementation.indexOf("await authService.logout();")
    < logoutImplementation.indexOf("finally"),
  "remote sign-out should be attempted before the unconditional local cleanup",
);

// --- PHI must not survive a session boundary -------------------------------

const PHI_KEYS = [
  "StorageKeys.MEDICAL_PROFILE",
  "StorageKeys.MEDICAL_PROFILE_CACHE",
  "StorageKeys.INSURANCE_POLICIES",
];

const clearLocalStart = authContext.indexOf(
  "const clearLocalAuthState = useCallback(async () => {",
);
assert.ok(clearLocalStart >= 0, "clearLocalAuthState implementation must exist");
const clearLocalImplementation = authContext.slice(
  clearLocalStart,
  authContext.indexOf("}, []);", clearLocalStart),
);

for (const key of PHI_KEYS) {
  assert.ok(
    clearLocalImplementation.includes(`database.delete(${key})`),
    `clearLocalAuthState must clear ${key}; PHI would otherwise outlive the session`,
  );
}

const logoutServiceStart = authService.indexOf("async logout() {");
assert.ok(logoutServiceStart >= 0, "authService.logout implementation must exist");
const logoutServiceImplementation = authService.slice(
  logoutServiceStart,
  authService.indexOf("\n    },", logoutServiceStart),
);

for (const key of PHI_KEYS) {
  assert.ok(
    logoutServiceImplementation.includes(`database.delete(${key})`),
    `authService.logout must clear ${key}`,
  );
}

// --- Cached PHI is only served back to a proven owner ----------------------

const medicalGetStart = medicalProfileService.indexOf("async get(options = {}) {");
assert.ok(medicalGetStart >= 0, "medicalProfileService.get must exist");
const medicalGet = medicalProfileService.slice(
  medicalGetStart,
  medicalProfileService.indexOf("async update(", medicalGetStart),
);

assert.ok(
  /String\(cachedSnapshot\.ownerUserId\)\s*===\s*String\(userId\)/.test(medicalGet),
  "medicalProfileService.get must compare the cached snapshot owner against the caller",
);
assert.ok(
  !medicalGet.includes("database.read(StorageKeys.MEDICAL_PROFILE,"),
  "medicalProfileService.get must not fall back to the ownerless legacy MEDICAL_PROFILE cache",
);

// The owner check above makes get() identity-dependent: it returns
// DEFAULT_MEDICAL_PROFILE when it cannot prove the caller. update() merges its
// patch onto get()'s result, so it must hand get() the userId it already
// resolved. A bare this.get() re-resolves via a networked auth.getUser() that
// fails offline, and the merge then wipes every PHI field the patch omits.
const medicalUpdateStart = medicalProfileService.indexOf("async update(updates, options = {}) {");
assert.ok(medicalUpdateStart >= 0, "medicalProfileService.update must exist");
const medicalUpdate = medicalProfileService.slice(
  medicalUpdateStart,
  medicalProfileService.indexOf("async reset()", medicalUpdateStart),
);

assert.ok(
  medicalUpdate.includes("await this.get({ userId })"),
  "medicalProfileService.update must pass the resolved userId into get(); a bare this.get() merges the patch onto an empty profile offline and wipes unrelated PHI",
);
assert.ok(
  !/await this\.get\(\)/.test(medicalUpdate),
  "medicalProfileService.update must not call this.get() without the resolved userId",
);

const insuranceListStart = insuranceService.indexOf("async list() {");
assert.ok(insuranceListStart >= 0, "insuranceService.list must exist");
const insuranceList = insuranceService.slice(
  insuranceListStart,
  insuranceService.indexOf("\n  },", insuranceListStart),
);

assert.ok(
  insuranceList.indexOf("supabase.auth.getSession()") <
    insuranceList.indexOf("database.read(StorageKeys.INSURANCE_POLICIES"),
  "insuranceService.list must resolve the session owner before touching the cache",
);
assert.ok(
  /if \(!session\?\.user\) return \[\];/.test(insuranceList),
  "insuranceService.list must return nothing to an anonymous caller, not cached policies",
);
assert.ok(
  /String\(policy\.user_id \|\| ""\)\s*===\s*userId/.test(insuranceList),
  "insuranceService.list offline fallback must filter cached rows by owner",
);

console.log("PASS auth logout isolation contract");
