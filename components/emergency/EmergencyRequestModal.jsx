import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useFAB } from "../../contexts/FABContext";
import { COLORS } from "../../constants/colors";
import { AMBULANCE_TYPES } from "../../constants/emergency";

import AmbulanceTypeCard from "./requestModal/AmbulanceTypeCard";
import EmergencyRequestModalDispatched from "./requestModal/EmergencyRequestModalDispatched";
import InfoTile from "./requestModal/InfoTile";
import BedBookingOptions from "./requestModal/BedBookingOptions";

const EmergencyRequestModal = ({
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
	const { registerFAB, unregisterFAB } = useFAB();

	const [requestStep, setRequestStep] = useState("select");
	const [selectedAmbulanceType, setSelectedAmbulanceType] = useState(null);
	const [bedType, setBedType] = useState("standard");
	const [bedCount, setBedCount] = useState(1);
	const [isRequesting, setIsRequesting] = useState(false);
	const [requestData, setRequestData] = useState(null);
	const [errorMessage, setErrorMessage] = useState(null);

	const requestColors = useMemo(
		() => ({
			card: isDarkMode ? "#121826" : "#FFFFFF",
			text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
			textMuted: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.55)",
		}),
		[isDarkMode]
	);

	// Global FAB registration for request modal
	useEffect(() => {
		if (__DEV__) {
			console.log('[EmergencyRequestModal] FAB registration effect:', {
				requestStep,
				mode,
				selectedAmbulanceType,
				bedType,
				bedCount,
				isRequesting,
			});
		}

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
					icon: 'checkmark', // Checkmark for confirmation
					label: bedCount > 1 ? `Reserve ${bedCount} Beds` : 'Reserve Bed',
					subText: bedType === "private" ? "Private room selected" : "Standard bed selected",
					visible: true,
					onPress: handleSubmitRequest,
					loading: isRequesting,
					style: 'emergency',
					haptic: 'heavy',
					priority: 10,
					animation: 'prominent',
					allowInStack: true, // Allow in stack screens
				});
			} else if (selectedAmbulanceType) {
				registerFAB('ambulance-select', {
					icon: 'checkmark', // Checkmark for unified UI
					label: 'Request Ambulance',
					subText: 'Tap to confirm',
					visible: true,
					onPress: handleSubmitRequest,
					loading: isRequesting,
					style: 'emergency',
					haptic: 'heavy',
					priority: 10,
					animation: 'prominent',
					allowInStack: true, // Allow in stack screens
				});
			} else {
				// No ambulance type selected
				registerFAB('ambulance-prompt', {
					icon: 'checkmark', // Checkmark for unified UI
					label: 'Select Ambulance',
					subText: 'Choose ambulance type',
					visible: true,
					onPress: () => {}, // No action, just prompt
					style: 'warning',
					haptic: 'medium',
					priority: 9,
					animation: 'subtle',
					allowInStack: true, // Allow in stack screens
				});
			}
		}

		// Cleanup function
		return () => {
			if (__DEV__) {
				console.log('[EmergencyRequestModal] Cleaning up FABs');
			}
			unregisterFAB('ambulance-select');
			// unregisterFAB('ambulance-dispatched'); // Commented out
			unregisterFAB('ambulance-prompt');
			unregisterFAB('bed-select');
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

	const handleRequestDone = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onRequestClose?.();
	}, [onRequestClose]);

	const handleSubmitRequest = useCallback(async () => {
		if (isRequesting) return;
		if (!requestHospital) return;
		if (mode === "emergency" && !selectedAmbulanceType) return;

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
						bedNumber: `B-${Math.floor(Math.random() * 90) + 10}`,
				  }
				: {
						requestId,
						hospitalId: requestHospital?.id ?? null,
						hospitalName,
						ambulanceType: selectedAmbulanceType,
						serviceType: "ambulance",
				  };

		if (typeof onRequestInitiated === "function") {
			try {
				const result = await onRequestInitiated(initiated);
				if (result && result.ok === false) {
					const service = result.serviceType === "bed" ? "bed booking" : "ambulance request";
					const msg =
						result.reason === "ALREADY_ACTIVE"
							? `You already have an active ${service}.`
							: result.reason === "CONCURRENCY_DB"
							? `You already have an active ${service}.`
							: "Request blocked. Please try again.";
					setIsRequesting(false);
					Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
					setErrorMessage(msg);
					return;
				}
			} catch (e) {
				setIsRequesting(false);
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
				setErrorMessage("Something went wrong. Please try again.");
				return;
			}
		}

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
					  }
					: {
							success: true,
							requestId: initiated.requestId,
							hospitalId: initiated.hospitalId,
							hospitalName: initiated.hospitalName,
							ambulanceType: initiated.ambulanceType,
							serviceType: "ambulance",
							estimatedArrival: ambulanceEta,
					  };

			setRequestData(next);
			setIsRequesting(false);
			const toastMsg =
				mode === "booking"
					? "Bed reserved successfully"
					: "Ambulance dispatched";
			try {
				showToast(toastMsg, "success");
			} catch (e) {
			}
			if (typeof onRequestComplete === "function") {
				onRequestComplete(next);
			}
		}, 900);
	}, [
		bedCount,
		bedType,
		isRequesting,
		mode,
		onRequestComplete,
		onRequestInitiated,
		requestHospital,
		selectedAmbulanceType,
		selectedSpecialty,
	]);

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
									bedType={bedType}
									bedCount={bedCount}
									onBedTypeChange={(next) => {
										setBedType(next);
									}}
									onBedCountChange={(next) => {
										setBedCount(next);
									}}
									textColor={requestColors.text}
									mutedColor={requestColors.textMuted}
									cardColor={requestColors.card}
								/>
							</>
						) : (
							<View style={styles.ambulanceSelectionContainer}>
								{AMBULANCE_TYPES.map((type, index) => (
									<AmbulanceTypeCard
										key={type.id}
										type={type}
										selected={selectedAmbulanceType?.id === type.id}
										onPress={() => setSelectedAmbulanceType(type)}
										textColor={requestColors.text}
										mutedColor={requestColors.textMuted}
										cardColor={requestColors.card}
										style={styles.ambulanceCard}
									/>
								))}
							</View>
						)}
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
			</ScrollView>
		</View>
	);
};

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
});

export default EmergencyRequestModal;
