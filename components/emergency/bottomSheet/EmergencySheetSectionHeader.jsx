import React from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";

export default function EmergencySheetSectionHeader({
	visible,
	mode,
	searchQuery,
	hospitalsCount,
	hasActiveFilters,
	onReset,
	textMuted,
	styles,
}) {
	if (!visible) return null;

	return (
		<View style={styles.headerWithReset}>
			<Text style={[styles.sectionHeader, { color: textMuted }]}>
				{searchQuery.trim()
					? `SEARCH RESULTS (${hospitalsCount})`
					: `${mode === "emergency" ? "NEARBY SERVICES" : "AVAILABLE BEDS"} (${hospitalsCount})`}
			</Text>
			{hasActiveFilters && (
				<Pressable
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						onReset?.();
					}}
					style={({ pressed }) => ({
						opacity: pressed ? 0.6 : 1,
					})}
				>
					<Text style={[styles.resetButton, { color: COLORS.brandPrimary }]}>
						RESET
					</Text>
				</Pressable>
			)}
		</View>
	);
}

