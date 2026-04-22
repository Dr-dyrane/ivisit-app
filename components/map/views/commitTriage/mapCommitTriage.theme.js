export function buildCommitTriageThemeTokens({ isDarkMode, tokens }) {
	return {
		titleColor: tokens.titleColor,
		mutedColor: tokens.mutedText,
		closeSurface: tokens.closeSurface,
		accentColor: isDarkMode ? "#FCA5A5" : "#86100E",
		dangerColor: isDarkMode ? "#FCA5A5" : "#B91C1C",
		orbSurfaceColor: isDarkMode ? "#991B1B" : "#B42318",
		optionSurfaceColor: isDarkMode
			? "rgba(255,255,255,0.06)"
			: "rgba(15,23,42,0.04)",
		optionSelectedSurfaceColor: isDarkMode
			? "rgba(252,165,165,0.16)"
			: "rgba(134,16,14,0.10)",
		optionSelectedBorderColor: isDarkMode ? "#FCA5A5" : "#86100E",
		secondarySurfaceColor: isDarkMode
			? "rgba(255,255,255,0.06)"
			: "rgba(15,23,42,0.05)",
		noteSurfaceColor: isDarkMode
			? "rgba(255,255,255,0.05)"
			: "rgba(255,255,255,0.74)",
		noteBorderColor: isDarkMode
			? "rgba(255,255,255,0.08)"
			: "rgba(15,23,42,0.06)",
		prioritySurfaceColor: isDarkMode
			? "rgba(252,165,165,0.16)"
			: "rgba(185,28,28,0.10)",
	};
}

export default buildCommitTriageThemeTokens;
