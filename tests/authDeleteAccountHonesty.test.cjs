// AUDIT-N1-2026-07-16 -- account deletion must never report success it did not achieve.
//
// The defect this pins: authService.deleteUser() caught every failure and returned
// true, so AuthContext.deleteAccount()'s honest failure branch was unreachable dead
// code and the user was toasted "Account deleted successfully" while their account
// was fully intact. delete_user() RAISES on FK RESTRICT for any patient who ever had
// a responder offered (emergency_responder_assignments.emergency_request_id is
// ON DELETE RESTRICT), so this was not hypothetical -- it was silent in production.
//
// Scope note: this proves the CLIENT stops lying. It does NOT make deletion correct.
// delete_user() still deletes only the profiles row and strands the auth.users row as
// a phantom account, and that half returns no error at all, so nothing here can catch
// it. See docs/audit/planning/DB_CHANGE_BACKLOG_2026-07-16.md -- the real fix is a
// soft-delete redesign, not a client change.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function loadSourceModule(file, mocks = {}) {
  const filename = path.join(ROOT, file);
  const transformed = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    presets: [require.resolve("babel-preset-expo")],
    babelrc: false,
    configFile: false,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));

  const originalLoad = Module._load;
  Module._load = function loadWithMocks(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    loaded._compile(transformed.code, filename);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

// The exact shape Postgres returns when delete_user() hits the responder-assignment
// RESTRICT: this is the real production failure, not an invented one.
const FK_RESTRICT_ERROR = {
  code: "23503",
  message:
    'update or delete on table "emergency_requests" violates foreign key constraint ' +
    '"emergency_responder_assignments_emergency_request_id_fkey" on table ' +
    '"emergency_responder_assignments"',
  details: "Key (id)=(...) is still referenced from table \"emergency_responder_assignments\".",
};

function loadAuthService({ rpcError }) {
  const calls = { rpc: [], signOut: 0 };
  return {
    calls,
    ...loadSourceModule("services/authService.js", {
      "./supabase": {
        supabase: {
          rpc: async (name, args) => {
            calls.rpc.push({ name, args });
            return rpcError ? { data: null, error: rpcError } : { data: { success: true }, error: null };
          },
          auth: {
            signOut: async () => {
              calls.signOut += 1;
              return { error: null };
            },
            getSession: async () => ({ data: { session: null }, error: null }),
          },
        },
      },
      "./displayIdService": {
        isValidUUID: () => true,
        resolveEntityId: async (id) => id,
      },
      "../database": {
        database: {
          read: async (_key, fallback = null) => fallback,
          write: async () => {},
          delete: async () => {},
        },
        StorageKeys: {
          CURRENT_USER: "CURRENT_USER",
          AUTH_TOKEN: "AUTH_TOKEN",
          MEDICAL_PROFILE: "MEDICAL_PROFILE",
          MEDICAL_PROFILE_CACHE: "MEDICAL_PROFILE_CACHE",
          INSURANCE_POLICIES: "INSURANCE_POLICIES",
          PROFILE_COMPLETION_DEFERRED: "PROFILE_COMPLETION_DEFERRED",
          PENDING_REGISTRATION: "PENDING_REGISTRATION",
        },
      },
      "expo-linking": {},
      "./notificationDispatcher": {
        notificationDispatcher: { dispatchAuthEvent: async () => {} },
      },
      // Stubbed only to keep the module graph loadable in node -- deleteUser
      // touches none of these.
      "./insuranceService": { insuranceService: {} },
      "./mappers/userMapper": { formatUser: (profile) => profile },
      "./auth/oauthService": {},
      "./reviewDemoAuthService": { reviewDemoAuthService: { isEnabled: () => false } },
    }),
  };
}

(async () => {
  // --- 1. A FAILED deletion must NOT report success -------------------------
  {
    const { authService } = loadAuthService({ rpcError: FK_RESTRICT_ERROR });

    let threw = null;
    let returned;
    try {
      returned = await authService.deleteUser();
    } catch (error) {
      threw = error;
    }

    assert.ok(
      threw,
      "deleteUser must surface a failed delete_user RPC, never swallow it: the whole " +
        "defect was a catch that returned true and told the user their account was gone",
    );
    assert.equal(
      returned,
      undefined,
      "a failed deletion must not return a truthy success value",
    );
  }

  // --- 2. A SUCCESSFUL deletion still works ---------------------------------
  {
    const { authService, calls } = loadAuthService({ rpcError: null });
    const result = await authService.deleteUser();

    assert.equal(result, true, "a successful deletion must still return true");
    assert.deepEqual(
      calls.rpc.map((call) => call.name),
      ["delete_user"],
      "deletion goes through the delete_user RPC",
    );
  }

  // --- 3. The caller's honest failure path must exist and be REACHABLE ------
  // It was already written; it was dead code because nothing ever threw. These
  // pins fail if either half regresses -- the swallow returning, or the branch
  // that consumes the throw being deleted.
  const authContext = read("contexts/AuthContext.jsx");
  const deleteAccountStart = authContext.indexOf("const deleteAccount = useCallback");
  assert.ok(deleteAccountStart >= 0, "AuthContext.deleteAccount must exist");
  const deleteAccountImpl = authContext.slice(
    deleteAccountStart,
    authContext.indexOf("}, [", deleteAccountStart),
  );

  assert.match(
    deleteAccountImpl,
    /catch \(error\)/,
    "deleteAccount must catch the failure deleteUser now throws",
  );
  assert.match(
    deleteAccountImpl,
    /success:\s*false/,
    "a failed deletion must reach the caller as success:false",
  );

  const authServiceSource = read("services/authService.js");
  const deleteUserStart = authServiceSource.indexOf("async deleteUser()");
  const deleteUserImpl = authServiceSource.slice(
    deleteUserStart,
    authServiceSource.indexOf("\n    },", deleteUserStart),
  );
  assert.doesNotMatch(
    deleteUserImpl,
    /return true; \/\/ We return true to allow UI to proceed/,
    "the swallow-and-claim-success catch must not return",
  );

  // The toast the user actually sees on failure must be the failure message,
  // not the success one.
  const profileForm = read("hooks/profile/useProfileForm.js");
  assert.match(
    profileForm,
    /if \(result\.success\)[\s\S]{0,200}Account deleted successfully/,
    "the success toast must be gated on result.success",
  );
  assert.match(
    profileForm,
    /showToast\(result\.message, "error"\)/,
    "a failed deletion must toast the failure message",
  );

  console.log("PASS account deletion honesty (AUDIT-N1)");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
