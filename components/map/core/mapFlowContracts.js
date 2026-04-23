import {
	MAP_SHEET_PHASES,
	MAP_SHEET_SNAP_STATES,
	MAP_SHEET_SNAP_STATE_ORDER,
} from "./mapSheet.constants";

export const MAP_FLOW_PHASE_FAMILIES = {
	EXPLORE: "explore",
	DISCOVERY: "discovery",
	DECISION: "decision",
	COMMIT: "commit",
	ACTIVE: "active",
	HISTORY: "history",
};

const VALID_PHASES = new Set(Object.values(MAP_SHEET_PHASES));
const VALID_SNAP_STATES = new Set(Object.values(MAP_SHEET_SNAP_STATES));

const EXPANDED_ONLY_PHASES = new Set([
	MAP_SHEET_PHASES.SEARCH,
	MAP_SHEET_PHASES.HOSPITAL_LIST,
	MAP_SHEET_PHASES.SERVICE_DETAIL,
	MAP_SHEET_PHASES.COMMIT_DETAILS,
	MAP_SHEET_PHASES.COMMIT_TRIAGE,
]);

const PAYLOAD_OPTIONAL_OBJECT_PHASES = new Set([
	MAP_SHEET_PHASES.HOSPITAL_LIST,
	MAP_SHEET_PHASES.HOSPITAL_DETAIL,
	MAP_SHEET_PHASES.VISIT_DETAIL,
	MAP_SHEET_PHASES.SERVICE_DETAIL,
	MAP_SHEET_PHASES.AMBULANCE_DECISION,
	MAP_SHEET_PHASES.BED_DECISION,
	MAP_SHEET_PHASES.COMMIT_DETAILS,
	MAP_SHEET_PHASES.COMMIT_TRIAGE,
	MAP_SHEET_PHASES.COMMIT_PAYMENT,
	MAP_SHEET_PHASES.TRACKING,
	MAP_SHEET_PHASES.CARE_HISTORY,
	MAP_SHEET_PHASES.RECENT_VISITS,
	MAP_SHEET_PHASES.HOSPITAL_PREVIEW,
	MAP_SHEET_PHASES.COMMIT_AUTH,
]);

export const MAP_FLOW_PHASE_CONTRACTS = {
	[MAP_SHEET_PHASES.EXPLORE_INTENT]: {
		family: MAP_FLOW_PHASE_FAMILIES.EXPLORE,
		payload: "none",
		description: "Default map-first discovery surface.",
	},
	[MAP_SHEET_PHASES.SEARCH]: {
		family: MAP_FLOW_PHASE_FAMILIES.DISCOVERY,
		payload: "none",
		description: "Location and provider search.",
	},
	[MAP_SHEET_PHASES.HOSPITAL_LIST]: {
		family: MAP_FLOW_PHASE_FAMILIES.DISCOVERY,
		payload: "optional_object",
		description: "Provider comparison and source-return handoff.",
	},
	[MAP_SHEET_PHASES.HOSPITAL_DETAIL]: {
		family: MAP_FLOW_PHASE_FAMILIES.DISCOVERY,
		payload: "optional_object",
		description: "Provider detail and service review.",
	},
	[MAP_SHEET_PHASES.VISIT_DETAIL]: {
		family: MAP_FLOW_PHASE_FAMILIES.HISTORY,
		payload: "optional_object",
		description: "Visit / transport / reservation detail from history.",
	},
	[MAP_SHEET_PHASES.SERVICE_DETAIL]: {
		family: MAP_FLOW_PHASE_FAMILIES.DISCOVERY,
		payload: "optional_object",
		description: "Transport or room service detail.",
	},
	[MAP_SHEET_PHASES.AMBULANCE_DECISION]: {
		family: MAP_FLOW_PHASE_FAMILIES.DECISION,
		payload: "optional_object",
		description: "Ambulance option selection.",
	},
	[MAP_SHEET_PHASES.BED_DECISION]: {
		family: MAP_FLOW_PHASE_FAMILIES.DECISION,
		payload: "optional_object",
		description: "Bed or combined-flow room selection.",
	},
	[MAP_SHEET_PHASES.COMMIT_DETAILS]: {
		family: MAP_FLOW_PHASE_FAMILIES.COMMIT,
		payload: "optional_object",
		description: "Contact identity confirmation.",
	},
	[MAP_SHEET_PHASES.COMMIT_TRIAGE]: {
		family: MAP_FLOW_PHASE_FAMILIES.COMMIT,
		payload: "optional_object",
		description: "Deterministic triage and information update.",
	},
	[MAP_SHEET_PHASES.COMMIT_PAYMENT]: {
		family: MAP_FLOW_PHASE_FAMILIES.COMMIT,
		payload: "optional_object",
		description: "Payment and dispatch finalization.",
	},
	[MAP_SHEET_PHASES.TRACKING]: {
		family: MAP_FLOW_PHASE_FAMILIES.ACTIVE,
		payload: "optional_object",
		description: "Live request tracking and resolution.",
	},
	[MAP_SHEET_PHASES.CARE_HISTORY]: {
		family: MAP_FLOW_PHASE_FAMILIES.HISTORY,
		payload: "optional_object",
		description: "Care history bridge.",
	},
	[MAP_SHEET_PHASES.RECENT_VISITS]: {
		family: MAP_FLOW_PHASE_FAMILIES.HISTORY,
		payload: "optional_object",
		description: "Recent visits bridge.",
	},
	[MAP_SHEET_PHASES.HOSPITAL_PREVIEW]: {
		family: MAP_FLOW_PHASE_FAMILIES.DISCOVERY,
		payload: "optional_object",
		description: "Legacy preview bridge.",
	},
	[MAP_SHEET_PHASES.COMMIT_AUTH]: {
		family: MAP_FLOW_PHASE_FAMILIES.COMMIT,
		payload: "optional_object",
		description: "Auth bridge during commit.",
	},
};

