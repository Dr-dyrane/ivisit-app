import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InAppBrowserLink from "../../../ui/InAppBrowserLink";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_CARE_PULSE_MS, getMapPlatformMotion } from "../../tokens/mapMotionTokens";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import { MAP_EXPLORE_INTENT_COPY, MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";
import MapExploreIntentCareSection from "./MapExploreIntentCareSection";
import MapExploreIntentHospitalRail from "./MapExploreIntentHospitalRail";
import MapExploreIntentHospitalSummaryCard from "./MapExploreIntentHospitalSummaryCard";
import MapExploreIntentProfileTrigger from "./MapExploreIntentProfileTrigger";
import MapExploreIntentScreenModularizer from "./MapExploreIntentScreenModularizer";
import { getMapExploreIntentScreenConfig } from "./mapExploreIntent.screenConfigs";
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
	const platformMotion = useMemo(() => getMapPlatformMotion(Platform.OS), []);
	const sheetScrollMotion = platformMotion.sheet.scroll;
	const isWebPlatform = Platform.OS === "web";
	const allowScrollDetents = Boolean(sheetScrollMotion.enableContentDetents);
	const allowWheelDetents = isWebPlatform && Boolean(sheetScrollMotion.enableWheelDetents);
	const pulseProgress = useRef(new Animated.Value(0)).current;
	const bodyScrollRef = useRef(null);
	const scrollStartOffsetYRef = useRef(0);
	const lastScrollOffsetYRef = useRef(0);
	const scrollSnapHandledRef = useRef(false);
	const wheelSnapAccumRef = useRef(0);
	const SCROLL_SNAP_TOP_THRESHOLD = sheetScrollMotion.topThreshold;
	const SCROLL_SNAP_EXPAND_OFFSET = sheetScrollMotion.expandOffset;
	const SCROLL_SNAP_COLLAPSE_PULL = sheetScrollMotion.collapsePull;
	const SCROLL_SNAP_EXPAND_VELOCITY = sheetScrollMotion.expandVelocity;
	const SCROLL_SNAP_COLLAPSE_VELOCITY = sheetScrollMotion.collapseVelocity;
	const HALF_COLLAPSE_EXTRA_PULL = sheetScrollMotion.halfCollapseExtraPull;
	const HALF_COLLAPSE_VELOCITY_FACTOR = sheetScrollMotion.halfCollapseVelocityFactor;
	const HALF_COLLAPSE_WHEEL_THRESHOLD = sheetScrollMotion.halfCollapseWheelThreshold;
	const resolvedScreenConfig = useMemo(
		() => screenConfig || getMapExploreIntentScreenConfig(variant),
		[screenConfig, variant],
	);
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const isExpanded = snapState === MAP_SHEET_SNAP_STATES.EXPANDED;
	const isCanonicalMobileIntent =
		variant === MAP_INTENT_VARIANTS.IOS_MOBILE ||
		variant === MAP_INTENT_VARIANTS.ANDROID_MOBILE;
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
	const screenSections = [
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
					pulseProgress={pulseProgress}
				/>
			),
			panelFlex: 0.92,
			panelMinWidth: 280,
		},
		isExpanded
			? {
					key: "featured_hospitals",
					fullBleed: !shouldCenterContent,
					containerStyle: shouldCenterContent && contentMaxWidth ? { maxWidth: contentMaxWidth } : null,
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
								<Text style={styles.expandedSectionTitle}>Nearby now</Text>
								{shouldCenterContent && !isSidebarPresentation ? (
									<Text style={styles.expandedSectionSubtext}>Live options worth opening next</Text>
								) : null}
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
				}
			: null,
	].filter(Boolean);

	useEffect(() => {
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
	}, [pulseProgress]);

	useEffect(() => {
		scrollSnapHandledRef.current = false;
		wheelSnapAccumRef.current = 0;
		scrollStartOffsetYRef.current = 0;
		lastScrollOffsetYRef.current = 0;
	}, [snapState]);

	const handleSnapToggle = (nextState = null) => {
		if (typeof onSnapStateChange !== "function") return;
		if (nextState) {
			onSnapStateChange(nextState);
			return;
		}
		if (snapState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
			onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}
		if (snapState === MAP_SHEET_SNAP_STATES.HALF) {
			onSnapStateChange(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}
		onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
	};

	const triggerScrollSnap = (nextState) => {
		if (
			isSidebarPresentation ||
			typeof onSnapStateChange !== "function" ||
			!nextState ||
			scrollSnapHandledRef.current
		) {
			return;
		}

		scrollSnapHandledRef.current = true;
		wheelSnapAccumRef.current = 0;
		scrollStartOffsetYRef.current = 0;
		lastScrollOffsetYRef.current = 0;
		bodyScrollRef.current?.scrollTo?.({ y: 0, animated: false });
		onSnapStateChange(nextState);
	};

	const handleBodyScrollBeginDrag = (event) => {
		const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
		scrollStartOffsetYRef.current = offsetY;
		lastScrollOffsetYRef.current = offsetY;
		scrollSnapHandledRef.current = false;
		wheelSnapAccumRef.current = 0;
	};

	const handleBodyScroll = (event) => {
		const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
		lastScrollOffsetYRef.current = offsetY;
		if (offsetY > SCROLL_SNAP_TOP_THRESHOLD) {
			wheelSnapAccumRef.current = 0;
		}

		if (isSidebarPresentation || !allowScrollDetents || scrollSnapHandledRef.current) return;
		const startedNearTop = scrollStartOffsetYRef.current <= SCROLL_SNAP_TOP_THRESHOLD;
		if (!startedNearTop) return;

		if (snapState === MAP_SHEET_SNAP_STATES.HALF && offsetY > SCROLL_SNAP_EXPAND_OFFSET) {
			triggerScrollSnap(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}

		if (offsetY < SCROLL_SNAP_COLLAPSE_PULL) {
			if (snapState === MAP_SHEET_SNAP_STATES.EXPANDED) {
				triggerScrollSnap(MAP_SHEET_SNAP_STATES.HALF);
				return;
			}
			if (
				snapState === MAP_SHEET_SNAP_STATES.HALF &&
				offsetY < SCROLL_SNAP_COLLAPSE_PULL - HALF_COLLAPSE_EXTRA_PULL
			) {
				triggerScrollSnap(MAP_SHEET_SNAP_STATES.COLLAPSED);
			}
		}
	};

	const handleBodyScrollEndDrag = (event) => {
		const offsetY = event?.nativeEvent?.contentOffset?.y ?? lastScrollOffsetYRef.current ?? 0;
		const velocityY = event?.nativeEvent?.velocity?.y ?? 0;
		lastScrollOffsetYRef.current = offsetY;

		if (isSidebarPresentation || !allowScrollDetents || scrollSnapHandledRef.current) return;
		const startedNearTop = scrollStartOffsetYRef.current <= SCROLL_SNAP_TOP_THRESHOLD;
		if (!startedNearTop) return;

		if (
			snapState === MAP_SHEET_SNAP_STATES.HALF &&
			offsetY <= SCROLL_SNAP_EXPAND_OFFSET * 0.75 &&
			velocityY > SCROLL_SNAP_EXPAND_VELOCITY
		) {
			triggerScrollSnap(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}

		if (offsetY <= 0 && velocityY < SCROLL_SNAP_COLLAPSE_VELOCITY) {
			if (snapState === MAP_SHEET_SNAP_STATES.EXPANDED) {
				triggerScrollSnap(MAP_SHEET_SNAP_STATES.HALF);
				return;
			}
			if (
				snapState === MAP_SHEET_SNAP_STATES.HALF &&
				velocityY < SCROLL_SNAP_COLLAPSE_VELOCITY * HALF_COLLAPSE_VELOCITY_FACTOR
			) {
				triggerScrollSnap(MAP_SHEET_SNAP_STATES.COLLAPSED);
			}
		}
	};

	const handleBodyWheel = (event) => {
		if (isSidebarPresentation || !allowWheelDetents || scrollSnapHandledRef.current || !isWebPlatform) return;

		const deltaY = Number(event?.nativeEvent?.deltaY ?? 0);
		if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 1) return;

		const isAtTop = lastScrollOffsetYRef.current <= SCROLL_SNAP_TOP_THRESHOLD;
		if (!isAtTop) {
			wheelSnapAccumRef.current = 0;
			return;
		}

		wheelSnapAccumRef.current =
			Math.sign(wheelSnapAccumRef.current) === Math.sign(deltaY) || wheelSnapAccumRef.current === 0
				? wheelSnapAccumRef.current + deltaY
				: deltaY;

		if (snapState === MAP_SHEET_SNAP_STATES.EXPANDED && wheelSnapAccumRef.current <= -42) {
			triggerScrollSnap(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}

		if (
			snapState === MAP_SHEET_SNAP_STATES.HALF &&
			wheelSnapAccumRef.current <= HALF_COLLAPSE_WHEEL_THRESHOLD
		) {
			triggerScrollSnap(MAP_SHEET_SNAP_STATES.COLLAPSED);
		}
	};

	const topRow = (
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
						borderRadius: tokens.cardRadius,
						backgroundColor: tokens.searchSurface,
					},
				]}
			>
				<Ionicons name="search" size={isCollapsed ? 18 : 20} color={tokens.titleColor} />
				<Text style={[styles.searchText, { color: tokens.titleColor }]}> 
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

	const headerSlot = (
		<>
			{topRow}
		</>
	);

	const bodyScrollEnabled =
		isSidebarPresentation ||
		isExpanded ||
		allowScrollDetents ||
		allowWheelDetents ||
		shouldCenterContent;

	const footerTerms = isExpanded ? (
		<View style={styles.footerSlot}>
			<InAppBrowserLink
				label={MAP_EXPLORE_INTENT_COPY.TERMS}
				url="https://ivisit.ng/terms"
				color={tokens.mutedText}
				style={styles.termsLink}
				textStyle={styles.termsText}
			/>
		</View>
	) : null;

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
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
						isWebMobileVariant ? styles.bodyScrollContentWebMobile : null,
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
					/>
				</ScrollView>
			)}
		</MapSheetShell>
	);
}
