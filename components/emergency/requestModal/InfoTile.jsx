import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function InfoTile({ label, value, textColor, mutedColor, cardColor, valueColor }) {
	// Ensure value is always a string to prevent React rendering errors
	const safeValue = typeof value === 'object' ? JSON.stringify(value) : String(value || '');
	
	return (
		<View style={[styles.card, { backgroundColor: cardColor }]}>
			<Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
			<Text style={[styles.value, { color: valueColor ?? textColor }]} numberOfLines={1}>
				{safeValue}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		flexBasis: "47%",
		flexGrow: 1,
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginHorizontal: 4,
		marginBottom: 12,
	},
	label: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.2,
		opacity: 0.9,
	},
	value: {
		marginTop: 8,
		fontSize: 15,
		fontWeight: "700",
		letterSpacing: -0.1,
	},
});
