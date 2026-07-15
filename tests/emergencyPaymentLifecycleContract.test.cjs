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
const ambulanceTypes = loadSourceModule("utils/ambulanceType.js");
assert.equal(ambulanceTypes.resolveAmbulanceDispatchType({ service_type: "ambulance" }), "BLS");
assert.equal(
  ambulanceTypes.resolveAmbulanceDispatchType({
    service_type: "ambulance",
    service_name: "Advanced Life Support",
  }),
  "ALS",
);
assert.equal(
  ambulanceTypes.resolveAmbulanceDispatchType({ service_type: "ambulance_critical" }),
  "CCT",
);
assert.equal(
  ambulanceTypes.getAmbulanceTierKey({ title: "Basic Life Support" }),
  "basic",
  "Basic Life Support must not be mistaken for the advanced tier",
);

const commitPaymentHelpers = loadSourceModule(
  "components/map/views/commitPayment/mapCommitPayment.helpers.js",
  {
    "../../../../services/dispatchService": {
      DispatchService: { calculateDistance: () => 0 },
    },
    "../../surfaces/hospitals/mapHospitalDetail.helpers": {
      getDestinationCoordinate: () => null,
    },
  },
);
assert.equal(
  commitPaymentHelpers.buildAmbulanceCommitRequest({
    hospital: { id: "hospital-1", name: "Hospital" },
    transport: { tierKey: "basic", service_type: "ambulance" },
    paymentMethod: { id: "cash_payment" },
    pricingSnapshot: { totalCost: 160 },
    currentLocation: { latitude: 1, longitude: 2 },
  }).ambulanceType,
  "BLS",
  "the real generic pricing row must cross the request boundary as a fleet-compatible type",
);

