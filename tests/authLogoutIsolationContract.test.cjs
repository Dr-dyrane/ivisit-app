const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authContext = fs.readFileSync(
  path.resolve(__dirname, "..", "contexts", "AuthContext.jsx"),
  "utf8",
);

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

console.log("PASS auth logout isolation contract");
