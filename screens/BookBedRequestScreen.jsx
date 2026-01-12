"use client";

import { useRef, useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { Fontisto } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useEmergency } from "../contexts/EmergencyContext";
import { useAuth } from "../contexts/AuthContext";
import { usePreferences } from "../contexts/PreferencesContext";
import { useEmergencyContacts } from "../hooks/emergency/useEmergencyContacts";
import { useMedicalProfile } from "../hooks/user/useMedicalProfile";
import { useEmergencyRequests } from "../hooks/emergency/useEmergencyRequests";
import { useVisits } from "../contexts/VisitsContext";
import { useRequestFlow } from "../hooks/emergency/useRequestFlow";
import EmergencyRequestModal from "../components/emergency/EmergencyRequestModal";
import { navigateBack } from "../utils/navigationHelpers";

export default function BookBedRequestScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const params = useLocalSearchParams();
	const hospitalId = typeof params?.hospitalId === "string" ? params.hospitalId : null;

	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

	const { user } = useAuth();
	const { preferences } = usePreferences();
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { profile: medicalProfile } = useMedicalProfile();
	const { createRequest, updateRequest, setRequestStatus } = useEmergencyRequests();
	const { addVisit, updateVisit } = useVisits();

	const {
		hospitals,
		selectedHospital,
		selectedSpecialty,
		activeAmbulanceTrip,
		activeBedBooking,
		startAmbulanceTrip,
		startBedBooking,
		clearSelectedHospital,
		setMode,
	} = useEmergency();

	const requestHospital = useMemo(() => {
		if (!hospitalId) return selectedHospital;
		return hospitals.find((h) => h?.id === hospitalId) ?? selectedHospital;
	}, [hospitalId, hospitals, selectedHospital]);

	const { handleRequestInitiated, handleRequestComplete } = useRequestFlow({
		createRequest,
		updateRequest,
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
		requestHospitalId: hospitalId,
		selectedHospital,
		activeAmbulanceTrip,
		activeBedBooking,
		currentRoute: null,
		onRequestComplete: () => {},
	});

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setMode("booking");
			setHeaderState({
				title: "Book Bed",
				subtitle: "BOOK BED",
				icon: <Fontisto name="bed-patient" size={22} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState, setMode])
	);

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
				tension: 50,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim]);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const delay = useCallback((ms) => new Promise((resolve) => setTimeout(resolve, ms)), []);

	const handleClose = useCallback(() => {
		navigateBack({ router });
	}, [router]);

	const handleDispatched = useCallback(
		async (payload) => {
			const minMs = 800;
			const startedAt = Date.now();
			await handleRequestComplete(payload);
			const elapsed = Date.now() - startedAt;
			if (elapsed < minMs) {
				await delay(minMs - elapsed);
			}
			navigateBack({ router });
		},
		[delay, handleRequestComplete, router]
	);

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	return (
		<LinearGradient colors={backgroundColors} style={styles.container}>
			<Animated.View
				style={{
					flex: 1,
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				}}
			>
				<View style={{ flex: 1 }}>
					<EmergencyRequestModal
						mode="booking"
						requestHospital={requestHospital}
						selectedSpecialty={selectedSpecialty}
						onRequestClose={handleClose}
						onRequestInitiated={handleRequestInitiated}
						onRequestComplete={handleDispatched}
						showClose={false}
						onScroll={handleScroll}
						scrollContentStyle={{
							paddingHorizontal: 12,
							paddingTop: topPadding,
							paddingBottom: bottomPadding,
						}}
					/>
				</View>
			</Animated.View>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
