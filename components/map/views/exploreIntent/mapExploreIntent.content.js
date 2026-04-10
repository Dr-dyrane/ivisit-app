import {
	MAP_VIEWPORT_VARIANTS,
	getMapViewportVariant,
} from "../../mapViewportConfig";

export const MAP_INTENT_VARIANTS = MAP_VIEWPORT_VARIANTS;
export const getMapIntentVariant = getMapViewportVariant;

export const MAP_EXPLORE_INTENT_COPY = {
	SEARCH: "Search care",
	TERMS: "Terms",
	NEAREST_HOSPITAL: "Nearby now",
	NEARBY_CARE: "Nearby care",
	CHOOSE_CARE: "Choose care",
	AMBULANCE: "Ambulance",
	BED_SPACE: "Bed space",
	COMPARE: "Compare",
	COMPARE_SUBTEXT: "All options",
	FINDING_NEAREST_HOSPITAL: "Finding nearby care",
	FINDING_NEARBY_HOSPITAL: "Finding care",
	TAP_TO_SEE_HOSPITALS: "See nearby hospitals",
	SEE_NEARBY_HOSPITALS: "See nearby hospitals",
	NEARBY_HELP: "Nearby help",
	NEARBY_BEDS: "Nearby beds",
	NOW: "Now",
};

export const MAP_EXPLORE_INTENT_RAIL = {
	sidePadding: 18,
	gap: 12,
	peek: 18,
};
