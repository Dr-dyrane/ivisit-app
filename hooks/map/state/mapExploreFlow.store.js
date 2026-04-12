import { useCallback, useMemo, useReducer } from "react";
import {
	MAP_SHEET_MODES,
	MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";
import { MAP_SEARCH_SHEET_MODES } from "../../../components/map/surfaces/search/mapSearchSheet.helpers";

const ACTIONS = {
	RESET_EXPLORE_PRESENTATION: "resetExplorePresentation",
	SET_SEARCH_SHEET_VISIBLE: "setSearchSheetVisible",
	SET_SEARCH_SHEET_MODE: "setSearchSheetMode",
	SET_HOSPITAL_MODAL_VISIBLE: "setHospitalModalVisible",
	SET_HOSPITAL_DETAILS_VISIBLE: "setHospitalDetailsVisible",
	SET_PROFILE_MODAL_VISIBLE: "setProfileModalVisible",
	SET_GUEST_PROFILE_VISIBLE: "setGuestProfileVisible",
	SET_CARE_HISTORY_VISIBLE: "setCareHistoryVisible",
	SET_RECENT_VISITS_VISIBLE: "setRecentVisitsVisible",
	SET_AUTH_MODAL_VISIBLE: "setAuthModalVisible",
	SET_SELECTED_CARE: "setSelectedCare",
	SET_MANUAL_LOCATION: "setManualLocation",
	SET_GUEST_PROFILE_EMAIL: "setGuestProfileEmail",
	SET_FEATURED_HOSPITAL: "setFeaturedHospital",
	SET_SHEET_MODE: "setSheetMode",
	SET_SHEET_SNAP_STATE: "setSheetSnapState",
	SET_MAP_READINESS: "setMapReadiness",
	SET_HAS_COMPLETED_INITIAL_MAP_LOAD: "setHasCompletedInitialMapLoad",
};

function getDefaultSheetSnapState(usesSidebarLayout) {
	return usesSidebarLayout
		? MAP_SHEET_SNAP_STATES.EXPANDED
		: MAP_SHEET_SNAP_STATES.HALF;
}

export function createInitialMapExploreFlowState(usesSidebarLayout) {
	return {
		search: {
			visible: false,
			mode: MAP_SEARCH_SHEET_MODES.SEARCH,
		},
		surfaces: {
			hospitalModalVisible: false,
			hospitalDetailsVisible: false,
			profileModalVisible: false,
			guestProfileVisible: false,
			careHistoryVisible: false,
			recentVisitsVisible: false,
			authModalVisible: false,
		},
		selection: {
			selectedCare: null,
			featuredHospital: null,
		},
		location: {
			manualLocation: null,
			guestProfileEmail: "",
		},
		sheet: {
			mode: MAP_SHEET_MODES.EXPLORE_INTENT,
			snapState: getDefaultSheetSnapState(usesSidebarLayout),
		},
		map: {
			readiness: {
				mapReady: false,
				routeReady: false,
				isCalculatingRoute: false,
			},
			hasCompletedInitialMapLoad: false,
		},
	};
}

function mapExploreFlowReducer(state, action) {
	switch (action.type) {
		case ACTIONS.RESET_EXPLORE_PRESENTATION:
			return {
				...state,
				sheet: {
					...state.sheet,
					mode: MAP_SHEET_MODES.EXPLORE_INTENT,
					snapState: getDefaultSheetSnapState(action.usesSidebarLayout),
				},
			};
		case ACTIONS.SET_SEARCH_SHEET_VISIBLE:
			return {
				...state,
				search: {
					...state.search,
					visible: action.visible,
				},
			};
		case ACTIONS.SET_SEARCH_SHEET_MODE:
			return {
				...state,
				search: {
					...state.search,
					mode: action.mode,
				},
			};
		case ACTIONS.SET_HOSPITAL_MODAL_VISIBLE:
			return {
				...state,
				surfaces: {
					...state.surfaces,
					hospitalModalVisible: action.visible,
				},
			};
		case ACTIONS.SET_HOSPITAL_DETAILS_VISIBLE:
			return {
				...state,
				surfaces: {
					...state.surfaces,
					hospitalDetailsVisible: action.visible,
				},
			};
		case ACTIONS.SET_PROFILE_MODAL_VISIBLE:
			return {
				...state,
				surfaces: {
					...state.surfaces,
					profileModalVisible: action.visible,
				},
			};
		case ACTIONS.SET_GUEST_PROFILE_VISIBLE:
			return {
				...state,
				surfaces: {
					...state.surfaces,
					guestProfileVisible: action.visible,
				},
			};
		case ACTIONS.SET_CARE_HISTORY_VISIBLE:
			return {
				...state,
				surfaces: {
					...state.surfaces,
					careHistoryVisible: action.visible,
				},
			};
		case ACTIONS.SET_RECENT_VISITS_VISIBLE:
			return {
				...state,
				surfaces: {
					...state.surfaces,
					recentVisitsVisible: action.visible,
				},
			};
		case ACTIONS.SET_AUTH_MODAL_VISIBLE:
			return {
				...state,
				surfaces: {
					...state.surfaces,
					authModalVisible: action.visible,
				},
			};
		case ACTIONS.SET_SELECTED_CARE:
			return {
				...state,
				selection: {
					...state.selection,
					selectedCare: action.value,
				},
			};
		case ACTIONS.SET_MANUAL_LOCATION:
			return {
				...state,
				location: {
					...state.location,
					manualLocation: action.value,
				},
			};
		case ACTIONS.SET_GUEST_PROFILE_EMAIL:
			return {
				...state,
				location: {
					...state.location,
					guestProfileEmail: action.value,
				},
			};
		case ACTIONS.SET_FEATURED_HOSPITAL:
			return {
				...state,
				selection: {
					...state.selection,
					featuredHospital: action.value,
				},
			};
		case ACTIONS.SET_SHEET_MODE:
			return {
				...state,
				sheet: {
					...state.sheet,
					mode: action.value,
				},
			};
		case ACTIONS.SET_SHEET_SNAP_STATE:
			return {
				...state,
				sheet: {
					...state.sheet,
					snapState: action.value,
				},
			};
		case ACTIONS.SET_MAP_READINESS:
			return {
				...state,
				map: {
					...state.map,
					readiness: action.value,
				},
			};
		case ACTIONS.SET_HAS_COMPLETED_INITIAL_MAP_LOAD:
			return {
				...state,
				map: {
					...state.map,
					hasCompletedInitialMapLoad: action.value,
				},
			};
		default:
			return state;
	}
}

export function useMapExploreFlowStore({ usesSidebarLayout }) {
	const [state, dispatch] = useReducer(
		mapExploreFlowReducer,
		usesSidebarLayout,
		createInitialMapExploreFlowState,
	);

	const resetExplorePresentation = useCallback(() => {
		dispatch({
			type: ACTIONS.RESET_EXPLORE_PRESENTATION,
			usesSidebarLayout,
		});
	}, [usesSidebarLayout]);

	const actions = useMemo(
		() => ({
			resetExplorePresentation,
			setSearchSheetVisible: (visible) =>
				dispatch({ type: ACTIONS.SET_SEARCH_SHEET_VISIBLE, visible }),
			setSearchSheetMode: (mode) =>
				dispatch({ type: ACTIONS.SET_SEARCH_SHEET_MODE, mode }),
			setHospitalModalVisible: (visible) =>
				dispatch({ type: ACTIONS.SET_HOSPITAL_MODAL_VISIBLE, visible }),
			setHospitalDetailsVisible: (visible) =>
				dispatch({ type: ACTIONS.SET_HOSPITAL_DETAILS_VISIBLE, visible }),
			setProfileModalVisible: (visible) =>
				dispatch({ type: ACTIONS.SET_PROFILE_MODAL_VISIBLE, visible }),
			setGuestProfileVisible: (visible) =>
				dispatch({ type: ACTIONS.SET_GUEST_PROFILE_VISIBLE, visible }),
			setCareHistoryVisible: (visible) =>
				dispatch({ type: ACTIONS.SET_CARE_HISTORY_VISIBLE, visible }),
			setRecentVisitsVisible: (visible) =>
				dispatch({ type: ACTIONS.SET_RECENT_VISITS_VISIBLE, visible }),
			setAuthModalVisible: (visible) =>
				dispatch({ type: ACTIONS.SET_AUTH_MODAL_VISIBLE, visible }),
			setSelectedCare: (value) =>
				dispatch({ type: ACTIONS.SET_SELECTED_CARE, value }),
			setManualLocation: (value) =>
				dispatch({ type: ACTIONS.SET_MANUAL_LOCATION, value }),
			setGuestProfileEmail: (value) =>
				dispatch({ type: ACTIONS.SET_GUEST_PROFILE_EMAIL, value }),
			setFeaturedHospital: (value) =>
				dispatch({ type: ACTIONS.SET_FEATURED_HOSPITAL, value }),
			setSheetMode: (value) => dispatch({ type: ACTIONS.SET_SHEET_MODE, value }),
			setSheetSnapState: (value) =>
				dispatch({ type: ACTIONS.SET_SHEET_SNAP_STATE, value }),
			setMapReadiness: (value) =>
				dispatch({ type: ACTIONS.SET_MAP_READINESS, value }),
			setHasCompletedInitialMapLoad: (value) =>
				dispatch({ type: ACTIONS.SET_HAS_COMPLETED_INITIAL_MAP_LOAD, value }),
		}),
		[resetExplorePresentation],
	);

	return {
		state,
		actions,
	};
}

export default useMapExploreFlowStore;
