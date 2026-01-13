import React from "react";
import { View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * ActionWrapper - A reusable wrapper for header action buttons
 * Provides the same styled background as used in ScrollAwareHeader
 */
export default function ActionWrapper({ children, style }) {
	const { isDarkMode } = useTheme();

	const wrapperStyle = {
		width: 42,
		height: 42,
		borderRadius: 14, // Nested Squircle logic
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
		...style,
	};

	return <View style={wrapperStyle}>{children}</View>;
}
