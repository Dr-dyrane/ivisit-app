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

const transaction = loadSourceModule(
  "components/map/views/commitPayment/mapCommitPayment.transaction.js",
);
const kinds = transaction.MAP_COMMIT_PAYMENT_METHOD_KINDS;
assert.equal(transaction.requiresSignedCardConfirmation(kinds.CARD), true);
assert.equal(transaction.requiresSignedCardConfirmation(kinds.WALLET), false);
assert.equal(transaction.requiresWalletSettlement(kinds.WALLET), true);
assert.equal(
  transaction.validateCommitPaymentSubmitContract({
    hospital: { id: "hospital-1" },
    paymentMethodsSnapshotReady: true,
    selectedPaymentMethod: { id: "wallet_internal", is_wallet: true },
    totalCostValue: 42,
  }).ok,
  true,
);
assert.equal(
  transaction.validateCommitPaymentSubmitContract({
    hospital: { id: "hospital-1" },
    paymentMethodsSnapshotReady: true,
    selectedPaymentMethod: { id: "wallet_internal", is_wallet: true },
    totalCostValue: 42,
    demoCashOnly: true,
  }).ok,
  false,
  "the demo lane must remain cash-only",
);

const statusConstants = {
  IN_PROGRESS: "in_progress",
  ACCEPTED: "accepted",
  ARRIVED: "arrived",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  PENDING_APPROVAL: "pending_approval",
  PAYMENT_DECLINED: "payment_declined",
};
const progress = loadSourceModule("hooks/emergency/useTripProgress.js", {
  react: { useMemo: (factory) => factory() },
  "../../services/emergencyRequestsService": {
    EmergencyRequestStatus: statusConstants,
  },
});
assert.equal(
  progress.resolveAmbulanceProgressStatus({
    status: "accepted",
    tripProgress: 1,
  }),
  "Arriving",
);
assert.equal(
  progress.resolveAmbulanceProgressStatus({ status: "arrived", tripProgress: 0 }),
  "Arrived",
);
assert.equal(
  progress.resolveAmbulanceProgressStatus({ status: "completed", tripProgress: 0 }),
  "Complete",
);

const telemetry = loadSourceModule("utils/emergencyContextHelpers.js", {
  "./mapUtils": {
    calculateBearing: () => 0,
    isValidCoordinate: (value) => Boolean(value),
  },
});
const now = Date.parse("2026-07-14T12:00:00.000Z");
const trackedTrip = {
  requestId: "request-1",
  status: "accepted",
  currentResponderLocation: { latitude: 1, longitude: 2 },
};
assert.equal(
  telemetry.deriveAmbulanceTelemetryHealth(
    { ...trackedTrip, updatedAt: new Date(now).toISOString() },
    now,
  ).state,
  "inactive",
  "request.updated_at must not stand in for responder telemetry",
);
assert.equal(
  telemetry.deriveAmbulanceTelemetryHealth(
    {
      ...trackedTrip,
      responderTelemetryAt: new Date(now - 10000).toISOString(),
      responderTelemetryLeaseExpiresAt: new Date(now + 10000).toISOString(),
    },
    now,
  ).state,
  "live",
);
assert.equal(
  telemetry.deriveAmbulanceTelemetryHealth(
    {
      ...trackedTrip,
      responderTelemetryAt: new Date(now - 10000).toISOString(),
      responderTelemetryLeaseExpiresAt: new Date(now - 1).toISOString(),
    },
    now,
  ).state,
  "stale",
);
assert.equal(
  telemetry.deriveAmbulanceTelemetryHealth(
    {
      ...trackedTrip,
      responderTelemetryAt: new Date(now - 121000).toISOString(),
      responderTelemetryLeaseExpiresAt: new Date(now + 10000).toISOString(),
    },
    now,
  ).state,
  "lost",
);

const realtime = require(path.join(ROOT, "utils/emergencyRealtimeProjection.js"));
const priorTelemetryAt = "2026-07-14T11:59:00.000Z";
const priorTrip = {
  id: "request-1",
  requestId: "request-1",
  status: "accepted",
  responderTelemetryAt: priorTelemetryAt,
};
const requestOnlyUpdate = realtime.mergeEmergencyRealtimeTrip(priorTrip, {
  id: "request-1",
  status: "accepted",
  updated_at: "2026-07-14T12:00:00.000Z",
});
assert.equal(requestOnlyUpdate.responderTelemetryAt, priorTelemetryAt);
const telemetryUpdate = realtime.mergeEmergencyRealtimeTrip(priorTrip, {
  id: "request-1",
  status: "accepted",
  updated_at: "2026-07-14T12:00:00.000Z",
  responder_location_received_at: "2026-07-14T11:59:59.000Z",
  responder_telemetry_lease_expires_at: "2026-07-14T12:00:20.000Z",
});
assert.equal(
  telemetryUpdate.responderTelemetryAt,
  "2026-07-14T11:59:59.000Z",
);
assert.equal(
  telemetryUpdate.responderTelemetryLeaseExpiresAt,
  "2026-07-14T12:00:20.000Z",
);
assert.equal(
  realtime.mergeEmergencyRealtimeTrip(priorTrip, {
    id: "request-1",
    status: "completed",
  }).status,
  "completed",
  "backend completion must survive projection for terminal UI",
);
assert.equal(
  realtime.mergeEmergencyRealtimeTrip(priorTrip, {
    id: "request-1",
    status: "cancelled",
  }),
  null,
);

