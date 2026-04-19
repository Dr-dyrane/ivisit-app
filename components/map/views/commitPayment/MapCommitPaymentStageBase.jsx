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
import { augmentEmergencyCostForCheckout } from "../../../../services/pricingService";
import { confirmSavedCardPayment } from "../../../../services/stripeSavedCardConfirmation";
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
	buildBedCommitRequest,
	buildCommitPaymentCompletionPayload,
	buildCommitPaymentCtaLabel,
	buildCommitPaymentDistanceKm,
	buildCommitPaymentPickupLabel,
	buildPendingApprovalState,
	normalizeCommitPaymentCost,
	parseCommitPaymentAmount,
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
	const selectorSummarySurfaceColor = isDarkMode
		? "rgba(255,255,255,0.065)"
		: "rgba(15,23,42,0.045)";
	const selectorChangePillSurfaceColor = isDarkMode
		? "rgba(248,113,113,0.14)"
		: "rgba(134,16,14,0.10)";
	const dividerColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.08)";
	const accentColor = isDarkMode ? "#F87171" : "#B91C1C";
	const warningColor = isDarkMode ? "#FDBA74" : "#D97706";
	const errorColor = isDarkMode ? "#FCA5A5" : "#B91C1C";
	const infoColor = isDarkMode ? "#CBD5E1" : "#475569";
	const room = payload?.room || null;
	const careIntent = payload?.careIntent || null;
	const hasRoomSelection = Boolean(
		room?.id || payload?.roomId || room?.title || room?.room_type,
	);
	const isCombinedFlow = careIntent === "both" && hasRoomSelection;
	const isBedFlow = !isCombinedFlow && hasRoomSelection;
	const isAmbulanceFlow = !isCombinedFlow && !isBedFlow;
	const hospitalName =
		hospital?.name || hospital?.title || hospital?.service_name || "Hospital";
	const hospitalSubtitle =
		hospital?.address ||
		hospital?.formatted_address ||
		hospital?.addressLine ||
		"Hospital";
	const transportTitle =
		transport?.title || transport?.service_name || transport?.label || "Transport";
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
	const costLoadingCopy = isBedFlow
		? "Locking in booking total..."
		: isCombinedFlow
			? "Locking in transport and admission total..."
			: MAP_COMMIT_PAYMENT_COPY.COST_LOADING;
	const paymentUnsupportedMessage =
		"Transport and admission payment is not ready yet.";

	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
	const [estimatedCost, setEstimatedCost] = useState(() =>
		normalizeCommitPaymentCost(
			payload?.pricingSnapshot || null,
			hasRoomSelection ? room : transport,
			selectionHeaderLabel,
		),
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
			setInfoMessage("");
			try {
				let checkoutCost = null;
				if (isAmbulanceFlow) {
					const distanceKm = buildCommitPaymentDistanceKm(hospital, currentLocation);
					const nextCost = await serviceCostService.calculateEmergencyCost("ambulance", {
						distance: distanceKm,
						hospitalId: hospital.id,
						ambulanceType:
							transport?.service_type ||
							transport?.serviceType ||
							transport?.tierKey ||
							null,
					});
					if (cancelled) return;
					checkoutCost = await augmentEmergencyCostForCheckout(nextCost, {
						hospitalId: hospital.id,
						serviceType: "ambulance",
					});
				} else if (isBedFlow) {
					const roomAmount =
						parseCommitPaymentAmount(room?.priceText) ??
						parseCommitPaymentAmount(room?.price);
					const baseCost =
						payload?.pricingSnapshot ||
						(Number.isFinite(roomAmount)
							? {
									totalCost: roomAmount,
									breakdown: [
										{
											name: roomTitle,
											type: "service",
											cost: roomAmount,
										},
									],
							  }
							: null);
					checkoutCost = baseCost
						? await augmentEmergencyCostForCheckout(baseCost, {
								hospitalId: hospital.id,
								serviceType: "bed",
						  })
						: null;
				} else {
					const transportAmount =
						parseCommitPaymentAmount(transport?.priceText) ??
						parseCommitPaymentAmount(transport?.price);
					const roomAmount =
						parseCommitPaymentAmount(room?.priceText) ??
						parseCommitPaymentAmount(room?.price);
					const combinedBreakdown = [
						Number.isFinite(transportAmount)
							? {
									name: transportTitle,
									type: "service",
									cost: transportAmount,
							  }
							: null,
						Number.isFinite(roomAmount)
							? {
									name: roomTitle,
									type: "service",
									cost: roomAmount,
							  }
							: null,
					].filter(Boolean);
					const combinedSubtotal = combinedBreakdown.reduce(
						(sum, item) => sum + Number(item.cost || 0),
						0,
					);
					const baseCost =
						combinedBreakdown.length > 0
							? {
									totalCost: combinedSubtotal,
									breakdown: combinedBreakdown,
							  }
							: null;
					checkoutCost = baseCost
						? await augmentEmergencyCostForCheckout(baseCost, {
								hospitalId: hospital.id,
								serviceType: "ambulance",
						  })
						: null;
				}
				if (cancelled) return;
				const normalized = normalizeCommitPaymentCost(
					checkoutCost,
					isBedFlow ? room : transport || room,
					selectionHeaderLabel,
				);
				setEstimatedCost(normalized);
				if (!normalized) {
					setInfoMessage(MAP_COMMIT_PAYMENT_COPY.COST_ERROR);
				} else if (isCombinedFlow) {
					setInfoMessage(paymentUnsupportedMessage);
				}
			} catch (error) {
				if (cancelled) return;
				setEstimatedCost((currentCost) =>
					currentCost ||
						normalizeCommitPaymentCost(
							null,
							isBedFlow ? room : transport || room,
							selectionHeaderLabel,
						),
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
	}, [
		currentLocation,
		hospital,
		isAmbulanceFlow,
		isBedFlow,
		isCombinedFlow,
		payload?.pricingSnapshot,
		paymentUnsupportedMessage,
		room,
		roomTitle,
		selectionHeaderLabel,
		transport,
		transportTitle,
	]);

	const hospitalImageSource = getHospitalHeroSource(hospital);
	const transportImageSource = getHospitalDetailServiceImageSource(
		transport || {},
		"ambulance",
	);
	const roomImageSource = getHospitalDetailServiceImageSource(room || {}, "room");
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
			? buildCommitPaymentCtaLabel(
					totalCostValue,
					isCombinedFlow
						? "Combined payment soon"
						: isBedFlow
							? "Confirm booking"
							: MAP_COMMIT_PAYMENT_COPY.CTA_CONFIRM,
			  )
			: MAP_COMMIT_PAYMENT_COPY.CTA_DONE;
	const requestMetaLabel = submissionState.displayId
		? `${hospitalName} - ${submissionState.displayId}`
		: requestMeta;
	const headerSubtitle = `For ${hospitalName} - ${selectionHeaderLabel}`;
	const summaryRows = [
		{
			imageSource: hospitalImageSource,
			iconName: "business",
			title: hospitalName,
			subtitle: hospitalSubtitle || "Hospital",
			iconColor: accentColor,
		},
		...(isCombinedFlow
			? [
					{
						imageSource: transportImageSource,
						iconName: "car-sport",
						title: transportTitle,
						subtitle: transportSubtitle || "Transport",
						iconColor: accentColor,
					},
			  ]
			: []),
		{
			imageSource: isBedFlow || isCombinedFlow ? roomImageSource : transportImageSource,
			iconName: isBedFlow || isCombinedFlow ? "bed-outline" : "car-sport",
			title: isBedFlow || isCombinedFlow ? roomTitle : transportTitle,
			subtitle: isBedFlow || isCombinedFlow ? roomSubtitle : transportSubtitle || "Transport",
			iconColor: accentColor,
		},
		{
			iconName: "location",
			title: "Pickup",
			subtitle: pickupLabel,
			iconColor: accentColor,
		},
	];
	const isIdleState = submissionState.kind === "idle";
	const canDismissStatusState =
		submissionState.kind === "waiting_approval" ||
		submissionState.kind === "dispatched" ||
		(submissionState.kind === "finalizing_dispatch" && !isSubmitting);
	const statusConfig =
		submissionState.kind === "processing_payment"
			? {
					accentColor,
					title: MAP_COMMIT_PAYMENT_COPY.STATUS_PROCESSING_PAYMENT_TITLE,
					description:
						MAP_COMMIT_PAYMENT_COPY.STATUS_PROCESSING_PAYMENT_DESCRIPTION,
			  }
			: submissionState.kind === "finalizing_dispatch"
				? {
						accentColor: infoColor,
						title: isBedFlow
							? "Finalizing booking"
							: MAP_COMMIT_PAYMENT_COPY.STATUS_FINALIZING_TITLE,
						description: isBedFlow
							? "Payment was received. Submitting your bed request now."
							: MAP_COMMIT_PAYMENT_COPY.STATUS_FINALIZING_DESCRIPTION,
				  }
				: submissionState.kind === "waiting_approval"
					? {
							accentColor: warningColor,
							title: MAP_COMMIT_PAYMENT_COPY.STATUS_WAITING_TITLE,
							description:
								MAP_COMMIT_PAYMENT_COPY.STATUS_WAITING_DESCRIPTION,
					  }
					: {
							accentColor,
							title: isBedFlow
								? "Booking submitted"
								: MAP_COMMIT_PAYMENT_COPY.STATUS_DISPATCHED_TITLE,
							description: isBedFlow
								? "The admission request is live and the hospital lane is active."
								: MAP_COMMIT_PAYMENT_COPY.STATUS_DISPATCHED_DESCRIPTION,
					  };

	const handleSubmit = useCallback(async () => {
		if (!isIdleState) {
			if (canDismissStatusState) {
				onConfirm?.();
			}
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

		if (isCombinedFlow) {
			setErrorMessage(paymentUnsupportedMessage);
			return;
		}

		const isWalletSelected = selectedPaymentMethod?.is_wallet === true;
		const isCashSelected = selectedPaymentMethod?.is_cash === true;
		const isCardSelected = !isWalletSelected && !isCashSelected;
		const stripePaymentMethodId = isCardSelected
			? paymentService.getStripePaymentMethodId(selectedPaymentMethod)
			: null;

		if (isWalletSelected) {
			setErrorMessage("Choose card or cash for this request.");
			return;
		}

		if (isCardSelected && !stripePaymentMethodId) {
			setErrorMessage("Choose a saved card to continue.");
			return;
		}

		if (isCardSelected && !Number.isFinite(totalCostValue)) {
			setErrorMessage("Could not lock the card total right now. Try again.");
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
			let chargeOrganizationId = null;
			if (isCardSelected) {
				chargeOrganizationId = await paymentService.resolveChargeOrganizationId(
					hospital?.organization_id || hospital?.organizationId || null,
				);
				if (!chargeOrganizationId) {
					setErrorMessage("Card checkout is unavailable for this hospital right now.");
					return;
				}
			}

			const initiatedRequest = isBedFlow
				? buildBedCommitRequest({
						hospital,
						room,
						paymentMethod: selectedPaymentMethod,
						pricingSnapshot: estimatedCost,
						currentLocation,
				  })
				: buildAmbulanceCommitRequest({
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
						`Could not submit ${requestVerb}.`,
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

			if (initiationResult.awaitsPaymentConfirmation) {
				setSubmissionState({
					kind: "processing_payment",
					displayId: initiationResult.displayId || initiatedRequest.requestId,
				});

				try {
					const paymentIntent = await paymentService.createEmergencyCardPaymentIntent(
						initiationResult.requestId,
						chargeOrganizationId,
						estimatedCost,
						selectedPaymentMethod,
					);

					await confirmSavedCardPayment(
						paymentIntent.clientSecret,
						paymentIntent.stripePaymentMethodId || stripePaymentMethodId,
					);
				} catch (paymentError) {
					const settlementAfterConfirmError =
						await paymentService
							.waitForEmergencyPaymentSettlement(initiationResult.requestId, {
								timeoutMs: 6000,
								pollIntervalMs: 900,
							})
							.catch(() => null);

					setSubmissionState({ kind: "idle", displayId: null });

					if (
						settlementAfterConfirmError?.success === false &&
						settlementAfterConfirmError?.code === "PAYMENT_DECLINED"
					) {
						setErrorMessage("Payment was declined. Choose another card or cash.");
						return;
					}

					setErrorMessage(
						normalizeApiErrorMessage(
							paymentError?.message,
							"Could not confirm card payment.",
						),
					);
					return;
				}

				setSubmissionState({
					kind: "finalizing_dispatch",
					displayId: initiationResult.displayId || initiatedRequest.requestId,
				});

				const settlementResult = await paymentService.waitForEmergencyPaymentSettlement(
					initiationResult.requestId,
				);

				if (!settlementResult?.success) {
					if (settlementResult?.code === "PAYMENT_DECLINED") {
						setSubmissionState({ kind: "idle", displayId: null });
						setErrorMessage("Payment was declined. Choose another card or cash.");
						return;
					}

					setInfoMessage("Payment was received. Dispatch is still finalizing.");
					return;
				}

				const completionPayload = buildCommitPaymentCompletionPayload({
					initiatedRequest,
					result: {
						...initiationResult,
						requestId:
							settlementResult?.request?.id || initiationResult.requestId,
						displayId:
							settlementResult?.request?.display_id ||
							initiationResult.displayId,
						estimatedArrival:
							settlementResult?.request?.estimated_arrival ||
							initiationResult.estimatedArrival,
					},
					hospital,
				});
				await handleRequestComplete(completionPayload);
				setSubmissionState({
					kind: "dispatched",
					displayId: completionPayload.displayId,
				});
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
				normalizeApiErrorMessage(
					error?.message,
					`Could not submit ${requestVerb}.`,
				),
			);
		} finally {
			setIsSubmitting(false);
		}
	}, [
		currentLocation,
		clearCommitFlow,
		handleRequestComplete,
		handleRequestInitiated,
		hospital,
		isBedFlow,
		isCombinedFlow,
		isIdleState,
		canDismissStatusState,
		onConfirm,
		paymentUnsupportedMessage,
		requestVerb,
		room,
		selectedPaymentMethod,
		setPendingApproval,
		transport,
		estimatedCost,
		totalCostValue,
	]);

	const body = submissionState.kind === "idle" ? (
		<View style={styles.sectionStack}>
			<MapCommitPaymentSummaryCard
				titleColor={titleColor}
				mutedColor={mutedColor}
				surfaceColor={heroSurfaceColor}
				headerTitle={hospitalName}
				headerSubtitle={selectionHeaderLabel}
				selectionRows={summaryRows}
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
				accentColor={accentColor}
				rowSurfaceColor={selectorSummarySurfaceColor}
				changePillSurfaceColor={selectorChangePillSurfaceColor}
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
							{costLoadingCopy}
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
			snapState={MAP_SHEET_SNAP_STATES.EXPANDED}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapCommitDetailsTopSlot
					title={MAP_COMMIT_PAYMENT_COPY.HEADER_TITLE}
					subtitle={`For ${hospitalName} · ${transportTitle}`}
					subtitle={headerSubtitle}
					onBack={isIdleState ? onBack : undefined}
					onClose={isIdleState ? onClose : canDismissStatusState ? onConfirm : undefined}
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
					disabled={
						isCombinedFlow ||
						isSubmitting ||
						submissionState.kind === "processing_payment"
					}
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
