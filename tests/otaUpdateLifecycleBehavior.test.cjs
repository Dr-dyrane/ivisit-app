const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

// The OTA paths under test are the production ones; __DEV__ short-circuits them.
global.__DEV__ = false;

// State/ref slots are read positionally; these mirror the declaration order in
// OTAUpdatesProvider.
const STATE_IS_CHECKING = 0;
const STATE_UPDATE_AVAILABLE = 1;
const STATE_SHOW_MODAL = 2;
const STATE_SHOW_SUCCESS_MODAL = 3;
const STATE_AVAILABLE_UPDATE = 4;

function mountProvider({ updatesModule }) {
  const source = read("contexts/OTAUpdatesContext.jsx");
  const filename = path.join(root, "contexts/OTAUpdatesContext.jsx");
  const transformed = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [require.resolve("babel-preset-expo")],
  });

  const states = [];
  const refs = [];
  const effects = [];
  const timers = [];
  let stateIndex = 0;
  let refIndex = 0;
  let appStateListener = null;
  let appStateEvent = null;
  let appStateRemoveCalls = 0;
  let contextValue = null;

  const fakeReact = {
    createContext: () => ({ Provider: "OTAUpdatesContext.Provider" }),
    useContext: () => null,
    useState(initial) {
      const slot = stateIndex++;
      if (states.length <= slot) {
        states[slot] = {
          value: typeof initial === "function" ? initial() : initial,
        };
      }
      const entry = states[slot];
      return [
        entry.value,
        (next) => {
          entry.value = typeof next === "function" ? next(entry.value) : next;
        },
      ];
    },
    useRef(initial) {
      const slot = refIndex++;
      if (refs.length <= slot) refs[slot] = { current: initial };
      return refs[slot];
    },
    useCallback: (fn) => fn,
    useEffect(fn, deps) {
      effects.push({ fn, deps });
    },
  };

  const localRequire = (request) => {
    if (request === "react") return { ...fakeReact, default: fakeReact };
    if (request === "react/jsx-runtime" || request === "react/jsx-dev-runtime") {
      const jsx = (type, props) => {
        if (props && Object.prototype.hasOwnProperty.call(props, "value")) {
          contextValue = props.value;
        }
        return { type, props };
      };
      return { jsx, jsxs: jsx, jsxDEV: jsx, Fragment: "Fragment" };
    }
    if (request === "react-native") {
      return {
        AppState: {
          addEventListener(event, listener) {
            appStateEvent = event;
            appStateListener = listener;
            return {
              remove() {
                appStateRemoveCalls += 1;
              },
            };
          },
        },
      };
    }
    if (request === "expo-updates") return updatesModule;
    if (request === "../database/db") {
      return {
        database: {
          readRaw: async () => null,
          writeRaw: async () => undefined,
          deleteRaw: async () => undefined,
        },
      };
    }
    return require(request);
  };

  // The provider's mount timer is irrelevant to the foreground contract. Capture
  // it instead of letting it schedule a real 2s check that would fire mid-test.
  const withCapturedTimers = (run) => {
    const realSetTimeout = global.setTimeout;
    const realClearTimeout = global.clearTimeout;
    global.setTimeout = (fn, ms) => {
      const handle = { fn, ms };
      timers.push(handle);
      return handle;
    };
    global.clearTimeout = () => {};
    try {
      return run();
    } finally {
      global.setTimeout = realSetTimeout;
      global.clearTimeout = realClearTimeout;
    }
  };

  withCapturedTimers(() => {
    const loadedModule = { exports: {} };
    const evaluate = new Function(
      "module",
      "exports",
      "require",
      transformed.code,
    );
    evaluate(loadedModule, loadedModule.exports, localRequire);
    loadedModule.exports.OTAUpdatesProvider({ children: null });
  });

  return {
    states,
    refs,
    timers,
    runEffects: () =>
      withCapturedTimers(() => effects.map((effect) => effect.fn())),
    getValue: () => contextValue,
    getAppStateListener: () => appStateListener,
    getAppStateEvent: () => appStateEvent,
    getAppStateRemoveCalls: () => appStateRemoveCalls,
  };
}

