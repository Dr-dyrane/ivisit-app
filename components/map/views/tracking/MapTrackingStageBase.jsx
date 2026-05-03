import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useTheme } from "../../../../contexts/ThemeContext";
// PULLBACK NOTE: Phase 5c — useEmergency() removed from MapTrackingStageBase
// OLD: imported EmergencyContext for raw trip data + action callbacks
// NEW: raw trip data sourced from activeMapRequest.raw; action callbacks are props
import { useVisits } from "../../../../contexts/VisitsContext";
import { useEmergencyRequests } from "../../../../hooks/emergency/useEmergencyRequests";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import { joinDisplayParts, toTitleCaseLabel } from "./mapTracking.presentation";
import {
	MapTrackingTopSlot,
	TrackingBottomActionButton,
	TrackingCtaButton,
	TrackingDetailsCard,
	TrackingRouteCard,
	TrackingTeamHeroCard,
} from "./parts/MapTrackingParts";
import useMapTrackingController from "./useMapTrackingController";
import useMapTrackingRuntime from "./useMapTrackingRuntime";
import { useMapTrackingStatus } from "../../../../hooks/map/exploreFlow/useMapTrackingStatus";
import { buildTrackingThemeTokens } from "./mapTracking.theme";
import styles from "./mapTracking.styles";

