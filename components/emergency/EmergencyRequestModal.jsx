import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Linking, ActivityIndicator, Dimensions, Platform, KeyboardAvoidingView, StyleSheet } from "react-native";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useFABActions } from "../../contexts/FABContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { AMBULANCE_TYPES } from "../../constants/emergency";

import AmbulanceTypeCard from "./requestModal/AmbulanceTypeCard";
import EmergencyRequestModalDispatched from "./requestModal/EmergencyRequestModalDispatched";
import InfoTile from "./requestModal/InfoTile";
import BedBookingOptions from "./requestModal/BedBookingOptions";
import PaymentMethodSelector from "../payment/PaymentMethodSelector";
import { paymentService } from "../../services/paymentService";
import { calculateEmergencyCost } from "../../services/pricingService";
import { supabase } from "../../services/supabase";
import { hospitalsService } from "../../services/hospitalsService";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import HeaderBackButton from "../navigation/HeaderBackButton";
import { useEmergency } from "../../contexts/EmergencyContext";

/**
 * 💡 STABILITY NOTE:
 * This component is wrapped in React.memo and uses `useFABActions()` instead of `useFAB()`.
 * 
 * WHY: This component is at the epicenter of the FAB registration cycle. Using useFABActions 
 * ensures it doesn't re-render when the FAB state changes, breaking the infinite update cycle.
 * 
 * DEVELOPMENT HISTORY (2026-02-16):
 * - Refactored into a step-based modular flow (select -> payment -> dispatched).
 * - Added StepIndicator for better user guidance during stress.
 * - Centralized FAB logic to ensure accurate priority resolution and mobile stack visibility.
 * - Enhanced data rendering with fixed organization_id mapping for cash eligibility.
 */
