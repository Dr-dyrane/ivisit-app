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

assert.equal(releaseFlags.readPromotedReleaseFlag(undefined), true);
assert.equal(releaseFlags.readPromotedReleaseFlag("false"), false);
assert.equal(releaseFlags.readPromotedReleaseFlag("invalid"), false);
assert.equal(releaseFlags.readOptInReleaseFlag(undefined), false);
assert.equal(releaseFlags.readOptInReleaseFlag("true"), true);
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
assert.match(reschedule, /14 \* 24 \* 60 \* 60 \* 1000/);
assert.match(reschedule, /function AvailabilitySkeleton/);
assert.match(reschedule, /styles\.skeletonDays/);
assert.match(reschedule, /styles\.skeletonSlots/);
assert.match(reschedule, /action:\s*"reschedule"/);
assert.match(reschedule, /transitionVisit\(\{/);
assert.match(reschedule, /Haptics\.NotificationFeedbackType\.Success/);
assert.match(reschedule, /showToast\("Visit rescheduled", "success"\)/);
assert.match(
  reschedule,
  /error\?\.code === "slot_unavailable"[\s\S]*setSelectedSlot\(null\)[\s\S]*availabilityQuery\.refetch\(\)/,
);
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
assert.match(detailBody, /<MapVisitDetailSkeleton/);
assert.match(detailBody, /isLoading \|\| !theme \|\| !hero/);
assert.doesNotMatch(detailBody, /<VisitDetailSkeleton/);
assert.doesNotMatch(
  detailStyles,
  /borderWidth|borderColor/,
  "visit detail must use surface and elevation separation, not decorative strokes",
);

const specialtySearch = read(
  "components/visits/book-visit/SpecialtySearchModal.jsx",
);
assert.doesNotMatch(specialtySearch, /borderBottomWidth|borderBottomColor/);
assert.match(specialtySearch, /backgroundColor: colors\.inputBg/);
assert.match(specialtySearch, /listContent:[\s\S]*gap: 8/);

const detailModel = read(
  "components/map/surfaces/visitDetail/useMapVisitDetailModel.js",
);
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

console.log("PASS scheduled visits UI/service contract");
