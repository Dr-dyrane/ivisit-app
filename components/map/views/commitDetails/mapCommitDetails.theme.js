export function buildCommitDetailsThemeTokens({ isDarkMode, tokens }) {
	return {
		titleColor: tokens.titleColor,
		mutedColor: tokens.mutedText,
		accentColor: isDarkMode ? "#FCA5A5" : "#86100E",
		statusTextColor: isDarkMode ? "#CBD5E1" : "#334155",
		successColor: isDarkMode ? "#A7F3D0" : "#047857",
		errorColor: isDarkMode ? "#FCA5A5" : "#B91C1C",
		resendSurfaceColor: isDarkMode
			? "rgba(252, 165, 165, 0.14)"
			: "rgba(134, 16, 14, 0.10)",
		disabledTextColor: isDarkMode
			? "rgba(203, 213, 225, 0.58)"
			: "rgba(71, 85, 105, 0.58)",
		closeSurface: tokens.closeSurface,
		inputSurfaceColor: isDarkMode
			? "rgba(255,255,255,0.08)"
			: "rgba(15,23,42,0.05)",
		avatarSurfaceColor: isDarkMode
			? "rgba(255,255,255,0.06)"
			: "rgba(15,23,42,0.05)",
	};
}

export default buildCommitDetailsThemeTokens;
