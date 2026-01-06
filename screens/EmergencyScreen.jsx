import { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	Pressable,
	Animated,
	Dimensions,
	Platform,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import EmergencyHeader from "../components/emergency/EmergencyHeader";
import ServiceTypeSelector from "../components/emergency/ServiceTypeSelector";
import HospitalCard from "../components/emergency/HospitalCard";
import EmergencyMap from "../components/map/EmergencyMap";
import FloatingEmergencyButton from "../components/ui/FloatingEmergencyButton";
import EmergencyRequestModal from "../components/emergency/EmergencyRequestModal";
import { HOSPITALS } from "../data/hospitals";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

export default function EmergencyScreen() {
	const { isDarkMode } = useTheme();
	const [selectedHospital, setSelectedHospital] = useState(null);
	const [serviceType, setServiceType] = useState("premium");
	const [viewMode, setViewMode] = useState("map"); // "map" or "list"
	const [showEmergencyModal, setShowEmergencyModal] = useState(false);
	const insets = useSafeAreaInsets();

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
		const hospital = HOSPITALS.find(h => h.id === hospitalId);
		setSelectedHospital(hospital);
		setShowEmergencyModal(true);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
	};

	const handleServiceTypeSelect = (type) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setServiceType(type);
	};

	const handleHospitalSelect = (hospital) => {
		setSelectedHospital(hospital.id);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const handleFloatingEmergencyPress = () => {
		// Find the nearest available hospital
		const nearestHospital = HOSPITALS.find(h => h.status === "available") || HOSPITALS[0];
		setSelectedHospital(nearestHospital);
		setShowEmergencyModal(true);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
	};

	const handleEmergencyRequestComplete = (requestData) => {
		console.log("[v0] Emergency request completed:", requestData);
		// Here you could navigate to a tracking screen or show a success message
	};

	const toggleViewMode = () => {
		setViewMode(viewMode === "map" ? "list" : "map");
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const filteredHospitals = HOSPITALS.filter(
		(hospital) => hospital.type.toLowerCase() === serviceType
	);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			{/* Header with controls */}
			<Animated.View
				style={{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
					paddingHorizontal: 20,
					paddingTop: 60,
					paddingBottom: 10,
					backgroundColor: colors.background,
					zIndex: 10,
				}}
			>
				<EmergencyHeader />

				<View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
					<ServiceTypeSelector
						selectedType={serviceType}
						onSelect={handleServiceTypeSelect}
					/>

					{/* View Toggle Button */}
					<Pressable
						onPress={toggleViewMode}
						style={{
							backgroundColor: colors.card,
							paddingHorizontal: 16,
							paddingVertical: 8,
							borderRadius: 20,
							flexDirection: "row",
							alignItems: "center",
						}}
					>
						<Ionicons
							name={viewMode === "map" ? "list" : "map"}
							size={16}
							color={colors.text}
						/>
						<Text style={{
							color: colors.text,
							fontSize: 12,
							fontWeight: "600",
							marginLeft: 6
						}}>
							{viewMode === "map" ? "List" : "Map"}
						</Text>
					</Pressable>
				</View>
			</Animated.View>

			{/* Main Content Area */}
			{viewMode === "map" ? (
				<View style={{ flex: 1 }} className='px-4'>
					<EmergencyMap
						onHospitalSelect={handleHospitalSelect}
						selectedHospitalId={selectedHospital?.id}
						style={{ flex: 1 }}
					/>
				</View>
			) : (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: 20 }}
					bounces={true}
				>
					{/* Available Services */}
					<View style={{ marginTop: 16 }}>
						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 16,
							}}
						>
							<Text
								style={{
									fontSize: 18,
									fontWeight: "700",
									color: colors.text,
									letterSpacing: -0.5,
								}}
							>
								Available Services
							</Text>
							<Text style={{ fontSize: 13, color: colors.textMuted }}>
								{filteredHospitals.length} nearby
							</Text>
						</View>

						{filteredHospitals.map((hospital) => (
							<HospitalCard
								key={hospital.id}
								hospital={hospital}
								isSelected={selectedHospital?.id === hospital.id}
								onSelect={setSelectedHospital}
								onCall={handleEmergencyCall}
							/>
						))}
					</View>
				</ScrollView>
			)}

			{/* Floating Emergency Button */}
			<FloatingEmergencyButton
				onPress={handleFloatingEmergencyPress}
				position="right"
				bottom={tabBarHeight-120}
				size="medium"
			/>

			{/* Emergency Request Modal */}
			<EmergencyRequestModal
				visible={showEmergencyModal}
				onClose={() => setShowEmergencyModal(false)}
				selectedHospital={selectedHospital}
				onRequestComplete={handleEmergencyRequestComplete}
			/>
		</View>
	);
}
