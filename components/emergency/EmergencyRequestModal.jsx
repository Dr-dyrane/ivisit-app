import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from "react-native";
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
import { hospitalsService } from "../../services/hospitalsService";

/**
 * 💡 STABILITY NOTE:
 * This component is wrapped in React.memo and uses `useFABActions()` instead of `useFAB()`.
 * 
 * WHY: This component is at the epicenter of the FAB registration cycle. Using useFABActions 
 * ensures it doesn't re-render when the FAB state changes, breaking the infinite update cycle.
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

	const [requestStep, setRequestStep] = useState("select");
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

	// Calculate cost whenever selection changes
	useEffect(() => {
		const calculateCost = async () => {
			if (!requestHospital) return;

			setIsCalculatingCost(true);
			try {
				const serviceType = mode === "booking" ? "bed" : "ambulance";
				const cost = await calculateEmergencyCost({
					hospital_id: requestHospital.id,
					ambulance_id: selectedAmbulanceType?.id,
					room_id: selectedRoomId,
					service_type: serviceType
				});
				setEstimatedCost(cost);
			} catch (error) {
				console.error("Error calculating estimated cost:", error);
			} finally {
				setIsCalculatingCost(false);
			}
		};

		calculateCost();
	}, [requestHospital?.id, mode, selectedAmbulanceType?.id, selectedRoomId]);

	// Fetch dynamic data
	useEffect(() => {
		const fetchDynamicData = async () => {
			if (!requestHospital?.id) return;

			try {
				if (mode === "booking") {
					const [rooms, services] = await Promise.all([
						hospitalsService.getRooms(requestHospital.id),
						hospitalsService.getServicePricing(requestHospital.id, requestHospital.organization_id)
					]);
					setDynamicRooms(rooms);
					setDynamicServices(services.filter(s => s.service_type === 'bed_booking'));
					if (rooms.length > 0) setSelectedRoomId(rooms[0].id);
				} else {
					const services = await hospitalsService.getServicePricing(requestHospital.id, requestHospital.organization_id);
					setDynamicServices(services.filter(s => s.service_type === 'ambulance'));
					// Prioritize DB services over hardcoded constants
					if (services.length > 0) {
						const firstAmb = services.find(s => s.service_type === 'ambulance');
						if (firstAmb) {
							setSelectedAmbulanceType({
								id: firstAmb.id,
								title: firstAmb.service_name,
								subtitle: firstAmb.description,
								price: `$${firstAmb.base_price}`,
								icon: 'medical-outline'
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
				const isEligible = await paymentService.checkCashEligibility(
					requestHospital.id,
					estimatedCost?.totalCost || 0
				);

				if (!isEligible) {
					setErrorMessage("Cash payment not available for this hospital (insufficient wallet balance)");
					showToast("Hospital low on collateral", "error");
					setIsRequesting(false);
					return;
				}
			} catch (error) {
				console.error("Cash eligibility check failed:", error);
			} finally {
				setIsRequesting(false);
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


		try {
			if (typeof onRequestInitiated === "function") {
				const result = await onRequestInitiated(initiated);

				// Handle explicit failure from the hook
				if (result && result.ok === false) {
					console.error("Request initiation failed:", result);
					setErrorMessage(result.reason || "Failed to create request");
					setIsRequesting(false);
					return;
				}
			}
		} catch (error) {
			console.error("Error in onRequestInitiated callback:", error);
			setErrorMessage("Something went wrong. Please try again.");
			setIsRequesting(false);
			return;
		}

		// Success flow - slightly delayed for animation/UX
		setTimeout(() => {
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
						requestId: initiated.requestId,
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
						requestId: initiated.requestId,
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

	const requestColors = useMemo(
		() => ({
			card: isDarkMode ? "#121826" : "#FFFFFF",
			text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
			textMuted: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.55)",
		}),
		[isDarkMode]
	);

	const handleRequestDone = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onRequestClose?.();
	}, [onRequestClose]);

	// Global FAB registration for request modal
	useEffect(() => {

		// Commented out dispatched state for auto-navigation audit
		/*
		if (requestStep === "dispatched") {
			// Dispatched state FAB
			if (mode === "booking") {
				registerFAB('bed-dispatched', {
					icon: 'bed-patient',
					label: 'View Reservation',
					subText: 'View reservation details',
					visible: true,
					onPress: handleRequestDone,
					style: 'success',
					haptic: 'medium',
					priority: 10,
					animation: 'subtle',
					allowInStack: true, // Allow in stack screens
				});
			} else {
				registerFAB('ambulance-dispatched', {
					icon: 'location',
					label: 'Track Ambulance',
					subText: 'View live tracking',
					visible: true,
					onPress: handleRequestDone,
					style: 'success',
					haptic: 'medium',
					priority: 10,
					animation: 'subtle',
					allowInStack: true, // Allow in stack screens
				});
			}
		} else 
		*/

		if (requestStep === "select") {
			// Selection state FAB
			if (mode === "booking") {
				registerFAB('bed-select', {
					icon: 'chevron-forward',
					label: 'Continue to Payment',
					subText: bedType === "private" ? "Private room selected" : "Standard bed selected",
					visible: true,
					onPress: handleSubmitRequest,
					style: 'emergency',
					haptic: 'heavy',
					priority: 10,
					animation: 'prominent',
					allowInStack: true,
				});
			} else if (!hasAmbulances) {
				registerFAB('call-hospital', {
					icon: 'call',
					label: 'Call Hospital',
					subText: 'No ambulances available',
					visible: true,
					onPress: handleCallHospital,
					style: 'warning',
					haptic: 'medium',
					priority: 10,
					animation: 'prominent',
					allowInStack: true,
				});
			} else if (selectedAmbulanceType) {
				registerFAB('ambulance-select', {
					icon: 'chevron-forward',
					label: 'Continue to Payment',
					subText: 'Review cost & confirm',
					visible: true,
					onPress: handleSubmitRequest,
					style: 'emergency',
					haptic: 'heavy',
					priority: 10,
					animation: 'prominent',
					allowInStack: true,
				});
			} else {
				registerFAB('ambulance-prompt', {
					icon: 'medical',
					label: 'Select Ambulance',
					subText: 'Choose ambulance type',
					visible: true,
					onPress: () => { },
					style: 'warning',
					haptic: 'medium',
					priority: 9,
					animation: 'subtle',
					allowInStack: true,
				});
			}
		} else if (requestStep === "payment") {
			registerFAB('payment-confirm', {
				icon: 'checkmark-circle',
				label: mode === "booking" ? 'Confirm Reservation' : 'Request Ambulance',
				subText: `Total: $${estimatedCost?.totalCost?.toFixed(2) || '0.00'}`,
				visible: true,
				onPress: handleSubmitRequest,
				loading: isRequesting,
				style: 'success',
				haptic: 'heavy',
				priority: 10,
				animation: 'prominent',
				allowInStack: true,
			});
		}

		// Cleanup function
		return () => {
			unregisterFAB('ambulance-select');
			// unregisterFAB('ambulance-dispatched'); // Commented out
			unregisterFAB('ambulance-prompt');
			unregisterFAB('bed-select');
			unregisterFAB('call-hospital');
			// unregisterFAB('bed-dispatched'); // Commented out
		};
	}, [
		requestStep,
		mode,
		selectedAmbulanceType,
		bedType,
		bedCount,
		isRequesting,
		handleSubmitRequest,
		handleRequestDone,
		registerFAB,
		unregisterFAB,
		hasAmbulances,
		handleCallHospital,
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
			{showClose ? (
				<Pressable
					onPress={handleRequestDone}
					style={[
						styles.closeButton,
						{
							backgroundColor: isDarkMode
								? "rgba(255,255,255,0.1)"
								: "rgba(0,0,0,0.05)",
						},
					]}
					hitSlop={16}
				>
					<Ionicons
						name="close"
						size={24}
						color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
					/>
				</Pressable>
			) : null}

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
								color: requestColors.text,
								marginTop: 18,
								marginBottom: 14,
								textTransform: "uppercase",
							}}
						>
							{mode === "booking"
								? "Reservation details"
								: "Select ambulance type"}
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
										icon: type.service_type === 'ambulance' ? 'medical-outline' : 'pulse-outline'
									} : type;

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
							<Pressable
								onPress={() => setRequestStep("select")}
								style={styles.backButton}
							>
								<Ionicons name="arrow-back" size={20} color={requestColors.text} />
								<Text style={{ color: requestColors.text, fontWeight: "600" }}>Back to selection</Text>
							</Pressable>

							<Text
								style={{
									fontSize: 12,
									fontWeight: "900",
									letterSpacing: 1.6,
									color: requestColors.text,
									marginTop: 14,
									marginBottom: 14,
									textTransform: "uppercase",
								}}
							>
								Confirm Payment
							</Text>

							{estimatedCost && (
								<View style={[styles.costBanner, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
									<View style={styles.costRow}>
										<Text style={[styles.costLabel, { color: requestColors.textMuted }]}>
											{estimatedCost.breakdown?.[0]?.name || 'Total Service Fee'}
										</Text>
										<Text style={[styles.costValue, { color: requestColors.text }]}>
											${estimatedCost.totalCost.toFixed(2)}
										</Text>
									</View>
									<View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
									<View style={styles.costRow}>
										<Text style={{ fontWeight: "800", color: requestColors.text }}>Grand Total</Text>
										<Text style={{ fontSize: 24, fontWeight: "900", color: COLORS.brandPrimary }}>
											${estimatedCost.totalCost.toFixed(2)}
										</Text>
									</View>
									<Text style={[styles.costSubtext, { color: COLORS.success, fontWeight: "700" }]}>
										✓ Price locked via {estimatedCost.breakdown?.[0]?.source === 'entity_override' ? 'Hospital Rate' : 'Market Average'}
									</Text>
								</View>
							)}

							<PaymentMethodSelector
								selectedMethod={selectedPaymentMethod}
								onMethodSelect={setSelectedPaymentMethod}
								cost={estimatedCost ? { totalCost: estimatedCost.totalCost } : null}
								hospitalId={requestHospital?.id}
								showAddButton={true}
								style={styles.paymentSelector}
							/>
						</View>
					</>
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
		width: '100%',
		marginTop: 10,
	},
	paymentSelector: {
		minHeight: 200,
	},
	costBanner: {
		padding: 16,
		borderRadius: 16,
		marginBottom: 16,
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
	}
});

export default EmergencyRequestModal;
