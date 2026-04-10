import React from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MAP_EXPLORE_INTENT_COPY } from "./mapExploreIntent.content";
import { getBedSpaceSubtext, getSelectedCareLabel } from "./mapExploreIntent.helpers";
import styles from "./mapExploreIntent.styles";

function CareIntentOrb({
	label,
	subtext,
	iconName,
	colors,
	hierarchy = "secondary",
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

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.careAction,
				pressed ? styles.careActionPressed : null,
				{ opacity: pressed ? Math.max(wrapperOpacity - 0.08, 0.54) : wrapperOpacity },
			]}
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
		</Pressable>
	);
}

function CareIntentCard({
	label,
	subtext,
	iconName,
	colors,
	hierarchy = "secondary",
	onPress,
	isSelected = false,
}) {
	const isPrimary = hierarchy === "primary";

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.intentCardPressable,
				pressed ? styles.intentCardPressed : null,
			]}
		>
			<LinearGradient
				colors={colors}
				start={{ x: 0.15, y: 0.12 }}
				end={{ x: 0.86, y: 0.92 }}
				style={[
					styles.intentCardSurface,
					isPrimary ? styles.intentCardSurfacePrimary : styles.intentCardSurfaceSecondary,
				]}
			>
				<View style={styles.intentCardHeader}>
					<View style={styles.intentCardIconWrap}>
						<MaterialCommunityIcons name={iconName} size={isPrimary ? 24 : 21} color="#FFFFFF" />
					</View>
					{isSelected ? (
						<View style={styles.intentCardCheckBadge}>
							<Ionicons name="checkmark" size={12} color="#FFFFFF" />
						</View>
					) : null}
				</View>
				<Text style={styles.intentCardLabel}>{label}</Text>
				<Text style={styles.intentCardSubtext}>{subtext}</Text>
			</LinearGradient>
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
				<View style={styles.intentSectionHeader}>
					<Text style={[styles.sectionLabel, { color: mutedColor }]}>
						{MAP_EXPLORE_INTENT_COPY.CHOOSE_CARE}
					</Text>
					<Text style={[styles.intentSectionMeta, { color: mutedColor }]}>
						{getSelectedCareLabel(selectedCare)}
					</Text>
				</View>

				<View style={styles.intentPanelGrid}>
					<View style={styles.intentPanelPrimary}>
						<CareIntentCard
							label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
							subtext={ambulanceSubtext}
							iconName="ambulance"
							colors={["#A11217", "#6D080D"]}
							hierarchy="primary"
							onPress={() => onChooseCare("ambulance")}
							isSelected={selectedCare === "ambulance"}
						/>
					</View>
					<View style={styles.intentPanelSecondaryColumn}>
						<CareIntentCard
							label={MAP_EXPLORE_INTENT_COPY.BED_SPACE}
							subtext={bedSubtext}
							iconName="bed"
							colors={["#5F748E", "#4C6078"]}
							onPress={() => onChooseCare("bed")}
							isSelected={selectedCare === "bed"}
						/>
						<CareIntentCard
							label={MAP_EXPLORE_INTENT_COPY.COMPARE}
							subtext={MAP_EXPLORE_INTENT_COPY.COMPARE_SUBTEXT}
							iconName="format-list-bulleted"
							colors={["#737C88", "#596370"]}
							onPress={onOpenCareHistory}
						/>
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

				<View style={styles.intentActionStack}>
					<CareIntentCard
						label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
						subtext={ambulanceSubtext}
						iconName="ambulance"
						colors={["#A11217", "#6D080D"]}
						hierarchy="primary"
						onPress={() => onChooseCare("ambulance")}
						isSelected={selectedCare === "ambulance"}
					/>
					<View style={styles.intentActionRow}>
						<CareIntentCard
							label={MAP_EXPLORE_INTENT_COPY.BED_SPACE}
							subtext={bedSubtext}
							iconName="bed"
							colors={["#5F748E", "#4C6078"]}
							onPress={() => onChooseCare("bed")}
							isSelected={selectedCare === "bed"}
						/>
						<CareIntentCard
							label={MAP_EXPLORE_INTENT_COPY.COMPARE}
							subtext={MAP_EXPLORE_INTENT_COPY.COMPARE_SUBTEXT}
							iconName="format-list-bulleted"
							colors={["#737C88", "#596370"]}
							onPress={onOpenCareHistory}
						/>
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

			<View style={styles.careRow}>
				<CareIntentOrb
					label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
					subtext={ambulanceSubtext}
					iconName="ambulance"
					colors={["#A11217", "#6D080D"]}
					hierarchy="primary"
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
					onPress={onOpenCareHistory}
					titleColor={titleColor}
					mutedColor={mutedColor}
				/>
			</View>
		</>
	);
}