const actions = loadSourceModule(
  "components/map/views/tracking/mapTracking.actions.js",
  {
    "./mapTracking.stage": {
      TRACKING_STAGES: {
        IDLE: "idle",
        PENDING_APPROVAL: "pending_approval",
        COMPLETED: "completed",
      },
    },
  },
);
const actionEligibility = actions.buildTrackingActionEligibility({
  trackingSnapshot: { trackingStage: "arrived", status: "arrived" },
  trackingKind: "ambulance",
  activeMapRequest: { canConfirmArrival: true },
});
assert.equal(actionEligibility.canMarkArrived, true);
assert.equal(actionEligibility.canCompleteAmbulance, false);

const controller = read(
  "components/map/views/commitPayment/useMapCommitPaymentController.js",
);
const requestCreatedAt = controller.indexOf("await handleRequestInitiated(");
const walletProcessedAt = controller.indexOf(
  "await paymentService.processWalletPayment(",
);
const walletCompletedAt = controller.indexOf(
  "await handleRequestComplete(completionPayload);",
  walletProcessedAt,
);
assert.ok(requestCreatedAt >= 0 && requestCreatedAt < walletProcessedAt);
assert.ok(walletProcessedAt < walletCompletedAt);
assert.doesNotMatch(controller, /if \(initiationResult\.awaitsPaymentConfirmation\)/);
assert.match(controller, /if \(isCardSelected\) \{/);
assert.match(controller, /requestDemoCashAutoApproval/);

const requestFlow = read("hooks/emergency/useRequestFlow.js");
assert.match(requestFlow, /const awaitsPaymentConfirmation = isCardPayment;/);
assert.doesNotMatch(requestFlow, /request\?\.deferDispatchUntilPayment === true/);
const completeStart = requestFlow.indexOf("const handleRequestComplete");
const quickStart = requestFlow.indexOf("const handleQuickEmergency", completeStart);
const completeFlow = requestFlow.slice(completeStart, quickStart);
assert.doesNotMatch(completeFlow, /status:\s*EmergencyRequestStatus\.ACCEPTED/);
assert.doesNotMatch(completeFlow, /setRequestStatus/);
assert.doesNotMatch(completeFlow, /updateVisit/);

const handlers = read("hooks/emergency/useEmergencyHandlers.js");
const ambulanceCompleteStart = handlers.indexOf("const onCompleteAmbulanceTrip");
const bedCancelStart = handlers.indexOf("const onCancelBedBooking");
const ambulanceComplete = handlers.slice(ambulanceCompleteStart, bedCancelStart);
assert.doesNotMatch(ambulanceComplete, /setRequestStatus/);
const arrivalStart = handlers.indexOf("const onMarkAmbulanceArrived");
const bedArrivalStart = handlers.indexOf("const onMarkBedOccupied");
const ambulanceArrival = handlers.slice(arrivalStart, bedArrivalStart);
assert.match(ambulanceArrival, /acknowledgeResponderArrival/);
assert.doesNotMatch(ambulanceArrival, /setRequestStatus/);
const patientStatusWrites = Array.from(
  handlers.matchAll(
    /setRequestStatus\([\s\S]*?EmergencyRequestStatus\.(\w+)/g,
  ),
  (match) => match[1],
);
assert.deepEqual(patientStatusWrites, ["CANCELLED", "CANCELLED"]);

const requestService = read("services/emergencyRequestsService.js");
assert.match(requestService, /'patient_acknowledge_responder_arrival'/);
assert.match(requestService, /data\.acknowledged_at/);
assert.match(requestService, /const deferDispatchUntilPayment = isCard;/);
const setStatusStart = requestService.indexOf("async setStatus");
const updateTriageStart = requestService.indexOf("async updateTriage", setStatusStart);
const patientStatusCommand = requestService.slice(setStatusStart, updateTriageStart);
assert.match(patientStatusCommand, /status !== EmergencyRequestStatus\.CANCELLED/);
assert.doesNotMatch(
  patientStatusCommand,
  /EmergencyRequestStatus\.(ACCEPTED|ARRIVED|COMPLETED)/,
);
const activeRequestModel = read("components/map/core/mapActiveRequestModel.js");
assert.match(activeRequestModel, /if \(etaElapsed\) return "Arriving";/);
assert.doesNotMatch(activeRequestModel, /if \(etaElapsed\) return "Arrived";/);
assert.match(activeRequestModel, /canCompleteAmbulance: false/);
assert.match(activeRequestModel, /canCompleteBed: false/);
assert.match(activeRequestModel, /canCheckInBed: false/);
assert.match(
  activeRequestModel,
  /canConfirmArrival:[\s\S]*status === EmergencyRequestStatus\.ARRIVED/,
);
const runtime = read("components/map/views/tracking/useMapTrackingRuntime.js");
assert.match(runtime, /const shouldShowArrivedStage = Boolean\(isArrived\);/);
const realtimeHook = read("hooks/emergency/useEmergencyRealtime.js");
assert.doesNotMatch(
  realtimeHook,
  /status === "completed" \|\| status === "cancelled"/,
);
const activeTripQuery = read("hooks/emergency/useActiveTripQuery.js");
assert.match(activeTripQuery, /getOwnedById\(previousRequestId\)/);
const tripSelectors = read("stores/emergencyTripSelectors.js");
assert.doesNotMatch(
  tripSelectors,
  /responderTelemetryAt\s*\?\?\s*trip\.updatedAt/,
);
assert.match(
  tripSelectors,
  /selectCanCompleteAmbulance[\s\S]*return false/,
);
assert.match(
  tripSelectors,
  /selectCanMarkArrived[\s\S]*status === 'arrived'/,
);

console.log("PASS emergency payment and patient lifecycle contract");
