import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/**
 * useWelcomeStageAnimation
 *
 * Owns all Animated.Value refs, the entrance stagger, the hero drift loop,
 * and the pulse ring loop for WelcomeStageBase.
 *
 * Loops are gated behind reduceMotion — when true, all values snap to final
 * state immediately (no motion).
 *
 * Returns animated values and pre-computed interpolations ready for JSX.
 */
export function useWelcomeStageAnimation({
	reduceMotion,
	duration = 240,
	tension = 50,
	friction = 10,
	isDarkMode,
}) {
	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(18)).current;
	const heroMotion = useRef(new Animated.Value(0)).current;
	const pulseMotion = useRef(new Animated.Value(0)).current;
	const brandOpacity = useRef(new Animated.Value(0)).current;
	const headlineOpacity = useRef(new Animated.Value(0)).current;
	const helperOpacity = useRef(new Animated.Value(0)).current;
	const actionsOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (reduceMotion) {
			[entranceOpacity, brandOpacity, headlineOpacity, helperOpacity, actionsOpacity].forEach(
				(v) => v.setValue(1),
			);
			entranceTranslate.setValue(0);
			return;
		}

		const stagger = 60;
		Animated.stagger(stagger, [
			Animated.timing(brandOpacity, { toValue: 1, duration: duration * 0.7, useNativeDriver: true }),
			Animated.timing(headlineOpacity, { toValue: 1, duration: duration * 0.8, useNativeDriver: true }),
			Animated.timing(helperOpacity, { toValue: 1, duration: duration * 0.85, useNativeDriver: true }),
			Animated.timing(actionsOpacity, { toValue: 1, duration: duration, useNativeDriver: true }),
		]).start();

		Animated.parallel([
			Animated.timing(entranceOpacity, {
				toValue: 1,
				duration,
				useNativeDriver: true,
			}),
			Animated.spring(entranceTranslate, {
				toValue: 0,
				tension,
				friction,
				useNativeDriver: true,
			}),
		]).start();

		const driftLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(heroMotion, {
					toValue: 1,
					duration: 2800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(heroMotion, {
					toValue: 0,
					duration: 2800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			]),
		);
		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseMotion, {
					toValue: 1,
					duration: 1100,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(pulseMotion, {
					toValue: 0,
					duration: 1100,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			]),
		);

		driftLoop.start();
		pulseLoop.start();

		return () => {
			driftLoop.stop();
			pulseLoop.stop();
		};
	}, [reduceMotion, duration, tension, friction, entranceOpacity, entranceTranslate, brandOpacity, headlineOpacity, helperOpacity, actionsOpacity, heroMotion, pulseMotion]);

	const heroTranslateX = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [-2, 2],
	});
	const trailTranslateX = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [-6, 5],
	});
	const trailOpacity = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [isDarkMode ? 0.08 : 0.04, isDarkMode ? 0.14 : 0.08],
	});
	const ringScale = pulseMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [0.995, 1.02],
	});
	const ringOpacity = pulseMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [isDarkMode ? 0.24 : 0.14, isDarkMode ? 0.4 : 0.24],
	});

	return {
		entranceOpacity,
		entranceTranslate,
		brandOpacity,
		headlineOpacity,
		helperOpacity,
		actionsOpacity,
		heroTranslateX,
		trailTranslateX,
		trailOpacity,
		ringScale,
		ringOpacity,
	};
}
