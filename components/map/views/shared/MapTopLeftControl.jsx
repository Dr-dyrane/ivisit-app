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
 *
 * PULLBACK NOTE: UX-A — phase-aware visibility and back-nav
 * OLD: visible only for unauthenticated users in EXPLORE_INTENT; authenticated = avatar always
 * NEW:
 *   - Unauthenticated: chevron-back in EXPLORE_INTENT → navigates back to Welcome
 *   - Authenticated + isDecisionPhase: chevron-back → returns to previous phase
 *   - Authenticated + !isDecisionPhase: avatar circle → opens profile modal
 *   - Hidden in commit + tracking phases (MapScreen controls `visible` prop)
 */
export default function MapTopLeftControl({
	isSignedIn,
	isDecisionPhase = false,
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

	// PULLBACK NOTE: UX-A — authenticated back chevron in decision phases
	// OLD: isSignedIn ? onOpenProfile() : onBack()
	// NEW: (isSignedIn && !isDecisionPhase) ? onOpenProfile() : onBack()
	const showAvatar = isSignedIn && !isDecisionPhase && profileImageSource;

	const handlePress = () => {
		Haptics.selectionAsync();
		if (showAvatar) {
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
			accessibilityLabel={showAvatar ? "Open profile" : isDecisionPhase ? "Back to map" : "Back to welcome"}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			style={({ pressed }) => [
				styles.root,
				{ top: insets.top + 16, left: leftInset },
				{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
				!showAvatar
					? { backgroundColor: bgColor }
					: null,
			]}
		>
			{showAvatar ? (
				<Image source={profileImageSource} style={styles.fill} resizeMode="cover" />
			) : (
				<Ionicons
					name="chevron-back"
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
