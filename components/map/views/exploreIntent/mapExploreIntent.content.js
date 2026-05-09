import {
	MAP_VIEWPORT_VARIANTS,
	getMapViewportVariant,
} from "../../core/mapViewportConfig";

export const MAP_INTENT_VARIANTS = MAP_VIEWPORT_VARIANTS;
export const getMapIntentVariant = getMapViewportVariant;

export const MAP_EXPLORE_INTENT_COPY = {
	SEARCH: "iVisit Maps",
	TERMS: "Terms of Service",
	NEAREST_HOSPITAL: "Nearby now",
	NEARBY_CARE: "Nearby care",
	WIDER_CARE: "Wider area",
	CHOOSE_CARE: "Choose care",
	AMBULANCE: "Ambulance",
	BED_SPACE: "Bed space",
	COMPARE: "Compare",
	COMPARE_SUBTEXT: "All options",
	FINDING_NEAREST_HOSPITAL: "Finding care",
	FINDING_NEARBY_HOSPITAL: "Finding care",
	TAP_TO_SEE_HOSPITALS: "See nearby hospitals",
	SEE_NEARBY_HOSPITALS: "See nearby hospitals",
	SEE_WIDER_HOSPITALS: "See wider-area hospitals",
	SHOWING_WIDER_OPTIONS: "Showing wider options",
	NEARBY_HELP: "Nearby help",
	WIDER_HELP: "Wider support",
	NEARBY_BEDS: "Nearby beds",
	NOW: "Now",
};

export const MAP_EXPLORE_INTENT_RAIL = {
	sidePadding: 14,
	gap: 10,
	peek: 28,
};
