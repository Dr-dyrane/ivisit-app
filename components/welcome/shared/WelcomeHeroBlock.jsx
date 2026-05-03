import React from "react";
import { Animated, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const HERO = require("../../../assets/hero/speed.png");

/**
 * WelcomeHeroBlock
 *
 * Renders the hero image with ambient motion effects.
 * Split layout: full hero panel with trail gradient + pulse ring.
 * Single layout: constrained hero image only.
 */
export default function WelcomeHeroBlock({
	layout,
	isDarkMode,
	sharedMetrics,
	viewport,
	heroTranslateX,
	trailTranslateX,
	trailOpacity,
	ringScale,
	ringOpacity,
	styles,
}) {
	if (layout === "split") {
		return (
			<View style={styles.heroPanel}>
				<AnimatedLinearGradient
					pointerEvents="none"
					colors={
						isDarkMode
							? ["transparent", "rgba(134,16,14,0.20)", "rgba(255,255,255,0.05)", "transparent"]
							: ["transparent", "rgba(134,16,14,0.12)", "rgba(255,255,255,0.6)", "transparent"]
					}
					start={{ x: 0, y: 0.5 }}
					end={{ x: 1, y: 0.5 }}
					style={[
						{
							position: "absolute",
							left: "10%",
							bottom: "28%",
							width: "66%",
							height: Math.max(18, sharedMetrics.type.captionLineHeight + 4),
							borderRadius: 999,
						},
						{
							opacity: trailOpacity,
							transform: [{ translateX: trailTranslateX }, { scaleX: 1.04 }],
						},
					]}
				/>
				<Animated.View
					pointerEvents="none"
					style={[
						styles.heroRing,
						{
							backgroundColor: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(134,16,14,0.08)",
							opacity: ringOpacity,
							transform: [{ scale: ringScale }],
						},
					]}
				/>
				<Animated.Image
					source={HERO}
					resizeMode="contain"
					style={[
						styles.heroImage,
						{
							width: sharedMetrics.welcome.heroWidth,
							height: sharedMetrics.welcome.heroHeight,
							transform: [{ translateX: heroTranslateX }, { translateY: -8 }, { scale: 0.94 }],
						},
					]}
				/>
			</View>
		);
	}

	return (
		<View style={styles.heroBlock}>
			<Animated.Image
				source={HERO}
				resizeMode="contain"
				style={[
					styles.heroImage,
					{
						width: Math.min(sharedMetrics.welcome.heroWidth, viewport.heroImageWidth),
						height: Math.min(sharedMetrics.welcome.heroHeight, viewport.heroImageHeight),
						transform: [{ translateX: heroTranslateX }, { translateY: -8 }, { scale: 0.94 }],
					},
				]}
			/>
		</View>
	);
}
