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

const USER_ID = "11111111-2222-3333-4444-555555555555";
const HOUR_MS = 60 * 60 * 1000;

function createSupabaseMock({ profileRow, authCreatedAt }) {
  return {
    auth: {
      // Supabase always returns created_at on the auth user; it arrives in the
      // same response that verifies the OTP.
      verifyOtp: async () => ({
        data: {
          user: {
            id: USER_ID,
            email: "otp-user@ivisit.app",
            created_at: authCreatedAt,
          },
          session: { access_token: "token-otp" },
        },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            profileRow
              ? { data: profileRow, error: null }
              : { data: null, error: { message: "row not found" } },
        }),
      }),
      update: () => ({
        eq: () => ({
          or: async () => ({ error: null }),
        }),
      }),
    }),
  };
}

async function runVerifyOtp({
  profileRow,
  policies,
  authCreatedAt = new Date().toISOString(),
}) {
  const formatUserCalls = [];
  const enrollCalls = [];

  const { authService } = loadSourceModule("services/authService.js", {
    "./supabase": { supabase: createSupabaseMock({ profileRow, authCreatedAt }) },
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
        PROFILE_COMPLETION_DEFERRED: "PROFILE_COMPLETION_DEFERRED",
      },
    },
    "expo-linking": {},
    "./notificationDispatcher": {
      notificationDispatcher: { dispatchAuthEvent: async () => {} },
    },
    "./insuranceService": {
      insuranceService: {
        list: async () => policies,
        enrollBasicScheme: async () => {
          enrollCalls.push(true);
          return null;
        },
      },
    },
    "../utils/authErrorUtils": {
      AuthErrors: {},
      createAuthError: (_code, message) => new Error(message),
      handleSupabaseError: (error) => error,
    },
    "./mappers/userMapper": {
      formatUser: (user, token, profile, hasInsurance) => {
        formatUserCalls.push({ hasInsurance });
        return {
          id: user.id,
          email: user.email,
          token,
          username: profile?.username,
        };
      },
    },
    "./auth/oauthService": {},
    "./reviewDemoAuthService": {
      reviewDemoAuthService: { shouldHandleEmail: () => false },
    },
  });

  const result = await authService.verifyOtp({
    email: "otp-user@ivisit.app",
    otp: "123456",
  });
  return { result, formatUserCalls, enrollCalls };
}

(async () => {
  // E6: the handle_new_user trigger pre-creates the profile (username
  // included) before verifyOtp runs, so a fresh signup profile has a
  // username but no onboarding data and a created_at inside the OTP window.
  const freshSignup = await runVerifyOtp({
    profileRow: {
      id: USER_ID,
      username: "otpuser",
      full_name: "otp-user@ivisit.app",
      first_name: null,
      last_name: null,
      date_of_birth: null,
      role: "patient",
      created_at: new Date().toISOString(),
    },
    policies: [],
  });
  assert.equal(freshSignup.result.success, true);
  assert.equal(
    freshSignup.result.data.isExistingUser,
    false,
    "trigger-precreated profile must be treated as a NEW user so the registration steps stay reachable",
  );

  // E17: zero policies + stub enrollBasicScheme must not fabricate coverage.
  assert.equal(freshSignup.formatUserCalls.length, 1);
  assert.equal(
    freshSignup.formatUserCalls[0].hasInsurance,
    false,
    "hasInsurance must reflect server truth (zero policies), matching the login() lane",
  );
  assert.equal(
    freshSignup.enrollCalls.length,
    0,
    "verifyOtp must not call the enrollBasicScheme stub",
  );

  // Onboarded account logging back in via OTP: existing, insured.
  const onboardedReturning = await runVerifyOtp({
    profileRow: {
      id: USER_ID,
      username: "ada",
      first_name: "Ada",
      last_name: "Obi",
      date_of_birth: "1990-04-02",
      role: "patient",
      created_at: new Date(Date.now() - 90 * 24 * HOUR_MS).toISOString(),
    },
    policies: [{ id: "policy-1" }],
  });
  assert.equal(onboardedReturning.result.data.isExistingUser, true);
  assert.equal(onboardedReturning.formatUserCalls[0].hasInsurance, true);

  // Old but never-onboarded account: still existing (auto-login), and its
  // empty policy list must stay uninsured.
  const staleUnonboarded = await runVerifyOtp({
    profileRow: {
      id: USER_ID,
      username: "olduser",
      first_name: null,
      last_name: null,
      date_of_birth: null,
      role: "patient",
      created_at: new Date(Date.now() - 2 * 24 * HOUR_MS).toISOString(),
    },
    policies: [],
  });
  assert.equal(staleUnonboarded.result.data.isExistingUser, true);
  assert.equal(staleUnonboarded.formatUserCalls[0].hasInsurance, false);

  // Profile row not yet visible (trigger race): treat as new, never crash.
  // The auth user is itself brand new here, which is what makes "new" correct.
  const missingProfile = await runVerifyOtp({ profileRow: null, policies: [] });
  assert.equal(missingProfile.result.success, true);
  assert.equal(missingProfile.result.data.isExistingUser, false);

  // getUserProfile() swallows read errors and returns {} -- identical to the
  // "row absent" shape above. An established account must NOT be demoted to a
  // new user just because the profiles read blipped: the auth user's own
  // created_at still proves the account predates this OTP request. Getting
  // this wrong routes a real (possibly paying) user into registration.
  const profileReadFailure = await runVerifyOtp({
    profileRow: null,
    policies: [{ id: "policy-1" }],
    authCreatedAt: new Date(Date.now() - 90 * 24 * HOUR_MS).toISOString(),
  });
  assert.equal(profileReadFailure.result.success, true);
  assert.equal(
    profileReadFailure.result.data.isExistingUser,
    true,
    "a transient profiles read failure must not reclassify an established account as new",
  );

  // Both OTP consumer lanes branch on isExistingUser, so a false value is
  // what makes the registration screens reachable.
  const useLoginSource = read("hooks/auth/useLogin.js");
  assert.match(useLoginSource, /if \(result\.data\?\.isExistingUser\)/);
  assert.match(useLoginSource, /USER_NOT_FOUND/);
  const authInputModalSource = read("components/register/AuthInputModal.jsx");
  assert.match(authInputModalSource, /if \(result\.data\?\.isExistingUser\)/);

  console.log("PASS auth OTP new-user behavior");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
