import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MAP_EXPLORE_INTENT_COPY } from "./mapExploreIntent.content";
import { getBedSpaceSubtext, getSelectedCareLabel } from "./mapExploreIntent.helpers";
import styles from "./mapExploreIntent.styles";
import IntentOrb from "../../shared/IntentOrb";
import IntentCard from "../../shared/IntentCard";

const CHOOSE_CARE_HEADER_HIT_SLOP = { top: 14, right: 18, bottom: 14, left: 18 };

export default function MapExploreIntentCareSection({
	layoutMode = "canonical",
	selectedCare,
	isCareDiscoveryPending = false,
	onChooseCare,
	onOpenCareHistory,
	nearbyHospitalCount = 0,
	totalAvailableBeds = 0,
	nearbyBedHospitals = 0,
	hasHospitalNetwork = false,
	titleColor,
	mutedColor,
	isDarkMode,
	pulseProgress = null,
	responsiveMetrics,
}) {
	const careResponsiveStyles = responsiveMetrics?.care?.orb || null;
	const sectionLabelStyle = responsiveMetrics?.section?.labelStyle || null;
	const sectionTriggerStyle = responsiveMetrics?.section?.triggerStyle || null;
	const careRowStyle = responsiveMetrics?.care?.rowStyle || null;
	const bedSubtext = getBedSpaceSubtext(totalAvailableBeds, nearbyBedHospitals);
	const ambulanceSubtext =
		isCareDiscoveryPending
			? MAP_EXPLORE_INTENT_COPY.DISCOVERY_PENDING
			: nearbyHospitalCount > 0
			? `${nearbyHospitalCount} nearby`
			: MAP_EXPLORE_INTENT_COPY.WIDER_HELP;
	const usesCanonicalOrbLayout =
		layoutMode === "canonical" || layoutMode === "web_canonical";
	// PULLBACK NOTE: Pass C — dim secondary/tertiary orbs while network data is not yet ready (E-2.10)
	// OLD: secondary/tertiary orbs render at full hierarchy opacity regardless of data state
	// NEW: when neither nearbyHospitalCount nor totalAvailableBeds has resolved, dim non-primary orbs
	const isNetworkDataReady =
		hasHospitalNetwork || nearbyHospitalCount > 0 || totalAvailableBeds > 0;
	const notReadyStyle = !isNetworkDataReady && !selectedCare ? { opacity: 0.46 } : null;

	if (layoutMode === "panel") {
		return (
			<>
				<Pressable
					onPress={onOpenCareHistory}
					hitSlop={CHOOSE_CARE_HEADER_HIT_SLOP}
					style={({ pressed }) => [
						styles.intentSectionHeader,
						styles.intentSectionHeaderBiased,
						styles.intentSectionHeaderTrigger,
						styles.chooseCareSectionHeader,
						sectionTriggerStyle,
						pressed ? styles.sectionTriggerPressed : null,
					]}
				>
					<Text style={[styles.sectionLabel, sectionLabelStyle, { color: mutedColor }]}>
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

				<View
					style={[
						styles.intentPanelGrid,
						styles.intentPanelGridBiased,
						responsiveMetrics?.care?.panelGridStyle,
					]}
				>
					<View style={[styles.intentPanelFullSpan, styles.intentPanelFullSpanBiased]}>
						<IntentCard
							label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
							subtext={ambulanceSubtext}
							iconName="ambulance"
							colors={["#A11217", "#6D080D"]}
							hierarchy="primary"
							panelBias="primary"
							onPress={() => onChooseCare("ambulance")}
							disabled={isCareDiscoveryPending}
							isSelected={selectedCare === "ambulance"}
							showSubtext={false}
							pulseProgress={!selectedCare ? pulseProgress : null}
							responsiveMetrics={responsiveMetrics?.care}
						/>
					</View>
					<View
						style={[
							styles.intentPanelBottomRow,
							styles.intentPanelBottomRowBiased,
							responsiveMetrics?.care?.panelBottomRowStyle,
						]}
					>
						<View style={[styles.intentPanelHalf, styles.intentPanelHalfLeading]}>
							<IntentCard
								label={MAP_EXPLORE_INTENT_COPY.BED_SPACE}
								subtext={bedSubtext}
								iconName="bed"
								colors={["#5F748E", "#4C6078"]}
								panelBias="leading"
								onPress={() => onChooseCare("bed")}
								isSelected={selectedCare === "bed"}
								showSubtext={false}
								pulseProgress={!selectedCare ? pulseProgress : null}
								responsiveMetrics={responsiveMetrics?.care}
							/>
						</View>
						<View style={[styles.intentPanelHalf, styles.intentPanelHalfTrailing]}>
							<IntentCard
								label={MAP_EXPLORE_INTENT_COPY.COMPARE}
								subtext={MAP_EXPLORE_INTENT_COPY.COMPARE_SUBTEXT}
								iconName="format-list-bulleted"
								colors={["#737C88", "#596370"]}
								hierarchy="tertiary"
								panelBias="trailing"
								onPress={() => onChooseCare("both")}
								disabled={isCareDiscoveryPending}
								isSelected={selectedCare === "both"}
								showSubtext={false}
								pulseProgress={!selectedCare ? pulseProgress : null}
								responsiveMetrics={responsiveMetrics?.care}
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
				<View style={[styles.intentSectionHeader, styles.chooseCareSectionHeader, sectionTriggerStyle]}>
					<Text style={[styles.sectionLabel, sectionLabelStyle, { color: mutedColor }]}>
						{MAP_EXPLORE_INTENT_COPY.CHOOSE_CARE}
					</Text>
					<Text style={[styles.intentSectionMeta, { color: mutedColor }]}>
						{getSelectedCareLabel(selectedCare)}
					</Text>
				</View>

				<View
					style={[
						styles.intentActionStack,
						styles.intentActionStackBiased,
						responsiveMetrics?.care?.actionStackStyle,
					]}
				>
					<IntentCard
						label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
						subtext={ambulanceSubtext}
						iconName="ambulance"
						colors={["#A11217", "#6D080D"]}
						hierarchy="primary"
						panelBias="primary"
						onPress={() => onChooseCare("ambulance")}
						disabled={isCareDiscoveryPending}
						isSelected={selectedCare === "ambulance"}
						responsiveMetrics={responsiveMetrics?.care}
					/>
					<View
						style={[
							styles.intentActionRow,
							styles.intentActionRowBiased,
							responsiveMetrics?.care?.actionRowStyle,
						]}
					>
						<View style={[styles.intentActionHalf, styles.intentActionHalfLeading]}>
							<IntentCard
								label={MAP_EXPLORE_INTENT_COPY.BED_SPACE}
								subtext={bedSubtext}
								iconName="bed"
								colors={["#5F748E", "#4C6078"]}
								panelBias="leading"
								onPress={() => onChooseCare("bed")}
								isSelected={selectedCare === "bed"}
								responsiveMetrics={responsiveMetrics?.care}
							/>
						</View>
						<View style={[styles.intentActionHalf, styles.intentActionHalfTrailing]}>
							<IntentCard
								label={MAP_EXPLORE_INTENT_COPY.COMPARE}
								subtext={MAP_EXPLORE_INTENT_COPY.COMPARE_SUBTEXT}
								iconName="format-list-bulleted"
								colors={["#737C88", "#596370"]}
								hierarchy="tertiary"
								panelBias="trailing"
								onPress={() => onChooseCare("both")}
								disabled={isCareDiscoveryPending}
								isSelected={selectedCare === "both"}
								responsiveMetrics={responsiveMetrics?.care}
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
				hitSlop={CHOOSE_CARE_HEADER_HIT_SLOP}
				style={({ pressed }) => [
					styles.sectionTrigger,
					styles.chooseCareSectionTrigger,
					sectionTriggerStyle,
					pressed ? styles.sectionTriggerPressed : null,
				]}
			>
				<Text style={[styles.sectionLabel, sectionLabelStyle, { color: mutedColor }]}>
					{MAP_EXPLORE_INTENT_COPY.CHOOSE_CARE}
				</Text>
				<Ionicons name="chevron-forward" size={16} color={mutedColor} />
			</Pressable>

			{/* PULLBACK NOTE: Pass D — liveRegion so VoiceOver announces care selection changes (E-2.13) */}
			<View
				style={[styles.careRow, styles.careRowBiased, careRowStyle]}
				accessibilityLiveRegion="polite"
			>
				<IntentOrb
					label={MAP_EXPLORE_INTENT_COPY.AMBULANCE}
					subtext={ambulanceSubtext}
					iconName="ambulance"
					colors={["#A11217", "#6D080D"]}
					hierarchy="primary"
					actionBias="primary"
					containerStyle={styles.careActionPrimaryBias}
					onPress={() => onChooseCare("ambulance")}
					disabled={isCareDiscoveryPending}
					isSelected={selectedCare === "ambulance"}
					titleColor={titleColor}
					mutedColor={mutedColor}
					pulseProgress={pulseProgress}
					responsiveStyles={careResponsiveStyles}
				/>
				<IntentOrb
					label={MAP_EXPLORE_INTENT_COPY.BED_SPACE}
					subtext={bedSubtext}
					iconName="bed"
					colors={["#6F8DA7", "#506A86"]}
					hierarchy="secondary"
					actionBias="leading"
					containerStyle={[styles.careActionLeadingBias, notReadyStyle]}
					onPress={() => onChooseCare("bed")}
					isSelected={selectedCare === "bed"}
					titleColor={titleColor}
					mutedColor={mutedColor}
					responsiveStyles={careResponsiveStyles}
				/>
				<IntentOrb
					label={MAP_EXPLORE_INTENT_COPY.COMPARE}
					subtext={MAP_EXPLORE_INTENT_COPY.COMPARE_SUBTEXT}
					iconName="format-list-bulleted"
					colors={["#7A8592", "#596370"]}
					hierarchy="tertiary"
					actionBias="trailing"
					containerStyle={[styles.careActionTrailingBias, notReadyStyle]}
					onPress={() => onChooseCare("both")}
					disabled={isCareDiscoveryPending}
					isSelected={selectedCare === "both"}
					titleColor={titleColor}
					mutedColor={mutedColor}
					responsiveStyles={careResponsiveStyles}
				/>
			</View>
		</>
	);
}
