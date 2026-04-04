import { COLORS } from "./colors";

export function getWelcomeRootBackground(isDarkMode) {
	return isDarkMode ? COLORS.bgDark : COLORS.bgLight;
}

export function getWelcomeEntrySpacing({
	profile = "ios",
	isVeryShortHeight = false,
	insetsBottom = 0,
} = {}) {
	const safeBottom = Math.min(Math.max(insetsBottom, 0), 34);
	const isAndroidProfile = profile === "android";
	const isWebProfile = profile === "web";

	return {
		helperToChip: isAndroidProfile ? 14 : 16,
		chipToActionWell: isVeryShortHeight
			? (isAndroidProfile ? 22 : 24)
			: (isAndroidProfile ? 32 : isWebProfile ? 30 : 34),
		actionWellMinHeight: isVeryShortHeight
			? (isAndroidProfile ? 28 : isWebProfile ? 24 : 30)
			: (isAndroidProfile
				? 76
				: isWebProfile
					? 68
					: 52 + Math.round(safeBottom * 0.55)),
		actionGap: isAndroidProfile ? 10 : 12,
		signInTop: isAndroidProfile ? 14 : 16,
	};
}

export function getWelcomeThemePalette({
	isDarkMode,
	profile = "default",
} = {}) {
	const isAndroidProfile = profile === "android";

	if (isDarkMode) {
		return {
			backgroundBase: COLORS.bgDark,
			backgroundGradient: [
				COLORS.bgDark,
				isAndroidProfile ? "#0E1522" : "#0F1624",
				COLORS.bgDarkAlt,
			],
			brand: COLORS.textLight,
			headline: "#F8FAFC",
			helper: isAndroidProfile ? "#B2BED1" : "#B5C0D2",
			support: isAndroidProfile ? "#8F9CB0" : "#93A1B5",
			chipText: isAndroidProfile ? "#D3DCEA" : "#D6DFEB",
			chipBackground: isAndroidProfile
				? "rgba(255,255,255,0.045)"
				: "rgba(255,255,255,0.05)",
			topGlow: COLORS.brandPrimary,
			bottomGlow: isAndroidProfile ? "#162743" : "#14253F",
		};
	}

	return {
		backgroundBase: COLORS.bgLight,
		backgroundGradient: [
			COLORS.bgLight,
			isAndroidProfile ? "#FAF5F4" : "#FBF6F5",
			COLORS.bgLightAlt,
		],
		brand: COLORS.textPrimary,
		headline: "#111827",
		helper: isAndroidProfile ? "#5E687B" : "#5D677A",
		support: isAndroidProfile ? "#758095" : "#768195",
		chipText: isAndroidProfile ? "#4F5A6E" : "#515C70",
		chipBackground: isAndroidProfile
			? "rgba(255,255,255,0.74)"
			: "rgba(255,255,255,0.76)",
		topGlow: COLORS.brandPrimary,
		bottomGlow: "#E6EEF9",
	};
}
