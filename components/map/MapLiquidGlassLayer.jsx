import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const WEB_FILTER_STYLE =
	Platform.OS === "web"
		? {
				backdropFilter: "blur(28px) saturate(1.45)",
				WebkitBackdropFilter: "blur(28px) saturate(1.45)",
			}
		: null;

export default function MapLiquidGlassLayer({
	isDarkMode,
	shapeStyle,
	prismOpacity = 1,
	sheenOpacity = 1,
	style,
}) {
	const baseColors = isDarkMode
		? ["rgba(255,255,255,0.10)", "rgba(15,23,42,0.08)", "rgba(255,255,255,0.045)"]
		: ["rgba(255,255,255,0.72)", "rgba(255,255,255,0.18)", "rgba(255,255,255,0.48)"];
	const prismColors = isDarkMode
		? [
				"rgba(56,189,248,0.00)",
				"rgba(56,189,248,0.15)",
				"rgba(244,114,182,0.13)",
				"rgba(250,204,21,0.10)",
				"rgba(45,212,191,0.12)",
				"rgba(56,189,248,0.00)",
			]
		: [
				"rgba(14,165,233,0.00)",
				"rgba(14,165,233,0.14)",
				"rgba(236,72,153,0.12)",
				"rgba(250,204,21,0.11)",
				"rgba(20,184,166,0.13)",
				"rgba(14,165,233,0.00)",
			];
	const edgeColors = isDarkMode
		? ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.025)", "rgba(255,255,255,0.07)"]
		: ["rgba(255,255,255,0.82)", "rgba(255,255,255,0.10)", "rgba(255,255,255,0.52)"];

	return (
		<View
			pointerEvents="none"
			style={[styles.root, shapeStyle, WEB_FILTER_STYLE, style]}
		>
			<LinearGradient
				pointerEvents="none"
				colors={baseColors}
				locations={[0, 0.46, 1]}
				start={{ x: 0.08, y: 0 }}
				end={{ x: 0.96, y: 1 }}
				style={StyleSheet.absoluteFillObject}
			/>
			<LinearGradient
				pointerEvents="none"
				colors={prismColors}
				locations={[0, 0.24, 0.44, 0.62, 0.82, 1]}
				start={{ x: 0, y: 0.2 }}
				end={{ x: 1, y: 0.86 }}
				style={[styles.prism, { opacity: prismOpacity }]}
			/>
			<LinearGradient
				pointerEvents="none"
				colors={edgeColors}
				locations={[0, 0.58, 1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.edgeSheen, { opacity: sheenOpacity }]}
			/>
			<View
				pointerEvents="none"
				style={[
					styles.innerGlow,
					{
						backgroundColor: isDarkMode
							? "rgba(255,255,255,0.035)"
							: "rgba(255,255,255,0.22)",
					},
				]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		...StyleSheet.absoluteFillObject,
		overflow: "hidden",
	},
	prism: {
		position: "absolute",
		left: -80,
		right: -80,
		top: -48,
		height: "78%",
		transform: [{ rotate: "-8deg" }],
	},
	edgeSheen: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		height: "46%",
	},
	innerGlow: {
		position: "absolute",
		left: 1,
		right: 1,
		top: 1,
		bottom: 1,
	},
});