export default function MapTrackingStageBase({
	sheetHeight,
	snapState,
	hospital,
	payload = null,
	activeMapRequest = null,
	currentLocation = null,
	routeInfo = null,
	headerActionRequest = null,
	onConsumeHeaderActionRequest,
	onOpenCommitTriageFromTracking,
	onAddBedFromTracking,
	onAddAmbulanceFromTracking,
	onSnapStateChange,
	// PULLBACK NOTE: Phase 5c — new props replacing useEmergency() context reads
	// OLD: destructured from useEmergency() inside component
	// NEW: passed as props from MapScreen → MapSheetOrchestrator → MapTrackingOrchestrator
	hospitals = [],
	allHospitals = [],
	ambulanceTelemetryHealth = null,
	setAmbulanceTripStatus,
	setBedBookingStatus,
	setPendingApproval,
	stopAmbulanceTrip,
	stopBedBooking,
	isArrived = false,
	isPendingApproval = false,
}) {
	const { isDarkMode } = useTheme();
	// PULLBACK NOTE: Phase 5c — raw trip objects now sourced from activeMapRequest.raw
	// OLD: destructured directly from useEmergency() — redundant second context read
	// NEW: extracted from activeMapRequest.raw (same data, already flowing as prop)
	const activeAmbulanceTrip = activeMapRequest?.raw?.activeAmbulanceTrip ?? null;
	const activeBedBooking = activeMapRequest?.raw?.activeBedBooking ?? null;
	const pendingApproval = activeMapRequest?.raw?.pendingApproval ?? null;
	const { updateVisit, cancelVisit, completeVisit } = useVisits();
	const { setRequestStatus } = useEmergencyRequests();
	const {
		isSidebarPresentation,
		contentMaxWidth,
		presentationMode,
		shellWidth,
		shouldUseWideStageInset,
	} = useMapStageSurfaceLayout();
	const stageMetrics = useMapStageResponsiveMetrics({ presentationMode });

	const {
		triageRequestId,
		triageRequestDraft,
		triageAnsweredCount,
		triageDisplayTotalSteps,
		triageHasData,
		triageIsComplete,
		triageProgressValue,
		ambulanceTripProgress,
		bedProgress,
		formattedBedRemaining,
		canMarkArrived,
		canCompleteAmbulance,
		canCheckInBed,
		canCompleteBed,
		shouldPromoteTriage,
		onCancelAmbulanceTrip,
		onMarkAmbulanceArrived,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onMarkBedOccupied,
		onCompleteBedBooking,
		hospitalName,
		hospitalAddress,
		pickupLabel,
		pickupDetail,
		responderName,
		responderPlate,
		responderSafetyMeta,
		trackingKind,
		etaLabel,
		distanceLabel,
		serviceLabel,
		requestLabel,
		telemetryWarningLabel,
		telemetryHeroTone,
		secondaryTrackingLabel,
		sheetSubtitle,
		sheetTitleDisplay,
		crewCountLabel,
		toneColors,
		routeVisualProgress,
	} = useMapTrackingRuntime({
		hospitals,
		allHospitals,
		hospital,
		payload,
		activeMapRequest,
		currentLocation,
		routeInfo,
		activeAmbulanceTrip,
		ambulanceTelemetryHealth,
		activeBedBooking,
		pendingApproval,
		isDarkMode,
		setRequestStatus,
		cancelVisit,
		completeVisit,
		updateVisit,
		setAmbulanceTripStatus,
		setBedBookingStatus,
		stopAmbulanceTrip,
		stopBedBooking,
		isArrived,
		isPendingApproval,
	});

	// PULLBACK NOTE: Phase 8 — 5-layer state management for tracking visualization
	// OLD: Status visualization logic scattered in components
	// NEW: Centralized Jotai atoms + hook for ephemeral UI state
	const {
		statusPhase,
		shouldAnimateTitle,
		titleColor: dynamicTitleColor,
		heroGradient,
		ctaTheme,
		markTitleAnimated,
	} = useMapTrackingStatus({
		trackingKind,
		activeAmbulanceTrip,
		activeBedBooking,
		isArrived,
		isPendingApproval,
		ambulanceTripProgress,
		nowMs: Date.now(),
		canMarkArrived,
	});

	// Sheet title animation
	// PULLBACK NOTE: Phase G — Reduced motion accessibility.
	const reducedMotion = useReducedMotion();
	const titleOpacityAnim = useRef(new Animated.Value(0)).current;
	const titleTranslateAnim = useRef(new Animated.Value(-10)).current;

	useEffect(() => {
		if (!shouldAnimateTitle) return;
		if (reducedMotion) {
			titleOpacityAnim.setValue(1);
			titleTranslateAnim.setValue(0);
			markTitleAnimated();
			return;
		}

		// Reset animation values
		titleOpacityAnim.setValue(0);
		titleTranslateAnim.setValue(-10);

		// Run animation
		Animated.parallel([
			Animated.timing(titleOpacityAnim, {
				toValue: 1,
				duration: 420,
				useNativeDriver: true,
			}),
			Animated.spring(titleTranslateAnim, {
				toValue: 0,
				friction: 8,
				tension: 40,
				useNativeDriver: true,
			}),
		]).start(() => {
			markTitleAnimated();
		});
	}, [shouldAnimateTitle, reducedMotion, titleOpacityAnim, titleTranslateAnim, markTitleAnimated]);

	const canToggleSnapState =
		presentationMode === "sheet" &&
		(snapState === MAP_SHEET_SNAP_STATES.HALF ||
			snapState === MAP_SHEET_SNAP_STATES.EXPANDED);
	const effectiveSnapState =
		presentationMode === "sheet"
			? snapState
			: MAP_SHEET_SNAP_STATES.EXPANDED;
	const isExpanded = effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED;
	const allowedSnapStates = useMemo(
		() =>
			presentationMode === "sheet"
				? [MAP_SHEET_SNAP_STATES.HALF, MAP_SHEET_SNAP_STATES.EXPANDED]
				: [MAP_SHEET_SNAP_STATES.EXPANDED],
		[presentationMode],
	);
	const {
		allowScrollDetents,
		bodyScrollEnabled,
		bodyScrollRef,
		handleBodyScroll,
		handleBodyScrollBeginDrag,
		handleBodyScrollEndDrag,
		handleBodyWheel,
	} = useMapSheetDetents({
		snapState: effectiveSnapState,
		onSnapStateChange,
		presentationMode,
		allowedSnapStates,
	});
	const {
		androidExpandedBodyGesture,
		androidExpandedBodyStyle,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState: effectiveSnapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const topSlotContainerStyle = [
		sheetStageStyles.topSlotContained,
		presentationMode === "sheet" ? sheetStageStyles.topSlotSheet : null,
		presentationMode === "modal" ? sheetStageStyles.topSlotModal : null,
		isSidebarPresentation ? sheetStageStyles.topSlotSidebar : null,
		shouldUseWideStageInset ? sheetStageStyles.topSlotWide : null,
		modalContainedStyle,
	];

	const handleSheetToggle = useCallback(() => {
		if (!canToggleSnapState || typeof onSnapStateChange !== "function") return;
		onSnapStateChange(
			effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
				? MAP_SHEET_SNAP_STATES.HALF
				: MAP_SHEET_SNAP_STATES.EXPANDED,
		);
	}, [canToggleSnapState, effectiveSnapState, onSnapStateChange]);

	const {
		openTrackingTriage,
		primaryAction,
		trackingDetailRows,
		midActions,
		bottomAction,
		// PULLBACK NOTE: Phase 8 — Pass B: rating modal lifted to MapScreen
		// closeRating/skipRating/submitRating no longer consumed here
	} = useMapTrackingController({
		activeAmbulanceTrip,
		activeBedBooking,
		pendingApproval,
		activeMapRequest,
		setPendingApproval,
		setRequestStatus,
		cancelVisit,
		updateVisit,
		onCancelAmbulanceTrip,
		onCancelBedBooking,
		onMarkAmbulanceArrived,
		onMarkBedOccupied,
		onCompleteAmbulanceTrip,
		onCompleteBedBooking,
		stopAmbulanceTrip,
		stopBedBooking,
		onAddBedFromTracking,
		onAddAmbulanceFromTracking,
		onOpenCommitTriageFromTracking,
		headerActionRequest,
		onConsumeHeaderActionRequest,
		snapState,
		trackingKind,
		hospitalName,
		triageRequestId,
		triageRequestDraft,
		triageHasData,
		triageIsComplete,
		triageAnsweredCount,
		triageDisplayTotalSteps,
		shouldPromoteTriage,
		canMarkArrived,
		canCompleteAmbulance,
		canCheckInBed,
		canCompleteBed,
		requestLabel,
		responderPlate,
		crewCountLabel,
		secondaryTrackingLabel,
		telemetryWarningLabel,
		etaLabel,
		serviceLabel,
		distanceLabel,
		pickupLabel,
		responderName,
	});

	const isBottomCompletionAction =
		bottomAction?.key === "complete-ambulance" ||
		bottomAction?.key === "complete-bed";
	const themeTokens = useMemo(
		() =>
			buildTrackingThemeTokens({
				isDarkMode,
				stageMetrics,
				triageIsComplete,
				triageAnsweredCount,
				telemetryHeroTone,
				routeVisualProgress,
				trackingKind,
				isBottomCompletionAction,
			}),
		[
			isBottomCompletionAction,
			isDarkMode,
			routeVisualProgress,
			stageMetrics,
			telemetryHeroTone,
			trackingKind,
			triageAnsweredCount,
			triageIsComplete,
		],
	);

	const expandedSnapContent = isExpanded ? (
		<>
			<TrackingRouteCard
				elevatedSurfaceColor={themeTokens.elevatedSurfaceColor}
				routeCardRadius={themeTokens.routeCardRadius}
				routeGradientColors={themeTokens.routeGradientColors}
				serviceLabel={serviceLabel}
				trackingKind={trackingKind}
				toneColors={toneColors}
				requestLabel={requestLabel}
				connectorTrackColor={themeTokens.connectorTrackColor}
				connectorProgressColor={themeTokens.connectorProgressColor}
				routeVisualProgress={routeVisualProgress}
				hospitalIconSurfaceColor={themeTokens.hospitalIconSurfaceColor}
				titleColor={themeTokens.titleColor}
				hospitalName={hospitalName}
				hospitalAddress={hospitalAddress}
				routeFadeColors={themeTokens.routeFadeColors}
				mutedColor={themeTokens.mutedColor}
				pickupIconSurfaceColor={themeTokens.pickupIconSurfaceColor}
				pickupLabel={pickupLabel}
				pickupDetail={pickupDetail}
			/>

			<TrackingDetailsCard
				surfaceColor={themeTokens.surfaceColor}
				detailCardRadius={themeTokens.detailCardRadius}
				detailGradientColors={themeTokens.detailGradientColors}
				mutedColor={themeTokens.mutedColor}
				requestSurfaceColor={themeTokens.requestSurfaceColor}
				trackingDetailRows={trackingDetailRows}
				isDarkMode={isDarkMode}
				titleColor={themeTokens.titleColor}
			/>
		</>
	) : null;

	// PULLBACK NOTE: Phase G — Hero card stage-aware data.
	// OLD: title fell back to "Driver assigned" placeholder for any ambulance state
	//      without a responder, including pending-approval and pre-dispatch — which
	//      gave the impression a driver had been assigned when none had. rightMeta
	//      showed plate/crew but never the ETA, so the user had to expand the sheet
	//      to see remaining time.
	// NEW: stage-keyed labels:
	//   - pending  → title "Awaiting approval", subtitle service label, meta "Pending"
	//   - ambulance no driver → title "Finding driver" (active state, not assigned)
	//   - ambulance + driver → title responder name (existing behaviour)
	//   - bed → title service label (existing behaviour)
	// rightMeta on ambulance now prefers ETA when known so the medium detent shows
	// the trip's most actionable signal at a glance (HIG single-focal-point rule).
	const heroHasResolvedEta = Boolean(
		etaLabel && etaLabel !== "Pending" && etaLabel !== "—"
	);
	const heroTitle =
		trackingKind === "pending"
			? "Awaiting approval"
			: trackingKind === "bed"
				? serviceLabel
				: responderName || "Finding driver";
	const heroSubtitle =
		trackingKind === "bed"
			? joinDisplayParts([hospitalName, secondaryTrackingLabel])
			: toTitleCaseLabel(serviceLabel);
	const heroRightMeta =
		trackingKind === "pending"
			? "Pending"
			: trackingKind === "bed"
				? formattedBedRemaining || null
				: heroHasResolvedEta
					? etaLabel
					: responderSafetyMeta || crewCountLabel || null;
	const heroAvatarIcon =
		trackingKind === "pending"
			? "hourglass-outline"
			: trackingKind === "bed"
				? "bed"
				: "person";

	const trackingPrimaryContent = (
		<>
			{/* PULLBACK NOTE: Phase G — single hero card surfaces stage-keyed copy + ETA */}
			<TrackingTeamHeroCard
				title={heroTitle}
				subtitle={heroSubtitle}
				rightMeta={heroRightMeta}
				stateLabel={null}
				statePillBackgroundColor={null}
				stateTextColor={null}
				progressValue={
					trackingKind === "ambulance"
						? ambulanceTripProgress
						: trackingKind === "bed"
							? bedProgress
							: 0
				}
				avatarIcon={heroAvatarIcon}
				backgroundColor={themeTokens.teamHeroWarningSurface}
				progressColor={themeTokens.teamHeroWarningProgressColor}
				titleColor={themeTokens.titleColor}
				mutedColor={themeTokens.mutedColor}
			/>

			{midActions.length ? (
				// PULLBACK NOTE: Phase 8 — Restored original bg; only animate icon/text colors on arrival
				<View
					style={[
						styles.ctaGroupCard,
						{ backgroundColor: themeTokens.secondaryCtaSurface },
					]}
				>
					{midActions.map((action, index) => {
						// PULLBACK NOTE: Phase 8 — On arrival, mute siblings; pop the confirm-arrival CTA
						const isArrivedPhase = statusPhase === "arrived";
						const isArrivalAction = action.key === "arrived";
						const baseIconColor =
							action.tone === "bed"
								? themeTokens.bedCareBlueColor
								: action.tone === "share"
									? themeTokens.shareActionColor
									: action.tone === "transport"
										? themeTokens.transportActionColor
										: action.tone === "state"
											? themeTokens.triageActionIconColor
											: themeTokens.infoActionColor;

						const iconColor = isArrivedPhase
							? isArrivalAction
								? ctaTheme.arrivalBg // Pop green on arrival
								: ctaTheme.mutedText // Mute siblings
							: baseIconColor;

						const labelColor = isArrivedPhase
							? isArrivalAction
								? ctaTheme.arrivalBg
								: ctaTheme.mutedText
							: themeTokens.titleColor;

						return (
							<TrackingCtaButton
								key={`mid-${action.key}`}
								action={action}
								isGrouped
								isDarkMode={isDarkMode}
								showDivider={index < midActions.length - 1}
								iconColor={iconColor}
								labelColor={labelColor}
							/>
						);
					})}
				</View>
			) : null}
		</>
	);

	const body =
		trackingKind === "idle" ? (
			<View style={[styles.emptyCard, { backgroundColor: themeTokens.surfaceColor }]}>
				<Text style={[styles.emptyTitle, { color: themeTokens.titleColor }]}>
					No active request
				</Text>
				<Text style={[styles.emptyMeta, { color: themeTokens.mutedColor }]}>
					{hospitalName}
				</Text>
			</View>
		) : (
			<View style={styles.sectionStack}>
				{trackingPrimaryContent}
				{expandedSnapContent}
				<TrackingBottomActionButton
					bottomAction={bottomAction}
					isBottomCompletionAction={isBottomCompletionAction}
					bottomActionGradientColors={themeTokens.bottomActionGradientColors}
					bottomActionTextColor={themeTokens.bottomActionTextColor}
					bottomActionSpinnerColor={themeTokens.bottomActionSpinnerColor}
				/>
			</View>
		);

	return (
		<>
			<MapSheetShell
				sheetHeight={sheetHeight}
				snapState={effectiveSnapState}
				presentationMode={presentationMode}
				shellWidth={shellWidth}
				allowedSnapStates={allowedSnapStates}
				topSlot={
					<View style={topSlotContainerStyle}>
						{/* PULLBACK NOTE: Phase 8 — Sheet title with animated status color */}
						<MapTrackingTopSlot
							title={trackingKind === "idle" ? "Tracking" : sheetTitleDisplay}
							subtitle={trackingKind === "idle" ? hospitalName : sheetSubtitle}
							// PULLBACK NOTE: Phase 8 — Original color for chevron/icons; dynamic only for animated title text
							titleColor={themeTokens.titleColor}
							titleTextColor={dynamicTitleColor}
							mutedColor={themeTokens.mutedColor}
							actionSurfaceColor={themeTokens.actionSurfaceColor}
							triageSurfaceColor={themeTokens.triageActionSurface}
							triageIconColor={themeTokens.triageActionIconColor}
							triageIconName="medkit"
							triageRingColor={themeTokens.triageRingColor}
							triageTrackColor={themeTokens.triageTrackColor}
							onToggle={handleSheetToggle}
							onOpenTriage={openTrackingTriage}
							showTriage={Boolean(triageRequestId)}
							triageComplete={triageIsComplete}
							triageProgress={triageProgressValue}
							showToggle={canToggleSnapState}
							toggleIconName={isExpanded ? "chevron-down" : "chevron-up"}
							toggleAccessibilityLabel={
								isExpanded
									? "Collapse tracking sheet"
									: "Expand tracking sheet"
							}
							titleAnimatedStyle={{
								opacity: titleOpacityAnim,
								transform: [{ translateY: titleTranslateAnim }],
							}}
						/>
					</View>
				}
				onHandlePress={handleSheetToggle}
			>
				<MapStageBodyScroll
					bodyScrollRef={bodyScrollRef}
					viewportStyle={sheetStageStyles.bodyScrollViewport}
					contentContainerStyle={[
						sheetStageStyles.bodyScrollContent,
						sheetStageStyles.bodyScrollContentSheet,
						presentationMode === "modal"
							? sheetStageStyles.bodyScrollContentModal
							: null,
						isSidebarPresentation
							? sheetStageStyles.bodyScrollContentPanel
							: null,
					isSidebarPresentation
						? sheetStageStyles.bodyScrollContentSidebar
						: null,
					shouldUseWideStageInset
						? sheetStageStyles.bodyScrollContentWide
						: null,
					modalContainedStyle,
					styles.bodyContent,
				]}
					isSidebarPresentation={isSidebarPresentation}
					allowScrollDetents={allowScrollDetents}
					handleBodyWheel={handleBodyWheel}
					onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
					onScroll={handleAndroidCollapseScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
					androidExpandedBodyGesture={androidExpandedBodyGesture}
					androidExpandedBodyStyle={androidExpandedBodyStyle}
				>
					{body}
				</MapStageBodyScroll>
			</MapSheetShell>
			{/* PULLBACK NOTE: Phase 8 — Pass B: ServiceRatingModal lifted to MapScreen */}
			{/* See @screens/MapScreen.jsx and @hooks/map/exploreFlow/useTrackingRatingFlow.js */}
		</>
	);
}



