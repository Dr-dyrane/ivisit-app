const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");

const ROOT = path.resolve(__dirname, "..");

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

const EmergencyRequestStatus = {
  PENDING_APPROVAL: "pending_approval",
  IN_PROGRESS: "in_progress",
  ACCEPTED: "accepted",
  ARRIVED: "arrived",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  PAYMENT_DECLINED: "payment_declined",
};
const serviceMock = { EmergencyRequestStatus };

const activeRequestModel = loadSourceModule(
  "components/map/core/mapActiveRequestModel.js",
  { "../../../services/emergencyRequestsService": serviceMock },
);
const trackingStage = loadSourceModule(
  "components/map/views/tracking/mapTracking.stage.js",
  { "../../../../services/emergencyRequestsService": serviceMock },
);
const trackingSnapshotModel = loadSourceModule(
  "components/map/views/tracking/mapTracking.snapshot.js",
  { "./mapTracking.stage": trackingStage },
);
const trackingActions = loadSourceModule(
  "components/map/views/tracking/mapTracking.actions.js",
  { "./mapTracking.stage": trackingStage },
);
const headerPresentation = loadSourceModule(
  "components/map/core/mapActiveSessionPresentation.js",
  {
    "../../../services/emergencyRequestsService": serviceMock,
    "./mapActiveRequestModel": activeRequestModel,
  },
);

const requestId = "request-web-1";
const nowMs = Date.parse("2026-07-14T12:00:00.000Z");
const hospital = {
  id: "hospital-1",
  name: "iVisit Test Hospital",
  distanceKm: 5.2,
};
const routeInfo = {
  requestKey: requestId,
  routeSource: "live_route",
  durationSec: 600,
  distanceMeters: 5200,
  coordinates: [
    { latitude: 6.45, longitude: 3.39 },
    { latitude: 6.46, longitude: 3.4 },
  ],
};

function buildAmbulanceState({
  status,
  patientAcknowledgedArrivalAt = null,
  withResponder = false,
  progress = 0,
}) {
  const trip = {
    id: requestId,
    requestId,
    displayId: "REQ-WEB01",
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    status,
    etaSeconds: status === EmergencyRequestStatus.IN_PROGRESS ? null : 600,
    etaSource: "live_route",
    startedAt:
      status === EmergencyRequestStatus.IN_PROGRESS ? null : nowMs - 60_000,
    patientAcknowledgedArrivalAt,
    assignedAmbulance: withResponder
      ? { id: "ambulance-1", name: "Demo Driver", plate: "WEB-001" }
      : null,
    route: withResponder ? routeInfo.coordinates : null,
  };
  const activeMapRequest = activeRequestModel.buildActiveMapRequestModel({
    activeAmbulanceTrip: trip,
    hospitals: [hospital],
    allHospitals: [hospital],
    nowMs,
  });
  const trackingSnapshot = trackingSnapshotModel.buildTrackingRuntimeSnapshot({
    activeMapRequest,
    activeAmbulanceTrip: trip,
    routeInfo,
    progress,
  });
  const actionEligibility = trackingActions.buildTrackingActionEligibility({
    trackingSnapshot,
    trackingKind: "ambulance",
    activeMapRequest,
  });
  const headerSession = headerPresentation.buildMapActiveSessionHeaderSession({
    activeMapRequest,
    trackingRouteInfo: routeInfo,
    nowMs,
  });
  return {
    trip,
    activeMapRequest,
    trackingSnapshot,
    actionEligibility,
    headerSession,
  };
}

const pendingApproval = {
  id: requestId,
  requestId,
  displayId: "REQ-WEB01",
  hospitalId: hospital.id,
  hospitalName: hospital.name,
  serviceType: "ambulance",
  status: EmergencyRequestStatus.PENDING_APPROVAL,
  paymentMethod: "cash",
};
const pendingMapRequest = activeRequestModel.buildActiveMapRequestModel({
  pendingApproval,
  hospitals: [hospital],
  nowMs,
});
const pendingSnapshot = trackingSnapshotModel.buildTrackingRuntimeSnapshot({
  activeMapRequest: pendingMapRequest,
  pendingApproval,
  isPendingApproval: true,
});
const pendingHeader = headerPresentation.buildMapActiveSessionHeaderSession({
  activeMapRequest: pendingMapRequest,
  pendingApproval,
  trackingRouteInfo: routeInfo,
  nowMs,
});
assert.equal(pendingSnapshot.trackingStage, "pending_approval");
assert.equal(pendingHeader.statusLabel, "Awaiting approval");
assert.equal(pendingHeader.metrics[1].value, "Pending");

