"use client";

import { useCallback, useRef, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useAuth } from "../contexts/AuthContext";
import { ThemeMode } from "../contexts/ThemeContext";
import { usePreferences } from "../contexts/PreferencesContext";
import {
	navigateToPayment,
	navigateToHelpSupport,
	navigateToChangePassword,
	navigateToCreatePassword,
} from "../utils/navigationHelpers";
import * as Haptics from "expo-haptics";
import {
	SettingsCard,
	SettingsToggle,
	SettingsChevron,
	SettingsGroup,
} from "../components/settings/SettingsCard";

export default function SettingsScreen() {
	const router = useRouter();
	const { isDarkMode, themeMode, setTheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { user, logout } = useAuth();
	const { preferences, updatePreferences } = usePreferences();

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Settings",
				subtitle: "PREFERENCES",
				icon: <Ionicons name="settings" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
				scrollAware: false,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState])
	);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

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
		]).start();
	}, []);

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	const togglePreference = useCallback(
		async (key) => {
			if (!preferences) return;
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			await updatePreferences({ [key]: !preferences[key] });
		},
		[preferences, updatePreferences]
	);

	const handleLogout = async () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		const result = await logout();
		if (result.success) {
			router.replace("/(auth)");
		}
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={{
					paddingTop: topPadding,
					paddingBottom: bottomPadding,
				}}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 16,
					}}
				>
					<SettingsGroup>
						<SettingsCard
							iconName={isDarkMode ? "moon" : "sunny"}
							title={isDarkMode ? "Dark Mode" : "Light Mode"}
							tone="system"
							isLast={true}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								setTheme(isDarkMode ? ThemeMode.LIGHT : ThemeMode.DARK);
							}}
							rightElement={<SettingsToggle value={isDarkMode} />}
						/>
					</SettingsGroup>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 16,
					}}
				>
					<SettingsGroup>
						<SettingsCard
							iconName="notifications"
							title="All Notifications"
							tone="system"
							onPress={() => togglePreference("notificationsEnabled")}
							disabled={!preferences}
							rightElement={<SettingsToggle value={preferences?.notificationsEnabled} />}
						/>

						<SettingsCard
							iconName="calendar"
							title="Appointment Reminders"
							tone="care"
							onPress={() => togglePreference("appointmentReminders")}
							disabled={!preferences || !preferences.notificationsEnabled}
							rightElement={<SettingsToggle value={preferences?.appointmentReminders} />}
						/>

						<SettingsCard
							iconName="medical"
							title="Emergency Updates"
							tone="care"
							onPress={() => togglePreference("emergencyUpdates")}
							disabled={!preferences || !preferences.notificationsEnabled}
							rightElement={<SettingsToggle value={preferences?.emergencyUpdates} />}
						/>

						<SettingsCard
							iconName="volume-high"
							title="Notification Sounds"
							tone="system"
							isLast={true}
							onPress={() => togglePreference("notificationSoundsEnabled")}
							disabled={!preferences}
							rightElement={<SettingsToggle value={preferences?.notificationSoundsEnabled} />}
						/>
					</SettingsGroup>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 16,
					}}
				>
					<SettingsGroup>
						<SettingsCard
							iconName="document-text"
							title="Share Medical Profile"
							tone="profile"
							onPress={() => togglePreference("privacyShareMedicalProfile")}
							disabled={!preferences}
							rightElement={<SettingsToggle value={preferences?.privacyShareMedicalProfile} />}
						/>

						<SettingsCard
							iconName="people"
							title="Share Emergency Contacts"
							tone="contacts"
							isLast={true}
							onPress={() => togglePreference("privacyShareEmergencyContacts")}
							disabled={!preferences}
							rightElement={<SettingsToggle value={preferences?.privacyShareEmergencyContacts} />}
						/>
					</SettingsGroup>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 16,
					}}
				>
					<SettingsGroup>
						<SettingsCard
							iconName="lock-closed"
							title={user?.hasPassword ? "Change Password" : "Create Password"}
							tone="profile"
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								if (user?.hasPassword) {
									navigateToChangePassword({ router });
								} else {
									navigateToCreatePassword({ router });
								}
							}}
							rightElement={<SettingsChevron isDarkMode={isDarkMode} />}
						/>

						<SettingsCard
							iconName="card"
							title="Manage Payments"
							tone="payment"
							isLast={true}
							onPress={() => navigateToPayment({ router })}
							rightElement={<SettingsChevron isDarkMode={isDarkMode} />}
						/>
					</SettingsGroup>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 16,
					}}
				>
					<SettingsGroup>
						<SettingsCard
							iconName="help-circle"
							title="Help Center"
							tone="system"
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								navigateToHelpSupport({ router });
							}}
							rightElement={<SettingsChevron isDarkMode={isDarkMode} />}
						/>

						<SettingsCard
							iconName="chatbubble-ellipses"
							title="Contact Support"
							tone="system"
							isLast={true}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								navigateToHelpSupport({ router });
							}}
							rightElement={<SettingsChevron isDarkMode={isDarkMode} />}
						/>
					</SettingsGroup>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
					}}
				>
					<SettingsGroup>
						<SettingsCard
							iconName="log-out"
							title="Log Out"
							tone="destructive"
							destructive={true}
							isLast={true}
							onPress={handleLogout}
						/>
					</SettingsGroup>
				</Animated.View>
			</ScrollView>
		</LinearGradient >
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
});
