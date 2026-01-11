import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Modal, Pressable, Animated, ScrollView, StyleSheet, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { COLORS } from "../../constants/colors";
import { AMBULANCE_TYPES } from "../../constants/emergency";
import IconButton from "../ui/IconButton";
import EmergencyRequestModalHeader from "./requestModal/EmergencyRequestModalHeader";
import AmbulanceTypeCard from "./requestModal/AmbulanceTypeCard";
import EmergencyRequestModalFooter from "./requestModal/EmergencyRequestModalFooter";
import EmergencyRequestModalDispatched from "./requestModal/EmergencyRequestModalDispatched";
import InfoTile from "./requestModal/InfoTile";
import BedBookingOptions from "./requestModal/BedBookingOptions";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function EmergencyRequestModal({
	visible,
	onClose,
	selectedHospital,
	mode = "emergency",
	selectedSpecialty = null,
	onRequestComplete,
}) {
	const { isDarkMode } = useTheme();
	const { preferences } = usePreferences();
	const [step, setStep] = useState("select");
	const [selectedAmbulanceType, setSelectedAmbulanceType] = useState(null);
	const [isRequesting, setIsRequesting] = useState(false);
	const [requestData, setRequestData] = useState(null);
	const [bedType, setBedType] = useState("standard");
	const [bedCount, setBedCount] = useState(1);

	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	const colors = useMemo(
		() => ({
			background: isDarkMode ? "#0D121D" : "#FAFAFA",
			card: isDarkMode ? "#121826" : "#FFFFFF",
			text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
			textMuted: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.55)",
			handle: isDarkMode ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
		}),
		[isDarkMode]
	);

	const hospitalName = selectedHospital?.name ?? "Hospital";
	const hospitalEta = selectedHospital?.eta ?? null;
	const availableBeds =
		typeof selectedHospital?.availableBeds === "number"
			? selectedHospital.availableBeds
			: Number.isFinite(Number(selectedHospital?.availableBeds))
				? Number(selectedHospital.availableBeds)
				: null;
	const waitTime = selectedHospital?.waitTime ?? null;

	useEffect(() => {
		if (visible) {
			setStep("select");
			setSelectedAmbulanceType(null);
			setBedType("standard");
			setBedCount(1);
			setIsRequesting(false);
			setRequestData(null);
		}
	}, [visible]);

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 320,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 320,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: SCREEN_HEIGHT,
					duration: 260,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 260,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [fadeAnim, slideAnim, visible]);

	const handleClose = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onClose?.();
	}, [onClose]);

	const handleRequestEmergency = useCallback(() => {
		if (isRequesting) return;
		if (mode === "emergency" && !selectedAmbulanceType) return;

		setIsRequesting(true);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

		setTimeout(() => {
			const ambulanceEta =
				(typeof hospitalEta === "string" && hospitalEta.length > 0 ? hospitalEta : null) ?? "8 mins";
			const response =
				mode === "booking"
					? {
							success: true,
							requestId: `BED-${Math.floor(Math.random() * 900000) + 100000}`,
							estimatedArrival: waitTime ?? "15 mins",
							hospitalName,
							serviceType: "bed",
							specialty: selectedSpecialty ?? "Any",
							bedCount,
							bedType,
							bedNumber: `B-${Math.floor(Math.random() * 90) + 10}`,
					  }
					: {
							success: true,
							requestId: `AMB-${Math.floor(Math.random() * 900000) + 100000}`,
							hospitalName,
							ambulanceType: selectedAmbulanceType,
							serviceType: "ambulance",
							estimatedArrival: ambulanceEta,
					  };

			setRequestData(response);
			setStep("dispatched");
			setIsRequesting(false);
			onRequestComplete?.(response);
		}, 1800);
	}, [
		bedCount,
		bedType,
		hospitalEta,
		hospitalName,
		isRequesting,
		mode,
		onRequestComplete,
		selectedAmbulanceType,
		selectedSpecialty,
		waitTime,
	]);

	const renderSelectStep = () => (
		<View style={{ flex: 1 }}>
			<ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
				<EmergencyRequestModalHeader
					title={mode === "booking" ? "Reserve Bed" : "Request Service"}
					subtitle={hospitalName}
					textColor={colors.text}
					subTextColor={colors.textMuted}
				/>

				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>
						{mode === "booking" ? "Reservation Details" : "Select Ambulance Type"}
					</Text>

					{mode === "booking" ? (
						<>
							<View style={styles.bookingGrid}>
								<InfoTile
									label="Hospital"
									value={hospitalName}
									textColor={colors.text}
									mutedColor={colors.textMuted}
									cardColor={colors.card}
								/>
								<InfoTile
									label="Specialty"
									value={selectedSpecialty ?? "Any"}
									textColor={colors.text}
									mutedColor={colors.textMuted}
									cardColor={colors.card}
								/>
								<InfoTile
									label="Available"
									value={Number.isFinite(availableBeds) ? `${availableBeds} beds` : "--"}
									textColor={colors.text}
									mutedColor={colors.textMuted}
									cardColor={colors.card}
								/>
								<InfoTile
									label="Est. Wait"
									value={waitTime ?? "--"}
									textColor={colors.text}
									mutedColor={colors.textMuted}
									cardColor={colors.card}
									valueColor={COLORS.brandPrimary}
								/>
							</View>

							<BedBookingOptions
								bedType={bedType}
								onBedTypeChange={(next) => {
									setBedType(next);
									Haptics.selectionAsync();
								}}
								bedCount={bedCount}
								onBedCountChange={(next) => {
									setBedCount(next);
									Haptics.selectionAsync();
								}}
								textColor={colors.text}
								mutedColor={colors.textMuted}
								cardColor={colors.card}
							/>
						</>
					) : (
						AMBULANCE_TYPES.map((type) => (
							<AmbulanceTypeCard
								key={type.id}
								type={type}
								selected={selectedAmbulanceType === type.id}
								onPress={() => {
									setSelectedAmbulanceType(type.id);
									Haptics.selectionAsync();
								}}
								textColor={colors.text}
								mutedColor={colors.textMuted}
								cardColor={colors.card}
							/>
						))
					)}
				</View>

				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>
						Info Shared
					</Text>
					<View style={styles.bookingGrid}>
						<InfoTile
							label="Medical profile"
							value={preferences?.privacyShareMedicalProfile ? "On" : "Off"}
							textColor={colors.text}
							mutedColor={colors.textMuted}
							cardColor={colors.card}
							valueColor={preferences?.privacyShareMedicalProfile ? COLORS.brandPrimary : colors.textMuted}
						/>
						<InfoTile
							label="Emergency contacts"
							value={preferences?.privacyShareEmergencyContacts ? "On" : "Off"}
							textColor={colors.text}
							mutedColor={colors.textMuted}
							cardColor={colors.card}
							valueColor={preferences?.privacyShareEmergencyContacts ? COLORS.brandPrimary : colors.textMuted}
						/>
					</View>
				</View>
			</ScrollView>

			<EmergencyRequestModalFooter
				visible={mode === "booking" ? true : !!selectedAmbulanceType}
				disabled={mode === "booking" ? false : !selectedAmbulanceType}
				isLoading={isRequesting}
				onPress={handleRequestEmergency}
				backgroundColor={colors.background}
				textColor={colors.textMuted}
				label={mode === "booking" ? "Reserve bed" : "Request ambulance"}
				iconName={mode === "booking" ? "bed-outline" : "medical"}
				showHint={mode !== "booking"}
			/>
		</View>
	);

	const renderDispatchedStep = () => (
		<View style={{ flex: 1 }}>
			<EmergencyRequestModalDispatched
				requestData={requestData}
				textColor={colors.text}
				mutedColor={colors.textMuted}
				cardColor={colors.card}
			/>
			<EmergencyRequestModalFooter
				visible={true}
				disabled={false}
				isLoading={false}
				onPress={handleClose}
				backgroundColor={colors.background}
				textColor={colors.textMuted}
				label="Done"
				iconName="checkmark-circle"
				showHint={false}
			/>
		</View>
	);

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
			<Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
				<Pressable style={styles.backdrop} onPress={handleClose} />
				<Animated.View
					style={[
						styles.modal,
						{
							backgroundColor: colors.background,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<View style={[styles.handle, { backgroundColor: colors.handle }]} />
					<IconButton icon="close" onPress={handleClose} style={styles.closeButton} variant="ghost" />

					{step === "select" && renderSelectStep()}
					{step === "dispatched" && renderDispatchedStep()}
				</Animated.View>
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
	},
	backdrop: {
		flex: 1,
	},
	modal: {
		height: SCREEN_HEIGHT * 0.82,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		overflow: "hidden",
	},
	handle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		alignSelf: "center",
		marginTop: 12,
		marginBottom: 2,
	},
	closeButton: {
		position: "absolute",
		top: 10,
		right: 12,
		zIndex: 10,
	},
	section: {
		paddingHorizontal: 20,
		paddingBottom: 16,
	},
	bookingGrid: {
		width: "100%",
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "900",
		letterSpacing: 1.8,
		textTransform: "uppercase",
		marginBottom: 14,
	},
});
