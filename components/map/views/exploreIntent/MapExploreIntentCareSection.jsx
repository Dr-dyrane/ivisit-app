import React from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MAP_EXPLORE_INTENT_COPY } from "./mapExploreIntent.content";
import { getBedSpaceSubtext, getSelectedCareLabel } from "./mapExploreIntent.helpers";
import styles from "./mapExploreIntent.styles";

const CARE_BIAS_TRANSLATE_X = {
	neutral: 0,
	primary: -8,
	leading: -4,
	trailing: 4,
};

function CareIntentOrb({
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
}) {
	const animatedScale =
		hierarchy === "primary" && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [1, 1.03],
				})
			: 1;
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
	const staticTranslateX = CARE_BIAS_TRANSLATE_X[actionBias] ?? 0;

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.careAction,
				containerStyle,
				pressed ? styles.careActionPressed : null,
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
						transform: [{ scale: isSelected ? 1.05 : animatedScale }],
					}}
				>
					<View
						style={[
							styles.careIconShadowWrap,
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
						<LinearGradient
							colors={colors}
							start={{ x: 0.18, y: 0.18 }}
							end={{ x: 0.82, y: 0.9 }}
							style={styles.careIconWrap}
						>
							<MaterialCommunityIcons name={iconName} size={38} color="#FFFFFF" />
						</LinearGradient>
					</View>
				</Animated.View>
				<Text style={[styles.careLabel, { color: hierarchy === "primary" ? titleColor : mutedColor }]}>
					{label}
				</Text>
				<Text style={[styles.careSubtext, { color: mutedColor }]}>{subtext}</Text>
			</View>
		</Pressable>
	);
}

