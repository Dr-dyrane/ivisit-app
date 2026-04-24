import { Platform } from "react-native";

// PULLBACK NOTE: Mirror map glass tokens for payment surfaces
// OLD: Payment surfaces used inline, platform-unaware colors
// NEW: Single factory returning platform-aware glass tokens
// REASON: Match map sheets pattern - one token source, three platforms

export function getPaymentGlassTokens({ isDarkMode, platform = Platform.OS }) {
	const isIOS = platform === "ios";
	const isAndroid = platform === "android";

	return {
		// Real blur only on iOS; Android/Web fall back to opaque surface
		blurIntensity: isDarkMode ? 44 : 52,
		blurTint: isDarkMode ? "dark" : "light",

		// Layered glass — iOS keeps low alpha so real blur shows through
		// Android/Web bump alpha to ~0.84 for opaque frosted simulation
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

		// Icon wrapper surface (orbs / square icon wrappers)
		iconSurface: isAndroid
			? isDarkMode
				? "rgba(18, 24, 38, 0.76)"
				: "rgba(255, 255, 255, 0.84)"
			: isDarkMode
				? "rgba(255, 255, 255, 0.08)"
				: "rgba(255, 255, 255, 0.76)",

		// Platform-aware shadow
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
	};
}

// Squircle helper — always use borderCurve: "continuous" alongside borderRadius
export const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});
