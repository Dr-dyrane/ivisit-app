import React from "react";
import {
	Animated,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../../../contexts/ThemeContext";
import useAuthViewport from "../../../../../hooks/ui/useAuthViewport";
import EntryActionButton from "../../../../entry/EntryActionButton";
import EmergencyLocationPreviewMap from "../../EmergencyLocationPreviewMap";
import createEmergencyChooseLocationTheme from "./emergencyChooseLocationTheme";

const SPEED_HERO = require("../../../../../assets/hero/speed.png");

function FindingAmbientLayer({ gradientId, color, style }) {
	return (
		<View pointerEvents="none" style={style}>
			<Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
				<Defs>
					<RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
						<Stop offset="0%" stopColor={color} stopOpacity="0.26" />
						<Stop offset="42%" stopColor={color} stopOpacity="0.12" />
						<Stop offset="72%" stopColor={color} stopOpacity="0.05" />
						<Stop offset="100%" stopColor={color} stopOpacity="0" />
					</RadialGradient>
				</Defs>
				<Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
			</Svg>
		</View>
	);
}

export default function EmergencyChooseLocationStageBase({
	variant = "ios-mobile",
	flowState,
	headlineText,
	helperText,
	shouldRenderFindingUi,
	shouldShowLocationSkeleton,
	shouldShowLocationPreviewMap,
	activeLocation,
	findingStatusMessage,
	confirmPrimaryLabel,
	onPrimaryPress,
	onSecondaryPress,
	secondaryLabel,
	heroScale,
	pulseScale,
	skeletonOpacity,
	locationPreviewOpacity,
	locationPreviewTranslateY,
	locationPreviewScale,
	findingGlowOpacity,
	findingGlowScale,
	findingRailProgress,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { height } = useAuthViewport();
	const { profile, colors, styles } = createEmergencyChooseLocationTheme({
		variant,
		isDarkMode,
		insetsBottom: insets?.bottom || 0,
		viewportHeight: height,
	});

	const heroPulseScale =
		flowState === "request_started" || shouldRenderFindingUi ? pulseScale : 1;

	return (
		<View style={styles.stageRoot}>
			<View style={styles.storyBlock}>
				<View style={styles.heroCopyRow}>
					<View style={styles.heroRail}>
						<View style={styles.heroBlock}>
							{shouldRenderFindingUi ? (
								<Animated.View
									pointerEvents="none"
									style={[
										styles.findingAmbientWrap,
										{
											opacity: findingGlowOpacity,
											transform: [{ scale: findingGlowScale }],
										},
									]}
								>
									<FindingAmbientLayer
										gradientId={`${variant}-finding-outer`}
										color={colors.findingHaloOuter}
										style={styles.findingHaloOuter}
									/>
									<FindingAmbientLayer
										gradientId={`${variant}-finding-middle`}
										color={colors.findingHaloMiddle}
										style={styles.findingHaloMiddle}
									/>
									<FindingAmbientLayer
										gradientId={`${variant}-finding-inner`}
										color={colors.findingHaloInner}
										style={styles.findingHaloInner}
									/>
								</Animated.View>
							) : null}
							<Animated.Image
								source={SPEED_HERO}
								resizeMode="contain"
								style={[
									styles.heroImage,
									{
										transform: [{ scale: heroScale }, { scale: heroPulseScale }],
									},
								]}
							/>
						</View>
					</View>

					<View style={styles.copyRail}>
						<View style={styles.copyBlock}>
							{shouldShowLocationSkeleton ? (
								<Animated.View
									style={[styles.copySkeleton, { opacity: skeletonOpacity }]}
								>
									<View style={styles.headlineSkeleton} />
									<View style={styles.helperSkeleton} />
								</Animated.View>
							) : (
								<>
									<Text style={styles.headline}>{headlineText}</Text>
									{helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
								</>
							)}
						</View>
					</View>
				</View>

				{shouldShowLocationSkeleton ? (
					<Animated.View style={[styles.mapSkeleton, { opacity: skeletonOpacity }]}>
						<View style={styles.mapSkeletonGridA} />
						<View style={styles.mapSkeletonGridB} />
						<View style={styles.mapSkeletonGridC} />
						<View style={styles.mapSkeletonRing}>
							<View style={styles.mapSkeletonPin} />
						</View>
					</Animated.View>
				) : shouldShowLocationPreviewMap ? (
					<Animated.View
						style={[
							styles.mapWrap,
							{
								opacity: locationPreviewOpacity,
								transform: [
									{ translateY: locationPreviewTranslateY },
									{ scale: locationPreviewScale },
								],
							},
						]}
					>
						<EmergencyLocationPreviewMap location={activeLocation} />
					</Animated.View>
				) : null}
			</View>

			<View style={styles.actionWell}>
				{flowState === "request_started" ? (
					<Animated.View style={[styles.loadingWell, { opacity: skeletonOpacity }]}>
						<View style={styles.primarySkeleton} />
						<View style={styles.quietLinkSkeleton} />
					</Animated.View>
				) : shouldRenderFindingUi ? (
					<View style={styles.findingWell}>
						<View style={styles.findingRail}>
							<Animated.View
								style={[
									styles.findingRailIndicator,
									{
										transform: [
											{
												translateX: findingRailProgress.interpolate({
													inputRange: [0, 1],
													outputRange: [-profile.railTravel, profile.railTravel],
												}),
											},
										],
									},
								]}
							/>
						</View>
						<Text style={styles.findingStatusText}>{findingStatusMessage}</Text>
					</View>
				) : (
					<>
						<EntryActionButton
							label={confirmPrimaryLabel}
							variant="primary"
							height={profile.primaryHeight}
							onPress={onPrimaryPress}
						/>
						<Pressable
							onPress={onSecondaryPress}
							style={[
								styles.quietLink,
								Platform.OS === "web" ? { cursor: "pointer" } : null,
							]}
						>
							<Text style={styles.quietLinkText}>{secondaryLabel}</Text>
						</Pressable>
					</>
				)}
			</View>
		</View>
	);
}
