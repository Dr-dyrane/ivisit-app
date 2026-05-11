import { atom } from "jotai";

// PULLBACK NOTE: [LS-1/LS-2/LS-4]
// OLD: selectedLocation, pendingPlaceLabel, savedPlaceFeedback, pendingSaveCategory,
//      saveDetailsDraft, isConfirmingSavedRemove all lived as useState in MapLocationIntentStageBase.
// NEW: Jotai atoms — survive snap collapse, Metro remount, and background/foreground transitions.
//      Reset explicitly on returnToDefault / sheet close, never via component unmount.

// Active address candidate produced by search, manual, saved, recent, or pin sources.
// null = no candidate in flight.
export const locationCandidateAtom = atom(null);

// Save flow state — all fields that must survive sheet snap collapse during save flows.
export const locationSaveFlowAtom = atom({
	pendingPlaceLabel: null,
	pendingSaveCategory: null,
	savedPlaceFeedback: null,
	isConfirmingSavedRemove: false,
	saveDetailsDraft: {
		label: "",
		unit: "",
		responderNote: "",
	},
});

// Derived reset helper — call this on returnToDefault or explicit sheet close.
// Returns the reset payload so callers can use it in a single setAtom call.
export const LOCATION_SAVE_FLOW_RESET = Object.freeze({
	pendingPlaceLabel: null,
	pendingSaveCategory: null,
	savedPlaceFeedback: null,
	isConfirmingSavedRemove: false,
	saveDetailsDraft: {
		label: "",
		unit: "",
		responderNote: "",
	},
});
