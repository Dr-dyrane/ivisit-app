export function getMapUITokens({ isDarkMode }) {
	return {
		handleColor: isDarkMode ? "rgba(148, 163, 184, 0.54)" : "rgba(100, 116, 139, 0.30)",
		searchSurface: isDarkMode
			? "rgba(15, 23, 42, 0.58)"
			: "rgba(255, 255, 255, 0.58)",
		strongCardSurface: isDarkMode
			? "rgba(255, 255, 255, 0.095)"
			: "rgba(255, 255, 255, 0.54)",
		mutedCardSurface: isDarkMode
			? "rgba(255, 255, 255, 0.07)"
			: "rgba(15, 23, 42, 0.045)",
		titleColor: isDarkMode ? "#F8FAFC" : "#0F172A",
		mutedText: isDarkMode ? "#94A3B8" : "#64748B",
		bodyText: isDarkMode ? "#CBD5E1" : "#475569",
	};
}
