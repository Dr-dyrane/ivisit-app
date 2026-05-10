/**
 * Helper functions for MapLocationIntent business logic
 */
import {
	getSavedAddressDisplayLabel,
	getSavedAddressKey,
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
	return (Array.isArray(savedLocations) ? savedLocations : [])
		.filter((item) => item && getSavedLocationKey(item) === null)
		.slice(0, 6)
		.map((item) => ({
			...item,
			label: getSavedAddressDisplayLabel(item, "Recent pickup"),
			kindLabel: "Pickup",
		}));
}

export function mapStoredLocationToCandidate(location, fallbackLabel = "Saved place") {
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
		getManualDraftValue(manualDraft, "streetAddress"),
		getManualDraftValue(manualDraft, "city"),
		getManualDraftValue(manualDraft, "stateRegion"),
		getManualDraftValue(manualDraft, "country"),
	].filter(Boolean);
}

export function buildManualAddressLabel(manualDraft = {}) {
	return (
		getManualDraftValue(manualDraft, "streetAddress") ||
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
	if (step.key === "streetAddress") return "Add a street address, place name, or landmark.";
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
