import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
// PULLBACK NOTE: Phase 5d — raw trip reads moved off EmergencyContext
// OLD: useEmergency() for activeAmbulanceTrip/activeBedBooking/pendingApproval/setPendingApproval
// NEW: direct useEmergencyTripStore() selectors
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { useEmergencyTripStore } from "../../../../stores/emergencyTripStore";
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
import {
	estimatedCostAtom,
	isLoadingCostAtom,
	isSubmittingPaymentAtom,
	paymentErrorMessageAtom,
	paymentInfoMessageAtom,
	paymentSubmissionStateAtom,
} from "../../../../atoms/paymentAtoms";
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
import {
	MAP_COMMIT_PAYMENT_METHOD_KINDS,
	MAP_COMMIT_PAYMENT_TRANSACTION_STATES,
	createCommitPaymentSubmissionState,
	getCommitPaymentRequestIdentifiers,
	isCommitPaymentDismissibleState,
	isCommitPaymentFailureState,
	isCommitPaymentIdleState,
	validateCommitPaymentSubmitContract,
} from "./mapCommitPayment.transaction";

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
		startAmbulanceTrip,
		startBedBooking,
		clearSelectedHospital,
		effectiveDemoModeEnabled,
		clearCommitFlow,
	} = useEmergency();
	// PULLBACK NOTE: Phase 5d — raw trip objects + setPendingApproval from Zustand store directly
	// OLD: destructured from useEmergency() — context re-rendered all subscribers on every trip update
	// NEW: surgical store selectors — scoped re-renders only
	const activeAmbulanceTrip = useEmergencyTripStore((s) => s.activeAmbulanceTrip);
	const activeBedBooking = useEmergencyTripStore((s) => s.activeBedBooking);
	const pendingApproval = useEmergencyTripStore((s) => s.pendingApproval);
	const setPendingApproval = useEmergencyTripStore((s) => s.setPendingApproval);

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
		pendingApproval,
		currentRoute: null,
		effectiveDemoModeEnabled,
		onRequestComplete: () => {},
	});

	// PULLBACK NOTE: PT-D — wire controller to paymentAtoms (Jotai L5)
	// OLD: useState for every piece — no persistence across sheet remount, no layer compliance
	// NEW: atoms own submission state, cost state, feedback strings — survive collapse/remount
	const [submissionState, setSubmissionState] = useAtom(paymentSubmissionStateAtom);
	const [isSubmitting, setIsSubmitting] = useAtom(isSubmittingPaymentAtom);
	const [errorMessage, setErrorMessage] = useAtom(paymentErrorMessageAtom);
	const [infoMessage, setInfoMessage] = useAtom(paymentInfoMessageAtom);
	const [estimatedCost, setEstimatedCost] = useAtom(estimatedCostAtom);
	const [isLoadingCost, setIsLoadingCost] = useAtom(isLoadingCostAtom);

	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
	// PULLBACK NOTE: PT-D (violation 3) — selectedPaymentMethodRef assigned inline; useEffect sync removed
	const selectedPaymentMethodRef = useRef(null);
	selectedPaymentMethodRef.current = selectedPaymentMethod;
	const paymentMethodsRefreshRef = useRef(0);
	// PULLBACK NOTE: PT-B — totalCostValueRef breaks the refreshPaymentMethodSnapshot → totalCostValue
	// closure dep chain that caused 2–4 reload churn (defect PT-1, class 2.13).
	// OLD: totalCostValue in useCallback dep array → new fn ref → useEffect re-fires refresh on every cost update
	// NEW: ref always current → useCallback stable → no extra refresh on cost change
	const totalCostValueRef = useRef(null);
	// PULLBACK NOTE: PT-B2 — stable refs for loadCost effect; prevents re-fire on prop object identity churn
	// OLD: hospital, currentLocation, room, transport as direct deps → new object ref every render → loadCost re-fires → isLoadingCost flicker
	// NEW: refs always current; effect deps are scalar IDs only
	const hospitalRef = useRef(hospital);
	hospitalRef.current = hospital;
	const currentLocationRef = useRef(currentLocation);
	currentLocationRef.current = currentLocation;
	const roomRef = useRef(room);
	roomRef.current = room;
	const transportRef = useRef(transport);
	transportRef.current = transport;
	const submitLockRef = useRef(false);
	const autoApprovalTimeoutRef = useRef(null);
	const isMountedRef = useRef(true);
	// PULLBACK NOTE: PT-C — awaitingApprovalRef tracks whether we are in the WAITING_APPROVAL window
	// OLD: isSubmitting reset to false in finally's return path, making CTA re-pressable during approval wait
	// NEW: ref prevents isSubmitting reset until approval resolves (DISPATCHED/FAILED/PAYMENT_DECLINED)
	const awaitingApprovalRef = useRef(false);
	const [isRefreshingPaymentMethods, setIsRefreshingPaymentMethods] = useState(false);
	const [paymentMethodsSnapshotReady, setPaymentMethodsSnapshotReady] = useState(false);
	const [paymentMethodsRefreshKey, setPaymentMethodsRefreshKey] = useState(0);

	// PULLBACK NOTE: PT-D — seed estimatedCost atom from pricingSnapshot on first mount if atom is empty
	// Runs synchronously before first render paint; no effect needed
	const _seedCost = useMemo(() => {
		if (estimatedCost === null && payload?.pricingSnapshot) {
			const seeded = normalizeCommitPaymentCost(
				payload.pricingSnapshot,
				hasRoomSelection ? room : transport,
				selectionHeaderLabel,
			);
			if (seeded) setEstimatedCost(seeded);
		}
		return null;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const totalCostValue = estimatedCost?.totalCost ?? estimatedCost?.total_cost ?? null;
	// PULLBACK NOTE: PT-B — keep ref in sync with state for use inside refreshPaymentMethodSnapshot
	totalCostValueRef.current = totalCostValue;
	const totalCostLabel = Number.isFinite(totalCostValue)
		? `$${Number(totalCostValue).toFixed(2)}`
		: null;

	useEffect(() => {
		// PULLBACK NOTE: PT-D — seed submissionState atom with correct controller shape on mount
		// atom default shape differs from createCommitPaymentSubmissionState (display/dismissible vs displayId/requestId)
		setSubmissionState(createCommitPaymentSubmissionState(MAP_COMMIT_PAYMENT_TRANSACTION_STATES.IDLE));
		return () => {
			isMountedRef.current = false;
			submitLockRef.current = false;
			if (autoApprovalTimeoutRef.current) {
				clearTimeout(autoApprovalTimeoutRef.current);
				autoApprovalTimeoutRef.current = null;
			}
			// PULLBACK NOTE: PT-D — reset ephemeral atoms on unmount so stale state does not bleed
			// into next sheet open. WAITING_APPROVAL and above are intentionally NOT reset here
			// (awaitingApprovalRef guards the CTA; atom persists through collapse for remount lock).
			setErrorMessage("");
			setInfoMessage("");
			setIsLoadingCost(false);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const setTransactionState = useCallback((kind, meta = {}) => {
		if (!isMountedRef.current) return;
		// PULLBACK NOTE: PT-A diagnostic — log every submissionState transition
		console.log('[PT-A][CommitPayment] submissionState →', kind, meta);
		setSubmissionState(createCommitPaymentSubmissionState(kind, meta));
	}, []);

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
			// PULLBACK NOTE: PT-A diagnostic — log every refresh trigger with caller tag
			console.log('[PT-A][CommitPayment] refreshPaymentMethodSnapshot fired refreshId=', refreshId, '| preferredMethod=', preferredMethod?.id ?? null);

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

				// PULLBACK NOTE: PT-B — read cost from ref (always current) instead of closed-over state value
				// OLD: const checkoutTotal = Number(totalCostValue || 0);
				// NEW: read from ref — stable callback, no dep on totalCostValue
				const checkoutTotal = Number(totalCostValueRef.current || 0);
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
			// PULLBACK NOTE: PT-B — totalCostValue removed from deps (now read from totalCostValueRef inside callback)
			// OLD: demoCashOnly, hospital?.id, hospital?.organizationId, hospital?.organization_id, totalCostValue, user?.id
			// NEW: totalCostValue removed — ref is always current, no stale closure, no churn
			demoCashOnly,
			hospital?.id,
			hospital?.organizationId,
			hospital?.organization_id,
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
			// PULLBACK NOTE: PT-B2 — read from refs inside effect (always current, no stale closure)
			const h = hospitalRef.current;
			const loc = currentLocationRef.current;
			const r = roomRef.current;
			const t = transportRef.current;

			if (!h?.id) return;

			setIsLoadingCost(true);
			setErrorMessage("");
			setInfoMessage("");

			try {
				let checkoutCost = null;
				if (!isCombinedFlow && !isBedFlow) {
					const distanceKm = buildCommitPaymentDistanceKm(h, loc);
					const nextCost = await serviceCostService.calculateEmergencyCost("ambulance", {
						distance: distanceKm,
						hospitalId: h.id,
						ambulanceType:
							t?.service_type ||
							t?.serviceType ||
							t?.tierKey ||
							null,
					});
					if (cancelled) return;
					checkoutCost = await augmentEmergencyCostForCheckout(nextCost, {
						hospitalId: h.id,
						serviceType: "ambulance",
					});
				} else if (isBedFlow) {
					const roomAmount =
						parseCommitPaymentAmount(r?.priceText) ??
						parseCommitPaymentAmount(r?.price);
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
								hospitalId: h.id,
								serviceType: "bed",
						  })
						: null;
				} else {
					const transportAmount =
						parseCommitPaymentAmount(t?.priceText) ??
						parseCommitPaymentAmount(t?.price);
					const roomAmount =
						parseCommitPaymentAmount(r?.priceText) ??
						parseCommitPaymentAmount(r?.price);
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
								hospitalId: h.id,
								serviceType: "ambulance",
						  })
						: null;
				}
				if (cancelled) return;
				const normalized = normalizeCommitPaymentCost(
					checkoutCost,
					isBedFlow ? r : t || r,
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
							isBedFlow ? roomRef.current : transportRef.current || roomRef.current,
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
		// PULLBACK NOTE: PT-B2 — scalar IDs only; object refs (hospital, transport, room, currentLocation) replaced with refs above
		// OLD: currentLocation, hospital, room, transport — unstable object references → re-fires on every parent render
		// NEW: hospital?.id, transport?.id, room?.id, currentLocation lat/lng scalars → stable identity checks
		hospital?.id,
		transport?.id,
		transport?.service_type,
		room?.id,
		isBedFlow,
		isCombinedFlow,
		payload?.pricingSnapshot,
		paymentUnsupportedMessage,
		roomTitle,
		selectionHeaderLabel,
		transportTitle,
		currentLocation?.latitude,
		currentLocation?.longitude,
	]);

	const clearFeedback = useCallback(() => {
		setErrorMessage("");
		setInfoMessage("");
	}, []);

	const handlePaymentMethodSelect = useCallback(
		(method) => {
			// PULLBACK NOTE: PT-B — removed refreshPaymentMethodSnapshot call on method select (defect PT-8)
			// OLD: setPaymentMethodsSnapshotReady(false); void refreshPaymentMethodSnapshot({ preferredMethod: method });
			// NEW: set state only — wallet/cash eligibility already evaluated in loaded snapshot; no refetch needed
			setSelectedPaymentMethod(method);
			setErrorMessage("");
		},
		[],
	);

	const isIdleState = isCommitPaymentIdleState(submissionState);
	const canDismissStatusState = isCommitPaymentDismissibleState(submissionState, {
		isSubmitting,
	});
	const isFailureState = isCommitPaymentFailureState(submissionState);
	const isPaymentMethodSnapshotPending =
		isIdleState && (!paymentMethodsSnapshotReady || isRefreshingPaymentMethods);

	const handleSubmit = useCallback(async () => {
		if (!isIdleState) {
			if (canDismissStatusState) {
				onConfirm?.();
			}
			return;
		}

		const stripePaymentMethodId = selectedPaymentMethod
			? paymentService.getStripePaymentMethodId(selectedPaymentMethod)
			: null;
		const submitContract = validateCommitPaymentSubmitContract({
			hospital,
			paymentMethodsSnapshotReady,
			isRefreshingPaymentMethods,
			selectedPaymentMethod,
			isCombinedFlow,
			paymentUnsupportedMessage,
			stripePaymentMethodId,
			totalCostValue,
		});

		if (!submitContract.ok) {
			if (submitContract.level === "info") {
				setInfoMessage(submitContract.message);
				setErrorMessage("");
			} else {
				setErrorMessage(submitContract.message);
				setInfoMessage("");
			}
			if (submitContract.level !== "info") {
				showToast(submitContract.message, submitContract.level || "error");
			}
			return;
		}

		if (submitLockRef.current) return;
		submitLockRef.current = true;

		const isCardSelected =
			submitContract.methodKind === MAP_COMMIT_PAYMENT_METHOD_KINDS.CARD;

		setIsSubmitting(true);
		// PULLBACK NOTE: PT-A diagnostic — isSubmitting=true fired; submissionState.kind is still IDLE here (sync gap window opens)
		console.log('[PT-A][CommitPayment] handleSubmit — isSubmitting=true | submissionState.kind=IDLE (gap window open)');
		setErrorMessage("");
		setInfoMessage("");
		const pendingStartedAt = Date.now();
		let transactionRequestIds = { displayId: null, requestId: null };

		try {
			let chargeOrganizationId = null;
			if (isCardSelected) {
				chargeOrganizationId = await paymentService.resolveChargeOrganizationId(
					hospital?.organization_id || hospital?.organizationId || null,
				);
				if (!chargeOrganizationId) {
					const nextMessage =
						"Card checkout is unavailable for this hospital right now.";
					setErrorMessage(nextMessage);
					showToast(nextMessage, "error");
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
			transactionRequestIds = getCommitPaymentRequestIdentifiers(
				initiationResult,
				initiatedRequest,
			);

			if (initiationResult.requiresApproval) {
				const pendingApprovalState = buildPendingApprovalState({
					initiatedRequest,
					result: initiationResult,
					hospital,
				});
				setPendingApproval?.(pendingApprovalState);
				// PULLBACK NOTE: PT-C — set awaitingApprovalRef before setTransactionState so finally block sees it immediately
				awaitingApprovalRef.current = true;
				setTransactionState(
					MAP_COMMIT_PAYMENT_TRANSACTION_STATES.WAITING_APPROVAL,
					transactionRequestIds,
				);
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
					autoApprovalTimeoutRef.current = setTimeout(() => {
						autoApprovalTimeoutRef.current = null;
						void paymentService
							.requestDemoCashAutoApproval(
								pendingApprovalState.paymentId,
								pendingApprovalState.requestId,
							)
							.then(() => handleRequestComplete(completionPayload))
							.then(() => {
								awaitingApprovalRef.current = false;
								setPendingApproval?.(null);
								setTransactionState(
									MAP_COMMIT_PAYMENT_TRANSACTION_STATES.DISPATCHED,
									{
										displayId: completionPayload.displayId,
										requestId: completionPayload.requestId,
									},
								);
								showToast("Provider confirmed the cash handoff.", "success");
								setTimeout(() => {
									if (isMountedRef.current) {
										onConfirm?.();
									}
								}, 800);
							})
							.catch((error) => {
								awaitingApprovalRef.current = false;
								const nextMessage = normalizeApiErrorMessage(
									error?.message,
									"Hospital approval is still pending.",
								);
								if (isMountedRef.current) {
									setIsSubmitting(false);
									setErrorMessage(nextMessage);
									showToast(nextMessage, "error");
								}
							});
					}, 2600);
				}
				return;
			}

			if (initiationResult.awaitsPaymentConfirmation) {
				setTransactionState(
					MAP_COMMIT_PAYMENT_TRANSACTION_STATES.PROCESSING_PAYMENT,
					transactionRequestIds,
				);

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

					if (
						settlementAfterConfirmError?.success === false &&
						settlementAfterConfirmError?.code === "PAYMENT_DECLINED"
					) {
						setTransactionState(
							MAP_COMMIT_PAYMENT_TRANSACTION_STATES.PAYMENT_DECLINED,
							transactionRequestIds,
						);
						setErrorMessage("Payment was declined. Choose another card or cash.");
						showToast("Payment was declined. Choose another card or cash.", "error");
						return;
					}

					const nextMessage = normalizeApiErrorMessage(
						paymentError?.message,
						"Could not confirm card payment.",
					);
					setTransactionState(
						MAP_COMMIT_PAYMENT_TRANSACTION_STATES.FAILED,
						transactionRequestIds,
					);
					setErrorMessage(nextMessage);
					showToast(nextMessage, "error");
					return;
				}

				setTransactionState(
					MAP_COMMIT_PAYMENT_TRANSACTION_STATES.FINALIZING_DISPATCH,
					transactionRequestIds,
				);

				const settlementResult = await paymentService.waitForEmergencyPaymentSettlement(
					initiationResult.requestId,
				);

				if (!settlementResult?.success) {
					if (settlementResult?.code === "PAYMENT_DECLINED") {
						setTransactionState(
							MAP_COMMIT_PAYMENT_TRANSACTION_STATES.PAYMENT_DECLINED,
							transactionRequestIds,
						);
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
				setTransactionState(
					MAP_COMMIT_PAYMENT_TRANSACTION_STATES.DISPATCHED,
					{
						displayId: completionPayload.displayId,
						requestId: completionPayload.requestId,
					},
				);
				showToast(
					isBedFlow
						? "Payment received. Booking is live."
						: "Payment received. Dispatching now.",
					"success",
				);
				setTimeout(() => {
					if (isMountedRef.current) {
						onConfirm?.();
					}
				}, 800);
				return;
			}

			const completionPayload = buildCommitPaymentCompletionPayload({
				initiatedRequest,
				result: initiationResult,
				hospital,
			});
			await handleRequestComplete(completionPayload);
			setTransactionState(MAP_COMMIT_PAYMENT_TRANSACTION_STATES.DISPATCHED, {
				displayId: completionPayload.displayId,
				requestId: completionPayload.requestId,
			});
			showToast(
				isBedFlow ? "Booking request submitted." : "Dispatch request submitted.",
				"success",
			);
			setTimeout(() => {
				if (isMountedRef.current) {
					onConfirm?.();
				}
			}, 800);
		} catch (error) {
			const nextMessage = normalizeApiErrorMessage(
				error?.message,
				`Could not submit ${requestVerb}.`,
			);
			setTransactionState(MAP_COMMIT_PAYMENT_TRANSACTION_STATES.FAILED, {
				displayId: transactionRequestIds.displayId,
				requestId: transactionRequestIds.requestId,
			});
			setErrorMessage(nextMessage);
			showToast(nextMessage, "error");
		} finally {
			submitLockRef.current = false;
			// PULLBACK NOTE: PT-A diagnostic — finally block; awaitingApprovalRef guards isSubmitting reset
			console.log('[PT-A][CommitPayment] finally | awaitingApproval=', awaitingApprovalRef.current, '| submissionState.kind=', submissionState.kind);
			// PULLBACK NOTE: PT-C — skip isSubmitting reset while WAITING_APPROVAL window is open
			// OLD: always setIsSubmitting(false) in finally
			// NEW: skip reset if awaitingApprovalRef.current — reset happens in .then()/.catch() when approval resolves
			if (isMountedRef.current && !awaitingApprovalRef.current) {
				setIsSubmitting(false);
			}
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
		setTransactionState,
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
