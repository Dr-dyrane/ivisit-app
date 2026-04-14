export function getMapUITokens({ isDarkMode }) {
	return {
		handleColor: isDarkMode ? "rgba(148, 163, 184, 0.54)" : "rgba(100, 116, 139, 0.30)",
		searchSurface: isDarkMode
			? "rgba(15, 23, 42, 0.74)"
			: "rgba(255, 255, 255, 0.76)",
		strongCardSurface: isDarkMode
			? "rgba(255, 255, 255, 0.08)"
			: "rgba(255, 255, 255, 0.72)",
		mutedCardSurface: isDarkMode
			? "rgba(255, 255, 255, 0.06)"
			: "rgba(15, 23, 42, 0.05)",
		titleColor: isDarkMode ? "#F8FAFC" : "#0F172A",
		mutedText: isDarkMode ? "#94A3B8" : "#64748B",
		bodyText: isDarkMode ? "#CBD5E1" : "#475569",
	};
}
