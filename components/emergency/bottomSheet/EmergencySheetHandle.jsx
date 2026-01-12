import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function EmergencySheetHandle({ gradientColors, handleColor, styles }) {
	return (
		<View style={styles.handleContainer}>
			<View style={[styles.handle, { backgroundColor: handleColor, opacity: 0.3 }]} />
		</View>
	);
}

