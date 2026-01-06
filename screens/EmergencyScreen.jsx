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
import { HOSPITALS } from "../data/hospitals";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

export default function EmergencyScreen() {
	const { isDarkMode } = useTheme();
	const [selectedHospital, setSelectedHospital] = useState(null);
	const [serviceType, setServiceType] = useState("premium");
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
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		setSelectedHospital(hospitalId);
		console.log(`[v0] Emergency service requested from hospital ${hospitalId}`);
	};

	const handleServiceTypeSelect = (type) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setServiceType(type);
	};

	const filteredHospitals = HOSPITALS.filter(
		(hospital) => hospital.type.toLowerCase() === serviceType
	);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: bottomPadding }}
				bounces={true}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						padding: 20,
						paddingTop: 60,
					}}
				>
					<EmergencyHeader />

					<View style={{ marginTop: 24 }}>
						<ServiceTypeSelector
							selectedType={serviceType}
							onSelect={handleServiceTypeSelect}
						/>
					</View>

					{/* Emergency Call Button */}
					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
							console.log("[v0] Emergency call triggered");
						}}
						style={{
							backgroundColor: COLORS.brandPrimary,
							paddingVertical: 18,
							paddingHorizontal: 24,
							borderRadius: 16,
							marginTop: 20,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							shadowColor: COLORS.brandPrimary,
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: 0.3,
							shadowRadius: 8,
							elevation: 8,
						}}
					>
						<Ionicons name="call" size={22} color="#FFFFFF" />
						<Text
							style={{
								color: "#FFFFFF",
								fontSize: 16,
								fontWeight: "700",
								marginLeft: 10,
								letterSpacing: 0.5,
							}}
						>
							Call Emergency (911)
						</Text>
					</Pressable>

					{/* Available Services */}
					<View style={{ marginTop: 32 }}>
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
								isSelected={selectedHospital === hospital.id}
								onSelect={setSelectedHospital}
								onCall={handleEmergencyCall}
							/>
						))}
					</View>
				</Animated.View>
			</ScrollView>
		</View>
	);
}
