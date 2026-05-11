/**
 * Helper functions for MapLocationIntent business logic
 */
import {
	getSavedAddressCategoryMeta,
	getSavedAddressDisplayLabel,
	getSavedAddressKey,
	isSameSavedAddress,
	normalizeAddressCandidate,
	normalizeAddressCategory,
} from "../../../../services/locationAddressService";

/**
 * Calculate orb hierarchy based on location state and position
 * @param {Object} place - Place object with key, hasLocation
 * @param {number} index - Index in the places array
 * @param {Array} savedPlaces - Full saved places array
 * @returns {string} Hierarchy value: "primary", "secondary", or "tertiary"
 */
export function getPlaceOrbHierarchy(place, index, savedPlaces) {
	const isAdd = place.key === "add";
	const hasLocation = place.hasLocation;

	// Find first orb that needs "Add" as CTA (hasLocation false, not the Add button)
	const firstAddIndex = savedPlaces.findIndex((p) => p.key !== "add" && !p.hasLocation);

	if (isAdd) {
		// Add button: primary only if no other orbs need Add
		return firstAddIndex === -1 ? "primary" : "tertiary";
	}

	if (hasLocation) {
		// Already set, not a CTA
		return "tertiary";
	}

	// Needs Add: first orb is primary, others secondary
	return index === firstAddIndex ? "primary" : "secondary";
}

/**
 * Calculate orb subtext based on location state
 * @param {Object} place - Place object with key, hasLocation
 * @returns {string} Subtext value
 */
export function getPlaceOrbSubtext(place) {
	const isAdd = place.key === "add";
	const hasLocation = place.hasLocation;

	if (isAdd) {
		return "";
	}

	return hasLocation ? "Close by" : "Add";
}

export function getSavedLocationKey(locationOrLabel) {
	if (typeof locationOrLabel === "object" && locationOrLabel !== null) {
		return getSavedAddressKey(locationOrLabel);
	}
	return getSavedAddressKey({
		label: locationOrLabel,
		category: normalizeAddressCategory(locationOrLabel, null),
	});
}

export function buildLocationIntentSavedPlaces(savedLocations = []) {
	const safeLocations = Array.isArray(savedLocations) ? savedLocations : [];
	const byKey = new Map();

	for (const item of safeLocations) {
		const key = getSavedLocationKey(item);
		if (!key || byKey.has(key)) continue;
		byKey.set(key, item);
	}

	return [
		{
			key: "home",
			label: "Home",
			hasLocation: byKey.has("home"),
			location: byKey.get("home") || null,
		},
		{
			key: "work",
			label: "Work",
			hasLocation: byKey.has("work"),
			location: byKey.get("work") || null,
		},
		{ key: "add", label: "Add", hasLocation: false, location: null },
	];
}

export function buildLocationIntentRecents(savedLocations = []) {
	const safeLocations = Array.isArray(savedLocations) ? savedLocations : [];
	const savedPlaceLocations = safeLocations.filter((item) => {
		if (!item) return false;
		const category = normalizeAddressCategory(item.category || item.label, null);
		const source = String(item.source || "").trim().toLowerCase();
		const rawLabel = String(item.label || "").trim().toLowerCase();
		return category && category !== "recent" && source !== "recent" && rawLabel !== "recent";
	});

	return safeLocations
		.filter((item) => {
			if (!item || getSavedLocationKey(item) !== null) return false;
			const category = normalizeAddressCategory(item.category || item.label, null);
			const source = String(item.source || "").trim().toLowerCase();
			const rawLabel = String(item.label || "").trim().toLowerCase();

			// Rollback note: Recents are pickup memory, not the overflow bucket for
			// saved-place categories. Keep Family/School/etc. out of this list so
			// saved-place management owns saved identities.
			if (!(category === "recent" || source === "recent" || rawLabel === "recent")) {
				return false;
			}

			return !savedPlaceLocations.some((savedPlace) => isSameSavedAddress(savedPlace, item));
		})
		.sort((left, right) => {
			const leftTime = Number(
				left?.usage?.lastUsedAt || left?.lastUsedAt || left?.updatedAt || left?.createdAt || 0,
			);
			const rightTime = Number(
				right?.usage?.lastUsedAt || right?.lastUsedAt || right?.updatedAt || right?.createdAt || 0,
			);
			return rightTime - leftTime;
		})
		.slice(0, 6)
		.map((item) => ({
			...item,
			label: getSavedAddressDisplayLabel(item, "Recent pickup"),
			kindLabel: "Recent Pickup",
		}));
}

