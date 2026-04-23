// components/map/views/exploreIntent/MapExploreIntentRecentHistory.jsx
//
// PULLBACK NOTE: Pass 12 F6 - secondary history entry point inside explore_intent
// OLD: grouped history was only reachable via Mini Profile
// NEW: compact subordinate entry card appears in explore_intent after the care section
//      when the user has any history, surfacing "Recent care history" as a
//      secondary support section (per plan line 1163, visually subordinate to care actions).
//
// This component is intentionally low-weight: a single tappable card that opens
// MapRecentVisitsModal. It does not render clickable rows inline because that
// would compete with the primary care decision; the full grouped modal is the
// correct surface for row-level navigation.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useVisits } from "../../../../contexts/VisitsContext";
import { selectHistoryCount } from "../../../../hooks/visits/useVisitHistorySelectors";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export default function MapExploreIntentRecentHistory({ onOpen }) {
	const { isDarkMode } = useTheme();
	const { visits = [] } = useVisits();
	const count = selectHistoryCount(visits);

	if (!count || typeof onOpen !== "function") return null;

	const surface = isDarkMode
		? "rgba(255,255,255,0.05)"
		: "rgba(15,23,42,0.035)";
	const orb = isDarkMode ? "rgba(56,189,248,0.14)" : "rgba(56,189,248,0.10)";
	const titleColor = isDarkMode ? "#E2E8F0" : "#1E293B";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	const subtitle =
		count === 1 ? "1 past care event" : `${count} past care events`;

	return (
		<Pressable
			onPress={onOpen}
			accessibilityRole="button"
			accessibilityLabel="Open care history"
			style={({ pressed }) => [
				styles.card,
				squircle(18),
				{
					backgroundColor: surface,
					opacity: pressed ? 0.82 : 1,
				},
			]}
		>
			<View style={[styles.orb, squircle(999), { backgroundColor: orb }]}>
				<Ionicons name="time-outline" size={18} color="#38BDF8" />
			</View>
			<View style={styles.copy}>
				<Text numberOfLines={1} style={[styles.title, { color: titleColor }]}>
					Recent care history
				</Text>
				<Text numberOfLines={1} style={[styles.subtitle, { color: mutedColor }]}>
					{subtitle}
				</Text>
			</View>
			<Ionicons name="chevron-forward" size={16} color={mutedColor} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	orb: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	copy: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 14,
		fontWeight: "600",
		letterSpacing: -0.1,
	},
	subtitle: {
		marginTop: 2,
		fontSize: 12,
		lineHeight: 16,
	},
});
