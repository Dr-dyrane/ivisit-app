import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { usePreferences } from "../../../../contexts/PreferencesContext";
import { useEmergencyContacts } from "../../../../hooks/emergency/useEmergencyContacts";
import { useEmergencyRequests } from "../../../../hooks/emergency/useEmergencyRequests";
import { useRequestFlow } from "../../../../hooks/emergency/useRequestFlow";
import { useMedicalProfile } from "../../../../hooks/user/useMedicalProfile";
import { useVisits } from "../../../../contexts/VisitsContext";
import { demoEcosystemService } from "../../../../services/demoEcosystemService";
import { paymentService } from "../../../../services/paymentService";
import { serviceCostService } from "../../../../services/serviceCostService";
import {
	normalizeApiErrorMessage,
	waitForMinimumPending,
} from "../../../../utils/ui/apiInteractionFeedback";
import MapSheetShell from "../../MapSheetShell";
import { getHospitalHeroSource } from "../../mapHospitalImage";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import { getHospitalDetailServiceImageSource } from "../../surfaces/hospitals/mapHospitalDetail.content";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import { MapCommitDetailsTopSlot } from "../commitDetails/MapCommitDetailsStageParts";
import { MAP_COMMIT_PAYMENT_COPY } from "./mapCommitPayment.content";
import {
	buildAmbulanceCommitRequest,
	buildCommitPaymentCompletionPayload,
	buildCommitPaymentCtaLabel,
	buildCommitPaymentDistanceKm,
	buildCommitPaymentPickupLabel,
	buildPendingApprovalState,
	normalizeCommitPaymentCost,
} from "./mapCommitPayment.helpers";
import {
	MapCommitPaymentBreakdownCard,
	MapCommitPaymentFooter,
	MapCommitPaymentSelectorCard,
	MapCommitPaymentStatusCard,
	MapCommitPaymentSummaryCard,
} from "./MapCommitPaymentStageParts";
import styles from "./mapCommitPayment.styles";

