import React from "react";
import { Image, Platform, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../../contexts/ThemeContext";

const SIZE = 44;
const RADIUS = SIZE / 2;

/**
 * MapTopLeftControl
 *
 * Floating circle rendered directly on the map canvas — no wrapper, no card.
 * Visible only when the map sheet is in EXPLORE_INTENT (hasFocusedSheetPhase = false).
 *
 * - Unauthenticated: chevron-back → navigates back to Welcome
 * - Authenticated: user avatar circle → opens profile modal
 */
export default function MapTopLeftControl({
	isSignedIn,
	profileImageSource,
	onBack,
	onOpenProfile,
	visible = true,
	usesSidebarLayout = false,
	sidebarOcclusionWidth = 0,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();

	if (!visible) return null;

	if (usesSidebarLayout && Platform.OS === "web") return null;

	const handlePress = () => {
		Haptics.selectionAsync();
		if (isSignedIn) {
			onOpenProfile?.();
		} else {
			onBack?.();
		}
	};

	const bgColor = isDarkMode ? "rgba(15,23,42,0.72)" : "rgba(255,255,255,0.82)";
	const iconColor = isDarkMode ? "#e5e7eb" : "#334155";

	const leftInset = usesSidebarLayout
		? sidebarOcclusionWidth + 12
		: Math.max(insets.left, 0) + 16;

	return (
		<Pressable
			onPress={handlePress}
			accessibilityRole="button"
			accessibilityLabel={isSignedIn ? "Open profile" : "Back to welcome"}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			style={({ pressed }) => [
				styles.root,
				{ top: insets.top + 16, left: leftInset },
				{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
				!isSignedIn || !profileImageSource
					? { backgroundColor: bgColor }
					: null,
			]}
		>
			{isSignedIn && profileImageSource ? (
				<Image source={profileImageSource} style={styles.fill} resizeMode="cover" />
			) : (
				<Ionicons
					name={isSignedIn ? "person" : "chevron-back"}
					size={22}
					color={iconColor}
				/>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	root: {
		position: "absolute",
		width: SIZE,
		height: SIZE,
		borderRadius: RADIUS,
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
	},
	fill: {
		width: SIZE,
		height: SIZE,
		borderRadius: RADIUS,
	},
});
