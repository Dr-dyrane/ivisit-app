/**
 * Helper functions for MapLocationIntent business logic
 */

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