const assigning = buildAmbulanceState({
  status: EmergencyRequestStatus.IN_PROGRESS,
});
assert.equal(assigning.trackingSnapshot.trackingStage, "assigning");
assert.equal(assigning.trackingSnapshot.hasResponder, false);
assert.equal(assigning.headerSession.statusLabel, "Finding responder");
assert.equal(assigning.headerSession.metrics[0].value, "--");
assert.equal(assigning.headerSession.metrics[1].value, "--");
assert.equal(assigning.actionEligibility.canMarkArrived, false);

const accepted = buildAmbulanceState({
  status: EmergencyRequestStatus.ACCEPTED,
  withResponder: true,
  progress: 0.1,
});
assert.equal(accepted.trackingSnapshot.trackingStage, "en_route");
assert.equal(accepted.headerSession.statusLabel, "En Route");
assert.equal(accepted.headerSession.metrics[0].label, "Arrival");
assert.notEqual(accepted.headerSession.metrics[0].value, "--");
assert.equal(accepted.headerSession.metrics[1].value, "9");
assert.equal(accepted.headerSession.metrics[2].value, "5.2");
assert.equal(accepted.actionEligibility.canMarkArrived, false);

const approaching = buildAmbulanceState({
  status: EmergencyRequestStatus.ACCEPTED,
  withResponder: true,
  progress: 0.75,
});
assert.equal(approaching.trackingSnapshot.trackingStage, "approaching");
assert.equal(approaching.actionEligibility.canMarkArrived, false);

const arrived = buildAmbulanceState({
  status: EmergencyRequestStatus.ARRIVED,
  withResponder: true,
  progress: 1,
});
assert.equal(arrived.trackingSnapshot.trackingStage, "arrived");
assert.equal(arrived.headerSession.statusLabel, "Arrived");
assert.equal(arrived.headerSession.metrics[0].label, "Status");
assert.equal(arrived.headerSession.metrics[0].value, "Arrived");
assert.equal(arrived.headerSession.metrics[1].value, "0");
assert.equal(arrived.headerSession.metrics[2].value, "0.0");
assert.equal(arrived.activeMapRequest.canConfirmArrival, true);
assert.equal(arrived.actionEligibility.canMarkArrived, true);

const acknowledged = buildAmbulanceState({
  status: EmergencyRequestStatus.ARRIVED,
  patientAcknowledgedArrivalAt: "2026-07-14T11:59:30.000Z",
  withResponder: true,
  progress: 1,
});
assert.equal(acknowledged.trackingSnapshot.trackingStage, "arrived");
assert.equal(acknowledged.headerSession.statusLabel, "Arrived");
assert.equal(acknowledged.headerSession.metrics[0].label, "Status");
assert.equal(acknowledged.headerSession.metrics[0].value, "Arrived");
assert.equal(acknowledged.activeMapRequest.canConfirmArrival, false);
assert.equal(acknowledged.actionEligibility.canMarkArrived, false);

const completed = buildAmbulanceState({
  status: EmergencyRequestStatus.COMPLETED,
  patientAcknowledgedArrivalAt: "2026-07-14T11:59:30.000Z",
  withResponder: true,
  progress: 1,
});
assert.equal(completed.trackingSnapshot.trackingStage, "completed");
assert.equal(completed.headerSession.statusLabel, "Complete");
assert.equal(completed.headerSession.metrics[0].label, "Status");
assert.equal(completed.headerSession.metrics[0].value, "Complete");
assert.equal(completed.actionEligibility.canMarkArrived, false);
assert.equal(completed.actionEligibility.canCompleteAmbulance, true);

const completedHeaderWithStaleRoute =
  headerPresentation.buildMapActiveSessionHeaderSession({
    activeMapRequest: completed.activeMapRequest,
    trackingRouteInfo: { ...routeInfo, requestKey: "previous-request" },
    nowMs,
  });
assert.equal(completedHeaderWithStaleRoute.metrics[0].label, "Status");
assert.equal(completedHeaderWithStaleRoute.metrics[0].value, "Complete");

const mismatchedRouteHeader =
  headerPresentation.buildMapActiveSessionHeaderSession({
    activeMapRequest: accepted.activeMapRequest,
    trackingRouteInfo: { ...routeInfo, requestKey: "another-request" },
    nowMs,
  });
assert.equal(
  mismatchedRouteHeader.metrics[2].value,
  accepted.activeMapRequest.distanceValue,
  "the top pill must reject route metrics owned by another request",
);

console.log("PASS emergency tracking web state behavior");
