const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");
const {
  QueryClient,
  QueryObserver,
  focusManager,
} = require("@tanstack/react-query");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

function loadFocusHook(platformOS) {
  const source = read("providers/useQueryAppStateFocus.js");
  const transformed = babel.transformSync(source, {
    filename: path.join(root, "providers/useQueryAppStateFocus.js"),
    babelrc: false,
    configFile: false,
    presets: [require.resolve("babel-preset-expo")],
  });
  const loadedModule = { exports: {} };
  const focusedStates = [];
  let effect;
  let listener;
  let listenerEvent;
  let removeCalls = 0;

  const localRequire = (request) => {
    if (request === "react") {
      return {
        useEffect(nextEffect, dependencies) {
          effect = nextEffect;
          assert.deepEqual(dependencies, []);
        },
      };
    }
    if (request === "react-native") {
      return {
        Platform: { OS: platformOS },
        AppState: {
          addEventListener(event, nextListener) {
            listenerEvent = event;
            listener = nextListener;
            return {
              remove() {
                removeCalls += 1;
              },
            };
          },
        },
      };
    }
    if (request === "@tanstack/react-query") {
      return {
        focusManager: {
          setFocused(isFocused) {
            focusedStates.push(isFocused);
          },
        },
      };
    }
    return require(request);
  };

  const evaluate = new Function(
    "module",
    "exports",
    "require",
    transformed.code,
  );
  evaluate(loadedModule, loadedModule.exports, localRequire);
  loadedModule.exports.useQueryAppStateFocus();

  return {
    focusedStates,
    getEffect: () => effect,
    getListener: () => listener,
    getListenerEvent: () => listenerEvent,
    getRemoveCalls: () => removeCalls,
  };
}

for (const platformOS of ["ios", "android"]) {
  const nativeBridge = loadFocusHook(platformOS);
  const nativeCleanup = nativeBridge.getEffect()();
  assert.equal(nativeBridge.getListenerEvent(), "change");
  nativeBridge.getListener()("inactive");
  nativeBridge.getListener()("background");
  nativeBridge.getListener()("active");
  assert.deepEqual(nativeBridge.focusedStates, [false, false, true]);
  nativeCleanup();
  assert.equal(nativeBridge.getRemoveCalls(), 1);
}

const webBridge = loadFocusHook("web");
assert.equal(webBridge.getEffect()(), undefined);
assert.equal(webBridge.getListener(), undefined);
assert.deepEqual(webBridge.focusedStates, []);

const provider = read("providers/QueryProvider.jsx");
assert.match(
  provider,
  /import \{ useQueryAppStateFocus \} from "\.\/useQueryAppStateFocus";/,
);
assert.match(
  provider,
  /export function QueryProvider\(\{ children \}\) \{\s*useQueryAppStateFocus\(\);/,
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitUntil(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await delay(5);
  }
  assert.fail(message);
}

async function proveActiveQueryRefetch() {
  let fetchCount = 0;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
        staleTime: 0,
      },
    },
  });
  const observer = new QueryObserver(queryClient, {
    queryKey: ["query-app-state-focus-proof"],
    queryFn: async () => {
      fetchCount += 1;
      return fetchCount;
    },
  });
  let unsubscribe = () => {};

  queryClient.mount();
  try {
    unsubscribe = observer.subscribe(() => {});
    await waitUntil(
      () => observer.getCurrentResult().isSuccess,
      "active query did not complete its initial fetch",
    );
    await delay(5);

    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitUntil(
      () => fetchCount === 2 && !observer.getCurrentResult().isFetching,
      "foreground focus did not refetch the stale active query",
    );

    unsubscribe();
    unsubscribe = () => {};
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await delay(20);
    assert.equal(fetchCount, 2, "inactive queries must not refetch on focus");
  } finally {
    unsubscribe();
    queryClient.unmount();
    focusManager.setFocused(undefined);
  }
}

proveActiveQueryRefetch()
  .then(() => {
    console.log("PASS TanStack Query AppState focus behavior");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
