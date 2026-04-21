import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

export default function MapPhaseTransitionView({ children, phaseKey }) {
	const opacity = useRef(new Animated.Value(0)).current;
	const translateY = useRef(new Animated.Value(8)).current;

	useEffect(() => {
		opacity.setValue(0);
		translateY.setValue(8);
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 1,
				duration: 180,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.timing(translateY, {
				toValue: 0,
				duration: 220,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		]).start();
	}, [opacity, phaseKey, translateY]);

	return (
		<Animated.View
			pointerEvents="box-none"
			style={[
				styles.container,
				{
					opacity,
					transform: [{ translateY }],
				},
			]}
		>
			{children}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		minHeight: 0,
	},
});