// `import * as Updates` is interop-copied at load time, so the mock's functions
// must stay stable and read their answers from this mutable state.
function makeUpdatesModule({ manifest = null, checkError = null } = {}) {
  const calls = { check: 0, fetch: 0 };
  const state = { manifest, checkError };
  return {
    state,
    calls,
    module: {
      checkForUpdateAsync: async () => {
        calls.check += 1;
        if (state.checkError) throw state.checkError;
        if (!state.manifest) return { isAvailable: false };
        return { isAvailable: true, manifest: state.manifest };
      },
      fetchUpdateAsync: async () => {
        calls.fetch += 1;
        return { isNew: true };
      },
      reloadAsync: async () => undefined,
      manifest: { id: "running-build-id", createdAt: "2026-01-01T00:00:00.000Z" },
    },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

async function proveForegroundRecheckAndThrottle() {
  const incoming = { id: "incoming-update-id", createdAt: "2026-07-16T10:00:00.000Z" };
  const updates = makeUpdatesModule({ manifest: incoming });
  const bridge = mountProvider({ updatesModule: updates.module });
  const cleanups = bridge.runEffects();

  assert.equal(
    bridge.getAppStateEvent(),
    "change",
    "provider must subscribe to AppState changes",
  );

  const realNow = Date.now;
  let clock = 1_000_000;
  Date.now = () => clock;

  try {
    // Background/inactive must never trigger a check.
    bridge.getAppStateListener()("background");
    bridge.getAppStateListener()("inactive");
    await flush();
    assert.equal(updates.calls.check, 0, "only 'active' may trigger a check");

    // First foreground checks and surfaces the incoming update.
    bridge.getAppStateListener()("active");
    await flush();
    assert.equal(updates.calls.check, 1, "foreground must re-check for updates");
    assert.equal(updates.calls.fetch, 1, "an available update must be fetched");
    assert.equal(
      bridge.states[STATE_SHOW_MODAL].value,
      true,
      "available update must surface the sheet",
    );
    assert.deepEqual(
      bridge.states[STATE_AVAILABLE_UPDATE].value,
      { id: incoming.id, createdAt: incoming.createdAt },
      "the INCOMING manifest must be exposed to the sheet",
    );
    assert.equal(bridge.states[STATE_UPDATE_AVAILABLE].value, true);
    assert.equal(
      bridge.states[STATE_IS_CHECKING].value,
      false,
      "isChecking must settle back to false",
    );

    // User dismisses; a foreground inside the throttle window must not re-check.
    bridge.states[STATE_SHOW_MODAL].value = false;
    clock += 60 * 1000;
    bridge.getAppStateListener()("active");
    await flush();
    assert.equal(
      updates.calls.check,
      1,
      "foreground inside the throttle window must not re-check",
    );

    // Past the throttle window it re-checks, but must not re-surface the same update.
    clock += 15 * 60 * 1000;
    bridge.getAppStateListener()("active");
    await flush();
    assert.equal(
      updates.calls.check,
      2,
      "foreground past the throttle window must re-check",
    );
    assert.equal(
      updates.calls.fetch,
      1,
      "an already-surfaced update must not be re-fetched",
    );
    assert.equal(
      bridge.states[STATE_SHOW_MODAL].value,
      false,
      "an already-surfaced update must not re-open the sheet",
    );

    // A genuinely new update id surfaces again.
    const next = { id: "second-update-id", createdAt: "2026-07-17T10:00:00.000Z" };
    updates.state.manifest = next;
    clock += 15 * 60 * 1000 + 1;
    bridge.getAppStateListener()("active");
    await flush();
    assert.equal(
      bridge.states[STATE_SHOW_MODAL].value,
      true,
      "a new update id must surface the sheet again",
    );
    assert.deepEqual(bridge.states[STATE_AVAILABLE_UPDATE].value, {
      id: next.id,
      createdAt: next.createdAt,
    });
  } finally {
    Date.now = realNow;
  }

  cleanups.forEach((cleanup) => {
    if (typeof cleanup === "function") cleanup();
  });
  assert.equal(
    bridge.getAppStateRemoveCalls(),
    1,
    "the AppState subscription must be removed on unmount",
  );
}

async function proveFailedCheckNeverSurfacesAnUpdate() {
  const updates = makeUpdatesModule({ checkError: new Error("offline") });
  const bridge = mountProvider({ updatesModule: updates.module });
  bridge.runEffects();

  const realNow = Date.now;
  Date.now = () => 5_000_000;
  try {
    bridge.getAppStateListener()("active");
    await flush();
    assert.equal(
      bridge.states[STATE_SHOW_MODAL].value,
      false,
      "a failed check must never surface an update sheet",
    );
    assert.equal(
      bridge.states[STATE_IS_CHECKING].value,
      false,
      "a failed check must clear isChecking",
    );
  } finally {
    Date.now = realNow;
  }
}

// E28: the 'available' sheet must not describe the build the user already runs.
function proveAvailableSheetDropsBundledMetadata() {
  const modal = read("components/ui/UpdateAvailableModal.jsx");

  assert.match(
    modal,
    /\{isCompleted && UPDATE_METADATA\?\.changes\?\.length > 0 && \(/,
    "the bundled changelog must be gated to the completed variant",
  );
  assert.doesNotMatch(
    modal,
    /:\s*\(UPDATE_METADATA\?\.title \|\| "Restart to apply the latest improvements\."\)/,
    "the available variant must not title itself from bundled metadata",
  );
  assert.match(
    modal,
    /update = null,/,
    "the modal must accept the incoming update manifest",
  );
  assert.match(
    modal,
    /const incomingUpdateId =[\s\S]*?update\?\.id/,
    "the available variant must identify the incoming update by manifest id",
  );
  assert.match(
    modal,
    /const incomingUpdateDate = formatUpdateDate\(update\?\.createdAt\);/,
    "the available variant must read the incoming manifest createdAt",
  );

  const layer = read("runtime/OTAModalLayer.jsx");
  assert.match(
    layer,
    /variant="available"\s*\n\s*update=\{availableUpdate\}/,
    "the modal layer must pass the incoming update to the available sheet",
  );
  assert.doesNotMatch(
    layer,
    /variant="completed"[\s\S]*?update=\{/,
    "the completed sheet keeps describing the running build",
  );
}

proveForegroundRecheckAndThrottle()
  .then(proveFailedCheckNeverSurfacesAnUpdate)
  .then(() => {
    proveAvailableSheetDropsBundledMetadata();
    console.log("PASS OTA update lifecycle and available-sheet honesty");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
