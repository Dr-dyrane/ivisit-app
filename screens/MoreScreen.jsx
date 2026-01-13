import { useRef, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Image,
	Platform,
	Animated,
	Linking,
	Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { COLORS } from "../constants/colors";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProfileAvatarButton from "../components/headers/ProfileAvatarButton";
import { seederService } from "../services/seederService";
import {
	navigateToEmergencyContacts,
	navigateToHelpSupport,
	navigateToInsurance,
	navigateToMedicalProfile,
	navigateToNotifications,
	navigateToProfile,
	navigateToSettings,
} from "../utils/navigationHelpers";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { STACK_TOP_PADDING } from "../constants/layout";

const MoreScreen = () => {
	const router = useRouter();
	const { showToast } = useToast();
	const { logout, user } = useAuth();
	const { isDarkMode, toggleTheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { registerFAB, unregisterFAB } = useFAB();

	// Modular header components with haptic feedback - memoized to prevent infinite re-renders
	const backButton = useCallback(() => <HeaderBackButton />, []);

	// Hide FAB on More screen (on focus, not just mount)
	useFocusEffect(
		useCallback(() => {
			registerFAB('more-screen-hide', {
				visible: false,
			});

			// Cleanup
			return () => {
				unregisterFAB('more-screen-hide');
			};
		}, [registerFAB, unregisterFAB])
	);

	// Update header when screen is focused
	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Settings & Support",
				subtitle: "MORE",
				icon: <Ionicons name="ellipsis-horizontal" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [backButton, resetTabBar, resetHeader, setHeaderState])
	);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const profileScale = useRef(new Animated.Value(0.9)).current;

	// Consistent with Welcome, Onboarding, Signup, Login screens
	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const headerHeight = 80;
	const topPadding = STACK_TOP_PADDING;

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
			Animated.spring(profileScale, {
				toValue: 1,
				friction: 8,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleTabBarScroll, handleHeaderScroll]
	);

	const handleLogout = async () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		const result = await logout();
		if (result.success) {
			showToast(result.message, "success");
			router.replace("/(auth)");
		} else {
			showToast(result.message, "error");
		}
	};

	const handleSeedData = async () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		Alert.alert(
			"Seed Database",
			"This will add mock data (Visits, Notifications, FAQs) to your account. Continue?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Seed",
					onPress: async () => {
						try {
							showToast("Seeding data...", "info");
							await seederService.seedAll();
							showToast("Data seeded successfully!", "success");
						} catch (error) {
							console.error(error);
							showToast("Failed to seed data", "error");
						}
					},
				},
			]
		);
	};

	// iVisit-specific health & emergency items
	const healthItems = [
		{
			title: "Medical Profile",
			icon: "fitness-outline",
			description: "Blood type, allergies, conditions",
			action: () => navigateToMedicalProfile({ router }),
		},
		{
			title: "Emergency Contacts",
			icon: "people-outline",
			description: "Family & emergency responders",
			action: () => navigateToEmergencyContacts({ router }),
		},
		{
			title: "Insurance",
			icon: "shield-checkmark-outline",
			description: "Coverage & claims",
			action: () => navigateToInsurance({ router }),
		},
	];

	const settingsItems = [
		{
			title: "Notifications",
			icon: "notifications-outline",
			description: "Alerts & reminders",
			action: () => navigateToNotifications({ router }),
		},
		{
			title: "Settings",
			icon: "settings-outline",
			description: "App preferences",
			action: () => navigateToSettings({ router }),
		},
		{
			title: "Help & Support",
			icon: "help-circle-outline",
			description: "FAQs & contact us",
			action: () => navigateToHelpSupport({ router }),
		},
	];

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					paddingTop: topPadding,
					paddingBottom: bottomPadding,
				}}
				scrollEventThrottle={16}
				onScroll={handleScroll}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }, { scale: profileScale }],
						paddingHorizontal: 12,
						paddingBottom: 24,
					}}
				>
					<TouchableOpacity
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
							navigateToProfile({ router });
						}}
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 20,
							backgroundColor: colors.card,
							borderRadius: 36,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<Image
							source={
								user?.imageUri
									? { uri: user.imageUri }
									: require("../assets/profile.jpg")
							}
							style={{
								width: 64,
								height: 64,
								borderRadius: 24,
								backgroundColor: COLORS.brandPrimary + "15",
							}}
						/>
						<View style={{ marginLeft: 16, flex: 1 }}>
							<Text
								style={{
									fontSize: 19,
									fontWeight: "900",
									color: colors.text,
									letterSpacing: -1.0,
								}}
							>
								{user?.fullName || user?.username || "User"}
							</Text>
							<Text
								style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}
							>
								{user?.email || "email@example.com"}
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
					</TouchableOpacity>
				</Animated.View>

				{/* HEALTH & EMERGENCY Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
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
						HEALTH & EMERGENCY
					</Text>
					{healthItems.map((item, index) => (
						<TouchableOpacity
							key={index}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								item.action();
							}}
							style={{
								flexDirection: "row",
								alignItems: "center",
								padding: 20,
								marginBottom: 12,
								backgroundColor: colors.card,
								borderRadius: 36,
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 4 },
								shadowOpacity: isDarkMode ? 0 : 0.03,
								shadowRadius: 10,
							}}
						>
							<View
								style={{
									width: 56,
									height: 56,
									borderRadius: 14,
									backgroundColor: COLORS.brandPrimary,
									alignItems: "center",
									justifyContent: "center",
									marginRight: 16,
								}}
							>
								<Ionicons name={item.icon} size={26} color="#FFFFFF" />
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
									{item.title}
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									{item.description}
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
						</TouchableOpacity>
					))}
				</Animated.View>

				{/* SETTINGS Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
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
						SETTINGS
					</Text>
					{settingsItems.map((item, index) => (
						<TouchableOpacity
							key={index}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								item.action();
							}}
							style={{
								flexDirection: "row",
								alignItems: "center",
								padding: 20,
								marginBottom: 12,
								backgroundColor: colors.card,
								borderRadius: 36,
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 4 },
								shadowOpacity: isDarkMode ? 0 : 0.03,
								shadowRadius: 10,
							}}
						>
							<View
								style={{
									width: 56,
									height: 56,
									borderRadius: 14,
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.05)"
										: "rgba(0,0,0,0.03)",
									alignItems: "center",
									justifyContent: "center",
									marginRight: 16,
								}}
							>
								<Ionicons name={item.icon} size={26} color={colors.text} />
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
									{item.title}
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									{item.description}
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
						</TouchableOpacity>
					))}
				</Animated.View>

				{/* ABOUT Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
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
						ABOUT
					</Text>
					<TouchableOpacity
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							Linking.openURL("https://ivisit.ng");
						}}
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 20,
							backgroundColor: colors.card,
							borderRadius: 36,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<View
							style={{
								width: 56,
								height: 56,
								borderRadius: 14,
								backgroundColor: COLORS.brandPrimary,
								alignItems: "center",
								justifyContent: "center",
								marginRight: 16,
							}}
						>
							<Ionicons name="heart" size={24} color="#FFFFFF" />
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
								Healthcare, thoughtfully engineered
							</Text>
							<Text
								style={{
									fontSize: 14,
									color: colors.textMuted,
									marginTop: 2,
								}}
							>
								Crafted in California • ivisit.ng
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
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							Linking.openURL("https://ivisit.ng/privacy");
						}}
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 20,
							marginTop: 12,
							backgroundColor: colors.card,
							borderRadius: 36,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<View
							style={{
								width: 56,
								height: 56,
								borderRadius: 14,
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.05)"
									: "rgba(0,0,0,0.03)",
								alignItems: "center",
								justifyContent: "center",
								marginRight: 16,
							}}
						>
							<Ionicons name="document-text-outline" size={24} color={colors.text} />
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
								Terms & Privacy
							</Text>
							<Text
								style={{
									fontSize: 14,
									color: colors.textMuted,
									marginTop: 2,
								}}
							>
								Read policies and legal information
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
					</TouchableOpacity>
				</Animated.View>

				{/* PREFERENCES Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
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
						PREFERENCES
					</Text>

					{/* Theme Toggle */}
					<TouchableOpacity
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							toggleTheme();
						}}
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							padding: 20,
							marginBottom: 12,
							backgroundColor: colors.card,
							borderRadius: 30,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<View
								style={{
									width: 56,
									height: 56,
									borderRadius: 16,
									backgroundColor: COLORS.brandPrimary,
									alignItems: "center",
									justifyContent: "center",
									marginRight: 16,
								}}
							>
								<Ionicons
									name={isDarkMode ? "moon" : "sunny"}
									size={26}
									color="#FFFFFF"
								/>
							</View>
							<View>
								<Text
									style={{
										fontSize: 19,
										fontWeight: "900",
										color: colors.text,
										letterSpacing: -0.5,
									}}
								>
									{isDarkMode ? "Dark Mode" : "Light Mode"}
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									Tap to toggle
								</Text>
							</View>
						</View>
						<View
							style={{
								width: 52,
								height: 30,
								borderRadius: 15,
								backgroundColor: isDarkMode ? COLORS.brandPrimary : "#D1D5DB",
								justifyContent: "center",
							}}
						>
							<View
								style={{
									width: 24,
									height: 24,
									borderRadius: 12,
									backgroundColor: "#FFFFFF",
									position: "absolute",
									left: isDarkMode ? 25 : 3,
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.15,
									shadowRadius: 3,
									elevation: 3,
								}}
							/>
						</View>
					</TouchableOpacity>

					{/* Logout */}
					<TouchableOpacity
						onPress={handleLogout}
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 20,
							backgroundColor: colors.card,
							borderRadius: 30,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<View
							style={{
								width: 56,
								height: 56,
								borderRadius: 16,
								backgroundColor: COLORS.error,
								alignItems: "center",
								justifyContent: "center",
								marginRight: 16,
							}}
						>
							<Ionicons name="log-out-outline" size={26} color="#FFFFFF" />
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
								Sign Out
							</Text>
							<Text
								style={{
									fontSize: 14,
									color: colors.textMuted,
									marginTop: 2,
								}}
							>
								Log out of your account
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
					</TouchableOpacity>
				</Animated.View>

				{/* DEVELOPER Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
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
						DEVELOPER
					</Text>
					<TouchableOpacity
						onPress={handleSeedData}
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 20,
							backgroundColor: colors.card,
							borderRadius: 36,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<View
							style={{
								width: 56,
								height: 56,
								borderRadius: 14,
								backgroundColor: COLORS.warning,
								alignItems: "center",
								justifyContent: "center",
								marginRight: 16,
							}}
						>
							<Ionicons name="construct" size={24} color="#FFFFFF" />
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
								Seed Database
							</Text>
							<Text
								style={{
									fontSize: 14,
									color: colors.textMuted,
									marginTop: 2,
								}}
							>
								Populate with mock data
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
					</TouchableOpacity>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
};

export default MoreScreen;