const kinds = transaction.MAP_COMMIT_PAYMENT_METHOD_KINDS;
assert.equal(transaction.requiresSignedCardConfirmation(kinds.CARD), true);
assert.equal(transaction.requiresSignedCardConfirmation(kinds.WALLET), false);
assert.equal(transaction.requiresWalletSettlement(kinds.WALLET), true);
assert.deepEqual(
  transaction.reconcileCanonicalPaymentTotal({
    quotedTotal: 42,
    canonicalTotal: 42,
    costSnapshot: { baseCost: 40 },
  }),
  {
    ok: true,
    code: null,
    hasMismatch: false,
    quotedTotal: 42,
    canonicalTotal: 42,
    costSnapshot: {
      baseCost: 40,
      totalCost: 42,
      total_cost: 42,
      currency: "USD",
    },
  },
);
assert.equal(
  transaction.reconcileCanonicalPaymentTotal({
    quotedTotal: 42,
    canonicalTotal: 45,
  }).code,
  "CANONICAL_TOTAL_CHANGED",
);
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
assert.equal(
  progress.resolveAmbulanceProgressStatus({ status: "in_progress", tripProgress: 1 }),
  "Assigning",
  "payment-ready must not masquerade as responder movement",
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
const unassignedProjection = realtime.mergeEmergencyRealtimeTrip(
  {
    id: "request-2",
    requestId: "request-2",
    status: "in_progress",
    startedAt: now - 1000,
    assignedAmbulance: { id: "stale-local-ambulance" },
    currentResponderLocation: { latitude: 1, longitude: 2 },
  },
  {
    id: "request-2",
    status: "in_progress",
    ambulance_id: "offered-not-accepted",
    updated_at: "2026-07-14T12:00:00.000Z",
  },
);
assert.equal(unassignedProjection.assignedAmbulance, null);
assert.equal(unassignedProjection.currentResponderLocation, null);
assert.equal(unassignedProjection.startedAt, null);

const trackingStage = loadSourceModule(
  "components/map/views/tracking/mapTracking.stage.js",
  {
    "../../../../services/emergencyRequestsService": {
      EmergencyRequestStatus: statusConstants,
    },
  },
);
assert.equal(
  trackingStage.resolveTrackingStage({
    kind: "ambulance",
    status: "in_progress",
    hasResponder: true,
    hasRoute: true,
    hasEta: true,
    progress: 0.95,
    telemetryState: "live",
  }),
  trackingStage.TRACKING_STAGES.ASSIGNING,
  "in_progress is dispatch-ready, not accepted",
);
assert.equal(
  trackingStage.resolveTrackingStage({
    kind: "ambulance",
    status: "in_progress",
    isArrived: true,
    hasResponder: true,
    hasRoute: true,
    hasEta: true,
    progress: 1,
    telemetryState: "live",
  }),
  trackingStage.TRACKING_STAGES.ASSIGNING,
  "canonical in_progress must outrank a stale local arrival flag",
);
assert.equal(
  trackingStage.resolveTrackingStage({
    kind: "ambulance",
    status: "accepted",
    hasResponder: false,
    hasRoute: false,
    hasEta: false,
    progress: null,
    telemetryState: "inactive",
  }),
  trackingStage.TRACKING_STAGES.DISPATCH_CONFIRMED,
);
assert.equal(
  trackingStage.resolveTrackingStage({
    kind: "bed",
    status: "in_progress",
    hasResponder: false,
    hasRoute: false,
    hasEta: false,
    progress: null,
    telemetryState: "inactive",
  }),
  trackingStage.TRACKING_STAGES.ASSIGNING,
  "a paid bed request is not reserved before facility acceptance",
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
const completedAmbulanceEligibility = actions.buildTrackingActionEligibility({
  trackingSnapshot: { trackingStage: "completed", status: "completed" },
  trackingKind: "ambulance",
  activeMapRequest: { canConfirmArrival: false },
});
assert.equal(completedAmbulanceEligibility.canMarkArrived, false);
assert.equal(completedAmbulanceEligibility.canCompleteAmbulance, true);
const completedBedEligibility = actions.buildTrackingActionEligibility({
  trackingSnapshot: { trackingStage: "completed", status: "completed" },
  trackingKind: "bed",
});
assert.equal(completedBedEligibility.canCompleteBed, true);

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
assert.match(controller, /reconcileCanonicalPaymentTotal/);
assert.match(controller, /The provider price changed/);

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
assert.doesNotMatch(handlers, /cancelVisit|setVisitLifecycle/);

const trackingController = read(
  "components/map/views/tracking/useMapTrackingController.js",
);
const pendingCancelStart = trackingController.indexOf(
  "const handleCancelPendingRequest",
);
const completeAmbulanceStart = trackingController.indexOf(
  "const handleCompleteAmbulanceWithRating",
  pendingCancelStart,
);
const ratingPreparationStart = trackingController.indexOf(
  "const prepareTrackingRating",
  pendingCancelStart,
);
const pendingCancelFlow = trackingController.slice(
  pendingCancelStart,
  ratingPreparationStart,
);
assert.match(pendingCancelFlow, /setRequestStatus/);
assert.doesNotMatch(pendingCancelFlow, /cancelVisit|updateVisit|Promise\.all/);
const completeBedStart = trackingController.indexOf(
  "const handleCompleteBedWithRating",
  completeAmbulanceStart,
);
const ambulanceRatingHandoff = trackingController.slice(
  completeAmbulanceStart,
  completeBedStart,
);
assert.match(ambulanceRatingHandoff, /onCompleteAmbulanceTrip/);
assert.match(ambulanceRatingHandoff, /prepareTrackingRating/);
assert.match(ambulanceRatingHandoff, /setRatingState/);
assert.doesNotMatch(ambulanceRatingHandoff, /setRequestStatus/);
assert.match(
  trackingController,
  /EMERGENCY_VISIT_LIFECYCLE\.RATING_PENDING/,
);
assert.match(
  read("components/map/views/tracking/mapTracking.model.js"),
  /label: "Complete Visit"/,
);

const requestService = read("services/emergencyRequestsService.js");
assert.match(requestService, /'patient_acknowledge_responder_arrival'/);
assert.match(requestService, /data\.acknowledged_at/);
assert.match(requestService, /const deferDispatchUntilPayment = isCard;/);
assert.match(requestService, /demo-emergency-lifecycle/);
assert.match(requestService, /emergency_status_transitions/);
assert.match(requestService, /distance_km/);
assert.match(requestService, /canonicalTotal/);
const demoLifecycleAdapterStart = requestService.indexOf(
  "async syncDemoResponderLifecycle",
);
const demoLifecycleAdapter = requestService.slice(demoLifecycleAdapterStart);
assert.match(
  demoLifecycleAdapter,
  /"mark_completed"/,
  "the App adapter must allow the responder-owned demo completion action",
);
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
assert.match(activeTripQuery, /dispatchAcceptedAt/);
assert.match(activeTripQuery, /hasAcceptedResponder/);
assert.match(activeTripQuery, /refetchOnWindowFocus: true/);
assert.match(activeTripQuery, /reconcileCanonicalAmbulanceTrip/);
assert.match(
  activeTripQuery,
  /responderTelemetryAt: hasAcceptedResponder/,
  "released or unassigned requests must not retain responder telemetry",
);

const activeTripReconciliation = loadSourceModule(
  "hooks/emergency/useActiveTripQuery.js",
  {
    "@tanstack/react-query": { useQuery: () => null, useQueryClient: () => null },
    react: { useEffect: () => null },
    "../../services/supabase": { supabase: {} },
    "../../services/emergencyRequestsService": {
      emergencyRequestsService: {},
      EmergencyRequestStatus: statusConstants,
    },
    "../../services/ambulanceService": { ambulanceService: {} },
    "./bedBookingRuntime": { normalizeBedBookingRuntimeState: (value) => value },
    "../../utils/emergencyRealtimeProjection": {
      parsePointGeometry: (value) => value,
    },
    "../../utils/emergencyContextHelpers": {
      normalizeRouteCoordinates: (value) => (Array.isArray(value) ? value : []),
    },
    "../../stores/emergencyTripStore": {
      useEmergencyTripStore: { getState: () => ({}) },
      useStoreHydrated: () => true,
    },
  },
);
const staleAssignedTrip = {
  id: "request-1",
  requestId: "request-1",
  status: "arrived",
  assignedAmbulance: { id: "ambulance-1", name: "Stale responder" },
};
assert.equal(
  activeTripReconciliation.reconcileCanonicalAmbulanceTrip(
    {
      id: "request-1",
      requestId: "request-1",
      status: "in_progress",
      assignedAmbulance: null,
    },
    staleAssignedTrip,
  ).assignedAmbulance,
  null,
  "canonical unassigned state must not inherit local responder identity",
);

const { createActor } = require("xstate");
const lifecycle = loadSourceModule("machines/tripLifecycleMachine.js");
const lifecycleActor = createActor(lifecycle.tripLifecycleMachine).start();
lifecycleActor.send({
  type: "SUBMIT",
  serviceType: "ambulance",
  requestId: "request-1",
  hospitalId: "hospital-1",
});
lifecycleActor.send({
  type: "APPROVE",
  assignedAmbulance: { id: "ambulance-1" },
});
lifecycleActor.send({ type: "ARRIVE" });
assert.equal(lifecycleActor.getSnapshot().value, "arrived");
lifecycleActor.send(
  lifecycle.serverStatusToMachineEvent("in_progress", {
    requestId: "request-1",
    hospitalId: "hospital-1",
    serviceType: "ambulance",
    assignedAmbulance: null,
  }),
);
assert.equal(
  lifecycleActor.getSnapshot().value,
  "active",
  "server reconciliation must correct a stale local arrived state",
);
assert.equal(lifecycleActor.getSnapshot().context.assignedAmbulance, null);
lifecycleActor.stop();

const focusedMapState = loadSourceModule("hooks/map/shell/useMapFocusedState.js", {
  react: { useMemo: (factory) => factory() },
  "../../../components/map/core/MapSheetOrchestrator": {
    MAP_SHEET_PHASES: { COMMIT_PAYMENT: "commit_payment" },
  },
  "../../../components/map/core/mapActiveRequestModel": {
    MAP_ACTIVE_REQUEST_KINDS: {
      AMBULANCE: "ambulance",
      PENDING: "pending",
    },
  },
  "../../../components/map/surfaces/hospitals/mapHospitalDetail.helpers": {
    getDestinationCoordinate: () => null,
  },
  "../../../services/emergencyRequestsService": {
    EmergencyRequestStatus: statusConstants,
  },
  "../../../utils/mapUtils": { calculateBearing: () => 0 },
});
assert.equal(
  focusedMapState.resolveMapServiceMarkerKind({
    historyVisitDetailsVisible: false,
    activeMapRequest: { kind: "ambulance", status: "in_progress" },
    sheetPhase: "tracking",
    paymentPreviewKind: null,
  }),
  null,
  "the map must not animate a responder before canonical acceptance",
);
assert.equal(
  focusedMapState.resolveMapServiceMarkerKind({
    historyVisitDetailsVisible: false,
    activeMapRequest: { kind: "ambulance", status: "accepted" },
    sheetPhase: "tracking",
    paymentPreviewKind: null,
  }),
  "ambulance",
);
const emergencyActions = read("hooks/emergency/useEmergencyActions.js");
assert.match(emergencyActions, /"report_telemetry"/);
assert.match(emergencyActions, /"ensure_dispatch"/);
assert.match(emergencyActions, /"mark_arrived"/);
assert.match(emergencyActions, /"mark_completed"/);
assert.doesNotMatch(
  emergencyActions,
  /responderTelemetryLeaseExpiresAt: leaseExpiresAt,\s*updatedAt:/,
  "local demo telemetry must not advance the canonical event version",
);
const demoLifecycleEdge = read(
  "supabase/functions/_shared/domain/demo/emergencyLifecycle.ts",
);
assert.match(demoLifecycleEdge, /"responder_accept_emergency"/);
assert.match(demoLifecycleEdge, /"report_responder_telemetry"/);
assert.match(demoLifecycleEdge, /"responder_arrive_emergency"/);
assert.match(demoLifecycleEdge, /REQUEST_OWNERSHIP_MISMATCH/);
assert.match(demoLifecycleEdge, /NOT_DEMO_HOSPITAL/);
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

const paymentService = read("services/paymentService.js");
assert.equal(
  (
    paymentService.match(
      /emergency_requests!payments_emergency_request_id_fkey/g,
    ) || []
  ).length,
  2,
  "payment history reads must pin the request-owned FK when both payment relationships exist",
);

console.log("PASS emergency payment and patient lifecycle contract");
