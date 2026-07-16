const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

function loadAuthReturnRouteHelpers() {
  const source = read("runtime/navigation/authReturnRoute.js");
  const transformed = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  });
  const loadedModule = { exports: {} };
  const evaluate = new Function(
    "module",
    "exports",
    "require",
    transformed.code,
  );
  evaluate(loadedModule, loadedModule.exports, require);
  return loadedModule.exports;
}

function loadDeepLinkHelpers(authReturnRouteHelpers) {
  const source = read("runtime/navigation/deepLinkHelpers.js");
  const transformed = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  });
  const loadedModule = { exports: {} };
  const linking = {
    parse(url) {
      const parsed = new URL(url);
      return {
        path: parsed.pathname,
        hostname: parsed.hostname,
        queryParams: Object.fromEntries(parsed.searchParams.entries()),
      };
    },
    createURL: (pathname = "") => `ivisit://${pathname}`,
  };
  const localRequire = (request) => {
    if (request === "expo-linking") return linking;
    if (request === "./authReturnRoute") return authReturnRouteHelpers;
    return require(request);
  };
  const evaluate = new Function("module", "exports", "require", transformed.code);
  evaluate(loadedModule, loadedModule.exports, localRequire);
  return loadedModule.exports;
}

const {
  buildProtectedVisitReturnRoute,
  isProtectedAuthReturnRoute,
  normalizeProtectedAuthReturnRoute,
} = loadAuthReturnRouteHelpers();
const {
  getProtectedAuthReturnRouteFromUrl,
  hasExplicitLaunchPathname,
  isAuthCallbackUrl,
} = loadDeepLinkHelpers(loadAuthReturnRouteHelpers());

const visitKey = "550e8400-e29b-41d4-a716-446655440000";
const upperVisitKey = visitKey.toUpperCase();
const canonicalRoute =
  `/(user)?mapSheet=visit_detail&visitKey=${visitKey}`;

assert.equal(
  buildProtectedVisitReturnRoute("/(user)", {
    mapSheet: "visit_detail",
    visitKey,
  }),
  canonicalRoute,
);
assert.equal(
  buildProtectedVisitReturnRoute("(user)/", {
    mapSheet: ["visit_detail"],
    visitKey: [upperVisitKey],
  }),
  canonicalRoute,
);
assert.equal(
  normalizeProtectedAuthReturnRoute(
    ` /(user)/?visitKey=${upperVisitKey}&mapSheet=visit_detail `,
  ),
  canonicalRoute,
);
assert.equal(isProtectedAuthReturnRoute(canonicalRoute), true);
assert.equal(
  getProtectedAuthReturnRouteFromUrl(
    `http://localhost:8087/?mapSheet=visit_detail&visitKey=${visitKey}`,
  ),
  canonicalRoute,
);

// A deep link is an auth callback only on the callback path or on exact OAuth
// param keys. Substring matching on "code=" also captured referral links.
const authCallbackUrls = [
  "https://ivisit.app/auth/callback",
  "https://ivisit.app/auth/callback?code=abc123",
  "ivisit://auth/callback?code=abc123",
  "https://ivisit.app/?code=abc123&state=xyz",
  "https://ivisit.app/#access_token=token123&refresh_token=refresh123",
  "https://ivisit.app/?access_token=token123",
];

for (const url of authCallbackUrls) {
  assert.equal(
    isAuthCallbackUrl(url),
    true,
    `expected auth callback url: ${url}`,
  );
}

const nonAuthCallbackUrls = [
  "https://ivisit.app/signup?inviteCode=ABC123",
  "https://ivisit.app/signup?promoCode=SUMMER",
  "https://ivisit.app/signup?invite_code=ABC123",
  "https://ivisit.app/referral?promo_code=SUMMER",
  "https://ivisit.app/checkout?discount_code=SAVE20",
  "https://ivisit.app/login",
  "https://ivisit.app/",
];

for (const url of nonAuthCallbackUrls) {
  assert.equal(
    isAuthCallbackUrl(url),
    false,
    `expected non-callback url to pass through: ${url}`,
  );
}

// An explicit launch pathname is the destination the link asked for, so it
// must never be replaced by a stored public route.
assert.equal(hasExplicitLaunchPathname("https://ivisit.app/login"), true);
assert.equal(hasExplicitLaunchPathname("https://ivisit.app/signup"), true);
assert.equal(hasExplicitLaunchPathname("https://ivisit.app/onboarding"), true);
assert.equal(
  hasExplicitLaunchPathname("https://ivisit.app/signup?inviteCode=ABC123"),
  true,
);
assert.equal(hasExplicitLaunchPathname("https://ivisit.app/"), false);
assert.equal(hasExplicitLaunchPathname(""), false);
assert.equal(hasExplicitLaunchPathname(null), false);

const rejectedRoutes = [
  `https://evil.example/(user)?mapSheet=visit_detail&visitKey=${visitKey}`,
  `//evil.example/(user)?mapSheet=visit_detail&visitKey=${visitKey}`,
  `/(auth)/map?mapSheet=visit_detail&visitKey=${visitKey}`,
  `/(user)?mapSheet=recent_visits&visitKey=${visitKey}`,
  "/(user)?mapSheet=visit_detail&visitKey=not-a-uuid",
  `/(user)?mapSheet=visit_detail&visitKey=${visitKey}&next=https://evil.example`,
  `/(user)?mapSheet=visit_detail&mapSheet=visit_detail&visitKey=${visitKey}`,
  `/(user)?mapSheet=visit_detail&visitKey=${visitKey}#fragment`,
  `/(user)\\?mapSheet=visit_detail&visitKey=${visitKey}`,
];

