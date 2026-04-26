import React, { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
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
import { ServiceRatingModal } from "../../../emergency/ServiceRatingModal";
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
}) {
	const { isDarkMode } = useTheme();
	const {
		hospitals = [],
		allHospitals = [],
		activeAmbulanceTrip,
		ambulanceTelemetryHealth,
		activeBedBooking,
		pendingApproval,
		setAmbulanceTripStatus,
		setBedBookingStatus,
		setPendingApproval,
		stopAmbulanceTrip,
		stopBedBooking,
		// PULLBACK NOTE: Phase 5b — lifecycle flags from XState machine (additive)
		// OLD: useMapTrackingRuntime derived isArrived/isPending from raw ?.status strings
		// NEW: machine flags passed in, runtime uses them directly
		isArrived,
		isPendingApproval,
	} = useEmergency();
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
		ratingState,
		closeRating,
		skipRating,
		submitRating,
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

	const trackingPrimaryContent = (
		<>
			<TrackingTeamHeroCard
				title={trackingKind === "bed" ? serviceLabel : responderName || "Driver assigned"}
				subtitle={
					trackingKind === "bed"
						? joinDisplayParts([hospitalName, secondaryTrackingLabel])
						: toTitleCaseLabel(serviceLabel)
				}
				rightMeta={
					trackingKind === "ambulance"
						? responderSafetyMeta || crewCountLabel
						: formattedBedRemaining || null
				}
				stateLabel={telemetryWarningLabel}
				statePillBackgroundColor={telemetryWarningLabel ? toneColors.surface : null}
				stateTextColor={telemetryWarningLabel ? toneColors.text : null}
				progressValue={
					trackingKind === "ambulance"
						? ambulanceTripProgress
						: trackingKind === "bed"
							? bedProgress
							: 0
				}
				avatarIcon={trackingKind === "bed" ? "bed" : "person"}
				backgroundColor={themeTokens.teamHeroWarningSurface}
				progressColor={themeTokens.teamHeroWarningProgressColor}
				titleColor={themeTokens.titleColor}
				mutedColor={themeTokens.mutedColor}
			/>

			{midActions.length ? (
				<View
					style={[
						styles.ctaGroupCard,
						{ backgroundColor: themeTokens.secondaryCtaSurface },
					]}
				>
					{midActions.map((action, index) => (
						<TrackingCtaButton
							key={`mid-${action.key}`}
							action={action}
							isGrouped
							isDarkMode={isDarkMode}
							showDivider={index < midActions.length - 1}
							iconColor={
								action.tone === "bed"
									? themeTokens.bedCareBlueColor
									: action.tone === "share"
										? themeTokens.shareActionColor
										: action.tone === "transport"
											? themeTokens.transportActionColor
										: action.tone === "state"
											? themeTokens.triageActionIconColor
											: themeTokens.infoActionColor
							}
							labelColor={themeTokens.titleColor}
						/>
					))}
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
						<MapTrackingTopSlot
							title={trackingKind === "idle" ? "Tracking" : sheetTitleDisplay}
							subtitle={trackingKind === "idle" ? hospitalName : sheetSubtitle}
							titleColor={themeTokens.titleColor}
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

			<ServiceRatingModal
				visible={ratingState.visible}
				serviceType={ratingState.serviceType || "visit"}
				title={ratingState.title || "Rate your visit"}
				subtitle={ratingState.subtitle}
				serviceDetails={ratingState.serviceDetails}
				onClose={closeRating}
				onSkip={skipRating}
				onSubmit={submitRating}
				surfaceVariant="map"
				preferDrawerPresentation={isSidebarPresentation}
			/>
		</>
	);
}
