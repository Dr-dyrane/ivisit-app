import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { AMBULANCE_TYPES } from "../../constants/emergency";

import AmbulanceTypeCard from "./requestModal/AmbulanceTypeCard";
import EmergencyRequestModalDispatched from "./requestModal/EmergencyRequestModalDispatched";
import InfoTile from "./requestModal/InfoTile";
import BedBookingOptions from "./requestModal/BedBookingOptions";
import RequestAmbulanceFAB from "./RequestAmbulanceFAB";
import RequestBedFAB from "./requestModal/RequestBedFAB";

const EmergencyRequestModal = ({
	mode = "emergency",
	requestHospital,
	selectedSpecialty,
	onRequestClose,
	onRequestInitiated,
	onRequestComplete,
}) => {
	const { isDarkMode } = useTheme();

	const [requestStep, setRequestStep] = useState("select");
	const [selectedAmbulanceType, setSelectedAmbulanceType] = useState(null);
	const [bedType, setBedType] = useState("standard");
	const [bedCount, setBedCount] = useState(1);
	const [isRequesting, setIsRequesting] = useState(false);
	const [requestData, setRequestData] = useState(null);

	const requestColors = useMemo(
		() => ({
			card: isDarkMode ? "#121826" : "#FFFFFF",
			text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
			textMuted: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.55)",
		}),
		[isDarkMode]
	);

	useEffect(() => {
		setRequestStep("select");
		
		// Default to BLS (Basic Life Support) - ID: 'standard'
		const defaultAmbulance = AMBULANCE_TYPES.find(t => t.id === "standard");
		setSelectedAmbulanceType(defaultAmbulance || null);
		
		setBedType("standard");
		setBedCount(1);
		setIsRequesting(false);
		setRequestData(null);
	}, [requestHospital?.id, mode]);

	const handleRequestDone = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onRequestClose?.();
	}, [onRequestClose]);

	const handleSubmitRequest = useCallback(() => {
		if (isRequesting) return;
		if (!requestHospital) return;
		if (mode === "emergency" && !selectedAmbulanceType) return;

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
				const maybePromise = onRequestInitiated(initiated);
				if (maybePromise && typeof maybePromise.then === "function") {
					maybePromise.catch(() => {});
				}
			} catch (e) {}
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
			setRequestStep("dispatched");
			setIsRequesting(false);
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
			{/* Close button in top right - Fixed position relative to container */}
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

			<BottomSheetScrollView
				style={{ flex: 1 }}
				contentContainerStyle={styles.requestScrollContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{requestStep === "select" ? (
					<>
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

								{/* Bed booking FAB */}
								<RequestBedFAB
									onPress={handleSubmitRequest}
									isLoading={isRequesting}
									isActive={true}
									bedType={bedType}
									bedCount={bedCount}
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

						{/* Add FAB for ambulance request - only show when ambulance type is selected - v2 */}
						{mode === "emergency" && selectedAmbulanceType && (
							<RequestAmbulanceFAB
								onPress={handleSubmitRequest}
								isLoading={isRequesting}
								isActive={!!selectedAmbulanceType}
								selectedAmbulanceType={selectedAmbulanceType}
							/>
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

						{/* Reusable FAB for tracking state */}
						{mode === "booking" ? (
							<RequestBedFAB
								onPress={handleRequestDone}
								isLoading={false}
								isActive={true}
								bedType={requestData?.bedType || "standard"}
								bedCount={requestData?.bedCount || 1}
								mode="dispatched"
								requestData={requestData}
							/>
						) : (
							<RequestAmbulanceFAB
								onPress={handleRequestDone}
								isLoading={false}
								isActive={true}
								selectedAmbulanceType={null}
								mode="dispatched"
								requestData={requestData}
							/>
						)}
					</>
				)}
			</BottomSheetScrollView>
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
});

export default EmergencyRequestModal;
