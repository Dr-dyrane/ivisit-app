import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InAppBrowserLink from "../../../ui/InAppBrowserLink";
import { MAP_EXPLORE_INTENT_COPY } from "./mapExploreIntent.content";
import MapExploreIntentCareSection from "./MapExploreIntentCareSection";
import MapExploreIntentHospitalRail from "./MapExploreIntentHospitalRail";
import MapExploreIntentHospitalSummaryCard from "./MapExploreIntentHospitalSummaryCard";
import MapExploreIntentProfileTrigger from "./MapExploreIntentProfileTrigger";
import styles from "./mapExploreIntent.styles";

export function MapExploreIntentTopRow({
	isCollapsed,
	isSidebarPresentation,
	isWebMobileVariant,
	isWebMobileMd,
	shouldCenterContent,
	presentationMode,
	shellMaxWidth,
	tokens,
	isDarkMode,
	onOpenSearch,
	onOpenProfile,
	profileImageSource,
	isSignedIn,
}) {
	return (
		<View
			style={[
				styles.topRow,
				isCollapsed ? styles.topRowCollapsed : null,
				isWebMobileVariant ? styles.topRowWebMobile : null,
				isWebMobileMd ? styles.topRowWebMobileMd : null,
				shouldCenterContent ? styles.topRowCentered : null,
				presentationMode === "modal" ? styles.topRowModal : null,
				presentationMode === "panel" || isSidebarPresentation ? styles.topRowPanel : null,
				isSidebarPresentation ? styles.topRowSidebar : null,
				shouldCenterContent && shellMaxWidth ? { maxWidth: shellMaxWidth } : null,
			]}
		>
			<Pressable
				onPress={onOpenSearch}
				style={[
					styles.searchPill,
					isCollapsed ? styles.searchPillCollapsed : null,
					isWebMobileVariant ? styles.searchPillWebMobile : null,
					{
						borderRadius: isCollapsed ? 18 : 22,
						borderCurve: "continuous",
						backgroundColor: tokens.searchSurface,
					},
				]}
			>
				<Ionicons name="search" size={isCollapsed ? 17 : 19} color={tokens.titleColor} />
				<Text style={[styles.searchText, { color: tokens.mutedText }]}>
					{MAP_EXPLORE_INTENT_COPY.SEARCH}
				</Text>
			</Pressable>

			<MapExploreIntentProfileTrigger
				onPress={onOpenProfile}
				userImageSource={profileImageSource}
				isSignedIn={isSignedIn}
				isCollapsed={isCollapsed}
			/>
		</View>
	);
}

export function MapExploreIntentFooterTerms({ isExpanded, tokens }) {
	if (!isExpanded) return null;

	return (
		<View style={styles.footerSlot}>
			<InAppBrowserLink
				label={MAP_EXPLORE_INTENT_COPY.TERMS}
				url="https://ivisit.ng/terms"
				color={tokens.mutedText}
				style={styles.termsLink}
				textStyle={styles.termsText}
			/>
		</View>
	);
}

export function buildMapExploreIntentScreenSections({
	variant,
	hospitalSummaryMode,
	careLayoutMode,
	shouldCenterContent,
	contentMaxWidth,
	tokens,
	isDarkMode,
	nearestHospital,
	nearestHospitalMeta,
	nearbyHospitalCount,
	totalAvailableBeds,
	nearbyBedHospitals,
	selectedCare,
	onOpenHospitals,
	onChooseCare,
	onOpenCareHistory,
	pulseProgress,
	isExpanded,
	featuredHospitals,
	onOpenFeaturedHospital,
	featuredRailWidth,
}) {
	const sections = [
		{
			key: "hospital_summary",
			content: (
				<MapExploreIntentHospitalSummaryCard
					variant={variant}
					layoutMode={hospitalSummaryMode}
					isCentered={shouldCenterContent}
					maxWidth={contentMaxWidth}
					tokens={tokens}
					isDarkMode={isDarkMode}
					nearestHospital={nearestHospital}
					nearestHospitalMeta={nearestHospitalMeta}
					nearbyHospitalCount={nearbyHospitalCount}
					totalAvailableBeds={totalAvailableBeds}
					onOpenHospitals={onOpenHospitals}
				/>
			),
			panelFlex: 1.16,
			panelMinWidth: 320,
		},
		{
			key: "care_selection",
			content: (
				<MapExploreIntentCareSection
					layoutMode={careLayoutMode}
					selectedCare={selectedCare}
					onChooseCare={onChooseCare}
					onOpenCareHistory={onOpenCareHistory}
					nearbyHospitalCount={nearbyHospitalCount}
					totalAvailableBeds={totalAvailableBeds}
					nearbyBedHospitals={nearbyBedHospitals}
					titleColor={tokens.titleColor}
					mutedColor={tokens.mutedText}
					isDarkMode={isDarkMode}
					pulseProgress={pulseProgress}
				/>
			),
			panelFlex: 0.92,
			panelMinWidth: 280,
		},
	];

	if (!isExpanded) {
		return sections;
	}

	return [
		...sections,
		{
			key: "featured_hospitals",
			fullBleed: !shouldCenterContent,
			containerStyle:
				shouldCenterContent && contentMaxWidth ? { maxWidth: contentMaxWidth } : null,
			content: (
				<View
					style={[
						styles.expandedSection,
						shouldCenterContent ? styles.expandedSectionContained : null,
					]}
				>
					<View
						style={[
							styles.expandedSectionHeader,
							shouldCenterContent ? styles.expandedSectionHeaderContained : null,
						]}
					>
						<Text style={[styles.sectionLabel, { color: tokens.mutedText }]}>
							Choose a hospital
						</Text>
					</View>
					<View style={styles.featuredRailViewport}>
						<MapExploreIntentHospitalRail
							featuredHospitals={featuredHospitals}
							titleColor="#F8FAFC"
							bodyColor="rgba(248,250,252,0.82)"
							onOpenFeaturedHospital={onOpenFeaturedHospital}
							availableWidth={featuredRailWidth}
							contained={shouldCenterContent}
						/>
					</View>
				</View>
			),
		},
	];
}
