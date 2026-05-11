import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { triggerPress } from "../../../services/hapticService";
import intentOrbStyles from "./intentOrb.styles";

const ACTION_BIAS_TRANSLATE_X = {
	neutral: 0,
	primary: -8,
	leading: -4,
	trailing: 4,
};

export default function IntentOrb({
	label,
	subtext,
	iconName,
	colors,
	hierarchy = "secondary",
	actionBias = "neutral",
	containerStyle = null,
	onPress,
	isSelected = false,
	titleColor,
	mutedColor,
	pulseProgress = null,
	responsiveStyles = null,
	isMutedOrb = false,
	primarySubtextColor = null,
	subtextColor = null,
}) {
	const iconSize = responsiveStyles?.iconSize || 48;
	const resolvedColors = Array.isArray(colors) && colors.length > 0 ? colors : [titleColor, titleColor];
	const mutedBackgroundColor = `${resolvedColors[0]}18`;
	const resolvedPrimarySubtextColor = primarySubtextColor || titleColor;
	const animatedScale =
		hierarchy === "primary" && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [1, 1.03],
				})
			: 1;
	// Spring-drive isSelected scale for tactile confirmation
	const selectionScaleAnim = useRef(new Animated.Value(isSelected ? 1.05 : 1)).current;
	useEffect(() => {
		Animated.spring(selectionScaleAnim, {
			toValue: isSelected ? 1.05 : 1,
			useNativeDriver: true,
			stiffness: 320,
			damping: 22,
			mass: 1,
		}).start();
	}, [isSelected, selectionScaleAnim]);
	const wrapperOpacity =
		hierarchy === "primary" ? 1 : hierarchy === "secondary" ? 0.84 : 0.68;
	const isAndroid = Platform.OS === "android";
	const shadowOpacity = isAndroid
		? 0
		: hierarchy === "primary"
			? 0.26
			: hierarchy === "secondary"
				? 0.12
				: 0.06;
	const shadowRadius = isAndroid
		? 0
		: hierarchy === "primary"
			? 24
			: hierarchy === "secondary"
				? 12
				: 6;
	const shadowOffset = isAndroid
		? 0
		: hierarchy === "primary"
			? 14
			: hierarchy === "secondary"
				? 8
				: 4;
	const elevation = isAndroid ? 0 : hierarchy === "primary" ? 12 : hierarchy === "secondary" ? 5 : 2;
	const staticTranslateX = ACTION_BIAS_TRANSLATE_X[actionBias] ?? 0;

	return (
		<Pressable
			onPress={onPress}
			// Heavy haptic on orb press
			onPressIn={() => triggerPress("heavy")}
			hitSlop={8}
			// Accessibility label + hint for VoiceOver
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityHint={subtext}
			style={({ pressed }) => [
				intentOrbStyles.action,
				responsiveStyles?.actionStyle,
				containerStyle,
				pressed ? intentOrbStyles.actionPressed : null,
				{ opacity: pressed ? Math.max(wrapperOpacity - 0.08, 0.54) : wrapperOpacity },
			]}
		>
			<View
				style={{
					transform: [{ translateX: staticTranslateX }],
				}}
			>
				<Animated.View
					style={{
						transform: [{ scale: isSelected ? selectionScaleAnim : animatedScale }],
					}}
				>
					<View
						style={[
							intentOrbStyles.iconShadowWrap,
							responsiveStyles?.shadowWrapStyle,
							{
								shadowColor: "#000000",
								shadowOpacity,
								shadowRadius,
								shadowOffset: { width: 0, height: shadowOffset },
								elevation,
								...Platform.select({
									web: {
										boxShadow:
											hierarchy === "primary"
												? "0px 18px 30px rgba(15,23,42,0.24)"
												: hierarchy === "secondary"
													? "0px 10px 16px rgba(15,23,42,0.14)"
													: "0px 5px 9px rgba(15,23,42,0.08)",
									},
								}),
							},
						]}
					>
						{isMutedOrb ? (
							<View
								style={[
									intentOrbStyles.iconWrap,
									responsiveStyles?.iconWrapStyle,
									{ backgroundColor: mutedBackgroundColor },
								]}
							>
								<MaterialCommunityIcons
									name={iconName}
									size={iconSize}
									color={resolvedColors[0] || titleColor}
								/>
							</View>
						) : (
							<LinearGradient
								colors={resolvedColors}
								start={{ x: 0.18, y: 0.18 }}
								end={{ x: 0.82, y: 0.9 }}
								style={[intentOrbStyles.iconWrap, responsiveStyles?.iconWrapStyle]}
							>
								<MaterialCommunityIcons name={iconName} size={iconSize} color="#FFFFFF" />
							</LinearGradient>
						)}
					</View>
				</Animated.View>
				<Text
					style={[
						intentOrbStyles.label,
						responsiveStyles?.labelStyle,
						{ color: hierarchy === "primary" ? titleColor : mutedColor },
					]}
				>
					{label}
				</Text>
				<Text
					style={[
						intentOrbStyles.subtext,
						responsiveStyles?.subtextStyle,
						{ color: subtextColor ?? (hierarchy === "primary" ? resolvedPrimarySubtextColor : mutedColor) },
					]}
				>
					{subtext}
				</Text>
			</View>
		</Pressable>
	);
}
