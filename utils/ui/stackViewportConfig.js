import { Platform } from "react-native";
import {
	BREAKPOINTS,
	DEVICE_BREAKPOINTS,
	WELCOME_WEB_BREAKPOINTS,
} from "../../constants/breakpoints";

// PULLBACK NOTE: Introduce shared 14-variant resolver for full-canvas stack screens
// OLD: Stack screens had no viewport config; each either hardcoded mobile layout or re-derived ad-hoc
// NEW: Single resolver + per-variant surface config mirrors mapViewportConfig and getWelcomeVariant
// REASON: Payment responsive wave + future stack screens need a shared, app-wide viewport contract keyed to the 14-variant matrix

export const STACK_VIEWPORT_VARIANTS = {
	IOS_MOBILE: "ios_mobile",
	IOS_PAD: "ios_pad",
	ANDROID_MOBILE: "android_mobile",
	ANDROID_FOLD: "android_fold",
	ANDROID_TABLET: "android_tablet",
	ANDROID_CHROMEBOOK: "android_chromebook",
	WEB_MOBILE: "web_mobile",
	WEB_SM_WIDE: "web_sm_wide",
	WEB_MD: "web_md",
	MACBOOK: "macbook",
	WEB_LG: "web_lg",
	WEB_XL: "web_xl",
	WEB_2XL_3XL: "web_2xl_3xl",
	WEB_ULTRA_WIDE: "web_ultra_wide",
};

export const COMPACT_STACK_VARIANTS = new Set([
	STACK_VIEWPORT_VARIANTS.IOS_MOBILE,
	STACK_VIEWPORT_VARIANTS.ANDROID_MOBILE,
	STACK_VIEWPORT_VARIANTS.WEB_MOBILE,
	STACK_VIEWPORT_VARIANTS.ANDROID_FOLD,
	STACK_VIEWPORT_VARIANTS.WEB_SM_WIDE,
]);

export const TABLET_STACK_VARIANTS = new Set([
	STACK_VIEWPORT_VARIANTS.IOS_PAD,
	STACK_VIEWPORT_VARIANTS.ANDROID_TABLET,
	STACK_VIEWPORT_VARIANTS.ANDROID_CHROMEBOOK,
	STACK_VIEWPORT_VARIANTS.WEB_MD,
]);

export const DESKTOP_STACK_VARIANTS = new Set([
	STACK_VIEWPORT_VARIANTS.MACBOOK,
	STACK_VIEWPORT_VARIANTS.WEB_LG,
	STACK_VIEWPORT_VARIANTS.WEB_XL,
	STACK_VIEWPORT_VARIANTS.WEB_2XL_3XL,
	STACK_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE,
]);

export function isCompactStackVariant(variant) {
	return COMPACT_STACK_VARIANTS.has(variant);
}

export function isTabletStackVariant(variant) {
	return TABLET_STACK_VARIANTS.has(variant);
}

export function isDesktopStackVariant(variant) {
	return DESKTOP_STACK_VARIANTS.has(variant);
}

export function getStackViewportVariantGroup(variant) {
	if (isCompactStackVariant(variant)) return "compact";
	if (isTabletStackVariant(variant)) return "tablet";
	if (isDesktopStackVariant(variant)) return "desktop";
	return "compact";
}

// Mirrors getWelcomeVariant / getMapViewportVariant so every screen resolves the same name
// for the same { platform, width }. Keep in sync with those resolvers.
export function getStackViewportVariant({ platform = Platform.OS, width = 0 } = {}) {
	const isWeb = platform === "web";

	if (platform === "android") {
		if (width >= BREAKPOINTS.xl) return STACK_VIEWPORT_VARIANTS.ANDROID_CHROMEBOOK;
		if (width >= DEVICE_BREAKPOINTS.androidTablet) return STACK_VIEWPORT_VARIANTS.ANDROID_TABLET;
		if (width >= DEVICE_BREAKPOINTS.androidFold) return STACK_VIEWPORT_VARIANTS.ANDROID_FOLD;
		return STACK_VIEWPORT_VARIANTS.ANDROID_MOBILE;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.ultraWideMin) {
		return STACK_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.twoXlMin) {
		return STACK_VIEWPORT_VARIANTS.WEB_2XL_3XL;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.xlMin) {
		return STACK_VIEWPORT_VARIANTS.WEB_XL;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.lgMin) {
		return STACK_VIEWPORT_VARIANTS.WEB_LG;
	}

	if (width >= DEVICE_BREAKPOINTS.nativeDesktop) {
		return STACK_VIEWPORT_VARIANTS.MACBOOK;
	}

	if (width >= BREAKPOINTS.md) {
		if (platform === "ios") return STACK_VIEWPORT_VARIANTS.IOS_PAD;
		if (isWeb) return STACK_VIEWPORT_VARIANTS.WEB_MD;
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.smWideMin) {
		return STACK_VIEWPORT_VARIANTS.WEB_SM_WIDE;
	}

	if (width < BREAKPOINTS.md) {
		if (platform === "ios") return STACK_VIEWPORT_VARIANTS.IOS_MOBILE;
		if (platform === "android") return STACK_VIEWPORT_VARIANTS.ANDROID_MOBILE;
		if (isWeb) return STACK_VIEWPORT_VARIANTS.WEB_MOBILE;
	}

	return STACK_VIEWPORT_VARIANTS.IOS_MOBILE;
}

