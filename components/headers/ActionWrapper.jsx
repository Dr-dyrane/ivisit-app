import React from "react";
import { View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import {
	GLASS_SURFACE_VARIANTS,
	SURFACE_RADII,
	getGlassSurfaceTokens,
} from "../../constants/surfaces";

/**
 * ActionWrapper - A reusable wrapper for header action buttons
 * Provides the same styled background as used in ScrollAwareHeader
 */
export default function ActionWrapper({ children, style }) {
	const { isDarkMode } = useTheme();
	const surfaceTokens = getGlassSurfaceTokens({
		isDarkMode,
		variant: GLASS_SURFACE_VARIANTS.ACTION,
	});

	const wrapperStyle = {
		width: 42,
		height: 42,
		borderRadius: SURFACE_RADII.ACTION_CHIP,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: surfaceTokens.surfaceColor,
		...surfaceTokens.webBackdropStyle,
		...surfaceTokens.shadowStyle,
		...style,
	};

	return <View style={wrapperStyle}>{children}</View>;
}
