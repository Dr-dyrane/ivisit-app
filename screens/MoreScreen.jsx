import { useRef, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Image,
	Platform,
	Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../constants/colors";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MoreScreen = () => {
	const router = useRouter();
	const { showToast } = useToast();
	const { logout, user } = useAuth();
	const { isDarkMode, toggleTheme } = useTheme();
	const insets = useSafeAreaInsets();

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const profileScale = useRef(new Animated.Value(0.9)).current;

	const backgroundColors = isDarkMode
		? ["#0B0F1A", "#0D121D", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFAFA"];
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const textSecondary = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
	const cardBg = isDarkMode
		? "rgba(255, 255, 255, 0.05)"
		: "rgba(0, 0, 0, 0.03)";

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;

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

	const navigationItems = [
		{ title: "Emergency", icon: "medical", route: "/(user)/(tabs)" },
		{ title: "Visits", icon: "calendar", route: "/(user)/(tabs)/visits" },
	];

	const settingsItems = [
		{
			title: "Settings",
			icon: "settings-outline",
			action: () => showToast("Settings coming soon", "info"),
		},
		{
			title: "Notifications",
			icon: "notifications-outline",
			action: () => showToast("Notifications coming soon", "info"),
		},
		{
			title: "Help & Support",
			icon: "help-circle-outline",
			action: () => showToast("Help coming soon", "info"),
		},
	];

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: bottomPadding }}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }, { scale: profileScale }],
						paddingHorizontal: 20,
						paddingTop: 32,
						paddingBottom: 24,
					}}
				>
					<TouchableOpacity
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
							router.push("/(user)/profile");
						}}
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 20,
							backgroundColor: cardBg,
							borderRadius: 20,
							borderWidth: 1,
							borderColor: `${COLORS.brandPrimary}30`,
							shadowColor: COLORS.brandPrimary,
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: 0.15,
							shadowRadius: 12,
							elevation: 5,
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
								borderRadius: 32,
								borderWidth: 3,
								borderColor: COLORS.brandPrimary,
							}}
						/>
						<View style={{ marginLeft: 16, flex: 1 }}>
							<Text
								style={{
									fontSize: 18,
									fontWeight: "800",
									color: textColor,
									marginBottom: 6,
								}}
							>
								{user?.fullName || user?.username || "User"}
							</Text>
							<Text style={{ fontSize: 14, color: textSecondary }}>
								{user?.email || "email@example.com"}
							</Text>
						</View>
						<View
							style={{
								backgroundColor: `${COLORS.brandPrimary}15`,
								padding: 12,
								borderRadius: 12,
							}}
						>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={COLORS.brandPrimary}
							/>
						</View>
					</TouchableOpacity>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 20,
						marginBottom: 32,
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
						NAVIGATION
					</Text>
					{navigationItems.map((item, index) => (
						<TouchableOpacity
							key={index}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								router.push(item.route);
							}}
							style={{
								flexDirection: "row",
								alignItems: "center",
								padding: 18,
								marginBottom: 12,
								backgroundColor: cardBg,
								borderRadius: 16,
								borderWidth: 1,
								borderColor: `${COLORS.brandPrimary}15`,
							}}
						>
							<View
								style={{
									padding: 12,
									borderRadius: 12,
									backgroundColor: `${COLORS.brandPrimary}20`,
								}}
							>
								<Ionicons
									name={item.icon}
									size={22}
									color={COLORS.brandPrimary}
								/>
							</View>
							<Text
								style={{
									fontSize: 16,
									marginLeft: 16,
									color: textColor,
									fontWeight: "600",
									flex: 1,
								}}
							>
								{item.title}
							</Text>
							<Ionicons
								name="chevron-forward"
								size={18}
								color={textSecondary}
							/>
						</TouchableOpacity>
					))}
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 20,
						marginBottom: 32,
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
						SETTINGS
					</Text>
					{settingsItems.map((option, index) => (
						<TouchableOpacity
							key={index}
							style={{
								flexDirection: "row",
								alignItems: "center",
								padding: 18,
								marginBottom: 12,
								backgroundColor: cardBg,
								borderRadius: 16,
								borderWidth: 1,
								borderColor: `${COLORS.brandPrimary}15`,
							}}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								option.action();
							}}
						>
							<View
								style={{
									padding: 12,
									borderRadius: 12,
									backgroundColor: `${COLORS.brandPrimary}20`,
								}}
							>
								<Ionicons
									name={option.icon}
									size={22}
									color={COLORS.brandPrimary}
								/>
							</View>
							<Text
								style={{
									fontSize: 16,
									marginLeft: 16,
									color: textColor,
									fontWeight: "600",
									flex: 1,
								}}
							>
								{option.title}
							</Text>
							<Ionicons
								name="chevron-forward"
								size={18}
								color={textSecondary}
							/>
						</TouchableOpacity>
					))}
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 20,
						marginBottom: 32,
					}}
				>
					<TouchableOpacity
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							toggleTheme();
						}}
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							padding: 18,
							marginBottom: 16,
							backgroundColor: cardBg,
							borderRadius: 16,
							borderWidth: 1,
							borderColor: `${COLORS.brandPrimary}15`,
						}}
					>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<View
								style={{
									padding: 12,
									borderRadius: 12,
									backgroundColor: `${COLORS.brandPrimary}20`,
								}}
							>
								<Ionicons
									name={isDarkMode ? "moon" : "sunny"}
									size={22}
									color={COLORS.brandPrimary}
								/>
							</View>
							<Text
								style={{
									fontSize: 16,
									marginLeft: 16,
									color: textColor,
									fontWeight: "600",
								}}
							>
								{isDarkMode ? "Dark Mode" : "Light Mode"}
							</Text>
						</View>
						<View
							style={{
								width: 52,
								height: 30,
								borderRadius: 15,
								backgroundColor: isDarkMode ? COLORS.brandPrimary : "#E0E0E0",
								justifyContent: "center",
								paddingHorizontal: 3,
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
									shadowOpacity: 0.2,
									shadowRadius: 3,
									elevation: 3,
								}}
							/>
						</View>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={handleLogout}
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							padding: 20,
							backgroundColor: `${COLORS.error}15`,
							borderRadius: 16,
							borderWidth: 2,
							borderColor: COLORS.error,
							shadowColor: COLORS.error,
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: 0.2,
							shadowRadius: 8,
							elevation: 4,
						}}
					>
						<Ionicons name="log-out-outline" size={22} color={COLORS.error} />
						<Text
							style={{
								fontSize: 16,
								marginLeft: 12,
								color: COLORS.error,
								fontWeight: "800",
								letterSpacing: 0.5,
							}}
						>
							LOGOUT
						</Text>
					</TouchableOpacity>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
};

export default MoreScreen;
