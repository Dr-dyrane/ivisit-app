import React from "react";
import { LinearGradient } from "expo-linear-gradient";

export default function EmergencySheetBackground({ gradientColors, styles, sheetStyle }) {
	return (
		<LinearGradient colors={gradientColors} style={[sheetStyle, styles.sheetBackground]} />
	);
}

