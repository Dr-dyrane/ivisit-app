import React from "react";
import {
	Animated,
	Platform,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
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
	locationPreviewRenderKey = 0,
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
	const { height } = useAuthViewport();
	const { fontScale } = useWindowDimensions();
	const { profile, colors, styles } = createEmergencyChooseLocationTheme({
		variant,
		isDarkMode,
		viewportHeight: height,
		fontScale,
	});
	const actionLayout = profile.actionLayout || "quiet-link";
	const actionPlacement = profile.actionPlacement || "after-map";
	const useSideMapPlacement = profile.sideMapPlacement === true;
	const useInlineSecondaryLocationAction = actionLayout === "inline-icon";
	const usePairedActionBand = actionLayout === "paired";
	const useSurfacelessPairedActions =
		usePairedActionBand && profile.actionSurfaceless === true;
	const pairedActionContainerStyle = useSurfacelessPairedActions
		? styles.pairedActionRow
		: styles.pairedActionSurface;
	const confirmPrimaryIconName =
		flowState === "confirm_location" ? "navigate" : null;
	const preserveAndroidMapDuringSkeleton =
		variant === "android-mobile" &&
		!!activeLocation &&
		Number.isFinite(Number(activeLocation.latitude)) &&
		Number.isFinite(Number(activeLocation.longitude));
	const shouldRenderMapPreview =
		shouldShowLocationPreviewMap ||
		(preserveAndroidMapDuringSkeleton && shouldShowLocationSkeleton);
	const mapAnimatedStyle = shouldShowLocationPreviewMap
		? {
				opacity: locationPreviewOpacity,
				transform: [
					{ translateY: locationPreviewTranslateY },
					{ scale: locationPreviewScale },
				],
			}
		: null;
	const actionBlock = (
		<View style={styles.actionWell}>
			{flowState === "request_started" ? (
				<Animated.View style={[styles.loadingWell, { opacity: skeletonOpacity }]}>
					{useInlineSecondaryLocationAction ? (
						<View style={styles.inlineActionRow}>
							<View style={styles.inlineLocationButtonSkeleton} />
							<View style={styles.inlinePrimaryAction}>
								<View style={styles.primarySkeleton} />
							</View>
						</View>
					) : usePairedActionBand ? (
						<View style={pairedActionContainerStyle}>
							{useSurfacelessPairedActions ? (
								<>
									<View style={styles.pairedSecondarySkeleton} />
									<View style={styles.pairedPrimaryAction}>
										<View style={styles.primarySkeleton} />
									</View>
								</>
							) : (
								<View style={styles.pairedActionRow}>
									<View style={styles.pairedSecondarySkeleton} />
									<View style={styles.pairedPrimaryAction}>
										<View style={styles.primarySkeleton} />
									</View>
								</View>
							)}
						</View>
					) : (
						<>
							<View style={styles.primarySkeleton} />
							<View style={styles.quietLinkSkeleton} />
						</>
					)}
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
					{useInlineSecondaryLocationAction ? (
						<View style={styles.inlineActionRow}>
							<Pressable
								onPress={onSecondaryPress}
								accessible
								accessibilityRole="button"
								accessibilityLabel={secondaryLabel}
								style={({ pressed }) => [
									styles.inlineLocationButton,
									pressed ? styles.inlineLocationButtonPressed : null,
								]}
							>
								<Ionicons
									name="location-outline"
									size={20}
									color={colors.quiet}
								/>
							</Pressable>
							<View style={styles.inlinePrimaryAction}>
								<EntryActionButton
									label={confirmPrimaryLabel}
									variant="primary"
									height={profile.primaryHeight}
									iconName={confirmPrimaryIconName}
									onPress={onPrimaryPress}
								/>
							</View>
						</View>
					) : usePairedActionBand ? (
						<View style={pairedActionContainerStyle}>
							{useSurfacelessPairedActions ? (
								<>
									<View style={styles.pairedSecondaryAction}>
										<EntryActionButton
											label={secondaryLabel}
											variant="secondary"
											height={profile.primaryHeight}
											onPress={onSecondaryPress}
										/>
									</View>
									<View style={styles.pairedPrimaryAction}>
										<EntryActionButton
											label={confirmPrimaryLabel}
											variant="primary"
											height={profile.primaryHeight}
											iconName={confirmPrimaryIconName}
											onPress={onPrimaryPress}
										/>
									</View>
								</>
							) : (
								<View style={styles.pairedActionRow}>
									<View style={styles.pairedSecondaryAction}>
										<EntryActionButton
											label={secondaryLabel}
											variant="secondary"
											height={profile.primaryHeight}
											onPress={onSecondaryPress}
										/>
									</View>
									<View style={styles.pairedPrimaryAction}>
										<EntryActionButton
											label={confirmPrimaryLabel}
											variant="primary"
											height={profile.primaryHeight}
											iconName={confirmPrimaryIconName}
											onPress={onPrimaryPress}
										/>
									</View>
								</View>
							)}
						</View>
					) : (
						<>
							<EntryActionButton
								label={confirmPrimaryLabel}
								variant="primary"
								height={profile.primaryHeight}
								iconName={confirmPrimaryIconName}
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
				</>
			)}
		</View>
	);
	const mapBlock =
		shouldShowLocationSkeleton && !preserveAndroidMapDuringSkeleton ? (
			<Animated.View style={[styles.mapSkeleton, { opacity: skeletonOpacity }]}>
				<View style={styles.mapSkeletonGridA} />
				<View style={styles.mapSkeletonGridB} />
				<View style={styles.mapSkeletonGridC} />
				<View style={styles.mapSkeletonPill} />
				<View style={styles.mapSkeletonPinWrap}>
					<View style={styles.mapSkeletonPin} />
				</View>
			</Animated.View>
		) : shouldRenderMapPreview ? (
			<Animated.View
				style={[
					useSideMapPlacement ? styles.sideMapWrap : null,
					styles.mapWrap,
					mapAnimatedStyle,
				]}
			>
				<EmergencyLocationPreviewMap location={activeLocation} />
			</Animated.View>
		) : null;

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
									<Text
										style={styles.headline}
										numberOfLines={3}
										maxFontSizeMultiplier={1.22}
									>
										{headlineText}
									</Text>
									{helperText ? (
										<Text
											style={styles.helper}
											numberOfLines={3}
											maxFontSizeMultiplier={1.16}
										>
											{helperText}
										</Text>
									) : null}
								</>
							)}
						</View>
					</View>
				</View>

				{actionPlacement === "before-map" ? actionBlock : null}
				{useSideMapPlacement ? null : mapBlock}
			</View>

			{useSideMapPlacement ? mapBlock : null}
			{actionPlacement === "before-map" ? null : actionBlock}
		</View>
	);
}
