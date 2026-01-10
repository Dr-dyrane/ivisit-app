import { Dimensions } from "react-native";

const windowHeight = Dimensions.get("window").height;

export const EMERGENCY_ANIMATIONS = {
	SHEET_SNAP_DURATION: 300,
	HOSPITAL_SELECT: {
		duration: 300,
		easing: [0.21, 0.47, 0.32, 0.98],
	},
	BOTTOM_SHEET: {
		snapPoints: [
			windowHeight * 0.15,
			windowHeight * 0.5,
			windowHeight * 0.92,
		],
		snapIndexes: {
			COLLAPSED: 0,
			HALF: 1,
			EXPANDED: 2,
		},
	},
	MAP_PADDING: {
		collapsed: windowHeight * 0.15,
		half: windowHeight * 0.5,
		expanded: windowHeight * 0.92,
		selected: windowHeight * 0.5,
	},
};

export const getMapPaddingForSnapIndex = (snapIndex, selectedHospital = false) => {
	const { MAP_PADDING } = EMERGENCY_ANIMATIONS;

	if (selectedHospital) return MAP_PADDING.selected;

	switch (snapIndex) {
		case 0:
			return MAP_PADDING.collapsed;
		case 1:
			return MAP_PADDING.half;
		case 2:
			return MAP_PADDING.expanded;
		default:
			return MAP_PADDING.half;
	}
};

export const HAPTICS_PATTERNS = {
	LIGHT_SELECT: "Light",
	SUCCESS: "Success",
	WARNING: "Warning",
	ERROR: "Error",
};

export const ANIMATION_TIMINGS = {
	QUICK: 150,
	NORMAL: 300,
	SLOW: 500,
};
