import React from "react";
import { Platform, View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * ActionWrapper - A reusable wrapper for header action buttons
 * Provides the same styled background as used in ScrollAwareHeader
 */
export default function ActionWrapper({ children, style }) {
	const { isDarkMode } = useTheme();
	const isWeb = Platform.OS === "web";
	const isAndroid = Platform.OS === "android";

	const wrapperStyle = {
		width: 42,
		height: 42,
		borderRadius: 14, // Nested Squircle logic
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: isWeb
			? isDarkMode
				? "rgba(18,24,38,0.42)"
				: "rgba(255,255,255,0.38)"
			: isAndroid
				? isDarkMode
					? "rgba(18, 24, 38, 0.70)"
					: "rgba(238, 242, 247, 0.78)"
				: isDarkMode
					? "rgba(255,255,255,0.05)"
					: "rgba(0,0,0,0.03)",
		...Platform.select({
			web: {
				backdropFilter: "blur(12px) saturate(1.18)",
				WebkitBackdropFilter: "blur(12px) saturate(1.18)",
				boxShadow: isDarkMode
					? "0px 8px 16px rgba(0,0,0,0.16)"
					: "0px 8px 16px rgba(15,23,42,0.08)",
			},
		}),
		...style,
	};

	return <View style={wrapperStyle}>{children}</View>;
}
