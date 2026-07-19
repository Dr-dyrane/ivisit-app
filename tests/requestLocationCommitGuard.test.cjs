const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = "hooks/emergency/useRequestFlow.js";
const source = fs.readFileSync(path.join(ROOT, SOURCE_FILE), "utf8");

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

let storedLocation = null;
let getCurrentPositionAsync = async () => {
  throw new Error("Location unavailable");
};

const { useRequestFlow } = loadSourceModule(SOURCE_FILE, {
  react: {
    useCallback: (callback) => callback,
    useEffect: () => undefined,
    useMemo: (factory) => factory(),
    useRef: (value) => ({ current: value }),
  },
  "expo-location": {
    getCurrentPositionAsync: (...args) => getCurrentPositionAsync(...args),
  },
  "../../services/emergencyRequestsService": {
    ACTIVE_EMERGENCY_REQUEST_ERROR_CODE: "P0001",
    ACTIVE_EMERGENCY_REQUEST_STATUSES: ["pending", "in_progress"],
    EmergencyRequestStatus: { IN_PROGRESS: "in_progress" },
    emergencyRequestsService: {},
  },
  "../../services/dispatchService": {
    DispatchService: {
      calculateDistance: () => 1,
      selectBestHospital: () => null,
    },
  },
  "../../services/serviceCostService": {
    serviceCostService: { calculateEmergencyCost: async () => null },
  },
  "../../services/triageService": { triageService: {} },
  "../../services/demoEcosystemService": {
    demoEcosystemService: { shouldSimulatePayments: () => false },
  },
  "../../constants/locationDefaults": {
    toPointWkt: ({ latitude, longitude }) => `POINT(${longitude} ${latitude})`,
  },
  "../../stores/locationStore": {
    useLocationStore: { getState: () => ({ userLocation: storedLocation }) },
  },
  "../../stores/emergencyContactsStore": {
    useEmergencyContactsStore: { getState: () => ({}) },
  },
  "../../stores/emergencyContactsSelectors": {
    selectReachableEmergencyContacts: () => [],
  },
  "../../utils/ambulanceType": {
    resolveAmbulanceDispatchType: () => "BLS",
  },
});

function makeRequest(overrides = {}) {
  return {
    requestId: "AMB-location-guard",
    serviceType: "ambulance",
    hospitalId: "hospital-1",
    paymentMethod: { id: "wallet_internal", is_wallet: true },
    pricingSnapshot: { totalCost: 120 },
    ...overrides,
  };
}

function makeFlow(createRequest) {
  return useRequestFlow({
    createRequest,
    hospitals: [{ id: "hospital-1", name: "Hospital One" }],
    activeAmbulanceTrip: null,
    activeBedBooking: null,
    pendingApproval: null,
  });
}

async function run() {
  const payloads = [];
  storedLocation = { latitude: 51.5072, longitude: -0.1276 };
  getCurrentPositionAsync = async () => {
    throw new Error("GPS should not run for a confirmed pickup");
  };
  const manualResult = await makeFlow(async (payload) => {
    payloads.push(payload);
    return { id: "request-manual", requestId: payload.requestId };
  }).handleRequestInitiated(
    makeRequest({ patientLocation: { latitude: 0, longitude: 0 } }),
  );
  assert.equal(manualResult.ok, true);
  assert.equal(payloads.length, 1);
  assert.equal(
    payloads[0].patientLocation,
    "POINT(0 0)",
    "a confirmed/manual equator-and-prime-meridian pickup remains valid",
  );

  const storedPayloads = [];
  storedLocation = { latitude: 61.2181, longitude: -149.9003 };
  getCurrentPositionAsync = async () => {
    throw new Error("GPS unavailable");
  };
  const storedResult = await makeFlow(async (payload) => {
    storedPayloads.push(payload);
    return { id: "request-stored", requestId: payload.requestId };
  }).handleRequestInitiated(makeRequest());
  assert.equal(storedResult.ok, true);
  assert.equal(storedPayloads.length, 1);
  assert.equal(
    storedPayloads[0].patientLocation,
    "POINT(-149.9003 61.2181)",
    "a finite stored pickup may recover an unavailable device location",
  );

  let blockedReceiverCalls = 0;
  storedLocation = { latitude: "not-a-number", longitude: 5 };
  getCurrentPositionAsync = async () => {
    throw new Error("GPS unavailable");
  };
  const blockedFlow = makeFlow(async () => {
    blockedReceiverCalls += 1;
    return { id: "must-not-create" };
  });
  const blockedResult = await blockedFlow.handleRequestInitiated(makeRequest());
  assert.deepEqual(blockedResult, {
    ok: false,
    reason: "MISSING_LOCATION",
    serviceType: "ambulance",
    recoverable: true,
    locationAction: "manual_entry",
  });
  assert.equal(
    blockedReceiverCalls,
    0,
    "missing or invalid pickup must block before the backend request receiver",
  );

  storedLocation = null;
  getCurrentPositionAsync = async () => ({
    coords: { latitude: null, longitude: null },
  });
  const malformedDeviceResult = await makeFlow(async () => {
    blockedReceiverCalls += 1;
    return { id: "must-not-create-from-null-coordinates" };
  }).handleRequestInitiated(makeRequest());
  assert.equal(malformedDeviceResult.reason, "MISSING_LOCATION");
  assert.equal(
    blockedReceiverCalls,
    0,
    "null device coordinates must not be coerced into a real 0,0 pickup",
  );

  getCurrentPositionAsync = async () => ({
    coords: { latitude: 91, longitude: 0 },
  });
  const outOfRangeDeviceResult = await makeFlow(async () => {
    blockedReceiverCalls += 1;
    return { id: "must-not-create-from-out-of-range-coordinates" };
  }).handleRequestInitiated(makeRequest());
  assert.equal(outOfRangeDeviceResult.reason, "MISSING_LOCATION");
  assert.equal(
    blockedReceiverCalls,
    0,
    "out-of-range device coordinates must be rejected before request creation",
  );

  const retryResult = await blockedFlow.handleRequestInitiated(makeRequest());
  assert.equal(
    retryResult.reason,
    "MISSING_LOCATION",
    "a blocked location attempt must release the in-flight guard for recovery",
  );
  assert.equal(blockedReceiverCalls, 0);

  assert.doesNotMatch(
    source,
    /DEFAULT_APP_COORDINATES/,
    "request commits must not retain a default coordinate fallback",
  );
}

run()
  .then(() => {
    console.log("request location commit guard: pass");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