export function buildLocationIntentManagedSavedPlaces(savedLocations = []) {
	return (Array.isArray(savedLocations) ? savedLocations : [])
		.filter((item) => {
			if (!item) return false;
			if (getSavedLocationKey(item)) return false;
			const category = normalizeAddressCategory(item.category || item.label, null);
			const source = String(item.source || "").trim().toLowerCase();
			const rawLabel = String(item.label || "").trim().toLowerCase();
			return category && category !== "recent" && source !== "recent" && rawLabel !== "recent";
		})
		.slice(0, 6)
		.map((item) => {
			const category = normalizeAddressCategory(item.category || item.label, "other");
			const meta = getSavedAddressCategoryMeta(category);
			return {
				...item,
				id: item.id || `${category}-${item.address || item.label || "saved-place"}`,
				requestType: "visit",
				title: getSavedAddressDisplayLabel(item, meta.label),
				subtitle: item.address || "",
				timeLabel: "",
				statusLabel: meta.label,
				statusTone: "default",
			};
		});
}

export function mapStoredLocationToCandidate(location, fallbackLabel = "Saved place") {
	// Guard: location is null for empty Home/Work slots (hasLocation: false)
	// Callers handle null return via: if (!candidate) { setPendingPlaceLabel; openAddressSearch; }
	if (!location) return null;
	return normalizeAddressCandidate(
		{
			...location,
			label: getSavedAddressDisplayLabel(location, fallbackLabel),
			source: location?.source || "saved",
			confidence: location?.confidence || "high",
		},
		{ fallbackLabel, source: "saved", confidence: "high" },
	);
}

export function getManualDraftValue(manualDraft = {}, stepKey) {
	return String(manualDraft?.[stepKey] || "").trim();
}

export function buildManualAddressParts(manualDraft = {}) {
	return [
		getManualDraftValue(manualDraft, "placeOrAddress"),
		getManualDraftValue(manualDraft, "districtArea"),
		getManualDraftValue(manualDraft, "city"),
		getManualDraftValue(manualDraft, "adminArea"),
		getManualDraftValue(manualDraft, "country"),
	].filter(Boolean);
}

export function buildManualAddressLabel(manualDraft = {}) {
	return (
		getManualDraftValue(manualDraft, "placeOrAddress") ||
		getManualDraftValue(manualDraft, "city") ||
		"Manual pickup"
	);
}

export function validateManualLocationStep(step, manualDraft = {}) {
	if (!step?.required) return null;
	const value = getManualDraftValue(manualDraft, step.key);
	if (value) return null;

	if (step.key === "country") return "Choose a country or region first.";
	if (step.key === "city") return "Add the city for this pickup.";
	if (step.key === "placeOrAddress") return "Add a street, landmark, or nearby place name.";
	return "Add this detail before continuing.";
}

export function getManualStepActionLabel({
	step,
	stepIndex,
	stepCount,
	manualDraft,
	isResolving,
} = {}) {
	if (isResolving) return "Checking";
	const value = getManualDraftValue(manualDraft, step?.key);
	if (step?.optional && !value) return "Skip";
	return stepIndex >= stepCount - 1 ? "Review pickup" : "Next";
}

export function buildSaveCategoryActions() {
	// Rollback note: category choice belongs to the sheet phase, not a separate
	// modal. Home/Work remain fast identity slots; the rest are saved-place
	// families that preserve the candidate label.
	return [
		{
			id: "save-home",
			label: "Home",
			iconName: "home-outline",
			tone: "home",
			category: "home",
			requiresDetails: false,
		},
		{
			id: "save-work",
			label: "Work",
			iconName: "briefcase-outline",
			tone: "work",
			category: "work",
			requiresDetails: false,
		},
		{
			id: "save-family",
			label: "Family",
			iconName: "people-outline",
			tone: "family",
			category: "family",
			requiresDetails: true,
		},
		{
			id: "save-school",
			label: "School",
			iconName: "school-outline",
			tone: "school",
			category: "school",
			requiresDetails: true,
		},
		{
			id: "save-pharmacy",
			label: "Pharmacy",
			iconName: "medkit-outline",
			tone: "pharmacy",
			category: "pharmacy",
			requiresDetails: true,
		},
		{
			id: "save-care",
			label: "Care",
			iconName: "medical-outline",
			tone: "care",
			category: "care",
			requiresDetails: true,
		},
		{
			id: "save-other",
			label: "Other",
			iconName: "bookmark-outline",
			tone: "saved",
			category: "other",
			requiresDetails: true,
		},
	];
}

