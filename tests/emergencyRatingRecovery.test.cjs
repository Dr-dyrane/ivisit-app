const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("@babel/core");
const transformModulesCommonJs = require("@babel/plugin-transform-modules-commonjs");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(
  ROOT,
  "components",
  "map",
  "views",
  "tracking",
  "mapTracking.rating.js",
);

const LIFECYCLE = Object.freeze({
  COMPLETED: "completed",
  POST_COMPLETION: "post_completion",
  RATING_PENDING: "rating_pending",
  RATED: "rated",
  CLEARED: "cleared",
  CANCELLED: "cancelled",
});

const classifyVisitSource = (visit) => {
  const requestId = visit?.requestId ?? visit?.request_id;
  return requestId === null || requestId === undefined || String(requestId).trim() === ""
    ? "legacy_visit"
    : "emergency";
};

const loadRatingModule = ({ claims = {} } = {}) => {
  let storedClaims = { ...claims };
  const writes = [];
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  const transformed = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: SOURCE_PATH,
    plugins: [transformModulesCommonJs],
  });
  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === "../../../../constants/visits") {
      return { EMERGENCY_VISIT_LIFECYCLE: LIFECYCLE };
    }
    if (request === "../../../../database") {
      return {
        StorageKeys: { TRACKING_RATING_RECOVERY: "tracking-rating-recovery" },
        database: {
          read: async () => ({ ...storedClaims }),
          write: async (_key, value) => {
            storedClaims = { ...value };
            writes.push({ ...value });
          },
        },
      };
    }
    if (request === "../../../../services/paymentService") {
      return { paymentService: { processVisitTip: async () => null } };
    }
    if (request === "../../../../services/visitsService") {
      return { visitsService: { updateRating: async () => ({ alreadyRated: false }) } };
    }
    if (request === "../../../../utils/scheduledVisitProjection") {
      return { classifyVisitSource };
    }
    throw new Error(`Unexpected dependency: ${request}`);
  };

  vm.runInNewContext(transformed.code, {
    module,
    exports: module.exports,
    require: localRequire,
    console,
    Date,
    Number,
    Object,
    Set,
    String,
  }, { filename: SOURCE_PATH });

  return {
    api: module.exports,
    getStoredClaims: () => ({ ...storedClaims }),
    writes,
  };
};

const completedEmergency = (overrides = {}) => ({
  id: "visit-completed",
  requestId: "request-completed",
  type: "Ambulance Ride",
  lifecycleState: LIFECYCLE.COMPLETED,
  lifecycleUpdatedAt: "2026-07-14T12:00:00.000Z",
  rating: null,
  ratedAt: null,
  ...overrides,
});

