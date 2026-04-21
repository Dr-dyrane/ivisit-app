import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { usePreferences } from "../../../../contexts/PreferencesContext";
import { useToast } from "../../../../contexts/ToastContext";
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
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import { MapCommitDetailsTopSlot } from "../commitDetails/MapCommitDetailsStageParts";
import { MAP_COMMIT_PAYMENT_COPY } from "./mapCommitPayment.content";
import {
	buildAmbulanceCommitRequest,
	buildBedCommitRequest,
	buildCommitPaymentCompletionPayload,
	buildCommitPaymentDistanceKm,
	buildCommitPaymentPickupLabel,
	buildPendingApprovalState,
	normalizeCommitPaymentCost,
	parseCommitPaymentAmount,
} from "./mapCommitPayment.helpers";
import {
	MapCommitPaymentActionGroupCard,
	MapCommitPaymentBreakdownCard,
	MapCommitPaymentBreakdownSkeletonCard,
	MapCommitPaymentFooter,
	MapCommitPaymentHeroBlade,
	MapCommitPaymentSelectorCard,
	MapCommitPaymentStatusCard,
} from "./MapCommitPaymentStageParts";
import styles from "./mapCommitPayment.styles";

function getPaymentTransportTitle(transport) {
	const raw = [
		transport?.tierKey,
		transport?.service_type,
		transport?.serviceType,
		transport?.service_name,
		transport?.title,
		transport?.label,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (raw.includes("bls") || raw.includes("basic") || raw.includes("standard")) {
		return "Everyday care";
	}
	if (raw.includes("als") || raw.includes("advanced") || raw.includes("cardiac")) {
		return "Extra support";
	}
	if (raw.includes("icu") || raw.includes("critical") || raw.includes("intensive")) {
		return "Hospital transfer";
	}

	return transport?.title || transport?.label || transport?.service_name || "Transport";
}

function getPaymentUserAvatarSource(user) {
	const metadata = user?.user_metadata || user?.metadata || {};
	const uri =
		user?.imageUri ||
		user?.avatarUrl ||
		user?.avatar_url ||
		metadata?.avatar_url ||
		metadata?.picture ||
		metadata?.photo_url ||
		null;

	return typeof uri === "string" && uri.trim() ? { uri: uri.trim() } : null;
}

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
	const { user } = useAuth();
	const { showToast } = useToast();
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
		? "rgba(8,15,27,0.76)"
		: "rgba(248,250,252,0.92)";
	const heroMediaSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.10)"
		: "rgba(15,23,42,0.07)";
	const secondarySurfaceColor = isDarkMode
		? "rgba(255,255,255,0.05)"
		: "rgba(248,250,252,0.92)";
	const heroHeaderSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.54)"
		: "rgba(255,255,255,0.66)";
	const heroHeaderOverlayColors = isDarkMode
		? ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]
		: ["rgba(255,255,255,0.44)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"];
	const heroRowSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.54)"
		: "rgba(255,255,255,0.60)";
	const heroRowOverlayColors = isDarkMode
		? ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.02)"]
		: ["rgba(255,255,255,0.32)", "rgba(255,255,255,0.16)", "rgba(255,255,255,0.06)"];
	const heroRowFadeColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.56)", "rgba(8,15,27,0.88)"]
		: ["rgba(255,255,255,0)", "rgba(255,255,255,0.52)", "rgba(255,255,255,0.88)"];
	const selectorSummarySurfaceColor = isDarkMode
		? "rgba(255,255,255,0.065)"
		: "rgba(15,23,42,0.045)";
	const selectorChangePillSurfaceColor = isDarkMode
		? "rgba(248,113,113,0.14)"
		: "rgba(134,16,14,0.10)";
	const dividerColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.08)";
	const skeletonBaseColor = isDarkMode
		? "rgba(255,255,255,0.10)"
		: "rgba(15,23,42,0.09)";
	const skeletonSoftColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.05)";
	const accentColor = isDarkMode ? "#F87171" : "#B91C1C";
	const heroPrimarySurfaceColor = isDarkMode ? "#A11412" : "#B91C1C";
	const heroSubtitleColor = isDarkMode
		? "rgba(248,250,252,0.90)"
		: "rgba(15,23,42,0.74)";
	const warningColor = isDarkMode ? "#FDBA74" : "#D97706";
	const errorColor = isDarkMode ? "#FCA5A5" : "#B91C1C";
	const infoColor = isDarkMode ? "#CBD5E1" : "#475569";
	const heroBlendColors = isDarkMode
		? [
				"rgba(8,15,27,0.08)",
				"rgba(8,15,27,0.18)",
				"rgba(8,15,27,0.32)",
				"rgba(8,15,27,0.48)",
		  ]
		: [
				"rgba(248,250,252,0.04)",
				"rgba(248,250,252,0.12)",
				"rgba(248,250,252,0.22)",
				"rgba(248,250,252,0.36)",
		  ];
	const heroBottomMergeColors = isDarkMode
		? [
				"rgba(8,15,27,0.06)",
				"rgba(8,15,27,0.18)",
				"rgba(8,15,27,0.40)",
				"rgba(8,15,27,0.72)",
		  ]
		: [
				"rgba(255,255,255,0.06)",
				"rgba(255,255,255,0.16)",
				"rgba(255,255,255,0.30)",
				"rgba(255,255,255,0.58)",
		  ];
	const heroTopMaskColors = ["rgba(8,15,27,0.52)", "rgba(8,15,27,0.24)", "rgba(8,15,27,0)"];
	const heroVeilColor = isDarkMode
		? "rgba(8,15,27,0.16)"
		: "rgba(255,255,255,0.08)";
	const heroImageOpacity = isDarkMode ? 0.88 : 0.86;
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
		requestId: null,
	});
	const paymentSelectorOffsetRef = useRef(270);

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
	const pickupAvatarSource = getPaymentUserAvatarSource(user);
	const pickupLabel = buildCommitPaymentPickupLabel(currentLocation);
	const totalCostValue = estimatedCost?.totalCost ?? estimatedCost?.total_cost ?? null;
	const totalCostLabel = Number.isFinite(totalCostValue)
		? `$${Number(totalCostValue).toFixed(2)}`
		: null;
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
	const requestMeta = submissionState.displayId
		? `${hospitalName} - ${submissionState.displayId}`
		: hospitalName;
	const requestMetaLabel = submissionState.displayId
		? `${hospitalName} - ${submissionState.displayId}`
		: requestMeta;
	const headerSubtitle = hospitalName;
	const isFailureState =
		submissionState.kind === "failed" ||
		submissionState.kind === "payment_declined";
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
		setErrorMessage("");
		setInfoMessage("");

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
		effectiveSnapState,
		onSnapStateChange,
		scrollToPaymentSelector,
	]);
	const isIdleState = submissionState.kind === "idle";
	const canDismissStatusState =
		submissionState.kind === "waiting_approval" ||
		submissionState.kind === "dispatched" ||
		(submissionState.kind === "finalizing_dispatch" && !isSubmitting);
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
			isDarkMode,
			isBedFlow,
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
	const expandedFooterActionLabel = isCombinedFlow
		? "Combined payment soon"
		: !selectedPaymentMethod
			? "Select payment"
			: selectedPaymentMethod?.is_cash
				? isBedFlow
					? "Request booking with cash"
					: "Request transport with cash"
				: totalCostLabel
					? `Pay ${totalCostLabel}`
					: isBedFlow
						? "Book now"
						: "Pay now";
	const footerActionLabel = isExpandedPaymentView
		? expandedFooterActionLabel
		: !selectedPaymentMethod
			? "Select payment"
			: "Pay Now";
	const footerActionDisabled =
		isCombinedFlow || isSubmitting || (isLoadingCost && Boolean(selectedPaymentMethod));
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
							? "Payment received."
							: MAP_COMMIT_PAYMENT_COPY.STATUS_FINALIZING_DESCRIPTION,
				  }
				: submissionState.kind === "waiting_approval"
					? {
							accentColor: warningColor,
							title: MAP_COMMIT_PAYMENT_COPY.STATUS_WAITING_TITLE,
							description:
								MAP_COMMIT_PAYMENT_COPY.STATUS_WAITING_DESCRIPTION,
					  }
					: submissionState.kind === "payment_declined"
						? {
								accentColor: errorColor,
								title: "Payment declined",
								description:
									"That payment was not accepted. Try again or switch payment method.",
						  }
						: submissionState.kind === "failed"
							? {
									accentColor: errorColor,
									title: "Payment could not complete",
									description:
										errorMessage ||
										"Something interrupted payment confirmation. Try again or switch payment method.",
							  }
					: {
							accentColor,
							title: isBedFlow
						? "Booking submitted"
						: MAP_COMMIT_PAYMENT_COPY.STATUS_DISPATCHED_TITLE,
							description: isBedFlow
								? "The hospital is responding now."
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
			showToast("Choose a hospital before continuing.", "error");
			return;
		}

		if (!selectedPaymentMethod) {
			setErrorMessage("Select a payment method.");
			showToast("Select a payment method.", "error");
			return;
		}

		if (isCombinedFlow) {
			setErrorMessage(paymentUnsupportedMessage);
			showToast(paymentUnsupportedMessage, "info");
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
			showToast("Choose card or cash for this request.", "error");
			return;
		}

		if (isCardSelected && !stripePaymentMethodId) {
			setErrorMessage("Choose a saved card to continue.");
			showToast("Choose a saved card to continue.", "error");
			return;
		}

		if (isCardSelected && !Number.isFinite(totalCostValue)) {
			setErrorMessage("Could not lock the card total right now. Try again.");
			showToast("Could not lock the card total right now. Try again.", "error");
			return;
		}

		if (
			selectedPaymentMethod?.is_wallet &&
			Number.isFinite(totalCostValue) &&
			Number(selectedPaymentMethod.balance || 0) < Number(totalCostValue)
		) {
			setErrorMessage("Choose another payment method.");
			showToast("Choose another payment method.", "error");
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
						triageCheckin: payload?.triageDraft || null,
						triageSnapshot: payload?.triageSnapshot || null,
				  })
				: buildAmbulanceCommitRequest({
						hospital,
						transport,
						paymentMethod: selectedPaymentMethod,
						pricingSnapshot: estimatedCost,
						currentLocation,
						triageCheckin: payload?.triageDraft || null,
						triageSnapshot: payload?.triageSnapshot || null,
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
				showToast(
					normalizeApiErrorMessage(
						initiationResult?.reason,
						`Could not submit ${requestVerb}.`,
					),
					"error",
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
					requestId: initiationResult.requestId || initiatedRequest.requestId,
				});
				showToast("Waiting for hospital approval.", "info");
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
									requestId: completionPayload.requestId || null,
								});
								showToast("Provider confirmed the cash handoff.", "success");
								setTimeout(() => {
									onConfirm?.();
								}, 800);
							})
							.catch((error) => {
								const nextMessage = normalizeApiErrorMessage(
									error?.message,
									"Hospital approval is still pending.",
								);
								setErrorMessage(nextMessage);
								showToast(nextMessage, "error");
							});
					}, 2600);
				}
				return;
			}

			if (initiationResult.awaitsPaymentConfirmation) {
				setSubmissionState({
					kind: "processing_payment",
					displayId: initiationResult.displayId || initiatedRequest.requestId,
					requestId: initiationResult.requestId || initiatedRequest.requestId,
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
						setSubmissionState({
							kind: "payment_declined",
							displayId:
								initiationResult.displayId || initiatedRequest.requestId,
							requestId: initiationResult.requestId || initiatedRequest.requestId,
						});
						setErrorMessage("Payment was declined. Choose another card or cash.");
						showToast("Payment was declined. Choose another card or cash.", "error");
						return;
					}

					const nextMessage = normalizeApiErrorMessage(
						paymentError?.message,
						"Could not confirm card payment.",
					);
					setSubmissionState({
						kind: "failed",
						displayId:
							initiationResult.displayId || initiatedRequest.requestId,
						requestId: initiationResult.requestId || initiatedRequest.requestId,
					});
					setErrorMessage(nextMessage);
					showToast(nextMessage, "error");
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
						setSubmissionState({
							kind: "payment_declined",
							displayId:
								initiationResult.displayId || initiatedRequest.requestId,
							requestId: initiationResult.requestId || initiatedRequest.requestId,
						});
						setErrorMessage("Payment was declined. Choose another card or cash.");
						showToast("Payment was declined. Choose another card or cash.", "error");
						return;
					}

					setInfoMessage("Payment was received. Dispatch is still finalizing.");
					showToast("Payment was received. Dispatch is still finalizing.", "info");
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
					requestId: completionPayload.requestId || null,
				});
				showToast(
					isBedFlow
						? "Payment received. Booking is live."
						: "Payment received. Dispatching now.",
					"success",
				);
				setTimeout(() => {
					onConfirm?.();
				}, 800);
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
				requestId: completionPayload.requestId || null,
			});
			showToast(
				isBedFlow ? "Booking request submitted." : "Dispatch request submitted.",
				"success",
			);
			setTimeout(() => {
				onConfirm?.();
			}, 800);
		} catch (error) {
			const nextMessage = normalizeApiErrorMessage(
				error?.message,
				`Could not submit ${requestVerb}.`,
			);
			setErrorMessage(nextMessage);
			showToast(nextMessage, "error");
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
		showToast,
	]);
	const handleFooterPress = useCallback(() => {
		if (isIdleState && !selectedPaymentMethod) {
			openPaymentSelector();
			return;
		}

		handleSubmit();
	}, [handleSubmit, isIdleState, openPaymentSelector, selectedPaymentMethod]);

	const body = submissionState.kind === "idle" ? (
		<View style={styles.sectionStack}>
			<MapCommitPaymentHeroBlade
				title={isLoadingCost ? "Total" : totalCostLabel || "Total"}
				subtitle={paymentHeroSubtitle}
				rightMeta={isLoadingCost ? null : paymentHeroMeta.label}
				rightMetaIcon={paymentHeroMeta.icon}
				gradientColors={paymentHeroGradientColors}
				metaSurfaceColor="rgba(255,255,255,0.16)"
				backgroundColor={heroSurfaceColor}
				accentColor={heroPrimarySurfaceColor}
				avatarSurfaceColor="rgba(255,255,255,0.18)"
				glowColor="rgba(255,255,255,0.38)"
				titleColor="#FFFFFF"
				mutedColor="rgba(255,255,255,0.76)"
				loading={isLoadingCost}
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

			{isIdleState ? (
				<MapCommitPaymentFooter
					label={footerActionLabel}
					onPress={handleFooterPress}
					loading={isSubmitting}
					disabled={footerActionDisabled}
					modalContainedStyle={modalContainedStyle}
					contentInsetStyle={webWideInsetStyle}
					inline
				/>
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
			snapState={effectiveSnapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapCommitDetailsTopSlot
					title={MAP_COMMIT_PAYMENT_COPY.HEADER_TITLE}
					subtitle={headerSubtitle}
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
