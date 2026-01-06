// app/(user)/(tabs)/_layout.js

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
	Animated,
	Image,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useTabBarVisibility } from "../../../contexts/TabBarVisibilityContext";
import { useNotifications } from "../../../contexts/NotificationsContext";
import { COLORS } from "../../../constants/colors";
import AnimatedTabBar from "../../../components/navigation/AnimatedTabBar";

export default function TabsLayout() {
	const router = useRouter();
	const { user } = useAuth();
	const { isDarkMode } = useTheme();
	const { resetTabBar } = useTabBarVisibility();
	const { unreadCount } = useNotifications();

	const pingAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(pingAnim, {
					toValue: 2,
					duration: 800,
					useNativeDriver: true,
				}),
				Animated.timing(pingAnim, {
					toValue: 1,
					duration: 800,
					useNativeDriver: true,
				}),
			])
		).start();
	}, [pingAnim]);

	const backgroundColor = isDarkMode ? COLORS.bgDark : COLORS.bgLight;
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;

	return (
		<Tabs
			tabBar={(props) => <AnimatedTabBar {...props} />}
			screenOptions={{
				tabBarShowLabel: false,
				tabBarActiveTintColor: COLORS.brandPrimary,
				tabBarInactiveTintColor: isDarkMode
					? COLORS.textMutedDark
					: COLORS.textMuted,
				headerStyle: {
					backgroundColor: backgroundColor,
					borderBottomWidth: 0,
					elevation: 0,
					shadowOpacity: 0,
				},
				headerTitleAlign: "center",
				gestureEnabled: true,
				gestureDirection: "horizontal",
				headerTitleStyle: {
					fontWeight: "bold",
					fontSize: 18,
					color: textColor,
				},
				headerShadowVisible: false,
			}}
			screenListeners={{
				tabPress: () => {
					// Reset tab bar visibility when switching tabs
					resetTabBar();
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "SOS",
					tabBarIcon: ({ color }) => (
						<Ionicons name="medical-outline" size={24} color={color} />
					),
					headerShown: true,
					headerTitle: () => null,
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.push("/(user)/(stacks)/profile")}
							style={{
								marginLeft: 16,
								flexDirection: "row",
								alignItems: "center",
							}}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<Image
								source={
									user?.imageUri
										? { uri: user.imageUri }
										: require("../../../assets/profile.jpg")
								}
								resizeMode="cover"
								style={{
									width: 36,
									height: 36,
									borderRadius: 18,
									borderWidth: 2,
									borderColor: COLORS.brandPrimary,
								}}
							/>
							<View style={{ marginLeft: 10 }}>
								<Text
									style={{ fontWeight: "600", fontSize: 14, color: textColor }}
								>
									{user?.fullName || user?.username || "User"}
								</Text>
								<Text
									style={{
										fontSize: 11,
										color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
									}}
								>
									View Profile
								</Text>
							</View>
						</TouchableOpacity>
					),
					headerRight: () => (
						<TouchableOpacity
							style={{ marginRight: 18 }}
							onPress={() => router.push("/(user)/(stacks)/notifications")}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<View style={{ position: "relative" }}>
								<Ionicons
									name="notifications-outline"
									size={24}
									color={textColor}
								/>
								{unreadCount > 0 && (
									<View style={{ position: "absolute", top: -2, right: -2 }}>
										<Animated.View
											style={{
												position: "absolute",
												width: 10,
												height: 10,
												borderRadius: 999,
												backgroundColor: `${COLORS.brandPrimary}50`,
												transform: [{ scale: pingAnim }],
												opacity: pingAnim.interpolate({
													inputRange: [1, 2],
													outputRange: [1, 0],
												}),
											}}
										/>
										<View
											style={{
												width: 10,
												height: 10,
												borderRadius: 999,
												backgroundColor: COLORS.brandPrimary,
												borderWidth: 2,
												borderColor: backgroundColor,
											}}
										/>
									</View>
								)}
							</View>
						</TouchableOpacity>
					),
				}}
			/>

			<Tabs.Screen
				name="visits"
				options={{
					title: "VISITS",
					tabBarIcon: ({ color }) => (
						<Ionicons name="calendar-outline" size={24} color={color} />
					),
					headerShown: false,
				}}
			/>

			<Tabs.Screen
				name="more"
				options={{
					title: "MORE",
					tabBarIcon: ({ color }) => (
						<Ionicons name="ellipsis-horizontal-outline" size={24} color={color} />
					),
					// No header - MoreScreen handles its own header/profile section
					headerShown: false,
				}}
			/>
		</Tabs>
	);
}
