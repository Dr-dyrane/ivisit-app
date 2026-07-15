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

console.log("PASS emergency payment and patient lifecycle contract");
