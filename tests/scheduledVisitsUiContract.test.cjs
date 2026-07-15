const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");
const transformModules = require("@babel/plugin-transform-modules-commonjs");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const loadModule = (relativePath) => {
  const filename = path.join(root, relativePath);
  const transformed = babel.transformFileSync(filename, {
    babelrc: false,
    configFile: false,
    plugins: [transformModules],
  });
  const loaded = { exports: {} };
  const evaluate = new Function("require", "module", "exports", transformed.code);
  evaluate(require, loaded, loaded.exports);
  return loaded.exports;
};

const projection = loadModule("utils/scheduledVisitProjection.js");
const identity = loadModule("utils/visitHistoryIdentity.js");
const releaseFlags = loadModule("utils/releaseFlag.js");
const cancellation = loadModule("utils/scheduledVisitCancellation.js");
const scheduledVisitPresentation = loadModule(
  "components/map/surfaces/visitDetail/scheduledVisit.presentation.js",
);

assert.equal(releaseFlags.readPromotedReleaseFlag(undefined), true);
assert.equal(releaseFlags.readPromotedReleaseFlag("false"), false);
assert.equal(releaseFlags.readPromotedReleaseFlag("invalid"), false);
assert.equal(releaseFlags.readOptInReleaseFlag(undefined), false);
assert.equal(releaseFlags.readOptInReleaseFlag("true"), true);
assert.equal(cancellation.shouldUseAppOwnedCancellationConfirmation("web"), true);
assert.equal(cancellation.shouldUseAppOwnedCancellationConfirmation("ios"), false);
assert.equal(cancellation.shouldUseAppOwnedCancellationConfirmation("android"), false);
const scheduled = {
  id: "10000000-0000-4000-8000-000000000001",
  request_id: null,
  care_mode: "in_person",
  scheduled_start_at: "2026-08-01T17:00:00.000Z",
};
assert.equal(projection.isScheduledVisitRow(scheduled), true);
assert.equal(projection.classifyVisitSource(scheduled), "scheduled_visit");
assert.equal(
  projection.classifyVisitSource({
    ...scheduled,
    request_id: "20000000-0000-4000-8000-000000000002",
  }),
  "emergency",
);
assert.equal(projection.classifyVisitSource({ care_mode: "in_person" }), "legacy_visit");

const slot = {
  hospitalId: "30000000-0000-4000-8000-000000000003",
  specialty: "Cardiology",
  careMode: "in_person",
  scheduledStartAt: "2026-08-02T17:00:00.000Z",
  scheduledEndAt: "2026-08-02T17:30:00.000Z",
  scheduledTimezone: "America/Los_Angeles",
};
const grouped = projection.groupAvailabilitySlots([slot, { ...slot }]);
assert.equal(grouped.length, 1);
assert.equal(grouped[0].slots.length, 1, "doctor-level duplicates must remain hidden");

const intent = {
  hospitalId: slot.hospitalId,
  specialty: slot.specialty,
  careMode: slot.careMode,
  scheduledStartAt: slot.scheduledStartAt,
  notes: "Bring prior results",
};
assert.equal(
  projection.buildBookingIntentFingerprint(intent),
  projection.buildBookingIntentFingerprint({ ...intent }),
);
assert.notEqual(
  projection.buildBookingIntentFingerprint(intent),
  projection.buildBookingIntentFingerprint({
    ...intent,
    scheduledStartAt: "2026-08-03T17:00:00.000Z",
  }),
);

assert.deepEqual(
  identity.resolveVisitActorIdentity({
    sourceKind: "scheduled_visit",
    requestType: "visit",
    doctorName: "Dr. Ada",
    responderName: "Driver Sam",
  }),
  {
    actorName: "Dr. Ada",
    actorRole: "Doctor",
    doctorName: "Dr. Ada",
    responderName: "Driver Sam",
  },
);
assert.deepEqual(
  identity.resolveVisitActorIdentity({
    sourceKind: "emergency",
    requestType: "ambulance",
    doctorName: "Dr. Ada",
    responderName: "Driver Sam",
  }),
  {
    actorName: "Driver Sam",
    actorRole: "Responder",
    doctorName: "Dr. Ada",
    responderName: "Driver Sam",
  },
);
assert.equal(
  identity.resolveVisitActorIdentity({
    sourceKind: "emergency",
    requestType: "ambulance",
    doctorName: "Dr. Ada",
  }).actorRole,
  "Doctor",
);

const scheduledHistoryItem = {
  sourceKind: "scheduled_visit",
  status: "confirmed",
  lifecycleState: "scheduled",
  careMode: "telemedicine_async",
};
const scheduledLifecycle =
  scheduledVisitPresentation.buildScheduledVisitLifecycle(scheduledHistoryItem);
