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

function createOrderedQuery(result) {
  return {
    select() { return this; },
    eq() { return this; },
    in() { return this; },
    order: async () => result,
  };
}

function createHarness({ user, requestResult }) {
  const reads = [];
  const writes = [];
  const database = {
    read: async (...args) => {
      reads.push(args);
      return [{ id: "stale-local-request" }];
    },
    write: async (...args) => {
      writes.push(args);
    },
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table) => {
      if (table === "emergency_requests") {
        return createOrderedQuery(requestResult);
      }
      if (table === "emergency_status_transitions") {
        return createOrderedQuery({ data: [], error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
  const { emergencyRequestsService } = loadSourceModule(
    "services/emergencyRequestsService.js",
    {
      "../database": {
        database,
        StorageKeys: { EMERGENCY_REQUESTS: "emergency_requests" },
      },
      "./supabase": { supabase },
      "./pricingService": {
        calculateEmergencyCost: async () => null,
        checkInsuranceCoverage: async () => null,
      },
      uuid: { v4: () => "test-uuid" },
      "./displayIdService": { isValidUUID: () => true },
    },
  );
  return { emergencyRequestsService, reads, writes };
}

async function run() {
  global.__DEV__ = false;

  const activeTripProjection = read("hooks/emergency/useActiveTripQuery.js");
  const emergencyActions = read("hooks/emergency/useEmergencyActions.js");
  assert.doesNotMatch(
    activeTripProjection,
    /ems_001/,
    "active-trip recovery must never fabricate an ambulance identity",
  );
  assert.match(
    activeTripProjection,
    /previousAmbulanceTrip\?\.assignedAmbulance\?\.id[\s\S]*?fullAmbulance\?\.id[\s\S]*?null/,
    "partial server projections may preserve a prior canonical ambulance id or remain null",
  );
  assert.match(
    emergencyActions,
    /ambulanceId: assignedAmbulance\?\.id \?\? trip\.ambulanceId \?\? null/,
    "trip persistence must keep a missing ambulance identity null",
  );
  assert.match(
    activeTripProjection,
    /hospitalName: activeAmbulance\.hospitalName \?\? null/,
    "active-trip recovery must preserve the request-owned hospital name across reloads",
  );
  assert.match(
    activeTripProjection,
    /requestHospital = await hospitalsService\.getById\(activeAmbulance\.hospitalId\)/,
    "active-trip recovery must hydrate the request-owned facility instead of using map selection",
  );

  const activeRequestModel = read("components/map/core/mapActiveRequestModel.js");
  assert.match(
    activeRequestModel,
    /requestOwnsHospital[\s\S]*?candidate\?\.id === hospitalId/,
    "active request rendering must reject unrelated cached hospital candidates",
  );

  const success = createHarness({
    user: { id: "user-1" },
    requestResult: {
      data: [{
        id: "request-1",
        display_id: "REQ-ONE",
        user_id: "user-1",
        service_type: "ambulance",
        status: "accepted",
      }],
      error: null,
    },
  });
  const rows = await success.emergencyRequestsService.list();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "request-1");
  assert.equal(success.reads.length, 0, "canonical reads must not consult local cache");
  assert.equal(success.writes.length, 1, "successful canonical rows may refresh cache");

  const readError = new Error("network unavailable");
  readError.code = "NETWORK_ERROR";
  const failed = createHarness({
    user: { id: "user-1" },
    requestResult: { data: null, error: readError },
  });
  await assert.rejects(
    () => failed.emergencyRequestsService.list(),
    (error) => error === readError,
  );
  assert.equal(failed.reads.length, 0, "a failed server read must not become cached truth");
  assert.equal(failed.writes.length, 0);

  const signedOut = createHarness({
    user: null,
    requestResult: { data: [], error: null },
  });
  await assert.rejects(
    () => signedOut.emergencyRequestsService.list(),
    (error) => error?.code === "AUTH_REQUIRED",
  );
  assert.equal(signedOut.reads.length, 0, "signed-out reads must not expose prior-user cache");

  console.log("PASS emergency active-trip read authority");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