for (const route of rejectedRoutes) {
  assert.equal(
    normalizeProtectedAuthReturnRoute(route),
    null,
    `expected route to be rejected: ${route}`,
  );
}

assert.equal(
  buildProtectedVisitReturnRoute("/(user)", {
    mapSheet: ["visit_detail", "recent_visits"],
    visitKey,
  }),
  null,
);
assert.equal(
  buildProtectedVisitReturnRoute("/(user)/(stacks)/visits", {
    mapSheet: "visit_detail",
    visitKey,
  }),
  null,
);

const userLayout = read("app/(user)/_layout.js");
const initialRoute = read("runtime/navigation/useInitialRoute.js");
const authRouting = read("runtime/navigation/useAuthRouting.js");
const callback = read("app/auth/callback.js");
const socialAuth = read("hooks/auth/useSocialAuth.js");
const persistence = read("runtime/navigation/useRoutePersistence.js");
const rootNavigator = read("runtime/RootNavigator.jsx");

const captureIndex = userLayout.indexOf(
  "await writeStoredAuthReturnRoute(protectedReturnRoute)",
);
const authRedirectIndex = userLayout.indexOf(
  'router.replace("/(auth)")',
  captureIndex,
);
assert.ok(captureIndex >= 0, "user guard must persist protected intent");
assert.ok(
  authRedirectIndex > captureIndex,
  "user guard must persist protected intent before redirecting to auth",
);

assert.match(
  initialRoute,
  /authStateRef\.current\.isAuthenticated[\s\S]*router\.replace\(protectedReturnRoute\)[\s\S]*else \{[\s\S]*router\.replace\("\/\(auth\)"\)/,
  "deep links may route protected intent only inside the authenticated branch",
);
assert.match(
  initialRoute,
  /storedAuthReturnRoute && !storedAuthPublicRoute\) return/,
  "startup hydration must leave protected intent for authenticated routing",
);
assert.doesNotMatch(
  initialRoute,
  /url\.includes\("code="\)|url\.includes\("access_token="\)/,
  "auth callbacks must be parsed, not substring-matched on referral params",
);
assert.match(
  initialRoute,
  /isAuthCallbackUrl\(url\)/,
  "auth callback detection must route through the parsed helper",
);
const explicitPathnameGuardIndex = initialRoute.indexOf(
  "hasExplicitLaunchPathname(url)) return",
);
const storedRouteRestoreIndex = initialRoute.indexOf(
  "readStoredPublicRoute()",
);
assert.ok(
  explicitPathnameGuardIndex >= 0,
  "an explicit launch pathname must pass through startup hydration",
);
assert.ok(
  storedRouteRestoreIndex > explicitPathnameGuardIndex,
  "explicit launch pathnames must be honored before stored-route restore",
);

const authGateIndex = authRouting.indexOf(
  "if (loading || !user.isAuthenticated)",
);
const protectedHandoffIndex = authRouting.indexOf(
  "router.replace(returnRoute)",
);
assert.ok(authGateIndex >= 0 && protectedHandoffIndex > authGateIndex);
assert.match(
  authRouting,
  /if \(isDestinationActive\) \{[\s\S]*await clearStoredAuthReturnRoute\(\)/,
  "direct auth must clear intent only after the destination is active",
);

assert.match(
  callback,
  /resolvePostAuthRoute[\s\S]*readStoredAuthReturnRoute\(\)/,
  "callback success must prefer the sanitized auth return route",
);
assert.match(
  callback,
  /completeSuccessfulAuthHandoff[\s\S]*router\.replace\(nextRoute\)/,
  "callback success must dispatch the sanitized handoff",
);
assert.doesNotMatch(
  callback,
  /clearStoredAuthReturnRoute/,
  "callback success must leave destination acknowledgment to auth routing",
);
assert.match(
  callback,
  /resolvePublicFallback[\s\S]*normalizeStoredPublicRoute\(explicitReturnRoute\)/,
  "callback failure must reduce fallback to a public route",
);

assert.match(socialAuth, /writeStoredAuthReturnRoute\(returnTo\)/);
assert.match(
  socialAuth,
  /isProtectedAuthReturnRoute\(existingReturnRoute\)[\s\S]*!isProtectedAuthReturnRoute\(returnTo\)/,
  "a generic social-auth return must not overwrite protected intent",
);
assert.doesNotMatch(
  socialAuth,
  /clearStoredAuthReturnRoute|delete\(StorageKeys\.AUTH_RETURN_ROUTE\)/,
  "social auth must leave successful return-route consumption to routing owners",
);
assert.match(
  persistence,
  /normalizeProtectedAuthReturnRoute\(route\) \|\| normalizeStoredPublicRoute\(route\)/,
  "stored auth routes must pass through the protected/public allowlist",
);
assert.match(
  rootNavigator,
  /initialRouteResolved[\s\S]*useRoutePersistence\(\{ initialRouteResolved, startupPublicRoute \}\)/,
  "route persistence must wait for startup route hydration",
);
assert.match(
  persistence,
  /if \(!initialRouteResolved \|\| !pathname\)[\s\S]*pathname === "\/" && !startupPublicRoute/,
  "startup root must not erase a resumable map route before hydration completes",
);

console.log("PASS authenticated return-route behavior and handoff contracts");