assert.equal(scheduledLifecycle.statusLabel, "Scheduled");
assert.equal(scheduledLifecycle.careLabel, "Consult");
assert.equal(scheduledLifecycle.nextLabel, "Next: open your consult");
assert.deepEqual(
  scheduledLifecycle.steps.map((step) => step.state),
  ["current", "upcoming", "upcoming"],
);

const rescheduledLifecycle =
  scheduledVisitPresentation.buildScheduledVisitLifecycle({
    ...scheduledHistoryItem,
    lifecycleState: "rescheduled",
  });
assert.equal(rescheduledLifecycle.statusLabel, "Rescheduled");

const activeLifecycle = scheduledVisitPresentation.buildScheduledVisitLifecycle({
  ...scheduledHistoryItem,
  status: "active",
  lifecycleState: "in_progress",
});
assert.equal(activeLifecycle.statusLabel, "In progress");
assert.equal(activeLifecycle.progressValue, 0.5);

const completedLifecycle =
  scheduledVisitPresentation.buildScheduledVisitLifecycle({
    ...scheduledHistoryItem,
    status: "completed",
    lifecycleState: "completed",
  });
assert.equal(completedLifecycle.isTerminal, true);
assert.deepEqual(
  completedLifecycle.steps.map((step) => step.state),
  ["complete", "complete", "complete"],
);

const missedLifecycle = scheduledVisitPresentation.buildScheduledVisitLifecycle({
  ...scheduledHistoryItem,
  status: "cancelled",
  lifecycleState: "no_show",
});
assert.equal(missedLifecycle.statusLabel, "Missed");
assert.equal(missedLifecycle.statusTone, "warning");

const noop = () => {};
const asyncUpcomingActions =
  scheduledVisitPresentation.buildScheduledVisitPlaceActions({
    historyItem: scheduledHistoryItem,
    lifecycle: scheduledLifecycle,
    canOpenConsult: true,
    canCall: true,
    canReschedule: true,
    canDirections: true,
    canBookAgain: false,
    onOpenConsult: noop,
    onCallClinic: noop,
    onReschedule: noop,
    onGetDirections: noop,
    onBookAgain: noop,
  });
assert.deepEqual(
  asyncUpcomingActions.map((action) => action.key),
  ["consult", "call", "reschedule"],
);
assert.equal(asyncUpcomingActions[0].primary, true);

const terminalActions = scheduledVisitPresentation.buildScheduledVisitPlaceActions({
  historyItem: scheduledHistoryItem,
  lifecycle: completedLifecycle,
  canOpenConsult: true,
  canCall: false,
  canReschedule: false,
  canDirections: true,
  canBookAgain: true,
  onOpenConsult: noop,
  onCallClinic: noop,
  onReschedule: noop,
  onGetDirections: noop,
  onBookAgain: noop,
});
assert.deepEqual(
  terminalActions.map((action) => action.key),
  ["bookAgain", "consult"],
);
assert.equal(terminalActions[1].label, "View consult");

