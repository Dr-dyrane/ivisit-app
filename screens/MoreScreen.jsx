"use client";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../constants/colors";
import * as Haptics from "expo-haptics";

const MoreScreen = () => {
	const router = useRouter();
	const { showToast } = useToast();
	const { logout, user } = useAuth();
	const { isDarkMode, toggleTheme } = useTheme();

	const backgroundColor = isDarkMode ? COLORS.bgDark : COLORS.bgLight;
	const cardBg = isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt;
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const textSecondary = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;

	const handleLogout = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
		{ title: "Profile", icon: "person", route: "/(user)/profile" },
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
		<ScrollView style={{ flex: 1, backgroundColor, padding: 16 }}>
			<TouchableOpacity
				onPress={() => router.push("/(user)/profile")}
				style={{
					flexDirection: "row",
					alignItems: "center",
					padding: 16,
					marginBottom: 20,
					backgroundColor: cardBg,
					borderRadius: 16,
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 4,
					elevation: 3,
				}}
			>
				<Image
					source={
						user?.imageUri
							? { uri: user.imageUri }
							: require("../assets/profile.jpg")
					}
					style={{
						width: 56,
						height: 56,
						borderRadius: 28,
						borderWidth: 2,
						borderColor: COLORS.brandPrimary,
					}}
				/>
				<View style={{ marginLeft: 14, flex: 1 }}>
					<Text
						style={{
							fontSize: 16,
							fontWeight: "bold",
							color: textColor,
							marginBottom: 4,
						}}
					>
						{user?.fullName || user?.username || "User"}
					</Text>
					<Text style={{ fontSize: 13, color: textSecondary }}>
						{user?.email || "email@example.com"}
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={20} color={textSecondary} />
			</TouchableOpacity>

			<View
				style={{
					height: 1,
					backgroundColor: isDarkMode ? COLORS.border : COLORS.borderLight,
					marginBottom: 20,
				}}
			/>

			<View style={{ marginBottom: 24 }}>
				<Text
					style={{
						fontSize: 12,
						fontWeight: "600",
						color: textSecondary,
						marginBottom: 12,
						marginLeft: 4,
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
							padding: 14,
							marginBottom: 8,
							backgroundColor: cardBg,
							borderRadius: 12,
						}}
					>
						<View
							style={{
								padding: 8,
								borderRadius: 8,
								backgroundColor: `${COLORS.brandPrimary}15`,
							}}
						>
							<Ionicons
								name={item.icon}
								size={20}
								color={COLORS.brandPrimary}
							/>
						</View>
						<Text
							style={{
								fontSize: 15,
								marginLeft: 14,
								color: textColor,
								fontWeight: "500",
							}}
						>
							{item.title}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<View
				style={{
					height: 1,
					backgroundColor: isDarkMode ? COLORS.border : COLORS.borderLight,
					marginBottom: 20,
				}}
			/>

			<View style={{ marginBottom: 24 }}>
				<Text
					style={{
						fontSize: 12,
						fontWeight: "600",
						color: textSecondary,
						marginBottom: 12,
						marginLeft: 4,
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
							padding: 14,
							marginBottom: 8,
							backgroundColor: cardBg,
							borderRadius: 12,
						}}
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							option.action();
						}}
					>
						<View
							style={{
								padding: 8,
								borderRadius: 8,
								backgroundColor: `${COLORS.brandPrimary}15`,
							}}
						>
							<Ionicons
								name={option.icon}
								size={20}
								color={COLORS.brandPrimary}
							/>
						</View>
						<Text
							style={{
								fontSize: 15,
								marginLeft: 14,
								color: textColor,
								fontWeight: "500",
								flex: 1,
							}}
						>
							{option.title}
						</Text>
						<Ionicons name="chevron-forward" size={18} color={textSecondary} />
					</TouchableOpacity>
				))}
			</View>

			<View
				style={{
					height: 1,
					backgroundColor: isDarkMode ? COLORS.border : COLORS.borderLight,
					marginBottom: 20,
				}}
			/>

			<View style={{ marginBottom: 32 }}>
				<TouchableOpacity
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						toggleTheme();
					}}
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						padding: 16,
						marginBottom: 12,
						backgroundColor: cardBg,
						borderRadius: 12,
					}}
				>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<View
							style={{
								padding: 8,
								borderRadius: 8,
								backgroundColor: `${COLORS.brandPrimary}15`,
							}}
						>
							<Ionicons
								name={isDarkMode ? "moon" : "sunny"}
								size={20}
								color={COLORS.brandPrimary}
							/>
						</View>
						<Text
							style={{
								fontSize: 15,
								marginLeft: 14,
								color: textColor,
								fontWeight: "500",
							}}
						>
							{isDarkMode ? "Dark Mode" : "Light Mode"}
						</Text>
					</View>
					<View
						style={{
							width: 48,
							height: 28,
							borderRadius: 14,
							backgroundColor: isDarkMode
								? COLORS.brandPrimary
								: COLORS.borderLight,
							justifyContent: "center",
							paddingHorizontal: 3,
							flexDirection: "row",
							alignItems: "center",
						}}
					>
						<View
							style={{
								width: 22,
								height: 22,
								borderRadius: 11,
								backgroundColor: "#fff",
								position: "absolute",
								left: isDarkMode ? 24 : 3,
							}}
						/>
					</View>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={handleLogout}
					style={{
						flexDirection: "row",
						alignItems: "center",
						padding: 16,
						backgroundColor: `${COLORS.error}15`,
						borderRadius: 12,
						borderWidth: 1,
						borderColor: COLORS.error,
					}}
				>
					<Ionicons name="log-out-outline" size={20} color={COLORS.error} />
					<Text
						style={{
							fontSize: 15,
							marginLeft: 14,
							color: COLORS.error,
							fontWeight: "600",
						}}
					>
						Logout
					</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};

export default MoreScreen;
