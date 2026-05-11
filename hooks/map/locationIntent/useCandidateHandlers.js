// PULLBACK NOTE: [X-3] Extracted from MapLocationIntentStageBase.jsx
// OLD: commitLocation + 11 candidate/save useCallback blocks inline in StageBase.
// NEW: single hook call; state (pendingSaveCategory, saveDetailsDraft, etc.) stays
//      in useSavedAddressActions in StageBase; setters are passed as params.

import { useCallback } from "react";
import { MAP_SHEET_SNAP_STATES } from "../../../components/map/core/mapSheet.constants";
import { LOCATION_INTENT_MODES } from "../../../components/map/views/locationIntent/mapLocationIntent.model";
import {
	getSaveCategoryAction,
	getSavedLocationKey,
	mapStoredLocationToCandidate,
} from "../../../components/map/views/locationIntent/mapLocationIntent.helpers";
import { mapSuggestionToLocation } from "../../../components/map/surfaces/search/mapSearchSheet.helpers";
import { mapCandidateToPickupPayload } from "../../../services/locationAddressService";

export default function useCandidateHandlers({
	// location + candidate
	buildSelectedLocation,
	setActiveCandidate,
	currentLocation,
	selectedLocation,
	// save flow state + setters (from useSavedAddressActions)
	pendingPlaceLabel,
	pendingSaveCategory,
	saveDetailsDraft,
	isConfirmingSavedRemove,
	setPendingPlaceLabel,
	setPendingSaveCategory,
	setSavedPlaceFeedback,
	setSaveDetailsDraft,
	setIsConfirmingSavedRemove,
	saveSelectedLocationAs,
	removeSavedEntry,
	markSavedAsUsed,
	// search
	commitSearchQuery,
	setLocationSearchError,
	// navigation
	mode,
	navigateToConfirm,
	navigateToCandidateDecision,
	navigateToSaveDetails,
	navigateToSavedManage,
	navigateToDefaultAndClearSearch,
	replaceNavigationStack,
	// snap + close
	onSnapStateChange,
	onSelectLocation,
	onClose,
	// recents write
	addToRecents,
	// model flags
	requiresLocationSelection,
	shouldOpenSettings,
	onUseCurrentLocation,
}) {
	const commitLocation = useCallback(
		(nextSelection) => {
			if (!nextSelection) return;
			const pickupPayload = mapCandidateToPickupPayload(nextSelection);
			if (!pickupPayload) return;
			onSelectLocation?.(pickupPayload);
			if (["manual", "search", "recent", "saved", "visit", "pin"].includes(nextSelection.source)) {
				addToRecents?.({
					label: nextSelection.label || "Recent pickup",
					category: "recent",
					address: nextSelection.address,
					latitude: nextSelection.coords.latitude,
					longitude: nextSelection.coords.longitude,
					countryCode: nextSelection.countryCode || null,
					unit: nextSelection.unit || null,
					responderNote: nextSelection.responderNote || null,
					source: "recent",
					recentSource: nextSelection.source,
					sourceSavedAddressId: nextSelection.source === "saved" ? nextSelection.id || null : null,
					usage: {
						lastUsedAt: Date.now(),
						useCount: 1,
					},
				});
			}
			onClose?.();
		},
		[addToRecents, onClose, onSelectLocation],
	);

	const handleUseCurrentLocationCandidate = useCallback(() => {
		if (requiresLocationSelection || shouldOpenSettings) {
			onUseCurrentLocation?.();
			return;
		}
		const normalized = buildSelectedLocation({
			source: "current",
			label: currentLocation?.primaryText || "Current location",
			address: currentLocation?.secondaryText || currentLocation?.formattedAddress || "",
			coords: currentLocation?.location || currentLocation,
			countryCode: currentLocation?.countryCode || null,
			confidence: "high",
		});
		if (!normalized) return;
		setActiveCandidate(normalized);
		navigateToConfirm();
	}, [
		buildSelectedLocation,
		currentLocation,
		navigateToConfirm,
		onUseCurrentLocation,
		requiresLocationSelection,
		setActiveCandidate,
		shouldOpenSettings,
	]);

	const handlePickSearchResult = useCallback(
		(item) => {
			const mapped = mapSuggestionToLocation(item);
			const candidateCoords = mapped?.location || item.location || {};
			const latitude = Number(candidateCoords.latitude);
			const longitude = Number(candidateCoords.longitude);
			if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
				setLocationSearchError("We couldn't place that address yet. Try another result.");
				return;
			}
			const normalized = buildSelectedLocation({
				source: "search",
				label: mapped?.primaryText || item.primaryText || "Selected place",
				address:
					mapped?.formattedAddress ||
					mapped?.secondaryText ||
					item.formattedAddress ||
					item.secondaryText ||
					"",
				coords: { latitude, longitude },
				countryCode: mapped?.countryCode || item.countryCode || null,
				confidence: "high",
				pendingPlaceLabel,
			});
			setActiveCandidate(normalized);
			commitSearchQuery(normalized.label);
			navigateToCandidateDecision();
			onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
		},
		[buildSelectedLocation, commitSearchQuery, navigateToCandidateDecision, onSnapStateChange, pendingPlaceLabel, setActiveCandidate, setLocationSearchError],
	);

	const returnToCandidateDecision = useCallback(() => {
		const nextMode =
			selectedLocation?.source === "current" || selectedLocation?.source === "pin"
				? LOCATION_INTENT_MODES.CONFIRM
				: LOCATION_INTENT_MODES.CANDIDATE_DECISION;
		replaceNavigationStack(nextMode, []);
	}, [replaceNavigationStack, selectedLocation?.source]);

	const handleSaveSelectedLocationAs = useCallback(
		async (label) => {
			if (await saveSelectedLocationAs(label)) {
				returnToCandidateDecision();
			}
		},
		[returnToCandidateDecision, saveSelectedLocationAs],
	);

	const handleSelectSaveCategory = useCallback(
		async (category) => {
			const action = getSaveCategoryAction(category);
			if (!action) return;
			if (!action.requiresDetails) {
				await handleSaveSelectedLocationAs(action.category);
				return;
			}
			setPendingSaveCategory(action.category);
			setSaveDetailsDraft({
				label: selectedLocation?.label || selectedLocation?.address || action.label,
				unit: selectedLocation?.unit || "",
				responderNote: selectedLocation?.responderNote || "",
			});
			navigateToSaveDetails();
		},
		[handleSaveSelectedLocationAs, navigateToSaveDetails, selectedLocation, setPendingSaveCategory, setSaveDetailsDraft],
	);

	const openSavedLocationManage = useCallback(
		(place) => {
			const candidate = mapStoredLocationToCandidate(place.location, place.label);
			if (!candidate) return;
			setPendingPlaceLabel(null);
			setPendingSaveCategory(null);
			setSavedPlaceFeedback(null);
			setIsConfirmingSavedRemove(false);
			const normalized = buildSelectedLocation({
				...candidate,
				source: "saved",
				confidence: "high",
			});
			if (!normalized) return;
			setActiveCandidate(normalized);
			navigateToSavedManage();
		},
		[buildSelectedLocation, navigateToSavedManage, setActiveCandidate, setIsConfirmingSavedRemove, setPendingPlaceLabel, setPendingSaveCategory, setSavedPlaceFeedback],
	);

	const handleEditSavedLocationDetails = useCallback(() => {
		if (!selectedLocation?.id) return;
		const category = getSavedLocationKey(selectedLocation) || selectedLocation.category || "other";
		setPendingSaveCategory(category);
		setSaveDetailsDraft({
			label: selectedLocation.label || selectedLocation.address || "Saved place",
			unit: selectedLocation.unit || "",
			responderNote: selectedLocation.responderNote || "",
		});
		setIsConfirmingSavedRemove(false);
		navigateToSaveDetails();
	}, [navigateToSaveDetails, selectedLocation, setIsConfirmingSavedRemove, setPendingSaveCategory, setSaveDetailsDraft]);

	const handleRemoveSavedLocation = useCallback(async () => {
		if (!selectedLocation?.id) return;
		if (!isConfirmingSavedRemove) {
			setIsConfirmingSavedRemove(true);
			return;
		}
		if (await removeSavedEntry(selectedLocation.id)) {
			navigateToDefaultAndClearSearch();
		}
	}, [
		isConfirmingSavedRemove,
		navigateToDefaultAndClearSearch,
		removeSavedEntry,
		selectedLocation?.id,
		setIsConfirmingSavedRemove,
	]);

	const handleSavedManageAction = useCallback(
		async (action) => {
			if (!action) return;
			if (action.type === "pickup") {
				if (selectedLocation?.id) {
					markSavedAsUsed(selectedLocation.id);
				}
				commitLocation(selectedLocation);
				return;
			}
			if (action.type === "edit") {
				handleEditSavedLocationDetails();
				return;
			}
			if (action.type === "remove") {
				await handleRemoveSavedLocation();
			}
		},
		[
			commitLocation,
			handleEditSavedLocationDetails,
			handleRemoveSavedLocation,
			markSavedAsUsed,
			selectedLocation,
		],
	);

	const handleSaveDetailsDraftChange = useCallback((key, value) => {
		setSaveDetailsDraft({ [key]: value });
	}, [setSaveDetailsDraft]);

	const handleConfirmSaveDetails = useCallback(async () => {
		const category = pendingSaveCategory || "other";
		const savedLocationId =
			mode === LOCATION_INTENT_MODES.SAVE_DETAILS && selectedLocation?.source === "saved"
				? selectedLocation.id
				: null;
		if (
			await saveSelectedLocationAs(category, {
				label: saveDetailsDraft.label,
				unit: saveDetailsDraft.unit,
				responderNote: saveDetailsDraft.responderNote,
				savedLocationId,
			})
		) {
			if (savedLocationId) {
				replaceNavigationStack(LOCATION_INTENT_MODES.SAVED_MANAGE, []);
				return;
			}
			returnToCandidateDecision();
		}
	}, [
		mode,
		pendingSaveCategory,
		replaceNavigationStack,
		returnToCandidateDecision,
		saveDetailsDraft.label,
		saveDetailsDraft.responderNote,
		saveDetailsDraft.unit,
		saveSelectedLocationAs,
		selectedLocation?.id,
		selectedLocation?.source,
	]);

	return {
		commitLocation,
		handleUseCurrentLocationCandidate,
		handlePickSearchResult,
		returnToCandidateDecision,
		handleSaveSelectedLocationAs,
		handleSelectSaveCategory,
		openSavedLocationManage,
		handleEditSavedLocationDetails,
		handleRemoveSavedLocation,
		handleSavedManageAction,
		handleSaveDetailsDraftChange,
		handleConfirmSaveDetails,
	};
}
