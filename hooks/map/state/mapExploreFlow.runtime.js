export const MAP_EXPLORE_RUNTIME_SCOPES = {
	COMMIT: "commit",
	TRACKING: "tracking",
};

export const MAP_EXPLORE_COMMIT_RUNTIME_KEYS = {
	DETAILS: "details",
	PAYMENT: "payment",
	TRIAGE: "triage",
};

export const MAP_EXPLORE_TRACKING_RUNTIME_KEYS = {
	VIEW: "view",
	HEADER_ACTION_REQUEST: "headerActionRequest",
};

export function createInitialMapExploreRuntimeState() {
	return {
		commit: {
			details: null,
			payment: null,
			triage: null,
		},
		tracking: {
			view: null,
			headerActionRequest: null,
		},
	};
}

function isPlainObject(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function setMapExploreRuntimeSlice(runtimeState, scope, key, value) {
	if (!runtimeState?.[scope] || !key) return runtimeState;
	return {
		...runtimeState,
		[scope]: {
			...runtimeState[scope],
			[key]: value,
		},
	};
}

export function patchMapExploreRuntimeSlice(runtimeState, scope, key, patch) {
	if (!runtimeState?.[scope] || !key) return runtimeState;
	const currentValue = runtimeState[scope][key];
	const nextValue =
		isPlainObject(currentValue) && isPlainObject(patch)
			? {
					...currentValue,
					...patch,
				}
			: patch;
	return setMapExploreRuntimeSlice(runtimeState, scope, key, nextValue);
}
