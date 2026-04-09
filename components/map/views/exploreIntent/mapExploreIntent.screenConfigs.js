import { MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";

const BASE_MOBILE_SCREEN_CONFIG = {
	hospitalSummaryMode: "canonical",
	careLayoutMode: "canonical",
	presentationMode: "sheet",
	centerContent: false,
	contentMaxWidth: null,
	shellMaxWidth: null,
};

const CENTERED_MODAL_CONFIG = {
	...BASE_MOBILE_SCREEN_CONFIG,
	presentationMode: "modal",
	centerContent: true,
};

const CENTERED_PANEL_CONFIG = {
	...BASE_MOBILE_SCREEN_CONFIG,
	presentationMode: "panel",
	centerContent: true,
	careLayoutMode: "panel",
};

export function getMapExploreIntentScreenConfig(
	variant = MAP_INTENT_VARIANTS.IOS_MOBILE,
) {
	switch (variant) {
		case MAP_INTENT_VARIANTS.ANDROID_FOLD:
			return {
				...CENTERED_MODAL_CONFIG,
				posture: "android_fold",
				careLayoutMode: "canonical",
				contentMaxWidth: 560,
				shellMaxWidth: 620,
			};
		case MAP_INTENT_VARIANTS.ANDROID_TABLET:
			return {
				...CENTERED_PANEL_CONFIG,
				posture: "android_tablet",
				contentMaxWidth: 620,
				shellMaxWidth: 760,
			};
		case MAP_INTENT_VARIANTS.ANDROID_CHROMEBOOK:
			return {
				...CENTERED_PANEL_CONFIG,
				posture: "android_chromebook",
				contentMaxWidth: 760,
				shellMaxWidth: 940,
			};
		case MAP_INTENT_VARIANTS.ANDROID_MOBILE:
			return {
				...BASE_MOBILE_SCREEN_CONFIG,
				posture: "android_phone",
			};
		case MAP_INTENT_VARIANTS.IOS_PAD:
			return {
				...CENTERED_MODAL_CONFIG,
				posture: "ios_pad",
				careLayoutMode: "canonical",
				contentMaxWidth: 620,
				shellMaxWidth: 700,
			};
		case MAP_INTENT_VARIANTS.WEB_MOBILE:
			return {
				...BASE_MOBILE_SCREEN_CONFIG,
				posture: "web_mobile",
				careLayoutMode: "canonical",
				centerContent: true,
				contentMaxWidth: 420,
				shellMaxWidth: 460,
			};
		case MAP_INTENT_VARIANTS.WEB_SM_WIDE:
			return {
				...CENTERED_MODAL_CONFIG,
				posture: "web_sm_wide",
				careLayoutMode: "canonical",
				contentMaxWidth: 560,
				shellMaxWidth: 620,
			};
		case MAP_INTENT_VARIANTS.WEB_MD:
			return {
				...CENTERED_MODAL_CONFIG,
				posture: "web_md",
				careLayoutMode: "canonical",
				contentMaxWidth: 640,
				shellMaxWidth: 720,
			};
		case MAP_INTENT_VARIANTS.MACBOOK:
			return {
				...CENTERED_PANEL_CONFIG,
				posture: "macbook",
				contentMaxWidth: 720,
				shellMaxWidth: 900,
			};
		case MAP_INTENT_VARIANTS.WEB_LG:
			return {
				...CENTERED_PANEL_CONFIG,
				posture: "web_lg",
				contentMaxWidth: 780,
				shellMaxWidth: 980,
			};
		case MAP_INTENT_VARIANTS.WEB_XL:
			return {
				...CENTERED_PANEL_CONFIG,
				posture: "web_xl",
				contentMaxWidth: 860,
				shellMaxWidth: 1080,
			};
		case MAP_INTENT_VARIANTS.WEB_2XL_3XL:
			return {
				...CENTERED_PANEL_CONFIG,
				posture: "web_2xl_3xl",
				contentMaxWidth: 920,
				shellMaxWidth: 1140,
			};
		case MAP_INTENT_VARIANTS.WEB_ULTRA_WIDE:
			return {
				...CENTERED_PANEL_CONFIG,
				posture: "web_ultra_wide",
				contentMaxWidth: 1020,
				shellMaxWidth: 1220,
			};
		case MAP_INTENT_VARIANTS.IOS_MOBILE:
		default:
			return {
				...BASE_MOBILE_SCREEN_CONFIG,
				posture: "iphone",
			};
	}
}
