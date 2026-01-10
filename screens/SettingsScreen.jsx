"use client";

import { useCallback, useMemo, useRef, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	TouchableOpacity,
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
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
	const router = useRouter();
	const { isDarkMode, themeMode, setTheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { user } = useAuth();
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

	const passwordRoute = useMemo(() => {
		return user?.hasPassword ? "/(user)/(stacks)/change-password" : "/(user)/(stacks)/create-password";
	}, [user?.hasPassword]);

	const togglePreference = useCallback(
		async (key) => {
			if (!preferences) return;
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			await updatePreferences({ [key]: !preferences[key] });
		},
		[preferences, updatePreferences]
	);

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
				{/* NOTIFICATIONS Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 20,
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
						NOTIFICATIONS
					</Text>
					<TouchableOpacity
						onPress={() => togglePreference("notificationsEnabled")}
						disabled={!preferences}
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
						<View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
								<Ionicons name="notifications" size={26} color="#FFFFFF" />
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
									All Notifications
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									Receive all app alerts
								</Text>
							</View>
						</View>
						<View
							style={{
								width: 52,
								height: 30,
								borderRadius: 15,
								backgroundColor: preferences?.notificationsEnabled ? COLORS.brandPrimary : "#D1D5DB",
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
									left: preferences?.notificationsEnabled ? 25 : 3,
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.15,
									shadowRadius: 3,
									elevation: 3,
								}}
							/>
						</View>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => togglePreference("appointmentReminders")}
						disabled={!preferences || !preferences.notificationsEnabled}
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
							opacity: !preferences || !preferences.notificationsEnabled ? 0.5 : 1,
						}}
					>
						<View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
								<Ionicons name="calendar" size={26} color="#FFFFFF" />
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
									Appointment Reminders
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									Before scheduled visits
								</Text>
							</View>
						</View>
						<View
							style={{
								width: 52,
								height: 30,
								borderRadius: 15,
								backgroundColor: preferences?.appointmentReminders ? COLORS.brandPrimary : "#D1D5DB",
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
									left: preferences?.appointmentReminders ? 25 : 3,
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.15,
									shadowRadius: 3,
									elevation: 3,
								}}
							/>
						</View>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => togglePreference("emergencyUpdates")}
						disabled={!preferences || !preferences.notificationsEnabled}
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							padding: 20,
							backgroundColor: colors.card,
							borderRadius: 30,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
							opacity: !preferences || !preferences.notificationsEnabled ? 0.5 : 1,
						}}
					>
						<View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
								<Ionicons name="medical" size={26} color="#FFFFFF" />
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
									Emergency Updates
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									Critical SOS notifications
								</Text>
							</View>
						</View>
						<View
							style={{
								width: 52,
								height: 30,
								borderRadius: 15,
								backgroundColor: preferences?.emergencyUpdates ? COLORS.brandPrimary : "#D1D5DB",
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
									left: preferences?.emergencyUpdates ? 25 : 3,
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.15,
									shadowRadius: 3,
									elevation: 3,
								}}
							/>
						</View>
					</TouchableOpacity>
				</Animated.View>

				{/* PRIVACY Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 20,
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
						PRIVACY
					</Text>
					<TouchableOpacity
						onPress={() => togglePreference("privacyShareMedicalProfile")}
						disabled={!preferences}
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
						<View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
								<Ionicons name="document-text" size={26} color="#FFFFFF" />
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
									Share Medical Profile
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									In SOS requests only
								</Text>
							</View>
						</View>
						<View
							style={{
								width: 52,
								height: 30,
								borderRadius: 15,
								backgroundColor: preferences?.privacyShareMedicalProfile ? COLORS.brandPrimary : "#D1D5DB",
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
									left: preferences?.privacyShareMedicalProfile ? 25 : 3,
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.15,
									shadowRadius: 3,
									elevation: 3,
								}}
							/>
						</View>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => togglePreference("privacyShareEmergencyContacts")}
						disabled={!preferences}
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							padding: 20,
							backgroundColor: colors.card,
							borderRadius: 30,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
								<Ionicons name="people" size={26} color="#FFFFFF" />
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
									Share Emergency Contacts
								</Text>
								<Text
									style={{
										fontSize: 14,
										color: colors.textMuted,
										marginTop: 2,
									}}
								>
									In SOS requests only
								</Text>
							</View>
						</View>
						<View
							style={{
								width: 52,
								height: 30,
								borderRadius: 15,
								backgroundColor: preferences?.privacyShareEmergencyContacts ? COLORS.brandPrimary : "#D1D5DB",
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
									left: preferences?.privacyShareEmergencyContacts ? 25 : 3,
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.15,
									shadowRadius: 3,
									elevation: 3,
								}}
							/>
						</View>
					</TouchableOpacity>
				</Animated.View>

				{/* ACCOUNT SECURITY Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 20,
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
						ACCOUNT SECURITY
					</Text>
					<TouchableOpacity
						onPress={() => router.push(passwordRoute)}
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
								backgroundColor: COLORS.brandPrimary,
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
								{user?.hasPassword ? "Update your password" : "Secure your account"}
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
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
});
