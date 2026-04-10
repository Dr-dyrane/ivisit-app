export const HEADER_MODES = Object.freeze({
	LEGACY_SCROLL: "legacy-scroll",
	FIXED: "fixed",
	HIDDEN: "hidden",
	MAP_OVERLAY: "map-overlay",
});

export const DEFAULT_HEADER_STATE = Object.freeze({
	title: "",
	subtitle: "",
	icon: null,
	backgroundColor: "#86100E",
	badge: null,
	leftComponent: null,
	rightComponent: null,
	hidden: false,
	scrollAware: true,
	mode: HEADER_MODES.LEGACY_SCROLL,
});

function inferHeaderMode(state = {}) {
	if (Object.values(HEADER_MODES).includes(state?.mode)) {
		return state.mode;
	}

	if (state?.hidden) {
		return HEADER_MODES.HIDDEN;
	}

	if (state?.scrollAware === false) {
		return HEADER_MODES.FIXED;
	}

	return HEADER_MODES.LEGACY_SCROLL;
}

export function normalizeHeaderState(state = {}) {
	const mergedState = {
		...DEFAULT_HEADER_STATE,
		...state,
	};
	const mode = inferHeaderMode(mergedState);

	return {
		...mergedState,
		mode,
		hidden: mode === HEADER_MODES.HIDDEN,
		scrollAware: mode === HEADER_MODES.LEGACY_SCROLL,
	};
}

export function getHeaderBehavior(state = {}) {
	const normalizedState = normalizeHeaderState(state);

	return {
		...normalizedState,
		isHidden: normalizedState.hidden,
		isScrollAware: normalizedState.scrollAware,
		isFixed:
			normalizedState.mode === HEADER_MODES.FIXED ||
			normalizedState.mode === HEADER_MODES.MAP_OVERLAY,
	};
}
