const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { transformSync } = require("@babel/core");

const repoRoot = path.resolve(__dirname, "../../..");
const moduleCache = new Map();

function resolveLocalModule(request, parentDir) {
  const resolved = request.startsWith(".")
    ? path.resolve(parentDir, request)
    : path.resolve(repoRoot, request);
  const candidates = [
    resolved,
    `${resolved}.js`,
    `${resolved}.jsx`,
    path.join(resolved, "index.js"),
  ];
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to resolve ${request} from ${parentDir}`);
  }
  return match;
}

function loadSourceModule(filename) {
  const absolutePath = path.resolve(filename);
  if (moduleCache.has(absolutePath))
    return moduleCache.get(absolutePath).exports;

  if (
    absolutePath.endsWith(
      path.normalize("services/emergencyRequestsService.js"),
    )
  ) {
    const stub = {
      exports: {
        EmergencyRequestStatus: {
          PENDING_APPROVAL: "pending_approval",
          IN_PROGRESS: "in_progress",
          ACCEPTED: "accepted",
          ARRIVED: "arrived",
          COMPLETED: "completed",
          CANCELLED: "cancelled",
          PAYMENT_DECLINED: "payment_declined",
        },
      },
    };
    moduleCache.set(absolutePath, stub);
    return stub.exports;
  }

  if (
    absolutePath.endsWith(
      path.normalize(
        "components/map/views/tracking/mapTracking.presentation.js",
      ),
    )
  ) {
    const stub = {
      exports: {
        joinDisplayParts: (parts = []) =>
          parts
            .filter((part) => typeof part === "string" && part.trim())
            .join(" · "),
        toTitleCaseLabel: (value) =>
          String(value || "")
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase()),
      },
    };
    moduleCache.set(absolutePath, stub);
    return stub.exports;
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  const { code } = transformSync(source, {
    filename: absolutePath,
    babelrc: false,
    configFile: false,
    presets: ["babel-preset-expo"],
  });
  const mod = { exports: {} };
  moduleCache.set(absolutePath, mod);
  const localRequire = (request) => {
    if (request.startsWith(".") || request.startsWith("/")) {
      return loadSourceModule(
        resolveLocalModule(request, path.dirname(absolutePath)),
      );
    }
    return require(request);
  };
  const run = new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    code,
  );
  run(mod.exports, localRequire, mod, absolutePath, path.dirname(absolutePath));
  return mod.exports;
}

const { TRACKING_STAGES, buildTrackingRuntimeSnapshot } = loadSourceModule(
  path.join(repoRoot, "components/map/views/tracking/mapTracking.snapshot.js"),
);
const { resolveTrackingStage } = loadSourceModule(
  path.join(repoRoot, "components/map/views/tracking/mapTracking.stage.js"),
);
const { buildTrackingHeroModel } = loadSourceModule(
  path.join(repoRoot, "components/map/views/tracking/mapTracking.hero.js"),
);
const { buildTrackingActionEligibility, buildTrackingActionSurfacePolicy } =
  loadSourceModule(
    path.join(repoRoot, "components/map/views/tracking/mapTracking.actions.js"),
  );
const { normalizeTrackingRouteInfo, areTrackingRouteInfosEqual } =
  loadSourceModule(
    path.join(
      repoRoot,
      "components/map/views/tracking/mapTracking.timeline.js",
    ),
  );

function route() {
  return [
    { latitude: 34.0522, longitude: -118.2437 },
    { latitude: 34.0622, longitude: -118.2537 },
  ];
}

function runAssertions() {
  assert.strictEqual(
    resolveTrackingStage({
      kind: "ambulance",
      status: "in_progress",
      hasResponder: false,
      hasRoute: false,
      hasEta: false,
    }),
    TRACKING_STAGES.ASSIGNING,
    "active ambulance without responder, route, or ETA stays assigning",
  );

  const etaOnlySnapshot = buildTrackingRuntimeSnapshot({
    activeAmbulanceTrip: {
      id: "trip-1",
      requestId: "REQ-1",
      status: "in_progress",
      etaSeconds: 420,
    },
  });
  assert.strictEqual(
    etaOnlySnapshot.trackingStage,
    TRACKING_STAGES.DISPATCH_CONFIRMED,
    "ETA-only active ambulance should not fall back to assigning",
  );
  assert.strictEqual(etaOnlySnapshot.etaSource, "trip");

  const responderSnapshot = buildTrackingRuntimeSnapshot({
    activeAmbulanceTrip: {
      id: "trip-2",
      requestId: "REQ-2",
      status: "accepted",
      assignedAmbulance: { id: "amb-1", name: "Avery EMS" },
      etaSeconds: 300,
      route: route(),
    },
  });
  assert.strictEqual(responderSnapshot.trackingStage, TRACKING_STAGES.EN_ROUTE);
  assert.strictEqual(
    buildTrackingHeroModel({
      trackingSnapshot: responderSnapshot,
      trackingKind: "ambulance",
      serviceLabel: "ambulance",
      responderName: "Avery EMS",
      etaLabel: "5 min",
    }).title,
    "Avery EMS",
    "hero uses responder name when responder is assigned",
  );

  const lostSnapshot = buildTrackingRuntimeSnapshot({
    activeAmbulanceTrip: {
      id: "trip-3",
      requestId: "REQ-3",
      status: "accepted",
    },
    ambulanceTelemetryHealth: { state: "lost" },
  });
  assert.strictEqual(lostSnapshot.trackingStage, TRACKING_STAGES.LOST);
  assert.deepStrictEqual(
    {
      contact: buildTrackingActionSurfacePolicy({
        trackingSnapshot: lostSnapshot,
      }).canOpenContactDispatch,
      cancel: buildTrackingActionSurfacePolicy({
        trackingSnapshot: lostSnapshot,
      }).canCancel,
    },
    { contact: true, cancel: true },
    "lost tracking remains recoverable for Contact Dispatch and cancel",
  );

  const completedSnapshot = buildTrackingRuntimeSnapshot({
    activeAmbulanceTrip: {
      id: "trip-4",
      requestId: "REQ-4",
      status: "completed",
      assignedAmbulance: { id: "amb-2" },
    },
  });
  const completedPolicy = buildTrackingActionSurfacePolicy({
    trackingSnapshot: completedSnapshot,
  });
  assert.strictEqual(completedPolicy.canOpenContactDispatch, false);
  assert.strictEqual(completedPolicy.canCancel, false);

  assert.strictEqual(
    buildTrackingActionEligibility({
      trackingSnapshot: buildTrackingRuntimeSnapshot({
        activeBedBooking: {
          id: "bed-1",
          requestId: "REQ-BED",
          status: "accepted",
        },
      }),
      trackingKind: "bed",
      bedStatus: "Ready",
    }).canCheckInBed,
    true,
    "ready bed booking can be checked in",
  );

  assert.strictEqual(
    normalizeTrackingRouteInfo({
      requestKey: "REQ-1",
      routeSource: "live_route",
      durationSec: 123.4,
      distanceMeters: 999.9,
      coordinates: route(),
    }).durationSec,
    123,
    "route info normalizes numeric metrics",
  );
  assert.strictEqual(
    areTrackingRouteInfosEqual(
      { requestKey: "A", durationSec: 60, coordinates: route() },
      { requestKey: "B", durationSec: 60, coordinates: route() },
    ),
    false,
    "route equality includes request ownership",
  );

  const legacyRouteSourceSnapshot = buildTrackingRuntimeSnapshot({
    activeAmbulanceTrip: {
      id: "trip-5",
      requestId: "REQ-5",
      status: "in_progress",
    },
    routeInfo: {
      requestKey: "REQ-5",
      routeSource: "map_route",
      durationSec: 100,
      coordinates: route(),
    },
  });
  assert.strictEqual(legacyRouteSourceSnapshot.etaSource, "live_route");
}

runAssertions();
console.log("[assert_tracking_state_models] tracking model assertions passed");
