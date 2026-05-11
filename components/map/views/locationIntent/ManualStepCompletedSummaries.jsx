import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MANUAL_LOCATION_STEPS } from "./mapLocationIntent.model";

const STEP_ICONS = {
	country: "globe-outline",
	stateRegion: "map-outline",
	city: "business-outline",
	streetAddress: "location-outline",
	unit: "home-outline",
	responderNote: "chatbubble-ellipses-outline",
};

export default function ManualStepCompletedSummaries({
	manualDraft,
	currentStepIndex,
	onEditStep,
	titleColor,
	mutedColor,
	infoSurfaceColor,
}) {
	const completedSteps = MANUAL_LOCATION_STEPS.slice(0, currentStepIndex);
	if (completedSteps.length === 0) return null;

	return (
		<View style={styles.container}>
			{completedSteps.map((step, idx) => {
				const value = manualDraft[step.key];
				if (!value) return null;
				const iconName = STEP_ICONS[step.key] || "ellipse-outline";

				return (
					<Pressable
						key={step.key}
						onPress={() => onEditStep(idx)}
						accessibilityRole="button"
						accessibilityLabel={`Edit ${step.label}: ${value}`}
						style={({ pressed }) => [
							styles.row,
							{ backgroundColor: pressed ? infoSurfaceColor : "transparent" },
						]}
					>
						<View style={[styles.iconTile, { backgroundColor: infoSurfaceColor }]}>
							<Ionicons name={iconName} size={14} color={mutedColor} />
						</View>
						<Text
							numberOfLines={1}
							style={[styles.label, { color: mutedColor }]}
						>
							{step.label}
						</Text>
						<Text
							numberOfLines={1}
							style={[styles.value, { color: titleColor }]}
						>
							{value}
						</Text>
						<Ionicons name="checkmark" size={13} color={mutedColor} />
					</Pressable>
				);
			})}
			<View style={[styles.divider, { backgroundColor: mutedColor + "22" }]} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 0,
	},
	row: {
		minHeight: 36,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 6,
		paddingHorizontal: 4,
		borderRadius: 10,
		borderCurve: "continuous",
	},
	iconTile: {
		width: 26,
		height: 26,
		borderRadius: 13,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	label: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
		width: 80,
		flexShrink: 0,
	},
	value: {
		flex: 1,
		minWidth: 0,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "700",
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginTop: 4,
		marginBottom: 6,
	},
});
