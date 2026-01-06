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

	const backgroundColors = isDarkMode
		? ["#0B0F1A", "#0D121D", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFAFA"];
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const textSecondary = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;

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
				<ActivityIndicator size="large" color={COLORS.brandPrimary} />
				<Text style={{ marginTop: 16, color: textSecondary, fontSize: 14 }}>
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
								borderRadius: 20,
								width: 40,
								height: 40,
								justifyContent: "center",
								alignItems: "center",
								borderWidth: 3,
								borderColor: isDarkMode ? COLORS.bgDark : "#FFFFFF",
							}}
						>
							<Ionicons name="camera" size={20} color="#FFFFFF" />
						</View>
					</Pressable>

					<Text
						style={{
							fontSize: 28,
							fontWeight: "bold",
							color: textColor,
							marginTop: 16,
							textAlign: "center",
						}}
					>
						{fullName || "Your Name"}
					</Text>
					<Text style={{ fontSize: 15, color: textSecondary, marginTop: 4 }}>
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
							fontSize: 12,
							fontWeight: "700",
							color: textSecondary,
							marginBottom: 16,
							letterSpacing: 1,
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
							fontSize: 12,
							fontWeight: "700",
							color: textSecondary,
							marginBottom: 16,
							letterSpacing: 1,
						}}
					>
						EMERGENCY CONTACTS
					</Text>

					<Pressable
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							padding: 18,
							backgroundColor: `${COLORS.brandPrimary}15`,
							borderRadius: 16,
							borderWidth: 2,
							borderColor: COLORS.brandPrimary,
							borderStyle: "dashed",
						}}
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							showToast("Emergency contacts feature coming soon", "info");
						}}
					>
						<Ionicons name="add-circle" size={24} color={COLORS.brandPrimary} />
						<Text
							style={{
								marginLeft: 10,
								color: COLORS.brandPrimary,
								fontWeight: "700",
								fontSize: 15,
							}}
						>
							Add Emergency Contact
						</Text>
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
							fontSize: 12,
							fontWeight: "700",
							color: textSecondary,
							marginBottom: 16,
							letterSpacing: 1,
						}}
					>
						MEDICAL HISTORY
					</Text>

					<View
						style={{
							backgroundColor: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
							borderRadius: 16,
							padding: 20,
						}}
					>
						<Text
							style={{
								fontSize: 14,
								color: textSecondary,
								marginBottom: 16,
								lineHeight: 20,
							}}
						>
							Your medical history is private and secure. Only authorized
							healthcare providers can access this information.
						</Text>

						{[
							"Allergies",
							"Current Medications",
							"Past Surgeries",
							"Chronic Conditions",
						].map((item, index) => (
							<View
								key={index}
								style={{
									flexDirection: "row",
									alignItems: "center",
									marginBottom: 12,
								}}
							>
								<View
									style={{
										width: 6,
										height: 6,
										borderRadius: 3,
										backgroundColor: COLORS.brandPrimary,
										marginRight: 12,
									}}
								/>
								<Text
									style={{ color: textColor, fontSize: 15, fontWeight: "500" }}
								>
									{item}
								</Text>
							</View>
						))}

						<Pressable
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								padding: 16,
								backgroundColor: `${COLORS.brandPrimary}15`,
								borderRadius: 12,
								marginTop: 12,
							}}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								showToast("Medical history feature coming soon", "info");
							}}
						>
							<Ionicons
								name="document-text"
								size={20}
								color={COLORS.brandPrimary}
							/>
							<Text
								style={{
									marginLeft: 8,
									color: COLORS.brandPrimary,
									fontWeight: "600",
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
							backgroundColor: COLORS.brandPrimary,
							padding: 20,
							borderRadius: 16,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							shadowColor: COLORS.brandPrimary,
							shadowOffset: { width: 0, height: 8 },
							shadowOpacity: 0.3,
							shadowRadius: 12,
							elevation: 8,
						}}
					>
						{isLoading ? (
							<ActivityIndicator color="#FFFFFF" />
						) : (
							<>
								<Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
								<Text
									style={{
										color: "#FFFFFF",
										fontWeight: "800",
										fontSize: 16,
										marginLeft: 10,
										letterSpacing: 1,
									}}
								>
									UPDATE PROFILE
								</Text>
							</>
						)}
					</Pressable>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
};

export default ProfileScreen;
