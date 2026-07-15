const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const loadSourceModule = (file) => {
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
  loaded._compile(transformed.code, filename);
  return loaded.exports;
};

const {
  VISIT_DETAIL_ROUTE_STATUS,
  resolveVisitDetailRouteState,
} = loadSourceModule("hooks/visits/visitDetailRouteState.js");
const { primeScheduledVisitCache } = loadSourceModule("hooks/visits/scheduledVisitCache.js");

const resolve = (overrides = {}) => resolveVisitDetailRouteState({
  enabled: true,
  hasUser: true,
  data: null,
  error: null,
  isLoading: false,
  isFetching: false,
  ...overrides,
});

assert.equal(resolve({ hasUser: false }).status, VISIT_DETAIL_ROUTE_STATUS.LOADING);
assert.equal(resolve({ isLoading: true }).status, VISIT_DETAIL_ROUTE_STATUS.LOADING);
assert.equal(resolve({ isFetching: true }).status, VISIT_DETAIL_ROUTE_STATUS.LOADING);
assert.equal(resolve({ data: { id: "visit-1" }, isFetching: true }).status, VISIT_DETAIL_ROUTE_STATUS.READY);
assert.equal(resolve({ error: { code: "42501" } }).status, VISIT_DETAIL_ROUTE_STATUS.DENIED);
assert.equal(resolve({ error: new Error("Network unavailable") }).status, VISIT_DETAIL_ROUTE_STATUS.ERROR);
assert.equal(resolve().status, VISIT_DETAIL_ROUTE_STATUS.NOT_FOUND);

const cache = new Map([["list:user-1", [{ id: "visit-1", status: "pending" }, { id: "visit-2" }]]]);
const queryClient = {
  setQueryData(key, value) {
    const cacheKey = key.join(":");
    cache.set(cacheKey, typeof value === "function" ? value(cache.get(cacheKey)) : value);
  },
};
const primed = primeScheduledVisitCache({
  queryClient,
  visit: { id: "visit-1", status: "confirmed" },
  userId: "user-1",
  normalizeVisit: (visit) => ({ ...visit, normalized: true }),
  detailKey: ["detail", "user-1", "visit-1"],
  listKey: ["list", "user-1"],
});
assert.deepEqual(cache.get("detail:user-1:visit-1"), primed);
assert.deepEqual(cache.get("list:user-1"), [
  { id: "visit-1", status: "confirmed", normalized: true },
  { id: "visit-2" },
]);

const mutations = read("hooks/visits/useScheduledVisitMutations.js");
assert.match(mutations, /primeScheduledTruth\(visit\);\s*void invalidateScheduledTruth/s);
assert.doesNotMatch(mutations, /return invalidateScheduledTruth/);

const visitsStore = read("stores/visitsStore.js");
assert.match(visitsStore, /snapshot && typeof snapshot === "object" && snapshot\?\.ownerUserId/);
assert.doesNotMatch(visitsStore, /hydrateFromLocalSnapshot\(\{ visits: legacyVisits \}/);

const bootstrap = read("hooks/visits/useVisitsBootstrap.js");
assert.match(bootstrap, /if \(!ownerUserId\) \{\s*resetVisitsState\(userId\);/s);
assert.doesNotMatch(bootstrap, /markHydrated\(userId\)/);

const routeHandlers = read("hooks/map/useMapRouteHandlers.js");
assert.ok(
  routeHandlers.indexOf("if (routeVisitQuery.data)")
    < routeHandlers.indexOf("const didOpenFromList"),
  "direct detail truth must win over persisted list data",
);
assert.match(routeHandlers, /routeVisitDetailState/);
assert.match(routeHandlers, /onRetry: retryRouteVisit/);
assert.doesNotMatch(routeHandlers, /Visit details are not available right now/);

const historyFlow = read("hooks/map/history/useMapHistoryFlow.js");
assert.match(historyFlow, /const historyItem = hydratedVisit\s*\? toHistoryItem\(hydratedVisit\)/s);

const sheetNavigation = read("hooks/map/exploreFlow/useMapSheetNavigation.js");
const inPlaceVisitDetailRefresh = sheetNavigation.indexOf(
  "if (sheetPhase === MAP_SHEET_PHASES.VISIT_DETAIL)",
);
const visitDetailTransition = sheetNavigation.indexOf(
  "transitionTo(\n        buildVisitDetailSheetView",
  inPlaceVisitDetailRefresh,
);
assert.ok(inPlaceVisitDetailRefresh >= 0, "open visit detail must detect an in-place refresh");
assert.ok(
  visitDetailTransition > inPlaceVisitDetailRefresh,
  "an already-open visit detail must refresh before considering navigation",
);
assert.match(
  sheetNavigation,
  /setSheetPayload\(\{[\s\S]*sourcePhase: sourcePhase \?\? sheetPayload\?\.sourcePhase \?\? null,[\s\S]*sourceSurface: sourceSurface \?\? sheetPayload\?\.sourceSurface \?\? null,/,
  "refreshing visit truth must preserve the original return contract",
);

const detailState = read("components/map/views/visitDetail/MapVisitDetailRouteState.jsx");
assert.match(detailState, />Try again</);
assert.match(detailState, /accessibilityLabel="Close visit details"/);

console.log("PASS scheduled visits post-booking state behavior");
