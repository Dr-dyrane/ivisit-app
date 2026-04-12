import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

function flattenGlowStyle(style) {
	const flattened = StyleSheet.flatten(style) || {};
	const { backgroundColor, opacity = 1, ...layout } = flattened;

	return {
		color: backgroundColor || "transparent",
		opacity,
		layout,
	};
}

function AmbientGlow({ style, gradientId }) {
	const { color, opacity, layout } = useMemo(
		() => flattenGlowStyle(style),
		[style],
	);

	if (!color || color === "transparent") {
		return null;
	}

	const centerOpacity = Math.min(Math.max(opacity * 2.35, 0.05), 0.3);
	const middleOpacity = centerOpacity * 0.46;
	const outerOpacity = centerOpacity * 0.14;

	return (
		<View pointerEvents="none" style={[styles.glow, layout]}>
			<Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
				<Defs>
					<RadialGradient id={gradientId} cx="50%" cy="50%" rx="64%" ry="64%">
						<Stop offset="0%" stopColor={color} stopOpacity={centerOpacity} />
						<Stop offset="50%" stopColor={color} stopOpacity={middleOpacity} />
						<Stop offset="82%" stopColor={color} stopOpacity={outerOpacity} />
						<Stop offset="100%" stopColor={color} stopOpacity={0} />
					</RadialGradient>
				</Defs>
				<Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
			</Svg>
		</View>
	);
}

export default function WelcomeAmbientGlows({
	topGlowStyle,
	bottomGlowStyle,
}) {
	const idRef = useRef(
		`welcome-glow-${Math.random().toString(36).slice(2, 10)}`,
	);

	return (
		<>
			<AmbientGlow style={topGlowStyle} gradientId={`${idRef.current}-top`} />
			<AmbientGlow
				style={bottomGlowStyle}
				gradientId={`${idRef.current}-bottom`}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	glow: {
		position: "absolute",
		overflow: "visible",
	},
});
