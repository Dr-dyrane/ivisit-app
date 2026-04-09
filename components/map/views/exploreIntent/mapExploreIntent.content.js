import { Platform } from "react-native";
import {
	BREAKPOINTS,
	DEVICE_BREAKPOINTS,
	WELCOME_WEB_BREAKPOINTS,
} from "../../../../constants/breakpoints";

export const MAP_INTENT_VARIANTS = {
	ANDROID_MOBILE: "android_mobile",
	ANDROID_FOLD: "android_fold",
	ANDROID_TABLET: "android_tablet",
	ANDROID_CHROMEBOOK: "android_chromebook",
	IOS_MOBILE: "ios_mobile",
	IOS_PAD: "ios_pad",
	WEB_MOBILE: "web_mobile",
	WEB_SM_WIDE: "web_sm_wide",
	WEB_MD: "web_md",
	MACBOOK: "macbook",
	WEB_LG: "web_lg",
	WEB_XL: "web_xl",
	WEB_2XL_3XL: "web_2xl_3xl",
	WEB_ULTRA_WIDE: "web_ultra_wide",
};

export function getMapIntentVariant({ platform = Platform.OS, width = 0 }) {
	const isWeb = platform === "web";

	if (platform === "android") {
		if (width >= BREAKPOINTS.xl) return MAP_INTENT_VARIANTS.ANDROID_CHROMEBOOK;
		if (width >= DEVICE_BREAKPOINTS.androidTablet) return MAP_INTENT_VARIANTS.ANDROID_TABLET;
		if (width >= DEVICE_BREAKPOINTS.androidFold) return MAP_INTENT_VARIANTS.ANDROID_FOLD;
		return MAP_INTENT_VARIANTS.ANDROID_MOBILE;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.ultraWideMin) {
		return MAP_INTENT_VARIANTS.WEB_ULTRA_WIDE;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.twoXlMin) {
		return MAP_INTENT_VARIANTS.WEB_2XL_3XL;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.xlMin) {
		return MAP_INTENT_VARIANTS.WEB_XL;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.lgMin) {
		return MAP_INTENT_VARIANTS.WEB_LG;
	}

	if (width >= DEVICE_BREAKPOINTS.nativeDesktop) {
		return MAP_INTENT_VARIANTS.MACBOOK;
	}

	if (width >= BREAKPOINTS.md) {
		if (platform === "ios") return MAP_INTENT_VARIANTS.IOS_PAD;
		if (isWeb) return MAP_INTENT_VARIANTS.WEB_MD;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.smWideMin) {
		return MAP_INTENT_VARIANTS.WEB_SM_WIDE;
	}

	if (width < BREAKPOINTS.md) {
		if (platform === "ios") return MAP_INTENT_VARIANTS.IOS_MOBILE;
		if (platform === "android") return MAP_INTENT_VARIANTS.ANDROID_MOBILE;
		if (isWeb) return MAP_INTENT_VARIANTS.WEB_MOBILE;
	}

	return MAP_INTENT_VARIANTS.IOS_MOBILE;
}

export const MAP_EXPLORE_INTENT_COPY = {
	SEARCH: "Search",
	TERMS: "Terms & conditions",
	NEAREST_HOSPITAL: "Nearest hospital",
	NEARBY_CARE: "Nearby care",
	CHOOSE_CARE: "Choose care",
	AMBULANCE: "Ambulance",
	BED_SPACE: "Bed space",
	COMPARE: "Compare",
	COMPARE_SUBTEXT: "All options",
	FINDING_NEAREST_HOSPITAL: "Finding nearest hospital",
	FINDING_NEARBY_HOSPITAL: "Finding nearby hospital",
	TAP_TO_SEE_HOSPITALS: "Tap to see nearby hospitals",
	SEE_NEARBY_HOSPITALS: "See nearby hospitals",
	NEARBY_HELP: "Nearby help",
	NEARBY_BEDS: "Nearby beds",
	NOW: "Now",
};

export const MAP_EXPLORE_INTENT_ASSETS = {
	featuredHospitalImage: require("../../../../assets/features/emergency.png"),
};

export const MAP_EXPLORE_INTENT_RAIL = {
	sidePadding: 24,
	gap: 10,
	peek: 16,
};
