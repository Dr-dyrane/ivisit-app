export const MAP_SHEET_PHASES = {
	EXPLORE_INTENT: "explore_intent",
	SEARCH: "search",
	HOSPITAL_LIST: "hospital_list",
	HOSPITAL_DETAIL: "hospital_detail",
	SERVICE_DETAIL: "service_detail",
	CARE_HISTORY: "care_history",
	RECENT_VISITS: "recent_visits",
	HOSPITAL_PREVIEW: "hospital_preview",
	AMBULANCE_DECISION: "ambulance_decision",
	BED_DECISION: "bed_decision",
	COMMIT_DETAILS: "commit_details",
	COMMIT_AUTH: "commit_auth",
	COMMIT_PAYMENT: "commit_payment",
	TRACKING: "tracking",
};

export const MAP_SHEET_MODES = MAP_SHEET_PHASES;

export const MAP_SHEET_SNAP_STATES = {
	COLLAPSED: "collapsed",
	HALF: "half",
	EXPANDED: "expanded",
};

export const MAP_SHEET_SNAP_INDEX = {
	[MAP_SHEET_SNAP_STATES.COLLAPSED]: 0,
	[MAP_SHEET_SNAP_STATES.HALF]: 1,
	[MAP_SHEET_SNAP_STATES.EXPANDED]: 2,
};

export const MAP_SHEET_SNAP_STATE_ORDER = [
	MAP_SHEET_SNAP_STATES.COLLAPSED,
	MAP_SHEET_SNAP_STATES.HALF,
	MAP_SHEET_SNAP_STATES.EXPANDED,
];

export function getNextMapSheetSnapStateUp(snapState) {
	switch (snapState) {
		case MAP_SHEET_SNAP_STATES.COLLAPSED:
			return MAP_SHEET_SNAP_STATES.HALF;
		case MAP_SHEET_SNAP_STATES.HALF:
			return MAP_SHEET_SNAP_STATES.EXPANDED;
		default:
			return MAP_SHEET_SNAP_STATES.EXPANDED;
	}
}

export function getNextMapSheetSnapStateDown(snapState) {
	switch (snapState) {
		case MAP_SHEET_SNAP_STATES.EXPANDED:
			return MAP_SHEET_SNAP_STATES.HALF;
		case MAP_SHEET_SNAP_STATES.HALF:
			return MAP_SHEET_SNAP_STATES.COLLAPSED;
		default:
			return MAP_SHEET_SNAP_STATES.COLLAPSED;
	}
}

export function getAllowedMapSheetSnapStates(
	allowedSnapStates = MAP_SHEET_SNAP_STATE_ORDER,
) {
	const allowedSet = new Set(
		Array.isArray(allowedSnapStates) && allowedSnapStates.length > 0
			? allowedSnapStates
			: MAP_SHEET_SNAP_STATE_ORDER,
	);

	return MAP_SHEET_SNAP_STATE_ORDER.filter((state) => allowedSet.has(state));
}

export function getNextAllowedMapSheetSnapStateUp(
	snapState,
	allowedSnapStates = MAP_SHEET_SNAP_STATE_ORDER,
) {
	const orderedStates = getAllowedMapSheetSnapStates(allowedSnapStates);
	const currentIndex = orderedStates.indexOf(snapState);
	if (currentIndex === -1) {
		return orderedStates[0] || MAP_SHEET_SNAP_STATES.HALF;
	}
	return orderedStates[Math.min(currentIndex + 1, orderedStates.length - 1)] || snapState;
}

export function getNextAllowedMapSheetSnapStateDown(
	snapState,
	allowedSnapStates = MAP_SHEET_SNAP_STATE_ORDER,
) {
	const orderedStates = getAllowedMapSheetSnapStates(allowedSnapStates);
	const currentIndex = orderedStates.indexOf(snapState);
	if (currentIndex === -1) {
		return orderedStates[0] || MAP_SHEET_SNAP_STATES.HALF;
	}
	return orderedStates[Math.max(currentIndex - 1, 0)] || snapState;
}

export function getToggledMapSheetSnapState(
	snapState,
	allowedSnapStates = MAP_SHEET_SNAP_STATE_ORDER,
) {
	const orderedStates = getAllowedMapSheetSnapStates(allowedSnapStates);
	const highestState = orderedStates[orderedStates.length - 1] || MAP_SHEET_SNAP_STATES.EXPANDED;
	if (snapState === highestState) {
		return getNextAllowedMapSheetSnapStateDown(snapState, orderedStates);
	}
	return getNextAllowedMapSheetSnapStateUp(snapState, orderedStates);
}

export function getMapSheetHeight(screenHeight, snapState) {
	switch (snapState) {
		case MAP_SHEET_SNAP_STATES.COLLAPSED:
			return 66;
		case MAP_SHEET_SNAP_STATES.EXPANDED:
			return Math.max(540, Math.min(screenHeight * 0.86, 780));
		case MAP_SHEET_SNAP_STATES.HALF:
		default:
			return Math.max(360, Math.min(screenHeight * 0.5, 460));
	}
}
