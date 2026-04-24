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
	Alert,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STACK_TOP_PADDING } from "../constants/layout";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ProfileField from "../components/form/ProfileField";
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
	navigateToPayment,
	navigateToInsurance,
} from "../utils/navigationHelpers";

const ProfileScreen = () => {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { registerFAB, unregisterFAB } = useFAB();
	const { user, syncUserData } = useAuth();
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
		isLoading,
		isDeleting,
		hasChanges,
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

	// --- FAB Management ---
	// Debounced version of hasChanges to prevent FAB flickering
	const debouncedHasChanges = useRef(hasChanges);
	const [stableHasChanges, setStableHasChanges] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (debouncedHasChanges.current !== hasChanges) {
				debouncedHasChanges.current = hasChanges;
				setStableHasChanges(hasChanges);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [hasChanges]);

	// Stabilize save handler for FAB
	const saveHandlerRef = useRef(saveProfile);
	useEffect(() => {
		saveHandlerRef.current = saveProfile;
	}, [saveProfile]);

	useFocusEffect(
		useCallback(() => {
			registerFAB('profile-save', {
				icon: 'checkmark',
				label: stableHasChanges ? 'Save Changes' : 'No Changes',
				subText: stableHasChanges ? 'Tap to save profile' : 'Profile up to date',
				visible: stableHasChanges,
				onPress: () => saveHandlerRef.current(),
				loading: isLoading,
				style: 'primary',
				haptic: 'medium',
				priority: 8,
				animation: 'prominent',
				allowInStack: true,
			});

			return () => {
				unregisterFAB('profile-save');
			};
		}, [registerFAB, unregisterFAB, stableHasChanges, isLoading])
	);

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

	// --- Handlers ---
	const handleDeleteAccountPress = useCallback(() => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		Alert.alert(
			"Delete Account",
			"Are you sure you want to delete your account? This action cannot be undone and all your data will be lost.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => deleteAccount(router),
				},
			]
		);
	}, [deleteAccount, router]);

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
					{/* Profile Header & Image */}
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }, { scale: imageScale }],
							alignItems: "center",
							paddingBottom: 32,
							paddingTop: STACK_TOP_PADDING,
						}}
					>
						<Pressable onPress={pickImage} style={{ position: "relative" }}>
							<Image
								key={imageUri}
								source={
									imageUri ? { uri: imageUri } : require("../assets/profile.jpg")
								}
								style={{
									width: 120,
									height: 120,
									borderRadius: 36,
									backgroundColor: COLORS.brandPrimary + "15",
								}}
							/>
							<View
								style={{
									position: "absolute",
									bottom: -4,
									right: -4,
									backgroundColor: COLORS.brandPrimary,
									borderRadius: 14,
									width: 44,
									height: 44,
									justifyContent: "center",
									alignItems: "center",
									shadowColor: COLORS.brandPrimary,
									shadowOffset: { width: 0, height: 4 },
									shadowOpacity: 0.3,
									shadowRadius: 8,
									elevation: 6,
								}}
							>
								<Ionicons name="camera" size={22} color="#FFFFFF" />
							</View>
						</Pressable>

						<Text
							style={{
								fontSize: 28,
								fontWeight: "900",
								color: colors.text,
								marginTop: 16,
								textAlign: "center",
								letterSpacing: -1.0,
							}}
						>
							{fullName || "Your Name"}
						</Text>
						<Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
							{email || "email@example.com"}
						</Text>
						<View style={{
							marginTop: 8,
							backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
							paddingHorizontal: 12,
							paddingVertical: 4,
							borderRadius: 8,
							borderWidth: 1,
							borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
						}}>
							<Text style={{
								fontSize: 12,
								fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
								fontWeight: "700",
								color: COLORS.brandPrimary,
								letterSpacing: 1
							}}>
								{displayId || 'IVP-PENDING'}
							</Text>
						</View>

						{/* Manifesto Identity Artifact */}
						{user?.hasInsurance && (
							<View
								style={{
									marginTop: 16,
									backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(134, 16, 14, 0.05)",
									paddingHorizontal: 16,
									paddingVertical: 8,
									borderRadius: 16,
									borderWidth: 1,
									borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(134, 16, 14, 0.1)",
									flexDirection: "row",
									alignItems: "center",
									gap: 8,
								}}
							>
								<View
									style={{
										width: 8,
										height: 8,
										borderRadius: 4,
										backgroundColor: COLORS.brandPrimary,
										shadowColor: COLORS.brandPrimary,
										shadowOpacity: 0.5,
										shadowRadius: 4,
									}}
								/>
								<Text
									style={{
										fontSize: 12,
										fontWeight: "800",
										color: isDarkMode ? "#FFFFFF" : COLORS.brandPrimary,
										letterSpacing: 0.5,
										textTransform: "uppercase",
									}}
								>
									iVisit Basic Member
								</Text>
							</View>
						)}
					</Animated.View>

					{/* Personal Information Form */}
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
						}}
					>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: colors.text,
								marginBottom: 16,
								letterSpacing: -0.3,
							}}
						>
							Personal Information
						</Text>

						<ProfileField
							label="Full Name"
							value={fullName}
							onChange={setFullName}
							iconName="person-outline"
						/>
						<ProfileField
							label="Username"
							value={username}
							onChange={setUsername}
							iconName="at-outline"
						/>
						<ProfileField
							label="Gender"
							value={gender}
							onChange={setGender}
							iconName="transgender-outline"
						/>
						<ProfileField
							label="Email Address"
							value={email}
							onChange={setEmail}
							iconName="mail-outline"
							keyboardType="email-address"
						/>
						<ProfileField
							label="Phone Number"
							value={phone}
							onChange={setPhone}
							iconName="call-outline"
							keyboardType="phone-pad"
						/>
						<ProfileField
							label="Address"
							value={address}
							onChange={setAddress}
							iconName="location-outline"
						/>
						<ProfileField
							label="Date of Birth"
							value={dateOfBirth}
							onChange={setDateOfBirth}
							iconName="calendar-outline"
						/>
					</Animated.View>

					{/* Emergency Contacts Section */}
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
							marginTop: 32,
						}}
					>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: colors.text,
								marginBottom: 16,
								letterSpacing: -0.3,
							}}
						>
							Emergency Contacts
						</Text>

						{emergencyContacts && emergencyContacts.length > 0 ? (
							<Pressable
								style={{
									backgroundColor: colors.card,
									borderRadius: 36,
									padding: 20,
									flexDirection: "row",
									alignItems: "center",
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: isDarkMode ? 0 : 0.01,
									shadowRadius: 6,
								}}
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									navigateToEmergencyContacts({ router });
								}}
							>
								<View
									style={{
										backgroundColor: COLORS.brandPrimary,
										width: 56,
										height: 56,
										borderRadius: 14,
										alignItems: "center",
										justifyContent: "center",
										marginRight: 16,
									}}
								>
									<Ionicons name="people" size={26} color="#FFFFFF" />
								</View>
								<View style={{ flex: 1 }}>
									<Text
										style={{
											fontSize: 19,
											fontWeight: "900",
											color: colors.text,
											letterSpacing: -1.0,
										}}
										numberOfLines={1}
									>
										{emergencyContacts[0].name}
									</Text>
									<Text
										style={{
											fontSize: 14,
											color: colors.textMuted,
											marginTop: 2,
										}}
									>
										{emergencyContacts.length > 1
											? `and ${emergencyContacts.length - 1} more contact${emergencyContacts.length - 1 > 1 ? 's' : ''}`
											: (emergencyContacts[0].relationship ? `${emergencyContacts[0].relationship} • Tap to add more` : "Tap to manage contacts")}
									</Text>
								</View>
								<View
									style={{
										width: 36,
										height: 36,
										borderRadius: 14,
										backgroundColor: isDarkMode
											? "rgba(255,255,255,0.025)"
											: "rgba(0,0,0,0.025)",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Ionicons name="pencil" size={20} color={colors.textMuted} />
								</View>
							</Pressable>
						) : (
							<Pressable
								style={{
									backgroundColor: colors.card,
									borderRadius: 36,
									padding: 20,
									flexDirection: "row",
									alignItems: "center",
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: isDarkMode ? 0 : 0.01,
									shadowRadius: 6,
								}}
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									navigateToEmergencyContacts({ router });
								}}
							>
								<View
									style={{
										backgroundColor: COLORS.brandPrimary,
										width: 56,
										height: 56,
										borderRadius: 14,
										alignItems: "center",
										justifyContent: "center",
										marginRight: 16,
									}}
								>
									<Ionicons name="people" size={26} color="#FFFFFF" />
								</View>
								<View style={{ flex: 1 }}>
									<Text
										style={{
											fontSize: 19,
											fontWeight: "900",
											color: colors.text,
											letterSpacing: -1.0,
										}}
									>
										Add Contact
									</Text>
									<Text
										style={{
											fontSize: 14,
											color: colors.textMuted,
											marginTop: 2,
										}}
									>
										Family & emergency responders
									</Text>
								</View>
								<View
									style={{
										width: 36,
										height: 36,
										borderRadius: 14,
										backgroundColor: isDarkMode
											? "rgba(255,255,255,0.025)"
											: "rgba(0,0,0,0.025)",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Ionicons name="add" size={20} color={colors.textMuted} />
								</View>
							</Pressable>
						)}
					</Animated.View>

					{/* Medical History Section */}
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
							marginTop: 32,
						}}
					>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: colors.text,
								marginBottom: 16,
								letterSpacing: -0.3,
							}}
						>
							Health Information
						</Text>

						<View
							style={{
								backgroundColor: colors.card,
								borderRadius: 36,
								padding: 24,
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: isDarkMode ? 0 : 0.01,
								shadowRadius: 6,
							}}
						>
							<Text
								style={{
									fontSize: 14,
									color: colors.textMuted,
									marginBottom: 20,
									lineHeight: 20,
								}}
							>
								Your medical history is private and secure. Only authorized
								healthcare providers can access this information.
							</Text>

							{[
								{ label: "Blood Type", value: medicalProfile?.bloodType, icon: "water-outline" },
								{ label: "Allergies", value: medicalProfile?.allergies, icon: "warning-outline" },
								{ label: "Current Medications", value: medicalProfile?.medications, icon: "medical-outline" },
								{ label: "Past Surgeries", value: medicalProfile?.surgeries, icon: "bandage-outline" },
								{ label: "Chronic Conditions", value: medicalProfile?.conditions, icon: "fitness-outline" },
								{ label: "Emergency Notes", value: medicalProfile?.notes, icon: "document-text-outline" },
							].map((item, index) => (
								<View
									key={index}
									style={{
										flexDirection: "row",
										alignItems: "center",
										marginBottom: 14,
									}}
								>
									<View
										style={{
											width: 36,
											height: 36,
											borderRadius: 12,
											backgroundColor: `${COLORS.brandPrimary}15`,
											alignItems: "center",
											justifyContent: "center",
											marginRight: 12,
										}}
									>
										<Ionicons
											name={item.icon}
											size={18}
											color={COLORS.brandPrimary}
										/>
									</View>
									<View style={{ flex: 1 }}>
										<Text
											style={{
												color: colors.text,
												fontSize: 15,
												fontWeight: "800",
												letterSpacing: -0.5,
											}}
										>
											{item.label}
										</Text>
										<Text
											numberOfLines={1}
											style={{
												color: colors.textMuted,
												fontSize: 13,
												marginTop: 2,
											}}
										>
											{item.value || "None listed"}
										</Text>
									</View>
								</View>
							))}

							<Pressable
								style={{
									backgroundColor: COLORS.brandPrimary,
									borderRadius: 24,
									padding: 16,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									marginTop: 8,
								}}
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									navigateToMedicalProfile({ router });
								}}
							>
								<Ionicons name="document-text" size={20} color="#FFFFFF" />
								<Text
									style={{
										marginLeft: 8,
										color: "#FFFFFF",
										fontWeight: "900",
										letterSpacing: -0.5,
									}}
								>
									Edit Medical History
								</Text>
							</Pressable>
						</View>
					</Animated.View>

					{/* Coverage Section */}
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
							marginTop: 32,
						}}
					>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: colors.text,
								marginBottom: 16,
								letterSpacing: -0.3,
							}}
						>
							Coverage
						</Text>

						<Pressable
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								navigateToInsurance({ router });
							}}
							style={{
								backgroundColor: colors.card,
								borderRadius: 36,
								padding: 20,
								flexDirection: "row",
								alignItems: "center",
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: isDarkMode ? 0 : 0.01,
								shadowRadius: 6,
							}}
						>
							<View
								style={{
									backgroundColor: user?.hasInsurance ? COLORS.brandPrimary : "#D1D5DB",
									width: 56,
									height: 56,
									borderRadius: 14,
									alignItems: "center",
									justifyContent: "center",
									marginRight: 16,
								}}
							>
								<Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
							</View>
							<View style={{ flex: 1 }}>
								<Text
									style={{
										fontSize: 19,
										fontWeight: "900",
										color: colors.text,
										letterSpacing: -1.0,
									}}
								>
									{user?.hasInsurance ? "Insurance Active" : "Add Insurance"}
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									{user?.hasInsurance ? "Manage your coverage" : "Get covered for emergencies"}
								</Text>
							</View>
							<View
								style={{
									width: 36,
									height: 36,
									borderRadius: 14,
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
					</Animated.View>

					{/* Danger Zone */}
					<Animated.View
						style={{
							opacity: fadeAnim,
							paddingHorizontal: 12,
							marginTop: 32,
							marginBottom: 100,
						}}
					>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: colors.text,
								marginBottom: 16,
								letterSpacing: -0.3,
							}}
						>
							Delete Account
						</Text>

						<Pressable
							onPress={handleDeleteAccountPress}
							disabled={isDeleting}
							style={{
								backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
								borderRadius: 36,
								padding: 20,
								flexDirection: "row",
								alignItems: "center",
							}}
						>
							<View
								style={{
									backgroundColor: COLORS.error,
									width: 56,
									height: 56,
									borderRadius: 14,
									alignItems: "center",
									justifyContent: "center",
									marginRight: 16,
								}}
							>
								{isDeleting ? (
									<ActivityIndicator color="#FFFFFF" />
								) : (
									<Ionicons name="trash-outline" size={26} color="#FFFFFF" />
								)}
							</View>
							<View style={{ flex: 1 }}>
								<Text
									style={{
										fontSize: 19,
										fontWeight: "900",
										color: colors.text,
										letterSpacing: -1.0,
									}}
								>
									Delete Account
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									Permanently remove your data
								</Text>
							</View>
						</Pressable>
					</Animated.View>
				</ScrollView>
			</KeyboardAvoidingView>
		</LinearGradient>
	);
};

export default ProfileScreen;
