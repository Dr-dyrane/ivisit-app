const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");

global.__DEV__ = false;

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
      DispatchService: { calculateDistance: () => 4.25 },
    },
    "../../surfaces/hospitals/mapHospitalDetail.helpers": {
      getDestinationCoordinate: () => ({ latitude: 3, longitude: 4 }),
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
assert.equal(
  commitPaymentHelpers.buildCommitPaymentDistanceKm(
    { id: "hospital-1" },
    { latitude: 1, longitude: 2 },
    { routeDistanceKm: 7.2 },
  ),
  7.2,
  "checkout must preserve the routed distance that produced the selected quote",
);
assert.equal(
  commitPaymentHelpers.buildCommitPaymentDistanceKm(
    { id: "hospital-1" },
    { latitude: 1, longitude: 2 },
    null,
  ),
  4.25,
  "Haversine distance remains the fallback when no routed quote distance exists",
);
assert.equal(
  commitPaymentHelpers.buildAmbulanceCommitRequest({
    hospital: { id: "hospital-1", name: "Hospital" },
    transport: {
      tierKey: "advanced",
      service_type: "ambulance",
      routeDistanceKm: 7.2,
    },
    paymentMethod: { id: "cash_payment" },
    pricingSnapshot: { totalCost: 240 },
    currentLocation: { latitude: 1, longitude: 2 },
  }).distanceKm,
  7.2,
  "request creation must use the same routed distance as checkout",
);

const hospitalDetailHelpers = loadSourceModule(
  "components/map/surfaces/hospitals/mapHospitalDetail.helpers.js",
  {
    "react-native": { Platform: { OS: "web" } },
    "./mapHospitalList.helpers": { buildHospitalSubtitle: () => "Hospital" },
    "../../../../utils/formatMoney": {
      formatMoney: (amount) => `USD ${amount}`,
      resolveMoneyCurrency: (...values) => values.find(Boolean) || "USD",
    },
  },
);
const ambulancePricingRows = [
  {
    id: "pricing-basic",
    service_type: "ambulance_basic",
    service_name: "Basic Life Support",
  },
];
const pendingAmbulanceCard = hospitalDetailHelpers
  .buildAmbulanceServiceCards(
    { id: "hospital-1", ambulances: 1, currency: "USD" },
    ambulancePricingRows,
    false,
    {},
    { basic: { amount: null, isLoading: true, isError: false } },
  )
  .find((card) => card.tierKey === "basic");
assert.equal(pendingAmbulanceCard.serverQuoteReady, false);
const quotedAmbulanceCard = hospitalDetailHelpers
  .buildAmbulanceServiceCards(
    { id: "hospital-1", ambulances: 1, currency: "USD" },
    ambulancePricingRows,
    false,
    {},
    {
      basic: {
        amount: 240,
        currency: "USD",
        isLoading: false,
        isError: false,
      },
    },
  )
  .find((card) => card.tierKey === "basic");
assert.equal(quotedAmbulanceCard.serverQuoteReady, true);

const ambulanceDecisionHelpers = loadSourceModule(
  "components/map/views/ambulanceDecision/mapAmbulanceDecision.helpers.js",
  {
    "../../../emergency/requestModal/ambulanceTierVisuals": {
      getAmbulanceVisualProfile: (service = {}) => ({
        key: service.tierKey || "basic",
        shortLabel: "BLS",
        label: "Basic Life Support",
        features: [],
      }),
    },
    "../../surfaces/hospitals/mapHospitalDetail.helpers": hospitalDetailHelpers,
    "./mapAmbulanceDecision.content": {
      MAP_AMBULANCE_DECISION_COPY: {
        ETA_FALLBACK: "Arriving soon",
        PRICE_FALLBACK: null,
        ROUTE_PENDING: "Route updating",
        ROUTE_SOURCE_FALLBACK: "Dispatch origin",
        ROUTE_DESTINATION_TITLE: "My location",
        ROUTE_DESTINATION_SUBTITLE: "Current pickup point",
        CONFIDENCE_LIVE: "Live hospital pricing",
        CONFIDENCE_FALLBACK: "Hospital fallback",
        SUMMARY: null,
      },
    },
  },
);
const decisionBase = {
  hospital: {
    id: "hospital-1",
    name: "Hospital",
    ambulances: 1,
    distance: "2.0 km",
  },
  pricingRows: ambulancePricingRows,
  routeInfo: { distanceMeters: 7200, durationSec: 600 },
};
const pendingQuoteDecision = ambulanceDecisionHelpers.buildAmbulanceDecisionModel({
  ...decisionBase,
  serverQuoteMap: {
    basic: { amount: null, isLoading: true, isError: false },
  },
});
assert.equal(
  pendingQuoteDecision.canConfirm,
  false,
  "a decision cannot confirm while its server quote is pending",
);
const readyQuoteDecision = ambulanceDecisionHelpers.buildAmbulanceDecisionModel({
  ...decisionBase,
  serverQuoteMap: {
    basic: { amount: 240, currency: "USD", isLoading: false, isError: false },
  },
});
assert.equal(readyQuoteDecision.canConfirm, true);
assert.equal(readyQuoteDecision.recommendedService.routeDistanceKm, 7.2);
assert.equal(
  readyQuoteDecision.distanceLabel,
  "7.2 km",
  "the route-backed distance must win over a cached hospital distance label",
);

const decisionHandlerModule = loadSourceModule(
  "hooks/map/decision/useMapDecisionHandlers.js",
  {
    react: { useCallback: (callback) => callback },
    "../../../components/map/views/commitDetails/mapCommitDetails.helpers": {
      sanitizeCommitEmail: (value) => value || "",
      sanitizeCommitPhone: (value) => value || "",
      isCommitPhoneValid: (value) => Boolean(value),
    },
    "../../../components/map/core/mapSheetFlowPayloads": {
      buildBedDecisionSourcePayload: (value) => value,
    },
    "../../../components/map/core/mapSheet.constants": {
      MAP_SHEET_PHASES: {
        TRACKING: "tracking",
        AMBULANCE_DECISION: "ambulance_decision",
        BED_DECISION: "bed_decision",
        COMMIT_DETAILS: "commit_details",
        COMMIT_TRIAGE: "commit_triage",
      },
      MAP_SHEET_SNAP_STATES: { EXPANDED: "expanded" },
    },
    "../../../services/emergencyRequestsService": {
      emergencyRequestsService: { updateTriage: async () => {} },
    },
  },
);
let combinedDecisionPayload = null;
const combinedDecisionHandlers = decisionHandlerModule.useMapDecisionHandlers({
  user: null,
  selectedCare: "both",
  sheetPayload: {},
  sheetSnapState: "half",
  featuredHospital: null,
  nearestHospital: null,
  mapFocusedHospital: null,
  renderedSnapState: "half",
  activeMapRequest: null,
  activeBedBooking: null,
  openAmbulanceDecision: () => {},
  openBedDecision: (_hospital, _careIntent, nextPayload) => {
    combinedDecisionPayload = nextPayload;
  },
  openCommitDetails: () => {},
  openCommitTriage: () => {},
  openCommitPayment: () => {},
  closeCommitTriage: () => {},
});
combinedDecisionHandlers.handleConfirmAmbulanceDecision(
  { id: "hospital-1" },
  {
    id: "pricing-basic",
    title: "Everyday care",
    tierKey: "basic",
    routeDistanceKm: 7.2,
  },
);
assert.equal(
  combinedDecisionPayload.savedTransport.routeDistanceKm,
  7.2,
  "combined-care saved transport must retain its routed quote distance",
);
let combinedPaymentTransport = null;
const combinedBedDecisionHandlers = decisionHandlerModule.useMapDecisionHandlers({
  user: { email: "patient@example.com", phone: "+15555550123" },
  selectedCare: "both",
  sheetPayload: combinedDecisionPayload,
  sheetSnapState: "half",
  featuredHospital: null,
  nearestHospital: null,
  mapFocusedHospital: null,
  renderedSnapState: "half",
  activeMapRequest: null,
  activeBedBooking: null,
  openAmbulanceDecision: () => {},
  openBedDecision: () => {},
  openCommitDetails: () => {},
  openCommitTriage: () => {},
  openCommitPayment: (_hospital, nextTransport) => {
    combinedPaymentTransport = nextTransport;
  },
  closeCommitTriage: () => {},
});
combinedBedDecisionHandlers.handleConfirmBedDecision(
  { id: "hospital-1" },
  { id: "room-1", title: "General ward" },
  null,
  "both",
);
assert.equal(
  combinedPaymentTransport.routeDistanceKm,
  7.2,
  "combined-care payment must receive the routed quote distance",
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
const canonicalRetry = transaction.createCanonicalPaymentRetry({
  userId: "user-1",
  hospitalId: "hospital-1",
  serviceType: "ambulance",
  methodKind: kinds.CARD,
  initiatedRequest: { requestId: "AMB-001" },
  initiationResult: { requestId: "request-1", displayId: "AMB-001" },
  settlementCost: { totalCost: 45, currency: "USD" },
});
assert.equal(canonicalRetry.requestId, "request-1");
assert.equal(
  transaction.canResumeCanonicalPaymentRetry(canonicalRetry, {
    userId: "user-1",
    hospitalId: "hospital-1",
    serviceType: "ambulance",
    methodKind: kinds.CARD,
  }),
  true,
);
assert.equal(
  transaction.canResumeCanonicalPaymentRetry(canonicalRetry, {
    userId: "user-1",
    hospitalId: "hospital-1",
    serviceType: "ambulance",
    methodKind: kinds.WALLET,
  }),
  false,
  "a pending card request must not be settled through a different payment contract",
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
assert.match(controller, /canonicalPaymentRetryRef\.current/);
assert.match(controller, /canResumeCanonicalPaymentRetry/);
assert.match(controller, /createCanonicalPaymentRetry/);
assert.match(
  controller,
  /canonicalTotalContract\.hasMismatch[\s\S]*?MAP_COMMIT_PAYMENT_TRANSACTION_STATES\.IDLE/,
  "a changed canonical price must return to a confirmable state instead of hiding the CTA",
);
const canonicalReconciliationAt = controller.indexOf(
  "const canonicalTotalContract = reconcileCanonicalPaymentTotal",
);
const mismatchGuardAt = controller.indexOf(
  "canonicalTotalContract.ok !== true",
  canonicalReconciliationAt,
);
const clearCommitFlowAt = controller.indexOf(
  "clearCommitFlow?.()",
  canonicalReconciliationAt,
);
assert.ok(
  canonicalReconciliationAt >= 0 &&
    mismatchGuardAt > canonicalReconciliationAt &&
    clearCommitFlowAt > mismatchGuardAt,
  "canonical-total mismatch handling must run before commit context is cleared",
);

const requestFlow = read("hooks/emergency/useRequestFlow.js");
assert.match(requestFlow, /const awaitsPaymentConfirmation = isCardPayment;/);
assert.doesNotMatch(requestFlow, /request\?\.deferDispatchUntilPayment === true/);
const completeStart = requestFlow.indexOf("const handleRequestComplete");
const completeFlow = requestFlow.slice(completeStart);
assert.doesNotMatch(completeFlow, /status:\s*EmergencyRequestStatus\.ACCEPTED/);
assert.doesNotMatch(completeFlow, /setRequestStatus/);
assert.doesNotMatch(completeFlow, /updateVisit/);

// handleQuickEmergency was DELETED (audit E24). It was dead -- referenced only by
// its own definition and the returned object -- and it carried three defects at
// once: it deadlocked on the inflight guard its own nested handleRequestInitiated
// sets, it fabricated a success result on that block, and because quick ran the
// initiate half with no handleRequestComplete after it, the flag it stranded true
// refused every later request as IN_FLIGHT. A dead function has no caller to
// define its correct semantics, so it is removed rather than repaired: whoever
// wants a quick-emergency lane must design one against a real call site.
assert.doesNotMatch(
  requestFlow,
  /handleQuickEmergency/,
  "the dead, deadlock-prone quick-emergency lane must not return: build it against a real caller instead",
);

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
const prepareRatingStart = trackingController.indexOf(
  "const prepareTrackingRating",
);
const prepareRatingEnd = trackingController.indexOf(
  "const handleCompleteAmbulanceWithRating",
  prepareRatingStart,
);
const prepareRatingBlock = trackingController.slice(
  prepareRatingStart,
  prepareRatingEnd,
);
assert.match(prepareRatingBlock, /writeTrackingRatingRecoveryClaim/);
assert.doesNotMatch(prepareRatingBlock, /updateVisit|RATING_PENDING/);
assert.match(
  read("components/map/views/tracking/mapTracking.model.js"),
  /label: "Complete Visit"/,
);

const visitsService = read("services/visitsService.js");
const updateRatingStart = visitsService.indexOf("async updateRating");
const deleteVisitStart = visitsService.indexOf("async delete", updateRatingStart);
const ratingCommands = visitsService.slice(updateRatingStart, deleteVisitStart);
assert.match(ratingCommands, /supabase\.rpc\("rate_visit"/);
assert.match(ratingCommands, /supabase\.rpc\("skip_visit_rating"/);
assert.doesNotMatch(ratingCommands, /\.from\(TABLE\)\.update/);

// No parallel truth: patient-side visit commands must never mint visit rows.
assert.doesNotMatch(
  visitsService,
  /async ensureExists\(/,
  "the row-minting ensureExists primitive must not exist",
);
const visitUpdateStart = visitsService.indexOf("async update(id, updates)");
const visitCancelStart = visitsService.indexOf("async cancel(", visitUpdateStart);
const visitCompleteStart = visitsService.indexOf("async complete(", visitCancelStart);
const visitUpdateRatingStart = visitsService.indexOf(
  "async updateRating",
  visitCompleteStart,
);
assert.ok(
  visitUpdateStart >= 0 &&
    visitCancelStart > visitUpdateStart &&
    visitCompleteStart > visitCancelStart &&
    visitUpdateRatingStart > visitCompleteStart,
  "visit lifecycle commands must remain in update -> cancel -> complete order",
);
const lifecycleCommands = visitsService.slice(
  visitUpdateStart,
  visitUpdateRatingStart,
);
assert.doesNotMatch(
  lifecycleCommands,
  /\.upsert\(/,
  "update/cancel/complete must not upsert a missing visit row into existence",
);
assert.doesNotMatch(
  lifecycleCommands,
  /this\.ensureExists\(/,
  "update/cancel/complete must not ensure a missing visit row into existence",
);
const cancelCommand = visitsService.slice(visitCancelStart, visitCompleteStart);
assert.match(
  cancelCommand,
  /resolvedVisitRow\.care_mode != null/,
  "cancel must refuse care-mode visits owned by the server-side transition",
);

const visitSecurity = read("supabase/migrations/20260219000700_security.sql");
assert.match(
  visitSecurity,
  /CREATE POLICY "Users manage own standalone visits"[\s\S]*?request_id IS NULL/,
);
assert.match(
  visitSecurity,
  /CREATE OR REPLACE FUNCTION public\.p_can_read_visit[\s\S]*?actor\.role = 'org_admin'[\s\S]*?visit_doctor\.profile_id = auth\.uid\(\)[\s\S]*?assignment\.responder_id = auth\.uid\(\)/,
);
assert.match(
  visitSecurity,
  /CREATE POLICY "Authorized actors see scoped visits"[\s\S]*?p_can_read_visit\(id\)/,
);
const coreRpcs = read("supabase/migrations/20260219010000_core_rpcs.sql");
assert.match(coreRpcs, /CREATE OR REPLACE FUNCTION public\.rate_visit/);
assert.match(coreRpcs, /CREATE OR REPLACE FUNCTION public\.skip_visit_rating/);
assert.match(coreRpcs, /lifecycle_state = 'rated'/);
assert.match(coreRpcs, /lifecycle_state = 'post_completion'/);
assert.match(
  coreRpcs,
  /REVOKE ALL ON FUNCTION public\.rate_visit\(UUID, SMALLINT, TEXT\) FROM PUBLIC, anon/,
);
assert.match(coreRpcs, /PATIENT_ARRIVAL_ACK_REQUIRED/);
assert.match(
  coreRpcs,
  /CREATE OR REPLACE FUNCTION public\.expire_responder_offers[\s\S]*?request\.current_responder_assignment_id IS NULL[\s\S]*?auto_assign_ambulance\(v_request\.id, 50, NULL\)/,
);

const emergencyLogic = read("supabase/migrations/20260219000800_emergency_logic.sql");
for (const patientCashContractSource of [emergencyLogic, coreRpcs]) {
  const patientCashStart = patientCashContractSource.indexOf(
    "CREATE OR REPLACE FUNCTION public.check_patient_cash_eligibility",
  );
  const patientCashEnd = patientCashContractSource.indexOf(
    "GRANT EXECUTE ON FUNCTION public.check_patient_cash_eligibility",
    patientCashStart,
  );
  assert.ok(
    patientCashStart >= 0 && patientCashEnd > patientCashStart,
    "both maintained RPC pillars must include the patient-safe cash receiver",
  );
  const patientCashContract = patientCashContractSource.slice(
    patientCashStart,
    patientCashEnd + 180,
  );
  assert.match(patientCashContract, /RETURNS BOOLEAN/);
  assert.match(patientCashContract, /public\.resolve_emergency_pricing/);
  assert.match(patientCashContract, /organization\.is_active/);
  assert.match(
    patientCashContract,
    /COALESCE\(v_wallet_balance, 0\) >= COALESCE\(v_fee_amount, 0\)/,
  );
  assert.doesNotMatch(patientCashContract, /jsonb_build_object/);
  assert.doesNotMatch(patientCashContract, /'balance'|'fee_percentage'/);
  assert.match(
    patientCashContract,
    /FROM PUBLIC, anon;[\s\S]*?TO authenticated, service_role;/,
  );
}
const createEmergency = emergencyLogic.slice(
  emergencyLogic.indexOf("CREATE OR REPLACE FUNCTION public.create_emergency_v4"),
  emergencyLogic.indexOf("-- BEGIN EMERGENCY_PAYMENT_RELEASE_GATE"),
);
assert.match(createEmergency, /v_actor_org_id UUID;/);
assert.doesNotMatch(
  emergencyLogic,
  /v_actor_org_id UUID;\s*v_actor_org_id UUID;/,
  "a scoped emergency function must not redeclare actor organization",
);
const automations = read("supabase/migrations/20260219000900_automations.sql");
assert.match(
  automations,
  /CREATE OR REPLACE FUNCTION public\.sync_emergency_to_visit[\s\S]*?ON CONFLICT \(request_id\) WHERE request_id IS NOT NULL/,
);
assert.match(automations, /WHEN 'payment_declined' THEN 'cancelled'/);
assert.doesNotMatch(automations, /h\.google_(address|phone)/);
for (const lifecycleOwnerSource of [
  emergencyLogic,
  read("supabase/migrations/20260219000400_finance.sql"),
  coreRpcs,
]) {
  assert.doesNotMatch(
    lifecycleOwnerSource,
    /UPDATE public\.visits\s+SET status = 'active'/,
    "payment receivers must not overwrite the canonical Request-to-Visit projection",
  );
}
assert.match(
  read("supabase/migrations/20260219000300_logistics.sql"),
  /idx_emergency_requests_unassigned_dispatch_queue/,
);

const requestService = read("services/emergencyRequestsService.js");
assert.match(requestService, /'patient_acknowledge_responder_arrival'/);
assert.match(requestService, /data\.acknowledged_at/);
assert.match(requestService, /const deferDispatchUntilPayment = isCard;/);
assert.match(requestService, /demo-emergency-lifecycle/);
assert.match(requestService, /emergency_status_transitions/);
assert.match(requestService, /distance_km/);
assert.match(requestService, /canonicalTotal/);
assert.match(requestService, /requireEmergencyUser\(user\)/);
const paymentServiceSource = read("services/paymentService.js");
const cashPreflightStart = paymentServiceSource.indexOf(
  "async checkCashEligibility",
);
const cashPreflightEnd = paymentServiceSource.indexOf(
  "async approveCashPayment",
  cashPreflightStart,
);
const cashPreflightSource = paymentServiceSource.slice(
  cashPreflightStart,
  cashPreflightEnd,
);
assert.match(cashPreflightSource, /check_patient_cash_eligibility/);
assert.doesNotMatch(cashPreflightSource, /\.from\('organization_wallets'\)/);
assert.doesNotMatch(cashPreflightSource, /estimatedAmount|organizationId/);
const requestListStart = requestService.indexOf("async list()");
const requestCreateStart = requestService.indexOf("async create(request)", requestListStart);
const requestList = requestService.slice(requestListStart, requestCreateStart);
assert.match(requestList, /if \(error\) throw error;/);
assert.doesNotMatch(
  requestList,
  /database\.read\(StorageKeys\.EMERGENCY_REQUESTS/,
  "active request reads must not present the unscoped legacy cache as server truth",
);
assert.doesNotMatch(
  requestService,
  /database\.(createOne|updateOne)\(\s*StorageKeys\.EMERGENCY_REQUESTS/,
  "emergency mutations must never report a local-only success",
);
assert.match(
  requestService,
  /Emergency request not found or no longer available\./,
  "stale cross-device writes must fail instead of returning optimistic success",
);
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
assert.match(
  realtimeHook,
  /event: "\*"[\s\S]*?table: "emergency_requests"/,
);
assert.match(realtimeHook, /activeBedBookingRef\.current/);
assert.match(realtimeHook, /event:emergency_requests/);
const activeTripQuery = read("hooks/emergency/useActiveTripQuery.js");
assert.match(activeTripQuery, /getOwnedById\(previousRequestId\)/);
assert.match(activeTripQuery, /dispatchAcceptedAt/);
assert.match(activeTripQuery, /hasAcceptedResponder/);
assert.match(activeTripQuery, /refetchOnWindowFocus: true/);
assert.match(activeTripQuery, /queryKey: \[\.\.\.ACTIVE_TRIP_QUERY_KEY, userId\]/);
assert.match(activeTripQuery, /enabled: hydrated && Boolean\(userId\)/);
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
    "../../services/hospitalsService": { hospitalsService: {} },
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
const requestOwnedHospital = {
  id: "request-owned-hospital",
  name: "Request-owned hospital",
};
const focusedRequestState = focusedMapState.useMapFocusedState({
  sheetPhase: "tracking",
  sheetPayload: null,
  discoveredHospitals: [{ id: "cached-hospital", name: "Cached hospital" }],
  historyFocusedHospital: null,
  historyVisitDetailsVisible: false,
  activeMapRequest: {
    kind: "ambulance",
    status: "accepted",
    hospitalId: requestOwnedHospital.id,
    hospital: requestOwnedHospital,
  },
  featuredHospital: null,
  nearestHospital: null,
  activeLocation: { latitude: 6.5244, longitude: 3.3792 },
});
assert.equal(focusedRequestState.mapHospitals[0].id, requestOwnedHospital.id);
assert.equal(focusedRequestState.mapFocusedHospital.id, requestOwnedHospital.id);
const mapScreen = read("screens/MapScreen.jsx");
assert.match(mapScreen, /location=\{mapCanvasLocation\}/);
assert.match(mapScreen, /placeLabel=\{trackingLocationDetails\?\.primaryText\}/);
assert.match(mapScreen, /currentLocation=\{trackingLocationDetails\}/);
const emergencyActions = read("hooks/emergency/useEmergencyActions.js");
assert.match(emergencyActions, /"report_telemetry"/);
assert.match(emergencyActions, /"ensure_dispatch"/);
assert.match(emergencyActions, /"mark_arrived"/);
assert.match(emergencyActions, /"mark_completed"/);
assert.doesNotMatch(
  emergencyActions,
  /activeAmbulances|AmbulanceStatus\.AVAILABLE/,
  "patient tracking must not synthesize assignment from a broad fleet read",
);
assert.doesNotMatch(
  read("hooks/emergency/useEmergencyHospitalSync.js"),
  /useAmbulances|activeAmbulances/,
  "hospital discovery must not mount a patient-wide ambulance subscription",
);
assert.doesNotMatch(
  read("services/ambulanceService.js"),
  /async list\(\)/,
  "the patient service must not expose an unscoped fleet read",
);
assert.doesNotMatch(
  read("components/map/views/commitPayment/mapCommitPayment.helpers.js"),
  /ems_001/,
  "optimistic responder presentation must not fabricate an ambulance identity",
);
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

const trackingTimeline = loadSourceModule(
  "components/map/views/tracking/mapTracking.timeline.js",
);
const previewRoute = {
  requestKey: null,
  routeSource: "live_route",
  durationSec: 600,
  distanceMeters: 5200,
  coordinates: [
    { latitude: 1, longitude: 2 },
    { latitude: 3, longitude: 4 },
  ],
};
assert.deepEqual(
  trackingTimeline.buildTrackingRouteRequestSeed({
    currentRouteInfo: previewRoute,
    previousRequestKey: null,
    nextRequestKey: "request-1",
  }),
  {
    ...previewRoute,
    requestKey: "request-1",
  },
  "payment completion must promote the already-calculated preview route to the canonical request",
);
assert.deepEqual(
  trackingTimeline.buildTrackingRouteRequestSeed({
    currentRouteInfo: { ...previewRoute, requestKey: "request-old" },
    previousRequestKey: "request-old",
    nextRequestKey: "request-new",
  }),
  {
    requestKey: "request-new",
    routeSource: "none",
    durationSec: null,
    distanceMeters: null,
    coordinates: [],
  },
  "a route from a previous request must never leak into the next trip",
);

const activeSessionPresentation = loadSourceModule(
  "components/map/core/mapActiveSessionPresentation.js",
  {
    "../../../services/emergencyRequestsService": {
      EmergencyRequestStatus: statusConstants,
    },
    "./mapActiveRequestModel": {
      MAP_ACTIVE_REQUEST_KINDS: {
        IDLE: "idle",
        AMBULANCE: "ambulance",
        BED: "bed",
        PENDING: "pending",
      },
      normalizeMapTimestampMs: (value) =>
        Number.isFinite(value) ? value : Date.parse(value),
    },
  },
);
const headerNowMs = Date.parse("2026-07-14T12:00:00.000Z");
const headerSession = activeSessionPresentation.buildMapActiveSessionHeaderSession({
  activeMapRequest: {
    hasActiveRequest: true,
    kind: "ambulance",
    requestId: "request-1",
    status: "accepted",
    startedAt: headerNowMs - 60_000,
    arrivalLabel: null,
    minuteValue: "--",
    distanceValue: "--",
  },
  trackingRouteInfo: {
    ...previewRoute,
    requestKey: "request-1",
  },
  nowMs: headerNowMs,
});
assert.equal(headerSession.metrics[0].value === "--", false);
assert.equal(headerSession.metrics[1].value, "9");
assert.equal(headerSession.metrics[2].value, "5.2");
assert.equal(headerSession.statusLabel, "En Route");
const assigningHeaderSession =
  activeSessionPresentation.buildMapActiveSessionHeaderSession({
    activeMapRequest: {
      hasActiveRequest: true,
      kind: "ambulance",
      requestId: "request-1",
      status: "in_progress",
      minuteValue: "--",
      distanceValue: "5.2",
    },
    trackingRouteInfo: { ...previewRoute, requestKey: "request-1" },
    nowMs: headerNowMs,
  });
assert.equal(assigningHeaderSession.statusLabel, "Finding responder");
assert.equal(assigningHeaderSession.metrics[1].value, "--");

assert.match(handlers, /setActiveAmbulanceTrip/);
assert.match(handlers, /patientAcknowledgedArrivalAt: acknowledgedAt/);
assert.match(handlers, /void queryClient[\s\S]*?\.invalidateQueries/);
assert.match(trackingController, /showToast\("Arrival confirmed\."/);
assert.match(trackingController, /Could not confirm arrival right now/);

// ===========================================================================
// PAYMENT MONEY-SAFETY CONTRACT (OTA1 E1/E2/E4/E5/E13/E22)
//
// Every pin below exercises the real module through loadSourceModule and asserts
// against an operation log, so a refactor that keeps the identifiers but loses
// the behavior still reds. Source-text pins are used only where the property is
// a type or an ordering that has no runtime surface.
// ===========================================================================

// A Supabase test double that records every query verb in call order. The
// operation log is the contract surface: "the unset ran before the insert" and
// "no payment intent was ever created" are order/absence facts, not return
// values, so no return-value stub can express them.
function createPaymentSupabaseStub({
  user = { id: "user-1" },
  tables = {},
  rpc = {},
  invoke = {},
} = {}) {
  const operations = [];
  const rpcCalls = [];
  const invokeCalls = [];

  const from = (table) => {
    const state = { table, verb: null, payload: null, filters: [] };
    const settle = () => {
      const handler = tables[`${table}.${state.verb}`] || tables[table];
      const result = typeof handler === "function" ? handler(state) : handler;
      return Promise.resolve(result || { data: null, error: null });
    };
    const builder = {
      select() {
        // insert(...).select() must stay an insert in the log
        if (!state.verb) {
          state.verb = "select";
          operations.push(`${table}.select`);
        }
        return builder;
      },
      insert(payload) {
        state.verb = "insert";
        state.payload = payload;
        operations.push(`${table}.insert`);
        return builder;
      },
      update(payload) {
        state.verb = "update";
        state.payload = payload;
        operations.push(`${table}.update`);
        return builder;
      },
      eq(column, value) {
        state.filters.push([column, value]);
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      single() {
        return settle();
      },
      maybeSingle() {
        return settle();
      },
      // thenable so `await supabase.from(t).update(v).eq(c, v)` resolves
      then(onFulfilled, onRejected) {
        return settle().then(onFulfilled, onRejected);
      },
    };
    return builder;
  };

  return {
    operations,
    rpcCalls,
    invokeCalls,
    supabase: {
      auth: { getUser: async () => ({ data: { user } }) },
      from,
      rpc: async (name, params) => {
        operations.push(`rpc:${name}`);
        rpcCalls.push({ name, params });
        const handler = rpc[name];
        return (
          (typeof handler === "function" ? handler(params) : handler) || {
            data: { success: true },
            error: null,
          }
        );
      },
      functions: {
        invoke: async (name, options) => {
          operations.push(`functions.invoke:${name}`);
          invokeCalls.push({ name, options });
          const handler = invoke[name];
          return (
            (typeof handler === "function" ? handler(options) : handler) || {
              data: {},
              error: null,
            }
          );
        },
      },
    },
  };
}

const PAYMENT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function loadPaymentService(stub, confirmCalls = []) {
  return loadSourceModule("services/paymentService.js", {
    "./supabase": { supabase: stub.supabase },
    "../database": {
      database: {
        read: async (_key, fallback = []) => fallback,
        write: async () => {},
      },
      StorageKeys: {
        PAYMENT_METHODS: "payment_methods",
        DEFAULT_PAYMENT_METHOD: "default_payment_method",
      },
    },
    "./displayIdService": {
      resolveEntityId: async (id) => id,
      isValidUUID: (value) => PAYMENT_UUID_PATTERN.test(String(value || "")),
    },
    "./stripeSavedCardConfirmation": {
      confirmSavedCardPayment: async (...args) => {
        confirmCalls.push(args);
        return { status: "succeeded" };
      },
    },
  }).paymentService;
}

// --- E4: submit lock is acquired after every synchronous guard -------------
// The canonical-retry mismatch guard returns early. If the lock were taken
// before it, that return would skip the finally and strand submitLockRef true,
// bricking the pay CTA for the life of the sheet.
const handleSubmitStart = controller.indexOf(
  "const handleSubmit = useCallback(async () => {",
);
const handleSubmitEnd = controller.indexOf("  return {", handleSubmitStart);
assert.ok(
  handleSubmitStart >= 0 && handleSubmitEnd > handleSubmitStart,
  "handleSubmit must remain locatable for the submit-lock contract",
);
const handleSubmitBlock = controller.slice(handleSubmitStart, handleSubmitEnd);
const canonicalRetryGuardAt = handleSubmitBlock.indexOf(
  "!canResumeCanonicalPaymentRetry(pendingCanonicalRetry, retryContext)",
);
const lockCheckAt = handleSubmitBlock.indexOf(
  "if (submitLockRef.current) return;",
);
const lockAcquiredAt = handleSubmitBlock.indexOf("submitLockRef.current = true;");
assert.ok(
  canonicalRetryGuardAt >= 0 &&
    lockCheckAt > canonicalRetryGuardAt &&
    lockAcquiredAt > canonicalRetryGuardAt,
  "the canonical-retry guard must return lock-free: acquiring the submit lock before it strands the lock on its early return",
);
const submitLockReleases = Array.from(
  handleSubmitBlock.matchAll(/submitLockRef\.current = false;/g),
  (match) => match.index,
);
assert.equal(
  submitLockReleases.length,
  1,
  "the submit lock must have exactly one release inside handleSubmit",
);
const submitFinallyAt = handleSubmitBlock.indexOf("} finally {");
assert.ok(
  submitFinallyAt >= 0 && submitLockReleases[0] > submitFinallyAt,
  "the submit lock must be released only in its owning finally, so no early return can leak it",
);

// --- E5: SETTLEMENT_PENDING is a real, dismissible, unlocked state ---------
assert.equal(
  transaction.MAP_COMMIT_PAYMENT_TRANSACTION_STATES.SETTLEMENT_PENDING,
  "settlement_pending",
);
assert.equal(
  transaction.isCommitPaymentDismissibleState(
    transaction.createCommitPaymentSubmissionState(
      transaction.MAP_COMMIT_PAYMENT_TRANSACTION_STATES.SETTLEMENT_PENDING,
    ),
    { isSubmitting: false },
  ),
  true,
  "a settlement that timed out must leave the sheet closable",
);
assert.equal(
  transaction.isCommitPaymentDismissibleState(
    transaction.createCommitPaymentSubmissionState(
      transaction.MAP_COMMIT_PAYMENT_TRANSACTION_STATES.FINALIZING_DISPATCH,
    ),
    { isSubmitting: true },
  ),
  false,
  "an in-flight settlement must stay non-dismissible",
);

// The submission-state union is a type, so it has no runtime surface; pin the
// source directly or a state the reducer never names could still be dispatched.
assert.match(
  read("atoms/paymentAtoms.ts"),
  /\|\s*"settlement_pending"/,
  "SubmissionStateKind must name settlement_pending",
);

// Evaluate the derived atom live rather than reading its source: the exclusion
// only matters as the value the CTA actually reads.
const { createStore } = require("jotai/vanilla");
const paymentAtoms = loadSourceModule("atoms/paymentAtoms.ts");
const paymentAtomStore = createStore();
const readIsSubmittingFor = (kind) => {
  paymentAtomStore.set(paymentAtoms.paymentSubmissionStateAtom, {
    kind,
    display: "",
    dismissible: false,
  });
  return paymentAtomStore.get(paymentAtoms.isSubmittingPaymentAtom);
};
assert.equal(
  readIsSubmittingFor("settlement_pending"),
  false,
  "settlement_pending must be excluded from isSubmittingPaymentAtom or the timed-out sheet stays locked",
);
assert.equal(readIsSubmittingFor("finalizing_dispatch"), true);
assert.equal(readIsSubmittingFor("processing_payment"), true);
assert.equal(readIsSubmittingFor("waiting_approval"), true);
assert.equal(readIsSubmittingFor("dispatched"), false);

// --- E5: settlement_pending copy must never present the DISPATCHED promise --
const commitPaymentContent = loadSourceModule(
  "components/map/views/commitPayment/mapCommitPayment.content.js",
);
const commitPaymentPresentation = loadSourceModule(
  "components/map/views/commitPayment/mapCommitPayment.presentation.js",
  { "./mapCommitPayment.transaction": transaction },
);
const buildStatusConfigFor = (submissionKind) =>
  commitPaymentPresentation.buildCommitPaymentStatusConfig({
    submissionKind,
    isBedFlow: false,
    accentColor: "accent",
    warningColor: "warning",
    errorColor: "error",
    infoColor: "info",
    statusCopy: commitPaymentContent.MAP_COMMIT_PAYMENT_COPY,
  });
const settlementPendingStatus = buildStatusConfigFor(
  transaction.MAP_COMMIT_PAYMENT_TRANSACTION_STATES.SETTLEMENT_PENDING,
);
const dispatchedStatus = buildStatusConfigFor(
  transaction.MAP_COMMIT_PAYMENT_TRANSACTION_STATES.DISPATCHED,
);
assert.equal(
  settlementPendingStatus.title,
  commitPaymentContent.MAP_COMMIT_PAYMENT_COPY.STATUS_SETTLEMENT_PENDING_TITLE,
);
assert.notEqual(
  settlementPendingStatus.title,
  dispatchedStatus.title,
  "an unconfirmed settlement must not wear the dispatched title",
);
assert.notEqual(
  settlementPendingStatus.description,
  dispatchedStatus.description,
  "an unconfirmed settlement must not claim the hospital is responding",
);

// --- E5: both settlement-timeout branches recover identically --------------
const walletBranchStart = controller.indexOf("if (isWalletSelected) {");
const cardBranchStart = controller.indexOf("if (isCardSelected) {", walletBranchStart);
assert.ok(
  walletBranchStart >= 0 && cardBranchStart > walletBranchStart,
  "the wallet and card settlement branches must remain locatable",
);
const walletBranch = controller.slice(walletBranchStart, cardBranchStart);
const cardBranch = controller.slice(cardBranchStart, handleSubmitEnd);
const sliceSettlementTimeout = (branch, label) => {
  const start = branch.indexOf("if (!settlementResult?.success) {");
  const end = branch.indexOf(
    "const completionPayload = buildCommitPaymentCompletionPayload({",
    start,
  );
  assert.ok(
    start >= 0 && end > start,
    `${label} settlement-timeout branch must remain locatable`,
  );
  return branch.slice(start, end);
};
for (const [label, timeoutBranch] of [
  ["wallet", sliceSettlementTimeout(walletBranch, "wallet")],
  ["card", sliceSettlementTimeout(cardBranch, "card")],
]) {
  const invalidateAt = timeoutBranch.indexOf("await invalidateActiveTrip();");
  const settlementPendingAt = timeoutBranch.indexOf(
    "MAP_COMMIT_PAYMENT_TRANSACTION_STATES.SETTLEMENT_PENDING",
  );
  const watchAt = timeoutBranch.indexOf(
    "watchPendingSettlement(initiationResult.requestId);",
  );
  assert.ok(
    settlementPendingAt >= 0,
    `the ${label} settlement timeout must move the sheet to SETTLEMENT_PENDING instead of stranding a locked FINALIZING_DISPATCH sheet after money moved`,
  );
  assert.ok(
    invalidateAt >= 0 && invalidateAt < settlementPendingAt,
    `the ${label} settlement timeout must await invalidateActiveTrip() before surfacing the pending state, so the sheet reflects server truth`,
  );
  assert.ok(
    watchAt > settlementPendingAt,
    `the ${label} settlement timeout must hand off to watchPendingSettlement so late server truth still resolves the trip`,
  );
}

// --- E5 reviewer fix: a declined wallet settlement is not "pending" --------
// SETTLEMENT_PENDING copy says "Payment went through". Routing a decline there
// tells the patient their money moved when it did not. The card branch already
// pre-checks PAYMENT_DECLINED; the wallet branch must mirror it.
const walletTimeoutBranch = sliceSettlementTimeout(walletBranch, "wallet");
const walletDeclinedAt = walletTimeoutBranch.indexOf(
  'settlementResult?.code === "PAYMENT_DECLINED"',
);
const walletDeclinedStateAt = walletTimeoutBranch.indexOf(
  "MAP_COMMIT_PAYMENT_TRANSACTION_STATES.PAYMENT_DECLINED",
);
const walletPendingStateAt = walletTimeoutBranch.indexOf(
  "MAP_COMMIT_PAYMENT_TRANSACTION_STATES.SETTLEMENT_PENDING",
);
assert.ok(
  walletDeclinedAt >= 0 &&
    walletDeclinedStateAt > walletDeclinedAt &&
    walletDeclinedStateAt < walletPendingStateAt,
  "a declined wallet settlement must route to PAYMENT_DECLINED before the SETTLEMENT_PENDING branch, never claiming payment succeeded",
);
assert.match(
  commitPaymentContent.MAP_COMMIT_PAYMENT_COPY.STATUS_SETTLEMENT_PENDING_DESCRIPTION,
  /Payment went through/,
  "this pin is only load-bearing while the pending copy asserts payment succeeded",
);

// --- OTA2 E11: the declined sheet must not promise what it cannot do -------
// PAYMENT_DECLINED renders the status card only: the method selector lives in
// the isIdleState branch and footerSlot is `isIdleState ? footer : null`, so the
// old "Choose another card or cash" named two controls that are not on screen.
// It cannot safely gain an in-sheet resume either -- see the receiver pin below.
const declinedStatus = buildStatusConfigFor(
  transaction.MAP_COMMIT_PAYMENT_TRANSACTION_STATES.PAYMENT_DECLINED,
);
assert.equal(
  declinedStatus.title,
  commitPaymentContent.MAP_COMMIT_PAYMENT_COPY.STATUS_PAYMENT_DECLINED_TITLE,
  "declined copy must resolve from the content module, not an inline literal",
);
assert.equal(
  declinedStatus.description,
  commitPaymentContent.MAP_COMMIT_PAYMENT_COPY.STATUS_PAYMENT_DECLINED_DESCRIPTION,
);
for (const [label, copy] of [
  ["status description", declinedStatus.description],
  [
    "inline/toast message",
    commitPaymentContent.MAP_COMMIT_PAYMENT_COPY.PAYMENT_DECLINED_MESSAGE,
  ],
]) {
  assert.doesNotMatch(
    copy,
    /another card|switch payment method|choose another|or cash/i,
    `the declined ${label} must not offer a method switch this sheet renders no control for`,
  );
}
assert.doesNotMatch(
  controller,
  /Choose another card or cash/,
  "declined copy must not be inlined in the controller",
);

// Why the resume is not built client-side: complete_card_payment marks the
// payments row completed unconditionally, then skips the request advance while
// status is 'payment_declined'. Charging again on the same request would capture
// the card and leave the request undispatched -- and waitForEmergencyPaymentSettlement
// would read payment_declined back and report the paid card as declined.
// Boundary pin: `NOT IN ('completed', 'cancelled', 'payment_declined')` appears
// twice in this migration, so a missing boundary (indexOf -> -1) would slice a
// superset and let the assert below pass off the OTHER occurrence -- a gate that
// still reports green while guarding nothing. Fail loudly instead.
const completeCardPaymentStart = emergencyLogic.indexOf(
  "CREATE OR REPLACE FUNCTION public.complete_card_payment",
);
const completeCardPaymentEnd = emergencyLogic.indexOf(
  "CREATE OR REPLACE FUNCTION public.fail_card_payment",
);
assert.ok(
  completeCardPaymentStart >= 0 &&
    completeCardPaymentEnd > completeCardPaymentStart,
  "complete_card_payment/fail_card_payment slice boundaries moved; re-anchor this pin before trusting it",
);
const completeCardPayment = emergencyLogic.slice(
  completeCardPaymentStart,
  completeCardPaymentEnd,
);
assert.match(
  completeCardPayment,
  /NOT IN \('completed', 'cancelled', 'payment_declined'\)/,
  "complete_card_payment skips a declined request; any in-sheet retry on that same request captures the card without dispatching",
);
// The one sanctioned resume clears the declined state before a new charge.
// Pinned so a future E11 implementation is built on this receiver, not on a
// bare re-charge of the declined request.
const financeMigration = read("supabase/migrations/20260219000400_finance.sql");
assert.match(
  financeMigration,
  /CREATE OR REPLACE FUNCTION public\.retry_payment_with_different_method[\s\S]*?SET status = 'pending_approval',\s*\n\s*payment_status = 'pending',/,
  "retry_payment_with_different_method must clear payment_declined before a retry charge",
);

// --- E1 source pins: the top-up screen reports server truth ----------------
const paymentScreenModel = read("hooks/payment/usePaymentScreenModel.js");
assert.match(
  paymentScreenModel,
  /paymentService\.processWalletTopUp\(/,
  "the top-up screen must go through the charge-gated lane, not the bare intent creator",
);
assert.doesNotMatch(
  paymentScreenModel,
  /result\.newBalance/,
  "topUpWallet never returned a balance; reading result.newBalance printed undefined as the user's money",
);

// OTA2 convention debt: the top-up settling copy was the last string in this
// model inlined at its call site while every sibling resolves from the content
// module. Relocation only -- the branch stays dead behind the top-up gate.
const paymentScreenContent = loadSourceModule(
  "components/payment/paymentScreen.content.js",
);
assert.equal(
  paymentScreenContent.PAYMENT_SCREEN_COPY.addFunds.processing,
  "Top-up Processing",
);
assert.match(
  paymentScreenContent.PAYMENT_SCREEN_COPY.addFunds.processingMessage,
  /still settling/,
);
assert.doesNotMatch(
  paymentScreenModel,
  /"Top-up Processing"/,
  "top-up copy must resolve from paymentScreen.content.js, not an inline literal",
);

// STAGED-LANE PIN: this call is unreachable while
// WALLET_TOP_UP_CREDIT_RECEIVER_AVAILABLE is false (the guard rejects first).
// It is pinned so the confirmation implementation survives refactors until the
// server-side wallet-credit receiver ships and the gate flips true.
assert.match(
  paymentService,
  /confirmSavedCardPayment\(intent\.clientSecret/,
  "the staged card-confirmation lane must keep confirming the intent it created",
);

// --- E22 source pin: the fail-open cash path is gone -----------------------
assert.doesNotMatch(
  paymentService,
  /Cannot resolve org for cash check, allowing/,
  "an unresolvable org must never fall through to allowing cash",
);

const paymentContractChecks = (async () => {
  // --- E2: processVisitTip survives being called detached -----------------
  // components/map/views/tracking/mapTracking.rating.js:447 injects
  // `processTip = paymentService.processVisitTip` as a default parameter and
  // calls it at :484, which severs `this`. A `this.resolveVisitUuid` hop there
  // throws before the RPC, so every tip on a rated trip was silently lost.
  const tipVisitUuid = "11111111-1111-4111-8111-111111111111";
  const tipStub = createPaymentSupabaseStub({
    tables: { visits: () => ({ data: { id: tipVisitUuid }, error: null }) },
    rpc: { process_visit_tip: { data: { success: true }, error: null } },
  });
  const tipService = loadPaymentService(tipStub);
  const detachedProcessTip = tipService.processVisitTip;
  await detachedProcessTip(tipVisitUuid, 5, "USD");
  assert.deepEqual(
    tipStub.rpcCalls.map((call) => call.name),
    ["process_visit_tip"],
    "a detached processVisitTip must still reach the tip RPC",
  );
  assert.deepEqual(tipStub.rpcCalls[0].params, {
    p_visit_id: tipVisitUuid,
    p_tip_amount: 5,
    p_currency: "USD",
  });

  const cashTipStub = createPaymentSupabaseStub({
    tables: { visits: () => ({ data: { id: tipVisitUuid }, error: null }) },
    rpc: { record_visit_cash_tip: { data: { success: true }, error: null } },
  });
  const detachedRecordCashTip = loadPaymentService(cashTipStub).recordVisitCashTip;
  await detachedRecordCashTip(tipVisitUuid, 5, "USD");
  assert.deepEqual(
    cashTipStub.rpcCalls.map((call) => call.name),
    ["record_visit_cash_tip"],
    "the detached cash-tip fallback must survive the same severed this",
  );

  // --- E13: the new default card unsets the old one before inserting -------
  const addCardStub = createPaymentSupabaseStub({
    tables: {
      "payment_methods.update": { data: null, error: null },
      "payment_methods.insert": { data: { id: "pm-row-1" }, error: null },
    },
  });
  const addCardService = loadPaymentService(addCardStub);
  await addCardService.addPaymentMethod({
    id: "pm_live_1",
    last4: "4242",
    brand: "visa",
    expiry_month: 12,
    expiry_year: 2030,
    metadata: {},
  });
  assert.deepEqual(
    addCardStub.operations,
    ["payment_methods.update", "payment_methods.insert"],
    "the existing defaults must be unset before the new default card is inserted, or two rows claim is_default and checkout picks by row order",
  );

  // --- E22: patient cash preflight uses the generic server receiver --------
  const cashStub = createPaymentSupabaseStub({
    rpc: {
      check_patient_cash_eligibility: {
        data: null,
        error: { code: "PGRST202", message: "receiver unavailable" },
      },
    },
  });
  const cashService = loadPaymentService(cashStub);
  assert.equal(
    await cashService.checkCashEligibility({
      hospitalId: "22222222-2222-4222-8222-222222222222",
      serviceType: "ambulance",
      ambulanceType: "ambulance_advanced",
      distanceKm: 8,
    }),
    false,
    "cash must fail closed when the patient-safe receiver is unavailable",
  );
  assert.deepEqual(cashStub.rpcCalls[0], {
    name: "check_patient_cash_eligibility",
    params: {
      p_service_type: "ambulance",
      p_hospital_id: "22222222-2222-4222-8222-222222222222",
      p_ambulance_type: "ambulance_advanced",
      p_distance_km: 8,
    },
  });
  assert.equal(
    cashStub.operations.some((operation) =>
      operation.startsWith("organization_wallets"),
    ),
    false,
    "patient cash preflight must not read organization_wallets directly",
  );

  // --- E1: NO MONEY MOVES while the wallet-credit receiver is missing ------
  // The most important pin in this block. Nothing server-side credits
  // patient_wallets for an is_top_up payment, so confirming the intent would
  // take real money and credit nothing, with no refund path. The gate at
  // services/paymentService.js WALLET_TOP_UP_CREDIT_RECEIVER_AVAILABLE must
  // reject before any intent exists.
  const topUpStub = createPaymentSupabaseStub({
    tables: {
      patient_wallets: { data: { balance: 50, currency: "USD" }, error: null },
    },
    invoke: {
      "create-payment-intent": {
        data: { clientSecret: "cs_test_1", paymentIntentId: "pi_test_1" },
        error: null,
      },
    },
  });
  const topUpConfirmCalls = [];
  const topUpService = loadPaymentService(topUpStub, topUpConfirmCalls);
  await assert.rejects(
    () => topUpService.processWalletTopUp(25, { id: "pm_live_1" }),
    /temporarily unavailable/,
    "wallet top-up must fail closed while no server-side credit receiver exists",
  );
  assert.deepEqual(
    topUpConfirmCalls,
    [],
    "a blocked top-up must never confirm a card: confirming charges the patient and credits nothing",
  );
  assert.deepEqual(
    topUpStub.operations.filter((operation) =>
      operation.includes("create-payment-intent"),
    ),
    [],
    "a blocked top-up must not even create a payment intent",
  );

  // --- E1: a settlement timeout reports server truth, never a guess --------
  // Baseline 50 with the server reporting 12.5: the timeout must surface the
  // last balance the server actually returned, not the optimistic baseline.
  const settlementStub = createPaymentSupabaseStub({
    tables: {
      patient_wallets: { data: { balance: 12.5, currency: "USD" }, error: null },
    },
  });
  const settlementService = loadPaymentService(settlementStub);
  assert.deepEqual(
    await settlementService.waitForWalletTopUpCredit(50, {
      timeoutMs: 30,
      pollIntervalMs: 5,
    }),
    { credited: false, balance: 12.5, currency: "USD" },
    "a top-up settlement timeout must report credited:false with the last server-truth balance",
  );

  const creditedStub = createPaymentSupabaseStub({
    tables: {
      patient_wallets: { data: { balance: 75, currency: "USD" }, error: null },
    },
  });
  const creditedService = loadPaymentService(creditedStub);
  assert.deepEqual(
    await creditedService.waitForWalletTopUpCredit(50, {
      timeoutMs: 200,
      pollIntervalMs: 5,
    }),
    { credited: true, balance: 75, currency: "USD" },
    "a landed credit must be reported as credited (guards the timeout pin against vacuity)",
  );
})();

// PASS must never print ahead of the async pins: an awaited failure has to red
// the run, not race a success line onto stdout.
paymentContractChecks.then(() => {
  console.log("PASS emergency payment and patient lifecycle contract");
});
