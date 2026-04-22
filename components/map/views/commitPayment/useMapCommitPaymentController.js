import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { usePreferences } from "../../../../contexts/PreferencesContext";
import { useToast } from "../../../../contexts/ToastContext";
import { useEmergencyContacts } from "../../../../hooks/emergency/useEmergencyContacts";
import { useEmergencyRequests } from "../../../../hooks/emergency/useEmergencyRequests";
import { useRequestFlow } from "../../../../hooks/emergency/useRequestFlow";
import { useMedicalProfile } from "../../../../hooks/user/useMedicalProfile";
import { useVisits } from "../../../../contexts/VisitsContext";
import { database, StorageKeys } from "../../../../database";
import { demoEcosystemService } from "../../../../services/demoEcosystemService";
import { paymentService } from "../../../../services/paymentService";
import { serviceCostService } from "../../../../services/serviceCostService";
import { augmentEmergencyCostForCheckout } from "../../../../services/pricingService";
import { confirmSavedCardPayment } from "../../../../services/stripeSavedCardConfirmation";
import {
	normalizeApiErrorMessage,
	waitForMinimumPending,
} from "../../../../utils/ui/apiInteractionFeedback";
import { MAP_COMMIT_PAYMENT_COPY } from "./mapCommitPayment.content";
import {
	buildAmbulanceCommitRequest,
	buildBedCommitRequest,
	buildCommitPaymentCompletionPayload,
	buildCommitPaymentDistanceKm,
	buildPendingApprovalState,
	normalizeCommitPaymentCost,
	parseCommitPaymentAmount,
} from "./mapCommitPayment.helpers";

