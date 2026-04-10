import { Platform } from "react-native";
import {
	BREAKPOINTS,
	DEVICE_BREAKPOINTS,
	WELCOME_WEB_BREAKPOINTS,
} from "../../constants/breakpoints";

export const MAP_VIEWPORT_VARIANTS = {
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

export function getMapViewportVariant({ platform = Platform.OS, width = 0 }) {
	const isWeb = platform === "web";

	if (platform === "android") {
		if (width >= BREAKPOINTS.xl) return MAP_VIEWPORT_VARIANTS.ANDROID_CHROMEBOOK;
		if (width >= DEVICE_BREAKPOINTS.androidTablet) return MAP_VIEWPORT_VARIANTS.ANDROID_TABLET;
		if (width >= DEVICE_BREAKPOINTS.androidFold) return MAP_VIEWPORT_VARIANTS.ANDROID_FOLD;
		return MAP_VIEWPORT_VARIANTS.ANDROID_MOBILE;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.ultraWideMin) {
		return MAP_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.twoXlMin) {
		return MAP_VIEWPORT_VARIANTS.WEB_2XL_3XL;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.xlMin) {
		return MAP_VIEWPORT_VARIANTS.WEB_XL;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.lgMin) {
		return MAP_VIEWPORT_VARIANTS.WEB_LG;
	}

	if (width >= DEVICE_BREAKPOINTS.nativeDesktop) {
		return MAP_VIEWPORT_VARIANTS.MACBOOK;
	}

	if (width >= BREAKPOINTS.md) {
		if (platform === "ios") return MAP_VIEWPORT_VARIANTS.IOS_PAD;
		if (isWeb) return MAP_VIEWPORT_VARIANTS.WEB_MD;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.smWideMin) {
		return MAP_VIEWPORT_VARIANTS.WEB_SM_WIDE;
	}

	if (width < BREAKPOINTS.md) {
		if (platform === "ios") return MAP_VIEWPORT_VARIANTS.IOS_MOBILE;
		if (platform === "android") return MAP_VIEWPORT_VARIANTS.ANDROID_MOBILE;
		if (isWeb) return MAP_VIEWPORT_VARIANTS.WEB_MOBILE;
	}

	return MAP_VIEWPORT_VARIANTS.IOS_MOBILE;
}

export function getMapViewportSurfaceConfig(
	variant = MAP_VIEWPORT_VARIANTS.IOS_MOBILE,
) {
	switch (variant) {
		case MAP_VIEWPORT_VARIANTS.ANDROID_FOLD:
			return {
				variant,
				presentationMode: "modal",
				isCenteredSurface: true,
				modalMaxWidth: 620,
				modalSideInset: 16,
				modalBottomInset: 16,
				modalCornerRadius: 42,
				topClearance: 24,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 16,
				overlayHeaderMaxWidth: 620,
				overlaySheetSideInset: 16,
				overlaySheetBottomInset: 16,
				overlaySheetMaxWidth: 620,
				overlaySheetRadius: 42,
			};
		case MAP_VIEWPORT_VARIANTS.ANDROID_TABLET:
			return {
				variant,
				presentationMode: "panel",
				isCenteredSurface: true,
				modalMaxWidth: 760,
				modalSideInset: 18,
				modalBottomInset: 18,
				modalCornerRadius: 42,
				topClearance: 24,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 18,
				overlayHeaderMaxWidth: 760,
				overlaySheetSideInset: 18,
				overlaySheetBottomInset: 18,
				overlaySheetMaxWidth: 760,
				overlaySheetRadius: 42,
			};
		case MAP_VIEWPORT_VARIANTS.ANDROID_CHROMEBOOK:
			return {
				variant,
				presentationMode: "panel",
				isCenteredSurface: true,
				modalMaxWidth: 940,
				modalSideInset: 20,
				modalBottomInset: 20,
				modalCornerRadius: 44,
				topClearance: 28,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 20,
				overlayHeaderMaxWidth: 940,
				overlaySheetSideInset: 20,
				overlaySheetBottomInset: 20,
				overlaySheetMaxWidth: 940,
				overlaySheetRadius: 44,
			};
		case MAP_VIEWPORT_VARIANTS.IOS_PAD:
			return {
				variant,
				presentationMode: "modal",
				isCenteredSurface: true,
				modalMaxWidth: 700,
				modalSideInset: 16,
				modalBottomInset: 16,
				modalCornerRadius: 42,
				topClearance: 24,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 16,
				overlayHeaderMaxWidth: 700,
				overlaySheetSideInset: 16,
				overlaySheetBottomInset: 16,
				overlaySheetMaxWidth: 700,
				overlaySheetRadius: 42,
			};
		case MAP_VIEWPORT_VARIANTS.WEB_SM_WIDE:
			return {
				variant,
				presentationMode: "modal",
				isCenteredSurface: true,
				modalMaxWidth: 620,
				modalSideInset: 16,
				modalBottomInset: 16,
				modalCornerRadius: 42,
				topClearance: 24,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 16,
				overlayHeaderMaxWidth: 620,
				overlaySheetSideInset: 16,
				overlaySheetBottomInset: 16,
				overlaySheetMaxWidth: 620,
				overlaySheetRadius: 42,
			};
		case MAP_VIEWPORT_VARIANTS.WEB_MD:
			return {
				variant,
				presentationMode: "modal",
				isCenteredSurface: true,
				modalMaxWidth: 720,
				modalSideInset: 18,
				modalBottomInset: 18,
				modalCornerRadius: 42,
				topClearance: 24,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 18,
				overlayHeaderMaxWidth: 720,
				overlaySheetSideInset: 18,
				overlaySheetBottomInset: 18,
				overlaySheetMaxWidth: 720,
				overlaySheetRadius: 42,
			};
		case MAP_VIEWPORT_VARIANTS.MACBOOK:
			return {
				variant,
				presentationMode: "panel",
				isCenteredSurface: true,
				modalMaxWidth: 900,
				modalSideInset: 20,
				modalBottomInset: 20,
				modalCornerRadius: 44,
				topClearance: 28,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 20,
				overlayHeaderMaxWidth: 900,
				overlaySheetSideInset: 20,
				overlaySheetBottomInset: 20,
				overlaySheetMaxWidth: 900,
				overlaySheetRadius: 44,
			};
		case MAP_VIEWPORT_VARIANTS.WEB_LG:
			return {
				variant,
				presentationMode: "panel",
				isCenteredSurface: true,
				modalMaxWidth: 980,
				modalSideInset: 20,
				modalBottomInset: 20,
				modalCornerRadius: 44,
				topClearance: 28,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 20,
				overlayHeaderMaxWidth: 980,
				overlaySheetSideInset: 20,
				overlaySheetBottomInset: 20,
				overlaySheetMaxWidth: 980,
				overlaySheetRadius: 44,
			};
		case MAP_VIEWPORT_VARIANTS.WEB_XL:
			return {
				variant,
				presentationMode: "panel",
				isCenteredSurface: true,
				modalMaxWidth: 1080,
				modalSideInset: 24,
				modalBottomInset: 20,
				modalCornerRadius: 44,
				topClearance: 28,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 24,
				overlayHeaderMaxWidth: 1080,
				overlaySheetSideInset: 24,
				overlaySheetBottomInset: 20,
				overlaySheetMaxWidth: 1080,
				overlaySheetRadius: 44,
			};
		case MAP_VIEWPORT_VARIANTS.WEB_2XL_3XL:
			return {
				variant,
				presentationMode: "panel",
				isCenteredSurface: true,
				modalMaxWidth: 1140,
				modalSideInset: 24,
				modalBottomInset: 20,
				modalCornerRadius: 44,
				topClearance: 28,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 24,
				overlayHeaderMaxWidth: 1140,
				overlaySheetSideInset: 24,
				overlaySheetBottomInset: 20,
				overlaySheetMaxWidth: 1140,
				overlaySheetRadius: 44,
			};
		case MAP_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE:
			return {
				variant,
				presentationMode: "panel",
				isCenteredSurface: true,
				modalMaxWidth: 1220,
				modalSideInset: 28,
				modalBottomInset: 20,
				modalCornerRadius: 44,
				topClearance: 28,
				overlayHeaderTopInset: 18,
				overlayHeaderSideInset: 28,
				overlayHeaderMaxWidth: 1220,
				overlaySheetSideInset: 28,
				overlaySheetBottomInset: 20,
				overlaySheetMaxWidth: 1220,
				overlaySheetRadius: 44,
			};
		case MAP_VIEWPORT_VARIANTS.ANDROID_MOBILE:
		case MAP_VIEWPORT_VARIANTS.WEB_MOBILE:
		case MAP_VIEWPORT_VARIANTS.IOS_MOBILE:
		default:
			return {
				variant,
				presentationMode: "sheet",
				isCenteredSurface: false,
				modalMaxWidth: null,
				modalSideInset: 0,
				modalBottomInset: 0,
				modalCornerRadius: 38,
				topClearance: Platform.OS === "web" ? 16 : 10,
				overlayHeaderTopInset: Platform.OS === "web" ? 18 : 14,
				overlayHeaderSideInset: 16,
				overlayHeaderMaxWidth: null,
				overlaySheetSideInset: 8,
				overlaySheetBottomInset: 8,
				overlaySheetMaxWidth: null,
				overlaySheetRadius: 44,
			};
	}
}