export function getSaveCategoryAction(category) {
	const normalizedCategory = normalizeAddressCategory(category, "other");
	return buildSaveCategoryActions().find((action) => action.category === normalizedCategory) || null;
}

export function buildSavedPlaceManageActions({ confirmRemove = false } = {}) {
	return [
		{
			id: "useSavedAsPickup",
			label: "Use as Pickup",
			iconName: "navigate-circle-outline",
			tone: "pickup",
			type: "pickup",
		},
		{
			id: "editSavedDetails",
			label: "Edit Details",
			iconName: "create-outline",
			tone: "saved",
			type: "edit",
		},
		{
			id: "removeSavedPlace",
			label: confirmRemove ? "Confirm Remove" : "Remove",
			iconName: confirmRemove ? "trash" : "trash-outline",
			tone: "danger",
			type: "remove",
		},
	];
}

export function buildCandidateDecisionActions({
	selectedLocation,
	pendingPlaceLabel,
	savedPlaceFeedback,
	canFindNearby = false,
} = {}) {
	// Rollback note: keep the selected-address decision tree data-only so the
	// sheet can swap row styling without leaking save/pickup branching into JSX.
	const actions = [];
	const source = selectedLocation?.source;
	const canSaveCandidate = ["manual", "search", "recent", "visit"].includes(source);
	const pendingTitle =
		pendingPlaceLabel === "home"
			? "Set as Home"
			: pendingPlaceLabel === "work"
				? "Set as Work"
				: pendingPlaceLabel === "other"
					? "Save Place"
					: null;
	const savedPlaceText =
		savedPlaceFeedback === "home"
			? "Saved Home"
			: savedPlaceFeedback === "work"
				? "Saved Work"
				: savedPlaceFeedback
					? "Saved Place"
					: null;

	actions.push({
		id: pendingPlaceLabel ? `save-${pendingPlaceLabel}` : "useAsPickup",
		label: pendingTitle || "Use as Pickup",
		iconName: pendingPlaceLabel ? "bookmark-outline" : "navigate-circle-outline",
		tone: pendingPlaceLabel ? "saved" : "pickup",
		type: pendingPlaceLabel === "other" ? "saveCategory" : pendingPlaceLabel ? "save" : "pickup",
		saveLabel: pendingPlaceLabel || null,
	});

	if (canSaveCandidate && !savedPlaceText) {
		actions.push(
			{
				id: "setHome",
				label: "Set as Home",
				iconName: "home-outline",
				tone: "home",
				type: "save",
				saveLabel: "home",
			},
			{
				id: "setWork",
				label: "Set as Work",
				iconName: "briefcase-outline",
				tone: "work",
				type: "save",
				saveLabel: "work",
			},
			{
				id: "savePlace",
				label: "Save Place",
				iconName: "bookmark-outline",
				tone: "saved",
				type: "saveCategory",
				saveLabel: "other",
			},
		);
	}

	if (savedPlaceText) {
		actions.push({
			id: "savedFeedback",
			label: savedPlaceText,
			iconName: "checkmark-circle",
			tone: "success",
			type: "status",
		});
	}

	if (canSaveCandidate) {
		actions.push({
			id: "pickAnother",
			label: source === "search" ? "Back to Search" : "Choose Another Location",
			iconName: "search-outline",
			tone: "neutral",
			type: "back",
		});
	}

	// PULLBACK NOTE: [LS-6] NEW: findNearby CTA — lets user jump to hospital search
	// anchored at the confirmed candidate location without leaving the flow.
	if (canFindNearby && selectedLocation?.coords?.latitude && !pendingPlaceLabel) {
		actions.push({
			id: "findNearbyHospitals",
			label: "Find Nearby Hospitals",
			iconName: "medkit-outline",
			tone: "neutral",
			type: "findNearby",
		});
	}

	return actions;
}
