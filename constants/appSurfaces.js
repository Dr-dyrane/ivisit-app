import { COLORS } from "./colors";

export function resolveThemeModeIsDark(themeMode, deviceTheme) {
	if (themeMode === "dark") return true;
	if (themeMode === "light") return false;
	return deviceTheme === "dark";
}

export function getRootSurfaceColor(isDarkMode) {
	return isDarkMode ? COLORS.bgDark : COLORS.bgLight;
}

export function getMapEntrySurfaceColor(isDarkMode) {
	return isDarkMode ? "#08101B" : "#EEF3F8";
}
