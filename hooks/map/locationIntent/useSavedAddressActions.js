import { useCallback, useMemo, useReducer } from "react";
import { useAtom } from "jotai";
import { locationSaveFlowAtom, LOCATION_SAVE_FLOW_RESET } from "../../../atoms/locationIntentAtoms";
import { useLocationStore } from "../../../stores/locationStore";
import { mapCandidateToSavedAddressPayload } from "../../../services/locationAddressService";
import { forceSyncSavedLocations } from "../../../services/savedLocationsSyncService";

// PULLBACK NOTE: [LS-2]
// OLD: addSavedLocation/updateSavedLocation/removeSavedLocation called directly from
//      MapLocationIntentStageBase with ad-hoc useState strings for feedback.
// NEW: CRUD state machine owned here. Stage base receives { save, update, remove, crudStatus }.

const CRUD_STATUS = Object.freeze({
	IDLE: "idle",
	SAVING: "saving",
	SAVED: "saved",
	FAILED: "failed",
});

const crudReducer = (state, action) => {
	switch (action.type) {
		case "SAVE_START":
			return { kind: CRUD_STATUS.SAVING, error: null };
		case "SAVE_SUCCESS":
			return { kind: CRUD_STATUS.SAVED, label: action.label, error: null };
		case "SAVE_FAILED":
			return { kind: CRUD_STATUS.FAILED, error: action.error || "Save failed." };
		case "RESET":
			return { kind: CRUD_STATUS.IDLE, error: null };
		default:
			return state;
	}
};

const createInitialCrudStatus = () => ({ kind: CRUD_STATUS.IDLE, error: null });

