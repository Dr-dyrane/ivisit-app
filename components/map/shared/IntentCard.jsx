import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { triggerPress } from "../../../services/hapticService";
import intentCardStyles from "./intentCard.styles";

const PANEL_BIAS_TRANSLATE_X = {
	neutral: 0,
	primary: -8,
	leading: -4,
	trailing: 4,
};

export default function IntentCard({
	label,
	subtext,
	iconName,
	colors,
	hierarchy = "secondary",
	panelBias = "neutral",
	onPress,
	disabled = false,
	isSelected = false,
	showSubtext = true,
	pulseProgress = null,
	responsiveMetrics = null,
}) {
	const isPrimary = hierarchy === "primary";
	// Spring-drive isSelected scale for tactile confirmation
	const cardSelectionScaleAnim = useRef(new Animated.Value(isSelected ? 1.01 : 1)).current;
	useEffect(() => {
		Animated.spring(cardSelectionScaleAnim, {
			toValue: isSelected ? 1.01 : 1,
			useNativeDriver: true,
			stiffness: 320,
			damping: 22,
			mass: 1,
		}).start();
	}, [isSelected, cardSelectionScaleAnim]);
	const restingOpacity = isSelected ? 1 : isPrimary ? 1 : hierarchy === "secondary" ? 0.94 : 0.82;
	const animatedScale =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [1, 1.042],
				})
			: 1;
	const animatedTranslateY =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [0, -3.5],
				})
			: 0;
	const animatedOpacity =
		!isPrimary && pulseProgress && !isSelected
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: hierarchy === "secondary" ? [0.95, 0.78] : [0.84, 0.64],
				})
			: restingOpacity;
	const cardRotateX =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: ["0deg", "-2.4deg"],
				})
			: "0deg";
	const pulseSheenOpacity =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [0.12, 0.38],
				})
			: 0;
	const pulseGlowOpacity =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [0.18, 0.46],
				})
			: 0;
	const pulseGlowScale =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [0.92, 1.18],
				})
			: 1;
	const pulseFloorOpacity =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [0.18, 0.34],
				})
			: 0;
	const pulseFloorScaleX =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [0.94, 1.16],
				})
			: 1;
	const pulseFloorScaleY =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [0.92, 1.08],
				})
			: 1;
	const pulseSheenTranslateX =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [-180, 180],
				})
			: 0;
	const iconPulseScale =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 0.28, 0.6, 1],
					outputRange: [1, 1, 1.14, 1.02],
				})
			: 1;
	const iconPulseTranslateY =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 0.28, 0.6, 1],
					outputRange: [0, 0, -1.5, 0],
				})
			: 0;
	const iconAuraOpacity =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 0.3, 0.62, 1],
					outputRange: [0.12, 0.12, 0.34, 0.16],
				})
			: 0;
	const iconAuraScale =
		isPrimary && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 0.3, 0.62, 1],
					outputRange: [0.88, 0.88, 1.22, 0.94],
				})
			: 1;
	const staticTranslateX = PANEL_BIAS_TRANSLATE_X[panelBias] ?? 0;
	const surfaceBiasStyle =
		panelBias === "primary"
			? intentCardStyles.surfacePrimaryBias
			: panelBias === "leading"
				? intentCardStyles.surfaceLeadingBias
				: panelBias === "trailing"
					? intentCardStyles.surfaceTrailingBias
					: null;

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			// Heavy haptic on card press
			onPressIn={() => triggerPress("heavy")}
			// Accessibility label + hint for VoiceOver
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityHint={showSubtext && subtext ? subtext : undefined}
			accessibilityState={{ disabled, selected: isSelected }}
			style={({ pressed }) => [
				intentCardStyles.pressable,
				pressed && !disabled ? intentCardStyles.cardPressed : null,
				disabled ? { opacity: 0.58 } : null,
			]}
		>
			<Animated.View
				style={[
					intentCardStyles.pulseStage,
					{
						opacity: animatedOpacity,
						transform: [
							{ perspective: 1000 },
							{ translateX: staticTranslateX },
							{ translateY: isSelected ? 0 : animatedTranslateY },
							{ scale: isSelected ? cardSelectionScaleAnim : animatedScale },
							{ rotateX: isSelected ? "0deg" : cardRotateX },
						],
					},
				]}
			>
				{isPrimary && !isSelected ? (
					<Animated.View
						pointerEvents="none"
						style={[
							intentCardStyles.pulseFloor,
							{
								opacity: pulseFloorOpacity,
								transform: [{ scaleX: pulseFloorScaleX }, { scaleY: pulseFloorScaleY }],
							},
						]}
					/>
				) : null}
				<LinearGradient
					colors={colors}
					start={{ x: 0.15, y: 0.12 }}
					end={{ x: 0.86, y: 0.92 }}
					style={[
						intentCardStyles.surface,
						responsiveMetrics?.cardSurfaceStyle,
						isPrimary ? intentCardStyles.surfacePrimary : intentCardStyles.surfaceSecondary,
						isPrimary
							? responsiveMetrics?.cardSurfacePrimaryStyle
							: responsiveMetrics?.cardSurfaceSecondaryStyle,
						surfaceBiasStyle,
					]}
				>
					{isPrimary && !isSelected ? (
						<Animated.View
							pointerEvents="none"
							style={[
								intentCardStyles.pulseGlow,
								{
									opacity: pulseGlowOpacity,
									transform: [{ scale: pulseGlowScale }],
								},
							]}
						/>
					) : null}
					{isPrimary && !isSelected ? (
						<Animated.View
							pointerEvents="none"
							style={[intentCardStyles.pulseSheen, { opacity: pulseSheenOpacity }]}
						>
							<Animated.View
								style={[
									intentCardStyles.pulseSheenBand,
									{ transform: [{ translateX: pulseSheenTranslateX }] },
								]}
							>
								<LinearGradient
									colors={[
										"rgba(255,255,255,0)",
										"rgba(255,255,255,0.68)",
										"rgba(255,255,255,0)",
									]}
									start={{ x: 0, y: 0.5 }}
									end={{ x: 1, y: 0.5 }}
									style={intentCardStyles.pulseSheenBandFill}
								/>
							</Animated.View>
						</Animated.View>
					) : null}
					<View style={intentCardStyles.header}>
						<Animated.View
							style={{
								transform: [
									{ translateY: isSelected ? 0 : iconPulseTranslateY },
									{ scale: isSelected ? 1.04 : iconPulseScale },
								],
							}}
						>
							<View style={[intentCardStyles.iconWrap, responsiveMetrics?.cardIconWrapStyle]}>
								{isPrimary && !isSelected ? (
									<Animated.View
										pointerEvents="none"
										style={[
											intentCardStyles.iconAura,
											{
												opacity: iconAuraOpacity,
												transform: [{ scale: iconAuraScale }],
											},
										]}
									/>
								) : null}
								<MaterialCommunityIcons
									name={iconName}
									size={
										isPrimary
											? responsiveMetrics?.cardPrimaryIconSize || 24
											: responsiveMetrics?.cardSecondaryIconSize || 21
									}
									color="#FFFFFF"
								/>
							</View>
						</Animated.View>
						{isSelected ? (
							<View style={[intentCardStyles.checkBadge, responsiveMetrics?.cardCheckStyle]}>
								<Ionicons name="checkmark" size={12} color="#FFFFFF" />
							</View>
						) : (
							<View style={[intentCardStyles.chevronBadge, responsiveMetrics?.cardChevronStyle]}>
								<Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.82)" />
							</View>
						)}
					</View>
					<Text
						maxFontSizeMultiplier={1.25}
						style={[intentCardStyles.cardLabel, responsiveMetrics?.cardLabelStyle]}
					>
						{label}
					</Text>
					{showSubtext && subtext ? (
						<Text
							maxFontSizeMultiplier={1.3}
							style={[intentCardStyles.cardSubtext, responsiveMetrics?.cardSubtextStyle]}
						>
							{subtext}
						</Text>
					) : null}
				</LinearGradient>
			</Animated.View>
		</Pressable>
	);
}
