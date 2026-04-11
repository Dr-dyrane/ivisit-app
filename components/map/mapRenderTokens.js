import { COLORS } from "../../constants/colors";

export function getMapRenderTokens({ isDarkMode = false } = {}) {
	return {
		routeHaloColor: isDarkMode ? "rgba(134,16,14,0.34)" : "rgba(134,16,14,0.12)",
		routeHaloWidth: isDarkMode ? 9.5 : 8.5,
		routeCoreColor: isDarkMode ? COLORS.brandSecondary : COLORS.brandPrimary,
		routeCoreWidth: isDarkMode ? 4.2 : 3.8,
		userPuckCore: isDarkMode ? "#5294FF" : "#2F7BF7",
		userPuckInnerDot: isDarkMode ? "#184FC9" : "#1657D6",
		userPuckRing: "#FFFFFF",
		userPuckHalo: isDarkMode ? "rgba(82,148,255,0.20)" : "rgba(47,123,247,0.18)",
		userPuckHaloBorder: isDarkMode ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.84)",
		userPuckShadow: isDarkMode ? "rgba(7,12,22,0.42)" : "rgba(47,123,247,0.18)",
		controlSurface: isDarkMode ? "rgba(8,15,27,0.76)" : "rgba(250,246,239,0.88)",
		controlBorder: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(94,84,67,0.10)",
		controlShadow: isDarkMode ? "rgba(2,6,23,0.34)" : "rgba(107,91,68,0.14)",
	};
}
