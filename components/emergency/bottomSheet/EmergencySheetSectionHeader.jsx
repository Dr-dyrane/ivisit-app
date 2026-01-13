import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
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
	styles, // Received from parent
}) {
	if (!visible) return null;

	const titleText = searchQuery.trim()
		? "SEARCH RESULTS"
		: mode === "emergency"
		? "NEARBY SERVICES"
		: "AVAILABLE BEDS";

	return (
		<View style={[styles.headerWithReset, localStyles.containerOverride]}>
			<View style={localStyles.titleContainer}>
				<Text 
                    style={[
                        styles.sectionHeader, 
                        { color: textMuted, marginBottom: 0 } // Resetting margin to 0 for perfect alignment
                    ]}
                >
					{titleText}
				</Text>
				
				<View style={[localStyles.countBadge, { backgroundColor: COLORS.brandPrimary + '12' }]}>
					<Text style={[localStyles.countText, { color: COLORS.brandPrimary }]}>
						{hospitalsCount}
					</Text>
				</View>
			</View>

			{hasActiveFilters && (
				<Pressable
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
						onReset?.();
					}}
					style={({ pressed }) => [
						localStyles.resetPill,
						{ 
							backgroundColor: COLORS.brandPrimary + (pressed ? '20' : '10'),
						}
					]}
				>
					<Text style={[styles.resetButton, { color: COLORS.brandPrimary, marginBottom: 0 }]}>
						RESET
					</Text>
				</Pressable>
			)}
		</View>
	);
}

const localStyles = StyleSheet.create({
    containerOverride: {
        alignItems: 'center', // Force all children to center on the vertical axis
        paddingVertical: 4,   // Give it some breathing room
    },
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center', // Align Label and Badge
		justifyContent: 'center',
	},
	countBadge: {
		paddingHorizontal: 7,
		paddingVertical: 1,
		borderRadius: 7,
		marginLeft: 8, // Space between text and badge
        justifyContent: 'center',
        alignItems: 'center',
        // Fix for Android font padding pushing text down
        ...Platform.select({
            android: { height: 18 }
        })
	},
	countText: {
		fontSize: 11,
		fontWeight: '900',
        includeFontPadding: false, // Removes extra space on Android
        textAlignVertical: 'center',
	},
	resetPill: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	}
});