export function isValidMapSheetPhase(phase) {
	return VALID_PHASES.has(phase);
}

export function isValidMapSheetSnapState(snapState) {
	return VALID_SNAP_STATES.has(snapState);
}

export function getMapFlowPhaseContract(phase) {
	return MAP_FLOW_PHASE_CONTRACTS[phase] || MAP_FLOW_PHASE_CONTRACTS[MAP_SHEET_PHASES.EXPLORE_INTENT];
}

export function getMapSheetDefaultSnapState(phase, { usesSidebarLayout = false } = {}) {
	if (usesSidebarLayout) return MAP_SHEET_SNAP_STATES.EXPANDED;
	if (EXPANDED_ONLY_PHASES.has(phase)) return MAP_SHEET_SNAP_STATES.EXPANDED;
	return MAP_SHEET_SNAP_STATES.HALF;
}

export function getAllowedSnapStatesForMapPhase(
	phase,
	{ usesSidebarLayout = false } = {},
) {
	if (usesSidebarLayout || EXPANDED_ONLY_PHASES.has(phase)) {
		return [MAP_SHEET_SNAP_STATES.EXPANDED];
	}
	return MAP_SHEET_SNAP_STATE_ORDER;
}

function normalizeMapSheetPayload(phase, payload) {
	if (payload === undefined) return null;
	if (payload === null) return null;
	if (!PAYLOAD_OPTIONAL_OBJECT_PHASES.has(phase)) return null;
	return payload && typeof payload === "object" ? payload : null;
}

export function normalizeMapSheetView(
	view,
	{ usesSidebarLayout = false, fallbackPhase = MAP_SHEET_PHASES.EXPLORE_INTENT } = {},
) {
	const phase = isValidMapSheetPhase(view?.phase) ? view.phase : fallbackPhase;
	const normalizedPhase = isValidMapSheetPhase(phase)
		? phase
		: MAP_SHEET_PHASES.EXPLORE_INTENT;
	const defaultSnapState = getMapSheetDefaultSnapState(normalizedPhase, {
		usesSidebarLayout,
	});
	const allowedSnapStates = getAllowedSnapStatesForMapPhase(normalizedPhase, {
		usesSidebarLayout,
	});
	const requestedSnapState = isValidMapSheetSnapState(view?.snapState)
		? view.snapState
		: defaultSnapState;
	const snapState = allowedSnapStates.includes(requestedSnapState)
		? requestedSnapState
		: defaultSnapState;

	return {
		phase: normalizedPhase,
		snapState,
		payload: normalizeMapSheetPayload(normalizedPhase, view?.payload),
	};
}
