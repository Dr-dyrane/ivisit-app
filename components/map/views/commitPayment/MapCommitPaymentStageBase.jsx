import React, { useCallback, useMemo, useRef } from "react";
import { Platform, Text, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { getHospitalHeroSource } from "../../mapHospitalImage";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import { getHospitalDetailServiceImageSource } from "../../surfaces/hospitals/mapHospitalDetail.content";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import { MapCommitDetailsTopSlot } from "../commitDetails/MapCommitDetailsStageParts";
import { MAP_COMMIT_PAYMENT_COPY } from "./mapCommitPayment.content";
import { buildCommitPaymentPickupLabel } from "./mapCommitPayment.helpers";
import {
	buildCommitPaymentFooterLabels,
	buildCommitPaymentStatusConfig,
	getPaymentTransportTitle,
	getPaymentUserAvatarSource,
} from "./mapCommitPayment.presentation";
import { buildCommitPaymentThemeTokens } from "./mapCommitPayment.theme";
import {
	MapCommitPaymentActionGroupCard,
	MapCommitPaymentBreakdownCard,
	MapCommitPaymentBreakdownSkeletonCard,
	MapCommitPaymentFooter,
	MapCommitPaymentHeroBlade,
	MapCommitPaymentSelectorCard,
	MapCommitPaymentStatusCard,
} from "./MapCommitPaymentStageParts";
import useMapCommitPaymentController from "./useMapCommitPaymentController";
import styles from "./mapCommitPayment.styles";
import { MAP_COMMIT_PAYMENT_TRANSACTION_STATES } from "./mapCommitPayment.transaction";
import { formatMapRequestDisplayId } from "../../core/mapRequestPresentation";

export default function MapCommitPaymentStageBase({
	sheetHeight,
	snapState,
	hospital,
	transport,
	payload = null,
	currentLocation = null,
	onClose,
	onConfirm,
	onSnapStateChange,
	onOpenHospitalDetailFromPayment,
	onOpenTransportDetailFromPayment,
	onCenterMapOnUserFromPayment,
}) {
	const { isDarkMode } = useTheme();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const {
		isSidebarPresentation,
		contentMaxWidth,
		presentationMode,
		shellWidth,
		shouldUseWideStageInset,
	} = useMapStageSurfaceLayout();
	const allowedSnapStates = useMemo(
		() =>
			presentationMode === "sheet"
				? [MAP_SHEET_SNAP_STATES.HALF, MAP_SHEET_SNAP_STATES.EXPANDED]
				: [MAP_SHEET_SNAP_STATES.EXPANDED],
		[presentationMode],
	);
	const effectiveSnapState =
		presentationMode === "sheet" && snapState === MAP_SHEET_SNAP_STATES.EXPANDED
			? MAP_SHEET_SNAP_STATES.EXPANDED
			: allowedSnapStates[0];
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
	const webWideInsetStyle =
		Platform.OS === "web" && presentationMode !== "sheet"
			? styles.webWideContentInset
			: null;
	const topSlotContainerStyle = [
		sheetStageStyles.topSlotContained,
		presentationMode === "sheet" ? sheetStageStyles.topSlotSheet : null,
		presentationMode === "modal" ? sheetStageStyles.topSlotModal : null,
		isSidebarPresentation ? sheetStageStyles.topSlotSidebar : null,
		shouldUseWideStageInset ? sheetStageStyles.topSlotWide : null,
		modalContainedStyle,
	];

	const {
		titleColor,
		mutedColor,
		closeSurface,
		surfaceColor,
		heroSurfaceColor,
		secondarySurfaceColor,
		dividerColor,
		skeletonBaseColor,
		skeletonSoftColor,
		accentColor,
		heroPrimarySurfaceColor,
		errorColor,
		infoColor,
		selectorSummarySurfaceColor,
		selectorChangePillSurfaceColor,
		heroMetaSurfaceColor,
		heroAvatarSurfaceColor,
		heroGlowColor,
		warningColor,
	} = useMemo(
		() => buildCommitPaymentThemeTokens({ isDarkMode, tokens }),
		[isDarkMode, tokens],
	);

	const room = payload?.room || null;
	const careIntent = payload?.careIntent || null;
	const hasRoomSelection = Boolean(
		room?.id || payload?.roomId || room?.title || room?.room_type,
	);
	const isCombinedFlow = careIntent === "both" && hasRoomSelection;
	const isBedFlow = !isCombinedFlow && hasRoomSelection;
	const hospitalName =
		hospital?.name || hospital?.title || hospital?.service_name || "Hospital";
	const hospitalSubtitle =
		hospital?.address ||
		hospital?.formatted_address ||
		hospital?.addressLine ||
		"Hospital";
	const transportTitle = getPaymentTransportTitle(transport);
	const transportSubtitle =
		transport?.metaText ||
		transport?.service_name ||
		transport?.service_type ||
		"Selected transport";
	const roomTitle = room?.title || room?.room_type || "Bed reservation";
	const roomSubtitle =
		room?.metaText || room?.room_type || room?.service_name || "Selected room";
	const selectionHeaderLabel = isCombinedFlow
		? "Transport + admission"
		: isBedFlow
			? roomTitle
			: transportTitle;
	const requestVerb = isBedFlow ? "booking" : "dispatch";
	const paymentUnsupportedMessage =
		"Transport and admission payment is not ready yet.";

	const {
		user,
		demoCashOnly,
		selectedPaymentMethod,
		totalCostLabel,
		isRefreshingPaymentMethods,
		paymentMethodsSnapshotReady,
		paymentMethodsRefreshKey,
		estimatedCost,
		isLoadingCost,
		isSubmitting,
		errorMessage,
		infoMessage,
		submissionState,
		isIdleState,
		canDismissStatusState,
		isFailureState,
		isPaymentMethodSnapshotPending,
		clearFeedback,
		handlePaymentMethodSelect,
		handleSubmit,
	} = useMapCommitPaymentController({
		hospital,
		transport,
		room,
		payload,
		currentLocation,
		isBedFlow,
		isCombinedFlow,
		hasRoomSelection,
		selectionHeaderLabel,
		roomTitle,
		transportTitle,
		requestVerb,
		paymentUnsupportedMessage,
		onConfirm,
	});

	const paymentSelectorOffsetRef = useRef(270);
	const hospitalImageSource = getHospitalHeroSource(hospital);
	const transportImageSource = getHospitalDetailServiceImageSource(
		transport || {},
		"ambulance",
	);
	const roomImageSource = getHospitalDetailServiceImageSource(room || {}, "room");
	const pickupAvatarSource = getPaymentUserAvatarSource(user);
	const pickupLabel = buildCommitPaymentPickupLabel(currentLocation);
	const paymentHeroSubtitle = `${hospitalName} - ${
		isBedFlow ? roomTitle : transportTitle
	}`;
	const paymentHeroGradientColors = isDarkMode
		? ["rgba(185,28,28,0.92)", "rgba(127,29,29,0.78)", "rgba(15,23,42,0.92)"]
		: ["rgba(185,28,28,0.94)", "rgba(220,38,38,0.84)", "rgba(79,70,229,0.74)"];
	const paymentHeroMeta = useMemo(() => {
		if (selectedPaymentMethod?.is_cash) {
			return { label: "Cash", icon: "cash" };
		}
		if (selectedPaymentMethod?.is_wallet) {
			return { label: "Wallet", icon: "wallet" };
		}
		if (selectedPaymentMethod) {
			return { label: selectedPaymentMethod.brand || "Card", icon: "card" };
		}
		return { label: "Method", icon: "card-outline" };
	}, [selectedPaymentMethod]);

	const shouldShowExpandedBreakdown =
		effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED ||
		presentationMode !== "sheet" ||
		isSidebarPresentation;
	const isExpandedPaymentView = shouldShowExpandedBreakdown;
	const canToggleSnapState =
		presentationMode === "sheet" && allowedSnapStates.length > 1;

	const handleHeaderSnapToggle = useCallback(() => {
		if (!canToggleSnapState || typeof onSnapStateChange !== "function") return;
		onSnapStateChange(
			effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
				? MAP_SHEET_SNAP_STATES.HALF
				: MAP_SHEET_SNAP_STATES.EXPANDED,
		);
	}, [canToggleSnapState, effectiveSnapState, onSnapStateChange]);

	const scrollToPaymentSelector = useCallback(() => {
		bodyScrollRef?.current?.scrollTo?.({
			y: Math.max(0, paymentSelectorOffsetRef.current - 12),
			animated: true,
		});
	}, [bodyScrollRef]);

	const openPaymentSelector = useCallback(() => {
		clearFeedback();

		if (
			canToggleSnapState &&
			effectiveSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED &&
			typeof onSnapStateChange === "function"
		) {
			onSnapStateChange(MAP_SHEET_SNAP_STATES.EXPANDED);
			setTimeout(scrollToPaymentSelector, 260);
			return;
		}

		scrollToPaymentSelector();
	}, [
		canToggleSnapState,
		clearFeedback,
		effectiveSnapState,
		onSnapStateChange,
		scrollToPaymentSelector,
	]);

	const midSnapActions = useMemo(
		() => [
			{
				key: "hospital",
				title: hospitalName,
				subtitle: hospitalSubtitle || "Hospital",
				imageSource: hospitalImageSource,
				icon: "business",
				iconColor: isDarkMode ? "#CBD5E1" : "#334155",
				onPress: () =>
					onOpenHospitalDetailFromPayment?.({
						hospital,
						payload,
					}),
				disabled: !hospital,
			},
			{
				key: "ambulance",
				title: isBedFlow ? roomTitle : transportTitle,
				subtitle: isBedFlow
					? roomSubtitle
					: transport?.priceText || transportSubtitle || "Transport",
				imageSource: isBedFlow ? roomImageSource : transportImageSource,
				icon: isBedFlow ? "bed-outline" : "car-sport",
				iconColor: isDarkMode ? "#FB7185" : "#BE123C",
				onPress: () =>
					onOpenTransportDetailFromPayment?.({
						hospital,
						transport,
						payload,
						snapState: effectiveSnapState,
					}),
				disabled: !hospital || !transport,
			},
			{
				key: "location",
				title: pickupLabel,
				subtitle: "Pickup",
				imageSource: pickupAvatarSource,
				imageResizeMode: "cover",
				imageStyle: styles.actionGroupAvatarImage,
				icon: "person",
				iconColor: isDarkMode ? "#CBD5E1" : "#475569",
				onPress: () => onCenterMapOnUserFromPayment?.(),
				disabled: false,
			},
		],
		[
			effectiveSnapState,
			hospital,
			hospitalImageSource,
			hospitalName,
			hospitalSubtitle,
			isBedFlow,
			isDarkMode,
			onCenterMapOnUserFromPayment,
			onOpenHospitalDetailFromPayment,
			onOpenTransportDetailFromPayment,
			payload,
			pickupAvatarSource,
			pickupLabel,
			roomImageSource,
			roomSubtitle,
			roomTitle,
			transport,
			transportImageSource,
			transportSubtitle,
			transportTitle,
		],
	);

	const { footerActionLabel } = useMemo(
		() =>
			buildCommitPaymentFooterLabels({
				isCombinedFlow,
				isExpandedPaymentView,
				paymentMethodsSnapshotReady,
				isRefreshingPaymentMethods,
				selectedPaymentMethod,
				isBedFlow,
				totalCostLabel,
			}),
		[
			isBedFlow,
			isCombinedFlow,
			isExpandedPaymentView,
			isRefreshingPaymentMethods,
			paymentMethodsSnapshotReady,
			selectedPaymentMethod,
			totalCostLabel,
		],
	);
	const footerActionDisabled =
		isCombinedFlow ||
		isSubmitting ||
		isPaymentMethodSnapshotPending ||
		(isLoadingCost && Boolean(selectedPaymentMethod));

	const formattedRequestDisplayId = formatMapRequestDisplayId(submissionState.displayId);
	const requestMetaLabel = formattedRequestDisplayId
		? `${hospitalName} - ${formattedRequestDisplayId}`
		: hospitalName;
	const statusConfig = useMemo(
		() =>
			buildCommitPaymentStatusConfig({
				submissionKind: submissionState.kind,
				isBedFlow,
				accentColor,
				warningColor,
				errorColor,
				infoColor,
				errorMessage,
				statusCopy: MAP_COMMIT_PAYMENT_COPY,
			}),
		[
			accentColor,
			errorColor,
			errorMessage,
			infoColor,
			isBedFlow,
			submissionState.kind,
			warningColor,
		],
	);

	const handleFooterPress = useCallback(() => {
		if (isIdleState && !selectedPaymentMethod) {
			openPaymentSelector();
			return;
		}

		handleSubmit();
	}, [handleSubmit, isIdleState, openPaymentSelector, selectedPaymentMethod]);

	const body =
		submissionState.kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.IDLE ? (
			<View style={styles.sectionStack}>
				<MapCommitPaymentHeroBlade
					// PULLBACK NOTE: PT-B2 — show stale cost label while recalculating; only blank on first load (no prior cost)
					// OLD: title blanked and rightMeta hidden whenever isLoadingCost=true → flicker on every re-render
					// NEW: keep showing last known values; skeleton only when there is genuinely no cost yet
					title={totalCostLabel || "Total"}
					subtitle={paymentHeroSubtitle}
					rightMeta={paymentHeroMeta.label}
					rightMetaIcon={paymentHeroMeta.icon}
					gradientColors={paymentHeroGradientColors}
					metaSurfaceColor={heroMetaSurfaceColor}
					backgroundColor={heroSurfaceColor}
					accentColor={heroPrimarySurfaceColor}
					avatarSurfaceColor={heroAvatarSurfaceColor}
					glowColor={heroGlowColor}
					titleColor="#FFFFFF"
					mutedColor="rgba(255,255,255,0.76)"
					loading={isLoadingCost && !totalCostLabel}
				/>

				<MapCommitPaymentActionGroupCard
					titleColor={titleColor}
					mutedColor={mutedColor}
					surfaceColor={secondarySurfaceColor}
					dividerColor={dividerColor}
					actions={midSnapActions}
				/>

				{isExpandedPaymentView ? (
					<View
						onLayout={(event) => {
							paymentSelectorOffsetRef.current = event.nativeEvent.layout.y;
						}}
					>
						<MapCommitPaymentSelectorCard
							titleColor={titleColor}
							mutedColor={mutedColor}
							surfaceColor={secondarySurfaceColor}
							accentColor={accentColor}
							rowSurfaceColor={selectorSummarySurfaceColor}
							changePillSurfaceColor={selectorChangePillSurfaceColor}
							title={MAP_COMMIT_PAYMENT_COPY.PAYMENT_METHODS_TITLE}
							description=""
							selectedMethod={selectedPaymentMethod}
							onMethodSelect={handlePaymentMethodSelect}
							cost={estimatedCost}
							hospitalId={hospital?.id || null}
							organizationId={hospital?.organization_id || hospital?.organizationId || null}
							simulatePayments={demoCashOnly}
							demoCashOnly={demoCashOnly}
							refreshTrigger={paymentMethodsRefreshKey}
						/>
					</View>
				) : null}

				{shouldShowExpandedBreakdown && isLoadingCost ? (
					<MapCommitPaymentBreakdownSkeletonCard
						surfaceColor={secondarySurfaceColor}
						skeletonBaseColor={skeletonBaseColor}
						skeletonSoftColor={skeletonSoftColor}
					/>
				) : null}

				{shouldShowExpandedBreakdown && !isLoadingCost ? (
					<MapCommitPaymentBreakdownCard
						titleColor={titleColor}
						surfaceColor={secondarySurfaceColor}
						dividerColor={dividerColor}
						title={MAP_COMMIT_PAYMENT_COPY.BREAKDOWN_TITLE}
						breakdown={estimatedCost?.breakdown || []}
						totalCostLabel={totalCostLabel || "$0.00"}
					/>
				) : null}

				{errorMessage ? (
					<Text style={[styles.inlineMessage, { color: errorColor }]}>
						{errorMessage}
					</Text>
				) : infoMessage ? (
					<Text style={[styles.inlineMessage, { color: infoColor }]}>
						{infoMessage}
					</Text>
				) : null}

				<MapCommitPaymentFooter
					label={footerActionLabel}
					onPress={handleFooterPress}
					loading={isSubmitting || isPaymentMethodSnapshotPending}
					disabled={footerActionDisabled}
					modalContainedStyle={modalContainedStyle}
					contentInsetStyle={webWideInsetStyle}
					inline
				/>
			</View>
		) : (
			<View style={styles.sectionStack}>
				<MapCommitPaymentStatusCard
					titleColor={titleColor}
					mutedColor={mutedColor}
					surfaceColor={surfaceColor}
					accentColor={statusConfig.accentColor}
					statusKind={submissionState.kind}
					statusTitle={statusConfig.title}
					statusDescription={statusConfig.description}
					requestMeta={requestMetaLabel}
				/>
				{errorMessage ? (
					<Text style={[styles.inlineMessage, { color: errorColor }]}>
						{errorMessage}
					</Text>
				) : infoMessage ? (
					<Text style={[styles.inlineMessage, { color: infoColor }]}>
						{infoMessage}
					</Text>
				) : null}
			</View>
		);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={effectiveSnapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<View style={topSlotContainerStyle}>
					<MapCommitDetailsTopSlot
						title={MAP_COMMIT_PAYMENT_COPY.HEADER_TITLE}
						subtitle={hospitalName}
						onBack={canToggleSnapState ? handleHeaderSnapToggle : undefined}
						leftIconName={
							effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
								? "chevron-down"
								: "chevron-up"
						}
						leftAccessibilityLabel={
							effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
								? "Collapse payment sheet"
								: "Expand payment sheet"
						}
						showLeftControl={canToggleSnapState}
						onClose={
							isIdleState || isFailureState
								? onClose
								: canDismissStatusState
									? onConfirm
									: undefined
						}
						titleColor={titleColor}
						mutedColor={mutedColor}
						closeSurface={closeSurface}
					/>
				</View>
			}
			footerSlot={null}
			onHandlePress={handleHeaderSnapToggle}
			bodyGestureEnabled={false}
		>
			<MapStageBodyScroll
				bodyScrollRef={bodyScrollRef}
				viewportStyle={sheetStageStyles.bodyScrollViewport}
				contentContainerStyle={[
					sheetStageStyles.bodyScrollContent,
					sheetStageStyles.bodyScrollContentSheet,
					presentationMode === "modal" ? sheetStageStyles.bodyScrollContentModal : null,
					isSidebarPresentation ? sheetStageStyles.bodyScrollContentPanel : null,
					isSidebarPresentation ? sheetStageStyles.bodyScrollContentSidebar : null,
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
	);
}
