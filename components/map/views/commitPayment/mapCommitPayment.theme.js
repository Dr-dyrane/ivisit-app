import { Platform } from "react-native";
import { getPaymentGlassTokens } from "../../../payment/tokens/paymentGlassTokens";

export function buildCommitPaymentThemeTokens({ isDarkMode, tokens }) {
	const isAndroid = Platform.OS === "android";
	const glassTokens = getPaymentGlassTokens({ isDarkMode });

	return {
		titleColor: tokens.titleColor,
		mutedColor: tokens.mutedText,
		closeSurface: tokens.closeSurface,
		surfaceColor: glassTokens.glassSurface,
		heroSurfaceColor: glassTokens.glassSurface,
		secondarySurfaceColor: glassTokens.glassOverlay,
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
		selectorSummarySurfaceColor: glassTokens.iconSurface,
		selectorChangePillSurfaceColor: isDarkMode
			? "rgba(248,113,113,0.14)"
			: "rgba(134,16,14,0.10)",
		heroMetaSurfaceColor: isAndroid
			? isDarkMode
				? glassTokens.iconSurface
				: "rgba(255,255,255,0.84)"
			: glassTokens.iconSurface,
		heroMetaTextColor: isDarkMode ? "#FFFFFF" : "#7F1D1D",
		heroAvatarSurfaceColor: isAndroid
			? isDarkMode
				? "rgba(180,35,24,0.92)"
				: "rgba(180,35,24,0.88)"
			: glassTokens.iconSurface,
		heroGlowColor: isAndroid
			? isDarkMode
				? "rgba(248,113,113,0.20)"
				: "rgba(180,35,24,0.16)"
			: "rgba(255,255,255,0.38)",
		warningColor: isDarkMode ? "#FDBA74" : "#D97706",
	};
}

export default buildCommitPaymentThemeTokens;
