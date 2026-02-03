"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STACK_TOP_PADDING } from "../constants/layout";
import * as ImagePicker from "expo-image-picker";
import { useUpdateProfile } from "../hooks/user/useUpdateProfile";
import { useImageUpload } from "../hooks/user/useImageUpload";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ProfileField from "../components/form/ProfileField";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../constants/colors";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";

import { useMedicalProfile } from "../hooks/user/useMedicalProfile";
import { useEmergencyContacts } from "../hooks/emergency/useEmergencyContacts";
import {
	navigateToEmergencyContacts,
	navigateToMedicalProfile,
	navigateToChangePassword,
	navigateToCreatePassword,
} from "../utils/navigationHelpers";

const ProfileScreen = () => {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { registerFAB, unregisterFAB } = useFAB();
	const { syncUserData, user, deleteAccount } = useAuth();
	const { updateProfile, isLoading: isUpdating } = useUpdateProfile();
	const { uploadImage, isUploading } = useImageUpload();
	const { showToast } = useToast();
	const { isDarkMode } = useTheme();
	const { profile: medicalProfile } = useMedicalProfile();
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();

	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const [gender, setGender] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [imageUri, setImageUri] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDataLoading, setIsDataLoading] = useState(true);

	// Event handlers
	const handleUpdateProfile = async () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		setIsLoading(true);
		// console.log("DEBUG: handleUpdateProfile started. Current imageUri:", imageUri);
		try {
			let uploadedImageUri = imageUri;

			// Upload image if it's a local file
			if (imageUri && imageUri.startsWith('file://')) {
				// console.log("DEBUG: Uploading local image...");
				uploadedImageUri = await uploadImage(imageUri);
				// console.log("DEBUG: Upload complete. New URI:", uploadedImageUri);
			} else {
				// console.log("DEBUG: No local image to upload. Using existing URI.");
			}

			const updatedData = {
				fullName,
				username,
				gender,
				email,
				phone,
				address,
				dateOfBirth,
				imageUri: uploadedImageUri,
			};

			await updateProfile(updatedData);
			await syncUserData();

			if (uploadedImageUri) {
				setImageUri(uploadedImageUri);
			}

			showToast("Profile updated successfully", "success");
		} catch (error) {
			// console.error("DEBUG: Update error:", error);
			const errorMessage =
				error.response?.data?.message ||
				error.message ||
				"Failed to update profile";
			showToast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	};

	// Derived state: Check if form has unsaved changes
	const hasChanges = useMemo(() => {
		if (!user) return false;
		return (
			fullName !== (user.fullName || "") ||
			username !== (user.username || "") ||
			gender !== (user.gender || "") ||
			email !== (user.email || "") ||
			phone !== (user.phone || "") ||
			address !== (user.address || "") ||
			dateOfBirth !== (user.dateOfBirth || "") ||
			(imageUri !== null && imageUri !== user.imageUri)
		);
	}, [user, fullName, username, gender, email, phone, address, dateOfBirth, imageUri]);

	// Debounced version of hasChanges to prevent FAB flickering
	const debouncedHasChanges = useRef(hasChanges);
	const [stableHasChanges, setStableHasChanges] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (debouncedHasChanges.current !== hasChanges) {
				debouncedHasChanges.current = hasChanges;
				setStableHasChanges(hasChanges);
			}
		}, 300); // 300ms debounce

		return () => clearTimeout(timer);
	}, [hasChanges]);

	// Sync state with user context when loaded
	useFocusEffect(
		useCallback(() => {
			registerFAB('profile-save', {
				icon: 'checkmark',
				label: stableHasChanges ? 'Save Changes' : 'No Changes',
				subText: stableHasChanges ? 'Tap to save profile' : 'Profile up to date',
				visible: stableHasChanges,
				onPress: handleUpdateProfile,
				loading: isLoading,
				style: 'primary',
				haptic: 'medium',
				priority: 8,
				animation: 'prominent',
				allowInStack: true, // Allow in stack screen
			});

			// Cleanup
			return () => {
				unregisterFAB('profile-save');
			};
		}, [registerFAB, unregisterFAB, stableHasChanges, isLoading, handleUpdateProfile])
	);

	// Sync state with user context when loaded
	useEffect(() => {
		if (user) {
			// Only overwrite if we are loading data for the first time
			// OR if the user hasn't made any changes yet (to prevent overwriting while typing)
			if (isDataLoading || !hasChanges) {
				// console.log('[ProfileScreen] Syncing state from user context');
				setFullName(user.fullName || "");
				setUsername(user.username || "");
				setGender(user.gender || "");
				setEmail(user.email || "");
				setPhone(user.phone || "");
				setAddress(user.address || "");
				setDateOfBirth(user.dateOfBirth || "");

				// Only overwrite image if it's not a local draft
				if (!imageUri?.startsWith('file://')) {
					setImageUri(user.imageUri || null);
				}

				setIsDataLoading(false);
			}
		}
	}, [user, isDataLoading]); // hasChanges is intentionally omitted to avoid loops, but checked inside

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const imageScale = useRef(new Animated.Value(0.9)).current;

	const backgroundColors = isDarkMode
		? ["#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	// We rely on useAuth to fetch data, so we don't need manual fetchUserData
	const backButton = useCallback(() => <HeaderBackButton />, []);

	// We rely on useAuth to fetch data, so we don't need manual fetchUserData
	// But we trigger a sync on mount just in case
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
				subtitle: "YOUR ACCOUNT",
				icon: <Ionicons name="person" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				badge: null,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [
			backButton,
			resetHeader,
			resetTabBar,
			setHeaderState,
		])
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
			Animated.spring(imageScale, {
				toValue: 1,
				friction: 8,
				useNativeDriver: true,
			}),
		]).start();
	}, [isDataLoading]);

	const pickImage = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		try {
			// console.log("DEBUG: Starting pickImage...");
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 1,
			});
			// console.log("DEBUG: ImagePicker result:", result.canceled ? "Canceled" : result.assets[0].uri);

			if (!result.canceled && result.assets && result.assets.length > 0) {
				setImageUri(result.assets[0].uri);
				showToast("Image selected successfully", "success");
			}
		} catch (error) {
			// console.error("DEBUG: pickImage error:", error);
			showToast(`Image picker error: ${error.message}`, "error");
		}
	};

	const handleDeleteAccount = async () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		Alert.alert(
			"Delete Account",
			"Are you sure you want to delete your account? This action cannot be undone and all your data will be lost.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						setIsDeleting(true);
						try {
							const result = await deleteAccount();
							if (result.success) {
								showToast("Account deleted successfully", "success");
								router.replace("/(auth)/login");
							} else {
								showToast(result.message, "error");
							}
						} catch (error) {
							showToast("Failed to delete account", "error");
						} finally {
							setIsDeleting(false);
						}
					},
				},
			]
		);
	};

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleTabBarScroll, handleHeaderScroll]
	);

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
								key={imageUri} // Force re-render when URI changes
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
							{/* Insurance Badge Removed - Manifesto: "Calm Over Contrast" */}
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
								{user?.displayId || 'IVP-PENDING'}
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

					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
						}}
					>
						<Text
							style={{
								fontSize: 10,
								fontWeight: "800",
								color: colors.textMuted,
								marginBottom: 16,
								letterSpacing: 1.5,
								textTransform: "uppercase",
							}}
						>
							PERSONAL INFORMATION
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
								fontSize: 10,
								fontWeight: "800",
								color: colors.textMuted,
								marginBottom: 16,
								letterSpacing: 1.5,
								textTransform: "uppercase",
							}}
						>
							EMERGENCY CONTACTS
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
									shadowOffset: { width: 0, height: 4 },
									shadowOpacity: isDarkMode ? 0 : 0.03,
									shadowRadius: 10,
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
									shadowOffset: { width: 0, height: 4 },
									shadowOpacity: isDarkMode ? 0 : 0.03,
									shadowRadius: 10,
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
								fontSize: 10,
								fontWeight: "800",
								color: colors.textMuted,
								marginBottom: 16,
								letterSpacing: 1.5,
								textTransform: "uppercase",
							}}
						>
							MEDICAL HISTORY
						</Text>

						<View
							style={{
								backgroundColor: colors.card,
								borderRadius: 36,
								padding: 24,
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 4 },
								shadowOpacity: isDarkMode ? 0 : 0.03,
								shadowRadius: 10,
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

					<Animated.View
						style={{
							opacity: fadeAnim,
							paddingHorizontal: 12,
							marginTop: 32,
						}}
					>
						<Pressable
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								if (user?.hasPassword) {
									router.push("/(user)/(stacks)/change-password");
								} else {
									router.push("/(user)/(stacks)/create-password");
								}
							}}
							style={{
								backgroundColor: colors.card,
								borderRadius: 36,
								padding: 20,
								flexDirection: "row",
								alignItems: "center",
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 4 },
								shadowOpacity: isDarkMode ? 0 : 0.03,
								shadowRadius: 10,
								marginBottom: 14,
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
								<Ionicons name="lock-closed" size={26} color="#FFFFFF" />
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
									{user?.hasPassword ? "Change Password" : "Create Password"}
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									{user?.hasPassword
										? "Update your password anytime"
										: "Add password login to your account"}
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
							marginBottom: 100, // Extra space for sticky footer
						}}
					>
						<Text
							style={{
								fontSize: 10,
								fontWeight: "800",
								color: COLORS.error,
								marginBottom: 16,
								letterSpacing: 1.5,
								textTransform: "uppercase",
							}}
						>
							DANGER ZONE
						</Text>

						<Pressable
							onPress={handleDeleteAccount}
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
