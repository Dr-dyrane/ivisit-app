export const MAP_SHEET_PHASES = {
	EXPLORE_INTENT: "explore_intent",
	SEARCH: "search",
	HOSPITAL_LIST: "hospital_list",
	HOSPITAL_DETAIL: "hospital_detail",
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