// Surface config primitives per variant group.
// Stack screens are full-canvas (no map underneath), so the primitives focus on
// content column width, gutters, column count, and modal presentation mode.

const COMPACT_SURFACE_CONFIG = {
	contentMaxWidth: null,              // full-bleed
	contentHorizontalPadding: 12,
	cardGap: 16,
	columnCount: 1,
	modalPresentationMode: "bottom-sheet",
	modalMaxWidth: null,
	modalMaxHeightRatio: 0.92,
	headerTopInset: 10,
	headerSideInset: 16,
};

const TABLET_SURFACE_CONFIG = {
	contentMaxWidth: 720,
	contentHorizontalPadding: 24,
	cardGap: 20,
	columnCount: 2,
	modalPresentationMode: "centered-modal",
	modalMaxWidth: 520,
	modalMaxHeightRatio: 0.82,
	headerTopInset: 14,
	headerSideInset: 24,
};

const DESKTOP_SURFACE_CONFIG = {
	contentMaxWidth: 960,
	contentHorizontalPadding: 32,
	cardGap: 24,
	columnCount: 2,
	modalPresentationMode: "centered-modal",
	modalMaxWidth: 560,
	modalMaxHeightRatio: 0.78,
	headerTopInset: 18,
	headerSideInset: 32,
};

const WIDE_DESKTOP_SURFACE_CONFIG = {
	...DESKTOP_SURFACE_CONFIG,
	contentMaxWidth: 1120,
	cardGap: 28,
	columnCount: 3,
	modalMaxWidth: 600,
};

export function getStackViewportSurfaceConfig(variant = STACK_VIEWPORT_VARIANTS.IOS_MOBILE) {
	switch (variant) {
		case STACK_VIEWPORT_VARIANTS.IOS_PAD:
		case STACK_VIEWPORT_VARIANTS.ANDROID_TABLET:
		case STACK_VIEWPORT_VARIANTS.ANDROID_CHROMEBOOK:
		case STACK_VIEWPORT_VARIANTS.WEB_MD:
			return { variant, ...TABLET_SURFACE_CONFIG };

		case STACK_VIEWPORT_VARIANTS.MACBOOK:
		case STACK_VIEWPORT_VARIANTS.WEB_LG:
			return { variant, ...DESKTOP_SURFACE_CONFIG };

		case STACK_VIEWPORT_VARIANTS.WEB_XL:
			return {
				variant,
				...DESKTOP_SURFACE_CONFIG,
				contentMaxWidth: 1040,
			};

		case STACK_VIEWPORT_VARIANTS.WEB_2XL_3XL:
		case STACK_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE:
			return { variant, ...WIDE_DESKTOP_SURFACE_CONFIG };

		case STACK_VIEWPORT_VARIANTS.ANDROID_FOLD:
		case STACK_VIEWPORT_VARIANTS.WEB_SM_WIDE:
			return {
				variant,
				...COMPACT_SURFACE_CONFIG,
				contentMaxWidth: 560,
				contentHorizontalPadding: 16,
			};

		case STACK_VIEWPORT_VARIANTS.IOS_MOBILE:
		case STACK_VIEWPORT_VARIANTS.ANDROID_MOBILE:
		case STACK_VIEWPORT_VARIANTS.WEB_MOBILE:
		default:
			return { variant, ...COMPACT_SURFACE_CONFIG };
	}
}
