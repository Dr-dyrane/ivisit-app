import { useRef, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	Text,
	ScrollView,
	Pressable,
	Animated,
	Platform,
	Linking,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useEmergency } from "../contexts/EmergencyContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useFAB } from "../contexts/FABContext";
import { COLORS } from "../constants/colors";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import ServiceTypeSelector from "../components/emergency/ServiceTypeSelector";
import SpecialtySelector from "../components/emergency/SpecialtySelector";
import HospitalCard from "../components/emergency/HospitalCard";
import EmergencyMap from "../components/map/EmergencyMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EmergencyScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { handleScroll } = useTabBarVisibility();
	const { registerFAB } = useFAB();

	// Use context for persisted state
	const {
		hospitals,
		selectedHospital,
		filteredHospitals,
		mode,
		serviceType,
		selectedSpecialty,
		specialties,
		viewMode,
		setViewMode,
		selectHospital,
		toggleMode,
		selectSpecialty,
		selectServiceType,
		updateHospitals,
	} = useEmergency();

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	const colors = {
		background: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
		card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
	};

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				friction: 8,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const handleEmergencyCall = (hospitalId) => {
		const hospital = hospitals.find(h => h.id === hospitalId);
		selectHospital(hospitalId);
		// TODO: Navigate to ambulance request flow or show confirmation
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		console.log("[iVisit] Emergency call requested for:", hospital?.name);
	};

	const handleServiceTypeSelect = (type) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		selectServiceType(type);
	};

	const handleHospitalSelect = (hospital) => {
		selectHospital(hospital.id);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const handleSpecialtySelect = (specialty) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		selectSpecialty(specialty);
	};

	const handleFloatingButtonPress = useCallback(() => {
		toggleMode();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, [toggleMode]);

	// Register FAB intent on focus (not just mount)
	// This fixes the "FAB never comes back" issue when switching tabs
	useFocusEffect(
		useCallback(() => {
			registerFAB({
				icon: mode === "emergency" ? "bed-patient" : "medical",
				visible: true,
				onPress: handleFloatingButtonPress,
			});

			// No cleanup needed - next screen will override
		}, [mode, handleFloatingButtonPress, registerFAB])
	);

	const handleCall911 = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		Linking.openURL("tel:911");
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			{/* Header */}
			<Animated.View
				style={{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
					paddingHorizontal: 20,
					paddingTop: insets.top,
					marginBottom: 16,
					backgroundColor: colors.background,
					zIndex: 10,
				}}
			>
				{/* Title Row */}
				<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
					<View style={{
						backgroundColor: `${COLORS.brandPrimary}15`,
						padding: 12,
						borderRadius: 16,
						marginRight: 14,
					}}>
						{mode === "emergency" ? (
							<Ionicons name="medical" size={24} color={COLORS.brandPrimary} />
						) : (
							<Fontisto name="bed-patient" size={20} color={COLORS.brandPrimary} />
						)}
					</View>
					<View style={{ flex: 1 }}>
						<Text style={{
							fontSize: 10,
							fontWeight: "900",
							color: colors.textMuted,
							letterSpacing: 3,
							textTransform: "uppercase",
							marginBottom: 2,
						}}>
							{mode === "emergency" ? "EMERGENCY" : "BOOK BED"}
						</Text>
						<Text style={{
							fontSize: 22,
							fontWeight: "700",
							color: colors.text,
							letterSpacing: -0.5,
						}}>
							{mode === "emergency" ? "Ambulance Call" : "Reserve Bed"}
						</Text>
					</View>
				</View>

				{/* View Mode Segmented Control - Full Width Apple Style */}
				<View style={{
					flexDirection: "row",
					backgroundColor: colors.card,
					borderRadius: 12,
					padding: 4,
					marginBottom: 16,
				}}>
					<Pressable
						onPress={() => {
							setViewMode("map");
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						}}
						style={{
							flex: 1,
							paddingVertical: 10,
							borderRadius: 8,
							backgroundColor: viewMode === "map" ? COLORS.brandPrimary : "transparent",
							alignItems: "center",
							justifyContent: "center",
							flexDirection: "row",
						}}
					>
						<Ionicons
							name="map-outline"
							size={16}
							color={viewMode === "map" ? "#FFFFFF" : colors.textMuted}
							style={{ marginRight: 6 }}
						/>
						<Text style={{
							fontSize: 10,
							fontWeight: "800",
							letterSpacing: 2,
							color: viewMode === "map" ? "#FFFFFF" : colors.textMuted,
							textTransform: "uppercase",
						}}>
							MAP
						</Text>
					</Pressable>
					<Pressable
						onPress={() => {
							setViewMode("list");
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						}}
						style={{
							flex: 1,
							paddingVertical: 10,
							borderRadius: 8,
							backgroundColor: viewMode === "list" ? COLORS.brandPrimary : "transparent",
							alignItems: "center",
							justifyContent: "center",
							flexDirection: "row",
						}}
					>
						<Ionicons
							name="list-outline"
							size={16}
							color={viewMode === "list" ? "#FFFFFF" : colors.textMuted}
							style={{ marginRight: 6 }}
						/>
						<Text style={{
							fontSize: 10,
							fontWeight: "800",
							letterSpacing: 2,
							color: viewMode === "list" ? "#FFFFFF" : colors.textMuted,
							textTransform: "uppercase",
						}}>
							LIST
						</Text>
					</Pressable>
				</View>

				{/* Service Type Selector (Emergency) or Specialty Selector (Booking) */}
				{mode === "emergency" ? (
					<ServiceTypeSelector
						selectedType={serviceType}
						onSelect={handleServiceTypeSelect}
					/>
				) : (
					<SpecialtySelector
						specialties={specialties}
						selectedSpecialty={selectedSpecialty}
						onSelect={handleSpecialtySelect}
					/>
				)}
			</Animated.View>

			{/* Main Content Area */}
			{viewMode === "map" ? (
				<View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16, marginBottom: tabBarHeight - 12 }}>
					<EmergencyMap
						hospitals={hospitals.length > 0 ? filteredHospitals : undefined}
						onHospitalSelect={handleHospitalSelect}
						onHospitalsGenerated={updateHospitals}
						selectedHospitalId={selectedHospital?.id}
						style={{ flex: 1 }}
						mode={mode}
					/>
				</View>
			) : (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: 20 }}
					bounces={true}
					scrollEventThrottle={16}
					onScroll={handleScroll}
				>
					{/* Emergency Call Button - Only in emergency mode */}
					{mode === "emergency" && (
						<Pressable
							onPress={handleCall911}
							style={{
								backgroundColor: COLORS.brandPrimary,
								borderRadius: 16,
								paddingVertical: 18,
								paddingHorizontal: 24,
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 20,
								shadowColor: COLORS.brandPrimary,
								shadowOffset: { width: 0, height: 4 },
								shadowOpacity: 0.3,
								shadowRadius: 8,
								elevation: 8,
							}}
						>
							<Ionicons name="call" size={22} color="#FFFFFF" style={{ marginRight: 12 }} />
							<Text style={{
								color: "#FFFFFF",
								fontSize: 10,
								fontWeight: "900",
								letterSpacing: 3,
								textTransform: "uppercase",
							}}>
								CALL 911 EMERGENCY
							</Text>
						</Pressable>
					)}

					{/* Available Services Header */}
					<View
						style={{
							flexDirection: "row",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: 16,
						}}
					>
						<Text style={{
							fontSize: 10,
							fontWeight: "900",
							color: colors.textMuted,
							letterSpacing: 3,
							textTransform: "uppercase",
						}}>
							{mode === "emergency" ? "NEARBY SERVICES" : "AVAILABLE BEDS"}
						</Text>
						<Text style={{
							fontSize: 12,
							color: colors.textMuted,
							fontWeight: "600",
						}}>
							{filteredHospitals.length} nearby
						</Text>
					</View>

					{/* Hospital Cards */}
					{filteredHospitals.map((hospital) => (
						<HospitalCard
							key={hospital.id}
							hospital={hospital}
							isSelected={selectedHospital?.id === hospital.id}
							onSelect={handleHospitalSelect}
							onCall={handleEmergencyCall}
							mode={mode}
						/>
					))}
				</ScrollView>
			)}
		</View>
	);
}
