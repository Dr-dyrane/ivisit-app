import { Platform } from "react-native";

export function buildCommitPaymentThemeTokens({ isDarkMode, tokens }) {
	const isAndroid = Platform.OS === "android";

	return {
		titleColor: tokens.titleColor,
		mutedColor: tokens.mutedText,
		closeSurface: tokens.closeSurface,
		surfaceColor: isDarkMode
			? "rgba(255,255,255,0.06)"
			: "rgba(255,255,255,0.72)",
		heroSurfaceColor: isDarkMode
			? "rgba(8,15,27,0.76)"
			: "rgba(248,250,252,0.92)",
		secondarySurfaceColor: isDarkMode
			? "rgba(255,255,255,0.05)"
			: "rgba(248,250,252,0.92)",
		dividerColor: isDarkMode
			? "rgba(255,255,255,0.08)"
			: "rgba(15,23,42,0.08)",
		skeletonBaseColor: isDarkMode
			? "rgba(255,255,255,0.10)"
			: "rgba(15,23,42,0.09)",
		skeletonSoftColor: isDarkMode
			? "rgba(255,255,255,0.06)"
			: "rgba(15,23,42,0.05)",
		accentColor: isDarkMode ? "#F87171" : "#B91C1C",
		heroPrimarySurfaceColor: isDarkMode ? "#A11412" : "#B91C1C",
		errorColor: isDarkMode ? "#FCA5A5" : "#B91C1C",
		infoColor: isDarkMode ? "#CBD5E1" : "#475569",
		selectorSummarySurfaceColor: isDarkMode
			? "rgba(255,255,255,0.065)"
			: "rgba(15,23,42,0.045)",
		selectorChangePillSurfaceColor: isDarkMode
			? "rgba(248,113,113,0.14)"
			: "rgba(134,16,14,0.10)",
		heroMetaSurfaceColor: isAndroid
			? isDarkMode
				? "rgba(15,23,42,0.52)"
				: "rgba(134,16,14,0.18)"
			: "rgba(255,255,255,0.16)",
		heroAvatarSurfaceColor: isAndroid
			? isDarkMode
				? "rgba(180,35,24,0.92)"
				: "rgba(180,35,24,0.88)"
			: "rgba(255,255,255,0.18)",
		heroGlowColor: isAndroid
			? isDarkMode
				? "rgba(248,113,113,0.20)"
				: "rgba(180,35,24,0.16)"
			: "rgba(255,255,255,0.38)",
		warningColor: isDarkMode ? "#FDBA74" : "#D97706",
	};
}

export default buildCommitPaymentThemeTokens;
