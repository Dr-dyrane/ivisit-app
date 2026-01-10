import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function EmergencyRequestModalHeader({ title, subtitle, textColor, subTextColor }) {
	return (
		<View style={styles.container}>
			<Text style={[styles.title, { color: textColor }]}>{title}</Text>
			<Text style={[styles.subtitle, { color: subTextColor }]} numberOfLines={1}>
				{subtitle}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 20,
		paddingTop: 10,
		paddingBottom: 14,
	},
	title: {
		fontSize: 22,
		fontWeight: "800",
		letterSpacing: -0.3,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		fontWeight:'400',
	},
});

