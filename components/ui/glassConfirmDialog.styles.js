/**
 * GlassConfirmDialog Styles
 *
 * Architecture:
 * - Uses getMapSheetTokens for consistency with map surfaces
 * - Platform-inclusive token usage (iOS/Android/Web)
 * - Squircle corners (Apple HIG continuous)
 * - Horizontal button row (iVisit pattern)
 * - Reduced button height for succinct dialogs
 */

import { StyleSheet, Platform } from "react-native";
import { getMapSheetTokens } from "../map/mapSheetTokens";

// Squircle helper (Apple HIG continuous corners)
const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

// Base styles
export const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},

	dialog: {
		width: "100%",
		maxWidth: 320,
		overflow: "hidden",
		// 3xl roundness (30px = MAP_SHEET_CARD_RADIUS)
		...squircle(30),
	},

	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 12,
	},

	title: {
		flex: 1,
		fontSize: 17,
		lineHeight: 22,
		fontWeight: "600",
		marginRight: 12,
	},

	closeButton: {
		width: 28,
		height: 28,
		justifyContent: "center",
		alignItems: "center",
		// 3xl roundness (continuous corners)
		...squircle(32),
	},

	body: {
		paddingHorizontal: 20,
		paddingBottom: 20,
	},

	message: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "400",
	},

	buttonRow: {
		flexDirection: "row",
		gap: 10,
		paddingHorizontal: 20,
		paddingBottom: 16,
	},

	button: {
		flex: 1,
		// Reduced height for succinct dialog (iOS: 44px, compact)
		paddingVertical: 10,
		paddingHorizontal: 16,
		alignItems: "center",
		justifyContent: "center",
		// 3xl roundness on buttons (continuous corners)
		...squircle(32),
	},

	buttonText: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "600",
	},
});

// Dynamic theme-aware styles
export const getDynamicStyles = (isDarkMode) => {
	const platform = Platform.OS;
	const isIOS = platform === "ios";

	// Get map sheet tokens for consistent glass surfaces
	const tokens = getMapSheetTokens({ isDarkMode, platform });

	return {
		overlay: {
			// Darker backdrop for focus
			backgroundColor: isDarkMode
				? "rgba(0, 0, 0, 0.65)"
				: "rgba(0, 0, 0, 0.45)",
		},

		dialog: {
			// Use map sheet glass surface token (84% opacity)
			backgroundColor: tokens.glassSurface,
		},

		// Platform-specific shadows (iOS only)
		shadowIOS: isIOS
			? {
					shadowColor: "#000000",
					shadowOpacity: 0.18,
					shadowRadius: 24,
					shadowOffset: { width: 0, height: 10 },
				}
			: {},

		shadowWeb: platform === "web"
			? {
					boxShadow: "0px 18px 36px rgba(0,0,0,0.18)",
				}
			: {},

		title: {
			color: isDarkMode ? "#F8FAFC" : "#0F172A",
		},

		closeButton: {
			backgroundColor: isDarkMode
				? "rgba(255, 255, 255, 0.10)"
				: "rgba(0, 0, 0, 0.06)",
		},

		closeIconColor: isDarkMode ? "#94A3B8" : "#64748B",

		message: {
			color: isDarkMode ? "#94A3B8" : "#64748B",
		},

		// Cancel: subtle surface
		cancelButton: {
			backgroundColor: isDarkMode
				? "rgba(255, 255, 255, 0.08)"
				: "rgba(15, 23, 42, 0.06)",
		},

		cancelText: {
			color: isDarkMode ? "#F8FAFC" : "#0F172A",
		},

		// Confirm: subtle surface (text color distinguishes action)
		confirmButton: {
			backgroundColor: tokens.glassOverlay,
		},

		confirmText: {
			color: isDarkMode ? "#60A5FA" : "#2563EB", // Primary blue
		},

		destructiveText: {
			color: isDarkMode ? "#F87171" : "#DC2626", // Destructive red
		},
	};
};
