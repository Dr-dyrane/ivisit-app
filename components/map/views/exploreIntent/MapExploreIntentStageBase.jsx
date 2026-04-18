import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, ScrollView, useWindowDimensions } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_CARE_PULSE_MS } from "../../tokens/mapMotionTokens";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";
import MapExploreIntentScreenModularizer from "./MapExploreIntentScreenModularizer";
import { getMapExploreIntentScreenConfig } from "./mapExploreIntent.screenConfigs";
import {
	buildMapExploreIntentScreenSections,
	MapExploreIntentFooterTerms,
	MapExploreIntentTopRow,
} from "./MapExploreIntentStageParts";
import useMapExploreIntentResponsiveMetrics from "./useMapExploreIntentResponsiveMetrics";
import styles from "./mapExploreIntent.styles";

export default function MapExploreIntentStageBase({
	variant = MAP_INTENT_VARIANTS.IOS_MOBILE,
	screenConfig,
	sheetHeight,
	snapState,
	nearestHospital,
	nearestHospitalMeta,
	selectedCare,
	onOpenSearch,
	onOpenHospitals,
	onChooseCare,
	onOpenProfile,
	onOpenCareHistory,
	onOpenFeaturedHospital,
	onSnapStateChange,
	profileImageSource,
	isSignedIn,
	nearbyHospitalCount,
	totalAvailableBeds,
	nearbyBedHospitals,
	featuredHospitals = [],
}) {
	const { isDarkMode } = useTheme();
	const { width } = useWindowDimensions();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const responsiveMetrics = useMapExploreIntentResponsiveMetrics();
	const isWebPlatform = Platform.OS === "web";
	const pulseProgress = useRef(new Animated.Value(0)).current;
	const resolvedScreenConfig = useMemo(
		() => screenConfig || getMapExploreIntentScreenConfig(variant),
		[screenConfig, variant],
	);
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const isExpanded = snapState === MAP_SHEET_SNAP_STATES.EXPANDED;
	const careLayoutMode = resolvedScreenConfig?.careLayoutMode || "canonical";
	const hospitalSummaryMode = resolvedScreenConfig?.hospitalSummaryMode || "canonical";
	const presentationMode = resolvedScreenConfig?.presentationMode || "sheet";
	const isSidebarPresentation = presentationMode === "sidebar";
	const isWebMobileVariant =
		variant === MAP_INTENT_VARIANTS.WEB_MOBILE ||
		(!isSidebarPresentation && variant === MAP_INTENT_VARIANTS.WEB_SM_WIDE);
	const isWebMobileMd = !isSidebarPresentation && variant === MAP_INTENT_VARIANTS.WEB_MD;
	const shouldCenterContent = Boolean(resolvedScreenConfig?.centerContent);
	const shellAlignment = resolvedScreenConfig?.shellAlignment || "center";
	const contentMaxWidth = resolvedScreenConfig?.contentMaxWidth || null;
	const shellMaxWidth = resolvedScreenConfig?.shellMaxWidth || contentMaxWidth || null;
	const allowedSnapStates = useMemo(
		() => [
			MAP_SHEET_SNAP_STATES.COLLAPSED,
			MAP_SHEET_SNAP_STATES.HALF,
			MAP_SHEET_SNAP_STATES.EXPANDED,
		],
		[],
	);
	const {
		allowScrollDetents,
		bodyScrollEnabled,
		bodyScrollRef,
		handleBodyScroll,
		handleBodyScrollBeginDrag,
		handleBodyScrollEndDrag,
		handleBodyWheel,
		handleSnapToggle,
	} = useMapSheetDetents({
		snapState,
		onSnapStateChange,
		presentationMode,
		allowedSnapStates,
		extraScrollEnabled: shouldCenterContent,
	});
	const shellWidth = useMemo(() => {
		if (presentationMode === "sheet" || !shellMaxWidth || !shouldCenterContent) return null;
		const horizontalGutter =
			presentationMode === "panel" || presentationMode === "sidebar" ? 28 : 16;
		return Math.max(320, Math.min(shellMaxWidth, width - horizontalGutter * 2));
	}, [presentationMode, shellMaxWidth, shouldCenterContent, width]);
	const featuredRailWidth = useMemo(() => {
		if (!shouldCenterContent) return null;
		if ((presentationMode === "panel" || presentationMode === "sidebar") && shellWidth) {
			return Math.max(320, shellWidth - 40);
		}
		if (contentMaxWidth) {
			return contentMaxWidth;
		}
		return null;
	}, [contentMaxWidth, presentationMode, shellWidth, shouldCenterContent]);
	const screenSections = useMemo(
		() =>
			buildMapExploreIntentScreenSections({
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
			responsiveMetrics,
		}),
		[
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
			responsiveMetrics,
		],
	);

	useEffect(() => {
		if (selectedCare || isExpanded) {
			pulseProgress.stopAnimation();
			pulseProgress.setValue(0);
			return undefined;
		}

		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseProgress, {
					toValue: 1,
					duration: MAP_CARE_PULSE_MS,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(pulseProgress, {
					toValue: 0,
					duration: MAP_CARE_PULSE_MS,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			]),
		);
		pulseLoop.start();

		return () => {
			pulseLoop.stop();
			pulseProgress.stopAnimation();
		};
	}, [isExpanded, pulseProgress, selectedCare]);

	const headerSlot = (
		<MapExploreIntentTopRow
			isCollapsed={isCollapsed}
			isSidebarPresentation={isSidebarPresentation}
			isWebMobileVariant={isWebMobileVariant}
			isWebMobileMd={isWebMobileMd}
			shouldCenterContent={shouldCenterContent}
			presentationMode={presentationMode}
			shellMaxWidth={shellMaxWidth}
			tokens={tokens}
			isDarkMode={isDarkMode}
			onOpenSearch={onOpenSearch}
			onOpenProfile={onOpenProfile}
			profileImageSource={profileImageSource}
			isSignedIn={isSignedIn}
			responsiveMetrics={responsiveMetrics}
		/>
	);

	const footerTerms = (
		<MapExploreIntentFooterTerms
			isExpanded={isExpanded}
			tokens={tokens}
			responsiveMetrics={responsiveMetrics}
		/>
	);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			shellAlignment={shellAlignment}
			topSlot={headerSlot}
			footerSlot={footerTerms}
			onHandlePress={handleSnapToggle}
		>
			{isCollapsed ? null : (
				<ScrollView
					ref={bodyScrollRef}
					style={styles.bodyScrollViewport}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled
					bounces={!isSidebarPresentation && !isWebPlatform}
					alwaysBounceVertical={!isSidebarPresentation && !isWebPlatform}
					overScrollMode={isSidebarPresentation || !allowScrollDetents ? "auto" : "always"}
					directionalLockEnabled
					onWheel={isWebPlatform ? handleBodyWheel : undefined}
					scrollEventThrottle={16}
					onScrollBeginDrag={handleBodyScrollBeginDrag}
					onScroll={handleBodyScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					onMomentumScrollEnd={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
					contentContainerStyle={[
						styles.bodyScrollContent,
						responsiveMetrics.body.scrollContentStyle,
						isWebMobileVariant ? styles.bodyScrollContentWebMobile : null,
						isWebMobileVariant ? responsiveMetrics.body.scrollContentWebMobileStyle : null,
						presentationMode === "modal" ? styles.bodyScrollContentModal : null,
						presentationMode === "panel" || isSidebarPresentation
							? styles.bodyScrollContentPanel
							: null,
						isSidebarPresentation ? styles.bodyScrollContentSidebar : null,
					]}
				>
					<MapExploreIntentScreenModularizer
						screens={screenSections}
						isWebMobileVariant={isWebMobileVariant}
						isWebMobileMd={isWebMobileMd}
						presentationMode={presentationMode}
						centerContent={shouldCenterContent}
						contentMaxWidth={contentMaxWidth}
						responsiveMetrics={responsiveMetrics}
					/>
				</ScrollView>
			)}
		</MapSheetShell>
	);
}
