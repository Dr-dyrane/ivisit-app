import { Platform } from "react-native";

export const MAP_SHEET_ISLAND_MARGIN = 8;
export const MAP_SHEET_RADIUS = 44;
export const MAP_SHEET_CARD_RADIUS = 30;
export const MAP_SHEET_HANDLE_WIDTH = 42;

export function getMapSheetTokens({ isDarkMode }) {
	const isAndroid = Platform.OS === "android";
	const isIOS = Platform.OS === "ios";

	return {
		islandMargin: MAP_SHEET_ISLAND_MARGIN,
		sheetRadius: MAP_SHEET_RADIUS,
		cardRadius: MAP_SHEET_CARD_RADIUS,
		handleColor: isDarkMode ? "rgba(148, 163, 184, 0.54)" : "rgba(100, 116, 139, 0.30)",
		blurIntensity: isDarkMode ? 44 : 52,
		glassUnderlay: isDarkMode ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.10)",
		glassBackdrop: isDarkMode ? "rgba(8, 15, 27, 0.26)" : "rgba(255, 255, 255, 0.24)",
		glassSurface: isDarkMode ? "rgba(8, 15, 27, 0.84)" : "rgba(248, 250, 252, 0.84)",
		glassOverlay: isDarkMode
			? isIOS
				? "rgba(15, 23, 42, 0.22)"
				: "rgba(8, 15, 27, 0.84)"
			: isIOS
				? "rgba(255, 255, 255, 0.26)"
				: "rgba(248, 250, 252, 0.84)",
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
		shadowStyle: Platform.select({
			ios: {
				shadowColor: "#000000",
				shadowOpacity: 0.18,
				shadowRadius: 24,
				shadowOffset: { width: 0, height: 10 },
			},
			android: {
				elevation: 0,
			},
			web: {
				boxShadow: "0px 18px 36px rgba(0,0,0,0.18)",
			},
			default: {},
		}),
		avatarSurface: isAndroid
			? isDarkMode
				? "rgba(18, 24, 38, 0.76)"
				: "rgba(255, 255, 255, 0.84)"
			: isDarkMode
				? "rgba(255, 255, 255, 0.08)"
				: "rgba(255, 255, 255, 0.76)",
		avatarUnderlay: isDarkMode ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.10)",
	};
}
