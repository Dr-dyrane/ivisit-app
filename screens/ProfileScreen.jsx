"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
	View,
	Text,
	Image,
	Pressable,
	ScrollView,
	ActivityIndicator,
	Animated,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STACK_TOP_PADDING } from "../constants/layout";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
// Components - Modular Profile
import ProfileHero from "../components/profile/surfaces/ProfileHero";
import ProfileActionList from "../components/profile/surfaces/ProfileActionList";
import ProfileModals from "../components/profile/surfaces/ProfileModals";
// Legacy
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../constants/colors";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";

// Hooks
import { useProfileForm } from "../hooks/profile/useProfileForm";
import { useMedicalProfile } from "../hooks/user/useMedicalProfile";
import { useEmergencyContacts } from "../hooks/emergency/useEmergencyContacts";

// Utils
import {
	navigateToEmergencyContacts,
	navigateToMedicalProfile,
	navigateToInsurance,
} from "../utils/navigationHelpers";

// PULLBACK NOTE: ProfileScreen refactored to modular components
// Following /map module pattern for separation of concerns
// Components extracted to components/profile/

const ProfileScreen = () => {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { user, syncUserData, signOut } = useAuth();
	const { isDarkMode } = useTheme();
	const { profile: medicalProfile } = useMedicalProfile();
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

	// --- Custom Hook ---
	const {
		formState,
		displayId,
		isDataLoading,
		isDeleting,
		pickImage,
		saveProfile,
		deleteAccount
	} = useProfileForm();

	// Destructure form state for easier access in render
	const {
		fullName, setFullName,
		username, setUsername,
		gender, setGender,
		email, setEmail,
		phone, setPhone,
		address, setAddress,
		dateOfBirth, setDateOfBirth,
		imageUri
	} = formState;

	const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
	const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

	// --- Animations ---
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const imageScale = useRef(new Animated.Value(0.9)).current;

	useEffect(() => {
		if (!isDataLoading) {
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
				Animated.spring(imageScale, {
					toValue: 1,
					friction: 8,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [isDataLoading, fadeAnim, slideAnim, imageScale]);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleTabBarScroll, handleHeaderScroll]
	);

	const backButton = useCallback(() => <HeaderBackButton />, []);

	// Sync on mount just in case
	useFocusEffect(
		useCallback(() => {
			syncUserData();
		}, [syncUserData])
	);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Profile",
				subtitle: "Account",
				icon: <Ionicons name="person" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				badge: null,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState])
	);

	// --- Render ---
	const backgroundColors = isDarkMode
		? ["#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	if (isDataLoading) {
		return (
			<LinearGradient
				colors={backgroundColors}
				style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
			>
				<View
					style={{
						backgroundColor: COLORS.brandPrimary,
						width: 72,
						height: 72,
						borderRadius: 20,
						alignItems: "center",
						justifyContent: "center",
						marginBottom: 20,
					}}
				>
					<ActivityIndicator size="large" color="#FFFFFF" />
				</View>
				<Text style={{ color: colors.textMuted, fontSize: 14 }}>
					Loading your profile...
				</Text>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={{ flex: 1 }}
				keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
			>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: 40 }}
					scrollEventThrottle={16}
					onScroll={handleScroll}
					keyboardShouldPersistTaps="handled"
				>
					{/* Profile Hero */}
					<ProfileHero
						user={user}
						imageUri={imageUri}
						displayId={displayId}
						isDarkMode={isDarkMode}
						fadeAnim={fadeAnim}
						slideAnim={slideAnim}
						imageScale={imageScale}
						pickImage={pickImage}
						colors={colors}
					/>

					{/* Action List */}
					<ProfileActionList
						emergencyContacts={emergencyContacts}
						user={user}
						isDarkMode={isDarkMode}
						router={router}
						navigateToEmergencyContacts={navigateToEmergencyContacts}
						navigateToMedicalProfile={navigateToMedicalProfile}
						navigateToInsurance={navigateToInsurance}
						onPersonalInfoPress={() => setIsPersonalInfoModalOpen(true)}
						onDeleteAccountPress={() => setIsDeleteAccountModalOpen(true)}
						onSignOutPress={signOut}
						fadeAnim={fadeAnim}
						slideAnim={slideAnim}
					/>

					<View style={{ height: 32 }} />

					{/* Modals */}
					<ProfileModals
						isPersonalInfoModalOpen={isPersonalInfoModalOpen}
						setIsPersonalInfoModalOpen={setIsPersonalInfoModalOpen}
						isDeleteAccountModalOpen={isDeleteAccountModalOpen}
						setIsDeleteAccountModalOpen={setIsDeleteAccountModalOpen}
						colors={colors}
						formState={formState}
						saveProfile={saveProfile}
						deleteAccount={deleteAccount}
						isDeleting={isDeleting}
					/>
				</ScrollView>
			</KeyboardAvoidingView>
		</LinearGradient>
	);
};

export default ProfileScreen;
