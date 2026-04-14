import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function MapStageGlassPanel({
	children,
	style,
	backgroundColor,
	glassTokens,
	isDarkMode,
	panHandlers,
}) {
	const isAndroid = Platform.OS === "android";

	return (
		<View style={[styles.panel, style, { backgroundColor }]} {...(panHandlers || {})}>
			{isAndroid ? (
				<>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFillObject,
							styles.androidUnderlay,
							{ backgroundColor: glassTokens?.underlayColor },
						]}
					/>
					<LinearGradient
						pointerEvents="none"
						colors={
							isDarkMode
								? ["rgba(255,255,255,0.08)", "rgba(8,15,27,0.10)", "rgba(255,255,255,0.035)"]
								: ["rgba(255,255,255,0.66)", "rgba(248,250,252,0.24)", "rgba(255,255,255,0.50)"]
						}
						locations={[0, 0.52, 1]}
						style={StyleSheet.absoluteFillObject}
					/>
				</>
			) : null}
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	panel: {
		position: "relative",
		shadowColor: "#0F172A",
		shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 8 },
		elevation: 0,
		overflow: "hidden",
	},
	androidUnderlay: {
		top: 1,
		bottom: -1,
	},
});
