import { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	Image,
	Pressable,
	ScrollView,
	ActivityIndicator,
	Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { updateUserAPI, getCurrentUserAPI } from "../api/auth";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ProfileField from "../components/form/ProfileField";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../constants/colors";

const ProfileScreen = () => {
	const { syncUserData } = useAuth();
	const { showToast } = useToast();
	const { isDarkMode } = useTheme();

	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const [gender, setGender] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [imageUri, setImageUri] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isDataLoading, setIsDataLoading] = useState(true);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const imageScale = useRef(new Animated.Value(0.9)).current;

	// Consistent with Welcome, Onboarding, Signup, Login screens
	const backgroundColors = isDarkMode
		? ["#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	useEffect(() => {
		fetchUserData();
	}, []);

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

	const fetchUserData = async () => {
		setIsDataLoading(true);
		try {
			const { data: userData } = await getCurrentUserAPI();
			setFullName(userData.fullName || "");
			setUsername(userData.username || "");
			setGender(userData.gender || "");
			setEmail(userData.email || "");
			setPhone(userData.phone || "");
			setAddress(userData.address || "");
			setDateOfBirth(userData.dateOfBirth || "");
			setImageUri(userData.imageUri || null);
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || error.message || "An error occurred";
			showToast(errorMessage, "error");
		} finally {
			setIsDataLoading(false);
		}
	};

	const pickImage = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 1,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				setImageUri(result.assets[0].uri);
				showToast("Image selected successfully", "success");
			}
		} catch (error) {
			showToast(`Image picker error: ${error.message}`, "error");
		}
	};

	const handleUpdateProfile = async () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		setIsLoading(true);
		try {
			const updatedData = {
				fullName,
				username,
				gender,
				email,
				phone,
				address,
				dateOfBirth,
				imageUri,
			};
			await updateUserAPI(updatedData);
			await syncUserData();
			showToast("Profile updated successfully", "success");
		} catch (error) {
			const errorMessage =
				error.response?.data?.message ||
				error.message ||
				"Failed to update profile";
			showToast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	};

	if (isDataLoading) {
		return (
			<LinearGradient
				colors={backgroundColors}
				style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
			>
				<View style={{
					backgroundColor: COLORS.brandPrimary,
					width: 72,
					height: 72,
					borderRadius: 20,
					alignItems: "center",
					justifyContent: "center",
					marginBottom: 20,
				}}>
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
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }, { scale: imageScale }],
						alignItems: "center",
						paddingTop: 24,
						paddingBottom: 32,
					}}
				>
					<Pressable onPress={pickImage} style={{ position: "relative" }}>
						<Image
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
							showToast("Emergency contacts feature coming soon", "info");
						}}
					>
						<View style={{
							backgroundColor: COLORS.brandPrimary,
							width: 56,
							height: 56,
							borderRadius: 16,
							alignItems: "center",
							justifyContent: "center",
							marginRight: 16,
						}}>
							<Ionicons name="people" size={26} color="#FFFFFF" />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={{
								fontSize: 19,
								fontWeight: "900",
								color: colors.text,
								letterSpacing: -0.5,
							}}>
								Add Contact
							</Text>
							<Text style={{
								fontSize: 14,
								color: colors.textMuted,
								marginTop: 2,
							}}>
								Family & emergency responders
							</Text>
						</View>
						<View style={{
							width: 36,
							height: 36,
							borderRadius: 12,
							backgroundColor: isDarkMode ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)",
							alignItems: "center",
							justifyContent: "center",
						}}>
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
								<View style={{
									width: 36,
									height: 36,
									borderRadius: 10,
									backgroundColor: `${COLORS.brandPrimary}15`,
									alignItems: "center",
									justifyContent: "center",
									marginRight: 12,
								}}>
									<Ionicons name={item.icon} size={18} color={COLORS.brandPrimary} />
								</View>
								<Text
									style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
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
								showToast("Medical history feature coming soon", "info");
							}}
						>
							<Ionicons
								name="document-text"
								size={20}
								color="#FFFFFF"
							/>
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
						onPress={handleUpdateProfile}
						disabled={isLoading}
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
					>
						<View style={{
							backgroundColor: COLORS.brandPrimary,
							width: 56,
							height: 56,
							borderRadius: 16,
							alignItems: "center",
							justifyContent: "center",
							marginRight: 16,
						}}>
							{isLoading ? (
								<ActivityIndicator color="#FFFFFF" />
							) : (
								<Ionicons name="checkmark" size={26} color="#FFFFFF" />
							)}
						</View>
						<View style={{ flex: 1 }}>
							<Text style={{
								fontSize: 19,
								fontWeight: "900",
								color: colors.text,
								letterSpacing: -0.5,
							}}>
								Save Changes
							</Text>
							<Text style={{
								fontSize: 14,
								color: colors.textMuted,
								marginTop: 2,
							}}>
								Update your profile
							</Text>
						</View>
						<View style={{
							width: 36,
							height: 36,
							borderRadius: 12,
							backgroundColor: isDarkMode ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)",
							alignItems: "center",
							justifyContent: "center",
						}}>
							<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
						</View>
					</Pressable>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
};

export default ProfileScreen;
