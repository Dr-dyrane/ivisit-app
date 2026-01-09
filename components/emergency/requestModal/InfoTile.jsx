import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function InfoTile({ label, value, textColor, mutedColor, cardColor, valueColor }) {
	return (
		<View style={[styles.card, { backgroundColor: cardColor }]}>
			<Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
			<Text style={[styles.value, { color: valueColor ?? textColor }]} numberOfLines={1}>
				{value}
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
		fontSize: 11,
		fontWeight: "900",
		letterSpacing: 1.6,
		textTransform: "uppercase",
		opacity: 0.9,
	},
	value: {
		marginTop: 10,
		fontSize: 14,
		fontWeight: "900",
		letterSpacing: -0.2,
	},
});
