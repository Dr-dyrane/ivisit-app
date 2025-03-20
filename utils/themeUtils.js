"use client";

import { useTheme } from "../contexts/ThemeContext";
import { Platform, useColorScheme } from "react-native";
import { useMemo } from "react";

// Define our theme colors
const lightColors = {
	// Primary colors
	primary: "#86100E",
	primaryLight: "#B01A18",
	primaryDark: "#5D0B0A",

	// Secondary colors
	secondary: "#ffa9a8",
	secondaryLight: "#ffc7c6",
	secondaryDark: "#ff8b8a",

	// Accent colors
	accent: "#00dfc0",
	accentLight: "#33e6cf",
	accentDark: "#00b69c",

	// Background colors
	background: "#F9F9F9",
	backgroundAlt: "#FFFFFF",
	backgroundElevated: "#FFFFFF",

	// Text colors
	text: "#333333",
	textSecondary: "#666666",
	textMuted: "#999999",
	textInverted: "#FFFFFF",

	// Border colors
	border: "#E5E7EB",
	borderLight: "#F3F4F6",
	borderDark: "#D1D5DB",

	// Status colors
	success: "#10B981",
	warning: "#FBBF24",
	error: "#EF4444",
	info: "#3B82F6",

	// Gradient colors
	gradientStart: "#FFFFFF",
	gradientMiddle: "#ECA6A4",
	gradientEnd: "#FFFFFF",

	// Misc
	shadow: "rgba(0, 0, 0, 0.1)",
	overlay: "rgba(0, 0, 0, 0.5)",
	card: "#FFFFFF",
	divider: "#E5E7EB",
};

const darkColors = {
	// Primary colors - keep brand color consistent
	primary: "#86100E",
	primaryLight: "#B01A18",
	primaryDark: "#5D0B0A",

	// Secondary colors - slightly adjusted for dark mode
	secondary: "#ff8584",
	secondaryLight: "#ffa3a2",
	secondaryDark: "#ff6766",

	// Accent colors - slightly brighter for dark mode
	accent: "#00efd0",
	accentLight: "#33f2d9",
	accentDark: "#00ccb3",

	// Background colors
	background: "#1A1A1A",
	backgroundAlt: "#2C2C2C",
	backgroundElevated: "#333333",

	// Text colors
	text: "#FFFFFF",
	textSecondary: "#CCCCCC",
	textMuted: "#999999",
	textInverted: "#333333",

	// Border colors
	border: "#444444",
	borderLight: "#555555",
	borderDark: "#333333",

	// Status colors - slightly brighter for dark mode
	success: "#34D399",
	warning: "#FBBF24",
	error: "#F87171",
	info: "#60A5FA",

	// Gradient colors
	gradientStart: "#2C2C2C",
	gradientMiddle: "#86100E",
	gradientEnd: "#2C2C2C",

	// Misc
	shadow: "rgba(0, 0, 0, 0.3)",
	overlay: "rgba(0, 0, 0, 0.7)",
	card: "#2C2C2C",
	divider: "#444444",
};

// Typography scale
const typography = {
	fontSizes: {
		xs: 12,
		sm: 14,
		md: 16,
		lg: 18,
		xl: 20,
		"2xl": 24,
		"3xl": 30,
		"4xl": 36,
		"5xl": 48,
		"6xl": 60,
	},
	fontWeights: {
		thin: "100",
		extralight: "200",
		light: "300",
		normal: "400",
		medium: "500",
		semibold: "600",
		bold: "700",
		extrabold: "800",
		black: "900",
	},
	lineHeights: {
		none: 1,
		tight: 1.25,
		snug: 1.375,
		normal: 1.5,
		relaxed: 1.625,
		loose: 2,
	},
};

// Spacing scale
const spacing = {
	0: 0,
	0.5: 2,
	1: 4,
	2: 8,
	3: 12,
	4: 16,
	5: 20,
	6: 24,
	8: 32,
	10: 40,
	12: 48,
	16: 64,
	20: 80,
	24: 96,
	32: 128,
};

// Border radius
const borderRadius = {
	none: 0,
	sm: 6,
	md: 8,
	lg: 12,
	xl: 16,
	"2xl": 24,
	full: 9999,
};

// Shadows
const shadows = {
	none: {
		shadowColor: "transparent",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0,
		shadowRadius: 0,
		elevation: 0,
	},
	sm: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.18,
		shadowRadius: 1.0,
		elevation: 1,
	},
	md: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.23,
		shadowRadius: 2.62,
		elevation: 4,
	},
	lg: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 4.65,
		elevation: 8,
	},
	xl: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.37,
		shadowRadius: 7.49,
		elevation: 12,
	},
};

// Main hook to access theme values
export function useThemedValues() {
	const { isDarkMode } = useTheme();
	const systemColorScheme = useColorScheme();

	// Memoize the theme to prevent unnecessary re-renders
	return useMemo(() => {
		const colors = isDarkMode ? darkColors : lightColors;

		return {
			colors,
			typography,
			spacing,
			borderRadius,
			shadows,
			isDarkMode,
			systemColorScheme,
		};
	}, [isDarkMode, systemColorScheme]);
}

// Helper function to create themed styles
export function createThemedStyles(styleCreator) {
	return () => {
		const theme = useThemedValues();
		return styleCreator(theme);
	};
}

// Helper for platform-specific styles
export function platformSelect(options) {
	const ios = Platform.OS === "ios" ? options.ios : {};
	const android = Platform.OS === "android" ? options.android : {};
	const base = options.base || {};

	return { ...base, ...ios, ...android };
}

// Helper for conditional styles
export function conditionalStyle(condition, trueStyle, falseStyle = {}) {
	return condition ? trueStyle : falseStyle;
}

// Helper for safe area insets
export function useSafeAreaInsets() {
	// This is a simplified version - you might want to use a library like react-native-safe-area-context
	return {
		top: Platform.OS === "ios" ? 44 : 0,
		bottom: Platform.OS === "ios" ? 34 : 0,
		left: 0,
		right: 0,
	};
}

// Helper for status bar management
export function useStatusBarStyle() {
	const { isDarkMode } = useTheme();

	return {
		barStyle: isDarkMode ? "light-content" : "dark-content",
		backgroundColor: isDarkMode
			? darkColors.background
			: lightColors.background,
	};
}

// Helper for navigation bar (Android only)
export function useNavigationBarStyle() {
	const { isDarkMode } = useTheme();

	return {
		backgroundColor: isDarkMode
			? darkColors.background
			: lightColors.background,
		buttonStyle: isDarkMode ? "light" : "dark",
	};
}

// Helper to get gradient colors based on theme
export function useGradientColors() {
	const { colors } = useThemedValues();

	return {
		default: [colors.gradientStart, colors.gradientMiddle, colors.gradientEnd],
		primary: [colors.primary, colors.primaryDark],
		secondary: [colors.secondary, colors.secondaryDark],
		accent: [colors.accent, colors.accentDark],
	};
}