export default function useSavedAddressActions({ savedLocations = [], candidate = null } = {}) {
	const [saveFlow, setSaveFlow] = useAtom(locationSaveFlowAtom);
	const [crudStatus, dispatchCrud] = useReducer(crudReducer, undefined, createInitialCrudStatus);

	const addSavedLocation = useLocationStore((state) => state.addSavedLocation);
	const updateSavedLocation = useLocationStore((state) => state.updateSavedLocation);
	const removeSavedLocation = useLocationStore((state) => state.removeSavedLocation);

	const setPendingPlaceLabel = useCallback(
		(label) => setSaveFlow((prev) => ({ ...prev, pendingPlaceLabel: label })),
		[setSaveFlow],
	);
	const setPendingSaveCategory = useCallback(
		(category) => setSaveFlow((prev) => ({ ...prev, pendingSaveCategory: category })),
		[setSaveFlow],
	);
	const setSavedPlaceFeedback = useCallback(
		(feedback) => setSaveFlow((prev) => ({ ...prev, savedPlaceFeedback: feedback })),
		[setSaveFlow],
	);
	const setIsConfirmingSavedRemove = useCallback(
		(val) => setSaveFlow((prev) => ({ ...prev, isConfirmingSavedRemove: val })),
		[setSaveFlow],
	);
	const setSaveDetailsDraft = useCallback(
		(patch) =>
			setSaveFlow((prev) => ({
				...prev,
				saveDetailsDraft:
					typeof patch === "function"
						? patch(prev.saveDetailsDraft)
						: { ...prev.saveDetailsDraft, ...patch },
			})),
		[setSaveFlow],
	);
	const resetSaveFlow = useCallback(() => {
		setSaveFlow(LOCATION_SAVE_FLOW_RESET);
		dispatchCrud({ type: "RESET" });
	}, [setSaveFlow]);

	// Core save — handles Home/Work singleton upsert and generic add.
	// Returns true on success, false on validation failure.
	const save = useCallback(
		async (label, details = {}) => {
			if (!candidate || !label) return false;
			const normalizedLabel = String(label).trim().toLowerCase();
			const isCategorySlot = normalizedLabel === "home" || normalizedLabel === "work";
			const draftLabel = String(details.label || "").trim();
			const displayLabel =
				draftLabel ||
				(!isCategorySlot
					? candidate.label || candidate.address || "Saved place"
					: label);
			const savedPayload = mapCandidateToSavedAddressPayload(
				{
					...candidate,
					unit: details.unit || candidate.unit,
					responderNote: details.responderNote || candidate.responderNote,
				},
				{ label: displayLabel, category: normalizedLabel },
			);
			if (!savedPayload) return false;

			dispatchCrud({ type: "SAVE_START" });
			try {
				if (details.savedLocationId) {
					const result = updateSavedLocation?.(details.savedLocationId, savedPayload);
					if (result?.status === "invalid" || result?.status === "missing") {
						throw new Error("Saved place could not be updated.");
					}
					await forceSyncSavedLocations();
					dispatchCrud({ type: "SAVE_SUCCESS", label });
					setSavedPlaceFeedback(label);
					return true;
				}
				const existing = isCategorySlot
					? savedLocations.find(
							(item) =>
								String(item?.category || item?.label || "").toLowerCase() === normalizedLabel,
						)
					: null;
				if (existing?.id) {
					const result = updateSavedLocation?.(existing.id, savedPayload);
					if (result?.status === "invalid" || result?.status === "missing") {
						throw new Error("Saved place could not be updated.");
					}
				} else {
					const result = addSavedLocation?.(savedPayload);
					if (result?.status === "invalid") {
						throw new Error("Saved place could not be saved.");
					}
				}
				await forceSyncSavedLocations();
				dispatchCrud({ type: "SAVE_SUCCESS", label });
				setSavedPlaceFeedback(label);
				return true;
			} catch (err) {
				dispatchCrud({ type: "SAVE_FAILED", error: err?.message });
				return false;
			}
		},
		[addSavedLocation, candidate, savedLocations, setSavedPlaceFeedback, updateSavedLocation],
	);

	// Patch an existing saved location by id.
	const update = useCallback(
		async (id, patch) => {
			if (!id) return;
			dispatchCrud({ type: "SAVE_START" });
			try {
				const result = updateSavedLocation?.(id, patch);
				if (result?.status === "invalid" || result?.status === "missing") {
					throw new Error("Saved place could not be updated.");
				}
				await forceSyncSavedLocations();
				dispatchCrud({ type: "SAVE_SUCCESS", label: patch?.label || "Updated" });
			} catch (err) {
				dispatchCrud({ type: "SAVE_FAILED", error: err?.message });
			}
		},
		[updateSavedLocation],
	);

	// Remove a saved location. Two-tap confirmation is managed via isConfirmingSavedRemove atom.
	const remove = useCallback(
		async (id) => {
			if (!id) return false;
			if (!saveFlow.isConfirmingSavedRemove) {
				setIsConfirmingSavedRemove(true);
				return false;
			}
			dispatchCrud({ type: "SAVE_START" });
			try {
				removeSavedLocation?.(id);
				await forceSyncSavedLocations();
				setIsConfirmingSavedRemove(false);
				dispatchCrud({ type: "SAVE_SUCCESS", label: "removed" });
				return true;
			} catch (err) {
				dispatchCrud({ type: "SAVE_FAILED", error: err?.message });
				return false;
			}
		},
		[removeSavedLocation, saveFlow.isConfirmingSavedRemove, setIsConfirmingSavedRemove],
	);

	// Mark a saved location as used (usage count + lastUsedAt).
	const markUsed = useCallback(
		(id) => {
			if (!id) return;
			const existing = savedLocations.find((item) => item?.id === id);
			updateSavedLocation?.(id, {
				usage: {
					lastUsedAt: Date.now(),
					useCount: Number(existing?.usage?.useCount || 0) + 1,
				},
			});
		},
		[savedLocations, updateSavedLocation],
	);

	const { pendingPlaceLabel, pendingSaveCategory, savedPlaceFeedback, isConfirmingSavedRemove, saveDetailsDraft } = saveFlow;

	return useMemo(
		() => ({
			// CRUD status machine
			crudStatus,
			CRUD_STATUS,
			// Save flow atom accessors
			pendingPlaceLabel,
			pendingSaveCategory,
			savedPlaceFeedback,
			isConfirmingSavedRemove,
			saveDetailsDraft,
			// Setters
			setPendingPlaceLabel,
			setPendingSaveCategory,
			setSavedPlaceFeedback,
			setIsConfirmingSavedRemove,
			setSaveDetailsDraft,
			resetSaveFlow,
			// Actions
			save,
			update,
			remove,
			markUsed,
		}),
		[
			crudStatus,
			isConfirmingSavedRemove,
			markUsed,
			pendingPlaceLabel,
			pendingSaveCategory,
			remove,
			resetSaveFlow,
			save,
			saveDetailsDraft,
			savedPlaceFeedback,
			setIsConfirmingSavedRemove,
			setPendingPlaceLabel,
			setPendingSaveCategory,
			setSavedPlaceFeedback,
			setSaveDetailsDraft,
			update,
		],
	);
}
