export const HEADER_MODES = Object.freeze({
	LEGACY_SCROLL: "legacy-scroll",
	FIXED: "fixed",
	HIDDEN: "hidden",
	MAP_OVERLAY: "map-overlay",
	ACTIVE_SESSION: "active-session",
});

export const DEFAULT_HEADER_SESSION = Object.freeze({
	eyebrow: "",
	title: "",
	subtitle: "",
	statusLabel: "",
	statusTone: "default",
	expanded: false,
	expandable: false,
	expandedContent: null,
	details: [],
	onToggleExpand: null,
});

export const DEFAULT_HEADER_STATE = Object.freeze({
	title: "",
	subtitle: "",
	icon: null,
	backgroundColor: "#86100E",
	badge: null,
	leftComponent: null,
	rightComponent: null,
	session: DEFAULT_HEADER_SESSION,
	hidden: false,
	scrollAware: true,
	mode: HEADER_MODES.LEGACY_SCROLL,
});

function normalizeHeaderSession(session = {}) {
	if (!session || typeof session !== "object") {
		return DEFAULT_HEADER_SESSION;
	}

	const details = Array.isArray(session.details)
		? session.details.filter((detail) => detail && typeof detail === "object")
		: DEFAULT_HEADER_SESSION.details;

	return {
		...DEFAULT_HEADER_SESSION,
		...session,
		details,
		onToggleExpand:
			typeof session.onToggleExpand === "function"
				? session.onToggleExpand
				: DEFAULT_HEADER_SESSION.onToggleExpand,
	};
}

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
		session: normalizeHeaderSession(state?.session),
	};
	const mode = inferHeaderMode(mergedState);

	return {
		...mergedState,
		mode,
		hidden: mode === HEADER_MODES.HIDDEN,
		scrollAware: mode === HEADER_MODES.LEGACY_SCROLL,
	};
}

export function hasRenderableHeaderContent(state = {}) {
	const normalizedState = normalizeHeaderState(state);
	const session = normalizedState.session || DEFAULT_HEADER_SESSION;
	const hasStandardContent =
		Boolean(normalizedState.title) ||
		Boolean(normalizedState.subtitle) ||
		Boolean(normalizedState.icon) ||
		Boolean(normalizedState.badge) ||
		Boolean(normalizedState.leftComponent) ||
		Boolean(normalizedState.rightComponent);
	const hasSessionContent =
		normalizedState.mode === HEADER_MODES.ACTIVE_SESSION &&
		(Boolean(session.eyebrow) ||
			Boolean(session.title) ||
			Boolean(session.subtitle) ||
			Boolean(session.statusLabel) ||
			(Array.isArray(session.details) && session.details.length > 0) ||
			Boolean(session.expandedContent));

	return hasStandardContent || hasSessionContent;
}

export function getHeaderBehavior(state = {}) {
	const normalizedState = normalizeHeaderState(state);

	return {
		...normalizedState,
		hasRenderableContent: hasRenderableHeaderContent(normalizedState),
		isHidden: normalizedState.hidden,
		isScrollAware: normalizedState.scrollAware,
		isFixed:
			normalizedState.mode === HEADER_MODES.FIXED ||
			normalizedState.mode === HEADER_MODES.MAP_OVERLAY ||
			normalizedState.mode === HEADER_MODES.ACTIVE_SESSION,
		isActiveSession: normalizedState.mode === HEADER_MODES.ACTIVE_SESSION,
	};
}
