import { Platform } from "react-native";

export function buildLocationIntentThemeTokens({ isDarkMode, tokens }) {
	const isAndroid = Platform.OS === "android";

	return {
		titleColor: tokens.titleColor,
		mutedColor: tokens.mutedText,
		heroSurfaceColor: isDarkMode
			? "rgba(8,15,27,0.76)"
			: "rgba(248,250,252,0.92)",
		groupSurfaceColor: isDarkMode
			? "rgba(255,255,255,0.06)"
			: "rgba(255,255,255,0.72)",
		accentColor: isDarkMode ? "#60A5FA" : "#3B82F6",
		heroGlowColor: isAndroid
			? isDarkMode
				? "rgba(96,165,250,0.20)"
				: "rgba(59,130,246,0.16)"
			: "rgba(255,255,255,0.38)",
		heroGradientColors: isAndroid
			? isDarkMode
				? ["rgba(96,165,250,0.18)", "rgba(59,130,246,0.12)", "rgba(8,15,27,0.18)"]
				: ["rgba(96,165,250,0.20)", "rgba(59,130,246,0.16)", "rgba(79,70,229,0.12)"]
			: isDarkMode
				? ["rgba(96,165,250,0.15)", "rgba(59,130,246,0.08)", "rgba(139,92,246,0.05)"]
				: ["rgba(96,165,250,0.18)", "rgba(59,130,246,0.12)", "rgba(139,92,246,0.06)"],
	};
}

export default buildLocationIntentThemeTokens;