const EmergencyRequestModal = React.memo(({
	mode = "emergency",
	requestHospital,
	selectedSpecialty,
	onRequestClose,
	onRequestInitiated,
	onRequestComplete,
	showClose = true,
	onScroll,
	scrollContentStyle,
}) => {
	const { isDarkMode } = useTheme();
	const { showToast } = useToast();
	const { registerFAB, unregisterFAB } = useFABActions();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();

	// MODULAR STEPS: 0: select, 1: payment, 2: dispatched
	const [requestStep, setRequestStep] = useState("select");
	const steps = useMemo(() => mode === "booking"
		? ["Options", "Verification", "Confirmation"]
		: ["Resource", "Payment", "Dispatched"], [mode]);

	const currentStepIndex = useMemo(() => {
		if (requestStep === "select") return 0;
		if (requestStep === "payment") return 1;
		if (requestStep === "waiting_approval") return 2;
		return 2;
	}, [requestStep]);

	const requestColors = useMemo(() => ({
		bg: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
		card: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
	}), [isDarkMode]);

	// --- Header Synchronization ---
	useEffect(() => {
		const stepName = steps[currentStepIndex];
		const hospitalName = requestHospital?.name || "Medical Center";
		const isFirstStep = currentStepIndex === 0;

		const isWaiting = requestStep === "waiting_approval";

		setHeaderState({
			title: isWaiting ? "Awaiting Approval" : (currentStepIndex === 2 ? "Request Complete" : hospitalName),
			subtitle: isWaiting ? "HOSPITAL REVIEW" : (currentStepIndex === 1 ? "SECURE CHECKOUT" : `STEP ${currentStepIndex + 1}: ${stepName.toUpperCase()}`),
			icon: <Ionicons
				name={isWaiting ? "time-outline" : (mode === "emergency" ? "medical" : "bed")}
				size={26}
				color="#FFFFFF"
			/>,
			backgroundColor: isWaiting ? "#FF9500" : (mode === "emergency" ? COLORS.emergency : COLORS.brandPrimary),
			leftComponent: isWaiting ? null : <HeaderBackButton onPress={() => {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
				if (currentStepIndex === 0 || currentStepIndex === 2) {
					onRequestClose();
				} else {
					setRequestStep("select");
				}
			}} />,
			rightComponent: false,
		});
	}, [currentStepIndex, requestStep, requestHospital, mode, onRequestClose, steps, setHeaderState]);
	const [selectedAmbulanceType, setSelectedAmbulanceType] = useState(null);
	const [bedType, setBedType] = useState("standard");
	const [bedCount, setBedCount] = useState(2);
	const [isRequesting, setIsRequesting] = useState(false);
	const [requestData, setRequestData] = useState(null);
	const [errorMessage, setErrorMessage] = useState(null);
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
	const [estimatedCost, setEstimatedCost] = useState(null);
	const [isCalculatingCost, setIsCalculatingCost] = useState(false);
	const [dynamicServices, setDynamicServices] = useState([]);
	const [dynamicRooms, setDynamicRooms] = useState([]);
	const [selectedRoomId, setSelectedRoomId] = useState(null);

	// Cash approval gate state (Managed by context for persistence)
	const { pendingApproval, setPendingApproval, activeAmbulanceTrip } = useEmergency();

	// If mounting and we have a pending approval, ensure we are on the right step
	useEffect(() => {
		if (pendingApproval && requestStep !== "waiting_approval") {
			setRequestStep("waiting_approval");
		}
	}, []);
	const approvalSubRef = useRef(null);

	// 🔄 REAL-TIME: Listen for approval/decline on pending cash payment
	useEffect(() => {
		if (!pendingApproval?.requestId) return;

		console.log('[EmergencyRequestModal] 📡 Subscribing to approval for:', pendingApproval.requestId);

		const channel = supabase
			.channel(`approval_${pendingApproval.requestId}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'emergency_requests',
					filter: `id=eq.${pendingApproval.requestId}`,
				},
				(payload) => {
					const newStatus = payload.new?.status;
					console.log('[EmergencyRequestModal] 📡 Status update received:', newStatus);

					if (newStatus === 'in_progress') {
						// ✅ APPROVED: Transition to dispatched view
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
						showToast("Payment approved! Dispatching...", "success");

						const waitTime = requestHospital?.waitTime ?? null;
						const hospitalEta = requestHospital?.eta ?? null;
						const ambulanceEta =
							(typeof hospitalEta === "string" && hospitalEta.length > 0
								? hospitalEta
								: null) ?? "8 mins";

						const next =
							mode === "booking"
								? {
									success: true,
									requestId: pendingApproval.requestId,
									displayId: pendingApproval.displayId,
									estimatedArrival: waitTime ?? "15 mins",
									hospitalId: pendingApproval.hospitalId,
									hospitalName: pendingApproval.hospitalName,
									serviceType: "bed",
									specialty: pendingApproval.specialty,
									bedCount: pendingApproval.bedCount,
									bedType: pendingApproval.bedType,
									bedNumber: pendingApproval.bedNumber,
									etaSeconds: null,
								}
								: {
									success: true,
									requestId: pendingApproval.requestId,
									displayId: pendingApproval.displayId,
									hospitalId: pendingApproval.hospitalId,
									hospitalName: pendingApproval.hospitalName,
									ambulanceType: pendingApproval.ambulanceType,
									serviceType: "ambulance",
									estimatedArrival: ambulanceEta,
									etaSeconds: null,
								};

						setRequestData(next);
						setRequestStep("dispatched");
						setPendingApproval(null);

						if (typeof onRequestComplete === "function") {
							onRequestComplete(next);
						}
					} else if (newStatus === 'payment_declined') {
						// ❌ DECLINED: Return to payment step, preserve selections
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
						setErrorMessage(
							"The hospital declined your cash payment. Please choose a different payment method."
						);
						// Keep selections intact — user doesn't have to re-pick hospital/ambulance
						setSelectedPaymentMethod(null);
						setRequestStep("payment");
						setPendingApproval(null);
						showToast("Payment declined by hospital", "error");
					}
				}
			)
			.subscribe();

		approvalSubRef.current = channel;

		return () => {
			console.log('[EmergencyRequestModal] 📡 Unsubscribing approval listener');
			supabase.removeChannel(channel);
			approvalSubRef.current = null;
		};
	}, [pendingApproval?.requestId, mode, requestHospital, onRequestComplete, showToast]);

	// Zero-ambulance fallback logic
	const hasAmbulances = useMemo(() => {
		if (mode !== 'emergency') return true;
		// Default to true if undefined to avoid blocking valid flows, check explicit 0
		return (requestHospital?.ambulances ?? 1) > 0;
	}, [requestHospital, mode]);

	const handleCallHospital = useCallback(() => {
		const phone = requestHospital?.phone || requestHospital?.google_phone;
		if (phone) {
			Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
		} else {
			showToast("No phone number available", "error");
		}
	}, [requestHospital?.phone, requestHospital?.google_phone, showToast]);

	const handleStepPress = useCallback((idx) => {
		if (idx >= currentStepIndex || isRequesting) return;

		// Haptic feedback
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		if (idx === 0) setRequestStep("select");
		if (idx === 1) setRequestStep("payment");
	}, [currentStepIndex, isRequesting]);

	// Calculate cost whenever selection changes
	useEffect(() => {
		let isMounted = true;
		const calculateCost = async () => {
			if (!requestHospital) return;

			setIsCalculatingCost(true);
			setErrorMessage(null);

			try {
				const serviceType = mode === "booking" ? "bed" : "ambulance";

				// Validate UUIDs to prevent "invalid input syntax" RPC errors
				const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

				// Fetch cost from RPC and org fee in parallel
				const [cost, orgFee] = await Promise.all([
					calculateEmergencyCost({
						hospital_id: requestHospital.id,
						ambulance_id: isValidUUID(selectedAmbulanceType?.id) ? selectedAmbulanceType.id : null,
						room_id: isValidUUID(selectedRoomId) ? selectedRoomId : null,
						service_type: serviceType
					}),
					paymentService.getOrganizationFee(requestHospital.id)
				]);

				// Ensure service fee is in the breakdown
				// The RPC should include it, but if not (stale schema), inject it client-side
				let breakdown = cost.breakdown || [];
				const hasFeeInBreakdown = Array.isArray(breakdown) && breakdown.some(
					item => item.type === 'fee' || item.name?.toLowerCase().includes('service fee')
				);

				if (!hasFeeInBreakdown && orgFee) {
					const feeRate = orgFee.feePercentage / 100;
					const baseCost = cost.base_cost || cost.totalCost || 0;
					const feeAmount = parseFloat((baseCost * feeRate).toFixed(2));

					console.log('[EmergencyRequestModal] Injecting service fee into breakdown:', {
						feeRate: `${orgFee.feePercentage}%`,
						baseCost,
						feeAmount,
						orgName: orgFee.orgName,
					});

					breakdown = [
						...breakdown,
						{
							name: `Service Fee (${orgFee.feePercentage}%)`,
							cost: feeAmount,
							type: 'fee'
						}
					];

					// Update total to include the fee
					cost.totalCost = (cost.totalCost || 0) + feeAmount;
					cost.service_fee = feeAmount;
				}

				// Attach org fee metadata for use in payment flow
				cost.breakdown = breakdown;
				cost.orgFee = orgFee;

				if (isMounted) setEstimatedCost(cost);
			} catch (error) {
				console.error("Error calculating estimated cost:", error);
				if (isMounted) {
					setEstimatedCost(null);
					setErrorMessage("Dynamic pricing unavailable. Standard rates will apply.");
				}
			} finally {
				if (isMounted) setIsCalculatingCost(false);
			}
		};

		calculateCost();
		return () => { isMounted = false; };
	}, [requestHospital?.id, mode, selectedAmbulanceType?.id, selectedRoomId]);

	// Fetch dynamic data
	useEffect(() => {
		const fetchDynamicData = async () => {
			if (!requestHospital?.id) return;

			try {
				if (mode === "booking") {
					const [rooms, roomPricing] = await Promise.all([
						hospitalsService.getRooms(requestHospital.id),
						hospitalsService.getRoomPricing(requestHospital.id, requestHospital.organization_id)
					]);

					// If specific rooms exist, use them. Otherwise, use Service/Room Types from DB.
					if (rooms.length > 0) {
						setDynamicRooms(rooms);
					} else if (roomPricing.length > 0) {
						// Transform room types into "virtual" rooms for display
						const virtualRooms = roomPricing.map(rp => ({
							id: rp.room_type, // Use type as ID for generic selection
							room_number: 'Any',
							room_type: rp.room_name || rp.room_type,
							base_price: rp.price_per_night,
							features: [rp.description || 'Standard accommodation'],
							check_in: null,
							check_out: null
						}));
						setDynamicRooms(virtualRooms);
						if (virtualRooms.length > 0) setSelectedRoomId(virtualRooms[0].id);
					}

					// Deprecated: dynamicServices for beds was incorrect.
					// We keep the state empty or could use it for debugging.
					setDynamicServices([]);
				} else {
					const services = await hospitalsService.getServicePricing(requestHospital.id, requestHospital.organization_id || requestHospital.organizationId);
					setDynamicServices(services.filter(s => s.service_type === 'ambulance'));
					// Prioritize DB services over hardcoded constants
					if (services.length > 0) {
						const firstAmb = services.find(s => s.service_type === 'ambulance');
						if (firstAmb) {
							setSelectedAmbulanceType({
								id: firstAmb.id,
								title: firstAmb.service_name,
								subtitle: firstAmb.description || "Emergency medical transport",
								price: `$${firstAmb.base_price}`,
								icon: 'medical-outline',
								eta: requestHospital.eta || '8-12 min',
								crew: '2 Paramedics'
							});
						}
					}
				}
			} catch (error) {
				console.error("Error fetching dynamic modal data:", error);
			}
		};

		fetchDynamicData();
	}, [requestHospital?.id, mode]);

	// Event handlers
	const handleSubmitRequest = useCallback(async () => {
		if (isRequesting) return;
		if (!requestHospital) return;

		// 🚨 BLOCKING LOGIC: Prevent duplicate ambulance requests
		if (mode === "emergency") {
			const hasActiveAmbulance = activeAmbulanceTrip && !['completed', 'cancelled'].includes(activeAmbulanceTrip.status);
			const hasPendingAmbulance = pendingApproval && pendingApproval.serviceType === "ambulance";

			if (hasActiveAmbulance || hasPendingAmbulance) {
				const statusMsg = hasPendingAmbulance ? "pending approval" : "already in progress";
				setErrorMessage(`You have an ambulance request ${statusMsg}. Please complete or cancel it before starting a new one.`);
				showToast("Active request detected", "error");
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
				return;
			}
		}

		// BIPHASIC FLOW: Step 1 -> Step 2
		if (requestStep === "select") {
			if (mode === "emergency" && !selectedAmbulanceType) {
				showToast("Please select an ambulance type", "error");
				return;
			}
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			setRequestStep("payment");
			return;
		}

		// Payment Validation
		if (!selectedPaymentMethod) {
			setErrorMessage("Please select a payment method");
			showToast("Payment method required", "error");
			return;
		}

		// Cash Eligibility Check
		if (selectedPaymentMethod.is_cash) {
			try {
				setIsRequesting(true);
				let targetOrgId = requestHospital.organization_id || requestHospital.organizationId;

				// SANITY CHECK: If Org ID matches Hospital ID, it's likely a mapping error or partial data.
				if (targetOrgId && targetOrgId === requestHospital.id) {
					console.warn('[EmergencyRequestModal] ⚠️ Detected Org ID matches Hospital ID. Assuming malformed data. Clearing to force fetch.');
					targetOrgId = null;
				}

				console.log('[EmergencyRequestModal] 🔍 Starting Cash Eligibility Trace:', {
					hospitalName: requestHospital.name,
					hospitalId: requestHospital.id,
					providedOrgId: targetOrgId,
					estimatedCost: estimatedCost?.totalCost
				});

				// SAFETY FALLBACK: If hospital object missing Org ID (or cleared above), re-fetch hospital record
				if (!targetOrgId) {
					console.log('[EmergencyRequestModal] ⚠️ Missing/Invalid Org ID. Re-fetching fresh record from Service...');
					const freshHospital = await hospitalsService.getById(requestHospital.id);
					targetOrgId = freshHospital?.organizationId;
					console.log('[EmergencyRequestModal] 🏥 Re-fetched Org ID:', targetOrgId);
				}

				if (!targetOrgId) {
					console.warn('[EmergencyRequestModal] ❌ Fatal: Could not resolve Organization linking for this hospital.');
					setErrorMessage("This provider is not currently part of an active organization. Cash payment unavailable.");
					showToast("Provider connection missing", "error");
					setIsRequesting(false);
					return;
				}

				const isEligible = await paymentService.checkCashEligibility(
					targetOrgId,
					estimatedCost?.totalCost || 0
				);

				console.log('[EmergencyRequestModal] ✅ Cash Eligibility Result:', { targetOrgId, isEligible });

				if (!isEligible) {
					setErrorMessage("Cash payment not available for this medical center (insufficient organizational wallet balance)");
					showToast("Hospital low on collateral", "error");
					setIsRequesting(false);
					return;
				}
			} catch (error) {
				console.error("[EmergencyRequestModal] 🚨 Cash eligibility check failed:", error);
				setErrorMessage("Failed to verify cash payment eligibility. Error code: " + (error.code || 'UNKNOWN'));
				showToast("Verification failed", "error");
				setIsRequesting(false);
				return;
			}
		}

		setErrorMessage(null);
		setIsRequesting(true);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

		const hospitalName = requestHospital?.name ?? "Hospital";
		const requestId =
			mode === "booking"
				? `BED-${Math.floor(Math.random() * 900000) + 100000}`
				: `AMB-${Math.floor(Math.random() * 900000) + 100000}`;

		const initiated =
			mode === "booking"
				? {
					requestId,
					hospitalId: requestHospital?.id ?? null,
					hospitalName,
					serviceType: "bed",
					specialty: selectedSpecialty ?? "Any",
					bedCount,
					bedType,
					bedNumber: dynamicRooms.find(r => r.id === selectedRoomId)?.room_number || `B${Math.floor(Math.random() * 900) + 100}`,
					roomId: selectedRoomId,
					paymentMethod: selectedPaymentMethod,
				}
				: {
					requestId,
					hospitalId: requestHospital?.id ?? null,
					hospitalName,
					ambulanceType: selectedAmbulanceType,
					serviceType: "ambulance",
					specialty: selectedSpecialty ?? "Any",
					paymentMethod: selectedPaymentMethod,
				};


		let result = null;
		try {
			if (typeof onRequestInitiated === "function") {
				result = await onRequestInitiated(initiated);

				// Handle explicit failure from the hook
				if (result && result.ok === false) {
					console.error("Request initiation failed:", result);
					setErrorMessage(result.reason || "Failed to create request");
					setIsRequesting(false);
					return;
				}

				// 🔑 CRITICAL: Capture the real UUID from the hook result
				if (result?.requestId) {
					console.log('[EmergencyRequestModal] ✅ Real ID received:', result.requestId, '(display:', initiated.requestId, ')');
					initiated._realId = result.requestId;
					initiated._displayId = result.displayId || initiated.requestId;
				}
			}
		} catch (error) {
			console.error("Error in onRequestInitiated callback:", error);
			setErrorMessage("Something went wrong. Please try again.");
			setIsRequesting(false);
			return;
		}

		// 💰 CASH APPROVAL GATE: If requires approval, enter waiting state
		if (result?.requiresApproval) {
			console.log('[EmergencyRequestModal] ⏳ Cash payment requires org approval. Entering waiting state.');
			const realRequestId = initiated._realId || initiated.requestId;
			setPendingApproval({
				requestId: realRequestId,
				displayId: initiated._displayId || initiated.requestId,
				paymentId: result.paymentId,
				hospitalId: initiated.hospitalId,
				hospitalName: initiated.hospitalName,
				serviceType: initiated.serviceType || (mode === "booking" ? "bed" : "ambulance"),
				ambulanceType: initiated.ambulanceType,
				specialty: initiated.specialty,
				bedCount: initiated.bedCount,
				bedType: initiated.bedType,
				bedNumber: initiated.bedNumber,
				initiatedData: initiated,
			});
			setRequestStep("waiting_approval");
			setIsRequesting(false);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Waiting for hospital approval", "info");
			return;
		}

		// Success flow (Card or no-approval) - slightly delayed for animation/UX
		setTimeout(() => {
			const waitTime = requestHospital?.waitTime ?? null;
			const hospitalEta = requestHospital?.eta ?? null;
			const ambulanceEta =
				(typeof hospitalEta === "string" && hospitalEta.length > 0
					? hospitalEta
					: null) ?? "8 mins";

			// Use real UUID for all downstream operations, display ID for UI
			const realRequestId = initiated._realId || initiated.requestId;

			const next =
				mode === "booking"
					? {
						success: true,
						requestId: realRequestId,
						displayId: initiated._displayId || initiated.requestId,
						estimatedArrival: waitTime ?? "15 mins",
						hospitalId: initiated.hospitalId,
						hospitalName: initiated.hospitalName,
						serviceType: "bed",
						specialty: initiated.specialty,
						bedCount: initiated.bedCount,
						bedType: initiated.bedType,
						bedNumber: initiated.bedNumber,
						etaSeconds: null,
					}
					: {
						success: true,
						requestId: realRequestId,
						displayId: initiated._displayId || initiated.requestId,
						hospitalId: initiated.hospitalId,
						hospitalName: initiated.hospitalName,
						ambulanceType: initiated.ambulanceType,
						serviceType: "ambulance",
						estimatedArrival: ambulanceEta,
						etaSeconds: null,
					};

			setRequestData(next);
			setIsRequesting(false);
			const toastMsg =
				mode === "booking"
					? "Bed reserved successfully"
					: "Ambulance dispatched";
			try {
				showToast(toastMsg, "success");
			} catch (e) { }

			if (typeof onRequestComplete === "function") {
				onRequestComplete(next);
			}
		}, 100); // Reduced delay since we already awaited the network call
	}, [
		bedCount,
		bedType,
		estimatedCost,
		isRequesting,
		mode,
		onRequestComplete,
		onRequestInitiated,
		requestHospital,
		selectedAmbulanceType,
		selectedPaymentMethod,
		selectedSpecialty,
		showToast,
	]);


	const handleRequestDone = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onRequestClose?.();
	}, [onRequestClose]);

	// Global FAB registration for request modal
	useEffect(() => {
		// Clean start
		const fabIds = ['ambulance-select', 'ambulance-prompt', 'bed-select', 'call-hospital', 'payment-confirm', 'emergency-done'];
		fabIds.forEach(id => unregisterFAB(id));

		if (requestData?.success) {
			registerFAB('emergency-done', {
				icon: 'checkmark-done',
				label: 'Finish',
				subText: 'Return to dashboard',
				visible: true,
				onPress: handleRequestDone,
				style: 'success',
				haptic: 'medium',
				priority: 10,
				animation: 'subtle',
				allowInStack: true,
				isFixed: true,
			});
			return () => unregisterFAB('emergency-done');
		}

		if (requestStep === "select") {
			if (mode === "booking") {
				registerFAB('bed-select', {
					icon: 'chevron-forward',
					label: 'Select Payment',
					subText: 'Standard bed selected',
					visible: true,
					onPress: handleSubmitRequest,
					style: 'emergency',
					haptic: 'heavy',
					priority: 10,
					animation: 'prominent',
					allowInStack: true,
					isFixed: true,
				});
			} else if (!hasAmbulances) {
				registerFAB('call-hospital', {
					icon: 'call',
					label: 'Direct Line',
					subText: 'Ambulance depot is empty',
					visible: true,
					onPress: handleCallHospital,
					style: 'warning',
					haptic: 'medium',
					priority: 10,
					animation: 'prominent',
					allowInStack: true,
					isFixed: true,
				});
			} else if (selectedAmbulanceType) {
				registerFAB('ambulance-select', {
					icon: 'chevron-forward',
					label: 'Next Step',
					subText: `Total: $${estimatedCost?.totalCost?.toFixed(0) || '--'}`,
					visible: true,
					onPress: handleSubmitRequest,
					style: 'emergency',
					haptic: 'heavy',
					priority: 10,
					animation: 'prominent',
					allowInStack: true,
					isFixed: true,
				});
			}
		} else if (requestStep === "payment") {
			registerFAB('payment-confirm', {
				icon: 'shield-checkmark',
				label: mode === "booking" ? 'Confirm Slot' : 'Confirm Dispatch',
				subText: `Final: $${estimatedCost?.totalCost?.toFixed(2) || '0.00'}`,
				visible: true,
				onPress: handleSubmitRequest,
				loading: isRequesting,
				style: 'success',
				haptic: 'heavy',
				priority: 10,
				animation: 'prominent',
				allowInStack: true,
				isFixed: true,
			});
		}

		return () => {
			fabIds.forEach(id => unregisterFAB(id));
		};
	}, [
		requestStep,
		mode,
		selectedAmbulanceType,
		isRequesting,
		handleSubmitRequest,
		handleRequestDone,
		hasAmbulances,
		handleCallHospital,
		estimatedCost,
		requestData,
		registerFAB,
		unregisterFAB
	]);

	useEffect(() => {
		setRequestStep("select");

		// Default to BLS (Basic Life Support) - ID: 'standard'
		const defaultAmbulance = AMBULANCE_TYPES.find(t => t.id === "standard");
		setSelectedAmbulanceType(defaultAmbulance || null);

		setBedType("standard");
		setBedCount(1);
		setIsRequesting(false);
		setRequestData(null);
		setErrorMessage(null);
	}, [requestHospital?.id, mode]);

	const hospitalName = requestHospital?.name ?? "Hospital";
	const availableBeds =
		typeof requestHospital?.availableBeds === "number"
			? requestHospital.availableBeds
			: Number.isFinite(Number(requestHospital?.availableBeds))
				? Number(requestHospital.availableBeds)
				: null;
	const waitTime = requestHospital?.waitTime ?? null;

	return (
		<View style={styles.container}>
			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={[styles.requestScrollContent, scrollContentStyle]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				{requestStep === "select" ? (
					<>
						{errorMessage ? (
							<View
								style={[
									styles.banner,
									{
										backgroundColor: isDarkMode
											? "rgba(239, 68, 68, 0.16)"
											: "rgba(239, 68, 68, 0.10)",
										borderColor: isDarkMode
											? "rgba(239, 68, 68, 0.35)"
											: "rgba(239, 68, 68, 0.25)",
									},
								]}
							>
								<Text style={{ color: requestColors.text, fontWeight: "700" }}>
									{errorMessage}
								</Text>
							</View>
						) : null}
						<Text
							style={{
								fontSize: 12,
								fontWeight: "900",
								letterSpacing: 1.6,
								color: COLORS.brandPrimary,
								marginTop: 32,
								marginBottom: 14,
								textTransform: "uppercase",
							}}
						>
							{mode === "booking"
								? "Configure Stay"
								: "Medical Transport"}
						</Text>

						{/* Step-specific content */}
						{mode === "booking" ? (
							<>
								<View style={styles.infoGrid}>
									<InfoTile
										label="Hospital"
										value={hospitalName}
										textColor={requestColors.text}
										mutedColor={requestColors.textMuted}
										cardColor={requestColors.card}
										icon="business-outline"
									/>
									<InfoTile
										label="Specialty"
										value={selectedSpecialty ?? "Any"}
										textColor={requestColors.text}
										mutedColor={requestColors.textMuted}
										cardColor={requestColors.card}
										icon="medical-outline"
									/>
									<InfoTile
										label="Available"
										value={
											Number.isFinite(availableBeds)
												? `${availableBeds} beds`
												: "--"
										}
										textColor={requestColors.text}
										mutedColor={requestColors.textMuted}
										cardColor={requestColors.card}
										icon="bed-outline"
									/>
									<InfoTile
										label="Est. wait"
										value={waitTime ?? "--"}
										textColor={requestColors.text}
										mutedColor={requestColors.textMuted}
										cardColor={requestColors.card}
										valueColor={COLORS.brandPrimary}
										icon="time-outline"
									/>
								</View>

								<BedBookingOptions
									bedType={selectedRoomId || bedType}
									bedCount={bedCount}
									onBedTypeChange={(next) => {
										setSelectedRoomId(next);
									}}
									onBedCountChange={(next) => {
										setBedCount(next);
									}}
									textColor={requestColors.text}
									mutedColor={requestColors.textMuted}
									cardColor={requestColors.card}
									rooms={dynamicRooms}
								/>
							</>
						) : !hasAmbulances ? (
							<View style={styles.fallbackContainer}>
								<View style={[styles.banner, {
									borderColor: COLORS.warning,
									backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
									alignItems: 'center',
									paddingVertical: 16
								}]}>
									<Ionicons name="alert-circle" size={32} color={COLORS.warning} style={{ marginBottom: 8 }} />
									<Text style={{
										fontSize: 16,
										fontWeight: "700",
										color: requestColors.text,
										textAlign: 'center',
										marginBottom: 4
									}}>
										No Ambulances Available
									</Text>
									<Text style={{
										fontSize: 14,
										color: requestColors.textMuted,
										textAlign: 'center',
										lineHeight: 20
									}}>
										This hospital has no ambulances stationed.{'\n'}Please call directly for assistance.
									</Text>
								</View>

								<Pressable
									style={({ pressed }) => ({
										backgroundColor: COLORS.success,
										flexDirection: 'row',
										alignItems: 'center',
										justifyContent: 'center',
										paddingVertical: 16,
										borderRadius: 12,
										marginTop: 16,
										gap: 8,
										opacity: pressed ? 0.9 : 1,
										transform: [{ scale: pressed ? 0.98 : 1 }]
									})}
									onPress={handleCallHospital}
								>
									<Ionicons name="call" size={20} color="#FFF" />
									<Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Call Hospital</Text>
								</Pressable>
							</View>
						) : (
							<View style={styles.ambulanceSelectionContainer}>
								{(dynamicServices.length > 0 ? dynamicServices : AMBULANCE_TYPES).map((type, index) => {
									const isDbService = !!type.service_name;
									const cardType = isDbService ? {
										id: type.id,
										title: type.service_name,
										subtitle: type.description || type.service_type,
										price: `$${type.base_price}`,
										icon: type.service_type === 'ambulance' ? 'medical-outline' : 'pulse-outline',
										eta: requestHospital.eta || '8-12 min',
										crew: type.service_type === 'ambulance' ? '2 Paramedics' : '1 Specialist'
									} : {
										...type,
										eta: type.eta || requestHospital.eta || '10 min',
										crew: type.crew || '2 Crew'
									};

									return (
										<AmbulanceTypeCard
											key={type.id}
											type={cardType}
											selected={selectedAmbulanceType?.id === type.id}
											onPress={() => setSelectedAmbulanceType(cardType)}
											textColor={requestColors.text}
											mutedColor={requestColors.textMuted}
											cardColor={requestColors.card}
											style={styles.ambulanceCard}
										/>
									);
								})}
							</View>
						)}
					</>
				) : requestStep === "payment" ? (
					<>
						<View style={styles.paymentContainer}>
							{/* NG Theme: Gradient Payment Card */}
							<View style={[styles.balanceCardWrapper, { borderColor: requestColors.border }]}>
								<BlurView intensity={isDarkMode ? 40 : 80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
								<LinearGradient
									colors={[COLORS.brandPrimary, '#4f46e5']}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
									style={[styles.balanceCard, { opacity: 0.95 }]}
								>
									<View style={styles.balanceHeader}>
										<View>
											<Text style={styles.walletLabel}>TOTAL TO PAY</Text>
											<Text style={styles.balanceValue}>
												${estimatedCost?.totalCost?.toFixed(2) || "0.00"}
											</Text>
										</View>
										<View style={styles.currencyBadge}>
											<Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
											<Text style={styles.currencyText}>SECURE</Text>
										</View>
									</View>

									<View style={styles.serviceAssurance}>
										<Text style={[styles.serviceText, { color: 'rgba(255,255,255,0.8)' }]}>
											PCI-DSS Encrypted Transaction
										</Text>
									</View>
								</LinearGradient>
							</View>

							{isCalculatingCost ? (
								<View style={[styles.costBanner, { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
									<ActivityIndicator size="small" color={COLORS.brandPrimary} />
									<Text style={{ textAlign: 'center', fontSize: 10, marginTop: 8, color: requestColors.textMuted, fontWeight: '700' }}>LOCKING IN RATES...</Text>
								</View>
							) : estimatedCost ? (
								<View style={[styles.section, { backgroundColor: requestColors.card, borderColor: requestColors.border }]}>
									<Text style={[styles.sectionTitle, { color: requestColors.text }]}>Payment Summary</Text>
									{estimatedCost.breakdown?.map((item, idx) => (
										<View key={idx} style={styles.row}>
											<View style={styles.itemInfo}>
												<Text style={[styles.rowLabel, { color: requestColors.text }]}>{item.name}</Text>
												{item.type === 'fee' && (
													<Text style={styles.subLabel}>Processing & Platform Fee</Text>
												)}
											</View>
											<Text style={[styles.rowValue, { color: requestColors.text }]}>
												${item.cost.toFixed(2)}
											</Text>
										</View>
									))}
									<View style={[styles.divider, { backgroundColor: requestColors.border }]} />
									<View style={styles.totalRow}>
										<Text style={[styles.totalLabel, { color: requestColors.text }]}>Total to Pay</Text>
										<Text style={[styles.totalValue, { color: COLORS.brandPrimary }]}>${estimatedCost.totalCost.toFixed(2)}</Text>
									</View>
								</View>
							) : null}

							<View style={styles.paymentSelectorContainer}>
								<Text style={[styles.sectionTitle, { color: requestColors.text, marginLeft: 8, marginBottom: 12 }]}>
									Payment Method
								</Text>
								<PaymentMethodSelector
									selectedMethod={selectedPaymentMethod}
									onMethodSelect={setSelectedPaymentMethod}
									cost={estimatedCost}
									hospitalId={requestHospital?.id}
									organizationId={estimatedCost?.orgFee?.organizationId}
								/>
							</View>
						</View>
					</>
				) : requestStep === "waiting_approval" ? (
					<View style={styles.waitingContainer}>
						{/* Premium Glassmorphic Header */}
						<View style={styles.waitingHeader}>
							<View style={styles.pulseContainer}>
								<View style={[styles.pulseCircle, { backgroundColor: isDarkMode ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.1)' }]} />
								<BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.pulseBlur}>
									<ActivityIndicator size="small" color="#FF9500" />
								</BlurView>
							</View>

							<Text style={[styles.waitingTitle, { color: requestColors.text }]}>
								Verification in Progress
							</Text>
							<Text style={[styles.waitingSubtitle, { color: requestColors.textMuted }]}>
								{pendingApproval?.hospitalName || 'Medical Center'} is authenticating your cash transaction.
							</Text>
						</View>

						{/* Identity & Transaction Card (Alexander UI: Depth over Color) */}
						<View style={[styles.transactionCard, {
							backgroundColor: requestColors.card,
							borderColor: requestColors.border,
						}]}>
							<BlurView intensity={isDarkMode ? 10 : 30} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

							<View style={styles.transactionSection}>
								<Text style={styles.transactionLabel}>REFERENCE ID</Text>
								<Text style={[styles.transactionValue, { color: requestColors.text }]}>
									{pendingApproval?.displayId || '—'}
								</Text>
							</View>

							<View style={styles.transactionDivider} />

							<View style={styles.transactionGrid}>
								<View style={styles.transactionBrief}>
									<Text style={styles.transactionLabel}>FACILITY</Text>
									<Text style={[styles.transactionBriefValue, { color: requestColors.text }]}>
										{pendingApproval?.hospitalName || '—'}
									</Text>
								</View>
								<View style={styles.transactionBrief}>
									<Text style={styles.transactionLabel}>SERVICE</Text>
									<Text style={[styles.transactionBriefValue, { color: requestColors.text }]}>
										{pendingApproval?.serviceType === 'ambulance' ? 'Ambulance' : 'Clinical Bed'}
									</Text>
								</View>
							</View>

							<View style={styles.transactionDivider} />

							<View style={styles.statusPillLarge}>
								<View style={styles.statusIndicator}>
									<View style={styles.statusDot} />
									<Text style={styles.statusText}>PENDING CONFIRMATION</Text>
								</View>
								<Text style={styles.statusMethod}>PHYSICAL CASH</Text>
							</View>
						</View>

						{/* Calm Secondary Info */}
						<View style={styles.waitingFooter}>
							<Ionicons name="finger-print-outline" size={16} color={requestColors.textMuted} />
							<Text style={[styles.footerText, { color: requestColors.textMuted }]}>
								Your session is secured. The system will update automatically upon hospital verification.
							</Text>
						</View>
					</View>
				) : (
					<>
						<EmergencyRequestModalDispatched
							requestData={requestData}
							textColor={requestColors.text}
							mutedColor={requestColors.textMuted}
							cardColor={requestColors.card}
						/>
					</>
				)}
			</ScrollView >
		</View >
	);
});

const styles = StyleSheet.create({
	container: {
		flex: 1,
		position: 'relative',
	},
	closeButton: {
		position: "absolute",
		top: 10, // Adjusted from 20 to account for parent padding if any
		right: 12, // Adjusted from 24
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1000,
	},
	requestScrollContent: {
		paddingHorizontal: 8,
		paddingTop: 12,
		paddingBottom: 120,
	},
	infoGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: 12,
		gap: 8,
	},
	ambulanceSelectionContainer: {
		width: "100%",
		gap: 12,
		marginTop: 8,
	},
	ambulanceCard: {
		marginBottom: 8,
	},
	banner: {
		width: "100%",
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 14,
		borderWidth: 1,
		marginTop: 12,
		marginBottom: 6,
	},
	fallbackContainer: {
		width: '100%',
		paddingVertical: 20,
		paddingHorizontal: 4,
	},
	paymentContainer: {
		paddingTop: 16,
	},
	balanceCardWrapper: {
		borderRadius: 32,
		overflow: 'hidden',
		borderWidth: 0, // Borderless preference
		height: 160,
		shadowColor: COLORS.brandPrimary,
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 8,
		marginBottom: 24,
	},
	balanceCard: {
		padding: 24,
		height: '100%',
		justifyContent: 'space-between',
	},
	balanceHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	walletLabel: {
		color: 'rgba(255,255,255,0.7)',
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 2,
	},
	balanceValue: {
		color: '#FFFFFF',
		fontSize: 42,
		fontWeight: '900',
		letterSpacing: -1,
		marginTop: 4,
	},
	currencyBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: 'rgba(255,255,255,0.15)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	currencyText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '900',
		letterSpacing: 1,
	},
	serviceAssurance: {
		flexDirection: 'row',
		alignItems: 'center',
		opacity: 0.9,
	},
	serviceText: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	section: {
		borderRadius: 28,
		padding: 24,
		gap: 12,
		borderWidth: 1,
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: '800',
		letterSpacing: -0.5,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	rowLabel: {
		fontSize: 15,
		fontWeight: '500',
	},
	rowValue: {
		fontSize: 15,
		fontWeight: '700',
	},
	itemInfo: {
		flex: 1,
	},
	subLabel: {
		fontSize: 10,
		color: COLORS.brandPrimary,
		fontWeight: '700',
		textTransform: 'uppercase',
		marginTop: 2,
		letterSpacing: 0.5,
	},
	divider: {
		height: 1,
		width: '100%',
		marginVertical: 4,
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	totalLabel: {
		fontSize: 18,
		fontWeight: '900',
	},
	totalValue: {
		fontSize: 22,
		fontWeight: '900',
	},
	paymentSelectorContainer: {
		marginTop: 8,
	},
	costBanner: {
		borderRadius: 24,
		padding: 20,
		marginBottom: 24,
	},
	costRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	costLabel: {
		fontSize: 14,
		fontWeight: '600',
	},
	costValue: {
		fontSize: 20,
		fontWeight: '800',
	},
	costSubtext: {
		fontSize: 10,
		marginTop: 8,
		fontWeight: '500',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 16,
	},
	divider: {
		height: 1,
		width: '100%',
		marginVertical: 12,
	},
	stepIndicatorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 16,
		marginBottom: 0,
	},
	stepWrapper: {
		alignItems: 'center',
		gap: 4,
	},
	stepDot: {
		width: 20,
		height: 20,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepText: {
		fontSize: 10,
		fontWeight: '800',
	},
	stepLabel: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	stepLine: {
		height: 2,
		width: 30,
		marginHorizontal: 8,
		borderRadius: 1,
		marginTop: -16, // Adjusted for the interactive indicator
	},
	interactiveIndicator: {
		position: 'absolute',
		bottom: -6,
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: COLORS.success,
	},
	paymentSummaryCard: {
		borderRadius: 20,
		padding: 20,
		borderWidth: 1,
		gap: 12,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 13,
		fontWeight: '600',
	},
	summaryValue: {
		fontSize: 14,
		fontWeight: '700',
	},
	// Waiting Step Styles (Alexander UI)
	waitingContainer: {
		padding: 24,
		gap: 32,
		alignItems: 'center',
	},
	waitingHeader: {
		alignItems: 'center',
		gap: 12,
	},
	pulseContainer: {
		width: 64,
		height: 64,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	pulseCircle: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		borderRadius: 32,
	},
	pulseBlur: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'rgba(255, 149, 0, 0.3)',
	},
	waitingTitle: {
		fontSize: 24,
		fontWeight: '900',
		letterSpacing: -1,
		textAlign: 'center',
	},
	waitingSubtitle: {
		fontSize: 14,
		lineHeight: 22,
		textAlign: 'center',
		paddingHorizontal: 20,
		fontWeight: '500',
	},
	transactionCard: {
		width: '100%',
		borderRadius: 32,
		padding: 32,
		borderWidth: 1,
		overflow: 'hidden',
		gap: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 20 },
		shadowOpacity: 0.1,
		shadowRadius: 30,
		elevation: 10,
	},
	transactionSection: {
		gap: 4,
	},
	transactionLabel: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1.5,
		color: 'rgba(255, 149, 0, 0.8)',
		textTransform: 'uppercase',
	},
	transactionValue: {
		fontSize: 20,
		fontWeight: '900',
		letterSpacing: 1,
	},
	transactionDivider: {
		height: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		width: '100%',
	},
	transactionGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	transactionBrief: {
		gap: 2,
	},
	transactionBriefValue: {
		fontSize: 15,
		fontWeight: '700',
	},
	statusPillLarge: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 149, 0, 0.1)',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 16,
	},
	statusIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#FF9500',
	},
	statusText: {
		fontSize: 10,
		fontWeight: '800',
		color: '#FF9500',
		letterSpacing: 0.5,
	},
	statusMethod: {
		fontSize: 10,
		fontWeight: '600',
		color: 'rgba(255, 149, 0, 0.6)',
	},
	waitingFooter: {
		flexDirection: 'row',
		gap: 12,
		paddingHorizontal: 24,
		alignItems: 'flex-start',
		opacity: 0.8,
	},
	footerText: {
		fontSize: 12,
		lineHeight: 18,
		fontWeight: '500',
	},
});

export default EmergencyRequestModal;
