import { MAP_SHEET_PHASES } from "../../../components/map/core/mapSheet.constants";
import { createInitialMapExploreRuntimeState } from "./mapExploreFlow.runtime";

export function selectMapExploreSearchState(state) {
	return state?.search || {};
}

export function selectMapExploreSurfaceState(state) {
	return state?.surfaces || {};
}

export function selectMapExploreSelectionState(state) {
	return state?.selection || {};
}

export function selectMapExploreLocationState(state) {
	return state?.location || {};
}

export function selectMapExploreSheetState(state) {
	return state?.sheet || {};
}

export function selectMapExploreMapState(state) {
	return state?.map || {};
}

export function selectMapExploreRuntimeState(state) {
	return state?.runtime || createInitialMapExploreRuntimeState();
}

export function selectMapExploreSheetPhase(state) {
	return selectMapExploreSheetState(state).phase;
}

export function selectMapExploreSheetSnapState(state) {
	return selectMapExploreSheetState(state).snapState;
}

export function selectMapExploreSheetPayload(state) {
	return selectMapExploreSheetState(state).payload;
}

export function selectMapExploreSearchMode(state) {
	return selectMapExploreSearchState(state).mode;
}

export function selectMapExploreMapReadiness(state) {
	return selectMapExploreMapState(state).readiness;
}

export function selectMapExploreHasCompletedInitialMapLoad(state) {
	return Boolean(selectMapExploreMapState(state).hasCompletedInitialMapLoad);
}

export function selectMapExplorePhaseVisibility(state) {
	const phase = selectMapExploreSheetPhase(state);
	return {
		searchSheetVisible: phase === MAP_SHEET_PHASES.SEARCH,
		hospitalListVisible: phase === MAP_SHEET_PHASES.HOSPITAL_LIST,
		hospitalDetailVisible: phase === MAP_SHEET_PHASES.HOSPITAL_DETAIL,
		visitDetailVisible: phase === MAP_SHEET_PHASES.VISIT_DETAIL,
		ambulanceDecisionVisible: phase === MAP_SHEET_PHASES.AMBULANCE_DECISION,
		bedDecisionVisible: phase === MAP_SHEET_PHASES.BED_DECISION,
		commitTriageVisible: phase === MAP_SHEET_PHASES.COMMIT_TRIAGE,
		commitPaymentVisible: phase === MAP_SHEET_PHASES.COMMIT_PAYMENT,
		trackingVisible: phase === MAP_SHEET_PHASES.TRACKING,
		serviceDetailVisible: phase === MAP_SHEET_PHASES.SERVICE_DETAIL,
	};
}

export function selectMapExploreTrackingHeaderActionRequest(state) {
	return (
		selectMapExploreRuntimeState(state)?.tracking?.headerActionRequest || null
	);
}
