import { Platform } from "react-native";

export function getMapGlassTokens({ isDarkMode, platform = Platform.OS }) {
	const isIOS = platform === "ios";
	const isAndroid = platform === "android";
	const isWeb = platform === "web";

	return {
		blurIntensity: isDarkMode ? 52 : 62,
		glassUnderlay: isDarkMode ? "rgba(0, 0, 0, 0.20)" : "rgba(15, 23, 42, 0.08)",
		glassBackdrop: isDarkMode ? "rgba(8, 15, 27, 0.18)" : "rgba(255, 255, 255, 0.18)",
		glassSurface: isDarkMode
			? isAndroid
				? "rgba(8, 15, 27, 0.68)"
				: isWeb
					? "rgba(8, 15, 27, 0.54)"
					: "rgba(8, 15, 27, 0.42)"
			: isAndroid
				? "rgba(248, 250, 252, 0.72)"
				: isWeb
					? "rgba(255, 255, 255, 0.56)"
					: "rgba(255, 255, 255, 0.34)",
		glassOverlay: isDarkMode
			? isIOS
				? "rgba(15, 23, 42, 0.16)"
				: "rgba(8, 15, 27, 0.18)"
			: isIOS
				? "rgba(255, 255, 255, 0.18)"
				: "rgba(248, 250, 252, 0.20)",
		liquidPrismOpacity: isDarkMode ? 0.82 : 0.9,
		liquidSheenOpacity: isDarkMode ? 0.78 : 0.92,
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
