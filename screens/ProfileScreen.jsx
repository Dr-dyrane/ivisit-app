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
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const ProfileScreen = () => {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { syncUserData, user, deleteAccount } = useAuth();
    const { updateProfile, isLoading: isUpdating } = useUpdateProfile();
    const { uploadImage, isUploading } = useImageUpload();
	const { showToast } = useToast();
	const { isDarkMode } = useTheme();
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
    
    // Derived state: Check if form has unsaved changes
    const hasChanges = user && (
        fullName !== (user.fullName || "") ||
        username !== (user.username || "") ||
        gender !== (user.gender || "") ||
        email !== (user.email || "") ||
        phone !== (user.phone || "") ||
        address !== (user.address || "") ||
        dateOfBirth !== (user.dateOfBirth || "") ||
        (imageUri !== null && imageUri !== user.imageUri)
    );

    const fabScale = useRef(new Animated.Value(0)).current;

    // Animate FAB when changes are detected
    useEffect(() => {
        Animated.spring(fabScale, {
            toValue: hasChanges ? 1 : 0,
            useNativeDriver: true,
            friction: 6,
            tension: 40
        }).start();
    }, [hasChanges]);

    // Sync state with user context when loaded
    useEffect(() => {
        if (user) {
            // Only overwrite if we are loading data for the first time
            // OR if the user hasn't made any changes yet (to prevent overwriting while typing)
            if (isDataLoading || !hasChanges) {
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

	const { setHeaderState } = useHeaderState();

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
			console.log("DEBUG: Starting pickImage...");
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 1,
			});
			console.log("DEBUG: ImagePicker result:", result.canceled ? "Canceled" : result.assets[0].uri);

			if (!result.canceled && result.assets && result.assets.length > 0) {
				setImageUri(result.assets[0].uri);
				showToast("Image selected successfully", "success");
			}
		} catch (error) {
			console.error("DEBUG: pickImage error:", error);
			showToast(`Image picker error: ${error.message}`, "error");
		}
	};

	const handleUpdateProfile = async () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		setIsLoading(true);
		console.log("DEBUG: handleUpdateProfile started. Current imageUri:", imageUri);
		try {
			let uploadedImageUri = imageUri;

			// Upload image if it's a local file
			if (imageUri && imageUri.startsWith('file://')) {
				console.log("DEBUG: Uploading local image...");
				uploadedImageUri = await uploadImage(imageUri);
				console.log("DEBUG: Upload complete. New URI:", uploadedImageUri);
			} else {
				console.log("DEBUG: No local image to upload. Using existing URI.");
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
			console.error("DEBUG: Update error:", error);
			const errorMessage =
				error.response?.data?.message ||
				error.message ||
				"Failed to update profile";
			showToast(errorMessage, "error");
		} finally {
			setIsLoading(false);
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
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 40 }}
				scrollEventThrottle={16}
				onScroll={handleScroll}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }, { scale: imageScale }],
						alignItems: "center",
						paddingBottom: 32,
						paddingTop: 20,
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
								borderRadius: 60,
								borderWidth: 4,
								borderColor: COLORS.brandPrimary,
							}}
						/>
						<View
							style={{
								position: "absolute",
								bottom: 0,
								right: 0,
								backgroundColor: COLORS.brandPrimary,
								borderRadius: 16,
								width: 44,
								height: 44,
								justifyContent: "center",
								alignItems: "center",
								borderWidth: 3,
								borderColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
							}}
						>
							<Ionicons name="camera" size={22} color="#FFFFFF" />
						</View>
					</Pressable>

					<Text
						style={{
							fontSize: 24,
							fontWeight: "900",
							color: colors.text,
							marginTop: 16,
							textAlign: "center",
							letterSpacing: -0.5,
						}}
					>
						{fullName || "Your Name"}
					</Text>
					<Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
						{email || "email@example.com"}
					</Text>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 20,
					}}
				>
					<Text
						style={{
							fontSize: 10,
							fontWeight: "900",
							color: colors.textMuted,
							marginBottom: 16,
							letterSpacing: 3,
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
						paddingHorizontal: 20,
						marginTop: 32,
					}}
				>
					<Text
						style={{
							fontSize: 10,
							fontWeight: "900",
							color: colors.textMuted,
							marginBottom: 16,
							letterSpacing: 3,
						}}
					>
						EMERGENCY CONTACTS
					</Text>

					<Pressable
						style={{
							backgroundColor: colors.card,
							borderRadius: 30,
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
							router.push("/(user)/(stacks)/emergency-contacts");
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
							<Ionicons name="people" size={26} color="#FFFFFF" />
						</View>
						<View style={{ flex: 1 }}>
							<Text
								style={{
									fontSize: 19,
									fontWeight: "900",
									color: colors.text,
									letterSpacing: -0.5,
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
								borderRadius: 12,
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
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 20,
						marginTop: 32,
					}}
				>
					<Text
						style={{
							fontSize: 10,
							fontWeight: "900",
							color: colors.textMuted,
							marginBottom: 16,
							letterSpacing: 3,
						}}
					>
						MEDICAL HISTORY
					</Text>

					<View
						style={{
							backgroundColor: colors.card,
							borderRadius: 30,
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
							{ label: "Allergies", icon: "warning-outline" },
							{ label: "Current Medications", icon: "medical-outline" },
							{ label: "Past Surgeries", icon: "bandage-outline" },
							{ label: "Chronic Conditions", icon: "fitness-outline" },
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
										borderRadius: 10,
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
								<Text
									style={{
										color: colors.text,
										fontSize: 15,
										fontWeight: "600",
									}}
								>
									{item.label}
								</Text>
							</View>
						))}

						<Pressable
							style={{
								backgroundColor: COLORS.brandPrimary,
								borderRadius: 16,
								padding: 16,
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								marginTop: 8,
							}}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								router.push("/(user)/(stacks)/medical-profile");
							}}
						>
							<Ionicons name="document-text" size={20} color="#FFFFFF" />
							<Text
								style={{
									marginLeft: 8,
									color: "#FFFFFF",
									fontWeight: "800",
								}}
							>
								View Full History
							</Text>
						</Pressable>
					</View>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						paddingHorizontal: 20,
						marginTop: 32,
					}}
				>
					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							router.push(
								user?.hasPassword
									? "/(user)/(stacks)/change-password"
									: "/(user)/(stacks)/create-password"
							);
						}}
						style={{
							backgroundColor: colors.card,
							borderRadius: 30,
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
								borderRadius: 16,
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
									letterSpacing: -0.5,
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
				</Animated.View>

                {/* Danger Zone */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						paddingHorizontal: 20,
						marginTop: 32,
                        marginBottom: 100, // Extra space for sticky footer
					}}
				>
					<Text
						style={{
							fontSize: 10,
							fontWeight: "900",
							color: COLORS.error,
							marginBottom: 16,
							letterSpacing: 3,
						}}
					>
						DANGER ZONE
					</Text>

					<Pressable
						onPress={handleDeleteAccount}
                        disabled={isDeleting}
						style={{
							backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
							borderRadius: 30,
							padding: 20,
							flexDirection: "row",
							alignItems: "center",
                            borderWidth: 1,
                            borderColor: isDarkMode ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
						}}
					>
						<View
							style={{
								backgroundColor: COLORS.error,
								width: 56,
								height: 56,
								borderRadius: 16,
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
									letterSpacing: -0.5,
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

            {/* Floating Action Button for Saving Changes */}
            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: insets.bottom + 20,
                    right: 20,
                    transform: [{ scale: fabScale }],
                    shadowColor: COLORS.brandPrimary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                    zIndex: 100,
                }}
            >
                <Pressable
                    onPress={handleUpdateProfile}
                    disabled={isLoading}
                    style={({ pressed }) => ({
                        backgroundColor: COLORS.brandPrimary,
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                    })}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Ionicons name="checkmark" size={32} color="#FFFFFF" />
                    )}
                </Pressable>
            </Animated.View>
		</LinearGradient>
	);
};

export default ProfileScreen;
