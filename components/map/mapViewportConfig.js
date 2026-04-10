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

const MOBILE_SURFACE_CONFIG = {
	sheetLayout: "bottom-sheet",
	modalPresentationMode: "bottom-sheet",
	overlayLayout: "bottom-sheet",
	sidebarMaxWidth: null,
	drawerMaxWidth: null,
	modalSideInset: 0,
	modalBottomInset: 0,
	modalCornerRadius: 38,
	topClearance: Platform.OS === "web" ? 16 : 10,
	overlayHeaderPlacement: "full",
	overlayHeaderTopInset: Platform.OS === "web" ? 18 : 14,
	overlayHeaderSideInset: 16,
	overlayHeaderMaxWidth: null,
	overlaySheetSideInset: 8,
	overlaySheetBottomInset: 8,
	overlaySheetMaxWidth: null,
	overlaySheetRadius: 44,
	mapOcclusionLeft: 0,
	mapControlsMode: "bottom",
	mapControlsRightInset: 14,
	mapControlsTopInset: null,
	mapControlsBottomInsetBase: 198,
};

function createSidebarSurfaceConfig({
	sidebarMaxWidth,
	drawerMaxWidth,
	topClearance = 0,
	overlayHeaderSideInset = 20,
	mapControlsTopInset = 166,
	mapControlsRightInset = 18,
}) {
	return {
		sheetLayout: "left-sidebar",
		modalPresentationMode: "left-drawer",
		overlayLayout: "left-sidebar",
		sidebarMaxWidth,
		drawerMaxWidth,
		modalSideInset: 0,
		modalBottomInset: 0,
		modalCornerRadius: 36,
		topClearance,
		overlayHeaderPlacement: "map",
		overlayHeaderTopInset: 16,
		overlayHeaderSideInset,
		overlayHeaderMaxWidth: null,
		overlaySheetSideInset: 0,
		overlaySheetBottomInset: 0,
		overlaySheetMaxWidth: sidebarMaxWidth,
		overlaySheetRadius: 40,
		mapOcclusionLeft: sidebarMaxWidth,
		mapControlsMode: "top",
		mapControlsRightInset,
		mapControlsTopInset,
		mapControlsBottomInsetBase: null,
	};
}

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
		case MAP_VIEWPORT_VARIANTS.IOS_PAD:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 420,
					drawerMaxWidth: 468,
					overlayHeaderSideInset: 20,
					mapControlsTopInset: 164,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.ANDROID_TABLET:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 430,
					drawerMaxWidth: 476,
					overlayHeaderSideInset: 20,
					mapControlsTopInset: 164,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.ANDROID_CHROMEBOOK:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 456,
					drawerMaxWidth: 504,
					overlayHeaderSideInset: 22,
					mapControlsTopInset: 168,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.WEB_MD:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 412,
					drawerMaxWidth: 456,
					overlayHeaderSideInset: 18,
					mapControlsTopInset: 160,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.MACBOOK:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 432,
					drawerMaxWidth: 488,
					overlayHeaderSideInset: 22,
					mapControlsTopInset: 168,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.WEB_LG:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 452,
					drawerMaxWidth: 504,
					overlayHeaderSideInset: 24,
					mapControlsTopInset: 170,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.WEB_XL:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 480,
					drawerMaxWidth: 540,
					overlayHeaderSideInset: 24,
					mapControlsTopInset: 174,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.WEB_2XL_3XL:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 512,
					drawerMaxWidth: 576,
					overlayHeaderSideInset: 28,
					mapControlsTopInset: 176,
					mapControlsRightInset: 22,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE:
			return {
				variant,
				...createSidebarSurfaceConfig({
					sidebarMaxWidth: 540,
					drawerMaxWidth: 608,
					overlayHeaderSideInset: 32,
					mapControlsTopInset: 182,
					mapControlsRightInset: 24,
				}),
			};
		case MAP_VIEWPORT_VARIANTS.ANDROID_FOLD:
			return {
				variant,
				...MOBILE_SURFACE_CONFIG,
				modalPresentationMode: "left-drawer",
				drawerMaxWidth: 420,
				modalCornerRadius: 34,
			};
		case MAP_VIEWPORT_VARIANTS.WEB_SM_WIDE:
			return {
				variant,
				...MOBILE_SURFACE_CONFIG,
				modalPresentationMode: "left-drawer",
				drawerMaxWidth: 420,
				modalCornerRadius: 34,
			};
		case MAP_VIEWPORT_VARIANTS.ANDROID_MOBILE:
		case MAP_VIEWPORT_VARIANTS.WEB_MOBILE:
		case MAP_VIEWPORT_VARIANTS.IOS_MOBILE:
		default:
			return {
				variant,
				...MOBILE_SURFACE_CONFIG,
			};
	}
}

export function isSidebarMapVariant(variant = MAP_VIEWPORT_VARIANTS.IOS_MOBILE) {
	const surfaceConfig = getMapViewportSurfaceConfig(variant);
	return surfaceConfig.sheetLayout === "left-sidebar";
}
