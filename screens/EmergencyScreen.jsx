"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
	View,
	Text,
	ScrollView,
	Pressable,
	Animated,
	Platform,
	Linking,
	Image,
	TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useEmergency } from "../contexts/EmergencyContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { COLORS } from "../constants/colors";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import ServiceTypeSelector from "../components/emergency/ServiceTypeSelector";
import SpecialtySelector from "../components/emergency/SpecialtySelector";
import HospitalCard from "../components/emergency/HospitalCard";
import EmergencyMap from "../components/map/EmergencyMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EmergencyScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const { unreadCount } = useNotifications();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const {
		handleScroll: handleHeaderScroll,
		resetHeader,
		headerOpacity,
	} = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { registerFAB } = useFAB();
	const pingAnim = useRef(new Animated.Value(1)).current;

	const headerHeight = 70;
	const headerPaddingAnim = useRef(
		new Animated.Value(headerHeight + insets.top)
	).current;

	useEffect(() => {
		const listener = headerOpacity.addListener(({ value }) => {
			headerPaddingAnim.setValue(headerHeight * value + insets.top);
		});
		return () => {
			headerOpacity.removeListener(listener);
		};
	}, [headerOpacity, headerPaddingAnim, insets.top]);

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

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(pingAnim, {
					toValue: 2,
					duration: 800,
					useNativeDriver: true,
				}),
				Animated.timing(pingAnim, {
					toValue: 1,
					duration: 800,
					useNativeDriver: true,
				}),
			])
		).start();
	}, [pingAnim]);

	const leftComponent = useMemo(
		() => (
			<TouchableOpacity
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
					router.push("/(user)/(stacks)/profile");
				}}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			>
				<Image
					source={
						user?.imageUri
							? { uri: user.imageUri }
							: require("../assets/profile.jpg")
					}
					resizeMode="cover"
					style={{
						width: 36,
						height: 36,
						borderRadius: 18,
						borderWidth: 2,
						borderColor: COLORS.brandPrimary,
					}}
				/>
			</TouchableOpacity>
		),
		[user?.imageUri, router]
	);

	// Build right component (notifications) - memoized to prevent infinite re-renders
	const rightComponent = useMemo(
		() => (
			<TouchableOpacity
				onPress={() => router.push("/(user)/(stacks)/notifications")}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			>
				<View style={{ position: "relative" }}>
					<Ionicons
						name="notifications-outline"
						size={24}
						color={`${unreadCount > 0 ? COLORS.brandPrimary : colors.textMuted}`}
					/>
					{unreadCount > 0 && (
						<View style={{ position: "absolute", top: -2, right: -2 }}>
							<Animated.View
								style={{
									position: "absolute",
									width: 10,
									height: 10,
									borderRadius: 999,
									backgroundColor: `${COLORS.brandPrimary}50`,
									transform: [{ scale: pingAnim }],
									opacity: pingAnim.interpolate({
										inputRange: [1, 2],
										outputRange: [1, 0],
									}),
								}}
							/>
							<View
								style={{
									width: 10,
									height: 10,
									borderRadius: 999,
									backgroundColor: COLORS.brandPrimary,
									borderWidth: 2,
									borderColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
								}}
							/>
						</View>
					)}
				</View>
			</TouchableOpacity>
		),
		[isDarkMode, unreadCount, router, pingAnim]
	);

	const handleScroll = useCallback(
		(event) => {
			const scrollY = event.nativeEvent.contentOffset.y;
			if (scrollY > 100) {
				console.log("[EmergencyScreen] Scroll:", scrollY);
			}
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleTabBarScroll, handleHeaderScroll]
	);

	const backgroundColors = isDarkMode
		? ["#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: mode === "emergency" ? "Ambulance Call" : "Reserve Bed",
				subtitle: mode === "emergency" ? "EMERGENCY" : "BOOK BED",
				icon:
					mode === "emergency" ? (
						<Ionicons name="medical" size={26} color="#FFFFFF" />
					) : (
						<Fontisto name="bed-patient" size={22} color="#FFFFFF" />
					),
				backgroundColor: COLORS.brandPrimary,
				leftComponent,
				rightComponent,
			});
		}, [
			resetTabBar,
			resetHeader,
			setHeaderState,
			mode,
			leftComponent,
			rightComponent,
		])
	);

	const handleEmergencyCall = (hospitalId) => {
		const hospital = hospitals.find((h) => h.id === hospitalId);
		selectHospital(hospitalId);
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

	useFocusEffect(
		useCallback(() => {
			registerFAB({
				icon: mode === "emergency" ? "bed-patient" : "medical",
				visible: true,
				onPress: handleFloatingButtonPress,
			});
		}, [mode, handleFloatingButtonPress, registerFAB])
	);

	const handleCall911 = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		Linking.openURL("tel:911");
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = headerHeight + insets.top;

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<Animated.View
				style={{
					paddingHorizontal: 20,
					paddingTop: headerPaddingAnim,
					paddingBottom: 8,
				}}
			>
				<View
					style={{
						flexDirection: "row",
						backgroundColor: colors.card,
						borderRadius: 30,
						padding: 6,
						marginBottom: 12,
						shadowColor: "#000",
						shadowOffset: { width: 0, height: 4 },
						shadowOpacity: isDarkMode ? 0 : 0.03,
						shadowRadius: 10,
					}}
				>
					<Pressable
						onPress={() => {
							setViewMode("map");
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						}}
						style={{
							flex: 1,
							paddingVertical: 14,
							borderRadius: 24,
							backgroundColor:
								viewMode === "map" ? COLORS.brandPrimary : "transparent",
							alignItems: "center",
							justifyContent: "center",
							flexDirection: "row",
						}}
					>
						<Ionicons
							name="map-outline"
							size={18}
							color={viewMode === "map" ? "#FFFFFF" : colors.textMuted}
							style={{ marginRight: 8 }}
						/>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "800",
								color: viewMode === "map" ? "#FFFFFF" : colors.textMuted,
							}}
						>
							Map View
						</Text>
					</Pressable>
					<Pressable
						onPress={() => {
							setViewMode("list");
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						}}
						style={{
							flex: 1,
							paddingVertical: 14,
							borderRadius: 24,
							backgroundColor:
								viewMode === "list" ? COLORS.brandPrimary : "transparent",
							alignItems: "center",
							justifyContent: "center",
							flexDirection: "row",
						}}
					>
						<Ionicons
							name="list-outline"
							size={18}
							color={viewMode === "list" ? "#FFFFFF" : colors.textMuted}
							style={{ marginRight: 8 }}
						/>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "800",
								color: viewMode === "list" ? "#FFFFFF" : colors.textMuted,
							}}
						>
							List View
						</Text>
					</Pressable>
				</View>

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

			{viewMode === "map" ? (
				<View
					style={{
						flex: 1,
						paddingHorizontal: 16,
						paddingBottom: 16,
						marginBottom: tabBarHeight - 12,
					}}
				>
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
					contentContainerStyle={{
						paddingBottom: bottomPadding,
						paddingHorizontal: 20,
					}}
					bounces={true}
					scrollEventThrottle={16}
					onScroll={handleScroll}
					nestedScrollEnabled={true}
				>
					{mode === "emergency" && (
						<Pressable
							onPress={handleCall911}
							style={{
								backgroundColor: colors.card,
								borderRadius: 30,
								padding: 20,
								flexDirection: "row",
								alignItems: "center",
								marginBottom: 8,
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 4 },
								shadowOpacity: isDarkMode ? 0 : 0.03,
								shadowRadius: 10,
							}}
						>
							<View
								style={{
									backgroundColor: COLORS.brandPrimary,
									width: 56,
									height: 56,
									borderRadius: 16,
									alignItems: "center",
									justifyContent: "center",
									marginRight: 16,
								}}
							>
								<Ionicons name="call" size={26} color="#FFFFFF" />
							</View>
							<View style={{ flex: 1 }}>
								<Text
									style={{
										color: colors.text,
										fontSize: 19,
										fontWeight: "900",
										letterSpacing: -0.5,
									}}
								>
									Call 911
								</Text>
								<Text
									style={{
										color: colors.textMuted,
										fontSize: 14,
										marginTop: 2,
									}}
								>
									Emergency dispatch
								</Text>
							</View>
							<View
								style={{
									width: 36,
									height: 36,
									borderRadius: 12,
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.025)"
										: "rgba(0,0,0,0.025)",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Ionicons
									name="chevron-forward"
									size={16}
									color={colors.textMuted}
								/>
							</View>
						</Pressable>
					)}

					<Text
						style={{
							fontSize: 10,
							fontWeight: "900",
							color: colors.textMuted,
							letterSpacing: 3,
							marginBottom: 16,
						}}
					>
						{mode === "emergency" ? "NEARBY SERVICES" : "AVAILABLE BEDS"} (
						{filteredHospitals.length})
					</Text>

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
		</LinearGradient>
	);
}
