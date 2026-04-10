import { MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";

const BASE_MOBILE_SCREEN_CONFIG = {
	hospitalSummaryMode: "canonical",
	careLayoutMode: "canonical",
	presentationMode: "sheet",
	centerContent: false,
	shellAlignment: "center",
	contentMaxWidth: null,
	shellMaxWidth: null,
};

const CENTERED_MODAL_CONFIG = {
	...BASE_MOBILE_SCREEN_CONFIG,
	presentationMode: "modal",
	centerContent: true,
};

const CENTERED_HERO_MODAL_CONFIG = {
	...CENTERED_MODAL_CONFIG,
	hospitalSummaryMode: "hero",
	careLayoutMode: "panel",
};

const LEFT_SIDEBAR_CONFIG = {
	...BASE_MOBILE_SCREEN_CONFIG,
	presentationMode: "sidebar",
	centerContent: true,
	shellAlignment: "left",
};

const CENTERED_PANEL_CONFIG = {
	...BASE_MOBILE_SCREEN_CONFIG,
	presentationMode: "panel",
	centerContent: true,
	careLayoutMode: "panel",
	hospitalSummaryMode: "hero",
};

const WEB_CANONICAL_MOBILE_CONFIG = {
	...BASE_MOBILE_SCREEN_CONFIG,
	hospitalSummaryMode: "web_canonical",
	careLayoutMode: "web_canonical",
};

export function getMapExploreIntentScreenConfig(
	variant = MAP_INTENT_VARIANTS.IOS_MOBILE,
) {
	switch (variant) {
		case MAP_INTENT_VARIANTS.ANDROID_FOLD:
			return {
				...CENTERED_HERO_MODAL_CONFIG,
				posture: "android_fold",
				contentMaxWidth: 560,
				shellMaxWidth: 620,
			};
		case MAP_INTENT_VARIANTS.ANDROID_TABLET:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "android_tablet",
				contentMaxWidth: 388,
				shellMaxWidth: 430,
			};
		case MAP_INTENT_VARIANTS.ANDROID_CHROMEBOOK:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "android_chromebook",
				contentMaxWidth: 412,
				shellMaxWidth: 456,
			};
		case MAP_INTENT_VARIANTS.ANDROID_MOBILE:
			return {
				...BASE_MOBILE_SCREEN_CONFIG,
				posture: "android_phone",
			};
		case MAP_INTENT_VARIANTS.IOS_PAD:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "ios_pad",
				contentMaxWidth: 382,
				shellMaxWidth: 420,
			};
		case MAP_INTENT_VARIANTS.WEB_MOBILE:
			return {
				...WEB_CANONICAL_MOBILE_CONFIG,
				posture: "web_mobile",
			};
		case MAP_INTENT_VARIANTS.WEB_SM_WIDE:
			return {
				...CENTERED_MODAL_CONFIG,
				posture: "web_sm_wide",
				hospitalSummaryMode: "web_canonical",
				careLayoutMode: "web_canonical",
				contentMaxWidth: 560,
				shellMaxWidth: 620,
			};
		case MAP_INTENT_VARIANTS.WEB_MD:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "web_md",
				contentMaxWidth: 372,
				shellMaxWidth: 412,
			};
		case MAP_INTENT_VARIANTS.MACBOOK:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "macbook",
				contentMaxWidth: 392,
				shellMaxWidth: 432,
			};
		case MAP_INTENT_VARIANTS.WEB_LG:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "web_lg",
				contentMaxWidth: 408,
				shellMaxWidth: 452,
			};
		case MAP_INTENT_VARIANTS.WEB_XL:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "web_xl",
				contentMaxWidth: 432,
				shellMaxWidth: 480,
			};
		case MAP_INTENT_VARIANTS.WEB_2XL_3XL:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "web_2xl_3xl",
				contentMaxWidth: 458,
				shellMaxWidth: 512,
			};
		case MAP_INTENT_VARIANTS.WEB_ULTRA_WIDE:
			return {
				...LEFT_SIDEBAR_CONFIG,
				posture: "web_ultra_wide",
				contentMaxWidth: 486,
				shellMaxWidth: 540,
			};
		case MAP_INTENT_VARIANTS.IOS_MOBILE:
		default:
			return {
				...BASE_MOBILE_SCREEN_CONFIG,
				posture: "iphone",
			};
	}
}
