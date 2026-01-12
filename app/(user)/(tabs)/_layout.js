// app/(user)/(tabs)/_layout.js

import { Tabs } from "expo-router";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { useTabBarVisibility } from "../../../contexts/TabBarVisibilityContext";
import { COLORS } from "../../../constants/colors";
import AnimatedTabBar from "../../../components/navigation/AnimatedTabBar";

export default function TabsLayout() {
	const { isDarkMode } = useTheme();
	const { resetTabBar } = useTabBarVisibility();

	return (
		<Tabs
			tabBar={(props) => <AnimatedTabBar {...props} />}
			screenOptions={{
				tabBarShowLabel: true,
				tabBarActiveTintColor: COLORS.brandPrimary,
				tabBarInactiveTintColor: isDarkMode
					? COLORS.textMutedDark
					: COLORS.textMuted,
				headerShown: false,
				gestureEnabled: true,
				gestureDirection: "horizontal",
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
				}}
			/>
			<Tabs.Screen
				name="bed"
				options={{
					title: "BED",
					tabBarIcon: ({ color }) => (
						<Fontisto name="bed-patient" size={22} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="visits"
				options={{
					title: "VISITS", // Remove title text
					tabBarIcon: ({ color }) => (
						<Ionicons name="calendar-outline" size={24} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