export default function MapCommitPaymentStageBase({
	sheetHeight,
	snapState,
	hospital,
	transport,
	payload = null,
	currentLocation = null,
	onBack,
	onClose,
	onConfirm,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const { preferences } = usePreferences();
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { profile: medicalProfile } = useMedicalProfile();
	const { createRequest, updateRequest, updateTriage, setRequestStatus } =
		useEmergencyRequests();
	const { addVisit, updateVisit } = useVisits();
	const {
		hospitals,
		selectedSpecialty,
		activeAmbulanceTrip,
		activeBedBooking,
		startAmbulanceTrip,
		startBedBooking,
		clearSelectedHospital,
		effectiveDemoModeEnabled,
		setPendingApproval,
		clearCommitFlow,
	} = useEmergency();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const stageMetrics = useMapStageResponsiveMetrics({ presentationMode });
	const allowedSnapStates = useMemo(
		() => [MAP_SHEET_SNAP_STATES.EXPANDED],
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
	});
	const {
		androidExpandedBodyGesture,
		androidExpandedBodyStyle,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});
	const webWideInsetStyle =
		Platform.OS === "web" && presentationMode !== "sheet"
			? styles.webWideContentInset
			: null;
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;

	const { handleRequestInitiated, handleRequestComplete } = useRequestFlow({
		createRequest,
		updateRequest,
		updateTriage,
		addVisit,
		updateVisit,
		setRequestStatus,
		startAmbulanceTrip,
		startBedBooking,
		clearSelectedHospital,
		user,
		preferences,
		medicalProfile,
		emergencyContacts,
		hospitals,
		selectedSpecialty,
		requestHospitalId: hospital?.id || null,
		selectedHospital: hospital || null,
		activeAmbulanceTrip,
		activeBedBooking,
		currentRoute: null,
		effectiveDemoModeEnabled,
		onRequestComplete: () => {},
	});

	const titleColor = tokens.titleColor;
	const mutedColor = tokens.mutedText;
	const closeSurface = tokens.closeSurface;
	const surfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(255,255,255,0.72)";
	const heroSurfaceColor = isDarkMode
		? "rgba(15,23,42,0.92)"
		: "rgba(255,255,255,0.94)";
	const heroRowSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.055)"
		: "rgba(15,23,42,0.045)";
	const heroMediaSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.10)"
		: "rgba(15,23,42,0.07)";
	const heroHighlightColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(255,255,255,0.55)";
	const heroShadeColor = isDarkMode
		? "rgba(2,6,23,0.20)"
		: "rgba(15,23,42,0.045)";
	const secondarySurfaceColor = isDarkMode
		? "rgba(255,255,255,0.05)"
		: "rgba(248,250,252,0.92)";
	const dividerColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.08)";
	const accentColor = isDarkMode ? "#F87171" : "#B91C1C";
	const warningColor = isDarkMode ? "#FDBA74" : "#D97706";
	const errorColor = isDarkMode ? "#FCA5A5" : "#B91C1C";
	const infoColor = isDarkMode ? "#CBD5E1" : "#475569";

	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
	const [estimatedCost, setEstimatedCost] = useState(() =>
		normalizeCommitPaymentCost(payload?.pricingSnapshot || null, transport),
	);
	const [isLoadingCost, setIsLoadingCost] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [infoMessage, setInfoMessage] = useState("");
	const [submissionState, setSubmissionState] = useState({
		kind: "idle",
		displayId: null,
	});

	const demoCashOnly = useMemo(
		() =>
			demoEcosystemService.shouldSimulatePayments({
				hospital,
				demoModeEnabled: effectiveDemoModeEnabled,
			}),
		[effectiveDemoModeEnabled, hospital],
	);

	useEffect(() => {
		let cancelled = false;
		const loadCost = async () => {
			if (!hospital?.id) return;

			setIsLoadingCost(true);
			setErrorMessage("");
			try {
				const distanceKm = buildCommitPaymentDistanceKm(hospital, currentLocation);
				const nextCost = await serviceCostService.calculateEmergencyCost("ambulance", {
					distance: distanceKm,
					hospitalId: hospital.id,
					ambulanceType:
						transport?.service_type || transport?.serviceType || transport?.tierKey || null,
				});
				if (cancelled) return;
				const normalized = normalizeCommitPaymentCost(nextCost, transport);
				setEstimatedCost(normalized);
				if (!normalized) {
					setInfoMessage(MAP_COMMIT_PAYMENT_COPY.COST_ERROR);
				}
			} catch (error) {
				if (cancelled) return;
				setEstimatedCost((currentCost) =>
					currentCost || normalizeCommitPaymentCost(null, transport),
				);
				setInfoMessage(MAP_COMMIT_PAYMENT_COPY.COST_ERROR);
			} finally {
				if (!cancelled) setIsLoadingCost(false);
			}
		};

		void loadCost();

		return () => {
			cancelled = true;
		};
	}, [currentLocation, hospital, transport]);

	const transportTitle =
		transport?.title || transport?.service_name || transport?.label || "Transport";
	const transportSubtitle =
		transport?.metaText ||
		transport?.service_name ||
		transport?.service_type ||
		"Selected transport";
	const hospitalName =
		hospital?.name || hospital?.title || hospital?.service_name || "Hospital";
	const hospitalSubtitle =
		hospital?.address ||
		hospital?.formatted_address ||
		hospital?.addressLine ||
		"Hospital";
	const hospitalImageSource = getHospitalHeroSource(hospital);
	const transportImageSource = getHospitalDetailServiceImageSource(
		transport || {},
		"ambulance",
	);
	const pickupLabel = buildCommitPaymentPickupLabel(currentLocation);
	const totalCostValue = estimatedCost?.totalCost ?? estimatedCost?.total_cost ?? null;
	const totalCostLabel = Number.isFinite(totalCostValue)
		? `$${Number(totalCostValue).toFixed(2)}`
		: null;
	const requestMeta = submissionState.displayId
		? `${hospitalName} · ${submissionState.displayId}`
		: hospitalName;
	const footerLabel =
		submissionState.kind === "idle"
			? buildCommitPaymentCtaLabel(totalCostValue, MAP_COMMIT_PAYMENT_COPY.CTA_CONFIRM)
			: MAP_COMMIT_PAYMENT_COPY.CTA_DONE;

	const handleSubmit = useCallback(async () => {
		if (submissionState.kind !== "idle") {
			onConfirm?.();
			return;
		}

		if (!hospital?.id) {
			setErrorMessage("Choose a hospital before continuing.");
			return;
		}

		if (!selectedPaymentMethod) {
			setErrorMessage("Select a payment method.");
			return;
		}

		if (
			selectedPaymentMethod?.is_wallet &&
			Number.isFinite(totalCostValue) &&
			Number(selectedPaymentMethod.balance || 0) < Number(totalCostValue)
		) {
			setErrorMessage("Choose another payment method.");
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		setInfoMessage("");
		const pendingStartedAt = Date.now();

		try {
			const initiatedRequest = buildAmbulanceCommitRequest({
				hospital,
				transport,
				paymentMethod: selectedPaymentMethod,
				pricingSnapshot: estimatedCost,
				currentLocation,
			});
			const initiationResult = await handleRequestInitiated(initiatedRequest);
			await waitForMinimumPending(pendingStartedAt);

			if (!initiationResult?.ok) {
				setErrorMessage(
					normalizeApiErrorMessage(
						initiationResult?.reason,
						"Could not submit request.",
					),
				);
				return;
			}

			clearCommitFlow?.();
			initiatedRequest._realId = initiationResult.requestId || initiatedRequest.requestId;
			initiatedRequest._displayId =
				initiationResult.displayId || initiatedRequest.requestId;

			if (initiationResult.requiresApproval) {
				const pendingApprovalState = buildPendingApprovalState({
					initiatedRequest,
					result: initiationResult,
					hospital,
				});
				setPendingApproval?.(pendingApprovalState);
				setSubmissionState({
					kind: "waiting_approval",
					displayId: initiationResult.displayId || initiatedRequest.requestId,
				});
				if (
					pendingApprovalState.demoAutoApprove &&
					pendingApprovalState.paymentId &&
					pendingApprovalState.requestId
				) {
					const completionPayload = buildCommitPaymentCompletionPayload({
						initiatedRequest,
						result: initiationResult,
						hospital,
					});
					setTimeout(() => {
						void paymentService
							.requestDemoCashAutoApproval(
								pendingApprovalState.paymentId,
								pendingApprovalState.requestId,
							)
							.then(() => handleRequestComplete(completionPayload))
							.then(() => {
								setPendingApproval?.(null);
								setSubmissionState({
									kind: "dispatched",
									displayId: completionPayload.displayId,
								});
							})
							.catch((error) => {
								setErrorMessage(
									normalizeApiErrorMessage(
										error?.message,
										"Hospital approval is still pending.",
									),
								);
							});
					}, 2600);
				}
				return;
			}

			const completionPayload = buildCommitPaymentCompletionPayload({
				initiatedRequest,
				result: initiationResult,
				hospital,
			});
			await handleRequestComplete(completionPayload);
			setSubmissionState({
				kind: "dispatched",
				displayId: completionPayload.displayId,
			});
		} catch (error) {
			setErrorMessage(
				normalizeApiErrorMessage(error?.message, "Could not submit request."),
			);
		} finally {
			setIsSubmitting(false);
		}
	}, [
		currentLocation,
		estimatedCost,
		handleRequestComplete,
		handleRequestInitiated,
		hospital,
		onConfirm,
		selectedPaymentMethod,
		setPendingApproval,
		submissionState.kind,
		transport,
		clearCommitFlow,
		totalCostValue,
	]);

	const body = submissionState.kind === "idle" ? (
		<View style={styles.sectionStack}>
			<MapCommitPaymentSummaryCard
				titleColor={titleColor}
				mutedColor={mutedColor}
				surfaceColor={heroSurfaceColor}
				accentColor={accentColor}
				hospitalName={hospitalName}
				hospitalSubtitle={hospitalSubtitle}
				hospitalImageSource={hospitalImageSource}
				transportTitle={transportTitle}
				transportSubtitle={transportSubtitle}
				transportImageSource={transportImageSource}
				pickupLabel={pickupLabel}
				totalCostLabel={totalCostLabel}
				rowSurfaceColor={heroRowSurfaceColor}
				mediaSurfaceColor={heroMediaSurfaceColor}
				highlightColor={heroHighlightColor}
				shadeColor={heroShadeColor}
			/>

			<MapCommitPaymentSelectorCard
				titleColor={titleColor}
				mutedColor={mutedColor}
				surfaceColor={secondarySurfaceColor}
				title={MAP_COMMIT_PAYMENT_COPY.PAYMENT_METHODS_TITLE}
				description=""
				selectedMethod={selectedPaymentMethod}
				onMethodSelect={(method) => {
					setSelectedPaymentMethod(method);
					setErrorMessage("");
				}}
				cost={estimatedCost}
				hospitalId={hospital?.id || null}
				organizationId={hospital?.organization_id || hospital?.organizationId || null}
				simulatePayments={demoCashOnly}
				demoCashOnly={demoCashOnly}
			/>

			{isLoadingCost ? (
				<View style={[styles.breakdownCard, { backgroundColor: secondarySurfaceColor }]}>
					<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
						<ActivityIndicator size="small" color={accentColor} />
						<Text style={[styles.inlineMessage, { color: infoColor, marginTop: 0 }]}>
							{MAP_COMMIT_PAYMENT_COPY.COST_LOADING}
						</Text>
					</View>
				</View>
			) : null}

			<MapCommitPaymentBreakdownCard
				titleColor={titleColor}
				surfaceColor={secondarySurfaceColor}
				dividerColor={dividerColor}
				title={MAP_COMMIT_PAYMENT_COPY.BREAKDOWN_TITLE}
				breakdown={estimatedCost?.breakdown || []}
				totalCostLabel={totalCostLabel || "$0.00"}
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
	) : (
		<View style={styles.sectionStack}>
			<MapCommitPaymentStatusCard
				titleColor={titleColor}
				mutedColor={mutedColor}
				surfaceColor={surfaceColor}
				accentColor={submissionState.kind === "waiting_approval" ? warningColor : accentColor}
				statusKind={submissionState.kind}
				statusTitle={
					submissionState.kind === "waiting_approval"
						? MAP_COMMIT_PAYMENT_COPY.STATUS_WAITING_TITLE
						: MAP_COMMIT_PAYMENT_COPY.STATUS_DISPATCHED_TITLE
				}
				statusDescription={
					submissionState.kind === "waiting_approval"
						? MAP_COMMIT_PAYMENT_COPY.STATUS_WAITING_DESCRIPTION
						: MAP_COMMIT_PAYMENT_COPY.STATUS_DISPATCHED_DESCRIPTION
				}
				requestMeta={requestMeta}
			/>
			{errorMessage ? (
				<Text style={[styles.inlineMessage, { color: errorColor }]}>
					{errorMessage}
				</Text>
			) : null}
		</View>
	);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={MAP_SHEET_SNAP_STATES.EXPANDED}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapCommitDetailsTopSlot
					title={MAP_COMMIT_PAYMENT_COPY.HEADER_TITLE}
					subtitle={`For ${hospitalName} · ${transportTitle}`}
					onBack={submissionState.kind === "idle" ? onBack : undefined}
					onClose={submissionState.kind === "idle" ? onClose : onConfirm}
					titleColor={titleColor}
					mutedColor={mutedColor}
					closeSurface={closeSurface}
				/>
			}
			footerSlot={
				<MapCommitPaymentFooter
					label={footerLabel}
					onPress={handleSubmit}
					loading={isSubmitting}
					disabled={isSubmitting}
					stageMetrics={stageMetrics}
					modalContainedStyle={modalContainedStyle}
					contentInsetStyle={webWideInsetStyle}
				/>
			}
			onHandlePress={handleSnapToggle}
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
					modalContainedStyle,
					styles.bodyContent,
					webWideInsetStyle,
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