function CareIntentCard({
	label,
	subtext,
	iconName,
	colors,
	hierarchy = "secondary",
	panelBias = "neutral",
	onPress,
	isSelected = false,
	showSubtext = true,
	pulseProgress = null,
}) {
	const isPrimary = hierarchy === "primary";
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
	const staticTranslateX = CARE_BIAS_TRANSLATE_X[panelBias] ?? 0;
	const surfaceBiasStyle =
		panelBias === "primary"
			? styles.intentCardSurfacePrimaryBias
			: panelBias === "leading"
				? styles.intentCardSurfaceLeadingBias
				: panelBias === "trailing"
					? styles.intentCardSurfaceTrailingBias
					: null;

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.intentCardPressable,
				pressed ? styles.intentCardPressed : null,
			]}
		>
			<Animated.View
				style={[
					styles.intentCardPulseStage,
					{
						opacity: animatedOpacity,
						transform: [
							{ perspective: 1000 },
							{ translateX: staticTranslateX },
							{ translateY: isSelected ? 0 : animatedTranslateY },
							{ scale: isSelected ? 1.01 : animatedScale },
							{ rotateX: isSelected ? "0deg" : cardRotateX },
						],
					},
				]}
			>
				{isPrimary && !isSelected ? (
					<Animated.View
						pointerEvents="none"
						style={[
							styles.intentCardPulseFloor,
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
						styles.intentCardSurface,
						isPrimary ? styles.intentCardSurfacePrimary : styles.intentCardSurfaceSecondary,
						surfaceBiasStyle,
					]}
				>
					{isPrimary && !isSelected ? (
						<Animated.View
							pointerEvents="none"
							style={[
								styles.intentCardPulseGlow,
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
							style={[styles.intentCardPulseSheen, { opacity: pulseSheenOpacity }]}
						>
							<Animated.View
								style={[
									styles.intentCardPulseSheenBand,
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
									style={styles.intentCardPulseSheenBandFill}
								/>
							</Animated.View>
						</Animated.View>
					) : null}
					<View style={styles.intentCardHeader}>
						<Animated.View
							style={{
								transform: [
									{ translateY: isSelected ? 0 : iconPulseTranslateY },
									{ scale: isSelected ? 1.04 : iconPulseScale },
								],
							}}
						>
							<View style={styles.intentCardIconWrap}>
								{isPrimary && !isSelected ? (
									<Animated.View
										pointerEvents="none"
										style={[
											styles.intentCardIconAura,
											{
												opacity: iconAuraOpacity,
												transform: [{ scale: iconAuraScale }],
											},
										]}
									/>
								) : null}
								<MaterialCommunityIcons name={iconName} size={isPrimary ? 24 : 21} color="#FFFFFF" />
							</View>
						</Animated.View>
						{isSelected ? (
							<View style={styles.intentCardCheckBadge}>
								<Ionicons name="checkmark" size={12} color="#FFFFFF" />
							</View>
						) : (
							<View style={styles.intentCardChevronBadge}>
								<Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.82)" />
							</View>
						)}
					</View>
					<Text style={styles.intentCardLabel}>{label}</Text>
					{showSubtext && subtext ? (
						<Text style={styles.intentCardSubtext}>{subtext}</Text>
					) : null}
				</LinearGradient>
			</Animated.View>
		</Pressable>
	);
}

export default function MapExploreIntentCareSection({
	layoutMode = "canonical",
	selectedCare,
	onChooseCare,
	onOpenCareHistory,
	nearbyHospitalCount = 0,
	totalAvailableBeds = 0,
	nearbyBedHospitals = 0,
	titleColor,
	mutedColor,
	pulseProgress = null,
}) {
	const bedSubtext = getBedSpaceSubtext(totalAvailableBeds, nearbyBedHospitals);
	const ambulanceSubtext =
		nearbyHospitalCount > 0 ? `${nearbyHospitalCount} nearby` : MAP_EXPLORE_INTENT_COPY.NEARBY_HELP;
	const usesCanonicalOrbLayout =
		layoutMode === "canonical" || layoutMode === "web_canonical";

	if (layoutMode === "panel") {
			return (
			<>
				<Pressable
					onPress={onOpenCareHistory}
					style={({ pressed }) => [
						styles.intentSectionHeader,
						styles.intentSectionHeaderBiased,
						styles.intentSectionHeaderTrigger,
						pressed ? styles.sectionTriggerPressed : null,
					]}
				>
					<Text style={[styles.sectionLabel, { color: mutedColor }]}>
						{MAP_EXPLORE_INTENT_COPY.CHOOSE_CARE}
					</Text>
					<View
						style={[
							styles.intentSectionMetaIconWrap,
							{ backgroundColor: "rgba(255,255,255,0.08)" },
						]}
					>
						<Ionicons name="chevron-forward" size={14} color={mutedColor} />
					</View>
				</Pressable>

				<View style={[styles.intentPanelGrid, styles.intentPanelGridBiased]}>
					<View style={[styles.intentPanelFullSpan, styles.intentPanelFullSpanBiased]}>
						<CareIntentCard
							label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
							subtext={ambulanceSubtext}
							iconName="ambulance"
							colors={["#A11217", "#6D080D"]}
							hierarchy="primary"
							panelBias="primary"
							onPress={() => onChooseCare("ambulance")}
							isSelected={selectedCare === "ambulance"}
							showSubtext={false}
							pulseProgress={!selectedCare ? pulseProgress : null}
						/>
					</View>
					<View style={[styles.intentPanelBottomRow, styles.intentPanelBottomRowBiased]}>
						<View style={[styles.intentPanelHalf, styles.intentPanelHalfLeading]}>
							<CareIntentCard
								label={MAP_EXPLORE_INTENT_COPY.BED_SPACE}
								subtext={bedSubtext}
								iconName="bed"
								colors={["#5F748E", "#4C6078"]}
								panelBias="leading"
								onPress={() => onChooseCare("bed")}
								isSelected={selectedCare === "bed"}
								showSubtext={false}
								pulseProgress={!selectedCare ? pulseProgress : null}
							/>
						</View>
						<View style={[styles.intentPanelHalf, styles.intentPanelHalfTrailing]}>
							<CareIntentCard
								label={MAP_EXPLORE_INTENT_COPY.COMPARE}
								subtext={MAP_EXPLORE_INTENT_COPY.COMPARE_SUBTEXT}
								iconName="format-list-bulleted"
								colors={["#737C88", "#596370"]}
								hierarchy="tertiary"
								panelBias="trailing"
								onPress={onOpenCareHistory}
								showSubtext={false}
								pulseProgress={!selectedCare ? pulseProgress : null}
							/>
						</View>
					</View>
				</View>
			</>
		);
	}

	if (layoutMode === "web_mobile") {
		return (
			<>
				<View style={styles.intentSectionHeader}>
					<Text style={[styles.sectionLabel, { color: mutedColor }]}>
						{MAP_EXPLORE_INTENT_COPY.CHOOSE_CARE}
					</Text>
					<Text style={[styles.intentSectionMeta, { color: mutedColor }]}>
						{getSelectedCareLabel(selectedCare)}
					</Text>
				</View>

				<View style={[styles.intentActionStack, styles.intentActionStackBiased]}>
					<CareIntentCard
						label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
						subtext={ambulanceSubtext}
						iconName="ambulance"
						colors={["#A11217", "#6D080D"]}
						hierarchy="primary"
						panelBias="primary"
						onPress={() => onChooseCare("ambulance")}
						isSelected={selectedCare === "ambulance"}
					/>
					<View style={[styles.intentActionRow, styles.intentActionRowBiased]}>
						<View style={[styles.intentActionHalf, styles.intentActionHalfLeading]}>
							<CareIntentCard
								label={MAP_EXPLORE_INTENT_COPY.BED_SPACE}
								subtext={bedSubtext}
								iconName="bed"
								colors={["#5F748E", "#4C6078"]}
								panelBias="leading"
								onPress={() => onChooseCare("bed")}
								isSelected={selectedCare === "bed"}
							/>
						</View>
						<View style={[styles.intentActionHalf, styles.intentActionHalfTrailing]}>
							<CareIntentCard
								label={MAP_EXPLORE_INTENT_COPY.COMPARE}
								subtext={MAP_EXPLORE_INTENT_COPY.COMPARE_SUBTEXT}
								iconName="format-list-bulleted"
								colors={["#737C88", "#596370"]}
								hierarchy="tertiary"
								panelBias="trailing"
								onPress={onOpenCareHistory}
							/>
						</View>
					</View>
				</View>
			</>
		);
	}

	if (!usesCanonicalOrbLayout) {
		return null;
	}

	return (
		<>
			<Pressable
				onPress={onOpenCareHistory}
				style={({ pressed }) => [
					styles.sectionTrigger,
					pressed ? styles.sectionTriggerPressed : null,
				]}
			>
				<Text style={[styles.sectionLabel, { color: mutedColor }]}>
					{MAP_EXPLORE_INTENT_COPY.CHOOSE_CARE}
				</Text>
				<Ionicons name="chevron-forward" size={16} color={mutedColor} />
			</Pressable>

			<View style={[styles.careRow, styles.careRowBiased]}>
				<CareIntentOrb
					label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
					subtext={ambulanceSubtext}
					iconName="ambulance"
					colors={["#A11217", "#6D080D"]}
					hierarchy="primary"
					actionBias="primary"
					containerStyle={styles.careActionPrimaryBias}
					onPress={() => onChooseCare("ambulance")}
					isSelected={selectedCare === "ambulance"}
					titleColor={titleColor}
					mutedColor={mutedColor}
					pulseProgress={pulseProgress}
				/>
				<CareIntentOrb
					label={MAP_EXPLORE_INTENT_COPY.BED_SPACE}
					subtext={bedSubtext}
					iconName="bed"
					colors={["#6F8DA7", "#506A86"]}
					hierarchy="secondary"
					actionBias="leading"
					containerStyle={styles.careActionLeadingBias}
					onPress={() => onChooseCare("bed")}
					isSelected={selectedCare === "bed"}
					titleColor={titleColor}
					mutedColor={mutedColor}
				/>
				<CareIntentOrb
					label={MAP_EXPLORE_INTENT_COPY.COMPARE}
					subtext={MAP_EXPLORE_INTENT_COPY.COMPARE_SUBTEXT}
					iconName="format-list-bulleted"
					colors={["#7A8592", "#596370"]}
					hierarchy="tertiary"
					actionBias="trailing"
					containerStyle={styles.careActionTrailingBias}
					onPress={onOpenCareHistory}
					titleColor={titleColor}
					mutedColor={mutedColor}
				/>
			</View>
		</>
	);
}
