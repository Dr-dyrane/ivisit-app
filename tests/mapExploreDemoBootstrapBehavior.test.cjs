const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
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

function createHookHarness() {
	const refs = [];
	const state = [];
	const effects = [];
	let hookIndex = 0;
	let pendingEffects = [];

	const dependenciesChanged = (previous = [], next = []) =>
		previous.length !== next.length || previous.some((value, index) => value !== next[index]);

	const react = {
		useRef(initialValue) {
			const index = hookIndex++;
			if (!refs[index]) refs[index] = { current: initialValue };
			return refs[index];
		},
		useState(initialValue) {
			const index = hookIndex++;
			if (!Object.prototype.hasOwnProperty.call(state, index)) {
				state[index] = initialValue;
			}
			return [state[index], (nextValue) => {
				state[index] = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
			}];
		},
		useEffect(callback, dependencies) {
			const index = hookIndex++;
			const previous = effects[index];
			if (!previous || dependenciesChanged(previous.dependencies, dependencies)) {
				pendingEffects.push({ index, callback, dependencies });
			}
		},
	};

	return {
		react,
		render(hook, props) {
			hookIndex = 0;
			const result = hook(props);
			const scheduled = pendingEffects;
			pendingEffects = [];
			for (const nextEffect of scheduled) {
				effects[nextEffect.index]?.cleanup?.();
				const cleanup = nextEffect.callback();
				effects[nextEffect.index] = {
					dependencies: nextEffect.dependencies,
					cleanup: typeof cleanup === "function" ? cleanup : null,
				};
			}
			return result;
		},
		unmount() {
			for (const effect of effects) effect?.cleanup?.();
		},
	};
}

const flushAsync = async () => {
	for (let index = 0; index < 8; index += 1) {
		await Promise.resolve();
	}
};

const deferred = () => {
	let resolve;
	const promise = new Promise((nextResolve) => {
		resolve = nextResolve;
	});
	return { promise, resolve };
};

const baseProps = (overrides = {}) => ({
	activeLocation: { latitude: 33.747, longitude: -116.971 },
	coverageModePreferenceLoaded: true,
	effectiveDemoModeEnabled: true,
	hasComfortableNearbyCoverage: false,
	isLoadingHospitals: false,
	refreshHospitals: async () => {},
	shouldBootstrapDemoCoverage: true,
	userId: "patient-1",
	...overrides,
});

test("bootstrap identity accepts real zero coordinates but rejects malformed coordinates", () => {
	const harness = createHookHarness();
	const { buildDemoBootstrapIdentity } = loadSourceModule(
		"hooks/map/exploreFlow/useMapExploreDemoBootstrap.js",
		{
			react: harness.react,
			"../../../services/demoEcosystemService": { demoEcosystemService: {} },
		},
	);

	assert.equal(buildDemoBootstrapIdentity({ latitude: 0, longitude: 0 }, "patient-1"), "0.000:0.000:patient-1");
	assert.equal(buildDemoBootstrapIdentity({ latitude: null, longitude: null }, "patient-1"), null);
	assert.equal(buildDemoBootstrapIdentity({ latitude: "", longitude: "" }, "patient-1"), null);
	assert.equal(buildDemoBootstrapIdentity({ latitude: 91, longitude: 0 }, "patient-1"), null);
	assert.equal(buildDemoBootstrapIdentity({ latitude: 0, longitude: 181 }, "patient-1"), null);
});

test("same pickup rerenders keep one bootstrap task and use the latest refresh callback", async () => {
	const harness = createHookHarness();
	const ensureCalls = [];
	const pendingEnsure = deferred();
	const service = {
		getProvisioningUserId: async (userId) => userId,
		ensureDemoEcosystemForLocation: async (input) => {
			ensureCalls.push(input);
			return pendingEnsure.promise;
		},
	};
	const { useMapExploreDemoBootstrap } = loadSourceModule(
		"hooks/map/exploreFlow/useMapExploreDemoBootstrap.js",
		{
			react: harness.react,
			"../../../services/demoEcosystemService": { demoEcosystemService: service },
		},
	);

	let firstRefreshes = 0;
	let latestRefreshes = 0;
	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({ refreshHospitals: async () => { firstRefreshes += 1; } }),
	);
	await flushAsync();
	assert.equal(ensureCalls.length, 1);

	// Coverage calculations can rerender the owner while the same sparse-region
	// request is in flight. That must not cancel or duplicate the task.
	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({
			hasComfortableNearbyCoverage: true,
			refreshHospitals: async () => { latestRefreshes += 1; },
		}),
	);
	pendingEnsure.resolve({ bootstrapped: true });
	await flushAsync();

	assert.equal(ensureCalls.length, 1, "same pickup must not provision twice");
	assert.equal(firstRefreshes, 0, "stale refresh callback must not win");
	assert.equal(latestRefreshes, 1, "completion must refresh the mounted query once");

	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({ refreshHospitals: async () => { latestRefreshes += 1; } }),
	);
	await flushAsync();
	assert.equal(ensureCalls.length, 1, "completed identity must remain idempotent");
});

