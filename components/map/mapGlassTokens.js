import { Platform } from "react-native";

export function getMapGlassTokens({ isDarkMode, platform = Platform.OS }) {
	const isIOS = platform === "ios";
	const isAndroid = platform === "android";

	return {
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
