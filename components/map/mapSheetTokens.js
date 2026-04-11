import { Platform } from "react-native";
import { getMapGlassTokens } from "./mapGlassTokens";
import { getMapUITokens } from "./mapUI.tokens";

export const MAP_SHEET_ISLAND_MARGIN = 8;
export const MAP_SHEET_RADIUS = 44;
export const MAP_SHEET_CARD_RADIUS = 30;
export const MAP_SHEET_HANDLE_WIDTH = 42;

export function getMapSheetTokens({ isDarkMode, platform = Platform.OS }) {
	return {
		islandMargin: MAP_SHEET_ISLAND_MARGIN,
		sheetRadius: MAP_SHEET_RADIUS,
		cardRadius: MAP_SHEET_CARD_RADIUS,
		handleWidth: MAP_SHEET_HANDLE_WIDTH,
		...getMapUITokens({ isDarkMode }),
		...getMapGlassTokens({ isDarkMode, platform }),
	};
}