const service = read("services/scheduledVisitsService.js");
for (const rpcName of [
  "get_book_visit_availability",
  "book_scheduled_visit",
  "transition_scheduled_visit",
]) {
  assert.ok(service.includes(`supabase.rpc("${rpcName}"`), `${rpcName} must remain canonical`);
}
assert.doesNotMatch(service, /\.from\(["']visits["']\)/);

const reschedule = read("components/map/visits/ScheduledVisitRescheduleModal.jsx");
assert.match(reschedule, /historyItem\?\.sourceKind === "scheduled_visit"/);
assert.match(reschedule, /useBookVisitAvailabilityQuery\(/);
assert.match(reschedule, /timezoneConfirmedAt/);
assert.match(reschedule, /AVAILABILITY_WINDOW_DAYS\s*=\s*14/);
assert.match(reschedule, /setAvailabilityWindowOffsetDays/);
assert.match(reschedule, /primaryActionLabel="Check later dates"/);
assert.match(reschedule, /secondaryActionLabel="Earlier dates"/);
assert.match(reschedule, />Later dates<\/Text>/);
assert.match(reschedule, /function AvailabilitySkeleton/);
assert.match(reschedule, /styles\.skeletonDays/);
assert.match(reschedule, /styles\.skeletonSlots/);
assert.match(reschedule, /action:\s*"reschedule"/);
assert.match(reschedule, /transitionVisit\(\{/);
assert.match(reschedule, /Haptics\.NotificationFeedbackType\.Success/);
assert.match(reschedule, /showToast\("Visit rescheduled", "success"\)/);
assert.match(
  reschedule,
  /error\?\.code === "slot_unavailable"[\s\S]*setConflictRecoveryNotice[\s\S]*availabilityQuery\.refetch\(\)/,
);
assert.match(reschedule, /<ScheduledVisitRecoveryNotice/);
assert.match(reschedule, />Current time</);
assert.match(reschedule, /!== currentStartAt/);
assert.doesNotMatch(reschedule, /#CBD5E1|colors\.border/);
assert.match(reschedule, /borderTopColor: colors\.hairline/);
assert.doesNotMatch(reschedule, /timezone\s*!==?\s*["']UTC["']/i);
assert.doesNotMatch(reschedule, /emergencyRequestsService|updateVisit\(/);

const orchestrator = read("components/map/MapModalOrchestrator.jsx");
assert.match(orchestrator, /import ScheduledVisitRescheduleModal/);
assert.match(orchestrator, /<ScheduledVisitRescheduleModal/);
assert.match(orchestrator, /historyItem=\{rescheduleVisit\}/);
assert.match(orchestrator, /<ScheduledVisitCancelConfirmation/);
assert.match(orchestrator, /visible=\{Boolean\(cancelConfirmationVisit\)\}/);

const cancelConfirmation = read(
  "components/map/visits/ScheduledVisitCancelConfirmation.jsx",
);
assert.match(cancelConfirmation, /<GlassConfirmDialog/);
assert.match(cancelConfirmation, /isDestructive/);
assert.match(cancelConfirmation, /SCHEDULED_VISIT_CANCELLATION_COPY/);

const availabilityHook = read("hooks/visits/useBookVisitAvailabilityQuery.js");
const availabilityKeys = read("hooks/visits/scheduledVisits.queryKeys.js");
assert.doesNotMatch(availabilityHook, /placeholderData/);
assert.match(availabilityHook, /timezoneConfirmedAt/);
assert.match(availabilityKeys, /timezoneConfirmedAt \|\| "unconfirmed"/);

const scheduledMutations = read("hooks/visits/useScheduledVisitMutations.js");
assert.match(scheduledMutations, /normalizeVisit: visitsService\.fromDbRow/);
assert.match(
  scheduledMutations,
  /detailKey: visitsQueryKeys\.detail\(visit\?\.id, userId\)/s,
);
assert.match(
  scheduledMutations,
  /listKey: userId \? visitsQueryKeys\.list\(userId\) : null/,
);
assert.match(scheduledMutations, /primeScheduledTruth\(visit\)/);
assert.match(scheduledMutations, /invalidateScheduledTruth\(visit\?\.id \|\| null\)/);
assert.doesNotMatch(scheduledMutations, /return invalidateScheduledTruth/);

const detailBody = read(
  "components/map/surfaces/visitDetail/MapVisitDetailBody.jsx",
);
const detailStyles = read(
  "components/map/surfaces/visitDetail/mapVisitDetail.styles.js",
);
const lifecycleCard = read(
  "components/map/surfaces/visitDetail/MapScheduledVisitLifecycleCard.jsx",
);
assert.match(detailBody, /<MapVisitDetailSkeleton/);
assert.match(detailBody, /<MapScheduledVisitLifecycleCard/);
assert.match(detailBody, /scheduledLifecycle/);
assert.match(detailBody, /isLoading \|\| !theme \|\| !hero/);
assert.doesNotMatch(detailBody, /<VisitDetailSkeleton/);
assert.doesNotMatch(
  detailStyles,
  /borderWidth|borderColor/,
  "visit detail must use surface and elevation separation, not decorative strokes",
);
assert.match(
  detailStyles,
  /placeStatsCardScroll:[\s\S]*flexGrow:\s*1[\s\S]*paddingHorizontal:\s*10/,
  "scrollable visit stats must keep both overflow edges reachable",
);
assert.doesNotMatch(
  detailStyles,
  /placeStatsCardScroll:[\s\S]*?width:\s*["']100%["']/,
  "a viewport-width stats container clips centered overflow",
);
assert.doesNotMatch(lifecycleCard, /borderWidth|borderColor/);

const specialtySearch = read(
  "components/visits/book-visit/SpecialtySearchModal.jsx",
);
assert.doesNotMatch(specialtySearch, /borderBottomWidth|borderBottomColor/);
assert.match(specialtySearch, /backgroundColor: colors\.inputBg/);
assert.match(specialtySearch, /listContent:[\s\S]*gap: 8/);

const dateTimeSelection = read(
  "components/visits/book-visit/DateTimeSelection.jsx",
);
assert.match(dateTimeSelection, /label="Change dates"/);
assert.doesNotMatch(dateTimeSelection, /label=\{error \? "Try again" : "Check again"\}/);
assert.match(dateTimeSelection, /<ScheduledVisitRecoveryNotice/);

const recoveryNotice = read(
  "components/visits/ScheduledVisitRecoveryNotice.jsx",
);
assert.match(recoveryNotice, /Platform\.OS === "web"/);
assert.match(recoveryNotice, /accessibilityLiveRegion=\{IS_WEB \? "assertive" : "none"\}/);
assert.match(recoveryNotice, /noticeRef\.current\?\.focus\?\.\(\)/);
assert.match(recoveryNotice, /AccessibilityInfo\.announceForAccessibility/);
assert.doesNotMatch(recoveryNotice, /setAccessibilityFocus|findNodeHandle/);

const bookVisitModel = read("hooks/visits/useBookVisitScreenModel.js");
assert.match(bookVisitModel, /setAvailabilityWindowOffsetDays\(\(current\) => current \+ 14\)/);
assert.match(bookVisitModel, /BOOK_VISIT_SCREEN_COPY\.messages\.slotChanged/);
assert.match(bookVisitModel, /updateDraftField\("slot", null\)/);

const detailModel = read(
  "components/map/surfaces/visitDetail/useMapVisitDetailModel.js",
);
assert.match(detailModel, /buildScheduledVisitLifecycle\(historyItem\)/);
assert.match(detailModel, /buildScheduledVisitPlaceActions\(\{/);
assert.match(detailModel, /historyItem\.sourceKind === "scheduled_visit"/);
assert.match(detailModel, /\? whenValue\s*:\s*etaLabel \|\| humanWhenLabel \|\| whenValue/);
assert.match(
  detailModel,
  /pickText\(\s*historyItem\?\.actorName,\s*readRawField\(raw, "responderName", "responder_name"\),\s*historyItem\?\.doctorName/s,
);

const selectors = read("hooks/visits/useVisitHistorySelectors.js");
assert.match(
  selectors,
  /patientScheduleChangesOpen\s*=\s*sourceKind\s*===\s*"scheduled_visit"\s*&&\s*status\s*===\s*"confirmed"/,
);
assert.match(selectors, /canReschedule:\s*patientScheduleChangesOpen/);
assert.match(
  selectors,
  /sourceKind === "scheduled_visit"\s*&&\s*\(status === "completed" \|\| status === "cancelled"\)/,
);
assert.match(
  selectors,
  /canResume:\s*sourceKind === "emergency"\s*&&/,
);

const realtime = read("hooks/visits/useVisitsRealtime.js");
assert.match(realtime, /payload\?\.new\?\.id \|\| payload\?\.old\?\.id/);
assert.match(realtime, /visitsQueryKeys\.detail\(visitId, userId\)/);

const historyFlow = read("hooks/map/history/useMapHistoryFlow.js");
assert.match(historyFlow, /hasCanonicalListRow \? visits :/);
assert.match(historyFlow, /if \(!visit\?\.id \|\| isTransitioning\) return/);
assert.match(historyFlow, /asyncConsultVisit: resolvedAsyncConsultVisit/);
const webCancellationBranch = historyFlow.indexOf(
  "shouldUseAppOwnedCancellationConfirmation(Platform.OS)",
);
const nativeCancellationAlert = historyFlow.indexOf(
  "Alert.alert(",
  webCancellationBranch,
);
assert.ok(webCancellationBranch >= 0, "web cancellation must use app-owned confirmation");
assert.ok(
  nativeCancellationAlert > webCancellationBranch,
  "native Alert confirmation must remain after the web-owned branch",
);
assert.match(historyFlow, /setCancelConfirmationVisit\(visit\)/);
assert.match(historyFlow, /confirmCancelHistoryVisit/);
assert.match(historyFlow, /cancelRequestInFlightRef\.current/);

const sheetOrchestrator = read("components/map/core/MapSheetOrchestrator.jsx");
assert.match(sheetOrchestrator, /visitDetailHistoryItem \|\| sheetPayload\?\.historyItem/);
assert.match(sheetOrchestrator, /isTransitioning=\{isHistoryVisitTransitioning\}/);

const asyncConsultModal = read(
  "components/map/communication/AsyncConsultModal.jsx",
);
assert.match(asyncConsultModal, /historyItem\?\.lifecycleUpdatedAt \|\| "initial"/);
assert.match(asyncConsultModal, /ensureRoom\(\{ force: true \}\)/);

console.log("PASS scheduled visits UI/service contract");