async function run() {
  const { api } = loadRatingModule();

  const completed = completedEmergency();
  assert.equal(
    api.isTrackingRatingRecoveryEligible(completed),
    true,
    "canonical completed, unrated emergency visits must recover rating",
  );
  assert.equal(
    api.findPendingTrackingRatingVisit([completed])?.id,
    completed.id,
    "completed emergency visit must be selected without patient completion writes",
  );
  assert.equal(
    api.canPresentTrackingRatingWithActiveRequest(null, completed),
    true,
    "rating recovery is available when no request is active",
  );
  assert.equal(
    api.canPresentTrackingRatingWithActiveRequest(
      {
        hasActiveRequest: true,
        isTerminal: false,
        requestId: completed.requestId,
      },
      completed,
    ),
    false,
    "a nonterminal emergency must block rating recovery",
  );
  assert.equal(
    api.canPresentTrackingRatingWithActiveRequest(
      {
        hasActiveRequest: true,
        isTerminal: true,
        requestId: completed.requestId,
      },
      completed,
    ),
    false,
    "the mounted terminal request must wait for the explicit Complete Visit handoff",
  );
  assert.equal(
    api.canPresentTrackingRatingWithActiveRequest(
      {
        hasActiveRequest: true,
        isTerminal: true,
        requestId: "another-request",
      },
      completed,
    ),
    false,
    "a terminal request must not be cleared for an unrelated rating",
  );
  assert.equal(
    api.isTrackingRatingRecoveryEligible({
      ...completed,
      id: "status-derived-completion",
      lifecycleState: null,
      status: "completed",
    }),
    true,
    "canonical completed visit status must recover when lifecycle_state is absent",
  );
  assert.equal(
    api.isTrackingRatingRecoveryEligible({
      ...completed,
      id: "legacy-pending",
      lifecycleState: LIFECYCLE.RATING_PENDING,
    }),
    true,
    "legacy rating_pending recovery must remain supported",
  );

  const committedRatingState = api.buildTrackingRatingState({
    kind: "ambulance",
    visitId: completed.requestId,
    hospitalTitle: "Odyssey Hospice",
    providerName: "Demo Driver 3",
    completionCommitted: true,
  });
  assert.equal(
    api.shouldPresentTrackingRatingState(committedRatingState, [
      completedEmergency({ id: "older-visit", requestId: "older-request" }),
    ]),
    true,
    "a committed in-flow rating must survive a stale visits-query result",
  );
  assert.equal(
    api.shouldPresentTrackingRatingState(
      { ...committedRatingState, completionCommitted: false },
      [completedEmergency({ id: "older-visit", requestId: "older-request" })],
    ),
    false,
    "an uncommitted unmatched state must retain the cold-start phantom guard",
  );
  assert.equal(
    api.shouldPresentTrackingRatingState(committedRatingState, [
      completedEmergency({ lifecycleState: LIFECYCLE.RATING_PENDING }),
    ]),
    true,
    "request-id aliases must keep a matching pending rating visible",
  );
  assert.equal(
    api.shouldPresentTrackingRatingState(committedRatingState, [
      completedEmergency({
        lifecycleState: LIFECYCLE.RATED,
        rating: 5,
        ratedAt: "2026-07-14T12:05:00.000Z",
      }),
    ]),
    false,
    "rated server truth must close even a committed rating state",
  );
  assert.equal(
    api.isTrackingRatingRecoveryEligible({
      ...completed,
      id: "scheduled-completed",
      requestId: null,
      type: "Consultation",
    }),
    false,
    "completed scheduled or legacy visits must not enter emergency recovery",
  );

  for (const ratedVisit of [
    completedEmergency({ id: "rated-at", ratedAt: "2026-07-14T12:05:00.000Z" }),
    completedEmergency({ id: "rated-value", rating: 5 }),
    completedEmergency({ id: "rated-state", lifecycleState: LIFECYCLE.RATED }),
    completedEmergency({
      id: "stale-pending-rated",
      lifecycleState: LIFECYCLE.RATING_PENDING,
      rating: "4",
    }),
  ]) {
    assert.equal(
      api.isTrackingRatingRecoveryEligible(ratedVisit),
      false,
      `${ratedVisit.id} must be excluded from rating recovery`,
    );
    assert.equal(
      api.buildRecoveredTrackingRatingState(ratedVisit),
      null,
      `${ratedVisit.id} must not build a duplicate modal state`,
    );
  }

  assert.equal(
    api.findPendingTrackingRatingVisit([completed], {
      excludeVisitIds: [completed.requestId],
    }),
    null,
    "handled request aliases must suppress duplicate modal recovery",
  );
  assert.equal(
    api.findPendingTrackingRatingVisit([completed], {
      allowedVisitIds: ["another-visit"],
    }),
    null,
    "claim allowlists must continue to gate recovery candidates",
  );

  const reloadEligible = completedEmergency({ id: "reload-eligible" });
  const alreadyRated = completedEmergency({
    id: "reload-rated",
    lifecycleState: LIFECYCLE.RATED,
    ratedAt: "2026-07-14T12:05:00.000Z",
  });
  const skipped = completedEmergency({
    id: "reload-skipped",
    lifecycleState: LIFECYCLE.POST_COMPLETION,
  });
  const storageHarness = loadRatingModule({
    claims: {
      [reloadEligible.id]: { kind: "ambulance" },
      [alreadyRated.id]: { kind: "ambulance" },
      [skipped.id]: { kind: "ambulance" },
    },
  });
  const remainingClaims = await storageHarness.api.purgeStaleTrackingRatingClaims([
    reloadEligible,
    alreadyRated,
    skipped,
  ]);
  assert.deepEqual(
    Object.keys(remainingClaims),
    [reloadEligible.id],
    "reload cleanup must retain only the completed-unrated emergency claim",
  );
  assert.deepEqual(
    Object.keys(storageHarness.getStoredClaims()),
    [reloadEligible.id],
    "persisted recovery state must match the guarded reload result",
  );
  assert.equal(storageHarness.writes.length, 1, "stale claims should be purged in one write");

  console.log("emergencyRatingRecovery.test.cjs: all assertions passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