test("a real location identity change supersedes the old task without a stale refresh", async () => {
	const harness = createHookHarness();
	const pendingEnsures = [];
	const service = {
		getProvisioningUserId: async (userId) => userId,
		ensureDemoEcosystemForLocation: async (input) => {
			const pending = deferred();
			pendingEnsures.push({ input, pending });
			return pending.promise;
		},
	};
	const { useMapExploreDemoBootstrap } = loadSourceModule(
		"hooks/map/exploreFlow/useMapExploreDemoBootstrap.js",
		{
			react: harness.react,
			"../../../services/demoEcosystemService": { demoEcosystemService: service },
		},
	);

	let oldRefreshes = 0;
	let newRefreshes = 0;
	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({ refreshHospitals: async () => { oldRefreshes += 1; } }),
	);
	await flushAsync();
	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({
			activeLocation: { latitude: 34.053, longitude: -118.244 },
			refreshHospitals: async () => { newRefreshes += 1; },
		}),
	);
	await flushAsync();
	assert.equal(pendingEnsures.length, 2);

	pendingEnsures[0].pending.resolve({ bootstrapped: true });
	await flushAsync();
	assert.equal(oldRefreshes, 0, "superseded pickup must not refresh a stale query");

	pendingEnsures[1].pending.resolve({ bootstrapped: true });
	await flushAsync();
	assert.equal(newRefreshes, 1);
});

test("unmount prevents a finished bootstrap from refreshing an absent map", async () => {
	const harness = createHookHarness();
	const pendingEnsure = deferred();
	let refreshes = 0;
	const { useMapExploreDemoBootstrap } = loadSourceModule(
		"hooks/map/exploreFlow/useMapExploreDemoBootstrap.js",
		{
			react: harness.react,
			"../../../services/demoEcosystemService": {
				demoEcosystemService: {
					getProvisioningUserId: async (userId) => userId,
					ensureDemoEcosystemForLocation: async () => pendingEnsure.promise,
				},
			},
		},
	);

	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({ refreshHospitals: async () => { refreshes += 1; } }),
	);
	await flushAsync();
	harness.unmount();
	pendingEnsure.resolve({ bootstrapped: true });
	await flushAsync();
	assert.equal(refreshes, 0);
});

test("a covered next pickup invalidates the old task before eligibility returns", async () => {
	const harness = createHookHarness();
	const pendingEnsure = deferred();
	let ensureCalls = 0;
	let refreshes = 0;
	const { useMapExploreDemoBootstrap } = loadSourceModule(
		"hooks/map/exploreFlow/useMapExploreDemoBootstrap.js",
		{
			react: harness.react,
			"../../../services/demoEcosystemService": {
				demoEcosystemService: {
					getProvisioningUserId: async (userId) => userId,
					ensureDemoEcosystemForLocation: async () => {
						ensureCalls += 1;
						return pendingEnsure.promise;
					},
				},
			},
		},
	);

	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({ refreshHospitals: async () => { refreshes += 1; } }),
	);
	await flushAsync();
	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({
			activeLocation: { latitude: 34.053, longitude: -118.244 },
			shouldBootstrapDemoCoverage: false,
		}),
	);
	pendingEnsure.resolve({ bootstrapped: true });
	await flushAsync();

	assert.equal(ensureCalls, 1, "covered pickup must not provision");
	assert.equal(refreshes, 0, "old pickup must not refresh the new query");
});

test("disabling demo coverage invalidates the in-flight task", async () => {
	const harness = createHookHarness();
	const pendingEnsure = deferred();
	let refreshes = 0;
	const { useMapExploreDemoBootstrap } = loadSourceModule(
		"hooks/map/exploreFlow/useMapExploreDemoBootstrap.js",
		{
			react: harness.react,
			"../../../services/demoEcosystemService": {
				demoEcosystemService: {
					getProvisioningUserId: async (userId) => userId,
					ensureDemoEcosystemForLocation: async () => pendingEnsure.promise,
				},
			},
		},
	);

	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({ refreshHospitals: async () => { refreshes += 1; } }),
	);
	await flushAsync();
	harness.render(
		useMapExploreDemoBootstrap,
		baseProps({ effectiveDemoModeEnabled: false }),
	);
	pendingEnsure.resolve({ bootstrapped: true });
	await flushAsync();
	assert.equal(refreshes, 0);
});

test("hospital list receives query-or-bootstrap loading instead of a terminal empty state", () => {
	const mapScreen = fs.readFileSync(path.join(ROOT, "screens/MapScreen.jsx"), "utf8");
	const sheetOrchestrator = fs.readFileSync(
		path.join(ROOT, "components/map/core/MapSheetOrchestrator.jsx"),
		"utf8",
	);
	const listContent = fs.readFileSync(
		path.join(ROOT, "components/map/surfaces/hospitals/MapHospitalListContent.jsx"),
		"utf8",
	);

	assert.match(
		mapScreen,
		/isHospitalsLoading=\{isLoadingHospitals \|\| isBootstrappingDemo\}/,
	);
	assert.match(sheetOrchestrator, /isLoading=\{isHospitalsLoading\}/);
	assert.match(
		listContent,
		/if \(isLoading\) \{[\s\S]*?Loading hospitals[\s\S]*?\}\s*\n\s*if \(!hasHospitals\)/,
		"loading must win before the terminal nearby-hospital empty state",
	);
});
