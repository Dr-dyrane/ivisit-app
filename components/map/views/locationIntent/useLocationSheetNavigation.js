import { useCallback, useMemo, useReducer } from "react";
import { LOCATION_INTENT_MODES } from "./mapLocationIntent.model";

const NAV_ACTIONS = Object.freeze({
	PUSH: "push",
	REPLACE: "replace",
	REPLACE_STACK: "replaceStack",
	RESET: "reset",
	BACK: "back",
});

const createInitialState = () => ({
	mode: LOCATION_INTENT_MODES.DEFAULT,
	stack: [],
});

// Rollback note: this reducer is the LocationSheet equivalent of the tracking
// phase lessons. Keep product navigation here so future search/save/manual
// passes do not scatter `setMode` calls through render components.
function locationSheetNavigationReducer(state, action) {
	switch (action.type) {
		case NAV_ACTIONS.PUSH: {
			const nextMode = action.mode || LOCATION_INTENT_MODES.DEFAULT;
			if (nextMode === state.mode) return state;
			const shouldStackCurrent = state.mode !== LOCATION_INTENT_MODES.DEFAULT;
			return {
				mode: nextMode,
				stack: shouldStackCurrent ? [...state.stack, state.mode] : state.stack,
			};
		}
		case NAV_ACTIONS.REPLACE:
			return {
				...state,
				mode: action.mode || LOCATION_INTENT_MODES.DEFAULT,
			};
		case NAV_ACTIONS.REPLACE_STACK:
			return {
				mode: action.mode || LOCATION_INTENT_MODES.DEFAULT,
				stack: Array.isArray(action.stack) ? action.stack : [],
			};
		case NAV_ACTIONS.BACK: {
			if (!state.stack.length) {
				return createInitialState();
			}
			const nextStack = state.stack.slice(0, -1);
			return {
				mode: state.stack[state.stack.length - 1] || LOCATION_INTENT_MODES.DEFAULT,
				stack: nextStack,
			};
		}
		case NAV_ACTIONS.RESET:
			return createInitialState();
		default:
			return state;
	}
}

export default function useLocationSheetNavigation({ onResetToDefault } = {}) {
	const [state, dispatch] = useReducer(locationSheetNavigationReducer, undefined, createInitialState);

	const openMode = useCallback((mode) => {
		dispatch({ type: NAV_ACTIONS.PUSH, mode });
	}, []);

	const replaceMode = useCallback((mode) => {
		dispatch({ type: NAV_ACTIONS.REPLACE, mode });
	}, []);

	const replaceModeStack = useCallback((mode, stack = []) => {
		dispatch({ type: NAV_ACTIONS.REPLACE_STACK, mode, stack });
	}, []);

	const returnToDefault = useCallback(() => {
		dispatch({ type: NAV_ACTIONS.RESET });
		onResetToDefault?.();
	}, [onResetToDefault]);

	const goBack = useCallback(() => {
		dispatch({ type: NAV_ACTIONS.BACK });
	}, []);

	const openAddressSearch = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.ADDRESS_SEARCH);
	}, [openMode]);

	const openManualStep = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.MANUAL_STEP);
	}, [openMode]);

	const openConfirm = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.CONFIRM);
	}, [openMode]);

	const openCandidateDecision = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.CANDIDATE_DECISION);
	}, [openMode]);

	const openPinAdjust = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.PIN_ADJUST);
	}, [openMode]);

	const openSaveCategory = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.SAVE_CATEGORY);
	}, [openMode]);

	const openSaveDetails = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.SAVE_DETAILS);
	}, [openMode]);

	const openSavedManage = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.SAVED_MANAGE);
	}, [openMode]);

	const openPlacesHub = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.PLACES_HUB);
	}, [openMode]);

	const openRecentsHub = useCallback(() => {
		openMode(LOCATION_INTENT_MODES.RECENTS_HUB);
	}, [openMode]);

	return useMemo(
		() => ({
			mode: state.mode,
			stack: state.stack,
			canGoBack: state.mode !== LOCATION_INTENT_MODES.DEFAULT,
			isSearchMode: state.mode === LOCATION_INTENT_MODES.ADDRESS_SEARCH,
			isDefaultMode: state.mode === LOCATION_INTENT_MODES.DEFAULT,
			openAddressSearch,
			openManualStep,
			openConfirm,
			openCandidateDecision,
			openPinAdjust,
			openSaveCategory,
			openSaveDetails,
			openSavedManage,
			openPlacesHub,
			openRecentsHub,
			replaceMode,
			replaceModeStack,
			returnToDefault,
			goBack,
		}),
		[
			goBack,
			openAddressSearch,
			openConfirm,
			openManualStep,
			openPinAdjust,
			openCandidateDecision,
			openSaveCategory,
			openSaveDetails,
			openSavedManage,
			openPlacesHub,
			openRecentsHub,
			replaceMode,
			replaceModeStack,
			returnToDefault,
			state.mode,
			state.stack,
		],
	);
}
