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
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    loaded._compile(transformed.code, filename);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

const locationSync = loadSourceModule("hooks/emergency/useEmergencyLocationSync.js", {
  react: {},
  "../../contexts/GlobalLocationContext": { useGlobalLocation: () => ({}) },
  "../../constants/locationDefaults": {
    DEFAULT_APP_REGION: { latitudeDelta: 0.05, longitudeDelta: 0.05 },
  },
  "../../stores/locationStore": { useLocationStore: () => null },
});

const { resolveDeviceLocationStoreUpdate } = locationSync;

const deviceLocation = { latitude: 61.2181, longitude: -149.9003 };

assert.deepEqual(
  resolveDeviceLocationStoreUpdate({
    globalLocation: deviceLocation,
    globalLocationSource: "device",
    currentLocation: { latitude: 6.5244, longitude: 3.3792 },
    currentLocationSource: "device",
  }),
  { ...deviceLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 },
  "a fresh device fix must replace a stale device-owned persisted coordinate",
);

assert.equal(
  resolveDeviceLocationStoreUpdate({
    globalLocation: deviceLocation,
    globalLocationSource: "device",
    currentLocation: { latitude: 34.0522, longitude: -118.2437 },
    currentLocationSource: "manual",
  }),
  null,
  "GPS must never overwrite an explicit manual pickup",
);

assert.equal(
  resolveDeviceLocationStoreUpdate({
    globalLocation: { latitude: 61.21811, longitude: -149.9003 },
    globalLocationSource: "device",
    currentLocation: deviceLocation,
    currentLocationSource: "device",
  }),
  null,
  "equal or GPS-noise observations must be idempotent",
);

assert.deepEqual(
  resolveDeviceLocationStoreUpdate({
    globalLocation: { latitude: 0, longitude: 0 },
    globalLocationSource: "device",
    currentLocation: null,
    currentLocationSource: null,
  }),
  { latitude: 0, longitude: 0, latitudeDelta: 0.05, longitudeDelta: 0.05 },
  "finite equator/prime-meridian coordinates are valid device locations",
);

for (const invalidLocation of [
  { latitude: null, longitude: null },
  { latitude: "", longitude: "" },
  { latitude: 91, longitude: 0 },
  { latitude: 0, longitude: 181 },
]) {
  assert.equal(
    resolveDeviceLocationStoreUpdate({
      globalLocation: invalidLocation,
      globalLocationSource: "device",
      currentLocation: null,
      currentLocationSource: null,
    }),
    null,
    "malformed or out-of-range coordinates must not become a device fallback",
  );
}

assert.deepEqual(
  resolveDeviceLocationStoreUpdate({
    globalLocation: deviceLocation,
    globalLocationSource: "device",
    currentLocation: deviceLocation,
    currentLocationSource: "persisted",
  }),
  { ...deviceLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 },
  "a fresh matching device fix promotes a legacy persisted fallback to device ownership",
);

console.log("PASS emergency location sync");