export function useMapCommitPaymentController({
	hospital,
	transport,
	room = null,
	payload = null,
	currentLocation = null,
	isBedFlow = false,
	isCombinedFlow = false,
	hasRoomSelection = false,
	selectionHeaderLabel = "Selected service",
	roomTitle = "Bed reservation",
	transportTitle = "Transport",
	requestVerb = "dispatch",
	paymentUnsupportedMessage = "Payment is not ready yet.",
	onConfirm,
}) {
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

	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
	const selectedPaymentMethodRef = useRef(null);
	const paymentMethodsRefreshRef = useRef(0);
	const [isRefreshingPaymentMethods, setIsRefreshingPaymentMethods] = useState(false);
	const [paymentMethodsSnapshotReady, setPaymentMethodsSnapshotReady] = useState(false);
	const [paymentMethodsRefreshKey, setPaymentMethodsRefreshKey] = useState(0);
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

	const totalCostValue = estimatedCost?.totalCost ?? estimatedCost?.total_cost ?? null;
	const totalCostLabel = Number.isFinite(totalCostValue)
		? `$${Number(totalCostValue).toFixed(2)}`
		: null;

	useEffect(() => {
		selectedPaymentMethodRef.current = selectedPaymentMethod;
	}, [selectedPaymentMethod]);

	const demoCashOnly = useMemo(
		() =>
			demoEcosystemService.shouldSimulatePayments({
				hospital,
				demoModeEnabled: effectiveDemoModeEnabled,
			}),
		[effectiveDemoModeEnabled, hospital],
	);

	const refreshPaymentMethodSnapshot = useCallback(
		async ({ preferredMethod = null } = {}) => {
			const refreshId = paymentMethodsRefreshRef.current + 1;
			paymentMethodsRefreshRef.current = refreshId;
			setIsRefreshingPaymentMethods(true);
			setPaymentMethodsSnapshotReady(false);

			try {
				if (!user?.id) {
					if (paymentMethodsRefreshRef.current !== refreshId) return;
					setSelectedPaymentMethod(null);
					setPaymentMethodsSnapshotReady(true);
					return;
				}

				const [methods, wallet, cachedDefault] = await Promise.all([
					paymentService.getPaymentMethods(),
					paymentService.getWalletBalance(),
					database.read(StorageKeys.DEFAULT_PAYMENT_METHOD),
				]);
				if (paymentMethodsRefreshRef.current !== refreshId) return;

				const checkoutTotal = Number(totalCostValue || 0);
				const walletBalance = Number(wallet?.balance || 0);
				const walletMethod = {
					id: "wallet_internal",
					type: "wallet",
					brand: "iVisit Balance",
					last4: walletBalance.toFixed(2),
					is_wallet: true,
					balance: walletBalance,
					currency: wallet?.currency || "USD",
					is_default: false,
				};
				const cashMethod = {
					id: "cash_payment",
					type: "cash",
					brand: "Cash",
					last4: "Payment",
					is_cash: true,
					is_default: false,
				};

				let cashEligible = true;
				if (!demoCashOnly && hospital?.id && checkoutTotal > 0) {
					try {
						cashEligible = await paymentService.checkCashEligibility(
							hospital?.organization_id || hospital?.organizationId || hospital.id,
							checkoutTotal,
						);
					} catch {
						cashEligible = false;
					}
				}
				if (paymentMethodsRefreshRef.current !== refreshId) return;

				const finalMethods = demoCashOnly
					? [cashMethod, walletMethod, ...(Array.isArray(methods) ? methods : [])]
					: [walletMethod, cashMethod, ...(Array.isArray(methods) ? methods : [])];
				const availableMethods = finalMethods.filter((method) => {
					if (!method) return false;
					if (demoCashOnly && !method.is_cash) return false;
					if (method.is_wallet && checkoutTotal > 0) {
						return walletBalance >= checkoutTotal;
					}
					if (method.is_cash && !demoCashOnly) {
						return cashEligible;
					}
					return true;
				});
				const currentMethod = preferredMethod || selectedPaymentMethodRef.current || null;
				const selectedMatch = currentMethod
					? availableMethods.find((method) => method.id === currentMethod.id)
					: null;
				const cachedMatch = cachedDefault?.id
					? availableMethods.find((method) => method.id === cachedDefault.id)
					: null;
				const dbDefault = availableMethods.find((method) => method.is_default);
				const defaultMethod =
					(demoCashOnly ? availableMethods.find((method) => method.is_cash) : null) ||
					selectedMatch ||
					cachedMatch ||
					dbDefault ||
					availableMethods[0] ||
					null;

				setSelectedPaymentMethod(defaultMethod);
				setPaymentMethodsSnapshotReady(true);
				setPaymentMethodsRefreshKey((key) => key + 1);
			} catch (error) {
				if (paymentMethodsRefreshRef.current !== refreshId) return;
				console.warn("[MapCommitPayment] payment method refresh failed:", error);
				setSelectedPaymentMethod(null);
				setPaymentMethodsSnapshotReady(true);
				setPaymentMethodsRefreshKey((key) => key + 1);
			} finally {
				if (paymentMethodsRefreshRef.current === refreshId) {
					setIsRefreshingPaymentMethods(false);
				}
			}
		},
		[
			demoCashOnly,
			hospital?.id,
			hospital?.organizationId,
			hospital?.organization_id,
			totalCostValue,
			user?.id,
		],
	);

	useEffect(() => {
		setPaymentMethodsSnapshotReady(false);
		void refreshPaymentMethodSnapshot();
	}, [refreshPaymentMethodSnapshot]);

	useEffect(() => {
		let cancelled = false;

		const loadCost = async () => {
			if (!hospital?.id) return;

			setIsLoadingCost(true);
			setErrorMessage("");
			setInfoMessage("");

			try {
				let checkoutCost = null;
				if (!isCombinedFlow && !isBedFlow) {
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
			} catch (_error) {
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

	const clearFeedback = useCallback(() => {
		setErrorMessage("");
		setInfoMessage("");
	}, []);

	const handlePaymentMethodSelect = useCallback(
		(method) => {
			setSelectedPaymentMethod(method);
			setErrorMessage("");
			setPaymentMethodsSnapshotReady(false);
			void refreshPaymentMethodSnapshot({ preferredMethod: method });
		},
		[refreshPaymentMethodSnapshot],
	);

	const isIdleState = submissionState.kind === "idle";
	const canDismissStatusState =
		submissionState.kind === "waiting_approval" ||
		submissionState.kind === "dispatched" ||
		(submissionState.kind === "finalizing_dispatch" && !isSubmitting);
	const isFailureState =
		submissionState.kind === "failed" ||
		submissionState.kind === "payment_declined";
	const isPaymentMethodSnapshotPending =
		isIdleState && (!paymentMethodsSnapshotReady || isRefreshingPaymentMethods);

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

		if (!paymentMethodsSnapshotReady || isRefreshingPaymentMethods) {
			setInfoMessage("Checking payment method.");
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
				const nextMessage = normalizeApiErrorMessage(
					initiationResult?.reason,
					`Could not submit ${requestVerb}.`,
				);
				setErrorMessage(nextMessage);
				showToast(nextMessage, "error");
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

					setSubmissionState({ kind: "idle", displayId: null, requestId: null });

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
						displayId: initiationResult.displayId || initiatedRequest.requestId,
						requestId: initiationResult.requestId || initiatedRequest.requestId,
					});
					setErrorMessage(nextMessage);
					showToast(nextMessage, "error");
					return;
				}

				setSubmissionState({
					kind: "finalizing_dispatch",
					displayId: initiationResult.displayId || initiatedRequest.requestId,
					requestId: initiationResult.requestId || initiatedRequest.requestId,
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
		clearCommitFlow,
		currentLocation,
		handleRequestComplete,
		handleRequestInitiated,
		hospital,
		isBedFlow,
		isCombinedFlow,
		isIdleState,
		isRefreshingPaymentMethods,
		canDismissStatusState,
		onConfirm,
		payload?.triageDraft,
		payload?.triageSnapshot,
		paymentMethodsSnapshotReady,
		paymentUnsupportedMessage,
		requestVerb,
		room,
		selectedPaymentMethod,
		setPendingApproval,
		showToast,
		totalCostValue,
		transport,
		estimatedCost,
	]);

	return {
		user,
		demoCashOnly,
		selectedPaymentMethod,
		totalCostValue,
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
	};
}

export default useMapCommitPaymentController;
