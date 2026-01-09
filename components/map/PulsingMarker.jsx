import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { COLORS } from "../../constants/colors";

export default function PulsingMarker({ isSelected, children }) {
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const opacityAnim = useRef(new Animated.Value(0.6)).current;

	useEffect(() => {
		if (isSelected) {
			const pulseAnimation = Animated.loop(
				Animated.parallel([
					Animated.sequence([
						Animated.timing(pulseAnim, {
							toValue: 1.8,
							duration: 1200,
							useNativeDriver: true,
						}),
						Animated.timing(pulseAnim, {
							toValue: 1,
							duration: 0,
							useNativeDriver: true,
						}),
					]),
					Animated.sequence([
						Animated.timing(opacityAnim, {
							toValue: 0,
							duration: 1200,
							useNativeDriver: true,
						}),
						Animated.timing(opacityAnim, {
							toValue: 0.6,
							duration: 0,
							useNativeDriver: true,
						}),
					]),
				])
			);
			pulseAnimation.start();
			return () => pulseAnimation.stop();
		}
		pulseAnim.setValue(1);
		opacityAnim.setValue(0.6);
	}, [isSelected, opacityAnim, pulseAnim]);

	return (
		<View style={styles.markerWrapper}>
			{isSelected && (
				<Animated.View
					style={[
						styles.pulseRing,
						{
							transform: [{ scale: pulseAnim }],
							opacity: opacityAnim,
						},
					]}
				/>
			)}
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	markerWrapper: {
		alignItems: "center",
		justifyContent: "center",
		width: 50,
		height: 50,
	},
	pulseRing: {
		position: "absolute",
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: COLORS.brandPrimary,
	},
});
